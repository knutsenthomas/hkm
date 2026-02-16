<?php
/**
 * Template Name: YouTube
 */

get_header(); ?>

<!-- Page Hero -->
<section class="page-hero"
    style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
    <div class="container">
        <h1 class="page-hero-title">YouTube</h1>
        <p class="page-hero-subtitle">Se videoundervisning, prekener og mer på vår YouTube-kanal.</p>
        <div style="margin-top: 20px;">
            <a href="<?php echo site_url('/media'); ?>" class="btn btn-outline btn-sm">
                <i class="fas fa-arrow-left"></i> Tilbake til Media
            </a>
        </div>
    </div>
</section>

<!-- YouTube Content -->
<section class="media-content-section">
    <div class="container">
        <div id="youtube-categories" class="youtube-categories"
            style="margin-bottom: 32px; display: flex; flex-wrap: wrap; gap: 12px;"></div>
        <div class="section-header">
            <span class="section-label">Videoarkiv</span>
            <h2 class="section-title">Alle videoer</h2>
            <p class="section-description">Her finner du en oversikt over alt vårt videoinnhold direkte fra YouTube.</p>
        </div>

        <div class="media-grid" id="youtube-grid">
            <!-- YouTube videos will be loaded here dynamically -->
            <div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <div class="loader"></div>
                <p style="margin-top: 15px; color: var(--text-muted);">Henter videoer fra YouTube...</p>
            </div>
        </div>
        <div style="text-align:center; margin-top:24px;">
            <button id="youtube-show-more" class="btn btn-outline" style="display:none; min-width:160px;">Vis
                mer</button>
        </div>

        <div class="section-footer" style="text-align: center; margin-top: 50px;">
            <a href="https://youtube.com/@hiskingdomministry" target="_blank" class="btn btn-primary">
                <i class="fab fa-youtube"></i> Se kanalen vår på YouTube
            </a>
        </div>
    </div>
</section>

<?php get_footer(); ?>