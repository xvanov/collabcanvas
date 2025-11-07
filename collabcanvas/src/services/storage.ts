/**
 * Firebase Storage service for handling file uploads
 * Specifically for construction plan images
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import type { BackgroundImage } from '../types';

/**
 * Upload a construction plan image to Firebase Storage
 */
export async function uploadConstructionPlanImage(
  file: File,
  userId: string,
  canvasId?: string
): Promise<BackgroundImage> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `construction-plan-${timestamp}-${file.name}`;
    const storagePath = canvasId 
      ? `construction-plans/${canvasId}/${fileName}`
      : `construction-plans/${userId}/${fileName}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Get image dimensions
    const imageDimensions = await getImageDimensions(file);

    // Create BackgroundImage object
    const backgroundImage: BackgroundImage = {
      id: `bg-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      url: downloadURL,
      fileName: file.name,
      fileSize: file.size,
      width: imageDimensions.width,
      height: imageDimensions.height,
      aspectRatio: imageDimensions.width / imageDimensions.height,
      uploadedAt: timestamp,
      uploadedBy: userId,
    };

    return backgroundImage;
  } catch (error) {
    console.error('Error uploading construction plan image:', error);
    throw error;
  }
}

/**
 * Delete a construction plan image from Firebase Storage
 */
export async function deleteConstructionPlanImage(imageUrl: string): Promise<void> {
  try {
    // Extract the storage path from the URL
    const url = new URL(imageUrl);
    // Match path with optional query parameters: /o/path?query or /o/path
    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
    
    if (!pathMatch) {
      throw new Error('Invalid image URL');
    }

    const storagePath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, storagePath);
    
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting construction plan image:', error);
    throw error;
  }
}

/**
 * Get image dimensions from a file
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }

  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return { isValid: false, error: 'Supported formats: JPEG, PNG, WebP' };
  }

  return { isValid: true };
}
