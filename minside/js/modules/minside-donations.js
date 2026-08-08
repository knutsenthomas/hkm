/**
 * HKM MinSide Donations Module
 * Manages donor records, Vipps/Stripe recurring gifts, and tax deduction receipts.
 */
(function (window) {
    'use strict';

    const MinSideDonations = {
        formatCurrency(amount, currency = 'NOK') {
            if (amount === null || amount === undefined || isNaN(amount)) return '0 kr';
            return new Intl.NumberFormat('no-NO', {
                style: 'currency',
                currency: currency,
                maximumFractionDigits: 0
            }).format(amount);
        },

        filterDonations(donations = [], year = 'all') {
            if (!Array.isArray(donations)) return [];
            if (year === 'all') return donations;
            return donations.filter(d => {
                const date = d.date || d.createdAt;
                if (!date) return false;
                const dYear = new Date(date).getFullYear().toString();
                return dYear === String(year);
            });
        }
    };

    window.MinSideDonations = MinSideDonations;
})(window);
