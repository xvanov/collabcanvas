#!/usr/bin/env python3
"""
Test SageMaker endpoint for YOLOv8 model.
Step 5 of model-deployment-plan-option-a.md

Usage:
    python3 scripts/test_endpoint.py [endpoint-name] [image-file] [--visualize] [--output OUTPUT]
    
    Examples:
    # Test with default endpoint and generated test image
    python3 scripts/test_endpoint.py
    
    # Test with specific endpoint
    python3 scripts/test_endpoint.py locatrix-blueprint-endpoint-dev
    
    # Test with your own blueprint image
    python3 scripts/test_endpoint.py locatrix-blueprint-endpoint-dev path/to/blueprint.jpg
    
    # Test and visualize bounding boxes
    python3 scripts/test_endpoint.py locatrix-blueprint-endpoint-dev path/to/blueprint.jpg --visualize
    
    # Test and save visualization to specific file
    python3 scripts/test_endpoint.py locatrix-blueprint-endpoint-dev path/to/blueprint.jpg -v -o output.png
    
    Or set environment variable:
    export SAGEMAKER_ENDPOINT_NAME=locatrix-blueprint-endpoint
    python3 scripts/test_endpoint.py
"""
import boto3
import json
import base64
from PIL import Image, ImageDraw, ImageFont
import io
import sys
import os
import time
import argparse

# Parse command-line arguments
parser = argparse.ArgumentParser(description='Test SageMaker endpoint for blueprint detection')
parser.add_argument('endpoint_name', nargs='?', 
                    default=os.environ.get('SAGEMAKER_ENDPOINT_NAME', 'locatrix-blueprint-endpoint'),
                    help='SageMaker endpoint name')
parser.add_argument('image_file', nargs='?', default=None,
                    help='Path to blueprint image file (optional)')
parser.add_argument('--visualize', '-v', action='store_true',
                    help='Draw bounding boxes on image and save visualization')
parser.add_argument('--output', '-o', default=None,
                    help='Output file path for visualization (default: input_file_with_boxes.png)')
parser.add_argument('--region', '-r', default='us-east-2',
                    help='AWS region where endpoint is deployed (default: us-east-2)')
args = parser.parse_args()

ENDPOINT_NAME = args.endpoint_name
IMAGE_FILE = args.image_file
VISUALIZE = args.visualize
OUTPUT_FILE = args.output
AWS_REGION = args.region
CONTENT_TYPE = "application/json"
TIMEOUT_SECONDS = 60  # Timeout for endpoint invocation

def create_test_image(width=640, height=640):
    """Create a test image (simple colored rectangle)"""
    # Create a simple test image
    image = Image.new('RGB', (width, height), color=(255, 255, 255))
    # Draw a simple rectangle (simulating a room)
    draw = ImageDraw.Draw(image)
    draw.rectangle([100, 100, 500, 400], outline=(0, 0, 0), width=2)
    return image

def visualize_detections(image, detections, output_path=None):
    """Draw bounding boxes on image and save visualization"""
    print("\n🎨 Visualizing detections...")
    
    # Create a copy of the image for drawing
    vis_image = image.copy()
    draw = ImageDraw.Draw(vis_image)
    
    # Color mapping for different classes
    colors = {
        'door': (255, 0, 0),      # Red for doors
        'window': (0, 0, 255),   # Blue for windows
    }
    
    # Draw each detection
    for detection in detections:
        bbox = detection.get('bbox', [])
        confidence = detection.get('confidence', 0.0)
        name_hint = detection.get('name_hint', 'unknown')
        
        if len(bbox) != 4:
            continue
        
        x_min, y_min, x_max, y_max = bbox
        
        # Get color for this class
        color = colors.get(name_hint, (0, 255, 0))  # Default to green
        
        # Draw bounding box
        draw.rectangle([x_min, y_min, x_max, y_max], outline=color, width=3)
        
        # Draw label with confidence
        label = f"{name_hint} {confidence:.2f}"
        # Try to get a font, fallback to default if not available
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
        except:
            try:
                font = ImageFont.load_default()
            except:
                font = None
        
        # Calculate text position (above the box)
        text_y = max(0, y_min - 20)
        
        # Draw text background for better visibility
        if font:
            bbox_text = draw.textbbox((x_min, text_y), label, font=font)
        else:
            bbox_text = (x_min, text_y, x_min + len(label) * 6, text_y + 12)
        
        draw.rectangle(bbox_text, fill=color)
        draw.text((x_min, text_y), label, fill=(255, 255, 255), font=font)
    
    # Determine output path
    if output_path is None:
        if IMAGE_FILE:
            base_name = os.path.splitext(IMAGE_FILE)[0]
            output_path = f"{base_name}_with_boxes.png"
        else:
            output_path = "test_image_with_boxes.png"
    elif os.path.isdir(output_path):
        # If output_path is a directory, use input filename
        if IMAGE_FILE:
            base_name = os.path.basename(os.path.splitext(IMAGE_FILE)[0])
            output_path = os.path.join(output_path, f"{base_name}_with_boxes.png")
        else:
            output_path = os.path.join(output_path, "test_image_with_boxes.png")
    
    # Save visualization
    vis_image.save(output_path)
    print(f"✅ Visualization saved to: {output_path}")
    print(f"   Detections: {len(detections)} boxes drawn")
    print(f"   Colors: Red=door, Blue=window")

def check_endpoint_status(region_name='us-east-2'):
    """Check if endpoint is in-service"""
    sagemaker = boto3.client('sagemaker', region_name=region_name)
    try:
        response = sagemaker.describe_endpoint(EndpointName=ENDPOINT_NAME)
        status = response['EndpointStatus']
        return status
    except Exception as e:
        print(f"❌ Error checking endpoint status: {e}")
        return None

def test_endpoint():
    """Test the SageMaker endpoint"""
    print(f"🧪 Testing SageMaker endpoint: {ENDPOINT_NAME}")
    print("")
    
    # Check endpoint status first
    print(f"🔍 Checking endpoint status (region: {AWS_REGION})...")
    status = check_endpoint_status(AWS_REGION)
    if status is None:
        print("⚠️  Could not check endpoint status (endpoint may not exist)")
        print("   Attempting to invoke endpoint anyway...")
        print("   If invocation fails, deploy the endpoint first:")
        print("   See: docs/model-deployment-plan-option-a.md")
        print("")
    else:
        print(f"   Status: {status}")
        
        if status != 'InService':
            print(f"⚠️  Warning: Endpoint is not InService (current: {status})")
            print("   The endpoint may still be starting up or may have failed.")
            if status == 'Creating':
                print("   Please wait for the endpoint to finish creating, then try again.")
            elif status == 'Failed':
                print("   The endpoint creation failed. Check CloudWatch logs for details.")
            print("   Attempting to invoke endpoint anyway...")
            print("")
        else:
            print("✅ Endpoint is InService")
            print("")
    
    # Load or create test image
    if IMAGE_FILE and os.path.exists(IMAGE_FILE):
        print(f"📸 Loading image from: {IMAGE_FILE}")
        try:
            test_image = Image.open(IMAGE_FILE)
            # Convert to RGB if needed
            if test_image.mode != 'RGB':
                test_image = test_image.convert('RGB')
            print(f"   Image size: {test_image.size[0]}x{test_image.size[1]}")
        except Exception as e:
            print(f"❌ Error loading image: {e}")
            return False
    else:
        if IMAGE_FILE:
            print(f"⚠️  Warning: Image file not found: {IMAGE_FILE}")
            print("   Creating test image instead...")
        else:
            print("📸 Creating test image...")
        test_image = create_test_image(640, 640)
    
    # Convert image to base64
    buffer = io.BytesIO()
    # Save as PNG for consistency
    test_image.save(buffer, format='PNG')
    image_bytes = buffer.getvalue()
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    
    # Prepare test input matching expected format
    # The handler expects JSON with 'image_data' field containing base64 image
    test_input = {
        "image_data": image_base64
    }
    
    print("📤 Invoking endpoint (this may take 30-60 seconds on first invocation)...")
    print(f"   Timeout: {TIMEOUT_SECONDS} seconds")
    
    # Create SageMaker runtime client with config
    from botocore.config import Config
    config = Config(
        read_timeout=TIMEOUT_SECONDS,
        retries={'max_attempts': 1}  # Don't retry on timeout
    )
    sagemaker_runtime = boto3.client('sagemaker-runtime', region_name=AWS_REGION, config=config)
    
    start_time = time.time()
    try:
        # Invoke endpoint
        response = sagemaker_runtime.invoke_endpoint(
            EndpointName=ENDPOINT_NAME,
            ContentType=CONTENT_TYPE,
            Body=json.dumps(test_input).encode('utf-8')
        )
        elapsed_time = time.time() - start_time
        print(f"✅ Endpoint responded in {elapsed_time:.2f} seconds")
        print("")
        
        # Parse response
        # TorchServe returns a list of JSON strings, so we need to parse it
        response_body = response['Body'].read().decode('utf-8')
        
        # Handle TorchServe response format (list of JSON strings)
        try:
            # Try parsing as JSON first
            result = json.loads(response_body)
            # If it's a list (TorchServe format), take the first element
            if isinstance(result, list) and len(result) > 0:
                result = json.loads(result[0])
        except (json.JSONDecodeError, TypeError):
            # If parsing fails, try treating as direct JSON
            result = json.loads(response_body)
        
        print("✅ Endpoint invocation successful!")
        print("")
        print("📊 Response:")
        print(json.dumps(result, indent=2))
        print("")
        
        # Validate response format
        if 'detections' in result:
            detections = result['detections']
            print(f"✅ Detections found: {len(detections)}")
            
            if len(detections) > 0:
                print("\n📋 Detection details:")
                for i, detection in enumerate(detections[:5]):  # Show first 5
                    bbox = detection.get('bbox', [])
                    confidence = detection.get('confidence', 0.0)
                    name_hint = detection.get('name_hint', '')
                    print(f"  Detection {i+1}:")
                    print(f"    BBox: {bbox}")
                    print(f"    Confidence: {confidence:.2f}")
                    print(f"    Name hint: {name_hint}")
                
                # Visualize bounding boxes if requested
                if VISUALIZE:
                    visualize_detections(test_image, detections, OUTPUT_FILE)
            else:
                print("ℹ️  No detections found in the test image (this is normal for a simple test image)")
        else:
            print("⚠️  Warning: Response missing 'detections' key")
            print(f"   Response keys: {list(result.keys())}")
            return False
        
        return True
        
    except Exception as e:
        error_type = type(e).__name__
        elapsed_time = time.time() - start_time
        print(f"❌ Error invoking endpoint after {elapsed_time:.2f} seconds: {error_type}")
        print(f"   Error: {str(e)}")
        
        # Check for specific error types
        error_str = str(e).lower()
        if 'not found' in error_str or 'endpoint' in error_str and 'not found' in error_str:
            print("\n💡 Endpoint Not Found:")
            print(f"   The endpoint '{ENDPOINT_NAME}' doesn't exist yet.")
            print("   Deploy the model first using:")
            print("   See: docs/model-deployment-plan-option-a.md")
        elif 'modelerror' in error_str or 'validationerror' in error_str:
            print("\n⚠️  Model/Validation Error:")
            print("   This usually means there's an issue with the inference code or input format.")
            print("   Check CloudWatch logs for the endpoint for more details.")
        elif 'timeout' in error_str or elapsed_time >= TIMEOUT_SECONDS - 1:
            print("\n⚠️  Timeout Error - Possible causes:")
            print("   1. Endpoint is cold-starting (first invocation takes 30-60 seconds)")
            print("   2. Model is taking too long to process")
            print("   3. Check CloudWatch logs for the endpoint")
            print(f"\n   Try increasing TIMEOUT_SECONDS (currently {TIMEOUT_SECONDS}s)")
        else:
            print("\n⚠️  Check CloudWatch logs for the endpoint for more details.")
        
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_endpoint()
    sys.exit(0 if success else 1)
