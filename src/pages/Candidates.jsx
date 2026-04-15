import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  cv_received: 'CV reçu', preselected: 'Présélectionné', hr_interview: 'Entretien RH',
  manager_interview: 'Entretien Manager', technical_test: 'Test technique',
  offer_sent: 'Offre envoyée', accepted: 'Accepté', rejected: 'Refusé',
};
const STATUS_COLORS = {
  cv_received: 'badge-gray', preselected: 'badge-blue', hr_interview: 'badge-purple',
  manager_interview: 'badge-yellow', technical_test: 'badge-orange',
  offer_sent: 'badge-green', accepted: 'badge-green-solid', rejected: 'badge-red',
};

export default function Candidates() {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: '', entity: '', profile: '', experience_years: 0, ville: '', preavis: '' });
  const [search, setSearch] = useState('');
  const [openDepts, setOpenDepts] = useState({});
  const [openEntities, setOpenEntities] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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
      setForm({ name: '', email: '', phone: '', department: '', entity: '', profile: '', experience_years: 0, ville: '', preavis: '' });
      fetchCandidates();
    }
  }

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.profile && c.profile.toLowerCase().includes(search.toLowerCase())) ||
    (c.ville && c.ville.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by department → entity
  const grouped = {};
  for (const c of filtered) {
    const dept = c.department || 'Non assigné';
    const ent = c.entity || 'Non assignée';
    if (!grouped[dept]) grouped[dept] = {};
    if (!grouped[dept][ent]) grouped[dept][ent] = [];
    grouped[dept][ent].push(c);
  }
  const departments = Object.keys(grouped).sort();
  const deptCounts = {};
  for (const dept of departments) {
    deptCounts[dept] = Object.values(grouped[dept]).reduce((s, arr) => s + arr.length, 0);
  }

  function toggleDept(dept) {
    setOpenDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  }
  function toggleEntity(key) {
    setOpenEntities(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleExport() {
    try {
      const res = await fetch('/api/candidates/export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'candidats.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Erreur lors de l\'export.'); }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/candidates/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur');
      setImportResult(data);
      fetchCandidates();
    } catch (err) { alert(err.message || 'Erreur lors de l\'import.'); }
    finally { setImporting(false); }
  }

  return (
    <div className="candidates-page">
      <div className="page-header">
        <div>
          <h1>Candidats</h1>
          <p className="page-subtitle">{filtered.length} candidat{filtered.length > 1 ? 's' : ''} · {departments.length} département{departments.length > 1 ? 's' : ''}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={handleExport} title="Exporter en Excel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Excel
          </button>
          <label className={`btn btn-outline${importing ? ' btn-disabled' : ''}`} title="Importer depuis Excel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {importing ? 'Import…' : 'Import Excel'}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} hidden disabled={importing} />
          </label>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Annuler' : '+ Nouveau candidat'}
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`card import-result ${importResult.errors?.length ? 'import-result-warn' : 'import-result-ok'}`}>
          <p><strong>{importResult.imported}</strong> candidat{importResult.imported > 1 ? 's' : ''} importé{importResult.imported > 1 ? 's' : ''} sur {importResult.total}.</p>
          {importResult.errors?.length > 0 && (
            <details><summary>{importResult.errors.length} erreur{importResult.errors.length > 1 ? 's' : ''}</summary>
              <ul>{importResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </details>
          )}
          <button className="btn-close-sm" onClick={() => setImportResult(null)}>✕</button>
        </div>
      )}

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
              <label>Entité</label>
              <input value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value }))}
                placeholder="ex: Web Frontend, Cloud & DevOps…" />
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
                  <span className="dept-count">{deptCounts[dept]} candidat{deptCounts[dept] > 1 ? 's' : ''}</span>
                </div>
              </button>
              {openDepts[dept] && (
                <div className="dept-body">
                  {Object.keys(grouped[dept]).sort().map(ent => {
                    const entKey = `${dept}::${ent}`;
                    const entCandidates = grouped[dept][ent];
                    return (
                      <div key={entKey} className="entity-group">
                        <button className={`entity-header ${openEntities[entKey] ? 'open' : ''}`} onClick={() => toggleEntity(entKey)}>
                          <div className="dept-header-left">
                            <svg className="dept-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <span className="entity-name">{ent}</span>
                            <span className="dept-count">{entCandidates.length}</span>
                          </div>
                        </button>
                        {openEntities[entKey] && (
                          <div className="entity-body">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Nom</th>
                                  <th>Profil</th>
                                  <th>Expérience</th>
                                  <th>Ville</th>
                                  <th>Préavis</th>
                                  <th>Statut</th>
                                  <th>Email</th>
                                  <th>Téléphone</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entCandidates.map(c => (
                                  <tr key={c.id}>
                                    <td><strong>{c.name}</strong></td>
                                    <td>{c.profile || '—'}</td>
                                    <td>{c.experience_years} an{c.experience_years > 1 ? 's' : ''}</td>
                                    <td>{c.ville || '—'}</td>
                                    <td><span className={`badge ${c.preavis === 'Immédiat' ? 'badge-green' : 'badge-gray'}`}>{c.preavis || '—'}</span></td>
                                    <td>{c.app_status ? <span className={`badge ${STATUS_COLORS[c.app_status] || 'badge-gray'}`}>{STATUS_LABELS[c.app_status] || c.app_status}</span> : <span className="text-muted">—</span>}</td>
                                    <td>{c.email || '—'}</td>
                                    <td>{c.phone || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
