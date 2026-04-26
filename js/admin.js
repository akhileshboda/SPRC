/**
 * admin.js — Kindred SPRC Admin Panel Module
 * Handles administrator workflows for users, participants, volunteers,
 * events, jobs, and communications.
 */
document.addEventListener('sections:ready', async (e) => {
  const session = e.detail.session;
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

  const ACCESS_BADGE = {
    ACTIVE: 'bg-success',
    REVOKED: 'bg-secondary'
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

  const { renderProfileHeader, renderInterestChips, renderLanguageChips,
          VOLUNTEER_INTERESTS, renderCompletenessMeter, calcCompleteness,
          linkedRowHTML, adminNoteHTML, fieldAttrBadge } = await import('./profile-ui.js');

  const registerForm = document.getElementById('registerForm');
  const registerError = document.getElementById('registerError');
  const participantForm = document.getElementById('participantForm');
  const participantError = document.getElementById('participantError');
  const volunteerAdminForm = document.getElementById('volunteerAdminForm');
  const volunteerAdminError = document.getElementById('volunteerAdminError');

  // ── Admin volunteer chip selectors (initialized once) ─────────────────────
  const _adminVolInterestsEl  = document.getElementById('adminVolInterestsChips');
  const _adminVolLanguagesEl  = document.getElementById('adminVolLanguagesChips');
  const adminVolInterestChips = _adminVolInterestsEl
    ? renderInterestChips(_adminVolInterestsEl, VOLUNTEER_INTERESTS, [], { required: true })
    : null;
  const adminVolLangChips = _adminVolLanguagesEl
    ? renderLanguageChips(_adminVolLanguagesEl, [])
    : null;
  const _participantInterestsEl = document.getElementById('participantInterestsChips');
  const participantInterestChips = _participantInterestsEl
    ? renderInterestChips(_participantInterestsEl, VOLUNTEER_INTERESTS, [], { required: true })
    : null;
  const _userParticipantInterestsEl = document.getElementById('userParticipantInterestsChips');
  const userParticipantInterestChips = _userParticipantInterestsEl
    ? renderInterestChips(_userParticipantInterestsEl, VOLUNTEER_INTERESTS, [], { required: true })
    : null;
  const _userVolInterestsEl = document.getElementById('userVolunteerInterestsChips');
  const _userVolLanguagesEl = document.getElementById('userVolunteerLanguagesChips');
  const userVolInterestChips = _userVolInterestsEl
    ? renderInterestChips(_userVolInterestsEl, VOLUNTEER_INTERESTS, [], { required: true })
    : null;
  const userVolLangChips = _userVolLanguagesEl
    ? renderLanguageChips(_userVolLanguagesEl, [])
    : null;
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
  const deleteIdentityModalEl = document.getElementById('deleteIdentityModal');
  const deleteIdentityModal = deleteIdentityModalEl ? bootstrap.Modal.getOrCreateInstance(deleteIdentityModalEl) : null;

  let editingUserEmail = null;
  let editingParticipantId = null;
  let editingVolunteerUserId = null;
  let editingVolunteerProfileId = null;
  let editingEventId = null;
  let editingJobId = null;
  let eventsEditOrigin = null; // 'urgent-notifications' when editing from dispatcher
  let jobsEditOrigin = null;
  let participantsViewOrigin = null; // section to return to when closing participant form
  let pendingUser = null;
  let pendingParticipant = null;
  let pendingDeleteIdentity = null;

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

  function deriveAgeFromDateOfBirth(dateOfBirth) {
    const parsed = new Date(String(dateOfBirth || '').trim());
    if (Number.isNaN(parsed.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - parsed.getFullYear();
    const monthDiff = now.getMonth() - parsed.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) age -= 1;
    return age >= 0 ? age : '';
  }

  function updateParticipantAgeDisplay(fallbackAge = '') {
    const dob = document.getElementById('participantDateOfBirth')?.value || '';
    const age = deriveAgeFromDateOfBirth(dob);
    const ageEl = document.getElementById('participantAge');
    const nextAge = age || fallbackAge || '';
    if (ageEl) ageEl.value = nextAge;
    return nextAge;
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
    window.KindredRequiredMarkers?.sync();
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
    window.KindredRequiredMarkers?.sync();
  }

  function syncUserLinkVisibility() {
    const role = canonicalRole(document.getElementById('regRole')?.value);
    const showParticipant = role === 'PARTICIPANT' && !editingUserEmail;
    const showVolunteer = role === 'VOLUNTEER' && !editingUserEmail;
    document.getElementById('userParticipantRecordWrap')?.classList.toggle('d-none', !showParticipant);
    document.getElementById('userVolunteerProfileWrap')?.classList.toggle('d-none', !showVolunteer);
    [
      ['userParticipantGuardianIds', showParticipant],
      ['userParticipantContactEmail', showParticipant],
      ['userParticipantContactPhone', showParticipant],
      ['userParticipantSpecialNeeds', showParticipant],
      ['userVolunteerPhone', showVolunteer]
    ].forEach(([id, required]) => {
      const el = document.getElementById(id);
      if (el) el.required = required;
    });
    if (!showParticipant) userParticipantInterestChips?.setSelected([]);
    if (!showVolunteer) {
      userVolInterestChips?.setSelected([]);
      userVolLangChips?.setSelected([]);
    }
    window.KindredRequiredMarkers?.sync();
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
    const detailEl = document.getElementById('modalSummaryLinkedDetails');
    if (detailEl) {
      detailEl.classList.add('d-none');
      detailEl.innerHTML = '';
    }
  }

  function populateLinkedCreateSummary(payload) {
    const detailEl = document.getElementById('modalSummaryLinkedDetails');
    if (!detailEl) return;
    const role = canonicalRole(payload.role);
    if (role === 'PARTICIPANT') {
      const record = payload.participantRecord || {};
      detailEl.innerHTML = `
        <div class="small fw-semibold text-success mb-2">Participant record will also be created</div>
        <div class="row g-2 small">
          <div class="col-4 text-muted fw-semibold">Guardians</div>
          <div class="col-8">${escapeHtml(record.guardianUserIds?.length || 0)} linked</div>
          <div class="col-4 text-muted fw-semibold">Contact</div>
          <div class="col-8">${escapeHtml(record.contactEmail || '—')} · ${escapeHtml(record.contactPhone || '—')}</div>
          <div class="col-4 text-muted fw-semibold">Interests</div>
          <div class="col-8">${escapeHtml((record.participantInterests || []).join(', ') || '—')}</div>
        </div>`;
      detailEl.classList.remove('d-none');
    } else if (role === 'VOLUNTEER') {
      const profile = payload.volunteerProfile || {};
      detailEl.innerHTML = `
        <div class="small fw-semibold text-info mb-2">Volunteer profile will also be created</div>
        <div class="row g-2 small">
          <div class="col-4 text-muted fw-semibold">Phone</div>
          <div class="col-8">${escapeHtml(profile.phone || '—')}</div>
          <div class="col-4 text-muted fw-semibold">Interests</div>
          <div class="col-8">${escapeHtml((profile.interests || []).join(', ') || '—')}</div>
          <div class="col-4 text-muted fw-semibold">Availability</div>
          <div class="col-8">${escapeHtml(profile.availability || '—')}</div>
        </div>`;
      detailEl.classList.remove('d-none');
    }
  }

  function getUserParticipantRecordPayload() {
    return {
      firstName: document.getElementById('regFirstName').value,
      lastName: document.getElementById('regLastName').value,
      age: deriveAgeFromDateOfBirth(document.getElementById('userParticipantDateOfBirth')?.value || ''),
      dateOfBirth: document.getElementById('userParticipantDateOfBirth')?.value || '',
      guardianUserIds: getSelectedValues(document.getElementById('userParticipantGuardianIds')),
      contactEmail: document.getElementById('userParticipantContactEmail')?.value || '',
      contactPhone: document.getElementById('userParticipantContactPhone')?.value || '',
      participantInterests: userParticipantInterestChips?.getSelected() || [],
      jobGoals: document.getElementById('userParticipantJobGoals')?.value || '',
      bio: document.getElementById('userParticipantBio')?.value || '',
      specialNeeds: document.getElementById('userParticipantSpecialNeeds')?.value || '',
      medicalNotes: document.getElementById('userParticipantMedicalNotes')?.value || '',
      sensoryNotes: document.getElementById('userParticipantSensoryNotes')?.value || '',
      guardianNotes: document.getElementById('userParticipantGuardianNotes')?.value || ''
    };
  }

  function getUserVolunteerProfilePayload() {
    return {
      firstName: document.getElementById('regFirstName').value,
      lastName: document.getElementById('regLastName').value,
      phone: document.getElementById('userVolunteerPhone')?.value || '',
      interests: userVolInterestChips?.getSelected() || [],
      availability: document.getElementById('userVolunteerAvailability')?.value || '',
      preferredLocation: document.getElementById('userVolunteerPreferredLocation')?.value || '',
      pronounsSubject: document.getElementById('userVolunteerPronounsSubject')?.value || '',
      pronounsObject: document.getElementById('userVolunteerPronounsObject')?.value || '',
      languagesSpoken: userVolLangChips?.getSelected() || [],
      backgroundCheckStatus: document.getElementById('userVolunteerBackgroundCheck')?.value || 'Not Started'
    };
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
    document.getElementById(formId).querySelectorAll('input, select, textarea, .profile-chip').forEach((el) => {
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
    document.getElementById('view-jobs-applications').classList.add('d-none');
  }

  function showJobsFormView(isEditing = false, viewMode = false) {
    document.getElementById('view-jobs-list').classList.add('d-none');
    document.getElementById('view-jobs-form').classList.remove('d-none');
    document.getElementById('view-jobs-applications').classList.add('d-none');
    document.getElementById('jobFormTitle').textContent = viewMode ? 'Job Details' : (isEditing ? 'Edit Job Opportunity' : 'New Job Opportunity');
    setFormFieldsDisabled('jobForm', viewMode);
    document.getElementById('jobSubmitBtn').classList.toggle('d-none', viewMode);
    document.getElementById('jobFormEditBtn').classList.toggle('d-none', !viewMode);
  }

  function showJobsApplicationsView(jobTitle, jobEmployer) {
    document.getElementById('view-jobs-list').classList.add('d-none');
    document.getElementById('view-jobs-form').classList.add('d-none');
    document.getElementById('view-jobs-applications').classList.remove('d-none');
    document.getElementById('jobAppsTitle').textContent = jobTitle;
    document.getElementById('jobAppsSubtitle').textContent = jobEmployer;
  }

  async function populateLinkedUserOptions() {
    const [users, participants, volunteerProfiles] = await Promise.all([
      Auth.getUsers(),
      Auth.getParticipants(),
      Auth.getVolunteerProfiles()
    ]);
    const participantUserSelect = document.getElementById('participantUserId');
    const guardianSelect = document.getElementById('participantGuardianIds');
    const userGuardianSelect = document.getElementById('userParticipantGuardianIds');
    const volunteerUserSelect = document.getElementById('adminVolUserId');
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

    if (userGuardianSelect) {
      userGuardianSelect.innerHTML = guardianUsers.map((user) =>
        `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`
      ).join('');
    }

    if (volunteerUserSelect) {
      volunteerUserSelect.innerHTML = `<option value="" disabled selected>Select volunteer login...</option>${volunteerUsers.map((user) =>
        `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`
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
    window.KindredRequiredMarkers?.sync();
    const submitBtn = document.getElementById('userSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Create Account';
    userParticipantInterestChips?.setSelected([]);
    userVolInterestChips?.setSelected([]);
    userVolLangChips?.setSelected([]);
    syncUserLinkVisibility();
  }

  function resetParticipantFormState() {
    participantForm?.reset();
    participantForm?.classList.remove('was-validated');
    participantError?.classList.add('d-none');
    editingParticipantId = null;
    participantInterestChips?.setSelected([]);
    const submitBtn = document.getElementById('participantSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    const ageEl = document.getElementById('participantAge');
    if (ageEl) ageEl.value = '';
    document.getElementById('participantCreateUserToggle').checked = false;
    document.getElementById('participantNewUserEmail').value = '';
    document.getElementById('participantNewUserPassword').value = '';
    toggleInlineParticipantUserFields();
    const headerEl = document.getElementById('participantAdminProfileHeader');
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="profile-avatar">P</div>
        <div class="profile-header-meta">
          <div class="profile-header-name">New Participant</div>
          <div class="profile-header-sub"><span class="badge bg-success">Participant</span></div>
        </div>`;
    }
    document.getElementById('participantGuardianSummary').innerHTML = '';
    document.getElementById('participantAdminNotesSummary').innerHTML = '';
    document.getElementById('participantAdminMeta').textContent = '—';
    document.getElementById('participantAdminCompleteness').innerHTML = '';
    applyParticipantFieldAttribution();
  }

  function resetVolunteerFormState() {
    volunteerAdminForm?.reset();
    volunteerAdminForm?.classList.remove('was-validated');
    volunteerAdminError?.classList.add('d-none');
    editingVolunteerUserId = null;
    editingVolunteerProfileId = null;
    adminVolInterestChips?.setSelected([]);
    adminVolLangChips?.setSelected([]);
    const submitBtn = document.getElementById('volunteerAdminSubmitBtn');
    if (submitBtn) submitBtn.textContent = 'Save Changes';
    const bgSelect = document.getElementById('adminVolBackgroundCheck');
    if (bgSelect) bgSelect.disabled = false;
    document.getElementById('adminVolCreateUserToggle').checked = false;
    document.getElementById('adminVolNewUserEmail').value = '';
    document.getElementById('adminVolNewUserPassword').value = '';
    toggleInlineVolunteerUserFields();
    const headerEl = document.getElementById('adminVolProfileHeader');
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="profile-avatar">V</div>
        <div class="profile-header-meta">
          <div class="profile-header-name">New Volunteer Profile</div>
          <div class="profile-header-sub"><span class="badge bg-info text-dark">Volunteer</span></div>
        </div>`;
    }
    const railMeta = document.getElementById('adminVolRailMeta');
    if (railMeta) railMeta.textContent = '—';
    const completenessEl = document.getElementById('adminVolCompleteness');
    if (completenessEl) completenessEl.innerHTML = '';
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
    document.getElementById('eventVolunteersPanel')?.classList.add('d-none');
  }

  function renderParticipantAdminRail(participant) {
    const guardianSummary = document.getElementById('participantGuardianSummary');
    if (guardianSummary) {
      guardianSummary.innerHTML = participant.guardians?.length
        ? participant.guardians.map((guardian) => linkedRowHTML({ name: guardian.name, role: guardian.email, icon: 'bi-person-heart' })).join('')
        : '<div class="text-muted small">No linked guardians.</div>';
    }

    const notesSummary = document.getElementById('participantAdminNotesSummary');
    if (notesSummary) {
      const notes = [
        participant.guardianNotes && `Guardian/Admin notes: ${participant.guardianNotes}`,
        participant.specialNeeds && `Support needs: ${participant.specialNeeds}`
      ].filter(Boolean);
      notesSummary.innerHTML = notes.length
        ? notes.slice(0, 2).map((note) => adminNoteHTML(note)).join('')
        : '<div class="text-muted small">No admin notes added yet.</div>';
    }

    const metaEl = document.getElementById('participantAdminMeta');
    if (metaEl) {
      metaEl.innerHTML = `
        <div>Created: ${escapeHtml(participant.dateAdded || 'N/A')}</div>
        <div class="mt-1">Participant login: ${escapeHtml(participant.participantUser?.email || 'Unlinked')}</div>
      `;
    }

    const completenessEl = document.getElementById('participantAdminCompleteness');
    if (completenessEl) {
      renderCompletenessMeter(completenessEl, calcCompleteness({
        firstName: participant.firstName,
        lastName: participant.lastName,
        dateOfBirth: participant.dateOfBirth,
        participantInterests: participant.participantInterests,
        jobGoals: participant.jobGoals,
        specialNeeds: participant.specialNeeds,
        contactEmail: participant.contactEmail,
        contactPhone: participant.contactPhone,
        bio: participant.bio
      }));
    }
  }

  function applyParticipantFieldAttribution() {
    const mappings = [
      ['participantDobAttr', 'Participant'],
      ['participantBioAttr', 'Participant'],
      ['participantInterestsAttr', 'Participant'],
      ['participantGoalsAttr', 'Participant'],
      ['participantSupportAttr', 'Admin'],
      ['participantMedicalAttr', 'Admin'],
      ['participantSensoryAttr', 'Admin'],
      ['participantGuardianAttr', 'Admin']
    ];
    mappings.forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = fieldAttrBadge(label);
    });
  }

  function populateParticipantFormFromRecord(participant) {
    document.getElementById('participantFirstName').value = participant.firstName || '';
    document.getElementById('participantLastName').value = participant.lastName || '';
    document.getElementById('participantDateOfBirth').value = participant.dateOfBirth || '';
    updateParticipantAgeDisplay(participant.age || '');
    document.getElementById('participantUserId').value = participant.participantUserId || '';
    Array.from(document.getElementById('participantGuardianIds').options).forEach((option) => {
      option.selected = participant.guardianUserIds.includes(option.value);
    });
    document.getElementById('participantEmail').value = participant.contactEmail || '';
    document.getElementById('participantPhone').value = participant.contactPhone || '';
    participantInterestChips?.setSelected(participant.participantInterests || []);
    document.getElementById('participantJobGoals').value = participant.jobGoals || '';
    document.getElementById('participantBio').value = participant.bio || '';
    document.getElementById('participantSpecialNeeds').value = participant.specialNeeds || '';
    document.getElementById('participantMedicalNotes').value = participant.medicalNotes || '';
    document.getElementById('participantSensoryNotes').value = participant.sensoryNotes || '';
    document.getElementById('participantGuardianNotes').value = participant.guardianNotes || '';
    document.getElementById('participantCreateUserToggle').checked = false;
    toggleInlineParticipantUserFields();
    const headerEl = document.getElementById('participantAdminProfileHeader');
    if (headerEl) {
      renderProfileHeader(headerEl, {
        name: participant.fullName || `${participant.firstName || ''} ${participant.lastName || ''}`.trim(),
        role: 'Participant',
        managedBy: 'Shared with family and admin',
        lastUpdatedMs: participant.createdAtMs
      });
    }
    renderParticipantAdminRail(participant);
    applyParticipantFieldAttribution();
  }

  async function renderEventVolunteersPanel(eventId) {
    const panel = document.getElementById('eventVolunteersPanel');
    const listEl = document.getElementById('eventVolunteersList');
    const selectEl = document.getElementById('eventVolunteerSelect');
    const errEl = document.getElementById('eventVolunteersError');
    if (!panel || !listEl || !selectEl) return;

    panel.classList.remove('d-none');
    if (errEl) errEl.classList.add('d-none');

    const [volunteers, assigned] = await Promise.all([
      Auth.getVolunteerProfiles(),
      Auth.getEventVolunteers(eventId)
    ]);

    const assignedEmails = new Set(assigned.map((a) => String(a.volunteerEmail)));

    selectEl.innerHTML = '<option value="">Select a volunteer to assign&hellip;</option>'
      + volunteers
          .filter((v) => !assignedEmails.has(String(v.email)))
          .map((v) => `<option value="${escapeHtml(v.email)}">${escapeHtml(`${v.fullName} (${v.email})`)}</option>`)
          .join('');

    if (!assigned.length) {
      listEl.innerHTML = '<p class="text-muted small mb-0">No volunteers assigned yet.</p>';
    } else {
      listEl.innerHTML = `<ul class="list-group list-group-flush">
        ${assigned.map((a) => `
          <li class="list-group-item d-flex align-items-center justify-content-between px-0 py-2">
            <div>
              <span class="fw-semibold small">${escapeHtml(a.volunteerName)}</span>
              <span class="text-muted small ms-2">${escapeHtml(a.volunteerEmail)}</span>
              <span class="badge ${a.selfSignedUp ? 'bg-info text-dark' : 'bg-secondary'} ms-2" style="font-size:0.65rem;">
                ${a.selfSignedUp ? 'Self sign-up' : 'Admin assigned'}
              </span>
            </div>
            <button class="btn btn-outline-danger btn-sm js-remove-vol-assignment"
              data-event-id="${escapeHtml(eventId)}" data-vol-email="${escapeHtml(a.volunteerEmail)}">
              <i class="bi bi-x-lg"></i>
            </button>
          </li>`).join('')}
      </ul>`;

      listEl.querySelectorAll('.js-remove-vol-assignment').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const result = await Auth.removeVolunteerFromEvent(btn.dataset.eventId, btn.dataset.volEmail);
          if (result.success) {
            await renderEventVolunteersPanel(eventId);
          } else {
            if (errEl) { errEl.textContent = result.message; errEl.classList.remove('d-none'); }
            btn.disabled = false;
          }
        });
      });
    }

    const assignBtn = document.getElementById('eventAssignVolunteerBtn');
    const newAssignBtn = assignBtn?.cloneNode(true);
    if (assignBtn && newAssignBtn) {
      assignBtn.replaceWith(newAssignBtn);
      newAssignBtn.addEventListener('click', async () => {
        const email = selectEl.value;
        if (!email) return;
        if (errEl) errEl.classList.add('d-none');
        newAssignBtn.disabled = true;
        const result = await Auth.assignVolunteerToEvent(eventId, email);
        if (result.success) {
          await renderEventVolunteersPanel(eventId);
        } else {
          if (errEl) { errEl.textContent = result.message; errEl.classList.remove('d-none'); }
          newAssignBtn.disabled = false;
        }
      });
    }
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

  async function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    const users = await Auth.getUsers();
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted px-3">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map((user) => {
      const isSelf = session.userId === user.id;
      const canEdit = user.role !== 'ADMIN';
      const accessStatus = user.accessStatus || 'ACTIVE';
      const accessAction = accessStatus === 'REVOKED'
        ? `<button class="btn btn-outline-success btn-sm me-1" data-user-restore-email="${escapeHtml(user.email)}">Restore</button>`
        : `<button class="btn btn-outline-secondary btn-sm me-1" data-user-revoke-email="${escapeHtml(user.email)}" ${isSelf ? 'disabled title="You cannot revoke your own access"' : ''}>Revoke</button>`;
      return `
        <tr>
          <td class="ps-3">${escapeHtml(user.name)}</td>
          <td class="text-muted small">${escapeHtml(user.email)}</td>
          <td><span class="badge ${ROLE_BADGE[canonicalRole(user.role)] || 'bg-secondary'}">${escapeHtml(ROLE_LABEL[canonicalRole(user.role)] || user.role)}</span></td>
          <td><span class="badge ${ACCESS_BADGE[accessStatus] || 'bg-secondary'}">${escapeHtml(accessStatus)}</span></td>
          <td class="text-muted small">${escapeHtml(user.dateAdded)}</td>
          <td class="pe-3" style="width:1%;white-space:nowrap;">
            ${canEdit ? `<button class="btn btn-outline-primary btn-sm me-1" data-user-edit-email="${escapeHtml(user.email)}">Edit</button>` : ''}
            ${accessAction}
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
        window.KindredRequiredMarkers?.sync();
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
        await openDeleteIdentityModal('user', button.dataset.userEmail);
      });
    });

    tbody.querySelectorAll('[data-user-revoke-email]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await Auth.revokeUserAccess(button.dataset.userRevokeEmail);
        if (!result.success) {
          registerError.textContent = result.message;
          registerError.classList.remove('d-none');
          return;
        }
        await renderUsersTable();
        showToast('User access revoked.');
      });
    });

    tbody.querySelectorAll('[data-user-restore-email]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await Auth.restoreUserAccess(button.dataset.userRestoreEmail);
        if (!result.success) {
          registerError.textContent = result.message;
          registerError.classList.remove('d-none');
          return;
        }
        await renderUsersTable();
        showToast('User access restored.');
      });
    });
  }

  async function openDeleteIdentityModal(kind, identifier) {
    if (!deleteIdentityModal) return;
    const titleEl = document.getElementById('deleteIdentityTitle');
    const messageEl = document.getElementById('deleteIdentityMessage');
    const preserveBtn = document.getElementById('deleteIdentityPreserveBtn');
    const cascadeBtn = document.getElementById('deleteIdentityCascadeBtn');

    pendingDeleteIdentity = { kind, identifier };

    if (kind === 'user') {
      const users = await Auth.getUsers();
      const user = users.find((entry) => entry.email === identifier || String(entry.id) === String(identifier));
      const linkedParticipant = (await Auth.getParticipants()).find((participant) => String(participant.participantUserId) === String(user?.id));
      const linkedVolunteer = await Auth.getVolunteerProfile(user?.id);
      titleEl.textContent = 'Delete User';
      messageEl.textContent = `Delete ${user?.name || 'this user'}? You can preserve linked records as inactive/unlinked data or delete linked data too.`;
      preserveBtn.textContent = linkedParticipant || linkedVolunteer ? 'Delete user only' : 'Delete user';
      cascadeBtn.textContent = 'Delete user and linked data';
      cascadeBtn.classList.toggle('d-none', !(linkedParticipant || linkedVolunteer));
    } else if (kind === 'participant') {
      const participant = await Auth.getParticipantById(identifier);
      titleEl.textContent = 'Delete Participant Record';
      messageEl.textContent = `Delete the participant record for ${participant?.fullName || 'this participant'}? You can keep the linked user revoked, or delete both.`;
      preserveBtn.textContent = 'Delete record only';
      cascadeBtn.textContent = 'Delete record and user';
      cascadeBtn.classList.toggle('d-none', !participant?.participantUser);
    } else {
      const profile = await Auth.getVolunteerProfile(identifier);
      titleEl.textContent = 'Delete Volunteer Profile';
      messageEl.textContent = `Delete the volunteer profile for ${profile?.fullName || 'this volunteer'}? You can keep the linked user revoked, or delete both.`;
      preserveBtn.textContent = 'Delete profile only';
      cascadeBtn.textContent = 'Delete profile and user';
      cascadeBtn.classList.toggle('d-none', !profile?.linkedUser);
    }

    deleteIdentityModal.show();
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
          ${participant.recordStatus === 'INACTIVE' ? '<span class="badge bg-secondary mt-1">Inactive</span>' : ''}
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
        populateParticipantFormFromRecord(participant);
        editingParticipantId = participant.id;
        participantError.classList.add('d-none');
        participantForm.classList.remove('was-validated');
        document.getElementById('participantSubmitBtn').textContent = 'Save Changes';
        participantsViewOrigin = null;
        showParticipantsFormView(true, true);
      });
    });

    tbody.querySelectorAll('[data-participant-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        await openDeleteIdentityModal('participant', button.dataset.participantId);
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

    const openBgCheckUpdateModal = async (userId) => {
      const profile = await Auth.getVolunteerProfile(userId);
      if (!profile) return;

      document.getElementById('bgCheckVolunteerName').textContent = profile.fullName;
      document.getElementById('bgCheckStatusSelect').value = profile.backgroundCheckStatus || 'Not Started';
      document.getElementById('bgCheckNotes').value = '';
      document.getElementById('updateBgCheckError').classList.add('d-none');

      const modal = new bootstrap.Modal(document.getElementById('updateBgCheckModal'));
      modal.show();

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
    };

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
        <td class="ps-3"><div class="fw-semibold">${escapeHtml(profile.fullName)}</div><div class="text-muted small">${escapeHtml(profile.linkedUser?.email || 'Unlinked')}</div>${profile.recordStatus === 'INACTIVE' ? '<span class="badge bg-secondary mt-1">Inactive</span>' : ''}</td>
        <td class="small text-muted"><div>${escapeHtml(profile.email)}</div><div>${escapeHtml(profile.phone || '')}</div></td>
        <td class="small">${escapeHtml(profile.interests.join(', ') || 'Not provided')}</td>
        <td class="small text-muted">${escapeHtml(profile.availability || 'Not provided')}</td>
        <td class="small">
          <div class="d-flex align-items-center">
            ${bgCheckBadge(bgStatus)}${approvalBadge}
          </div>
          ${expiryMarkup}
          <div class="mt-2">
            <button class="btn btn-outline-info btn-sm volunteer-bgcheck-details-btn" data-bgcheck-details-user-id="${escapeHtml(profile.userId)}" ${isLocked ? 'disabled' : ''}>
              <i class="bi bi-eye"></i> Details
            </button>
          </div>
        </td>
        <td class="small text-muted">${escapeHtml(profile.updatedAtLabel || 'N/A')}</td>
        <td class="pe-3" style="width:1%;white-space:nowrap;">
          <button class="btn btn-outline-primary btn-sm me-1" data-volunteer-edit-user-id="${escapeHtml(profile.userId || profile.id)}">View</button>
          <button class="btn btn-outline-danger btn-sm" data-volunteer-user-id="${escapeHtml(profile.userId || profile.id)}">Delete</button>
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
        const prefLocEl = document.getElementById('adminVolPreferredLocation');
        if (prefLocEl) prefLocEl.value = profile.preferredLocation || '';
        const pronSubjEl = document.getElementById('adminVolPronounsSubject');
        const pronObjEl  = document.getElementById('adminVolPronounsObject');
        if (pronSubjEl) pronSubjEl.value = profile.pronounsSubject || '';
        if (pronObjEl)  pronObjEl.value  = profile.pronounsObject  || '';

        const bgSelect = document.getElementById('adminVolBackgroundCheck');
        bgSelect.value = profile.backgroundCheckStatus || 'Not Started';
        const bgRecord = await Auth.getBgCheckRecord(profile.userId);
        const isLocked = profile.backgroundCheckStatus === 'Cleared'
          && bgRecord?.expiresAtMs && Date.now() < bgRecord.expiresAtMs;
        bgSelect.disabled = isLocked;

        adminVolInterestChips?.setSelected(profile.interests || []);
        adminVolLangChips?.setSelected(profile.languagesSpoken || []);

        // Render profile header
        const headerEl = document.getElementById('adminVolProfileHeader');
        if (headerEl) {
          renderProfileHeader(headerEl, {
            name: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
            role: 'Volunteer',
            lastUpdatedMs: profile.updatedAt
          });
        }

        // Render right rail
        const railMeta = document.getElementById('adminVolRailMeta');
        if (railMeta) {
          railMeta.innerHTML = `
            <div class="small text-muted">Last updated: ${escapeHtml(profile.updatedAtLabel || 'N/A')}</div>
            <div class="small text-muted mt-1">BG Check: <span class="fw-semibold">${escapeHtml(profile.backgroundCheckStatus || 'Not Started')}</span></div>
          `;
        }
        const completenessEl = document.getElementById('adminVolCompleteness');
        if (completenessEl) {
          const pct = calcCompleteness({
            firstName: profile.firstName, lastName: profile.lastName,
            phone: profile.phone, interests: profile.interests,
            availability: profile.availability, pronounsSubject: profile.pronounsSubject,
            languagesSpoken: profile.languagesSpoken
          });
          renderCompletenessMeter(completenessEl, pct);
        }

        document.getElementById('adminVolCreateUserToggle').checked = false;
        toggleInlineVolunteerUserFields();
        editingVolunteerUserId = profile.userId || '';
        editingVolunteerProfileId = profile.id || '';
        document.getElementById('volunteerAdminSubmitBtn').textContent = 'Save Changes';
        volunteerAdminError.classList.add('d-none');
        volunteerAdminForm.classList.remove('was-validated');
        showVolunteersFormView(true, true);
      });
    });

    tbody.querySelectorAll('[data-volunteer-user-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        await openDeleteIdentityModal('volunteer', button.dataset.volunteerUserId);
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
          openBgCheckUpdateModal(userId);
        };
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

    tbody.innerHTML = events.map((event) => {
      const fee = event.programFee != null ? `$${Number(event.programFee).toFixed(2)}` : '—';
      const mat = event.materialsCost != null ? `$${Number(event.materialsCost).toFixed(2)}` : '—';
      const totalCost = escapeHtml(event.cost || 'Free');
      return `
      <tr>
        <td class="ps-3"><div class="fw-semibold text-dark">${escapeHtml(event.title)}</div></td>
        <td><span class="badge ${EVENT_CATEGORY_BADGE[event.category] || 'bg-secondary'}">${escapeHtml(event.category)}</span></td>
        <td class="small text-muted">${escapeHtml(event.dateTimeLabel)}</td>
        <td class="small">${escapeHtml(event.location)}</td>
        <td class="small">
          <div class="fw-semibold">${totalCost}</div>
          <div class="text-muted" style="font-size:0.75rem;">Fee: ${fee} · Materials: ${mat}</div>
        </td>
        <td class="small text-muted"><div class="event-accommodations">${escapeHtml(event.accommodations)}</div></td>
        <td class="text-muted small">${escapeHtml(event.dateAdded)}</td>
        <td class="pe-3" style="width:1%;white-space:nowrap;">
          <button class="btn btn-outline-primary btn-sm me-1" data-event-edit-id="${escapeHtml(event.id)}">View</button>
          <button class="btn btn-outline-danger btn-sm" data-event-id="${escapeHtml(event.id)}">Delete</button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-event-edit-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const events = await Auth.getEvents();
        const event = events.find((entry) => String(entry.id) === String(button.dataset.eventEditId));
        if (!event) return;
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventCategory').value = event.category || '';
        document.getElementById('eventDateTime').value = event.dateTime || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventProgramFee').value = event.programFee != null ? event.programFee : '';
        document.getElementById('eventMaterialsCost').value = event.materialsCost != null ? event.materialsCost : '';
        document.getElementById('eventAccommodations').value = event.accommodations || '';
        const urgentCheck = document.getElementById('eventIsUrgent');
        if (urgentCheck) urgentCheck.checked = Boolean(event.isUrgent);
        editingEventId = event.id;
        document.getElementById('eventSubmitBtn').textContent = 'Update Event';
        showEventsFormView(true, true);
        await renderEventVolunteersPanel(event.id);
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
    const [jobs, appSummary] = await Promise.all([Auth.getJobs(), Auth.getJobApplicationSummary()]);
    if (!jobs.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted px-3 py-4">No job opportunities logged yet.</td></tr>';
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
      const s = appSummary[job.id] || {};
      // Build compact pipeline count badges (skip empty stages, skip rejected)
      const pipelineParts = [
        s.pending?.length   ? `<span class="badge text-bg-warning">${s.pending.length} Pending</span>` : '',
        s.applied?.length   ? `<span class="badge text-bg-primary">${s.applied.length} Applied</span>` : '',
        s.interview?.length ? `<span class="badge text-bg-info">${s.interview.length} Interview</span>` : '',
        s.offer?.length     ? `<span class="badge text-bg-success">${s.offer.length} Offer</span>` : '',
        s.started?.length   ? `<span class="badge bg-success">${s.started.length} Started</span>` : '',
      ].filter(Boolean);
      const pipelineMarkup = pipelineParts.length
        ? `<div class="d-flex flex-wrap gap-1">${pipelineParts.join('')}</div>`
        : '<span class="text-muted small">None yet</span>';

      return `
        <tr>
          <td class="ps-3">
            <div class="fw-semibold text-dark">${escapeHtml(job.title)}</div>
            <div class="small text-muted">${escapeHtml(job.employer)}${job.location ? ` · ${escapeHtml(job.location)}` : ''}</div>
          </td>
          <td>${job.jobType ? `<span class="badge ${JOB_TYPE_BADGE[job.jobType] || 'bg-secondary'}">${escapeHtml(job.jobType)}</span>` : '<span class="text-muted small">—</span>'}</td>
          <td><span class="badge ${JOB_STATUS_BADGE[job.status] || 'bg-secondary'}">${escapeHtml(job.status || 'Open')}</span></td>
          <td class="small">
            ${job.payRate != null && job.payRate > 0 ? `<span class="fw-semibold text-success">$${Number(job.payRate).toFixed(2)}/hr</span>` : `<span class="text-muted">Unpaid</span>`}
            ${job.programFee > 0 ? `<div class="text-muted" style="font-size:0.75rem;">Fee $${Number(job.programFee).toFixed(2)}</div>` : ''}
            ${job.materialsCost > 0 ? `<div class="text-muted" style="font-size:0.75rem;">Materials $${Number(job.materialsCost).toFixed(2)}</div>` : ''}
          </td>
          <td>${pipelineMarkup}</td>
          <td class="text-muted small">${escapeHtml(job.dateAdded)}</td>
          <td class="pe-3" style="width:1%;white-space:nowrap;">
            <button class="btn btn-outline-secondary btn-sm me-1" data-job-edit-id="${escapeHtml(job.id)}">View</button>
            <button class="btn btn-outline-primary btn-sm me-1 js-job-apps-btn" data-job-id="${escapeHtml(job.id)}" data-job-title="${escapeHtml(job.title)}" data-job-employer="${escapeHtml(job.employer)}">Applications</button>
            <button class="btn btn-outline-danger btn-sm" data-job-delete-id="${escapeHtml(job.id)}">Delete</button>
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
        document.getElementById('jobPayRate').value = job.payRate != null ? job.payRate : '';
        document.getElementById('jobProgramFee').value = job.programFee != null ? job.programFee : '';
        document.getElementById('jobMaterialsCost').value = job.materialsCost != null ? job.materialsCost : '';
        document.getElementById('jobRequirements').value = job.requirements || '';
        const urgentCheck = document.getElementById('jobIsUrgent');
        if (urgentCheck) urgentCheck.checked = Boolean(job.isUrgent);
        editingJobId = job.id;
        document.getElementById('jobSubmitBtn').textContent = 'Update Opportunity';
        showJobsFormView(true, true);
      });
    });

    tbody.querySelectorAll('.js-job-apps-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const { jobId, jobTitle, jobEmployer } = button.dataset;
        showJobsApplicationsView(jobTitle, jobEmployer);
        await renderJobAppsForJob(jobId);
      });
    });

    tbody.querySelectorAll('[data-job-delete-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const result = await Auth.removeJob(button.dataset.jobDeleteId);
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

  async function renderJobAppsForJob(jobId) {
    const tbody = document.getElementById('jobAppsTableBody');
    if (!tbody) return;
    currentJobId = jobId;

    const result = await Auth.getJobApplications(jobId);
    if (!Array.isArray(result)) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger px-3 py-4">${escapeHtml(result?.message || 'Error loading applications.')}</td></tr>`;
      return;
    }
    if (!result.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted px-3 py-4">No applications yet for this job.</td></tr>';
      return;
    }

    tbody.innerHTML = result.map((app) => {
      const transitions = ADMIN_APP_TRANSITIONS[app.status] || [];
      return `
        <tr>
          <td class="ps-3">
            <div class="fw-semibold">${escapeHtml(app.participantName)}</div>
            <div class="small text-muted">${escapeHtml(app.participantEmail)}</div>
          </td>
          <td><span class="badge ${APP_STATUS_BADGE[app.status] || 'text-bg-secondary'}">${escapeHtml(app.status)}</span></td>
          <td class="small text-muted">${escapeHtml(app.appliedAtLabel || '')}</td>
          <td class="small text-muted">${escapeHtml(app.updatedAtLabel || '')}</td>
          <td class="small">${app.notes ? escapeHtml(app.notes) : '<span class="text-muted">—</span>'}</td>
          <td class="text-end pe-3">
            ${transitions.length ? `<button class="btn btn-outline-primary btn-sm js-update-app-status-btn"
              data-app-id="${escapeHtml(app.id)}"
              data-current-status="${escapeHtml(app.status)}"
              data-participant-name="${escapeHtml(app.participantName)}"
              data-job-title="${escapeHtml(app.job?.title || '')}">
              Update
            </button>` : '<span class="text-muted small">—</span>'}
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.js-update-app-status-btn').forEach((btn) => {
      btn.addEventListener('click', () => openUpdateAppStatusModal(btn.dataset));
    });
  }

  const ADMIN_APP_TRANSITIONS = {
    APPLIED:   ['INTERVIEW', 'OFFER', 'REJECTED'],
    INTERVIEW: ['OFFER', 'REJECTED'],
    OFFER:     ['STARTED', 'REJECTED'],
    STARTED:   ['REJECTED'],
    REJECTED:  []
  };

  const APP_STATUS_BADGE = {
    APPLIED:   'text-bg-primary',
    INTERVIEW: 'text-bg-info',
    OFFER:     'text-bg-success',
    STARTED:   'text-bg-success',
    REJECTED:  'text-bg-danger'
  };

  let currentAppId = null;
  let currentJobId = null;

  function openUpdateAppStatusModal({ appId, currentStatus, participantName, jobTitle }) {
    currentAppId = appId;
    const modalEl = document.getElementById('updateAppStatusModal');
    if (!modalEl) return;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    document.getElementById('updateAppStatusContext').textContent =
      `${participantName} — ${jobTitle} (currently: ${currentStatus})`;
    document.getElementById('updateAppStatusNotes').value = '';
    const errEl = document.getElementById('updateAppStatusError');
    if (errEl) errEl.classList.add('d-none');

    const transitions = ADMIN_APP_TRANSITIONS[currentStatus] || [];
    const STATUS_LABEL = { INTERVIEW: 'Interview', OFFER: 'Offer', STARTED: 'Started', REJECTED: 'Rejected' };
    document.getElementById('updateAppStatusOptions').innerHTML = transitions.map((status) => `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="appStatusOption"
               id="appStatus_${escapeHtml(status)}" value="${escapeHtml(status)}">
        <label class="form-check-label" for="appStatus_${escapeHtml(status)}">${escapeHtml(STATUS_LABEL[status] || status)}</label>
      </div>`).join('');

    const confirmBtn = document.getElementById('updateAppStatusConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = true;
    document.getElementById('updateAppStatusOptions').querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener('change', () => { if (confirmBtn) confirmBtn.disabled = false; });
    });

    modal.show();
  }

  document.getElementById('updateAppStatusConfirmBtn')?.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="appStatusOption"]:checked')?.value;
    const notes = document.getElementById('updateAppStatusNotes')?.value || '';
    const errEl = document.getElementById('updateAppStatusError');
    if (!selected) {
      if (errEl) { errEl.textContent = 'Please select a status.'; errEl.classList.remove('d-none'); }
      return;
    }
    const result = await Auth.updateApplicationStatus(currentAppId, selected, notes);
    if (!result.success) {
      if (errEl) { errEl.textContent = result.message || 'Update failed.'; errEl.classList.remove('d-none'); }
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById('updateAppStatusModal'))?.hide();
    showToast('Application status updated.');
    if (currentJobId) await renderJobAppsForJob(currentJobId);
    await renderJobsTable();
  });

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
    const role = canonicalRole(document.getElementById('regRole').value);
    const collectLinkedRecord = !editingUserEmail;
    const collectParticipantRecord = collectLinkedRecord && role === 'PARTICIPANT';
    const collectVolunteerProfile = collectLinkedRecord && role === 'VOLUNTEER';
    const participantInterestsValid = collectParticipantRecord ? (userParticipantInterestChips?.validate() ?? true) : true;
    const volunteerInterestsValid = collectVolunteerProfile ? (userVolInterestChips?.validate() ?? true) : true;
    const guardianIds = collectParticipantRecord ? getSelectedValues(document.getElementById('userParticipantGuardianIds')) : [];
    document.getElementById('userParticipantGuardianIds')?.setCustomValidity(
      collectParticipantRecord && !guardianIds.length ? 'Select at least one guardian.' : ''
    );
    if (!registerForm.checkValidity() || !participantInterestsValid || !volunteerInterestsValid || (collectParticipantRecord && !guardianIds.length)) {
      registerForm.reportValidity();
      return;
    }
    document.getElementById('userParticipantGuardianIds')?.setCustomValidity('');
    const fullName = `${document.getElementById('regFirstName').value} ${document.getElementById('regLastName').value}`.trim();
    const payload = {
      name: fullName,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value,
      role
    };

    if (collectParticipantRecord) payload.participantRecord = getUserParticipantRecordPayload();
    if (collectVolunteerProfile) payload.volunteerProfile = getUserVolunteerProfilePayload();

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
    populateLinkedCreateSummary(payload);
    confirmModal?.show();
  });

  registerForm?.addEventListener('input', () => registerError?.classList.add('d-none'));

  participantForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    participantForm.classList.add('was-validated');
    const guardianIds = getSelectedValues(document.getElementById('participantGuardianIds'));
    const interestsValid = participantInterestChips?.validate() ?? true;
    if (!participantForm.checkValidity() || !guardianIds.length || !interestsValid) {
      document.getElementById('participantGuardianIds')?.setCustomValidity(guardianIds.length ? '' : 'Select at least one guardian.');
      participantForm.reportValidity();
      return;
    }
    document.getElementById('participantGuardianIds')?.setCustomValidity('');
    const derivedAge = updateParticipantAgeDisplay(document.getElementById('participantAge').value);
    const payload = {
      firstName: document.getElementById('participantFirstName').value,
      lastName: document.getElementById('participantLastName').value,
      age: derivedAge,
      dateOfBirth: document.getElementById('participantDateOfBirth').value,
      participantUserId: document.getElementById('participantUserId').value,
      guardianUserIds: guardianIds,
      contactEmail: document.getElementById('participantEmail').value,
      contactPhone: document.getElementById('participantPhone').value,
      participantInterests: participantInterestChips?.getSelected() || [],
      jobGoals: document.getElementById('participantJobGoals').value,
      bio: document.getElementById('participantBio').value,
      specialNeeds: document.getElementById('participantSpecialNeeds').value,
      medicalNotes: document.getElementById('participantMedicalNotes').value,
      sensoryNotes: document.getElementById('participantSensoryNotes').value,
      guardianNotes: document.getElementById('participantGuardianNotes').value
    };

    if (document.getElementById('participantCreateUserToggle')?.checked) {
      const newUserPayload = {
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: document.getElementById('participantNewUserEmail').value,
        password: document.getElementById('participantNewUserPassword').value,
        role: 'PARTICIPANT'
      };
      if (!editingParticipantId) {
        payload._newUser = newUserPayload;
        payload.participantUserId = '';
      } else {
        const createResult = await Auth.addUser({ ...newUserPayload, linkParticipantId: editingParticipantId });
        if (!createResult.success) {
          participantError.textContent = createResult.message;
          participantError.classList.remove('d-none');
          return;
        }
        payload.participantUserId = createResult.user.id;
      }
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

  volunteerAdminForm?.addEventListener('input', () => {
    volunteerAdminError?.classList.add('d-none');
  });

  volunteerAdminForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    volunteerAdminForm.classList.add('was-validated');
    const interestsValid = adminVolInterestChips?.validate() ?? true;
    if (!volunteerAdminForm.checkValidity() || !interestsValid) return;
    const payload = {
      userId: document.getElementById('adminVolUserId').value,
      firstName: document.getElementById('adminVolFirstName').value,
      lastName: document.getElementById('adminVolLastName').value,
      phone: document.getElementById('adminVolPhone').value,
      interests: adminVolInterestChips?.getSelected() || [],
      availability: document.getElementById('adminVolAvailability').value,
      preferredLocation: document.getElementById('adminVolPreferredLocation').value,
      pronounsSubject: document.getElementById('adminVolPronounsSubject').value,
      pronounsObject: document.getElementById('adminVolPronounsObject').value,
      languagesSpoken: adminVolLangChips?.getSelected() || [],
      backgroundCheckStatus: document.getElementById('adminVolBackgroundCheck').value
    };
    if (editingVolunteerProfileId) payload.id = editingVolunteerProfileId;

    if (document.getElementById('adminVolCreateUserToggle')?.checked) {
      const newUserPayload = {
        name: `${payload.firstName} ${payload.lastName}`.trim(),
        email: document.getElementById('adminVolNewUserEmail').value,
        password: document.getElementById('adminVolNewUserPassword').value,
        role: 'VOLUNTEER'
      };
      if (!editingVolunteerUserId && !editingVolunteerProfileId) {
        const result = await Auth.createUserWithLinkedRecord({
          ...newUserPayload,
          volunteerProfile: payload
        });
        if (!result.success) {
          volunteerAdminError.textContent = result.message || 'Unable to create linked volunteer profile.';
          volunteerAdminError.classList.remove('d-none');
          return;
        }
        if (payload.backgroundCheckStatus && payload.backgroundCheckStatus !== 'Not Started') {
          await Auth.updateBgCheckStatus(result.user.id, payload.backgroundCheckStatus, 'Updated by admin via volunteer profile form');
        }
        resetVolunteerFormState();
        await renderVolunteersTable();
        await populateLinkedUserOptions();
        showVolunteersListView();
        showToast('Volunteer profile saved successfully.');
        return;
      }
      const createResult = await Auth.addUser({
        ...newUserPayload,
        linkVolunteerProfileId: editingVolunteerProfileId || editingVolunteerUserId
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

    const wasEditing = Boolean(editingVolunteerUserId || editingVolunteerProfileId);
    resetVolunteerFormState();
    await renderVolunteersTable();
    showVolunteersListView();
    showToast(wasEditing ? 'Volunteer profile updated successfully.' : 'Volunteer profile saved successfully.');
  });

  eventForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    eventForm.classList.add('was-validated');
    if (!eventForm.checkValidity()) return;
    const programFeeInput = document.getElementById('eventProgramFee');
    const materialsCostInput = document.getElementById('eventMaterialsCost');
    if (programFeeInput.value && Number(programFeeInput.value) < 0) {
      eventError.textContent = 'Program fee must be a non-negative number.';
      eventError.classList.remove('d-none');
      return;
    }
    if (materialsCostInput.value && Number(materialsCostInput.value) < 0) {
      eventError.textContent = 'Materials cost must be a non-negative number.';
      eventError.classList.remove('d-none');
      return;
    }
    const payload = {
      title: document.getElementById('eventTitle').value,
      category: document.getElementById('eventCategory').value,
      dateTime: document.getElementById('eventDateTime').value,
      location: document.getElementById('eventLocation').value,
      programFee: programFeeInput.value,
      materialsCost: materialsCostInput.value,
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
    const jobPayRateInput = document.getElementById('jobPayRate');
    const jobProgramFeeInput = document.getElementById('jobProgramFee');
    const jobMaterialsCostInput = document.getElementById('jobMaterialsCost');
    if (jobPayRateInput.value && Number(jobPayRateInput.value) < 0) {
      jobError.textContent = 'Pay rate must be a non-negative number.';
      jobError.classList.remove('d-none');
      return;
    }
    if (jobProgramFeeInput.value && Number(jobProgramFeeInput.value) < 0) {
      jobError.textContent = 'Program fee must be a non-negative number.';
      jobError.classList.remove('d-none');
      return;
    }
    if (jobMaterialsCostInput.value && Number(jobMaterialsCostInput.value) < 0) {
      jobError.textContent = 'Materials cost must be a non-negative number.';
      jobError.classList.remove('d-none');
      return;
    }
    const payRateNum = Number(jobPayRateInput.value || 0);
    const salary = payRateNum > 0 ? `$${payRateNum.toFixed(2)}/hr` : 'Unpaid';
    const payload = {
      title: document.getElementById('jobTitle').value,
      employer: document.getElementById('jobEmployer').value,
      location: document.getElementById('jobLocation').value,
      jobType: document.getElementById('jobType').value,
      status: document.getElementById('jobStatus').value,
      salary,
      payRate: jobPayRateInput.value,
      programFee: jobProgramFeeInput.value,
      materialsCost: jobMaterialsCostInput.value,
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
    const result = pendingUser.role === 'PARTICIPANT' || pendingUser.role === 'VOLUNTEER'
      ? await Auth.createUserWithLinkedRecord(pendingUser)
      : await Auth.addUser(pendingUser);
    confirmModal?.hide();
    if (!result.success) {
      registerError.textContent = result.message;
      registerError.classList.remove('d-none');
      pendingUser = null;
      return;
    }
    const createdRoleLabel = ROLE_LABEL[pendingUser.role] || pendingUser.role;
    if (pendingUser.role === 'VOLUNTEER' && pendingUser.volunteerProfile?.backgroundCheckStatus && pendingUser.volunteerProfile.backgroundCheckStatus !== 'Not Started') {
      await Auth.updateBgCheckStatus(result.user.id, pendingUser.volunteerProfile.backgroundCheckStatus, 'Updated by admin via user creation form');
    }
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
    const result = pendingParticipant._newUser
      ? await Auth.createUserWithLinkedRecord({
          ...pendingParticipant._newUser,
          role: 'PARTICIPANT',
          participantRecord: pendingParticipant
        })
      : await Auth.addParticipant(pendingParticipant);
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

  async function runPendingDelete(cascade) {
    if (!pendingDeleteIdentity) return;
    const pending = pendingDeleteIdentity;
    let result = { success: false, message: 'Nothing selected to delete.' };
    if (pending.kind === 'user') {
      result = await Auth.removeUser(pending.identifier, {
        preserveLinkedRecords: !cascade,
        deleteLinkedRecords: cascade
      });
    } else if (pending.kind === 'participant') {
      result = await Auth.removeParticipant(pending.identifier, { deleteLinkedUser: cascade });
    } else if (pending.kind === 'volunteer') {
      result = await Auth.removeVolunteerProfile(pending.identifier, { deleteLinkedUser: cascade });
    }

    deleteIdentityModal?.hide();
    if (!result.success) {
      const targetError = pending.kind === 'participant'
        ? participantError
        : (pending.kind === 'volunteer' ? volunteerAdminError : registerError);
      if (targetError) {
        targetError.textContent = result.message;
        targetError.classList.remove('d-none');
      }
      pendingDeleteIdentity = null;
      return;
    }
    pendingDeleteIdentity = null;
    await renderUsersTable();
    await renderParticipantsTable();
    await renderVolunteersTable();
    await populateLinkedUserOptions();
    showToast(cascade ? 'Linked user data deleted.' : 'Item deleted and linked data preserved.');
  }

  document.getElementById('deleteIdentityPreserveBtn')?.addEventListener('click', () => runPendingDelete(false));
  document.getElementById('deleteIdentityCascadeBtn')?.addEventListener('click', () => runPendingDelete(true));
  deleteIdentityModalEl?.addEventListener('hidden.bs.modal', () => {
    pendingDeleteIdentity = null;
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
  document.getElementById('participantCancelBtn')?.addEventListener('click', () => {
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
  document.getElementById('volunteerAdminCancelBtn')?.addEventListener('click', () => {
    resetVolunteerFormState();
    showVolunteersListView();
  });
  document.getElementById('volunteerFormEditBtn')?.addEventListener('click', () => {
    document.getElementById('volunteerFormTitle').textContent = 'Edit Volunteer Profile';
    setFormFieldsDisabled('volunteerAdminForm', false);
    document.getElementById('volunteerAdminSubmitBtn').classList.remove('d-none');
    document.getElementById('volunteerFormEditBtn').classList.add('d-none');
  });
  document.getElementById('participantDateOfBirth')?.addEventListener('input', updateParticipantAgeDisplay);
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
  async function applyGeneratedWeeklyNewsletter() {
    clearNewsletterMessages();
    const gen = await Auth.generateWeeklyNewsletter();
    if (!gen.success) {
      showToast(gen.message || 'Could not generate newsletter.');
      return;
    }
    const n = gen.newsletter;
    const users = await Auth.getUsers();
    const recipientEmails = users.filter((u) => u.role !== 'ADMIN').map((u) => u.email);
    await Auth.saveNewsletterDraft({
      subject: n.subject || '',
      eventHighlights: n.eventHighlights || '',
      updates: n.updates || '',
      recipients: recipientEmails
    });
    navigateTo('communications');
    const subEl = document.getElementById('newsletterSubject');
    const evEl = document.getElementById('newsletterEvents');
    const upEl = document.getElementById('newsletterUpdates');
    if (subEl) subEl.value = n.subject || '';
    if (evEl) evEl.value = n.eventHighlights || '';
    if (upEl) upEl.value = n.updates || '';
    await renderNewsletterRecipients();
    const draft = await Auth.getNewsletterDraft();
    const selected = new Set((draft?.recipients || []).map((e) => String(e).toLowerCase()));
    document.querySelectorAll('input[name="newsletterRecipients"]').forEach((cb) => {
      cb.checked = selected.has(String(cb.value).toLowerCase());
    });
    renderNewsletterPreview();
    showNewsletterSuccess(
      gen.updated
        ? 'Weekly newsletter refreshed with the latest events and jobs. Review the form, then distribute.'
        : 'Weekly newsletter generated and loaded. Review recipients, then distribute when ready.'
    );
    showToast('Weekly newsletter draft is ready in Communications.');
  }

  document.getElementById('adminGenerateNewsletterQuickBtn')?.addEventListener('click', () => {
    applyGeneratedWeeklyNewsletter();
  });
  document.getElementById('newsletterAutoGenerateBtn')?.addEventListener('click', () => {
    applyGeneratedWeeklyNewsletter();
  });
  document.getElementById('adminUrgentAlertsQuickBtn')?.addEventListener('click', () => navigateTo('urgent-notifications'));

  // ── Admin notification bell ───────────────────────────────────────────────
  const _adminBellConfig = { notificationsSection: 'a-notifications', role: 'ADMIN', eventSection: 'events', jobSection: 'jobs' };
  if (document.getElementById('nav-notifications-bell')) {
    NotificationsUI.renderNavBell(_adminBellConfig);
  } else {
    document.addEventListener('kindred:nav-ready', () => NotificationsUI.renderNavBell(_adminBellConfig), { once: true });
  }
  const _adminNotifSection = document.getElementById('section-a-notifications');
  if (_adminNotifSection) {
    new MutationObserver(() => {
      if (!_adminNotifSection.classList.contains('d-none')) {
        NotificationsUI.renderInbox('a-notifications-list', _adminBellConfig);
      }
    }).observe(_adminNotifSection, { attributes: true, attributeFilter: ['class'] });
  }

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
        document.getElementById('eventProgramFee').value = event.programFee != null ? event.programFee : '';
        document.getElementById('eventMaterialsCost').value = event.materialsCost != null ? event.materialsCost : '';
        document.getElementById('eventAccommodations').value = event.accommodations || '';
        const urgentCheck = document.getElementById('eventIsUrgent');
        if (urgentCheck) urgentCheck.checked = Boolean(event.isUrgent);
        editingEventId = event.id;
        eventsEditOrigin = 'urgent-notifications';
        document.getElementById('eventSubmitBtn').textContent = 'Update Event';
        navigateTo('events');
        showEventsFormView(true);
        await renderEventVolunteersPanel(event.id);
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
        document.getElementById('jobPayRate').value = job.payRate != null ? job.payRate : '';
        document.getElementById('jobProgramFee').value = job.programFee != null ? job.programFee : '';
        document.getElementById('jobMaterialsCost').value = job.materialsCost != null ? job.materialsCost : '';
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

        populateParticipantFormFromRecord(participant);
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

  async function renderAdminDashboardStats() {
    const el = document.getElementById('adminDashboardStats');
    if (!el) return;
    try {
      const [participants, events, jobs, approvals] = await Promise.all([
        Auth.getParticipants(),
        Auth.getEvents(),
        Auth.getJobs(),
        Auth.getPendingApprovals()
      ]);
      const now = Date.now();
      const upcomingCount = events.filter((e) => {
        const t = e.eventTimestamp ?? new Date(e.dateTime).getTime();
        return !isNaN(t) && t >= now;
      }).length;
      const openJobs = jobs.filter((j) => (j.status || 'Open') === 'Open').length;
      const pendingApprovalCount = approvals.filter((a) => a.status === 'PENDING').length;
      el.innerHTML = `
        <div class="col-6 col-lg-3">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body py-3">
              <div class="text-muted text-uppercase small mb-1">Participants</div>
              <div class="h4 mb-1 fw-semibold">${participants.length}</div>
              <button type="button" class="btn btn-link btn-sm p-0" onclick="navigateTo('participants')">Manage</button>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body py-3">
              <div class="text-muted text-uppercase small mb-1">Upcoming events</div>
              <div class="h4 mb-1 fw-semibold">${upcomingCount}</div>
              <button type="button" class="btn btn-link btn-sm p-0" onclick="navigateTo('events')">Events</button>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body py-3">
              <div class="text-muted text-uppercase small mb-1">Open jobs</div>
              <div class="h4 mb-1 fw-semibold">${openJobs}</div>
              <button type="button" class="btn btn-link btn-sm p-0" onclick="navigateTo('jobs')">Jobs</button>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card h-100 border-0 shadow-sm">
            <div class="card-body py-3">
              <div class="text-muted text-uppercase small mb-1">Pending job approvals</div>
              <div class="h4 mb-1 fw-semibold">${pendingApprovalCount}</div>
              <button type="button" class="btn btn-link btn-sm p-0" onclick="navigateTo('work-queue')">Work queue</button>
            </div>
          </div>
        </div>`;
    } catch (err) {
      console.error(err);
      el.innerHTML = '<div class="col-12"><div class="alert alert-light border mb-0 small">Unable to load dashboard stats.</div></div>';
    }
  }

  await renderAdminDashboardStats();

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
  toggleInlineParticipantUserFields();
  toggleInlineVolunteerUserFields();
  syncUserLinkVisibility();
  document.getElementById('regRole')?.addEventListener('change', syncUserLinkVisibility);
  document.getElementById('participantCreateUserToggle')?.addEventListener('change', toggleInlineParticipantUserFields);
  document.getElementById('adminVolCreateUserToggle')?.addEventListener('change', toggleInlineVolunteerUserFields);
});
