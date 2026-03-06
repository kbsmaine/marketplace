import { useEffect, useState } from 'react';
import ListingCard from '../components/ListingCard';
import { api } from '../api';

export default function FavoritesPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/listings/user/favorites/all').then(setItems).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="stack">
      <h1>Favorites</h1>
      {error ? <div className="error">{error}</div> : null}
      <section className="listing-grid">
        {items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
      </section>
    </div>
  );
}
