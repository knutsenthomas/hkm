<?php get_header(); ?>

<main>
    <section class="page-hero"
        style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');">
        <div class="container">
            <h1 class="page-hero-title">Søkeresultater for:
                <?php echo get_search_query(); ?>
            </h1>
        </div>
    </section>

    <section class="section" style="padding: 80px 0;">
        <div class="container">
            <?php if (have_posts()): ?>
                <div class="blog-grid">
                    <?php while (have_posts()):
                        the_post(); ?>
                        <article class="blog-card">
                            <div class="blog-image">
                                <?php if (has_post_thumbnail()): ?>
                                    <img src="<?php the_post_thumbnail_url('medium'); ?>" alt="<?php the_title(); ?>">
                                <?php else: ?>
                                    <div
                                        style="width:100%; height:200px; background:#f0f0f0; display:flex; align-items:center; justify-content:center;">
                                        <i class="fas fa-image" style="font-size:40px; color:#ccc;"></i>
                                    </div>
                                <?php endif; ?>
                            </div>
                            <div class="blog-content">
                                <h3 class="blog-title"><a href="<?php the_permalink(); ?>">
                                        <?php the_title(); ?>
                                    </a></h3>
                                <p class="blog-excerpt">
                                    <?php echo wp_trim_words(get_the_excerpt(), 20); ?>
                                </p>
                                <a href="<?php the_permalink(); ?>" class="blog-link">Les mer <i
                                        class="fas fa-arrow-right"></i></a>
                            </div>
                        </article>
                    <?php endwhile; ?>
                </div>

                <div class="pagination" style="display: flex; justify-content: center; gap: 10px; margin-top: 50px;">
                    <?php
                    the_posts_pagination(array(
                        'mid_size' => 2,
                        'prev_text' => '<i class="fas fa-chevron-left"></i>',
                        'next_text' => '<i class="fas fa-chevron-right"></i>',
                    ));
                    ?>
                </div>

            <?php else: ?>
                <div style="text-align: center;">
                    <p>Ingen resultater funnet. Prøv et annet søkeord.</p>
                    <div style="margin-top: 30px; max-width: 500px; margin-left: auto; margin-right: auto;">
                        <?php get_search_form(); ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </section>
</main>

<?php get_footer(); ?>