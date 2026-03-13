/**
 * auth.js — Frontend-only auth/data module (localStorage)
 * Keeps API async so existing UI code continues to work.
 */
const Auth = (() => {
  const SESSION_KEY = 'kindred_session';
  const USERS_KEY = 'kindred_users';
  const PARTICIPANTS_KEY = 'kindred_participants';
  const VOLUNTEER_PROFILES_KEY = 'kindred_volunteer_profiles';
  // Keep the historical storage key so previously saved admin records still load.
  const EVENTS_KEY = 'kindred_opportunities';
  const EVENT_SIGNUPS_KEY = 'kindredSignups';
  const JOBS_KEY = 'kindred_jobs';
  const JOB_INTERESTS_KEY = 'kindred_job_interests';
  const NEWSLETTERS_KEY = 'kindred_newsletters';
  const NEWSLETTER_DRAFT_KEY = 'kindred_newsletter_draft';
  const NEWSLETTER_LOG_KEY = 'kindred_newsletter_log';

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
      name: 'Jane Wilde',
      email: 'janew@kindred.org',
      password: 'jane123',
      role: 'VOLUNTEER',
      dateAdded: 'Jan 1, 2025'
    }
  ];

  const SEED_JOBS = [
    {
      id: 'seed_j1',
      title: 'Café Assistant',
      employer: 'Harvest Café',
      location: 'Downtown, 120 Main St',
      jobType: 'Part-time',
      salary: '$16/hr',
      requirements: 'Friendly communication, ability to follow routines, and basic customer service support.',
      status: 'Open',
      createdAtMs: 1740000010000,
      dateAdded: 'Mar 3, 2026'
    },
    {
      id: 'seed_j2',
      title: 'Library Support Aide',
      employer: 'Whispering Hills Public Library',
      location: 'Main Branch',
      jobType: 'Casual',
      salary: '$14/hr',
      requirements: 'Organizing materials, shelving support, and helping with simple front-desk tasks.',
      status: 'Open',
      createdAtMs: 1740000011000,
      dateAdded: 'Mar 3, 2026'
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
    if (!localStorage.getItem(VOLUNTEER_PROFILES_KEY)) {
      localStorage.setItem(VOLUNTEER_PROFILES_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(EVENT_SIGNUPS_KEY)) {
      localStorage.setItem(EVENT_SIGNUPS_KEY, JSON.stringify([]));
    }
    const rawEvents = localStorage.getItem(EVENTS_KEY);
    const parsedEvents = rawEvents ? (() => { try { return JSON.parse(rawEvents); } catch { return []; } })() : null;
    if (!rawEvents || !Array.isArray(parsedEvents) || parsedEvents.length === 0) {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(SEED_EVENTS));
    }
    const rawJobs = localStorage.getItem(JOBS_KEY);
    const parsedJobs = rawJobs ? (() => { try { return JSON.parse(rawJobs); } catch { return []; } })() : null;
    if (!rawJobs || !Array.isArray(parsedJobs) || parsedJobs.length === 0) {
      localStorage.setItem(JOBS_KEY, JSON.stringify(SEED_JOBS));
    }
    if (!localStorage.getItem(JOB_INTERESTS_KEY)) {
      localStorage.setItem(JOB_INTERESTS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(NEWSLETTERS_KEY)) {
      localStorage.setItem(NEWSLETTERS_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(NEWSLETTER_LOG_KEY)) {
      localStorage.setItem(NEWSLETTER_LOG_KEY, JSON.stringify([]));
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

  function getRawJobs() {
    try {
      return JSON.parse(localStorage.getItem(JOBS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function getRawVolunteerProfiles() {
    try {
      return JSON.parse(localStorage.getItem(VOLUNTEER_PROFILES_KEY)) || [];
    } catch {
      return [];
    }
  }

  function getRawEventSignups() {
    try {
      return JSON.parse(localStorage.getItem(EVENT_SIGNUPS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function getRawJobInterests() {
    try {
      return JSON.parse(localStorage.getItem(JOB_INTERESTS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function getRawNewsletterLog() {
    try {
      return JSON.parse(localStorage.getItem(NEWSLETTER_LOG_KEY)) || [];
    } catch {
      return [];
    }
  }

  function getUserNameByEmail(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = getRawUsers().find((u) => String(u.email || '').trim().toLowerCase() === normalizedEmail);
    return user ? String(user.name || '').trim() : '';
  }

  function getRawNewsletters() {
    try {
      return JSON.parse(localStorage.getItem(NEWSLETTERS_KEY)) || [];
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

  function formatDateLabel(date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function getWeekStartDate(date = new Date()) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    const day = normalized.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    normalized.setDate(normalized.getDate() + diffToMonday);
    return normalized;
  }

  function buildNewsletterContent({ weekStart, participants, events, jobs }) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekLabel = `Week of ${formatDateLabel(weekStart)}`;
    const eventLines = events.length
      ? events.map((event) => `- ${event.title} (${event.dateTimeLabel}) at ${event.location}. ${event.cost}.`).join('\n')
      : '- No new community events are scheduled right now. Please check the dashboard for rolling updates.';
    const jobLines = jobs.length
      ? jobs.map((job) => `- ${job.title} at ${job.employer} in ${job.location || 'the local area'}${job.salary ? ` (${job.salary})` : ''}.`).join('\n')
      : '- No new job opportunities were added this week.';

    const participantCount = participants.length;
    const subject = `Kindred Weekly Newsletter | ${weekLabel}`;
    const preview = `${events.length} upcoming events and ${jobs.length} job opportunities for participants and families.`;
    const body = [
      `Hello Kindred participants and families,`,
      '',
      `Here is your weekly update for ${formatDateLabel(weekStart)} through ${formatDateLabel(weekEnd)}.`,
      '',
      `This week we are highlighting ${events.length} upcoming event${events.length === 1 ? '' : 's'} and ${jobs.length} employment opportunit${jobs.length === 1 ? 'y' : 'ies'} that may be a fit for our community.`,
      participantCount
        ? `Our current participant roster includes ${participantCount} registered participant${participantCount === 1 ? '' : 's'}, and this newsletter is intended to help each family quickly review the latest options.`
        : 'Participant records can be added by administrators at any time so future newsletters stay aligned with family needs.',
      '',
      'Upcoming events',
      eventLines,
      '',
      'Job opportunities',
      jobLines,
      '',
      'Next steps for families',
      '- Review the event accommodations and job requirements in the dashboard before registering interest.',
      '- Reach out to your Kindred coordinator if you need accessibility support or help deciding which opportunity is the best fit.',
      '',
      'Thank you,',
      'Kindred Administration'
    ].join('\n');

    return { weekLabel, subject, preview, body };
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
    localStorage.removeItem(VOLUNTEER_PROFILES_KEY);
    localStorage.removeItem(EVENTS_KEY);
    localStorage.removeItem(EVENT_SIGNUPS_KEY);
    localStorage.removeItem(JOBS_KEY);
    localStorage.removeItem(JOB_INTERESTS_KEY);
    localStorage.removeItem(NEWSLETTERS_KEY);
    localStorage.removeItem(NEWSLETTER_DRAFT_KEY);
    localStorage.removeItem(NEWSLETTER_LOG_KEY);
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

  async function getVolunteerProfile(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const profile = getRawVolunteerProfiles()
      .find((p) => String(p.email || '').trim().toLowerCase() === normalizedEmail);
    return profile || null;
  }

  async function getVolunteerProfiles() {
    return getRawVolunteerProfiles()
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .map((p) => {
        const firstName = String(p.firstName || '').trim();
        const lastName = String(p.lastName || '').trim();
        const fullName = `${firstName} ${lastName}`.trim() || p.email;
        const interests = Array.isArray(p.interests)
          ? p.interests.map((item) => String(item).trim()).filter(Boolean)
          : String(p.interests || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
        const updatedAt = Number(p.updatedAt) || 0;
        const updatedAtLabel = p.updatedAtLabel || (updatedAt
          ? new Date(updatedAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
          : 'N/A');
        return {
          firstName,
          lastName,
          fullName,
          phone: String(p.phone || '').trim(),
          email: String(p.email || '').trim().toLowerCase(),
          interests,
          availability: String(p.availability || '').trim(),
          updatedAt,
          updatedAtLabel
        };
      });
  }

  async function saveVolunteerProfile(payload) {
    const profiles = getRawVolunteerProfiles();
    const email = String(payload.email || '').trim().toLowerCase();
    if (!email) return { success: false, message: 'A volunteer email is required.' };

    const interests = Array.isArray(payload.interests)
      ? payload.interests.map((item) => String(item).trim()).filter(Boolean)
      : String(payload.interests || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    const record = {
      firstName: String(payload.firstName || '').trim(),
      lastName: String(payload.lastName || '').trim(),
      phone: String(payload.phone || '').trim(),
      email,
      interests,
      availability: String(payload.availability || '').trim(),
      updatedAt: Date.now(),
      updatedAtLabel: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    };

    const idx = profiles.findIndex((p) => String(p.email || '').trim().toLowerCase() === email);
    if (idx === -1) {
      profiles.push(record);
    } else {
      profiles[idx] = { ...profiles[idx], ...record };
    }

    localStorage.setItem(VOLUNTEER_PROFILES_KEY, JSON.stringify(profiles));
    return { success: true };
  }

  async function removeVolunteerProfile(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const profiles = getRawVolunteerProfiles();
    const filtered = profiles.filter((p) => String(p.email || '').trim().toLowerCase() !== normalizedEmail);
    if (filtered.length === profiles.length) {
      return { success: false, message: 'Volunteer profile not found.' };
    }
    localStorage.setItem(VOLUNTEER_PROFILES_KEY, JSON.stringify(filtered));
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

    // Keep event signup store consistent when an event is removed.
    const signups = getRawEventSignups();
    const cleanedSignups = signups.filter((entry) => String(entry.eventId || '') !== String(id));
    if (cleanedSignups.length !== signups.length) {
      localStorage.setItem(EVENT_SIGNUPS_KEY, JSON.stringify(cleanedSignups));
    }
    return { success: true };
  }

  // ── Event Interest Tracking ────────────────────────────────────────────────

  async function getInterestedEventIds(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return [];
    return getRawEventSignups()
      .filter((entry) => String(entry.email || '').trim().toLowerCase() === normalizedEmail)
      .map((entry) => String(entry.eventId || '').trim())
      .filter(Boolean);
  }

  async function saveEventInterest(eventId, eventTitle = '') {
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Please sign in to register interest.' };
    }

    const normalizedEmail = String(session.email || '').trim().toLowerCase();
    const normalizedEventId = String(eventId || '').trim();
    if (!normalizedEventId) return { success: false, message: 'Invalid event id.' };

    const events = getRawEvents();
    const exists = events.some((event) => String(event.id) === normalizedEventId);
    if (!exists) return { success: false, message: 'Event not found.' };

    const signups = getRawEventSignups();
    const duplicate = signups.some((entry) =>
      String(entry.email || '').trim().toLowerCase() === normalizedEmail
      && String(entry.eventId || '').trim() === normalizedEventId
    );
    if (duplicate) return { success: true, alreadySaved: true };

    signups.push({
      email: normalizedEmail,
      role: String(session.role || '').trim(),
      eventId: normalizedEventId,
      title: String(eventTitle || '').trim(),
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(EVENT_SIGNUPS_KEY, JSON.stringify(signups));
    return { success: true };
  }

  async function removeEventInterest(eventId, eventTitle = '') {
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Please sign in to update event interests.' };
    }

    const normalizedEmail = String(session.email || '').trim().toLowerCase();
    const normalizedEventId = String(eventId || '').trim();
    const normalizedEventTitle = String(eventTitle || '').trim().toLowerCase();

    const signups = getRawEventSignups();
    const filtered = signups.filter((entry) => {
      const sameEmail = String(entry.email || '').trim().toLowerCase() === normalizedEmail;
      if (!sameEmail) return true;

      const sameId = normalizedEventId && String(entry.eventId || '').trim() === normalizedEventId;
      const sameTitle = !normalizedEventId
        && normalizedEventTitle
        && String(entry.title || '').trim().toLowerCase() === normalizedEventTitle;
      return !(sameId || sameTitle);
    });

    if (filtered.length === signups.length) {
      return { success: false, message: 'This event is not in your saved list.' };
    }

    localStorage.setItem(EVENT_SIGNUPS_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  async function toggleEventInterest(eventId, eventTitle = '') {
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Please sign in to update event interests.' };
    }
    const interestedIds = await getInterestedEventIds(session.email);
    if (interestedIds.includes(String(eventId))) {
      return removeEventInterest(eventId, eventTitle);
    }
    return saveEventInterest(eventId, eventTitle);
  }

  // ── Job Opportunities ──────────────────────────────────────────────────────

  function jobDuplicate(jobs, payload, skipId = null) {
    const title = String(payload.title || '').trim().toLowerCase();
    const employer = String(payload.employer || '').trim().toLowerCase();
    return jobs.some((job) => {
      if (skipId !== null && String(job.id) === String(skipId)) return false;
      return String(job.title || '').trim().toLowerCase() === title
        && String(job.employer || '').trim().toLowerCase() === employer;
    });
  }

  async function getJobs() {
    return getRawJobs()
      .slice()
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      .map((job) => ({
        id: job.id,
        title: job.title,
        employer: job.employer,
        location: job.location,
        jobType: job.jobType,
        salary: job.salary,
        requirements: job.requirements,
        status: job.status || 'Open',
        dateAdded: job.dateAdded
      }));
  }

  async function addJob(payload) {
    const jobs = getRawJobs();
    if (jobDuplicate(jobs, payload)) {
      return {
        success: false,
        message: 'A job opportunity with the same title and employer already exists.'
      };
    }
    jobs.push({
      id: `j_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: String(payload.title || '').trim(),
      employer: String(payload.employer || '').trim(),
      location: String(payload.location || '').trim(),
      jobType: String(payload.jobType || '').trim(),
      salary: String(payload.salary || '').trim(),
      requirements: String(payload.requirements || '').trim(),
      status: String(payload.status || 'Open').trim() || 'Open',
      createdAtMs: Date.now(),
      dateAdded: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    });
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
    return { success: true };
  }

  async function updateJob(id, payload) {
    const jobs = getRawJobs();
    const idx = jobs.findIndex((job) => String(job.id) === String(id));
    if (idx === -1) return { success: false, message: 'Job opportunity not found.' };
    if (jobDuplicate(jobs, payload, id)) {
      return {
        success: false,
        message: 'A job opportunity with the same title and employer already exists.'
      };
    }
    jobs[idx] = {
      ...jobs[idx],
      title: String(payload.title || '').trim(),
      employer: String(payload.employer || '').trim(),
      location: String(payload.location || '').trim(),
      jobType: String(payload.jobType || '').trim(),
      salary: String(payload.salary || '').trim(),
      requirements: String(payload.requirements || '').trim(),
      status: String(payload.status || jobs[idx].status || 'Open').trim() || 'Open'
    };
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
    return { success: true };
  }

  async function removeJob(id) {
    const jobs = getRawJobs();
    const filtered = jobs.filter((job) => String(job.id) !== String(id));
    if (filtered.length === jobs.length) {
      return { success: false, message: 'Job opportunity not found.' };
    }
    localStorage.setItem(JOBS_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  // ── Weekly Newsletters ────────────────────────────────────────────────────

  async function getNewsletters() {
    return getRawNewsletters()
      .slice()
      .sort((a, b) => (b.generatedAtMs || 0) - (a.generatedAtMs || 0))
      .map((newsletter) => ({
        id: newsletter.id,
        weekKey: newsletter.weekKey || newsletter.weekOf,
        weekOf: newsletter.weekOf,
        subject: newsletter.subject,
        preview: newsletter.preview,
        body: newsletter.body,
        audience: newsletter.audience,
        generatedAtLabel: newsletter.generatedAtLabel,
        generatedAtMs: newsletter.generatedAtMs,
        eventCount: newsletter.eventCount || 0,
        jobCount: newsletter.jobCount || 0
      }));
  }

  async function generateWeeklyNewsletter() {
    const newsletters = getRawNewsletters();
    const participants = await getParticipants();
    const allEvents = await getEvents();
    const allJobs = await getJobs();
    const now = Date.now();
    const upcomingEvents = allEvents
      .filter((event) => {
        const timestamp = getEventTimestamp(event.dateTime);
        return timestamp !== null && timestamp >= now;
      })
      .slice(0, 3);
    const highlightedJobs = allJobs.slice(0, 3);
    const weekStart = getWeekStartDate(new Date());
    const weekKey = `week_${weekStart.toISOString().slice(0, 10)}`;
    const content = buildNewsletterContent({
      weekStart,
      participants,
      events: upcomingEvents,
      jobs: highlightedJobs
    });

    const record = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      weekKey,
      weekOf: content.weekLabel,
      subject: content.subject,
      preview: content.preview,
      body: content.body,
      audience: 'Participants and families',
      eventCount: upcomingEvents.length,
      jobCount: highlightedJobs.length,
      generatedAtMs: Date.now(),
      generatedAtLabel: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    };

    const existingIdx = newsletters.findIndex((newsletter) => (newsletter.weekKey || newsletter.weekOf) === weekKey);
    if (existingIdx >= 0) {
      newsletters[existingIdx] = {
        ...newsletters[existingIdx],
        ...record,
        id: newsletters[existingIdx].id
      };
    } else {
      newsletters.push(record);
    }

    localStorage.setItem(NEWSLETTERS_KEY, JSON.stringify(newsletters));
    return { success: true, newsletter: existingIdx >= 0 ? newsletters[existingIdx] : record, updated: existingIdx >= 0 };
  }

  // ── Participant Job Interest Tracking ─────────────────────────────────────

  async function getInterestedJobIds(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return [];
    return getRawJobInterests()
      .filter((entry) => String(entry.email || '').trim().toLowerCase() === normalizedEmail)
      .map((entry) => String(entry.jobId));
  }

  async function saveJobInterest(jobId) {
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Please sign in to register interest.' };
    }
    if (session.role !== 'PARTICIPANT') {
      return { success: false, message: 'Only participants can register job interest.' };
    }

    const normalizedEmail = String(session.email || '').trim().toLowerCase();
    const normalizedJobId = String(jobId || '').trim();
    if (!normalizedJobId) return { success: false, message: 'Invalid job id.' };

    const jobs = getRawJobs();
    const exists = jobs.some((job) => String(job.id) === normalizedJobId);
    if (!exists) return { success: false, message: 'Job opportunity not found.' };

    const interests = getRawJobInterests();
    const duplicate = interests.some((entry) =>
      String(entry.email || '').trim().toLowerCase() === normalizedEmail
      && String(entry.jobId) === normalizedJobId
    );
    if (duplicate) return { success: true, alreadySaved: true };

    interests.push({
      email: normalizedEmail,
      jobId: normalizedJobId,
      createdAtMs: Date.now()
    });
    localStorage.setItem(JOB_INTERESTS_KEY, JSON.stringify(interests));
    return { success: true };
  }

  async function removeJobInterest(jobId) {
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Please sign in to update job interests.' };
    }
    if (session.role !== 'PARTICIPANT') {
      return { success: false, message: 'Only participants can update job interests.' };
    }

    const normalizedEmail = String(session.email || '').trim().toLowerCase();
    const normalizedJobId = String(jobId || '').trim();
    if (!normalizedJobId) return { success: false, message: 'Invalid job id.' };

    const interests = getRawJobInterests();
    const filtered = interests.filter((entry) => !(
      String(entry.email || '').trim().toLowerCase() === normalizedEmail
      && String(entry.jobId) === normalizedJobId
    ));

    if (filtered.length === interests.length) {
      return { success: false, message: 'This job is not in your saved list.' };
    }

    localStorage.setItem(JOB_INTERESTS_KEY, JSON.stringify(filtered));
    return { success: true };
  }

  async function toggleJobInterest(jobId) {
    const session = await getSession();
    if (!session) {
      return { success: false, message: 'Please sign in to update job interests.' };
    }
    if (session.role !== 'PARTICIPANT') {
      return { success: false, message: 'Only participants can update job interests.' };
    }
    const interestedIds = await getInterestedJobIds(session.email);
    if (interestedIds.includes(String(jobId))) {
      return removeJobInterest(jobId);
    }
    return saveJobInterest(jobId);
  }

  async function getJobInterestSummary() {
    const interests = getRawJobInterests();
    const grouped = {};

    interests.forEach((entry) => {
      const email = String(entry.email || '').trim().toLowerCase();
      const jobId = String(entry.jobId || '').trim();
      if (!email || !jobId) return;

      if (!grouped[jobId]) grouped[jobId] = [];

      const alreadyAdded = grouped[jobId].some((item) => item.email === email);
      if (alreadyAdded) return;

      const displayName = getUserNameByEmail(email) || email;
      grouped[jobId].push({
        name: displayName,
        email
      });
    });

    return grouped;
  }

  // ── Weekly Newsletter Tracking (Req 601 simulation) ───────────────────────

  async function getNewsletterDraft() {
    try {
      return JSON.parse(localStorage.getItem(NEWSLETTER_DRAFT_KEY)) || null;
    } catch {
      return null;
    }
  }

  async function saveNewsletterDraft(payload) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, message: 'Only administrators can save newsletter drafts.' };
    }

    const draft = {
      subject: String(payload.subject || '').trim(),
      eventHighlights: String(payload.eventHighlights || '').trim(),
      updates: String(payload.updates || '').trim(),
      recipients: Array.isArray(payload.recipients) ? payload.recipients : [],
      updatedAtMs: Date.now(),
      updatedAtLabel: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    };

    localStorage.setItem(NEWSLETTER_DRAFT_KEY, JSON.stringify(draft));
    return { success: true };
  }

  async function getNewsletterHistory() {
    return getRawNewsletterLog()
      .slice()
      .sort((a, b) => (b.sentAtMs || 0) - (a.sentAtMs || 0));
  }

  async function distributeNewsletter(payload) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, message: 'Only administrators can distribute newsletters.' };
    }

    const subject = String(payload.subject || '').trim();
    const eventHighlights = String(payload.eventHighlights || '').trim();
    const updates = String(payload.updates || '').trim();
    const recipients = Array.isArray(payload.recipients)
      ? payload.recipients.map((r) => String(r || '').trim().toLowerCase()).filter(Boolean)
      : [];

    if (!subject || (!eventHighlights && !updates)) {
      return { success: false, message: 'Provide a subject and newsletter content before distributing.' };
    }
    if (recipients.length === 0) {
      return { success: false, message: 'Select at least one recipient before distributing.' };
    }

    const users = getRawUsers();
    const registeredRecipientCount = recipients.filter((email) =>
      users.some((u) => String(u.email || '').trim().toLowerCase() === email)
    ).length;

    if (registeredRecipientCount === 0) {
      return { success: false, message: 'No valid recipients selected. Please retry.' };
    }

    const log = getRawNewsletterLog();
    const entry = {
      id: `nl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      subject,
      eventHighlights,
      updates,
      recipients,
      recipientCount: registeredRecipientCount,
      sentAtMs: Date.now(),
      sentAtLabel: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    };
    log.push(entry);
    localStorage.setItem(NEWSLETTER_LOG_KEY, JSON.stringify(log));
    localStorage.removeItem(NEWSLETTER_DRAFT_KEY);
    return { success: true, recipientCount: registeredRecipientCount };
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
    getVolunteerProfile,
    getVolunteerProfiles,
    saveVolunteerProfile,
    removeVolunteerProfile,
    getEvents,
    addEvent,
    updateEvent,
    removeEvent,
    getInterestedEventIds,
    saveEventInterest,
    removeEventInterest,
    toggleEventInterest,
    getJobs,
    addJob,
    updateJob,
    removeJob,
    getNewsletters,
    generateWeeklyNewsletter,
    getInterestedJobIds,
    saveJobInterest,
    removeJobInterest,
    toggleJobInterest,
    getJobInterestSummary,
    getNewsletterDraft,
    saveNewsletterDraft,
    getNewsletterHistory,
    distributeNewsletter
  };
})();
