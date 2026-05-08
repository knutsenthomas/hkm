if (!window.__HKMAdminHeaderInitialized) {
window.__HKMAdminHeaderInitialized = true;

document.addEventListener('DOMContentLoaded', () => {
    const adminUtils = window.HKMAdminUtils || {};
    let pendingAuthRedirect = null;
    const ADMIN_IDENTITY_CACHE_KEY = 'hkm_admin_identity_cache';
    const ADMIN_SW_DEV_CLEANUP_KEY = 'hkm_admin_sw_dev_cleanup_done';
    const ADMIN_SIDEBAR_SCROLL_KEY = 'hkm_admin_sidebar_scroll_top';

    const stabilizeAdminServiceWorker = async () => {
        if (!('serviceWorker' in navigator)) return;

        const hostname = window.location.hostname;
        const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

        if (isLocalDev) {
            try {
                if (sessionStorage.getItem(ADMIN_SW_DEV_CLEANUP_KEY) === '1') return;
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.allSettled(regs.map((reg) => reg.unregister()));

                if (window.caches && typeof caches.keys === 'function') {
                    const keys = await caches.keys();
                    await Promise.allSettled(
                        keys.filter((key) => key.startsWith('hkm-admin-')).map((key) => caches.delete(key))
                    );
                }

                sessionStorage.setItem(ADMIN_SW_DEV_CLEANUP_KEY, '1');
                console.info('[admin-header] Local admin SW cache cleared');
            } catch (e) {
                console.warn('[admin-header] Local SW cleanup failed:', e);
            }
            return;
        }

        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.allSettled(regs.map((reg) => (typeof reg.update === 'function' ? reg.update() : Promise.resolve())));
        } catch (e) {
            console.warn('[admin-header] SW update check failed:', e);
        }
    };

    stabilizeAdminServiceWorker().catch(() => { });

    const withTimeout = async (promise, timeoutMs = 1500) => {
        let timerId;
        try {
            return await Promise.race([
                promise,
                new Promise((resolve) => {
                    timerId = setTimeout(() => resolve(null), timeoutMs);
                })
            ]);
        } finally {
            if (timerId) clearTimeout(timerId);
        }
    };

    const getIdentityEls = () => ({
        adminName: document.getElementById('admin-name'),
        adminAvatar: document.getElementById('admin-avatar')
    });

    const readCachedIdentity = () => {
        try {
            const raw = localStorage.getItem(ADMIN_IDENTITY_CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return {
                displayName: typeof parsed.displayName === 'string' ? parsed.displayName : '',
                photoURL: typeof parsed.photoURL === 'string' ? parsed.photoURL : ''
            };
        } catch (e) {
            return null;
        }
    };

    const writeCachedIdentity = (displayName, photoURL) => {
        try {
            localStorage.setItem(ADMIN_IDENTITY_CACHE_KEY, JSON.stringify({
                displayName: displayName || '',
                photoURL: photoURL || '',
                ts: Date.now()
            }));
        } catch (e) {
            // noop
        }
    };

    const getInitials = (displayName) => {
        const safeName = (displayName || '').trim() || 'Administrator';
        return safeName
            .split(' ')
            .map((n) => (n || '').trim())
            .filter(Boolean)
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2) || 'A';
    };

    const renderIdentity = (displayName, photoURL) => {
        const { adminName, adminAvatar } = getIdentityEls();
        const safeName = (displayName || '').trim() || 'Administrator';

        if (adminName) {
            adminName.textContent = safeName;
        }

        if (!adminAvatar) return;

        adminAvatar.textContent = getInitials(safeName);
        adminAvatar.title = safeName;
        if (photoURL) adminAvatar.dataset.photoUrl = photoURL;
    };

    const authFallbackName = (user) => user?.displayName || user?.email || 'Administrator';
    const cachedIdentity = readCachedIdentity();

    // Hydrate cached identity immediately to avoid visible "Laster..." hangs.
    if (cachedIdentity?.displayName) {
        renderIdentity(cachedIdentity.displayName, cachedIdentity.photoURL || '');
    }

    // Final guardrail: never leave the loading placeholder indefinitely.
    setTimeout(() => {
        const { adminName } = getIdentityEls();
        if (adminName && adminName.textContent.trim() === 'Laster...') {
            renderIdentity(cachedIdentity?.displayName || 'Administrator', cachedIdentity?.photoURL || '');
        }
    }, 2500);

    const waitForFirebaseService = async (timeoutMs = 8000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const service = window.firebaseService;
            if (service && (service.isInitialized || (typeof service.tryAutoInit === 'function' && service.tryAutoInit()))) {
                return service;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return window.firebaseService || null;
    };

    const bindHeaderAuth = async () => {
        const firebaseService = await waitForFirebaseService();
        if (!firebaseService || !firebaseService.isInitialized) {
            renderIdentity(cachedIdentity?.displayName || 'Administrator', cachedIdentity?.photoURL || '');
            return;
        }

        firebaseService.onAuthChange(async (user) => {
            if (pendingAuthRedirect) {
                clearTimeout(pendingAuthRedirect);
                pendingAuthRedirect = null;
            }

            if (!user) {
                // Delay redirect slightly to avoid false positives during transient auth refresh.
                pendingAuthRedirect = setTimeout(() => {
                    if (!firebaseService?.auth?.currentUser) {
                        window.location.href = '/admin/login';
                    }
                }, 2500);
                return;
            }

            let role = 'medlem';
            try {
                role = await firebaseService.getUserRole(user.uid, { timeoutMs: 2500 });
            } catch (e) {
                console.warn('[admin-header] Could not fetch user role:', e);
            }

            const isAdmin = typeof adminUtils.isElevatedAdminRole === 'function'
                ? adminUtils.isElevatedAdminRole(role)
                : ['admin', 'superadmin'].includes(String(role || '').toLowerCase());

            if (!isAdmin) {
                const redirect = typeof adminUtils.redirectToMinSideWithAccessDenied === 'function'
                    ? adminUtils.redirectToMinSideWithAccessDenied
                    : () => { window.location.href = '/minside'; };
                redirect({
                    path: '/minside',
                    message: 'Access Denied: Du har ikke administratorrettigheter til denne siden.'
                });
                return;
            }

            // Render immediately from Auth so UI never stays in "Laster..."
            renderIdentity(authFallbackName(user), user.photoURL || '');
            writeCachedIdentity(authFallbackName(user), user.photoURL || '');

            let userProfile = null;
            try {
                const userDoc = await withTimeout(firebase.firestore().collection('users').doc(user.uid).get(), 1500);
                if (userDoc && userDoc.exists) userProfile = userDoc.data();
            } catch (e) { }

            const displayName = (userProfile && userProfile.displayName) || authFallbackName(user);
            const photoURL = (userProfile && userProfile.photoURL) || user.photoURL || '';
            renderIdentity(displayName, photoURL);
            writeCachedIdentity(displayName, photoURL);
        });
    };

    const bindGlobalLogout = async () => {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn || logoutBtn.dataset.hkmLogoutBound === '1') return;
        logoutBtn.dataset.hkmLogoutBound = '1';

        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const originalHtml = logoutBtn.innerHTML;
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<span class="material-symbols-outlined">sync</span><span>Logger ut...</span>';

            try {
                const firebaseService = await waitForFirebaseService(3000);
                if (firebaseService && firebaseService.isInitialized && typeof firebaseService.logout === 'function') {
                    await firebaseService.logout();
                } else if (window.firebase && firebase.auth) {
                    await firebase.auth().signOut();
                }
            } catch (error) {
                console.error('[admin-header] Logout failed:', error);
            } finally {
                try {
                    localStorage.removeItem(ADMIN_IDENTITY_CACHE_KEY);
                    Object.keys(localStorage)
                        .filter((key) => key.startsWith('hkm_user_role_cache:'))
                        .forEach((key) => localStorage.removeItem(key));
                } catch (e) { }
                logoutBtn.innerHTML = originalHtml;
                logoutBtn.disabled = false;
                window.location.replace('/admin/login');
            }
        });
    };

    (async () => {
        try {
            await bindGlobalLogout();
            await bindHeaderAuth();
        } catch (e) {
            console.warn('[admin-header] Header auth init failed:', e);
            renderIdentity(cachedIdentity?.displayName || 'Administrator', cachedIdentity?.photoURL || '');
        }
    })();

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
    }

    // --- Collapsible Sidebar Categories (Hardened) ---
    const initSidebarCategories = () => {
        const categoryHeaders = document.querySelectorAll('.nav-category-header[data-target-category]');
        if (categoryHeaders.length === 0) return;

        function setCategory(category, shouldBeOpen) {
            const header = document.querySelector(`.nav-category-header[data-target-category="${category}"]`);
            const items = document.querySelectorAll(`.nav-item[data-nav-category="${category}"]`);
            if (!header) return;

            if (shouldBeOpen) {
                header.classList.remove('collapsed');
                items.forEach(item => {
                    item.classList.remove('nav-cat-hidden');
                    item.classList.add('visible');
                    item.style.setProperty('display', 'block', 'important');
                    item.style.setProperty('visibility', 'visible', 'important');
                    item.style.setProperty('opacity', '1', 'important');
                });
            } else {
                header.classList.add('collapsed');
                items.forEach(item => {
                    item.classList.add('nav-cat-hidden');
                    item.classList.remove('visible');
                    item.style.setProperty('display', 'none', 'important');
                });
            }
            sessionStorage.setItem(`nav_cat_${category}`, shouldBeOpen ? 'open' : 'closed');
        }

        categoryHeaders.forEach(header => {
            const cat = header.getAttribute('data-target-category');
            const path = window.location.pathname.toLowerCase();
            
            // Auto-detect if we should be open
            const hasActiveLink = document.querySelector(`.nav-item[data-nav-category="${cat}"] .nav-link.active`) !== null;
            const savedState = sessionStorage.getItem(`nav_cat_${cat}`);
            
            // Priority: 1. Active Link, 2. URL Match, 3. Saved State, 4. Default (Nettsted open)
            let shouldBeOpen = (cat === 'nettsted');
            if (savedState) shouldBeOpen = (savedState === 'open');
            if (hasActiveLink) shouldBeOpen = true; 

            // Force open Communication category if on related pages
            if (cat === 'kommunikasjon' && (path.includes('kommunikasjon') || path.includes('segmenter') || path.includes('meldinger') || path.includes('nyhetsbrev'))) {
                shouldBeOpen = true;
            }

            setCategory(cat, shouldBeOpen);

            // Use direct onclick to ensure it's not blocked by other listeners
            header.onclick = (e) => {
                e.preventDefault();
                const currentlyCollapsed = header.classList.contains('collapsed');
                setCategory(cat, currentlyCollapsed);
            };
        });
    };

    // Run immediately and also on DOMContentLoaded just in case
    initSidebarCategories();
    document.addEventListener('DOMContentLoaded', initSidebarCategories);

    // Mobile Sidebar Close Button
    const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
    if (mobileSidebarClose && sidebar) {
        mobileSidebarClose.onclick = () => {
            sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        };
    }

    // --- Global Search Handler (Visual Only) ---
    if (sidebar) {
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && e.target !== mobileNavToggle) {
                const toggleSidebar = (force) => {
                    const isActive = force !== undefined ? force : !sidebar.classList.contains('active');
                    sidebar.classList.toggle('active', isActive);
                    if (sidebarOverlay) {
                        sidebarOverlay.classList.toggle('active', isActive);
                    }
                };
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
        } else if (href === '#' && (currentPath.endsWith('/admin') || currentPath.endsWith('admin/'))) {
            // Oversikt fallback
            if (item.getAttribute('data-section') === 'overview') {
                item.classList.add('active');
            }
        }
    });

    // Sidebar scroll memory (keep left menu position on refresh/navigation)
    const sidebarNavScroller = document.querySelector('.sidebar .sidebar-nav') || document.querySelector('.sidebar-nav');

    const saveSidebarScrollPosition = () => {
        if (!sidebarNavScroller) return;
        try {
            sessionStorage.setItem(ADMIN_SIDEBAR_SCROLL_KEY, String(Math.max(0, Math.round(sidebarNavScroller.scrollTop || 0))));
        } catch (e) {
            // noop
        }
    };

    const restoreSidebarScrollPosition = () => {
        if (!sidebarNavScroller) return;
        let target = 0;
        try {
            const raw = sessionStorage.getItem(ADMIN_SIDEBAR_SCROLL_KEY);
            if (!raw) return;
            target = Math.max(0, parseInt(raw, 10) || 0);
        } catch (e) {
            return;
        }

        // Apply multiple times because some pages alter sidebar layout after DOMContentLoaded.
        let attempts = 0;
        const apply = () => {
            attempts += 1;
            sidebarNavScroller.scrollTop = target;
            if (attempts < 6) requestAnimationFrame(apply);
        };
        requestAnimationFrame(apply);
        setTimeout(() => { sidebarNavScroller.scrollTop = target; }, 120);
        setTimeout(() => { sidebarNavScroller.scrollTop = target; }, 320);
    };

    if (sidebarNavScroller) {
        let scrollSaveRaf = 0;
        sidebarNavScroller.addEventListener('scroll', () => {
            if (scrollSaveRaf) cancelAnimationFrame(scrollSaveRaf);
            scrollSaveRaf = requestAnimationFrame(() => {
                scrollSaveRaf = 0;
                saveSidebarScrollPosition();
            });
        }, { passive: true });

        document.querySelectorAll('.sidebar .nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                saveSidebarScrollPosition();
            });
        });

        window.addEventListener('pagehide', saveSidebarScrollPosition);
        window.addEventListener('beforeunload', saveSidebarScrollPosition);
        restoreSidebarScrollPosition();
    }

    // Sidebar Category logic is now handled in the main dashboard script in index.html
});
}
