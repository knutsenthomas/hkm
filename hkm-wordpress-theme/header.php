<!DOCTYPE html>
<html <?php language_attributes(); ?>>

<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description"
        content="His Kingdom Ministry - En non-profit organisasjon dedikert til åndelig vekst gjennom undervisning, podcast og reisevirksomhet.">
    <?php wp_head(); ?>
</head>

<body <?php body_class('cms-loading'); ?>>
    <?php wp_body_open(); ?>

    <!-- Header -->
    <header class="header fixed top-0 left-0 w-full z-[10001] transition-all duration-300" id="header">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-[100px] transition-all duration-300"
            id="header-container">
            <!-- Logo -->
            <a href="<?php echo home_url(); ?>"
                class="flex items-center gap-3 font-bold text-white transition-all duration-300 logo">
                <div
                    class="w-[45px] h-[45px] flex items-center justify-center rounded-full overflow-hidden shrink-0 logo-icon">
                    <img src="<?php echo get_template_directory_uri(); ?>/img/Logo sirkel - orange og hvit.png"
                        alt="His Kingdom Ministry Logo" class="w-full h-full object-cover">
                </div>
                <span class="text-xl">His Kingdom Ministry</span>
            </a>

            <!-- Right Actions: Donate + Language + Hamburger -->
            <div class="flex items-center gap-5 header-actions">
                <div class="lang-switcher relative group">
                    <button
                        class="flex items-center gap-2 text-white font-medium hover:text-primary-orange transition-colors lang-btn">
                        <i class="fas fa-globe text-lg"></i>
                        <span><?php echo strtoupper(pll_current_language()); ?></span>
                    </button>
                    <div
                        class="lang-dropdown absolute right-0 mt-2 w-40 bg-white shadow-xl rounded-lg py-2 hidden group-hover:block border border-gray-100">
                        <?php
                        $languages = pll_the_languages(array('raw' => 1));
                        if ($languages) {
                            foreach ($languages as $lang) {
                                echo '<a href="' . esc_url($lang['url']) . '" class="block px-4 py-2 text-gray-800 hover:bg-gray-50 lang-switch-btn" data-lang="' . esc_attr($lang['slug']) . '">' . $lang['flag'] . ' ' . esc_html($lang['name']) . '</a>';
                            }
                        }
                        ?>
                    </div>
                </div>
                <a href="<?php echo site_url('/donasjoner'); ?>"
                    class="hidden md:flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-br from-[#f39c12] to-[#e74c3c] hover:scale-105 transition-transform header-donate-btn">
                    Gi gave <i class="fas fa-heart text-sm"></i>
                </a>

                <!-- Unified Toggle Button -->
                <button
                    class="menu-toggle h-10 w-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-[#f39c12] to-[#e74c3c] transition-transform hover:scale-105 focus:outline-none focus:ring-0 relative"
                    id="menu-toggle" aria-label="Toggle meny">
                    <i class="fas fa-bars text-lg open-icon"></i>
                    <i class="fas fa-times text-lg close-icon hidden"></i>
                </button>
            </div>
        </div>
    </header>

    <!-- Full-screen Mega Menu Overlay -->
    <div class="fixed inset-0 bg-white z-[10000] opacity-0 invisible transition-all duration-300 flex flex-col overflow-y-auto mega-menu"
        id="mega-menu">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-[100px] flex flex-col gap-6 justify-start">
            <!-- Menu Top Controls (Search & Mobile Lang) -->
            <div class="flex flex-col gap-6">
                <!-- Search -->
                <div class="relative w-full">
                    <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <form role="search" method="get" class="search-form" action="<?php echo home_url('/'); ?>">
                        <input type="search"
                            class="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl border-none focus:outline-none focus:ring-0 transition-all text-gray-800"
                            placeholder="Søk..." value="<?php echo get_search_query(); ?>" name="s">
                    </form>
                </div>

                <!-- Mobile Language Selector (Pill Style) -->
                <div class="flex md:hidden">
                    <div class="flex items-center gap-4 px-5 py-3 border border-gray-100 rounded-full bg-gray-50/50">
                        <i class="fas fa-globe text-gray-400"></i>
                        <div class="flex gap-4 items-center">
                            <?php 
                            $languages = pll_the_languages(array('raw' => 1));
                            if($languages) {
                                $i = 0;
                                foreach($languages as $lang) {
                                    if($i > 0) echo '<div class="w-px h-3 bg-gray-300"></div>';
                                    $active_class = $lang['current_lang'] ? 'font-bold text-primary-orange' : 'font-semibold text-gray-500 hover:text-primary-orange';
                                    echo '<a href="' . esc_url($lang['url']) . '" class="text-sm ' . $active_class . '">' . strtoupper(esc_html($lang['slug'])) . '</a>';
                                    $i++;
                                }
                            }
                            ?>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mega-menu-body">
                <!-- Menu Content Grid -->
                <!-- Ideally this should be dynamic via wp_nav_menu, but hardcoded for fidelity first -->
                <div class="mega-menu-grid">
                    <!-- Column 1: Engasjer deg -->
                    <div class="menu-col">
                        <h3 class="menu-section-title">Engasjer deg</h3>
                        <ul class="mega-nav-list">
                            <li><a href="<?php echo site_url('/donasjoner'); ?>">Støtt arbeidet</a></li>
                            <li><a href="<?php echo site_url('/donasjoner#faste-givere'); ?>">Bli fast giver</a></li>
                            <li><a href="<?php echo site_url('/for-menigheter'); ?>">For menigheter</a></li>
                            <li><a href="<?php echo site_url('/for-bedrifter'); ?>">For bedrifter</a></li>
                            <li><a href="<?php echo site_url('/bnn'); ?>">Business Network</a></li>
                        </ul>
                    </div>

                    <!-- Column 2: Bli kjent med oss -->
                    <div class="menu-col">
                        <h3 class="menu-section-title">Bli kjent med oss</h3>
                        <ul class="mega-nav-list">
                            <li><a href="<?php echo site_url('/om-oss'); ?>">Om oss</a></li>
                            <li><a href="<?php echo site_url('/kontakt'); ?>">Kontakt oss</a></li>
                        </ul>
                    </div>

                    <!-- Column 3: Ressurser & Media -->
                    <div class="menu-col">
                        <h3 class="menu-section-title">Ressurser</h3>
                        <ul class="mega-nav-list">
                            <li><a href="<?php echo site_url('/arrangementer'); ?>">Arrangementer</a></li>
                            <li><a href="<?php echo site_url('/media'); ?>">Media & Podcast</a></li>
                            <li><a href="<?php echo site_url('/blogg'); ?>">Nyheter & Blogg</a></li>
                            <li><a href="<?php echo site_url('/minside'); ?>">Min Side</a></li>
                        </ul>
                    </div>
                </div>

                <!-- Menu Footer -->
                <div class="mega-menu-footer">
                    <a href="<?php echo site_url('/donasjoner'); ?>" class="btn btn-primary btn-large btn-block">Støtt
                        nå <i class="fas fa-heart"></i></a>
                    <div class="menu-footer-links">
                        <a href="<?php echo site_url('/donasjoner#skattefradrag'); ?>">Skattefradrag</a>
                        <a href="<?php echo site_url('/om-oss'); ?>">Om oss</a>
                        <a href="<?php echo site_url('/personvern'); ?>">Personvern</a>
                    </div>
                </div>
            </div>
        </div>
    </div>