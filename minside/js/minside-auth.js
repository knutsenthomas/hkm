document.addEventListener('DOMContentLoaded', async () => {
    console.log("[HKM] MinSide Auth Script loaded");

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
        const service = window.firebaseService;
        if (service && service.isInitialized && typeof service.getGoogleRedirectResult === 'function') {
            const redirectResult = await service.getGoogleRedirectResult();
            if (redirectResult && redirectResult.user) {
                showMessage('Google-innlogging fullført. Sender deg videre...', 'success');
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
        btn.textContent = 'Logger inn...';
        hideMessage();

        try {
            const service = window.firebaseService;
            if (!service || !service.isInitialized) throw new Error("Firebase mismatch");
            await service.login(email, password);
            await routeByRole();
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
            btn.disabled = false;
            btn.textContent = 'Logg inn';
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
            return showMessage('Passordene er ikke like.', 'error');
        }

        btn.disabled = true;
        btn.textContent = 'Oppretter profil...';
        hideMessage();

        try {
            const userCredential = await firebaseService.register(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            await routeByRole();
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
            btn.disabled = false;
            btn.textContent = 'Opprett profil';
        }
    });

    // --- 3. Magic Link Login (Send) ---
    document.getElementById('magic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-magic').value;
        const btn = e.target.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Sender link...';
        hideMessage();

        const actionCodeSettings = {
            url: window.location.href,
            handleCodeInApp: true
        };

        try {
            await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            showMessage('Vi har sendt en magisk link til din e-post!', 'success');
            btn.textContent = 'Link sendt!';
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
            btn.disabled = false;
            btn.textContent = 'Send meg link';
        }
    });

    // --- 4. Google Login ---
    document.getElementById('google-login').addEventListener('click', async () => {
        const btn = document.getElementById('google-login');
        btn.disabled = true;
        btn.textContent = 'Åpner Google...';
        hideMessage();

        try {
            const service = window.firebaseService;
            if (!service || !service.isInitialized) throw new Error("Firebase mismatch");
            const result = await service.loginWithGoogle({ redirectFallback: true });
            if (!result) return;

            await ensureMemberProfile(result.user);
            await routeByRole();
        } catch (error) {
            console.error(error);
            let msg = getErrorMessage(error);
            if (error.code === 'auth/unauthorized-domain') {
                msg = 'Domenet "' + window.location.hostname + '" er ikke godkjent i Firebase (Authorized Domains). Legg det til i Firebase Console.';
            }
            showMessage(msg, 'error');
            btn.disabled = false;
            btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="Google"> Google';
        }
    });

    // --- 5. Verify Magic Link on Load ---
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Bekreft din e-postadresse:');
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
            showMessage('Innlogging er gjennomført, men rolleverifisering er treg. Prøver medlemssiden først.', 'success');
            window.location.href = '/minside/index.html';
            return;
        }

        const normalizedRole = String(role || '').trim().toLowerCase();
        const canAccessAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

        window.location.href = canAccessAdmin ? '/admin/index.html' : '/minside/index.html';
    }

    function getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found': return 'Ingen bruker funnet.';
            case 'auth/wrong-password': return 'Feil passord.';
            case 'auth/email-already-in-use': return 'Denne e-posten er allerede i bruk.';
            case 'auth/weak-password': return 'Passordet må ha minst 6 tegn.';
            case 'auth/popup-blocked': return 'Google-vinduet ble blokkert. Prøver redirect-innlogging.';
            case 'auth/popup-closed-by-user': return 'Google-innlogging ble lukket før den var ferdig.';
            case 'auth/unauthorized-domain': return 'Domenet "' + window.location.hostname + '" er ikke godkjent for Google-innlogging i Firebase.';
            default: return error.message;
        }
    }
});
