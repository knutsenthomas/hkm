/**
 * Global Error Logger for His Kingdom Ministry
 * Catches unhandled errors and reports them to the backend.
 */

(function () {
    // Configuration
    const LOG_ENDPOINT = 'https://us-central1-his-kingdom-ministry.cloudfunctions.net/logSystemError'; // Replace with your actual project ID if different
    const IS_PROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    // Helper to send log
    async function sendLog(type, message, severity = 'WARNING', additionalData = {}) {
        // Don't log localhost errors unless critical
        if (!IS_PROD && severity !== 'CRITICAL') {
            console.warn('[Local Logger]', type, message);
            return;
        }

        try {
            await fetch(LOG_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    message,
                    severity,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    userId: getUserId(), // Helper to get ID if logged in
                    additionalData
                })
            });
        } catch (e) {
            console.error('Failed to send system log:', e);
        }
    }

    // Helper to get diverse user ID
    function getUserId() {
        try {
            // Check Firebase Auth (if available in localStorage)
            const firebaseUser = Object.keys(localStorage).find(key => key.startsWith('firebase:authUser'));
            if (firebaseUser) {
                const user = JSON.parse(localStorage.getItem(firebaseUser));
                return user.uid;
            }
        } catch (e) { }
        return 'anonymous';
    }

    // 1. Catch Global Script Errors
    window.onerror = function (message, source, lineno, colno, error) {
        const errorMessage = message || 'Unknown Script Error';

        // Ignore common noise (e.g. browser extensions)
        if (errorMessage.includes('Script error.') && !error) return;

        // Ignore benign ResizeObserver error
        if (errorMessage.includes('ResizeObserver loop completed with undelivered notifications')) return;

        sendLog('ScriptError', `${errorMessage} at ${source}:${lineno}:${colno}`, 'WARNING', {
            stack: error ? error.stack : null
        });

        // Optional: Show friendly toast to user
        showErrorToast();
    };

    // 2. Catch Unhandled Promise Rejections
    window.onunhandledrejection = function (event) {
        sendLog('UnhandledPromise', event.reason ? event.reason.toString() : 'Unknown Promise Error', 'WARNING');
    };

    // UI: Friendly Error Toast
    function showErrorToast() {
        // Prevent spamming toasts
        if (document.getElementById('hkm-error-toast')) return;

        const toast = document.createElement('div');
        toast.id = 'hkm-error-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideUp 0.3s ease;
        `;
        toast.innerHTML = `
            <i class="fas fa-exclamation-circle" style="color: #FFA500;"></i>
            <span>En uventet feil oppstod. Vi har logget problemet.</span>
            <button style="background:none; border:none; color:#aaa; cursor:pointer; margin-left:10px;">&times;</button>
        `;

        document.body.appendChild(toast);

        // Close button
        toast.querySelector('button').onclick = () => toast.remove();

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    }

    // Add slideUp animation
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Export for manual usage
    window.hkmLogger = {
        log: (msg) => sendLog('ManualLog', msg, 'INFO'),
        warn: (msg) => sendLog('ManualWarning', msg, 'WARNING'),
        error: (msg) => sendLog('ManualError', msg, 'CRITICAL')
    };

})();
