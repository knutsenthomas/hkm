// Translations Dictionary for Min Side Authentication
const authTranslations = {
    no: {
        'login.title': 'Min Side',
        'login.subtitle': 'Velkommen til ditt åndelige fellesskap',
        'login.modeLogin': 'Logg inn',
        'login.modeRegister': 'Ny bruker',
        'login.modeMagic': 'Magisk Link',
        'login.emailLabel': 'E-post',
        'login.emailPlaceholder': 'din@epost.no',
        'login.passwordLabel': 'Passord',
        'login.passwordPlaceholder': '••••••••',
        'login.submitLogin': 'Logg inn',
        'login.forgotPassword': 'Glemt passord?',
        'login.registerSubtitle': 'Opprett en profil for å få tilgang til kurs og ressurser.',
        'login.nameLabel': 'Fullt navn',
        'login.namePlaceholder': 'Ola Nordmann',
        'login.passwordMinPlaceholder': 'Minst 6 tegn',
        'login.confirmPasswordLabel': 'Bekreft Passord',
        'login.submitRegister': 'Opprett profil',
        'login.magicSubtitle': 'Skriv inn din e-post, så sender vi deg en engangslink for å logge inn uten passord.',
        'login.submitMagic': 'Send meg link',
        'login.divider': 'eller logg inn med',
        'login.backLink': 'Tilbake til nettsiden',
        
        // Buttons / feedback / states
        'auth.loggingIn': 'Logger inn...',
        'auth.creatingProfile': 'Oppretter profil...',
        'auth.sendingLink': 'Sender link...',
        'auth.linkSent': 'Link sendt!',
        'auth.openingGoogle': 'Åpner Google...',
        'auth.googleSuccess': 'Google-innlogging fullført. Sender deg videre...',
        'auth.roleVerificationSlow': 'Innlogging er gjennomført, men rolleverifisering er treg. Prøver medlemssiden først.',
        'auth.passwordMismatch': 'Passordene er ikke like.',
        'auth.magicLinkSuccess': 'Vi har sendt en magisk link til din e-post!',
        'auth.googlePopupBlocked': 'Google-vinduet ble blokkert. Prøver redirect-innlogging.',
        'auth.googlePopupClosed': 'Google-innlogging ble lukket før den var ferdig.',
        'auth.googleUnauthorizedDomain': 'Domenet er ikke godkjent for Google-innlogging i Firebase.',
        
        // Errors
        'error.userNotFound': 'Ingen bruker funnet.',
        'error.wrongPassword': 'Feil passord.',
        'error.emailInUse': 'Denne e-posten er allerede i bruk.',
        'error.weakPassword': 'Passordet må ha minst 6 tegn.',
        'error.unknown': 'En ukjent feil oppstod.'
    },
    en: {
        'login.title': 'My Page',
        'login.subtitle': 'Welcome to your spiritual community',
        'login.modeLogin': 'Login',
        'login.modeRegister': 'Register',
        'login.modeMagic': 'Magic Link',
        'login.emailLabel': 'Email',
        'login.emailPlaceholder': 'your@email.com',
        'login.passwordLabel': 'Password',
        'login.passwordPlaceholder': '••••••••',
        'login.submitLogin': 'Log in',
        'login.forgotPassword': 'Forgot password?',
        'login.registerSubtitle': 'Create a profile to access courses and resources.',
        'login.nameLabel': 'Full name',
        'login.namePlaceholder': 'John Doe',
        'login.passwordMinPlaceholder': 'At least 6 characters',
        'login.confirmPasswordLabel': 'Confirm Password',
        'login.submitRegister': 'Create profile',
        'login.magicSubtitle': 'Enter your email, and we will send you a one-time link to log in without a password.',
        'login.submitMagic': 'Send me link',
        'login.divider': 'or log in with',
        'login.backLink': 'Back to website',
        
        // Buttons / feedback
        'auth.loggingIn': 'Logging in...',
        'auth.creatingProfile': 'Creating profile...',
        'auth.sendingLink': 'Sending link...',
        'auth.linkSent': 'Link sent!',
        'auth.openingGoogle': 'Opening Google...',
        'auth.googleSuccess': 'Google login completed. Redirecting...',
        'auth.roleVerificationSlow': 'Login completed, but role verification is slow. Retrying dashboard.',
        'auth.passwordMismatch': 'Passwords do not match.',
        'auth.magicLinkSuccess': 'We have sent a magic link to your email!',
        'auth.googlePopupBlocked': 'Google popup blocked. Retrying with redirect.',
        'auth.googlePopupClosed': 'Google login was closed before completion.',
        'auth.googleUnauthorizedDomain': 'The domain is not authorized for Google login in Firebase.',
        
        // Errors
        'error.userNotFound': 'No user found.',
        'error.wrongPassword': 'Incorrect password.',
        'error.emailInUse': 'This email is already in use.',
        'error.weakPassword': 'Password must be at least 6 characters.',
        'error.unknown': 'An unknown error occurred.'
    },
    es: {
        'login.title': 'Mi página',
        'login.subtitle': 'Bienvenido a tu comunidad espiritual',
        'login.modeLogin': 'Iniciar sesión',
        'login.modeRegister': 'Registrarse',
        'login.modeMagic': 'Enlace mágico',
        'login.emailLabel': 'Correo electrónico',
        'login.emailPlaceholder': 'tu@correo.com',
        'login.passwordLabel': 'Contraseña',
        'login.passwordPlaceholder': '••••••••',
        'login.submitLogin': 'Iniciar sesión',
        'login.forgotPassword': '¿Olvidaste tu contraseña?',
        'login.registerSubtitle': 'Crea un perfil para acceder a cursos y recursos.',
        'login.nameLabel': 'Nombre completo',
        'login.namePlaceholder': 'Juan Pérez',
        'login.passwordMinPlaceholder': 'Mínimo 6 caracteres',
        'login.confirmPasswordLabel': 'Confirmar contraseña',
        'login.submitRegister': 'Crear perfil',
        'login.magicSubtitle': 'Introduce tu correo electrónico y te enviaremos un enlace único para iniciar sesión sin contraseña.',
        'login.submitMagic': 'Enviarme enlace',
        'login.divider': 'o inicia sesión con',
        'login.backLink': 'Volver al sitio web',
        
        // Buttons / feedback
        'auth.loggingIn': 'Iniciando sesión...',
        'auth.creatingProfile': 'Creando perfil...',
        'auth.sendingLink': 'Enviando enlace...',
        'auth.linkSent': '¡Enlace enviado!',
        'auth.openingGoogle': 'Abriendo Google...',
        'auth.googleSuccess': 'Inicio de sesión con Google completado. Redirigiendo...',
        'auth.roleVerificationSlow': 'Inicio de sesión completado, pero la verificación de rol es lenta. Intentando panel.',
        'auth.passwordMismatch': 'Las contraseñas no coinciden.',
        'auth.magicLinkSuccess': '¡Hemos enviado un enlace mágico a tu correo electrónico!',
        'auth.googlePopupBlocked': 'Ventana emergente de Google bloqueada. Reintentando con redirección.',
        'auth.googlePopupClosed': 'El inicio de sesión de Google se cerró antes de completarse.',
        'auth.googleUnauthorizedDomain': 'El dominio no está autorizado para el inicio de sesión de Google en Firebase.',
        
        // Errors
        'error.userNotFound': 'No se encontró ningún usuario.',
        'error.wrongPassword': 'Contraseña incorrecta.',
        'error.emailInUse': 'Este correo electrónico ya está en uso.',
        'error.weakPassword': 'La contraseña debe tener al menos 6 caracteres.',
        'error.unknown': 'Ocurrió un error desconocido.'
    }
};

// Translation Helper
function t(key) {
    const lang = document.documentElement.lang || 'no';
    return authTranslations[lang]?.[key] || authTranslations['no']?.[key] || key;
}

// Static HTML Translation Utility
function translateStaticHTML() {
    const lang = document.documentElement.lang || 'no';
    
    // Translate elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = authTranslations[lang]?.[key] || authTranslations['no']?.[key];
        if (translated) {
            el.textContent = translated;
        }
    });

    // Translate input placeholders with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translated = authTranslations[lang]?.[key] || authTranslations['no']?.[key];
        if (translated) {
            el.setAttribute('placeholder', translated);
        }
    });
}

// Register global language callback early for i18nManager
window.minsideAuthLanguageChange = function(lang) {
    document.documentElement.lang = lang;
    translateStaticHTML();
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("[HKM] MinSide Auth Script loaded");

    // Perform initial static translation immediately
    translateStaticHTML();

    // --- Mode Switching ---
    const buttons = document.querySelectorAll('.btn-mode');
    const sections = document.querySelectorAll('.auth-mode-section');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.id.split('-')[1];
            setMode(mode);
        });
    });

    function setMode(mode) {
        buttons.forEach(b => {
            if (b.id === `mode-${mode}`) {
                b.style.borderColor = 'var(--primary-orange)';
                b.style.color = 'var(--primary-orange)';
            } else {
                b.style.borderColor = 'var(--border-color)';
                b.style.color = 'var(--text-main)';
            }
        });

        sections.forEach(s => {
            if (s.id === `section-${mode}`) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
        hideMessage();
    }

    // --- Feedback UI ---
    const feedbackBox = document.getElementById('feedback-box');
    function showMessage(msg, type) {
        feedbackBox.textContent = msg;
        feedbackBox.className = `feedback-message ${type}`;
        feedbackBox.style.display = 'block';
    }
    function hideMessage() {
        feedbackBox.style.display = 'none';
    }

    async function waitForFirebaseReady(timeoutMs = 5000) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < timeoutMs) {
            const service = window.firebaseService;
            if (service && typeof service.tryAutoInit === 'function') {
                service.tryAutoInit();
            }

            if (window.firebaseService?.isInitialized && typeof firebase !== 'undefined') {
                return window.firebaseService;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return window.firebaseService || null;
    }

    function isGoogleRedirectError(error) {
        return error && error.code && String(error.code).startsWith('auth/');
    }

    async function ensureMemberProfile(user) {
        const service = window.firebaseService;
        if (!service || !service.isInitialized || !user) return;

        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            await firebase.firestore().collection('users').doc(user.uid).set({
                email: user.email,
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                role: 'medlem',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }

    try {
        const service = await waitForFirebaseReady();
        if (service && service.isInitialized && typeof service.getGoogleRedirectResult === 'function') {
            const redirectResult = await service.getGoogleRedirectResult();
            if (redirectResult && redirectResult.user) {
                showMessage(t('auth.googleSuccess'), 'success');
                await ensureMemberProfile(redirectResult.user);
                await routeByRole();
                return;
            }
        }
    } catch (error) {
        if (isGoogleRedirectError(error)) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
        }
    }

    // --- 1. Email/Password Login ---
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = e.target.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = t('auth.loggingIn');
        hideMessage();

        try {
            const service = await waitForFirebaseReady();
            if (!service || !service.isInitialized) throw new Error("Firebase mismatch");
            await service.login(email, password);
            await routeByRole();
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
            btn.disabled = false;
            btn.textContent = t('login.submitLogin');
        }
    });

    // --- 2. Registration ---
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const name = document.getElementById('register-name').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        const btn = e.target.querySelector('button[type="submit"]');

        if (password !== confirm) {
            return showMessage(t('auth.passwordMismatch'), 'error');
        }

        btn.disabled = true;
        btn.textContent = t('auth.creatingProfile');
        hideMessage();

        try {
            await waitForFirebaseReady();
            const userCredential = await firebaseService.register(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            await routeByRole();
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
            btn.disabled = false;
            btn.textContent = t('login.submitRegister');
        }
    });

    // --- 3. Magic Link Login (Send) ---
    document.getElementById('magic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-magic').value;
        const btn = e.target.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = t('auth.sendingLink');
        hideMessage();

        const actionCodeSettings = {
            url: window.location.href,
            handleCodeInApp: true
        };

        try {
            await waitForFirebaseReady();
            await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            showMessage(t('auth.magicLinkSuccess'), 'success');
            btn.textContent = t('auth.linkSent');
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
            btn.disabled = false;
            btn.textContent = t('login.submitMagic');
        }
    });

    // --- 4. Google Login ---
    document.getElementById('google-login').addEventListener('click', async () => {
        const btn = document.getElementById('google-login');
        btn.disabled = true;
        const origContent = btn.innerHTML;
        btn.textContent = t('auth.openingGoogle');
        hideMessage();

        try {
            const service = await waitForFirebaseReady();
            if (!service || !service.isInitialized) throw new Error("Firebase mismatch");
            const result = await service.loginWithGoogle({ redirectFallback: true });
            if (!result) return;

            await ensureMemberProfile(result.user);
            await routeByRole();
        } catch (error) {
            console.error(error);
            let msg = getErrorMessage(error);
            if (error.code === 'auth/unauthorized-domain') {
                msg = t('auth.googleUnauthorizedDomain') + ' (' + window.location.hostname + ')';
            }
            showMessage(msg, 'error');
            btn.disabled = false;
            btn.innerHTML = origContent;
        }
    });

    // --- 5. Verify Magic Link on Load ---
    if (typeof firebase !== 'undefined' && firebase.auth().isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            const promptMsg = document.documentElement.lang === 'es' ? 'Confirme su dirección de correo electrónico:' :
                              document.documentElement.lang === 'en' ? 'Confirm your email address:' :
                              'Bekreft din e-postadresse:';
            email = window.prompt(promptMsg);
        }

        firebase.auth().signInWithEmailLink(email, window.location.href)
            .then(async () => {
                window.localStorage.removeItem('emailForSignIn');
                await routeByRole();
            })
            .catch((error) => {
                showMessage(getErrorMessage(error), 'error');
            });
    }

    async function routeByRole() {
        const service = window.firebaseService;
        const user = firebase.auth().currentUser;
        if (!user || !service) {
            window.location.href = '/minside/index.html';
            return;
        }

        let role = 'medlem';
        let roleLookupFailed = false;
        try {
            role = await service.getUserRole(user.uid, { timeoutMs: 2500 });
        } catch (err) {
            roleLookupFailed = true;
            console.warn('Kunne ikke hente rolle:', err);
        }

        if (roleLookupFailed) {
            // Avoid misrouting admins to member area when Firestore is temporarily slow.
            showMessage(t('auth.roleVerificationSlow'), 'success');
            window.location.href = '/minside/index.html';
            return;
        }

        const normalizedRole = String(role || '').trim().toLowerCase();
        const canAccessAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

        window.location.href = canAccessAdmin ? '/admin/index.html' : '/minside/index.html';
    }

    function getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found': return t('error.userNotFound');
            case 'auth/wrong-password': return t('error.wrongPassword');
            case 'auth/email-already-in-use': return t('error.emailInUse');
            case 'auth/weak-password': return t('error.weakPassword');
            case 'auth/popup-blocked': return t('auth.googlePopupBlocked');
            case 'auth/popup-closed-by-user': return t('auth.googlePopupClosed');
            case 'auth/unauthorized-domain': return t('auth.googleUnauthorizedDomain');
            default: return error.message || t('error.unknown');
        }
    }
});
