/**
 * Cookie Consent Manager
 * Handles GDPR compliance by managing user consent for different categories of cookies.
 */

document.addEventListener('DOMContentLoaded', () => {
    const CONSENT_KEY = 'hkm_cookie_consent';

    // Check if consent is already given
    const savedConsent = localStorage.getItem(CONSENT_KEY);

    if (!savedConsent) {
        showCookieBanner();
    } else {
        const consent = JSON.parse(savedConsent);
        applyConsent(consent);
    }
});

function showCookieBanner() {
    // Inject HTML
    const bannerHTML = `
    <div id="cookie-consent-backdrop"></div>
    <div id="cookie-consent-banner">
        <div class="cookie-content">
            <h3 class="cookie-title">Vi bryr oss om ditt personvern</h3>
            <p class="cookie-text">
                Vi bruker informasjonskapsler (cookies) for at nettsiden skal fungere, for å analysere trafikken vår og for å tilby deg en bedre brukeropplevelse. 
                Du kan velge hvilke kategorier du vil tillate.
                <a href="personvern.html" class="cookie-details-link">Les vår personvernerklæring</a>
            </p>
            
            <div class="cookie-options">
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-necessary" class="cookie-toggle" checked disabled>
                    <label for="cookie-necessary">Nødvendige (Alltid på)</label>
                </div>
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-analytics" class="cookie-toggle">
                    <label for="cookie-analytics">Statistikk</label>
                </div>
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-marketing" class="cookie-toggle">
                    <label for="cookie-marketing">Markedsføring</label>
                </div>
            </div>

            <div class="cookie-buttons">
                <button id="btn-accept-all" class="btn-cookie btn-cookie-accept">Tillat alle</button>
                <button id="btn-accept-selection" class="btn-cookie btn-cookie-selection">Tillat utvalgte</button>
                <button id="btn-deny-all" class="btn-cookie btn-cookie-deny">Avvis alle</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', bannerHTML);

    const banner = document.getElementById('cookie-consent-banner');
    const backdrop = document.getElementById('cookie-consent-backdrop');

    // Small delay to allow animation
    setTimeout(() => {
        banner.classList.add('visible');
        backdrop.classList.add('visible');
    }, 100);

    // Event Listeners
    document.getElementById('btn-accept-all').addEventListener('click', () => {
        saveConsent({ necessary: true, analytics: true, marketing: true });
        hideBanner();
    });

    document.getElementById('btn-deny-all').addEventListener('click', () => {
        saveConsent({ necessary: true, analytics: false, marketing: false });
        hideBanner();
    });

    document.getElementById('btn-accept-selection').addEventListener('click', () => {
        const analytics = document.getElementById('cookie-analytics').checked;
        const marketing = document.getElementById('cookie-marketing').checked;
        saveConsent({ necessary: true, analytics, marketing });
        hideBanner();
    });
}

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
                // Save to user profile
                await firebase.firestore().collection("users").doc(user.uid).set({
                    privacySettings: payload
                }, { merge: true });
                console.log("Consent saved to profile.");
            } else {
                // Log anonymously
                await firebase.firestore().collection("consent_logs").add(payload);
                console.log("Anonymous consent logged.");
            }
        } catch (error) {
            console.error("Error persisting consent:", error);
        }
    }

    applyConsent(consent);
}

function applyConsent(consent) {
    console.log('Applying Cookie Consent:', consent);

    // Nødvendige: Alltid på. Håndteres av applikasjonen selv.

    // Statistikk (Analytics)
    if (consent.analytics) {
        console.log('Analytics Enabled - Loading scripts...');
        // Her ville vi lastet Google Analytics script dynamisk
        // loadScript('https://www.googletagmanager.com/gtag/js?id=UA-XXXX');
    }

    // Markedsføring
    if (consent.marketing) {
        console.log('Marketing Enabled - Loading pixel...');
        // Her ville vi lastet Facebook Pixel etc.
    }
}
