import { useEffect, useState } from 'react';
import {
  Boxes,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://mason-lava.onrender.com';
const emptyProduct = { product_name: '', description: '', price: '', quantity: '' };

async function apiRequest(path, { token, body, ...options } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || `Request failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return result;
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('lavalust_access_token') || '');
  const [refreshToken, setRefreshToken] = useState(() => sessionStorage.getItem('lavalust_refresh_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('lavalust_user') || 'null');
    } catch {
      return null;
    }
  });
  const [products, setProducts] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [draft, setDraft] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setProducts([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    apiRequest('/products', { token })
      .then((result) => {
        if (active) setProducts(result.products || []);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        if (requestError.status === 401) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token, reloadKey]);

  function clearSession() {
    sessionStorage.removeItem('lavalust_access_token');
    sessionStorage.removeItem('lavalust_refresh_token');
    sessionStorage.removeItem('lavalust_user');
    setToken('');
    setRefreshToken('');
    setUser(null);
    setProducts([]);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const result = await apiRequest('/login', {
        method: 'POST',
        body: { username, password },
      });
      sessionStorage.setItem('lavalust_access_token', result.tokens.access_token);
      sessionStorage.setItem('lavalust_refresh_token', result.tokens.refresh_token);
      sessionStorage.setItem('lavalust_user', JSON.stringify(result.user));
      setToken(result.tokens.access_token);
      setRefreshToken(result.tokens.refresh_token);
      setUser(result.user);
      setPassword('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setDraft(emptyProduct);
    setError('');
    setShowEditor(true);
  }

  function startEdit(product) {
    setEditingId(product.id);
    setDraft({
      product_name: product.product_name || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      quantity: String(product.quantity ?? ''),
    });
    setError('');
    setShowEditor(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await apiRequest(editingId ? `/products/${editingId}` : '/products', {
        method: editingId ? 'PUT' : 'POST',
        token,
        body: { ...draft, price: Number(draft.price), quantity: Number(draft.quantity) },
      });
      setShowEditor(false);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 401) clearSession();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete ${product.product_name}?`)) return;
    setError('');

    try {
      await apiRequest(`/products/${product.id}`, { method: 'DELETE', token });
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 401) clearSession();
    }
  }

  async function handleLogout() {
    try {
      await apiRequest('/logout', {
        method: 'POST',
        token,
        body: { refresh_token: refreshToken },
      });
    } catch {
      // Clear the client session even if the access token has expired.
    }
    clearSession();
  }

  const unitCount = products.reduce((total, product) => total + Number(product.quantity || 0), 0);
  const inventoryValue = products.reduce((total, product) => total + Number(product.price || 0) * Number(product.quantity || 0), 0);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-mark"><Boxes size={19} strokeWidth={2.2} /></span>
          <span>LavaLust<span className="brand-light"> / Products</span></span>
        </a>
        {token && (
          <div className="account-bar">
            <span className="account-name">{user?.username || 'Signed in'}</span>
            <button className="icon-button logout-button" onClick={handleLogout} title="Log out" aria-label="Log out">
              <LogOut size={17} />
            </button>
          </div>
        )}
      </header>

      {!token ? (
        <section className="login-layout">
          <div className="login-aside">
            <p className="eyebrow">LAVALUST / INVENTORY</p>
            <h1>Products,<br /><span>in order.</span></h1>
            <p>Sign in to manage your product catalog.</p>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-heading">
              <span className="form-mark"><Boxes size={20} /></span>
              <div><p className="eyebrow">ACCOUNT ACCESS</p><h2>Welcome back</h2></div>
            </div>
            {error && <p className="error-message" role="alert">{error}</p>}
            <label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrap">
              <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button className="icon-button password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? 'Hide password' : 'Show password'} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <button className="primary-button login-submit" disabled={saving}>
              {saving ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      ) : (
        <section className="products-page">
          <div className="page-heading">
            <div><p className="eyebrow">CATALOG / OVERVIEW</p><h1>Products</h1></div>
            <button className="primary-button" onClick={startCreate}><Plus size={17} /> Add product</button>
          </div>

          {error && <p className="error-message page-error" role="alert">{error}</p>}

          <div className="summary-strip">
            <div><span>PRODUCTS</span><strong>{products.length}</strong></div>
            <div><span>UNITS IN STOCK</span><strong>{unitCount}</strong></div>
            <div><span>STOCK VALUE</span><strong>{inventoryValue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</strong></div>
          </div>

          <div className="list-heading"><h2>Product list</h2><span>{loading ? 'Loading...' : `${products.length} ${products.length === 1 ? 'item' : 'items'}`}</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Description</th><th>Price</th><th>Quantity</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {!loading && products.length === 0 && <tr><td colSpan="5" className="empty-state">No products yet. Add the first one to your catalog.</td></tr>}
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><span className="product-name">{product.product_name}</span><small>#{product.id}</small></td>
                    <td className="description-cell">{product.description || '—'}</td>
                    <td className="numeric-cell">${Number(product.price).toFixed(2)}</td>
                    <td><span className="quantity-pill">{product.quantity}</span></td>
                    <td className="row-actions">
                      <button className="icon-button" onClick={() => startEdit(product)} title="Edit product" aria-label={`Edit ${product.product_name}`}><Pencil size={16} /></button>
                      <button className="icon-button delete-button" onClick={() => handleDelete(product)} title="Delete product" aria-label={`Delete ${product.product_name}`}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showEditor && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEditor(false); }}>
          <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">
            <div className="dialog-heading">
              <div><p className="eyebrow">CATALOG / {editingId ? 'EDIT' : 'NEW'}</p><h2 id="editor-title">{editingId ? 'Edit product' : 'Add product'}</h2></div>
              <button className="icon-button" onClick={() => setShowEditor(false)} title="Close" aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave}>
              <label>Product name<input maxLength="100" value={draft.product_name} onChange={(event) => setDraft({ ...draft, product_name: event.target.value })} required /></label>
              <label>Description<textarea maxLength="10000" rows="3" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <div className="form-row">
                <label>Price<input type="number" min="0" max="99999999.99" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} required /></label>
                <label>Quantity<input type="number" min="0" step="1" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} required /></label>
              </div>
              {error && <p className="error-message" role="alert">{error}</p>}
              <div className="dialog-actions">
                <button type="button" className="secondary-button" onClick={() => setShowEditor(false)}>Cancel</button>
                <button className="primary-button" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create product'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      <footer className="footer"><span>REACT <b>+</b> LAVALUST API</span><span>{apiBaseUrl}</span></footer>
    </main>
  );
}

export default App;
