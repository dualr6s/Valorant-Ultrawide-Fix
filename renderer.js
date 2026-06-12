const monitorSelect = document.getElementById('monitor-select');
const autoFitCheckbox = document.getElementById('auto-fit');
const fitButton = document.getElementById('fit-btn');
const statusEl = document.getElementById('status');

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status${type ? ` ${type}` : ''}`;
}

function formatDisplayOption(display) {
  const primaryTag = display.primary ? ' • Primary' : '';
  const { width, height } = display.bounds;
  return `${display.label}${primaryTag} — ${width}×${height}`;
}

async function loadDisplays() {
  const displays = await window.valorantFit.getDisplays();
  monitorSelect.innerHTML = '';

  displays.forEach((display) => {
    const option = document.createElement('option');
    option.value = display.id;
    option.textContent = formatDisplayOption(display);
    if (display.primary) {
      option.selected = true;
    }
    monitorSelect.appendChild(option);
  });

  if (displays.length === 0) {
    setStatus('No monitors detected.', 'error');
  }
}

function getSelectedDisplayId() {
  return Number(monitorSelect.value);
}

async function fitValorant() {
  fitButton.disabled = true;
  setStatus('Looking for Valorant...');

  try {
    const result = await window.valorantFit.fitValorant({
      displayId: getSelectedDisplayId(),
    });
    setStatus(result.message, result.success ? 'success' : 'error');
  } catch (error) {
    setStatus(error.message || 'Failed to fit Valorant window.', 'error');
  } finally {
    fitButton.disabled = false;
  }
}

async function updateAutoFit() {
  try {
    const result = await window.valorantFit.setAutoFit({
      enabled: autoFitCheckbox.checked,
      displayId: getSelectedDisplayId(),
    });

    if (autoFitCheckbox.checked) {
      setStatus(result.message, 'success');
    }
  } catch (error) {
    autoFitCheckbox.checked = false;
    setStatus(error.message || 'Failed to update auto-fit.', 'error');
  }
}

fitButton.addEventListener('click', fitValorant);
autoFitCheckbox.addEventListener('change', updateAutoFit);
monitorSelect.addEventListener('change', () => {
  if (autoFitCheckbox.checked) {
    updateAutoFit();
  }
});

loadDisplays().catch((error) => {
  setStatus(error.message || 'Failed to load monitors.', 'error');
});
