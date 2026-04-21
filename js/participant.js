/**
 * participant.js — Participant and guardian portal module
 * Handles participant self-service profile updates, participant saved content,
 * guardian linked-participant views, and guardian approvals.
 */
document.addEventListener('sections:ready', async (e) => {
  const session = e.detail.session;
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

  function buildCostBreakdown(event) {
    const fee = event.programFee != null ? Number(event.programFee) : null;
    const mat = event.materialsCost != null ? Number(event.materialsCost) : null;
    const hasFee = fee !== null && fee > 0;
    const hasMat = mat !== null && mat > 0;
    const totalLabel = escHtml(event.cost || 'Free');
    let details = '';
    if (hasFee || hasMat) {
      const parts = [];
      if (hasFee) parts.push(`Program Fee: $${fee.toFixed(2)}`);
      if (hasMat) parts.push(`Materials: $${mat.toFixed(2)}`);
      details = `<span class="text-muted" style="font-size:0.75rem;"> (${parts.join(' + ')})</span>`;
    }
    return `<span class="portal-cost-pill"><i class="bi bi-tag me-1"></i>${totalLabel}${details}</span>`;
  }

  function money(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  function jobPayText(job) {
    if (job.payRate != null && Number(job.payRate) > 0) return `${money(job.payRate)}/hr`;
    if (job.salary) return job.salary;
    return 'Unpaid';
  }

  function jobCostText(job) {
    const programFee = job.programFee != null ? Number(job.programFee) : 0;
    const materialsCost = job.materialsCost != null ? Number(job.materialsCost) : 0;
    const total = programFee + materialsCost;
    return total > 0 ? money(total) : 'No listed cost';
  }

  function buildJobExpectationLine(job) {
    return `
      <div class="small mt-1">
        <span class="text-success fw-semibold"><i class="bi bi-cash-coin me-1"></i>Pay: ${escHtml(jobPayText(job))}</span>
        <span class="text-muted ms-2"><i class="bi bi-tag me-1"></i>Cost: ${escHtml(jobCostText(job))}</span>
      </div>`;
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
            ${buildCostBreakdown(event)}
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

    await renderParticipantDashboardSnapshot();

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

  async function renderParticipantDashboardSnapshot() {
    if (session.role !== 'PARTICIPANT') return;
    const el = document.getElementById('p-dashboard-snapshot');
    if (!el) return;
    const participant = await Auth.getMyParticipantRecord();
    if (!participant) {
      el.innerHTML = '';
      return;
    }
    const events = await Auth.getEvents();
    const subscribedIds = new Set(await Auth.getInterestedEventIds());
    const subscribed = events.filter((e) => subscribedIds.has(String(e.id)));
    const now = Date.now();
    const upcomingSubscribed = subscribed.filter((e) => {
      const ts = e.eventTimestamp ?? new Date(e.dateTime).getTime();
      return !isNaN(ts) && ts >= now;
    });
    const jobs = await Auth.getJobs();
    const statuses = await Auth.getMyJobInterestStatuses();
    const savedJobCount = jobs.filter((j) => statuses[String(j.id)]).length;
    const nextEvent = upcomingSubscribed
      .slice()
      .sort((a, b) => (a.eventTimestamp ?? 0) - (b.eventTimestamp ?? 0))[0];
    el.innerHTML = `
      <div class="card border-0 shadow-sm mb-0" style="background: linear-gradient(135deg, rgba(25,135,84,0.09), rgba(13,110,253,0.06));">
        <div class="card-body py-3">
          <div class="row g-3 align-items-center">
            <div class="col-md-8">
              <h6 class="fw-semibold mb-2 text-dark"><i class="bi bi-speedometer2 me-2 text-success"></i>At a glance</h6>
              <div class="d-flex flex-wrap gap-3 small">
                <div><span class="text-muted">Subscribed events</span><br><strong>${subscribed.length}</strong> total · <strong>${upcomingSubscribed.length}</strong> upcoming</div>
                <div><span class="text-muted">Job interests</span><br><strong>${savedJobCount}</strong> saved</div>
                ${nextEvent ? `<div class="flex-grow-1"><span class="text-muted">Next upcoming</span><br><strong>${escHtml(nextEvent.title)}</strong> <span class="text-muted">(${escHtml(nextEvent.dateTimeLabel || nextEvent.dateTime)})</span></div>` : '<div class="text-muted"><span class="text-muted">Next upcoming</span><br>— subscribe to events from the public Events page</div>'}
              </div>
            </div>
            <div class="col-md-4 text-md-end d-flex flex-wrap gap-2 justify-content-md-end">
              <button type="button" class="btn btn-sm btn-success" onclick="navigateTo('p-events')">Subscribed events</button>
              <a href="events.html" class="btn btn-sm btn-outline-success">Browse events</a>
              <a href="jobs.html" class="btn btn-sm btn-outline-primary">Browse jobs</a>
            </div>
          </div>
        </div>
      </div>`;
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
                ${buildJobExpectationLine(job)}
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
    await renderParticipantDashboardSnapshot();
  }

  async function renderParticipantJobApplications() {
    if (session.role !== 'PARTICIPANT') return;
    const container = document.getElementById('p-jobs-list');
    if (!container) return;

    const [jobs, statuses] = await Promise.all([Auth.getJobs(), Auth.getMyJobInterestStatuses()]);
    const myJobs = jobs.filter((job) => statuses[String(job.id)]);

    if (!myJobs.length) {
      container.innerHTML = emptyState('bi-briefcase', 'You have not registered interest in any jobs yet. Visit <a href="jobs.html">Jobs</a> to browse opportunities.');
      return;
    }

    const PIPELINE_STAGES = ['PENDING', 'APPLIED', 'INTERVIEW', 'OFFER', 'STARTED'];
    const STATUS_BADGE = {
      PENDING:   'text-bg-warning',
      APPLIED:   'text-bg-info',
      INTERVIEW: 'text-bg-primary',
      OFFER:     'text-bg-success',
      STARTED:   'text-bg-success',
      REJECTED:  'text-bg-danger',
    };

    function buildPipeline(status) {
      if (status === 'REJECTED') {
        return `<div class="small text-danger mt-2"><i class="bi bi-x-circle me-1"></i>Application rejected</div>`;
      }
      const currentIdx = PIPELINE_STAGES.indexOf(status);
      const steps = PIPELINE_STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const cls = active ? 'fw-semibold text-primary' : (done ? 'text-success' : 'text-muted');
        const icon = done ? 'bi-check-circle-fill text-success' : (active ? 'bi-circle-fill text-primary' : 'bi-circle text-muted');
        return `<span class="${cls} me-2 small"><i class="bi ${icon} me-1"></i>${stage}</span>`;
      });
      return `<div class="mt-2 d-flex flex-wrap gap-1">${steps.join('<i class="bi bi-chevron-right text-muted small me-2"></i>')}</div>`;
    }

    container.innerHTML = `<div class="list-group">
      ${myJobs.map((job) => {
        const status = statuses[String(job.id)];
        const badgeCls = STATUS_BADGE[status] || 'text-bg-secondary';
        const canRemove = status === 'PENDING';
        return `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">${escHtml(job.title)}</div>
                <div class="small text-muted">${escHtml(job.employer)}${job.location ? ` · ${escHtml(job.location)}` : ''}</div>
                ${buildJobExpectationLine(job)}
                <div class="mt-2"><span class="badge ${badgeCls}">${escHtml(status)}</span></div>
                ${buildPipeline(status)}
                ${!canRemove && status !== 'REJECTED' ? `<div class="small text-muted mt-2"><i class="bi bi-info-circle me-1"></i>Contact an admin to withdraw this application.</div>` : ''}
              </div>
              <div class="text-end flex-shrink-0">
                <div>${jobTypeBadge(job.jobType)}</div>
                ${canRemove ? `<button class="btn btn-outline-danger btn-sm mt-2 js-jobs-remove-interest" data-job-id="${escHtml(job.id)}"><i class="bi bi-x-circle me-1"></i>Remove</button>` : ''}
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;

    container.querySelectorAll('.js-jobs-remove-interest').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const result = await Auth.toggleJobInterest(btn.dataset.jobId);
        if (!result.success) {
          alert(result.message || 'Could not remove job interest.');
          btn.disabled = false;
          return;
        }
        await renderParticipantJobApplications();
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
        await renderParticipantDashboardSnapshot();
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
    await renderParticipantDashboardSnapshot();
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
            <div class="col-12">
              <div class="d-flex flex-wrap gap-2 pt-1">
                <button type="button" class="btn btn-sm btn-primary" onclick="navigateTo('g-approvals')"><i class="bi bi-shield-check me-1"></i>Review approvals</button>
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="navigateTo('g-participants')"><i class="bi bi-people-fill me-1"></i>Participant profiles</button>
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="navigateTo('g-newsletter')"><i class="bi bi-envelope-paper me-1"></i>Family newsletter</button>
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

  async function renderNotificationBanner(containerId) {
    const banner = document.getElementById(containerId);
    if (!banner) return;
    const notifications = await Auth.getMyNotifications();
    const readIds = Auth.getReadNotificationIds();
    const readSet = new Set(readIds);
    const unread = notifications.filter((n) => !readSet.has(n.id));
    if (!unread.length) { banner.classList.add('d-none'); return; }
    const count = unread.length;
    banner.className = 'alert alert-warning d-flex align-items-center justify-content-between gap-3 mb-4';
    banner.innerHTML = `
      <span>
        <i class="bi bi-bell-fill me-2"></i>
        <strong>You have ${count} new alert${count > 1 ? 's' : ''}</strong> from Kindred Administration.
      </span>
      <div class="d-flex gap-2 flex-shrink-0">
        <button type="button" class="btn btn-warning btn-sm fw-semibold js-banner-view">
          View Notifications <i class="bi bi-arrow-right ms-1"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm js-banner-dismiss">Dismiss</button>
      </div>`;
    banner.querySelector('.js-banner-view').addEventListener('click', () => navigateTo('p-notifications'));
    banner.querySelector('.js-banner-dismiss').addEventListener('click', () => banner.classList.add('d-none'));
  }

  if (session.role === 'PARTICIPANT') {
    const _pBellConfig = { notificationsSection: 'p-notifications', role: 'PARTICIPANT', eventSection: 'p-events', jobSection: 'p-jobs' };
    await renderParticipantDashboard();
    await renderParticipantEventPreview();
    await renderParticipantSavedJobs();
    await renderParticipantJobApplications();
    await renderNewsletter('p-newsletter-content');
    await renderNotificationBanner('p-notifications-banner');
    if (document.getElementById('nav-notifications-bell')) {
      await NotificationsUI.renderNavBell(_pBellConfig);
    } else {
      document.addEventListener('kindred:nav-ready', () => NotificationsUI.renderNavBell(_pBellConfig), { once: true });
    }
    const eventsSection = document.getElementById('section-p-events');
    if (eventsSection) {
      new MutationObserver(() => {
        if (!eventsSection.classList.contains('d-none')) renderParticipantEvents();
      }).observe(eventsSection, { attributes: true, attributeFilter: ['class'] });
    }
    const alertsSection = document.getElementById('section-p-notifications');
    if (alertsSection) {
      new MutationObserver(() => {
        if (!alertsSection.classList.contains('d-none')) {
          NotificationsUI.renderInbox('p-notifications-list', _pBellConfig);
        }
      }).observe(alertsSection, { attributes: true, attributeFilter: ['class'] });
    }

    // ─── My Inquiries ────────────────────────────────────────────────────────
    const INQ_STATUS_BADGE = {
      PENDING_REVIEW: 'bg-secondary',
      IN_PROGRESS: 'bg-primary',
      RESOLVED: 'bg-success',
      REJECTED: 'bg-danger'
    };
    const INQ_STATUS_LABEL = {
      PENDING_REVIEW: 'Pending Review',
      IN_PROGRESS: 'In Progress',
      RESOLVED: 'Resolved',
      REJECTED: 'Rejected'
    };

    async function renderMyInquiries() {
      const container = document.getElementById('myInquiriesList');
      if (!container) return;
      const inquiries = await Auth.getMyInquiries();
      if (!inquiries.length) {
        container.innerHTML = emptyState('bi-chat-left', 'You have not submitted any inquiries yet.');
        return;
      }
      container.innerHTML = inquiries.map((inq) => {
        const badge = INQ_STATUS_BADGE[inq.status] || 'bg-secondary';
        const label = INQ_STATUS_LABEL[inq.status] || inq.status;
        const rejectionNote = inq.status === 'REJECTED' && inq.rejectionNote
          ? `<p class="text-danger small mb-0 mt-1"><i class="bi bi-x-circle me-1"></i>${escHtml(inq.rejectionNote)}</p>`
          : '';
        return `<div class="card shadow-sm mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <span class="fw-semibold">${escHtml(inq.subject)}</span>
              <span class="badge ${badge} ms-2">${escHtml(label)}</span>
            </div>
            <p class="text-muted small mb-2">${escHtml(inq.createdAtLabel)}</p>
            <p class="small mb-0" style="white-space:pre-wrap;">${escHtml(inq.description)}</p>
            ${rejectionNote}
          </div>
        </div>`;
      }).join('');
    }

    const inquiryForm = document.getElementById('inquiryForm');
    const inquirySuccessEl = document.getElementById('inquirySuccess');
    const inquiryErrorEl = document.getElementById('inquiryError');

    inquiryForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      inquiryForm.classList.add('was-validated');
      if (inquirySuccessEl) inquirySuccessEl.classList.add('d-none');
      if (inquiryErrorEl) inquiryErrorEl.classList.add('d-none');
      if (!inquiryForm.checkValidity()) return;
      const subject = document.getElementById('inquirySubject')?.value.trim();
      const description = document.getElementById('inquiryDescription')?.value.trim();
      const result = await Auth.submitInquiry({ subject, description });
      if (!result.success) {
        if (inquiryErrorEl) { inquiryErrorEl.textContent = result.message || 'Submission failed. Please try again.'; inquiryErrorEl.classList.remove('d-none'); }
        return;
      }
      if (inquirySuccessEl) { inquirySuccessEl.textContent = 'Your inquiry has been submitted. The Kindred team will follow up with you.'; inquirySuccessEl.classList.remove('d-none'); }
      inquiryForm.reset();
      inquiryForm.classList.remove('was-validated');
      await renderMyInquiries();
    });

    const inquiriesSection = document.getElementById('section-p-inquiries');
    if (inquiriesSection) {
      new MutationObserver(() => {
        if (!inquiriesSection.classList.contains('d-none')) renderMyInquiries();
      }).observe(inquiriesSection, { attributes: true, attributeFilter: ['class'] });
    }

    await renderMyInquiries();
  }

  if (session.role === 'GUARDIAN') {
    const _gBellConfig = { notificationsSection: 'g-notifications', role: 'GUARDIAN' };
    await renderGuardianDashboard();
    await renderGuardianApprovals();
    await renderNewsletter('g-newsletter-content');
    if (document.getElementById('nav-notifications-bell')) {
      await NotificationsUI.renderNavBell(_gBellConfig);
    } else {
      document.addEventListener('kindred:nav-ready', () => NotificationsUI.renderNavBell(_gBellConfig), { once: true });
    }
    const gNotifSection = document.getElementById('section-g-notifications');
    if (gNotifSection) {
      new MutationObserver(() => {
        if (!gNotifSection.classList.contains('d-none')) {
          NotificationsUI.renderInbox('g-notifications-list', _gBellConfig);
        }
      }).observe(gNotifSection, { attributes: true, attributeFilter: ['class'] });
    }
  }
});
