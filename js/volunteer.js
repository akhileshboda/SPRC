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

  function buildCostBreakdown(event) {
    const fee = event.programFee != null ? Number(event.programFee) : null;
    const mat = event.materialsCost != null ? Number(event.materialsCost) : null;
    const hasFee = fee !== null && fee > 0;
    const hasMat = mat !== null && mat > 0;
    const totalLabel = escHtml(event.cost || 'Free');
    let details = '';
    if (hasFee || hasMat) {
      const parts = [];
      if (hasFee) parts.push(`Fee: $${fee.toFixed(2)}`);
      if (hasMat) parts.push(`Materials: $${mat.toFixed(2)}`);
      details = `<span class="text-muted" style="font-size:0.75rem;"> (${parts.join(' + ')})</span>`;
    }
    return `<span class="portal-cost-pill"><i class="bi bi-tag me-1"></i>${totalLabel}${details}</span>`;
  }

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
            ${buildCostBreakdown(event)}
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

  // ── Background Check Consent Flow ───────────────────────────────────────

  const BG_STATUS_BADGE = {
    'Not Started': { cls: 'bg-secondary',          icon: 'bi-dash-circle' },
    'Pending':     { cls: 'bg-warning text-dark',   icon: 'bi-hourglass-split' },
    'Cleared':     { cls: 'bg-success',             icon: 'bi-check-circle-fill' },
    'Denied':      { cls: 'bg-danger',              icon: 'bi-x-circle-fill' },
    'Expired':     { cls: 'bg-dark',                icon: 'bi-exclamation-triangle-fill' },
    'Revoked':     { cls: 'bg-secondary',           icon: 'bi-arrow-counterclockwise' }
  };

  async function renderBgCheckPanel() {
    const statusDisplay = document.getElementById('bgCheckStatusDisplay');
    const consentArea = document.getElementById('bgCheckConsentArea');
    const historyContainer = document.getElementById('bgCheckVolunteerHistory');
    const revokeWrap = document.getElementById('bgCheckRevokeWrap');
    const revokeBtn = document.getElementById('bgCheckRevokeBtn');
    if (!statusDisplay) return;

    Auth.checkAndExpireBgRecords();

    const record = await Auth.getMyBgCheckRecord();
    const status = record?.status || 'Not Started';
    const badge = BG_STATUS_BADGE[status] || BG_STATUS_BADGE['Not Started'];
    const consentSubmitted = Boolean(record?.consentSubmitted);

    let expiryInfo = '';
    if (status === 'Cleared' && record?.expiresAtMs) {
      const expiresLabel = record.expiresAtLabel || new Date(record.expiresAtMs).toLocaleDateString();
      expiryInfo = `<div class="text-info small mt-1"><i class="bi bi-clock me-1"></i>Valid until: <strong>${escHtml(expiresLabel)}</strong></div>`;
    }

    statusDisplay.innerHTML = `
      <div class="d-flex align-items-center gap-3 mb-2">
        <span class="badge ${badge.cls} fs-6 px-3 py-2">
          <i class="bi ${badge.icon} me-1"></i>${escHtml(status)}
        </span>
        ${consentSubmitted
          ? `<span class="text-muted small"><i class="bi bi-check2 me-1"></i>Consent submitted ${escHtml(record.consentSubmittedAtLabel || '')}</span>`
          : '<span class="text-muted small"><i class="bi bi-x me-1"></i>Consent not yet submitted</span>'
        }
      </div>
      ${status === 'Cleared'
        ? `<div class="alert alert-success small mb-0 mt-2"><i class="bi bi-shield-fill-check me-1"></i>Your background check is cleared. You are eligible to participate in events.</div>${expiryInfo}`
        : ''
      }
      ${status === 'Denied'
        ? '<div class="alert alert-danger small mb-0 mt-2"><i class="bi bi-shield-fill-exclamation me-1"></i>Your background check has been denied. Contact your Kindred coordinator for details.</div>'
        : ''
      }
      ${status === 'Expired'
        ? '<div class="alert alert-warning small mb-0 mt-2"><i class="bi bi-shield-fill-exclamation me-1"></i>Your background check has expired. Please resubmit consent or contact your administrator.</div>'
        : ''
      }
      ${status === 'Revoked'
        ? '<div class="alert alert-secondary small mb-0 mt-2"><i class="bi bi-arrow-counterclockwise me-1"></i>Your background check authorization has been withdrawn. Resubmit consent if you want administrator review to resume.</div>'
        : ''
      }`;

    if (consentArea) {
      if (consentSubmitted && status !== 'Expired') {
        consentArea.classList.add('d-none');
      } else {
        consentArea.classList.remove('d-none');
      }
    }

    if (revokeWrap && revokeBtn) {
      const canRevoke = consentSubmitted && status === 'Pending';
      revokeWrap.classList.toggle('d-none', !canRevoke);
      revokeBtn.disabled = !canRevoke;
    }

    if (historyContainer && record?.statusHistory?.length) {
      historyContainer.innerHTML = record.statusHistory
        .slice()
        .reverse()
        .map((entry) => `
          <div class="border-bottom pb-2 mb-2">
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="badge ${(BG_STATUS_BADGE[entry.status] || BG_STATUS_BADGE['Not Started']).cls}">
                ${escHtml(entry.status)}
              </span>
              <span class="text-muted small">${escHtml(entry.changedAtLabel || '')}</span>
            </div>
            <div class="small text-muted">
              Changed by: ${escHtml(entry.changedByName || 'System')} (${escHtml(entry.changedByRole || '')})
              ${entry.note ? ` — ${escHtml(entry.note)}` : ''}
            </div>
          </div>`)
        .join('');
    } else if (historyContainer) {
      historyContainer.innerHTML = '<p class="text-muted small mb-0">No history yet.</p>';
    }
  }

  const consentCheckbox = document.getElementById('bgCheckConsentCheckbox');
  const consentSubmitBtn = document.getElementById('bgCheckSubmitConsentBtn');
  const consentErrorEl = document.getElementById('bgCheckConsentError');
  const consentSuccessEl = document.getElementById('bgCheckConsentSuccess');
  const revokeBtn = document.getElementById('bgCheckRevokeBtn');

  if (consentCheckbox && consentSubmitBtn) {
    consentCheckbox.addEventListener('change', () => {
      consentSubmitBtn.disabled = !consentCheckbox.checked;
    });

    consentSubmitBtn.addEventListener('click', async () => {
      consentErrorEl?.classList.add('d-none');
      consentSuccessEl?.classList.add('d-none');

      if (!consentCheckbox.checked) {
        if (consentErrorEl) {
          consentErrorEl.textContent = 'You must check the consent box before submitting.';
          consentErrorEl.classList.remove('d-none');
        }
        return;
      }

      consentSubmitBtn.disabled = true;
      const result = await Auth.submitBgCheckConsent();

      if (!result.success) {
        if (consentErrorEl) {
          consentErrorEl.textContent = result.message || 'Unable to submit consent.';
          consentErrorEl.classList.remove('d-none');
        }
        consentSubmitBtn.disabled = false;
        return;
      }

      if (consentSuccessEl) {
        consentSuccessEl.textContent = 'Consent submitted successfully! Your background check is now pending administrator review.';
        consentSuccessEl.classList.remove('d-none');
      }

      await renderBgCheckPanel();
    });
  }

  if (revokeBtn) {
    revokeBtn.addEventListener('click', async () => {
      consentErrorEl?.classList.add('d-none');
      consentSuccessEl?.classList.add('d-none');
      revokeBtn.disabled = true;

      const result = await Auth.revokeBgCheckConsent();
      if (!result.success) {
        if (consentErrorEl) {
          consentErrorEl.textContent = result.message || 'Unable to revoke consent.';
          consentErrorEl.classList.remove('d-none');
        }
        await renderBgCheckPanel();
        return;
      }

      if (consentCheckbox) consentCheckbox.checked = false;
      if (consentSubmitBtn) consentSubmitBtn.disabled = true;
      if (consentSuccessEl) {
        consentSuccessEl.textContent = 'Background check authorization withdrawn. You may resubmit consent whenever you are ready.';
        consentSuccessEl.classList.remove('d-none');
      }

      await renderBgCheckPanel();
    });
  }

  await renderBgCheckPanel();
});
