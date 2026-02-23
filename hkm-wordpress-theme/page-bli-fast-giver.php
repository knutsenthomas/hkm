<?php
/**
 * Template Name: Bli fast giver
 */

get_header(); ?>

<main>
    <?php while (have_posts()):
        the_post(); ?>
        <!-- Page Hero -->
        <section class="page-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo get_the_post_thumbnail_url(null, 'full') ?: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>');">
            <div class="container">
                <h1 class="page-hero-title">
                    <?php the_title(); ?>
                </h1>
                <p class="page-hero-subtitle">Vær med å gjøre en forskjell hver eneste måned</p>
            </div>
        </section>

        <!-- Main Content -->
        <section class="section" style="background: white;">
            <div class="container max-w-4xl">
                <div class="prose prose-lg mx-auto">
                    <?php the_content(); ?>

                    <!-- Manual Fallback/Hardcoded content if WP content is empty -->
                    <?php if (empty(get_the_content())): ?>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
                            <!-- Vipps Fast Giver -->
                            <div
                                class="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                                <div class="w-16 h-16 bg-[#ff5b24] rounded-full flex items-center justify-center mb-6">
                                    <i class="fas fa-mobile-alt text-white text-2xl"></i>
                                </div>
                                <h3 class="text-2xl font-bold mb-4">Vipps</h3>
                                <p class="text-gray-600 mb-8">Den enkleste måten å bli fast giver på. Opprett en fast avtale
                                    direkte i Vipps-appen.</p>
                                <a href="https://vipps.no" target="_blank" class="btn btn-primary w-full">Opprett i Vipps</a>
                            </div>

                            <!-- Bankoverføring -->
                            <div
                                class="bg-gray-50 p-8 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                                <div class="w-16 h-16 bg-primary-orange rounded-full flex items-center justify-center mb-6">
                                    <i class="fas fa-university text-white text-2xl"></i>
                                </div>
                                <h3 class="text-2xl font-bold mb-4">AvtaleGiro</h3>
                                <p class="text-gray-600 mb-8">Opprett en fast overføring i nettbanken din til vår gavekonto.</p>
                                <div class="bg-white p-4 rounded-lg w-full text-left">
                                    <p class="text-sm text-gray-500 uppercase font-semibold">Kontonummer</p>
                                    <p class="text-lg font-mono font-bold">3000.66.08759</p>
                                </div>
                            </div>
                        </div>

                        <div class="mt-16 p-8 bg-primary-orange/5 rounded-2xl border border-primary-orange/20 text-center">
                            <h3 class="text-2xl font-bold mb-4 text-text-dark">Hvorfor bli fast giver?</h3>
                            <p class="text-gray-700 max-w-2xl mx-auto italic">"Ditt faste bidrag gir oss forutsigbarhet til å
                                planlegge langsiktig misjonsarbeid, produsere mer undervisning og nå lenger ut med evangeliet."
                            </p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>