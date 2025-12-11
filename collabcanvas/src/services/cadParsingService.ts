/**
 * CAD parsing service client for Epic 3 PR2.
 *
 * This calls a backend endpoint that returns an `ExtractionResult`
 * computed by the Python CAD parser / Vision service.
 *
 * Configure the endpoint via:
 * - `VITE_CAD_PARSE_URL` (e.g. http://localhost:8081/parse-cad)
 * - `VITE_USE_BACKEND_CAD_PARSE=true` to enable backend mode
 *
 * When the flag is false or the call fails, the PR2 panel will fall
 * back to its local mock ExtractionResult.
 */

import type { ExtractionResult, FileType } from '../types/extraction';

const DEFAULT_ENDPOINT =
  import.meta.env.VITE_CAD_PARSE_URL ?? 'http://localhost:8081/parse-cad';

export interface ParseCadRequest {
  fileUrl: string;
  fileType: FileType;
  /** Optional: raw file for local dev (will be base64-encoded and sent to backend) */
  file?: File;
}

/**
 * Convert a File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/octet-stream;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function parseCadFile(
  payload: ParseCadRequest
): Promise<ExtractionResult> {
  // Build request body - if file is provided, send base64 bytes
  let requestBody: Record<string, unknown>;

  if (payload.file) {
    const fileBytes = await fileToBase64(payload.file);
    requestBody = {
      fileBytes,
      fileName: payload.file.name,
      fileType: payload.fileType,
    };
  } else {
    requestBody = {
      fileUrl: payload.fileUrl,
      fileType: payload.fileType,
    };
  }

  const response = await fetch(DEFAULT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Backend CAD parse failed (${response.status}): ${
        text || response.statusText
      }`
    );
  }

  const data = (await response.json()) as ExtractionResult;
  return data;
}

export function shouldUseBackendCadParsing(): boolean {
  return import.meta.env.VITE_USE_BACKEND_CAD_PARSE === 'true';
}


