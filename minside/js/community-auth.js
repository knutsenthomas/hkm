import '../../js/firebase-config.js';

const ENDPOINT = 'https://europe-west1-his-kingdom-ministry.cloudfunctions.net/communitySso/authorize';
const CALLBACK = 'https://hkm-community-app.vercel.app/';
const params = new URLSearchParams(location.search);
const state = params.get('state'), challenge = params.get('challenge');
const valid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
const status = document.getElementById('community-status');
const retry = document.getElementById('community-retry');
const verify = document.getElementById('community-verify');
const switchAccount = document.getElementById('community-switch');

async function start() {
  if (!valid(state) || !valid(challenge)) {
    status.textContent = 'Start innloggingen fra Community. Da kan vi sende deg trygt tilbake etterpå.';
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
  const auth = firebase.auth();
  const shouldSwitch = params.get('switch') === '1';
  params.delete('switch');
  const returnPath = '/minside/community?' + params.toString();
  const login = () => location.replace('/minside/login?redirect=' + encodeURIComponent(returnPath));
  history.replaceState(null, '', returnPath);
  if (shouldSwitch) { await auth.signOut(); login(); return; }
  const user = await new Promise(resolve => {
    const stop = auth.onAuthStateChanged(value => { stop(); resolve(value); });
  });
  if (!user) { login(); return; }
  switchAccount.hidden = false;
  switchAccount.onclick = async () => { await auth.signOut(); login(); };
  retry.onclick = () => location.reload();
  verify.onclick = async () => {
    verify.disabled = true;
    try {
      await user.sendEmailVerification({ url: location.origin + returnPath });
      status.textContent = 'Bekreftelseslenken er sendt. Åpne den i e-posten din og prøv igjen.';
      retry.hidden = false;
    } catch {
      status.textContent = 'Lenken kunne ikke sendes. Vent litt og prøv igjen.';
      verify.disabled = false;
    }
  };
  if (!user.emailVerified) {
    status.textContent = 'Bekreft e-postadressen på HKM-kontoen før du åpner skolens private innhold.';
    verify.hidden = false; retry.hidden = false;
    return;
  }
  status.textContent = 'Åpner Community med HKM-kontoen din …';
  const response = await fetch(ENDPOINT, { method: 'POST', headers: {
    'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken(true),
  }, body: JSON.stringify({ challenge }) });
  const result = await response.json();
  if (!response.ok) {
    const messages = {
      'not-enrolled': 'Du er logget inn hos HKM, men skolen har ikke gitt denne kontoen tilgang til Community. Kontakt studieadministrasjonen.',
      'duplicate-registration': 'Skolen har flere registreringer med denne e-postadressen. Kontakt studieadministrasjonen.',
      'account-link-conflict': 'Kontoen må kobles av studieadministrasjonen. Ingen personlige data er flyttet.',
      'verify-email': 'Bekreft e-postadressen din og prøv igjen.',
      'invalid-session': 'Innloggingen må fornyes. Velg «Bytt HKM-konto» og logg inn på nytt.',
    };
    status.textContent = messages[result.error] || 'Community kunne ikke åpnes akkurat nå. Prøv igjen.';
    retry.hidden = false;
    return;
  }
  if (!valid(result.code)) throw new Error('Invalid authorization response');
  // Only a short-lived, single-use PKCE code travels in the fragment. Never put an identity token in a URL.
  location.replace(CALLBACK + '#/sso?' + new URLSearchParams({ code: result.code, state }));
}

start().catch(() => {
  status.textContent = 'Innloggingen kunne ikke fullføres. Prøv igjen eller gå tilbake til Community.';
  retry.hidden = false;
  retry.onclick = () => location.reload();
});
