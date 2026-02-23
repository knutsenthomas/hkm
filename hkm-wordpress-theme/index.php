<?php
get_header();
?>

<main class="container py-20">
    <?php
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                <h1 class="text-3xl font-bold mb-4"><?php the_title(); ?></h1>
                <div class="prose max-w-none">
                    <?php the_content(); ?>
                </div>
            </article>
            <?php
        endwhile;
    else :
        ?>
        <p><?php esc_html_e( 'Ingen innhold funnet.', 'hkm-theme' ); ?></p>
        <?php
    endif;
    ?>
</main>

<?php
get_footer();
?>
