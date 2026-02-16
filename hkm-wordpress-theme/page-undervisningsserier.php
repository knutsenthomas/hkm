<?php
/**
 * Template Name: Undervisningsserier
 */

get_header(); ?>

<!-- Page Hero -->
<section class="page-hero" style="padding-top: 160px;">
    <div class="container">
        <h1 class="page-hero-title">
            <?php the_title(); ?>
        </h1>
        <p class="page-hero-subtitle">Tematiske undervisningsserier om viktige kristne emner</p>
        <div style="margin-top: 20px;">
            <a href="<?php echo site_url('/undervisning'); ?>" class="btn btn-outline btn-sm">
                <i class="fas fa-arrow-left"></i> Tilbake til Undervisning
            </a>
        </div>
    </div>
</section>

<!-- Teaching Series Grid -->
<section class="media-content-section">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Tilgjengelige Serier</span>
            <h2 class="section-title">Undervisningsserier</h2>
            <p class="section-description">Dyptgående undervisning om sentrale kristne temaer</p>
        </div>

        <div class="media-grid" id="teaching-grid">
            <!-- Content loaded dynamically -->
            <div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <div class="loader"></div>
                <p style="margin-top: 15px; color: var(--text-muted);">Henter serier...</p>
            </div>
        </div>
    </div>
</section>

<!-- CTA Section -->
<section class="cta-section">
    <div class="container">
        <div class="cta-content" style="text-align: center;">
            <h2>Start Din Læringsreise</h2>
            <p>Alle våre undervisningsserier er gratis og tilgjengelige. Voks i din tro sammen med oss!</p>
            <div class="cta-buttons" style="margin-top: 30px; display: flex; justify-content: center; gap: 15px;">
                <a href="<?php echo site_url('/media'); ?>" class="btn btn-primary">Se alle ressurser</a>
                <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary">Kontakt oss</a>
            </div>
        </div>
    </div>
</section>

<script>
    // Load teaching content by category
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof loadTeachingCategory === 'function') {
            loadTeachingCategory('Undervisningsserier', 'teaching-grid', '.section-title', 'Undervisningsserier');
        }
    });
</script>

<?php get_footer(); ?>