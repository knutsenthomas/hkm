const currency = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' });
const months = new Intl.DateTimeFormat('nb-NO', { month: 'long', timeZone: 'UTC' });
const refreshInterval = 5 * 60 * 1000;

export function mountAccounting(section, firebaseService) {
  if (section.querySelector('form')) return;
  section.innerHTML = `
    <div class="section-header"><h2 class="section-title">Resultat</h2></div>
    <form style="display:flex;flex-wrap:wrap;align-items:end;gap:1rem">
      <label>År <input name="year" type="number" min="2000" max="2100" required></label>
      <label>Periode <select name="month"><option value="0">Årsoversikt</option></select></label>
      <button class="btn btn-primary" type="submit">Hent lagrede tall</button>
    </form>
    <p role="status" aria-live="polite"></p>
    <div data-report hidden>
      <dl style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem">
        <div><dt>Driftsinntekter</dt><dd data-amount="revenue"></dd></div>
        <div><dt>Driftskostnader</dt><dd data-amount="expenses"></dd></div>
        <div><dt>Netto finans</dt><dd data-amount="financial"></dd></div>
        <div><dt>Resultat</dt><dd data-amount="result"></dd></div>
      </dl>
      <div style="overflow-x:auto">
        <table class="admin-table">
          <caption>Resultat per konto</caption>
          <thead><tr><th scope="col">Konto</th><th scope="col">Kontonavn</th><th scope="col">Beløp</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;
  const form = section.querySelector('form');
  const year = form.elements.year;
  const month = form.elements.month;
  const button = form.querySelector('button');
  const status = section.querySelector('[role="status"]');
  const report = section.querySelector('[data-report]');
  const table = section.querySelector('tbody');
  year.value = new Intl.DateTimeFormat('nb-NO', { year: 'numeric', timeZone: 'Europe/Oslo' }).format(new Date());
  for (let m = 1; m <= 12; m++) month.add(new Option(months.format(new Date(Date.UTC(2026, m - 1, 1))), m));

  let activeRequest;
  let lastSuccess = 0;
  let lastCheck = 0;

  function isVisible() {
    return !document.hidden && section.getClientRects().length > 0;
  }

  async function refresh({ reset = false } = {}) {
    if (!isVisible() || !form.checkValidity()) return;
    if (activeRequest && !reset) return;
    activeRequest?.abort();
    const request = new AbortController();
    activeRequest = request;
    lastCheck = Date.now();
    if (reset) {
      report.hidden = true;
      table.replaceChildren();
      lastSuccess = 0;
    }
    button.disabled = true;
    status.textContent = 'Henter siste lagrede regnskapstall …';
    try {
      const period = year.value + '-' + month.value.padStart(2, '0');
      const snapshot = await firebaseService.db.collection('settings').doc('tripletex-accounting-' + period).get({ source: 'server' });
      if (!snapshot.exists) throw new Error('Ingen regnskapstall er hentet for denne perioden ennå.');
      const data = snapshot.data();
      if (request.signal.aborted) return;
      for (const field of report.querySelectorAll('[data-amount]')) {
        field.textContent = currency.format(data[field.dataset.amount]);
      }
      const rows = data.accounts.map(account => {
        const row = document.createElement('tr');
        for (const value of [account.number, account.name, currency.format(account.amount)]) {
          row.insertCell().textContent = value;
        }
        return row;
      });
      table.replaceChildren(...rows);
      report.hidden = false;
      lastSuccess = Date.parse(data.fetchedAt);
      const updated = new Date(data.fetchedAt).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' });
      const periodStatus = rows.length ? '' : 'Ingen posteringer i perioden. ';
      const through = new Date(Date.parse(data.dateTo) - 86400000).toLocaleDateString('nb-NO', { timeZone: 'UTC' });
      status.textContent = periodStatus + 'Tall til og med ' + through + ' · Kilde Tripletex · Oppdatert ' + updated + ' · Hentes daglig fra Tripletex';
    } catch (error) {
      if (request.signal.aborted) return;
      status.textContent = (error instanceof TypeError ? 'Kunne ikke nå regnskapstjenesten.' : error.message) +
        (report.hidden ? '' : ' Viser sist hentede tall fra ' + new Date(lastSuccess).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' }) + '.');
    } finally {
      if (activeRequest === request) {
        activeRequest = undefined;
        button.disabled = false;
      }
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    refresh();
  });
  form.addEventListener('change', () => refresh({ reset: true }));
  const refreshIfDue = () => {
    if (Date.now() - lastCheck >= refreshInterval) refresh();
  };
  new MutationObserver(refreshIfDue).observe(section, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  document.addEventListener('visibilitychange', refreshIfDue);
  setInterval(refreshIfDue, refreshInterval);
  requestAnimationFrame(refreshIfDue);
}
