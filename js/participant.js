/**
 * participant.js — Participant and guardian portal module
 * Handles participant self-service profile updates, participant saved content,
 * guardian linked-participant views, and guardian approvals.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const session = await Auth.getSession();
  if (!session || !['PARTICIPANT', 'GUARDIAN'].includes(session.role)) return;

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function emptyState(icon, message) {
    return `<div class="portal-empty-state"><i class="bi ${icon}"></i><p>${message}</p></div>`;
  }

  const EVENT_BADGE = {
    Social: { cls: 'badge-event-social', icon: 'bi-people-fill' },
    Educational: { cls: 'badge-event-educational', icon: 'bi-book-fill' },
    Vocational: { cls: 'badge-event-vocational', icon: 'bi-briefcase-fill' }
  };

  const JOB_TYPE_BADGE = {
    'Full-time': 'bg-success',
    'Part-time': 'bg-primary',
    Casual: 'bg-warning text-dark',
    Gig: 'bg-secondary'
  };

  function eventCategoryBadge(category) {
    const meta = EVENT_BADGE[category] || { cls: 'bg-secondary', icon: 'bi-calendar' };
    return `<span class="badge ${meta.cls}"><i class="bi ${meta.icon} me-1"></i>${escHtml(category)}</span>`;
  }

  function jobTypeBadge(type) {
    if (!type) return '';
    return `<span class="badge ${JOB_TYPE_BADGE[type] || 'bg-secondary'}">${escHtml(type)}</span>`;
  }

  function buildEventCard(event, options = {}) {
    const ts = event.eventTimestamp ?? new Date(event.dateTime).getTime();
    const isPast = !isNaN(ts) && ts < Date.now();
    const allowUnsave = Boolean(options.allowUnsave);
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
            <p class="portal-card-accommodations">${escHtml(event.accommodations || '')}</p>
          </div>
          <div class="portal-card-footer">
            <span class="portal-cost-pill"><i class="bi bi-tag me-1"></i>${escHtml(event.cost || '')}</span>
            ${allowUnsave
              ? `<button class="btn btn-outline-danger btn-sm js-participant-event-toggle" data-event-id="${escHtml(event.id)}" data-event-title="${escHtml(event.title)}">
                  <i class="bi bi-x-circle me-1"></i>Not interested
                </button>`
              : (isPast ? '<span class="portal-past-label">Past event</span>' : '')
            }
          </div>
        </div>
      </div>`;
  }

  async function renderNewsletter(containerId) {
    const container = document.getElementById(containerId);
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

  async function renderParticipantDashboard() {
    if (session.role !== 'PARTICIPANT') return;
    const participant = await Auth.getMyParticipantRecord();
    const statusEl = document.getElementById('participantProfileStatus');
    const errorEl = document.getElementById('participantProfileError');
    const sectionEl = document.getElementById('participantProfileSection');
    const selfForm = document.getElementById('participantSelfProfileForm');

    if (!participant) {
      document.getElementById('panel-PARTICIPANT')?.classList.add('d-none');
      if (sectionEl) {
        sectionEl.innerHTML = '<div class="alert alert-warning mb-0">No participant record is linked to this login yet. Ask an administrator to link your participant profile.</div>';
      }
      return;
    }

    document.getElementById('participantInterestsInput').value = participant.participantInterests.join(', ');
    document.getElementById('participantJobGoalsInput').value = participant.jobGoals || '';
    document.getElementById('participantSpecialNeedsReadonly').value = participant.specialNeeds || '';
    document.getElementById('participantMedicalReadonly').value = participant.medicalNotes || '';
    document.getElementById('participantSensoryReadonly').value = participant.sensoryNotes || '';

    if (sectionEl) {
      sectionEl.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <div class="fw-semibold">${escHtml(participant.fullName)}</div>
                <div class="text-muted small">Age ${escHtml(participant.age || '—')}</div>
                <div class="text-muted small mt-2">Linked guardians: ${escHtml(participant.guardianNames.join(', ') || 'None')}</div>
              </div>
              <div class="col-md-6">
                <div class="small"><span class="fw-semibold">Interests:</span> ${escHtml(participant.participantInterests.join(', ') || 'No interests yet')}</div>
                <div class="small mt-2"><span class="fw-semibold">Job goals:</span> ${escHtml(participant.jobGoals || 'No goals yet')}</div>
              </div>
            </div>
          </div>
        </div>`;
    }

    selfForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      statusEl?.classList.add('d-none');
      errorEl?.classList.add('d-none');
      const result = await Auth.updateMyParticipantProfile({
        participantInterests: document.getElementById('participantInterestsInput').value,
        jobGoals: document.getElementById('participantJobGoalsInput').value
      });
      if (!result.success) {
        errorEl.textContent = result.message || 'Could not update your profile.';
        errorEl.classList.remove('d-none');
        return;
      }
      statusEl.textContent = 'Your self-service profile updates have been saved.';
      statusEl.classList.remove('d-none');
      await renderParticipantDashboard();
      await renderParticipantSavedJobs();
    }, { once: true });
  }

  async function renderParticipantSavedJobs() {
    if (session.role !== 'PARTICIPANT') return;
    const savedJobsEl = document.getElementById('p-saved-jobs');
    if (!savedJobsEl) return;
    const jobs = await Auth.getJobs();
    const statuses = await Auth.getMyJobInterestStatuses();
    const interestingJobs = jobs.filter((job) => statuses[String(job.id)]);

    if (!interestingJobs.length) {
      savedJobsEl.innerHTML = `<div class="alert alert-light border text-muted mb-0">
        You have not submitted any job interests yet. Visit <a href="jobs.html">Jobs</a> to browse opportunities.
      </div>`;
      return;
    }

    savedJobsEl.innerHTML = `<div class="list-group">
      <div class="list-group-item bg-light d-flex justify-content-between align-items-center">
        <strong>Job interest history</strong>
        <span class="badge text-bg-secondary">${interestingJobs.length}</span>
      </div>
      ${interestingJobs.map((job) => {
        const status = statuses[String(job.id)];
        const badgeClass = status === 'APPROVED' ? 'text-bg-success' : (status === 'REJECTED' ? 'text-bg-danger' : 'text-bg-warning');
        return `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="fw-semibold">${escHtml(job.title)}</div>
                <div class="small text-muted">${escHtml(job.employer)}${job.location ? ` · ${escHtml(job.location)}` : ''}</div>
                <div class="mt-2"><span class="badge ${badgeClass}">${escHtml(status)}</span></div>
              </div>
              <div class="text-end">
                <div>${jobTypeBadge(job.jobType)}</div>
                <button class="btn btn-outline-danger btn-sm mt-2 js-dashboard-remove-interest" data-job-id="${escHtml(job.id)}">
                  <i class="bi bi-x-circle me-1"></i>Remove
                </button>
              </div>
            </div>
          </div>`;
      }).join('')}
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
        await renderParticipantSavedJobs();
      });
    });
  }

  async function renderParticipantEvents() {
    if (session.role !== 'PARTICIPANT') return;
    const container = document.getElementById('p-events-grid');
    if (!container) return;
    const events = await Auth.getEvents();
    const subscribedIds = new Set(await Auth.getInterestedEventIds());
    const subscribed = events.filter((event) => subscribedIds.has(String(event.id)));

    if (!subscribed.length) {
      container.innerHTML = emptyState('bi-calendar2-check', 'No subscribed events yet. Browse Events and click "I\'m Interested" to add one.');
      return;
    }

    container.innerHTML = `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
      ${subscribed.map((event) => buildEventCard(event, { allowUnsave: true })).join('')}
    </div>`;

    container.querySelectorAll('.js-participant-event-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const result = await Auth.toggleEventInterest(btn.dataset.eventId, btn.dataset.eventTitle);
        if (!result.success) {
          alert(result.message || 'Could not update event interest.');
          btn.disabled = false;
          return;
        }
        await renderParticipantEvents();
      });
    });
  }

  async function renderParticipantEventPreview() {
    if (session.role !== 'PARTICIPANT') return;
    const container = document.getElementById('p-dashboard-events');
    if (!container) return;
    const events = await Auth.getEvents();
    const upcoming = events.filter((event) => {
      const ts = event.eventTimestamp ?? new Date(event.dateTime).getTime();
      return !isNaN(ts) && ts >= Date.now();
    }).slice(0, 3);
    container.innerHTML = upcoming.length
      ? `<div class="row row-cols-1 row-cols-md-3 g-3">${upcoming.map((event) => buildEventCard(event)).join('')}</div>`
      : emptyState('bi-calendar-x', 'No upcoming events right now. Check back soon!');
  }

  function participantCard(participant) {
    return `
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <h6 class="mb-1">${escHtml(participant.fullName)}</h6>
              <div class="text-muted small">Participant login: ${escHtml(participant.participantUser?.email || 'Unlinked')}</div>
              <div class="text-muted small">Primary contact: ${escHtml(participant.contactEmail || '—')} • ${escHtml(participant.contactPhone || '—')}</div>
            </div>
            <div class="text-end small">
              <div><span class="badge text-bg-warning">${escHtml(participant.pendingApprovalCount)}</span> pending approvals</div>
              <div class="mt-1"><span class="badge text-bg-success">${escHtml(participant.approvedJobCount)}</span> approved interests</div>
            </div>
          </div>
          <hr>
          <div class="row g-3 small">
            <div class="col-md-6"><span class="fw-semibold">Support needs:</span> ${escHtml(participant.specialNeeds || '—')}</div>
            <div class="col-md-6"><span class="fw-semibold">Medical notes:</span> ${escHtml(participant.medicalNotes || '—')}</div>
            <div class="col-md-6"><span class="fw-semibold">Sensory notes:</span> ${escHtml(participant.sensoryNotes || '—')}</div>
            <div class="col-md-6"><span class="fw-semibold">Participant interests:</span> ${escHtml(participant.participantInterests.join(', ') || '—')}</div>
            <div class="col-12"><span class="fw-semibold">Guardian notes:</span> ${escHtml(participant.guardianNotes || '—')}</div>
            <div class="col-12"><span class="fw-semibold">Job goals:</span> ${escHtml(participant.jobGoals || '—')}</div>
          </div>
        </div>
      </div>`;
  }

  async function renderGuardianDashboard() {
    if (session.role !== 'GUARDIAN') return;
    const participants = await Auth.getLinkedParticipantsForCurrentUser();
    const approvals = await Auth.getPendingApprovals();
    const summary = document.getElementById('guardianDashboardSummary');
    if (summary) {
      summary.innerHTML = participants.length
        ? `
          <div class="row g-3">
            <div class="col-md-6">
              <div class="border rounded p-3 bg-light h-100">
                <div class="text-muted small text-uppercase">Linked participants</div>
                <div class="display-6 fw-semibold">${participants.length}</div>
                <div class="small text-muted">${participants.map((participant) => escHtml(participant.fullName)).join(', ')}</div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="border rounded p-3 bg-light h-100">
                <div class="text-muted small text-uppercase">Pending approvals</div>
                <div class="display-6 fw-semibold">${approvals.filter((approval) => approval.status === 'PENDING').length}</div>
                <div class="small text-muted">Vocational interests waiting for your review.</div>
              </div>
            </div>
          </div>`
        : '<div class="alert alert-warning mb-0">No participants are linked to this guardian account yet.</div>';
    }

    const participantsContainer = document.getElementById('guardianParticipantsList');
    if (participantsContainer) {
      participantsContainer.innerHTML = participants.length
        ? participants.map(participantCard).join('')
        : emptyState('bi-people', 'No participants are linked to your guardian account yet.');
    }
  }

  async function renderGuardianApprovals() {
    if (session.role !== 'GUARDIAN') return;
    const approvals = await Auth.getPendingApprovals();
    const container = document.getElementById('guardianApprovalsList');
    if (!container) return;

    if (!approvals.length) {
      container.innerHTML = emptyState('bi-shield-check', 'No approval requests are waiting for you right now.');
      return;
    }

    container.innerHTML = approvals.map((approval) => `
      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div class="fw-semibold">${escHtml(approval.participant?.fullName || 'Participant')}</div>
              <div class="text-muted small">Requested by ${escHtml(approval.requestedByUser?.name || 'participant')}</div>
              <div class="small mt-2">
                <span class="fw-semibold">Job:</span> ${escHtml(approval.job?.title || 'Unknown job')}
                <span class="text-muted">at ${escHtml(approval.job?.employer || 'Unknown employer')}</span>
              </div>
            </div>
            <span class="badge text-bg-warning">${escHtml(approval.status)}</span>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-success btn-sm js-approval-decision" data-approval-id="${escHtml(approval.id)}" data-decision="APPROVED">Approve</button>
            <button class="btn btn-outline-danger btn-sm js-approval-decision" data-approval-id="${escHtml(approval.id)}" data-decision="REJECTED">Reject</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.js-approval-decision').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const result = await Auth.decideApproval(btn.dataset.approvalId, btn.dataset.decision);
        if (!result.success) {
          alert(result.message || 'Could not update approval.');
          btn.disabled = false;
          return;
        }
        await renderGuardianApprovals();
        await renderGuardianDashboard();
      });
    });
  }

  if (session.role === 'PARTICIPANT') {
    await renderParticipantDashboard();
    await renderParticipantEventPreview();
    await renderParticipantSavedJobs();
    await renderParticipantEvents();
    await renderNewsletter('p-newsletter-content');
  }

  if (session.role === 'GUARDIAN') {
    await renderGuardianDashboard();
    await renderGuardianApprovals();
    await renderNewsletter('g-newsletter-content');
  }
});
