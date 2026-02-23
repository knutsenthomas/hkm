<?php get_header(); ?>

<main>
    <section class="page-hero"
        style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1520699918507-3c3e05c46b90?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
        <div class="container">
            <h1 class="page-hero-title">404 - Siden finnes ikke</h1>
            <p class="page-hero-subtitle">Beklager, vi finner ikke siden du leter etter.</p>
        </div>
    </section>

    <section class="section" style="padding: 80px 0; text-align: center;">
        <div class="container">
            <p>Kanskje du vil gå tilbake til <a href="<?php echo home_url(); ?>"
                    style="color: var(--primary-orange); text-decoration: underline;">forsiden</a>?</p>

            <div style="margin-top: 40px;">
                <h3>Søk på nettsiden</h3>
                <?php get_search_form(); ?>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>