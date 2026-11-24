(() => {
 const langParam = vippsManageParams.get('lang');
 const lang = langParam === 'en' || langParam === 'es' ? langParam : 'no';
 const text = (no,en,es) => lang === 'en' ? en : lang === 'es' ? es : no;
 const status=document.getElementById('vipps-account-status'), info=document.getElementById('vipps-account-info'), button=document.getElementById('vipps-stop');
 document.documentElement.lang=lang;
 document.getElementById('vipps-title').textContent=text('Din Vipps-avtale','Your Vipps agreement','Tu acuerdo de Vipps');
 document.getElementById('vipps-account-help').textContent=text('Du kan avslutte avtalen her eller i Vipps. Ubetalt skoleavgift må fortsatt avklares med skolen.','You can cancel here or in Vipps. Any outstanding tuition must still be resolved with the school.','Puedes cancelar aquí o en Vipps. Las cuotas escolares pendientes deben resolverse igualmente con la escuela.');
 document.getElementById('vipps-contact').textContent=text('Kontakt oss','Contact us','Contáctanos');
 button.textContent=text('Avslutt avtalen','Cancel agreement','Cancelar el acuerdo');
 async function request(action){
  const response=await fetch('https://us-central1-his-kingdom-ministry.cloudfunctions.net/manageRecurringVipps',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:vippsManageKey,token:vippsManageToken,action}),signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error('unavailable');return response.json();
 }
 function show(result){
  status.textContent=result.status==='ACTIVE'?text('Avtalen er aktiv.','Your agreement is active.','Tu acuerdo está activo.'):result.status==='STOPPED'?text('Avtalen er avsluttet.','Your agreement has ended.','Tu acuerdo ha finalizado.'):text('Avtalen er ikke aktiv.','Your agreement is not active.','Tu acuerdo no está activo.');
  info.textContent=new Intl.NumberFormat(lang==='en'?'en-GB':lang==='es'?'es-ES':'nb-NO',{style:'currency',currency:'NOK'}).format(result.amount)+text(' per måned',' per month',' al mes')+(result.gift?'':text(' · maksimalt 10 terminer',' · maximum 10 instalments',' · máximo 10 plazos'));
  button.hidden=result.status!=='ACTIVE';
 }
 function failure(){status.textContent=text('Vi kunne ikke hente avtalen. Åpne administrasjonslenken fra Vipps eller kontakt oss.','We could not retrieve the agreement. Open the management link from Vipps or contact us.','No pudimos obtener el acuerdo. Abre el enlace de gestión de Vipps o contáctanos.');}
 button.addEventListener('click',async()=>{if(!confirm(text('Vil du avslutte denne Vipps-avtalen? Kommende trekk blir stoppet.','Cancel this Vipps agreement? Upcoming payments will be stopped.','¿Quieres cancelar este acuerdo de Vipps? Se detendrán los próximos cobros.')))return;button.disabled=true;try{show(await request('stop'));}catch{failure();}finally{button.disabled=false;}});
 request('read').then(show).catch(failure);
})();
