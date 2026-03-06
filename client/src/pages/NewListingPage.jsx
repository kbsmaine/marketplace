import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { api } from '../api';

export default function NewListingPage() {
  const { user, categories } = useContext(AppContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', price: '', category_id: '', city: '', state: '', zipcode: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  if (!user) return <div className="panel">Please login to post a listing.</div>;

  return (
    <form className="panel form-grid" onSubmit={async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        files.forEach((file) => fd.append('images', file));
        const data = await api('/listings', { method: 'POST', body: fd });
        navigate(`/listing/${data.listingId}`);
      } catch (err) {
        setError(err.message);
      }
    }}>
      <h1>Create listing</h1>
      {error ? <div className="error">{error}</div> : null}
      <label><span>Title</span><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label><span>Price</span><input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
      <label><span>Category</span><select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Select category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label><span>City</span><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
      <label><span>State</span><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label>
      <label><span>Zipcode</span><input value={form.zipcode} onChange={(e) => setForm({ ...form, zipcode: e.target.value })} /></label>
      <label className="full"><span>Description</span><textarea required rows="7" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="full"><span>Images</span><input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} /></label>
      <button className="full">Publish Listing</button>
    </form>
  );
}
