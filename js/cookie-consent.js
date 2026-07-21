/**
 * Cookie Consent Manager
 * Handles GDPR compliance by managing user consent for different categories of cookies.
 * Fully compliant with Datatilsynet / Ekomloven § 3-15.
 */

document.addEventListener('DOMContentLoaded', () => {
    const savedConsent = getSavedConsent();
    if (savedConsent) {
        applyConsent(savedConsent);
    } else {
        showCookieBanner();
    }
});

function getSavedConsent() {
    try {
        const item = localStorage.getItem('hkm_cookie_consent');
        return item ? JSON.parse(item) : null;
    } catch (e) {
        return null;
    }
}

function getCookieTranslations() {
    const isEn = window.location.pathname.startsWith('/en/') || document.documentElement.lang === 'en';
    const isEs = window.location.pathname.startsWith('/es/') || document.documentElement.lang === 'es';
    
    if (isEn) {
        return {
            title: "We care about your privacy",
            text: "We use cookies to make our website work properly, analyze traffic, and offer a better user experience. You can choose which categories to allow.",
            privacyLinkText: "Read our privacy policy",
            privacyUrl: "/en/privacy.html",
            necessary: "Necessary (Always on)",
            analytics: "Analytics",
            marketing: "Marketing",
            acceptAll: "Allow all",
            acceptSelected: "Allow selected",
            denyAll: "Reject all"
        };
    } else if (isEs) {
        return {
            title: "Nos importa tu privacidad",
            text: "Utilizamos cookies para que el sitio funcione correctamente, analizar el tráfico y mejorar tu experiencia. Puedes elegir qué categorías permitir.",
            privacyLinkText: "Lee nuestra política de privacidad",
            privacyUrl: "/es/privacidad.html",
            necessary: "Necesarias (Siempre activas)",
            analytics: "Estadísticas",
            marketing: "Marketing",
            acceptAll: "Permitir todas",
            acceptSelected: "Permitir seleccionadas",
            denyAll: "Rechazar todas"
        };
    } else {
        return {
            title: "Vi bryr oss om ditt personvern",
            text: "Vi bruker informasjonskapsler (cookies) for at nettsiden skal fungere, for å analysere trafikken vår og for å tilby deg en bedre brukeropplevelse. Du kan velge hvilke kategorier du vil tillate.",
            privacyLinkText: "Les vår personvernerklæring",
            privacyUrl: "personvern.html",
            necessary: "Nødvendige (Alltid på)",
            analytics: "Statistikk",
            marketing: "Markedsføring",
            acceptAll: "Tillat alle",
            acceptSelected: "Tillat utvalgte",
            denyAll: "Avvis alle"
        };
    }
}

function showCookieBanner() {
    if (document.getElementById('cookie-consent-banner')) {
        return;
    }

    const t = getCookieTranslations();

    // Inject HTML
    const bannerHTML = `
    <div id="cookie-consent-backdrop"></div>
    <div id="cookie-consent-banner">
        <div class="cookie-content">
            <h3 class="cookie-title">${t.title}</h3>
            <p class="cookie-text">
                ${t.text} 
                <a href="${t.privacyUrl}" class="cookie-details-link">${t.privacyLinkText}</a>
            </p>
            
            <div class="cookie-options">
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-necessary" class="cookie-toggle" checked disabled>
                    <label for="cookie-necessary">${t.necessary}</label>
                </div>
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-analytics" class="cookie-toggle">
                    <label for="cookie-analytics">${t.analytics}</label>
                </div>
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-marketing" class="cookie-toggle">
                    <label for="cookie-marketing">${t.marketing}</label>
                </div>
            </div>

            <div class="cookie-buttons">
                <button id="btn-accept-all" class="btn-cookie btn-cookie-accept">${t.acceptAll}</button>
                <button id="btn-accept-selection" class="btn-cookie btn-cookie-selection">${t.acceptSelected}</button>
                <button id="btn-deny-all" class="btn-cookie btn-cookie-deny">${t.denyAll}</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', bannerHTML);

    const banner = document.getElementById('cookie-consent-banner');
    const backdrop = document.getElementById('cookie-consent-backdrop');

    setTimeout(() => {
        if (banner) banner.classList.add('visible');
        if (backdrop) backdrop.classList.add('visible');
    }, 50);

    document.getElementById('btn-accept-all')?.addEventListener('click', () => {
        saveConsent({ necessary: true, analytics: true, marketing: true });
        hideBanner();
    });

    document.getElementById('btn-deny-all')?.addEventListener('click', () => {
        saveConsent({ necessary: true, analytics: false, marketing: false });
        hideBanner();
    });

    document.getElementById('btn-accept-selection')?.addEventListener('click', () => {
        const analytics = document.getElementById('cookie-analytics')?.checked || false;
        const marketing = document.getElementById('cookie-marketing')?.checked || false;
        saveConsent({ necessary: true, analytics, marketing });
        hideBanner();
    });
}

window.showCookieBanner = showCookieBanner;

function hideBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    const backdrop = document.getElementById('cookie-consent-backdrop');
    if (banner) {
        banner.classList.remove('visible');
        if (backdrop) backdrop.classList.remove('visible');
        setTimeout(() => {
            banner.remove();
            if (backdrop) backdrop.remove();
        }, 500);
    }
}

async function saveConsent(consent) {
    localStorage.setItem('hkm_cookie_consent', JSON.stringify(consent));

    // Persistence logic (Firestore)
    if (window.firebaseService && window.firebaseService.isInitialized) {
        const payload = {
            choices: consent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        try {
            const user = firebase.auth().currentUser;
            if (user) {
                await firebase.firestore().collection("users").doc(user.uid).set({
                    privacySettings: payload
                }, { merge: true });
                console.log("Consent saved to profile.");
            } else {
                await firebase.firestore().collection("consent_logs").add(payload);
                console.log("Anonymous consent logged.");
            }
        } catch (error) {
            console.error("Error persisting consent:", error);
        }
    }

    applyConsent(consent);
}

/**
 * Applies the consent choices by enabling/disabling specific scripts
 * @param {object} consent 
 */
function applyConsent(consent) {
    console.log('[HKM Consent] Applying Cookie Consent:', consent);

    // Statistikk (Analytics)
    if (consent && consent.analytics) {
        const measurementId = window.firebaseConfig?.measurementId || 'G-5CH82CHQ0B';
        const loadGAWithInteraction = () => {
            window.removeEventListener('scroll', loadGAWithInteraction);
            window.removeEventListener('mousemove', loadGAWithInteraction);
            window.removeEventListener('touchstart', loadGAWithInteraction);
            window.removeEventListener('keydown', loadGAWithInteraction);
            
            loadGA4(measurementId);
        };
        
        window.addEventListener('scroll', loadGAWithInteraction, { passive: true });
        window.addEventListener('mousemove', loadGAWithInteraction, { passive: true });
        window.addEventListener('touchstart', loadGAWithInteraction, { passive: true });
        window.addEventListener('keydown', loadGAWithInteraction, { passive: true });
    }

    // Markedsføring
    if (consent && consent.marketing) {
        console.log('[HKM Consent] Marketing Enabled');
    }
}

/**
 * Dynamically loads Google Analytics (GA4)
 * @param {string} measurementId 
 */
function loadGA4(measurementId) {
    if (window.gtagLoaded) return;
    
    console.log(`[HKM Consent] Loading Google Analytics (${measurementId})...`);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
        window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
        'anonymize_ip': true,
        'cookie_flags': 'SameSite=None;Secure'
    });

    window.gtagLoaded = true;
}

// Lazy load Font Awesome on user interaction to avoid render blocking
(function() {
    const loadFontAwesome = () => {
        window.removeEventListener('scroll', loadFontAwesome);
        window.removeEventListener('mousemove', loadFontAwesome);
        window.removeEventListener('touchstart', loadFontAwesome);
        window.removeEventListener('keydown', loadFontAwesome);
        
        if (window.fontAwesomeLoaded) return;
        window.fontAwesomeLoaded = true;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(link);
    };

    window.addEventListener('scroll', loadFontAwesome, { passive: true });
    window.addEventListener('mousemove', loadFontAwesome, { passive: true });
    window.addEventListener('touchstart', loadFontAwesome, { passive: true });
    window.addEventListener('keydown', loadFontAwesome, { passive: true });
})();

