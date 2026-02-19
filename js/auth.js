/**
 * auth.js — Kindred SPRC Authentication Module
 * Exposes a global `Auth` namespace via IIFE.
 * All session, credential, and user management logic lives here.
 */
const Auth = (() => {
  // ── Private ──────────────────────────────────────────────────────────────

  const SESSION_KEY = 'kindred_session';
  const USERS_KEY   = 'kindred_users';

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

  // Returns the full user array (passwords included) — for internal use only.
  function _getAllUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
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
      return raw ? JSON.parse(raw) : null;
    } catch {
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

  // Seed the user store immediately when the script loads.
  _initUsers();

  return { getSession, setSession, clearSession, login, requireAuth, logout, getUsers, addUser, removeUser };
})();
