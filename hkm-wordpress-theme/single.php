<?php get_header(); ?>

<?php if (have_posts()):
    while (have_posts()):
        the_post(); ?>

        <!-- Blog Post Hero -->
        <section class="page-hero relative" id="blog-hero"
            style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('<?php echo has_post_thumbnail() ? get_the_post_thumbnail_url(null, 'full') : 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'; ?>'); padding-top: 180px; margin-top: 0;">
            <div class="container">
                <h1 class="page-hero-title">
                    <?php the_title(); ?>
                </h1>
                <div class="blog-meta"
                    style="display: flex; gap: 20px; justify-content: center; color: white; margin-top: 20px; flex-wrap: wrap;">
                    <span><i class="far fa-calendar"></i>
                        <?php echo get_the_date(); ?>
                    </span>
                    <span><i class="far fa-user"></i>
                        <?php the_author(); ?>
                    </span>
                    <span><i class="fas fa-tag"></i>
                        <?php echo get_the_category_list(', '); ?>
                    </span>
                </div>
            </div>
        </section>

        <!-- Blog Post Content -->
        <section class="section" style="padding: 40px 20px 80px 20px;">
            <div class="container" style="max-width: 800px;">
                <article class="blog-post-content">
                    <?php the_content(); ?>
                </article>

                <!-- Tags -->
                <div class="post-tags" style="margin-top: 40px;">
                    <?php the_tags('<span class="tag"><i class="fas fa-hashtag"></i> ', '</span><span class="tag"><i class="fas fa-hashtag"></i> ', '</span>'); ?>
                </div>

                <!-- Share Section -->
                <div class="blog-share" style="border-top: 1px solid #eee; padding-top: 30px; margin-top: 50px;">
                    <h4>Del dette innlegget</h4>
                    <div style="display: flex; gap: 15px; margin-top: 15px;">
                        <a href="#" class="social-link" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href), 'facebook-share-dialog', 'width=800,height=600'); return false;"
                            style="background: #3b5998; color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%;"><i
                                class="fab fa-facebook-f"></i></a>
                        <a href="#" class="social-link" onclick="window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title), 'twitter-share-dialog', 'width=800,height=600'); return false;"
                            style="background: #000000; color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%;"><svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 0 512 512" fill="white"><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"/></svg></a>
                        <a href="#" class="social-link" onclick="window.open('https://www.linkedin.com/shareArticle?mini=true&url=' + encodeURIComponent(window.location.href) + '&title=' + encodeURIComponent(document.title), 'linkedin-share-dialog', 'width=800,height=600'); return false;"
                            style="background: #0077b5; color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%;"><i
                                class="fab fa-linkedin-in"></i></a>
                        <a href="https://instagram.com" target="_blank" class="social-link"
                            style="background: #E1306C; color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%;"><i
                                class="fab fa-instagram"></i></a>
                        <a href="#" class="social-link" onclick="window.print(); return false;"
                            style="background: #6c757d; color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%;" title="Skriv ut"><i
                                class="fas fa-print"></i></a>
                        <a href="#" class="social-link" onclick="if(navigator.share) { navigator.share({title: document.title, url: window.location.href}).catch(console.error); } else { alert('Deling er ikke støttet på denne enheten.'); } return false;"
                            style="background: #f39c12; color: white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%;" title="Del med app"><i
                                class="fas fa-share-nodes"></i></a>
            </div>
                </div>

                
            <!-- Related Posts Container -->
            <div id="single-post-related" style="margin-top: 60px; display: none;">
                <!-- Content injected by JS -->
            </div>

            <div class="blog-navigation"

                    style="display: flex; justify-content: space-between; margin-top: 60px; padding-top: 30px; border-top: 1px solid #eee;">
                    <a href="<?php echo get_post_type_archive_link('post'); ?>" class="btn btn-outline"><i
                            class="fas fa-arrow-left" style="margin-right: 12px;"></i> Tilbake til blogg</a>
                </div>
            </div>
        </section>

    <?php endwhile; endif; ?>

<?php get_footer(); ?>