/**
 * auth.js — Frontend-only auth/data module (localStorage)
 * Implements linked identities for administrators, guardians, participants,
 * and volunteers. The API remains async so existing UI code can await calls.
 */
const Auth = (() => {
  const SESSION_KEY = 'kindred_session';
  const USERS_KEY = 'kindred_users';
  const PARTICIPANTS_KEY = 'kindred_participants';
  const VOLUNTEER_PROFILES_KEY = 'kindred_volunteer_profiles';
  const EVENTS_KEY = 'kindred_opportunities';
  const EVENT_SIGNUPS_KEY = 'kindredSignups';
  const JOBS_KEY = 'kindred_jobs';
  const JOB_INTERESTS_KEY = 'kindred_job_interests';
  const APPROVALS_KEY = 'kindred_approvals';
  const NEWSLETTERS_KEY = 'kindred_newsletters';
  const NEWSLETTER_DRAFT_KEY = 'kindred_newsletter_draft';
  const NEWSLETTER_LOG_KEY = 'kindred_newsletter_log';
  const BG_CHECK_KEY = 'kindred_bg_checks';
  const URGENT_NOTIFICATIONS_KEY = 'kindred_urgent_notifications';
  const AUDIT_LOG_KEY = 'kindred_audit_log';
  const INQUIRIES_KEY = 'kindred_inquiries';
  const TASKS_KEY = 'kindred_tasks';

  const BG_CHECK_STATUSES = ['Not Started', 'Pending', 'Cleared', 'Denied', 'Expired', 'Revoked'];

  const ROLES = ['ADMIN', 'GUARDIAN', 'PARTICIPANT', 'VOLUNTEER'];
  const SELF_SERVICE_PARTICIPANT_FIELDS = ['participantInterests', 'jobGoals'];

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
      accommodations: 'All ages welcome. Screen reader-compatible materials and audio books available. Sensory-friendly lighting maintained throughout.',
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

  const SEED_JOBS = [
    {
      id: 'seed_j1',
      title: 'Cafe Assistant',
      employer: 'Harvest Cafe',
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

  const SEED_USERS = [
    {
      id: 'seed_u_admin',
      name: 'Lisa Williams',
      email: 'lisawilliams@kindred.org',
      password: 'lisa123',
      role: 'ADMIN',
      dateAdded: 'Jan 1, 2025'
    },
    {
      id: 'seed_u_guardian',
      name: 'Grace Williams',
      email: 'grace.guardian@kindred.org',
      password: 'grace123',
      role: 'GUARDIAN',
      dateAdded: 'Jan 1, 2025'
    },
    {
      id: 'seed_u_participant',
      name: 'April Williams',
      email: 'april@email.com',
      password: 'april123',
      role: 'PARTICIPANT',
      dateAdded: 'Jan 1, 2025'
    },
    {
      id: 'seed_u_volunteer',
      name: 'Jane Wilde',
      email: 'janew@kindred.org',
      password: 'jane123',
      role: 'VOLUNTEER',
      dateAdded: 'Jan 1, 2025'
    }
  ];

  const SEED_PARTICIPANTS = [
    {
      id: 'seed_p1',
      participantUserId: 'seed_u_participant',
      guardianUserIds: ['seed_u_guardian'],
      firstName: 'April',
      lastName: 'Williams',
      age: 17,
      contactEmail: 'grace.guardian@kindred.org',
      contactPhone: '(555) 555-0180',
      specialNeeds: 'Prefers small-group settings and step-by-step instructions.',
      medicalNotes: 'Carries an inhaler during extended activity.',
      sensoryNotes: 'Benefits from reduced-noise spaces and clear transitions.',
      guardianNotes: 'Interested in vocational workshops and community-based programs.',
      participantInterests: ['Art', 'Cooking', 'Library programs'],
      jobGoals: 'Would like part-time work with structured routines and supportive coaching.',
      createdAtMs: 1735689600000,
      dateAdded: 'Jan 1, 2025'
    }
  ];

  const SEED_VOLUNTEER_PROFILES = [
    {
      userId: 'seed_u_volunteer',
      firstName: 'Jane',
      lastName: 'Wilde',
      phone: '(555) 555-0199',
      email: 'janew@kindred.org',
      interests: ['Mentoring', 'Community Events'],
      availability: 'Weeknights after 6 PM, Saturday mornings',
      backgroundCheckStatus: 'Not Started',
      updatedAt: 1735689600000,
      updatedAtLabel: 'Jan 1, 2025, 12:00 AM'
    }
  ];

  function makeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function splitName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  function formatDateLabel(date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
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

  function getWeekStartDate(date = new Date()) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    const day = normalized.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    normalized.setDate(normalized.getDate() + diffToMonday);
    return normalized;
  }

  function parseJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : (parsed ?? fallback);
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getRawUsers() {
    return parseJson(USERS_KEY, []);
  }

  function getRawParticipants() {
    return parseJson(PARTICIPANTS_KEY, []);
  }

  function getRawVolunteerProfiles() {
    return parseJson(VOLUNTEER_PROFILES_KEY, []);
  }

  function getRawEvents() {
    return parseJson(EVENTS_KEY, []);
  }

  function getRawEventSignups() {
    return parseJson(EVENT_SIGNUPS_KEY, []);
  }

  function getRawJobs() {
    return parseJson(JOBS_KEY, []);
  }

  function getRawJobInterests() {
    return parseJson(JOB_INTERESTS_KEY, []);
  }

  function getRawApprovals() {
    return parseJson(APPROVALS_KEY, []);
  }

  function getRawNewsletters() {
    return parseJson(NEWSLETTERS_KEY, []);
  }

  function getRawNewsletterLog() {
    return parseJson(NEWSLETTER_LOG_KEY, []);
  }

  function getRawBgChecks() {
    return parseJson(BG_CHECK_KEY, []);
  }

  function getRawUrgentNotifications() {
    return parseJson(URGENT_NOTIFICATIONS_KEY, []);
  }

  function getRawAuditLog() {
    return parseJson(AUDIT_LOG_KEY, []);
  }

  function getRawInquiries() {
    return parseJson(INQUIRIES_KEY, []);
  }

  function getRawTasks() {
    return parseJson(TASKS_KEY, []);
  }

  function normalizeRole(role, fallback = 'PARTICIPANT') {
    const upper = String(role || '').trim().toUpperCase();
    if (upper === 'PARTICIPANT / GUARDIAN') return 'GUARDIAN';
    return ROLES.includes(upper) ? upper : fallback;
  }

  function normalizeUser(user) {
    const normalizedEmail = normalizeEmail(user.email);
    const name = String(user.name || '').trim();
    const role = normalizeRole(user.role);
    const dateAdded = user.dateAdded || formatDateLabel(new Date());
    return {
      id: String(user.id || makeId('u')),
      name,
      email: normalizedEmail,
      password: String(user.password || ''),
      role,
      dateAdded
    };
  }

  function mergeSeedUsers(users) {
    const byEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
    SEED_USERS.forEach((seed) => {
      const email = normalizeEmail(seed.email);
      if (!byEmail.has(email)) {
        users.push({ ...seed });
      } else {
        const existing = byEmail.get(email);
        if (!existing.id) existing.id = seed.id;
      }
    });
    return users;
  }

  function normalizeUsers(users) {
    const normalized = users
      .map(normalizeUser)
      .filter((user, index, all) => user.email && all.findIndex((candidate) => candidate.email === user.email) === index);
    return mergeSeedUsers(normalized);
  }

  function normalizeParticipantInterests(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeParticipants(participants, users) {
    const participantUsers = users.filter((user) => user.role === 'PARTICIPANT');
    const guardianUsers = users.filter((user) => user.role === 'GUARDIAN');
    const usersByEmail = new Map(users.map((user) => [user.email, user]));

    const normalized = participants.map((participant) => {
      const parts = splitName(participant.name || `${participant.firstName || ''} ${participant.lastName || ''}`.trim());
      const participantEmail = normalizeEmail(participant.participantEmail);
      const legacyContactEmail = normalizeEmail(participant.contactEmail);
      const legacyGuardianEmail = normalizeEmail(participant.guardianEmail || participant.contactEmail);
      const linkedParticipantUser = participant.participantUserId
        ? users.find((user) => String(user.id) === String(participant.participantUserId))
        : (participantEmail && usersByEmail.get(participantEmail))
            || participantUsers.find((user) => user.name.toLowerCase() === `${parts.firstName} ${parts.lastName}`.trim().toLowerCase());
      const guardianIds = Array.isArray(participant.guardianUserIds) ? participant.guardianUserIds : [];
      const legacyGuardianUser = legacyGuardianEmail ? usersByEmail.get(legacyGuardianEmail) : null;
      const selectedGuardianIds = guardianIds
        .map((id) => String(id))
        .filter((id) => guardianUsers.some((user) => String(user.id) === id));
      if (!selectedGuardianIds.length && legacyGuardianUser?.role === 'GUARDIAN') {
        selectedGuardianIds.push(String(legacyGuardianUser.id));
      }

      return {
        id: String(participant.id || makeId('p')),
        participantUserId: linkedParticipantUser ? String(linkedParticipantUser.id) : '',
        guardianUserIds: selectedGuardianIds,
        firstName: String(participant.firstName || parts.firstName || '').trim(),
        lastName: String(participant.lastName || parts.lastName || '').trim(),
        age: Number(participant.age) || '',
        contactEmail: legacyContactEmail,
        contactPhone: String(participant.contactPhone || '').trim(),
        specialNeeds: String(participant.specialNeeds || '').trim(),
        medicalNotes: String(participant.medicalNotes || participant.notes || '').trim(),
        sensoryNotes: String(participant.sensoryNotes || '').trim(),
        guardianNotes: String(participant.guardianNotes || '').trim(),
        participantInterests: normalizeParticipantInterests(participant.participantInterests),
        jobGoals: String(participant.jobGoals || '').trim(),
        createdAtMs: Number(participant.createdAtMs) || Date.now(),
        dateAdded: participant.dateAdded || formatDateLabel(new Date())
      };
    });

    const validParticipantIds = new Set(participantUsers.map((user) => String(user.id)));
    const result = normalized.filter((participant) => participant.participantUserId && validParticipantIds.has(String(participant.participantUserId)));

    if (!result.length && SEED_PARTICIPANTS.length) {
      return SEED_PARTICIPANTS
        .filter((participant) => users.some((user) => String(user.id) === String(participant.participantUserId)))
        .map((participant) => ({ ...participant }));
    }

    return result;
  }

  function normalizeVolunteerProfiles(profiles, users) {
    const volunteerUsers = users.filter((user) => user.role === 'VOLUNTEER');
    const usersByEmail = new Map(users.map((user) => [user.email, user]));

    const result = profiles
      .map((profile) => {
        const email = normalizeEmail(profile.email);
        const linkedUser = profile.userId
          ? volunteerUsers.find((user) => String(user.id) === String(profile.userId))
          : usersByEmail.get(email);
        if (!linkedUser || linkedUser.role !== 'VOLUNTEER') return null;
        return {
          userId: String(linkedUser.id),
          firstName: String(profile.firstName || splitName(linkedUser.name).firstName || '').trim(),
          lastName: String(profile.lastName || splitName(linkedUser.name).lastName || '').trim(),
          phone: String(profile.phone || '').trim(),
          email: linkedUser.email,
          interests: normalizeParticipantInterests(profile.interests),
          availability: String(profile.availability || '').trim(),
          backgroundCheckStatus: String(profile.backgroundCheckStatus || 'Not Started').trim() || 'Not Started',
          updatedAt: Number(profile.updatedAt) || Date.now(),
          updatedAtLabel: profile.updatedAtLabel || new Date(Number(profile.updatedAt) || Date.now()).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })
        };
      })
      .filter(Boolean);

    if (!result.length && SEED_VOLUNTEER_PROFILES.length) {
      return SEED_VOLUNTEER_PROFILES
        .filter((profile) => volunteerUsers.some((user) => String(user.id) === String(profile.userId)))
        .map((profile) => ({ ...profile }));
    }

    return result;
  }

  function normalizeEventSignups(signups, participants, users) {
    const participantsById = new Map(participants.map((participant) => [String(participant.id), participant]));
    const participantByEmail = new Map(
      participants
        .map((participant) => {
          const user = users.find((candidate) => String(candidate.id) === String(participant.participantUserId));
          return user ? [user.email, participant] : null;
        })
        .filter(Boolean)
    );

    return signups
      .map((entry) => {
        const email = normalizeEmail(entry.email);
        const participant = entry.participantId
          ? participantsById.get(String(entry.participantId))
          : participantByEmail.get(email);
        if (!participant) return null;
        return {
          id: String(entry.id || makeId('es')),
          participantId: String(participant.id),
          eventId: String(entry.eventId || '').trim(),
          title: String(entry.title || '').trim(),
          createdByUserId: String(entry.createdByUserId || participant.participantUserId),
          createdByRole: normalizeRole(entry.createdByRole || entry.role || 'PARTICIPANT'),
          timestamp: String(entry.timestamp || new Date().toISOString())
        };
      })
      .filter((entry) => entry && entry.eventId);
  }

  function normalizeJobInterests(interests, participants, users) {
    const participantsById = new Map(participants.map((participant) => [String(participant.id), participant]));
    const participantByEmail = new Map(
      participants
        .map((participant) => {
          const user = users.find((candidate) => String(candidate.id) === String(participant.participantUserId));
          return user ? [user.email, participant] : null;
        })
        .filter(Boolean)
    );

    return interests
      .map((entry) => {
        const participant = entry.participantId
          ? participantsById.get(String(entry.participantId))
          : participantByEmail.get(normalizeEmail(entry.email));
        if (!participant) return null;
        return {
          id: String(entry.id || makeId('ji')),
          participantId: String(participant.id),
          participantUserId: String(participant.participantUserId),
          guardianUserIds: Array.isArray(participant.guardianUserIds) ? participant.guardianUserIds.map(String) : [],
          jobId: String(entry.jobId || '').trim(),
          status: 'APPROVED',
          requestedByRole: normalizeRole(entry.requestedByRole || 'PARTICIPANT'),
          requestedByUserId: String(entry.requestedByUserId || participant.participantUserId),
          approvedByUserId: String(entry.approvedByUserId || entry.requestedByUserId || participant.participantUserId),
          createdAtMs: Number(entry.createdAtMs) || Date.now(),
          approvedAtMs: Number(entry.approvedAtMs) || Number(entry.createdAtMs) || Date.now()
        };
      })
      .filter((entry) => entry && entry.jobId);
  }

  function normalizeApprovals(approvals, participants) {
    const participantsById = new Map(participants.map((participant) => [String(participant.id), participant]));
    return approvals
      .map((approval) => {
        const participant = participantsById.get(String(approval.participantId || ''));
        if (!participant) return null;
        return {
          id: String(approval.id || makeId('ap')),
          type: approval.type || 'JOB_INTEREST',
          participantId: String(participant.id),
          participantUserId: String(participant.participantUserId),
          guardianUserIds: Array.isArray(approval.guardianUserIds) && approval.guardianUserIds.length
            ? approval.guardianUserIds.map(String)
            : participant.guardianUserIds.map(String),
          jobId: String(approval.jobId || '').trim(),
          requestedByUserId: String(approval.requestedByUserId || participant.participantUserId),
          requestedByRole: normalizeRole(approval.requestedByRole || 'PARTICIPANT'),
          status: ['PENDING', 'APPROVED', 'REJECTED'].includes(String(approval.status || '').toUpperCase())
            ? String(approval.status).toUpperCase()
            : 'PENDING',
          createdAtMs: Number(approval.createdAtMs) || Date.now(),
          resolvedAtMs: approval.resolvedAtMs ? Number(approval.resolvedAtMs) : null,
          resolvedByUserId: approval.resolvedByUserId ? String(approval.resolvedByUserId) : '',
          notes: String(approval.notes || '').trim()
        };
      })
      .filter((approval) => approval && approval.jobId);
  }

  function initStores() {
    const normalizedUsers = normalizeUsers(getRawUsers());
    setJson(USERS_KEY, normalizedUsers);

    const normalizedParticipants = normalizeParticipants(getRawParticipants(), normalizedUsers);
    setJson(PARTICIPANTS_KEY, normalizedParticipants);

    const normalizedVolunteerProfiles = normalizeVolunteerProfiles(getRawVolunteerProfiles(), normalizedUsers);
    setJson(VOLUNTEER_PROFILES_KEY, normalizedVolunteerProfiles);

    const events = getRawEvents();
    if (!events.length) setJson(EVENTS_KEY, SEED_EVENTS);

    const jobs = getRawJobs();
    if (!jobs.length) setJson(JOBS_KEY, SEED_JOBS);

    setJson(EVENT_SIGNUPS_KEY, normalizeEventSignups(getRawEventSignups(), normalizedParticipants, normalizedUsers));
    setJson(JOB_INTERESTS_KEY, normalizeJobInterests(getRawJobInterests(), normalizedParticipants, normalizedUsers));
    setJson(APPROVALS_KEY, normalizeApprovals(getRawApprovals(), normalizedParticipants));

    if (!localStorage.getItem(NEWSLETTERS_KEY)) setJson(NEWSLETTERS_KEY, []);
    if (!localStorage.getItem(NEWSLETTER_LOG_KEY)) setJson(NEWSLETTER_LOG_KEY, []);
    if (!localStorage.getItem(BG_CHECK_KEY)) setJson(BG_CHECK_KEY, []);
    if (!localStorage.getItem(URGENT_NOTIFICATIONS_KEY)) setJson(URGENT_NOTIFICATIONS_KEY, []);
    if (!localStorage.getItem(AUDIT_LOG_KEY)) setJson(AUDIT_LOG_KEY, []);
    if (!localStorage.getItem(INQUIRIES_KEY)) setJson(INQUIRIES_KEY, []);
    if (!localStorage.getItem(TASKS_KEY)) setJson(TASKS_KEY, []);
  }

  function getUserByIdInternal(userId) {
    return getRawUsers().find((user) => String(user.id) === String(userId)) || null;
  }

  function getUserByEmailInternal(email) {
    return getRawUsers().find((user) => user.email === normalizeEmail(email)) || null;
  }

  function getParticipantByIdInternal(participantId) {
    return getRawParticipants().find((participant) => String(participant.id) === String(participantId)) || null;
  }

  function getVolunteerProfileByUserIdInternal(userId) {
    return getRawVolunteerProfiles().find((profile) => String(profile.userId) === String(userId)) || null;
  }

  function getParticipantRecordByUserIdInternal(userId) {
    return getRawParticipants().find((participant) => String(participant.participantUserId) === String(userId)) || null;
  }

  function getLinkedParticipantsForGuardianUserIdInternal(userId) {
    return getRawParticipants().filter((participant) => (participant.guardianUserIds || []).map(String).includes(String(userId)));
  }

  function participantDisplayName(participant) {
    return `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
  }

  function decorateParticipant(participant) {
    const participantUser = getUserByIdInternal(participant.participantUserId);
    const guardians = (participant.guardianUserIds || [])
      .map((guardianId) => getUserByIdInternal(guardianId))
      .filter(Boolean);
    const approvedJobCount = getRawJobInterests().filter((interest) => String(interest.participantId) === String(participant.id)).length;
    const pendingApprovalCount = getRawApprovals().filter((approval) =>
      String(approval.participantId) === String(participant.id) && approval.status === 'PENDING'
    ).length;
    const eventCount = getRawEventSignups().filter((entry) => String(entry.participantId) === String(participant.id)).length;

    return {
      ...participant,
      fullName: participantDisplayName(participant),
      participantUser,
      guardians,
      guardianNames: guardians.map((guardian) => guardian.name),
      approvedJobCount,
      pendingApprovalCount,
      subscribedEventCount: eventCount
    };
  }

  async function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || !session.userId || !session.role) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      const user = getUserByIdInternal(session.userId);
      if (!user) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  async function login(email, password) {
    const user = getRawUsers().find((candidate) => candidate.email === normalizeEmail(email) && candidate.password === String(password || ''));
    if (!user) {
      return { success: false, message: 'Invalid email or password. Please try again.' };
    }
    const session = { userId: user.id, name: user.name, email: user.email, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, user: session };
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
    [
      SESSION_KEY,
      USERS_KEY,
      PARTICIPANTS_KEY,
      VOLUNTEER_PROFILES_KEY,
      EVENTS_KEY,
      EVENT_SIGNUPS_KEY,
      JOBS_KEY,
      JOB_INTERESTS_KEY,
      APPROVALS_KEY,
      NEWSLETTERS_KEY,
      NEWSLETTER_DRAFT_KEY,
      NEWSLETTER_LOG_KEY,
      BG_CHECK_KEY,
      URGENT_NOTIFICATIONS_KEY,
      AUDIT_LOG_KEY,
      INQUIRIES_KEY,
      TASKS_KEY
    ].forEach((key) => localStorage.removeItem(key));
    if (reseed) initStores();
    return { success: true };
  }

  function requireRole(session, roles) {
    return session && roles.includes(session.role);
  }

  async function getUsers() {
    return getRawUsers().map(({ id, name, email, role, dateAdded }) => ({
      id,
      name,
      email,
      role: normalizeRole(role),
      dateAdded
    }));
  }

  async function getUserById(userId) {
    const user = getUserByIdInternal(userId);
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  }

  function syncParticipantUserLink(userId, participantId) {
    if (!participantId) return { success: true };
    const user = getUserByIdInternal(userId);
    if (!user || user.role !== 'PARTICIPANT') {
      return { success: false, message: 'Only participant users can link to participant records.' };
    }
    const participants = getRawParticipants();
    const targetIdx = participants.findIndex((participant) => String(participant.id) === String(participantId));
    if (targetIdx === -1) {
      return { success: false, message: 'Participant record not found for linking.' };
    }
    const conflicting = participants.find((participant, index) =>
      index !== targetIdx && String(participant.participantUserId) === String(userId)
    );
    if (conflicting) {
      return { success: false, message: 'That participant login is already linked to another participant record.' };
    }
    participants[targetIdx] = {
      ...participants[targetIdx],
      participantUserId: String(userId)
    };
    setJson(PARTICIPANTS_KEY, participants);
    return { success: true };
  }

  function syncVolunteerUserLink(userId, volunteerProfileId) {
    if (!volunteerProfileId) return { success: true };
    const user = getUserByIdInternal(userId);
    if (!user || user.role !== 'VOLUNTEER') {
      return { success: false, message: 'Only volunteer users can link to volunteer profiles.' };
    }
    const profiles = getRawVolunteerProfiles();
    const targetIdx = profiles.findIndex((profile) => String(profile.userId) === String(volunteerProfileId) || normalizeEmail(profile.email) === normalizeEmail(volunteerProfileId));
    if (targetIdx === -1) {
      return { success: false, message: 'Volunteer profile not found for linking.' };
    }
    const conflicting = profiles.find((profile, index) =>
      index !== targetIdx && String(profile.userId) === String(userId)
    );
    if (conflicting) {
      return { success: false, message: 'That volunteer login is already linked to another volunteer profile.' };
    }
    profiles[targetIdx] = {
      ...profiles[targetIdx],
      userId: String(userId),
      email: user.email
    };
    setJson(VOLUNTEER_PROFILES_KEY, profiles);
    return { success: true };
  }

  async function addUser(user) {
    const users = getRawUsers();
    const email = normalizeEmail(user.email);
    if (!email) return { success: false, message: 'Email is required.' };
    if (users.some((candidate) => candidate.email === email)) {
      return { success: false, message: `An account for ${email} already exists.` };
    }
    const role = normalizeRole(user.role);
    if (!ROLES.includes(role)) return { success: false, message: 'Invalid role.' };
    const newUser = {
      id: makeId('u'),
      name: String(user.name || '').trim(),
      email,
      password: String(user.password || ''),
      role,
      dateAdded: formatDateLabel(new Date())
    };
    users.push(newUser);
    setJson(USERS_KEY, users);

    const participantLinkResult = syncParticipantUserLink(newUser.id, user.linkParticipantId);
    if (!participantLinkResult.success) {
      setJson(USERS_KEY, getRawUsers().filter((candidate) => candidate.id !== newUser.id));
      return participantLinkResult;
    }

    const volunteerLinkResult = syncVolunteerUserLink(newUser.id, user.linkVolunteerProfileId);
    if (!volunteerLinkResult.success) {
      setJson(USERS_KEY, getRawUsers().filter((candidate) => candidate.id !== newUser.id));
      return volunteerLinkResult;
    }

    return {
      success: true,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    };
  }

  async function updateUser(originalEmail, payload) {
    const users = getRawUsers();
    const idx = users.findIndex((user) => user.email === normalizeEmail(originalEmail));
    if (idx === -1) return { success: false, message: 'User not found.' };
    if (users[idx].role === 'ADMIN') {
      return { success: false, message: 'Administrator accounts cannot be edited here.' };
    }
    const nextEmail = normalizeEmail(payload.email);
    if (users.some((user, index) => index !== idx && user.email === nextEmail)) {
      return { success: false, message: `An account for ${nextEmail} already exists.` };
    }
    const nextRole = normalizeRole(payload.role, users[idx].role);
    if (getParticipantRecordByUserIdInternal(users[idx].id) && nextRole !== 'PARTICIPANT') {
      return { success: false, message: 'This user is linked to a participant record and must remain a Participant.' };
    }
    if (getVolunteerProfileByUserIdInternal(users[idx].id) && nextRole !== 'VOLUNTEER') {
      return { success: false, message: 'This user is linked to a volunteer profile and must remain a Volunteer.' };
    }
    users[idx].name = String(payload.name || '').trim();
    users[idx].email = nextEmail;
    users[idx].role = nextRole;
    if (String(payload.password || '').trim()) users[idx].password = String(payload.password);
    setJson(USERS_KEY, users);
    initStores();
    const updatedUser = getRawUsers().find((user) => String(user.id) === String(users[idx].id));
    const participantLinkResult = syncParticipantUserLink(updatedUser.id, payload.linkParticipantId);
    if (!participantLinkResult.success) return participantLinkResult;
    const volunteerLinkResult = syncVolunteerUserLink(updatedUser.id, payload.linkVolunteerProfileId);
    if (!volunteerLinkResult.success) return volunteerLinkResult;
    return { success: true };
  }

  function userHasLinkedData(userId) {
    const participants = getRawParticipants();
    const volunteerProfiles = getRawVolunteerProfiles();
    return participants.some((participant) =>
      String(participant.participantUserId) === String(userId)
      || (participant.guardianUserIds || []).map(String).includes(String(userId))
    ) || volunteerProfiles.some((profile) => String(profile.userId) === String(userId));
  }

  async function removeUser(email) {
    const session = await getSession();
    const user = getUserByEmailInternal(email);
    if (!user) return { success: false, message: 'User not found.' };
    if (session && session.userId === user.id) {
      return { success: false, message: 'You cannot delete your own account.' };
    }
    if (userHasLinkedData(user.id)) {
      return { success: false, message: 'This account is linked to participant or volunteer data. Unlink it first.' };
    }
    setJson(USERS_KEY, getRawUsers().filter((candidate) => candidate.id !== user.id));
    return { success: true };
  }

  function buildParticipantPayload(payload) {
    return {
      participantUserId: String(payload.participantUserId || '').trim(),
      guardianUserIds: Array.isArray(payload.guardianUserIds)
        ? payload.guardianUserIds.map((id) => String(id).trim()).filter(Boolean)
        : [],
      firstName: String(payload.firstName || '').trim(),
      lastName: String(payload.lastName || '').trim(),
      age: Number(payload.age) || '',
      contactEmail: normalizeEmail(payload.contactEmail),
      contactPhone: String(payload.contactPhone || '').trim(),
      specialNeeds: String(payload.specialNeeds || '').trim(),
      medicalNotes: String(payload.medicalNotes || '').trim(),
      sensoryNotes: String(payload.sensoryNotes || '').trim(),
      guardianNotes: String(payload.guardianNotes || '').trim(),
      participantInterests: normalizeParticipantInterests(payload.participantInterests),
      jobGoals: String(payload.jobGoals || '').trim()
    };
  }

  function participantDuplicate(participants, payload, skipId = null) {
    return participants.some((participant) => {
      if (skipId && String(participant.id) === String(skipId)) return false;
      return String(participant.participantUserId) === String(payload.participantUserId);
    });
  }

  function validateParticipantLinks(payload) {
    const users = getRawUsers();
    const participantUser = getUserByIdInternal(payload.participantUserId);
    if (!participantUser || participantUser.role !== 'PARTICIPANT') {
      return 'Select a valid participant login.';
    }
    if (!payload.guardianUserIds.length) return 'Select at least one linked guardian.';
    const invalidGuardian = payload.guardianUserIds.find((guardianId) => {
      const guardian = users.find((user) => String(user.id) === String(guardianId));
      return !guardian || guardian.role !== 'GUARDIAN';
    });
    if (invalidGuardian) return 'All linked guardians must be guardian accounts.';
    return '';
  }

  async function getParticipants() {
    return getRawParticipants()
      .slice()
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      .map(decorateParticipant);
  }

  async function getParticipantById(id) {
    const participant = getRawParticipants().find((entry) => String(entry.id) === String(id));
    return participant ? decorateParticipant(participant) : null;
  }

  async function addParticipant(payload) {
    const participants = getRawParticipants();
    const normalized = buildParticipantPayload(payload);
    const validationMessage = validateParticipantLinks(normalized);
    if (validationMessage) return { success: false, message: validationMessage };
    if (participantDuplicate(participants, normalized)) {
      return { success: false, message: 'That participant login is already linked to another participant record.' };
    }
    participants.push({
      id: makeId('p'),
      ...normalized,
      createdAtMs: Date.now(),
      dateAdded: formatDateLabel(new Date())
    });
    setJson(PARTICIPANTS_KEY, participants);
    return { success: true };
  }

  async function updateParticipant(id, payload) {
    const participants = getRawParticipants();
    const idx = participants.findIndex((entry) => String(entry.id) === String(id));
    if (idx === -1) return { success: false, message: 'Participant record not found.' };
    const normalized = buildParticipantPayload(payload);
    const validationMessage = validateParticipantLinks(normalized);
    if (validationMessage) return { success: false, message: validationMessage };
    if (participantDuplicate(participants, normalized, id)) {
      return { success: false, message: 'That participant login is already linked to another participant record.' };
    }
    participants[idx] = {
      ...participants[idx],
      ...normalized
    };
    setJson(PARTICIPANTS_KEY, participants);
    return { success: true };
  }

  async function removeParticipant(id) {
    const participants = getRawParticipants();
    const filtered = participants.filter((participant) => String(participant.id) !== String(id));
    if (filtered.length === participants.length) {
      return { success: false, message: 'Participant record not found.' };
    }
    setJson(PARTICIPANTS_KEY, filtered);
    setJson(EVENT_SIGNUPS_KEY, getRawEventSignups().filter((entry) => String(entry.participantId) !== String(id)));
    setJson(JOB_INTERESTS_KEY, getRawJobInterests().filter((entry) => String(entry.participantId) !== String(id)));
    setJson(APPROVALS_KEY, getRawApprovals().filter((entry) => String(entry.participantId) !== String(id)));
    return { success: true };
  }

  async function getMyParticipantRecord() {
    const session = await getSession();
    if (!session) return null;
    const participant = session.role === 'PARTICIPANT'
      ? getParticipantRecordByUserIdInternal(session.userId)
      : null;
    return participant ? decorateParticipant(participant) : null;
  }

  async function getLinkedParticipantsForCurrentUser() {
    const session = await getSession();
    if (!session) return [];
    if (session.role === 'GUARDIAN') {
      return getLinkedParticipantsForGuardianUserIdInternal(session.userId).map(decorateParticipant);
    }
    if (session.role === 'PARTICIPANT') {
      const participant = getParticipantRecordByUserIdInternal(session.userId);
      return participant ? [decorateParticipant(participant)] : [];
    }
    if (session.role === 'ADMIN') {
      return getParticipants();
    }
    return [];
  }

  async function canGuardianManageParticipant(participantId) {
    const session = await getSession();
    if (!session || session.role !== 'GUARDIAN') return false;
    const participant = getRawParticipants().find((entry) => String(entry.id) === String(participantId));
    return Boolean(participant && (participant.guardianUserIds || []).map(String).includes(String(session.userId)));
  }

  async function updateMyParticipantProfile(payload) {
    const session = await getSession();
    if (!session || session.role !== 'PARTICIPANT') {
      return { success: false, message: 'Only participants can update this profile area.' };
    }
    const participant = getParticipantRecordByUserIdInternal(session.userId);
    if (!participant) return { success: false, message: 'No participant profile is linked to this account.' };
    const next = { ...participant };
    SELF_SERVICE_PARTICIPANT_FIELDS.forEach((field) => {
      if (!(field in payload)) return;
      next[field] = field === 'participantInterests'
        ? normalizeParticipantInterests(payload[field])
        : String(payload[field] || '').trim();
    });
    const participants = getRawParticipants().map((entry) => String(entry.id) === String(participant.id) ? next : entry);
    setJson(PARTICIPANTS_KEY, participants);
    return { success: true };
  }

  async function getVolunteerProfile(identifier) {
    const profiles = getRawVolunteerProfiles();
    const normalizedId = String(identifier || '').trim();
    const normalizedEmail = normalizeEmail(identifier);
    const profile = profiles.find((entry) => String(entry.userId) === normalizedId || entry.email === normalizedEmail);
    return profile || null;
  }

  async function getVolunteerProfiles() {
    return getRawVolunteerProfiles()
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .map((profile) => {
        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email;
        const linkedUser = getUserByIdInternal(profile.userId);
        return {
          ...profile,
          fullName,
          linkedUser
        };
      });
  }

  async function saveVolunteerProfile(payload) {
    const profiles = getRawVolunteerProfiles();
    const volunteerUser = getUserByIdInternal(payload.userId) || getUserByEmailInternal(payload.email);
    if (!volunteerUser || volunteerUser.role !== 'VOLUNTEER') {
      return { success: false, message: 'Volunteer profiles must be linked to a volunteer system user.' };
    }

    const record = {
      userId: volunteerUser.id,
      firstName: String(payload.firstName || '').trim(),
      lastName: String(payload.lastName || '').trim(),
      phone: String(payload.phone || '').trim(),
      email: volunteerUser.email,
      interests: normalizeParticipantInterests(payload.interests),
      availability: String(payload.availability || '').trim(),
      backgroundCheckStatus: String(payload.backgroundCheckStatus || 'Not Started').trim() || 'Not Started',
      updatedAt: Date.now(),
      updatedAtLabel: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    };

    const idx = profiles.findIndex((profile) =>
      String(profile.userId) === String(volunteerUser.id)
      || normalizeEmail(profile.email) === volunteerUser.email
    );
    if (idx >= 0) {
      const conflicting = profiles.find((profile, index) =>
        index !== idx && String(profile.userId) === String(volunteerUser.id)
      );
      if (conflicting) {
        return { success: false, message: 'That volunteer login is already linked to another volunteer profile.' };
      }
      profiles[idx] = { ...profiles[idx], ...record };
    } else {
      const conflicting = profiles.find((profile) => String(profile.userId) === String(volunteerUser.id));
      if (conflicting) {
        return { success: false, message: 'That volunteer login is already linked to another volunteer profile.' };
      }
      profiles.push(record);
    }
    setJson(VOLUNTEER_PROFILES_KEY, profiles);
    return { success: true };
  }

  async function removeVolunteerProfile(identifier) {
    const profile = await getVolunteerProfile(identifier);
    if (!profile) return { success: false, message: 'Volunteer profile not found.' };
    setJson(VOLUNTEER_PROFILES_KEY, getRawVolunteerProfiles().filter((entry) => String(entry.userId) !== String(profile.userId)));
    return { success: true };
  }

  function eventDuplicate(events, payload, skipId = null) {
    const title = String(payload.title || '').trim().toLowerCase();
    const location = String(payload.location || '').trim().toLowerCase();
    const dateTime = String(payload.dateTime || '').trim();
    return events.some((event) => {
      if (skipId && String(event.id) === String(skipId)) return false;
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
        const aTs = a.eventTimestamp ?? null;
        const bTs = b.eventTimestamp ?? null;
        const aUpcoming = aTs !== null && aTs >= now;
        const bUpcoming = bTs !== null && bTs >= now;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        if (aUpcoming && bUpcoming && aTs !== bTs) return aTs - bTs;
        if (!aUpcoming && !bUpcoming && aTs !== bTs) return (bTs || 0) - (aTs || 0);
        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
      })
      .map((event) => ({
        ...event,
        dateTimeLabel: formatEventDateTime(event.dateTime)
      }));
  }

  async function addEvent(payload) {
    const events = getRawEvents();
    if (eventDuplicate(events, payload)) {
      return { success: false, message: 'An event with the same title, location, and date/time already exists.' };
    }
    events.push({
      id: makeId('o'),
      title: String(payload.title || '').trim(),
      category: String(payload.category || '').trim(),
      dateTime: String(payload.dateTime || '').trim(),
      eventTimestamp: getEventTimestamp(payload.dateTime),
      location: String(payload.location || '').trim(),
      cost: String(payload.cost || '').trim(),
      accommodations: String(payload.accommodations || '').trim(),
      isUrgent: Boolean(payload.isUrgent),
      createdAtMs: Date.now(),
      dateAdded: formatDateLabel(new Date())
    });
    setJson(EVENTS_KEY, events);
    return { success: true };
  }

  async function updateEvent(id, payload) {
    const events = getRawEvents();
    const idx = events.findIndex((event) => String(event.id) === String(id));
    if (idx === -1) return { success: false, message: 'Event not found.' };
    if (eventDuplicate(events, payload, id)) {
      return { success: false, message: 'An event with the same title, location, and date/time already exists.' };
    }
    events[idx] = {
      ...events[idx],
      title: String(payload.title || '').trim(),
      category: String(payload.category || '').trim(),
      dateTime: String(payload.dateTime || '').trim(),
      eventTimestamp: getEventTimestamp(payload.dateTime),
      location: String(payload.location || '').trim(),
      cost: String(payload.cost || '').trim(),
      accommodations: String(payload.accommodations || '').trim(),
      isUrgent: Boolean(payload.isUrgent)
    };
    setJson(EVENTS_KEY, events);
    return { success: true };
  }

  async function removeEvent(id) {
    const events = getRawEvents();
    const filtered = events.filter((event) => String(event.id) !== String(id));
    if (filtered.length === events.length) return { success: false, message: 'Event not found.' };
    setJson(EVENTS_KEY, filtered);
    setJson(EVENT_SIGNUPS_KEY, getRawEventSignups().filter((entry) => String(entry.eventId) !== String(id)));
    return { success: true };
  }

  function getParticipantForActor(session, participantId) {
    if (!session) return null;
    if (session.role === 'PARTICIPANT') {
      return getParticipantRecordByUserIdInternal(session.userId);
    }
    if (session.role === 'GUARDIAN') {
      if (!participantId) return null;
      const participant = getRawParticipants().find((entry) => String(entry.id) === String(participantId));
      if (!participant) return null;
      return (participant.guardianUserIds || []).map(String).includes(String(session.userId)) ? participant : null;
    }
    return null;
  }

  async function getInterestedEventIds() {
    const session = await getSession();
    if (!session || session.role !== 'PARTICIPANT') return [];
    const participant = getParticipantRecordByUserIdInternal(session.userId);
    if (!participant) return [];
    return getRawEventSignups()
      .filter((entry) => String(entry.participantId) === String(participant.id))
      .map((entry) => String(entry.eventId))
      .filter(Boolean);
  }

  async function getEventInterestParticipantIdsForGuardian() {
    const session = await getSession();
    if (!session || session.role !== 'GUARDIAN') return [];
    return getLinkedParticipantsForGuardianUserIdInternal(session.userId).map((participant) => String(participant.id));
  }

  async function saveEventInterest(eventId, eventTitle = '', options = {}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Please sign in to register interest.' };
    if (!['PARTICIPANT', 'GUARDIAN'].includes(session.role)) {
      return { success: false, message: 'Only participants or guardians can save event interests.' };
    }

    const participant = getParticipantForActor(session, options.participantId);
    if (!participant) {
      return { success: false, message: session.role === 'GUARDIAN' ? 'Choose a linked participant first.' : 'No participant profile is linked to this account.' };
    }

    const signups = getRawEventSignups();
    const duplicate = signups.some((entry) =>
      String(entry.participantId) === String(participant.id) && String(entry.eventId) === String(eventId)
    );
    if (duplicate) return { success: true, alreadySaved: true };

    signups.push({
      id: makeId('es'),
      participantId: participant.id,
      eventId: String(eventId || '').trim(),
      title: String(eventTitle || '').trim(),
      createdByUserId: session.userId,
      createdByRole: session.role,
      timestamp: new Date().toISOString()
    });
    setJson(EVENT_SIGNUPS_KEY, signups);
    return { success: true };
  }

  async function removeEventInterest(eventId, eventTitle = '', options = {}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Please sign in to update event interests.' };
    const participant = getParticipantForActor(session, options.participantId);
    if (!participant) return { success: false, message: 'No linked participant available.' };
    const filtered = getRawEventSignups().filter((entry) => !(
      String(entry.participantId) === String(participant.id)
      && (String(entry.eventId) === String(eventId) || String(entry.title).toLowerCase() === String(eventTitle || '').trim().toLowerCase())
    ));
    if (filtered.length === getRawEventSignups().length) {
      return { success: false, message: 'This event is not in the saved list.' };
    }
    setJson(EVENT_SIGNUPS_KEY, filtered);
    return { success: true };
  }

  async function toggleEventInterest(eventId, eventTitle = '', options = {}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Please sign in to update event interests.' };
    const participant = getParticipantForActor(session, options.participantId);
    if (!participant) return { success: false, message: 'No linked participant available.' };
    const exists = getRawEventSignups().some((entry) =>
      String(entry.participantId) === String(participant.id) && String(entry.eventId) === String(eventId)
    );
    return exists
      ? removeEventInterest(eventId, eventTitle, { participantId: participant.id })
      : saveEventInterest(eventId, eventTitle, { participantId: participant.id });
  }

  function jobDuplicate(jobs, payload, skipId = null) {
    const title = String(payload.title || '').trim().toLowerCase();
    const employer = String(payload.employer || '').trim().toLowerCase();
    return jobs.some((job) => {
      if (skipId && String(job.id) === String(skipId)) return false;
      return String(job.title || '').trim().toLowerCase() === title
        && String(job.employer || '').trim().toLowerCase() === employer;
    });
  }

  async function getJobs() {
    return getRawJobs()
      .slice()
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }

  async function addJob(payload) {
    const jobs = getRawJobs();
    if (jobDuplicate(jobs, payload)) {
      return { success: false, message: 'A job opportunity with the same title and employer already exists.' };
    }
    jobs.push({
      id: makeId('j'),
      title: String(payload.title || '').trim(),
      employer: String(payload.employer || '').trim(),
      location: String(payload.location || '').trim(),
      jobType: String(payload.jobType || '').trim(),
      salary: String(payload.salary || '').trim(),
      requirements: String(payload.requirements || '').trim(),
      status: String(payload.status || 'Open').trim() || 'Open',
      isUrgent: Boolean(payload.isUrgent),
      createdAtMs: Date.now(),
      dateAdded: formatDateLabel(new Date())
    });
    setJson(JOBS_KEY, jobs);
    return { success: true };
  }

  async function updateJob(id, payload) {
    const jobs = getRawJobs();
    const idx = jobs.findIndex((job) => String(job.id) === String(id));
    if (idx === -1) return { success: false, message: 'Job opportunity not found.' };
    if (jobDuplicate(jobs, payload, id)) {
      return { success: false, message: 'A job opportunity with the same title and employer already exists.' };
    }
    jobs[idx] = {
      ...jobs[idx],
      title: String(payload.title || '').trim(),
      employer: String(payload.employer || '').trim(),
      location: String(payload.location || '').trim(),
      jobType: String(payload.jobType || '').trim(),
      salary: String(payload.salary || '').trim(),
      requirements: String(payload.requirements || '').trim(),
      status: String(payload.status || jobs[idx].status || 'Open').trim() || 'Open',
      isUrgent: Boolean(payload.isUrgent)
    };
    setJson(JOBS_KEY, jobs);
    return { success: true };
  }

  async function removeJob(id) {
    const jobs = getRawJobs();
    const filtered = jobs.filter((job) => String(job.id) !== String(id));
    if (filtered.length === jobs.length) return { success: false, message: 'Job opportunity not found.' };
    setJson(JOBS_KEY, filtered);
    setJson(JOB_INTERESTS_KEY, getRawJobInterests().filter((entry) => String(entry.jobId) !== String(id)));
    setJson(APPROVALS_KEY, getRawApprovals().filter((entry) => String(entry.jobId) !== String(id)));
    return { success: true };
  }

  function buildPendingApproval(participant, jobId, session) {
    return {
      id: makeId('ap'),
      type: 'JOB_INTEREST',
      participantId: participant.id,
      participantUserId: participant.participantUserId,
      guardianUserIds: participant.guardianUserIds,
      jobId: String(jobId),
      requestedByUserId: session.userId,
      requestedByRole: session.role,
      status: 'PENDING',
      createdAtMs: Date.now(),
      resolvedAtMs: null,
      resolvedByUserId: '',
      notes: ''
    };
  }

  function buildApprovedInterest(participant, jobId, session, approverId) {
    return {
      id: makeId('ji'),
      participantId: participant.id,
      participantUserId: participant.participantUserId,
      guardianUserIds: participant.guardianUserIds,
      jobId: String(jobId),
      status: 'APPROVED',
      requestedByRole: session.role,
      requestedByUserId: session.userId,
      approvedByUserId: approverId,
      createdAtMs: Date.now(),
      approvedAtMs: Date.now()
    };
  }

  async function getMyJobInterestStatuses() {
    const session = await getSession();
    if (!session || session.role !== 'PARTICIPANT') return {};
    const participant = getParticipantRecordByUserIdInternal(session.userId);
    if (!participant) return {};
    const statusMap = {};
    getRawJobInterests()
      .filter((entry) => String(entry.participantId) === String(participant.id))
      .forEach((entry) => {
        statusMap[String(entry.jobId)] = 'APPROVED';
      });
    getRawApprovals()
      .filter((approval) => String(approval.participantId) === String(participant.id) && approval.type === 'JOB_INTEREST')
      .forEach((approval) => {
        statusMap[String(approval.jobId)] = approval.status;
      });
    return statusMap;
  }

  async function getInterestedJobIds() {
    const statuses = await getMyJobInterestStatuses();
    return Object.keys(statuses).filter((jobId) => statuses[jobId] === 'APPROVED');
  }

  async function toggleJobInterest(jobId, options = {}) {
    const session = await getSession();
    if (!session) return { success: false, message: 'Please sign in to update job interests.' };
    if (!['PARTICIPANT', 'GUARDIAN'].includes(session.role)) {
      return { success: false, message: 'Only participants or guardians can update job interests.' };
    }

    const participant = getParticipantForActor(session, options.participantId);
    if (!participant) {
      return { success: false, message: session.role === 'GUARDIAN' ? 'Choose a linked participant first.' : 'No participant profile is linked to this account.' };
    }

    const normalizedJobId = String(jobId || '').trim();
    const jobs = getRawJobs();
    if (!jobs.some((job) => String(job.id) === normalizedJobId)) {
      return { success: false, message: 'Job opportunity not found.' };
    }

    const approvedInterest = getRawJobInterests().find((entry) =>
      String(entry.participantId) === String(participant.id) && String(entry.jobId) === normalizedJobId
    );
    if (approvedInterest) {
      setJson(JOB_INTERESTS_KEY, getRawJobInterests().filter((entry) => String(entry.id) !== String(approvedInterest.id)));
      return { success: true, status: 'REMOVED' };
    }

    const pendingApproval = getRawApprovals().find((entry) =>
      entry.type === 'JOB_INTEREST'
      && String(entry.participantId) === String(participant.id)
      && String(entry.jobId) === normalizedJobId
      && entry.status === 'PENDING'
    );
    if (pendingApproval) {
      setJson(APPROVALS_KEY, getRawApprovals().filter((entry) => String(entry.id) !== String(pendingApproval.id)));
      return { success: true, status: 'REMOVED_PENDING' };
    }

    if (session.role === 'GUARDIAN') {
      const interests = getRawJobInterests();
      interests.push(buildApprovedInterest(participant, normalizedJobId, session, session.userId));
      setJson(JOB_INTERESTS_KEY, interests);
      return { success: true, status: 'APPROVED' };
    }

    const approvals = getRawApprovals();
    approvals.push(buildPendingApproval(participant, normalizedJobId, session));
    setJson(APPROVALS_KEY, approvals);
    return { success: true, status: 'PENDING' };
  }

  async function getPendingApprovals() {
    const session = await getSession();
    const approvals = getRawApprovals()
      .filter((approval) => approval.type === 'JOB_INTEREST')
      .map((approval) => {
        const participant = decorateParticipant(getRawParticipants().find((entry) => String(entry.id) === String(approval.participantId)) || {});
        const requestedByUser = getUserByIdInternal(approval.requestedByUserId);
        const job = getRawJobs().find((entry) => String(entry.id) === String(approval.jobId));
        return {
          ...approval,
          participant,
          requestedByUser,
          job
        };
      });

    if (!session) return [];
    if (session.role === 'ADMIN') return approvals;
    if (session.role === 'GUARDIAN') {
      return approvals.filter((approval) => (approval.guardianUserIds || []).map(String).includes(String(session.userId)));
    }
    if (session.role === 'PARTICIPANT') {
      const participant = getParticipantRecordByUserIdInternal(session.userId);
      return approvals.filter((approval) => participant && String(approval.participantId) === String(participant.id));
    }
    return [];
  }

  async function decideApproval(approvalId, decision, notes = '') {
    const session = await getSession();
    if (!session || !['GUARDIAN', 'ADMIN'].includes(session.role)) {
      return { success: false, message: 'Only guardians or administrators can review approvals.' };
    }
    const approvals = getRawApprovals();
    const idx = approvals.findIndex((approval) => String(approval.id) === String(approvalId));
    if (idx === -1) return { success: false, message: 'Approval request not found.' };

    const approval = approvals[idx];
    if (session.role === 'GUARDIAN' && !(approval.guardianUserIds || []).map(String).includes(String(session.userId))) {
      return { success: false, message: 'You cannot manage approvals for this participant.' };
    }
    if (approval.status !== 'PENDING') {
      return { success: false, message: 'This approval request has already been reviewed.' };
    }

    const decisionUpper = String(decision || '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(decisionUpper)) {
      return { success: false, message: 'Invalid approval decision.' };
    }

    approvals[idx] = {
      ...approval,
      status: decisionUpper,
      resolvedAtMs: Date.now(),
      resolvedByUserId: session.userId,
      notes: String(notes || '').trim()
    };
    setJson(APPROVALS_KEY, approvals);

    if (decisionUpper === 'APPROVED') {
      const participant = getRawParticipants().find((entry) => String(entry.id) === String(approval.participantId));
      if (participant) {
        const interests = getRawJobInterests();
        interests.push({
          id: makeId('ji'),
          participantId: participant.id,
          participantUserId: participant.participantUserId,
          guardianUserIds: participant.guardianUserIds,
          jobId: approval.jobId,
          status: 'APPROVED',
          requestedByRole: approval.requestedByRole,
          requestedByUserId: approval.requestedByUserId,
          approvedByUserId: session.userId,
          createdAtMs: approval.createdAtMs,
          approvedAtMs: Date.now()
        });
        setJson(JOB_INTERESTS_KEY, interests);
      }
    }

    return { success: true };
  }

  async function getJobInterestSummary() {
    const participants = await getParticipants();
    const participantMap = new Map(participants.map((participant) => [String(participant.id), participant]));
    const summary = {};

    getRawJobInterests().forEach((interest) => {
      const jobId = String(interest.jobId);
      const participant = participantMap.get(String(interest.participantId));
      if (!participant) return;
      if (!summary[jobId]) summary[jobId] = { approved: [], pending: [] };
      const already = summary[jobId].approved.some((entry) => entry.participantId === participant.id);
      if (!already) {
        summary[jobId].approved.push({
          participantId: participant.id,
          name: participant.fullName,
          email: participant.participantUser?.email || '',
          guardianNames: participant.guardianNames
        });
      }
    });

    getRawApprovals()
      .filter((approval) => approval.type === 'JOB_INTEREST' && approval.status === 'PENDING')
      .forEach((approval) => {
        const jobId = String(approval.jobId);
        const participant = participantMap.get(String(approval.participantId));
        if (!participant) return;
        if (!summary[jobId]) summary[jobId] = { approved: [], pending: [] };
        const already = summary[jobId].pending.some((entry) => entry.participantId === participant.id);
        if (!already) {
          summary[jobId].pending.push({
            participantId: participant.id,
            name: participant.fullName,
            email: participant.participantUser?.email || '',
            guardianNames: participant.guardianNames
          });
        }
      });

    return summary;
  }

  function buildDistributedNewsletterBody(entry) {
    const eventHighlights = String(entry.eventHighlights || '').trim();
    const updates = String(entry.updates || '').trim();
    const lines = ['Hello Kindred participants and families,', ''];
    if (eventHighlights) {
      lines.push('Event highlights', eventHighlights, '');
    }
    if (updates) {
      lines.push('Updates', updates, '');
    }
    lines.push('Thank you,', 'Kindred Administration');
    return lines.join('\n');
  }

  function buildNewsletterContent({ weekStart, participants, events, jobs }) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekLabel = `Week of ${formatDateLabel(weekStart)}`;
    const eventLines = events.length
      ? events.map((event) => `- ${event.title} (${formatEventDateTime(event.dateTime)}) at ${event.location}. ${event.cost}.`).join('\n')
      : '- No new community events are scheduled right now. Please check the dashboard for rolling updates.';
    const jobLines = jobs.length
      ? jobs.map((job) => `- ${job.title} at ${job.employer} in ${job.location || 'the local area'}${job.salary ? ` (${job.salary})` : ''}.`).join('\n')
      : '- No new job opportunities were added this week.';

    const subject = `Kindred Weekly Newsletter | ${weekLabel}`;
    const preview = `${events.length} upcoming events and ${jobs.length} job opportunities for participants and families.`;
    const body = [
      'Hello Kindred participants and families,',
      '',
      `Here is your weekly update for ${formatDateLabel(weekStart)} through ${formatDateLabel(weekEnd)}.`,
      '',
      `This week we are highlighting ${events.length} upcoming event${events.length === 1 ? '' : 's'} and ${jobs.length} employment opportunit${jobs.length === 1 ? 'y' : 'ies'} that may be a fit for our community.`,
      participants.length
        ? `Our current participant roster includes ${participants.length} registered participant${participants.length === 1 ? '' : 's'}, and this newsletter is intended to help each family quickly review the latest options.`
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

  async function getNewsletters() {
    const session = await getSession();
    const sessionEmail = normalizeEmail(session?.email);
    const generatedNewsletters = getRawNewsletters().map((newsletter) => ({
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

    const distributedNewsletters = getRawNewsletterLog()
      .filter((entry) => {
        if (!sessionEmail) return true;
        if (session?.role === 'ADMIN') return true;
        const recipients = Array.isArray(entry.recipients) ? entry.recipients.map(normalizeEmail) : [];
        return recipients.includes(sessionEmail);
      })
      .map((entry) => ({
        id: entry.id || `distributed_${entry.sentAtMs || Date.now()}`,
        weekKey: entry.id || `distributed_${entry.sentAtMs || Date.now()}`,
        weekOf: entry.sentAtLabel ? `Sent ${entry.sentAtLabel}` : 'Recently sent',
        subject: entry.subject || 'Kindred Weekly Newsletter',
        preview: String(entry.eventHighlights || '').trim() || String(entry.updates || '').trim() || 'No additional details provided.',
        body: buildDistributedNewsletterBody(entry),
        audience: 'Selected recipients',
        generatedAtLabel: entry.sentAtLabel || '',
        generatedAtMs: entry.sentAtMs || 0,
        eventCount: 0,
        jobCount: 0
      }));

    const merged = [...distributedNewsletters, ...generatedNewsletters].sort((a, b) => (b.generatedAtMs || 0) - (a.generatedAtMs || 0));
    const seen = new Set();
    return merged.filter((item) => {
      const key = String(item.id || `${item.subject}_${item.generatedAtMs || 0}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function generateWeeklyNewsletter() {
    const newsletters = getRawNewsletters();
    const participants = await getParticipants();
    const allEvents = await getEvents();
    const allJobs = await getJobs();
    const now = Date.now();
    const upcomingEvents = allEvents.filter((event) => {
      const timestamp = getEventTimestamp(event.dateTime);
      return timestamp !== null && timestamp >= now;
    }).slice(0, 3);
    const highlightedJobs = allJobs.slice(0, 3);
    const weekStart = getWeekStartDate(new Date());
    const weekKey = `week_${weekStart.toISOString().slice(0, 10)}`;
    const content = buildNewsletterContent({ weekStart, participants, events: upcomingEvents, jobs: highlightedJobs });
    const record = {
      id: makeId('n'),
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
      newsletters[existingIdx] = { ...newsletters[existingIdx], ...record, id: newsletters[existingIdx].id };
    } else {
      newsletters.push(record);
    }
    setJson(NEWSLETTERS_KEY, newsletters);
    return { success: true, newsletter: existingIdx >= 0 ? newsletters[existingIdx] : record, updated: existingIdx >= 0 };
  }

  async function getNewsletterDraft() {
    try {
      return JSON.parse(localStorage.getItem(NEWSLETTER_DRAFT_KEY)) || null;
    } catch {
      return null;
    }
  }

  async function saveNewsletterDraft(payload) {
    const session = await getSession();
    if (!requireRole(session, ['ADMIN'])) {
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
    setJson(NEWSLETTER_DRAFT_KEY, draft);
    return { success: true };
  }

  async function getNewsletterHistory() {
    return getRawNewsletterLog().slice().sort((a, b) => (b.sentAtMs || 0) - (a.sentAtMs || 0));
  }

  async function distributeNewsletter(payload) {
    const session = await getSession();
    if (!requireRole(session, ['ADMIN'])) {
      return { success: false, message: 'Only administrators can distribute newsletters.' };
    }
    const subject = String(payload.subject || '').trim();
    const eventHighlights = String(payload.eventHighlights || '').trim();
    const updates = String(payload.updates || '').trim();
    const recipients = Array.isArray(payload.recipients)
      ? payload.recipients.map((recipient) => normalizeEmail(recipient)).filter(Boolean)
      : [];
    if (!subject || (!eventHighlights && !updates)) {
      return { success: false, message: 'Provide a subject and newsletter content before distributing.' };
    }
    if (!recipients.length) {
      return { success: false, message: 'Select at least one recipient before distributing.' };
    }
    const users = getRawUsers();
    const registeredRecipientCount = recipients.filter((email) => users.some((user) => user.email === email)).length;
    if (!registeredRecipientCount) {
      return { success: false, message: 'No valid recipients selected. Please retry.' };
    }
    const log = getRawNewsletterLog();
    log.push({
      id: makeId('nl'),
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
    });
    setJson(NEWSLETTER_LOG_KEY, log);
    localStorage.removeItem(NEWSLETTER_DRAFT_KEY);
    return { success: true, recipientCount: registeredRecipientCount };
  }

  // ─── Background Check Management (Req 801 / 802) ────────────────────────

  function getBgCheckRecordInternal(volunteerUserId) {
    return getRawBgChecks().find((entry) => String(entry.volunteerUserId) === String(volunteerUserId)) || null;
  }

  function makeDateLabel() {
    return new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  async function getBgCheckRecord(volunteerUserId) {
    return getBgCheckRecordInternal(volunteerUserId);
  }

  async function getMyBgCheckRecord() {
    const session = await getSession();
    if (!session || session.role !== 'VOLUNTEER') return null;
    return getBgCheckRecordInternal(session.userId);
  }

  async function submitBgCheckConsent() {
    const session = await getSession();
    if (!session || session.role !== 'VOLUNTEER') {
      return { success: false, message: 'Only volunteers can submit background check consent.' };
    }

    const records = getRawBgChecks();
    const existing = records.find((entry) => String(entry.volunteerUserId) === String(session.userId));

    if (existing && existing.consentSubmitted) {
      return { success: false, message: 'You have already submitted your background check consent.' };
    }

    const now = Date.now();
    const dateLabel = makeDateLabel();
    const historyEntry = {
      status: 'Pending',
      changedByUserId: session.userId,
      changedByName: session.name,
      changedByRole: 'VOLUNTEER',
      changedAtMs: now,
      changedAtLabel: dateLabel,
      note: 'Volunteer submitted consent'
    };

    if (existing) {
      existing.consentSubmitted = true;
      existing.consentSubmittedAtMs = now;
      existing.consentSubmittedAtLabel = dateLabel;
      existing.status = 'Pending';
      existing.statusHistory.push(historyEntry);
    } else {
      records.push({
        id: makeId('bgc'),
        volunteerUserId: session.userId,
        consentSubmitted: true,
        consentSubmittedAtMs: now,
        consentSubmittedAtLabel: dateLabel,
        status: 'Pending',
        statusHistory: [historyEntry],
        notes: ''
      });
    }

    setJson(BG_CHECK_KEY, records);

    const user = getUserByIdInternal(session.userId);
    const profiles = getRawVolunteerProfiles();
    const profileIdx = profiles.findIndex((p) => String(p.userId) === String(session.userId));

    if (profileIdx >= 0) {
      profiles[profileIdx].backgroundCheckStatus = 'Pending';
      setJson(VOLUNTEER_PROFILES_KEY, profiles);
    } else if (user) {
      const nameParts = splitName(user.name);
      profiles.push({
        userId: user.id,
        firstName: nameParts.firstName,
        lastName: nameParts.lastName,
        phone: '',
        email: user.email,
        interests: [],
        availability: '',
        backgroundCheckStatus: 'Pending',
        updatedAt: now,
        updatedAtLabel: dateLabel
      });
      setJson(VOLUNTEER_PROFILES_KEY, profiles);
    }

    return { success: true };
  }

  async function revokeBgCheckConsent() {
    const session = await getSession();
    if (!session || session.role !== 'VOLUNTEER') {
      return { success: false, message: 'Only volunteers can revoke background check consent.' };
    }

    const records = getRawBgChecks();
    const record = records.find((entry) => String(entry.volunteerUserId) === String(session.userId));

    if (!record || !record.consentSubmitted) {
      return { success: false, message: 'No active background check consent was found to revoke.' };
    }

    if (record.status !== 'Pending') {
      return { success: false, message: 'You can only revoke consent while your background check is pending review.' };
    }

    const now = Date.now();
    const dateLabel = makeDateLabel();

    record.consentSubmitted = false;
    record.consentSubmittedAtMs = null;
    record.consentSubmittedAtLabel = '';
    record.status = 'Revoked';
    record.expiresAtMs = null;
    record.expiresAtLabel = '';
    record.statusHistory.push({
      status: 'Revoked',
      changedByUserId: session.userId,
      changedByName: session.name,
      changedByRole: 'VOLUNTEER',
      changedAtMs: now,
      changedAtLabel: dateLabel,
      note: 'Volunteer revoked consent'
    });

    setJson(BG_CHECK_KEY, records);

    const profiles = getRawVolunteerProfiles();
    const profileIdx = profiles.findIndex((p) => String(p.userId) === String(session.userId));
    if (profileIdx >= 0) {
      profiles[profileIdx].backgroundCheckStatus = 'Revoked';
      setJson(VOLUNTEER_PROFILES_KEY, profiles);
    }

    return { success: true };
  }

  const BG_EXPIRY_OPTIONS = {
    '6months': { label: '6 Months', ms: 6 * 30 * 24 * 60 * 60 * 1000 },
    '1year':   { label: '1 Year',   ms: 365 * 24 * 60 * 60 * 1000 }
  };

  function checkAndExpireBgRecords() {
    const records = getRawBgChecks();
    const profiles = getRawVolunteerProfiles();
    let changed = false;

    records.forEach((record) => {
      if (record.status === 'Cleared' && record.expiresAtMs && Date.now() >= record.expiresAtMs) {
        record.status = 'Expired';
        record.statusHistory.push({
          status: 'Expired',
          changedByUserId: 'system',
          changedByName: 'System (auto-expiry)',
          changedByRole: 'SYSTEM',
          changedAtMs: Date.now(),
          changedAtLabel: makeDateLabel(),
          note: 'Background check expired automatically'
        });
        const profileIdx = profiles.findIndex((p) => String(p.userId) === String(record.volunteerUserId));
        if (profileIdx >= 0) {
          profiles[profileIdx].backgroundCheckStatus = 'Expired';
        }
        changed = true;
      }
    });

    if (changed) {
      setJson(BG_CHECK_KEY, records);
      setJson(VOLUNTEER_PROFILES_KEY, profiles);
    }
  }

  async function updateBgCheckStatus(volunteerUserId, newStatus, notes = '', expiryKey = '') {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, message: 'Only administrators can update background check status.' };
    }

    if (!BG_CHECK_STATUSES.includes(newStatus)) {
      return { success: false, message: `Invalid status. Must be one of: ${BG_CHECK_STATUSES.join(', ')}` };
    }

    const records = getRawBgChecks();
    let record = records.find((entry) => String(entry.volunteerUserId) === String(volunteerUserId));

    if (record && record.status === 'Cleared' && record.expiresAtMs && Date.now() < record.expiresAtMs) {
      return { success: false, message: 'This volunteer is verified and their status is locked until the background check expires.' };
    }

    const now = Date.now();
    const dateLabel = makeDateLabel();

    let expiresAtMs = null;
    let expiresAtLabel = '';
    if (newStatus === 'Cleared' && expiryKey && BG_EXPIRY_OPTIONS[expiryKey]) {
      expiresAtMs = now + BG_EXPIRY_OPTIONS[expiryKey].ms;
      expiresAtLabel = new Date(expiresAtMs).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }

    const historyEntry = {
      status: newStatus,
      changedByUserId: session.userId,
      changedByName: session.name,
      changedByRole: 'ADMIN',
      changedAtMs: now,
      changedAtLabel: dateLabel,
      note: String(notes || '').trim()
        + (expiresAtLabel ? ` | Expires: ${expiresAtLabel}` : '')
    };

    if (record) {
      record.status = newStatus;
      record.notes = String(notes || record.notes || '').trim();
      record.statusHistory.push(historyEntry);
      if (newStatus === 'Cleared') {
        record.expiresAtMs = expiresAtMs;
        record.expiresAtLabel = expiresAtLabel;
      } else {
        record.expiresAtMs = null;
        record.expiresAtLabel = '';
      }
    } else {
      record = {
        id: makeId('bgc'),
        volunteerUserId: String(volunteerUserId),
        consentSubmitted: false,
        consentSubmittedAtMs: null,
        consentSubmittedAtLabel: '',
        status: newStatus,
        statusHistory: [historyEntry],
        notes: String(notes || '').trim(),
        expiresAtMs: newStatus === 'Cleared' ? expiresAtMs : null,
        expiresAtLabel: newStatus === 'Cleared' ? expiresAtLabel : ''
      };
      records.push(record);
    }

    setJson(BG_CHECK_KEY, records);

    const profiles = getRawVolunteerProfiles();
    const profileIdx = profiles.findIndex((p) => String(p.userId) === String(volunteerUserId));
    if (profileIdx >= 0) {
      profiles[profileIdx].backgroundCheckStatus = newStatus;
      setJson(VOLUNTEER_PROFILES_KEY, profiles);
    }

    const auditLog = getRawAuditLog();
    auditLog.push({
      id: makeId('al'),
      action: 'BG_CHECK_STATUS_UPDATED',
      adminUserId: session.userId,
      adminName: session.name,
      volunteerUserId: String(volunteerUserId),
      previousStatus: record.statusHistory.length >= 2
        ? record.statusHistory[record.statusHistory.length - 2].status
        : 'N/A',
      newStatus,
      expiresAtLabel: expiresAtLabel || '',
      notes: String(notes || '').trim(),
      changedAtMs: now,
      changedAtLabel: dateLabel
    });
    setJson(AUDIT_LOG_KEY, auditLog);

    return { success: true };
  }

  async function getAllBgCheckRecords() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return [];
    return getRawBgChecks().slice().sort((a, b) => {
      const aTime = a.statusHistory?.length ? a.statusHistory[a.statusHistory.length - 1].changedAtMs : 0;
      const bTime = b.statusHistory?.length ? b.statusHistory[b.statusHistory.length - 1].changedAtMs : 0;
      return (bTime || 0) - (aTime || 0);
    });
  }

  // ─── Urgent Notification helpers ──────────────────────────────────────────

  const URGENT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

  function isUrgentEvent(event) {
    if (event.isUrgent) return true;
    const ts = getEventTimestamp(event.dateTime);
    if (ts === null) return false;
    const delta = ts - Date.now();
    return delta >= 0 && delta <= URGENT_WINDOW_MS;
  }

  function isUrgentJob(job) {
    return Boolean(job.isUrgent);
  }

  function tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .split(/[\s,;.!?()\-/]+/)
      .filter((token) => token.length > 3);
  }

  function hasKeywordOverlap(sourceText, targetText) {
    const sourceTokens = tokenize(sourceText);
    const targetTokens = new Set(tokenize(targetText));
    return sourceTokens.some((token) => targetTokens.has(token));
  }

  function getMatchingParticipantsForEvent(event, participants) {
    const opportunityText = `${event.accommodations || ''} ${event.category || ''} ${event.title || ''}`;
    return participants.filter((participant) => {
      const profileText = [
        participant.specialNeeds,
        Array.isArray(participant.participantInterests) ? participant.participantInterests.join(' ') : participant.participantInterests,
        participant.sensoryNotes
      ].join(' ');
      return hasKeywordOverlap(opportunityText, profileText);
    });
  }

  function getMatchingParticipantsForJob(job, participants) {
    const opportunityText = `${job.requirements || ''} ${job.title || ''} ${job.employer || ''}`;
    return participants.filter((participant) => {
      const profileText = [
        participant.jobGoals,
        Array.isArray(participant.participantInterests) ? participant.participantInterests.join(' ') : participant.participantInterests,
        participant.specialNeeds
      ].join(' ');
      return hasKeywordOverlap(opportunityText, profileText);
    });
  }

  function buildRecipientListForParticipants(matchedParticipants, allParticipants, users) {
    const targetParticipants = matchedParticipants.length > 0 ? matchedParticipants : allParticipants;
    const emails = new Set();
    targetParticipants.forEach((participant) => {
      if (participant.contactEmail) emails.add(normalizeEmail(participant.contactEmail));
      (participant.guardianUserIds || []).forEach((guardianId) => {
        const guardian = users.find((user) => String(user.id) === String(guardianId));
        if (guardian?.email) emails.add(normalizeEmail(guardian.email));
      });
    });
    return Array.from(emails);
  }

  async function getUrgentOpportunities() {
    const session = await getSession();
    if (!requireRole(session, ['ADMIN'])) return { events: [], jobs: [] };
    const [allEvents, allJobs] = await Promise.all([getEvents(), getJobs()]);
    return {
      events: allEvents.filter(isUrgentEvent),
      jobs: allJobs.filter(isUrgentJob)
    };
  }

  async function generateUrgentDraft(opportunityType, opportunityId) {
    const session = await getSession();
    if (!requireRole(session, ['ADMIN'])) {
      return { success: false, message: 'Only administrators can generate urgent notifications.' };
    }
    const participants = getRawParticipants();
    const users = getRawUsers();
    let opportunity = null;
    let matchedParticipants = [];
    let subject = '';
    let body = '';

    if (opportunityType === 'event') {
      opportunity = getRawEvents().find((event) => String(event.id) === String(opportunityId));
      if (!opportunity) return { success: false, message: 'Event not found.' };
      matchedParticipants = getMatchingParticipantsForEvent(opportunity, participants);
      subject = `Urgent Community Alert: ${opportunity.title}`;
      body = [
        `Dear Participant and Family,`,
        ``,
        `We wanted to make sure you don't miss a time-sensitive community opportunity:`,
        ``,
        `📅 ${opportunity.title}`,
        `📍 ${opportunity.location}`,
        `🗓 ${formatEventDateTime(opportunity.dateTime)}`,
        `💰 ${opportunity.cost}`,
        ``,
        `Details & Accommodations:`,
        opportunity.accommodations || 'Please contact us for accessibility details.',
        ``,
        `Space may be limited — please reach out to your Kindred coordinator if you'd like to register.`,
        ``,
        `Warm regards,`,
        `Kindred Administration`
      ].join('\n');
    } else if (opportunityType === 'job') {
      opportunity = getRawJobs().find((job) => String(job.id) === String(opportunityId));
      if (!opportunity) return { success: false, message: 'Job opportunity not found.' };
      matchedParticipants = getMatchingParticipantsForJob(opportunity, participants);
      subject = `Urgent Job Opportunity: ${opportunity.title} at ${opportunity.employer}`;
      body = [
        `Dear Participant and Family,`,
        ``,
        `An urgent job opportunity has become available that may be a great fit:`,
        ``,
        `💼 ${opportunity.title}`,
        `🏢 ${opportunity.employer}`,
        `📍 ${opportunity.location || 'Local area'}`,
        `⏰ ${opportunity.jobType || 'Position type TBC'}${opportunity.salary ? ` | ${opportunity.salary}` : ''}`,
        ``,
        `Requirements:`,
        opportunity.requirements || 'Please contact us for details.',
        ``,
        `If this sounds like a good fit, please contact your Kindred coordinator as soon as possible.`,
        ``,
        `Warm regards,`,
        `Kindred Administration`
      ].join('\n');
    } else {
      return { success: false, message: 'Invalid opportunity type. Must be "event" or "job".' };
    }

    const suggestedRecipientEmails = buildRecipientListForParticipants(matchedParticipants, participants, users);
    const totalParticipants = participants.length;
    const matchCount = matchedParticipants.length;

    return {
      success: true,
      opportunityType,
      opportunityId,
      opportunityTitle: opportunity.title,
      subject,
      body,
      suggestedRecipientEmails,
      matchedParticipantCount: matchCount,
      totalParticipantCount: totalParticipants,
      wasFallback: matchCount === 0 && totalParticipants > 0
    };
  }

  async function sendUrgentNotification(payload) {
    const session = await getSession();
    if (!requireRole(session, ['ADMIN'])) {
      return { success: false, message: 'Only administrators can send urgent notifications.' };
    }
    const subject = String(payload.subject || '').trim();
    const body = String(payload.body || '').trim();
    const recipients = Array.isArray(payload.recipients)
      ? payload.recipients.map(normalizeEmail).filter(Boolean)
      : [];
    if (!subject) return { success: false, message: 'A subject line is required.' };
    if (!body) return { success: false, message: 'Message body is required.' };
    if (!recipients.length) return { success: false, message: 'Select at least one recipient.' };

    const users = getRawUsers();
    const validRecipientCount = recipients.filter((email) => users.some((user) => user.email === email)).length;
    if (!validRecipientCount) {
      return { success: false, message: 'No valid registered recipients selected.' };
    }

    const sentAtMs = Date.now();
    const sentAtLabel = new Date(sentAtMs).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    const notificationRecord = {
      id: makeId('un'),
      opportunityType: String(payload.opportunityType || '').trim(),
      opportunityId: String(payload.opportunityId || '').trim(),
      opportunityTitle: String(payload.opportunityTitle || '').trim(),
      subject,
      body,
      recipients,
      recipientCount: validRecipientCount,
      sentByUserId: session.userId,
      sentByName: session.name,
      sentAtMs,
      sentAtLabel
    };

    const auditEntry = {
      id: makeId('al'),
      action: 'URGENT_NOTIFICATION_SENT',
      adminUserId: session.userId,
      adminName: session.name,
      opportunityType: notificationRecord.opportunityType,
      opportunityId: notificationRecord.opportunityId,
      opportunityTitle: notificationRecord.opportunityTitle,
      recipientCount: validRecipientCount,
      recipients,
      sentAtMs,
      sentAtLabel
    };

    const notifications = getRawUrgentNotifications();
    notifications.push(notificationRecord);
    setJson(URGENT_NOTIFICATIONS_KEY, notifications);

    const auditLog = getRawAuditLog();
    auditLog.push(auditEntry);
    setJson(AUDIT_LOG_KEY, auditLog);

    return { success: true, recipientCount: validRecipientCount, sentAtLabel };
  }

  async function getUrgentNotificationHistory() {
    const session = await getSession();
    if (!requireRole(session, ['ADMIN'])) return [];
    return getRawUrgentNotifications().slice().sort((a, b) => (b.sentAtMs || 0) - (a.sentAtMs || 0));
  }

  const NOTIFICATION_READS_KEY   = 'kindred_notification_reads';
  const NOTIFICATION_DELETES_KEY = 'kindred_notification_deletes';

  function getReadNotificationIds() {
    try { return JSON.parse(localStorage.getItem(NOTIFICATION_READS_KEY)) || []; } catch { return []; }
  }

  function getDeletedNotificationIds() {
    try { return JSON.parse(localStorage.getItem(NOTIFICATION_DELETES_KEY)) || []; } catch { return []; }
  }

  function markNotificationsRead(notificationIds) {
    const existing = getReadNotificationIds();
    const merged = Array.from(new Set([...existing, ...notificationIds]));
    localStorage.setItem(NOTIFICATION_READS_KEY, JSON.stringify(merged));
    return { success: true };
  }

  function toggleNotificationRead(notificationId) {
    const existing = getReadNotificationIds();
    const id = String(notificationId);
    const updated = existing.includes(id) ? existing.filter((x) => x !== id) : [...existing, id];
    localStorage.setItem(NOTIFICATION_READS_KEY, JSON.stringify(updated));
    return { success: true, isNowRead: updated.includes(id) };
  }

  function deleteMyNotification(notificationId) {
    const existing = getDeletedNotificationIds();
    const merged = Array.from(new Set([...existing, String(notificationId)]));
    localStorage.setItem(NOTIFICATION_DELETES_KEY, JSON.stringify(merged));
    return { success: true };
  }

  async function getMyNotifications() {
    const session = await getSession();
    if (!session || !['PARTICIPANT', 'GUARDIAN'].includes(session.role)) return [];
    const users = getRawUsers();
    const me = users.find((u) => u.id === session.userId);
    if (!me) return [];
    const myEmail = normalizeEmail(me.email);
    const deleted = new Set(getDeletedNotificationIds());
    return getRawUrgentNotifications()
      .filter((n) => Array.isArray(n.recipients) && n.recipients.some((r) => normalizeEmail(r) === myEmail) && !deleted.has(String(n.id)))
      .slice()
      .sort((a, b) => (b.sentAtMs || 0) - (a.sentAtMs || 0));
  }

  // ─── Task Assignment & Delegation (Story 1001) ────────────────────────────

  async function getClearedVolunteers() {
    await checkAndExpireBgRecords();
    const profiles = getRawVolunteerProfiles().filter((p) => p.backgroundCheckStatus === 'Cleared');
    const users = getRawUsers();
    return profiles.map((p) => {
      const user = users.find((u) => String(u.id) === String(p.userId));
      return { userId: p.userId, name: user ? user.name : p.firstName + ' ' + p.lastName, email: p.email };
    });
  }

  async function submitInquiry(payload) {
    const session = await getSession();
    if (!session || session.role !== 'PARTICIPANT') return { success: false, message: 'Only participants can submit inquiries.' };
    const now = Date.now();
    const dateLabel = formatDateLabel(new Date(now));
    const inquiry = {
      id: makeId('inq'),
      subject: String(payload.subject || '').trim() || 'No subject',
      description: String(payload.description || '').trim(),
      submittedByUserId: session.userId,
      submittedByName: session.name,
      status: 'PENDING_REVIEW',
      taskIds: [],
      createdAtMs: now,
      createdAtLabel: dateLabel
    };
    const inquiries = getRawInquiries();
    inquiries.push(inquiry);
    setJson(INQUIRIES_KEY, inquiries);
    return { success: true };
  }

  async function getAllInquiries() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return [];
    return getRawInquiries().slice().sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  async function getMyInquiries() {
    const session = await getSession();
    if (!session || session.role !== 'PARTICIPANT') return [];
    const inquiries = getRawInquiries().filter((i) => String(i.submittedByUserId) === String(session.userId));
    const tasks = getRawTasks();
    return inquiries
      .slice()
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .map((inq) => ({
        ...inq,
        tasks: tasks.filter((t) => String(t.inquiryId) === String(inq.id))
      }));
  }

  async function createTaskFromInquiry(inquiryId, payload) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can create tasks.' };
    const inquiries = getRawInquiries();
    const inqIdx = inquiries.findIndex((i) => String(i.id) === String(inquiryId));
    if (inqIdx < 0) return { success: false, message: 'Inquiry not found.' };
    const inquiry = inquiries[inqIdx];
    const now = Date.now();
    const dateLabel = formatDateLabel(new Date(now));
    const task = {
      id: makeId('task'),
      inquiryId: String(inquiryId),
      inquirySubject: inquiry.subject,
      title: String(payload.title || '').trim(),
      description: String(payload.description || '').trim(),
      createdByAdminId: session.userId,
      createdByAdminName: session.name,
      status: 'UNASSIGNED',
      assignedToUserId: null,
      assignedToName: null,
      assignedAtMs: null,
      assignedAtLabel: null,
      assignedByUserId: null,
      assignedByName: null,
      volunteerNote: null,
      completedAtMs: null,
      completedAtLabel: null,
      archived: false,
      checklistItems: [],
      createdAtMs: now,
      createdAtLabel: dateLabel
    };
    const tasks = getRawTasks();
    tasks.push(task);
    setJson(TASKS_KEY, tasks);
    inquiry.taskIds.push(task.id);
    if (inquiry.status === 'PENDING_REVIEW') inquiry.status = 'IN_PROGRESS';
    setJson(INQUIRIES_KEY, inquiries);
    const auditLog = getRawAuditLog();
    auditLog.push({
      id: makeId('al'),
      action: 'TASK_CREATED',
      adminUserId: session.userId,
      adminName: session.name,
      taskId: task.id,
      taskTitle: task.title,
      inquiryId: String(inquiryId),
      createdAtMs: now,
      createdAtLabel: dateLabel
    });
    setJson(AUDIT_LOG_KEY, auditLog);
    return { success: true, taskId: task.id };
  }

  async function getAllTasks() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return [];
    return getRawTasks().slice().sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  async function getMyAssignedTasks() {
    const session = await getSession();
    if (!session || session.role !== 'VOLUNTEER') return [];
    return getRawTasks()
      .filter((t) => String(t.assignedToUserId) === String(session.userId) && !['COMPLETED', 'REJECTED'].includes(t.status) && !t.archived)
      .slice()
      .sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  async function assignTask(taskId, assignedToUserId) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can assign tasks.' };
    const tasks = getRawTasks();
    const taskIdx = tasks.findIndex((t) => String(t.id) === String(taskId));
    if (taskIdx < 0) return { success: false, message: 'Task not found.' };
    const task = tasks[taskIdx];
    if (task.status === 'COMPLETED' || task.status === 'REJECTED') return { success: false, message: 'Cannot reassign a resolved task.' };
    const cleared = await getClearedVolunteers();
    const assignee = cleared.find((v) => String(v.userId) === String(assignedToUserId));
    if (!assignee) return { success: false, message: 'Volunteer does not have a Cleared background check status.' };
    const now = Date.now();
    const dateLabel = formatDateLabel(new Date(now));
    task.status = 'ASSIGNED';
    task.assignedToUserId = String(assignedToUserId);
    task.assignedToName = assignee.name;
    task.assignedAtMs = now;
    task.assignedAtLabel = dateLabel;
    task.assignedByUserId = session.userId;
    task.assignedByName = session.name;
    setJson(TASKS_KEY, tasks);
    const auditLog = getRawAuditLog();
    auditLog.push({
      id: makeId('al'),
      action: 'TASK_ASSIGNED',
      adminUserId: session.userId,
      adminName: session.name,
      taskId: String(taskId),
      taskTitle: task.title,
      assignedToUserId: String(assignedToUserId),
      assignedToName: assignee.name,
      assignedAtMs: now,
      assignedAtLabel: dateLabel
    });
    setJson(AUDIT_LOG_KEY, auditLog);
    return { success: true };
  }

  async function updateTaskStatus(taskId, newStatus) {
    const session = await getSession();
    if (!session || session.role !== 'VOLUNTEER') return { success: false, message: 'Only volunteers can update task status.' };
    const tasks = getRawTasks();
    const taskIdx = tasks.findIndex((t) => String(t.id) === String(taskId));
    if (taskIdx < 0) return { success: false, message: 'Task not found.' };
    const task = tasks[taskIdx];
    if (String(task.assignedToUserId) !== String(session.userId)) return { success: false, message: 'You can only update your own tasks.' };
    if (newStatus === 'IN_PROGRESS' && task.status !== 'ASSIGNED') return { success: false, message: 'Task must be in Assigned status to start.' };
    task.status = newStatus;
    setJson(TASKS_KEY, tasks);
    return { success: true };
  }

  async function resolveTask(taskId, resolution, volunteerNote) {
    const session = await getSession();
    if (!session || session.role !== 'VOLUNTEER') return { success: false, message: 'Only volunteers can resolve tasks.' };
    if (!['COMPLETED', 'REJECTED'].includes(resolution)) return { success: false, message: 'Invalid resolution.' };
    const tasks = getRawTasks();
    const taskIdx = tasks.findIndex((t) => String(t.id) === String(taskId));
    if (taskIdx < 0) return { success: false, message: 'Task not found.' };
    const task = tasks[taskIdx];
    if (String(task.assignedToUserId) !== String(session.userId)) return { success: false, message: 'You can only resolve your own tasks.' };
    if (!['ASSIGNED', 'IN_PROGRESS'].includes(task.status)) return { success: false, message: 'Task cannot be resolved from its current status.' };
    const now = Date.now();
    const dateLabel = formatDateLabel(new Date(now));
    task.status = resolution;
    task.volunteerNote = String(volunteerNote || '').trim() || null;
    task.completedAtMs = now;
    task.completedAtLabel = dateLabel;
    setJson(TASKS_KEY, tasks);
    const auditLog = getRawAuditLog();
    auditLog.push({
      id: makeId('al'),
      action: 'TASK_RESOLVED',
      volunteerUserId: session.userId,
      volunteerName: session.name,
      taskId: String(taskId),
      taskTitle: task.title,
      resolution,
      volunteerNote: task.volunteerNote,
      resolvedAtMs: now,
      resolvedAtLabel: dateLabel
    });
    setJson(AUDIT_LOG_KEY, auditLog);
    // Auto-resolve parent inquiry if all linked tasks are done
    const allTasks = getRawTasks();
    const inquiries = getRawInquiries();
    const inqIdx = inquiries.findIndex((i) => String(i.id) === String(task.inquiryId));
    if (inqIdx >= 0) {
      const inquiry = inquiries[inqIdx];
      const siblingTasks = allTasks.filter((t) => String(t.inquiryId) === String(inquiry.id));
      const allResolved = siblingTasks.length > 0 && siblingTasks.every((t) => ['COMPLETED', 'REJECTED'].includes(t.status));
      if (allResolved) {
        inquiry.status = 'RESOLVED';
        setJson(INQUIRIES_KEY, inquiries);
      }
    }
    return { success: true };
  }

  async function rejectInquiry(inquiryId, rejectionNote) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can reject inquiries.' };
    const inquiries = getRawInquiries();
    const inqIdx = inquiries.findIndex((i) => String(i.id) === String(inquiryId));
    if (inqIdx < 0) return { success: false, message: 'Inquiry not found.' };
    const inquiry = inquiries[inqIdx];
    if (inquiry.status === 'REJECTED') return { success: false, message: 'Inquiry is already rejected.' };
    const now = Date.now();
    const dateLabel = formatDateLabel(new Date(now));
    inquiry.status = 'REJECTED';
    inquiry.rejectionNote = String(rejectionNote || '').trim() || null;
    inquiry.rejectedAtMs = now;
    inquiry.rejectedAtLabel = dateLabel;
    inquiry.rejectedByAdminId = session.userId;
    inquiry.rejectedByAdminName = session.name;
    setJson(INQUIRIES_KEY, inquiries);
    const auditLog = getRawAuditLog();
    auditLog.push({
      id: makeId('al'),
      action: 'INQUIRY_REJECTED',
      adminUserId: session.userId,
      adminName: session.name,
      inquiryId: String(inquiryId),
      rejectionNote: inquiry.rejectionNote,
      createdAtMs: now,
      createdAtLabel: dateLabel
    });
    setJson(AUDIT_LOG_KEY, auditLog);
    return { success: true };
  }

  async function createStandaloneTask(payload) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can create tasks.' };
    const now = Date.now();
    const dateLabel = formatDateLabel(new Date(now));
    let eventTitle = null;
    if (payload.eventId) {
      const ev = getRawEvents().find((e) => String(e.id) === String(payload.eventId));
      eventTitle = ev ? ev.title : null;
    }
    const task = {
      id: makeId('task'),
      inquiryId: null,
      inquirySubject: null,
      eventId: payload.eventId || null,
      eventTitle,
      title: String(payload.title || '').trim(),
      description: String(payload.description || '').trim(),
      createdByAdminId: session.userId,
      createdByAdminName: session.name,
      status: 'UNASSIGNED',
      assignedToUserId: null,
      assignedToName: null,
      assignedAtMs: null,
      assignedAtLabel: null,
      assignedByUserId: null,
      assignedByName: null,
      volunteerNote: null,
      completedAtMs: null,
      completedAtLabel: null,
      archived: false,
      checklistItems: [],
      createdAtMs: now,
      createdAtLabel: dateLabel
    };
    const tasks = getRawTasks();
    tasks.push(task);
    setJson(TASKS_KEY, tasks);
    const auditLog = getRawAuditLog();
    auditLog.push({
      id: makeId('al'),
      action: 'TASK_CREATED',
      adminUserId: session.userId,
      adminName: session.name,
      taskId: task.id,
      taskTitle: task.title,
      inquiryId: null,
      eventId: task.eventId,
      createdAtMs: now,
      createdAtLabel: dateLabel
    });
    setJson(AUDIT_LOG_KEY, auditLog);
    return { success: true, taskId: task.id };
  }

  async function getWorkQueueData() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { inquiries: [], standaloneTasks: [] };
    const allTasks = getRawTasks().slice().sort((a, b) => a.createdAtMs - b.createdAtMs);
    const inquiries = getRawInquiries()
      .slice()
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .map((inq) => ({
        ...inq,
        tasks: allTasks.filter((t) => t.inquiryId && String(t.inquiryId) === String(inq.id))
      }));
    const standaloneTasks = allTasks.filter((t) => !t.inquiryId);
    return { inquiries, standaloneTasks };
  }

  async function deleteTask(taskId) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can delete tasks.' };
    let tasks = getRawTasks();
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return { success: false, message: 'Task not found.' };
    tasks = tasks.filter((t) => String(t.id) !== String(taskId));
    setJson(TASKS_KEY, tasks);
    // Remove from parent inquiry's taskIds if linked
    if (task.inquiryId) {
      const inquiries = getRawInquiries();
      const inq = inquiries.find((i) => String(i.id) === String(task.inquiryId));
      if (inq) {
        inq.taskIds = (inq.taskIds || []).filter((id) => String(id) !== String(taskId));
        setJson(INQUIRIES_KEY, inquiries);
      }
    }
    const now = Date.now();
    const auditLog = getRawAuditLog();
    auditLog.push({
      id: makeId('al'), action: 'TASK_DELETED',
      adminUserId: session.userId, adminName: session.name,
      taskId: String(taskId), taskTitle: task.title,
      createdAtMs: now, createdAtLabel: formatDateLabel(new Date(now))
    });
    setJson(AUDIT_LOG_KEY, auditLog);
    return { success: true };
  }

  async function archiveTask(taskId) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can archive tasks.' };
    const tasks = getRawTasks();
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return { success: false, message: 'Task not found.' };
    if (task.archived) return { success: false, message: 'Task is already archived.' };
    task.archived = true;
    setJson(TASKS_KEY, tasks);
    return { success: true };
  }

  async function unarchiveTask(taskId) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can unarchive tasks.' };
    const tasks = getRawTasks();
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return { success: false, message: 'Task not found.' };
    task.archived = false;
    setJson(TASKS_KEY, tasks);
    return { success: true };
  }

  async function addChecklistItem(taskId, text) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can edit task checklists.' };
    const tasks = getRawTasks();
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return { success: false, message: 'Task not found.' };
    if (!task.checklistItems) task.checklistItems = [];
    task.checklistItems.push({ id: makeId('cli'), text: String(text).trim(), done: false, doneAtMs: null, doneAtLabel: null });
    setJson(TASKS_KEY, tasks);
    return { success: true };
  }

  async function removeChecklistItem(taskId, itemId) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { success: false, message: 'Only administrators can edit task checklists.' };
    const tasks = getRawTasks();
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return { success: false, message: 'Task not found.' };
    task.checklistItems = (task.checklistItems || []).filter((i) => String(i.id) !== String(itemId));
    setJson(TASKS_KEY, tasks);
    return { success: true };
  }

  async function toggleChecklistItem(taskId, itemId) {
    const session = await getSession();
    if (!session || session.role !== 'VOLUNTEER') return { success: false, message: 'Only volunteers can check off task items.' };
    const tasks = getRawTasks();
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return { success: false, message: 'Task not found.' };
    if (String(task.assignedToUserId) !== String(session.userId)) return { success: false, message: 'You can only update your own tasks.' };
    const item = (task.checklistItems || []).find((i) => String(i.id) === String(itemId));
    if (!item) return { success: false, message: 'Checklist item not found.' };
    const now = Date.now();
    item.done = !item.done;
    item.doneAtMs = item.done ? now : null;
    item.doneAtLabel = item.done ? formatDateLabel(new Date(now)) : null;
    setJson(TASKS_KEY, tasks);
    return { success: true };
  }

  // ─── End Task Assignment ───────────────────────────────────────────────────

  initStores();

  return {
    ROLES,
    getSession,
    login,
    requireAuth,
    logout,
    clearLocalData,
    getUsers,
    getUserById,
    addUser,
    updateUser,
    removeUser,
    getParticipants,
    getParticipantById,
    getMyParticipantRecord,
    getLinkedParticipantsForCurrentUser,
    canGuardianManageParticipant,
    addParticipant,
    updateParticipant,
    removeParticipant,
    updateMyParticipantProfile,
    getVolunteerProfile,
    getVolunteerProfiles,
    saveVolunteerProfile,
    removeVolunteerProfile,
    getEvents,
    addEvent,
    updateEvent,
    removeEvent,
    getInterestedEventIds,
    getEventInterestParticipantIdsForGuardian,
    saveEventInterest,
    removeEventInterest,
    toggleEventInterest,
    getJobs,
    addJob,
    updateJob,
    removeJob,
    getInterestedJobIds,
    getMyJobInterestStatuses,
    toggleJobInterest,
    getPendingApprovals,
    decideApproval,
    getJobInterestSummary,
    getNewsletters,
    generateWeeklyNewsletter,
    getNewsletterDraft,
    saveNewsletterDraft,
    getNewsletterHistory,
    distributeNewsletter,
    BG_CHECK_STATUSES,
    BG_EXPIRY_OPTIONS,
    checkAndExpireBgRecords,
    getBgCheckRecord,
    getMyBgCheckRecord,
    submitBgCheckConsent,
    revokeBgCheckConsent,
    updateBgCheckStatus,
    getAllBgCheckRecords,
    getUrgentOpportunities,
    generateUrgentDraft,
    sendUrgentNotification,
    getUrgentNotificationHistory,
    getMyNotifications,
    getReadNotificationIds,
    markNotificationsRead,
    toggleNotificationRead,
    deleteMyNotification,
    getClearedVolunteers,
    submitInquiry,
    getAllInquiries,
    getMyInquiries,
    createTaskFromInquiry,
    getAllTasks,
    getMyAssignedTasks,
    assignTask,
    updateTaskStatus,
    resolveTask,
    rejectInquiry,
    createStandaloneTask,
    getWorkQueueData,
    deleteTask,
    archiveTask,
    unarchiveTask,
    addChecklistItem,
    removeChecklistItem,
    toggleChecklistItem
  };
})();
