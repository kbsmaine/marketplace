import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function DashboardPage() {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api('/listings/mine').then(setListings).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  return (
    <div className="stack">
      <div className="panel split-row">
        <div>
          <h1>Your dashboard</h1>
          <p className="muted">Manage listings and optionally feature them.</p>
        </div>
        <Link className="button-link" to="/new">New Listing</Link>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {notice ? <div className="success">{notice}</div> : null}
      <div className="stack">
        {listings.map((listing) => (
          <div className="panel split-row" key={listing.id}>
            <div>
              <strong>{listing.title}</strong>
              <p className="muted">${Number(listing.price).toLocaleString()} • {listing.status}</p>
            </div>
            <div className="button-row">
              <Link className="button-link secondary-link" to={`/listing/${listing.id}`}>View</Link>
              <button className="danger" onClick={async () => {
                try { await api(`/listings/${listing.id}`, { method: 'DELETE' }); load(); }
                catch (err) { setError(err.message); }
              }}>Delete</button>
              <button onClick={async () => {
                try {
                  const data = await api('/payments/featured-checkout', { method: 'POST', body: JSON.stringify({ listingId: listing.id }) });
                  if (data.url) window.location.href = data.url;
                  else setNotice(data.message || 'Featured checkout created.');
                } catch (err) { setError(err.message); }
              }}>Feature for $9.99</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
