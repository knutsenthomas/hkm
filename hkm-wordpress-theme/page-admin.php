<?php
/**
 * Template Name: Admin Dashboard
 */

// If the user is not an admin, we might want to redirect, but for now we just load the template.
// Ideally, we'd use WP's authentication, but this site seems to rely on Firebase.

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>

<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>
        <?php wp_title('|', true, 'right'); ?>
    </title>
    <?php wp_head(); ?>

    <!-- Material Symbols (Needed for Admin) -->
    <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />

    <!-- Dashboard CSS fallback if not enqueued -->
    <link rel="stylesheet" href="<?php echo get_template_directory_uri(); ?>/admin/css/dashboard.css?v=editorjs7">
</head>

<body class="admin-body">
    <!-- The structure from admin/index.html goes here -->
    <!-- For now, we'll keep it simple or include the contents -->

    <div id="global-error-container"
        style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.95); z-index: 9999; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <span class="material-symbols-outlined"
            style="font-size: 64px; color: #ef4444; margin-bottom: 20px;">error</span>
        <h2 style="font-size: 24px; color: #1e293b; margin-bottom: 10px;">Noe gikk galt</h2>
        <p id="global-error-message" style="color: #64748b; max-width: 500px; margin-bottom: 30px;">En uventet feil har
            oppstått.</p>
        <button onclick="window.location.reload()"
            style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Last
            inn på nytt</button>
    </div>

    <aside class="sidebar">
        <div class="sidebar-header">
            <div class="logo">
                <img src="<?php echo get_template_directory_uri(); ?>/admin/img/logo_circular.png" alt="HKM Logo"
                    style="width: 40px; height: 40px; border-radius: 50%;">
                <h1 class="logo-text">HKM Studio</h1>
            </div>
        </div>

        <nav class="sidebar-nav">
            <ul class="nav-list">
                <!-- Navigation items here -->
                <li class="nav-item"><a href="#" class="nav-link active" data-section="overview"><span
                            class="material-symbols-outlined">home</span><span>Oversikt</span></a></li>
                <li class="nav-item"><a href="#" class="nav-link" data-section="content"><span
                            class="material-symbols-outlined">article</span><span>Sideinnhold</span></a></li>
                <!-- ... other items ... -->
            </ul>
        </nav>

        <div class="sidebar-footer">
            <a href="<?php echo site_url('/minside'); ?>" class="nav-link"><span
                    class="material-symbols-outlined">account_circle</span><span>Min Side</span></a>
            <a href="<?php echo home_url(); ?>" class="nav-link" target="_blank"><span
                    class="material-symbols-outlined">visibility</span><span>Se nettside</span></a>
            <button id="logout-btn" class="nav-link logout"><span
                    class="material-symbols-outlined">logout</span><span>Logg ut</span></button>
        </div>
    </aside>

    <main class="main-content">
        <section id="content-area" class="section-container">
            <!-- Dynamic sections here -->
            <div id="overview-section" class="section-content active">
                <div class="section-header">
                    <h2 class="section-title">Velkommen tilbake! (WP Admin Template)</h2>
                    <p class="section-subtitle">Her er hva som har skjedd på nettsiden din i det siste.</p>
                </div>
                <div class="loader"></div>
            </div>
        </section>
    </main>

    <?php wp_footer(); ?>

    <!-- Firebase & Editor.js Scripts -->
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js"></script>

    <script src="<?php echo get_template_directory_uri(); ?>/js/firebase-config.js"></script>
    <script src="<?php echo get_template_directory_uri(); ?>/js/user-roles.js"></script>
    <script src="<?php echo get_template_directory_uri(); ?>/js/firebase-service.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.29.0"></script>
    <!-- Other plugins... -->

    <script src="<?php echo get_template_directory_uri(); ?>/admin/js/admin.js"></script>
    <script>
        window.addEventListener('load', () => {
            if (!window.adminManager) {
                window.adminManager = new AdminManager();
            }
        });
    </script>
</body>

</html>