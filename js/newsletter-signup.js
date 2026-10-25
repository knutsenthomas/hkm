import './newsletter-signup.css';
const COPY = {
    no: { open:'Meld deg på nyhetsbrevet', title:'Hold deg oppdatert', intro:'Få nyheter om arrangementer, undervisning og arbeidet i His Kingdom Ministry.', name:'Navn (valgfritt)', email:'E-postadresse', language:'Språk på nyhetsbrevet', consent:'Ja, jeg ønsker nyhetsbrev fra His Kingdom Ministry. Jeg kan melde meg av når som helst.', submit:'Meld meg på', sending:'Lagrer påmeldingen …', success:'Takk! Påmeldingen din er lagret.', error:'Påmeldingen kunne ikke lagres. Prøv igjen om litt.', close:'Lukk', privacy:'Personvern', privacyUrl:'/personvern' },
    en: { open:'Subscribe to our newsletter', title:'Stay connected', intro:'Receive news about events, teaching and the work of His Kingdom Ministry.', name:'Name (optional)', email:'Email address', language:'Newsletter language', consent:'Yes, I would like newsletters from His Kingdom Ministry. I can unsubscribe at any time.', submit:'Subscribe', sending:'Saving your subscription …', success:'Thank you! Your subscription has been saved.', error:'We could not save your subscription. Please try again shortly.', close:'Close', privacy:'Privacy policy', privacyUrl:'/en/privacy' },
    es: { open:'Suscríbete al boletín', title:'Mantente al día', intro:'Recibe noticias sobre eventos, enseñanzas y el trabajo de His Kingdom Ministry.', name:'Nombre (opcional)', email:'Correo electrónico', language:'Idioma del boletín', consent:'Sí, quiero recibir el boletín de His Kingdom Ministry. Puedo darme de baja en cualquier momento.', submit:'Suscribirme', sending:'Guardando la suscripción …', success:'¡Gracias! Tu suscripción se ha guardado.', error:'No se pudo guardar tu suscripción. Inténtalo de nuevo más tarde.', close:'Cerrar', privacy:'Privacidad', privacyUrl:'/es/privacidad' }
};
export function mountNewsletterSignup(language = 'no') {
    if (document.getElementById('hkm-newsletter-signup')) return;
    const copy = COPY[language] || COPY.no;
    const dialog = document.createElement('dialog');
    dialog.id = 'hkm-newsletter-signup';
    dialog.setAttribute('aria-labelledby','hkm-newsletter-title');
    dialog.innerHTML = `<button type="button" class="hkm-newsletter-close" aria-label="${copy.close}">×</button>
        <p class="hkm-newsletter-eyebrow">HIS KINGDOM MINISTRY</p>
        <h2 id="hkm-newsletter-title">${copy.title}</h2><p class="hkm-newsletter-intro">${copy.intro}</p>
        <form><label for="hkm-signup-name">${copy.name}</label><input id="hkm-signup-name" name="subscriberName" type="text" autocomplete="name" maxlength="200">
        <label for="hkm-signup-email">${copy.email}</label><input id="hkm-signup-email" name="email" type="email" autocomplete="email" maxlength="254" required placeholder="navn@eksempel.no">
        <label for="hkm-signup-language">${copy.language}</label><select id="hkm-signup-language" name="language"><option value="no">Norsk</option><option value="en">English</option></select>
        <label class="hkm-newsletter-consent"><input type="checkbox" name="consent" required><span>${copy.consent}</span></label>
        <button type="submit" class="hkm-newsletter-submit">${copy.submit}</button></form>
        <p class="hkm-newsletter-status" role="status" aria-live="polite"></p><a class="hkm-newsletter-privacy" href="${copy.privacyUrl}">${copy.privacy}</a>`;
    const footerButton = document.createElement('button');
    footerButton.type = 'button'; footerButton.className = 'hkm-open-newsletter'; footerButton.textContent = copy.open;
    const footer = document.querySelector('.footer-bottom') || document.querySelector('footer.footer');
    if (footer) footer.append(footerButton);
    document.body.append(dialog);
    const form = dialog.querySelector('form'), submit = dialog.querySelector('[type=submit]'), status = dialog.querySelector('[role=status]');
    dialog.querySelector('select').value = language === 'no' ? 'no' : 'en';
    let previousFocus, pending = false;
    const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
    const write = (key,value) => { try { localStorage.setItem(key,value); } catch { /* Storage is optional. */ } };
    const open = () => { if (dialog.open) return; previousFocus = document.activeElement; dialog.showModal(); };
    footerButton.onclick = open;
    dialog.querySelector('.hkm-newsletter-close').onclick = () => dialog.close();
    dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds=dialog.getBoundingClientRect(); if (event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { write('hkm_newsletter_dismissed_at',String(Date.now())); previousFocus?.focus(); });
    form.onsubmit = async event => {
        event.preventDefault();
        if (pending || !form.reportValidity()) return;
        pending = true; submit.disabled = true; submit.textContent = copy.sending; status.textContent = ''; status.classList.remove('error');
        try {
            if (!window.firebaseService?.isInitialized || typeof window.firebaseService.subscribeNewsletter !== 'function') throw new Error('unavailable');
            await window.firebaseService.subscribeNewsletter(form.elements.email.value, { name:form.elements.subscriberName.value.trim(), language:form.elements.language.value, source:'website_popup' });
            write('hkm_newsletter_subscribed','1');
            status.textContent = copy.success; form.hidden = true;
        } catch { status.textContent = copy.error; status.classList.add('error'); }
        finally { pending = false; submit.disabled = false; submit.textContent = copy.submit; }
    };
    // Only the homepage opens automatically. Closing it suppresses it for a week.
    const home = ['/', '/index.html', '/en', '/en/', '/en/index.html', '/es', '/es/', '/es/index.html'].includes(window.location.pathname);
    if (home && read('hkm_newsletter_subscribed') !== '1' && Date.now()-Number(read('hkm_newsletter_dismissed_at') || 0) > 7*86400000) {
        setTimeout(() => {
            if (read('hkm_newsletter_subscribed') === '1' || document.visibilityState === 'hidden' || document.querySelector('dialog[open]') || document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) return;
            open();
        },12000);
    }
}
