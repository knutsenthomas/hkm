<?php
/**
 * Template Name: Bibelstudier
 */

get_header(); ?>

<main>
    <?php while (have_posts()):
        the_post(); ?>
        <!-- Page Hero -->
        <section class="page-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo get_the_post_thumbnail_url(null, 'full') ?: 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>');">
            <div class="container">
                <h1 class="page-hero-title">
                    <?php the_title(); ?>
                </h1>
                <p class="page-hero-subtitle">Utforsk Guds ord sammen med oss</p>
                <div style="margin-top: 20px;">
                    <a href="<?php echo site_url('/undervisning'); ?>" class="btn btn-outline btn-sm">
                        <i class="fas fa-arrow-left"></i> Tilbake til Undervisning
                    </a>
                </div>
            </div>
        </section>

        <!-- Bible Studies Grid -->
        <section class="media-content-section">
            <div class="container">
                <div class="section-header">
                    <span class="section-label">Tilgjengelige Serier</span>
                    <h2 class="section-title">Bibelstudier</h2>
                    <p class="section-description">
                        <?php the_content(); ?>
                    </p>
                </div>

                <div class="media-grid" id="teaching-grid">
                    <!-- Content loaded dynamically via teaching-loader.js -->
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="cta-section">
            <div class="container text-center">
                <div class="cta-content">
                    <h2>Begynn Din Bibelstudierejse</h2>
                    <p>Bli med oss og dykk dypere inn i Guds ord. Alle studier er gratis og tilgjengelige når som helst.</p>
                    <div class="cta-buttons" style="display: flex; justify-content: center; gap: 20px; margin-top: 30px;">
                        <a href="<?php echo site_url('/media'); ?>" class="btn btn-primary">Se alle ressurser</a>
                        <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary">Kontakt oss</a>
                    </div>
                </div>
            </div>
        </section>

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                if (typeof loadTeachingCategory === 'function') {
                    loadTeachingCategory('Bibelstudier', 'teaching-grid', '.section-title', 'Bibelstudier');
                }
            });
        </script>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>