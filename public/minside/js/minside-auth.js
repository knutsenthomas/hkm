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
        try {
            const service = window.firebaseService;
            if (!service || !service.isInitialized) throw new Error("Firebase mismatch");
            const result = await service.loginWithGoogle();
            const user = result.user;

            // Check if user already has a doc, if not create one as 'medlem'
            const role = await service.getUserRole(user.uid);
            if (!role) {
                await firebase.firestore().collection('users').doc(user.uid).set({
                    email: user.email,
                    role: 'medlem',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            await routeByRole();
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
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
            window.location.href = 'index.html';
            return;
        }

        let role = 'medlem';
        try {
            role = await service.getUserRole(user.uid);
        } catch (err) {
            console.warn('Kunne ikke hente rolle:', err);
        }

        const canAccessAdmin = window.HKM_PERMISSIONS
            && Array.isArray(window.HKM_PERMISSIONS.ACCESS_ADMIN)
            && window.HKM_PERMISSIONS.ACCESS_ADMIN.includes(role);

        window.location.href = canAccessAdmin ? '../admin/index.html' : 'index.html';
    }

    function getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found': return 'Ingen bruker funnet.';
            case 'auth/wrong-password': return 'Feil passord.';
            case 'auth/email-already-in-use': return 'Denne e-posten er allerede i bruk.';
            case 'auth/weak-password': return 'Passordet må ha minst 6 tegn.';
            default: return error.message;
        }
    }
});
