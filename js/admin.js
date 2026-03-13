/**
 * admin.js — Kindred SPRC Admin Panel Module
 * Handles administrator workflows for users, participants, and events.
 * Depends on auth.js being loaded first (uses the global Auth namespace).
 * Only meaningful when an ADMIN session is active.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.getSession();
  if (!session || session.role !== 'ADMIN') return;

  // ── Role badge helper ─────────────────────────────────────────────────────

  const ROLE_BADGE = {
    ADMIN:       'bg-danger',
    VOLUNTEER:   'bg-info text-dark',
    PARTICIPANT: 'bg-success'
  };

  const ROLE_LABEL = {
    ADMIN:       'Administrator',
    VOLUNTEER:   'Volunteer',
    PARTICIPANT: 'Participant / Guardian'
  };

  const EVENT_CATEGORY_BADGE = {
    Social: 'badge-event-social',
    Educational: 'badge-event-educational',
    Vocational: 'badge-event-vocational'
  };

  // ── Sub-view helpers ──────────────────────────────────────────────────────

  function showParticipantsListView() {
    document.getElementById('view-participants-list').classList.remove('d-none');
    document.getElementById('view-participants-form').classList.add('d-none');
  }

  function showParticipantsFormView(isEditing = false) {
    document.getElementById('view-participants-list').classList.add('d-none');
    document.getElementById('view-participants-form').classList.remove('d-none');
    document.getElementById('participantFormTitle').textContent =
      isEditing ? 'Edit Participant' : 'New Participant';
  }

  function showUsersListView() {
    document.getElementById('view-users-list').classList.remove('d-none');
    document.getElementById('view-users-form').classList.add('d-none');
  }

  function showUsersFormView(isEditing = false) {
    document.getElementById('view-users-list').classList.add('d-none');
    document.getElementById('view-users-form').classList.remove('d-none');
    document.getElementById('userFormTitle').textContent =
      isEditing ? 'Edit User' : 'New User';
  }

  function showEventsListView() {
    document.getElementById('view-events-list').classList.remove('d-none');
    document.getElementById('view-events-form').classList.add('d-none');
  }

  function showEventsFormView(isEditing = false) {
    document.getElementById('view-events-list').classList.add('d-none');
    document.getElementById('view-events-form').classList.remove('d-none');
    document.getElementById('eventFormTitle').textContent =
      isEditing ? 'Edit Event' : 'New Event';
  }

  function showVolunteersListView() {
    document.getElementById('view-volunteers-list').classList.remove('d-none');
    document.getElementById('view-volunteers-form').classList.add('d-none');
  }

  function showVolunteersFormView(isEditing = false) {
    document.getElementById('view-volunteers-list').classList.add('d-none');
    document.getElementById('view-volunteers-form').classList.remove('d-none');
    document.getElementById('volunteerFormTitle').textContent =
      isEditing ? 'Edit Volunteer Profile' : 'New Volunteer Profile';
  }

  function showJobsListView() {
    document.getElementById('view-jobs-list').classList.remove('d-none');
    document.getElementById('view-jobs-form').classList.add('d-none');
  }

  function showJobsFormView(isEditing = false) {
    document.getElementById('view-jobs-list').classList.add('d-none');
    document.getElementById('view-jobs-form').classList.remove('d-none');
    document.getElementById('jobFormTitle').textContent =
      isEditing ? 'Edit Job Opportunity' : 'New Job Opportunity';
  }

  // ── Render users table ────────────────────────────────────────────────────

  async function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const users = await Auth.getUsers();
    const session = await Auth.getSession();

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted px-3">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const isSelf = session && session.email.toLowerCase() === u.email.toLowerCase();
      const canEdit = u.role === 'VOLUNTEER' || u.role === 'PARTICIPANT';
      const editBtn = canEdit
        ? `<button class="btn btn-outline-primary btn-sm me-1" data-user-edit-email="${escapeHtml(u.email)}">Edit</button>`
        : '';
      const deleteBtn = isSelf
        ? `<button class="btn btn-outline-secondary btn-sm" disabled title="You cannot delete your own account">Delete</button>`
        : `<button class="btn btn-outline-danger btn-sm" data-email="${escapeHtml(u.email)}">Delete</button>`;

      return `
        <tr>
          <td class="ps-3">${escapeHtml(u.name)}</td>
          <td class="text-muted small">${escapeHtml(u.email)}</td>
          <td>
            <span class="badge ${ROLE_BADGE[u.role] || 'bg-secondary'}">
              ${ROLE_LABEL[u.role] || escapeHtml(u.role)}
            </span>
          </td>
          <td class="text-muted small">${escapeHtml(u.dateAdded)}</td>
          <td class="pe-3" style="width: 1%; white-space: nowrap;">${editBtn}${deleteBtn}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-user-edit-email]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await startUserEdit(btn.dataset.userEditEmail);
      });
    });

    // Wire delete buttons via event delegation on the tbody.
    tbody.querySelectorAll('button[data-email]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const result = await Auth.removeUser(btn.dataset.email);
        if (result.success) {
          if (editingUserEmail && editingUserEmail.toLowerCase() === btn.dataset.email.toLowerCase()) {
            resetUserFormState();
          }
          await renderUsersTable();
        }
      });
    });
  }

  async function renderParticipantsTable() {
    const tbody = document.getElementById('participantsTableBody');
    if (!tbody) return;

    const participants = await Auth.getParticipants();
    if (participants.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted px-3">No participant records yet.</td></tr>';
      return;
    }

    tbody.innerHTML = participants.map(p => `
      <tr>
        <td class="ps-3">
          <div class="fw-semibold">${escapeHtml(p.fullName)}</div>
          <div class="text-muted small">Age ${escapeHtml(p.age)}</div>
        </td>
        <td>${escapeHtml(p.guardian)}</td>
        <td class="small text-muted">
          <div>${escapeHtml(p.contactEmail)}</div>
          <div>${escapeHtml(p.contactPhone)}</div>
        </td>
        <td class="small">
          <div class="fw-semibold">Needs</div>
          <div class="text-muted">${escapeHtml(p.specialNeeds)}</div>
          ${p.notes ? `<div class="mt-1"><span class="fw-semibold">Notes:</span> ${escapeHtml(p.notes)}</div>` : ''}
        </td>
        <td class="text-muted small">${escapeHtml(p.dateAdded)}</td>
        <td class="pe-3" style="width: 1%; white-space: nowrap;">
          <button class="btn btn-outline-primary btn-sm me-1" data-participant-edit-id="${escapeHtml(p.id)}">Edit</button>
          <button class="btn btn-outline-danger btn-sm" data-participant-id="${escapeHtml(p.id)}">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-participant-edit-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await startParticipantEdit(btn.dataset.participantEditId);
      });
    });

    tbody.querySelectorAll('button[data-participant-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const result = await Auth.removeParticipant(btn.dataset.participantId);
        if (result.success) {
          if (editingParticipantId && editingParticipantId === btn.dataset.participantId) {
            resetParticipantFormState();
          }
          await renderParticipantsTable();
        }
      });
    });
  }

  async function renderEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;

    const events = await Auth.getEvents();
    if (events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted px-3">No live events yet.</td></tr>';
      return;
    }

    tbody.innerHTML = events.map((event) => `
      <tr>
        <td class="ps-3">
          <div class="fw-semibold text-dark">${escapeHtml(event.title)}</div>
        </td>
        <td>
          <span class="badge ${EVENT_CATEGORY_BADGE[event.category] || 'bg-secondary'}">
            ${escapeHtml(event.category)}
          </span>
        </td>
        <td class="small text-muted">${escapeHtml(event.dateTimeLabel)}</td>
        <td class="small">${escapeHtml(event.location)}</td>
        <td class="small fw-semibold">${escapeHtml(event.cost)}</td>
        <td class="small text-muted">
          <div class="event-accommodations">${escapeHtml(event.accommodations)}</div>
        </td>
        <td class="text-muted small">${escapeHtml(event.dateAdded)}</td>
        <td class="pe-3" style="width: 1%; white-space: nowrap;">
          <button class="btn btn-outline-primary btn-sm me-1" data-event-edit-id="${escapeHtml(event.id)}">Edit</button>
          <button class="btn btn-outline-danger btn-sm" data-event-id="${escapeHtml(event.id)}">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-event-edit-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await startEventEdit(btn.dataset.eventEditId);
      });
    });

    tbody.querySelectorAll('button[data-event-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const result = await Auth.removeEvent(btn.dataset.eventId);
        if (result.success) {
          if (editingEventId && editingEventId === btn.dataset.eventId) {
            resetEventFormState();
          }
          showToast('Event removed from the live log.');
          await renderEventsTable();
        }
      });
    });
  }

  function tokenize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((part) => part.length > 2);
  }

  const INTEREST_CATEGORY_MAP = {
    Mentoring: ['Educational', 'Vocational'],
    'Educational Programs': ['Educational'],
    'Community Events': ['Social'],
    'Sports & Recreation': ['Social'],
    'Administrative Support': ['Vocational'],
    'Job Coaching': ['Vocational']
  };

  function computeVolunteerMatches(profile, events) {
    const rawInterests = Array.isArray(profile.interests) ? profile.interests : [];
    const normalizedInterests = rawInterests.map((interest) => String(interest).trim()).filter(Boolean);
    const interestTokens = normalizedInterests.flatMap((interest) => {
      const customInterest = interest.startsWith('Other:')
        ? interest.replace(/^Other:\s*/i, '')
        : interest;
      return tokenize(customInterest);
    });
    const categoryHints = normalizedInterests.flatMap((interest) => {
      if (interest.startsWith('Other:')) return [];
      return INTEREST_CATEGORY_MAP[interest] || [];
    });

    const scored = events
      .map((event) => {
        let score = 0;
        if (categoryHints.includes(event.category)) score += 3;

        const eventTokens = new Set(tokenize(`${event.title} ${event.location} ${event.accommodations}`));
        interestTokens.forEach((token) => {
          if (eventTokens.has(token)) score += 1;
        });

        return { event, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 3).map((entry) => entry.event);
  }

  async function renderVolunteersTable() {
    const tbody = document.getElementById('volunteerProfilesTableBody');
    if (!tbody) return;

    const [profiles, events] = await Promise.all([
      Auth.getVolunteerProfiles(),
      Auth.getEvents()
    ]);

    if (profiles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted px-3">No volunteer profiles yet.</td></tr>';
      return;
    }

    tbody.innerHTML = profiles.map((profile) => {
      const interestsMarkup = profile.interests.length
        ? escapeHtml(profile.interests.join(', '))
        : '<span class="text-muted">Not provided</span>';
      const availabilityMarkup = profile.availability
        ? escapeHtml(profile.availability)
        : '<span class="text-muted">Not provided</span>';

      const matchedEvents = computeVolunteerMatches(profile, events);
      const matchMarkup = matchedEvents.length
        ? `<div class="volunteer-match-list">${matchedEvents
            .map((event) => `<span class="volunteer-match-chip">${escapeHtml(event.title)}</span>`)
            .join('')}</div>`
        : '<span class="text-muted">No direct match yet</span>';

      return `
        <tr>
          <td class="ps-3">
            <div class="fw-semibold">${escapeHtml(profile.fullName)}</div>
          </td>
          <td class="small text-muted">
            <div>${escapeHtml(profile.email)}</div>
            <div>${escapeHtml(profile.phone)}</div>
          </td>
          <td class="small volunteer-list-text">${interestsMarkup}</td>
          <td class="small text-muted volunteer-list-text">${availabilityMarkup}</td>
          <td class="small">${matchMarkup}</td>
          <td class="small text-muted">${escapeHtml(profile.updatedAtLabel)}</td>
          <td class="pe-3" style="width: 1%; white-space: nowrap;">
            <button class="btn btn-outline-primary btn-sm me-1" data-volunteer-edit-email="${escapeHtml(profile.email)}">Edit</button>
            <button class="btn btn-outline-danger btn-sm" data-volunteer-email="${escapeHtml(profile.email)}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-volunteer-edit-email]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await startVolunteerEdit(btn.dataset.volunteerEditEmail);
      });
    });

    tbody.querySelectorAll('button[data-volunteer-email]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const result = await Auth.removeVolunteerProfile(btn.dataset.volunteerEmail);
        if (result.success) {
          if (editingVolunteerEmail && editingVolunteerEmail.toLowerCase() === btn.dataset.volunteerEmail.toLowerCase()) {
            resetVolunteerFormState();
          }
          showToast('Volunteer profile removed.');
          await renderVolunteersTable();
        }
      });
    });
  }

  async function renderJobsTable() {
    const tbody = document.getElementById('jobsTableBody');
    if (!tbody) return;

    const [jobs, interestSummary] = await Promise.all([
      Auth.getJobs(),
      Auth.getJobInterestSummary()
    ]);
    if (jobs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted px-3">No job opportunities logged yet.</td></tr>';
      return;
    }

    const JOB_TYPE_BADGE = {
      'Full-time': 'bg-success',
      'Part-time': 'bg-primary',
      'Casual':    'bg-warning text-dark',
      'Gig':       'bg-secondary'
    };

    tbody.innerHTML = jobs.map((job) => {
      const typeBadge = job.jobType
        ? `<span class="badge ${JOB_TYPE_BADGE[job.jobType] || 'bg-secondary'}">${escapeHtml(job.jobType)}</span>`
        : '<span class="text-muted small">—</span>';
      const salary = job.salary
        ? `<span class="fw-semibold">${escapeHtml(job.salary)}</span>`
        : '<span class="text-muted small">—</span>';
      const location = job.location
        ? escapeHtml(job.location)
        : '<span class="text-muted small">—</span>';
      const interestedParticipants = Array.isArray(interestSummary[job.id]) ? interestSummary[job.id] : [];
      const interestedMarkup = interestedParticipants.length
        ? `<div class="small">
            <div class="fw-semibold text-success mb-1">${interestedParticipants.length} interested</div>
            ${interestedParticipants
              .map((participant) => `<div class="text-muted">${escapeHtml(participant.name)} <span class="text-secondary">(${escapeHtml(participant.email)})</span></div>`)
              .join('')}
          </div>`
        : '<span class="text-muted small">No interest yet</span>';

      return `
        <tr>
          <td class="ps-3">
            <div class="fw-semibold text-dark">${escapeHtml(job.title)}</div>
          </td>
          <td>${escapeHtml(job.employer)}</td>
          <td class="small">${location}</td>
          <td>${typeBadge}</td>
          <td class="small">${salary}</td>
          <td class="small text-muted" style="max-width: 260px;">
            <div class="event-accommodations">${escapeHtml(job.requirements)}</div>
          </td>
          <td style="max-width: 300px;">${interestedMarkup}</td>
          <td class="text-muted small">${escapeHtml(job.dateAdded)}</td>
          <td class="pe-3" style="width: 1%; white-space: nowrap;">
            <button class="btn btn-outline-primary btn-sm me-1" data-job-edit-id="${escapeHtml(job.id)}">Edit</button>
            <button class="btn btn-outline-danger btn-sm" data-job-id="${escapeHtml(job.id)}">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-job-edit-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await startJobEdit(btn.dataset.jobEditId);
      });
    });

    tbody.querySelectorAll('button[data-job-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const result = await Auth.removeJob(btn.dataset.jobId);
        if (result.success) {
          if (editingJobId && editingJobId === btn.dataset.jobId) {
            resetJobFormState();
          }
          showToast('Job opportunity removed.');
          await renderJobsTable();
        }
      });
    });
  }


  // Prevent XSS when injecting user-supplied strings into innerHTML.
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Confirmation modals ───────────────────────────────────────────────────

  // User account creation modal (existing)
  const confirmModalEl = document.getElementById('confirmCreateModal');
  const confirmModal   = confirmModalEl ? bootstrap.Modal.getOrCreateInstance(confirmModalEl) : null;
  const confirmBtn     = document.getElementById('confirmCreateBtn');

  // Holds validated form data while the modal is open.
  let pendingUser = null;

  // Participant record confirmation modal (new)
  const confirmParticipantModalEl = document.getElementById('confirmSaveParticipantModal');
  const confirmParticipantModal   = confirmParticipantModalEl
    ? bootstrap.Modal.getOrCreateInstance(confirmParticipantModalEl) : null;
  const confirmParticipantBtn = document.getElementById('confirmSaveParticipantBtn');

  let pendingParticipant = null;

  // Populate the user modal summary panel.
  function populateModalSummary({ name, email, role }) {
    document.getElementById('modalSummaryName').textContent  = name.trim();
    document.getElementById('modalSummaryEmail').textContent = email.trim().toLowerCase();

    const roleName   = ROLE_LABEL[role] || role;
    const badgeCls   = ROLE_BADGE[role] || 'bg-secondary';
    const badgeEl    = document.getElementById('modalSummaryRole');
    badgeEl.textContent = roleName;
    badgeEl.className   = `badge ${badgeCls}`;

    document.getElementById('modalSummaryEmailTarget').textContent = email.trim().toLowerCase();
  }

  // Populate the participant modal summary panel.
  function populateParticipantModalSummary({ firstName, lastName, age, guardian, contactEmail, contactPhone }) {
    document.getElementById('pModalName').textContent    = `${firstName} ${lastName}`.trim();
    document.getElementById('pModalAge').textContent     = age;
    document.getElementById('pModalGuardian').textContent = guardian;
    document.getElementById('pModalContact').textContent  = `${contactEmail} · ${contactPhone}`;
  }

  // ── Register form handler ─────────────────────────────────────────────────

  const registerForm  = document.getElementById('registerForm');
  const registerError = document.getElementById('registerError');
  const toastEl       = document.getElementById('adminToast');
  const toastMsgEl    = document.getElementById('adminToastMsg');
  const userSubmitBtn = document.getElementById('userSubmitBtn');
  const regFirstNameEl = document.getElementById('regFirstName');
  const regLastNameEl = document.getElementById('regLastName');
  const regEmailEl = document.getElementById('regEmail');
  const regPasswordEl = document.getElementById('regPassword');
  const regRoleEl = document.getElementById('regRole');
  const participantForm = document.getElementById('participantForm');
  const participantError = document.getElementById('participantError');
  const participantSubmitBtn = document.getElementById('participantSubmitBtn');
  const volunteerAdminForm = document.getElementById('volunteerAdminForm');
  const volunteerAdminError = document.getElementById('volunteerAdminError');
  const volunteerAdminSubmitBtn = document.getElementById('volunteerAdminSubmitBtn');
  const adminVolFirstNameEl = document.getElementById('adminVolFirstName');
  const adminVolLastNameEl = document.getElementById('adminVolLastName');
  const adminVolPhoneEl = document.getElementById('adminVolPhone');
  const adminVolEmailEl = document.getElementById('adminVolEmail');
  const adminVolAvailabilityEl = document.getElementById('adminVolAvailability');
  const adminVolInterestsFeedbackEl = document.getElementById('adminVolInterestsFeedback');
  const adminVolInterestsGroupEl = document.getElementById('adminVolInterestsGroup');
  const adminVolInterestOtherEl = document.getElementById('adminVolInterestOther');
  const adminVolInterestOtherTextEl = document.getElementById('adminVolInterestOtherText');
  const adminVolInterestCheckboxEls = () => Array.from(document.querySelectorAll('input[name="adminVolInterests"]'));
  const eventForm = document.getElementById('eventForm');
  const eventError = document.getElementById('eventError');
  const eventSubmitBtn = document.getElementById('eventSubmitBtn');
  let editingUserEmail = null;
  let editingParticipantId = null;
  let editingVolunteerEmail = null;
  let editingEventId = null;
  let editingJobId = null;

  const jobForm = document.getElementById('jobForm');
  const jobError = document.getElementById('jobError');
  const jobSubmitBtn = document.getElementById('jobSubmitBtn');

  function showToast(message) {
    if (!toastEl || !toastMsgEl) return;
    toastMsgEl.textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
  }

  function splitFullName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  function resetUserFormState() {
    if (!registerForm) return;
    registerForm.reset();
    registerForm.classList.remove('was-validated');
    registerError.classList.add('d-none');
    editingUserEmail = null;
    regPasswordEl.required = true;
    regPasswordEl.placeholder = 'Temporary password';
    if (userSubmitBtn) userSubmitBtn.textContent = 'Create Account';
  }

  async function startUserEdit(userEmail) {
    const users = await Auth.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === String(userEmail).toLowerCase());
    if (!user || user.role === 'ADMIN') return;

    const nameParts = splitFullName(user.name);
    regFirstNameEl.value = nameParts.firstName;
    regLastNameEl.value = nameParts.lastName;
    regEmailEl.value = user.email;
    regRoleEl.value = user.role;
    regPasswordEl.value = '';
    regPasswordEl.required = false;
    regPasswordEl.placeholder = 'Leave blank to keep current password';

    editingUserEmail = user.email;
    registerError.classList.add('d-none');
    registerForm.classList.remove('was-validated');
    if (userSubmitBtn) userSubmitBtn.textContent = 'Update Account';
    showUsersFormView(true);
  }

  function resetParticipantFormState() {
    if (!participantForm) return;
    participantForm.reset();
    participantForm.classList.remove('was-validated');
    participantError.classList.add('d-none');
    editingParticipantId = null;
    if (participantSubmitBtn) participantSubmitBtn.textContent = 'Save Participant Record';
  }

  function setAdminVolunteerOtherInterestInputState() {
    const enabled = Boolean(adminVolInterestOtherEl?.checked);
    if (!adminVolInterestOtherTextEl) return;
    adminVolInterestOtherTextEl.disabled = !enabled;
    if (!enabled) adminVolInterestOtherTextEl.value = '';
  }

  function getAdminSelectedVolunteerInterests() {
    const values = adminVolInterestCheckboxEls()
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
    if (values.includes('Other')) {
      const customInterest = String(adminVolInterestOtherTextEl?.value || '').trim();
      if (customInterest) {
        return values.map((value) => (value === 'Other' ? `Other: ${customInterest}` : value));
      }
    }
    return values;
  }

  function setAdminSelectedVolunteerInterests(interests) {
    const list = Array.isArray(interests)
      ? interests
      : String(interests || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    let otherText = '';
    adminVolInterestCheckboxEls().forEach((checkbox) => {
      const hasCustomOther = list.some((value) => value.startsWith('Other:'));
      if (checkbox.value === 'Other') {
        checkbox.checked = list.includes('Other') || hasCustomOther;
        if (hasCustomOther) {
          const otherValue = list.find((value) => value.startsWith('Other:')) || '';
          otherText = String(otherValue).replace(/^Other:\s*/i, '').trim();
        }
      } else {
        checkbox.checked = list.includes(checkbox.value);
      }
    });

    setAdminVolunteerOtherInterestInputState();
    if (otherText && adminVolInterestOtherTextEl) {
      adminVolInterestOtherTextEl.value = otherText;
    }
  }

  function validateAdminVolunteerInterests() {
    const selected = getAdminSelectedVolunteerInterests();
    if (selected.length === 0) {
      adminVolInterestsGroupEl?.classList.add('border-danger');
      adminVolInterestsFeedbackEl?.classList.remove('d-none');
      return false;
    }
    adminVolInterestsGroupEl?.classList.remove('border-danger');
    adminVolInterestsFeedbackEl?.classList.add('d-none');
    return true;
  }

  function resetVolunteerFormState() {
    if (!volunteerAdminForm) return;
    volunteerAdminForm.reset();
    volunteerAdminForm.classList.remove('was-validated');
    volunteerAdminError.classList.add('d-none');
    adminVolInterestsGroupEl?.classList.remove('border-danger');
    adminVolInterestsFeedbackEl?.classList.add('d-none');
    editingVolunteerEmail = null;
    if (volunteerAdminSubmitBtn) volunteerAdminSubmitBtn.textContent = 'Save Volunteer Profile';
    setAdminVolunteerOtherInterestInputState();
  }

  function resetEventFormState() {
    if (!eventForm) return;
    eventForm.reset();
    eventForm.classList.remove('was-validated');
    eventError.classList.add('d-none');
    editingEventId = null;
    if (eventSubmitBtn) eventSubmitBtn.textContent = 'Publish Event';
  }

  function resetJobFormState() {
    if (!jobForm) return;
    jobForm.reset();
    jobForm.classList.remove('was-validated');
    jobError.classList.add('d-none');
    editingJobId = null;
    if (jobSubmitBtn) jobSubmitBtn.textContent = 'Save Opportunity';
  }

  async function startParticipantEdit(participantId) {
    const participants = await Auth.getParticipants();
    const participant = participants.find((p) => String(p.id) === String(participantId));
    if (!participant || !participantForm) return;

    document.getElementById('participantFirstName').value = participant.firstName || '';
    document.getElementById('participantLastName').value = participant.lastName || '';
    document.getElementById('participantAge').value = participant.age || '';
    document.getElementById('participantGuardian').value = participant.guardian || '';
    document.getElementById('participantEmail').value = participant.contactEmail || '';
    document.getElementById('participantPhone').value = participant.contactPhone || '';
    document.getElementById('participantSpecialNeeds').value = participant.specialNeeds || '';
    document.getElementById('participantNotes').value = participant.notes || '';

    editingParticipantId = participant.id;
    participantError.classList.add('d-none');
    participantForm.classList.remove('was-validated');
    if (participantSubmitBtn) participantSubmitBtn.textContent = 'Update Participant Record';
    showParticipantsFormView(true);
  }

  async function startVolunteerEdit(volunteerEmail) {
    const profiles = await Auth.getVolunteerProfiles();
    const profile = profiles.find((item) => item.email.toLowerCase() === String(volunteerEmail).toLowerCase());
    if (!profile || !volunteerAdminForm) return;

    adminVolFirstNameEl.value = profile.firstName || '';
    adminVolLastNameEl.value = profile.lastName || '';
    adminVolPhoneEl.value = profile.phone || '';
    adminVolEmailEl.value = profile.email || '';
    adminVolAvailabilityEl.value = profile.availability || '';
    setAdminSelectedVolunteerInterests(profile.interests);

    editingVolunteerEmail = profile.email;
    volunteerAdminError.classList.add('d-none');
    volunteerAdminForm.classList.remove('was-validated');
    if (volunteerAdminSubmitBtn) volunteerAdminSubmitBtn.textContent = 'Update Volunteer Profile';
    showVolunteersFormView(true);
  }

  async function startEventEdit(eventId) {
    const events = await Auth.getEvents();
    const event = events.find((item) => String(item.id) === String(eventId));
    if (!event || !eventForm) return;

    document.getElementById('eventTitle').value = event.title || '';
    document.getElementById('eventCategory').value = event.category || '';
    document.getElementById('eventDateTime').value = event.dateTime || '';
    document.getElementById('eventLocation').value = event.location || '';
    document.getElementById('eventCost').value = event.cost || '';
    document.getElementById('eventAccommodations').value = event.accommodations || '';

    editingEventId = event.id;
    eventError.classList.add('d-none');
    eventForm.classList.remove('was-validated');
    if (eventSubmitBtn) eventSubmitBtn.textContent = 'Update Event';
    showEventsFormView(true);
  }

  async function startJobEdit(jobId) {
    const jobs = await Auth.getJobs();
    const job = jobs.find((item) => String(item.id) === String(jobId));
    if (!job || !jobForm) return;

    document.getElementById('jobTitle').value = job.title || '';
    document.getElementById('jobEmployer').value = job.employer || '';
    document.getElementById('jobLocation').value = job.location || '';
    document.getElementById('jobType').value = job.jobType || '';
    document.getElementById('jobSalary').value = job.salary || '';
    document.getElementById('jobRequirements').value = job.requirements || '';

    editingJobId = job.id;
    jobError.classList.add('d-none');
    jobForm.classList.remove('was-validated');
    if (jobSubmitBtn) jobSubmitBtn.textContent = 'Update Opportunity';
    showJobsFormView(true);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const form = this;
      form.classList.add('was-validated');

      // Field-level HTML5 validation first.
      if (!form.checkValidity()) return;

      const fullName = `${regFirstNameEl.value} ${regLastNameEl.value}`.trim();
      const payload = {
        name: fullName,
        email: regEmailEl.value,
        password: regPasswordEl.value,
        role: regRoleEl.value
      };

      if (editingUserEmail) {
        const result = await Auth.updateUser(editingUserEmail, payload);
        if (result.success) {
          resetUserFormState();
          showToast(`Success: Account for ${fullName} updated.`);
          await renderUsersTable();
          showUsersListView();
        } else {
          registerError.textContent = result.message;
          registerError.classList.remove('d-none');
        }
        return;
      }

      // Create mode: open confirmation modal before persisting.
      pendingUser = payload;
      populateModalSummary(pendingUser);
      confirmModal.show();
    });

    // Hide the error banner when the user starts correcting the form.
    registerForm.addEventListener('input', () => {
      registerError.classList.add('d-none');
    });
  }

  if (participantForm) {
    participantForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const form = this;
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;

      const payload = {
        firstName: document.getElementById('participantFirstName').value,
        lastName: document.getElementById('participantLastName').value,
        age: document.getElementById('participantAge').value,
        guardian: document.getElementById('participantGuardian').value,
        contactEmail: document.getElementById('participantEmail').value,
        contactPhone: document.getElementById('participantPhone').value,
        specialNeeds: document.getElementById('participantSpecialNeeds').value,
        notes: document.getElementById('participantNotes').value
      };

      if (editingParticipantId) {
        // Edit mode: update directly, no modal.
        const resolved = await Auth.updateParticipant(editingParticipantId, payload);
        if (resolved.success) {
          resetParticipantFormState();
          showToast('Participant record updated successfully.');
          await renderParticipantsTable();
          showParticipantsListView();
        } else {
          participantError.textContent = resolved.message;
          participantError.classList.remove('d-none');
        }
        return;
      }

      // Create mode: show confirmation modal before saving.
      pendingParticipant = payload;
      populateParticipantModalSummary(pendingParticipant);
      confirmParticipantModal.show();
    });

    participantForm.addEventListener('input', () => {
      participantError.classList.add('d-none');
    });
  }

  if (volunteerAdminForm) {
    adminVolInterestOtherEl?.addEventListener('change', () => {
      setAdminVolunteerOtherInterestInputState();
      volunteerAdminError.classList.add('d-none');
      validateAdminVolunteerInterests();
    });

    adminVolInterestCheckboxEls().forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        volunteerAdminError.classList.add('d-none');
        validateAdminVolunteerInterests();
      });
    });

    volunteerAdminForm.addEventListener('input', () => {
      volunteerAdminError.classList.add('d-none');
      adminVolInterestsGroupEl?.classList.remove('border-danger');
      adminVolInterestsFeedbackEl?.classList.add('d-none');
    });

    volunteerAdminForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const form = this;
      form.classList.add('was-validated');
      const interestsValid = validateAdminVolunteerInterests();
      if (!form.checkValidity() || !interestsValid) return;

      const payload = {
        firstName: adminVolFirstNameEl.value,
        lastName: adminVolLastNameEl.value,
        phone: adminVolPhoneEl.value,
        email: adminVolEmailEl.value,
        interests: getAdminSelectedVolunteerInterests(),
        availability: adminVolAvailabilityEl.value
      };

      const result = await Auth.saveVolunteerProfile(payload);
      if (result.success) {
        const wasEditingVolunteer = Boolean(editingVolunteerEmail);
        resetVolunteerFormState();
        showToast(
          wasEditingVolunteer
            ? 'Volunteer profile updated successfully.'
            : 'Volunteer profile saved successfully.'
        );
        await renderVolunteersTable();
        showVolunteersListView();
      } else {
        volunteerAdminError.textContent = result.message || 'Unable to save volunteer profile.';
        volunteerAdminError.classList.remove('d-none');
      }
    });
  }

  if (eventForm) {
    eventForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const form = this;
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;

      const payload = {
        title: document.getElementById('eventTitle').value,
        category: document.getElementById('eventCategory').value,
        dateTime: document.getElementById('eventDateTime').value,
        location: document.getElementById('eventLocation').value,
        cost: document.getElementById('eventCost').value,
        accommodations: document.getElementById('eventAccommodations').value
      };

      const result = editingEventId
        ? await Auth.updateEvent(editingEventId, payload)
        : await Auth.addEvent(payload);
      const wasEditingEvent = Boolean(editingEventId);

      if (result.success) {
        resetEventFormState();
        showToast(
          wasEditingEvent
            ? 'Event updated and remains live for families.'
            : `"${payload.title.trim()}" is now live for families to view.`
        );
        await renderEventsTable();
        showEventsListView();
      } else {
        eventError.textContent = result.message;
        eventError.classList.remove('d-none');
      }
    });

    eventForm.addEventListener('input', () => {
      eventError.classList.add('d-none');
    });
  }

  if (jobForm) {
    jobForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const form = this;
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;

      const employer = document.getElementById('jobEmployer').value.trim();
      const payload = {
        title: document.getElementById('jobTitle').value,
        employer,
        location: document.getElementById('jobLocation').value,
        jobType: document.getElementById('jobType').value,
        salary: document.getElementById('jobSalary').value,
        requirements: document.getElementById('jobRequirements').value
      };

      const result = editingJobId
        ? await Auth.updateJob(editingJobId, payload)
        : await Auth.addJob(payload);
      const wasEditingJob = Boolean(editingJobId);

      if (result.success) {
        resetJobFormState();
        showToast(
          wasEditingJob
            ? `Job opportunity for ${employer} updated successfully.`
            : `Job opportunity for ${employer} successfully logged and visible to participants.`
        );
        await renderJobsTable();
        showJobsListView();
      } else {
        jobError.textContent = result.message;
        jobError.classList.remove('d-none');
      }
    });

    jobForm.addEventListener('input', () => {
      jobError.classList.add('d-none');
    });
  }

  setAdminVolunteerOtherInterestInputState();

  // ── Confirm button (user account creation modal) ──────────────────────────

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      if (!pendingUser) return;

      const result = await Auth.addUser(pendingUser);

      confirmModal.hide();

      if (result.success) {
        // Reset form state.
        resetUserFormState();

        // Show success toast.
        const roleName = ROLE_LABEL[pendingUser.role] || pendingUser.role;
        showToast(`Success: Account for ${pendingUser.name.trim()} created as ${roleName}.`);

        // Refresh the users table and return to the list.
        await renderUsersTable();
        showUsersListView();

      } else {
        // Duplicate email — surface the error on the form (modal is already closing).
        registerError.textContent = result.message;
        registerError.classList.remove('d-none');
      }

      pendingUser = null;
    });
  }

  // Clear pending state if the modal is dismissed via Cancel or the × button.
  if (confirmModalEl) {
    confirmModalEl.addEventListener('hidden.bs.modal', () => {
      pendingUser = null;
    });
  }

  // ── Confirm button (participant record creation modal) ────────────────────

  if (confirmParticipantBtn) {
    confirmParticipantBtn.addEventListener('click', async () => {
      if (!pendingParticipant) return;

      const result = await Auth.addParticipant(pendingParticipant);

      confirmParticipantModal.hide();

      if (result.success) {
        resetParticipantFormState();
        showToast('Participant record saved successfully.');
        await renderParticipantsTable();
        showParticipantsListView();
      } else {
        participantError.textContent = result.message;
        participantError.classList.remove('d-none');
      }

      pendingParticipant = null;
    });
  }

  if (confirmParticipantModalEl) {
    confirmParticipantModalEl.addEventListener('hidden.bs.modal', () => {
      pendingParticipant = null;
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  await renderUsersTable();
  await renderParticipantsTable();
  await renderVolunteersTable();
  await renderEventsTable();
  await renderJobsTable();

  // Wire "New" buttons to reset the form and show the form sub-view.
  document.getElementById('newParticipantBtn')?.addEventListener('click', () => {
    resetParticipantFormState();
    showParticipantsFormView(false);
  });

  document.getElementById('backToParticipantsBtn')?.addEventListener('click', () => {
    resetParticipantFormState();
    showParticipantsListView();
  });

  document.getElementById('newEventBtn')?.addEventListener('click', () => {
    resetEventFormState();
    showEventsFormView(false);
  });

  document.getElementById('backToEventsBtn')?.addEventListener('click', () => {
    resetEventFormState();
    showEventsListView();
  });

  document.getElementById('newVolunteerBtn')?.addEventListener('click', () => {
    resetVolunteerFormState();
    showVolunteersFormView(false);
  });

  document.getElementById('backToVolunteersBtn')?.addEventListener('click', () => {
    resetVolunteerFormState();
    showVolunteersListView();
  });

  document.getElementById('newJobBtn')?.addEventListener('click', () => {
    resetJobFormState();
    showJobsFormView(false);
  });

  document.getElementById('backToJobsBtn')?.addEventListener('click', () => {
    resetJobFormState();
    showJobsListView();
  });

  document.getElementById('newUserBtn')?.addEventListener('click', () => {
    resetUserFormState();
    showUsersFormView(false);
  });

  document.getElementById('backToUsersBtn')?.addEventListener('click', () => {
    resetUserFormState();
    showUsersListView();
  });

});
