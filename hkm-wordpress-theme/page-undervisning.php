<?php
/**
 * Template Name: Undervisning
 */

get_header(); ?>

<!-- Page Hero -->
<section class="page-hero"
    style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
    <div class="container">
        <h1 class="page-hero-title">Undervisning</h1>
        <p class="page-hero-subtitle">Dyptgående bibelundervisning</p>
        <div style="margin-top: 20px;">
            <a href="<?php echo site_url('/media'); ?>" class="btn btn-outline btn-sm">
                <i class="fas fa-arrow-left"></i> Tilbake til Media
            </a>
        </div>
    </div>
</section>

<!-- Teaching Resources Grid -->
<section class="media-content-section" style="padding: 100px 0;">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Ressurser</span>
            <h2 class="section-title">Utforsk vår undervisning</h2>
            <p class="section-description">Velg en kategori for å utforske våre ulike undervisningsressurser.</p>
        </div>

        <div class="teaching-grid"
            style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 50px;">
            <div class="teaching-card"
                style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; transition: transform 0.3s ease;">
                <div class="teaching-icon"
                    style="width: 80px; height: 80px; background: rgba(255,107,53,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; color: var(--primary-color); font-size: 30px;">
                    <i class="fas fa-book-bible"></i>
                </div>
                <h3 class="teaching-title" style="margin-bottom: 15px; font-size: 24px;">Bibelstudier</h3>
                <p class="teaching-description" style="color: var(--text-muted); margin-bottom: 25px;">Systematiske
                    studier gjennom Bibelens bøker med dyptgående forklaringer.</p>
                <a href="<?php echo site_url('/bibelstudier'); ?>" class="btn btn-primary">Utforsk</a>
            </div>

            <div class="teaching-card"
                style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; transition: transform 0.3s ease;">
                <div class="teaching-icon"
                    style="width: 80px; height: 80px; background: rgba(255,107,53,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; color: var(--primary-color); font-size: 30px;">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h3 class="teaching-title" style="margin-bottom: 15px; font-size: 24px;">Seminarer</h3>
                <p class="teaching-description" style="color: var(--text-muted); margin-bottom: 25px;">Opptak fra våre
                    seminarer og konferanser om ulike temaer.</p>
                <a href="<?php echo site_url('/seminarer'); ?>" class="btn btn-primary">Utforsk</a>
            </div>

            <div class="teaching-card"
                style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; transition: transform 0.3s ease;">
                <div class="teaching-icon"
                    style="width: 80px; height: 80px; background: rgba(255,107,53,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; color: var(--primary-color); font-size: 30px;">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <h3 class="teaching-title" style="margin-bottom: 15px; font-size: 24px;">Undervisningsserier</h3>
                <p class="teaching-description" style="color: var(--text-muted); margin-bottom: 25px;">Tematiske
                    undervisningsserier om viktige kristne emner.</p>
                <a href="<?php echo site_url('/undervisningsserier'); ?>" class="btn btn-primary">Utforsk</a>
            </div>
        </div>
    </div>
</section>

<?php get_footer(); ?>