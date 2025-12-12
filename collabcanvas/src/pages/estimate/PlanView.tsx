import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';
import { FileUploadZone } from '../../components/estimate/FileUploadZone';
import { FilePreview } from '../../components/estimate/FilePreview';
import type { BackgroundImage } from '../../types';

// Estimate configuration with defaults
export interface EstimateConfig {
  overheadPercent: number;
  profitPercent: number;
  contingencyPercent: number;
  wasteFactorPercent: number;
  startDate: string;
  scopeText: string;
}

/**
 * PlanView - Plan stage UI: upload plan file and configure estimate parameters.
 * After uploading, user proceeds to canvas for annotation.
 */
export function PlanView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preparedBackground, setPreparedBackground] = useState<BackgroundImage | null>(null);

  // Default start date: 2 weeks from today
  const defaultStartDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }, []);

  // Project scope state
  const [scopeText, setScopeText] = useState('');

  // Estimate configuration state
  const [overheadPercent, setOverheadPercent] = useState(10);
  const [profitPercent, setProfitPercent] = useState(10);
  const [contingencyPercent, setContingencyPercent] = useState(5);
  const [wasteFactorPercent, setWasteFactorPercent] = useState(10);
  const [startDate, setStartDate] = useState(defaultStartDate);

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

  const handleProceedToCanvas = () => {
    const estimateConfig: EstimateConfig = {
      overheadPercent,
      profitPercent,
      contingencyPercent,
      wasteFactorPercent,
      startDate,
      scopeText,
    };
    
    navigate(`/estimate/${id}/canvas`, { 
      state: { 
        backgroundImage: preparedBackground,
        estimateConfig,
      } 
    });
  };

  return (
    <AuthenticatedLayout>
      <div className="container-spacious max-w-4xl mx-auto pt-20 pb-14 md:pt-24">
        {/* Header */}
        <div className="mb-8 space-y-3 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-body-meta font-medium text-white border border-truecost-glass-border">
            Step 1: Upload Plan
          </span>
          <h1 className="font-heading text-h1 text-truecost-text-primary">
            Upload your construction plan
          </h1>
          <p className="font-body text-body text-truecost-text-secondary/90 max-w-2xl mx-auto">
            Upload your CAD or plan files. After uploading, you'll annotate the plan on the canvas 
            and our AI will help you generate an accurate estimate.
          </p>
        </div>

        {/* Upload Area */}
        <div className="space-y-6">
          <div className="glass-panel p-6">
            {!uploadedFile ? (
              <FileUploadZone onFileSelect={handleFileSelect} />
            ) : (
              <FilePreview file={uploadedFile} onRemove={handleRemoveFile} />
            )}
          </div>

          {/* Project Scope */}
          <div className="glass-panel p-6">
            <h3 className="font-heading text-h3 text-truecost-text-primary mb-2">
              Project Scope
            </h3>
            <p className="text-sm text-truecost-text-secondary/70 mb-4">
              Describe your project scope, including type of work, materials preferences, and any specific requirements.
            </p>
            
            <textarea
              value={scopeText}
              onChange={(e) => setScopeText(e.target.value)}
              placeholder="Example: Kitchen renovation including new cabinets, countertops, flooring, and appliances. Prefer mid-range materials. Need electrical work for new outlets and lighting fixtures. Plumbing work for sink and dishwasher relocation..."
              rows={5}
              className="glass-input w-full resize-none"
            />
            
            <div className="mt-3 flex items-center gap-4 text-xs text-truecost-text-secondary/60">
              <span>
                💡 Tip: Be specific about the scope of work, materials, and any constraints for more accurate estimates.
              </span>
              {scopeText.length > 0 && (
                <span className="ml-auto">
                  {scopeText.length} characters
                </span>
              )}
            </div>
          </div>

          {/* Estimate Configuration */}
          <div className="glass-panel p-6">
            <h3 className="font-heading text-h3 text-truecost-text-primary mb-4">
              Estimate Configuration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Overhead */}
              <div className="space-y-2">
                <label className="block font-body text-body-small font-medium text-truecost-text-primary">
                  Overhead (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={overheadPercent}
                    onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                    className="glass-input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-truecost-text-secondary">%</span>
                </div>
                <p className="text-xs text-truecost-text-secondary/70">General & administrative costs</p>
              </div>

              {/* Profit */}
              <div className="space-y-2">
                <label className="block font-body text-body-small font-medium text-truecost-text-primary">
                  Profit (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={profitPercent}
                    onChange={(e) => setProfitPercent(parseFloat(e.target.value) || 0)}
                    className="glass-input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-truecost-text-secondary">%</span>
                </div>
                <p className="text-xs text-truecost-text-secondary/70">Contractor profit margin</p>
              </div>

              {/* Contingency */}
              <div className="space-y-2">
                <label className="block font-body text-body-small font-medium text-truecost-text-primary">
                  Contingency (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={contingencyPercent}
                    onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
                    className="glass-input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-truecost-text-secondary">%</span>
                </div>
                <p className="text-xs text-truecost-text-secondary/70">Unforeseen costs buffer</p>
              </div>

              {/* Material Waste Factor */}
              <div className="space-y-2">
                <label className="block font-body text-body-small font-medium text-truecost-text-primary">
                  Material Waste Factor (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={wasteFactorPercent}
                    onChange={(e) => setWasteFactorPercent(parseFloat(e.target.value) || 0)}
                    className="glass-input w-full pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-truecost-text-secondary">%</span>
                </div>
                <p className="text-xs text-truecost-text-secondary/70">Extra materials for waste/scrap</p>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="block font-body text-body-small font-medium text-truecost-text-primary">
                  Project Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="glass-input w-full"
                />
                <p className="text-xs text-truecost-text-secondary/70">Estimated construction start</p>
              </div>
            </div>
          </div>

          {/* Proceed Button - only shown when file is uploaded */}
          {uploadedFile && (
            <div className="flex flex-col items-center gap-4">
              <div className="glass-panel p-4 w-full max-w-md text-center">
                <p className="font-body text-body text-truecost-text-secondary mb-2">
                  ✓ Plan uploaded successfully
                </p>
                <p className="font-body text-body-small text-truecost-text-secondary/70">
                  Next: Annotate your plan on the canvas. The AI assistant will help you identify 
                  walls, rooms, doors, and other elements for accurate estimation.
                </p>
              </div>
              
              <button 
                onClick={handleProceedToCanvas} 
                className="btn-pill-primary px-8 py-3 text-lg flex items-center gap-2"
              >
                <span>Proceed to Canvas</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

