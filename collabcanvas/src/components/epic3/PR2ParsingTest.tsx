/**
 * PR2 Test Component - CAD Parsing (DWG/DXF + Vision)
 *
 * This panel builds on PR1's storage mock for uploads, but **all**
 * parsing data shown comes from the backend Python services:
 *
 * - Uploads the CAD file via the mock storage helper (PR1)
 * - Calls the backend CAD parsing endpoint (`/parse-cad`)
 * - Displays the returned `ExtractionResult` only
 *
 * There is no longer any frontend-synthesized mock extraction data:
 * if the backend call fails, the panel surfaces the error and does
 * not fabricate rooms/walls/openings.
 */

import React, { useState } from 'react';
import {
  uploadCadFileMock,
  validateCadFile,
} from '../../services/cadUploadMock';
import type { CadUploadResult, CadUploadError } from '../../services/cadUploadMock';
import {
  parseCadFile,
  shouldUseBackendCadParsing,
} from '../../services/cadParsingService';
import type {
  ExtractionResult,
  FileType,
} from '../../types/extraction';

interface Props {
  prInfo?: any;
}

type ViewMode = 'summary' | 'json';

function getFileTypeFromName(fileName: string): FileType {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  switch (ext) {
    case '.dwg':
      return 'dwg';
    case '.dxf':
      return 'dxf';
    case '.png':
      return 'png';
    case '.jpg':
    case '.jpeg':
      return 'jpg';
    default:
      return 'pdf';
  }
}

function getExtractionMethod(fileType: FileType): ExtractionMethod {
  return fileType === 'dwg' || fileType === 'dxf' ? 'ezdxf' : 'vision';
}

export const PR2ParsingTest: React.FC<Props> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<
    { valid: boolean; error?: CadUploadError } | null
  >(null);
  const [uploadResult, setUploadResult] = useState<CadUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setValidationResult(null);
      setUploadResult(null);
      setExtractionResult(null);
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setExtractionResult(null);
    setUploadError(null);

    const validation = validateCadFile(file);
    setValidationResult(validation);
  };

  const handleUploadAndParse = async () => {
    if (!selectedFile || !validationResult?.valid) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setExtractionResult(null);

    try {
      const estimateId = `pr2_test_${Date.now()}`;
      const upload = await uploadCadFileMock(estimateId, selectedFile);
      setUploadResult(upload);

      const fileType = getFileTypeFromName(upload.fileName);

      if (!shouldUseBackendCadParsing()) {
        setUploadError(
          'Backend CAD parsing is disabled. Set VITE_USE_BACKEND_CAD_PARSE=true and VITE_CAD_PARSE_URL to your parse endpoint.'
        );
        return;
      }

      try {
        // Pass the actual file to the parsing service so it can send bytes to backend
        const backendResult = await parseCadFile({
          fileUrl: upload.fileUrl,
          fileType,
          file: selectedFile,
        });
        setExtractionResult(backendResult);
      } catch (err) {
        const message =
          err instanceof Error
            ? `Backend parse failed: ${err.message}`
            : 'Backend parse failed.';
        setUploadError(message);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload/parse failed');
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
          <li>• PR2 parsing workflow on top of PR1 storage mock</li>
          <li>• File-type based routing to ezdxf vs GPT-4o Vision paths</li>
          <li>• Unified ExtractionResult schema (rooms, walls, openings, scale)</li>
          <li>• Visualization of extraction method, confidence, and raw payload</li>
        </ul>
      </div>

      {/* File Selection */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
        <label className="block">
          <span className="text-lg font-semibold text-gray-700 mb-3 block">
            📤 Select CAD File for Parsing
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
                Error Code:{' '}
                <code className="bg-red-100 px-2 py-1 rounded">
                  {validationResult.error.code}
                </code>
              </p>
              <p className="text-sm text-red-700">{validationResult.error.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Upload + Parse Button */}
      {validationResult?.valid && (
        <button
          onClick={handleUploadAndParse}
          disabled={isUploading}
          className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg shadow-lg
            transform transition-all duration-200
            ${
              isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-105 active:scale-95'
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
              Uploading & Parsing CAD (Mock)...
            </span>
          ) : (
            '🧠 Upload & Run Mock Parsing Pipeline'
          )}
        </button>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow">
          <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            Upload / Parse Error
          </h4>
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      {/* Extraction Result */}
      {extractionResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>📐</span>
              ExtractionResult
            </h3>
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                className={`px-3 py-1 text-sm font-medium border rounded-l-md ${
                  viewMode === 'summary'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
                onClick={() => setViewMode('summary')}
              >
                Summary View
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-sm font-medium border rounded-r-md ${
                  viewMode === 'json'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
                onClick={() => setViewMode('json')}
              >
                JSON View
              </button>
            </div>
          </div>

          {/* Summary View */}
          {viewMode === 'summary' && (
            <div className="space-y-4">
              {/* Top-level info */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">
                      Extraction Method
                    </div>
                    <div className="text-lg font-bold text-indigo-900">
                      {extractionResult.extractionMethod === 'ezdxf'
                        ? 'ezdxf (DWG/DXF)'
                        : 'GPT-4o Vision (PDF/Images)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">
                      File Type
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {extractionResult.fileType.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase">
                      Confidence
                    </div>
                    <div className="text-lg font-bold text-emerald-700">
                      {(extractionResult.extractionConfidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="ml-auto text-xs text-gray-600 break-all">
                    <span className="font-semibold">File URL:</span>{' '}
                    <a
                      href={extractionResult.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-indigo-700 hover:text-indigo-900"
                    >
                      {extractionResult.fileUrl}
                    </a>
                  </div>
                </div>
              </div>

              {/* Space Model Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Rooms */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span>🛋️</span>
                    Rooms ({extractionResult.spaceModel.rooms.length})
                  </h4>
                  {extractionResult.spaceModel.rooms.length === 0 ? (
                    <p className="text-xs text-gray-500">No rooms detected.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Name
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Type
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Sqft
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Confidence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractionResult.spaceModel.rooms.map((room) => (
                            <tr key={room.id} className="border-t border-gray-100">
                              <td className="px-2 py-1">{room.name}</td>
                              <td className="px-2 py-1 text-gray-600">{room.type}</td>
                              <td className="px-2 py-1">
                                {room.sqft.toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}
                              </td>
                              <td className="px-2 py-1">
                                {(room.confidence * 100).toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Walls */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span>🧱</span>
                    Walls ({extractionResult.spaceModel.walls.length})
                  </h4>
                  {extractionResult.spaceModel.walls.length === 0 ? (
                    <p className="text-xs text-gray-500">No walls detected.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              ID
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Type
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Length (ft)
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Confidence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractionResult.spaceModel.walls.map((wall) => (
                            <tr key={wall.id} className="border-t border-gray-100">
                              <td className="px-2 py-1">{wall.id}</td>
                              <td className="px-2 py-1 text-gray-600">{wall.type}</td>
                              <td className="px-2 py-1">
                                {wall.length.toLocaleString(undefined, {
                                  maximumFractionDigits: 1,
                                })}
                              </td>
                              <td className="px-2 py-1">
                                {(wall.confidence * 100).toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Openings */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <span>🚪</span>
                    Openings ({extractionResult.spaceModel.openings.length})
                  </h4>
                  {extractionResult.spaceModel.openings.length === 0 ? (
                    <p className="text-xs text-gray-500">No openings detected.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Type
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Size (w×h)
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Wall
                            </th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">
                              Confidence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractionResult.spaceModel.openings.map((opening) => (
                            <tr key={opening.id} className="border-t border-gray-100">
                              <td className="px-2 py-1 capitalize">{opening.type}</td>
                              <td className="px-2 py-1">
                                {opening.width} × {opening.height} ft
                              </td>
                              <td className="px-2 py-1 text-xs text-gray-600">
                                {opening.inWall}
                              </td>
                              <td className="px-2 py-1">
                                {(opening.confidence * 100).toFixed(0)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Layout Narrative */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">
                  🧭 Layout Narrative
                </h4>
                <p className="text-sm text-amber-900 whitespace-pre-line">
                  {extractionResult.spatialRelationships.layoutNarrative}
                </p>
              </div>
            </div>
          )}

          {/* JSON View */}
          {viewMode === 'json' && (
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-auto max-h-[480px]">
              <pre>{JSON.stringify(extractionResult, null, 2)}</pre>
            </div>
          )}

          {/* Implementation Note */}
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <h4 className="font-semibold text-purple-900 mb-2">🔧 Implementation Details</h4>
            <div className="text-sm text-purple-800 space-y-1">
              <p>
                <strong>Backend (Python):</strong>{' '}
                <code className="bg-purple-100 px-2 py-0.5 rounded">
                  functions_py/services/cad_parser.py
                </code>{' '}
                &amp;{' '}
                <code className="bg-purple-100 px-2 py-0.5 rounded">
                  functions_py/services/vision_service.py
                </code>
              </p>
              <p>
                <strong>Types (TS):</strong>{' '}
                <code className="bg-purple-100 px-2 py-0.5 rounded">
                  src/types/extraction.ts
                </code>
              </p>
              <p>
                <strong>Tests:</strong>{' '}
                <code className="bg-purple-100 px-2 py-0.5 rounded">
                  functions_py/tests/unit/test_cad_parser.py
                </code>{' '}
                &amp;{' '}
                <code className="bg-purple-100 px-2 py-0.5 rounded">
                  functions_py/tests/unit/test_vision_service.py
                </code>
              </p>
              <p className="mt-2 text-xs">
                This panel currently uses a mock ExtractionResult built in the browser to
                validate schema and UI. A later PR will replace this with real calls to
                deployed Python Functions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


