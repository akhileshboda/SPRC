/**
 * auth.js — Kindred SPRC Authentication Module
 * Exposes a global `Auth` namespace via IIFE.
 * All session, credential, and user management logic lives here.
 */
const Auth = (() => {
  // ── Private ──────────────────────────────────────────────────────────────

  const SESSION_KEY = 'kindred_session';
  const USERS_KEY   = 'kindred_users';
  const PARTICIPANTS_KEY = 'kindred_participants';

  // Seed data — written to localStorage on first load only.
  // Replace addUser() / _getAllUsers() with fetch() calls when a backend is added.
  const SEED_USERS = [
    { name: 'Lisa Williams',   email: 'lisawilliams@kindred.com', password: 'lisa123',  role: 'ADMIN',       dateAdded: 'Jan 1, 2025' },
    { name: 'April Williams',  email: 'april@email.com',          password: 'april123', role: 'PARTICIPANT',  dateAdded: 'Jan 1, 2025' },
    { name: 'Volunteer Staff', email: 'volunteer@kindred.org',    password: 'vol123',   role: 'VOLUNTEER',    dateAdded: 'Jan 1, 2025' }
  ];

  // Seed localStorage on first load (idempotent — never overwrites existing data).
  function _initUsers() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    }
  }

  function _initParticipants() {
    if (!localStorage.getItem(PARTICIPANTS_KEY)) {
      localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify([]));
    }
  }

  // Returns the full user array (passwords included) — for internal use only.
  function _getAllUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function _getAllParticipants() {
    try {
      return JSON.parse(localStorage.getItem(PARTICIPANTS_KEY)) || [];
    } catch {
      return [];
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Returns the current session object { email, role } from localStorage,
   * or null if absent or unparseable.
   */
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw);
      const isValidSession =
        session
        && typeof session.email === 'string'
        && session.email.trim() !== ''
        && typeof session.role === 'string'
        && session.role.trim() !== '';

      // Clean up malformed/legacy sessions to prevent redirect loops.
      if (!isValidSession) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  /**
   * Persists a safe session (strips password) to localStorage.
   * @param {{ name?: string, email: string, role: string }} user
   */
  function setSession(user) {
    const safeUser = { name: user.name || '', email: user.email, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  }

  /** Removes the session from localStorage. */
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /**
   * Validates credentials against the localStorage user store.
   * On success, saves the session and returns { success: true, user }.
   * On failure, returns { success: false, message }.
   * @param {string} email
   * @param {string} password
   */
  function login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const match = _getAllUsers().find(
      u => u.email.toLowerCase() === normalizedEmail && u.password === password
    );
    if (match) {
      setSession(match);
      return { success: true, user: match };
    }
    return { success: false, message: 'Invalid email or password. Please try again.' };
  }

  /**
   * Route guard — call at the top of DOMContentLoaded on any protected page.
   * Redirects to login.html if no valid session exists.
   * @returns {{ name: string, email: string, role: string } | null}
   */
  function requireAuth() {
    const session = getSession();
    if (!session || !session.role) {
      window.location.replace('login.html');
      return null;
    }
    return session;
  }

  /** Clears the session and redirects to the login page. */
  function logout() {
    clearSession();
    window.location.replace('login.html');
  }

  /**
   * Returns a sanitised user list (no passwords) for display in the management table.
   * @returns {{ name: string, email: string, role: string, dateAdded: string }[]}
   */
  function getUsers() {
    return _getAllUsers().map(({ name, email, role, dateAdded }) => ({ name, email, role, dateAdded }));
  }

  /**
   * Adds a new user to the localStorage user store.
   * Validates that the email is not already registered.
   * @param {{ name: string, email: string, password: string, role: string }} user
   * @returns {{ success: boolean, message?: string }}
   */
  function addUser({ name, email, password, role }) {
    const users = _getAllUsers();
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return { success: false, message: `An account for ${email} already exists.` };
    }

    users.push({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      dateAdded: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    });

    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return { success: true };
  }

  /**
   * Removes a user from the localStorage user store by email.
   * Refuses to remove the currently logged-in user.
   * @param {string} email
e   * @returns {{ success: boolean, message?: string }}
   */
  function removeUser(email) {
    const session = getSession();
    const normalizedEmail = email.trim().toLowerCase();

    if (session && session.email.toLowerCase() === normalizedEmail) {
      return { success: false, message: 'You cannot delete your own account.' };
    }

    const users = _getAllUsers();
    const filtered = users.filter(u => u.email.toLowerCase() !== normalizedEmail);

    if (filtered.length === users.length) {
      return { success: false, message: 'User not found.' };
    }

    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  /**
   * Returns all participant records (newest first).
   * @returns {{ id: string, firstName: string, lastName: string, fullName: string, age: number, guardian: string, contactEmail: string, contactPhone: string, specialNeeds: string, notes: string, dateAdded: string }[]}
   */
  function getParticipants() {
    return _getAllParticipants()
      .slice()
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      .map(({
        id,
        name,
        firstName,
        lastName,
        age,
        guardian,
        contactEmail,
        contactPhone,
        specialNeeds,
        notes,
        dateAdded
      }) => ({
        id,
        firstName: firstName || '',
        lastName: lastName || '',
        fullName: `${firstName || ''} ${lastName || ''}`.trim() || name || '',
        age,
        guardian,
        contactEmail,
        contactPhone,
        specialNeeds,
        notes: notes || '',
        dateAdded
      }));
  }

  /**
   * Adds a participant record for admin tracking.
   * Duplicate check is based on participant name + guardian + contact email.
   * @param {{ firstName?: string, lastName?: string, name?: string, age: number, guardian: string, contactEmail: string, contactPhone: string, specialNeeds: string, notes?: string }} participant
   * @returns {{ success: boolean, message?: string }}
   */
  function addParticipant({
    firstName,
    lastName,
    name,
    age,
    guardian,
    contactEmail,
    contactPhone,
    specialNeeds,
    notes = ''
  }) {
    const participants = _getAllParticipants();
    const resolvedFirstName = (firstName || '').trim();
    const resolvedLastName = (lastName || '').trim();
    const fallbackName = (name || '').trim();
    const fullName = `${resolvedFirstName} ${resolvedLastName}`.trim() || fallbackName;
    const normalizedName = fullName.toLowerCase();
    const normalizedGuardian = guardian.trim().toLowerCase();
    const normalizedEmail = contactEmail.trim().toLowerCase();

    const duplicate = participants.some(p => {
      const existingFullName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || (p.name || '');
      return existingFullName.trim().toLowerCase() === normalizedName
        && (p.guardian || '').trim().toLowerCase() === normalizedGuardian
        && (p.contactEmail || '').trim().toLowerCase() === normalizedEmail;
    });

    if (duplicate) {
      return {
        success: false,
        message: 'A participant record with the same participant, guardian, and contact email already exists.'
      };
    }

    participants.push({
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      name: fullName,
      age: Number(age),
      guardian: guardian.trim(),
      contactEmail: normalizedEmail,
      contactPhone: contactPhone.trim(),
      specialNeeds: specialNeeds.trim(),
      notes: notes.trim(),
      createdAtMs: Date.now(),
      dateAdded: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    });

    localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(participants));
    return { success: true };
  }

  /**
   * Removes a participant record by id.
   * @param {string} id
   * @returns {{ success: boolean, message?: string }}
   */
  function removeParticipant(id) {
    const participants = _getAllParticipants();
    const filtered = participants.filter(p => p.id !== id);

    if (filtered.length === participants.length) {
      return { success: false, message: 'Participant record not found.' };
    }

    localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  // Seed the user store immediately when the script loads.
  _initUsers();
  _initParticipants();

  return {
    getSession,
    setSession,
    clearSession,
    login,
    requireAuth,
    logout,
    getUsers,
    addUser,
    removeUser,
    getParticipants,
    addParticipant,
    removeParticipant
  };
})();
