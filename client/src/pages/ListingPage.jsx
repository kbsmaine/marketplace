import { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, uploadsUrl } from '../api';
import { AppContext } from '../App';

export default function ListingPage() {
  const { id } = useParams();
  const { user } = useContext(AppContext);
  const [listing, setListing] = useState(null);
  const [message, setMessage] = useState('Hi, is this still available?');
  const [reportMessage, setReportMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/listings/${id}`).then(setListing).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!listing) return <div>Loading...</div>;

  const image = listing.images?.[0]?.file_path ? `${uploadsUrl}${listing.images[0].file_path}` : 'https://via.placeholder.com/1000x700?text=No+Image';

  return (
    <div className="two-col">
      <section className="panel">
        <img className="detail-image" src={image} alt={listing.title} />
        <div className="gallery-row">
          {listing.images?.map((img) => <img key={img.id} src={`${uploadsUrl}${img.file_path}`} alt="listing" className="thumb" />)}
        </div>
      </section>
      <section className="stack">
        <div className="panel">
          <h1>{listing.title}</h1>
          <p className="price">${Number(listing.price).toLocaleString()}</p>
          <p className="muted">{listing.category_name} • {listing.city}, {listing.state}</p>
          <p>{listing.description}</p>
          <p><strong>Seller:</strong> {listing.seller_name}</p>
        </div>

        {notice ? <div className="success">{notice}</div> : null}

        {user && user.id !== listing.user_id ? (
          <div className="panel stack">
            <h3>Contact seller</h3>
            <textarea rows="4" value={message} onChange={(e) => setMessage(e.target.value)} />
            <button onClick={async () => {
              try {
                const data = await api('/messages/start', { method: 'POST', body: JSON.stringify({ listingId: listing.id, body: message }) });
                setNotice(`Message sent. Conversation #${data.conversationId} created.`);
              } catch (err) { setError(err.message); }
            }}>Send Message</button>
            <button className="secondary" onClick={async () => {
              try { await api(`/listings/${listing.id}/favorite`, { method: 'POST' }); setNotice('Saved to favorites.'); }
              catch (err) { setError(err.message); }
            }}>Save Favorite</button>
          </div>
        ) : null}

        {user ? (
          <div className="panel stack">
            <h3>Report listing</h3>
            <textarea rows="3" placeholder="Reason for report" value={reportMessage} onChange={(e) => setReportMessage(e.target.value)} />
            <button className="danger" onClick={async () => {
              try { await api(`/listings/${listing.id}/report`, { method: 'POST', body: JSON.stringify({ message: reportMessage }) }); setNotice('Report submitted.'); setReportMessage(''); }
              catch (err) { setError(err.message); }
            }}>Submit Report</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
