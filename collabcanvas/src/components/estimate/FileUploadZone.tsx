import { useRef, useState } from 'react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string;
}

/**
 * FileUploadZone - Drag/drop upload area with idle, hover, and drag-over states.
 * Accepts: PDF, DWG, DXF, PNG, JPG
 */
export function FileUploadZone({
  onFileSelect,
  acceptedTypes = '.pdf,.dwg,.dxf,.png,.jpg,.jpeg',
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`
        glass-panel p-8 border-2 border-dashed cursor-pointer transition-all duration-200
        ${
          isDragging
            ? 'border-truecost-cyan bg-truecost-cyan/10'
            : 'border-truecost-glass-border hover:border-truecost-cyan/50'
        }
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isDragging ? 'bg-truecost-cyan/20' : 'bg-truecost-glass-bg'
          }`}
        >
          <svg
            className={`w-8 h-8 transition-colors ${
              isDragging ? 'text-truecost-cyan' : 'text-truecost-text-secondary'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <div>
          <p className="font-body text-body text-truecost-text-primary mb-2">
            {isDragging ? 'Drop file here' : 'Drag and drop your files here'}
          </p>
          <p className="font-body text-body-meta text-truecost-text-secondary">or click to browse</p>
        </div>

        <p className="font-body text-body-meta text-truecost-text-muted">
          Accepts: PDF, DWG, DXF, PNG, JPG (Max 50MB)
        </p>
      </div>
    </div>
  );
}

