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

    // Sidebar Category logic is now handled in the main dashboard script in index.html
});
