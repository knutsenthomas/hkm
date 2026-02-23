<?php
/**
 * Template Name: Arrangementer
 */

get_header(); ?>

<main>
    <!-- Page Hero -->
    <section class="page-hero subpage-hero"
        style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
        <div>
            <h1 class="page-hero-title"><?php the_title(); ?></h1>
            <p class="page-hero-subtitle">Bli med på våre kommende hendelser</p>
        </div>
    </section>

    <!-- Events List -->
    <section class="events-page section">
        <div class="container">
            <div class="events-grid">
                <!-- Events loaded dynamically from Google Calendar -->
                <div class="loader-container" style="text-align: center; padding: 50px;">
                    <div class="loader"></div>
                    <p style="margin-top: 15px; color: var(--text-muted);">Henter arrangementer...</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact CTA -->
    <section class="cta section" style="background: var(--bg-light);">
        <div class="container" style="text-align: center;">
            <h2 class="section-title">Har du spørsmål om våre arrangementer?</h2>
            <p class="section-description" style="margin-left: auto; margin-right: auto;">Vi hjelper deg gjerne med
                informasjon om påmelding, overnatting eller program.</p>
            <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary">Kontakt oss i dag</a>
        </div>
    </section>
</main>

<?php get_footer(); ?>