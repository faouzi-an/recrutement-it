import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Candidates() {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: '', profile: '', experience_years: 0, ville: '', preavis: '' });
  const [search, setSearch] = useState('');
  const [openDepts, setOpenDepts] = useState({});

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
      body: JSON.stringify({ ...form, experience_years: Number(form.experience_years) }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', email: '', phone: '', department: '', profile: '', experience_years: 0, ville: '', preavis: '' });
      fetchCandidates();
    }
  }

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.profile && c.profile.toLowerCase().includes(search.toLowerCase())) ||
    (c.ville && c.ville.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by department
  const grouped = {};
  for (const c of filtered) {
    const dept = c.department || 'Non assigné';
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(c);
  }
  const departments = Object.keys(grouped).sort();

  function toggleDept(dept) {
    setOpenDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  }

  return (
    <div className="candidates-page">
      <div className="page-header">
        <div>
          <h1>Candidats</h1>
          <p className="page-subtitle">{filtered.length} candidat{filtered.length > 1 ? 's' : ''} · {departments.length} département{departments.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annuler' : '+ Nouveau candidat'}
        </button>
      </div>

      <div className="filters-bar">
        <input type="text" placeholder="Rechercher par nom, email, profil ou ville…" value={search}
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
          <div className="form-row">
            <div className="form-group">
              <label>Département</label>
              <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                placeholder="ex: Développement, Data, Infrastructure…" />
            </div>
            <div className="form-group">
              <label>Profil</label>
              <input value={form.profile} onChange={e => setForm(f => ({ ...f, profile: e.target.value }))}
                placeholder="ex: Frontend React, DevOps…" />
            </div>
            <div className="form-group">
              <label>Expérience (années)</label>
              <input type="number" min="0" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Ville</label>
              <input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} placeholder="ex: Paris, Lyon…" />
            </div>
            <div className="form-group">
              <label>Préavis</label>
              <input value={form.preavis} onChange={e => setForm(f => ({ ...f, preavis: e.target.value }))} placeholder="ex: Immédiat, 1 mois, 3 mois…" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Ajouter</button>
        </form>
      )}

      {loading ? <div className="page-loading">Chargement…</div> : (
        <div className="dept-accordion">
          {departments.map(dept => (
            <div key={dept} className="dept-group">
              <button className={`dept-header ${openDepts[dept] ? 'open' : ''}`} onClick={() => toggleDept(dept)}>
                <div className="dept-header-left">
                  <svg className="dept-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="dept-name">{dept}</span>
                  <span className="dept-count">{grouped[dept].length} candidat{grouped[dept].length > 1 ? 's' : ''}</span>
                </div>
              </button>
              {openDepts[dept] && (
                <div className="dept-body">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Profil</th>
                        <th>Expérience</th>
                        <th>Ville</th>
                        <th>Préavis</th>
                        <th>Email</th>
                        <th>Téléphone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[dept].map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.name}</strong></td>
                          <td>{c.profile || '—'}</td>
                          <td>{c.experience_years} an{c.experience_years > 1 ? 's' : ''}</td>
                          <td>{c.ville || '—'}</td>
                          <td><span className={`badge ${c.preavis === 'Immédiat' ? 'badge-green' : 'badge-gray'}`}>{c.preavis || '—'}</span></td>
                          <td>{c.email || '—'}</td>
                          <td>{c.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {departments.length === 0 && <p className="text-muted text-center">Aucun candidat trouvé.</p>}
        </div>
      )}
    </div>
  );
}
