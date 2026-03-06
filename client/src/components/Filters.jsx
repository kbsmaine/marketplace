export default function Filters({ categories, filters, setFilters, onApply }) {
  return (
    <form className="panel filters" onSubmit={(e) => { e.preventDefault(); onApply(); }}>
      <input placeholder="Search listings" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
      <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
        <option value="">All categories</option>
        {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
      </select>
      <input placeholder="City" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
      <input placeholder="State" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })} />
      <input placeholder="Min price" type="number" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
      <input placeholder="Max price" type="number" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
      <button>Apply Filters</button>
    </form>
  );
}
