const API = localStorage.getItem('api_url') || 'http://localhost:4000/api';
const UPLOAD_BASE = API.replace('/api', '');
let state = { token: localStorage.getItem('token') || '', user: null, categories: [], listings: [], activeListing: null };

const $ = (id) => document.getElementById(id);
const modal = $('modal');
const modalBody = $('modal-body');

function headers(json = true) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (state.token) h.Authorization = `Bearer ${state.token}`;
  return h;
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function openModal(html) { modalBody.innerHTML = html; modal.classList.remove('hidden'); }
function closeModal() { modal.classList.add('hidden'); modalBody.innerHTML = ''; }
$('close-modal').onclick = closeModal;
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function listingCard(l) {
  return `
    <article class="card listing-card">
      <img src="${l.image_url ? UPLOAD_BASE + l.image_url : 'https://placehold.co/600x400?text=No+Image'}" alt="${escapeHtml(l.title)}">
      <div class="mt">
        ${l.is_featured ? '<span class="badge featured">Featured</span>' : ''}
        ${l.category_name ? `<span class="badge">${escapeHtml(l.category_name)}</span>` : ''}
      </div>
      <h3>${escapeHtml(l.title)}</h3>
      <div class="price">$${Number(l.price).toLocaleString()}</div>
      <div class="meta">${escapeHtml([l.city, l.state].filter(Boolean).join(', ') || 'Location not set')}</div>
      <p>${escapeHtml((l.description || '').slice(0, 120))}${l.description?.length > 120 ? '…' : ''}</p>
      <button onclick="viewListing(${l.id})">View Listing</button>
    </article>
  `;
}

function renderListings() {
  $('listings').innerHTML = state.listings.length ? state.listings.map(listingCard).join('') : '<div class="card">No listings found.</div>';
}

async function loadCategories() {
  state.categories = await api('/categories');
  $('category').innerHTML = '<option value="">All categories</option>' + state.categories.map(c => `<option value="${c.slug}">${escapeHtml(c.name)}</option>`).join('');
}

async function loadMe() {
  if (!state.token) return;
  try {
    const data = await api('/me', { headers: headers(false) });
    state.user = data.user;
  } catch {
    localStorage.removeItem('token');
    state.token = '';
  }
}

async function loadListings() {
  const params = new URLSearchParams();
  ['q','category','city','state','minPrice','maxPrice'].forEach(id => { const v = $(id).value.trim(); if (v) params.set(id, v); });
  if ($('featuredOnly').checked) params.set('featured', '1');
  state.listings = await api(`/listings?${params.toString()}`);
  renderListings();
}

window.viewListing = async function(id) {
  const l = await api(`/listings/${id}`);
  state.activeListing = l;
  $('details').innerHTML = `
    <section class="card detail mt">
      <img src="${l.image_url ? UPLOAD_BASE + l.image_url : 'https://placehold.co/900x500?text=No+Image'}" alt="${escapeHtml(l.title)}">
      <div class="mt">
        ${l.is_featured ? '<span class="badge featured">Featured</span>' : ''}
        ${l.category_name ? `<span class="badge">${escapeHtml(l.category_name)}</span>` : ''}
        <span class="badge">${escapeHtml(l.status)}</span>
      </div>
      <h2>${escapeHtml(l.title)}</h2>
      <div class="price">$${Number(l.price).toLocaleString()}</div>
      <div class="meta">Seller: ${escapeHtml(l.seller_name || 'Unknown')} • ${escapeHtml([l.city, l.state, l.zip].filter(Boolean).join(', '))}</div>
      <p>${escapeHtml(l.description)}</p>
      <div class="actions">
        <button onclick="favoriteListing(${l.id})">Favorite</button>
        <button class="secondary" onclick="messageSeller(${l.id}, ${l.user_id}, '${escapeJs(l.title)}')">Message Seller</button>
        <button class="secondary" onclick="reportListing(${l.id})">Report</button>
        ${state.user && (state.user.id === l.user_id || state.user.is_admin) ? `<button class="secondary" onclick="editListing(${l.id})">Edit</button>` : ''}
        ${state.user && state.user.id === l.user_id ? `<button class="accent" onclick="featureListing(${l.id})">Feature Listing</button>` : ''}
      </div>
    </section>
  `;
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

window.favoriteListing = async function(id) {
  guardAuth();
  await api(`/favorites/${id}`, { method: 'POST', headers: headers(false) });
  alert('Saved to favorites.');
}

window.messageSeller = function(listingId, receiverId, title) {
  guardAuth();
  openModal(`
    <h2>Message seller</h2>
    <p class="meta">About: ${escapeHtml(title)}</p>
    <form id="message-form" class="stack">
      <textarea id="msg-body" placeholder="Hi, is this still available?"></textarea>
      <button>Send Message</button>
    </form>
  `);
  $('message-form').onsubmit = async (e) => {
    e.preventDefault();
    await api('/messages', { method: 'POST', headers: headers(), body: JSON.stringify({ listing_id: listingId, receiver_id: receiverId, body: $('msg-body').value }) });
    closeModal();
    alert('Message sent.');
  };
}

window.reportListing = function(id) {
  guardAuth();
  openModal(`
    <h2>Report listing</h2>
    <form id="report-form" class="stack">
      <textarea id="reason" placeholder="Reason for report"></textarea>
      <button class="danger">Submit Report</button>
    </form>
  `);
  $('report-form').onsubmit = async (e) => {
    e.preventDefault();
    await api('/reports', { method: 'POST', headers: headers(), body: JSON.stringify({ listing_id: id, reason: $('reason').value }) });
    closeModal();
    alert('Report submitted.');
  };
}

window.featureListing = async function(id) {
  guardAuth();
  const res = await api(`/payments/feature/${id}`, { method: 'POST', headers: headers(false) });
  alert(res.message);
  await loadListings();
  await viewListing(id);
}

window.editListing = async function(id) {
  guardAuth();
  const l = await api(`/listings/${id}`);
  openCreateForm(l);
}

function openAuthForm(type) {
  const isLogin = type === 'login';
  openModal(`
    <h2>${isLogin ? 'Login' : 'Create account'}</h2>
    <form id="auth-form" class="stack">
      ${isLogin ? '' : '<input id="auth-name" placeholder="Name" />'}
      <input id="auth-email" type="email" placeholder="Email" />
      <input id="auth-password" type="password" placeholder="Password" />
      <button>${isLogin ? 'Login' : 'Register'}</button>
    </form>
  `);
  $('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
      email: $('auth-email').value,
      password: $('auth-password').value,
      ...(isLogin ? {} : { name: $('auth-name').value })
    };
    const data = await api(`/auth/${isLogin ? 'login' : 'register'}`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    closeModal();
    alert(`Welcome ${data.user.name}`);
  };
}

function openCreateForm(existing = null) {
  guardAuth();
  const options = state.categories.map(c => `<option value="${c.id}" ${existing?.category_id == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  openModal(`
    <h2>${existing ? 'Edit listing' : 'Post a listing'}</h2>
    <form id="listing-form" class="stack">
      <input id="title" placeholder="Title" value="${escapeAttr(existing?.title || '')}" />
      <textarea id="description" placeholder="Description">${escapeHtml(existing?.description || '')}</textarea>
      <div class="row">
        <input id="price" type="number" placeholder="Price" value="${existing?.price || 0}" />
        <select id="category_id"><option value="">Select category</option>${options}</select>
      </div>
      <div class="row">
        <input id="form-city" placeholder="City" value="${escapeAttr(existing?.city || '')}" />
        <input id="form-state" placeholder="State" value="${escapeAttr(existing?.state || '')}" />
      </div>
      <div class="row">
        <input id="zip" placeholder="ZIP" value="${escapeAttr(existing?.zip || '')}" />
        <input id="image" type="file" accept="image/*" />
      </div>
      <div class="row">
        <input id="latitude" placeholder="Latitude (optional)" value="${escapeAttr(existing?.latitude || '')}" />
        <input id="longitude" placeholder="Longitude (optional)" value="${escapeAttr(existing?.longitude || '')}" />
      </div>
      <button>${existing ? 'Save Changes' : 'Create Listing'}</button>
    </form>
  `);
  $('listing-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    ['title','description','price','category_id','zip','latitude','longitude'].forEach(id => form.append(id, document.getElementById(id).value));
    form.append('city', $('form-city').value);
    form.append('state', $('form-state').value);
    const file = $('image').files[0];
    if (file) form.append('image', file);
    const path = existing ? `/listings/${existing.id}` : '/listings';
    const method = existing ? 'PUT' : 'POST';
    const res = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${state.token}` }, body: form });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to save');
    closeModal();
    await loadListings();
    await viewListing(data.id);
  };
}

async function showFavorites() {
  guardAuth();
  const rows = await api('/favorites', { headers: headers(false) });
  openModal(`<h2>Favorites</h2>${rows.length ? rows.map(r => `<div class="message"><strong>${escapeHtml(r.title)}</strong><br>${escapeHtml(r.city || '')} ${escapeHtml(r.state || '')}<br><button onclick="closeModal(); viewListing(${r.id})">Open</button></div>`).join('') : '<p>No favorites yet.</p>'}`);
}

async function showMessages() {
  guardAuth();
  const rows = await api('/messages', { headers: headers(false) });
  openModal(`<h2>Messages</h2>${rows.length ? rows.map(m => `<div class="message"><strong>${escapeHtml(m.listing_title || 'Listing')}</strong><br>${escapeHtml(m.sender_name)} → ${escapeHtml(m.receiver_name)}<br>${escapeHtml(m.body)}<br><span class="meta">${new Date(m.created_at).toLocaleString()}</span></div>`).join('') : '<p>No messages yet.</p>'}`);
}

async function showMyListings() {
  guardAuth();
  const rows = await api('/my/listings', { headers: headers(false) });
  openModal(`<h2>My Listings</h2>${rows.length ? rows.map(r => `<div class="message"><strong>${escapeHtml(r.title)}</strong> — ${escapeHtml(r.status)}<br><button onclick="closeModal(); viewListing(${r.id})">Open</button></div>`).join('') : '<p>You have no listings yet.</p>'}`);
}

async function showAdmin() {
  guardAuth();
  if (!state.user?.is_admin) return alert('Admin only.');
  const [stats, reports, listings] = await Promise.all([
    api('/admin/stats', { headers: headers(false) }),
    api('/admin/reports', { headers: headers(false) }),
    api('/admin/listings', { headers: headers(false) })
  ]);
  openModal(`
    <h2>Admin Dashboard</h2>
    <div class="notice">Users: ${stats.users} • Listings: ${stats.listings} • Active: ${stats.active} • Open Reports: ${stats.openReports}</div>
    <h3>Reports</h3>
    <table class="table"><tr><th>ID</th><th>Listing</th><th>Reason</th><th>Status</th><th></th></tr>
      ${reports.map(r => `<tr><td>${r.id}</td><td>${escapeHtml(r.listing_title || '')}</td><td>${escapeHtml(r.reason)}</td><td>${escapeHtml(r.status)}</td><td><button onclick="closeReport(${r.id})">Close</button></td></tr>`).join('')}
    </table>
    <h3 class="mt">Listings</h3>
    <table class="table"><tr><th>Title</th><th>Status</th><th>Featured</th><th></th></tr>
      ${listings.map(l => `<tr><td>${escapeHtml(l.title)}</td><td>${escapeHtml(l.status)}</td><td>${l.is_featured ? 'Yes' : 'No'}</td><td><button onclick="adminToggle(${l.id}, '${l.status === 'active' ? 'hidden' : 'active'}', ${l.is_featured ? 0 : 1})">Toggle</button></td></tr>`).join('')}
    </table>
  `);
}

window.closeReport = async function(id) {
  await api(`/admin/reports/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status: 'closed' }) });
  showAdmin();
}

window.adminToggle = async function(id, status, featured) {
  await api(`/admin/listings/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status, is_featured: featured }) });
  showAdmin();
  loadListings();
}

function guardAuth() {
  if (!state.token) throw alert('Please login first.');
}

function escapeHtml(str = '') { return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s])); }
function escapeAttr(str = '') { return escapeHtml(str).replace(/`/g, '&#96;'); }
function escapeJs(str = '') { return String(str).replace(/'/g, "\\'"); }
window.closeModal = closeModal;

$('filters').onsubmit = (e) => { e.preventDefault(); loadListings(); };
$('show-login').onclick = () => openAuthForm('login');
$('show-register').onclick = () => openAuthForm('register');
$('show-create').onclick = () => openCreateForm();
$('show-favorites').onclick = showFavorites;
$('show-messages').onclick = showMessages;
$('show-my-listings').onclick = showMyListings;
$('show-admin').onclick = showAdmin;
$('logout').onclick = () => { localStorage.removeItem('token'); state = { ...state, token: '', user: null }; alert('Logged out.'); };

(async function init() {
  await loadCategories();
  await loadMe();
  await loadListings();
})();
