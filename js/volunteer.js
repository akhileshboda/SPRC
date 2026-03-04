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
  const interestsGroupEl = document.getElementById('volInterestsGroup');
  const interestsFeedbackEl = document.getElementById('volInterestsFeedback');
  const otherInterestCheckboxEl = document.getElementById('volInterestOther');
  const otherInterestTextEl = document.getElementById('volInterestOtherText');
  const interestCheckboxEls = () => Array.from(document.querySelectorAll('input[name="volInterests"]'));
  const availabilityEl = document.getElementById('volAvailability');

  if (!form) return;

  function hideMessages() {
    statusEl?.classList.add('d-none');
    errorEl?.classList.add('d-none');
    interestsGroupEl?.classList.remove('border-danger');
    interestsFeedbackEl?.classList.add('d-none');
  }

  function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  function setOtherInterestInputState() {
    const enabled = Boolean(otherInterestCheckboxEl?.checked);
    if (!otherInterestTextEl) return;
    otherInterestTextEl.disabled = !enabled;
    if (!enabled) otherInterestTextEl.value = '';
  }

  function getSelectedInterests() {
    const checked = interestCheckboxEls().filter((checkbox) => checkbox.checked);
    const values = checked.map((checkbox) => checkbox.value);
    if (values.includes('Other')) {
      const custom = String(otherInterestTextEl?.value || '').trim();
      if (custom) {
        return values.map((value) => (value === 'Other' ? `Other: ${custom}` : value));
      }
    }
    return values;
  }

  function setSelectedInterests(interests) {
    const list = Array.isArray(interests)
      ? interests
      : String(interests || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    let otherText = '';
    interestCheckboxEls().forEach((checkbox) => {
      const isOtherPrefixed = list.some((value) => value.startsWith('Other:'));
      if (checkbox.value === 'Other') {
        checkbox.checked = list.includes('Other') || isOtherPrefixed;
        if (isOtherPrefixed) {
          const match = list.find((value) => value.startsWith('Other:'));
          otherText = String(match || '').replace(/^Other:\s*/i, '').trim();
        }
      } else {
        checkbox.checked = list.includes(checkbox.value);
      }
    });
    setOtherInterestInputState();
    if (otherText && otherInterestTextEl) {
      otherInterestTextEl.value = otherText;
    }
  }

  function validateInterestsSelection() {
    const selected = getSelectedInterests();
    if (selected.length === 0) {
      interestsGroupEl?.classList.add('border-danger');
      interestsFeedbackEl?.classList.remove('d-none');
      return false;
    }
    interestsGroupEl?.classList.remove('border-danger');
    interestsFeedbackEl?.classList.add('d-none');
    return true;
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
    setSelectedInterests(existing.interests);
    availabilityEl.value = existing.availability || '';
    if (statusEl && existing.updatedAtLabel) {
      statusEl.textContent = `Profile loaded. Last updated: ${existing.updatedAtLabel}`;
      statusEl.classList.remove('d-none');
    }
    submitBtn.textContent = 'Update My Volunteer Profile';
  }

  otherInterestCheckboxEl?.addEventListener('change', () => {
    setOtherInterestInputState();
    hideMessages();
  });

  form.addEventListener('input', hideMessages);
  setOtherInterestInputState();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    const interestsValid = validateInterestsSelection();
    if (!form.checkValidity() || !interestsValid) return;

    const result = await Auth.saveVolunteerProfile({
      firstName: firstNameEl.value,
      lastName: lastNameEl.value,
      phone: phoneEl.value,
      email: emailEl.value,
      interests: getSelectedInterests(),
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
