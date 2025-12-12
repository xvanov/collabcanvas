import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';
import { Button, GlassPanel, Input, Select, Textarea } from '../../components/ui';
import { FileUploadZone } from '../../components/estimate/FileUploadZone';
import { FilePreview } from '../../components/estimate/FilePreview';
import { EstimateStepper } from '../../components/estimate/EstimateStepper';
import { useProjectStore } from '../../store/projectStore';
import { useAuth } from '../../hooks/useAuth';
import type { BackgroundImage } from '../../types';

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
  const loading = useProjectStore((state) => state.loading);

  const isEditMode = !!projectId;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing project data if in edit mode
  useEffect(() => {
    if (isEditMode && projectId) {
      // TODO: Load project data from Firestore
      // For now, we'll implement this when the project exists
    }
  }, [isEditMode, projectId]);

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

    if (!uploadedFile) {
      setError('Please upload a plan file');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the project in Firestore
      const project = await createNewProject(
        formData.name,
        formData.scopeDefinition,
        user.uid
      );

      // Navigate to Annotate page with the background image state
      const state = preparedBackground ? { backgroundImage: preparedBackground } : undefined;
      navigate(`/project/${project.id}/annotate`, { state });
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.name.trim() && formData.location.trim() && uploadedFile;

  // Determine completed steps for the stepper
  const completedSteps: ('scope' | 'annotate' | 'estimate')[] = [];

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
                  {!uploadedFile ? (
                    <FileUploadZone onFileSelect={handleFileSelect} />
                  ) : (
                    <FilePreview file={uploadedFile} onRemove={handleRemoveFile} />
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

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={!isFormValid || isSubmitting || loading}
                  >
                    {isSubmitting ? 'Creating Project...' : 'Continue to Annotate'}
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
