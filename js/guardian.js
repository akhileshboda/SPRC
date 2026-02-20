document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('guardianForm');
  if (!form) return;

  // Load existing data into the form when the page opens
  const participant = await Auth.getGuardianParticipant();
  if (participant) {
    document.getElementById('guardianInterests').value = participant.interests || '';
    document.getElementById('guardianCapabilities').value = participant.capabilities || '';
    document.getElementById('guardianHealthConcerns').value = participant.healthConcerns || '';
  }

  // Save when the guardian hits the button
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    const errorEl = document.getElementById('guardianError');
    const successEl = document.getElementById('guardianSuccess');
    errorEl.classList.add('d-none');
    successEl.classList.add('d-none');

    const result = await Auth.updateGuardianParticipant({
      interests: document.getElementById('guardianInterests').value,
      capabilities: document.getElementById('guardianCapabilities').value,
      healthConcerns: document.getElementById('guardianHealthConcerns').value
    });

    if (result.success) {
      successEl.classList.remove('d-none');
    } else {
      errorEl.textContent = result.message;
      errorEl.classList.remove('d-none');
    }
  });
});