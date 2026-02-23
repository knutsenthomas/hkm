<?php
/**
 * The template for displaying all single arrangements
 */

get_header(); ?>

<main class="event-details-layout">
    <?php while (have_posts()):
        the_post(); ?>
        <!-- Page Hero -->
        <section class="page-hero subpage-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('<?php echo get_the_post_thumbnail_url(null, 'full') ?: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1600&q=80'; ?>');">
            <div class="page-hero-content">
                <h1 id="hero-title">
                    <?php the_title(); ?>
                </h1>
                <nav class="hero-breadcrumbs">
                    <a href="<?php echo home_url(); ?>">Hjem</a>
                    <span class="separator">/</span>
                    <a href="<?php echo site_url('/arrangementer'); ?>">Arrangementer</a>
                    <span class="separator">/</span>
                    <span class="current">
                        <?php the_title(); ?>
                    </span>
                </nav>
            </div>
        </section>

        <!-- Main Layout -->
        <div class="container event-container" style="padding: 100px 0;">
            <!-- Sidebar (Left) -->
            <aside class="sidebar-left">
                <!-- Search -->
                <div class="sidebar-widget search-widget">
                    <h3 class="widget-title">Søk</h3>
                    <form class="search-form" action="<?php echo home_url('/'); ?>" method="get">
                        <input type="text" name="s" placeholder="Søk i arrangementer...">
                        <input type="hidden" name="post_type" value="arrangement">
                        <button type="submit"><i class="fas fa-search"></i></button>
                    </form>
                </div>

                <!-- Contact Info Widget -->
                <div class="sidebar-widget contact-widget">
                    <h3 class="widget-title">Spørsmål?</h3>
                    <p style="font-size: 15px; color: #666; margin-bottom: 20px;">Kontakt oss hvis du lurer på noe angående
                        arrangementet.</p>
                    <div style="font-size: 15px; color: #121212;">
                        <p><i class="fas fa-envelope" style="color:#F15A24; margin-right: 10px;"></i>
                            post@hiskingdomministry.no</p>
                        <p><i class="fas fa-phone-alt" style="color:#F15A24; margin-right: 10px;"></i> +47 930 94 615</p>
                    </div>
                </div>
            </aside>

            <!-- Content Area (Right) -->
            <div class="main-content-right">
                <!-- Main Image -->
                <?php if (has_post_thumbnail()): ?>
                    <div class="event-large-image-wrap">
                        <?php the_post_thumbnail('full'); ?>
                    </div>
                <?php endif; ?>

                <!-- Event Details Header -->
                <div class="event-detail-header">
                    <h2 class="event-main-title">
                        <?php the_title(); ?>
                    </h2>

                    <div class="event-description">
                        <?php the_content(); ?>
                    </div>

                    <!-- Registration CTA -->
                    <div class="registration-footer"
                        style="background: #F9F9F9; padding: 40px; border-radius: 12px; margin-top: 40px; display: flex; justify-content: space-between; align-items: center;">
                        <div class="footer-cta-text">
                            <h3 style="font-size: 24px; margin-bottom: 10px;">Bli med oss!</h3>
                            <p style="color: #777; margin: 0;">Sikre deg plass på dette arrangementet i dag.</p>
                        </div>
                        <a href="<?php echo site_url('/kontakt'); ?>" class="btn-register"
                            style="background: #F15A24; color: white; padding: 16px 45px; border-radius: 30px; font-size: 17px; font-weight: 700; text-decoration: none;">Meld
                            deg på nå</a>
                    </div>
                </div>
            </div>
        </div>
    <?php endwhile; ?>
</main>

<?php get_footer(); ?>