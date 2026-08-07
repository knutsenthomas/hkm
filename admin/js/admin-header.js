if (!window.__HKMAdminHeaderInitialized) {
window.__HKMAdminHeaderInitialized = true;

const initAdminHeader = () => {
    console.log("[admin-header] Initializing admin header...");
    const adminUtils = window.HKMAdminUtils || {};
    let pendingAuthRedirect = null;
    const ADMIN_IDENTITY_CACHE_KEY = 'hkm_admin_identity_cache';
    const ADMIN_SW_DEV_CLEANUP_KEY = 'hkm_admin_sw_dev_cleanup_done';
    const ADMIN_SIDEBAR_SCROLL_KEY = 'hkm_admin_sidebar_scroll_top';
    const SIDEBAR_MINI_KEY = 'hkm_admin_sidebar_mini';

    const applySidebarMiniState = (isMini) => {
        if (window.innerWidth >= 1025) {
            document.body.classList.toggle('sidebar-mini', isMini);
            if (isMini) {
                document.querySelectorAll('.nav-item[data-nav-category]').forEach(item => {
                    item.style.setProperty('display', 'flex', 'important');
                    item.style.setProperty('visibility', 'visible', 'important');
                    item.style.setProperty('opacity', '1', 'important');
                    item.classList.remove('nav-cat-hidden');
                    item.classList.add('visible');
                });
            } else if (typeof window.hkmRestoreSidebarCategories === 'function') {
                window.hkmRestoreSidebarCategories();
            }
        } else {
            document.body.classList.remove('sidebar-mini');
        }
        const toggleBtn = document.getElementById('desktop-sidebar-toggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = isMini ? 'menu' : 'menu_open';
            }
            const title = isMini ? 'Vis full meny (tekst og ikoner)' : 'Smal meny (kun ikoner)';
            toggleBtn.setAttribute('title', title);
            toggleBtn.setAttribute('aria-label', title);
        }
    };

    const setupDesktopSidebarToggle = () => {
        const isMiniStored = localStorage.getItem(SIDEBAR_MINI_KEY) === 'true';
        applySidebarMiniState(isMiniStored);

        const sidebarHeader = document.querySelector('.sidebar-header');
        if (sidebarHeader && !document.getElementById('desktop-sidebar-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'desktop-sidebar-toggle';
            toggleBtn.type = 'button';
            toggleBtn.className = 'desktop-sidebar-toggle-btn';
            toggleBtn.innerHTML = `<span class="material-symbols-outlined">${isMiniStored ? 'menu' : 'menu_open'}</span>`;
            const title = isMiniStored ? 'Vis full meny (tekst og ikoner)' : 'Smal meny (kun ikoner)';
            toggleBtn.setAttribute('title', title);
            toggleBtn.setAttribute('aria-label', title);
            
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nowMini = !document.body.classList.contains('sidebar-mini');
                localStorage.setItem(SIDEBAR_MINI_KEY, nowMini ? 'true' : 'false');
                applySidebarMiniState(nowMini);
            });

            sidebarHeader.appendChild(toggleBtn);
        }
    };

    setupDesktopSidebarToggle();
    window.addEventListener('resize', () => {
        const isMiniStored = localStorage.getItem(SIDEBAR_MINI_KEY) === 'true';
        applySidebarMiniState(isMiniStored);
    });

    // Premium Progress Bar helper
    const injectLoadingProgressBar = () => {
        let bar = document.getElementById('admin-loading-progress');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'admin-loading-progress';
            document.body.appendChild(bar);
        }
        return bar;
    };

    window.triggerProgressAnimation = (durationMs = 450) => {
        const bar = injectLoadingProgressBar();
        bar.classList.remove('active');
        bar.style.width = '0%';
        bar.style.transition = 'none';
        
        // Force reflow
        bar.offsetHeight;
        
        bar.classList.add('active');
        bar.style.transition = 'width 0.4s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.2s ease';
        bar.style.width = '100%';
        
        setTimeout(() => {
            bar.style.transition = 'opacity 0.2s ease';
            bar.classList.remove('active');
            setTimeout(() => {
                bar.style.width = '0%';
            }, 200);
        }, durationMs);
    };

    // Auto-trigger on all navigation clicks
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link, .mobile-nav-item, .ov-action-btn, .template-item, .studio-create-card');
        if (link) {
            if (typeof window.triggerProgressAnimation === 'function') {
                window.triggerProgressAnimation();
            }
        }
    });

    window.addEventListener('hashchange', () => {
        if (typeof window.triggerProgressAnimation === 'function') {
            window.triggerProgressAnimation();
        }
    });

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
        adminNames: Array.from(document.querySelectorAll('#admin-name, .user-name, .user-name-compact')),
        adminAvatars: Array.from(document.querySelectorAll('#admin-avatar, #ph-avatar, #modal-admin-avatar, .user-avatar, .user-avatar-compact'))
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
        const { adminNames, adminAvatars } = getIdentityEls();
        const safeName = (displayName || '').trim() || 'Administrator';

        adminNames.forEach(adminName => {
            if (adminName) {
                adminName.textContent = safeName;
            }
        });

        adminAvatars.forEach(adminAvatar => {
            if (!adminAvatar) return;

            // Clear any previous state
            adminAvatar.textContent = '';
            adminAvatar.innerHTML = '';
            adminAvatar.title = safeName;
            if (photoURL) adminAvatar.dataset.photoUrl = photoURL;

            if (photoURL && photoURL.trim().length > 5) {
                adminAvatar.classList.remove('has-initials');
                // Show actual photo
                const img = document.createElement('img');
                img.referrerPolicy = "no-referrer";
                img.src = photoURL;
                img.style.cssText = "width:100%; height:100%; object-fit:cover; border-radius:inherit;";
                
                // Fallback if image fails to load
                img.onerror = () => {
                    adminAvatar.classList.add('has-initials');
                    adminAvatar.innerHTML = '';
                    adminAvatar.textContent = getInitials(safeName);
                };
                
                adminAvatar.appendChild(img);
            } else {
                adminAvatar.classList.add('has-initials');
                // Fallback: Use initials
                adminAvatar.textContent = getInitials(safeName);
            }
        });
    };

    const authFallbackName = (user) => user?.displayName || user?.email || 'Administrator';
    const cachedIdentity = readCachedIdentity();

    // Inject Favorites Helper styles & listener
    const injectFavoritesUiHelper = () => {
        const styleId = 'hkm-admin-favorites-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                body.admin-body .nav-list,
                body.minside-body .nav-list {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: stretch !important;
                    gap: 4px !important;
                    width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                body.admin-body .nav-item,
                body.minside-body .nav-item {
                    width: 100% !important;
                    display: block !important;
                    margin-bottom: 4px !important;
                    margin-top: 0 !important;
                }
                body.admin-body .nav-link,
                body.minside-body .nav-link {
                    display: flex !important;
                    align-items: center !important;
                    width: 100% !important;
                }
                .nav-link-wrap {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    position: relative;
                }
                .nav-fav-toggle-btn {
                    opacity: 0;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    background: transparent !important;
                    border: none !important;
                    padding: 4px !important;
                    display: flex !important;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10;
                }
                .nav-link-wrap:hover .nav-fav-toggle-btn,
                .nav-fav-toggle-btn:focus-within {
                    opacity: 0.5;
                }
                .nav-fav-toggle-btn:hover {
                    opacity: 1 !important;
                    transform: scale(1.2);
                }
                .nav-fav-toggle-btn .star-icon-element {
                    font-size: 16px !important;
                    color: #94a3b8;
                    font-variation-settings: 'FILL' 0;
                    transition: color 0.2s ease, font-variation-settings 0.2s ease;
                }
                .nav-fav-toggle-btn .star-icon-element.active {
                    color: #fbbf24 !important;
                    font-variation-settings: 'FILL' 1 !important;
                    opacity: 1 !important;
                }
                .nav-fav-toggle-btn.active-fav {
                    opacity: 1 !important;
                }
            `;
            document.head.appendChild(style);
        }

        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav && !sidebarNav.dataset.hkmFavsBound) {
            sidebarNav.dataset.hkmFavsBound = '1';
            sidebarNav.addEventListener('click', (e) => {
                const btn = e.target.closest('.nav-fav-toggle-btn');
                if (btn) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const label = btn.getAttribute('data-label');
                    const raw = localStorage.getItem('hkm_admin_sidebar_favorites');
                    let favorites = raw ? JSON.parse(raw) : [];
                    
                    if (favorites.includes(label)) {
                        favorites = favorites.filter(l => l !== label);
                    } else {
                        favorites.push(label);
                    }
                    
                    localStorage.setItem('hkm_admin_sidebar_favorites', JSON.stringify(favorites));
                    
                    // Re-render and re-init
                    normalizeSidebarNavigation(true);
                    
                    if (typeof initSidebarCategories === 'function') {
                        initSidebarCategories();
                    }
                }
            });
        }
    };

    const normalizeSidebarNavigation = (force = false) => {
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (!sidebarNav || (sidebarNav.dataset.hkmNormalized === '1' && !force)) return;

        injectFavoritesUiHelper();

        const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
        const hash = window.location.hash.replace('#', '');
        const isAdminHome = path.endsWith('/admin/index.html') || path.endsWith('/admin/index.html');
        const currentSection = hash || (isAdminHome ? 'overview' : '');

        const itemHref = (section) => `/admin/index.html#${section}`;
        const isActive = (item) => {
            if (item.path && path.includes(item.path)) return true;
            if (item.section && currentSection === item.section) return true;
            return false;
        };

        const getFavorites = () => {
            try {
                const raw = localStorage.getItem('hkm_admin_sidebar_favorites');
                const parsed = raw ? JSON.parse(raw) : [];
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        };

        const favorites = getFavorites();

        const renderItem = (item, isFavSection = false) => {
            const active = isActive(item) ? ' active' : '';
            const visible = item.alwaysVisible ? ' visible' : '';
            const hiddenClass = (!isFavSection && item.hidden) ? ' nav-helper-hidden' : '';
            const hiddenStyle = (!isFavSection && item.hidden) ? ' style="display:none"' : '';
            const categoryAttr = isFavSection ? ' data-nav-category="favoritter"' : (item.category ? ` data-nav-category="${item.category}"` : ' data-nav-category="all"');
            const dataSection = item.section ? ` data-section="${item.section}"` : '';
            const id = (!isFavSection && item.id) ? ` id="${item.id}"` : '';
            const target = item.target ? ` target="${item.target}"` : '';
            const rel = item.target === '_blank' ? ' rel="noopener noreferrer"' : '';
            const href = item.href || (item.section ? itemHref(item.section) : '#');

            const isFav = favorites.includes(item.label);

            return `
                <li class="nav-item${visible}${hiddenClass}"${hiddenStyle}${categoryAttr}>
                    <div class="nav-link-wrap">
                        <a href="${href}" class="nav-link${active}"${dataSection}${id}${target}${rel} title="${item.label}">
                            <span class="material-symbols-outlined">${item.icon}</span>
                            <span>${item.label}</span>
                            ${item.badgeId ? `<span id="${item.badgeId}" class="nav-badge" style="display: none;">0</span>` : ''}
                        </a>
                        <button class="nav-fav-toggle-btn${isFav ? ' active-fav' : ''}" data-label="${item.label}" title="${isFav ? 'Fjern fra favoritter' : 'Legg til i favoritter'}">
                            <span class="material-symbols-outlined star-icon-element${isFav ? ' active' : ''}">star</span>
                        </button>
                    </div>
                </li>
            `;
        };

        const renderHeader = (category, label) => `
            <li class="nav-category-header" data-target-category="${category}">
                <span>${label}</span>
                <span class="material-symbols-outlined expand-icon">expand_more</span>
            </li>
        `;

        const mainItems = [
            { label: 'Oversikt', icon: 'home', section: 'overview', href: '/admin/index.html#overview', alwaysVisible: true },
            { label: 'Min Side', icon: 'account_circle', href: '/minside/index.html', alwaysVisible: true, id: 'admin-profile-trigger-sidebar' },
            { label: 'Se nettside', icon: 'visibility', href: '/', alwaysVisible: true, target: '_blank' },
            { header: 'nettsted', label: 'Nettsted' },
            { label: 'Sideinnhold', icon: 'description', section: 'content', category: 'nettsted' },
            { label: 'Blogg', icon: 'edit_note', section: 'blog', category: 'nettsted' },
            { label: 'Media', icon: 'image', section: 'media', category: 'nettsted' },
            { label: 'Podcast', icon: 'podcasts', section: 'podcast', category: 'nettsted' },
            { label: 'Hero Slider', icon: 'view_carousel', section: 'hero', category: 'nettsted' },
            { label: 'Undervisning', icon: 'school', section: 'teaching', category: 'nettsted' },
            { label: 'Kursadministrasjon', icon: 'menu_book', section: 'courses', category: 'nettsted' },
            { label: 'Leseplaner', icon: 'auto_stories', section: 'reading-plans', category: 'nettsted' },
            { label: 'Design & Logo', icon: 'palette', section: 'design', category: 'nettsted' },
            { header: 'kommunikasjon', label: 'Kommunikasjon' },
            { label: 'Arrangementer', icon: 'event', section: 'events', category: 'kommunikasjon' },
            { label: 'Kontakter', icon: 'group', href: '/admin/admin-kommunikasjon.html', path: 'admin-kommunikasjon', category: 'kommunikasjon' },
            { label: 'Segmenter', icon: 'segment', href: '/admin/admin-segmenter.html', path: 'admin-segmenter', category: 'kommunikasjon' },
            { label: 'Meldinger', icon: 'inbox', href: '/admin/admin-meldinger.html', path: 'admin-meldinger', category: 'kommunikasjon', badgeId: 'messages-badge' },
            { label: 'Kommentarer', icon: 'forum', section: 'comments', category: 'kommunikasjon' },
            { label: 'HKM Studio', icon: 'auto_awesome', href: '/admin/admin-nyhetsbrev.html', path: 'admin-nyhetsbrev', category: 'kommunikasjon' },
            { label: 'Nyhetsbrev', icon: 'mail', href: '/admin/admin-nyhetsbrev.html', path: 'admin-nyhetsbrev', category: 'kommunikasjon' },
            { header: 'administrasjon', label: 'Administrasjon' },
            { label: 'Huskeliste', icon: 'playlist_add_check', section: 'todo', category: 'administrasjon', alwaysVisible: true },
            { label: 'Gaver', icon: 'volunteer_activism', section: 'causes', category: 'administrasjon' },
            { label: 'Butikk', icon: 'shopping_cart', section: 'shop', category: 'administrasjon' },
            { label: 'Brukere', icon: 'group', section: 'users', category: 'administrasjon' },
            { label: 'Automatisering', icon: 'auto_awesome', section: 'automation', category: 'administrasjon' },
            { label: 'SEO & Meta', icon: 'search_insights', section: 'seo', category: 'administrasjon' },
            { label: 'Innstillinger', icon: 'settings', section: 'settings', category: 'administrasjon' },
            { label: 'Integrasjoner', icon: 'hub', section: 'integrations', category: 'administrasjon' },
            { label: 'Analyse', icon: 'analytics', href: '/admin/admin-analytics.html', path: 'admin-analytics', category: 'administrasjon', alwaysVisible: true },
            { label: 'Systemlogger', icon: 'assignment', href: '/admin/admin-logger.html', path: 'admin-logger', category: 'administrasjon', alwaysVisible: true }
        ];

        const favoritedItems = mainItems
            .filter(item => !item.header && favorites.includes(item.label))
            .sort((a, b) => a.label.localeCompare(b.label, 'no'));
        let favHtml = '';
        if (favoritedItems.length > 0) {
            const favItemsHtml = favoritedItems.map(item => renderItem(item, true)).join('');
            favHtml = `
                <li class="nav-category-header" data-target-category="favoritter">
                    <span>Favoritter</span>
                    <span class="material-symbols-outlined expand-icon">expand_more</span>
                </li>
                ${favItemsHtml}
            `;
        }

        const footerItems = [];

        // Split mainItems into top-level items and categorized items
        const topLevelItems = mainItems.filter(item => !item.header && !item.category);
        const categorizedItems = mainItems.filter(item => item.header || item.category);

        const topLevelHtml = topLevelItems.map(item => renderItem(item)).join('');
        const categorizedHtml = categorizedItems.map((item) => (
            item.header ? renderHeader(item.header, item.label) : renderItem(item)
        )).join('');

        const footerHtml = footerItems.map(item => renderItem(item)).join('') + `
            <li class="nav-item visible" data-nav-category="all">
                <button id="logout-btn" class="nav-link logout" title="Logg ut">
                    <span class="material-symbols-outlined">logout</span>
                    <span>Logg ut</span>
                </button>
            </li>
        `;

        sidebarNav.innerHTML = `
            <div class="nav-group">
                <ul class="nav-list">
                    ${topLevelHtml}
                    ${favHtml}
                    ${categorizedHtml}
                </ul>
            </div>
            <div class="nav-group bottom">
                <ul class="nav-list">${footerHtml}</ul>
            </div>
        `;
        sidebarNav.dataset.hkmNormalized = '1';
        setupDesktopSidebarToggle();
    };

    console.log("[admin-header] Normalizing sidebar...");
    normalizeSidebarNavigation();

    // Hydrate cached identity immediately to avoid visible "Laster..." hangs.
    if (cachedIdentity?.displayName) {
        console.log("[admin-header] Hydrating cached identity:", cachedIdentity.displayName);
        renderIdentity(cachedIdentity.displayName, cachedIdentity.photoURL || '');
    }

    // Final guardrail: never leave the loading placeholder indefinitely.
    console.log("[admin-header] Scheduling final guardrail timeout...");
    setTimeout(() => {
        const { adminNames } = getIdentityEls();
        const hasLaster = adminNames.some(el => el && el.textContent.trim() === 'Laster...');
        if (hasLaster) {
            console.log("[admin-header] Guardrail timeout fired: Name is still loading. Rendering cached or default identity.");
            renderIdentity(cachedIdentity?.displayName || 'Administrator', cachedIdentity?.photoURL || '');
        }
    }, 1500);

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
                        window.location.href = '/admin/login.html';
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
                    : () => { window.location.href = '/minside/index.html'; };
                redirect({
                    path: '/minside/index.html',
                    message: 'Access Denied: Du har ikke administratorrettigheter til denne siden.'
                });
                return;
            }

            const googlePhoto = (user.providerData || []).find(p => p && p.photoURL)?.photoURL || '';
            const initialPhoto = user.photoURL || googlePhoto || (cachedIdentity && cachedIdentity.photoURL) || '';

            // Render immediately from Auth so UI never stays in "Laster..."
            renderIdentity(authFallbackName(user), initialPhoto);
            writeCachedIdentity(authFallbackName(user), initialPhoto);

            let userProfile = null;
            try {
                const userDoc = await withTimeout(firebase.firestore().collection('users').doc(user.uid).get(), 2500);
                if (userDoc && userDoc.exists) userProfile = userDoc.data();
            } catch (e) { }

            let settingsProfile = null;
            try {
                settingsProfile = await withTimeout(firebaseService.getPageContent('settings_profile'), 2000);
            } catch (e) {}

            const displayName = (userProfile && userProfile.displayName)
                || (settingsProfile && settingsProfile.fullName)
                || authFallbackName(user);

            const photoURL = (userProfile && (userProfile.photoURL || userProfile.photo_url || userProfile.avatarUrl)) 
                || (settingsProfile && (settingsProfile.photoUrl || settingsProfile.photoURL))
                || user.photoURL 
                || googlePhoto
                || (cachedIdentity && cachedIdentity.photoURL) 
                || '';
            renderIdentity(displayName, photoURL);
            writeCachedIdentity(displayName, photoURL);

            // Fetch and apply bottom nav settings
            try {
                const designSettings = await firebaseService.getPageContent('settings_design');
                if (designSettings && Array.isArray(designSettings.adminBottomNav)) {
                    applyAdminBottomNavSettings(designSettings.adminBottomNav);
                }
            } catch (e) {
                console.warn('[admin-header] Failed to load design settings for bottom nav:', e);
            }
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
                window.location.replace('/admin/login.html');
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


    // Mobile Nav Toggle (Supports both dashboard and builder instances)
    const mobileNavToggles = document.querySelectorAll('.mobile-nav-toggle');
    const sidebar = document.querySelector('.sidebar');

    // Create overlay if missing (for better mobile UX)
    let sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (!sidebarOverlay && sidebar) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'sidebar-overlay';
        document.body.appendChild(sidebarOverlay);
    }

    if (mobileNavToggles.length > 0 && sidebar) {
        // Set initial title based on state
        const updateToggleTitle = () => {
            const isCollapsed = document.body.classList.contains('sidebar-collapsed');
            mobileNavToggles.forEach(toggle => {
                const isBuilderToggle = Boolean(toggle.closest('#newsletter-builder-layout'));
                const isOpen = sidebar.classList.contains('active');
                const title = isBuilderToggle
                    ? (isOpen ? 'Skjul hovedmeny' : 'Vis hovedmeny')
                    : (isCollapsed ? 'Vis meny' : 'Skjul meny');
                toggle.setAttribute('title', title);
                toggle.setAttribute('aria-label', title);
                toggle.setAttribute('aria-expanded', String(isBuilderToggle ? isOpen : !isCollapsed));
            });
        };
        updateToggleTitle();

        const toggleSidebar = (force) => {
            const isActive = force !== undefined ? force : !sidebar.classList.contains('active');
            sidebar.classList.toggle('active', isActive);
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active', isActive);
            }
        };

        mobileNavToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isBuilderToggle = document.body.classList.contains('builder-active')
                    && Boolean(toggle.closest('#newsletter-builder-layout'));
                if (isBuilderToggle) {
                    document.body.classList.remove('sidebar-collapsed');
                    toggleSidebar();
                    updateToggleTitle();
                } else if (window.innerWidth > 1024) {
                    document.body.classList.toggle('sidebar-collapsed');
                    updateToggleTitle();
                } else {
                    toggleSidebar();
                    updateToggleTitle();
                }
            });
        });

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                toggleSidebar(false);
                updateToggleTitle();
            });
        }
    }

    // --- Collapsible Sidebar Categories (Hardened) ---
    const initSidebarCategories = () => {
        const categoryHeaders = document.querySelectorAll('.nav-category-header[data-target-category]');
        if (categoryHeaders.length === 0) return;

        window.hkmRestoreSidebarCategories = () => {
            if (document.body.classList.contains('sidebar-mini')) {
                document.querySelectorAll('.nav-item[data-nav-category]').forEach(item => {
                    item.style.setProperty('display', 'flex', 'important');
                    item.style.setProperty('visibility', 'visible', 'important');
                    item.style.setProperty('opacity', '1', 'important');
                });
                return;
            }

            categoryHeaders.forEach(header => {
                const cat = header.getAttribute('data-target-category');
                const activeLink = document.querySelector('.nav-link.active[data-section]');
                const activeSection = activeLink?.getAttribute('data-section') || window.location.hash.substring(1) || sessionStorage.getItem('hkm_admin_last_dashboard_section') || 'overview';
                const matchingNavItem = document.querySelector(`.nav-item[data-nav-category] a[data-section="${activeSection}"]`);
                const activeCat = matchingNavItem?.closest('.nav-item')?.getAttribute('data-nav-category');

                let shouldBeOpen = (cat === 'kommunikasjon');
                if (activeCat) {
                    shouldBeOpen = (cat === activeCat);
                }
                setCategory(cat, shouldBeOpen);
            });
        };

        function setCategory(category, shouldBeOpen) {
            const header = document.querySelector(`.nav-category-header[data-target-category="${category}"]`);
            const items = document.querySelectorAll(`.nav-item[data-nav-category="${category}"]`);
            if (!header) return;

            const isMini = document.body.classList.contains('sidebar-mini');
            if (shouldBeOpen || isMini) {
                header.classList.remove('collapsed');
                items.forEach(item => {
                    item.classList.remove('nav-cat-hidden');
                    item.classList.add('visible');
                    item.style.setProperty('display', 'flex', 'important');
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
        }

        window.hkmRestoreSidebarCategories();

        categoryHeaders.forEach(header => {
            header.onclick = (e) => {
                e.preventDefault();
                const cat = header.getAttribute('data-target-category');
                const currentlyCollapsed = header.classList.contains('collapsed');
                
                if (currentlyCollapsed) {
                    categoryHeaders.forEach(otherHeader => {
                        const otherCat = otherHeader.getAttribute('data-target-category');
                        if (otherCat !== cat) {
                            setCategory(otherCat, false);
                        }
                    });
                }
                
                setCategory(cat, currentlyCollapsed);
            };
        });

        // Auto-expand category on section switch (hashchange)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                const navItem = document.querySelector(`.nav-item[data-nav-category] a[data-section="${hash}"]`);
                const cat = navItem?.closest('.nav-item')?.getAttribute('data-nav-category');
                if (cat) {
                    // Collapse all other categories
                    categoryHeaders.forEach(otherHeader => {
                        const otherCat = otherHeader.getAttribute('data-target-category');
                        if (otherCat !== cat) {
                            setCategory(otherCat, false);
                        }
                    });
                    setCategory(cat, true);
                }
            }
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
            const builderToggle = document.querySelector('#newsletter-builder-layout .mobile-nav-toggle');
            if (builderToggle) {
                builderToggle.setAttribute('title', 'Vis hovedmeny');
                builderToggle.setAttribute('aria-label', 'Vis hovedmeny');
                builderToggle.setAttribute('aria-expanded', 'false');
            }
        };
    }

    // --- Global Search Handler (Visual Only) ---
    if (sidebar) {
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            const isClickingToggle = Array.from(mobileNavToggles).some(toggle => toggle.contains(e.target) || toggle === e.target);
            if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !isClickingToggle) {
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
        } else if (href === '#' && (currentPath.endsWith('/admin/index.html') || currentPath.endsWith('admin/'))) {
            // Oversikt fallback
            if (item.getAttribute('data-section') === 'overview') {
                item.classList.add('active');
            }
        }
    });

    const applyAdminBottomNavSettings = (activeIds) => {
        if (!Array.isArray(activeIds)) return;
        bottomNavItems.forEach(item => {
            const href = item.getAttribute('href') || '';
            const section = item.getAttribute('data-section') || '';
            let id = '';
            if (section === 'overview' || href.includes('#overview')) {
                id = 'overview';
            } else if (href.includes('kommunikasjon')) {
                id = 'contacts';
            } else if (href.includes('minside')) {
                id = 'minside';
            } else if (section === 'settings' || href.includes('#settings')) {
                id = 'settings';
            }

            if (id) {
                if (activeIds.includes(id)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    };

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

    const normalizeTopbarHeader = () => {
        const actionsContainer = document.querySelector('.main-header .section-header-actions');
        if (!actionsContainer) return;

        // 1. Convert search button to bento search bar if it's still a simple button
        const searchBtn = actionsContainer.querySelector('#global-search-opener');
        if (searchBtn && !searchBtn.classList.contains('bento-search-bar')) {
            const newSearch = document.createElement('div');
            newSearch.id = 'global-search-opener';
            newSearch.className = 'bento-search-bar';
            newSearch.title = 'Søk (CMD+K)';
            newSearch.innerHTML = `
                <span class="material-symbols-outlined">search</span>
                <span class="bento-search-text" style="user-select: none; line-height: 1;">Søk her...</span>
            `;
            searchBtn.replaceWith(newSearch);
            
            // Re-bind the search opener event listener
            newSearch.addEventListener('click', () => {
                const searchModal = document.getElementById('search-modal') || document.getElementById('site-search-modal');
                if (searchModal) {
                    searchModal.classList.add('active');
                    const searchInput = document.getElementById('site-search-input-v2') || document.getElementById('search-input-v2') || document.getElementById('site-search-input');
                    if (searchInput) searchInput.focus();
                }
            });
        }

        // 3. Inject theme switcher if missing
        let themeToggle = actionsContainer.querySelector('#admin-theme-toggle');
        if (!themeToggle) {
            themeToggle = document.createElement('button');
            themeToggle.id = 'admin-theme-toggle';
            themeToggle.className = 'notification-btn';
            themeToggle.title = 'Bytt tema';
            themeToggle.style.marginRight = '8px';
            
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const iconName = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
            
            themeToggle.innerHTML = `<span class="material-symbols-outlined theme-toggle-icon" style="font-size: 20px;">${iconName}</span>`;
            
            // Insert it before profile link
            const profileLink = actionsContainer.querySelector('.user-profile-link');
            if (profileLink) {
                actionsContainer.insertBefore(themeToggle, profileLink);
            } else {
                actionsContainer.appendChild(themeToggle);
            }
            
            themeToggle.addEventListener('click', () => {
                const active = document.documentElement.getAttribute('data-theme') || 'light';
                const nextTheme = active === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', nextTheme);
                localStorage.setItem('hkm_theme', nextTheme);
                
                const icon = themeToggle.querySelector('.theme-toggle-icon');
                if (icon) {
                    icon.textContent = nextTheme === 'dark' ? 'light_mode' : 'dark_mode';
                }
                
                window.dispatchEvent(new CustomEvent('hkmThemeChanged', { detail: { theme: nextTheme } }));
            });

            // Listen for theme change events to sync icon if changed elsewhere
            window.addEventListener('hkmThemeChanged', (e) => {
                const updatedTheme = e.detail.theme;
                const icon = themeToggle.querySelector('.theme-toggle-icon');
                if (icon) {
                    icon.textContent = updatedTheme === 'dark' ? 'light_mode' : 'dark_mode';
                }
            });
        }

        // 2. Remove language switcher from admin header (language is inherited from main website preference)
        const langSwitcher = actionsContainer.querySelector('.header-lang-switcher, .lang-switcher');
        if (langSwitcher) {
            langSwitcher.remove();
        }

        // Inherit preferred language from main website (defaulting to 'no')
        const siteLang = localStorage.getItem('hkm_preferred_lang') || 'no';
        document.documentElement.lang = siteLang;
        window.hkmAdminLanguage = siteLang;
    };

    normalizeTopbarHeader();

    // Sidebar Category logic is now handled in the main dashboard script in index.html
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminHeader);
} else {
    initAdminHeader();
}
}
