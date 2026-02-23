<?php
/*
Template Name: Kontakt
*/
get_header();
?>

<!-- Page Hero -->
<section class="page-hero"
    style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1423666639041-f56000c27a9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
    <div class="container">
        <h1 class="page-hero-title">
            <?php the_title(); ?>
        </h1>
        <p class="page-hero-subtitle">Vi vil gjerne høre fra deg. Send oss en melding eller besøk oss.</p>
    </div>
</section>

<!-- Contact Section -->
<section class="contact-section">
    <div class="container">
        <div class="contact-grid">
            <!-- Contact Info -->
            <div class="contact-info-card">
                <h3 class="section-title" style="font-size: 32px; text-align: left;">Ta Kontakt</h3>
                <p style="margin-bottom: 30px; color: var(--text-light);">Har du spørsmål, bønnebehov eller ønsker
                    du å vite mer om vår tjeneste? Ikke nøl med å ta kontakt med oss.</p>

                <div class="contact-method">
                    <i class="fas fa-envelope"></i>
                    <div class="contact-method-text">
                        <h4>E-post</h4>
                        <p>post@hiskingdomministry.no</p>
                    </div>
                </div>

                <div class="contact-method">
                    <i class="fas fa-phone"></i>
                    <div class="contact-method-text">
                        <h4>Telefon</h4>
                        <p>+47 930 94 615</p>
                    </div>
                </div>

                <div class="contact-method">
                    <i class="fas fa-map-marker-alt"></i>
                    <div class="contact-method-text">
                        <h4>Sted</h4>
                        <p>Norge</p>
                    </div>
                </div>

                <h4 style="margin-top: 40px; margin-bottom: 15px;">Følg oss</h4>
                <div class="social-links-contact">
                    <a href="https://www.facebook.com/hiskingdomministry777?locale=nb_NO" target="_blank"
                        rel="noopener noreferrer"><i class="fab fa-facebook-f"></i></a>
                    <a href="https://www.instagram.com/hiskingdomdesigns/" target="_blank" rel="noopener noreferrer"><i
                            class="fab fa-instagram"></i></a>
                    <a href="https://www.youtube.com/@HisKingdomMinistry" target="_blank" rel="noopener noreferrer"><i
                            class="fab fa-youtube"></i></a>
                </div>
            </div>

            <!-- Contact Form -->
            <div class="contact-form-container">
                <!-- Note: In a real WP site, use CF7 or similar. For now, preserving the JS logic structure or a placeholder -->
                <form id="contact-form">
                    <div class="form-group">
                        <label for="name">Navn</label>
                        <input type="text" id="name" name="name" class="form-control" required>
                    </div>

                    <div class="form-group">
                        <label for="phone">Telefon</label>
                        <input type="tel" id="phone" name="phone" class="form-control" required>
                    </div>

                    <div class="form-group">
                        <label for="email">E-post</label>
                        <input type="email" id="email" name="email" class="form-control" required>
                    </div>

                    <div class="form-group">
                        <label for="subject">Emne</label>
                        <input type="text" id="subject" name="subject" class="form-control" required>
                    </div>

                    <div class="form-group">
                        <label for="message">Melding</label>
                        <textarea id="message" name="message" rows="5" class="form-control" required></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary">Send melding</button>
                    <p id="contact-status" style="margin-top:10px; font-size:0.9rem;"></p>
                </form>
            </div>
        </div>
    </div>
</section>

<script>
    // Inline script to preserve the Google Forms logic if desired, or this can be moved to a js file
    (function () {
        const form = document.getElementById('contact-form');
        const statusEl = document.getElementById('contact-status');

        if (!form) return;

        const FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSevZ5t_-VRN5hN-YEdk06cDmOHA1vH6vAK2A9WJAwlmBfFYUQ/formResponse';

        // Mapping fra lokale felter til Google Forms entry-ID-er
        const FIELD_MAP = {
            name: 'entry.599509457',
            phone: 'entry.1400512221',
            email: 'entry.933613981',
            subject: 'entry.737423993',
            message: 'entry.900097937'
        };

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !phone || !email || !subject || !message) {
                if (statusEl) statusEl.textContent = 'Vennligst fyll ut alle felter.';
                return;
            }

            const formData = new URLSearchParams();
            formData.append(FIELD_MAP.name, name);
            formData.append(FIELD_MAP.phone, phone);
            formData.append(FIELD_MAP.email, email);
            formData.append(FIELD_MAP.subject, subject);
            formData.append(FIELD_MAP.message, message);

            if (statusEl) {
                statusEl.style.color = '#333333';
                statusEl.textContent = 'Sender melding…';
            }

            fetch(FORM_ACTION, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            }).then(() => {
                form.reset();
                if (statusEl) {
                    statusEl.style.color = '#4caf50';
                    statusEl.textContent = 'Takk for meldingen! Vi tar kontakt så snart vi kan.';
                }
            }).catch(() => {
                if (statusEl) {
                    statusEl.style.color = '#ff5252';
                    statusEl.textContent = 'Noe gikk galt ved sending av skjemaet. Prøv igjen senere.';
                }
            });
        });
    })();
</script>

<?php get_footer(); ?>