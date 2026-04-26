(function () {
  function isRequiredControl(control) {
    const type = String(control.getAttribute('type') || '').toLowerCase();
    return control.required && !control.disabled && type !== 'hidden';
  }

  function markerHtml() {
    const marker = document.createElement('span');
    marker.className = 'required-marker';
    marker.dataset.autoRequiredMarker = 'true';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '*';
    return marker;
  }

  function hasRequiredMarker(label) {
    if (label.querySelector('.required-marker, [data-auto-required-marker="true"]')) return true;
    return Array.from(label.querySelectorAll('.text-danger')).some((node) => node.textContent.trim() === '*');
  }

  function syncLabel(label, required) {
    const autoMarkers = label.querySelectorAll('[data-auto-required-marker="true"]');
    if (!required) {
      autoMarkers.forEach((marker) => marker.remove());
      return;
    }
    if (!hasRequiredMarker(label)) {
      label.appendChild(markerHtml());
    }
  }

  function syncRequiredMarkers(root) {
    const scope = root || document;
    const controls = scope.querySelectorAll
      ? scope.querySelectorAll('input, select, textarea')
      : [];

    controls.forEach((control) => {
      if (!control.id) return;
      const escapedId = window.CSS?.escape ? CSS.escape(control.id) : control.id.replace(/"/g, '\\"');
      const label = document.querySelector(`label[for="${escapedId}"]`);
      if (!label) return;
      syncLabel(label, isRequiredControl(control));
    });
  }

  window.KindredRequiredMarkers = { sync: syncRequiredMarkers };

  document.addEventListener('DOMContentLoaded', () => syncRequiredMarkers(document));
  document.addEventListener('sections:ready', () => syncRequiredMarkers(document));
})();
