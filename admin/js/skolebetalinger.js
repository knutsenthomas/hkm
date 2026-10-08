import '../../js/firebase-config.js';
if (!firebase.apps.length) firebase.initializeApp({ ...window.firebaseConfig, authDomain:'his-kingdom-ministry.firebaseapp.com' });
const status = document.getElementById('status'), refresh = document.getElementById('refresh'), year = document.getElementById('school-year'), search = document.getElementById('search');
const login = document.getElementById('finance-login');
let data = null, generation = 0, controller;
const money = value => new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(value);
const date = value => value ? new Intl.DateTimeFormat('nb-NO',{dateStyle:'medium'}).format(new Date(value)) : 'Ikke tilgjengelig';
const label = value => ({completed:'Betalt',pending:'Venter på betaling',active:'Aktiv',past_due:'Betaling mangler',unavailable:'Status må avklares',suspended:'Stanset',canceled:'Avsluttet',cancelled:'Avsluttet'}[value] || value || 'Ukjent');
function table(id,headers,rows) {
  const target = document.getElementById(id); target.replaceChildren();
  if (!rows.length) { const empty = document.createElement('p'); empty.textContent = 'Ingen registreringer i denne oversikten.'; target.append(empty); return; }
  const wrap = document.createElement('div'); wrap.className='finance-table-wrap'; const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
  headers.forEach(text=>{const th=document.createElement('th');th.textContent=text;th.scope='col';tr.append(th);});head.append(tr);table.append(head);
  const body=document.createElement('tbody');rows.forEach(row=>{const tr=document.createElement('tr');row.forEach(value=>{const td=document.createElement('td');td.textContent=String(value ?? '');tr.append(td);});body.append(tr);});table.append(body);wrap.append(table);target.append(wrap);
}
function render() {
  if (!data) return; const query=search.value.trim().toLowerCase(); const match=item=>JSON.stringify(item).toLowerCase().includes(query);
  const names=new Map(data.accounts.map(account=>[account.centralUid,account.name]));
  table('students',['Elev','E-post','Betalt skoleavgift','Gjenstår','Engangsavgift betalt','Trekkavtale / neste trekk'],data.accounts.filter(match).map(account=>[account.name,account.email,money(account.paid),money(account.remaining),money(account.registrationPaid),account.agreements.map(a=>`${a.provider} · ${label(a.status)}${a.nextDate ? ' · '+date(a.nextDate)+' · '+money(a.nextAmount) : ''}`).join('; ') || 'Ingen automatisk avtale']));
  table('plans',['Oppgitt elev','Betaler','Metode','Knyttet elevkonto','Avtalereferanse'],(data.plans || []).filter(match).map(plan=>[plan.studentName,plan.payer || plan.email,plan.provider,names.get(plan.studentUid) || 'Mangler elevkobling',plan.reference]));
  table('transactions',['Dato','Betaler','Beløp','Status','Metode','Skoleår','Elevkobling','Referanse'],data.payments.filter(match).map(payment=>[date(payment.date),payment.payer || payment.email,money(payment.amount),label(payment.status),payment.method,payment.year || 'Ukjent',names.get(payment.studentUid) || 'Ikke knyttet til valgt skoleår',payment.reference]));
  document.getElementById('limit-note').hidden=!data.limited;document.getElementById('finance-content').hidden=false;
}
async function load(user=firebase.auth().currentUser) {
  controller?.abort();controller=new AbortController();const signal=controller.signal,run=++generation;data=null;document.getElementById('finance-content').hidden=true;status.setAttribute('role','status');refresh.disabled=true;
  login.hidden=!!user;
  if(!user){status.textContent='Logg inn i HKM admin for å se skolebetalingene.';refresh.disabled=false;return;}
  status.textContent='Henter betalingsoversikt …';
  try {const response=await fetch('https://us-central1-his-kingdom-ministry.cloudfunctions.net/schoolPaymentsAdmin',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify({year:year.value}),signal});if(!response.ok)throw Error(response.status===403?'Bare aktive administratorer kan se denne oversikten.':'Betalingsoversikten kunne ikke hentes. Prøv igjen.');const result=await response.json();if(run!==generation || firebase.auth().currentUser?.uid!==user.uid)return;data=result;render();status.textContent='Oppdatert fra HKMs betalingssystem.';}catch(error){if(!signal.aborted){status.setAttribute('role','alert');status.textContent=error.message;}}finally{if(run===generation)refresh.disabled=false;}
}
firebase.auth().onAuthStateChanged(user=>load(user));refresh.addEventListener('click',()=>load());year.addEventListener('change',()=>load());search.addEventListener('input',render);

login.addEventListener('click',async()=>{login.disabled=true;try{const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await firebase.auth().signInWithPopup(provider);}catch(error){status.setAttribute('role','alert');status.textContent=error.code==='auth/popup-closed-by-user'?'Innloggingsvinduet ble lukket. Prøv igjen.':'Innloggingen kunne ikke fullføres. Prøv igjen.';}finally{login.disabled=false;}});
