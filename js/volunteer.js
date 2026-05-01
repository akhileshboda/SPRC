/**
 * volunteer.js — Volunteer self-registration profile flow
 * Allows VOLUNTEER users to register personal info and interests,
 * and renders their matched events on the dashboard and a full event
 * discovery grid in the Events section.
 */
document.addEventListener('sections:ready', async (e) => {
  const session = e.detail.session;
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

  function scoreVolunteerEvent(profile, event) {
    const rawInterests = Array.isArray(profile?.interests) ? profile.interests : [];
    const normalized = rawInterests.map((i) => String(i).trim()).filter(Boolean);
    const interestTokens = normalized.flatMap((i) => tokenize(i.startsWith('Other:') ? i.replace(/^Other:\s*/i, '') : i));
    const categoryHints = normalized.flatMap((i) => (i.startsWith('Other:') ? [] : (INTEREST_CATEGORY_MAP[i] || [])));
    let score = 0;
    if (categoryHints.includes(event.category)) score += 3;
    const eventTokens = new Set(tokenize(`${event.title} ${event.location} ${event.accommodations}`));
    interestTokens.forEach((t) => { if (eventTokens.has(t)) score++; });
    return score;
  }

  function computeVolunteerMatches(profile, events) {
    return events
      .map((event) => ({ event, score: scoreVolunteerEvent(profile, event) }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((e) => e.event);
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

  function relativeTimeLabel(ts) {
    if (isNaN(ts)) return '';
    const diff = ts - Date.now();
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    if (diff < 0) return 'Past';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `In ${days} days`;
    return '';
  }

  function buildEventCard(event, options = {}) {
    const matchScore = typeof options.matchScore === 'number' ? options.matchScore : null;
    const showMatch = Boolean(options.showMatchBadge);
    const signedUp = Boolean(options.signedUp);
    const now = Date.now();
    const ts = event.eventTimestamp ?? new Date(event.dateTime).getTime();
    const isPast = !isNaN(ts) && ts < now;
    const rel = !isPast ? relativeTimeLabel(ts) : '';
    const meta = EVENT_BADGE[event.category] || { cls: 'bg-secondary', icon: 'bi-calendar' };
    const urgent = Boolean(event.isUrgent);
    const acc = String(event.accommodations || '');
    const accShort = acc.length > 220 ? `${acc.slice(0, 220)}…` : acc;
    const signupBtn = isPast ? '' : `
      <button class="btn btn-sm ${signedUp ? 'btn-outline-danger' : 'btn-outline-info'} js-vol-signup ms-auto"
        data-event-id="${escHtml(event.id)}" data-signed-up="${signedUp}">
        <i class="bi ${signedUp ? 'bi-calendar-x' : 'bi-calendar-plus'} me-1"></i>${signedUp ? 'Withdraw' : 'Sign Up'}
      </button>`;
    return `
      <div class="col">
        <div class="portal-card h-100${isPast ? ' portal-card--past' : ''}${urgent ? ' border border-danger border-opacity-50' : ''}${signedUp ? ' border border-info border-opacity-50' : ''}">
          <div class="portal-card-header d-flex align-items-start justify-content-between gap-2">
            <div class="portal-card-title">${escHtml(event.title)}</div>
            <div class="d-flex flex-column align-items-end gap-1 flex-shrink-0">
              ${urgent ? '<span class="badge bg-danger" style="font-size:0.65rem;">URGENT</span>' : ''}
              <span class="badge ${meta.cls}"><i class="bi ${meta.icon} me-1"></i>${escHtml(event.category)}</span>
              ${showMatch && matchScore > 0 ? `<span class="badge bg-info text-dark" style="font-size:0.65rem;"><i class="bi bi-stars me-1"></i>Match ${matchScore}</span>` : ''}
              ${signedUp ? '<span class="badge bg-info text-dark" style="font-size:0.65rem;"><i class="bi bi-check-circle me-1"></i>Signed Up</span>' : ''}
            </div>
          </div>
          <div class="portal-card-meta flex-column align-items-start">
            <span><i class="bi bi-clock me-1"></i>${escHtml(event.dateTimeLabel || event.dateTime)}${rel ? ` <span class="text-muted">(${rel})</span>` : ''}</span>
            <span><i class="bi bi-geo-alt me-1"></i>${escHtml(event.location)}</span>
          </div>
          <div class="portal-card-body">
            <p class="portal-card-accommodations small mb-0">${escHtml(accShort)}</p>
          </div>
          <div class="portal-card-footer">
            ${buildCostBreakdown(event)}
            ${isPast ? '<span class="portal-past-label">Past event</span>' : ''}
            ${signupBtn}
          </div>
        </div>
      </div>`;
  }

  function emptyState(icon, message) {
    return `<div class="portal-empty-state"><i class="bi ${icon}"></i><p>${message}</p></div>`;
  }

  async function renderVolunteerNewsletter() {
    const container = document.getElementById('v-newsletter-content');
    if (!container) return;
    const newsletters = await Auth.getNewsletters();
    if (!newsletters.length) {
      container.innerHTML = emptyState('bi-envelope', 'No newsletter has been sent yet. Check back soon!');
      return;
    }
    const newsletter = newsletters[0];
    container.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-header text-white fw-semibold d-flex justify-content-between align-items-center" style="background-color:#4F62B0;">
          <span><i class="bi bi-envelope-paper me-2"></i>${escHtml(newsletter.subject)}</span>
          <small class="opacity-75">${escHtml(newsletter.weekOf)}</small>
        </div>
        <div class="card-body">
          <pre style="white-space: pre-wrap; font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; border: none; background: none; padding: 0; margin: 0;">${escHtml(newsletter.body)}</pre>
          <div class="mt-4 text-muted small border-top pt-3">
            <i class="bi bi-clock me-1"></i>Sent ${escHtml(newsletter.generatedAtLabel)}
          </div>
        </div>
      </div>`;
  }

  // ── Render matched events on the dashboard home ────────────────────────────

  async function renderMatchedEvents(profile) {
    const container = document.getElementById('volMatchedEvents');
    if (!container) return;

    const events = await Auth.getEvents();
    const matches = computeVolunteerMatches(profile, events);

    if (!matches.length) {
      container.innerHTML = '<p class="text-muted small">Complete your interests in <a href="#v-profile" onclick="navigateTo(\'v-profile\')">My Profile</a> to see your matched events.</p>';
      return;
    }

    container.innerHTML = `
      <div class="volunteer-match-list mt-1">
        ${matches.map(e => `<span class="volunteer-match-chip">${escHtml(e.title)}</span>`).join('')}
      </div>`;
  }

  let volunteerEventFilter = 'all';
  let volunteerEventCategory = '';

  async function renderVolunteerDashboardSnapshot() {
    const el = document.getElementById('volunteerDashboardSnapshot');
    if (!el) return;
    const profile = await Auth.getVolunteerProfile(session.email);
    const events = await Auth.getEvents();
    const now = Date.now();
    const upcoming = events.filter((e) => {
      const t = e.eventTimestamp ?? new Date(e.dateTime).getTime();
      return !isNaN(t) && t >= now;
    });
    const matched = profile ? computeVolunteerMatches(profile, events) : [];
    const bg = await Auth.getMyBgCheckRecord();
    const bgLabel = bg?.status || 'Not Started';
    el.innerHTML = `
      <div class="card border-0 shadow-sm mb-4" style="background: linear-gradient(120deg, #e8f4fc 0%, #f0f4ff 100%);">
        <div class="card-body">
          <div class="row g-3 align-items-center">
            <div class="col-md-8">
              <h5 class="mb-2 fw-semibold"><i class="bi bi-compass me-2 text-primary"></i>Your volunteer snapshot</h5>
              <p class="text-muted small mb-2 mb-md-0">
                <strong>${upcoming.length}</strong> upcoming event${upcoming.length === 1 ? '' : 's'} published ·
                <strong>${matched.length}</strong> strong match${matched.length === 1 ? '' : 'es'} for your interests
                ${profile?.interests?.length ? '' : ' — <span class="text-warning">add interests below to unlock matches</span>'}
              </p>
              <div class="small"><span class="text-muted">Background check:</span> <span class="badge bg-secondary">${escHtml(bgLabel)}</span></div>
            </div>
            <div class="col-md-4 d-flex flex-wrap gap-2 justify-content-md-end">
              <button type="button" class="btn btn-sm btn-outline-primary" onclick="navigateTo('v-events')"><i class="bi bi-calendar-event me-1"></i>Browse events</button>
              <button type="button" class="btn btn-sm btn-outline-primary" onclick="navigateTo('v-bgcheck')"><i class="bi bi-shield-lock me-1"></i>Background check</button>
              <button type="button" class="btn btn-sm btn-outline-secondary" onclick="navigateTo('v-profile')"><i class="bi bi-person-lines-fill me-1"></i>Edit profile</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── Render full event grid in the v-events section ─────────────────────────

  async function renderVolunteerEvents() {
    const toolbar = document.getElementById('v-events-toolbar');
    const container = document.getElementById('v-events-grid');
    if (!container) return;

    const [profile, events, myVolunteerEvents] = await Promise.all([
      Auth.getVolunteerProfile(session.email),
      Auth.getEvents(),
      Auth.getMyVolunteerEvents()
    ]);
    const now = Date.now();
    const myEventIds = new Set(myVolunteerEvents.map((e) => String(e.id)));

    if (!events.length) {
      if (toolbar) toolbar.innerHTML = '';
      container.innerHTML = emptyState('bi-calendar-x', 'No events have been published yet. Check back soon!');
      return;
    }

    const upcomingCount = events.filter((e) => {
      const t = e.eventTimestamp ?? new Date(e.dateTime).getTime();
      return !isNaN(t) && t >= now;
    }).length;

    const scored = events.map((event) => ({
      event,
      score: profile ? scoreVolunteerEvent(profile, event) : 0
    }));
    const matchedCount = scored.filter((s) => s.score > 0).length;
    const signedUpCount = myEventIds.size;

    if (toolbar) {
      toolbar.innerHTML = `
        <div class="card border-0 shadow-sm" style="background: linear-gradient(135deg, rgba(13,202,240,0.08), rgba(79,98,176,0.06));">
          <div class="card-body py-3">
            <div class="row g-2 align-items-center">
              <div class="col-12 col-lg-auto">
                <span class="text-muted small me-2"><i class="bi bi-funnel me-1"></i>View</span>
                <div class="btn-group btn-group-sm flex-wrap" role="group">
                  <button type="button" class="btn ${volunteerEventFilter === 'all' ? 'btn-info' : 'btn-outline-secondary'} js-vol-ev-filter" data-filter="all">All</button>
                  <button type="button" class="btn ${volunteerEventFilter === 'upcoming' ? 'btn-info' : 'btn-outline-secondary'} js-vol-ev-filter" data-filter="upcoming">Upcoming</button>
                  <button type="button" class="btn ${volunteerEventFilter === 'matched' ? 'btn-info' : 'btn-outline-secondary'} js-vol-ev-filter" data-filter="matched">Matched to me</button>
                  <button type="button" class="btn ${volunteerEventFilter === 'signed-up' ? 'btn-info' : 'btn-outline-secondary'} js-vol-ev-filter" data-filter="signed-up">
                    My Sign-Ups ${signedUpCount > 0 ? `<span class="badge bg-white text-info ms-1">${signedUpCount}</span>` : ''}
                  </button>
                </div>
              </div>
              <div class="col-12 col-lg">
                <label class="visually-hidden" for="volEventCategorySelect">Category</label>
                <select class="form-select form-select-sm js-vol-ev-category" id="volEventCategorySelect" style="max-width:260px;">
                  <option value="">All categories</option>
                  <option value="Social">Social</option>
                  <option value="Educational">Educational</option>
                  <option value="Vocational">Vocational</option>
                </select>
              </div>
              <div class="col-12 col-lg text-lg-end small text-muted">
                <i class="bi bi-calendar-week me-1"></i>${upcomingCount} upcoming
                <span class="mx-1">·</span>
                <i class="bi bi-stars me-1"></i>${matchedCount} interest match${matchedCount === 1 ? '' : 'es'}
                <span class="mx-1">·</span>
                <i class="bi bi-calendar-check me-1"></i>${signedUpCount} sign-up${signedUpCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>`;
      toolbar.querySelectorAll('.js-vol-ev-filter').forEach((btn) => {
        btn.addEventListener('click', () => {
          volunteerEventFilter = btn.dataset.filter || 'all';
          renderVolunteerEvents();
        });
      });
      const sel = toolbar.querySelector('.js-vol-ev-category');
      if (sel) {
        sel.value = volunteerEventCategory;
        sel.addEventListener('change', () => {
          volunteerEventCategory = sel.value;
          renderVolunteerEvents();
        });
      }
    }

    let list = scored.map((s) => s.event);
    if (volunteerEventFilter === 'upcoming') {
      list = scored
        .filter((s) => {
          const t = s.event.eventTimestamp ?? new Date(s.event.dateTime).getTime();
          return !isNaN(t) && t >= now;
        })
        .map((s) => s.event);
    } else if (volunteerEventFilter === 'matched') {
      list = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.event);
    } else if (volunteerEventFilter === 'signed-up') {
      list = events.filter((e) => myEventIds.has(String(e.id)));
    }
    if (volunteerEventCategory) {
      list = list.filter((e) => e.category === volunteerEventCategory);
    }

    if (!list.length) {
      const emptyMsg = volunteerEventFilter === 'signed-up'
        ? 'You haven\'t signed up for any events yet. Browse All or Upcoming events and click Sign Up.'
        : 'No events match these filters. Try All or Upcoming, or pick another category.';
      container.innerHTML = emptyState('bi-funnel', emptyMsg);
      return;
    }

    const showMatchOnCard = volunteerEventFilter === 'matched' || volunteerEventFilter === 'all';
    container.innerHTML = `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      ${list.map((event) => {
        const sc = profile ? scoreVolunteerEvent(profile, event) : 0;
        return buildEventCard(event, {
          matchScore: sc,
          showMatchBadge: showMatchOnCard && sc > 0,
          signedUp: myEventIds.has(String(event.id))
        });
      }).join('')}
    </div>`;

    container.querySelectorAll('.js-vol-signup').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const eventId = btn.dataset.eventId;
        const isSignedUp = btn.dataset.signedUp === 'true';
        btn.disabled = true;
        const result = isSignedUp
          ? await Auth.withdrawFromEvent(eventId)
          : await Auth.selfSignUpForEvent(eventId);
        if (result.success) {
          await renderVolunteerEvents();
          await renderVolunteerDashboardSnapshot();
        } else {
          btn.disabled = false;
          alert(result.message || 'Unable to update sign-up.');
        }
      });
    });
  }

  // ── Profile form wiring ────────────────────────────────────────────────────

  const { renderProfileHeader, renderInterestChips, renderLanguageChips,
          VOLUNTEER_INTERESTS } =
    await import('./profile-ui.js');

  const form      = document.getElementById('volunteerProfileForm');
  const statusEl  = document.getElementById('volunteerProfileStatus');
  const errorEl   = document.getElementById('volunteerProfileError');
  const firstNameEl         = document.getElementById('volFirstName');
  const lastNameEl          = document.getElementById('volLastName');
  const phoneEl             = document.getElementById('volPhone');
  const emailEl             = document.getElementById('volEmail');
  const pronounsSubjectEl   = document.getElementById('volPronounsSubject');
  const pronounsObjectEl    = document.getElementById('volPronounsObject');
  const availabilityEl      = document.getElementById('volAvailability');
  const preferredLocationEl = document.getElementById('volPreferredLocation');
  const interestsContainer  = document.getElementById('volInterestsChips');
  const languagesContainer  = document.getElementById('volLanguagesChips');
  const headerContainer     = document.getElementById('volProfileHeader');
  const complianceDisplay   = document.getElementById('volComplianceDisplay');

  if (!form) return;

  const interestChips = renderInterestChips(interestsContainer, VOLUNTEER_INTERESTS, [], { required: true });
  interestsContainer.id = 'volInterestsChips';

  const langChips = renderLanguageChips(languagesContainer, []);

  function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  function hideMessages() {
    statusEl?.classList.add('d-none');
    errorEl?.classList.add('d-none');
  }

  const BG_STATUS_BADGE = {
    'Not Started': { cls: 'bg-secondary',         icon: 'bi-dash-circle',                label: 'Not Started' },
    'Pending':     { cls: 'bg-warning text-dark',  icon: 'bi-hourglass-split',            label: 'Pending' },
    'Cleared':     { cls: 'bg-success',            icon: 'bi-check-circle-fill',          label: 'Cleared' },
    'Denied':      { cls: 'bg-danger',             icon: 'bi-x-circle-fill',              label: 'Denied' },
    'Expired':     { cls: 'bg-dark',               icon: 'bi-exclamation-triangle-fill',  label: 'Expired' },
    'Revoked':     { cls: 'bg-secondary',          icon: 'bi-arrow-counterclockwise',     label: 'Revoked' }
  };

  function renderComplianceBadge(profile) {
    if (!complianceDisplay) return;
    const status = profile?.backgroundCheckStatus || 'Not Started';
    const badge  = BG_STATUS_BADGE[status] || BG_STATUS_BADGE['Not Started'];
    const expiry = profile?.backgroundCheckExpiry
      ? `<span class="text-muted small ms-2">Expires ${escHtml(profile.backgroundCheckExpiry)}</span>`
      : '';
    complianceDisplay.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi ${badge.icon}" aria-hidden="true"></i>
        <span class="badge ${badge.cls}"><i class="bi ${badge.icon} me-1" aria-hidden="true"></i>Background Check</span>
        <span class="fw-semibold small">${escHtml(badge.label)}</span>
        ${expiry}
      </div>
    `;
  }

  emailEl.value = session.email || '';
  const fallbackName = splitName(session.name || '');
  firstNameEl.value = fallbackName.firstName;
  lastNameEl.value  = fallbackName.lastName;

  const existing = await Auth.getVolunteerProfile(session.email);

  renderProfileHeader(headerContainer, {
    name: existing
      ? `${existing.firstName || fallbackName.firstName} ${existing.lastName || fallbackName.lastName}`.trim()
      : (session.name || session.email),
    role: 'Volunteer',
    lastUpdatedMs: existing?.updatedAt
  });

  if (existing) {
    firstNameEl.value = existing.firstName || firstNameEl.value;
    lastNameEl.value  = existing.lastName  || lastNameEl.value;
    phoneEl.value     = existing.phone     || '';
    availabilityEl.value      = existing.availability      || '';
    if (preferredLocationEl) preferredLocationEl.value = existing.preferredLocation || '';
    if (pronounsSubjectEl)   pronounsSubjectEl.value   = existing.pronounsSubject   || '';
    if (pronounsObjectEl)    pronounsObjectEl.value    = existing.pronounsObject    || '';
    interestChips.setSelected(existing.interests || []);
    langChips.setSelected(existing.languagesSpoken || []);
    renderComplianceBadge(existing);
    await renderMatchedEvents(existing);
    await renderVolunteerDashboardSnapshot();
  } else {
    renderComplianceBadge(null);
    await renderVolunteerDashboardSnapshot();
  }

  form.addEventListener('input', hideMessages);

  document.getElementById('volunteerProfileCancelBtn')?.addEventListener('click', () => {
    form.classList.remove('was-validated');
    hideMessages();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    const interestsValid = interestChips.validate();
    if (!form.checkValidity() || !interestsValid) return;

    const payload = {
      firstName:         firstNameEl.value,
      lastName:          lastNameEl.value,
      phone:             phoneEl.value,
      email:             emailEl.value,
      interests:         interestChips.getSelected(),
      availability:      availabilityEl.value,
      preferredLocation: preferredLocationEl?.value || '',
      pronounsSubject:   pronounsSubjectEl?.value   || '',
      pronounsObject:    pronounsObjectEl?.value    || '',
      languagesSpoken:   langChips.getSelected()
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
        ? `Profile saved. Last updated: ${refreshed.updatedAtLabel}`
        : 'Profile saved.';
      statusEl.classList.remove('d-none');
    }
    renderProfileHeader(headerContainer, {
      name: `${refreshed?.firstName || ''} ${refreshed?.lastName || ''}`.trim() || session.name,
      role: 'Volunteer',
      lastUpdatedMs: refreshed?.updatedAt
    });
    renderComplianceBadge(refreshed);
    if (refreshed) {
      await renderMatchedEvents(refreshed);
      await renderVolunteerDashboardSnapshot();
    }
  });

  const vEventsSection = document.getElementById('section-v-events');
  if (vEventsSection) {
    new MutationObserver(() => {
      if (!vEventsSection.classList.contains('d-none')) renderVolunteerEvents();
    }).observe(vEventsSection, { attributes: true, attributeFilter: ['class'] });
  }

  const dashboardSection = document.getElementById('section-dashboard');
  if (dashboardSection) {
    new MutationObserver(() => {
      if (!dashboardSection.classList.contains('d-none')) renderVolunteerDashboardSnapshot();
    }).observe(dashboardSection, { attributes: true, attributeFilter: ['class'] });
  }

  const vProfileSection = document.getElementById('section-v-profile');
  if (vProfileSection) {
    new MutationObserver(async () => {
      if (!vProfileSection.classList.contains('d-none')) {
        const refreshed = await Auth.getVolunteerProfile(session.email);
        if (refreshed) await renderMatchedEvents(refreshed);
      }
    }).observe(vProfileSection, { attributes: true, attributeFilter: ['class'] });
  }

  // ── Background Check Consent Flow ───────────────────────────────────────

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
  const consentDobInput = document.getElementById('bgCheckVolunteerDob');
  const consentErrorEl = document.getElementById('bgCheckConsentError');
  const consentSuccessEl = document.getElementById('bgCheckConsentSuccess');
  const revokeBtn = document.getElementById('bgCheckRevokeBtn');

  function setBgCheckDobMax() {
    if (!consentDobInput) return;
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    consentDobInput.max = d.toISOString().slice(0, 10);
  }
  setBgCheckDobMax();

  if (consentCheckbox && consentSubmitBtn) {
    const syncConsentBtn = () => {
      consentSubmitBtn.disabled = !consentCheckbox.checked;
    };
    consentCheckbox.addEventListener('change', syncConsentBtn);
    consentDobInput?.addEventListener('input', syncConsentBtn);

    consentSubmitBtn.addEventListener('click', async () => {
      consentErrorEl?.classList.add('d-none');
      consentSuccessEl?.classList.add('d-none');

      if (!consentDobInput?.value?.trim()) {
        if (consentErrorEl) {
          consentErrorEl.textContent = 'Date of birth is required before submitting background check consent.';
          consentErrorEl.classList.remove('d-none');
        }
        return;
      }

      if (!consentCheckbox.checked) {
        if (consentErrorEl) {
          consentErrorEl.textContent = 'You must check the consent box before submitting.';
          consentErrorEl.classList.remove('d-none');
        }
        return;
      }

      consentSubmitBtn.disabled = true;
      const result = await Auth.submitBgCheckConsent({ dateOfBirth: consentDobInput.value.trim() });

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

  // ─── My Tasks (Story 1001) ────────────────────────────────────────────────

  const VOL_TASK_STATUS_BADGE = {
    ASSIGNED:    'bg-primary',
    IN_PROGRESS: 'bg-warning text-dark',
    COMPLETED:   'bg-success',
    REJECTED:    'bg-danger'
  };
  const VOL_TASK_STATUS_LABEL = {
    ASSIGNED:    'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED:   'Completed',
    REJECTED:    'Rejected'
  };

  let currentResolveTaskId = null;

  async function renderVolunteerTaskHistory() {
    const container = document.getElementById('volTasksList');
    if (!container) return;
    const raw = JSON.parse(localStorage.getItem('kindred_tasks') || '[]');
    const resolved = raw.filter(t =>
      String(t.assignedToUserId) === String(session.userId) &&
      ['COMPLETED', 'REJECTED'].includes(t.status)
    );
    if (!resolved.length) return;
    const historyHtml = resolved.map((task) => {
      const isCompleted = task.status === 'COMPLETED';
      return `
        <div class="card shadow-sm mb-2 opacity-75">
          <div class="card-body py-2 px-3">
            <div class="d-flex justify-content-between align-items-start">
              <span class="small fw-semibold text-muted">${escHtml(task.title)}</span>
              <span class="badge ${isCompleted ? 'bg-success' : 'bg-danger'} ms-2">
                ${isCompleted ? 'Completed' : 'Rejected'}
              </span>
            </div>
            ${task.description ? `<p class="text-muted small mb-1" style="white-space:pre-wrap;">${escHtml(task.description)}</p>` : ''}
            ${task.volunteerNote ? `<p class="small mb-0"><i class="bi bi-chat-left-text me-1 text-muted"></i>${escHtml(task.volunteerNote)}</p>` : ''}
            <p class="text-muted small mb-0 mt-1">
              ${isCompleted ? 'Completed' : 'Rejected'} ${escHtml(task.completedAtLabel || '')}
            </p>
          </div>
        </div>`;
    }).join('');
    container.insertAdjacentHTML('beforeend', `
      <div class="mt-4">
        <h6 class="text-muted fw-semibold mb-2">
          <i class="bi bi-clock-history me-1"></i>Resolved Tasks
        </h6>
        ${historyHtml}
      </div>
    `);
  }

  async function renderVolunteerTasks() {
    const container = document.getElementById('volTasksList');
    if (!container) return;
    const tasks = await Auth.getMyAssignedTasks();
    if (!tasks.length) {
      container.innerHTML = emptyState('bi-clipboard', 'No tasks have been assigned to you yet.');
      await renderVolunteerTaskHistory();
      return;
    }
    container.innerHTML = tasks.map((task) => {
      const badge = VOL_TASK_STATUS_BADGE[task.status] || 'bg-secondary';
      const label = VOL_TASK_STATUS_LABEL[task.status] || task.status;
      const canStart = task.status === 'ASSIGNED';
      const canResolve = task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS';
      return `<div class="card shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <span class="fw-semibold">${escHtml(task.title)}</span>
            <span class="badge ${badge} ms-2">${escHtml(label)}</span>
          </div>
          <p class="text-muted small mb-2">Assigned ${escHtml(task.assignedAtLabel || '')}</p>
          ${task.description ? `<p class="small mb-2" style="white-space:pre-wrap;">${escHtml(task.description)}</p>` : ''}
          ${(() => {
            const items = task.checklistItems || [];
            if (!items.length) return '';
            return `<ul class="list-unstyled mb-3 mt-1">
              ${items.map((item) => `
                <li class="d-flex align-items-start gap-2 mb-1">
                  <input class="form-check-input mt-1 js-cli-toggle flex-shrink-0" type="checkbox"
                         ${item.done ? 'checked' : ''}
                         data-task-id="${escHtml(task.id)}" data-item-id="${escHtml(item.id)}">
                  <span class="small ${item.done ? 'text-decoration-line-through text-muted' : ''}">${escHtml(item.text)}</span>
                </li>`).join('')}
            </ul>`;
          })()}
          <div class="d-flex gap-2">
            ${canStart ? `<button class="btn btn-warning btn-sm js-task-start" data-task-id="${escHtml(task.id)}"><i class="bi bi-play-circle me-1"></i>Start Working</button>` : ''}
            ${canResolve ? `<button class="btn btn-outline-primary btn-sm js-task-resolve" data-task-id="${escHtml(task.id)}" data-task-title="${escHtml(task.title)}" data-task-context="${escHtml(task.inquirySubject || task.eventTitle || 'Standalone task')}"><i class="bi bi-check-circle me-1"></i>Resolve</button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.js-task-start').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const result = await Auth.updateTaskStatus(btn.dataset.taskId, 'IN_PROGRESS');
        if (result.success) await renderVolunteerTasks();
        else btn.disabled = false;
      });
    });

    container.querySelectorAll('.js-cli-toggle').forEach((cb) => {
      cb.addEventListener('change', async () => {
        cb.disabled = true;
        await Auth.toggleChecklistItem(cb.dataset.taskId, cb.dataset.itemId);
        await renderVolunteerTasks();
      });
    });

    container.querySelectorAll('.js-task-resolve').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentResolveTaskId = btn.dataset.taskId;
        const titleEl = document.getElementById('modalResolveTaskTitle');
        const inqEl = document.getElementById('modalResolveInquiryRef');
        if (titleEl) titleEl.textContent = btn.dataset.taskTitle;
        if (inqEl) inqEl.textContent = btn.dataset.taskContext;
        const completedRadio = document.getElementById('resolveCompleted');
        if (completedRadio) completedRadio.checked = true;
        const noteEl = document.getElementById('taskResolveNote');
        if (noteEl) { noteEl.value = ''; noteEl.required = false; noteEl.classList.remove('is-invalid'); }
        const hintEl = document.getElementById('taskResolveNoteHint');
        if (hintEl) hintEl.textContent = '(optional)';
        const errEl = document.getElementById('taskResolveError');
        if (errEl) errEl.classList.add('d-none');
        const confirmBtn = document.getElementById('taskResolveConfirmBtn');
        if (confirmBtn) { confirmBtn.className = 'btn btn-success'; confirmBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Confirm'; }
        window.KindredRequiredMarkers?.sync();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('taskResolveModal')).show();
      });
    });

    await renderVolunteerTaskHistory();
  }

  // Wire radio buttons for resolution type
  document.querySelectorAll('input[name="taskResolution"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const noteEl = document.getElementById('taskResolveNote');
      const hintEl = document.getElementById('taskResolveNoteHint');
      const confirmBtn = document.getElementById('taskResolveConfirmBtn');
      if (radio.value === 'REJECTED') {
        if (noteEl) noteEl.required = true;
        if (hintEl) hintEl.textContent = '';
        if (confirmBtn) { confirmBtn.className = 'btn btn-danger'; confirmBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Reject Task'; }
      } else {
        if (noteEl) noteEl.required = false;
        if (hintEl) hintEl.textContent = '(optional)';
        if (noteEl) noteEl.classList.remove('is-invalid');
        if (confirmBtn) { confirmBtn.className = 'btn btn-success'; confirmBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Confirm'; }
      }
      window.KindredRequiredMarkers?.sync();
    });
  });

  document.getElementById('taskResolveConfirmBtn')?.addEventListener('click', async () => {
    const resolution = document.querySelector('input[name="taskResolution"]:checked')?.value || 'COMPLETED';
    const noteEl = document.getElementById('taskResolveNote');
    const errEl = document.getElementById('taskResolveError');
    if (errEl) errEl.classList.add('d-none');
    if (noteEl) noteEl.classList.remove('is-invalid');
    const note = noteEl?.value.trim() || '';
    if (resolution === 'REJECTED' && !note) {
      if (noteEl) noteEl.classList.add('is-invalid');
      return;
    }
    const result = await Auth.resolveTask(currentResolveTaskId, resolution, note);
    if (!result.success) {
      if (errEl) { errEl.textContent = result.message || 'Failed to resolve task.'; errEl.classList.remove('d-none'); }
      return;
    }
    bootstrap.Modal.getInstance(document.getElementById('taskResolveModal'))?.hide();
    await renderVolunteerTasks();
  });

  const vNewsletterSection = document.getElementById('section-v-newsletter');
  if (vNewsletterSection) {
    new MutationObserver(() => {
      if (!vNewsletterSection.classList.contains('d-none')) renderVolunteerNewsletter();
    }).observe(vNewsletterSection, { attributes: true, attributeFilter: ['class'] });
  }
  await renderVolunteerNewsletter();

  const vTasksSection = document.getElementById('section-v-tasks');
  if (vTasksSection) {
    new MutationObserver(() => {
      if (!vTasksSection.classList.contains('d-none')) renderVolunteerTasks();
    }).observe(vTasksSection, { attributes: true, attributeFilter: ['class'] });
  }

  await renderVolunteerTasks();

  // ── Volunteer notification bell ───────────────────────────────────────────
  const _vBellConfig = { notificationsSection: 'v-notifications', role: 'VOLUNTEER', eventSection: 'v-events' };
  if (document.getElementById('nav-notifications-bell')) {
    NotificationsUI.renderNavBell(_vBellConfig);
  } else {
    document.addEventListener('kindred:nav-ready', () => NotificationsUI.renderNavBell(_vBellConfig), { once: true });
  }
  const vNotifSection = document.getElementById('section-v-notifications');
  if (vNotifSection) {
    new MutationObserver(() => {
      if (!vNotifSection.classList.contains('d-none')) {
        NotificationsUI.renderInbox('v-notifications-list', _vBellConfig);
      }
    }).observe(vNotifSection, { attributes: true, attributeFilter: ['class'] });
  }
});
