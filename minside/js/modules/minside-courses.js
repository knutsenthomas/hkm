/**
 * HKM MinSide Courses Module
 * Tracks student course progress, completed lessons, and certificates.
 */
(function (window) {
    'use strict';

    const MinSideCourses = {
        calculateProgress(completedLessons = 0, totalLessons = 1) {
            if (!totalLessons || totalLessons <= 0) return 0;
            const pct = Math.round((completedLessons / totalLessons) * 100);
            return Math.min(100, Math.max(0, pct));
        },

        formatCourseStatus(progressPct) {
            if (progressPct >= 100) {
                return { label: 'Fullført', bg: '#10b981', color: '#ffffff' };
            }
            if (progressPct > 0) {
                return { label: `${progressPct}% Fullført`, bg: '#3b82f6', color: '#ffffff' };
            }
            return { label: 'Ikke startet', bg: '#64748b', color: '#ffffff' };
        }
    };

    window.MinSideCourses = MinSideCourses;
})(window);
