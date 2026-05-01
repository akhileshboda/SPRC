/**
 * participant.js — Participant and guardian portal module
 * Handles participant self-service profile updates, participant saved content,
 * guardian linked-participant views, and guardian approvals.
 */
document.addEventListener('sections:ready', async (e) => {
  const session = e.detail.session;
  if (!session || !['PARTICIPANT', 'GUARDIAN'].includes(session.role)) return;

  const {
    escHtml,
    renderProfileHeader,
    renderInterestChips,
    linkedRowHTML,
    renderCompletenessMeter,
    calcCompleteness,
    VOLUNTEER_INTERESTS
  } = await import('./profile-ui.js');

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

  function jobMinAgeLabel(job) {
    const min = Auth.minAgeForRequirement(job.ageRequirement);
    if (min === 0) return 'All ages';
    return `${min}+`;
  }

  function buildJobExpectationLine(job) {
    return `
      <div class="small mt-1">
        <span class="text-muted"><i class="bi bi-person-bounding-box me-1"></i>Age: ${escHtml(jobMinAgeLabel(job))}</span>
        <span class="text-success fw-semibold ms-2"><i class="bi bi-cash-coin me-1"></i>Pay: ${escHtml(jobPayText(job))}</span>
        <span class="text-muted ms-2"><i class="bi bi-tag me-1"></i>Cost: ${escHtml(jobCostText(job))}</span>
      </div>`;
  }

  const participantInterestChipsEl = document.getElementById('participantInterestsChips');
  const participantInterestChips = participantInterestChipsEl
    ? renderInterestChips(participantInterestChipsEl, VOLUNTEER_INTERESTS, [], { required: true })
    : null;

  function eventMinAgeLabel(event) {
    const min = Auth.minAgeForRequirement(event.ageRequirement);
    if (min === 0) return 'All ages';
    return `${min}+`;
  }

  function buildEventCard(event, options = {}) {
    const isPast = event.hasUpcomingOccurrence === false;
    const allowUnsave = Boolean(options.allowUnsave);
    const scheduleBadge = event.eventScheduleType === 'RECURRING'
      ? '<span class="badge bg-info text-dark"><i class="bi bi-arrow-repeat me-1"></i>Recurring</span>'
      : '<span class="badge bg-light text-dark border"><i class="bi bi-calendar-event me-1"></i>One-off</span>';
    return `
      <div class="col">
        <div class="portal-card h-100${isPast ? ' portal-card--past' : ''}">
          <div class="portal-card-header d-flex align-items-start justify-content-between gap-2">
            <div class="portal-card-title">${escHtml(event.title)}</div>
            ${eventCategoryBadge(event.category)}
          </div>
          <div class="portal-card-meta">
            <span><i class="bi bi-clock me-1"></i>${escHtml(event.nextOccurrenceLabel || event.dateTimeLabel || event.dateTime)}</span>
            ${event.eventScheduleType === 'RECURRING' ? `<span><i class="bi bi-arrow-repeat me-1"></i>${escHtml(event.recurrenceSummary || 'Recurring event')}</span>` : ''}
            <span><i class="bi bi-geo-alt me-1"></i>${escHtml(event.location)}</span>
            <span><i class="bi bi-person-bounding-box me-1"></i>${escHtml(eventMinAgeLabel(event))}</span>
          </div>
          <div class="portal-card-body">
            <p class="portal-card-accommodations">${escHtml(event.accommodations || '')}</p>
          </div>
          <div class="portal-card-footer">
            ${buildCostBreakdown(event)}
            ${scheduleBadge}
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

  function renderParticipantDashboardProfileSummary(participant) {
    const container = document.getElementById('participantDashboardProfileSummary');
    if (!container) return;
    container.innerHTML = participant ? `
      <div class="row g-3 align-items-center">
        <div class="col-md-8">
          <div class="fw-semibold">${escHtml(participant.fullName)}</div>
          <div class="text-muted small">Age ${escHtml(participant.age || '—')} · Linked contacts: ${escHtml(participant.guardianNames.join(', ') || 'None')}</div>
          <div class="small mt-2"><span class="fw-semibold">Interests:</span> ${escHtml(participant.participantInterests.join(', ') || 'No interests yet')}</div>
          <div class="small mt-1"><span class="fw-semibold">Goals:</span> ${escHtml(participant.jobGoals || 'No goals added yet')}</div>
        </div>
        <div class="col-md-4 text-md-end">
          <button type="button" class="btn btn-success btn-sm" onclick="navigateTo('p-profile')">
            View / Edit Profile <i class="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
      </div>
    ` : '<div class="alert alert-warning mb-0">No participant record is linked to this login yet. Ask an administrator to link your participant profile.</div>';
  }

  function renderParticipantProfileWorkspace(participant) {
    const form = document.getElementById('participantProfileForm');
    if (!form) return;

    renderProfileHeader(document.getElementById('participantProfileHeader'), {
      name: participant.fullName,
      role: 'Participant',
      managedBy: 'Shared with guardian and admin',
      lastUpdatedMs: participant.createdAtMs
    });

    const summaryContent = document.getElementById('participantProfileSummaryContent');
    if (summaryContent) {
      summaryContent.innerHTML = `
        <div class="row g-3 align-items-center">
          <div class="col-md-8">
            <h6 class="fw-semibold mb-2 text-dark"><i class="bi bi-stars me-2 text-success"></i>Profile Snapshot</h6>
            <div class="d-flex flex-wrap gap-3 small">
              <div><span class="text-muted">Interests</span><br><strong>${escHtml(participant.participantInterests.length || 0)}</strong> selected</div>
              <div><span class="text-muted">Linked Contacts</span><br><strong>${escHtml(participant.guardianNames.length || 0)}</strong> on file</div>
              <div class="flex-grow-1"><span class="text-muted">Bio</span><br>${escHtml(participant.bio || 'Add a short introduction about yourself')}</div>
            </div>
          </div>
          <div class="col-md-4 text-md-end">
            <span class="badge text-bg-light border">${escHtml(participant.participantUser?.email || session.email)}</span>
          </div>
        </div>`;
    }

    document.getElementById('participantBioInput').value = participant.bio || '';
    document.getElementById('participantDateOfBirthInput').value = participant.dateOfBirth || '';
    document.getElementById('participantJobGoalsInput').value = participant.jobGoals || '';
    document.getElementById('participantSpecialNeedsInput').value = participant.specialNeeds || '';
    document.getElementById('participantMedicalNotesInput').value = participant.medicalNotes || '';
    document.getElementById('participantSensoryNotesInput').value = participant.sensoryNotes || '';
    participantInterestChips?.setSelected(participant.participantInterests || []);

    const contacts = document.getElementById('participantLinkedContacts');
    if (contacts) {
      contacts.innerHTML = participant.guardians.length
        ? participant.guardians.map((guardian) => linkedRowHTML({ name: guardian.name, role: guardian.email, icon: 'bi-person-heart' })).join('')
        : '<div class="text-muted small">No linked contacts yet.</div>';
    }

    const completenessEl = document.getElementById('participantCompleteness');
    if (completenessEl) {
      renderCompletenessMeter(completenessEl, calcCompleteness({
        bio: participant.bio,
        dateOfBirth: participant.dateOfBirth,
        interests: participant.participantInterests,
        jobGoals: participant.jobGoals,
        specialNeeds: participant.specialNeeds,
        contactEmail: participant.contactEmail
      }));
    }
  }

  async function renderParticipantDashboard() {
    if (session.role !== 'PARTICIPANT') return;
    const participant = await Auth.getMyParticipantRecord();
    const form = document.getElementById('participantProfileForm');

    if (!participant) {
      document.getElementById('panel-PARTICIPANT')?.classList.add('d-none');
      renderParticipantDashboardProfileSummary(null);
      form?.classList.add('d-none');
      return;
    }

    form?.classList.remove('d-none');
    renderParticipantDashboardProfileSummary(participant);
    renderParticipantProfileWorkspace(participant);
    await renderParticipantDashboardSnapshot();
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
    const upcomingSubscribed = subscribed.filter((e) => e.hasUpcomingOccurrence);
    const jobs = await Auth.getJobs();
    const statuses = await Auth.getMyJobInterestStatuses();
    const savedJobCount = jobs.filter((j) => statuses[String(j.id)]).length;
    const pendingGuardianJobs = Object.values(statuses).filter((s) => s === 'PENDING').length;
    const nextEvent = upcomingSubscribed
      .slice()
      .sort((a, b) => ((a.nextOccurrenceTimestamp ?? a.eventTimestamp) || 0) - ((b.nextOccurrenceTimestamp ?? b.eventTimestamp) || 0))[0];
    el.innerHTML = `
      <div class="card border-0 shadow-sm mb-0" style="background: linear-gradient(135deg, rgba(25,135,84,0.09), rgba(13,110,253,0.06));">
        <div class="card-body py-3">
          <div class="row g-3 align-items-center">
            <div class="col-md-8">
              <h6 class="fw-semibold mb-2 text-dark"><i class="bi bi-speedometer2 me-2 text-success"></i>At a glance</h6>
              <div class="d-flex flex-wrap gap-3 small">
                <div><span class="text-muted">Saved events</span><br><strong>${subscribed.length}</strong> total · <strong>${upcomingSubscribed.length}</strong> upcoming</div>
                <div><span class="text-muted">Job interests</span><br><strong>${savedJobCount}</strong> ${savedJobCount === 1 ? 'job pending' : 'jobs pending'}</div>
                <div><span class="text-muted">Awaiting guardian</span><br><strong>${pendingGuardianJobs}</strong> pending</div>
                ${nextEvent ? `<div class="flex-grow-1"><span class="text-muted">Next upcoming</span><br><strong>${escHtml(nextEvent.title)}</strong> <span class="text-muted">(${escHtml(nextEvent.nextOccurrenceLabel || nextEvent.dateTimeLabel || nextEvent.dateTime)})</span></div>` : '<div class="text-muted"><span class="text-muted">Next upcoming</span><br>— subscribe to events from the public Events page</div>'}
              </div>
            </div>
            <div class="col-md-4 text-md-end d-flex flex-wrap gap-2 justify-content-md-end">
              <button type="button" class="btn btn-sm btn-success" onclick="navigateTo('p-events')">My saved events</button>
              <button type="button" class="btn btn-sm text-white" style="background-color:#6f42c1;border-color:#6f42c1;" onclick="navigateTo('p-jobs')">My jobs</button>
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
        const DASH_STATUS_BADGE = {
          PENDING: 'text-bg-warning', APPLIED: 'text-bg-primary', INTERVIEW: 'text-bg-info',
          OFFER: 'text-bg-success', STARTED: 'text-bg-success', REJECTED: 'text-bg-danger', WITHDRAWN: 'text-bg-secondary', APPROVED: 'text-bg-success'
        };
        const badgeClass = DASH_STATUS_BADGE[status] || 'text-bg-secondary';
        const canLeave = status === 'PENDING' || ['APPLIED', 'INTERVIEW', 'OFFER', 'STARTED', 'APPROVED'].includes(status);
        const leaveLabel = status === 'PENDING' ? 'Cancel request' : 'Withdraw';
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
                ${canLeave && status !== 'REJECTED' && status !== 'WITHDRAWN'
        ? `<button class="btn btn-outline-danger btn-sm mt-2 js-dashboard-remove-interest" data-job-id="${escHtml(job.id)}">
                  <i class="bi bi-x-circle me-1"></i>${escHtml(leaveLabel)}
                </button>`
        : ''}
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
      APPROVED:  'text-bg-success',
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
        const canToggleOff = status === 'PENDING' || ['APPLIED', 'INTERVIEW', 'OFFER', 'STARTED', 'APPROVED'].includes(status);
        const btnLabel = status === 'PENDING' ? 'Cancel request' : 'Withdraw from job';
        return `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">${escHtml(job.title)}</div>
                <div class="small text-muted">${escHtml(job.employer)}${job.location ? ` · ${escHtml(job.location)}` : ''}</div>
                ${buildJobExpectationLine(job)}
                <div class="mt-2"><span class="badge ${badgeCls}">${escHtml(status)}</span></div>
                ${buildPipeline(status)}
              </div>
              <div class="text-end flex-shrink-0">
                <div>${jobTypeBadge(job.jobType)}</div>
                ${canToggleOff && status !== 'REJECTED' && status !== 'WITHDRAWN' ? `<button class="btn btn-outline-danger btn-sm mt-2 js-jobs-remove-interest" data-job-id="${escHtml(job.id)}"><i class="bi bi-x-circle me-1"></i>${escHtml(btnLabel)}</button>` : ''}
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
      container.innerHTML = emptyState('bi-calendar2-check', 'No saved events yet. Browse the public Events page and click "I\'m interested" to add one to your list.');
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
    const upcoming = events.filter((event) => event.hasUpcomingOccurrence).slice(0, 3);
    container.innerHTML = upcoming.length
      ? `<div class="row row-cols-1 row-cols-md-3 g-3">${upcoming.map((event) => buildEventCard(event)).join('')}</div>`
      : emptyState('bi-calendar-x', 'No upcoming events right now. Check back soon!');
    await renderParticipantDashboardSnapshot();
  }

  function participantCard(participant) {
    const participantName = participant.fullName || 'Participant';
    const linkedContacts = participant.guardians?.length
      ? participant.guardians.map((guardian) => linkedRowHTML({ name: guardian.name, role: guardian.email, icon: 'bi-person-heart' })).join('')
      : '<div class="text-muted small">No linked guardian contacts.</div>';
    const completeness = calcCompleteness({
      firstName: participant.firstName,
      lastName: participant.lastName,
      dateOfBirth: participant.dateOfBirth,
      participantInterests: participant.participantInterests,
      jobGoals: participant.jobGoals,
      specialNeeds: participant.specialNeeds,
      contactEmail: participant.contactEmail,
      contactPhone: participant.contactPhone,
      bio: participant.bio
    });

    const completenessHtml = `
      <div class="profile-completeness">
        <div class="profile-completeness-label">
          <span>Profile Completeness</span>
          <span>${completeness}%</span>
        </div>
        <div class="progress" role="progressbar"
          aria-valuenow="${completeness}" aria-valuemin="0" aria-valuemax="100"
          aria-label="Profile ${completeness}% complete">
          <div class="progress-bar" style="width: ${completeness}%"></div>
        </div>
      </div>`;

    return `
      <div class="profile-section-card guardian-participant-card">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <h3 class="profile-section-title mb-0 border-0 p-0">${escHtml(participantName)}</h3>
              <span class="badge bg-success">Participant</span>
            </div>
            <div class="guardian-participant-meta">
              <span class="guardian-participant-stat"><i class="bi bi-envelope"></i>${escHtml(participant.participantUser?.email || 'Unlinked')}</span>
              <span class="guardian-participant-stat"><i class="bi bi-telephone"></i>${escHtml(participant.contactPhone || '—')}</span>
              <span class="guardian-participant-stat"><i class="bi bi-person-lines-fill"></i>${escHtml(participant.contactEmail || '—')}</span>
            </div>
          </div>
          <div class="profile-kpi-grid flex-grow-1">
            <div class="profile-kpi-card">
              <div class="profile-kpi-label">Pending Approvals</div>
              <div class="profile-kpi-value">${escHtml(participant.pendingApprovalCount)}</div>
              <div class="profile-kpi-note">Items waiting for guardian review.</div>
            </div>
            <div class="profile-kpi-card">
              <div class="profile-kpi-label">Approved Interests</div>
              <div class="profile-kpi-value">${escHtml(participant.approvedJobCount)}</div>
              <div class="profile-kpi-note">Vocational interests already cleared.</div>
            </div>
            <div class="profile-kpi-card">
              <div class="profile-kpi-label">Profile Completeness</div>
              ${completenessHtml}
            </div>
          </div>
        </div>

        <div class="participant-guardian-edit border rounded p-3 mt-3 bg-body-tertiary" data-participant-id="${escHtml(participant.id)}">
          <h4 class="h6 mb-2">Support &amp; health notes <span class="badge bg-secondary ms-1">Editable</span></h4>
          <p class="text-muted small mb-3 mb-md-2">These fields are shared with program staff when relevant. Coordinators may also edit participant records elsewhere.</p>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label small mb-1">Support needs</label>
              <textarea class="form-control form-control-sm guardian-needs-field" rows="4" maxlength="8000"
                data-field="specialNeeds" aria-label="Support needs for ${escHtml(participantName)}"></textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Medical notes</label>
              <textarea class="form-control form-control-sm guardian-needs-field" rows="4" maxlength="8000"
                data-field="medicalNotes" placeholder="Allergies, medications… (optional)"
                aria-label="Medical notes for ${escHtml(participantName)}"></textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label small mb-1">Sensory notes</label>
              <textarea class="form-control form-control-sm guardian-needs-field" rows="4" maxlength="8000"
                data-field="sensoryNotes" placeholder="Noise, lighting, transitions… (optional)"
                aria-label="Sensory notes for ${escHtml(participantName)}"></textarea>
            </div>
            <div class="col-12">
              <label class="form-label small mb-1">Guardian / family notes</label>
              <textarea class="form-control form-control-sm guardian-needs-field" rows="2" maxlength="8000"
                data-field="guardianNotes" aria-label="Guardian notes for ${escHtml(participantName)}"></textarea>
            </div>
          </div>
          <div class="d-flex flex-wrap align-items-center gap-2 mt-3">
            <button type="button" class="btn btn-primary btn-sm js-guardian-save-support">
              <i class="bi bi-check-lg me-1"></i>Save notes
            </button>
            <span class="text-muted small js-g-support-feedback d-none" role="status" aria-live="polite"></span>
          </div>
        </div>
        <div class="profile-support-grid mt-3">
          <div class="profile-support-item">
            <strong>Participant Interests</strong>
            <span>${escHtml(participant.participantInterests.join(', ') || '—')}</span>
          </div>
          <div class="profile-support-item">
            <strong>Job Goals</strong>
            <span>${escHtml(participant.jobGoals || '—')}</span>
          </div>
        </div>

        <div class="mt-3 pt-3 border-top">
          <div class="form-check form-switch">
            <input class="form-check-input js-commenting-toggle" type="checkbox"
                   id="commentingToggle_${escHtml(participant.id)}"
                   data-participant-id="${escHtml(participant.id)}"
                   ${participant.commentingEnabled !== false ? 'checked' : ''}>
            <label class="form-check-label small text-muted" for="commentingToggle_${escHtml(participant.id)}">
              Allow <strong>${escHtml(participant.firstName || participant.fullName || 'this participant')}</strong> to comment on events
            </label>
          </div>
          <div class="js-commenting-feedback text-muted small d-none" data-participant-id="${escHtml(participant.id)}" role="status" aria-live="polite"></div>
        </div>

        <div class="profile-rail-block mt-3">
          <h4 class="profile-rail-title">Linked Contacts</h4>
          ${linkedContacts}
        </div>
      </div>`;
  }

  let guardianSupportSaveBound = false;
  let guardianCommentingToggleBound = false;

  function fillGuardianParticipantTextareas(participants) {
    const root = document.getElementById('guardianParticipantsList');
    if (!root) return;
    participants.forEach((participant) => {
      const wrap = Array.from(root.querySelectorAll('.participant-guardian-edit')).find(
        (el) => String(el.getAttribute('data-participant-id')) === String(participant.id)
      );
      if (!wrap) return;
      [['specialNeeds', participant.specialNeeds],
        ['medicalNotes', participant.medicalNotes],
        ['sensoryNotes', participant.sensoryNotes],
        ['guardianNotes', participant.guardianNotes]].forEach(([field, val]) => {
        const ta = wrap.querySelector(`textarea[data-field="${field}"]`);
        if (ta) ta.value = val || '';
      });
    });
  }

  function bindGuardianParticipantSupportSave() {
    if (guardianSupportSaveBound) return;
    const root = document.getElementById('guardianParticipantsList');
    if (!root) return;
    guardianSupportSaveBound = true;
    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('.js-guardian-save-support');
      if (!btn || !root.contains(btn)) return;
      btn.disabled = true;
      const wrap = btn.closest('.participant-guardian-edit');
      const participantId = wrap?.getAttribute('data-participant-id');
      if (!wrap || !participantId) {
        btn.disabled = false;
        return;
      }
      const read = (field) => wrap.querySelector(`textarea[data-field="${field}"]`)?.value ?? '';
      const result = await Auth.updateLinkedParticipantSupportNotes(participantId, {
        specialNeeds: read('specialNeeds'),
        medicalNotes: read('medicalNotes'),
        sensoryNotes: read('sensoryNotes'),
        guardianNotes: read('guardianNotes')
      });
      btn.disabled = false;
      const feed = wrap.querySelector('.js-g-support-feedback');
      if (!result.success) {
        if (feed) {
          feed.textContent = result.message || 'Could not save.';
          feed.classList.remove('d-none', 'text-muted', 'text-success');
          feed.classList.add('text-danger');
        } else {
          alert(result.message || 'Could not save.');
        }
        return;
      }
      if (feed) {
        feed.textContent = 'Notes saved.';
        feed.classList.remove('d-none', 'text-danger');
        feed.classList.add('text-muted', 'text-success');
        clearTimeout(feed._hideT);
        feed._hideT = setTimeout(() => feed.classList.add('d-none'), 4000);
      }
    });
  }

  function bindGuardianCommentingToggles() {
    if (guardianCommentingToggleBound) return;
    const root = document.getElementById('guardianParticipantsList');
    if (!root) return;
    guardianCommentingToggleBound = true;
    root.addEventListener('change', async (e) => {
      const toggle = e.target.closest('.js-commenting-toggle');
      if (!toggle || !root.contains(toggle)) return;
      const participantId = toggle.dataset.participantId;
      const feedback = toggle.closest('.guardian-participant-card')?.querySelector('.js-commenting-feedback');
      const previous = !toggle.checked;
      toggle.disabled = true;
      if (feedback) {
        feedback.textContent = 'Saving commenting setting...';
        feedback.classList.remove('d-none', 'text-danger', 'text-success');
        feedback.classList.add('text-muted');
      }
      const result = await Auth.setParticipantCommentingEnabled(participantId, toggle.checked);
      toggle.disabled = false;
      if (!result.success) {
        toggle.checked = previous;
        if (feedback) {
          feedback.textContent = result.message || 'Could not update commenting setting.';
          feedback.classList.remove('d-none', 'text-muted', 'text-success');
          feedback.classList.add('text-danger');
        } else {
          alert(result.message || 'Could not update commenting setting.');
        }
        return;
      }
      if (feedback) {
        feedback.textContent = toggle.checked ? 'Event commenting enabled.' : 'Event commenting restricted.';
        feedback.classList.remove('d-none', 'text-danger', 'text-muted');
        feedback.classList.add('text-success');
        clearTimeout(feedback._hideT);
        feedback._hideT = setTimeout(() => feedback.classList.add('d-none'), 4000);
      }
    });
  }

  async function renderGuardianDashboard() {
    if (session.role !== 'GUARDIAN') return;
    const participants = await Auth.getLinkedParticipantsForCurrentUser();
    const approvals = await Auth.getPendingApprovals();
    const summary = document.getElementById('guardianDashboardSummary');
    if (summary) {
      if (!participants.length) {
        summary.innerHTML = '<div class="alert alert-warning mb-0">No participants are linked to this guardian account yet.</div>';
      } else {
        const pendingCount = approvals.filter((approval) => approval.status === 'PENDING').length;
        const avgCompleteness = Math.round(participants.reduce((sum, participant) => (
          sum + calcCompleteness({
            firstName: participant.firstName,
            lastName: participant.lastName,
            dateOfBirth: participant.dateOfBirth,
            participantInterests: participant.participantInterests,
            jobGoals: participant.jobGoals,
            specialNeeds: participant.specialNeeds,
            contactEmail: participant.contactEmail,
            contactPhone: participant.contactPhone,
            bio: participant.bio
          })
        ), 0) / participants.length);

        summary.innerHTML = `
          <div class="profile-shell">
            <div class="profile-header" id="guardianDashboardHeader"></div>
            <div class="profile-grid">
              <div class="profile-main">
                <div class="profile-section-card">
                  <h3 class="profile-section-title">Guardian Overview</h3>
                  <p class="profile-summary-copy">Review your linked participants, monitor support context, and keep up with vocational approvals from one place.</p>
                  <div class="profile-kpi-grid">
                    <div class="profile-kpi-card">
                      <div class="profile-kpi-label">Linked Participants</div>
                      <div class="profile-kpi-value">${participants.length}</div>
                      <div class="profile-kpi-note">${participants.map((participant) => escHtml(participant.fullName)).join(', ')}</div>
                    </div>
                    <div class="profile-kpi-card">
                      <div class="profile-kpi-label">Pending Approvals</div>
                      <div class="profile-kpi-value">${pendingCount}</div>
                      <div class="profile-kpi-note">Vocational interests waiting for your review.</div>
                    </div>
                    <div class="profile-kpi-card">
                      <div class="profile-kpi-label">Average Completeness</div>
                      <div class="profile-kpi-value">${avgCompleteness}%</div>
                      <div class="profile-kpi-note">Across all linked participant profiles.</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="profile-rail">
                <div class="profile-rail-block">
                  <h4 class="profile-rail-title">Quick Actions</h4>
                  <div class="profile-inline-actions">
                    <button type="button" class="btn btn-sm btn-primary" onclick="navigateTo('g-approvals')"><i class="bi bi-shield-check me-1"></i>Review approvals</button>
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="navigateTo('g-participants')"><i class="bi bi-people-fill me-1"></i>Participant profiles</button>
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="navigateTo('g-newsletter')"><i class="bi bi-envelope-paper me-1"></i>Family newsletter</button>
                  </div>
                </div>
                <div class="profile-rail-block">
                  <h4 class="profile-rail-title">Linked Contacts</h4>
                  ${participants.map((participant) => linkedRowHTML({ name: participant.fullName, role: participant.contactEmail || 'Primary contact on file', icon: 'bi-person-badge' })).join('')}
                </div>
              </div>
            </div>
          </div>`;

        const guardianHeader = document.getElementById('guardianDashboardHeader');
        if (guardianHeader) {
          renderProfileHeader(guardianHeader, {
            name: session.name || 'Guardian',
            role: 'Guardian',
            managedBy: 'Family management workspace',
            lastUpdatedMs: Math.max(...participants.map((participant) => participant.createdAtMs || 0))
          });
        }
      }
    }

    const participantsContainer = document.getElementById('guardianParticipantsList');
    if (participantsContainer) {
      participantsContainer.innerHTML = participants.length
        ? participants.map(participantCard).join('')
        : emptyState('bi-people', 'No participants are linked to your guardian account yet.');
      fillGuardianParticipantTextareas(participants);
      bindGuardianCommentingToggles();
    }

    const guardianParticipantsHeader = document.getElementById('guardianParticipantsHeader');
    if (guardianParticipantsHeader) {
      renderProfileHeader(guardianParticipantsHeader, {
        name: session.name || 'Guardian',
        role: 'Guardian',
        managedBy: 'Linked participant management',
        lastUpdatedMs: Math.max(...participants.map((participant) => participant.createdAtMs || 0))
      });
    }

    const guardianParticipantsSummary = document.getElementById('guardianParticipantsSummary');
    if (guardianParticipantsSummary) {
      const pendingCount = approvals.filter((approval) => approval.status === 'PENDING').length;
      guardianParticipantsSummary.innerHTML = participants.length
        ? `
          <div class="profile-kpi-grid">
            <div class="profile-kpi-card">
              <div class="profile-kpi-label">Profiles</div>
              <div class="profile-kpi-value">${participants.length}</div>
              <div class="profile-kpi-note">Linked participant records you can review.</div>
            </div>
            <div class="profile-kpi-card">
              <div class="profile-kpi-label">Approvals</div>
              <div class="profile-kpi-value">${pendingCount}</div>
              <div class="profile-kpi-note">Items currently waiting for a decision.</div>
            </div>
          </div>
          <div class="mt-3">
            ${participants.map((participant) => linkedRowHTML({ name: participant.fullName, role: participant.participantUser?.email || participant.contactEmail || 'Participant profile', icon: 'bi-person-vcard' })).join('')}
          </div>`
        : '<div class="text-muted small">No linked participant records yet.</div>';
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
    const participantForm = document.getElementById('participantProfileForm');
    const participantStatusEl = document.getElementById('participantProfileStatus');
    const participantErrorEl = document.getElementById('participantProfileError');

    participantForm?.addEventListener('input', () => {
      participantStatusEl?.classList.add('d-none');
      participantErrorEl?.classList.add('d-none');
    });

    document.getElementById('participantProfileCancelBtn')?.addEventListener('click', async () => {
      participantForm?.classList.remove('was-validated');
      participantStatusEl?.classList.add('d-none');
      participantErrorEl?.classList.add('d-none');
      await renderParticipantDashboard();
    });

    participantForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      participantForm.classList.add('was-validated');
      const interestsValid = participantInterestChips?.validate() ?? true;
      if (!participantForm.checkValidity() || !interestsValid) return;

      const result = await Auth.updateMyParticipantProfile({
        participantInterests: participantInterestChips?.getSelected() || [],
        jobGoals: document.getElementById('participantJobGoalsInput')?.value || '',
        bio: document.getElementById('participantBioInput')?.value || '',
        dateOfBirth: document.getElementById('participantDateOfBirthInput')?.value || '',
        specialNeeds: document.getElementById('participantSpecialNeedsInput')?.value || '',
        medicalNotes: document.getElementById('participantMedicalNotesInput')?.value || '',
        sensoryNotes: document.getElementById('participantSensoryNotesInput')?.value || ''
      });

      if (!result.success) {
        if (participantErrorEl) {
          participantErrorEl.textContent = result.message || 'Could not update your profile.';
          participantErrorEl.classList.remove('d-none');
        }
        return;
      }

      if (participantStatusEl) {
        participantStatusEl.textContent = 'Your profile changes have been saved.';
        participantStatusEl.classList.remove('d-none');
      }
      await renderParticipantDashboard();
      await renderParticipantSavedJobs();
    });

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
    bindGuardianParticipantSupportSave();
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
