import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  open: 'Ouvert', in_progress: 'En cours', interviews: 'Entretiens',
  offer: 'Offre', closed: 'Clôturé', cancelled: 'Annulé',
};
const STATUS_COLORS = {
  open: 'badge-blue', in_progress: 'badge-yellow', interviews: 'badge-purple',
  offer: 'badge-green', closed: 'badge-gray', cancelled: 'badge-red',
};
const PRIORITY_LABELS = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };
const PRIORITY_COLORS = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' };

export default function Needs() {
  const { token, user } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [managers, setManagers] = useState([]);
  const [filters, setFilters] = useState({ status: '', priority: '', profile: '' });
  const [form, setForm] = useState({ title: '', profile: '', experience_years: 0, manager_id: '', priority: 'medium', open_date: new Date().toISOString().slice(0, 10) });

  function buildQuery() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    return params.toString();
  }

  function fetchNeeds() {
    const q = buildQuery();
    fetch(`/api/needs${q ? '?' + q : ''}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setNeeds(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchNeeds(); }, [token, filters]);

  useEffect(() => {
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setManagers(data.filter(u => u.role === 'manager')))
      .catch(() => {});
  }, [token]);

  async function handleCreate(e) {
    e.preventDefault();
    const res = await fetch('/api/needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, experience_years: Number(form.experience_years), manager_id: form.manager_id ? Number(form.manager_id) : null }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ title: '', profile: '', experience_years: 0, manager_id: '', priority: 'medium', open_date: new Date().toISOString().slice(0, 10) });
      fetchNeeds();
    }
  }

  return (
    <div className="needs-page">
      <div className="page-header">
        <div>
          <h1>Besoins de recrutement</h1>
          <p className="page-subtitle">{needs.length} besoin{needs.length > 1 ? 's' : ''} trouvé{needs.length > 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'hr' && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annuler' : '+ Nouveau besoin'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">Toutes les priorités</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="text" placeholder="Rechercher par profil…" value={filters.profile}
          onChange={e => setFilters(f => ({ ...f, profile: e.target.value }))} />
      </div>

      {/* Create Form */}
      {showForm && (
        <form className="card form-card" onSubmit={handleCreate}>
          <h3>Nouveau besoin</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Titre du poste</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Profil recherché</label>
              <input required value={form.profile} onChange={e => setForm(f => ({ ...f, profile: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Expérience (années)</label>
              <input type="number" min="0" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Manager assigné</label>
              <select value={form.manager_id} onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}>
                <option value="">— Choisir —</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priorité</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date d'ouverture</label>
              <input type="date" value={form.open_date} onChange={e => setForm(f => ({ ...f, open_date: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Créer le besoin</button>
        </form>
      )}

      {/* Needs Table */}
      {loading ? <div className="page-loading">Chargement…</div> : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Profil</th>
                <th>Exp.</th>
                <th>Manager</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Candidatures</th>
                <th>Date d'ouverture</th>
              </tr>
            </thead>
            <tbody>
              {needs.map(n => (
                <tr key={n.id}>
                  <td><Link to={`/needs/${n.id}`} className="link-primary">{n.title}</Link></td>
                  <td>{n.profile}</td>
                  <td>{n.experience_years} an{n.experience_years > 1 ? 's' : ''}</td>
                  <td>{n.manager_name || '—'}</td>
                  <td><span className={`badge ${PRIORITY_COLORS[n.priority]}`}>{PRIORITY_LABELS[n.priority]}</span></td>
                  <td><span className={`badge ${STATUS_COLORS[n.status]}`}>{STATUS_LABELS[n.status]}</span></td>
                  <td className="text-center">{n.application_count}</td>
                  <td>{n.open_date?.slice(0, 10)}</td>
                </tr>
              ))}
              {needs.length === 0 && <tr><td colSpan="8" className="text-center text-muted">Aucun besoin trouvé.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
