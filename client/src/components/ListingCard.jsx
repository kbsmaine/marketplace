import { Link } from 'react-router-dom';
import { uploadsUrl } from '../api';

export default function ListingCard({ listing }) {
  const image = listing.images?.[0]?.file_path ? `${uploadsUrl}${listing.images[0].file_path}` : 'https://via.placeholder.com/800x500?text=No+Image';
  return (
    <Link className="listing-card" to={`/listing/${listing.id}`}>
      <img src={image} alt={listing.title} />
      <div className="listing-card-body">
        <div className="listing-meta-row">
          <strong>{listing.title}</strong>
          {listing.is_featured ? <span className="badge">Featured</span> : null}
        </div>
        <p className="muted">{listing.category_name || 'Uncategorized'} • {listing.city || 'Unknown'}, {listing.state || ''}</p>
        <p className="price">${Number(listing.price).toLocaleString()}</p>
      </div>
    </Link>
  );
}
