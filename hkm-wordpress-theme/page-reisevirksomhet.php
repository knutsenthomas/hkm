<?php
/**
 * Template Name: Reisevirksomhet
 */

get_header(); ?>

<main>
    <?php while (have_posts()):
        the_post(); ?>
        <!-- Page Hero -->
        <section class="page-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo get_the_post_thumbnail_url(null, 'full') ?: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>');">
            <div class="container text-center">
                <h1 class="page-hero-title">
                    <?php the_title(); ?>
                </h1>
                <p class="page-hero-subtitle">Vi kommer gjerne til deres menighet eller organisasjon</p>
            </div>
        </section>

        <!-- Content -->
        <section class="section" style="background: white;">
            <div class="container">
                <div class="max-w-4xl mx-auto">
                    <?php the_content(); ?>

                    <?php if (empty(get_the_content())): ?>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 mb-20 text-center">
                            <div class="p-6">
                                <i class="fas fa-microphone fa-3x text-primary-orange mb-4"></i>
                                <h4 class="text-xl font-bold mb-2">Forkynnelse</h4>
                                <p class="text-gray-600">Inspirerende og bibeltro forkynnelse som utfordrer og bygger opp.</p>
                            </div>
                            <div class="p-6">
                                <i class="fas fa-book-open fa-3x text-primary-orange mb-4"></i>
                                <h4 class="text-xl font-bold mb-2">Seminarer</h4>
                                <p class="text-gray-600">Dypdykk i spesifikke temaer over en helg eller kveld.</p>
                            </div>
                            <div class="p-6">
                                <i class="fas fa-hands-helping fa-3x text-primary-orange mb-4"></i>
                                <h4 class="text-xl font-bold mb-2">Veiledning</h4>
                                <p class="text-gray-600">Samtaler og veiledning for lederskap og menighetsutvikling.</p>
                            </div>
                        </div>

                        <div
                            class="bg-gray-50 p-12 rounded-[2rem] border border-gray-100 flex flex-col md:flex-row items-center gap-10">
                            <div class="md:w-1/2">
                                <h3 class="text-3xl font-bold mb-4">Book et besøk</h3>
                                <p class="text-gray-600 text-lg mb-6">Vi reiser over hele landet og er åpne for forespørsler fra
                                    ulike kristne sammenhenger.</p>
                                <a href="<?php echo site_url('/kontakt'); ?>" class="btn btn-primary">Send forespørsel</a>
                            </div>
                            <div class="md:w-1/2">
                                <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                                    alt="Preaching" class="rounded-2xl shadow-xl">
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>