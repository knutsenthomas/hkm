import { flushDonationAnalytics } from './donation-analytics.js';
// The build injects /privacy-consent.js before all optional scripts on public pages.
window.showCookieBanner = () => window.SitePrivacy?.show();
window.addEventListener('siteprivacychange', () => {
    if (window.SitePrivacy?.allows('analytics')) flushDonationAnalytics();
});
if (window.SitePrivacy?.allows('analytics')) flushDonationAnalytics();

(function() {
    const loadFontAwesome = () => {
        window.removeEventListener('scroll', loadFontAwesome);
        window.removeEventListener('mousemove', loadFontAwesome);
        window.removeEventListener('touchstart', loadFontAwesome);
        window.removeEventListener('keydown', loadFontAwesome);

        if (window.fontAwesomeLoaded) return;
        window.fontAwesomeLoaded = true;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(link);
    };

    window.addEventListener('scroll', loadFontAwesome, { passive: true });
    window.addEventListener('mousemove', loadFontAwesome, { passive: true });
    window.addEventListener('touchstart', loadFontAwesome, { passive: true });
    window.addEventListener('keydown', loadFontAwesome, { passive: true });
})();
