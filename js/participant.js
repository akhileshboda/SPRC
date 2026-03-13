/**
 * participant.js — Participant portal module
 * Renders participant dashboard content and saved job interests.
 * Depends on auth.js (Auth namespace). Only active when a PARTICIPANT session exists.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.getSession();
  if (!session || session.role !== 'PARTICIPANT') return;

  // ── Utility ────────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Category / type badge helpers ──────────────────────────────────────────

  const EVENT_BADGE = {
    Social:      { cls: 'badge-event-social',      icon: 'bi-people-fill' },
    Educational: { cls: 'badge-event-educational', icon: 'bi-book-fill' },
    Vocational:  { cls: 'badge-event-vocational',  icon: 'bi-briefcase-fill' }
  };

  const JOB_TYPE_BADGE = {
    'Full-time': 'bg-success',
    'Part-time': 'bg-primary',
    'Casual':    'bg-warning text-dark',
    'Gig':       'bg-secondary'
  };

  function eventCategoryBadge(category) {
    const meta = EVENT_BADGE[category] || { cls: 'bg-secondary', icon: 'bi-calendar' };
    return `<span class="badge ${meta.cls}">
      <i class="bi ${meta.icon} me-1"></i>${escHtml(category)}
    </span>`;
  }

  function jobTypeBadge(type) {
    if (!type) return '';
    return `<span class="badge ${JOB_TYPE_BADGE[type] || 'bg-secondary'}">${escHtml(type)}</span>`;
  }

  // ── Event card builder ─────────────────────────────────────────────────────

  function buildEventCard(event, compact = false) {
    const now = Date.now();
    const ts  = event.eventTimestamp ?? new Date(event.dateTime).getTime();
    const isPast = !isNaN(ts) && ts < now;

    return `
      <div class="col">
        <div class="portal-card h-100${isPast ? ' portal-card--past' : ''}">
          <div class="portal-card-header d-flex align-items-start justify-content-between gap-2">
            <div class="portal-card-title">${escHtml(event.title)}</div>
            ${eventCategoryBadge(event.category)}
          </div>
          <div class="portal-card-meta">
            <span><i class="bi bi-clock me-1"></i>${escHtml(event.dateTimeLabel || event.dateTime)}</span>
            <span><i class="bi bi-geo-alt me-1"></i>${escHtml(event.location)}</span>
          </div>
          <div class="portal-card-body">
            ${!compact ? `<p class="portal-card-accommodations">${escHtml(event.accommodations)}</p>` : ''}
          </div>
          <div class="portal-card-footer">
            <span class="portal-cost-pill">
              <i class="bi bi-tag me-1"></i>${escHtml(event.cost)}
            </span>
            ${isPast ? '<span class="portal-past-label">Past event</span>' : ''}
          </div>
        </div>
      </div>`;
  }

  // ── Empty state helper ─────────────────────────────────────────────────────

  function emptyState(icon, message) {
    return `<div class="portal-empty-state">
      <i class="bi ${icon}"></i>
      <p>${message}</p>
    </div>`;
  }

  // ── Render: Dashboard home (compact preview) ───────────────────────────────

  async function renderDashboardHome() {
    const events = await Auth.getEvents();

    // ── Events preview ──
    const eventsPreviewEl = document.getElementById('p-dashboard-events');
    if (eventsPreviewEl) {
      const upcoming = events.filter(e => {
        const ts = e.eventTimestamp ?? new Date(e.dateTime).getTime();
        return !isNaN(ts) && ts >= Date.now();
      }).slice(0, 3);

      eventsPreviewEl.innerHTML = upcoming.length
        ? `<div class="row row-cols-1 row-cols-md-3 g-3">
            ${upcoming.map(e => buildEventCard(e, false)).join('')}
           </div>`
        : emptyState('bi-calendar-x', 'No upcoming events right now. Check back soon!');
    }

    // ── Saved jobs preview ──
    const savedJobsEl = document.getElementById('p-saved-jobs');
    if (savedJobsEl) {
      const jobs = await Auth.getJobs();
      const interestedIds = new Set(await Auth.getInterestedJobIds(session.email));
      const saved = jobs.filter((job) => interestedIds.has(String(job.id)));

      savedJobsEl.innerHTML = saved.length
        ? `<div class="list-group">
            <div class="list-group-item bg-light d-flex justify-content-between align-items-center">
              <strong>Saved jobs</strong>
              <span class="badge text-bg-secondary">${saved.length}</span>
            </div>
            ${saved.map((job) => `
              <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div class="fw-semibold">${escHtml(job.title)}</div>
                    <div class="small text-muted">${escHtml(job.employer)}${job.location ? ` · ${escHtml(job.location)}` : ''}</div>
                  </div>
                  <div class="text-end">
                    <div>${jobTypeBadge(job.jobType)}</div>
                    <button class="btn btn-outline-danger btn-sm mt-2 js-dashboard-remove-interest" data-job-id="${escHtml(job.id)}">
                      <i class="bi bi-x-circle me-1"></i>Not interested
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>`
        : `<div class="alert alert-light border text-muted mb-0">
            You have not registered interest in any jobs yet. Visit <a href="jobs.html">Jobs</a> to browse and save opportunities.
          </div>`;

      savedJobsEl.querySelectorAll('.js-dashboard-remove-interest').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const result = await Auth.toggleJobInterest(btn.dataset.jobId);
          if (!result.success) {
            alert(result.message || 'Could not update saved job.');
            btn.disabled = false;
            return;
          }
          await renderDashboardHome();
        });
      });
    }
  }

  // ── Render: Full Events section ────────────────────────────────────────────

  async function renderParticipantEvents() {
    const container = document.getElementById('p-events-grid');
    if (!container) return;

    const events = await Auth.getEvents();
    const signups = JSON.parse(localStorage.getItem('kindredSignups') || '[]');
    const normalizedEmail = String(session.email || '').trim().toLowerCase();
    const subscribedEventIds = new Set(
      signups
        .filter((s) => String(s.email || '').trim().toLowerCase() === normalizedEmail && s.eventId)
        .map((s) => String(s.eventId))
    );

    let subscribed = events.filter((event) => subscribedEventIds.has(String(event.id)));

    // Backward compatibility for older signup records that only stored title.
    if (!subscribed.length) {
      const subscribedTitles = new Set(
        signups
          .filter((s) => String(s.email || '').trim().toLowerCase() === normalizedEmail && !s.eventId)
          .map((s) => String(s.title || '').trim().toLowerCase())
      );
      subscribed = events.filter((event) => subscribedTitles.has(String(event.title || '').trim().toLowerCase()));
    }

    if (!subscribed.length) {
      container.innerHTML = emptyState('bi-calendar2-check', 'No subscribed events yet. Browse Events and click "I\'m Interested" to add one.');
      return;
    }

    container.innerHTML = `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      ${subscribed.map(e => buildEventCard(e, false)).join('')}
    </div>`;
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  await renderDashboardHome();
  await renderParticipantEvents();
});

// ── Weekly Newsletter View ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.getSession();
  if (!session || session.role !== 'PARTICIPANT') return;

  async function renderParticipantNewsletter() {
    const container = document.getElementById('p-newsletter-content');
    if (!container) return;

    const newsletters = await Auth.getNewsletters();

    if (!newsletters || newsletters.length === 0) {
      container.innerHTML = `<div class="portal-empty-state">
        <i class="bi bi-envelope"></i>
        <p>No newsletter has been sent yet. Check back soon!</p>
      </div>`;
      return;
    }

    const newsletter = newsletters[0];
    container.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-header text-white fw-semibold d-flex justify-content-between align-items-center"
             style="background-color:#4F62B0;">
          <span><i class="bi bi-envelope-paper me-2"></i>${escHtmlNl(newsletter.subject)}</span>
          <small class="opacity-75">${escHtmlNl(newsletter.weekOf)}</small>
        </div>
        <div class="card-body">
          <p class="text-muted mb-4">
            We are excited to let you know about upcoming events and opportunities.
            Please contact us if you have any questions.
          </p>
          <pre style="white-space: pre-wrap; font-family: 'Inter', system-ui, sans-serif; font-size: 0.95rem; border: none; background: none; padding: 0; margin: 0;">${escHtmlNl(newsletter.body)}</pre>
          <div class="mt-4 text-muted small border-top pt-3">
            <i class="bi bi-clock me-1"></i>Sent ${escHtmlNl(newsletter.generatedAtLabel)}
          </div>
        </div>
      </div>`;
  }

  function escHtmlNl(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  await renderParticipantNewsletter();
});
