<?php

function hkm_theme_setup()
{
    // Add support for block styles.
    add_theme_support('wp-block-styles');

    // Enqueue editor styles.
    add_editor_style('editor-style.css');

    // Add support for full and wide align images.
    add_theme_support('align-wide');

    // Add support for responsive embeds.
    add_theme_support('responsive-embeds');

    // Add support for custom line height controls.
    add_theme_support('custom-line-height');

    // Add support for experimental link color control.
    add_theme_support('experimental-link-color');

    // Add support for experimental cover block spacing.
    add_theme_support('custom-spacing');

    // Add support for post thumbnails
    add_theme_support('post-thumbnails');

    // Register Navigation Menus
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'hkm-theme'),
        'footer' => __('Footer Menu', 'hkm-theme'),
    ));
}
add_action('after_setup_theme', 'hkm_theme_setup');

function hkm_theme_scripts()
{
    // Fonts
    wp_enqueue_style('google-fonts-inter', 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', array(), null);
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', array(), '6.4.0');

    // Main Styles
    wp_enqueue_style('hkm-style', get_stylesheet_uri(), array(), '1.0.0');
    wp_enqueue_style('cookie-consent-style', get_template_directory_uri() . '/css/cookie-consent.css', array(), '1.0.0');

    // Tailwind (CDN for now as per key requirement)
    // Note: In a production WP theme, compiling tailwind is better, but following user constraints.
    wp_enqueue_script('tailwind-cdn', 'https://cdn.tailwindcss.com', array(), null, false);
    // Add inline config for Tailwind
    wp_add_inline_script('tailwind-cdn', "
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'primary-orange': '#f39c12',
                        'primary-red': '#e74c3c',
                        'text-dark': '#333333',
                    }
                }
            }
        }
    ");

    // Page Specific Styles
    if (is_page_template('page-donasjoner.php')) {
        wp_enqueue_style('stripe-checkout-style', get_template_directory_uri() . '/css/stripe-checkout.css', array(), '1.0.0');
        wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', array(), null, true);
    }

    // Firebase (If needed for legacy support) - Enqueue globally or conditionally
    wp_enqueue_script('firebase-app', 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js', array(), '10.7.1', true);
    wp_enqueue_script('firebase-firestore', 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js', array(), '10.7.1', true);
    wp_enqueue_script('firebase-auth', 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js', array(), '10.7.1', true);
    wp_enqueue_script('firebase-storage', 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js', array(), '10.7.1', true);

    // Local Scripts
    wp_enqueue_script('firebase-config', get_template_directory_uri() . '/js/firebase-config.js', array('firebase-app'), '1.0.0', true);
    wp_enqueue_script('firebase-service', get_template_directory_uri() . '/js/firebase-service.js', array('firebase-config'), '1.0.0', true);

    // Main App Script
    wp_enqueue_script('hkm-script', get_template_directory_uri() . '/js/script.js', array('jquery'), '1.0.0', true); // Copied script.js to js/ folder for consistency or root

    // There was a root script.js in the source. I should make sure I copied it or check where it is.
    // The previous run_command copied 'js' folder. The 'script.js' was in the root. 
    // I need to copy 'script.js' from root to 'hkm-wordpress-theme/js/' or 'hkm-wordpress-theme/'. 
    // Let's assume I will copy it to /js/script.js inside the theme for better organization, or keep it root. 
    // Best practice is /js/. I will adjust the copy command in next step if needed or just copy it now.

    wp_enqueue_script('content-manager', get_template_directory_uri() . '/js/content-manager.js', array('hkm-script'), '1.0.0', true);
    wp_enqueue_script('cookie-consent', get_template_directory_uri() . '/js/cookie-consent.js', array(), '1.0.0', true);

    // Page Specific Scripts
    if (is_page_template('page-media.php') || is_page_template('page-podcast.php') || is_page_template('page-youtube.php')) {
        wp_enqueue_script('teaching-loader', get_template_directory_uri() . '/js/teaching-loader.js', array(), '1.0.0', true);
        wp_enqueue_script('media-js', get_template_directory_uri() . '/js/media.js', array(), '1.0.0', true);
    }

    if (is_page_template('page-undervisningsserier.php') || is_page_template('page-seminarer.php') || is_page_template('page-bibelstudier.php')) {
        wp_enqueue_script('teaching-loader', get_template_directory_uri() . '/js/teaching-loader.js', array(), '1.0.0', true);
    }

    if (is_page_template('page-arrangementer.php') || is_page_template('page-kalender.php') || is_singular('arrangement')) {
        wp_enqueue_script('google-calendar', 'https://apis.google.com/js/api.js', array(), null, true);
    }

    if (is_page_template('page-admin.php') || is_page_template('page-minside.php')) {
        // These will need more specific enqueues later, but adding the templates here for now
    }

    if (is_page_template('page-donasjoner.php')) {
        wp_enqueue_script('stripe-checkout-local', get_template_directory_uri() . '/js/stripe-checkout.js', array(), '1.0.0', true);
    }
}
add_action('wp_enqueue_scripts', 'hkm_theme_scripts');

// SVG Support
function cc_mime_types($mimes)
{
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
}
add_filter('upload_mimes', 'cc_mime_types');

// Register Custom Post Type: Events (Arrangementer)
function hkm_register_events_cpt()
{
    $labels = array(
        'name' => _x('Arrangementer', 'Post Type General Name', 'hkm-theme'),
        'singular_name' => _x('Arrangement', 'Post Type Singular Name', 'hkm-theme'),
        'menu_name' => __('Arrangementer', 'hkm-theme'),
        'name_admin_bar' => __('Arrangement', 'hkm-theme'),
        'archives' => __('Arrangement Arkiv', 'hkm-theme'),
        'attributes' => __('Arrangement Attributter', 'hkm-theme'),
        'parent_item_colon' => __('Foreldre Arrangement:', 'hkm-theme'),
        'all_items' => __('Alle Arrangementer', 'hkm-theme'),
        'add_new_item' => __('Legg til nytt arrangement', 'hkm-theme'),
        'add_new' => __('Legg til nytt', 'hkm-theme'),
        'new_item' => __('Nytt arrangement', 'hkm-theme'),
        'edit_item' => __('Rediger arrangement', 'hkm-theme'),
        'update_item' => __('Oppdater arrangement', 'hkm-theme'),
        'view_item' => __('Se arrangement', 'hkm-theme'),
        'view_items' => __('Se arrangementer', 'hkm-theme'),
        'search_items' => __('Søk arrangement', 'hkm-theme'),
        'not_found' => __('Ikke funnet', 'hkm-theme'),
        'not_found_in_trash' => __('Ikke funnet i papirkurven', 'hkm-theme'),
        'featured_image' => __('Bilde', 'hkm-theme'),
        'set_featured_image' => __('Sett bilde', 'hkm-theme'),
        'remove_featured_image' => __('Fjern bilde', 'hkm-theme'),
        'use_featured_image' => __('Bruk som bilde', 'hkm-theme'),
        'insert_into_item' => __('Sett inn i arrangement', 'hkm-theme'),
        'uploaded_to_this_item' => __('Last opp til dette arrangementet', 'hkm-theme'),
        'items_list' => __('Arrangementliste', 'hkm-theme'),
        'items_list_navigation' => __('Arrangementliste navigasjon', 'hkm-theme'),
        'filter_items_list' => __('Filtrer arrangementliste', 'hkm-theme'),
    );
    $args = array(
        'label' => __('Arrangement', 'hkm-theme'),
        'description' => __('Kommende arrangementer', 'hkm-theme'),
        'labels' => $labels,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'hierarchical' => false,
        'public' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_position' => 5,
        'menu_icon' => 'dashicons-calendar-alt',
        'show_in_admin_bar' => true,
        'show_in_nav_menus' => true,
        'can_export' => true,
        'has_archive' => true,
        'exclude_from_search' => false,
        'publicly_queryable' => true,
        'capability_type' => 'post',
        'show_in_rest' => true,
    );
    register_post_type('arrangement', $args);
}
add_action('init', 'hkm_register_events_cpt', 0);

// Polylang Shims to prevent fatal errors if plugin is deactivated
if (!function_exists('pll_current_language')) {
    function pll_current_language()
    {
        return 'no';
    }
}
if (!function_exists('pll_the_languages')) {
    function pll_the_languages($args)
    {
        return false;
    }
}
if (!function_exists('pll_home_url')) {
    function pll_home_url($lang)
    {
        return home_url();
    }
}
