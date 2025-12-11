/**
 * PR1 Test Component - Storage & CAD Upload Testing
 */
import React, { useState } from 'react';
import {
  uploadCadFileMock,
  validateCadFile,
} from '../../services/cadUploadMock';
import type { CadUploadResult, CadUploadError } from '../../services/cadUploadMock';

interface Props {
  prInfo?: any;
}

export const PR1StorageTest: React.FC<Props> = () => {
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
      const estimateId = `test_${Date.now()}`;
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
    <div className="space-y-6">
      {/* Test Description */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">🎯 What This Tests</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• File type validation (PDF, DWG, DXF, PNG, JPG)</li>
          <li>• File size validation (max 50MB)</li>
          <li>• MIME type checking</li>
          <li>• Mock upload simulation with network delay</li>
          <li>• Error handling for invalid files</li>
        </ul>
      </div>

      {/* Supported Formats */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-3">
          ✅ Supported CAD Formats
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="font-semibold text-gray-800 mb-1">PDF</div>
            <div className="text-xs text-gray-600">Exported plans</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="font-semibold text-gray-800 mb-1">DWG</div>
            <div className="text-xs text-gray-600">AutoCAD native</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="font-semibold text-gray-800 mb-1">DXF</div>
            <div className="text-xs text-gray-600">AutoCAD exchange</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="font-semibold text-gray-800 mb-1">PNG/JPG</div>
            <div className="text-xs text-gray-600">Scanned plans</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-green-800 font-medium">
          Maximum file size: 50 MB
        </div>
      </div>

      {/* File Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
        <label className="block">
          <span className="text-lg font-semibold text-gray-700 mb-3 block">
            📤 Select CAD File
          </span>
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-3 file:px-6
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100
              cursor-pointer transition-all"
          />
        </label>

        {/* File Info */}
        {selectedFile && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📄</span>
              File Information
            </h4>
            <dl className="space-y-2 text-sm">
              <div className="flex border-b border-gray-100 pb-2">
                <dt className="font-medium text-gray-600 w-32">Name:</dt>
                <dd className="text-gray-900 flex-1 break-all">{selectedFile.name}</dd>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
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
          className={`p-4 rounded-lg border-2 shadow-md ${
            validationResult.valid
              ? 'bg-green-50 border-green-500'
              : 'bg-red-50 border-red-500'
          }`}
        >
          <h3 className="font-bold mb-2 flex items-center gap-2 text-lg">
            {validationResult.valid ? (
              <>
                <span className="text-3xl">✅</span>
                <span className="text-green-900">Validation Passed</span>
              </>
            ) : (
              <>
                <span className="text-3xl">❌</span>
                <span className="text-red-900">Validation Failed</span>
              </>
            )}
          </h3>
          {validationResult.error && (
            <div className="mt-3 bg-white bg-opacity-50 p-3 rounded">
              <p className="text-sm font-semibold text-red-800 mb-1">
                Error Code: <code className="bg-red-100 px-2 py-1 rounded">{validationResult.error.code}</code>
              </p>
              <p className="text-sm text-red-700">
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
          className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg
            transform transition-all duration-200
            ${
              isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:scale-105 active:scale-95'
            }`}
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-3">
              <svg
                className="animate-spin h-6 w-6"
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
              Uploading to Mock Storage...
            </span>
          ) : (
            '🚀 Upload to Storage Service (Mock)'
          )}
        </button>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow">
          <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            Upload Error
          </h4>
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 p-6 rounded-lg shadow-lg">
          <h3 className="text-2xl font-bold text-green-900 mb-4 flex items-center gap-3">
            <span className="text-4xl">🎉</span>
            Upload Successful!
          </h3>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <dl className="space-y-3 text-sm">
              <div className="border-b border-gray-200 pb-2">
                <dt className="font-semibold text-gray-700 mb-1">Storage Path:</dt>
                <dd className="text-gray-900 font-mono text-xs bg-gray-50 p-2 rounded">
                  {uploadResult.filePath}
                </dd>
              </div>
              <div className="border-b border-gray-200 pb-2">
                <dt className="font-semibold text-gray-700 mb-1">File URL:</dt>
                <dd className="text-blue-600 break-all text-xs">
                  <a
                    href={uploadResult.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-800"
                  >
                    {uploadResult.fileUrl}
                  </a>
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="font-semibold text-gray-700">File Size:</dt>
                  <dd className="text-gray-900">{formatFileSize(uploadResult.fileSize)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-700">Content Type:</dt>
                  <dd className="text-gray-900 text-xs">{uploadResult.contentType}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-700">Uploaded At:</dt>
                  <dd className="text-gray-900 text-xs">
                    {new Date(uploadResult.uploadedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-700">Estimate ID:</dt>
                  <dd className="text-gray-900 font-mono text-xs">{uploadResult.estimateId}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Implementation Note */}
      <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
        <h4 className="font-semibold text-purple-900 mb-2">🔧 Implementation Details</h4>
        <div className="text-sm text-purple-800 space-y-1">
          <p><strong>Backend:</strong> <code className="bg-purple-100 px-2 py-0.5 rounded">functions_py/services/storage_service.py</code></p>
          <p><strong>Frontend Mock:</strong> <code className="bg-purple-100 px-2 py-0.5 rounded">src/services/cadUploadMock.ts</code></p>
          <p><strong>Tests:</strong> 40+ unit tests in <code className="bg-purple-100 px-2 py-0.5 rounded">test_storage_service.py</code></p>
          <p className="mt-2 text-xs">Currently using mock service. Backend will connect via Firebase Functions.</p>
        </div>
      </div>
    </div>
  );
};

