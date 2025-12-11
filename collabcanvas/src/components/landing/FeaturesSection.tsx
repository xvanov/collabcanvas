/**
 * FeaturesSection - 3-column feature grid with glass tiles.
 */
export function FeaturesSection() {
  const features = [
    {
      title: 'Accurate',
      description:
        'AI-powered analysis delivers precise cost estimates with confidence intervals, reducing bid errors and protecting your margins.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'User-Friendly',
      description:
        'Simple interface with natural language input. Describe your project and upload plans—TrueCost handles the rest.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
          />
        </svg>
      ),
    },
    {
      title: 'Comprehensive',
      description:
        'Complete breakdown by trade, materials, labor, and equipment. Export professional PDF reports ready for clients.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="py-section md:py-20 lg:py-24 bg-truecost-bg-surface">
      <div className="container-spacious">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-heading text-h2-mobile md:text-h2 text-truecost-text-primary mb-4">Why TrueCost?</h2>
          <p className="font-body text-body text-truecost-text-secondary max-w-2xl mx-auto">
            Professional estimation powered by AI, designed for contractors who demand accuracy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="glass-panel-hover p-card space-y-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-truecost-cyan to-truecost-teal flex items-center justify-center text-truecost-bg-primary">
                {feature.icon}
              </div>
              <h3 className="font-heading text-h3 text-truecost-text-primary">{feature.title}</h3>
              <p className="font-body text-body text-truecost-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

