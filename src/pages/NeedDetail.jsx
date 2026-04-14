import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NEED_STATUS = ['open', 'in_progress', 'interviews', 'offer', 'closed', 'cancelled'];
const NEED_STATUS_LABELS = {
  open: 'Ouvert', in_progress: 'En cours', interviews: 'Entretiens',
  offer: 'Offre', closed: 'Clôturé', cancelled: 'Annulé',
};
const APP_STATUSES = ['cv_received', 'preselected', 'hr_interview', 'manager_interview', 'technical_test', 'offer_sent', 'accepted', 'rejected'];
const APP_STATUS_LABELS = {
  cv_received: 'CV reçu', preselected: 'Présélectionné', hr_interview: 'Entretien RH',
  manager_interview: 'Entretien Manager', technical_test: 'Test technique',
  offer_sent: 'Offre envoyée', accepted: 'Accepté', rejected: 'Refusé',
};
const APP_STATUS_COLORS = {
  cv_received: 'badge-gray', preselected: 'badge-blue', hr_interview: 'badge-purple',
  manager_interview: 'badge-yellow', technical_test: 'badge-orange',
  offer_sent: 'badge-green', accepted: 'badge-green-solid', rejected: 'badge-red',
};

export default function NeedDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [need, setNeed] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [showAddApp, setShowAddApp] = useState(false);
  const [newApp, setNewApp] = useState({ candidate_id: '', candidate_name: '', candidate_email: '' });
  const [selectedApp, setSelectedApp] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  function fetchNeed() {
    fetch(`/api/needs/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setNeed).catch(() => {});
  }
  function fetchApps() {
    fetch(`/api/needs/${id}/applications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setApps(data); setLoading(false); }).catch(() => setLoading(false));
  }

  useEffect(() => { fetchNeed(); fetchApps(); }, [id, token]);

  useEffect(() => {
    fetch('/api/candidates', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setCandidates).catch(() => {});
  }, [token]);

  async function changeNeedStatus(status) {
    await fetch(`/api/needs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchNeed();
  }

  async function addApplication(e) {
    e.preventDefault();
    const body = newApp.candidate_id
      ? { candidate_id: Number(newApp.candidate_id) }
      : { candidate_name: newApp.candidate_name, candidate_email: newApp.candidate_email };
    const res = await fetch(`/api/needs/${id}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) { setShowAddApp(false); setNewApp({ candidate_id: '', candidate_name: '', candidate_email: '' }); fetchApps(); }
  }

  async function changeAppStatus(appId, status) {
    await fetch(`/api/applications/${appId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchApps();
  }

  async function openNotes(app) {
    setSelectedApp(app);
    const res = await fetch(`/api/applications/${app.id}/notes`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setNotes(await res.json());
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await fetch(`/api/applications/${selectedApp.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: newNote, step: selectedApp.status }),
    });
    setNewNote('');
    const res = await fetch(`/api/applications/${selectedApp.id}/notes`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setNotes(await res.json());
  }

  if (loading) return <div className="page-loading">Chargement…</div>;
  if (!need) return <div className="page-error">Besoin introuvable.</div>;

  return (
    <div className="need-detail-page">
      <Link to="/needs" className="back-link">← Retour aux besoins</Link>

      {/* Need Header */}
      <div className="need-header card">
        <div className="need-header-top">
          <div>
            <h1>{need.title}</h1>
            <p className="need-meta">{need.profile} · {need.experience_years} an{need.experience_years > 1 ? 's' : ''} d'expérience · Manager : {need.manager_name || '—'}</p>
          </div>
          <span className={`badge badge-lg ${APP_STATUS_COLORS[need.status] || 'badge-gray'}`}>
            {NEED_STATUS_LABELS[need.status]}
          </span>
        </div>
        {user?.role === 'hr' && (
          <div className="need-actions">
            <span className="label">Changer le statut :</span>
            {NEED_STATUS.map(s => (
              <button key={s} className={`btn btn-sm ${need.status === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => changeNeedStatus(s)} disabled={need.status === s}>
                {NEED_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Applications */}
      <div className="section-header">
        <h2>Candidatures ({apps.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddApp(!showAddApp)}>
          {showAddApp ? 'Annuler' : '+ Ajouter candidature'}
        </button>
      </div>

      {showAddApp && (
        <form className="card form-card" onSubmit={addApplication}>
          <h3>Ajouter une candidature</h3>
          <div className="form-group">
            <label>Candidat existant</label>
            <select value={newApp.candidate_id} onChange={e => setNewApp(f => ({ ...f, candidate_id: e.target.value }))}>
              <option value="">— Nouveau candidat —</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </div>
          {!newApp.candidate_id && (
            <div className="form-row">
              <div className="form-group">
                <label>Nom</label>
                <input required value={newApp.candidate_name} onChange={e => setNewApp(f => ({ ...f, candidate_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={newApp.candidate_email} onChange={e => setNewApp(f => ({ ...f, candidate_email: e.target.value }))} />
              </div>
            </div>
          )}
          <button type="submit" className="btn btn-primary">Ajouter</button>
        </form>
      )}

      <div className="apps-list">
        {apps.map(app => (
          <div key={app.id} className="app-card card">
            <div className="app-card-header">
              <div>
                <strong>{app.candidate_name}</strong>
                <span className="text-muted"> · {app.candidate_email}</span>
              </div>
              <span className={`badge ${APP_STATUS_COLORS[app.status]}`}>{APP_STATUS_LABELS[app.status]}</span>
            </div>
            <div className="app-card-actions">
              <div className="status-pipeline">
                {APP_STATUSES.map(s => (
                  <button key={s} className={`pipeline-step ${app.status === s ? 'active' : ''} ${APP_STATUSES.indexOf(s) < APP_STATUSES.indexOf(app.status) ? 'done' : ''}`}
                    onClick={() => changeAppStatus(app.id, s)} title={APP_STATUS_LABELS[s]}>
                    {APP_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => openNotes(app)}>
                Notes
              </button>
            </div>
          </div>
        ))}
        {apps.length === 0 && <p className="text-muted text-center">Aucune candidature pour ce besoin.</p>}
      </div>

      {/* Notes Modal */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Notes — {selectedApp.candidate_name}</h3>
              <button className="btn-close" onClick={() => setSelectedApp(null)}>×</button>
            </div>
            <div className="modal-body">
              {notes.length === 0 && <p className="text-muted">Aucune note.</p>}
              {notes.map(n => (
                <div key={n.id} className="note-item">
                  <div className="note-meta">
                    <strong>{n.author_name || 'Système'}</strong>
                    {n.step && <span className="badge badge-sm badge-blue">{APP_STATUS_LABELS[n.step] || n.step}</span>}
                    <span className="text-muted text-sm">{new Date(n.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p>{n.content}</p>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <input value={newNote} onChange={e => setNewNote(e.target.value)}
                placeholder="Ajouter une note…" onKeyDown={e => e.key === 'Enter' && addNote()} />
              <button className="btn btn-primary btn-sm" onClick={addNote}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
