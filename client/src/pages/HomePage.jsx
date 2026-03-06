import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { api } from '../api';
import Filters from '../components/Filters';
import ListingCard from '../components/ListingCard';

export default function HomePage() {
  const { categories } = useContext(AppContext);
  const [filters, setFilters] = useState({ q: '', category: '', city: '', state: '', minPrice: '', maxPrice: '' });
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
      setListings(await api(`/listings?${qs.toString()}`));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="stack">
      <section className="hero panel">
        <h1>Modern local classifieds</h1>
        <p>Browse by city, category, and price. Post listings, message sellers, save favorites, and manage everything from one dashboard.</p>
      </section>
      <Filters categories={categories} filters={filters} setFilters={setFilters} onApply={load} />
      {error ? <div className="error">{error}</div> : null}
      <section className="listing-grid">
        {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
      </section>
    </div>
  );
}
