/**
 * participant.js — Participant portal module
 * Renders event and job discovery cards for PARTICIPANT-role users.
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

  // ── Job card builder ───────────────────────────────────────────────────────

  function buildJobCard(job, compact = false) {
    return `
      <div class="col">
        <div class="portal-card portal-card--job h-100">
          <div class="portal-card-header d-flex align-items-start justify-content-between gap-2">
            <div class="portal-card-title">${escHtml(job.title)}</div>
            ${jobTypeBadge(job.jobType)}
          </div>
          <div class="portal-card-meta">
            <span><i class="bi bi-building me-1"></i>${escHtml(job.employer)}</span>
            ${job.location ? `<span><i class="bi bi-geo-alt me-1"></i>${escHtml(job.location)}</span>` : ''}
            ${job.salary  ? `<span><i class="bi bi-currency-dollar me-1"></i>${escHtml(job.salary)}</span>` : ''}
          </div>
          ${!compact ? `<div class="portal-card-body">
            <p class="portal-card-accommodations">${escHtml(job.requirements)}</p>
          </div>` : ''}
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
    const [events, jobs] = await Promise.all([Auth.getEvents(), Auth.getJobs()]);

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

    // ── Jobs preview ──
    const jobsPreviewEl = document.getElementById('p-dashboard-jobs');
    if (jobsPreviewEl) {
      const recent = jobs.slice(0, 3);
      jobsPreviewEl.innerHTML = recent.length
        ? `<div class="row row-cols-1 row-cols-md-3 g-3">
            ${recent.map(j => buildJobCard(j, false)).join('')}
           </div>`
        : emptyState('bi-briefcase', 'No job opportunities posted yet. Check back soon!');
    }
  }

  // ── Render: Full Events section ────────────────────────────────────────────

  async function renderParticipantEvents() {
    const container = document.getElementById('p-events-grid');
    if (!container) return;

    const events = await Auth.getEvents();
    if (!events.length) {
      container.innerHTML = emptyState('bi-calendar-x', 'No events have been published yet. Check back soon!');
      return;
    }

    container.innerHTML = `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      ${events.map(e => buildEventCard(e, false)).join('')}
    </div>`;
  }

  // ── Render: Full Jobs section ──────────────────────────────────────────────

  async function renderParticipantJobs() {
    const container = document.getElementById('p-jobs-grid');
    if (!container) return;

    const jobs = await Auth.getJobs();
    if (!jobs.length) {
      container.innerHTML = emptyState('bi-briefcase', 'No job opportunities have been posted yet. Check back soon!');
      return;
    }

    container.innerHTML = `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      ${jobs.map(j => buildJobCard(j, false)).join('')}
    </div>`;
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  await renderDashboardHome();
  await renderParticipantEvents();
  await renderParticipantJobs();
});
