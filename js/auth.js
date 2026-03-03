/**
 * auth.js — Frontend-only auth/data module (localStorage)
 * Keeps API async so existing UI code continues to work.
 */
const Auth = (() => {
  const SESSION_KEY = 'kindred_session';
  const USERS_KEY = 'kindred_users';
  const PARTICIPANTS_KEY = 'kindred_participants';
  // Keep the historical storage key so previously saved admin records still load.
  const EVENTS_KEY = 'kindred_opportunities';

  const SEED_EVENTS = [
    {
      id: 'seed_e1',
      title: 'Community Art Night',
      category: 'Social',
      dateTime: '2026-04-05T18:00',
      eventTimestamp: new Date('2026-04-05T18:00').getTime(),
      location: 'Riverside Community Center, 200 Main St',
      cost: 'Free',
      accommodations: 'Wheelchair accessible entrance. Quiet sensory room available on request. Staff on-site to assist participants throughout the evening.',
      createdAtMs: 1740000000000,
      dateAdded: 'Mar 3, 2026'
    },
    {
      id: 'seed_e2',
      title: 'Job Skills Workshop',
      category: 'Vocational',
      dateTime: '2026-04-12T10:00',
      eventTimestamp: new Date('2026-04-12T10:00').getTime(),
      location: 'Downtown Career Center, 145 Elm St',
      cost: 'Free',
      accommodations: 'Ages 18+. Sign language interpreter available. Large-print materials provided. Participants should bring a government-issued ID.',
      createdAtMs: 1740000001000,
      dateAdded: 'Mar 3, 2026'
    },
    {
      id: 'seed_e3',
      title: 'Library Reading Program',
      category: 'Educational',
      dateTime: '2026-04-19T14:00',
      eventTimestamp: new Date('2026-04-19T14:00').getTime(),
      location: 'Public Library — Main Branch, 300 Oak Ave',
      cost: 'Free',
      accommodations: 'All ages welcome. Screen reader–compatible materials and audio books available. Sensory-friendly lighting maintained throughout.',
      createdAtMs: 1740000002000,
      dateAdded: 'Mar 3, 2026'
    },
    {
      id: 'seed_e4',
      title: 'Adaptive Cooking Class',
      category: 'Vocational',
      dateTime: '2026-04-26T11:00',
      eventTimestamp: new Date('2026-04-26T11:00').getTime(),
      location: 'Harvest Kitchen, 78 Birch Blvd',
      cost: '$10 per session',
      accommodations: 'Ages 16+. One-on-one aide support available. Kitchen fully accessible. Participants with food allergies should notify the coordinator 48 hours in advance.',
      createdAtMs: 1740000003000,
      dateAdded: 'Mar 3, 2026'
    },
    {
      id: 'seed_e5',
      title: 'Buddy Bowling Night',
      category: 'Social',
      dateTime: '2026-05-03T17:00',
      eventTimestamp: new Date('2026-05-03T17:00').getTime(),
      location: 'Kingpin Lanes, 555 Fairway Dr',
      cost: 'Free',
      accommodations: 'Open to all ages and abilities. Ramp bowling available. Noise-reducing headphones on loan. Volunteer buddies paired with each participant.',
      createdAtMs: 1740000004000,
      dateAdded: 'Mar 3, 2026'
    },
    {
      id: 'seed_e6',
      title: 'Digital Literacy Seminar',
      category: 'Educational',
      dateTime: '2026-05-10T13:00',
      eventTimestamp: new Date('2026-05-10T13:00').getTime(),
      location: 'Eastside Tech Hub, 900 Maple Ct',
      cost: 'Free',
      accommodations: 'Ages 14+. Assistive technology stations available. Step-by-step printed guides provided. Caregiver or guardian welcome to attend alongside participant.',
      createdAtMs: 1740000005000,
      dateAdded: 'Mar 3, 2026'
    }
  ];

  const SEED_USERS = [
    {
      name: 'Lisa Williams',
      email: 'lisawilliams@kindred.org',
      password: 'lisa123',
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
    const rawUsers = localStorage.getItem(USERS_KEY);
    if (!rawUsers) {
      localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
    } else {
      let users = [];
      try {
        users = JSON.parse(rawUsers) || [];
      } catch {
        users = [];
      }

      // Keep existing data, but guarantee baseline seeded logins exist.
      const existingEmails = new Set(users.map((u) => String(u.email || '').toLowerCase()));
      let changed = false;
      SEED_USERS.forEach((seedUser) => {
        if (!existingEmails.has(seedUser.email.toLowerCase())) {
          users.push(seedUser);
          changed = true;
        }
      });

      if (changed || !Array.isArray(users)) {
        localStorage.setItem(USERS_KEY, JSON.stringify(Array.isArray(users) ? users : SEED_USERS));
      }
    }
    if (!localStorage.getItem(PARTICIPANTS_KEY)) {
      localStorage.setItem(PARTICIPANTS_KEY, JSON.stringify([]));
    }
    const rawEvents = localStorage.getItem(EVENTS_KEY);
    const parsedEvents = rawEvents ? (() => { try { return JSON.parse(rawEvents); } catch { return []; } })() : null;
    if (!rawEvents || !Array.isArray(parsedEvents) || parsedEvents.length === 0) {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(SEED_EVENTS));
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

  function getRawEvents() {
    try {
      return JSON.parse(localStorage.getItem(EVENTS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function splitName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  function getEventTimestamp(dateTime) {
    const timestamp = new Date(String(dateTime || '')).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function formatEventDateTime(dateTime) {
    const timestamp = getEventTimestamp(dateTime);
    if (timestamp === null) return String(dateTime || '').trim();

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(timestamp));
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

  async function clearLocalData({ reseed = true } = {}) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(PARTICIPANTS_KEY);
    localStorage.removeItem(EVENTS_KEY);
    if (reseed) initStores();
    return { success: true };
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

  function eventDuplicate(events, payload, skipId = null) {
    const title = String(payload.title || '').trim().toLowerCase();
    const location = String(payload.location || '').trim().toLowerCase();
    const dateTime = String(payload.dateTime || '').trim();

    return events.some((event) => {
      if (skipId !== null && String(event.id) === String(skipId)) return false;
      return String(event.title || '').trim().toLowerCase() === title
        && String(event.location || '').trim().toLowerCase() === location
        && String(event.dateTime || '').trim() === dateTime;
    });
  }

  async function getEvents() {
    const now = Date.now();

    return getRawEvents()
      .slice()
      .sort((a, b) => {
        const aTimestamp = a.eventTimestamp ?? null;
        const bTimestamp = b.eventTimestamp ?? null;
        const aUpcoming = aTimestamp !== null && aTimestamp >= now;
        const bUpcoming = bTimestamp !== null && bTimestamp >= now;

        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        if (aUpcoming && bUpcoming && aTimestamp !== bTimestamp) return aTimestamp - bTimestamp;
        if (!aUpcoming && !bUpcoming && aTimestamp !== bTimestamp) return (bTimestamp || 0) - (aTimestamp || 0);
        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
      })
      .map((event) => ({
        id: event.id,
        title: event.title,
        category: event.category,
        dateTime: event.dateTime,
        dateTimeLabel: formatEventDateTime(event.dateTime),
        location: event.location,
        cost: event.cost,
        accommodations: event.accommodations,
        dateAdded: event.dateAdded
      }));
  }

  async function addEvent(payload) {
    const events = getRawEvents();
    if (eventDuplicate(events, payload)) {
      return {
        success: false,
        message: 'An event with the same title, location, and date/time already exists.'
      };
    }

    events.push({
      id: `o_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: String(payload.title || '').trim(),
      category: String(payload.category || '').trim(),
      dateTime: String(payload.dateTime || '').trim(),
      eventTimestamp: getEventTimestamp(payload.dateTime),
      location: String(payload.location || '').trim(),
      cost: String(payload.cost || '').trim(),
      accommodations: String(payload.accommodations || '').trim(),
      createdAtMs: Date.now(),
      dateAdded: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    });

    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    return { success: true };
  }

  async function updateEvent(id, payload) {
    const events = getRawEvents();
    const idx = events.findIndex((event) => String(event.id) === String(id));
    if (idx === -1) return { success: false, message: 'Event not found.' };
    if (eventDuplicate(events, payload, id)) {
      return {
        success: false,
        message: 'An event with the same title, location, and date/time already exists.'
      };
    }

    events[idx] = {
      ...events[idx],
      title: String(payload.title || '').trim(),
      category: String(payload.category || '').trim(),
      dateTime: String(payload.dateTime || '').trim(),
      eventTimestamp: getEventTimestamp(payload.dateTime),
      location: String(payload.location || '').trim(),
      cost: String(payload.cost || '').trim(),
      accommodations: String(payload.accommodations || '').trim()
    };

    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    return { success: true };
  }

  async function removeEvent(id) {
    const events = getRawEvents();
    const filtered = events.filter((event) => String(event.id) !== String(id));
    if (filtered.length === events.length) {
      return { success: false, message: 'Event not found.' };
    }

    localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  initStores();

  return {
    getSession,
    login,
    requireAuth,
    logout,
    clearLocalData,
    getUsers,
    addUser,
    updateUser,
    removeUser,
    getParticipants,
    addParticipant,
    updateParticipant,
    removeParticipant,
    getEvents,
    addEvent,
    updateEvent,
    removeEvent
  };
})();
