import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ComicGrid from '../components/comic/ComicGrid';
import Spinner from '../components/common/Spinner';

export default function Collection() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    try {
      // Load collection data
      setCollection({ name: 'Sample Collection', description: 'Description' });
      setComics([]);
    } catch (error) {
      console.error('Failed to load collection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{collection?.name}</h1>
      <p className="text-gray-600 mb-8">{collection?.description}</p>
      <ComicGrid comics={comics} loading={false} />
    </div>
  );
}