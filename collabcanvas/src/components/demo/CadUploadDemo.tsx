/**
 * Demo component for testing CAD upload functionality (PR1)
 * Shows validation and mock upload in action
 */
import React, { useState } from 'react';
import {
  uploadCadFileMock,
  validateCadFile,
} from '../../services/cadUploadMock';
import type { CadUploadResult, CadUploadError } from '../../services/cadUploadMock';

export const CadUploadDemo: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: CadUploadError;
  } | null>(null);
  const [uploadResult, setUploadResult] = useState<CadUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setValidationResult(null);
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setUploadError(null);

    // Validate immediately
    const validation = validateCadFile(file);
    setValidationResult(validation);
  };

  const handleUpload = async () => {
    if (!selectedFile || !validationResult?.valid) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      // Mock estimate ID
      const estimateId = `est_demo_${Date.now()}`;
      const result = await uploadCadFileMock(estimateId, selectedFile);
      setUploadResult(result);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          🔧 PR1 Demo: CAD Upload Service
        </h1>
        <p className="text-blue-100">
          Test file validation and mock upload functionality
        </p>
      </div>

      {/* Supported Formats Info */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">
          📋 Supported Formats
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>PDF</strong> - Exported plans</li>
          <li>• <strong>DWG</strong> - AutoCAD native format</li>
          <li>• <strong>DXF</strong> - AutoCAD exchange format</li>
          <li>• <strong>PNG/JPG</strong> - Scanned or photographed plans</li>
          <li>• <strong>Max Size:</strong> 50 MB</li>
        </ul>
      </div>

      {/* File Upload */}
      <div className="bg-white p-6 rounded-lg shadow-md border-2 border-dashed border-gray-300">
        <label className="block mb-4">
          <span className="text-lg font-semibold text-gray-700 mb-2 block">
            Select CAD File
          </span>
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
        </label>

        {/* File Info */}
        {selectedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-2">File Info:</h4>
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="font-medium text-gray-600 w-32">Name:</dt>
                <dd className="text-gray-900">{selectedFile.name}</dd>
              </div>
              <div className="flex">
                <dt className="font-medium text-gray-600 w-32">Size:</dt>
                <dd className="text-gray-900">{formatFileSize(selectedFile.size)}</dd>
              </div>
              <div className="flex">
                <dt className="font-medium text-gray-600 w-32">Type:</dt>
                <dd className="text-gray-900">{selectedFile.type || 'Unknown'}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div
          className={`p-4 rounded-lg border-2 ${
            validationResult.valid
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
          }`}
        >
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            {validationResult.valid ? (
              <>
                <span className="text-2xl">✅</span>
                <span className="text-green-900">Validation Passed</span>
              </>
            ) : (
              <>
                <span className="text-2xl">❌</span>
                <span className="text-red-900">Validation Failed</span>
              </>
            )}
          </h3>
          {validationResult.error && (
            <div className="mt-2">
              <p className="text-sm font-medium text-red-800">
                Error Code: {validationResult.error.code}
              </p>
              <p className="text-sm text-red-700 mt-1">
                {validationResult.error.message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upload Button */}
      {validationResult?.valid && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white shadow-lg
            ${
              isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
            }
            transition-all duration-200`}
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Uploading...
            </span>
          ) : (
            '🚀 Upload to Mock Storage'
          )}
        </button>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h4 className="font-semibold text-red-900 mb-1">Upload Error</h4>
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="bg-green-50 border-2 border-green-500 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            Upload Successful!
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex flex-col">
              <dt className="font-semibold text-gray-700">File URL:</dt>
              <dd className="text-blue-600 break-all mt-1">
                <a href={uploadResult.fileUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {uploadResult.fileUrl}
                </a>
              </dd>
            </div>
            <div className="flex">
              <dt className="font-semibold text-gray-700 w-36">File Path:</dt>
              <dd className="text-gray-900">{uploadResult.filePath}</dd>
            </div>
            <div className="flex">
              <dt className="font-semibold text-gray-700 w-36">File Name:</dt>
              <dd className="text-gray-900">{uploadResult.fileName}</dd>
            </div>
            <div className="flex">
              <dt className="font-semibold text-gray-700 w-36">File Size:</dt>
              <dd className="text-gray-900">{formatFileSize(uploadResult.fileSize)}</dd>
            </div>
            <div className="flex">
              <dt className="font-semibold text-gray-700 w-36">Content Type:</dt>
              <dd className="text-gray-900">{uploadResult.contentType}</dd>
            </div>
            <div className="flex">
              <dt className="font-semibold text-gray-700 w-36">Uploaded At:</dt>
              <dd className="text-gray-900">
                {new Date(uploadResult.uploadedAt).toLocaleString()}
              </dd>
            </div>
            <div className="flex">
              <dt className="font-semibold text-gray-700 w-36">Estimate ID:</dt>
              <dd className="text-gray-900 font-mono">{uploadResult.estimateId}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <h4 className="font-semibold text-yellow-900 mb-2">ℹ️ Note</h4>
        <p className="text-sm text-yellow-800">
          This demo uses the <strong>mock service</strong> (cadUploadMock.ts).
          No actual files are uploaded. The service simulates network delays and
          validation. In production, this will connect to the Python backend
          (storage_service.py) via Firebase Functions.
        </p>
      </div>
    </div>
  );
};

