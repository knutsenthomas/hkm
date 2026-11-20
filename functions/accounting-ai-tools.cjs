// Read-only accounting (Regnskap) for the HKM Claude connector.
// Reads the Tripletex figures the admin page shows, as stored in settings/tripletex-*.
const { z } = require('zod');

const pad = n => String(n).padStart(2, '0');
const round = n => Math.round(n * 100) / 100;

function createAccountingAiTools({ db, HttpsError }) {
  const settings = db.collection('settings');
  const read = async id => {
    const snapshot = await settings.doc(id).get();
    return snapshot.exists ? snapshot.data() : undefined;
  };
  const period = (year, month) => `${year}-${pad(month || 0)}`;
  const label = (year, month) => month
    ? new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))
    : `hele ${year}`;
  const group = number => number.startsWith('3') ? 'Driftsinntekter' : number.startsWith('8') ? 'Finansposter' : 'Driftskostnader';
  const balance = data => data ? { amount: data.balance, asOf: data.asOf, ...(data.description ? { description: data.description } : {}) } : null;

  async function getReport(account, { year, month = 0, compareWithPriorYear = true }) {
    const [data, previous, bank, prepaid] = await Promise.all([
      read(`tripletex-accounting-${period(year, month)}`),
      compareWithPriorYear ? read(`tripletex-accounting-${period(year - 1, month)}`) : undefined,
      read('tripletex-bank-balance'),
      read('tripletex-prepaid-costs')
    ]);
    if (!data) throw new HttpsError('not-found', `Ingen regnskapstall er hentet for ${label(year, month)} ennå.`);
    const prior = new Map((previous?.accounts || []).map(a => [a.number, a.amount]));
    const accounts = (data.accounts || []).map(a => ({
      number: a.number, name: a.name, group: group(a.number), amount: a.amount,
      ...(previous ? { priorYear: prior.get(a.number) ?? 0 } : {})
    })).sort((a, b) => a.number.localeCompare(b.number));
    return {
      company: 'His Kingdom Ministry', source: 'Tripletex', period: label(year, month),
      dateFrom: data.dateFrom, dateToExclusive: data.dateTo, fetchedAt: data.fetchedAt,
      totals: { revenue: data.revenue, expenses: data.expenses, financial: data.financial, result: data.result },
      ...(previous ? { priorYearTotals: { revenue: previous.revenue, expenses: previous.expenses, financial: previous.financial, result: previous.result } } : {}),
      bankBalance1920: balance(bank),
      prepaidCosts1749: balance(prepaid),
      accounts,
      note: 'Kun lesing. Tallene er siste lagrede kopi fra Tripletex, samme som på regnskapssiden i admin. Inntekter og resultat er positive tall.'
    };
  }

  async function getTrend(account, { year }) {
    const months = await Promise.all(Array.from({ length: 12 }, (_, i) => read(`tripletex-accounting-${period(year, i + 1)}`)));
    const rows = months.map((d, i) => d && { month: i + 1, label: label(year, i + 1), revenue: d.revenue, expenses: d.expenses, result: d.result })
      .filter(Boolean);
    const sum = key => round(rows.reduce((n, r) => n + (r[key] || 0), 0));
    return { year, months: rows, totals: { revenue: sum('revenue'), expenses: sum('expenses'), result: sum('result') },
      note: rows.length < 12 ? 'Viser bare måneder med lagrede tall.' : undefined };
  }

  async function getPostings(account, { year, month = 0, account: number, query, limit = 200 }) {
    const months = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);
    const docs = await Promise.all(months.map(m => read(`tripletex-postings-${year}-${pad(m)}`)));
    if (!docs.some(Boolean)) throw new HttpsError('not-found', `Ingen posteringer er hentet for ${label(year, month)} ennå.`);
    const needle = query?.trim().toLowerCase();
    const rows = docs.flatMap(d => d?.rows || [])
      .filter(r => !number || r.account === number)
      .filter(r => !needle || `${r.description} ${r.voucher}`.toLowerCase().includes(needle))
      .sort((a, b) => a.date.localeCompare(b.date) || a.voucher.localeCompare(b.voucher, 'nb', { numeric: true }));
    const missing = months.filter((m, i) => !docs[i]).map(m => label(year, m));
    return {
      period: label(year, month), ...(number ? { account: number } : {}), count: rows.length,
      sum: round(rows.reduce((n, r) => n + r.amount, 0)),
      ...(missing.length ? { monthsWithoutData: missing } : {}),
      postings: rows.slice(0, limit),
      note: 'Kun lesing. Beløp har samme fortegn som regnskapssiden (inntekter positive).'
    };
  }

  const year = z.number().int().min(2020).max(2100);
  const month = z.number().int().min(0).max(12).optional().describe('1–12 for én måned, 0 eller tom for hele året.');
  const readOnly = { readOnlyHint: true, openWorldHint: false };

  return {
    get_accounting_report: {
      description: 'Les resultatrapporten for His Kingdom Ministry (Tripletex), som på regnskapssiden i admin: driftsinntekter, driftskostnader, finans, resultat, kontoer med fjorårstall, bokført banksaldo (1920) og forskuddsbetalte kostnader (1749). Kun lesing.',
      schema: z.object({ year, month, compareWithPriorYear: z.boolean().optional() }),
      annotations: readOnly,
      handler: getReport
    },
    get_accounting_trend: {
      description: 'Inntekter, kostnader og resultat per måned for et år (som grafen «Utvikling per måned» i admin). Kun lesing.',
      schema: z.object({ year }),
      annotations: readOnly,
      handler: getTrend
    },
    get_account_postings: {
      description: 'Les posteringer fra regnskapet, filtrert på konto (f.eks. "3100"), måned eller tekst i beskrivelsen. Kun lesing.',
      schema: z.object({ year, month, account: z.string().regex(/^\d{4,}$/).optional(), query: z.string().max(200).optional(), limit: z.number().int().min(1).max(1000).optional() }),
      annotations: readOnly,
      handler: getPostings
    }
  };
}

module.exports = { createAccountingAiTools };
