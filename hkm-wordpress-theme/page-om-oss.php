<?php
/*
Template Name: Om Oss
*/
get_header();
?>

<!-- Page Hero -->
<section class="page-hero"
    style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1529070538774-1843cb3265df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
    <div class="container">
        <h1 class="page-hero-title">
            <?php the_title(); ?>
        </h1>
        <p class="page-hero-subtitle">Lær mer om His Kingdom Ministry og hjertene bak tjenesten.</p>
    </div>
</section>

<!-- About Section -->
<section class="about">
    <div class="container">
        <div class="about-grid">
            <div class="about-image">
                <div class="circular-image">
                    <img src="https://static.wixstatic.com/media/db4f96_2b25900fd882417e8fc88a62002ba11a~mv2.jpg/v1/fill/w_865,h_675,al_c,q_85,enc_avif,quality_auto/FullSizeRender_edited_edited_edited_edited%20(1).jpg"
                        alt="Hilde og Thomas">
                    <a class="play-button" href="https://www.youtube.com/watch?v=Z3jXbw0yC5E" target="_blank"
                        rel="noopener" aria-label="Se video om His Kingdom Ministry">
                        <i class="fas fa-play"></i>
                    </a>
                </div>
            </div>

            <div class="about-content">
                <span class="section-label">Hvem er vi</span>
                <h2 class="section-title">His Kingdom Ministry</h2>

                <!-- Content from WordPress Editor if available, else static fallback -->
                <?php if (have_posts()):
                    while (have_posts()):
                        the_post(); ?>
                        <div class="section-text">
                            <?php the_content(); ?>
                        </div>
                    <?php endwhile; else: ?>
                    <p class="section-text">His Kingdom Ministry er en kristen
                        organisasjon med base i Lyngdal. Vi driver med undervisning, bønn og misjon, og ønsker å hjelpe
                        folk å vokse i troen sin. Vi har blant annet en podcast med ukentlige andakter, og vi
                        arrangerer ulike samlinger og seminarer.</p>
                <?php endif; ?>

                <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary">Kontakt oss</a>
            </div>
        </div>
    </div>
</section>

<!-- Vision & Values Section -->
<section class="vision-values">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Om oss</span>
            <h2 class="section-title">Hvordan det begynte: A Journey of Love</h2>
        </div>
        <p class="section-description">Kommer mer snart...</p>
    </div>
</section>

<!-- Team Section -->
<section class="team-section">
    <div class="container">
        <div class="section-header center">
            <span class="section-label">Vårt team</span>
            <h2 class="section-title">Møt hjertene bak His Kingdom Ministry</h2>
        </div>

        <div class="team-grid">
            <div class="team-member">
                <div class="team-image">
                    <img src="<?php echo get_template_directory_uri(); ?>/img/Hilde Karin Knutsen.jpg"
                        alt="Hilde Karin Knutsen">
                </div>
                <div class="team-info">
                    <h3 class="team-name">Hilde Karin Knutsen</h3>
                    <p class="team-role">Profetisk forbeder og underviser</p>
                    <p class="team-bio">Velkommen til siden min. Jeg heter Hilde Karin. Jeg er gift med Thomas. Vi
                        bor i Norge. Jeg har reist som misjonær og profetisk forbeder mer enn halve livet mitt. Ved
                        Guds nåde, gjennom Bibelens prinsipper og ved Den Hellige Ånds ledelse er jeg en profetisk
                        stemme klar til å hjelpe deg å vokse i ditt personlige forhold til Jesus Kristus og utruste
                        deg til å bli alt det han har gjort deg til å være.</p>
                    <button class="team-toggle" type="button">Les mer</button>
                    <div class="team-social">
                        <a href="https://www.instagram.com/freedomisathand/" aria-label="Instagram"><i
                                class="fab fa-instagram"></i></a>
                        <a href="https://www.facebook.com/hiskingdomministry777?locale=nb_NO" aria-label="Facebook"><i
                                class="fab fa-facebook-f"></i></a>
                        <a href="https://www.youtube.com/@HisKingdomMinistry" aria-label="YouTube"><i
                                class="fab fa-youtube"></i></a>
                        <a href="https://www.tiktok.com/@hilde707" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
                    </div>
                </div>
            </div>

            <div class="team-member">
                <div class="team-image">
                    <img src="<?php echo get_template_directory_uri(); ?>/img/Thomas.jpeg" class="team-photo-focus"
                        alt="Thomas Knutsen">
                </div>
                <div class="team-info">
                    <h3 class="team-name">Thomas Knutsen</h3>
                    <p class="team-role">Daglig leder og Lovsang</p>
                    <p class="team-bio">Hei og velkommen til siden vår. Vi er så glade for at du kom inn på vår
                        tjenesteside. Jeg tror at Gud vil forandre mange liv gjennom denne tjenesten.</p>
                    <button class="team-toggle" type="button">Les mer</button>
                    <div class="team-social">
                        <a href="https://www.instagram.com/tkdesignandmusic/" aria-label="Instagram"><i
                                class="fab fa-instagram"></i></a>
                        <a href="https://www.facebook.com/thomas.knutsen.75/?locale=nb_NO" aria-label="Facebook"><i
                                class="fab fa-facebook-f"></i></a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- CTA Section -->
<section class="cta-section">
    <div class="container">
        <div class="cta-content">
            <h2>Bli Med i Fellesskapet</h2>
            <p>Vi ønsker å være et sted der du kan vokse i din tro og oppleve Guds nærvær.</p>
            <div class="cta-buttons">
                <a href="<?php echo site_url('/arrangementer'); ?>" class="btn btn-primary">Se arrangementer</a>
                <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary">Kontakt oss</a>
            </div>
        </div>
    </div>
</section>

<?php get_footer(); ?>