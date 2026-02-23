<?php
/*
Template Name: Media
*/
get_header();
?>

<!-- Page Hero -->
<section class="page-hero"
    style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1478737270239-2f02b77ac6d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
    <div class="container">
        <h1 class="page-hero-title">
            <?php the_title(); ?>
        </h1>
        <p class="page-hero-subtitle">Utforsk våre videoer, podcaster og annet innhold</p>
    </div>
</section>

<!-- Media Filter Tabs -->
<section class="media-tabs-section">
    <div class="container">
        <div class="media-tabs">
            <a href="<?php echo site_url('/media'); ?>" class="media-tab active">
                <i class="fas fa-th"></i>
                Alle
            </a>
            <a href="<?php echo site_url('/media/youtube'); ?>" class="media-tab">
                <i class="fab fa-youtube"></i>
                YouTube
            </a>
            <a href="<?php echo site_url('/media/podcast'); ?>" class="media-tab">
                <i class="fas fa-podcast"></i>
                Podcast
            </a>
            <a href="<?php echo site_url('/media/undervisning'); ?>" class="media-tab">
                <i class="fas fa-book-open"></i>
                Undervisning
            </a>
        </div>
    </div>
</section>

<!-- YouTube Section -->
<section class="media-content-section" id="youtube-section">
    <div class="container">
        <div class="section-header">
            <span class="section-label">YouTube</span>
            <h2 class="section-title">Siste videoer</h2>
            <p class="section-description">Se våre nyeste videoer og undervisninger</p>
        </div>

        <div class="media-grid" id="youtube-grid">
            <!-- YouTube videos will be loaded here dynamisk -->
            <div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <div class="loader"></div>
                <p style="margin-top: 15px; color: var(--text-muted);">Henter videoer fra YouTube...</p>
            </div>
        </div>

        <div class="section-footer" style="text-align: center; margin-top: 50px;">
            <a href="<?php echo site_url('/media/youtube'); ?>" class="btn btn-primary">
                <i class="fab fa-youtube"></i> Se alle videoer
            </a>
        </div>
    </div>
</section>

<!-- Podcast Section -->
<section class="media-content-section podcast-section" id="podcast-section">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Podcast</span>
            <h2 class="section-title">Siste episoder</h2>
            <p class="section-description">Lytt til våre podcaster om tro, liv og åndelig vekst</p>
        </div>

        <div class="podcast-grid" id="podcast-grid">
            <!-- Podcast episodes will be loaded here dynamisk -->
            <div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 50px;">
                <div class="loader"></div>
                <p style="margin-top: 15px; color: var(--text-muted);">Henter podcast-episoder...</p>
            </div>
        </div>

        <div class="section-footer" style="margin-top: 50px;">
            <div class="footer-flex">
                <a href="<?php echo site_url('/media/podcast'); ?>" class="btn btn-primary">
                    <i class="fas fa-podcast"></i> Se alle episoder
                </a>
                <div class="podcast-platforms">
                    <a href="https://open.spotify.com/show/3gk4nt7v5hy6yGB4k1QYGU?si=021c69679bdd49ac" target="_blank"
                        class="platform-link platform-spotify" title="Spotify" rel="noopener noreferrer">
                        <i class="fab fa-spotify"></i>
                    </a>
                    <a href="https://podcasts.apple.com/us/podcast/tro-og-liv/id1753117158" target="_blank"
                        class="platform-link platform-apple" title="Apple Podcasts" rel="noopener noreferrer">
                        <i class="fas fa-podcast"></i>
                    </a>
                    <a href="https://www.youtube.com/playlist?list=PL7aC7oqEJFeXLnkmFQzPOOvWcnAIfjTGv"
                        class="platform-link platform-youtube" title="YouTube" target="_blank"
                        rel="noopener noreferrer">
                        <i class="fab fa-youtube"></i>
                    </a>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Teaching Resources Section -->
<section class="media-content-section teaching-section" id="teaching-section">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Undervisning</span>
            <h2 class="section-title">Undervisningsressurser</h2>
            <p class="section-description">Dyptgående bibelstudier og undervisningsserier</p>
            <div style="margin-top: 20px;">
                <a href="<?php echo site_url('/media/undervisning'); ?>" class="btn btn-outline btn-sm">Se alle
                    ressurser</a>
            </div>
        </div>

        <div class="teaching-grid">
            <div class="teaching-card" data-category="Bibelstudier">
                <div class="teaching-icon">
                    <i class="fas fa-book-bible"></i>
                </div>
                <h3 class="teaching-title">Bibelstudier</h3>
                <p class="teaching-description">Systematiske studier gjennom Bibelens bøker med dyptgående
                    forklaringer.</p>
                <span class="teaching-count" data-count="bibelstudier">12 serier tilgjengelig</span>
                <a href="<?php echo site_url('/media/undervisning/bibelstudier'); ?>"
                    class="btn btn-outline btn-sm">Utforsk</a>
            </div>

            <div class="teaching-card" data-category="Seminarer">
                <div class="teaching-icon">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h3 class="teaching-title">Seminarer</h3>
                <p class="teaching-description">Opptak fra våre seminarer og konferanser om ulike temaer.</p>
                <span class="teaching-count" data-count="seminarer">8 seminarer tilgjengelig</span>
                <a href="<?php echo site_url('/media/undervisning/seminarer'); ?>"
                    class="btn btn-outline btn-sm">Utforsk</a>
            </div>

            <div class="teaching-card" data-category="Undervisningsserier">
                <div class="teaching-icon">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <h3 class="teaching-title">Undervisningsserier</h3>
                <p class="teaching-description">Tematiske undervisningsserier om viktige kristne emner.</p>
                <span class="teaching-count" data-count="undervisningsserier">15 serier tilgjengelig</span>
                <a href="<?php echo site_url('/media/undervisning/undervisningsserier'); ?>"
                    class="btn btn-outline btn-sm">Utforsk</a>
            </div>
        </div>
    </div>
</section>

<!-- Newsletter CTA -->
<section class="media-newsletter">
    <div class="container">
        <div class="newsletter-content">
            <i class="fas fa-bell newsletter-icon"></i>
            <h2>Få Varsler om Nytt Innhold</h2>
            <p>Abonner på vårt nyhetsbrev og få beskjed når vi publiserer nye videoer, podcaster og undervisning.
            </p>
            <form class="newsletter-form">
                <input type="email" placeholder="Din e-postadresse" required>
                <button type="submit" class="btn btn-primary">Abonner</button>
            </form>
        </div>
    </div>
</section>

<!-- Inline Script to Initialize Teaching Counts -->
<script>
    // Load teaching category counts on media.html
    async function loadTeachingCounts() {
        if (typeof firebaseService === 'undefined') return;

        try {
            const teachingData = await firebaseService.getPageContent('collection_teaching');
            if (!teachingData || !teachingData.items) return;

            const categories = {
                'bibelstudier': { name: 'Bibelstudier', label: 'serier' },
                'seminarer': { name: 'Seminarer', label: 'seminarer' },
                'undervisningsserier': { name: 'Undervisningsserier', label: 'serier' }
            };

            // Count items by category and update display
            for (const [key, meta] of Object.entries(categories)) {
                const count = teachingData.items.filter(item =>
                    item.category && item.category.trim().toLowerCase() === meta.name.trim().toLowerCase()
                ).length;

                const countSpan = document.querySelector(`[data-count="${key}"]`);
                if (countSpan) {
                    if (count === 0) {
                        countSpan.textContent = `Ingen ${meta.label} tilgjengelig`;
                    } else if (count === 1) {
                        countSpan.textContent = `1 ${meta.label} tilgjengelig`;
                    } else {
                        countSpan.textContent = `${count} ${meta.label} tilgjengelig`;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading teaching counts:', error);
        }
    }

    // Load counts on page load
    document.addEventListener('DOMContentLoaded', () => {
        loadTeachingCounts();
    });
</script>

<?php get_footer(); ?>