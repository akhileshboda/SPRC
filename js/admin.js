/**
 * admin.js — Kindred SPRC Admin Panel Module
 * Handles the "Register New Staff/Volunteer" form and "System Users" table.
 * Depends on auth.js being loaded first (uses the global Auth namespace).
 * Only meaningful when an ADMIN session is active.
 */
document.addEventListener('DOMContentLoaded', () => {

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

  // ── Render users table ────────────────────────────────────────────────────

  function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const users   = Auth.getUsers();
    const session = Auth.getSession();

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted px-3">No users found.</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => {
      const isSelf = session && session.email.toLowerCase() === u.email.toLowerCase();
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
          <td class="pe-3" style="width: 1%; white-space: nowrap;">${deleteBtn}</td>
        </tr>
      `;
    }).join('');

    // Wire delete buttons via event delegation on the tbody.
    tbody.querySelectorAll('button[data-email]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = Auth.removeUser(btn.dataset.email);
        if (result.success) {
          renderUsersTable();
        }
      });
    });
  }

  function renderParticipantsTable() {
    const tbody = document.getElementById('participantsTableBody');
    if (!tbody) return;

    const participants = Auth.getParticipants();
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
      btn.addEventListener('click', () => {
        startParticipantEdit(btn.dataset.participantEditId);
      });
    });

    tbody.querySelectorAll('button[data-participant-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const result = Auth.removeParticipant(btn.dataset.participantId);
        if (result.success) {
          if (editingParticipantId && editingParticipantId === btn.dataset.participantId) {
            resetParticipantFormState();
          }
          renderParticipantsTable();
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

  // ── Confirmation modal ────────────────────────────────────────────────────

  const confirmModalEl = document.getElementById('confirmCreateModal');
  const confirmModal   = confirmModalEl ? bootstrap.Modal.getOrCreateInstance(confirmModalEl) : null;
  const confirmBtn     = document.getElementById('confirmCreateBtn');

  // Holds validated form data while the modal is open.
  let pendingUser = null;

  // Populate the modal summary panel with the about-to-be-created user's details.
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

  // ── Register form handler ─────────────────────────────────────────────────

  const registerForm  = document.getElementById('registerForm');
  const registerError = document.getElementById('registerError');
  const toastEl       = document.getElementById('adminToast');
  const toastMsgEl    = document.getElementById('adminToastMsg');
  const participantForm = document.getElementById('participantForm');
  const participantError = document.getElementById('participantError');
  const participantSubmitBtn = document.getElementById('participantSubmitBtn');
  const participantCancelEditBtn = document.getElementById('participantCancelEditBtn');
  let editingParticipantId = null;

  function resetParticipantFormState() {
    if (!participantForm) return;
    participantForm.reset();
    participantForm.classList.remove('was-validated');
    participantError.classList.add('d-none');
    editingParticipantId = null;
    if (participantSubmitBtn) participantSubmitBtn.textContent = 'Save Participant Record';
    if (participantCancelEditBtn) participantCancelEditBtn.classList.add('d-none');
  }

  function startParticipantEdit(participantId) {
    const participant = Auth.getParticipants().find(p => p.id === participantId);
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
    if (participantCancelEditBtn) participantCancelEditBtn.classList.remove('d-none');
    participantForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const form = this;
      form.classList.add('was-validated');

      // Field-level HTML5 validation first.
      if (!form.checkValidity()) return;

      // Stash form data and open the confirmation modal instead of creating immediately.
      pendingUser = {
        name:     document.getElementById('regName').value,
        email:    document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        role:     document.getElementById('regRole').value
      };

      populateModalSummary(pendingUser);
      confirmModal.show();
    });

    // Hide the error banner when the user starts correcting the form.
    registerForm.addEventListener('input', () => {
      registerError.classList.add('d-none');
    });
  }

  if (participantForm) {
    participantForm.addEventListener('submit', function (e) {
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

      const result = editingParticipantId
        ? Auth.updateParticipant(editingParticipantId, payload)
        : Auth.addParticipant(payload);

      if (result.success) {
        const isEditing = Boolean(editingParticipantId);
        resetParticipantFormState();

        toastMsgEl.textContent = isEditing
          ? 'Participant record updated successfully.'
          : 'Participant record saved successfully.';
        bootstrap.Toast.getOrCreateInstance(toastEl).show();

        renderParticipantsTable();
      } else {
        participantError.textContent = result.message;
        participantError.classList.remove('d-none');
      }
    });

    participantForm.addEventListener('input', () => {
      participantError.classList.add('d-none');
    });
  }

  if (participantCancelEditBtn) {
    participantCancelEditBtn.addEventListener('click', () => {
      resetParticipantFormState();
    });
  }

  // ── Confirm button (inside modal) ─────────────────────────────────────────

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!pendingUser) return;

      const result = Auth.addUser(pendingUser);

      confirmModal.hide();

      if (result.success) {
        // Reset form state.
        registerForm.reset();
        registerForm.classList.remove('was-validated');
        registerError.classList.add('d-none');

        // Show success toast.
        const roleName = ROLE_LABEL[pendingUser.role] || pendingUser.role;
        toastMsgEl.textContent = `Success: Account for ${pendingUser.name.trim()} created as ${roleName}.`;
        bootstrap.Toast.getOrCreateInstance(toastEl).show();

        // Refresh the users table immediately.
        renderUsersTable();

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

  // ── Init ──────────────────────────────────────────────────────────────────

  renderUsersTable();
  renderParticipantsTable();

});
