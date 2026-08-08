/**
 * HKM Global Utilities & Helper Functions
 * Shared helper methods for date formatting, HTML sanitization, CSV exporting,
 * string operations, and UI toast notifications across HKM web application.
 */
(function (window) {
    'use strict';

    const HKMUtils = {
        /**
         * Safe HTML escaping to prevent XSS injection
         */
        escapeHTML(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        /**
         * Strip HTML tags from a string
         */
        stripTags(html) {
            if (!html || typeof html !== 'string') return '';
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        },

        /**
         * Truncate string with ellipsis
         */
        truncate(str, maxLength = 100, suffix = '...') {
            if (!str || typeof str !== 'string') return '';
            if (str.length <= maxLength) return str;
            return str.substring(0, maxLength).trim() + suffix;
        },

        /**
         * Norwegian date formatting helper
         */
        formatDate(dateInput, options = {}) {
            if (!dateInput) return '';
            try {
                let d = dateInput;
                if (typeof dateInput === 'number' || typeof dateInput === 'string') {
                    d = new Date(dateInput);
                } else if (dateInput.toDate && typeof dateInput.toDate === 'function') {
                    d = dateInput.toDate();
                }
                if (isNaN(d.getTime())) return '';

                const monthsNo = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
                const day = d.getDate();
                const month = monthsNo[d.getMonth()];
                const year = d.getFullYear();

                if (options.short) {
                    const pad = n => String(n).padStart(2, '0');
                    return `${pad(day)}.${pad(d.getMonth() + 1)}.${year}`;
                }

                if (options.includeTime) {
                    const hours = String(d.getHours()).padStart(2, '0');
                    const mins = String(d.getMinutes()).padStart(2, '0');
                    return `${day}. ${month} ${year} kl. ${hours}:${mins}`;
                }

                return `${day}. ${month} ${year}`;
            } catch (e) {
                return '';
            }
        },

        /**
         * Relative time ago in Norwegian (f.eks. "2 timer siden", "for 3 dager siden")
         */
        timeAgo(dateInput) {
            if (!dateInput) return '';
            try {
                let d = dateInput;
                if (typeof dateInput === 'number' || typeof dateInput === 'string') {
                    d = new Date(dateInput);
                } else if (dateInput.toDate && typeof dateInput.toDate === 'function') {
                    d = dateInput.toDate();
                }
                if (isNaN(d.getTime())) return '';

                const now = new Date();
                const seconds = Math.floor((now - d) / 1000);
                if (seconds < 60) return 'Akkurat nå';
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes} min siden`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours} t siden`;
                const days = Math.floor(hours / 24);
                if (days < 30) return `${days} dager siden`;
                const months = Math.floor(days / 30);
                if (months < 12) return `${months} mnd siden`;
                return `${Math.floor(months / 12)} år siden`;
            } catch (e) {
                return '';
            }
        },

        /**
         * Export array of objects/rows to Norwegian Excel CSV (Semicolon separator + UTF-8 BOM)
         */
        exportCSV(filename, headers, rows) {
            if (!rows || !rows.length) return;
            try {
                const bom = '\uFEFF'; // UTF-8 BOM for Norwegian Excel (æ, ø, å)
                const delimiter = ';'; // Semicolon delimiter for Norwegian Excel

                let csvContent = bom;

                if (headers && headers.length) {
                    const headerLine = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(delimiter);
                    csvContent += headerLine + '\r\n';
                }

                rows.forEach(row => {
                    let rowValues = [];
                    if (Array.isArray(row)) {
                        rowValues = row;
                    } else if (typeof row === 'object' && row !== null) {
                        rowValues = Object.values(row);
                    }
                    const line = rowValues.map(val => {
                        if (val === null || val === undefined) return '""';
                        return `"${String(val).replace(/"/g, '""')}"`;
                    }).join(delimiter);
                    csvContent += line + '\r\n';
                });

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error('[HKMUtils] CSV Export error:', e);
            }
        },

        /**
         * Debounce function calls
         */
        debounce(func, wait = 300) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle function calls
         */
        throttle(func, limit = 300) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Show UI Toast notification
         */
        showToast(message, type = 'info', duration = 3000) {
            let container = document.getElementById('hkm-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'hkm-toast-container';
                container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `hkm-toast hkm-toast-${type}`;
            const bgMap = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#1e293b'
            };
            const bg = bgMap[type] || bgMap.info;
            toast.style.cssText = `background:${bg};color:#ffffff;padding:12px 20px;border-radius:12px;font-weight:600;font-size:14px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.2);opacity:0;transform:translateY(10px);transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);pointer-events:auto;max-width:380px;line-height:1.4;`;
            toast.textContent = message;

            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    if (toast.parentElement) toast.parentElement.removeChild(toast);
                }, 300);
            }, duration);
        }
    };

    window.HKMUtils = HKMUtils;
})(window);
