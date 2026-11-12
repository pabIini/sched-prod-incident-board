import { ack, fetchIncidents } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const status = document.querySelector('[data-testid="status"]');
const incidents = new Map();
const acked = new Set();

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTime(openedAt) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(openedAt));
}

function sortedIncidents() {
  return [...incidents.values()].sort(
    (left, right) => new Date(right.openedAt) - new Date(left.openedAt),
  );
}

function render() {
  const current = sortedIncidents();
  empty.hidden = current.length !== 0;
  list.innerHTML = current
    .map(
      (i) => `<li data-testid="incident-row" data-id="${escapeHtml(i.id)}" class="row sev${escapeHtml(i.severity)}">
        <span class="id">${escapeHtml(i.id)}</span>
        <span class="sev">${escapeHtml(i.severity)}</span>
        <span class="what">${escapeHtml(i.service)} · ${escapeHtml(i.region)} · ${escapeHtml(i.summary)}</span>
        <time datetime="${escapeHtml(i.openedAt)}">${escapeHtml(formatTime(i.openedAt))}</time>
        ${acked.has(i.id)
          ? '<span data-testid="acked" class="acked">Acked</span>'
          : `<button data-testid="ack" type="button" data-id="${escapeHtml(i.id)}">Ack</button>`}
      </li>`,
    )
    .join('');
}

function updateIncidents(page) {
  for (const incident of page.incidents) {
    incidents.set(incident.id, incident);
  }
  render();
}

async function refresh() {
  try {
    const page = await fetchIncidents();
    updateIncidents(page);
    status.textContent = '';
    loader.hidden = true;
    return true;
  } catch (error) {
    status.textContent = 'Could not refresh incidents. Retrying…';
    console.error(error);
    return false;
  }
}

list.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-testid="ack"]');
  if (!button) return;

  button.disabled = true;
  try {
    await ack(button.dataset.id);
    acked.add(button.dataset.id);
    render();
  } catch (error) {
    button.disabled = false;
    status.textContent = 'Could not acknowledge this incident. Try again.';
    console.error(error);
  }
});

await refresh();
setInterval(refresh, 2000);
