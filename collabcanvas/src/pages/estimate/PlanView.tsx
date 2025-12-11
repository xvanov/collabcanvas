import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';
import { FileUploadZone } from '../../components/estimate/FileUploadZone';
import { FilePreview } from '../../components/estimate/FilePreview';
import { ChatPanel } from '../../components/estimate/ChatPanel';
import { CADDataTable } from '../../components/estimate/CADDataTable';
import type { BackgroundImage } from '../../types';

/**
 * PlanView - Plan stage UI: upload, CAD data, chat, overrides.
 */
export function PlanView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preparedBackground, setPreparedBackground] = useState<BackgroundImage | null>(null);
  const [projectDescription, setProjectDescription] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [useUnionLabor, setUseUnionLabor] = useState(false);

  const prepareBackgroundImage = (file: File): Promise<BackgroundImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          resolve({
            id: `bg-${Date.now()}`,
            url: dataUrl,
            fileName: file.name,
            fileSize: file.size,
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
            uploadedAt: Date.now(),
            uploadedBy: 'local',
          });
        };
        img.onerror = reject;
        img.src = dataUrl;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    prepareBackgroundImage(file)
      .then((bg) => setPreparedBackground(bg))
      .catch((err) => {
        console.error('Failed to prepare background image', err);
        setPreparedBackground(null);
      });
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreparedBackground(null);
  };

  const handleGenerateEstimate = () => {
    const state = preparedBackground ? { state: { backgroundImage: preparedBackground } } : undefined;
    navigate(`/estimate/${id}/canvas`, state);
  };

  return (
    <AuthenticatedLayout>
      <div className="container-spacious max-w-full pt-20 pb-14 md:pt-24">
        {/* Header */}
        <div className="mb-6 space-y-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-body-meta font-medium text-white border border-truecost-glass-border">
            Plan & Review
          </span>
          <h1 className="font-heading text-h1 text-truecost-text-primary">
            Upload plans to generate your estimate
          </h1>
          <p className="font-body text-body text-truecost-text-secondary/90">
            Share your CAD or plan files so we can analyze materials, labor, and timelines with the assistant.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          {/* Left: Upload + Data */}
          <div className="space-y-6">
            <div>
              {!uploadedFile ? (
                <FileUploadZone onFileSelect={handleFileSelect} />
              ) : (
                <FilePreview file={uploadedFile} onRemove={handleRemoveFile} />
              )}
            </div>

            <div className="glass-panel p-5 space-y-3">
              <h3 className="font-heading text-h3 text-truecost-text-primary mb-3">Additional Details</h3>

              <div className="space-y-2">
                <label className="block font-body text-body font-medium text-truecost-text-primary">
                  Project Description
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe specific requirements, constraints, or preferences..."
                  rows={4}
                  className="glass-input w-full resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block font-body text-body font-medium text-truecost-text-primary">
                    ZIP Code Override
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="e.g., 94102"
                    className="glass-input w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-body text-body font-medium text-truecost-text-primary">
                    Labor Type
                  </label>
                  <label className="flex items-center gap-3 glass-panel p-3 cursor-pointer hover:bg-truecost-glass-bg/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={useUnionLabor}
                      onChange={(e) => setUseUnionLabor(e.target.checked)}
                      className="w-5 h-5 accent-truecost-cyan"
                    />
                    <span className="font-body text-body text-truecost-text-primary">Use Union Labor Rates</span>
                  </label>
                </div>
              </div>
            </div>

            {uploadedFile && <CADDataTable />}

            <button onClick={handleGenerateEstimate} className="w-full btn-pill-primary">
              Generate Estimate
            </button>
          </div>

          {/* Right: Chat */}
          <div className="glass-panel h-[520px] lg:h-[660px] flex flex-col overflow-hidden -mt-2 lg:-mt-1 mb-0.5">
            <ChatPanel />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

