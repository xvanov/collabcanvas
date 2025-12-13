import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';
import { Button, GlassPanel, Input, Select, Textarea } from '../../components/ui';
import { FileUploadZone } from '../../components/estimate/FileUploadZone';
import { FilePreview } from '../../components/estimate/FilePreview';
import { EstimateStepper } from '../../components/estimate/EstimateStepper';
import { useProjectStore } from '../../store/projectStore';
import { useAuth } from '../../hooks/useAuth';
import { useStepCompletion } from '../../hooks/useStepCompletion';
import { uploadPlanImage } from '../../services/estimationService';
import type { BackgroundImage } from '../../types';
import type { EstimateConfig } from '../../types/project';

// Re-export EstimateConfig for backward compatibility
export type { EstimateConfig } from '../../types/project';

/**
 * ScopePage - Combined form for project creation/editing with file upload.
 * Merged from NewEstimate.tsx and PlanView.tsx.
 *
 * Features:
 * - Project Name, Location, Project Type, Size fields
 * - File upload zone (required)
 * - Scope Definition textarea (renamed from "Additional Details")
 * - ZIP code override + Labor type toggle
 * - NO chatbot (chatbot is on Annotate page only)
 * - NO "Extracted Quantities" section
 * - "Continue to Annotate" button
 */
export function ScopePage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const createNewProject = useProjectStore((state) => state.createNewProject);
  const loadProject = useProjectStore((state) => state.loadProject);
  const updateProjectScopeAction = useProjectStore((state) => state.updateProjectScopeAction);
  const loading = useProjectStore((state) => state.loading);

  const isEditMode = !!projectId;
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    type: '',
    size: '',
    scopeDefinition: '',
    zipCode: '',
    useUnionLabor: false,
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preparedBackground, setPreparedBackground] = useState<BackgroundImage | null>(null);
  const [existingPlanUrl, setExistingPlanUrl] = useState<string | null>(null);
  const [existingPlanFileName, setExistingPlanFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estimate configuration state
  const defaultStartDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14); // 2 weeks from today
    return date.toISOString().split('T')[0];
  }, []);

  const [overheadPercent, setOverheadPercent] = useState(10);
  const [profitPercent, setProfitPercent] = useState(10);
  const [contingencyPercent, setContingencyPercent] = useState(5);
  const [wasteFactorPercent, setWasteFactorPercent] = useState(10);
  const [startDate, setStartDate] = useState(defaultStartDate);

  // Load existing project data if in edit mode
  useEffect(() => {
    if (isEditMode && projectId && !isDataLoaded) {
      loadProject(projectId).then((project) => {
        if (project) {
          setFormData({
            name: project.name || '',
            location: project.location || '',
            type: project.projectType || '',
            size: project.size || '',
            scopeDefinition: project.description || '',
            zipCode: project.zipCode || '',
            useUnionLabor: project.useUnionLabor || false,
          });

          // Load estimate config if exists
          if (project.estimateConfig) {
            setOverheadPercent(project.estimateConfig.overheadPercent);
            setProfitPercent(project.estimateConfig.profitPercent);
            setContingencyPercent(project.estimateConfig.contingencyPercent);
            setWasteFactorPercent(project.estimateConfig.wasteFactorPercent);
            setStartDate(project.estimateConfig.startDate);
          }

          // Load existing plan image if available
          if (project.planImageUrl) {
            setExistingPlanUrl(project.planImageUrl);
            setExistingPlanFileName(project.planImageFileName || 'Uploaded plan');
          }

          setIsDataLoaded(true);
        }
      }).catch((err) => {
        console.error('Failed to load project:', err);
        setError('Failed to load project data');
      });
    }
  }, [isEditMode, projectId, isDataLoaded, loadProject]);

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
            uploadedBy: user?.uid || 'local',
          });
        };
        img.onerror = reject;
        img.src = dataUrl;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to create a project');
      return;
    }

    // In edit mode, allow submission if we have an existing plan or new upload
    const hasPlan = uploadedFile || existingPlanUrl;
    if (!hasPlan) {
      setError('Please upload a plan file');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build estimate config
      const estimateConfig: EstimateConfig = {
        overheadPercent,
        profitPercent,
        contingencyPercent,
        wasteFactorPercent,
        startDate,
      };

      let finalProjectId = projectId;
      let planImageUrl = existingPlanUrl;
      let planImageFileName = existingPlanFileName;

      // Upload new plan image if provided
      if (uploadedFile && finalProjectId) {
        const planImage = await uploadPlanImage(finalProjectId, uploadedFile, user.uid);
        planImageUrl = planImage.url;
        planImageFileName = planImage.fileName;
      }

      if (isEditMode && projectId) {
        // Update existing project
        await updateProjectScopeAction(projectId, {
          name: formData.name,
          description: formData.scopeDefinition,
          location: formData.location,
          projectType: formData.type,
          size: formData.size,
          zipCode: formData.zipCode,
          useUnionLabor: formData.useUnionLabor,
          estimateConfig,
          planImageUrl: planImageUrl || undefined,
          planImageFileName: planImageFileName || undefined,
        }, user.uid);
      } else {
        // Create new project with all scope data
        const project = await createNewProject(
          formData.name,
          formData.scopeDefinition,
          user.uid,
          {
            location: formData.location,
            projectType: formData.type,
            size: formData.size,
            zipCode: formData.zipCode,
            useUnionLabor: formData.useUnionLabor,
            estimateConfig,
          }
        );
        finalProjectId = project.id;

        // Upload plan image for new project
        if (uploadedFile) {
          const planImage = await uploadPlanImage(finalProjectId, uploadedFile, user.uid);
          planImageUrl = planImage.url;
          planImageFileName = planImage.fileName;

          // Update project with plan image URL
          await updateProjectScopeAction(finalProjectId, {
            planImageUrl: planImage.url,
            planImageFileName: planImage.fileName,
          }, user.uid);
        }
      }

      // Build config with scope text for navigation state
      const estimateConfigWithScope: EstimateConfig = {
        ...estimateConfig,
        scopeText: formData.scopeDefinition,
      };

      // Navigate to Annotate page with the background image and estimate config
      navigate(`/project/${finalProjectId}/annotate`, {
        state: {
          backgroundImage: preparedBackground || (planImageUrl ? {
            id: `bg-${Date.now()}`,
            url: planImageUrl,
            fileName: planImageFileName || 'plan',
            fileSize: 0,
            width: 0,
            height: 0,
            aspectRatio: 1,
            uploadedAt: Date.now(),
            uploadedBy: user.uid,
          } : null),
          estimateConfig: estimateConfigWithScope,
        }
      });
    } catch (err) {
      console.error('Failed to save project:', err);
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveExistingPlan = useCallback(() => {
    setExistingPlanUrl(null);
    setExistingPlanFileName(null);
  }, []);

  const isFormValid = formData.name.trim() && formData.location.trim() && (uploadedFile || existingPlanUrl);

  // Get actual completion state from hook
  const { completedSteps } = useStepCompletion(projectId);

  // Show loading state when fetching project data
  if (isEditMode && loading && !isDataLoaded) {
    return (
      <AuthenticatedLayout>
        <div className="container-spacious max-w-full pt-20 pb-14 md:pt-24">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-truecost-cyan border-t-transparent mx-auto"></div>
              <p className="text-truecost-text-secondary">Loading project data...</p>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container-spacious max-w-full pt-20 pb-14 md:pt-24">
        {/* Stepper */}
        {isEditMode && projectId && (
          <EstimateStepper
            currentStep="scope"
            projectId={projectId}
            completedSteps={completedSteps}
          />
        )}

        {/* Header */}
        <div className="mb-6 space-y-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-body-meta font-medium text-white border border-truecost-glass-border">
            {isEditMode ? 'Edit Project' : 'New Project'}
          </span>
          <h1 className="font-heading text-h1 text-truecost-text-primary">
            {isEditMode ? 'Update Project Scope' : 'Define Your Project Scope'}
          </h1>
          <p className="font-body text-body text-truecost-text-secondary/90">
            Provide project details and upload your plans to get started.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="glass-panel bg-truecost-danger/10 border-truecost-danger/30 p-4 mb-6">
            <p className="font-body text-body text-truecost-danger">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Left: Form */}
          <div className="space-y-6">
            <GlassPanel className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Project Name */}
                <Input
                  label="Project Name *"
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g., Smith Residence Addition"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />

                {/* Location */}
                <Input
                  label="Location *"
                  id="location"
                  name="location"
                  type="text"
                  placeholder="e.g., San Francisco, CA or ZIP code 94102"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  helperText="City, state, or ZIP code for location-specific pricing"
                />

                {/* Project Type */}
                <Select
                  label="Project Type"
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value="">Select type...</option>
                  <option value="residential-new">Residential - New Construction</option>
                  <option value="residential-addition">Residential - Addition</option>
                  <option value="residential-remodel">Residential - Remodel</option>
                  <option value="commercial-new">Commercial - New Construction</option>
                  <option value="commercial-renovation">Commercial - Renovation</option>
                  <option value="other">Other</option>
                </Select>

                {/* Approximate Size */}
                <Input
                  label="Approximate Size"
                  id="size"
                  name="size"
                  type="text"
                  placeholder="e.g., 2,500 sq ft"
                  value={formData.size}
                  onChange={handleInputChange}
                  helperText="Square footage or other relevant measurement"
                />

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="block font-body text-body font-medium text-truecost-text-primary">
                    Upload Plans *
                  </label>
                  {uploadedFile ? (
                    <FilePreview file={uploadedFile} onRemove={handleRemoveFile} />
                  ) : existingPlanUrl ? (
                    <div className="glass-panel p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-truecost-glass-bg">
                            <img
                              src={existingPlanUrl}
                              alt="Uploaded plan"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-body text-body font-medium text-truecost-text-primary">
                              {existingPlanFileName || 'Uploaded plan'}
                            </p>
                            <p className="text-body-meta text-truecost-text-secondary">
                              Plan already uploaded
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRemoveExistingPlan}
                            className="text-truecost-text-secondary hover:text-truecost-danger transition-colors p-2"
                            title="Remove plan"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-truecost-glass-border">
                        <p className="text-body-meta text-truecost-text-secondary mb-2">
                          Upload a new plan to replace:
                        </p>
                        <FileUploadZone onFileSelect={handleFileSelect} />
                      </div>
                    </div>
                  ) : (
                    <FileUploadZone onFileSelect={handleFileSelect} />
                  )}
                </div>

                {/* Scope Definition */}
                <Textarea
                  label="Scope Definition"
                  id="scopeDefinition"
                  name="scopeDefinition"
                  value={formData.scopeDefinition}
                  onChange={handleInputChange}
                  placeholder="Describe the project scope, specific requirements, constraints, or preferences..."
                  rows={4}
                  helperText="Provide any additional details that will help generate an accurate estimate"
                />

                {/* ZIP Code Override + Labor Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="ZIP Code Override"
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    placeholder="e.g., 94102"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    helperText="Override the location-based ZIP code"
                  />

                  <div className="space-y-2">
                    <label className="block font-body text-body font-medium text-truecost-text-primary">
                      Labor Type
                    </label>
                    <label className="flex items-center gap-3 glass-panel p-3 cursor-pointer hover:bg-truecost-glass-bg/50 transition-colors">
                      <input
                        type="checkbox"
                        name="useUnionLabor"
                        checked={formData.useUnionLabor}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-truecost-cyan"
                      />
                      <span className="font-body text-body text-truecost-text-primary">
                        Use Union Labor Rates
                      </span>
                    </label>
                  </div>
                </div>

                {/* Estimate Configuration */}
                <div className="pt-4 border-t border-truecost-glass-border">
                  <h3 className="font-heading text-lg text-truecost-text-primary mb-4">
                    Estimate Configuration
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <label className="block font-body text-body-meta font-medium text-truecost-text-secondary">
                        Overhead %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={overheadPercent}
                        onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-body text-body-meta font-medium text-truecost-text-secondary">
                        Profit %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={profitPercent}
                        onChange={(e) => setProfitPercent(parseFloat(e.target.value) || 0)}
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-body text-body-meta font-medium text-truecost-text-secondary">
                        Contingency %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={contingencyPercent}
                        onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-body text-body-meta font-medium text-truecost-text-secondary">
                        Waste Factor %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={wasteFactorPercent}
                        onChange={(e) => setWasteFactorPercent(parseFloat(e.target.value) || 0)}
                        className="glass-input w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block font-body text-body-meta font-medium text-truecost-text-secondary">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="glass-input w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={!isFormValid || isSubmitting || loading}
                  >
                    {isSubmitting
                      ? (isEditMode ? 'Saving Changes...' : 'Creating Project...')
                      : (isEditMode ? 'Save & Continue to Annotate' : 'Continue to Annotate')}
                  </Button>
                </div>
              </form>
            </GlassPanel>
          </div>

          {/* Right: Tips */}
          <GlassPanel className="p-6 h-fit">
            <div className="space-y-6">
              <div>
                <h3 className="font-heading text-h3 text-truecost-cyan mb-3">Quick Tips</h3>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-truecost-cyan/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-truecost-cyan"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-body text-body font-medium text-truecost-text-primary mb-1">
                      Be Specific with Location
                    </h4>
                    <p className="text-body-meta text-truecost-text-secondary">
                      Accurate location data helps provide region-specific labor rates, permits, and
                      material costs.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-truecost-cyan/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-truecost-cyan"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-body text-body font-medium text-truecost-text-primary mb-1">
                      Upload Your Plans
                    </h4>
                    <p className="text-body-meta text-truecost-text-secondary">
                      CAD files (DWG, DXF) or images (PDF, PNG, JPG) help us analyze your
                      construction plans accurately.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-truecost-cyan/20 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-truecost-cyan"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-body text-body font-medium text-truecost-text-primary mb-1">
                      Next: Annotate & Clarify
                    </h4>
                    <p className="text-body-meta text-truecost-text-secondary">
                      After defining scope, you'll annotate your plans and chat with our AI to
                      clarify project details.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
