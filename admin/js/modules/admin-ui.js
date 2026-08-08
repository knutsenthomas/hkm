/**
 * HKM Admin UI Module
 * Controls modals, drawer overlays, active tabs, and loading indicators.
 */
(function (window) {
    'use strict';

    const AdminUI = {
        openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        },

        closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        },

        toggleDrawer(drawerId, open) {
            const drawer = document.getElementById(drawerId);
            if (!drawer) return;
            const isOpening = open !== undefined ? open : !drawer.classList.contains('active');
            if (isOpening) {
                drawer.classList.add('active');
            } else {
                drawer.classList.remove('active');
            }
        },

        showLoader(containerId = 'main-loader') {
            const loader = document.getElementById(containerId);
            if (loader) loader.style.display = 'flex';
        },

        hideLoader(containerId = 'main-loader') {
            const loader = document.getElementById(containerId);
            if (loader) loader.style.display = 'none';
        }
    };

    window.AdminUI = AdminUI;
})(window);
