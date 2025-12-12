import { PublicLayout } from '../components/layouts/PublicLayout';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { ComparisonSection } from '../components/landing/ComparisonSection';

/**
 * Landing Page - Public marketing page
 * Complete experience: hero, features, how it works, comparison, footer (from layout)
 */
export function Landing() {
  return (
    <PublicLayout>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ComparisonSection />
    </PublicLayout>
  );
}
