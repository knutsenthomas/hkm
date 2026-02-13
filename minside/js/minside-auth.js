// Min Side Authentication Logic

document.addEventListener('DOMContentLoaded', () => {
    // Check if initializing
    if (!firebase.apps.length) {
        console.error("Firebase not initialized! loading config...");
    }

    // --- Mode Switching ---
    const btnPass = document.getElementById('mode-password');
    const btnMagic = document.getElementById('mode-magic');
    const secPass = document.getElementById('section-password');
    const secMagic = document.getElementById('section-magic');

    btnPass.addEventListener('click', () => {
        setMode('password');
    });

    btnMagic.addEventListener('click', () => {
        setMode('magic');
    });

    function setMode(mode) {
        if (mode === 'password') {
            secPass.classList.add('active');
            secMagic.classList.remove('active');
            btnPass.style.borderColor = 'var(--primary-orange)';
            btnPass.style.color = 'var(--primary-orange)';
            btnMagic.style.borderColor = 'var(--border-color)';
            btnMagic.style.color = 'var(--text-main)';
        } else {
            secPass.classList.remove('active');
            secMagic.classList.add('active');
            btnMagic.style.borderColor = 'var(--primary-orange)';
            btnMagic.style.color = 'var(--primary-orange)';
            btnPass.style.borderColor = 'var(--border-color)';
            btnPass.style.color = 'var(--text-main)';
        }
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
    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-pass').value;
        const password = document.getElementById('password').value;
        const btn = e.target.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Logger inn...';
        hideMessage();

        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            window.location.href = 'index.html';
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
            btn.disabled = false;
            btn.textContent = 'Logg inn';
        }
    });

    // --- 2. Magic Link Login (Send) ---
    document.getElementById('magic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-magic').value;
        const btn = e.target.querySelector('button[type="submit"]');

        btn.disabled = true;
        btn.textContent = 'Sender link...';
        hideMessage();

        const actionCodeSettings = {
            url: window.location.href, // Redirect back here to finish login
            handleCodeInApp: true
        };

        try {
            await firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            showMessage('Vi har sendt en magisk link til din e-post! Sjekk innboksen din (og spam-filteret).', 'success');
            btn.textContent = 'Link sendt!';
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
            btn.disabled = false;
            btn.textContent = 'Send meg link';
        }
    });

    // --- 3. Google Login ---
    document.getElementById('google-login').addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await firebase.auth().signInWithPopup(provider);
            window.location.href = 'index.html';
        } catch (error) {
            console.error(error);
            showMessage(getErrorMessage(error), 'error');
        }
    });

    // --- 4. Verify Magic Link on Load ---
    if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Vennligst bekreft din e-postadresse for å logge inn:');
        }

        firebase.auth().signInWithEmailLink(email, window.location.href)
            .then((result) => {
                window.localStorage.removeItem('emailForSignIn');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error(error);
                showMessage(getErrorMessage(error), 'error');
            });
    }

    function getErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found': return 'Ingen bruker funnet med denne e-posten.';
            case 'auth/wrong-password': return 'Feil passord.';
            case 'auth/invalid-email': return 'Ugyldig e-postadresse.';
            case 'auth/too-many-requests': return 'For mange forsøk. Prøv igjen senere.';
            default: return 'Noe gikk galt: ' + error.message;
        }
    }
});
