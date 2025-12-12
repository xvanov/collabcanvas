import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';
import { Button, GlassPanel, Input, Select } from '../../components/ui';

/**
 * NewEstimate Page - Two-column layout with form + tips.
 */
export function NewEstimate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    type: '',
    size: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const mockProjectId = `est-${Date.now()}`;
    navigate(`/estimate/${mockProjectId}/plan`);
  };

  const isFormValid = formData.name.trim() && formData.location.trim();

  return (
    <AuthenticatedLayout>
      <div className="container-spacious max-w-app pt-20 pb-16 md:pt-24">
        {/* Header */}
        <div className="mb-10 space-y-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-body-meta font-medium bg-truecost-glass-bg/80 border border-truecost-glass-border text-truecost-cyan">
            Start New Estimate
          </span>
          <div>
            <h1 className="font-heading text-h1 text-truecost-text-primary mb-2">
              Provide basic project details
            </h1>
            <p className="font-body text-body text-truecost-text-secondary/90">
              Tell us about the project so we can tailor labor rates, material pricing, and timelines.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          {/* Left: Form */}
          <GlassPanel className="p-8">
            <form onSubmit={handleContinue} className="space-y-6">
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

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={!isFormValid}
                >
                  Continue to Upload Plans
                </Button>
              </div>
            </form>
          </GlassPanel>

          {/* Right: Tips */}
          <GlassPanel className="p-6 h-fit">
            <div className="space-y-6">
              <div>
                <h3 className="font-heading text-h3 text-truecost-cyan mb-3">Quick Tips</h3>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-truecost-cyan/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-truecost-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-body text-body font-medium text-truecost-text-primary mb-1">
                      Be Specific with Location
                    </h4>
                    <p className="text-body-meta text-truecost-text-secondary">
                      Accurate location data helps provide region-specific labor rates, permits, and material costs.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-truecost-cyan/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-truecost-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-body text-body font-medium text-truecost-text-primary mb-1">
                      Have Your Plans Ready
                    </h4>
                    <p className="text-body-meta text-truecost-text-secondary">
                      Next, you'll upload CAD files (DWG, DXF) or images (PDF, PNG, JPG) of your construction plans.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-truecost-cyan/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-truecost-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-body text-body font-medium text-truecost-text-primary mb-1">
                      Estimates in Minutes
                    </h4>
                    <p className="text-body-meta text-truecost-text-secondary">
                      Our AI analyzes your plans and generates a comprehensive estimate with cost breakdown and timeline.
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

