/**
 * admin.js — Kindred SPRC Admin Panel Module
 * Handles administrator workflows for users, participants, volunteers,
 * events, jobs, and communications.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.getSession();
  if (!session || session.role !== 'ADMIN') return;

  const ROLE_BADGE = {
    ADMIN: 'bg-danger',
    GUARDIAN: 'bg-primary',
    PARTICIPANT: 'bg-success',
    VOLUNTEER: 'bg-info text-dark'
  };

  const ROLE_LABEL = {
    ADMIN: 'Administrator',
    GUARDIAN: 'Guardian',
    PARTICIPANT: 'Participant',
    VOLUNTEER: 'Volunteer'
  };

  function canonicalRole(role) {
    const normalized = String(role || '').trim().toUpperCase();
    if (normalized === 'PARTICIPANT / GUARDIAN') return 'GUARDIAN';
    return ROLE_LABEL[normalized] ? normalized : normalized;
  }

  const EVENT_CATEGORY_BADGE = {
    Social: 'badge-event-social',
    Educational: 'badge-event-educational',
    Vocational: 'badge-event-vocational'
  };

  const registerForm = document.getElementById('registerForm');
  const registerError = document.getElementById('registerError');
  const participantForm = document.getElementById('participantForm');
  const participantError = document.getElementById('participantError');
  const volunteerAdminForm = document.getElementById('volunteerAdminForm');
  const volunteerAdminError = document.getElementById('volunteerAdminError');
  const eventForm = document.getElementById('eventForm');
  const eventError = document.getElementById('eventError');
  const jobForm = document.getElementById('jobForm');
  const jobError = document.getElementById('jobError');
  const newsletterForm = document.getElementById('newsletterForm');
  const newsletterError = document.getElementById('newsletterError');
  const newsletterSuccess = document.getElementById('newsletterSuccess');
  const toastEl = document.getElementById('adminToast');
  const toastMsgEl = document.getElementById('adminToastMsg');
  const confirmModalEl = document.getElementById('confirmCreateModal');
  const confirmModal = confirmModalEl ? bootstrap.Modal.getOrCreateInstance(confirmModalEl) : null;
  const confirmBtn = document.getElementById('confirmCreateBtn');
  const confirmParticipantModalEl = document.getElementById('confirmSaveParticipantModal');
  const confirmParticipantModal = confirmParticipantModalEl ? bootstrap.Modal.getOrCreateInstance(confirmParticipantModalEl) : null;
  const confirmParticipantBtn = document.getElementById('confirmSaveParticipantBtn');

  let editingUserEmail = null;
  let editingParticipantId = null;
  let editingVolunteerUserId = null;
  let editingEventId = null;
  let editingJobId = null;
  let eventsEditOrigin = null; // 'urgent-notifications' when editing from dispatcher
  let jobsEditOrigin = null;
  let participantsViewOrigin = null; // section to return to when closing participant form
  let pendingUser = null;
  let pendingParticipant = null;

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message) {
    if (!toastEl || !toastMsgEl) return;
    toastMsgEl.textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
  }

  function splitFullName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  function getSelectedValues(selectEl) {
    return Array.from(selectEl?.selectedOptions || []).map((option) => option.value);
  }

  function toggleInlineParticipantUserFields() {
    const enabled = Boolean(document.getElementById('participantCreateUserToggle')?.checked);
    const select = document.getElementById('participantUserId');
    const email = document.getElementById('participantNewUserEmail');
    const password = document.getElementById('participantNewUserPassword');
    document.getElementById('participantNewUserEmailWrap')?.classList.toggle('d-none', !enabled);
    document.getElementById('participantNewUserPasswordWrap')?.classList.toggle('d-none', !enabled);
    if (select) {
      select.disabled = enabled;
      select.required = !enabled;
      if (enabled) select.value = '';
    }
    if (email) email.required = enabled;
    if (password) password.required = enabled;
  }

  function toggleInlineVolunteerUserFields() {
    const enabled = Boolean(document.getElementById('adminVolCreateUserToggle')?.checked);
    const select = document.getElementById('adminVolUserId');
    const email = document.getElementById('adminVolNewUserEmail');
    const password = document.getElementById('adminVolNewUserPassword');
    document.getElementById('adminVolNewUserEmailWrap')?.classList.toggle('d-none', !enabled);
    document.getElementById('adminVolNewUserPasswordWrap')?.classList.toggle('d-none', !enabled);
    if (select) {
      select.disabled = enabled;
      select.required = !enabled;
      if (enabled) select.value = '';
    }
    if (email) email.required = enabled;
    if (password) password.required = enabled;
  }

  function syncUserLinkVisibility() {
    const role = canonicalRole(document.getElementById('regRole')?.value);
    document.getElementById('userParticipantLinkWrap')?.classList.toggle('d-none', role !== 'PARTICIPANT');
    document.getElementById('userVolunteerLinkWrap')?.classList.toggle('d-none', role !== 'VOLUNTEER');
    if (role !== 'PARTICIPANT') document.getElementById('userParticipantLinkId').value = '';
    if (role !== 'VOLUNTEER') document.getElementById('userVolunteerLinkId').value = '';
  }

  function populateModalSummary({ name, email, role }) {
    document.getElementById('modalSummaryName').textContent = name.trim();
    document.getElementById('modalSummaryEmail').textContent = email.trim().toLowerCase();
    const roleName = ROLE_LABEL[role] || role;
    const badgeCls = ROLE_BADGE[role] || 'bg-secondary';
    const badgeEl = document.getElementById('modalSummaryRole');
    badgeEl.textContent = roleName;
    badgeEl.className = `badge ${badgeCls}`;
    document.getElementById('modalSummaryEmailTarget').textContent = email.trim().toLowerCase();
  }

  async function populateParticipantModalSummary(payload) {
    const participantUser = await Auth.getUserById(payload.participantUserId);
    const users = await Auth.getUsers();
    const guardians = users.filter((user) => payload.guardianUserIds.includes(user.id));
    document.getElementById('pModalName').textContent = `${payload.firstName} ${payload.lastName}`.trim();
    document.getElementById('pModalAge').textContent = payload.age;
    document.getElementById('pModalGuardian').textContent = guardians.map((guardian) => guardian.name).join(', ') || '—';
    document.getElementById('pModalContact').textContent = `${payload.contactEmail} · ${payload.contactPhone}`;
    if (participantUser) {
      document.getElementById('pModalName').textContent += ` (${participantUser.email})`;
    }
  }

  function setFormFieldsDisabled(formId, disabled) {
    document.getElementById(formId).querySelectorAll('input, select, textarea').forEach((el) => {
      el.disabled = disabled;
    });
  }

  function showParticipantsListView() {
    document.getElementById('view-participants-list').classList.remove('d-none');
    document.getElementById('view-participants-form').classList.add('d-none');
  }

  function showParticipantsFormView(isEditing = false, viewMode = false) {
    document.getElementById('view-participants-list').classList.add('d-none');
    document.getElementById('view-participants-form').classList.remove('d-none');
    document.getElementById('participantFormTitle').textContent = viewMode ? 'Participant Details' : (isEditing ? 'Edit Participant' : 'New Participant');
    setFormFieldsDisabled('participantForm', viewMode);
    document.getElementById('participantSubmitBtn').classList.toggle('d-none', viewMode);
    document.getElementById('participantFormEditBtn').classList.toggle('d-none', !viewMode);
  }

  function showUsersListView() {
    document.getElementById('view-users-list').classList.remove('d-none');
    document.getElementById('view-users-form').classList.add('d-none');
  }

  function showUsersFormView(isEditing = false) {
    document.getElementById('view-users-list').classList.add('d-none');
    document.getElementById('view-users-form').classList.remove('d-none');
    document.getElementById('userFormTitle').textContent = isEditing ? 'Edit User' : 'New User';
  }

  function showVolunteersListView() {
    document.getElementById('view-volunteers-list').classList.remove('d-none');
    document.getElementById('view-volunteers-form').classList.add('d-none');
  }

  function showVolunteersFormView(isEditing = false, viewMode = false) {
    document.getElementById('view-volunteers-list').classList.add('d-none');
    document.getElementById('view-volunteers-form').classList.remove('d-none');
    document.getElementById('volunteerFormTitle').textContent = viewMode ? 'Volunteer Details' : (isEditing ? 'Edit Volunteer Profile' : 'New Volunteer Profile');
    setFormFieldsDisabled('volunteerAdminForm', viewMode);
    document.getElementById('volunteerAdminSubmitBtn').classList.toggle('d-none', viewMode);
    document.getElementById('volunteerFormEditBtn').classList.toggle('d-none', !viewMode);
  }

  function showEventsListView() {
    document.getElementById('view-events-list').classList.remove('d-none');
    document.getElementById('view-events-form').classList.add('d-none');
  }

  function showEventsFormView(isEditing = false, viewMode = false) {
    document.getElementById('view-events-list').classList.add('d-none');
    document.getElementById('view-events-form').classList.remove('d-none');
    document.getElementById('eventFormTitle').textContent = viewMode ? 'Event Details' : (isEditing ? 'Edit Event' : 'New Event');
    setFormFieldsDisabled('eventForm', viewMode);
    document.getElementById('eventSubmitBtn').classList.toggle('d-none', viewMode);
    document.getElementById('eventFormEditBtn').classList.toggle('d-none', !viewMode);
  }

  function showJobsListView() {
    document.getElementById('view-jobs-list').classList.remove('d-none');
    document.getElementById('view-jobs-form').classList.add('d-none');
  }

  function showJobsFormView(isEditing = false, viewMode = false) {
    document.getElementById('view-jobs-list').classList.add('d-none');
    document.getElementById('view-jobs-form').classList.remove('d-none');
    document.getElementById('jobFormTitle').textContent = viewMode ? 'Job Details' : (isEditing ? 'Edit Job Opportunity' : 'New Job Opportunity');
    setFormFieldsDisabled('jobForm', viewMode);
    document.getElementById('jobSubmitBtn').classList.toggle('d-none', viewMode);
    document.getElementById('jobFormEditBtn').classList.toggle('d-none', !viewMode);
  }

  async function populateLinkedUserOptions() {
    const [users, participants, volunteerProfiles] = await Promise.all([
      Auth.getUsers(),
      Auth.getParticipants(),
      Auth.getVolunteerProfiles()
    ]);
    const participantUserSelect = document.getElementById('participantUserId');
    const guardianSelect = document.getElementById('participantGuardianIds');
    const volunteerUserSelect = document.getElementById('adminVolUserId');
    const userParticipantLinkSelect = document.getElementById('userParticipantLinkId');
    const userVolunteerLinkSelect = document.getElementById('userVolunteerLinkId');
    const participantUsers = users.filter((user) => user.role === 'PARTICIPANT');
    const guardianUsers = users.filter((user) => user.role === 'GUARDIAN');
    const volunteerUsers = users.filter((user) => user.role === 'VOLUNTEER');

    if (participantUserSelect) {
      participantUserSelect.innerHTML = `<option value="" disabled selected>Select participant login...</option>${participantUsers.map((user) =>
        `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`
      ).join('')}`;
    }

    if (guardianSelect) {
      guardianSelect.innerHTML = guardianUsers.map((user) =>
        `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`
      ).join('');
    }

    if (volunteerUserSelect) {
      volunteerUserSelect.innerHTML = `<option value="" disabled selected>Select volunteer login...</option>${volunteerUsers.map((user) =>
        `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`
      ).join('')}`;
    }

    if (userParticipantLinkSelect) {
      userParticipantLinkSelect.innerHTML = `<option value="">No participant record link</option>${participants.map((participant) =>
        `<option value="${escapeHtml(participant.id)}">${escapeHtml(participant.fullName)}${participant.participantUser ? ` (${escapeHtml(participant.participantUser.email)})` : ' (unlinked)'}</option>`
      ).join('')}`;
    }

    if (userVolunteerLinkSelect) {
      userVolunteerLinkSelect.innerHTML = `<option value="">No volunteer profile link</option>${volunteerProfiles.map((profile) =>
        `<option value="${escapeHtml(profile.userId)}">${escapeHtml(profile.fullName)} (${escapeHtml(profile.email || profile.linkedUser?.email || 'unlinked')})</option>`
      ).join('')}`;
    }
  }

  function resetUserFormState() {
    registerForm?.reset();
    registerForm?.classList.remove('was-validated');
    registerError?.classList.add('d-none');
    editingUserEmail = null;
    const passwordEl = document.getElementById('regPassword');
    if (passwordEl) {
      passwordEl.required = true;
      passwordEl.placeholder = 'Temporary password';
    }
    const submitBtn = document.getElementById('userSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Create Account';
    document.getElementById('userParticipantLinkId').value = '';
    document.getElementById('userVolunteerLinkId').value = '';
    syncUserLinkVisibility();
  }

  function resetParticipantFormState() {
    participantForm?.reset();
    participantForm?.classList.remove('was-validated');
    participantError?.classList.add('d-none');
    editingParticipantId = null;
    const submitBtn = document.getElementById('participantSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Save Participant Record';
    document.getElementById('participantCreateUserToggle').checked = false;
    document.getElementById('participantNewUserEmail').value = '';
    document.getElementById('participantNewUserPassword').value = '';
    toggleInlineParticipantUserFields();
  }

  function resetVolunteerFormState() {
    volunteerAdminForm?.reset();
    volunteerAdminForm?.classList.remove('was-validated');
    volunteerAdminError?.classList.add('d-none');
    editingVolunteerUserId = null;
    document.getElementById('adminVolInterestsGroup')?.classList.remove('border-danger');
    document.getElementById('adminVolInterestsFeedback')?.classList.add('d-none');
    const submitBtn = document.getElementById('volunteerAdminSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Save Volunteer Profile';
    const bgSelect = document.getElementById('adminVolBackgroundCheck');
    if (bgSelect) bgSelect.disabled = false;
    document.getElementById('adminVolCreateUserToggle').checked = false;
    document.getElementById('adminVolNewUserEmail').value = '';
    document.getElementById('adminVolNewUserPassword').value = '';
    setAdminVolunteerOtherInterestInputState();
    toggleInlineVolunteerUserFields();
  }

  function resetEventFormState() {
    eventForm?.reset();
    eventForm?.classList.remove('was-validated');
    eventError?.classList.add('d-none');
    editingEventId = null;
    const submitBtn = document.getElementById('eventSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Publish Event';
    const urgentCheck = document.getElementById('eventIsUrgent');
    if (urgentCheck) urgentCheck.checked = false;
  }

  function resetJobFormState() {
    jobForm?.reset();
    jobForm?.classList.remove('was-validated');
    jobError?.classList.add('d-none');
    editingJobId = null;
    const submitBtn = document.getElementById('jobSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Save Opportunity';
    const urgentCheck = document.getElementById('jobIsUrgent');
    if (urgentCheck) urgentCheck.checked = false;
  }

  function setAdminVolunteerOtherInterestInputState() {
    const checkbox = document.getElementById('adminVolInterestOther');
    const input = document.getElementById('adminVolInterestOtherText');
    const enabled = Boolean(checkbox?.checked);
    if (!input) return;
    input.disabled = !enabled;
    if (!enabled) input.value = '';
  }

  function getAdminSelectedVolunteerInterests() {
    const values = Array.from(document.querySelectorAll('input[name="adminVolInterests"]:checked')).map((checkbox) => checkbox.value);
    if (values.includes('Other')) {
      const custom = String(document.getElementById('adminVolInterestOtherText')?.value || '').trim();
      if (custom) {
        return values.map((value) => value === 'Other' ? `Other: ${custom}` : value);
      }
    }
    return values;
  }

  function setAdminSelectedVolunteerInterests(interests) {
    const list = Array.isArray(interests) ? interests : [];
    let otherText = '';
    Array.from(document.querySelectorAll('input[name="adminVolInterests"]')).forEach((checkbox) => {
      if (checkbox.value === 'Other') {
        const custom = list.find((item) => String(item).startsWith('Other:'));
        checkbox.checked = Boolean(custom) || list.includes('Other');
        otherText = custom ? String(custom).replace(/^Other:\s*/i, '').trim() : '';
      } else {
        checkbox.checked = list.includes(checkbox.value);
      }
    });
    setAdminVolunteerOtherInterestInputState();
    const input = document.getElementById('adminVolInterestOtherText');
    if (input && otherText) input.value = otherText;
  }

  function validateAdminVolunteerInterests() {
    const selected = getAdminSelectedVolunteerInterests();
    const group = document.getElementById('adminVolInterestsGroup');
    const feedback = document.getElementById('adminVolInterestsFeedback');
    if (!selected.length) {
      group?.classList.add('border-danger');
      feedback?.classList.remove('d-none');
      return false;
    }
    group?.classList.remove('border-danger');
    feedback?.classList.add('d-none');
    return true;
  }

  async function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    const users = await Auth.getUsers();
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted px-3">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map((user) => {
      const isSelf = session.userId === user.id;
      const canEdit = user.role !== 'ADMIN';
      return `
        <tr>
          <td class="ps-3">${escapeHtml(user.name)}</td>
          <td class="text-muted small">${escapeHtml(user.email)}</td>
          <td><span class="badge ${ROLE_BADGE[canonicalRole(user.role)] || 'bg-secondary'}">${escapeHtml(ROLE_LABEL[canonicalRole(user.role)] || user.role)}</span></td>
          <td class="text-muted small">${escapeHtml(user.dateAdded)}</td>
          <td class="pe-3" style="width:1%;white-space:nowrap;">
            ${canEdit ? `<button class="btn btn-outline-primary btn-sm me-1" data-user-edit-email="${escapeHtml(user.email)}">Edit</button>` : ''}
            ${isSelf
              ? '<button class="btn btn-outline-secondary btn-sm" disabled title="You cannot delete your own account">Delete</button>'
              : `<button class="btn btn-outline-danger btn-sm" data-user-email="${escapeHtml(user.email)}">Delete</button>`}
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-user-edit-email]').forEach((button) => {
      button.addEventListener('click', async () => {
        const users = await Auth.getUsers();
        const user = users.find((entry) => entry.email.toLowerCase() === String(button.dataset.userEditEmail).toLowerCase());
        if (!user) return;
        const nameParts = splitFullName(user.name);
        document.getElementById('regFirstName').value = nameParts.firstName;
        document.getElementById('regLastName').value = nameParts.lastName;
        document.getElementById('regEmail').value = user.email;
        document.getElementById('regRole').value = canonicalRole(user.role);
        const passwordEl = document.getElementById('regPassword');
        passwordEl.value = '';
        passwordEl.required = false;
        passwordEl.placeholder = 'Leave blank to keep current password';
        const participants = await Auth.getParticipants();
        const linkedParticipant = participants.find((participant) => String(participant.participantUserId) === String(user.id));
        const volunteerProfile = await Auth.getVolunteerProfile(user.id);
        document.getElementById('userParticipantLinkId').value = linkedParticipant?.id || '';
        document.getElementById('userVolunteerLinkId').value = volunteerProfile?.userId || '';
        editingUserEmail = user.email;
        document.getElementById('userSubmitBtn').textContent = 'Update Account';
        registerError.classList.add('d-none');
        registerForm.classList.remove('was-validated');
        syncUserLinkVisibility();
        showUsersFormView(true);
      });
    });

    tbody.querySelectorAll('[data-user-email]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await Auth.removeUser(button.dataset.userEmail);
        if (!result.success) {
          registerError.textContent = result.message;
          registerError.classList.remove('d-none');
          return;
        }
        await renderUsersTable();
        await populateLinkedUserOptions();
      });
    });
  }

  async function renderParticipantsTable() {
    const tbody = document.getElementById('participantsTableBody');
    if (!tbody) return;
    const participants = await Auth.getParticipants();
    if (!participants.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted px-3">No participant records yet.</td></tr>';
      return;
    }

    tbody.innerHTML = participants.map((participant) => `
      <tr>
        <td class="ps-3">
          <div class="fw-semibold">${escapeHtml(participant.fullName)}</div>
          <div class="text-muted small">Age ${escapeHtml(participant.age || '—')}</div>
        </td>
        <td class="small text-muted">${participant.participantUser ? `${escapeHtml(participant.participantUser.name)}<div>${escapeHtml(participant.participantUser.email)}</div>` : '<span class="text-danger">Missing login</span>'}</td>
        <td class="small">${participant.guardians.length
          ? participant.guardians.map((guardian) => `<div>${escapeHtml(guardian.name)} <span class="text-muted">(${escapeHtml(guardian.email)})</span></div>`).join('')
          : '<span class="text-danger">No guardians linked</span>'}</td>
        <td class="small">
          <div><span class="fw-semibold">Support:</span> ${escapeHtml(participant.specialNeeds || '—')}</div>
          <div class="text-muted mt-1">${escapeHtml(participant.participantInterests.join(', ') || 'No participant interests yet')}</div>
          <div class="text-muted mt-1">${escapeHtml(participant.pendingApprovalCount)} pending approvals • ${escapeHtml(participant.approvedJobCount)} approved job interests</div>
        </td>
        <td class="text-muted small">${escapeHtml(participant.dateAdded)}</td>
        <td class="pe-3" style="width:1%;white-space:nowrap;">
          <button class="btn btn-outline-primary btn-sm me-1" data-participant-edit-id="${escapeHtml(participant.id)}">View</button>
          <button class="btn btn-outline-danger btn-sm" data-participant-id="${escapeHtml(participant.id)}">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-participant-edit-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const participant = await Auth.getParticipantById(button.dataset.participantEditId);
        if (!participant) return;
        document.getElementById('participantFirstName').value = participant.firstName || '';
        document.getElementById('participantLastName').value = participant.lastName || '';
        document.getElementById('participantAge').value = participant.age || '';
        document.getElementById('participantUserId').value = participant.participantUserId || '';
        Array.from(document.getElementById('participantGuardianIds').options).forEach((option) => {
          option.selected = participant.guardianUserIds.includes(option.value);
        });
        document.getElementById('participantEmail').value = participant.contactEmail || '';
        document.getElementById('participantPhone').value = participant.contactPhone || '';
        document.getElementById('participantInterests').value = participant.participantInterests.join(', ');
        document.getElementById('participantJobGoals').value = participant.jobGoals || '';
        document.getElementById('participantSpecialNeeds').value = participant.specialNeeds || '';
        document.getElementById('participantMedicalNotes').value = participant.medicalNotes || '';
        document.getElementById('participantSensoryNotes').value = participant.sensoryNotes || '';
        document.getElementById('participantGuardianNotes').value = participant.guardianNotes || '';
        document.getElementById('participantCreateUserToggle').checked = false;
        toggleInlineParticipantUserFields();
        editingParticipantId = participant.id;
        participantError.classList.add('d-none');
        participantForm.classList.remove('was-validated');
        document.getElementById('participantSubmitBtn').textContent = 'Update Participant Record';
        participantsViewOrigin = null;
        showParticipantsFormView(true, true);
      });
    });

    tbody.querySelectorAll('[data-participant-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await Auth.removeParticipant(button.dataset.participantId);
        if (!result.success) {
          participantError.textContent = result.message;
          participantError.classList.remove('d-none');
          return;
        }
        await renderParticipantsTable();
      });
    });
  }

  const BG_STATUS_BADGE = {
    'Not Started': 'bg-secondary',
    'Pending':     'bg-warning text-dark',
    'Cleared':     'bg-success',
    'Denied':      'bg-danger',
    'Expired':     'bg-dark',
    'Revoked':     'bg-secondary'
  };

  function bgCheckBadge(status) {
    const label = status || 'Not Started';
    const cls = BG_STATUS_BADGE[label] || 'bg-secondary';
    return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
  }

  async function renderVolunteersTable() {
    const tbody = document.getElementById('volunteerProfilesTableBody');
    if (!tbody) return;

    Auth.checkAndExpireBgRecords();

    const profiles = await Auth.getVolunteerProfiles();
    if (!profiles.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted px-3">No volunteer profiles yet.</td></tr>';
      return;
    }

    const allBgRecords = await Auth.getAllBgCheckRecords();

    tbody.innerHTML = profiles.map((profile) => {
      const bgStatus = profile.backgroundCheckStatus || 'Not Started';
      const bgRecord = allBgRecords.find((r) => String(r.volunteerUserId) === String(profile.userId));
      const isLocked = bgStatus === 'Cleared' && bgRecord?.expiresAtMs && Date.now() < bgRecord.expiresAtMs;
      const approved = bgStatus === 'Cleared';
      const denied = bgStatus === 'Denied' || bgStatus === 'Expired' || bgStatus === 'Revoked';
      const approvalBadge = approved
        ? '<span class="badge bg-success ms-2"><i class="bi bi-check-circle-fill me-1"></i>Approved</span>'
        : (denied
          ? '<span class="badge bg-danger ms-2"><i class="bi bi-x-circle-fill me-1"></i>Not Approved</span>'
          : '');

      let expiryMarkup = '';
      if (bgRecord?.expiresAtMs && bgStatus === 'Cleared') {
        expiryMarkup = `<div class="text-info small mt-1"><i class="bi bi-clock me-1"></i>Expires: ${escapeHtml(bgRecord.expiresAtLabel || new Date(bgRecord.expiresAtMs).toLocaleDateString())}</div>`;
      }

      return `
      <tr>
        <td class="ps-3"><div class="fw-semibold">${escapeHtml(profile.fullName)}</div><div class="text-muted small">${escapeHtml(profile.linkedUser?.email || '')}</div></td>
        <td class="small text-muted"><div>${escapeHtml(profile.email)}</div><div>${escapeHtml(profile.phone || '')}</div></td>
        <td class="small">${escapeHtml(profile.interests.join(', ') || 'Not provided')}</td>
        <td class="small text-muted">${escapeHtml(profile.availability || 'Not provided')}</td>
        <td class="small">
          <div class="d-flex align-items-center">
            ${bgCheckBadge(bgStatus)}${approvalBadge}
          </div>
          ${expiryMarkup}
          <div class="mt-2 d-flex gap-1">
            <button class="btn btn-outline-info btn-sm" data-bgcheck-details-user-id="${escapeHtml(profile.userId)}" ${isLocked ? 'disabled' : ''}>
              <i class="bi bi-eye"></i> Details
            </button>
            <button class="btn btn-outline-success btn-sm" data-bgcheck-update-user-id="${escapeHtml(profile.userId)}" ${isLocked ? 'disabled' : ''}>
              <i class="bi bi-pencil"></i> Update
            </button>
          </div>
        </td>
        <td class="small text-muted">${escapeHtml(profile.updatedAtLabel || 'N/A')}</td>
        <td class="pe-3" style="width:1%;white-space:nowrap;">
          <button class="btn btn-outline-primary btn-sm me-1" data-volunteer-edit-user-id="${escapeHtml(profile.userId)}">View</button>
          <button class="btn btn-outline-danger btn-sm" data-volunteer-user-id="${escapeHtml(profile.userId)}">Delete</button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-volunteer-edit-user-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const profile = await Auth.getVolunteerProfile(button.dataset.volunteerEditUserId);
        if (!profile) return;
        document.getElementById('adminVolUserId').value = profile.userId || '';
        document.getElementById('adminVolFirstName').value = profile.firstName || '';
        document.getElementById('adminVolLastName').value = profile.lastName || '';
        document.getElementById('adminVolPhone').value = profile.phone || '';
        document.getElementById('adminVolAvailability').value = profile.availability || '';
        const bgSelect = document.getElementById('adminVolBackgroundCheck');
        bgSelect.value = profile.backgroundCheckStatus || 'Not Started';

        const bgRecord = await Auth.getBgCheckRecord(profile.userId);
        const isLocked = profile.backgroundCheckStatus === 'Cleared'
          && bgRecord?.expiresAtMs && Date.now() < bgRecord.expiresAtMs;
        bgSelect.disabled = isLocked;

        setAdminSelectedVolunteerInterests(profile.interests);
        document.getElementById('adminVolCreateUserToggle').checked = false;
        toggleInlineVolunteerUserFields();
        editingVolunteerUserId = profile.userId;
        document.getElementById('volunteerAdminSubmitBtn').textContent = 'Update Volunteer Profile';
        volunteerAdminError.classList.add('d-none');
        volunteerAdminForm.classList.remove('was-validated');
        showVolunteersFormView(true, true);
      });
    });

    tbody.querySelectorAll('[data-volunteer-user-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await Auth.removeVolunteerProfile(button.dataset.volunteerUserId);
        if (!result.success) {
          volunteerAdminError.textContent = result.message;
          volunteerAdminError.classList.remove('d-none');
          return;
        }
        await renderVolunteersTable();
      });
    });

    tbody.querySelectorAll('[data-bgcheck-details-user-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.bgcheckDetailsUserId;
        const record = await Auth.getBgCheckRecord(userId);
        const profile = await Auth.getVolunteerProfile(userId);
        if (!profile) return;

        let content = `
          <div class="mb-3">
            <h6 class="fw-semibold">Volunteer Information</h6>
            <p class="mb-1"><strong>Name:</strong> ${escapeHtml(profile.fullName)}</p>
            <p class="mb-1"><strong>Email:</strong> ${escapeHtml(profile.email || profile.linkedUser?.email || 'N/A')}</p>
            <p class="mb-1"><strong>Phone:</strong> ${escapeHtml(profile.phone || 'N/A')}</p>
          </div>
        `;

        if (record) {
          content += `
            <div class="mb-3">
              <h6 class="fw-semibold">Current Status</h6>
              <p class="mb-1"><strong>Status:</strong> ${bgCheckBadge(record.status)}</p>
              ${record.expiresAtLabel ? `<p class="mb-1"><strong>Expires:</strong> ${escapeHtml(record.expiresAtLabel)}</p>` : ''}
              ${record.notes ? `<p class="mb-1"><strong>Notes:</strong> ${escapeHtml(record.notes)}</p>` : ''}
            </div>
            <div class="mb-3">
              <h6 class="fw-semibold">Status History</h6>
              <div class="table-responsive">
                <table class="table table-sm table-borderless">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Changed By</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
          `;
          record.statusHistory.forEach(entry => {
            content += `
                    <tr>
                      <td class="small">${escapeHtml(entry.changedAtLabel)}</td>
                      <td>${bgCheckBadge(entry.status)}</td>
                      <td class="small">${escapeHtml(entry.changedByName)} (${escapeHtml(entry.changedByRole)})</td>
                      <td class="small">${escapeHtml(entry.note || 'N/A')}</td>
                    </tr>
            `;
          });
          content += `
                  </tbody>
                </table>
              </div>
            </div>
          `;
        } else {
          content += `
            <div class="alert alert-warning">
              <strong>No background check record found.</strong> The status may have been set through the volunteer profile form.
            </div>
          `;
        }

        document.getElementById('bgCheckDetailsContent').innerHTML = content;
        document.getElementById('bgCheckDetailsModalLabel').textContent = `Background Check Details ${escapeHtml(profile.fullName)}`;
        const detailsModal = new bootstrap.Modal(document.getElementById('bgCheckDetailsModal'));
        detailsModal.show();

        // Handle edit button
        const editBtn = document.getElementById('editBgCheckBtn');
        editBtn.onclick = () => {
          detailsModal.hide();
          // Trigger the update modal
          const updateBtn = tbody.querySelector(`[data-bgcheck-update-user-id="${userId}"]`);
          if (updateBtn) updateBtn.click();
        };
      });
    });

    tbody.querySelectorAll('[data-bgcheck-update-user-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.bgcheckUpdateUserId;
        const profile = await Auth.getVolunteerProfile(userId);
        if (!profile) return;

        document.getElementById('bgCheckVolunteerName').textContent = profile.fullName;
        document.getElementById('bgCheckStatusSelect').value = profile.backgroundCheckStatus || 'Not Started';
        document.getElementById('bgCheckNotes').value = '';
        document.getElementById('updateBgCheckError').classList.add('d-none');

        const modal = new bootstrap.Modal(document.getElementById('updateBgCheckModal'));
        modal.show();

        // Handle save
        const saveBtn = document.getElementById('saveBgCheckBtn');
        const handleSave = async () => {
          saveBtn.disabled = true;
          const newStatus = document.getElementById('bgCheckStatusSelect').value;
          const notes = document.getElementById('bgCheckNotes').value.trim();
          const result = await Auth.updateBgCheckStatus(userId, newStatus, notes);
          if (!result.success) {
            document.getElementById('updateBgCheckError').textContent = result.message || 'Unable to update background check status.';
            document.getElementById('updateBgCheckError').classList.remove('d-none');
            saveBtn.disabled = false;
            return;
          }
          showToast(`Background check status updated to "${newStatus}".`);
          modal.hide();
          await renderVolunteersTable();
        };

        saveBtn.onclick = handleSave;
        modal._element.addEventListener('hidden.bs.modal', () => {
          saveBtn.onclick = null;
        }, { once: true });
      });
    });
  }

  async function renderEventsTable() {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;
    const events = await Auth.getEvents();
    if (!events.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted px-3">No live events yet.</td></tr>';
      return;
    }

    tbody.innerHTML = events.map((event) => `
      <tr>
        <td class="ps-3"><div class="fw-semibold text-dark">${escapeHtml(event.title)}</div></td>
        <td><span class="badge ${EVENT_CATEGORY_BADGE[event.category] || 'bg-secondary'}">${escapeHtml(event.category)}</span></td>
        <td class="small text-muted">${escapeHtml(event.dateTimeLabel)}</td>
        <td class="small">${escapeHtml(event.location)}</td>
        <td class="small fw-semibold">${escapeHtml(event.cost)}</td>
        <td class="small text-muted"><div class="event-accommodations">${escapeHtml(event.accommodations)}</div></td>
        <td class="text-muted small">${escapeHtml(event.dateAdded)}</td>
        <td class="pe-3" style="width:1%;white-space:nowrap;">
          <button class="btn btn-outline-primary btn-sm me-1" data-event-edit-id="${escapeHtml(event.id)}">View</button>
          <button class="btn btn-outline-danger btn-sm" data-event-id="${escapeHtml(event.id)}">Delete</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-event-edit-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const events = await Auth.getEvents();
        const event = events.find((entry) => String(entry.id) === String(button.dataset.eventEditId));
        if (!event) return;
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventCategory').value = event.category || '';
        document.getElementById('eventDateTime').value = event.dateTime || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventCost').value = event.cost || '';
        document.getElementById('eventAccommodations').value = event.accommodations || '';
        const urgentCheck = document.getElementById('eventIsUrgent');
        if (urgentCheck) urgentCheck.checked = Boolean(event.isUrgent);
        editingEventId = event.id;
        document.getElementById('eventSubmitBtn').textContent = 'Update Event';
        showEventsFormView(true, true);
      });
    });

    tbody.querySelectorAll('[data-event-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await Auth.removeEvent(button.dataset.eventId);
        if (!result.success) {
          eventError.textContent = result.message;
          eventError.classList.remove('d-none');
          return;
        }
        showToast('Event removed from the live log.');
        await renderEventsTable();
      });
    });
  }

  async function renderJobsTable() {
    const tbody = document.getElementById('jobsTableBody');
    if (!tbody) return;
    const [jobs, interestSummary] = await Promise.all([Auth.getJobs(), Auth.getJobInterestSummary()]);
    if (!jobs.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted px-3">No job opportunities logged yet.</td></tr>';
      return;
    }

    const JOB_TYPE_BADGE = {
      'Full-time': 'bg-success',
      'Part-time': 'bg-primary',
      'Casual': 'bg-warning text-dark',
      Gig: 'bg-secondary'
    };
    const JOB_STATUS_BADGE = {
      Open: 'bg-success',
      Paused: 'bg-warning text-dark',
      Filled: 'bg-secondary'
    };

    tbody.innerHTML = jobs.map((job) => {
      const summary = interestSummary[job.id] || { approved: [], pending: [] };
      const approvedMarkup = summary.approved.length
        ? summary.approved.map((entry) => `<div class="text-success">${escapeHtml(entry.name)} <span class="text-muted">(${escapeHtml(entry.email)})</span></div>`).join('')
        : '<div class="text-muted">No approved interest yet</div>';
      const pendingMarkup = summary.pending.length
        ? summary.pending.map((entry) => `<div class="text-warning-emphasis">${escapeHtml(entry.name)} <span class="text-muted">(${escapeHtml(entry.email)})</span></div>`).join('')
        : '<div class="text-muted">No pending approvals</div>';
      return `
        <tr>
          <td class="ps-3"><div class="fw-semibold text-dark">${escapeHtml(job.title)}</div></td>
          <td>${escapeHtml(job.employer)}</td>
          <td class="small">${escapeHtml(job.location || '—')}</td>
          <td>${job.jobType ? `<span class="badge ${JOB_TYPE_BADGE[job.jobType] || 'bg-secondary'}">${escapeHtml(job.jobType)}</span>` : '<span class="text-muted small">—</span>'}</td>
          <td><span class="badge ${JOB_STATUS_BADGE[job.status] || 'bg-secondary'}">${escapeHtml(job.status || 'Open')}</span></td>
          <td class="small">${job.salary ? `<span class="fw-semibold">${escapeHtml(job.salary)}</span>` : '<span class="text-muted small">—</span>'}</td>
          <td class="small text-muted"><div class="event-accommodations">${escapeHtml(job.requirements)}</div></td>
          <td class="small">
            <div class="fw-semibold text-success mb-1">Approved</div>
            ${approvedMarkup}
            <div class="fw-semibold text-warning-emphasis mt-2 mb-1">Pending</div>
            ${pendingMarkup}
          </td>
          <td class="text-muted small">${escapeHtml(job.dateAdded)}</td>
          <td class="pe-3" style="width:1%;white-space:nowrap;">
            <button class="btn btn-outline-primary btn-sm me-1" data-job-edit-id="${escapeHtml(job.id)}">View</button>
            <button class="btn btn-outline-danger btn-sm" data-job-id="${escapeHtml(job.id)}">Delete</button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-job-edit-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const jobs = await Auth.getJobs();
        const job = jobs.find((entry) => String(entry.id) === String(button.dataset.jobEditId));
        if (!job) return;
        document.getElementById('jobTitle').value = job.title || '';
        document.getElementById('jobEmployer').value = job.employer || '';
        document.getElementById('jobLocation').value = job.location || '';
        document.getElementById('jobType').value = job.jobType || '';
        document.getElementById('jobStatus').value = job.status || 'Open';
        document.getElementById('jobSalary').value = job.salary || '';
        document.getElementById('jobRequirements').value = job.requirements || '';
        const urgentCheck = document.getElementById('jobIsUrgent');
        if (urgentCheck) urgentCheck.checked = Boolean(job.isUrgent);
        editingJobId = job.id;
        document.getElementById('jobSubmitBtn').textContent = 'Update Opportunity';
        showJobsFormView(true, true);
      });
    });

    tbody.querySelectorAll('[data-job-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await Auth.removeJob(button.dataset.jobId);
        if (!result.success) {
          jobError.textContent = result.message;
          jobError.classList.remove('d-none');
          return;
        }
        showToast('Job opportunity removed.');
        await renderJobsTable();
      });
    });
  }

  function getSelectedNewsletterRecipients() {
    return Array.from(document.querySelectorAll('input[name="newsletterRecipients"]:checked')).map((checkbox) => checkbox.value);
  }

  function getNewsletterPayload() {
    return {
      subject: document.getElementById('newsletterSubject')?.value || '',
      eventHighlights: document.getElementById('newsletterEvents')?.value || '',
      updates: document.getElementById('newsletterUpdates')?.value || '',
      recipients: getSelectedNewsletterRecipients()
    };
  }

  function showNewsletterError(message) {
    if (!newsletterError) return;
    newsletterError.textContent = message;
    newsletterError.classList.remove('d-none');
    newsletterSuccess?.classList.add('d-none');
  }

  function showNewsletterSuccess(message) {
    if (!newsletterSuccess) return;
    newsletterSuccess.textContent = message;
    newsletterSuccess.classList.remove('d-none');
    newsletterError?.classList.add('d-none');
  }

  function clearNewsletterMessages() {
    newsletterError?.classList.add('d-none');
    newsletterSuccess?.classList.add('d-none');
  }

  async function renderNewsletterRecipients() {
    const container = document.getElementById('newsletterRecipientsList');
    if (!container) return;
    const users = await Auth.getUsers();
    const recipients = users.filter((user) => user.role !== 'ADMIN');
    container.innerHTML = recipients.length
      ? recipients.map((user) => `
        <div class="form-check mb-2">
          <input class="form-check-input" type="checkbox" value="${escapeHtml(user.email)}" id="newsletterRecipient_${escapeHtml(user.id)}" name="newsletterRecipients" checked>
          <label class="form-check-label small" for="newsletterRecipient_${escapeHtml(user.id)}">
            ${escapeHtml(user.name)} <span class="text-muted">(${escapeHtml(user.email)})</span>
          </label>
        </div>`).join('')
      : '<p class="text-muted small mb-0">No eligible recipients yet.</p>';
  }

  async function hydrateNewsletterDraft() {
    const draft = await Auth.getNewsletterDraft();
    if (!draft) return;
    document.getElementById('newsletterSubject').value = draft.subject || '';
    document.getElementById('newsletterEvents').value = draft.eventHighlights || '';
    document.getElementById('newsletterUpdates').value = draft.updates || '';
    const recipients = new Set(Array.isArray(draft.recipients) ? draft.recipients.map((entry) => String(entry).toLowerCase()) : []);
    document.querySelectorAll('input[name="newsletterRecipients"]').forEach((checkbox) => {
      checkbox.checked = recipients.has(String(checkbox.value).toLowerCase());
    });
    showNewsletterSuccess(`Draft loaded (last updated ${draft.updatedAtLabel || 'recently'}).`);
  }

  function renderNewsletterPreview() {
    const payload = getNewsletterPayload();
    document.getElementById('newsletterPreviewSubject').textContent = payload.subject.trim() || 'Untitled Newsletter';
    document.getElementById('newsletterPreviewEvents').textContent = payload.eventHighlights.trim() || 'No event highlights provided.';
    document.getElementById('newsletterPreviewUpdates').textContent = payload.updates.trim() || 'No updates provided.';
  }

  async function renderNewsletterHistory() {
    const history = await Auth.getNewsletterHistory();
    const list = document.getElementById('newsletterHistoryList');
    if (!list) return;
    list.innerHTML = history.length
      ? history.slice(0, 5).map((entry) => `
        <div class="border-bottom pb-2 mb-2">
          <div class="fw-semibold small">${escapeHtml(entry.subject || 'Untitled Newsletter')}</div>
          <div class="text-muted small">${escapeHtml(entry.recipientCount || 0)} recipients • ${escapeHtml(entry.sentAtLabel || '')}</div>
        </div>`).join('')
      : '<p class="text-muted small mb-0">No newsletters distributed yet.</p>';
  }

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    registerForm.classList.add('was-validated');
    if (!registerForm.checkValidity()) return;
    const fullName = `${document.getElementById('regFirstName').value} ${document.getElementById('regLastName').value}`.trim();
    const payload = {
      name: fullName,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value,
      role: document.getElementById('regRole').value,
      linkParticipantId: document.getElementById('userParticipantLinkId').value,
      linkVolunteerProfileId: document.getElementById('userVolunteerLinkId').value
    };

    if (editingUserEmail) {
      const result = await Auth.updateUser(editingUserEmail, payload);
      if (!result.success) {
        registerError.textContent = result.message;
        registerError.classList.remove('d-none');
        return;
      }
      resetUserFormState();
      await renderUsersTable();
      await populateLinkedUserOptions();
      showUsersListView();
      showToast(`Success: Account for ${fullName} updated.`);
      return;
    }

    pendingUser = payload;
    populateModalSummary(payload);
    confirmModal?.show();
  });

  registerForm?.addEventListener('input', () => registerError?.classList.add('d-none'));

  participantForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    participantForm.classList.add('was-validated');
    const guardianIds = getSelectedValues(document.getElementById('participantGuardianIds'));
    if (!participantForm.checkValidity() || !guardianIds.length) {
      document.getElementById('participantGuardianIds')?.setCustomValidity(guardianIds.length ? '' : 'Select at least one guardian.');
      participantForm.reportValidity();
      return;
    }
    document.getElementById('participantGuardianIds')?.setCustomValidity('');
    const payload = {
      firstName: document.getElementById('participantFirstName').value,
      lastName: document.getElementById('participantLastName').value,
      age: document.getElementById('participantAge').value,
      participantUserId: document.getElementById('participantUserId').value,
      guardianUserIds: guardianIds,
      contactEmail: document.getElementById('participantEmail').value,
      contactPhone: document.getElementById('participantPhone').value,
      participantInterests: document.getElementById('participantInterests').value,
      jobGoals: document.getElementById('participantJobGoals').value,
      specialNeeds: document.getElementById('participantSpecialNeeds').value,
      medicalNotes: document.getElementById('participantMedicalNotes').value,
      sensoryNotes: document.getElementById('participantSensoryNotes').value,
      guardianNotes: document.getElementById('participantGuardianNotes').value
    };

    if (document.getElementById('participantCreateUserToggle')?.checked) {
      const createResult = await Auth.addUser({
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: document.getElementById('participantNewUserEmail').value,
        password: document.getElementById('participantNewUserPassword').value,
        role: 'PARTICIPANT'
      });
      if (!createResult.success) {
        participantError.textContent = createResult.message;
        participantError.classList.remove('d-none');
        return;
      }
      payload.participantUserId = createResult.user.id;
    }

    if (editingParticipantId) {
      const result = await Auth.updateParticipant(editingParticipantId, payload);
      if (!result.success) {
        participantError.textContent = result.message;
        participantError.classList.remove('d-none');
        return;
      }
      resetParticipantFormState();
      await renderParticipantsTable();
      showParticipantsListView();
      showToast('Participant record updated successfully.');
      return;
    }

    pendingParticipant = payload;
    await populateParticipantModalSummary(payload);
    confirmParticipantModal?.show();
  });

  participantForm?.addEventListener('input', () => participantError?.classList.add('d-none'));

  document.getElementById('adminVolInterestOther')?.addEventListener('change', () => {
    setAdminVolunteerOtherInterestInputState();
    volunteerAdminError?.classList.add('d-none');
  });

  document.querySelectorAll('input[name="adminVolInterests"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      volunteerAdminError?.classList.add('d-none');
      validateAdminVolunteerInterests();
    });
  });

  volunteerAdminForm?.addEventListener('input', () => {
    volunteerAdminError?.classList.add('d-none');
    document.getElementById('adminVolInterestsGroup')?.classList.remove('border-danger');
    document.getElementById('adminVolInterestsFeedback')?.classList.add('d-none');
  });

  volunteerAdminForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    volunteerAdminForm.classList.add('was-validated');
    const interestsValid = validateAdminVolunteerInterests();
    if (!volunteerAdminForm.checkValidity() || !interestsValid) return;
    const payload = {
      userId: document.getElementById('adminVolUserId').value,
      firstName: document.getElementById('adminVolFirstName').value,
      lastName: document.getElementById('adminVolLastName').value,
      phone: document.getElementById('adminVolPhone').value,
      interests: getAdminSelectedVolunteerInterests(),
      availability: document.getElementById('adminVolAvailability').value,
      backgroundCheckStatus: document.getElementById('adminVolBackgroundCheck').value
    };

    if (document.getElementById('adminVolCreateUserToggle')?.checked) {
      const createResult = await Auth.addUser({
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: document.getElementById('adminVolNewUserEmail').value,
        password: document.getElementById('adminVolNewUserPassword').value,
        role: 'VOLUNTEER'
      });
      if (!createResult.success) {
        volunteerAdminError.textContent = createResult.message || 'Unable to create linked volunteer user.';
        volunteerAdminError.classList.remove('d-none');
        return;
      }
      payload.userId = createResult.user.id;
    }
    const result = await Auth.saveVolunteerProfile(payload);
    if (!result.success) {
      volunteerAdminError.textContent = result.message || 'Unable to save volunteer profile.';
      volunteerAdminError.classList.remove('d-none');
      return;
    }

    const newBgStatus = payload.backgroundCheckStatus || 'Not Started';
    if (payload.userId && newBgStatus !== 'Not Started') {
      await Auth.updateBgCheckStatus(payload.userId, newBgStatus, 'Updated by admin via volunteer profile form');
    }

    const wasEditing = Boolean(editingVolunteerUserId);
    resetVolunteerFormState();
    await renderVolunteersTable();
    showVolunteersListView();
    showToast(wasEditing ? 'Volunteer profile updated successfully.' : 'Volunteer profile saved successfully.');
  });

  eventForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    eventForm.classList.add('was-validated');
    if (!eventForm.checkValidity()) return;
    const payload = {
      title: document.getElementById('eventTitle').value,
      category: document.getElementById('eventCategory').value,
      dateTime: document.getElementById('eventDateTime').value,
      location: document.getElementById('eventLocation').value,
      cost: document.getElementById('eventCost').value,
      accommodations: document.getElementById('eventAccommodations').value,
      isUrgent: Boolean(document.getElementById('eventIsUrgent')?.checked)
    };
    const result = editingEventId ? await Auth.updateEvent(editingEventId, payload) : await Auth.addEvent(payload);
    if (!result.success) {
      eventError.textContent = result.message;
      eventError.classList.remove('d-none');
      return;
    }
    const wasEditing = Boolean(editingEventId);
    resetEventFormState();
    await renderEventsTable();
    showEventsListView();
    showToast(wasEditing ? 'Event updated and remains live for families.' : `"${payload.title.trim()}" is now live for families to view.`);
  });

  eventForm?.addEventListener('input', () => eventError?.classList.add('d-none'));

  jobForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    jobForm.classList.add('was-validated');
    if (!jobForm.checkValidity()) return;
    const payload = {
      title: document.getElementById('jobTitle').value,
      employer: document.getElementById('jobEmployer').value,
      location: document.getElementById('jobLocation').value,
      jobType: document.getElementById('jobType').value,
      status: document.getElementById('jobStatus').value,
      salary: document.getElementById('jobSalary').value,
      requirements: document.getElementById('jobRequirements').value,
      isUrgent: Boolean(document.getElementById('jobIsUrgent')?.checked)
    };
    const result = editingJobId ? await Auth.updateJob(editingJobId, payload) : await Auth.addJob(payload);
    if (!result.success) {
      jobError.textContent = result.message;
      jobError.classList.remove('d-none');
      return;
    }
    const wasEditing = Boolean(editingJobId);
    resetJobFormState();
    await renderJobsTable();
    showJobsListView();
    showToast(wasEditing ? `Job opportunity for ${payload.employer} updated successfully.` : `Job opportunity for ${payload.employer} successfully logged and visible to participants.`);
  });

  jobForm?.addEventListener('input', () => jobError?.classList.add('d-none'));

  confirmBtn?.addEventListener('click', async () => {
    if (!pendingUser) return;
    const result = await Auth.addUser(pendingUser);
    confirmModal?.hide();
    if (!result.success) {
      registerError.textContent = result.message;
      registerError.classList.remove('d-none');
      pendingUser = null;
      return;
    }
    const createdRoleLabel = ROLE_LABEL[pendingUser.role] || pendingUser.role;
    resetUserFormState();
    await renderUsersTable();
    await populateLinkedUserOptions();
    showUsersListView();
    showToast(`Success: Account for ${pendingUser.name.trim()} created as ${createdRoleLabel}.`);
    pendingUser = null;
  });

  confirmModalEl?.addEventListener('hidden.bs.modal', () => {
    pendingUser = null;
  });

  confirmParticipantBtn?.addEventListener('click', async () => {
    if (!pendingParticipant) return;
    const result = await Auth.addParticipant(pendingParticipant);
    confirmParticipantModal?.hide();
    if (!result.success) {
      participantError.textContent = result.message;
      participantError.classList.remove('d-none');
      pendingParticipant = null;
      return;
    }
    resetParticipantFormState();
    await renderParticipantsTable();
    showParticipantsListView();
    showToast('Participant record saved successfully.');
    pendingParticipant = null;
  });

  confirmParticipantModalEl?.addEventListener('hidden.bs.modal', () => {
    pendingParticipant = null;
  });

  document.getElementById('newParticipantBtn')?.addEventListener('click', () => {
    resetParticipantFormState();
    participantsViewOrigin = null;
    showParticipantsFormView(false);
  });
  document.getElementById('backToParticipantsBtn')?.addEventListener('click', () => {
    const origin = participantsViewOrigin;
    resetParticipantFormState();
    participantsViewOrigin = null;
    if (origin) {
      navigateTo(origin);
    } else {
      showParticipantsListView();
    }
  });
  document.getElementById('participantFormEditBtn')?.addEventListener('click', () => {
    document.getElementById('participantFormTitle').textContent = 'Edit Participant';
    setFormFieldsDisabled('participantForm', false);
    document.getElementById('participantSubmitBtn').classList.remove('d-none');
    document.getElementById('participantFormEditBtn').classList.add('d-none');
  });
  document.getElementById('newVolunteerBtn')?.addEventListener('click', () => {
    resetVolunteerFormState();
    showVolunteersFormView(false);
  });
  document.getElementById('backToVolunteersBtn')?.addEventListener('click', () => {
    resetVolunteerFormState();
    showVolunteersListView();
  });
  document.getElementById('volunteerFormEditBtn')?.addEventListener('click', () => {
    document.getElementById('volunteerFormTitle').textContent = 'Edit Volunteer Profile';
    setFormFieldsDisabled('volunteerAdminForm', false);
    document.getElementById('volunteerAdminSubmitBtn').classList.remove('d-none');
    document.getElementById('volunteerFormEditBtn').classList.add('d-none');
  });
  document.getElementById('newEventBtn')?.addEventListener('click', () => {
    resetEventFormState();
    showEventsFormView(false);
  });
  document.getElementById('backToEventsBtn')?.addEventListener('click', () => {
    const origin = eventsEditOrigin;
    resetEventFormState();
    eventsEditOrigin = null;
    if (origin === 'urgent-notifications') {
      navigateTo('urgent-notifications');
    } else {
      showEventsListView();
    }
  });
  document.getElementById('eventFormEditBtn')?.addEventListener('click', () => {
    document.getElementById('eventFormTitle').textContent = 'Edit Event';
    setFormFieldsDisabled('eventForm', false);
    document.getElementById('eventSubmitBtn').classList.remove('d-none');
    document.getElementById('eventFormEditBtn').classList.add('d-none');
  });
  document.getElementById('newJobBtn')?.addEventListener('click', () => {
    resetJobFormState();
    showJobsFormView(false);
  });
  document.getElementById('backToJobsBtn')?.addEventListener('click', () => {
    const origin = jobsEditOrigin;
    resetJobFormState();
    jobsEditOrigin = null;
    if (origin === 'urgent-notifications') {
      navigateTo('urgent-notifications');
    } else {
      showJobsListView();
    }
  });
  document.getElementById('jobFormEditBtn')?.addEventListener('click', () => {
    document.getElementById('jobFormTitle').textContent = 'Edit Job Opportunity';
    setFormFieldsDisabled('jobForm', false);
    document.getElementById('jobSubmitBtn').classList.remove('d-none');
    document.getElementById('jobFormEditBtn').classList.add('d-none');
  });
  document.getElementById('newUserBtn')?.addEventListener('click', () => {
    resetUserFormState();
    showUsersFormView(false);
  });
  document.getElementById('backToUsersBtn')?.addEventListener('click', () => {
    resetUserFormState();
    showUsersListView();
  });
  document.getElementById('adminGenerateNewsletterQuickBtn')?.addEventListener('click', () => navigateTo('communications'));
  document.getElementById('adminUrgentAlertsQuickBtn')?.addEventListener('click', () => navigateTo('urgent-notifications'));

  // ─── Urgent Notifications UI ─────────────────────────────────────────────────────

  let urgentCurrentDraft = null; // holds the current draft context

  function showUrgentListView() {
    document.getElementById('view-urgent-list')?.classList.remove('d-none');
    document.getElementById('view-urgent-draft')?.classList.add('d-none');
  }

  function showUrgentDraftView() {
    document.getElementById('view-urgent-list')?.classList.add('d-none');
    document.getElementById('view-urgent-draft')?.classList.remove('d-none');
    document.getElementById('mainContent').scrollTop = 0;
  }

  function showUrgentError(message) {
    const el = document.getElementById('urgentNotifError');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('d-none');
    document.getElementById('urgentNotifSuccess')?.classList.add('d-none');
  }

  function showUrgentSuccess(message) {
    const el = document.getElementById('urgentNotifSuccess');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('d-none');
    document.getElementById('urgentNotifError')?.classList.add('d-none');
  }

  function clearUrgentMessages() {
    document.getElementById('urgentNotifError')?.classList.add('d-none');
    document.getElementById('urgentNotifSuccess')?.classList.add('d-none');
  }

  function getSelectedUrgentRecipients() {
    return Array.from(document.querySelectorAll('input[name="urgentRecipients"]:checked')).map((cb) => cb.value);
  }

  async function renderUrgentRecipients(suggestedEmails = []) {
    const container = document.getElementById('urgentRecipientsList');
    if (!container) return;
    const users = await Auth.getUsers();
    const suggestedSet = new Set(suggestedEmails.map((e) => String(e).toLowerCase()));
    // Exclude volunteers and admins
    const eligible = users.filter((user) => user.role !== 'VOLUNTEER' && user.role !== 'ADMIN');
    if (!eligible.length) {
      container.innerHTML = '<p class="text-muted small mb-0">No eligible recipients.</p>';
      return;
    }
    container.innerHTML = eligible.map((user) => {
      const suggested = suggestedSet.has(String(user.email).toLowerCase());
      return `
        <div class="form-check mb-1">
          <input class="form-check-input" type="checkbox" value="${escapeHtml(user.email)}"
            id="urgentRecipient_${escapeHtml(user.id)}" name="urgentRecipients"
            ${suggested ? 'checked' : ''}>
          <label class="form-check-label small" for="urgentRecipient_${escapeHtml(user.id)}">
            ${escapeHtml(user.name)}
            <span class="text-muted">(${escapeHtml(user.email)})</span>
            ${suggested ? '<span class="badge bg-success ms-1" style="font-size:0.65rem;">Matched</span>' : ''}
          </label>
        </div>`;
    }).join('');
  }

  async function renderUrgentOpportunitiesList() {
    const list = document.getElementById('urgentOpportunitiesList');
    const countBadge = document.getElementById('urgentOpportunityCount');
    if (!list) return;

    const { events, jobs } = await Auth.getUrgentOpportunities();
    const total = events.length + jobs.length;
    if (countBadge) countBadge.textContent = total;

    if (!total) {
      list.innerHTML = `
        <div class="p-4 text-center">
          <i class="bi bi-check-circle text-success fs-2 mb-2 d-block"></i>
          <div class="fw-semibold mb-1">No urgent opportunities right now</div>
          <div class="text-muted small">Events starting within 48 hours and jobs flagged as urgent will appear here.</div>
        </div>`;
      return;
    }

    const eventItems = events.map((event) => `
      <div class="p-3 border-bottom js-urgent-item" data-item-id="event-${escapeHtml(event.id)}">
        <div class="d-flex align-items-start gap-2">
          <input class="form-check-input flex-shrink-0 js-urgent-checkbox mt-1" type="checkbox"
            data-item-id="event-${escapeHtml(event.id)}" style="cursor:pointer;">
          <span class="badge bg-danger mt-1" style="font-size:0.65rem; white-space:nowrap;">
            ${event.isUrgent ? 'URGENT' : 'SOON'}
          </span>
          <div class="flex-grow-1">
            <div class="fw-semibold small">${escapeHtml(event.title)}</div>
            <div class="text-muted" style="font-size:0.78rem;">
              <i class="bi bi-calendar2 me-1"></i>${escapeHtml(event.dateTimeLabel)}
            </div>
            <div class="text-muted" style="font-size:0.78rem;">
              <i class="bi bi-geo-alt me-1"></i>${escapeHtml(event.location)}
            </div>
            <span class="badge bg-light text-dark border mt-1" style="font-size:0.65rem;">${escapeHtml(event.category)}</span>
          </div>
        </div>
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-sm btn-outline-danger flex-grow-1"
            data-urgent-type="event" data-urgent-id="${escapeHtml(event.id)}" data-urgent-title="${escapeHtml(event.title)}">
            <i class="bi bi-send me-1"></i>Draft Notification
          </button>
          <button class="btn btn-sm btn-outline-secondary js-urgent-edit-event" data-event-id="${escapeHtml(event.id)}">
            <i class="bi bi-pencil me-1"></i>Edit
          </button>
        </div>
      </div>`).join('');

    const jobItems = jobs.map((job) => `
      <div class="p-3 border-bottom js-urgent-item" data-item-id="job-${escapeHtml(job.id)}">
        <div class="d-flex align-items-start gap-2">
          <input class="form-check-input flex-shrink-0 js-urgent-checkbox mt-1" type="checkbox"
            data-item-id="job-${escapeHtml(job.id)}" style="cursor:pointer;">
          <span class="badge bg-danger mt-1" style="font-size:0.65rem;">URGENT</span>
          <div class="flex-grow-1">
            <div class="fw-semibold small">${escapeHtml(job.title)}</div>
            <div class="text-muted" style="font-size:0.78rem;">
              <i class="bi bi-building me-1"></i>${escapeHtml(job.employer)}
            </div>
            <div class="text-muted" style="font-size:0.78rem;">
              <i class="bi bi-geo-alt me-1"></i>${escapeHtml(job.location || 'Local area')}
            </div>
            ${job.salary ? `<div class="text-muted" style="font-size:0.78rem;"><i class="bi bi-currency-dollar"></i>${escapeHtml(job.salary)}</div>` : ''}
          </div>
        </div>
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-sm btn-outline-danger flex-grow-1"
            data-urgent-type="job" data-urgent-id="${escapeHtml(job.id)}" data-urgent-title="${escapeHtml(job.title)}">
            <i class="bi bi-send me-1"></i>Draft Notification
          </button>
          <button class="btn btn-sm btn-outline-secondary js-urgent-edit-job" data-job-id="${escapeHtml(job.id)}">
            <i class="bi bi-pencil me-1"></i>Edit
          </button>
        </div>
      </div>`).join('');

    list.innerHTML = eventItems + jobItems;

    // Wire Draft Notification buttons
    list.querySelectorAll('[data-urgent-type]').forEach((btn) => {
      btn.addEventListener('click', () => loadUrgentDraft(btn.dataset.urgentType, btn.dataset.urgentId, btn.dataset.urgentTitle));
    });

    // Wire checkboxes — highlight selected rows and show/hide selection actions
    const selectionActions = document.getElementById('urgentSelectionActions');
    function syncSelectionState() {
      const checked = list.querySelectorAll('.js-urgent-checkbox:checked');
      list.querySelectorAll('.js-urgent-item').forEach((row) => {
        const cb = row.querySelector('.js-urgent-checkbox');
        row.style.background = cb?.checked ? 'rgba(220,53,69,0.06)' : '';
      });
      if (selectionActions) selectionActions.classList.toggle('d-none', checked.length === 0);
    }
    list.querySelectorAll('.js-urgent-checkbox').forEach((cb) => {
      cb.addEventListener('change', syncSelectionState);
    });

    // Clear selection
    const clearSelBtn = document.getElementById('urgentClearSelectionBtn');
    if (clearSelBtn) {
      const newClear = clearSelBtn.cloneNode(true);
      clearSelBtn.replaceWith(newClear);
      newClear.addEventListener('click', () => {
        list.querySelectorAll('.js-urgent-checkbox').forEach((cb) => { cb.checked = false; });
        syncSelectionState();
      });
    }

    // Delete selected
    const deleteSelBtn = document.getElementById('urgentDeleteSelectedBtn');
    if (deleteSelBtn) {
      const newDelete = deleteSelBtn.cloneNode(true);
      deleteSelBtn.replaceWith(newDelete);
      newDelete.addEventListener('click', async () => {
        const checked = list.querySelectorAll('.js-urgent-checkbox:checked');
        if (!checked.length) return;
        const count = checked.length;
        if (!confirm(`Delete ${count} selected opportunit${count > 1 ? 'ies' : 'y'}? This cannot be undone.`)) return;
        const removes = Array.from(checked).map((cb) => {
          const [type, id] = cb.dataset.itemId.split('-');
          return type === 'event' ? Auth.removeEvent(id) : Auth.removeJob(id);
        });
        await Promise.all(removes);
        showToast(`${count} opportunit${count > 1 ? 'ies' : 'y'} deleted.`);
        await renderUrgentOpportunitiesList();
        await renderUrgentDispatchHistory();
      });
    }

    // Wire Edit Event buttons
    list.querySelectorAll('.js-urgent-edit-event').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const events = await Auth.getEvents();
        const event = events.find((e) => String(e.id) === String(btn.dataset.eventId));
        if (!event) return;
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventCategory').value = event.category || '';
        document.getElementById('eventDateTime').value = event.dateTime || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventCost').value = event.cost || '';
        document.getElementById('eventAccommodations').value = event.accommodations || '';
        const urgentCheck = document.getElementById('eventIsUrgent');
        if (urgentCheck) urgentCheck.checked = Boolean(event.isUrgent);
        editingEventId = event.id;
        eventsEditOrigin = 'urgent-notifications';
        document.getElementById('eventSubmitBtn').textContent = 'Update Event';
        navigateTo('events');
        showEventsFormView(true);
      });
    });

    // Wire Edit Job buttons
    list.querySelectorAll('.js-urgent-edit-job').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const jobs = await Auth.getJobs();
        const job = jobs.find((j) => String(j.id) === String(btn.dataset.jobId));
        if (!job) return;
        document.getElementById('jobTitle').value = job.title || '';
        document.getElementById('jobEmployer').value = job.employer || '';
        document.getElementById('jobLocation').value = job.location || '';
        document.getElementById('jobType').value = job.jobType || '';
        document.getElementById('jobStatus').value = job.status || '';
        document.getElementById('jobSalary').value = job.salary || '';
        document.getElementById('jobRequirements').value = job.requirements || '';
        const urgentCheck = document.getElementById('jobIsUrgent');
        if (urgentCheck) urgentCheck.checked = Boolean(job.isUrgent);
        editingJobId = job.id;
        jobsEditOrigin = 'urgent-notifications';
        document.getElementById('jobSubmitBtn').textContent = 'Update Job Opportunity';
        navigateTo('jobs');
        showJobsFormView(true);
      });
    });
  }

  async function loadUrgentDraft(type, id, title) {
    clearUrgentMessages();
    const badge = document.getElementById('urgentDraftOpportunityBadge');
    if (badge) {
      badge.textContent = `${type === 'event' ? '📅 Event' : '💼 Job'}: ${title}`;
      badge.classList.remove('d-none');
      badge.className = `badge ms-auto ${type === 'event' ? 'bg-primary' : 'bg-warning text-dark'}`;
    }

    const result = await Auth.generateUrgentDraft(type, id);
    if (!result.success) {
      showUrgentError(result.message || 'Unable to generate draft.');
      return;
    }

    urgentCurrentDraft = result;

    document.getElementById('urgentSubject').value = result.subject;
    document.getElementById('urgentBody').value = result.body;

    const banner = document.getElementById('urgentMatchBanner');
    if (banner) {
      if (result.wasFallback) {
        banner.className = 'alert alert-warning mb-3 py-2 small';
        banner.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i><strong>No precise profile matches found.</strong> All ${result.totalParticipantCount} participant(s) and their guardians have been pre-selected as recipients.`;
      } else {
        banner.className = 'alert alert-success mb-3 py-2 small';
        banner.innerHTML = `<i class="bi bi-bullseye me-1"></i><strong>${result.matchedParticipantCount} participant(s) matched</strong> based on profile keywords. Their contact emails and linked guardian emails are pre-selected below.`;
      }
    }

    await renderUrgentRecipients(result.suggestedRecipientEmails);

    showUrgentDraftView();
  }

  async function renderUrgentDispatchHistory() {
    const container = document.getElementById('urgentDispatchHistory');
    if (!container) return;
    const [history, users] = await Promise.all([Auth.getUrgentNotificationHistory(), Auth.getUsers()]);
    if (!history.length) {
      container.innerHTML = '<div class="p-3 text-muted small text-center">No alerts sent yet.</div>';
      return;
    }
    const emailToUser = Object.fromEntries(users.map((u) => [u.email.toLowerCase(), u]));
    container.innerHTML = history.slice(0, 10).map((entry) => {
      const recipientList = Array.isArray(entry.recipients) && entry.recipients.length
        ? entry.recipients.map((email) => {
            const user = emailToUser[email.toLowerCase()];
            return user
              ? `<button class="btn btn-link p-0 js-dispatch-recipient" data-user-id="${escapeHtml(user.id)}" data-user-role="${escapeHtml(user.role)}"
                   title="${escapeHtml(email)}" style="font-size:inherit;vertical-align:baseline;">
                   ${escapeHtml(user.name)}
                 </button>`
              : `<span class="text-muted">${escapeHtml(email)}</span>`;
          }).join(', ')
        : '<span class="text-muted">—</span>';

      return `
      <div class="p-3 border-bottom">
        <div class="d-flex align-items-start gap-2 mb-1">
          <i class="bi bi-send-fill text-danger mt-1 flex-shrink-0" style="font-size: 0.8rem;"></i>
          <div>
            <div class="fw-semibold" style="font-size:0.82rem; line-height:1.3;">${escapeHtml(entry.subject)}</div>
            <div class="text-muted" style="font-size:0.73rem;">${escapeHtml(entry.opportunityTitle || entry.opportunityType || '')}</div>
          </div>
        </div>
        <div class="text-muted mb-1" style="font-size:0.72rem;">
          <i class="bi bi-person-check me-1"></i>${escapeHtml(entry.sentByName)} &bull;
          <i class="bi bi-clock me-1 ms-1"></i>${escapeHtml(entry.sentAtLabel)}
        </div>
        <div style="font-size:0.72rem;">
          <span class="text-muted"><i class="bi bi-people me-1"></i>Recipients:</span>
          <span class="ms-1">${recipientList}</span>
        </div>
      </div>`;
    }).join('');

    // Wire recipient name clicks → open participant record in view mode
    container.querySelectorAll('.js-dispatch-recipient').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const participants = await Auth.getParticipants();
        let participant = null;
        if (btn.dataset.userRole === 'PARTICIPANT') {
          participant = participants.find((p) => String(p.participantUserId) === String(btn.dataset.userId));
        } else if (btn.dataset.userRole === 'GUARDIAN') {
          participant = participants.find((p) => p.guardianUserIds.includes(btn.dataset.userId));
        }
        if (!participant) { showToast('No participant record linked to this user.'); return; }

        document.getElementById('participantFirstName').value = participant.firstName || '';
        document.getElementById('participantLastName').value = participant.lastName || '';
        document.getElementById('participantAge').value = participant.age || '';
        document.getElementById('participantUserId').value = participant.participantUserId || '';
        Array.from(document.getElementById('participantGuardianIds').options).forEach((opt) => {
          opt.selected = participant.guardianUserIds.includes(opt.value);
        });
        document.getElementById('participantEmail').value = participant.contactEmail || '';
        document.getElementById('participantPhone').value = participant.contactPhone || '';
        document.getElementById('participantInterests').value = participant.participantInterests.join(', ');
        document.getElementById('participantJobGoals').value = participant.jobGoals || '';
        document.getElementById('participantSpecialNeeds').value = participant.specialNeeds || '';
        document.getElementById('participantMedicalNotes').value = participant.medicalNotes || '';
        document.getElementById('participantSensoryNotes').value = participant.sensoryNotes || '';
        document.getElementById('participantGuardianNotes').value = participant.guardianNotes || '';
        document.getElementById('participantCreateUserToggle').checked = false;
        toggleInlineParticipantUserFields();
        editingParticipantId = participant.id;
        participantError.classList.add('d-none');
        participantForm.classList.remove('was-validated');
        participantsViewOrigin = 'urgent-notifications';
        navigateTo('participants');
        showParticipantsFormView(true, true);
      });
    });
  }

  document.getElementById('urgentSendBtn')?.addEventListener('click', async () => {
    clearUrgentMessages();
    const subject = document.getElementById('urgentSubject')?.value?.trim();
    const body = document.getElementById('urgentBody')?.value?.trim();
    const recipients = getSelectedUrgentRecipients();

    if (!subject || !body) {
      showUrgentError('Please provide a subject and message body before sending.');
      return;
    }
    if (!recipients.length) {
      showUrgentError('Select at least one recipient before sending.');
      return;
    }

    const payload = {
      subject,
      body,
      recipients,
      opportunityType: urgentCurrentDraft?.opportunityType || '',
      opportunityId: urgentCurrentDraft?.opportunityId || '',
      opportunityTitle: urgentCurrentDraft?.opportunityTitle || ''
    };

    const btn = document.getElementById('urgentSendBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending…'; }

    const result = await Auth.sendUrgentNotification(payload);

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-send-fill me-2"></i>Send Urgent Notification'; }

    if (!result.success) {
      showUrgentError(result.message || 'Unable to send notification.');
      return;
    }

    showToast(`Urgent alert sent to ${result.recipientCount} recipient(s).`);
    urgentCurrentDraft = null;

    await renderUrgentDispatchHistory();
    showUrgentListView();
  });

  document.getElementById('urgentSelectAllRecipientsBtn')?.addEventListener('click', () => {
    document.querySelectorAll('input[name="urgentRecipients"]').forEach((cb) => { cb.checked = true; });
  });

  document.getElementById('urgentClearRecipientsBtn')?.addEventListener('click', () => {
    document.querySelectorAll('input[name="urgentRecipients"]').forEach((cb) => { cb.checked = false; });
  });

  document.getElementById('backToUrgentListBtn')?.addEventListener('click', () => {
    showUrgentListView();
  });

  document.getElementById('urgentRefreshBtn')?.addEventListener('click', async () => {
    await renderUrgentOpportunitiesList();
    await renderUrgentDispatchHistory();
    showToast('Urgent opportunities refreshed.');
  });

  await renderUrgentOpportunitiesList();
  await renderUrgentDispatchHistory();

  document.getElementById('newsletterPreviewBtn')?.addEventListener('click', () => {
    clearNewsletterMessages();
    renderNewsletterPreview();
  });

  document.getElementById('newsletterSaveDraftBtn')?.addEventListener('click', async () => {
    clearNewsletterMessages();
    const result = await Auth.saveNewsletterDraft(getNewsletterPayload());
    if (!result.success) {
      showNewsletterError(result.message || 'Unable to save draft.');
      return;
    }
    showNewsletterSuccess('Draft saved successfully.');
    renderNewsletterPreview();
  });

  newsletterForm?.addEventListener('input', () => clearNewsletterMessages());
  newsletterForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    newsletterForm.classList.add('was-validated');
    clearNewsletterMessages();
    const payload = getNewsletterPayload();
    if (!newsletterForm.checkValidity()) {
      showNewsletterError('Please complete required newsletter fields.');
      return;
    }
    if (!payload.recipients.length) {
      showNewsletterError('Select at least one recipient before distributing.');
      return;
    }
    const result = await Auth.distributeNewsletter(payload);
    if (!result.success) {
      showNewsletterError(result.message || 'Distribution failed. Retry or save as draft.');
      return;
    }
    showNewsletterSuccess(`Newsletter distributed successfully to ${result.recipientCount} recipient(s).`);
    newsletterForm.reset();
    newsletterForm.classList.remove('was-validated');
    await renderNewsletterRecipients();
    await renderNewsletterHistory();
    renderNewsletterPreview();
  });

  // ─── Task Assignment & Delegation (Story 1001) ────────────────────────────

  const INQ_STATUS_BADGE = {
    PENDING_REVIEW: 'bg-secondary',
    IN_PROGRESS: 'bg-primary',
    RESOLVED: 'bg-success',
    REJECTED: 'bg-danger'
  };
  const INQ_STATUS_LABEL = {
    PENDING_REVIEW: 'Pending Review',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    REJECTED: 'Rejected'
  };
  const TASK_STATUS_BADGE = {
    UNASSIGNED: 'bg-light text-dark border',
    ASSIGNED: 'bg-primary',
    IN_PROGRESS: 'bg-warning text-dark',
    COMPLETED: 'bg-success',
    REJECTED: 'bg-danger'
  };
  const TASK_STATUS_LABEL = {
    UNASSIGNED: 'Unassigned',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected'
  };

  let currentInquiryId = null;
  let currentAssignTaskId = null;
  let currentDeleteTaskId = null;
  let currentChecklistTaskId = null;
  let currentInquiryFilter = 'ALL';
  let currentTaskFilter = 'ALL';
  let currentVolunteerFilter = '';
  let currentWqTab = 'inquiries';

  // ── Unified Work Queue rendering ─────────────────────────────────────────

  async function renderWqInquiriesList(filter, volunteerFilter) {
    if (filter === undefined) filter = currentInquiryFilter;
    if (volunteerFilter === undefined) volunteerFilter = currentVolunteerFilter;
    const container = document.getElementById('wqInquiriesList');
    if (!container) return;
    const { inquiries } = await Auth.getWorkQueueData();
    let filtered = filter === 'ALL' ? inquiries : inquiries.filter((i) => i.status === filter);
    if (volunteerFilter) {
      filtered = filtered.filter((inq) =>
        inq.tasks.some((t) => String(t.assignedToUserId) === String(volunteerFilter))
      );
    }
    if (!filtered.length) {
      container.innerHTML = `<div class="text-center text-muted py-4 small">No inquiries found.</div>`;
      return;
    }
    container.innerHTML = filtered.map((inq) => {
      const badge = INQ_STATUS_BADGE[inq.status] || 'bg-secondary';
      const label = INQ_STATUS_LABEL[inq.status] || inq.status;
      const taskCount = inq.tasks.length;
      const isRejected = inq.status === 'REJECTED';
      const isResolved = inq.status === 'RESOLVED';
      const canAddTask = !isRejected && !isResolved;

      const taskRows = inq.tasks.length
        ? inq.tasks.map((t) => {
            const isArchived = !!t.archived;
            const tb = TASK_STATUS_BADGE[t.status] || 'bg-secondary';
            const tl = TASK_STATUS_LABEL[t.status] || t.status;
            const canAssign = !['COMPLETED', 'REJECTED'].includes(t.status) && !isArchived;
            const canChecklist = !isArchived && !['COMPLETED', 'REJECTED'].includes(t.status);
            const checkCount = (t.checklistItems || []).length;
            return `<div class="d-flex align-items-center gap-2 py-2 border-bottom flex-wrap${isArchived ? ' opacity-50' : ''}">
              <i class="bi bi-arrow-return-right text-muted small"></i>
              <span class="small fw-semibold flex-grow-1">${escapeHtml(t.title)}</span>
              ${isArchived
                ? `<span class="badge bg-secondary me-1">Archived</span>`
                : `<span class="badge ${tb} me-1">${escapeHtml(tl)}</span>`
              }
              ${checkCount ? `<span class="badge bg-light text-dark border me-1"><i class="bi bi-list-check me-1"></i>${checkCount}</span>` : ''}
              <span class="small text-muted me-1">${escapeHtml(t.assignedToName || 'Unassigned')}</span>
              ${isArchived
                ? `<button class="btn btn-sm btn-outline-secondary js-task-unarchive" data-task-id="${escapeHtml(t.id)}">Unarchive</button>`
                : canAssign
                  ? `<button class="btn btn-sm btn-outline-primary js-task-assign" data-task-id="${escapeHtml(t.id)}">Assign</button>`
                  : ''
              }
              ${canChecklist ? `<button class="btn btn-sm btn-outline-secondary js-task-checklist" data-task-id="${escapeHtml(t.id)}" title="Manage Checklist"><i class="bi bi-list-check"></i></button>` : ''}
              ${!isArchived ? `<button class="btn btn-sm btn-outline-secondary js-task-archive-toggle" data-task-id="${escapeHtml(t.id)}" title="Archive"><i class="bi bi-archive"></i></button>` : ''}
              <button class="btn btn-sm btn-outline-danger js-task-delete" data-task-id="${escapeHtml(t.id)}" data-task-title="${escapeHtml(t.title)}" title="Delete"><i class="bi bi-trash"></i></button>
            </div>`;
          }).join('')
        : `<p class="text-muted small mb-0">No tasks created yet.</p>`;

      const rejectionInfo = isRejected && inq.rejectionNote
        ? `<p class="text-danger small mb-2"><i class="bi bi-x-circle me-1"></i>${escapeHtml(inq.rejectionNote)}</p>`
        : '';

      return `
      <div class="card shadow-sm mb-2">
        <div class="card-header d-flex align-items-center gap-2 py-2 flex-wrap" style="cursor:pointer;"
             data-bs-toggle="collapse" data-bs-target="#inqCollapse${escapeHtml(inq.id)}" aria-expanded="false">
          <span class="badge ${badge}">${escapeHtml(label)}</span>
          <span class="fw-semibold small flex-grow-1">${escapeHtml(inq.subject)}</span>
          <span class="text-muted small me-1">${escapeHtml(inq.submittedByName)}</span>
          <span class="badge bg-secondary me-1">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
          <span class="text-muted small me-2">${escapeHtml(inq.createdAtLabel)}</span>
          ${!isRejected
            ? `<button class="btn btn-sm ${isResolved ? 'btn-outline-secondary' : 'btn-outline-primary'} js-inq-review me-1"
                       data-inq-id="${escapeHtml(inq.id)}"
                       onclick="event.stopPropagation()">
                 ${isResolved ? 'View' : 'Review'}
               </button>`
            : ''
          }
          <i class="bi bi-chevron-down small text-muted"></i>
        </div>
        <div class="collapse" id="inqCollapse${escapeHtml(inq.id)}">
          <div class="card-body py-2 px-3">
            <p class="text-muted small mb-2" style="white-space:pre-wrap;">${escapeHtml(inq.description)}</p>
            ${rejectionInfo}
            ${taskRows}
            ${canAddTask
              ? `<button class="btn btn-sm btn-outline-primary mt-2 js-inq-review"
                         data-inq-id="${escapeHtml(inq.id)}">
                   <i class="bi bi-plus me-1"></i>Add Task
                 </button>`
              : ''
            }
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.js-inq-review').forEach((btn) => {
      btn.addEventListener('click', () => openInquiryReviewModal(btn.dataset.inqId));
    });
    container.querySelectorAll('.js-task-assign').forEach((btn) => {
      btn.addEventListener('click', () => openTaskAssignModal(btn.dataset.taskId));
    });
    _wireTaskCrudButtons(container);
  }

  async function renderWqStandaloneList(statusFilter, volunteerFilter) {
    if (statusFilter === undefined) statusFilter = currentTaskFilter;
    if (volunteerFilter === undefined) volunteerFilter = currentVolunteerFilter;
    const container = document.getElementById('wqStandaloneList');
    if (!container) return;
    const { standaloneTasks } = await Auth.getWorkQueueData();
    let tasks = standaloneTasks;
    if (statusFilter !== 'ALL') tasks = tasks.filter((t) => t.status === statusFilter);
    if (volunteerFilter) tasks = tasks.filter((t) => String(t.assignedToUserId) === String(volunteerFilter));
    if (!tasks.length) {
      container.innerHTML = `<div class="text-center text-muted py-4 small">No standalone tasks found.</div>`;
      return;
    }
    container.innerHTML = tasks.map((task) => {
      const badge = TASK_STATUS_BADGE[task.status] || 'bg-secondary';
      const label = TASK_STATUS_LABEL[task.status] || task.status;
      const isResolved = ['COMPLETED', 'REJECTED'].includes(task.status);
      const canAssign = task.status === 'UNASSIGNED';
      const eventChip = task.eventTitle
        ? `<span class="badge bg-info text-dark me-1"><i class="bi bi-calendar-event me-1"></i>${escapeHtml(task.eventTitle)}</span>`
        : '';
      const noteDisplay = task.volunteerNote
        ? `<p class="text-muted small mb-0 mt-1" title="${escapeHtml(task.volunteerNote)}">${escapeHtml(task.volunteerNote.substring(0, 80))}${task.volunteerNote.length > 80 ? '…' : ''}</p>`
        : '';
      const isArchived = !!task.archived;
      const checkCount = (task.checklistItems || []).length;
      const canChecklist = !isArchived && !isResolved;
      return `
      <div class="card shadow-sm mb-2${isArchived ? ' opacity-50' : ''}">
        <div class="card-body py-2 px-3 d-flex align-items-start gap-2">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <span class="badge bg-secondary"><i class="bi bi-clipboard me-1"></i>Standalone</span>
              ${eventChip}
              ${isArchived ? `<span class="badge bg-secondary">Archived</span>` : `<span class="badge ${badge}">${escapeHtml(label)}</span>`}
              ${checkCount ? `<span class="badge bg-light text-dark border"><i class="bi bi-list-check me-1"></i>${checkCount}</span>` : ''}
            </div>
            <div class="fw-semibold small">${escapeHtml(task.title)}</div>
            ${task.description ? `<p class="text-muted small mb-0 mt-1">${escapeHtml(task.description)}</p>` : ''}
            ${noteDisplay}
            <p class="text-muted small mb-0 mt-1">
              ${task.assignedToName ? `<i class="bi bi-person me-1"></i>${escapeHtml(task.assignedToName)}` : 'Unassigned'}
              &nbsp;·&nbsp; Created ${escapeHtml(task.createdAtLabel)}
            </p>
          </div>
          <div class="d-flex flex-column gap-1 flex-shrink-0">
            ${isArchived
              ? `<button class="btn btn-sm btn-outline-secondary js-task-unarchive" data-task-id="${escapeHtml(task.id)}">Unarchive</button>`
              : !isResolved
                ? `<button class="btn btn-sm ${canAssign ? 'btn-outline-primary' : 'btn-outline-secondary'} js-task-assign" data-task-id="${escapeHtml(task.id)}">${canAssign ? 'Assign' : 'Reassign'}</button>`
                : ''
            }
            ${canChecklist ? `<button class="btn btn-sm btn-outline-secondary js-task-checklist" data-task-id="${escapeHtml(task.id)}" title="Manage Checklist"><i class="bi bi-list-check"></i></button>` : ''}
            ${!isArchived ? `<button class="btn btn-sm btn-outline-secondary js-task-archive-toggle" data-task-id="${escapeHtml(task.id)}" title="Archive"><i class="bi bi-archive"></i></button>` : ''}
            <button class="btn btn-sm btn-outline-danger js-task-delete" data-task-id="${escapeHtml(task.id)}" data-task-title="${escapeHtml(task.title)}" title="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.js-task-assign').forEach((btn) => {
      btn.addEventListener('click', () => openTaskAssignModal(btn.dataset.taskId));
    });
    _wireTaskCrudButtons(container);
  }

  // ── Shared task CRUD button wiring (used by both WQ render functions) ───────

  function _wireTaskCrudButtons(container) {
    container.querySelectorAll('.js-task-archive-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await Auth.archiveTask(btn.dataset.taskId);
        await renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
        await renderWqStandaloneList(currentTaskFilter, currentVolunteerFilter);
      });
    });
    container.querySelectorAll('.js-task-unarchive').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await Auth.unarchiveTask(btn.dataset.taskId);
        await renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
        await renderWqStandaloneList(currentTaskFilter, currentVolunteerFilter);
      });
    });
    container.querySelectorAll('.js-task-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentDeleteTaskId = btn.dataset.taskId;
        document.getElementById('deleteTaskTitle').textContent = btn.dataset.taskTitle;
        bootstrap.Modal.getOrCreateInstance(document.getElementById('taskDeleteModal')).show();
      });
    });
    container.querySelectorAll('.js-task-checklist').forEach((btn) => {
      btn.addEventListener('click', () => openChecklistModal(btn.dataset.taskId));
    });
  }

  document.getElementById('taskDeleteConfirmBtn')?.addEventListener('click', async () => {
    const result = await Auth.deleteTask(currentDeleteTaskId);
    bootstrap.Modal.getInstance(document.getElementById('taskDeleteModal'))?.hide();
    if (result.success) {
      showToast('Task deleted.');
      await renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
      await renderWqStandaloneList(currentTaskFilter, currentVolunteerFilter);
    }
  });

  async function openChecklistModal(taskId) {
    currentChecklistTaskId = taskId;
    await renderChecklistModalContent(taskId);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('taskChecklistModal')).show();
  }

  async function renderChecklistModalContent(taskId) {
    const tasks = await Auth.getAllTasks();
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;
    document.getElementById('checklistModalTaskTitle').textContent = task.title;
    const items = task.checklistItems || [];
    const list = document.getElementById('checklistItemsList');
    list.innerHTML = items.length
      ? items.map((item) => `
          <li class="list-group-item d-flex align-items-center gap-2 py-2 small">
            <i class="bi bi-grip-vertical text-muted"></i>
            <span class="flex-grow-1">${escapeHtml(item.text)}</span>
            ${item.done ? `<span class="badge bg-success me-1 text-nowrap"><i class="bi bi-check me-1"></i>Done</span>` : ''}
            <button class="btn btn-sm btn-outline-danger js-cli-remove" data-item-id="${escapeHtml(item.id)}" style="padding:.1rem .35rem;">
              <i class="bi bi-x"></i>
            </button>
          </li>`).join('')
      : `<li class="list-group-item text-muted small py-2">No checklist items yet.</li>`;
    list.querySelectorAll('.js-cli-remove').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await Auth.removeChecklistItem(taskId, btn.dataset.itemId);
        await renderChecklistModalContent(taskId);
      });
    });
    const input = document.getElementById('checklistNewItemText');
    if (input) input.value = '';
  }

  document.getElementById('checklistAddItemBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('checklistNewItemText');
    const text = input?.value.trim();
    if (!text) { if (input) input.focus(); return; }
    await Auth.addChecklistItem(currentChecklistTaskId, text);
    await renderChecklistModalContent(currentChecklistTaskId);
  });

  document.getElementById('checklistNewItemText')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('checklistAddItemBtn')?.click();
    }
  });

  // ── End task CRUD helpers ────────────────────────────────────────────────────

  async function renderModalInqTasksList(inquiryId) {
    const container = document.getElementById('modalInqTasksList');
    if (!container) return;
    const tasks = await Auth.getAllTasks();
    const linked = tasks.filter((t) => String(t.inquiryId) === String(inquiryId));
    if (!linked.length) {
      container.innerHTML = `<p class="text-muted small mb-0">No tasks yet. Create one below.</p>`;
      return;
    }
    container.innerHTML = `<ul class="list-group list-group-flush border rounded">
      ${linked.map((t) => {
        const badge = TASK_STATUS_BADGE[t.status] || 'bg-secondary';
        const label = TASK_STATUS_LABEL[t.status] || t.status;
        const canAssign = t.status === 'UNASSIGNED' || t.status === 'ASSIGNED';
        return `<li class="list-group-item d-flex align-items-center gap-2 small py-2">
          <span class="flex-grow-1">${escapeHtml(t.title)}</span>
          <span class="badge ${badge}">${escapeHtml(label)}</span>
          ${canAssign ? `<button class="btn btn-sm btn-outline-primary js-modal-task-assign" data-task-id="${escapeHtml(t.id)}">${t.assignedToName ? 'Reassign' : 'Assign'}</button>` : ''}
        </li>`;
      }).join('')}
    </ul>`;
    container.querySelectorAll('.js-modal-task-assign').forEach((btn) => {
      btn.addEventListener('click', () => openTaskAssignModal(btn.dataset.taskId));
    });
  }

  async function openInquiryReviewModal(inquiryId) {
    currentInquiryId = inquiryId;
    const inquiries = await Auth.getAllInquiries();
    const inq = inquiries.find((i) => String(i.id) === String(inquiryId));
    if (!inq) return;
    document.getElementById('modalInqSubject').textContent = inq.subject;
    document.getElementById('modalInqSubmitter').textContent = inq.submittedByName;
    document.getElementById('modalInqDate').textContent = inq.createdAtLabel;
    document.getElementById('modalInqDescription').textContent = inq.description;
    const errEl = document.getElementById('inquiryReviewError');
    if (errEl) errEl.classList.add('d-none');
    // Reset reject panel
    const rejectPanel = document.getElementById('inquiryRejectPanel');
    if (rejectPanel) rejectPanel.classList.add('d-none');
    const rejectNote = document.getElementById('inquiryRejectNote');
    if (rejectNote) rejectNote.value = '';
    // Show/hide reject button and create-task form based on status
    const isRejected = inq.status === 'REJECTED';
    const isResolved = inq.status === 'RESOLVED';
    const rejectBtn = document.getElementById('inquiryRejectBtn');
    if (rejectBtn) rejectBtn.classList.toggle('d-none', isRejected || isResolved);
    const createTaskForm = document.getElementById('inquiryCreateTaskForm');
    if (createTaskForm) createTaskForm.classList.toggle('d-none', isRejected || isResolved);
    const titleInput = document.getElementById('modalNewTaskTitle');
    const descInput = document.getElementById('modalNewTaskDescription');
    if (titleInput) { titleInput.value = ''; titleInput.classList.remove('is-invalid'); }
    if (descInput) descInput.value = '';
    await renderModalInqTasksList(inquiryId);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('inquiryReviewModal')).show();
  }

  // Reject inquiry flow
  document.getElementById('inquiryRejectBtn')?.addEventListener('click', () => {
    document.getElementById('inquiryRejectPanel')?.classList.toggle('d-none');
  });
  document.getElementById('inquiryRejectCancelBtn')?.addEventListener('click', () => {
    document.getElementById('inquiryRejectPanel')?.classList.add('d-none');
    const rejectNote = document.getElementById('inquiryRejectNote');
    if (rejectNote) rejectNote.value = '';
  });
  document.getElementById('inquiryRejectConfirmBtn')?.addEventListener('click', async () => {
    const note = document.getElementById('inquiryRejectNote')?.value.trim() || '';
    const errEl = document.getElementById('inquiryReviewError');
    if (errEl) errEl.classList.add('d-none');
    const result = await Auth.rejectInquiry(currentInquiryId, note);
    if (!result.success) {
      if (errEl) { errEl.textContent = result.message || 'Failed to reject inquiry.'; errEl.classList.remove('d-none'); }
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById('inquiryReviewModal'))?.hide();
    showToast('Inquiry rejected.');
    await renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
  });

  document.getElementById('inquiryCreateTaskBtn')?.addEventListener('click', async () => {
    const titleInput = document.getElementById('modalNewTaskTitle');
    const descInput = document.getElementById('modalNewTaskDescription');
    const errEl = document.getElementById('inquiryReviewError');
    if (errEl) errEl.classList.add('d-none');
    if (titleInput) titleInput.classList.remove('is-invalid');
    const title = titleInput?.value.trim();
    if (!title) {
      if (titleInput) titleInput.classList.add('is-invalid');
      return;
    }
    const description = descInput?.value.trim() || '';
    const result = await Auth.createTaskFromInquiry(currentInquiryId, { title, description });
    if (!result.success) {
      if (errEl) { errEl.textContent = result.message || 'Failed to create task.'; errEl.classList.remove('d-none'); }
      return;
    }
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    await renderModalInqTasksList(currentInquiryId);
    await renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
    // Immediately offer assignment for the new task
    openTaskAssignModal(result.taskId);
  });

  // Inquiry status filter pills
  document.querySelectorAll('[data-inq-filter]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('[data-inq-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentInquiryFilter = btn.dataset.inqFilter;
      await renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
    });
  });

  // Task status filter pills (standalone pane)
  document.querySelectorAll('[data-task-filter]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('[data-task-filter]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTaskFilter = btn.dataset.taskFilter;
      await renderWqStandaloneList(currentTaskFilter, currentVolunteerFilter);
    });
  });

  // Volunteer filter selects
  async function populateVolunteerFilters() {
    const cleared = await Auth.getClearedVolunteers();
    ['standaloneVolunteerFilter', 'inquiryVolunteerFilter'].forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = `<option value="">All Volunteers</option>`;
      cleared.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.userId;
        opt.textContent = v.name;
        if (String(v.userId) === current) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }

  document.getElementById('inquiryVolunteerFilter')?.addEventListener('change', async (e) => {
    currentVolunteerFilter = e.target.value;
    await renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
  });
  document.getElementById('standaloneVolunteerFilter')?.addEventListener('change', async (e) => {
    currentVolunteerFilter = e.target.value;
    await renderWqStandaloneList(currentTaskFilter, currentVolunteerFilter);
  });

  // Work Queue sub-tab wiring
  document.querySelectorAll('[data-wq-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-wq-tab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentWqTab = btn.dataset.wqTab;
      document.getElementById('wq-inquiries-pane')?.classList.toggle('d-none', currentWqTab !== 'inquiries');
      document.getElementById('wq-standalone-pane')?.classList.toggle('d-none', currentWqTab !== 'standalone');
    });
  });

  // Standalone task creation modal
  document.getElementById('newStandaloneTaskBtn')?.addEventListener('click', async () => {
    const select = document.getElementById('stTaskEventSelect');
    if (select) {
      select.innerHTML = `<option value="">— No event link —</option>`;
      const events = await Auth.getEvents();
      events.forEach((ev) => {
        const opt = document.createElement('option');
        opt.value = ev.id;
        opt.textContent = ev.title;
        select.appendChild(opt);
      });
    }
    const titleInput = document.getElementById('stTaskTitle');
    const descInput = document.getElementById('stTaskDescription');
    if (titleInput) { titleInput.value = ''; titleInput.classList.remove('is-invalid'); }
    if (descInput) descInput.value = '';
    document.getElementById('standaloneTaskError')?.classList.add('d-none');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('standaloneTaskModal')).show();
  });

  document.getElementById('stTaskCreateBtn')?.addEventListener('click', async () => {
    const titleInput = document.getElementById('stTaskTitle');
    const title = titleInput?.value.trim();
    const errEl = document.getElementById('standaloneTaskError');
    if (errEl) errEl.classList.add('d-none');
    if (titleInput) titleInput.classList.remove('is-invalid');
    if (!title) {
      if (titleInput) titleInput.classList.add('is-invalid');
      return;
    }
    const description = document.getElementById('stTaskDescription')?.value.trim() || '';
    const eventId = document.getElementById('stTaskEventSelect')?.value || null;
    const result = await Auth.createStandaloneTask({ title, description, eventId });
    if (!result.success) {
      if (errEl) { errEl.textContent = result.message || 'Failed to create task.'; errEl.classList.remove('d-none'); }
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById('standaloneTaskModal'))?.hide();
    showToast('Standalone task created.');
    await renderWqStandaloneList(currentTaskFilter, currentVolunteerFilter);
  });

  async function openTaskAssignModal(taskId) {
    currentAssignTaskId = taskId;
    const tasks = await Auth.getAllTasks();
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;
    document.getElementById('modalTaskTitle').textContent = task.title;
    const contextLabel = document.getElementById('modalTaskInquiryLabel');
    const contextRef = document.getElementById('modalTaskInquiryRef');
    if (task.inquirySubject) {
      if (contextLabel) contextLabel.textContent = 'Inquiry';
      if (contextRef) contextRef.textContent = task.inquirySubject;
    } else if (task.eventTitle) {
      if (contextLabel) contextLabel.textContent = 'Event';
      if (contextRef) contextRef.textContent = task.eventTitle;
    } else {
      if (contextLabel) contextLabel.textContent = 'Context';
      if (contextRef) contextRef.textContent = 'Standalone task';
    }
    document.getElementById('modalTaskDescription').textContent = task.description || '—';
    const errEl = document.getElementById('taskAssignError');
    if (errEl) errEl.classList.add('d-none');
    const select = document.getElementById('taskAssignVolunteerSelect');
    const noVolEl = document.getElementById('taskAssignNoVolunteers');
    const confirmBtn = document.getElementById('taskAssignConfirmBtn');
    if (select) {
      select.innerHTML = `<option value="" disabled selected>Select a cleared volunteer…</option>`;
      const cleared = await Auth.getClearedVolunteers();
      if (!cleared.length) {
        if (noVolEl) noVolEl.classList.remove('d-none');
        if (confirmBtn) confirmBtn.disabled = true;
      } else {
        if (noVolEl) noVolEl.classList.add('d-none');
        if (confirmBtn) confirmBtn.disabled = false;
        cleared.forEach((v) => {
          const opt = document.createElement('option');
          opt.value = v.userId;
          opt.textContent = `${v.name} (${v.email})`;
          if (task.assignedToUserId && String(task.assignedToUserId) === String(v.userId)) opt.selected = true;
          select.appendChild(opt);
        });
      }
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('taskAssignModal')).show();
  }

  document.getElementById('taskAssignConfirmBtn')?.addEventListener('click', async () => {
    const select = document.getElementById('taskAssignVolunteerSelect');
    const errEl = document.getElementById('taskAssignError');
    if (errEl) errEl.classList.add('d-none');
    const volunteerUserId = select?.value;
    if (!volunteerUserId) {
      if (errEl) { errEl.textContent = 'Please select a volunteer.'; errEl.classList.remove('d-none'); }
      return;
    }
    const result = await Auth.assignTask(currentAssignTaskId, volunteerUserId);
    if (!result.success) {
      if (errEl) { errEl.textContent = result.message || 'Assignment failed.'; errEl.classList.remove('d-none'); }
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById('taskAssignModal'))?.hide();
    showToast('Task assigned successfully.');
    await renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
    await renderWqStandaloneList(currentTaskFilter, currentVolunteerFilter);
    if (currentInquiryId) await renderModalInqTasksList(currentInquiryId);
  });

  // Work Queue section MutationObserver
  const wqSection = document.getElementById('section-work-queue');
  if (wqSection) {
    new MutationObserver(() => {
      if (!wqSection.classList.contains('d-none')) {
        populateVolunteerFilters();
        renderWqInquiriesList(currentInquiryFilter, currentVolunteerFilter);
        renderWqStandaloneList(currentTaskFilter, currentVolunteerFilter);
      }
    }).observe(wqSection, { attributes: true, attributeFilter: ['class'] });
  }

  // ─── End Task Assignment ───────────────────────────────────────────────────

  await populateLinkedUserOptions();
  await renderUsersTable();
  await renderParticipantsTable();
  await renderVolunteersTable();
  await renderEventsTable();
  await renderJobsTable();
  await renderNewsletterRecipients();
  await hydrateNewsletterDraft();
  await renderNewsletterHistory();
  renderNewsletterPreview();
  setAdminVolunteerOtherInterestInputState();
  toggleInlineParticipantUserFields();
  toggleInlineVolunteerUserFields();
  syncUserLinkVisibility();
  document.getElementById('regRole')?.addEventListener('change', syncUserLinkVisibility);
  document.getElementById('participantCreateUserToggle')?.addEventListener('change', toggleInlineParticipantUserFields);
  document.getElementById('adminVolCreateUserToggle')?.addEventListener('change', toggleInlineVolunteerUserFields);
});
