<?php get_header(); ?>

<?php if (have_posts()):
    while (have_posts()):
        the_post(); ?>

        <!-- Page Hero (Default) -->
        <section class="page-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo has_post_thumbnail() ? get_the_post_thumbnail_url(null, 'full') : 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>');">
            <div class="container">
                <h1 class="page-hero-title">
                    <?php the_title(); ?>
                </h1>
            </div>
        </section>

        <!-- Page Content -->
        <section class="section" style="padding: 80px 0;">
            <div class="container">
                <div class="page-content">
                    <?php the_content(); ?>
                </div>
            </div>
        </section>

    <?php endwhile; endif; ?>

<?php get_footer(); ?>