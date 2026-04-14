import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Candidates() {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [search, setSearch] = useState('');

  function fetchCandidates() {
    fetch('/api/candidates', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setCandidates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchCandidates(); }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    const res = await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', email: '', phone: '' });
      fetchCandidates();
    }
  }

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="candidates-page">
      <div className="page-header">
        <div>
          <h1>Candidats</h1>
          <p className="page-subtitle">{filtered.length} candidat{filtered.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouveau candidat'}
        </button>
      </div>

      <div className="filters-bar">
        <input type="text" placeholder="Rechercher par nom ou email…" value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <form className="card form-card" onSubmit={handleCreate}>
          <h3>Nouveau candidat</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Nom complet</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Téléphone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Ajouter</button>
        </form>
      )}

      {loading ? <div className="page-loading">Chargement…</div> : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Date d'ajout</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.email || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Aucun candidat trouvé.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
