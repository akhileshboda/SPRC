/**
 * volunteer.js — Volunteer self-registration profile flow
 * Allows VOLUNTEER users to register personal info and interests,
 * and renders their matched events on the dashboard and a full event
 * discovery grid in the Events section.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.getSession();
  if (!session || session.role !== 'VOLUNTEER') return;

  // ── Matched-events scoring ─────────────────────────────────────────────────

  function tokenize(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(p => p.length > 2);
  }

  const INTEREST_CATEGORY_MAP = {
    'Mentoring':             ['Educational', 'Vocational'],
    'Educational Programs':  ['Educational'],
    'Community Events':      ['Social'],
    'Sports & Recreation':   ['Social'],
    'Administrative Support':['Vocational'],
    'Job Coaching':          ['Vocational']
  };

  function computeVolunteerMatches(profile, events) {
    const rawInterests = Array.isArray(profile.interests) ? profile.interests : [];
    const normalized = rawInterests.map(i => String(i).trim()).filter(Boolean);
    const interestTokens = normalized.flatMap(i => tokenize(i.startsWith('Other:') ? i.replace(/^Other:\s*/i, '') : i));
    const categoryHints  = normalized.flatMap(i => i.startsWith('Other:') ? [] : (INTEREST_CATEGORY_MAP[i] || []));

    return events
      .map(event => {
        let score = 0;
        if (categoryHints.includes(event.category)) score += 3;
        const eventTokens = new Set(tokenize(`${event.title} ${event.location} ${event.accommodations}`));
        interestTokens.forEach(t => { if (eventTokens.has(t)) score++; });
        return { event, score };
      })
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(e => e.event);
  }

  // ── HTML helpers ───────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const EVENT_BADGE = {
    Social:      { cls: 'badge-event-social',      icon: 'bi-people-fill' },
    Educational: { cls: 'badge-event-educational', icon: 'bi-book-fill' },
    Vocational:  { cls: 'badge-event-vocational',  icon: 'bi-briefcase-fill' }
  };

  function buildEventCard(event) {
    const now = Date.now();
    const ts  = event.eventTimestamp ?? new Date(event.dateTime).getTime();
    const isPast = !isNaN(ts) && ts < now;
    const meta = EVENT_BADGE[event.category] || { cls: 'bg-secondary', icon: 'bi-calendar' };
    return `
      <div class="col">
        <div class="portal-card h-100${isPast ? ' portal-card--past' : ''}">
          <div class="portal-card-header d-flex align-items-start justify-content-between gap-2">
            <div class="portal-card-title">${escHtml(event.title)}</div>
            <span class="badge ${meta.cls}"><i class="bi ${meta.icon} me-1"></i>${escHtml(event.category)}</span>
          </div>
          <div class="portal-card-meta">
            <span><i class="bi bi-clock me-1"></i>${escHtml(event.dateTimeLabel || event.dateTime)}</span>
            <span><i class="bi bi-geo-alt me-1"></i>${escHtml(event.location)}</span>
          </div>
          <div class="portal-card-body">
            <p class="portal-card-accommodations">${escHtml(event.accommodations)}</p>
          </div>
          <div class="portal-card-footer">
            <span class="portal-cost-pill"><i class="bi bi-tag me-1"></i>${escHtml(event.cost)}</span>
            ${isPast ? '<span class="portal-past-label">Past event</span>' : ''}
          </div>
        </div>
      </div>`;
  }

  function emptyState(icon, message) {
    return `<div class="portal-empty-state"><i class="bi ${icon}"></i><p>${message}</p></div>`;
  }

  // ── Render matched events on the dashboard home ────────────────────────────

  async function renderMatchedEvents(profile) {
    const container = document.getElementById('volMatchedEvents');
    if (!container) return;

    const events = await Auth.getEvents();
    const matches = computeVolunteerMatches(profile, events);

    if (!matches.length) {
      container.innerHTML = '<p class="text-muted small">Complete your interests above to see your matched events.</p>';
      return;
    }

    container.innerHTML = `
      <div class="volunteer-match-list mt-1">
        ${matches.map(e => `<span class="volunteer-match-chip">${escHtml(e.title)}</span>`).join('')}
      </div>`;
  }

  // ── Render full event grid in the v-events section ─────────────────────────

  async function renderVolunteerEvents() {
    const container = document.getElementById('v-events-grid');
    if (!container) return;

    const events = await Auth.getEvents();
    if (!events.length) {
      container.innerHTML = emptyState('bi-calendar-x', 'No events have been published yet. Check back soon!');
      return;
    }

    container.innerHTML = `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      ${events.map(buildEventCard).join('')}
    </div>`;
  }

  // ── Profile form wiring ────────────────────────────────────────────────────

  const form = document.getElementById('volunteerProfileForm');
  const statusEl = document.getElementById('volunteerProfileStatus');
  const errorEl = document.getElementById('volunteerProfileError');
  const submitBtn = document.getElementById('volunteerProfileSubmitBtn');
  const interestsDropdownBtnEl = document.getElementById('volInterestsDropdownBtn');
  const interestsSummaryEl = document.getElementById('volInterestsSummary');
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
    interestsDropdownBtnEl?.classList.remove('border-danger');
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

  function updateInterestsSummary() {
    const selected = getSelectedInterests();
    if (!interestsSummaryEl) return;
    if (selected.length === 0) { interestsSummaryEl.textContent = 'Select interests'; return; }
    const preview = selected.slice(0, 2).join(', ');
    const extra = selected.length > 2 ? ` +${selected.length - 2} more` : '';
    interestsSummaryEl.textContent = `${preview}${extra}`;
  }

  function getSelectedInterests() {
    const checked = interestCheckboxEls().filter(cb => cb.checked);
    const values = checked.map(cb => cb.value);
    if (values.includes('Other')) {
      const custom = String(otherInterestTextEl?.value || '').trim();
      if (custom) return values.map(v => v === 'Other' ? `Other: ${custom}` : v);
    }
    return values;
  }

  function setSelectedInterests(interests) {
    const list = Array.isArray(interests)
      ? interests
      : String(interests || '').split(',').map(i => i.trim()).filter(Boolean);

    let otherText = '';
    interestCheckboxEls().forEach(cb => {
      const isOtherPrefixed = list.some(v => v.startsWith('Other:'));
      if (cb.value === 'Other') {
        cb.checked = list.includes('Other') || isOtherPrefixed;
        if (isOtherPrefixed) {
          const match = list.find(v => v.startsWith('Other:'));
          otherText = String(match || '').replace(/^Other:\s*/i, '').trim();
        }
      } else {
        cb.checked = list.includes(cb.value);
      }
    });
    setOtherInterestInputState();
    if (otherText && otherInterestTextEl) otherInterestTextEl.value = otherText;
    updateInterestsSummary();
  }

  function validateInterestsSelection() {
    const selected = getSelectedInterests();
    if (selected.length === 0) {
      interestsDropdownBtnEl?.classList.add('border-danger');
      interestsFeedbackEl?.classList.remove('d-none');
      return false;
    }
    interestsDropdownBtnEl?.classList.remove('border-danger');
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
    await renderMatchedEvents(existing);
  }

  otherInterestCheckboxEl?.addEventListener('change', () => {
    setOtherInterestInputState();
    updateInterestsSummary();
    hideMessages();
  });

  interestCheckboxEls().forEach(cb => {
    cb.addEventListener('change', () => { updateInterestsSummary(); hideMessages(); });
  });

  otherInterestTextEl?.addEventListener('input', () => { updateInterestsSummary(); });

  form.addEventListener('input', hideMessages);
  setOtherInterestInputState();
  updateInterestsSummary();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    const interestsValid = validateInterestsSelection();
    if (!form.checkValidity() || !interestsValid) return;

    const payload = {
      firstName: firstNameEl.value,
      lastName: lastNameEl.value,
      phone: phoneEl.value,
      email: emailEl.value,
      interests: getSelectedInterests(),
      availability: availabilityEl.value
    };

    const result = await Auth.saveVolunteerProfile(payload);

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
    if (refreshed) await renderMatchedEvents(refreshed);
  });

  // Render full events grid now (for when volunteer clicks Events in sidebar)
  await renderVolunteerEvents();
});
