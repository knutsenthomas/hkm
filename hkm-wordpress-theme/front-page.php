<?php get_header(); ?>

<!-- Hero Slider (Ingen Utelatt Style) -->
<section class="hero-slider" id="hjem">
    <!-- Slide 1 -->
    <div class="hero-slide active">
        <div class="hero-bg"
            style="background-image: url('https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=1080&fit=crop')">
        </div>
        <div class="container hero-container">
            <div class="hero-content">
                <h1 class="hero-title">Tenk & gi nestekjærlighet.</h1>
                <p class="hero-subtitle">Vi er her for å støtte deg på din åndelige reise. Bli med i et trygt miljø
                    der vi utforsker Guds ord, deler livet og styrker relasjonen til Jesus sammen.</p>
            </div>
        </div>
    </div>

    <!-- Slide 2 -->
    <div class="hero-slide">
        <div class="hero-bg"
            style="background-image: url('https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1920&h=1080&fit=crop')">
        </div>
        <div class="container hero-container">
            <div class="hero-content">
                <h1 class="hero-title">Vekst gjennom felleskap.</h1>
                <p class="hero-subtitle">Uansett hvor du er på din vandring, ønsker vi å gå sammen med deg. Opplev
                    styrken i et levende felleskap som bygger hverandre opp i tro og kjærlighet.</p>
            </div>
        </div>
    </div>

    <!-- Slide 3 -->
    <div class="hero-slide">
        <div class="hero-bg"
            style="background-image: url('https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=1080&fit=crop')">
        </div>
        <div class="container hero-container">
            <div class="hero-content">
                <h1 class="hero-title">Støtt vårt arbeid.</h1>
                <p class="hero-subtitle">Din gave gjør en forskjell for mange. Hjelp oss å nå enda flere mennesker
                    med evangeliet gjennom undervisning, reisevirksomhet og omsorg.</p>
            </div>
        </div>
    </div>

    <!-- Navigation Arrows (Minimalist) -->
    <button class="hero-nav prev"><i class="fas fa-chevron-left"></i></button>
    <button class="hero-nav next"><i class="fas fa-chevron-right"></i></button>
</section>

<!-- Feature Boxes -->
<section class="features">
    <div class="container">
        <div class="features-grid">
            <div class="feature-box">
                <div class="feature-icon blue">
                    <i class="fas fa-book-open"></i>
                </div>
                <h3 class="feature-title">Undervisning</h3>
                <p class="feature-text">Bibelskoler, seminarer og dyptgående undervisning i Guds ord for åndelig vekst.
                </p>
                <a href="<?php echo site_url('/media'); ?>" class="feature-link">Les mer <i
                        class="fas fa-arrow-right"></i></a>
            </div>

            <div class="feature-box">
                <div class="feature-icon yellow">
                    <i class="fas fa-podcast"></i>
                </div>
                <h3 class="feature-title">Podcast</h3>
                <p class="feature-text">Lytt til våre samtaler om tro, liv og åndelig vekst hvor som helst.</p>
                <a href="<?php echo site_url('/podcast'); ?>" class="feature-link">Lytt nå <i
                        class="fas fa-arrow-right"></i></a>
            </div>

            <div class="feature-box">
                <div class="feature-icon red">
                    <i class="fas fa-globe-americas"></i>
                </div>
                <h3 class="feature-title">Reisevirksomhet</h3>
                <p class="feature-text">Forkynnelse og konferanser rundt om i verden for å spre evangeliet.</p>
                <a href="<?php echo site_url('/reisevirksomhet'); ?>" class="feature-link">Oppdag mer <i
                        class="fas fa-arrow-right"></i></a>
            </div>
        </div>
    </div>
</section>

<!-- About Section -->
<section class="about" id="om-oss">
    <div class="container">
        <div class="about-grid">
            <div class="about-image">
                <div class="circular-image">
                    <img src="https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&h=600&fit=crop"
                        alt="Felleskap">
                    <div class="play-button">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
            </div>

            <div class="about-content">
                <span class="section-label">Velkommen til fellesskapet</span>
                <h2 class="section-title">Vi er en non-profit organisasjon</h2>
                <p class="section-text">His Kingdom Ministry driver med åndelig samlinger som bønnemøter,
                    undervisningseminarer, og forkynnende reisevirksomhet. Vi ønsker å være et felleskap der
                    mennesker kan vokse i sin tro og relasjon til Jesus.</p>

                <div class="about-features">
                    <div class="about-feature">
                        <div class="about-feature-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="about-feature-content">
                            <h4>Vårt oppdrag</h4>
                            <p>Å utruste og inspirere mennesker til et dypere liv med Gud gjennom undervisning,
                                fellesskap og bønn. Vi ønsker å være et sted hvor mennesker kan vokse i sin tro.</p>
                        </div>
                    </div>

                    <div class="about-feature">
                        <div class="about-feature-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="about-feature-content">
                            <h4>Om oss</h4>
                            <p>Startet med en visjon om å samle mennesker i åndelig vekst, har vi vokst til et
                                levende felleskap som driver med bønnemøter, undervisning og reisevirksomhet.</p>
                        </div>
                    </div>
                </div>

                <a href="<?php echo site_url('/om-oss'); ?>" class="btn btn-primary">Oppdag mer</a>
            </div>
        </div>
    </div>
</section>

<!-- Fun Facts / Statistics -->
<section class="funfacts">
    <div class="container">
        <div class="funfacts-grid">
            <div class="funfact">
                <div class="funfact-icon red">
                    <i class="fab fa-youtube"></i>
                </div>
                <div class="funfact-content">
                    <span class="funfact-number" id="yt-video-count" data-target="0"
                        data-content-key="stats.youtube_videos">0</span>
                    <span class="funfact-label">YouTube-videoer</span>
                </div>
            </div>

            <div class="funfact">
                <div class="funfact-icon blue">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="funfact-content">
                    <span class="funfact-number" id="yt-view-count" data-target="0"
                        data-content-key="stats.youtube_views">0</span>
                    <span class="funfact-label">YouTube-visninger</span>
                </div>
            </div>

            <div class="funfact">
                <div class="funfact-icon yellow">
                    <i class="fas fa-microphone"></i>
                </div>
                <div class="funfact-content">
                    <span class="funfact-number" id="podcast-episode-count" data-target="45"
                        data-content-key="stats.podcast_episodes">0</span>
                    <span class="funfact-label">Podcast-episoder</span>
                </div>
            </div>

            <div class="funfact">
                <div class="funfact-icon blue">
                    <i class="fas fa-globe"></i>
                </div>
                <div class="funfact-content">
                    <span class="funfact-number" data-target="9" data-content-key="stats.countries_visited">0</span>
                    <span class="funfact-label">Land besøkt</span>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Causes / Fundraising -->
<section class="causes" id="innsamling">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Støtt vårt arbeid</span>
            <h2 class="section-title">Aktive innsamlingsaksjoner</h2>
            <p class="section-description">Din gave gjør en forskjell. Se hvordan du kan bidra til vårt arbeid.</p>
        </div>

        <div class="causes-grid">
            <!-- Static Fallback if no dynamic content -->
            <div class="cause-card">
                <div class="cause-image">
                    <img src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop"
                        alt="Støtt vårt arbeid">
                </div>
                <div class="cause-content">
                    <h3 class="cause-title">Støtt vårt arbeid</h3>
                    <p class="cause-text">Hjelp oss å fortsette med undervisning, podcast og reisevirksomhet for å
                        nå flere mennesker med evangeliet.</p>
                    <div class="cause-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" data-progress="65" style="width: 65%;"></div>
                        </div>
                        <div class="progress-stats">
                            <span><strong>65.000 kr</strong> samlet inn</span>
                            <span><strong>100.000 kr</strong> mål</span>
                        </div>
                    </div>
                    <a href="<?php echo site_url('/donasjoner'); ?>" class="btn btn-primary btn-block">Donér nå</a>
                </div>
            </div>
            <!-- More cards intentionally omitted for brevity in template, ideally these come from WP Query -->
        </div>

        <div class="section-footer" style="text-align: center; margin-top: 50px;">
            <a href="<?php echo site_url('/donasjoner'); ?>" class="btn btn-outline">Se alle innsamlinger</a>
        </div>
    </div>
</section>

<!-- Events -->
<section class="events" id="arrangementer">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Kommende arrangementer</span>
            <h2 class="section-title">Bli med oss</h2>
            <p class="section-description">Se våre kommende arrangementer og meld deg på.</p>
        </div>

        <div class="events-grid">
            <?php
            $args = array(
                'post_type' => 'arrangement',
                'posts_per_page' => 3
            );
            $query = new WP_Query($args);

            if ($query->have_posts()):
                while ($query->have_posts()):
                    $query->the_post();
                    ?>
                    <div class="event-card">
                        <div class="event-image">
                            <?php if (has_post_thumbnail()): ?>
                                <?php the_post_thumbnail('medium'); ?>
                            <?php else: ?>
                                <img src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=400&fit=crop"
                                    alt="<?php the_title(); ?>">
                            <?php endif; ?>
                        </div>
                        <div class="event-content">
                            <h3 class="event-title"><?php the_title(); ?></h3>
                            <div class="event-excerpt"><?php echo wp_trim_words(get_the_excerpt(), 15); ?></div>
                            <a href="<?php the_permalink(); ?>" class="btn btn-outline btn-sm">Les mer</a>
                        </div>
                    </div>
                    <?php
                endwhile;
                wp_reset_postdata();
            else:
                ?>
                <p style="grid-column: 1/-1; text-align: center;">Ingen kommende arrangementer funnet.</p>
            <?php endif; ?>
        </div>

        <div class="section-footer" style="text-align: center; margin-top: 50px;">
            <a href="<?php echo site_url('/arrangementer'); ?>" class="btn btn-outline">Se alle arrangementer</a>
        </div>
    </div>
</section>

<!-- Blog / News -->
<section class="blog" id="blogg">
    <div class="container">
        <div class="section-header">
            <span class="section-label">Siste nytt</span>
            <h2 class="section-title">Nyheter og blogg</h2>
            <p class="section-description">Les våre siste artikler og oppdateringer.</p>
        </div>

        <div class="blog-grid">
            <!-- WP Query Loop would go here -->
            <?php
            $args = array(
                'post_type' => 'post',
                'posts_per_page' => 3
            );
            $query = new WP_Query($args);

            if ($query->have_posts()):
                while ($query->have_posts()):
                    $query->the_post();
                    ?>
                    <article class="blog-card">
                        <div class="blog-image">
                            <?php if (has_post_thumbnail()): ?>
                                <img src="<?php the_post_thumbnail_url('medium'); ?>" alt="<?php the_title(); ?>">
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
                            <a href="<?php the_permalink(); ?>" class="blog-link">Les mer <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </article>
                    <?php
                endwhile;
                wp_reset_postdata();
            else:
                // Fallback Static
                ?>
                <article class="blog-card">
                    <div class="blog-content">
                        <h3 class="blog-title">Ingen innlegg funnet.</h3>
                    </div>
                </article>
            <?php endif; ?>
        </div>

        <div class="section-footer" style="text-align: center; margin-top: 50px;">
            <a href="<?php echo site_url('/blogg'); ?>" class="btn btn-outline">Se alle nyheter</a>
        </div>
    </div>
</section>

<?php get_footer(); ?>