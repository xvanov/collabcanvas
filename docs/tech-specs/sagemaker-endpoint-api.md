# SageMaker Endpoint API Documentation

**Endpoint:** SageMaker Real-time Inference Endpoint  
**Content Type:** `application/json`  
**Purpose:** Room detection on architectural blueprints

---

## Overview

The SageMaker endpoint processes blueprint images and Textract analysis results to detect room boundaries. It returns labeled room detections with bounding boxes and confidence scores.

---

## Input Format

The endpoint expects a JSON payload with the following structure:

### Required Fields

```json
{
  "text_blocks": [
    {
      "id": "string",
      "text": "string",
      "geometry": {
        "BoundingBox": {
          "Left": 0.0-1.0,
          "Top": 0.0-1.0,
          "Width": 0.0-1.0,
          "Height": 0.0-1.0
        }
      }
    }
  ],
  "layout_blocks": [
    {
      "id": "string",
      "blockType": "PAGE|TABLE|CELL|...",
      "geometry": {
        "BoundingBox": {
          "Left": 0.0-1.0,
          "Top": 0.0-1.0,
          "Width": 0.0-1.0,
          "Height": 0.0-1.0
        }
      }
    }
  ],
  "metadata": {
    "image_width": 1000,
    "image_height": 1000,
    "pages": 1
  }
}
```

### Optional Fields

```json
{
  "image_data": "base64-encoded-image-string",
  "image_metadata": {
    "format": "png|jpg|pdf",
    "original_size": 12345,
    "preprocessed_size": 12345,
    "target_width": 640,
    "target_height": 640
  },
  "intermediate_results": [
    {
      "id": "room_001",
      "bounding_box": [x_min, y_min, x_max, y_max],
      "confidence": 0.85
    }
  ]
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text_blocks` | Array | Yes | Text blocks extracted by Textract |
| `layout_blocks` | Array | Yes | Layout blocks (tables, cells) from Textract |
| `metadata` | Object | Yes | Image metadata (width, height, pages) |
| `image_data` | String | No | Base64-encoded image bytes |
| `image_metadata` | Object | No | Image preprocessing metadata |
| `intermediate_results` | Array | No | Previous detection results for refinement |

### Text Block Format

```json
{
  "id": "text_001",
  "text": "Room 101",
  "geometry": {
    "BoundingBox": {
      "Left": 0.1,    // Normalized 0.0-1.0
      "Top": 0.1,     // Normalized 0.0-1.0
      "Width": 0.2,   // Normalized 0.0-1.0
      "Height": 0.05  // Normalized 0.0-1.0
    }
  }
}
```

### Layout Block Format

```json
{
  "id": "layout_001",
  "blockType": "TABLE",  // PAGE, TABLE, CELL, etc.
  "geometry": {
    "BoundingBox": {
      "Left": 0.1,
      "Top": 0.1,
      "Width": 0.3,
      "Height": 0.4
    }
  }
}
```

### Image Data Format

- **Encoding:** Base64-encoded image bytes
- **Format:** PNG, JPG, or PDF (as specified in `image_metadata.format`)
- **Size:** Recommended 640x640 for YOLOv8 models (will be resized if needed)

---

## Output Format

The endpoint returns a JSON response with room detections:

### Response Structure

```json
{
  "detections": [
    {
      "bbox": [x_min, y_min, x_max, y_max],
      "confidence": 0.85,
      "name_hint": "Room 101",
      "vertices": [
        [x1, y1],
        [x2, y2],
        [x3, y3],
        [x4, y4]
      ]
    }
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `detections` | Array | List of detected rooms |
| `detections[].bbox` | Array[4] | Bounding box `[x_min, y_min, x_max, y_max]` in pixel coordinates |
| `detections[].confidence` | Float | Detection confidence score (0.0-1.0) |
| `detections[].name_hint` | String | Optional room name/label hint |
| `detections[].vertices` | Array | Optional precise polygon vertices (for Growth format) |

### Bounding Box Format

- **Coordinates:** Pixel coordinates relative to original image dimensions
- **Format:** `[x_min, y_min, x_max, y_max]`
- **Example:** `[100, 150, 400, 500]` means:
  - Top-left corner: (100, 150)
  - Bottom-right corner: (400, 500)
  - Width: 300 pixels
  - Height: 350 pixels

### Confidence Score

- **Range:** 0.0 to 1.0
- **Interpretation:**
  - `0.9-1.0`: Very high confidence
  - `0.7-0.9`: High confidence
  - `0.5-0.7`: Medium confidence
  - `<0.5`: Low confidence (may be filtered out)

---

## Example Requests

### Minimal Request (Text/Layout Only)

```bash
curl -X POST \
  https://runtime.sagemaker.us-east-1.amazonaws.com/endpoints/location-detection-endpoint/invocations \
  -H "Content-Type: application/json" \
  -d '{
    "text_blocks": [
      {
        "id": "text_001",
        "text": "Room 101",
        "geometry": {
          "BoundingBox": {"Left": 0.1, "Top": 0.1, "Width": 0.2, "Height": 0.05}
        }
      }
    ],
    "layout_blocks": [
      {
        "id": "layout_001",
        "blockType": "TABLE",
        "geometry": {
          "BoundingBox": {"Left": 0.1, "Top": 0.1, "Width": 0.3, "Height": 0.4}
        }
      }
    ],
    "metadata": {
      "image_width": 1000,
      "image_height": 1000,
      "pages": 1
    }
  }'
```

### Full Request (With Image)

```bash
# Using Python script (recommended)
python scripts/test-sagemaker-endpoint.py \
  --endpoint-name location-detection-endpoint \
  --image-path blueprint.png

# Or using AWS CLI
aws sagemaker-runtime invoke-endpoint \
  --endpoint-name location-detection-endpoint \
  --content-type application/json \
  --body file://input.json \
  output.json
```

### Using Python boto3

```python
import boto3
import json
import base64

sagemaker_runtime = boto3.client('sagemaker-runtime')

# Load image
with open('blueprint.png', 'rb') as f:
    image_bytes = f.read()
image_base64 = base64.b64encode(image_bytes).decode('utf-8')

# Prepare input
input_data = {
    'text_blocks': [...],
    'layout_blocks': [...],
    'metadata': {
        'image_width': 1000,
        'image_height': 1000
    },
    'image_data': image_base64,
    'image_metadata': {
        'format': 'png',
        'original_size': len(image_bytes)
    }
}

# Invoke endpoint
response = sagemaker_runtime.invoke_endpoint(
    EndpointName='location-detection-endpoint',
    ContentType='application/json',
    Body=json.dumps(input_data)
)

# Parse response
result = json.loads(response['Body'].read().decode('utf-8'))
print(json.dumps(result, indent=2))
```

---

## Example Responses

### Success Response

```json
{
  "detections": [
    {
      "bbox": [100, 150, 400, 500],
      "confidence": 0.92,
      "name_hint": "Room 101"
    },
    {
      "bbox": [450, 150, 800, 500],
      "confidence": 0.88,
      "name_hint": "Room 102"
    },
    {
      "bbox": [100, 550, 400, 900],
      "confidence": 0.85,
      "name_hint": "Room 103"
    }
  ]
}
```

### Empty Response (No Detections)

```json
{
  "detections": []
}
```

### Error Response

If the endpoint encounters an error, it will return an error response (format depends on model implementation):

```json
{
  "error": {
    "code": "MODEL_ERROR",
    "message": "Invalid input format"
  }
}
```

---

## Testing

### Prerequisites

Install boto3 in your virtual environment:
```bash
# If using venv
venv/bin/python3 -m pip install boto3

# Or activate venv and install
source venv/bin/activate  # if activate script exists
pip install boto3
```

### Quick Test Command

```bash
# Test with image (using venv Python)
venv/bin/python3 scripts/test-sagemaker-endpoint.py \
  --endpoint-name location-detection-endpoint \
  --image-path tests/fixtures/blueprints/sample-blueprint.png

# Test without image (text/layout only)
venv/bin/python3 scripts/test-sagemaker-endpoint.py \
  --endpoint-name location-detection-endpoint \
  --no-textract-mock

# Save response to file
venv/bin/python3 scripts/test-sagemaker-endpoint.py \
  --endpoint-name location-detection-endpoint \
  --image-path blueprint.png \
  --output-file response.json
```

### Using Environment Variable

```bash
export SAGEMAKER_ENDPOINT_NAME=location-detection-endpoint
venv/bin/python3 scripts/test-sagemaker-endpoint.py --image-path blueprint.png
```

**Note:** The endpoint must be deployed first. If you see "Endpoint not found", deploy the model using `docs/model-deployment-plan-option-a.md`.

---

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `ValidationError` | Invalid input format | Check input JSON structure |
| `ModelError` | Model processing error | Check model logs, verify input data |
| `ServiceUnavailable` | Endpoint not ready | Wait for endpoint to be in-service |
| `Throttling` | Too many requests | Implement retry with backoff |

### Retry Logic

The service implements exponential backoff retry:
- Initial delay: 1 second
- Max attempts: 3
- Backoff rate: 2.0 (1s, 2s, 4s)

---

## Performance

### Expected Latency

- **With image:** 2-5 seconds
- **Text/layout only:** 1-3 seconds
- **Total processing:** < 30 seconds (including Textract)

### Throughput

- **Concurrent requests:** Depends on instance type
- **ml.t2.medium:** ~2-5 requests/second
- **ml.m5.large:** ~10-20 requests/second

---

## Cost Considerations

### Endpoint Costs

- **ml.t2.medium:** ~$0.05/hour (~$36/month if running 24/7)
- **Serverless:** Pay per request (better for MVP)

### Recommendations

- Use serverless inference for MVP (no idle costs)
- Scale to 0 when not in use
- Monitor CloudWatch metrics for usage

---

## Integration Notes

### From Pipeline

The endpoint is invoked from `src/pipeline/stage_3_final.py`:

```python
sagemaker_service = SageMakerService()
model_input = sagemaker_service.preprocess_input(
    textract_result,
    blueprint_image_data=blueprint_image_data,
    image_format=image_format
)
model_response = sagemaker_service.invoke_endpoint(
    endpoint_name=sagemaker_endpoint_name,
    input_data=model_input
)
results = sagemaker_service.postprocess_output(
    model_response,
    output_format='mvp',
    confidence_threshold=0.7
)
```

### Post-Processing

The service automatically:
- Filters detections by confidence threshold (default: 0.7)
- Validates bounding boxes
- Filters overlapping detections
- Converts to PRD output format

---

**Last Updated:** 2025-01-15  
**Endpoint Version:** 1.0.0  
**Model:** YOLOv8-seg (pre-trained)

