/**
 * HKM Notification System
 * Unified toast and alert notifications for site and admin.
 */

class HKMNotifications {
    constructor() {
        this.toastContainer = null;
        this.activeToastsByKey = new Map();
        this.lastToastShownAt = new Map();
        this.dedupeWindowMs = 6000;
        this.init();
    }

    init() {
        if (!document.querySelector('.toast-container')) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        } else {
            this.toastContainer = document.querySelector('.toast-container');
        }
    }

    show(message, type = 'success', duration = 5000) {
        if (!this.toastContainer) this.init();
        const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
        const safeMessage = String(message ?? '').trim();
        if (!safeMessage) return;

        const toastKey = `${safeType}:${safeMessage}`;
        const now = Date.now();
        const activeToast = this.activeToastsByKey.get(toastKey);
        if (activeToast && activeToast.parentElement) {
            return;
        }

        const lastShownAt = this.lastToastShownAt.get(toastKey) || 0;
        if (now - lastShownAt < Math.max(1500, Math.min(duration, this.dedupeWindowMs))) {
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${safeType}`;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', safeType === 'error' ? 'assertive' : 'polite');
        toast.dataset.toastKey = toastKey;

        const icon = safeType === 'success' ? 'check_circle' :
            safeType === 'error' ? 'error' :
                safeType === 'warning' ? 'warning' : 'info';

        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon">${icon}</span>
            <div class="toast-content">
                <p class="toast-message"></p>
            </div>
            <button class="toast-close" aria-label="Lukk melding">
                <span class="material-symbols-outlined" style="font-size:18px;">close</span>
            </button>
            <div class="toast-progress">
                <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        `;

        const messageEl = toast.querySelector('.toast-message');
        if (messageEl) {
            messageEl.textContent = safeMessage;
        }

        this.toastContainer.appendChild(toast);
        this.activeToastsByKey.set(toastKey, toast);
        this.lastToastShownAt.set(toastKey, now);

        // Auto remove
        const timer = setTimeout(() => {
            this.remove(toast);
        }, duration);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(timer);
            this.remove(toast);
        });

        // Close on click
        toast.addEventListener('click', () => {
            clearTimeout(timer);
            this.remove(toast);
        });
    }

    remove(toast) {
        if (toast.parentElement) {
            toast.classList.add('removing');
            setTimeout(() => {
                if (toast.parentElement) {
                    const toastKey = toast.dataset && toast.dataset.toastKey ? toast.dataset.toastKey : '';
                    if (toastKey && this.activeToastsByKey.get(toastKey) === toast) {
                        this.activeToastsByKey.delete(toastKey);
                    }
                    this.toastContainer.removeChild(toast);
                }
            }, 300);
        } else {
            const toastKey = toast && toast.dataset && toast.dataset.toastKey ? toast.dataset.toastKey : '';
            if (toastKey && this.activeToastsByKey.get(toastKey) === toast) {
                this.activeToastsByKey.delete(toastKey);
            }
        }
    }
}

// Global instance
window.hkm_notifications = new HKMNotifications();

// Shorthand helpers
window.showToast = (msg, type, dur) => window.hkm_notifications.show(msg, type, dur);
window.showAlert = (msg, type, dur) => window.hkm_notifications.show(msg, type, dur); // For now, alerts are just toasts
