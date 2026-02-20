/**
 * auth.js — Frontend-only auth/data module (localStorage)
 * Keeps API async so existing UI code continues to work.
 */
const Auth = (() => {
  const SESSION_KEY = 'kindred_session';
  const USERS_KEY = 'kindred_users';
  const PARTICIPANTS_KEY = 'kindred_participants';

  const SEED_USERS = [
    {
      name: 'System Administrator',
      email: 'admin@kindred.local',
      password: 'admin123',
      role: 'ADMIN',
      dateAdded: 'Jan 1, 2025'
    },
    {
      name: 'April Williams',
      email: 'april@email.com',
      password: 'april123',
      role: 'PARTICIPANT',
      dateAdded: 'Jan 1, 2025'
    },
    {
      name: 'Volunteer Staff',
      email: 'volunteer@kindred.org',
      password: 'vol123',
      role: 'VOLUNTEER',
      dateAdded: 'Jan 1, 2025'
    }
  ];

  function initStores() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem(PARTICIPANTS_KEY)) {
      localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify([]));
    }
  }

  function getRawUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function getRawParticipants() {
    try {
      return JSON.parse(localStorage.getItem(PARTICIPANTS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function splitName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  async function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      const valid = session && typeof session.email === 'string' && typeof session.role === 'string';
      if (!valid) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  async function login(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const match = getRawUsers().find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
    );
    if (!match) {
      return { success: false, message: 'Invalid email or password. Please try again.' };
    }
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ name: match.name, email: match.email, role: match.role })
    );
    return { success: true, user: { name: match.name, email: match.email, role: match.role } };
  }

  async function requireAuth() {
    const session = await getSession();
    if (!session || !session.role) {
      window.location.replace('login.html');
      return null;
    }
    return session;
  }

  async function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.replace('login.html');
  }

  async function getUsers() {
    return getRawUsers().map(({ name, email, role, dateAdded }) => ({ name, email, role, dateAdded }));
  }

  async function addUser(user) {
    const users = getRawUsers();
    const email = String(user.email || '').trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return { success: false, message: `An account for ${email} already exists.` };
    }
    users.push({
      name: String(user.name || '').trim(),
      email,
      password: String(user.password || ''),
      role: String(user.role || '').trim(),
      dateAdded: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true };
  }

  async function updateUser(originalEmail, payload) {
    const users = getRawUsers();
    const original = String(originalEmail || '').trim().toLowerCase();
    const idx = users.findIndex((u) => u.email.toLowerCase() === original);
    if (idx === -1) return { success: false, message: 'User not found.' };
    if (users[idx].role === 'ADMIN') {
      return { success: false, message: 'Administrator accounts cannot be edited here.' };
    }

    const email = String(payload.email || '').trim().toLowerCase();
    if (users.some((u, i) => i !== idx && u.email.toLowerCase() === email)) {
      return { success: false, message: `An account for ${email} already exists.` };
    }

    users[idx].name = String(payload.name || '').trim();
    users[idx].email = email;
    users[idx].role = String(payload.role || '').trim();
    if (String(payload.password || '').trim()) {
      users[idx].password = String(payload.password);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true };
  }

  async function removeUser(email) {
    const session = await getSession();
    const normalized = String(email || '').trim().toLowerCase();
    if (session && session.email.toLowerCase() === normalized) {
      return { success: false, message: 'You cannot delete your own account.' };
    }
    const users = getRawUsers();
    const filtered = users.filter((u) => u.email.toLowerCase() !== normalized);
    if (filtered.length === users.length) return { success: false, message: 'User not found.' };
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  async function getParticipants() {
    return getRawParticipants()
      .slice()
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      .map((p) => {
        const firstName = p.firstName || splitName(p.name).firstName;
        const lastName = p.lastName || splitName(p.name).lastName;
        return {
          id: p.id,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          age: p.age,
          guardian: p.guardian,
          contactEmail: p.contactEmail,
          contactPhone: p.contactPhone,
          specialNeeds: p.specialNeeds,
          notes: p.notes || '',
          dateAdded: p.dateAdded
        };
      });
  }

  function participantDuplicate(participants, payload, skipId = null) {
    const firstName = String(payload.firstName || '').trim().toLowerCase();
    const lastName = String(payload.lastName || '').trim().toLowerCase();
    const guardian = String(payload.guardian || '').trim().toLowerCase();
    const contactEmail = String(payload.contactEmail || '').trim().toLowerCase();
    return participants.some((p) => {
      if (skipId !== null && String(p.id) === String(skipId)) return false;
      const pFirst = String(p.firstName || splitName(p.name).firstName).trim().toLowerCase();
      const pLast = String(p.lastName || splitName(p.name).lastName).trim().toLowerCase();
      return pFirst === firstName
        && pLast === lastName
        && String(p.guardian || '').trim().toLowerCase() === guardian
        && String(p.contactEmail || '').trim().toLowerCase() === contactEmail;
    });
  }

  async function addParticipant(payload) {
    const participants = getRawParticipants();
    if (participantDuplicate(participants, payload)) {
      return {
        success: false,
        message: 'A participant record with the same participant, guardian, and contact email already exists.'
      };
    }

    participants.push({
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      firstName: String(payload.firstName || '').trim(),
      lastName: String(payload.lastName || '').trim(),
      age: Number(payload.age),
      guardian: String(payload.guardian || '').trim(),
      contactEmail: String(payload.contactEmail || '').trim().toLowerCase(),
      contactPhone: String(payload.contactPhone || '').trim(),
      specialNeeds: String(payload.specialNeeds || '').trim(),
      notes: String(payload.notes || '').trim(),
      createdAtMs: Date.now(),
      dateAdded: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    });
    localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
    return { success: true };
  }

  async function updateParticipant(id, payload) {
    const participants = getRawParticipants();
    const idx = participants.findIndex((p) => String(p.id) === String(id));
    if (idx === -1) return { success: false, message: 'Participant record not found.' };
    if (participantDuplicate(participants, payload, id)) {
      return {
        success: false,
        message: 'A participant record with the same participant, guardian, and contact email already exists.'
      };
    }
    participants[idx] = {
      ...participants[idx],
      firstName: String(payload.firstName || '').trim(),
      lastName: String(payload.lastName || '').trim(),
      age: Number(payload.age),
      guardian: String(payload.guardian || '').trim(),
      contactEmail: String(payload.contactEmail || '').trim().toLowerCase(),
      contactPhone: String(payload.contactPhone || '').trim(),
      specialNeeds: String(payload.specialNeeds || '').trim(),
      notes: String(payload.notes || '').trim()
    };
    localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
    return { success: true };
  }

  async function removeParticipant(id) {
    const participants = getRawParticipants();
    const filtered = participants.filter((p) => String(p.id) !== String(id));
    if (filtered.length === participants.length) {
      return { success: false, message: 'Participant record not found.' };
    }
    localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  initStores();

  return {
    getSession,
    login,
    requireAuth,
    logout,
    getUsers,
    addUser,
    updateUser,
    removeUser,
    getParticipants,
    addParticipant,
    updateParticipant,
    removeParticipant
  };
})();
