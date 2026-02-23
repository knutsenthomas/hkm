<!-- Footer -->
<footer class="footer" id="kontakt">
    <div class="container">
        <div class="footer-layout-v2">
            <!-- Left Section: Brand + Links -->
            <div class="footer-left">
                <!-- Brand / Intro -->
                <div class="footer-brand">
                    <a href="<?php echo home_url(); ?>" class="logo">
                        <div class="logo-icon">
                            <img src="<?php echo get_template_directory_uri(); ?>/img/logo-hkm.png"
                                alt="His Kingdom Ministry Logo">
                        </div>
                        <span class="logo-text">His Kingdom Ministry</span>
                    </a>
                    <p class="brand-description">His Kingdom Ministry er en non-profit organisasjon dedikert til
                        åndelig vekst gjennom undervisning, podcast og reisevirksomhet.</p>
                </div>

                <!-- Links Grid -->
                <div class="footer-nav-grid">
                    <div class="nav-col">
                        <h4>Om oss</h4>
                        <ul>
                            <li><a href="<?php echo home_url('#hjem'); ?>">Hjem</a></li>
                            <li><a href="<?php echo site_url('/om-oss'); ?>">Om oss</a></li>
                            <li><a href="<?php echo site_url('/om-oss#visjon'); ?>">Vår visjon</a></li>
                            <li><a href="<?php echo site_url('/kontakt'); ?>">Kontakt oss</a></li>
                        </ul>
                    </div>

                    <div class="nav-col">
                        <h4>Ressurser</h4>
                        <ul>
                            <li><a href="<?php echo site_url('/media#teaching-section'); ?>">Undervisning</a></li>
                            <li><a href="<?php echo site_url('/arrangementer'); ?>">E-kurs</a></li>
                            <li><a href="<?php echo site_url('/blogg'); ?>">Bøker & Blogg</a></li>
                            <li><a href="<?php echo site_url('/minside'); ?>" target="_blank">Min Side</a></li>
                        </ul>
                    </div>

                    <div class="nav-col">
                        <h4>Media</h4>
                        <ul>
                            <li><a href="<?php echo site_url('/media#podcast-section'); ?>">Podcast</a></li>
                            <li><a href="<?php echo site_url('/media'); ?>">Videoer</a></li>
                            <li><a href="https://www.youtube.com/@HisKingdomMinistry" target="_blank">YouTube</a>
                            </li>
                        </ul>
                    </div>

                    <div class="nav-col">
                        <h4>Involvering</h4>
                        <ul>
                            <li><a href="<?php echo site_url('/arrangementer'); ?>">Kalender</a></li>
                            <li><a href="<?php echo site_url('/donasjoner'); ?>">Gi en gave</a></li>
                            <li><a href="<?php echo site_url('/personvern'); ?>">Personvern</a></li>
                            <li><a href="<?php echo site_url('/tilgjengelighet'); ?>">Tilgjengelighet</a></li>
                            <li><a href="#" class="cookie-settings-toggle">Cookies</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Right Section: Cards -->
            <div class="footer-right">
                <!-- Follow Us Card -->
                <div class="footer-card">
                    <h3>Følg oss</h3>
                    <div class="footer-social-icons">
                        <a href="https://www.facebook.com/hiskingdomministry777?locale=nb_NO" target="_blank"><i
                                class="fab fa-facebook-f"></i></a>
                        <a href="https://www.instagram.com/hiskingdomdesigns/" target="_blank"><i
                                class="fab fa-instagram"></i></a>
                        <a href="https://www.youtube.com/@HisKingdomMinistry" target="_blank"><i
                                class="fab fa-youtube"></i></a>
                    </div>
                </div>

                <!-- Contact Us Card -->
                <div class="footer-card contact-card">
                    <h3>Kontakt oss</h3>
                    <a href="<?php echo site_url('/kontakt'); ?>"
                        class="btn btn-primary btn-block btn-sm">Kontaktskjema</a>

                    <div class="contact-details">
                        <div class="detail-item">
                            <strong>E-post:</strong>
                            <p>post@hiskingdomministry.no</p>
                        </div>
                        <div class="detail-item">
                            <strong>Telefon:</strong>
                            <p>+47 930 94 615</p>
                        </div>
                        <div class="detail-item">
                            <strong>Vipps:</strong>
                            <p>938361</p>
                        </div>
                        <div class="detail-item">
                            <strong>Konto nr.:</strong>
                            <p>3000.66.08759</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer-bottom">
            <p>&copy; <span id="copyright-year">
                    <?php echo date('Y'); ?>
                </span> His Kingdom Ministry. Alle rettigheter reservert.</p>
            <a href="<?php echo site_url('/admin/login'); ?>" class="admin-link" id="admin-link">Admin</a>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>
</body>

</html>