/**
 * HowItWorksSection - 3-step process visualization.
 */
export function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Upload or Enter Project Details',
      description:
        'Upload CAD plans or describe your project in plain English. TrueCost accepts PDFs, DWG files, or natural language descriptions.',
    },
    {
      number: '02',
      title: 'AI Analyzes Material & Labor Needs',
      description:
        'Specialized agents extract measurements, calculate quantities, and apply location-specific labor rates automatically.',
    },
    {
      number: '03',
      title: 'Get a Detailed, Shareable Estimate',
      description:
        'Receive a comprehensive PDF with cost breakdowns, timelines, risk analysis, and confidence intervals ready for clients.',
    },
  ];

  return (
    <section id="how-it-works" className="py-section md:py-20 lg:py-24">
      <div className="container-spacious">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-heading text-h2-mobile md:text-h2 text-truecost-text-primary mb-4">How It Works</h2>
          <p className="font-body text-body text-truecost-text-secondary max-w-2xl mx-auto">
            From project description to professional estimate in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-truecost-cyan/30 to-transparent -z-10" />
              )}

              <div className="text-center md:text-left space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-truecost-cyan to-truecost-teal mx-auto md:mx-0">
                  <span className="font-heading text-2xl font-bold text-truecost-bg-primary">{step.number}</span>
                </div>

                <h3 className="font-heading text-h3 text-truecost-text-primary">{step.title}</h3>

                <p className="font-body text-body text-truecost-text-secondary">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

