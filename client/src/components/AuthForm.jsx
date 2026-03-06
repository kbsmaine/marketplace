import { useState } from 'react';

export default function AuthForm({ title, onSubmit, buttonText, fields }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel auth-form" onSubmit={handleSubmit}>
      <h1>{title}</h1>
      {error ? <div className="error">{error}</div> : null}
      {fields.map((field) => (
        <label key={field.name}>
          <span>{field.label}</span>
          <input
            type={field.type || 'text'}
            value={form[field.name] || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
            required={field.required}
          />
        </label>
      ))}
      <button disabled={loading}>{loading ? 'Please wait...' : buttonText}</button>
    </form>
  );
}
