import { Link, useParams } from 'react-router-dom';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';

/**
 * Estimate overview placeholder page.
 * TODO: Flesh out estimate overview/navigation hub when estimate data is available.
 */
export function EstimateView() {
  const { id } = useParams<{ id: string }>();

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto max-w-5xl px-4 py-12 pt-14">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Estimate: {id}</h1>
        <p className="mb-8 text-gray-600">Estimate overview placeholder.</p>
        <div className="space-x-4">
          <Link
            to={`/estimate/${id}/plan`}
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700"
          >
            Go to Plan
          </Link>
          <Link
            to={`/estimate/${id}/final`}
            className="inline-block rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50"
          >
            Go to Final Estimate
          </Link>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

