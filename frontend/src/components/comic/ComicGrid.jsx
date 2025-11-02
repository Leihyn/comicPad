import ComicCard from './ComicCard';
import Spinner from '../common/Spinner';

export default function ComicGrid({ comics, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!comics || comics.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">No comics found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {comics.map(comic => (
        <ComicCard key={comic._id} comic={comic} />
      ))}
    </div>
  );
}