/**
 * HKM Admin CRM Module
 * Manages members, donor records, roles, segments, and CSV exports.
 */
(function (window) {
    'use strict';

    const AdminCRM = {
        filterMembers(members = [], query = '', roleFilter = 'all') {
            if (!Array.isArray(members)) return [];
            const q = (query || '').toLowerCase().trim();
            return members.filter(m => {
                const name = (m.displayName || m.fullName || m.name || '').toLowerCase();
                const email = (m.email || '').toLowerCase();
                const role = (m.role || 'medlem').toLowerCase();

                const matchesQuery = !q || name.includes(q) || email.includes(q);
                const matchesRole = roleFilter === 'all' || role === roleFilter.toLowerCase();

                return matchesQuery && matchesRole;
            });
        },

        exportMembersCSV(members = [], filename = 'medlemsregister_hkm.csv') {
            if (!members || !members.length) {
                if (window.HKMUtils) window.HKMUtils.showToast('Ingen medlemmer å eksportere', 'warning');
                return;
            }

            const headers = ['Navn', 'E-post', 'Rolle', 'Telefon', 'Status', 'Medlem Siden'];
            const rows = members.map(m => [
                m.displayName || m.fullName || m.name || '',
                m.email || '',
                m.role || 'Medlem',
                m.phone || m.tlf || '',
                m.status || 'Aktiv',
                window.HKMUtils ? window.HKMUtils.formatDate(m.createdAt || m.joinedAt, { short: true }) : (m.createdAt || '')
            ]);

            if (window.HKMUtils) {
                window.HKMUtils.exportCSV(filename, headers, rows);
                window.HKMUtils.showToast(`Eksporterte ${rows.length} medlemmer til CSV`, 'success');
            }
        },

        formatRoleBadge(role = 'medlem') {
            const roleLower = (role || '').toLowerCase();
            const roleMap = {
                admin: { label: 'Administrator', class: 'badge-admin', bg: '#ef4444', color: '#ffffff' },
                leder: { label: 'Leder', class: 'badge-leader', bg: '#f59e0b', color: '#ffffff' },
                frivillig: { label: 'Frivillig', class: 'badge-volunteer', bg: '#3b82f6', color: '#ffffff' },
                giver: { label: 'Fast Giver', class: 'badge-donor', bg: '#10b981', color: '#ffffff' },
                medlem: { label: 'Medlem', class: 'badge-member', bg: '#64748b', color: '#ffffff' }
            };
            return roleMap[roleLower] || roleMap.medlem;
        }
    };

    window.AdminCRM = AdminCRM;
})(window);
