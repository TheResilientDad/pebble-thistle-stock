import { useMemo, useState } from 'react';
import data from './data/stock.json';

// Anything below this quantity gets a "Low stock" badge.
const LOW_STOCK = 5;

const COLUMNS = [
  { key: 'item', label: 'Item' },
  { key: 'category', label: 'Category' },
  { key: 'sku', label: 'SKU' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'quantity', label: 'Qty', numeric: true },
  { key: 'unitCost', label: 'Unit cost', numeric: true },
  { key: 'salePrice', label: 'Sale price', numeric: true },
  { key: 'lastRestocked', label: 'Last restocked' },
];

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const gbpWhole = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const money = (n) => (n == null ? '—' : gbp.format(n));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${+d} ${MONTHS[m - 1]} ${y}`;
};

const unique = (key) => [...new Set(data.items.map((i) => i[key]).filter(Boolean))].sort();
const CATEGORIES = unique('category');
const SUPPLIERS = unique('supplier');

function StockBadge({ quantity }) {
  if (quantity == null) return <span className="badge badge-muted">Not counted</span>;
  if (quantity === 0) return <span className="badge badge-out">Out of stock</span>;
  if (quantity < LOW_STOCK) return <span className="badge badge-low">Low stock</span>;
  return null;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState({ key: 'item', dir: 'asc' });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.items.filter(
      (i) =>
        (!q || [i.item, i.sku, i.supplier].some((v) => v.toLowerCase().includes(q))) &&
        (!category || i.category === category) &&
        (!supplier || i.supplier === supplier) &&
        (!lowOnly || (i.quantity != null && i.quantity < LOW_STOCK)),
    );
    const dir = sort.dir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x == null || x === '') return 1; // blanks always last
      if (y == null || y === '') return -1;
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }, [query, category, supplier, lowOnly, sort]);

  const stockValue = rows.reduce((sum, i) => sum + (i.quantity ?? 0) * (i.unitCost ?? 0), 0);
  const lowCount = rows.filter((i) => i.quantity != null && i.quantity < LOW_STOCK).length;
  const filtersOn = query || category || supplier || lowOnly;

  const sortBy = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const clear = () => { setQuery(''); setCategory(''); setSupplier(''); setLowOnly(false); };

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">P&amp;T</span>
          <div>
            <h1>Pebble &amp; Thistle</h1>
            <p>Stock list · updated {day(data.updated)}</p>
          </div>
        </div>
      </header>

      <section className="controls" aria-label="Search and filters">
        <label className="search">
          <span className="visually-hidden">Search</span>
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" /></svg>
          <input
            type="search"
            placeholder="Search item, SKU or supplier"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="filters">
          <label>
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            <span>Supplier</span>
            <select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              <option value="">All suppliers</option>
              {SUPPLIERS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="sort-mobile">
            <span>Sort by</span>
            <select
              value={`${sort.key}:${sort.dir}`}
              onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }); }}
            >
              <option value="item:asc">Name A–Z</option>
              <option value="quantity:asc">Lowest stock</option>
              <option value="quantity:desc">Highest stock</option>
              <option value="salePrice:desc">Price: high–low</option>
              <option value="salePrice:asc">Price: low–high</option>
              <option value="lastRestocked:desc">Restock date</option>
              <option value="supplier:asc">Supplier A–Z</option>
            </select>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
            <span>Low stock only</span>
          </label>
        </div>
      </section>

      <p className="summary" aria-live="polite">
        <strong>{rows.length}</strong> of {data.items.length} items
        <span className="dot">·</span>
        Stock value <strong>{gbpWhole.format(stockValue)}</strong> <span className="muted">at cost</span>
        {lowCount > 0 && (<><span className="dot">·</span><span className="low-text">{lowCount} low</span></>)}
        {filtersOn && <button className="link" onClick={clear}>Clear filters</button>}
      </p>

      {rows.length === 0 ? (
        <div className="empty">
          <p>No items match those filters.</p>
          <button className="link" onClick={clear}>Clear filters</button>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={c.numeric ? 'num' : undefined}
                      aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button onClick={() => sortBy(c.key)}>
                        {c.label}
                        <span className="arrow" aria-hidden="true">
                          {sort.key === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td className="item-cell">{i.item}</td>
                    <td>{i.category}</td>
                    <td className="mono">{i.sku || <span className="muted">No SKU</span>}</td>
                    <td>{i.supplier || <span className="muted">Not recorded</span>}</td>
                    <td className="num qty-cell">
                      <span>{i.quantity ?? '—'}</span>
                      <StockBadge quantity={i.quantity} />
                    </td>
                    <td className="num">{money(i.unitCost)}</td>
                    <td className="num">{money(i.salePrice)}</td>
                    <td>{day(i.lastRestocked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="cards">
            {rows.map((i) => (
              <li key={i.id} className="card">
                <div className="card-top">
                  <div>
                    <h2>{i.item}</h2>
                    <p className="muted">{i.category} · <span className="mono">{i.sku || 'No SKU'}</span></p>
                  </div>
                  <div className="card-qty">
                    <span className="qty-number">{i.quantity ?? '—'}</span>
                    <span className="muted">in stock</span>
                  </div>
                </div>
                <StockBadge quantity={i.quantity} />
                <dl>
                  <div><dt>Sale price</dt><dd>{money(i.salePrice)}</dd></div>
                  <div><dt>Unit cost</dt><dd>{money(i.unitCost)}</dd></div>
                  <div><dt>Supplier</dt><dd>{i.supplier || 'Not recorded'}</dd></div>
                  <div><dt>Restocked</dt><dd>{day(i.lastRestocked)}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}

      <footer className="foot">Demo app with invented data · built from a spreadsheet</footer>
    </div>
  );
}
