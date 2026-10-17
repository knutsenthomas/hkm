// Shared contact validation and submission for all public languages.
const contactCopy = {
  "no": {
    "required": "Vennligst fyll ut alle obligatoriske felt (*).",
    "sending": "Sender…",
    "sendingMessage": "Sender melding…",
    "send": "Send melding",
    "success": "✅ Takk for meldingen! Vi tar kontakt så snart vi kan.",
    "failed": "Noe gikk galt ved sending. Prøv igjen senere."
  },
  "en": {
    "required": "Please fill in all required fields (*).",
    "sending": "Sending…",
    "sendingMessage": "Sending your message…",
    "send": "Send message",
    "success": "✅ Thank you for your message. We will get back to you as soon as we can.",
    "failed": "Unable to send your message. Please try again later."
  },
  "es": {
    "required": "Completa todos los campos obligatorios (*).",
    "sending": "Enviando…",
    "sendingMessage": "Enviando tu mensaje…",
    "send": "Enviar mensaje",
    "success": "✅ Gracias por tu mensaje. Te responderemos lo antes posible.",
    "failed": "No se ha podido enviar el mensaje. Inténtalo de nuevo más tarde."
  }
};
const contactText = key => (contactCopy[document.documentElement.lang?.split('-')[0]] || contactCopy.no)[key];
(function () {
                const form = document.getElementById('contact-form');
                const statusEl = document.getElementById('contact-status');

                if (!form) return;

                const FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSevZ5t_-VRN5hN-YEdk06cDmOHA1vH6vAK2A9WJAwlmBfFYUQ/formResponse';

                const FIELD_MAP = {
                    name: 'entry.599509457',
                    phone: 'entry.1400512221',
                    email: 'entry.933613981',
                    subject: 'entry.737423993',
                    message: 'entry.900097937'
                };

                function showError(fieldId, errId) {
                    const field = document.getElementById(fieldId);
                    const err = document.getElementById(errId);
                    if (field) field.classList.add('field-error');
                    if (err) err.classList.add('visible');
                }

                function clearErrors() {
                    document.querySelectorAll('.form-control').forEach(f => f.classList.remove('field-error'));
                    document.querySelectorAll('.form-error-msg').forEach(e => e.classList.remove('visible'));
                }

                // Clear error styling when user starts typing
                ['name', 'email', 'subject', 'message'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.addEventListener('input', () => {
                        el.classList.remove('field-error');
                        const err = document.getElementById('err-' + id);
                        if (err) err.classList.remove('visible');
                    });
                });

                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    clearErrors();

                    const name = document.getElementById('name').value.trim();
                    const phone = document.getElementById('phone').value.trim();
                    const email = document.getElementById('email').value.trim();
                    const subject = document.getElementById('subject').value.trim();
                    const message = document.getElementById('message').value.trim();

                    let valid = true;

                    if (!name) { showError('name', 'err-name'); valid = false; }
                    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showError('email', 'err-email'); valid = false; }
                    if (!subject) { showError('subject', 'err-subject'); valid = false; }
                    if (!message) { showError('message', 'err-message'); valid = false; }

                    if (!valid) {
                        if (statusEl) {
                            statusEl.style.color = '#e74c3c';
                            statusEl.textContent = contactText('required');
                        }
                        // Scroll to first error
                        const firstError = form.querySelector('.field-error');
                        if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return;
                    }

                    const formData = new URLSearchParams();
                    formData.append(FIELD_MAP.name, name);
                    if (phone) formData.append(FIELD_MAP.phone, phone);
                    formData.append(FIELD_MAP.email, email);
                    formData.append(FIELD_MAP.subject, subject);
                    formData.append(FIELD_MAP.message, message);

                    // Lagre i Firebase (kontaktmeldinger) hvis tilgjengelig
                    if (window.firebaseService && window.firebaseService.isInitialized && window.firebaseService.db) {
                        try {
                            window.firebaseService.db.collection('contactMessages').add({
                                name,
                                phone,
                                email,
                                subject,
                                message,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                status: 'ny'
                            });
                        } catch (err) {
                            console.error('Kunne ikke lagre kontaktskjema i Firestore:', err);
                        }
                    }

                    const submitBtn = form.querySelector('button[type="submit"]');
                    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = contactText('sending'); }

                    if (statusEl) {
                        statusEl.style.color = '#64748b';
                        statusEl.textContent = contactText('sendingMessage');
                    }

                    fetch(FORM_ACTION, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: formData.toString()
                    }).then(() => {
                        form.reset();
                        clearErrors();
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = contactText('send'); }
                        if (statusEl) {
                            statusEl.style.color = '#16a34a';
                            statusEl.textContent = contactText('success');
                        }
                    }).catch(() => {
                        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = contactText('send'); }
                        if (statusEl) {
                            statusEl.style.color = '#e74c3c';
                            statusEl.textContent = contactText('failed');
                        }
                    });
                });
            })();
