/**
 * HKM Notification System
 * Unified toast and alert notifications for site and admin.
 */

class HKMNotifications {
    constructor() {
        this.toastContainer = null;
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

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? 'check_circle' :
            type === 'error' ? 'error' :
                type === 'warning' ? 'warning' : 'info';

        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon">${icon}</span>
            <div class="toast-content">
                <p class="toast-message">${message}</p>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
            <div class="toast-progress">
                <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        `;

        this.toastContainer.appendChild(toast);

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
                    this.toastContainer.removeChild(toast);
                }
            }, 300);
        }
    }
}

// Global instance
window.hkm_notifications = new HKMNotifications();

// Shorthand helpers
window.showToast = (msg, type, dur) => window.hkm_notifications.show(msg, type, dur);
window.showAlert = (msg, type, dur) => window.hkm_notifications.show(msg, type, dur); // For now, alerts are just toasts
