import { PublicLayout } from '../components/layouts/PublicLayout';

export function Terms() {
  return (
    <PublicLayout>
      <div className="container-spacious max-w-4xl py-section">
        <div className="space-y-4">
          <h1 className="font-heading text-h1 text-truecost-text-primary">Terms of Service</h1>
          <p className="font-body text-body text-truecost-text-secondary">
            This is a placeholder Terms of Service page. Replace this content with your organization&apos;s
            actual terms.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

