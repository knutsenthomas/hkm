import "../../css/accounting.css";

const currency = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' });
const months = new Intl.DateTimeFormat('nb-NO', { month: 'long', timeZone: 'UTC' });
const refreshInterval = 5 * 60 * 1000;

export function mountAccounting(section, firebaseService) {
  if (section.querySelector('form')) return;
  section.innerHTML = `
    <header class="accounting-heading">
      <div><h2>Resultatrapport</h2><p>His Kingdom Ministry · Tripletex</p></div>
      <span class="accounting-source">Daglig oppdatering</span>
    </header>
    <form class="accounting-toolbar">
      <label>År <input name="year" type="number" min="2000" max="2100" required></label>
      <label>Periode <select name="month"><option value="0">Årsoversikt</option></select></label>
      <button class="accounting-refresh" type="submit">Oppdater visning</button>
    </form>
    <p role="status" aria-live="polite"></p>
    <div data-report hidden>
      <dl class="accounting-summary">
        <div><dt>Driftsinntekter</dt><dd data-amount="revenue"></dd></div>
        <div><dt>Driftskostnader</dt><dd data-amount="expenses"></dd></div>
        <div><dt>Netto finans</dt><dd data-amount="financial"></dd></div>
        <div><dt>Resultat</dt><dd data-amount="result"></dd></div>
      </dl>
      <div class="accounting-table">
        <table>
          <caption>Resultat per konto</caption>
          <thead><tr><th scope="col">Konto</th><th scope="col">Kontonavn</th><th scope="col">Beløp</th></tr></thead>
          <tbody></tbody>
          <tfoot><tr><th colspan="2" scope="row">Resultat</th><td data-amount="result"></td></tr></tfoot>
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
      const groups = [
        ['Driftsinntekter', /^3/],
        ['Driftskostnader', /^[4-7]/],
        ['Finansposter', /^8/],
      ];
      const rows = [];
      for (const [title, prefix] of groups) {
        const accounts = data.accounts.filter(account => prefix.test(account.number));
        if (!accounts.length) continue;
        const heading = document.createElement('tr');
        heading.className = 'accounting-group';
        const label = document.createElement('th');
        label.colSpan = 2;
        label.textContent = title;
        heading.append(label);
        heading.insertCell().textContent = currency.format(accounts.reduce((sum, account) => sum + account.amount, 0));
        rows.push(heading);
        for (const account of accounts) {
          const row = document.createElement('tr');
          for (const value of [account.number, account.name, currency.format(account.amount)]) {
            row.insertCell().textContent = value;
          }
          rows.push(row);
        }
      }
      table.replaceChildren(...rows);
      report.hidden = false;
      lastSuccess = Date.parse(data.fetchedAt);
      const updated = new Date(data.fetchedAt).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' });
      const periodStatus = rows.length ? '' : 'Ingen posteringer i perioden. ';
      const through = new Date(Date.parse(data.dateTo) - 86400000).toLocaleDateString('nb-NO', { timeZone: 'UTC' });
      status.textContent = periodStatus + 'Tall til og med ' + through + ' · Oppdatert ' + updated;
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
