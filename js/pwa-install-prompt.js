/**
 * His Kingdom Ministry - PWA Install Prompt Banner
 * Provides a modern, non-intrusive 'Add to Home Screen' prompt for iOS and Android.
 */
(function () {
    'use strict';

    // Don't show in admin panel or if already in standalone app mode
    if (window.location.pathname.startsWith('/admin')) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    // Check if dismissed within the last 14 days
    const dismissedUntil = localStorage.getItem('hkm_pwa_dismissed_until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isMobile = isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    // Only prompt on mobile devices
    if (!isMobile) return;

    let deferredPrompt = null;

    // Capture Android install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showBanner('android');
    });

    // Check if iOS after page load
    if (isIOS) {
        // Wait 3.5s after load so user has engaged with the page
        window.addEventListener('load', () => {
            setTimeout(() => {
                showBanner('ios');
            }, 3500);
        });
    }

    function showBanner(platform) {
        if (document.getElementById('hkm-pwa-install-modal')) return;

        const isNo = document.documentElement.lang === 'no' || !document.documentElement.lang;
        const isEs = document.documentElement.lang === 'es';

        const titleText = isNo ? 'Få HKM som app på mobilen' : (isEs ? 'Instala HKM en tu móvil' : 'Get HKM on your phone');
        const descText = isNo 
            ? 'Få rask tilgang til Bibelen, leseplaner, kurs og podkaster rett fra hjemskjermen din – selv uten nett!'
            : (isEs 
                ? 'Accede rápidamente a la Biblia, devocionales y cursos desde tu pantalla de inicio.'
                : 'Get instant access to the Bible, reading plans, courses and podcasts from your home screen.');
        const installBtnText = isNo ? 'Installer app nå' : (isEs ? 'Instalar app' : 'Install app');
        const dismissText = isNo ? 'Kanskje senere' : (isEs ? 'Más tarde' : 'Maybe later');

        const iosGuideHtml = `
            <div style="background: rgba(209, 125, 57, 0.08); border: 1px dashed #d17d39; border-radius: 12px; padding: 14px; margin-top: 14px; text-align: left; font-size: 0.88rem; color: #334155; line-height: 1.5;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="width: 22px; height: 22px; border-radius: 50%; background: #d17d39; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">1</span>
                    <span>Trykk på <strong>Del-ikonet</strong> <i class="fas fa-share-square" style="color: #0284c7;"></i> nederst i Safari</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="width: 22px; height: 22px; border-radius: 50%; background: #d17d39; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800;">2</span>
                    <span>Velg <strong>«Legg til på Hjem-skjerm»</strong> <i class="fas fa-plus-square" style="color: #1b4965;"></i></span>
                </div>
            </div>
        `;

        const banner = document.createElement('div');
        banner.id = 'hkm-pwa-install-modal';
        banner.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 16px;
            right: 16px;
            max-width: 440px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 12px 36px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06);
            padding: 22px 24px;
            z-index: 999999;
            transform: translateY(120%);
            opacity: 0;
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        banner.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px;">
                <div style="width: 52px; height: 52px; border-radius: 14px; overflow: hidden; flex-shrink: 0; background: #ffffff; box-shadow: 0 4px 12px rgba(209, 125, 57, 0.2); border: 1.5px solid rgba(209, 125, 57, 0.25); display: flex; align-items: center; justify-content: center;">
                    <img src="/icons/icon-192.png?v=3" alt="HKM App" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/img/logo-hkm.png'">
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <h4 style="font-size: 1.05rem; font-weight: 800; color: #1b4965; margin: 0 0 4px 0; letter-spacing: -0.01em;">${titleText}</h4>
                        <button id="hkm-pwa-close-btn" style="background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; padding: 4px; line-height: 1; min-width: 32px; min-height: 32px;">&times;</button>
                    </div>
                    <p style="font-size: 0.86rem; color: #475569; margin: 0; line-height: 1.45;">${descText}</p>
                </div>
            </div>

            ${platform === 'ios' ? iosGuideHtml : `
                <div style="display: flex; gap: 10px; margin-top: 16px;">
                    <button id="hkm-pwa-install-action-btn" style="flex: 1; background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; border: none; border-radius: 12px; padding: 12px 18px; font-size: 0.92rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.35); min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.15s ease;">
                        <i class="fas fa-download"></i> ${installBtnText}
                    </button>
                    <button id="hkm-pwa-dismiss-btn" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; font-size: 0.88rem; font-weight: 600; cursor: pointer; min-height: 44px;">
                        ${dismissText}
                    </button>
                </div>
            `}
        `;

        document.body.appendChild(banner);

        // Slide in
        requestAnimationFrame(() => {
            banner.style.transform = 'translateY(0)';
            banner.style.opacity = '1';
        });

        // Close handlers
        const dismissBanner = () => {
            banner.style.transform = 'translateY(120%)';
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 350);
            localStorage.setItem('hkm_pwa_dismissed_until', String(Date.now() + 14 * 24 * 60 * 60 * 1000));
        };

        const closeBtn = banner.querySelector('#hkm-pwa-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', dismissBanner);

        const dismissBtn = banner.querySelector('#hkm-pwa-dismiss-btn');
        if (dismissBtn) dismissBtn.addEventListener('click', dismissBanner);

        const installBtn = banner.querySelector('#hkm-pwa-install-action-btn');
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        dismissBanner();
                    }
                    deferredPrompt = null;
                }
            });
        }
    }
})();
