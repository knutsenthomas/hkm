<?php
/**
 * Template Name: For bedrifter
 */

get_header(); ?>

<main>
    <?php while (have_posts()):
        the_post(); ?>
        <!-- Page Hero -->
        <section class="page-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo get_the_post_thumbnail_url(null, 'full') ?: 'https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>');">
            <div class="container text-center">
                <h1 class="page-hero-title">
                    <?php the_title(); ?>
                </h1>
                <p class="page-hero-subtitle">Bli med som næringslivspartner og gjør en forskjell</p>
            </div>
        </section>

        <!-- Content -->
        <section class="section" style="background: white;">
            <div class="container">
                <div class="max-w-4xl mx-auto">
                    <?php the_content(); ?>

                    <?php if (empty(get_the_content())): ?>
                        <div class="text-center mb-16">
                            <span class="section-label">Partnerskap</span>
                            <h2 class="section-title">En strategisk investering</h2>
                            <p class="section-description">Vi tror at Gud ønsker å velsigne bedrifter som har et hjerte for Hans
                                rike. Som bedriftspartner støtter dere direkte vårt arbeid med å nå ut til mennesker.</p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
                            <div class="flex gap-6">
                                <div
                                    class="shrink-0 w-12 h-12 bg-primary-orange/10 rounded-xl flex items-center justify-center">
                                    <i class="fas fa-chart-line text-primary-orange text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="text-xl font-bold mb-2">Målbare resultater</h4>
                                    <p class="text-gray-600">Deres støtte går uavkortet til prosjekter som endrer liv og gir
                                        varige resultater.</p>
                                </div>
                            </div>
                            <div class="flex gap-6">
                                <div
                                    class="shrink-0 w-12 h-12 bg-primary-orange/10 rounded-xl flex items-center justify-center">
                                    <i class="fas fa-handshake text-primary-orange text-xl"></i>
                                </div>
                                <div>
                                    <h4 class="text-xl font-bold mb-2">Felles verdier</h4>
                                    <p class="text-gray-600">Vi bygger partnerskap basert på kristne verdier og ønsket om å se
                                        Guds rike gå frem.</p>
                                </div>
                            </div>
                        </div>

                        <div
                            class="mt-20 p-12 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-10">
                            <div>
                                <h3 class="text-3xl font-bold mb-4">Vil du vite mer?</h3>
                                <p class="text-gray-600 text-lg">Ta kontakt for en uforpliktende prat om hvordan din bedrift kan
                                    bli med.</p>
                            </div>
                            <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary btn-large">Kontakt oss</a>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>