// Read one verified Tripletex summarize_ledger response per line from stdin.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = 'projects/his-kingdom-ministry/databases/(default)/documents';
const url = 'https://firestore.googleapis.com/v1/' + root;

function encode(value) {
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'number') return { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
}

async function accessToken() {
  const home = os.homedir();
  const { tokens } = JSON.parse(fs.readFileSync(path.join(home, '.config/configstore/firebase-tools.json'), 'utf8'));
  if (tokens.access_token && tokens.expires_at > Date.now() + 60000) return tokens.access_token;
  const cache = path.join(home, '.npm/_npx');
  const auth = fs.readdirSync(cache).map(dir => path.join(cache, dir, 'node_modules/firebase-tools/lib/auth.js')).find(file => fs.existsSync(file));
  if (!auth) throw new Error('Firebase CLI authentication module unavailable');
  const result = await require(auth).getAccessToken(tokens.refresh_token, []);
  if (!result.access_token) throw new Error('Firebase login required');
  return result.access_token;
}

function toWrite({ period, ledger }) {
  if (!/^20\d{2}-(00|0[1-9]|1[0-2])$/.test(period) || ledger.groupBy !== 'account' ||
      !Array.isArray(ledger.rows) || !Number.isFinite(ledger.totals?.amount)) {
    throw new Error('Invalid Tripletex report');
  }
  const [year, month] = period.split('-');
  const start = year + '-' + (month === '00' ? '01' : month) + '-01';
  const end = new Date(Date.UTC(Number(year), Number(month) || 12, 1)).toISOString().slice(0, 10);
  if (ledger.dateFrom !== start || !/^\d{4}-\d{2}-\d{2}$/.test(ledger.dateTo) || ledger.dateTo <= start || ledger.dateTo > end) {
    throw new Error('Tripletex report does not match the period');
  }
  let revenue = 0, expenses = 0, financial = 0;
  const seen = new Set();
  const accounts = ledger.rows.map(({ accountNumber, accountName, amount }) => {
    const number = String(accountNumber);
    if (!/^[3-8]\d{3,}$/.test(number) || seen.has(number) || typeof accountName !== 'string' || !Number.isFinite(amount)) {
      throw new Error('Invalid account in Tripletex report');
    }
    seen.add(number);
    const cents = Math.round(amount * 100);
    if (number.startsWith('3')) revenue -= cents;
    else if (number.startsWith('8')) financial -= cents;
    else expenses += cents;
    return { number, name: accountName, amount: -cents / 100 };
  });
  const result = revenue - expenses + financial;
  if (result !== -Math.round(ledger.totals.amount * 100)) throw new Error('Tripletex totals do not match account rows');
  return { update: {
    name: root + '/settings/tripletex-accounting-' + period,
    fields: encode({
      revenue: revenue / 100, expenses: expenses / 100, financial: financial / 100,
      result: result / 100, accounts, fetchedAt: new Date().toISOString(),
      dateFrom: ledger.dateFrom, dateTo: ledger.dateTo,
    }).mapValue.fields,
  } };
}

async function main() {
  const writes = fs.readFileSync(0, 'utf8').trim().split('\n').map(line => toWrite(JSON.parse(line)));
  if (writes.length > 13 || new Set(writes.map(write => write.update.name)).size !== writes.length) {
    throw new Error('Expected at most thirteen unique periods');
  }
  const token = await accessToken();
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const response = await fetch(url + ':commit', {
    method: 'POST', headers, body: JSON.stringify({ writes }), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Firebase save failed (HTTP ' + response.status + ')');
  for (const { update } of writes) {
    const checked = await fetch(url + '/' + update.name.split('/documents/')[1], {
      headers, signal: AbortSignal.timeout(10000),
    });
    if (!checked.ok || (await checked.json()).fields?.fetchedAt?.stringValue !== update.fields.fetchedAt.stringValue) {
      throw new Error('Could not verify the saved snapshot');
    }
  }
  console.log('Saved and verified ' + writes.length + ' Tripletex reports.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
