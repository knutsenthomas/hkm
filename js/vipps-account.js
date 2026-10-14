(() => {
 const english = vippsManageParams.get('lang') === 'en';
 const text = (no,en) => english ? en : no;
 const status=document.getElementById('vipps-account-status'), info=document.getElementById('vipps-account-info'), button=document.getElementById('vipps-stop');
 document.documentElement.lang=english?'en':'no';
 document.getElementById('vipps-title').textContent=text('Din Vipps-avtale','Your Vipps agreement');
 document.getElementById('vipps-account-help').textContent=text('Du kan avslutte avtalen her eller i Vipps. Ubetalt skoleavgift må fortsatt avklares med skolen.','You can cancel here or in Vipps. Any outstanding tuition must still be resolved with the school.');
 document.getElementById('vipps-contact').textContent=text('Kontakt oss','Contact us');
 button.textContent=text('Avslutt avtalen','Cancel agreement');
 async function request(action){
  const response=await fetch('https://us-central1-his-kingdom-ministry.cloudfunctions.net/manageRecurringVipps',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:vippsManageKey,token:vippsManageToken,action}),signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error('unavailable');return response.json();
 }
 function show(result){
  status.textContent=result.status==='ACTIVE'?text('Avtalen er aktiv.','Your agreement is active.'):result.status==='STOPPED'?text('Avtalen er avsluttet.','Your agreement has ended.'):text('Avtalen er ikke aktiv.','Your agreement is not active.');
  info.textContent=new Intl.NumberFormat(english?'en-GB':'nb-NO',{style:'currency',currency:'NOK'}).format(result.amount)+text(' per måned',' per month')+(result.gift?'':text(' · maksimalt 10 terminer',' · maximum 10 instalments'));
  button.hidden=result.status!=='ACTIVE';
 }
 function failure(){status.textContent=text('Vi kunne ikke hente avtalen. Åpne administrasjonslenken fra Vipps eller kontakt oss.','We could not retrieve the agreement. Open the management link from Vipps or contact us.');}
 button.addEventListener('click',async()=>{if(!confirm(text('Vil du avslutte denne Vipps-avtalen? Kommende trekk blir stoppet.','Cancel this Vipps agreement? Upcoming payments will be stopped.')))return;button.disabled=true;try{show(await request('stop'));}catch{failure();}finally{button.disabled=false;}});
 request('read').then(show).catch(failure);
})();
