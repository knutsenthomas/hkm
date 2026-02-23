<?php
/**
 * Template Name: Podcast
 */

get_header(); ?>

<!-- Page Hero -->
<section class="page-hero subpage-hero" data-content-key="hero.backgroundImage"
    style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1478737270239-2f02b77ac6d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
    <div>
        <h1 class="page-hero-title" data-content-key="hero.title">
            <?php the_title(); ?>
        </h1>
        <p class="page-hero-subtitle" data-content-key="hero.subtitle">Lytt til våre samtaler</p>
        <div style="margin-top: 20px;">
            <a href="<?php echo site_url('/media'); ?>" class="btn btn-outline btn-sm">
                <i class="fas fa-arrow-left"></i> Tilbake til Media
            </a>
        </div>
    </div>
</section>

<!-- Podcast Content -->
<section class="media-content-section">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Episodearkiv</span>
            <h2 class="section-title">Alle episoder</h2>
            <p class="section-description">Her kan du høre på alle våre podcast-episoder direkte i nettleseren.</p>
        </div>

        <!-- Podcast Filters & Sorting -->
        <div class="podcast-controls"
            style="margin-bottom: 40px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 20px;">
            <div id="podcast-categories" class="youtube-categories"
                style="margin-bottom: 0; display: flex; flex-wrap: wrap; gap: 12px;">
                <button class="category-btn active" data-filter="all">Alle</button>
                <button class="category-btn" data-filter="tro">Tro</button>
                <button class="category-btn" data-filter="bibel">Bibel</button>
                <button class="category-btn" data-filter="bønn">Bønn</button>
                <button class="category-btn" data-filter="undervisning">Undervisning</button>
            </div>

            <div class="podcast-sort" style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 0.9rem; color: var(--text-light); font-weight: 600;">Sorter etter:</span>
                <select id="podcast-sort-select"
                    style="padding: 8px 15px; border-radius: 20px; border: 2px solid var(--border-color); background: white; font-family: inherit; font-size: 0.9rem; color: var(--text-dark); outline: none; cursor: pointer;">
                    <option value="newest">Nyeste først</option>
                    <option value="oldest">Eldste først</option>
                </select>
            </div>
        </div>

        <div class="podcast-grid" id="podcast-grid">
            <!-- Podcast episodes will be loaded here dynamically -->
            <div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <div class="loader"></div>
                <p style="margin-top: 15px; color: var(--text-muted);">Henter podcast-episoder...</p>
            </div>
        </div>

        <div class="section-footer" style="margin-top: 50px;">
            <div class="footer-flex">
                <h3 style="margin-bottom: 0; text-align: center;">Lytt på din favoritt-plattform</h3>
                <div class="podcast-platforms" id="podcast-links-container">
                    <a href="https://open.spotify.com/show/3gk4nt7v5hy6yGB4k1QYGU?si=021c69679bdd49ac"
                        class="platform-link platform-spotify" title="Spotify" target="_blank"
                        rel="noopener noreferrer"><i class="fab fa-spotify"></i></a>
                    <a href="https://podcasts.apple.com/us/podcast/tro-og-liv/id1753117158"
                        class="platform-link platform-apple" title="Apple Podcasts" target="_blank"
                        rel="noopener noreferrer"><i class="fas fa-podcast"></i></a>
                    <a href="https://www.youtube.com/playlist?list=PL7aC7oqEJFeXLnkmFQzPOOvWcnAIfjTGv"
                        class="platform-link platform-youtube" title="YouTube" target="_blank"
                        rel="noopener noreferrer"><i class="fab fa-youtube"></i></a>
                </div>
            </div>
        </div>
    </div>
</section>

<?php get_footer(); ?>