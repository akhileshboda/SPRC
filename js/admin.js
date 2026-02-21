/**
 * admin.js — Kindred SPRC Admin Panel Module
 * Handles the "Register New Staff/Volunteer" form and "System Users" table.
 * Depends on auth.js being loaded first (uses the global Auth namespace).
 * Only meaningful when an ADMIN session is active.
 */
document.addEventListener('DOMContentLoaded', async () => {

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
  let editingUserEmail = null;
  let editingParticipantId = null;

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
          toastMsgEl.textContent = `Success: Account for ${fullName} updated.`;
          bootstrap.Toast.getOrCreateInstance(toastEl).show();
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
          toastMsgEl.textContent = 'Participant record updated successfully.';
          bootstrap.Toast.getOrCreateInstance(toastEl).show();
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
        toastMsgEl.textContent = `Success: Account for ${pendingUser.name.trim()} created as ${roleName}.`;
        bootstrap.Toast.getOrCreateInstance(toastEl).show();

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
        toastMsgEl.textContent = 'Participant record saved successfully.';
        bootstrap.Toast.getOrCreateInstance(toastEl).show();
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

  // Wire "New" buttons to reset the form and show the form sub-view.
  document.getElementById('newParticipantBtn')?.addEventListener('click', () => {
    resetParticipantFormState();
    showParticipantsFormView(false);
  });

  document.getElementById('backToParticipantsBtn')?.addEventListener('click', () => {
    resetParticipantFormState();
    showParticipantsListView();
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
