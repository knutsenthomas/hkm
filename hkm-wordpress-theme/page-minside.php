<?php
/**
 * Template Name: Min Side
 */

get_header(); ?>

<main class="min-side-container">
    <?php while (have_posts()):
        the_post(); ?>
        <section class="section" style="padding-top: 120px;">
            <div class="container">
                <h1 class="page-title mb-8">
                    <?php the_title(); ?> (WP Template)
                </h1>

                <div id="user-info-container" class="bg-gray-50 p-8 rounded-2xl border border-gray-100 mb-8">
                    <!-- Dynamic user info loaded via Firebase -->
                    <div class="loader"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="card p-6 bg-white shadow-sm rounded-xl">
                        <h3 class="text-xl font-bold mb-4">Mine Gaver</h3>
                        <p class="text-gray-600">Oversikt over dine faste avtaler og enkeltgaver.</p>
                        <a href="<?php echo site_url('/donasjoner'); ?>" class="btn btn-outline btn-sm mt-4">Gi en ny
                            gave</a>
                    </div>
                    <div class="card p-6 bg-white shadow-sm rounded-xl">
                        <h3 class="text-xl font-bold mb-4">Innstillinger</h3>
                        <p class="text-gray-600">Endre dine personopplysninger og preferanser.</p>
                        <a href="/minside/profil" class="btn btn-outline btn-sm mt-4">Rediger profil</a>
                    </div>
                </div>
            </div>
        </section>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>