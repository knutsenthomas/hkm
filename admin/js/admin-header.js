document.addEventListener('DOMContentLoaded', () => {
    const firebaseService = window.firebaseService;
    if (!firebaseService) return;

    firebaseService.onAuthChange(async (user) => {
        if (!user) return;

        const adminName = document.getElementById('admin-name');
        const adminAvatar = document.getElementById('admin-avatar');

        if (adminName || adminAvatar) {
            let userProfile = null;
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists) userProfile = userDoc.data();
            } catch (e) { }

            const displayName = (userProfile && userProfile.displayName) || user.displayName || user.email;
            const photoURL = (userProfile && userProfile.photoURL) || user.photoURL;

            if (adminName) adminName.textContent = displayName;
            if (adminAvatar) {
                if (photoURL) {
                    adminAvatar.innerHTML = `<img src="${photoURL}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                } else {
                    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
                    adminAvatar.textContent = initials.substring(0, 2);
                }
            }
        }
    });

    // Keep profile links as normal navigation (e.g. to ../minside/index.html).


    // Mobile Nav Toggle
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Create overlay if missing (for better mobile UX)
    let sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (!sidebarOverlay && sidebar) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'sidebar-overlay';
        document.body.appendChild(sidebarOverlay);
    }

    if (mobileNavToggle && sidebar) {
        const toggleSidebar = (force) => {
            const isActive = force !== undefined ? force : !sidebar.classList.contains('active');
            sidebar.classList.toggle('active', isActive);
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active', isActive);
            }
        };

        mobileNavToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                toggleSidebar(false);
            });
        }

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== mobileNavToggle) {
                toggleSidebar(false);
            }
        });
    }

    // Bottom Nav Active State
    const bottomNavItems = document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item');
    const currentPath = window.location.pathname;

    bottomNavItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && href !== '#' && currentPath.includes(href)) {
            bottomNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        } else if (href === '#' && (currentPath.endsWith('index.html') || currentPath.endsWith('admin/'))) {
            // Oversikt fallback
            if (item.getAttribute('data-section') === 'overview') {
                item.classList.add('active');
            }
        }
    });

    // Sidebar Category Accordion Logic
    const categoryHeaders = document.querySelectorAll('.nav-category-header');

    // Auto-open logic: find out which category contains the active link (if any)
    const activeLink = document.querySelector('.nav-link.active');
    let activeCategory = null;
    if (activeLink) {
        const parentItem = activeLink.closest('.nav-item');
        if (parentItem) {
            activeCategory = parentItem.getAttribute('data-nav-category') || parentItem.getAttribute('data-category');
        }
    }

    categoryHeaders.forEach(header => {
        const category = header.getAttribute('data-target-category');

        // Find all nav items that belong to this category
        const subItems = document.querySelectorAll(`.nav-item[data-nav-category="${category}"]`);

        // Initialize state (expand if active category, otherwise collapsed)
        // Adjust condition based on preference: currently all are expanded. We'll start with all expanded, 
        // unless you want them collapsed by default? The user asked to HAVE collapse (an accordion).
        // Let's keep them expanded if active, collapsed if not.
        if (category && activeCategory && category !== activeCategory) {
            header.classList.add('collapsed');
            subItems.forEach(item => item.classList.add('hidden'));
        }

        header.addEventListener('click', () => {
            const isCollapsed = header.classList.toggle('collapsed');
            subItems.forEach(item => {
                if (isCollapsed) {
                    item.classList.add('hidden');
                } else {
                    item.classList.remove('hidden');
                }
            });
        });
    });
});
