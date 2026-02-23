<?php
/**
 * Template Name: Seminarer
 */

get_header(); ?>

<main>
    <?php while (have_posts()):
        the_post(); ?>
        <!-- Page Hero -->
        <section class="page-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo get_the_post_thumbnail_url(null, 'full') ?: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>');">
            <div class="container">
                <h1 class="page-hero-title">
                    <?php the_title(); ?>
                </h1>
                <p class="page-hero-subtitle">Bli utrustet gjennom våre seminarer</p>
                <div style="margin-top: 20px;">
                    <a href="<?php echo site_url('/undervisning'); ?>" class="btn btn-outline btn-sm">
                        <i class="fas fa-arrow-left"></i> Tilbake til Undervisning
                    </a>
                </div>
            </div>
        </section>

        <!-- Seminar Grid -->
        <section class="media-content-section">
            <div class="container">
                <div class="section-header">
                    <span class="section-label">Tilgjengelige Seminarer</span>
                    <h2 class="section-title">Våre seminarer</h2>
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
                    <h2>Vil du ha et seminar i din menighet?</h2>
                    <p>Vi reiser gjerne ut for å holde seminarer om ulike temaer.</p>
                    <div class="cta-buttons" style="display: flex; justify-content: center; gap: 20px; margin-top: 30px;">
                        <a href="<?php echo site_url('/reisevirksomhet'); ?>" class="btn btn-primary">Mer om
                            reisevirksomhet</a>
                        <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary">Kontakt oss</a>
                    </div>
                </div>
            </div>
        </section>

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                if (typeof loadTeachingCategory === 'function') {
                    loadTeachingCategory('Seminarer', 'teaching-grid', '.section-title', 'Seminarer');
                }
            });
        </script>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>