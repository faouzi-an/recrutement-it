import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
         PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#14b8a6'];

const STATUS_LABELS = {
  open: 'Ouvert', in_progress: 'En cours', interviews: 'Entretiens',
  offer: 'Offre', closed: 'Clôturé', cancelled: 'Annulé',
};
const APP_STATUS_LABELS = {
  cv_received: 'CV reçu', preselected: 'Présélectionné', hr_interview: 'Entretien RH',
  manager_interview: 'Entretien Manager', technical_test: 'Test technique',
  offer_sent: 'Offre envoyée', accepted: 'Accepté', rejected: 'Refusé',
};

export default function Dashboard() {
  const { token } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/kpis', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setKpis(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="page-loading">Chargement du tableau de bord…</div>;
  if (!kpis) return <div className="page-error">Erreur de chargement des KPIs.</div>;

  const needsData = kpis.needsOverview.map(r => ({ name: STATUS_LABELS[r.status] || r.status, value: Number(r.count) }));
  const appsData = kpis.appsByStatus.map(r => ({ name: APP_STATUS_LABELS[r.status] || r.status, value: Number(r.count) }));

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <p className="page-subtitle">Vue d'ensemble du processus de recrutement</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{kpis.totalNeeds}</span>
            <span className="kpi-label">Besoins totaux</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{kpis.totalApps}</span>
            <span className="kpi-label">Candidatures</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{kpis.conversionRate}%</span>
            <span className="kpi-label">Taux de conversion</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{kpis.cancelRate}%</span>
            <span className="kpi-label">Taux d'annulation</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Besoins par statut</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={needsData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                   outerRadius={90} innerRadius={45} paddingAngle={3} label={({ name, value }) => `${name} (${value})`}>
                {needsData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Candidatures par étape</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={appsData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Délai moyen par profil (jours)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={kpis.avgDelayByProfile.map(r => ({ ...r, avg_days: Number(r.avg_days) }))} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="profile" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avg_days" fill="#22c55e" radius={[4, 4, 0, 0]} name="Jours" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Candidatures par besoin (Top 10)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={kpis.appsPerNeed.map(r => ({ ...r, count: Number(r.count) }))} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="title" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Candidatures" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Profils les plus demandés</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={kpis.topProfiles.map(r => ({ name: r.profile, value: Number(r.count) }))}
                   dataKey="value" nameKey="name" cx="50%" cy="50%"
                   outerRadius={90} innerRadius={45} paddingAngle={3} label>
                {kpis.topProfiles.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Délai moyen par niveau d'expérience</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={kpis.avgDelayByExp.map(r => ({ ...r, avg_days: Number(r.avg_days) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avg_days" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Jours" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 4 */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Délai moyen par manager</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={kpis.avgDelayByManager.map(r => ({ ...r, avg_days: Number(r.avg_days) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="manager" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avg_days" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Jours" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Besoins ouverts par mois</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={kpis.monthlyNeeds.map(r => ({ ...r, count: Number(r.count) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Besoins" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
