/**
 * auth.js — Kindred SPRC Authentication/API Module
 * Uses secure backend API endpoints instead of client-side credential storage.
 */
const Auth = (() => {
  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    let body = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }

    if (!response.ok) {
      return {
        success: false,
        message: body.message || 'Request failed.',
        status: response.status
      };
    }

    return { success: true, data: body, status: response.status };
  }

  async function getSession() {
    const result = await api('/api/auth/session');
    if (!result.success) return null;
    return result.data.session || null;
  }

  async function login(email, password) {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (!result.success) {
      return { success: false, message: result.message };
    }
    return { success: true, user: result.data.user };
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
    await api('/api/auth/logout', { method: 'POST' });
    window.location.replace('login.html');
  }

  async function getUsers() {
    const result = await api('/api/users');
    return result.success ? result.data.users : [];
  }

  async function addUser(user) {
    const result = await api('/api/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
    if (!result.success) return { success: false, message: result.message };
    return { success: true };
  }

  async function removeUser(email) {
    const result = await api(`/api/users/${encodeURIComponent(email)}`, {
      method: 'DELETE'
    });
    if (!result.success) return { success: false, message: result.message };
    return { success: true };
  }

  async function updateUser(originalEmail, payload) {
    const result = await api(`/api/users/${encodeURIComponent(originalEmail)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (!result.success) return { success: false, message: result.message };
    return { success: true };
  }

  async function getParticipants() {
    const result = await api('/api/participants');
    return result.success ? result.data.participants : [];
  }

  async function addParticipant(participant) {
    const result = await api('/api/participants', {
      method: 'POST',
      body: JSON.stringify(participant)
    });
    if (!result.success) return { success: false, message: result.message };
    return { success: true };
  }

  async function updateParticipant(id, participant) {
    const result = await api(`/api/participants/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(participant)
    });
    if (!result.success) return { success: false, message: result.message };
    return { success: true };
  }

  async function removeParticipant(id) {
    const result = await api(`/api/participants/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!result.success) return { success: false, message: result.message };
    return { success: true };
  }

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
