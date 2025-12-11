/**
 * Mock service for CAD file uploads during development/testing.
 * Simulates the Python storage service behavior without actual Firebase calls.
 */

export interface CadUploadResult {
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  estimateId: string;
}

export interface CadUploadError {
  code: string;
  message: string;
}

// Allowed CAD file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.dwg', '.dxf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/vnd.dwg',
  'image/x-dwg',
  'application/x-dwg',
  'application/dxf',
  'image/vnd.dxf',
  'image/png',
  'image/jpeg',
];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validate CAD file before upload.
 */
export function validateCadFile(
  file: File
): { valid: true } | { valid: false; error: CadUploadError } {
  // Check extension
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: {
        code: 'invalid-file-type',
        message: `File type '${ext}' not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      },
    };
  }

  // Check MIME type
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: {
        code: 'invalid-mime-type',
        message: `MIME type '${file.type}' not allowed.`,
      },
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const actualMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: {
        code: 'file-size-exceeded',
        message: `File size ${actualMb}MB exceeds maximum ${MAX_FILE_SIZE_MB}MB`,
      },
    };
  }

  return { valid: true };
}

/**
 * Mock upload CAD file.
 * Simulates upload delay and returns mock result.
 */
export async function uploadCadFileMock(
  estimateId: string,
  file: File
): Promise<CadUploadResult> {
  // Validate file
  const validation = validateCadFile(file);
  if (!validation.valid) {
    throw new Error(validation.error.message);
  }

  // Simulate network delay (500ms - 2s)
  const delay = 500 + Math.random() * 1500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate occasional errors (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Network error: Failed to upload file');
  }

  // Create mock result
  const result: CadUploadResult = {
    fileUrl: `https://storage.googleapis.com/truecost-dev.appspot.com/cad/${estimateId}/${file.name}`,
    filePath: `cad/${estimateId}/${file.name}`,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    estimateId,
  };

  return result;
}

/**
 * Mock get CAD file URL.
 */
export async function getCadFileUrlMock(
  estimateId: string,
  filename: string
): Promise<string | null> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // For mock, always return a URL
  return `https://storage.googleapis.com/truecost-dev.appspot.com/cad/${estimateId}/${filename}`;
}

/**
 * Mock delete CAD file.
 */
export async function deleteCadFileMock(
  estimateId: string,
  filename: string
): Promise<boolean> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // For mock, always succeed
  return true;
}

/**
 * Mock list CAD files for an estimate.
 */
export async function listCadFilesMock(
  estimateId: string
): Promise<CadUploadResult[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Return empty array or mock files
  // In real usage, you'd maintain state of uploaded files
  return [];
}

/**
 * Check if we should use mock service (based on env var).
 */
export function shouldUseCadUploadMock(): boolean {
  return import.meta.env.VITE_USE_MOCK_CAD_UPLOAD === 'true';
}

