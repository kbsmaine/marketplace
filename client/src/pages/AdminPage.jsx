import { useEffect, useState } from 'react';
import { api } from '../api';

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => api('/admin/dashboard').then(setData).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="stack">
      <h1>Admin panel</h1>
      <div className="stats-grid">
        {Object.entries(data.stats).map(([key, val]) => <div className="panel stat" key={key}><strong>{val}</strong><span>{key}</span></div>)}
      </div>
      <div className="two-col">
        <section className="panel stack">
          <h2>Recent reports</h2>
          {data.recentReports.map((report) => (
            <div key={report.id} className="split-row bordered">
              <div>
                <strong>{report.listing_title || 'General report'}</strong>
                <p>{report.message}</p>
                <small>{report.status}</small>
              </div>
              <button onClick={async () => { await api(`/admin/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'closed' }) }); load(); }}>Close</button>
            </div>
          ))}
        </section>
        <section className="panel stack">
          <h2>Recent listings</h2>
          {data.recentListings.map((listing) => (
            <div key={listing.id} className="split-row bordered">
              <div>
                <strong>{listing.title}</strong>
                <p>{listing.seller_name} • {listing.status}</p>
              </div>
              <div className="button-row">
                <button onClick={async () => { await api(`/admin/listings/${listing.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'hidden' }) }); load(); }}>Hide</button>
                <button onClick={async () => { await api(`/admin/listings/${listing.id}`, { method: 'PATCH', body: JSON.stringify({ is_featured: 1 }) }); load(); }}>Feature</button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
