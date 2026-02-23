<?php
/**
 * Template Name: Business Network (BNN)
 */

get_header(); ?>

<main>
    <?php while (have_posts()):
        the_post(); ?>
        <!-- Page Hero -->
        <section class="page-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo get_the_post_thumbnail_url(null, 'full') ?: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>'); display: flex; align-items: center; min-height: 350px;">
            <div class="container flex flex-col items-center justify-center text-center py-16" style="min-height: 300px;">
                <h1 class="page-hero-title" style="margin-bottom: 1rem;">
                    <?php the_title(); ?>
                </h1>
                <p class="page-hero-subtitle">Et nettverk for kristne ledere og næringsdrivende</p>
            </div>
        </section>

        <!-- Content Sections -->
        <section class="section" style="background: white;">
            <div class="container text-center">
                <span class="section-label">Nettverk</span>
                <h2 class="section-title">Mer enn bare business</h2>
                <div class="section-description" style="max-width: 800px; margin: 0 auto 50px;">
                    <?php the_content(); ?>
                    <?php if (empty(get_the_content())): ?>
                        BNN er et fellesskap der vi kombinerer faglig kompetanse med åndelig fokus. Vi tror på at næringslivet
                        spiller en nøkkelrolle i å finansiere og drive misjon fremover.
                    <?php endif; ?>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    <div class="p-8 bg-[#f8f9fa] rounded-2xl flex flex-col items-center">
                        <i class="fas fa-users fa-3x" style="color: var(--primary-orange); margin-bottom: 20px;"></i>
                        <h4 class="font-semibold mb-2">Nettverkssamlinger</h4>
                        <p>Møt likesinnede ledere for inspirasjon og erfaringsutveksling.</p>
                    </div>
                    <div class="p-8 bg-[#f8f9fa] rounded-2xl flex flex-col items-center">
                        <i class="fas fa-lightbulb fa-3x" style="color: var(--primary-orange); margin-bottom: 20px;"></i>
                        <h4 class="font-semibold mb-2">Inspirasjon</h4>
                        <p>Få undervisning spesielt rettet mot kristent lederskap i arbeidslivet.</p>
                    </div>
                    <div class="p-8 bg-[#f8f9fa] rounded-2xl flex flex-col items-center">
                        <i class="fas fa-seedling fa-3x" style="color: var(--primary-orange); margin-bottom: 20px;"></i>
                        <h4 class="font-semibold mb-2">Vekst</h4>
                        <p>Se hvordan din bedrift kan være en plattform for Guds rike.</p>
                    </div>
                </div>

                <div class="mt-16">
                    <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary">Bli en del av nettverket</a>
                </div>
            </div>
        </section>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>