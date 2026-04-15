import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { newDb } from 'pg-mem';
import * as XLSX from 'xlsx';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

app.use(cors({ origin: (o, cb) => cb(null, true) }));
app.use(express.json());

// ── Database ────────────────────────────────────────────────────────────────
async function buildPool() {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
    return new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  const local = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/recrutement_it' });
  try { await local.query('SELECT 1'); console.log('Connected to local PostgreSQL.'); return local; }
  catch { await local.end().catch(() => {}); console.log('Local PG unavailable — using pg-mem.'); }

  const db = newDb();
  db.public.none(SCHEMA);
  db.public.none(SEED);
  const { Pool: MemPool } = db.adapters.createPg();
  return new MemPool();
}

const SCHEMA = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('hr','manager')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE recruitment_needs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  profile VARCHAR(120) NOT NULL,
  experience_years INT NOT NULL DEFAULT 0,
  manager_id INT REFERENCES users(id),
  created_by INT REFERENCES users(id),
  open_date DATE NOT NULL DEFAULT CURRENT_DATE,
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','interviews','offer','closed','cancelled')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE candidates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(30),
  department VARCHAR(100),
  entity VARCHAR(100),
  profile VARCHAR(120),
  experience_years INT NOT NULL DEFAULT 0,
  ville VARCHAR(100),
  preavis INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  need_id INT NOT NULL REFERENCES recruitment_needs(id) ON DELETE CASCADE,
  candidate_id INT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'cv_received'
    CHECK (status IN ('cv_received','preselected','hr_interview','manager_interview','technical_test','offer_sent','accepted','rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE application_notes (
  id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  author_id INT REFERENCES users(id),
  step VARCHAR(30),
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE application_events (
  id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  event_date TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

const SEED = `
INSERT INTO users (email, password_hash, name, role) VALUES
  ('rh@recruit.com','$2b$10$0yc5kx3jDeqpYNEBVDI1f.c2OVRUSgy5NVljVcGUpXfYKzXAtyPKu','Sophie Martin','hr'),
  ('manager@recruit.com','$2b$10$0yc5kx3jDeqpYNEBVDI1f.c2OVRUSgy5NVljVcGUpXfYKzXAtyPKu','Thomas Durand','manager'),
  ('rh2@recruit.com','$2b$10$0yc5kx3jDeqpYNEBVDI1f.c2OVRUSgy5NVljVcGUpXfYKzXAtyPKu','Amina Benali','hr'),
  ('manager2@recruit.com','$2b$10$0yc5kx3jDeqpYNEBVDI1f.c2OVRUSgy5NVljVcGUpXfYKzXAtyPKu','Pierre Lefebvre','manager');

INSERT INTO recruitment_needs (title, profile, experience_years, manager_id, created_by, open_date, priority, status) VALUES
  ('Développeur React Senior','Frontend React',5,2,1,'2026-01-10','high','in_progress'),
  ('DevOps Engineer','DevOps / Cloud',3,2,1,'2026-02-01','high','interviews'),
  ('Data Analyst','Data / BI',2,4,3,'2026-02-15','medium','open'),
  ('Tech Lead Java','Backend Java',8,4,1,'2026-01-20','high','offer'),
  ('Développeur Python Junior','Backend Python',1,2,3,'2026-03-01','low','open'),
  ('Architecte Cloud AWS','Cloud / Infra',7,4,1,'2025-11-05','high','closed'),
  ('Scrum Master','Agile / Gestion',4,2,3,'2026-03-10','medium','open'),
  ('QA Automation Engineer','Test / QA',3,4,1,'2025-12-01','medium','closed'),
  ('Ingénieur Sécurité','Cybersécurité',5,2,1,'2026-01-15','high','in_progress'),
  ('UX Designer','Design / UX',3,4,3,'2026-03-20','medium','open');

INSERT INTO candidates (name, email, phone, department, entity, profile, experience_years, ville, preavis) VALUES
  ('Alice Dupont','alice@mail.com','0601020304','Développement','Web Frontend','Frontend React',5,'Paris',30),
  ('Bob Mercier','bob@mail.com','0605060708','Développement','Web Backend','Backend Java',3,'Lyon',60),
  ('Clara Petit','clara@mail.com','0611121314','Design','UX/UI','UX Designer',4,'Paris',30),
  ('David Roux','david@mail.com','0615161718','Infrastructure','Cloud & DevOps','DevOps / Cloud',6,'Toulouse',90),
  ('Emma Laurent','emma@mail.com','0621222324','Infrastructure','Sécurité','Ingénieur Sécurité',3,'Nantes',60),
  ('François Bernard','francois@mail.com','0625262728','Data','BI & Analytics','Data Analyst',2,'Bordeaux',30),
  ('Ghislaine Moreau','ghislaine@mail.com','0631323334','Data','Data Engineering','Data Engineer',5,'Paris',60),
  ('Hugo Simon','hugo@mail.com','0635363738','Développement','Web Backend','Tech Lead Java',8,'Marseille',90),
  ('Inès Faure','ines@mail.com','0641424344','Développement','Web Backend','Backend Python',1,'Lyon',0),
  ('Julien Gauthier','julien@mail.com','0645464748','Gestion de projet','PMO','Scrum Master',4,'Paris',30),
  ('Karim Nasser','karim@mail.com','0651525354','Infrastructure','Cloud & DevOps','Architecte Cloud',7,'Lille',90),
  ('Léa Fontaine','lea@mail.com','0655565758','QA','Automatisation','QA Automation',3,'Bordeaux',60);

INSERT INTO applications (need_id, candidate_id, status, created_at) VALUES
  (1,1,'manager_interview','2026-01-15'),
  (1,2,'hr_interview','2026-01-18'),
  (1,3,'rejected','2026-01-20'),
  (2,4,'technical_test','2026-02-10'),
  (2,5,'hr_interview','2026-02-12'),
  (3,6,'cv_received','2026-02-20'),
  (3,7,'preselected','2026-02-22'),
  (4,8,'offer_sent','2026-02-01'),
  (4,9,'accepted','2026-02-05'),
  (5,10,'cv_received','2026-03-05'),
  (6,11,'accepted','2025-12-01'),
  (6,12,'rejected','2025-11-20'),
  (8,1,'accepted','2025-12-20'),
  (9,2,'preselected','2026-01-25'),
  (9,5,'hr_interview','2026-02-01'),
  (10,3,'cv_received','2026-03-25');

INSERT INTO application_events (application_id, from_status, to_status, event_date) VALUES
  (1,'cv_received','preselected','2026-01-16'),
  (1,'preselected','hr_interview','2026-01-20'),
  (1,'hr_interview','manager_interview','2026-01-28'),
  (2,'cv_received','preselected','2026-01-19'),
  (2,'preselected','hr_interview','2026-01-25'),
  (3,'cv_received','rejected','2026-01-22'),
  (4,'cv_received','preselected','2026-02-11'),
  (4,'preselected','hr_interview','2026-02-15'),
  (4,'hr_interview','technical_test','2026-02-25'),
  (8,'cv_received','offer_sent','2026-02-10'),
  (9,'cv_received','preselected','2026-02-06'),
  (9,'preselected','hr_interview','2026-02-10'),
  (9,'hr_interview','manager_interview','2026-02-18'),
  (9,'manager_interview','accepted','2026-02-25'),
  (11,'cv_received','accepted','2025-12-15'),
  (13,'cv_received','accepted','2025-12-25');

INSERT INTO application_notes (application_id, author_id, step, content) VALUES
  (1,1,'hr_interview','Bon profil React, très motivé.'),
  (1,2,'manager_interview','Compétences solides, expérience pertinente.'),
  (4,1,'technical_test','Test technique planifié pour le 28/02.'),
  (9,1,'accepted','Offre acceptée, démarrage prévu le 01/03.'),
  (3,1,'rejected','Profil trop junior pour le poste.');
`;

const pool = await buildPool();

// ── Auth helpers ─────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Token manquant.' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ message: 'Token invalide.' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Accès interdit.' });
    next();
  };
}

// ── Auth routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email et mot de passe requis.' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Identifiants incorrects.' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Identifiants incorrects.' });
    res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch { res.status(500).json({ message: 'Erreur serveur.' }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json(rows[0]);
  } catch { res.status(500).json({ message: 'Erreur serveur.' }); }
});

// ── Users ────────────────────────────────────────────────────────────────────
app.get('/api/users', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, name, role FROM users ORDER BY name');
    res.json(rows);
  } catch { res.status(500).json({ message: 'Erreur serveur.' }); }
});

// ── Recruitment Needs ────────────────────────────────────────────────────────
app.get('/api/needs', authMiddleware, async (req, res) => {
  try {
    const { status, priority, profile, manager_id, from_date, to_date } = req.query;
    let q = 'SELECT * FROM recruitment_needs WHERE 1=1';
    const vals = [];
    let i = 1;
    if (status) { q += ` AND status = $${i++}`; vals.push(status); }
    if (priority) { q += ` AND priority = $${i++}`; vals.push(priority); }
    if (profile) { q += ` AND LOWER(profile) LIKE $${i++}`; vals.push(`%${profile.toLowerCase()}%`); }
    if (manager_id) { q += ` AND manager_id = $${i++}`; vals.push(Number(manager_id)); }
    if (from_date) { q += ` AND open_date >= $${i++}`; vals.push(from_date); }
    if (to_date) { q += ` AND open_date <= $${i++}`; vals.push(to_date); }
    q += ' ORDER BY created_at DESC';
    const { rows: needs } = await pool.query(q, vals);

    // Fetch users and app counts separately (pg-mem doesn't support correlated subqueries)
    const { rows: users } = await pool.query('SELECT id, name, role FROM users');
    const { rows: appCounts } = await pool.query('SELECT need_id, COUNT(*) AS count FROM applications GROUP BY need_id');
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    const countMap = Object.fromEntries(appCounts.map(r => [r.need_id, Number(r.count)]));

    const result = needs.map(n => ({
      ...n,
      manager_name: userMap[n.manager_id] || null,
      created_by_name: userMap[n.created_by] || null,
      application_count: countMap[n.id] || 0,
    }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur serveur.' }); }
});

app.get('/api/needs/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM recruitment_needs WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Besoin introuvable.' });
    const n = rows[0];
    const { rows: users } = await pool.query('SELECT id, name FROM users WHERE id = $1 OR id = $2', [n.manager_id, n.created_by]);
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
    res.json({ ...n, manager_name: userMap[n.manager_id] || null, created_by_name: userMap[n.created_by] || null });
  } catch { res.status(500).json({ message: 'Erreur serveur.' }); }
});

app.post('/api/needs', authMiddleware, async (req, res) => {
  const { title, profile, experience_years, manager_id, priority, open_date } = req.body;
  if (!title || !profile) return res.status(400).json({ message: 'Titre et profil requis.' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO recruitment_needs (title, profile, experience_years, manager_id, created_by, priority, open_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, profile, experience_years || 0, manager_id || null, req.user.id, priority || 'medium', open_date || new Date().toISOString().slice(0, 10)]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur création besoin.' }); }
});

app.patch('/api/needs/:id', authMiddleware, async (req, res) => {
  const { title, profile, experience_years, manager_id, priority, status } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM recruitment_needs WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Besoin introuvable.' });
    const n = rows[0];
    const updated = await pool.query(
      `UPDATE recruitment_needs SET title=$1, profile=$2, experience_years=$3,
       manager_id=$4, priority=$5, status=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [title ?? n.title, profile ?? n.profile, experience_years ?? n.experience_years,
       manager_id ?? n.manager_id, priority ?? n.priority, status ?? n.status, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur mise à jour.' }); }
});

// ── Candidates ───────────────────────────────────────────────────────────────
app.get('/api/candidates', authMiddleware, async (_req, res) => {
  try {
    const { rows: candidates } = await pool.query('SELECT * FROM candidates ORDER BY name');
    const { rows: apps } = await pool.query('SELECT candidate_id, status, updated_at FROM applications ORDER BY updated_at DESC');
    const latestStatus = {};
    for (const a of apps) {
      if (!latestStatus[a.candidate_id]) latestStatus[a.candidate_id] = a.status;
    }
    res.json(candidates.map(c => ({ ...c, app_status: latestStatus[c.id] || null })));
  } catch { res.status(500).json({ message: 'Erreur serveur.' }); }
});

app.post('/api/candidates', authMiddleware, async (req, res) => {
  const { name, email, phone, department, entity, profile, experience_years, ville, preavis } = req.body;
  if (!name) return res.status(400).json({ message: 'Nom requis.' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO candidates (name, email, phone, department, entity, profile, experience_years, ville, preavis) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [name, email || null, phone || null, department || null, entity || null, profile || null, experience_years || 0, ville || null, Number(preavis) || 0]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ message: 'Erreur création candidat.' }); }
});

app.put('/api/candidates/:id', authMiddleware, async (req, res) => {
  const { name, email, phone, department, entity, profile, experience_years, ville, preavis, app_status } = req.body;
  if (!name) return res.status(400).json({ message: 'Nom requis.' });
  try {
    const { rows } = await pool.query(
      `UPDATE candidates SET name=$1, email=$2, phone=$3, department=$4, entity=$5, profile=$6, experience_years=$7, ville=$8, preavis=$9 WHERE id=$10 RETURNING *`,
      [name, email || null, phone || null, department || null, entity || null, profile || null, experience_years || 0, ville || null, Number(preavis) || 0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Candidat introuvable.' });
    // Update application status if provided
    if (app_status) {
      const { rows: apps } = await pool.query('SELECT id FROM applications WHERE candidate_id=$1 ORDER BY created_at DESC', [req.params.id]);
      if (apps.length) {
        await pool.query('UPDATE applications SET status=$1, updated_at=NOW() WHERE id=$2', [app_status, apps[0].id]);
      }
    }
    res.json(rows[0]);
  } catch { res.status(500).json({ message: 'Erreur modification candidat.' }); }
});

app.delete('/api/candidates/:id', authMiddleware, async (req, res) => {
  const { motif } = req.body || {};
  try {
    const { rows } = await pool.query('DELETE FROM candidates WHERE id=$1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Candidat introuvable.' });
    console.log(`Candidat ${rows[0].name} (id=${rows[0].id}) supprimé. Motif: ${motif || 'non précisé'}`);
    res.json({ message: 'Candidat supprimé.', candidate: rows[0], motif });
  } catch { res.status(500).json({ message: 'Erreur suppression candidat.' }); }
});

// ── Export Excel ──────────────────────────────────────────────────────────────
app.get('/api/candidates/export', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT name, email, phone, department, entity, profile, experience_years, ville, preavis FROM candidates ORDER BY department, entity, name');
    const data = rows.map(r => ({
      'Nom': r.name, 'Email': r.email || '', 'Téléphone': r.phone || '',
      'Département': r.department || '', 'Entité': r.entity || '',
      'Profil': r.profile || '', 'Expérience (années)': r.experience_years || 0,
      'Ville': r.ville || '', 'Préavis (jours)': r.preavis || 0,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 8 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Candidats');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=candidats.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buf));
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur export.' }); }
});

// ── Import Excel ──────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/candidates/import', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Fichier manquant.' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    if (!rows.length) return res.status(400).json({ message: 'Fichier vide.' });

    let imported = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = r['Nom'] || r['nom'] || r['Name'] || r['name'];
      if (!name) { errors.push(`Ligne ${i + 2}: nom manquant`); continue; }
      const email = r['Email'] || r['email'] || null;
      const phone = r['Téléphone'] || r['telephone'] || r['Phone'] || r['phone'] || null;
      const department = r['Département'] || r['département'] || r['Department'] || r['department'] || null;
      const entity = r['Entité'] || r['entité'] || r['Entity'] || r['entity'] || null;
      const profile = r['Profil'] || r['profil'] || r['Profile'] || r['profile'] || null;
      const experience_years = Number(r['Expérience (années)'] || r['experience_years'] || r['Expérience'] || 0);
      const ville = r['Ville'] || r['ville'] || r['City'] || null;
      const preavis = Number(r['Préavis (jours)'] || r['Préavis'] || r['préavis'] || r['preavis'] || 0);
      try {
        await pool.query(
          'INSERT INTO candidates (name, email, phone, department, entity, profile, experience_years, ville, preavis) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
          [name, email, phone, department, entity, profile, experience_years, ville, preavis]
        );
        imported++;
      } catch (e) { errors.push(`Ligne ${i + 2}: ${e.message || 'erreur insertion'}`); }
    }
    res.json({ imported, total: rows.length, errors });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur import.' }); }
});

// ── Applications ─────────────────────────────────────────────────────────────
app.get('/api/needs/:needId/applications', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, c.name AS candidate_name, c.email AS candidate_email, c.phone AS candidate_phone
       FROM applications a
       JOIN candidates c ON c.id = a.candidate_id
       WHERE a.need_id = $1
       ORDER BY a.created_at DESC`, [req.params.needId]);
    res.json(rows);
  } catch { res.status(500).json({ message: 'Erreur serveur.' }); }
});

app.post('/api/needs/:needId/applications', authMiddleware, async (req, res) => {
  const { candidate_id, candidate_name, candidate_email, candidate_phone } = req.body;
  try {
    let cId = candidate_id;
    if (!cId && candidate_name) {
      const { rows } = await pool.query('INSERT INTO candidates (name, email, phone) VALUES ($1,$2,$3) RETURNING id',
        [candidate_name, candidate_email || null, candidate_phone || null]);
      cId = rows[0].id;
    }
    if (!cId) return res.status(400).json({ message: 'Candidat requis.' });
    const { rows } = await pool.query(
      'INSERT INTO applications (need_id, candidate_id) VALUES ($1,$2) RETURNING *',
      [req.params.needId, cId]);
    await pool.query('INSERT INTO application_events (application_id, to_status) VALUES ($1,$2)', [rows[0].id, 'cv_received']);
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Erreur création candidature.' }); }
});

app.patch('/api/applications/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: 'Statut requis.' });
  try {
    const { rows } = await pool.query('SELECT * FROM applications WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Candidature introuvable.' });
    const prev = rows[0].status;
    await pool.query('UPDATE applications SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id]);
    await pool.query('INSERT INTO application_events (application_id, from_status, to_status) VALUES ($1,$2,$3)',
      [req.params.id, prev, status]);
    res.json({ id: Number(req.params.id), from: prev, to: status });
  } catch { res.status(500).json({ message: 'Erreur mise à jour statut.' }); }
});

// ── Application Notes ────────────────────────────────────────────────────────
app.get('/api/applications/:appId/notes', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, u.name AS author_name FROM application_notes n
       LEFT JOIN users u ON u.id = n.author_id
       WHERE n.application_id = $1 ORDER BY n.created_at DESC`, [req.params.appId]);
    res.json(rows);
  } catch { res.status(500).json({ message: 'Erreur serveur.' }); }
});

app.post('/api/applications/:appId/notes', authMiddleware, async (req, res) => {
  const { content, step } = req.body;
  if (!content) return res.status(400).json({ message: 'Contenu requis.' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO application_notes (application_id, author_id, step, content) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.appId, req.user.id, step || null, content]);
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ message: 'Erreur création note.' }); }
});

// ── KPIs ─────────────────────────────────────────────────────────────────────
app.get('/api/kpis', authMiddleware, async (req, res) => {
  try {
    // Needs overview
    const needsOverview = await pool.query(`
      SELECT status, COUNT(*) AS count FROM recruitment_needs GROUP BY status
    `);

    // Applications by status
    const appsByStatus = await pool.query(`
      SELECT status, COUNT(*) AS count FROM applications GROUP BY status
    `);

    // Avg recruitment delay by profile (accepted applications)
    const delayRaw = await pool.query(`
      SELECT n.profile, n.experience_years, n.open_date, a.updated_at, u.name AS manager
      FROM recruitment_needs n
      JOIN applications a ON a.need_id = n.id AND a.status = 'accepted'
      LEFT JOIN users u ON u.id = n.manager_id
    `);

    // Compute delays in JS (pg-mem doesn't support timestamp subtraction)
    function daysBetween(d1, d2) {
      return Math.round((new Date(d1) - new Date(d2)) / 86400000);
    }
    function avgByKey(rows, keyFn) {
      const map = {};
      for (const r of rows) {
        const k = keyFn(r);
        if (!map[k]) map[k] = [];
        map[k].push(daysBetween(r.updated_at, r.open_date));
      }
      return Object.entries(map).map(([key, vals]) => ({
        key, avg_days: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      }));
    }

    const avgDelayByProfile = avgByKey(delayRaw.rows, r => r.profile)
      .map(r => ({ profile: r.key, avg_days: r.avg_days }));

    const avgDelayByExp = avgByKey(delayRaw.rows, r => {
      const y = r.experience_years;
      return y <= 2 ? 'Junior (0-2)' : y <= 5 ? 'Confirmé (3-5)' : 'Senior (6+)';
    }).map(r => ({ level: r.key, avg_days: r.avg_days }));

    const avgDelayByManager = avgByKey(delayRaw.rows, r => r.manager || 'N/A')
      .map(r => ({ manager: r.key, avg_days: r.avg_days }));

    // Conversion rate CV -> accepted
    const totalApps = await pool.query('SELECT COUNT(*) AS total FROM applications');
    const acceptedApps = await pool.query("SELECT COUNT(*) AS total FROM applications WHERE status = 'accepted'");
    const conversionRate = totalApps.rows[0].total > 0
      ? ((acceptedApps.rows[0].total / totalApps.rows[0].total) * 100).toFixed(1) : 0;

    // Applications per need (top 10)
    const appsPerNeed = await pool.query(`
      SELECT n.title, COUNT(a.id) AS count
      FROM recruitment_needs n
      LEFT JOIN applications a ON a.need_id = n.id
      GROUP BY n.id, n.title ORDER BY count DESC LIMIT 10
    `);

    // Top profiles
    const topProfiles = await pool.query(`
      SELECT profile, COUNT(*) AS count FROM recruitment_needs GROUP BY profile ORDER BY count DESC LIMIT 5
    `);

    // Abandon rate by step
    const abandonByStep = await pool.query(`
      SELECT status, COUNT(*) AS count FROM applications WHERE status = 'rejected' GROUP BY status
    `);
    const rejectedByPrevStep = await pool.query(`
      SELECT e.from_status AS step, COUNT(*) AS count
      FROM application_events e WHERE e.to_status = 'rejected'
      GROUP BY e.from_status
    `);

    // Needs cancelled rate
    const totalNeeds = await pool.query('SELECT COUNT(*) AS total FROM recruitment_needs');
    const cancelledNeeds = await pool.query("SELECT COUNT(*) AS total FROM recruitment_needs WHERE status = 'cancelled'");
    const cancelRate = totalNeeds.rows[0].total > 0
      ? ((cancelledNeeds.rows[0].total / totalNeeds.rows[0].total) * 100).toFixed(1) : 0;

    // Monthly needs opened (computed in JS — pg-mem lacks TO_CHAR)
    const allNeeds = await pool.query('SELECT open_date FROM recruitment_needs');
    const monthMap = {};
    for (const r of allNeeds.rows) {
      const d = new Date(r.open_date);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[m] = (monthMap[m] || 0) + 1;
    }
    const monthlyNeeds = Object.entries(monthMap).sort().map(([month, count]) => ({ month, count }));

    res.json({
      needsOverview: needsOverview.rows,
      appsByStatus: appsByStatus.rows,
      avgDelayByProfile,
      avgDelayByExp,
      conversionRate: Number(conversionRate),
      appsPerNeed: appsPerNeed.rows,
      topProfiles: topProfiles.rows,
      rejectedByStep: rejectedByPrevStep.rows,
      cancelRate: Number(cancelRate),
      avgDelayByManager,
      monthlyNeeds,
      totalNeeds: Number(totalNeeds.rows[0].total),
      totalApps: Number(totalApps.rows[0].total),
      totalAccepted: Number(acceptedApps.rows[0].total),
    });
  } catch (err) { console.error('KPI error', err); res.status(500).json({ message: 'Erreur KPIs.' }); }
});

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try { const r = await pool.query('SELECT NOW() AS now'); res.json({ ok: true, dbTime: r.rows[0].now }); }
  catch { res.status(500).json({ ok: false }); }
});

app.listen(PORT, () => console.log(`Recruit API running on http://localhost:${PORT}`));
