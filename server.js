const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'kindred.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

async function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      date_added TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      guardian TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      special_needs TEXT NOT NULL,
      notes TEXT DEFAULT '',
      interests TEXT DEFAULT '',
      capabilities TEXT DEFAULT '',
      health_concerns TEXT DEFAULT '',
      created_at_ms INTEGER NOT NULL,
      date_added TEXT NOT NULL
    )
  `);

  const existingUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (existingUsers && existingUsers.count > 0) return;

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@kindred.local').trim().toLowerCase();
  const generatedPassword = crypto.randomBytes(8).toString('hex');
  const adminPassword = process.env.ADMIN_PASSWORD || generatedPassword;
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const dateAdded = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  db.prepare(
    'INSERT INTO users (name, email, password_hash, role, date_added) VALUES (?, ?, ?, ?, ?)'
  ).run('System Administrator', adminEmail, passwordHash, 'ADMIN', dateAdded);

  // Only printed on first DB seed.
  // Keep this private and rotate in production.
  console.log('Seeded initial admin account:');
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
}

app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (req.session?.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = db.prepare(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ?'
    ).get(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password. Please try again.' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Invalid email or password. Please try again.' });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return res.json({ success: true, user: req.session.user });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

app.get('/api/auth/session', (req, res) => {
  if (!req.session?.user) return res.json({ session: null });
  return res.json({ session: req.session.user });
});

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = db.prepare(
      'SELECT name, email, role, date_added AS dateAdded FROM users ORDER BY id DESC'
    ).all();
    return res.json({ users });
  } catch {
    return res.status(500).json({ message: 'Failed to load users.' });
  }
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || '').trim();
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All user fields are required.' });
    }

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ message: `An account for ${email} already exists.` });

    const hash = await bcrypt.hash(password, 12);
    const dateAdded = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    db.prepare(
      'INSERT INTO users (name, email, password_hash, role, date_added) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, hash, role, dateAdded);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: 'Failed to create user.' });
  }
});

app.put('/api/users/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const originalEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = String(req.body?.role || '').trim();
    const password = String(req.body?.password || '').trim();

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required.' });
    }
    if (!['VOLUNTEER', 'PARTICIPANT'].includes(role)) {
      return res.status(400).json({ message: 'Only volunteer and participant/guardian roles can be edited here.' });
    }

    const existingUser = db.prepare('SELECT id, role FROM users WHERE email = ?').get(originalEmail);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Keep admin accounts immutable through this edit flow.
    if (existingUser.role === 'ADMIN') {
      return res.status(403).json({ message: 'Administrator accounts cannot be edited here.' });
    }

    if (email !== originalEmail) {
      const duplicateEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (duplicateEmail) {
        return res.status(409).json({ message: `An account for ${email} already exists.` });
      }
    }

    if (password) {
      const hash = await bcrypt.hash(password, 12);
      db.prepare(
        `UPDATE users
         SET name = ?, email = ?, role = ?, password_hash = ?
         WHERE id = ?`
      ).run(name, email, role, hash, existingUser.id);
    } else {
      db.prepare(
        `UPDATE users
         SET name = ?, email = ?, role = ?
         WHERE id = ?`
      ).run(name, email, role, existingUser.id);
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: 'Failed to update user.' });
  }
});

app.delete('/api/users/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email).trim().toLowerCase();
    if (req.session.user.email.toLowerCase() === email) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }
    const result = db.prepare('DELETE FROM users WHERE email = ?').run(email);
    if (result.changes === 0) return res.status(404).json({ message: 'User not found.' });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: 'Failed to remove user.' });
  }
});

app.get('/api/participants', requireAuth, requireAdmin, async (req, res) => {
  try {
    const participants = db.prepare(`
      SELECT
        id,
        first_name AS firstName,
        last_name AS lastName,
        age,
        guardian,
        contact_email AS contactEmail,
        contact_phone AS contactPhone,
        special_needs AS specialNeeds,
        notes,
        date_added AS dateAdded
      FROM participants
      ORDER BY created_at_ms DESC
    `).all();
    const normalized = participants.map((p) => ({
      ...p,
      fullName: `${p.firstName} ${p.lastName}`.trim()
    }));
    return res.json({ participants: normalized });
  } catch {
    return res.status(500).json({ message: 'Failed to load participant records.' });
  }
});

function participantExistsExcludingCurrent({
  id = null,
  firstName,
  lastName,
  guardian,
  contactEmail
}) {
  const sql = id
    ? `SELECT id FROM participants
       WHERE lower(first_name) = lower(?)
         AND lower(last_name) = lower(?)
         AND lower(guardian) = lower(?)
         AND lower(contact_email) = lower(?)
         AND id <> ?`
    : `SELECT id FROM participants
       WHERE lower(first_name) = lower(?)
         AND lower(last_name) = lower(?)
         AND lower(guardian) = lower(?)
         AND lower(contact_email) = lower(?)`;
  const row = id
    ? db.prepare(sql).get(firstName, lastName, guardian, contactEmail, id)
    : db.prepare(sql).get(firstName, lastName, guardian, contactEmail);
  return Boolean(row);
}

app.post('/api/participants', requireAuth, requireAdmin, async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || '').trim();
    const lastName = String(req.body?.lastName || '').trim();
    const age = Number(req.body?.age);
    const guardian = String(req.body?.guardian || '').trim();
    const contactEmail = String(req.body?.contactEmail || '').trim().toLowerCase();
    const contactPhone = String(req.body?.contactPhone || '').trim();
    const specialNeeds = String(req.body?.specialNeeds || '').trim();
    const notes = String(req.body?.notes || '').trim();

    if (!firstName || !lastName || !guardian || !contactEmail || !contactPhone || !specialNeeds || !Number.isFinite(age)) {
      return res.status(400).json({ message: 'All required participant fields must be provided.' });
    }

    const duplicate = participantExistsExcludingCurrent({
      firstName,
      lastName,
      guardian,
      contactEmail
    });
    if (duplicate) {
      return res.status(409).json({
        message: 'A participant record with the same participant, guardian, and contact email already exists.'
      });
    }

    const now = Date.now();
    const dateAdded = new Date(now).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    db.prepare(
      `INSERT INTO participants
        (first_name, last_name, age, guardian, contact_email, contact_phone, special_needs, notes, created_at_ms, date_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(firstName, lastName, age, guardian, contactEmail, contactPhone, specialNeeds, notes, now, dateAdded);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: 'Failed to create participant record.' });
  }
});

app.put('/api/participants/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid participant id.' });

    const firstName = String(req.body?.firstName || '').trim();
    const lastName = String(req.body?.lastName || '').trim();
    const age = Number(req.body?.age);
    const guardian = String(req.body?.guardian || '').trim();
    const contactEmail = String(req.body?.contactEmail || '').trim().toLowerCase();
    const contactPhone = String(req.body?.contactPhone || '').trim();
    const specialNeeds = String(req.body?.specialNeeds || '').trim();
    const notes = String(req.body?.notes || '').trim();

    if (!firstName || !lastName || !guardian || !contactEmail || !contactPhone || !specialNeeds || !Number.isFinite(age)) {
      return res.status(400).json({ message: 'All required participant fields must be provided.' });
    }

    const existing = db.prepare('SELECT id FROM participants WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ message: 'Participant record not found.' });

    const duplicate = participantExistsExcludingCurrent({
      id,
      firstName,
      lastName,
      guardian,
      contactEmail
    });
    if (duplicate) {
      return res.status(409).json({
        message: 'A participant record with the same participant, guardian, and contact email already exists.'
      });
    }

    db.prepare(
      `UPDATE participants
       SET first_name = ?, last_name = ?, age = ?, guardian = ?, contact_email = ?,
           contact_phone = ?, special_needs = ?, notes = ?
       WHERE id = ?`,
    ).run(firstName, lastName, age, guardian, contactEmail, contactPhone, specialNeeds, notes, id);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: 'Failed to update participant record.' });
  }
});

app.delete('/api/participants/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid participant id.' });
    const result = db.prepare('DELETE FROM participants WHERE id = ?').run(id);
    if (result.changes === 0) return res.status(404).json({ message: 'Participant record not found.' });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: 'Failed to remove participant record.' });
  }
});

app.get('/api/guardian/participant', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const participant = db.prepare(`
      SELECT id, first_name AS firstName, last_name AS lastName, age,
             guardian, contact_email AS contactEmail, contact_phone AS contactPhone,
             special_needs AS specialNeeds, notes, interests, capabilities, health_concerns AS healthConcerns
      FROM participants
      WHERE contact_email = ?
    `).get(req.session.user.email);
    if (!participant) return res.json({ participant: null });
    return res.json({ participant });
  } catch {
    return res.status(500).json({ message: 'Failed to load participant profile.' });
  }
});

app.put('/api/guardian/participant', requireAuth, async (req, res) => {
  try {
    const interests = String(req.body?.interests || '').trim();
    const capabilities = String(req.body?.capabilities || '').trim();
    const healthConcerns = String(req.body?.healthConcerns || '').trim();

    const participant = db.prepare(`
      SELECT id FROM participants WHERE contact_email = ?
    `).get(req.session.user.email);

    if (!participant) return res.status(404).json({ message: 'No participant record found for this account.' });

    db.prepare(`
      UPDATE participants
      SET interests = ?, capabilities = ?, health_concerns = ?
      WHERE id = ?
    `).run(interests, capabilities, healthConcerns, participant.id);

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: 'Failed to update participant profile.' });
  }
});

app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Kindred server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
