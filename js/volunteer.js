/**
 * volunteer.js — Volunteer self-registration profile flow
 * Allows VOLUNTEER users to register personal info and interests.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.getSession();
  if (!session || session.role !== 'VOLUNTEER') return;

  const form = document.getElementById('volunteerProfileForm');
  const statusEl = document.getElementById('volunteerProfileStatus');
  const errorEl = document.getElementById('volunteerProfileError');
  const submitBtn = document.getElementById('volunteerProfileSubmitBtn');
  const firstNameEl = document.getElementById('volFirstName');
  const lastNameEl = document.getElementById('volLastName');
  const phoneEl = document.getElementById('volPhone');
  const emailEl = document.getElementById('volEmail');
  const interestsEl = document.getElementById('volInterests');
  const availabilityEl = document.getElementById('volAvailability');

  if (!form) return;

  function hideMessages() {
    statusEl?.classList.add('d-none');
    errorEl?.classList.add('d-none');
  }

  function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  emailEl.value = session.email || '';
  const fallbackName = splitName(session.name || '');
  firstNameEl.value = fallbackName.firstName;
  lastNameEl.value = fallbackName.lastName;

  const existing = await Auth.getVolunteerProfile(session.email);
  if (existing) {
    firstNameEl.value = existing.firstName || firstNameEl.value;
    lastNameEl.value = existing.lastName || lastNameEl.value;
    phoneEl.value = existing.phone || '';
    interestsEl.value = existing.interests || '';
    availabilityEl.value = existing.availability || '';
    if (statusEl && existing.updatedAtLabel) {
      statusEl.textContent = `Profile loaded. Last updated: ${existing.updatedAtLabel}`;
      statusEl.classList.remove('d-none');
    }
    submitBtn.textContent = 'Update My Volunteer Profile';
  }

  form.addEventListener('input', hideMessages);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    const result = await Auth.saveVolunteerProfile({
      firstName: firstNameEl.value,
      lastName: lastNameEl.value,
      phone: phoneEl.value,
      email: emailEl.value,
      interests: interestsEl.value,
      availability: availabilityEl.value
    });

    if (!result.success) {
      if (errorEl) {
        errorEl.textContent = result.message || 'Unable to save your profile right now.';
        errorEl.classList.remove('d-none');
      }
      return;
    }

    const refreshed = await Auth.getVolunteerProfile(session.email);
    if (statusEl) {
      statusEl.textContent = refreshed?.updatedAtLabel
        ? `Volunteer profile saved. Last updated: ${refreshed.updatedAtLabel}`
        : 'Volunteer profile saved.';
      statusEl.classList.remove('d-none');
    }
    submitBtn.textContent = 'Update My Volunteer Profile';
  });
});
