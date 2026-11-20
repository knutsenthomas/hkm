const assert = require('node:assert/strict');
const { createAccountingAiTools } = require('../functions/accounting-ai-tools.cjs');
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const store = {
  'tripletex-accounting-2026-00': { revenue: 157753.13, expenses: 147345.29, financial: 0, result: 10407.84, dateFrom: '2026-01-01', dateTo: '2026-11-20', fetchedAt: '2026-11-19T20:10:45Z',
    accounts: [{ number: '6300', name: 'Leie lokale', amount: -1000 }, { number: '3100', name: 'Gaver', amount: 157753.13 }] },
  'tripletex-accounting-2025-00': { revenue: 100, expenses: 50, financial: 0, result: 50, accounts: [{ number: '3100', name: 'Gaver', amount: 100 }] },
  'tripletex-accounting-2026-08': { revenue: 90000, expenses: 85000, financial: 0, result: 5000, accounts: [] },
  'tripletex-bank-balance': { balance: 1765.67, asOf: '2026-11-19' },
  'tripletex-prepaid-costs': { balance: 10411.29, asOf: '2026-11-19', description: 'Invictus Seerkurs · bilag 85-2026' },
  'tripletex-postings-2026-08': { rows: [{ date: '2026-08-02', account: '3100', voucher: '12', description: 'Vipps gave', amount: 500 }, { date: '2026-08-01', account: '6300', voucher: '11', description: 'Husleie', amount: -1000 }] }
};
const db = { collection: () => ({ doc: id => ({ get: async () => ({ exists: id in store, data: () => store[id] }) }) }) };
const tools = createAccountingAiTools({ db, HttpsError });
(async () => {
  const report = await tools.get_accounting_report.handler({}, { year: 2026 });
  assert.equal(report.totals.result, 10407.84);
  assert.equal(report.priorYearTotals.result, 50);
  assert.equal(report.accounts[0].number, '3100');
  assert.equal(report.accounts[0].priorYear, 100);
  assert.equal(report.accounts[1].group, 'Driftskostnader');
  assert.equal(report.bankBalance1920.amount, 1765.67);
  assert.equal(report.prepaidCosts1749.amount, 10411.29);
  await assert.rejects(tools.get_accounting_report.handler({}, { year: 2026, month: 3 }), /Ingen regnskapstall/);
  const trend = await tools.get_accounting_trend.handler({}, { year: 2026 });
  assert.equal(trend.months.length, 1);
  assert.equal(trend.months[0].month, 8);
  const all = await tools.get_account_postings.handler({}, { year: 2026, month: 8 });
  assert.equal(all.postings[0].voucher, '11');
  const gifts = await tools.get_account_postings.handler({}, { year: 2026, account: '3100' });
  assert.equal(gifts.count, 1);
  assert.equal(gifts.sum, 500);
  assert.ok(gifts.monthsWithoutData.length === 11);
  for (const t of Object.values(tools)) assert.equal(t.annotations.readOnlyHint, true);
  console.log('accounting-ai-tools: ok');
})().catch(e => { console.error(e); process.exit(1); });
