import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-extrabold text-primary">404</h1>
      <p className="mt-4 text-xl font-semibold">This track stopped playing.</p>
      <p className="mt-2 text-muted">The page you're looking for doesn't exist or was moved.</p>
      <Link to="/" className="inline-block mt-8 px-8 py-3 rounded-full bg-primary text-white font-semibold">
        Back to home
      </Link>
    </div>
  );
}
