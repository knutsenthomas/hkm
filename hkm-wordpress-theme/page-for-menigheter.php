<?php
/**
 * Template Name: For menigheter
 */

get_header(); ?>

<main>
    <?php while (have_posts()):
        the_post(); ?>
        <!-- Page Hero -->
        <section class="page-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo get_the_post_thumbnail_url(null, 'full') ?: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>');">
            <div class="container text-center">
                <h1 class="page-hero-title">
                    <?php the_title(); ?>
                </h1>
                <p class="page-hero-subtitle">Sammen om det store oppdraget</p>
            </div>
        </section>

        <!-- Content -->
        <section class="section" style="background: white;">
            <div class="container">
                <div class="max-w-4xl mx-auto">
                    <?php the_content(); ?>

                    <?php if (empty(get_the_content())): ?>
                        <div class="text-center mb-16">
                            <span class="section-label">Fellesskap</span>
                            <h2 class="section-title">En ressurs for din menighet</h2>
                            <p class="section-description">Vi ønsker å stå sammen med lokale menigheter for å utruste troende og
                                nå lenger ut med evangeliet.</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
                            <div class="p-8 bg-gray-50 rounded-2xl border border-gray-100 italic text-gray-700 text-center">
                                "Vi brenner for å se lokale menigheter blomstre og mennesker bli grunnfestet i Guds ord."
                            </div>
                            <div class="p-8 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-center">
                                <ul class="space-y-4">
                                    <li class="flex items-center gap-3">
                                        <i class="fas fa-check text-primary-orange"></i>
                                        <span>Bibelundervisning og seminarer</span>
                                    </li>
                                    <li class="flex items-center gap-3">
                                        <i class="fas fa-check text-primary-orange"></i>
                                        <span>Inspirasjonshelger</span>
                                    </li>
                                    <li class="flex items-center gap-3">
                                        <i class="fas fa-check text-primary-orange"></i>
                                        <span>Lederutvikling</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div class="mt-20 text-center">
                            <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary btn-large">Ta kontakt for
                                samarbeid</a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>