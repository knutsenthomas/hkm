<?php get_header(); ?>

<main>
    <!-- Page Hero -->
    <section class="page-hero"
        style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1499750310159-5b600aaf0320?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
        <div class="container">
            <h1 class="page-hero-title">
                <?php single_post_title(); ?>
            </h1>
            <p class="page-hero-subtitle">Hold deg oppdatert på hva som skjer i His Kingdom Ministry.</p>
        </div>
    </section>

    <!-- Blog Posts List -->
    <section class="blog-page section">
        <div class="container">
            <div class="section-header">
                <span class="section-label">Våre Historier</span>
                <h2 class="section-title">Siste fra bloggen</h2>
                <p class="section-description">Her deler vi undervisning, vitnesbyrd og rapporter fra vårt arbeid både
                    nasjonalt og internasjonalt.</p>
            </div>

            <div class="blog-grid">
                <?php if (have_posts()):
                    while (have_posts()):
                        the_post(); ?>
                        <article class="blog-card">
                            <div class="blog-image">
                                <?php if (has_post_thumbnail()): ?>
                                    <img src="<?php the_post_thumbnail_url('medium_large'); ?>" alt="<?php the_title(); ?>">
                                <?php else: ?>
                                    <img src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=400&fit=crop"
                                        alt="Blogginnlegg">
                                <?php endif; ?>
                                <span class="blog-category">
                                    <?php echo get_the_category_list(', '); ?>
                                </span>
                            </div>
                            <div class="blog-content">
                                <div class="blog-meta">
                                    <span><i class="fas fa-calendar"></i>
                                        <?php echo get_the_date(); ?>
                                    </span>
                                    <span><i class="fas fa-user"></i>
                                        <?php the_author(); ?>
                                    </span>
                                </div>
                                <h3 class="blog-title">
                                    <?php the_title(); ?>
                                </h3>
                                <p class="blog-excerpt">
                                    <?php echo wp_trim_words(get_the_excerpt(), 20); ?>
                                </p>
                                <a href="<?php the_permalink(); ?>" class="blog-link">Les mer <i
                                        class="fas fa-arrow-right"></i></a>
                            </div>
                        </article>
                    <?php endwhile; else: ?>
                    <p>Ingen innlegg funnet.</p>
                <?php endif; ?>
            </div>

            <!-- Pagination -->
            <div class="pagination" style="display: flex; justify-content: center; gap: 10px; margin-top: 50px;">
                <?php
                the_posts_pagination(array(
                    'mid_size' => 2,
                    'prev_text' => '<i class="fas fa-chevron-left"></i>',
                    'next_text' => '<i class="fas fa-chevron-right"></i>',
                ));
                ?>
            </div>
        </div>
    </section>
</main>

<?php get_footer(); ?>