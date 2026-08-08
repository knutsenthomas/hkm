/**
 * HKM Admin Content Module
 * Handles publishing, slug generation, validation, and content filters.
 */
(function (window) {
    'use strict';

    const AdminContent = {
        slugify(text) {
            if (!text || typeof text !== 'string') return '';
            return text
                .toLowerCase()
                .trim()
                .replace(/æ/g, 'ae')
                .replace(/ø/g, 'oe')
                .replace(/å/g, 'aa')
                .replace(/[^a-z0-9 -]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-');
        },

        validatePostData(data) {
            const errors = [];
            if (!data.title || !data.title.trim()) {
                errors.push('Tittel er påkrevd');
            }
            if (!data.content || !data.content.trim()) {
                errors.push('Innhold er påkrevd');
            }
            return {
                isValid: errors.length === 0,
                errors
            };
        },

        formatStatusBadge(status = 'draft') {
            const statusMap = {
                published: { label: 'Publisert', bg: '#10b981', color: '#ffffff' },
                draft: { label: 'Utkast', bg: '#f59e0b', color: '#ffffff' },
                scheduled: { label: 'Planlagt', bg: '#3b82f6', color: '#ffffff' },
                archived: { label: 'Arkivert', bg: '#64748b', color: '#ffffff' }
            };
            return statusMap[status.toLowerCase()] || statusMap.draft;
        }
    };

    window.AdminContent = AdminContent;
})(window);
