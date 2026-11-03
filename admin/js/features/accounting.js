import "../../css/accounting.css";

const currency = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' });
const months = new Intl.DateTimeFormat('nb-NO', { month: 'long', timeZone: 'UTC' });
const refreshInterval = 5 * 60 * 1000;

async function renderTrend(container, settings, year, month, data, signal) {
  container.replaceChildren();
  const endMonth = Number(month) || new Date(Date.parse(data.dateTo) - 86400000).getUTCMonth() + 1;
  const snapshots = await Promise.allSettled(Array.from({ length: endMonth }, (_, index) =>
    settings.doc('tripletex-accounting-' + year + '-' + String(index + 1).padStart(2, '0')).get({ source: 'server' })
  ));
  if (signal.aborted) return;
  const points = snapshots.map((snapshot, index) => ({
    label: months.format(new Date(Date.UTC(2026, index, 1))),
    report: snapshot.status === 'fulfilled' ? snapshot.value.data() : undefined,
  })).filter(point => point.report);
  const series = [['revenue', 'Inntekter'], ['expenses', 'Kostnader'], ['result', 'Resultat']];
  const values = points.flatMap(({ report }) => series.map(([key]) => report[key]));
  const high = Math.max(1, ...values);
  const low = Math.min(0, ...values);
  const range = high - low;
  const zero = high / range * 100;
  const fragment = document.createDocumentFragment();
  if (points.length) {
    const legend = document.createElement('div');
    legend.className = 'accounting-chart-legend';
    for (const [key, title] of series) {
      const item = document.createElement('span');
      item.dataset.series = key;
      item.textContent = title;
      legend.append(item);
    }
    const viewport = document.createElement('div');
    viewport.className = 'accounting-chart-viewport';
    const plot = document.createElement('div');
    plot.className = 'accounting-chart-plot';
    plot.style.setProperty('--months', points.length);
    plot.style.setProperty('--zero', zero + '%');
    const detail = document.createElement('div');
    detail.className = 'accounting-chart-detail';
    detail.setAttribute('aria-live', 'polite');

    const buttons = points.map(({ label, report }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', label);
      const bars = document.createElement('span');
      bars.className = 'accounting-chart-bars';
      bars.setAttribute('aria-hidden', 'true');
      for (const [key] of series) {
        const value = report[key];
        const bar = document.createElement('span');
        bar.dataset.series = key;
        bar.style.height = Math.abs(value) / range * 100 + '%';
        bar.style.top = (high - Math.max(0, value)) / range * 100 + '%';
        bars.append(bar);
      }
      const name = document.createElement('span');
      name.className = 'accounting-chart-month';
      name.textContent = label.slice(0, 3);
      button.append(bars, name);
      button.addEventListener('click', () => select(button, label, report));
      plot.append(button);
      return button;
    });

    function select(button, label, report) {
      for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
      const heading = document.createElement('strong');
      heading.textContent = label;
      const metrics = series.map(([key, title]) => {
        const metric = document.createElement('span');
        metric.textContent = title + ' ';
        const amount = document.createElement('b');
        amount.textContent = currency.format(report[key]);
        metric.append(amount);
        return metric;
      });
      detail.replaceChildren(heading, ...metrics);
    }

    const last = points.at(-1);
    select(buttons.at(-1), last.label, last.report);
    viewport.append(plot);
    fragment.append(legend, viewport, detail);
  }
  if (points.length < endMonth) {
    const note = document.createElement('p');
    note.textContent = points.length ? 'Viser måneder med lagrede tall.' : 'Ingen månedstall tilgjengelig.';
    fragment.append(note);
  }
  container.replaceChildren(fragment);
}

async function showAccount(dialog, settings, account, report) {
  const heading = dialog.querySelector('h3');
  const status = dialog.querySelector('[data-posting-status]');
  const body = dialog.querySelector('tbody');
  const request = Symbol();
  dialog.postingRequest = request;
  heading.textContent = account.number + ' ' + account.name;
  body.replaceChildren();
  status.textContent = 'Henter posteringer …';
  if (!dialog.open) dialog.showModal();

  const date = new Date(report.dateFrom + 'T00:00:00Z');
  const months = [];
  while (date.toISOString().slice(0, 10) < report.dateTo) {
    months.push(date.toISOString().slice(0, 7));
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  const reports = await Promise.allSettled(months.map(month =>
    settings.doc('tripletex-postings-' + month).get({ source: 'server' })
  ));
  if (dialog.postingRequest !== request || !dialog.open) return;
  const complete = reports.every((item, index) => item.status === 'fulfilled' && item.value.exists &&
    item.value.data().dateTo >= (months[index + 1] ? months[index + 1] + '-01' : report.dateTo));
  const rows = reports.flatMap(item => item.status === 'fulfilled' ? item.value.data()?.rows || [] : [])
    .filter(row => row.account === account.number && row.date >= report.dateFrom && row.date < report.dateTo)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.voucher) - Number(b.voucher));
  for (const row of rows) {
    const tr = body.insertRow();
    for (const value of [row.date.split('-').reverse().join('.'), row.voucher || '–', row.description, currency.format(row.amount)]) {
      tr.insertCell().textContent = value;
    }
  }
  const message = rows.length ? rows.length + ' posteringer' : 'Ingen posteringer funnet';
  status.textContent = complete ? message : message + ' · Det mangler bilagslinjer for deler av perioden.';
}

export function mountAccounting(section, firebaseService) {
  if (section.querySelector('form')) return;
  section.innerHTML = `
    <header class="accounting-heading">
      <div><h2>Resultatrapport</h2><p>His Kingdom Ministry · Tripletex</p></div>
      <details class="accounting-period">
        <summary><span data-period-label>Årsoversikt</span><span class="material-symbols-outlined accounting-period-chevron" aria-hidden="true">expand_more</span></summary>
        <form class="accounting-toolbar">
          <label>År <input name="year" type="number" min="2000" max="2100" required></label>
          <label>Periode <select name="month"><option value="0">Årsoversikt</option></select></label>
          <button class="accounting-refresh" type="submit">Oppdater visning</button>
        </form>
      </details>
    </header>
    <p role="status" aria-live="polite"></p>
    <dl class="accounting-summary accounting-bank" hidden>
      <div><dt>Bokført banksaldo · konto 1920</dt><dd data-bank-balance></dd>
        <small data-bank-date></small></div>
      <div data-prepaid-card hidden><dt>Forskuddsbetalte kostnader</dt>
        <dd data-prepaid-balance></dd><small data-prepaid-date></small>
        <div class="accounting-prepaid-detail" hidden>
          <strong data-prepaid-description></strong><small data-prepaid-reference></small>
        </div>
        <p>Betalt på forskudd. Kostnadsføres i perioden det gjelder.</p>
      </div>
    </dl>
    <div data-report hidden>
      <dl class="accounting-summary">
        <div><dt>Driftsinntekter</dt><dd data-amount="revenue"></dd></div>
        <div><dt>Driftskostnader</dt><dd data-amount="expenses"></dd></div>
        <div><dt>Netto finans</dt><dd data-amount="financial"></dd></div>
        <div><dt>Resultat</dt><dd data-amount="result"></dd></div>
      </dl>
      <section class="accounting-chart" aria-label="Utvikling per måned">
        <h3>Utvikling per måned</h3>
        <div data-trend></div>
      </section>
      <div class="accounting-table accounting-comparison">
        <table>
          <caption>Resultat per konto</caption>
          <thead><tr><th scope="col">Konto</th><th scope="col">Kontonavn</th><th scope="col" data-current-year>Beløp</th><th scope="col" data-prior-year>Fjoråret</th></tr></thead>
          <tbody></tbody>
          <tfoot><tr><th colspan="2" scope="row">Resultat</th><td data-amount="result"></td><td data-prior-result></td></tr></tfoot>
        </table>
      </div>
    </div>
    <dialog class="accounting-postings" aria-labelledby="accounting-postings-title">
      <div class="accounting-heading"><h3 id="accounting-postings-title"></h3>
      <form method="dialog"><button type="submit">Lukk</button></form></div>
      <p data-posting-status role="status"></p>
      <div class="accounting-table"><table>
        <thead><tr><th>Dato</th><th>Bilag</th><th>Tekst</th><th>Beløp</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </dialog>`;
  const form = section.querySelector('form');
  const year = form.elements.year;
  const month = form.elements.month;
  const button = form.querySelector('button');
  const status = section.querySelector('[role="status"]');
  const report = section.querySelector('[data-report]');
  const table = section.querySelector('[data-report] tbody');
  const dialog = section.querySelector('dialog');
  year.value = new Intl.DateTimeFormat('nb-NO', { year: 'numeric', timeZone: 'Europe/Oslo' }).format(new Date());
  for (let m = 1; m <= 12; m++) month.add(new Option(months.format(new Date(Date.UTC(2026, m - 1, 1))), m));

  const periodPicker = section.querySelector('.accounting-period');
  const periodLabel = periodPicker.querySelector('[data-period-label]');
  const updatePeriodLabel = () => {
    periodLabel.textContent = month.selectedOptions[0].textContent + ' · ' + year.value;
  };
  updatePeriodLabel();
  document.addEventListener('click', event => {
    if (periodPicker.open && !periodPicker.contains(event.target)) periodPicker.open = false;
  });
  periodPicker.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !periodPicker.open) return;
    periodPicker.open = false;
    periodPicker.querySelector('summary').focus();
  });

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
      const settings = firebaseService.db.collection('settings');
      const [snapshot, bank, prepaid] = await Promise.all([
        settings.doc('tripletex-accounting-' + period).get({ source: 'server' }),
        settings.doc('tripletex-bank-balance').get({ source: 'server' }).then(doc => doc.data(), () => undefined),
        settings.doc('tripletex-prepaid-costs').get({ source: 'server' }).then(doc => doc.data(), () => undefined),
      ]);
      if (request.signal.aborted) return;
      const bankCard = section.querySelector('.accounting-bank');
      bankCard.hidden = !bank && !prepaid;
      bankCard.querySelector('[data-bank-balance]').closest('div').hidden = !bank;
      bankCard.querySelector('[data-prepaid-card]').hidden = !prepaid;
      if (prepaid) {
        const description = bankCard.querySelector('[data-prepaid-description]');
        const [title, ...reference] = (prepaid.description || '').split(' · ');
        description.textContent = title;
        description.parentElement.hidden = !title;
        const referenceLabel = bankCard.querySelector('[data-prepaid-reference]');
        referenceLabel.textContent = reference.join(' · ');
        referenceLabel.hidden = !reference.length;
        bankCard.querySelector('[data-prepaid-balance]').textContent = currency.format(prepaid.balance);
        bankCard.querySelector('[data-prepaid-date]').textContent = 'Konto 1749 · Tripletex · ' + prepaid.asOf.split('-').reverse().join('.');
      }
      if (bank) {
        bankCard.querySelector('[data-bank-balance]').textContent = currency.format(bank.balance);
        const date = bank.asOf.split('-').reverse().join('.');
        bankCard.querySelector('[data-bank-date]').textContent = 'Per ' + date + ' · Tripletex';
      }
      if (!snapshot.exists) throw new Error('Ingen regnskapstall er hentet for denne perioden ennå.');
      const data = snapshot.data();
      const priorYear = Number(period.slice(0, 4)) - 1;
      const priorPeriod = priorYear + period.slice(4);
      const previous = await settings.doc('tripletex-accounting-' + priorPeriod)
        .get({ source: 'server' }).then(doc => doc.data(), () => undefined);
      const previousAccounts = new Map((previous?.accounts || []).map(account => [account.number, account]));
      const priorAmount = amount => previous ? currency.format(amount ?? 0) : '–';
      if (request.signal.aborted) return;
      report.querySelector('[data-current-year]').textContent = period.slice(0, 4);
      report.querySelector('[data-prior-year]').textContent = priorYear + (period.endsWith('-00') ? ' · hele året' : '');
      report.querySelector('[data-prior-result]').textContent = priorAmount(previous?.result);
      for (const field of report.querySelectorAll('[data-amount]')) {
        field.textContent = currency.format(data[field.dataset.amount]);
      }
      const groups = [
        ['Driftsinntekter', /^3/],
        ['Driftskostnader', /^[4-7]/],
        ['Finansposter', /^8/],
      ];
      const rows = [];
      const currentAccounts = new Map(data.accounts.map(account => [account.number, account]));
      const accountsByNumber = [...new Map([...previousAccounts, ...currentAccounts]).values()]
        .sort((a, b) => a.number.localeCompare(b.number));
      for (const [title, prefix] of groups) {
        const accounts = accountsByNumber.filter(account => prefix.test(account.number));
        if (!accounts.length) continue;
        const heading = document.createElement('tr');
        heading.className = 'accounting-group';
        const label = document.createElement('th');
        label.colSpan = 2;
        label.textContent = title;
        heading.append(label);
        heading.insertCell().textContent = currency.format(accounts.reduce((sum, account) => sum + (currentAccounts.get(account.number)?.amount ?? 0), 0));
        heading.insertCell().textContent = priorAmount(accounts.reduce((sum, account) => sum + (previousAccounts.get(account.number)?.amount ?? 0), 0));
        rows.push(heading);
        for (const account of accounts) {
          const row = document.createElement('tr');
          row.insertCell().textContent = account.number;
          const link = document.createElement('button');
          link.type = 'button';
          link.className = 'accounting-account-link';
          link.textContent = account.name;
          link.addEventListener('click', () => showAccount(dialog, settings, account, currentAccounts.has(account.number) ? data : previous));
          row.insertCell().append(link);
          row.insertCell().textContent = currency.format(currentAccounts.get(account.number)?.amount ?? 0);
          row.insertCell().textContent = priorAmount(previousAccounts.get(account.number)?.amount);
          rows.push(row);
        }
      }
      table.replaceChildren(...rows);
      report.hidden = false;
      await renderTrend(section.querySelector('[data-trend]'), settings, year.value, month.value, data, request.signal);
      if (request.signal.aborted) return;
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
    periodPicker.open = false;
    periodPicker.querySelector("summary").focus();
    refresh();
  });
  form.addEventListener('change', () => {
    if (!form.checkValidity()) return;
    updatePeriodLabel();
    refresh({ reset: true });
  });
  const refreshIfDue = () => {
    if (Date.now() - lastCheck >= refreshInterval) refresh();
  };
  new MutationObserver(refreshIfDue).observe(section, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  document.addEventListener('visibilitychange', refreshIfDue);
  setInterval(refreshIfDue, refreshInterval);
  requestAnimationFrame(refreshIfDue);
}
