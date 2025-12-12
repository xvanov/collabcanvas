import { PublicLayout } from '../components/layouts/PublicLayout';

export function Privacy() {
  return (
    <PublicLayout>
      <div className="container-spacious max-w-4xl py-section">
        <div className="space-y-4">
          <h1 className="font-heading text-h1 text-truecost-text-primary">Privacy Policy</h1>
          <p className="font-body text-body text-truecost-text-secondary">
            This is a placeholder Privacy Policy page. Replace this content with your organization&apos;s
            actual privacy policy.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

