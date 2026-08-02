// Ensure completed events are hidden consistently across public event views.
(function patchEventVisibility() {
    const isDateOnly = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

    const applyPatch = () => {
        const manager = window.contentManager;
        if (!manager || typeof manager.parseEventDate !== 'function') return false;

        manager.isEventPast = function isEventPast(event) {
            if (!event) return false;

            const endValue = event.end || null;
            const startValue = event.start || event.date || null;
            const comparisonValue = endValue || startValue;
            const comparisonDate = this.parseEventDate(comparisonValue);
            if (!comparisonDate) return false;

            const now = new Date();
            const isGoogleCalendarEvent = String(event.sourceId || '').startsWith('gcal:');

            // Google Calendar uses an exclusive end date for all-day events.
            // Example: an event on 2 August ends at 2026-08-03T00:00 and must
            // disappear as soon as 2 August is over, not one day later.
            if (endValue && isGoogleCalendarEvent && isDateOnly(endValue)) {
                return now >= comparisonDate;
            }

            // Manual/date-only events remain visible through their final day.
            if (isDateOnly(comparisonValue) || !this.eventHasTime(comparisonValue)) {
                const endOfDay = new Date(comparisonDate);
                endOfDay.setHours(23, 59, 59, 999);
                return now > endOfDay;
            }

            return now >= comparisonDate;
        };

        return true;
    };

    if (applyPatch()) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;
        if (applyPatch() || attempts >= 500) {
            window.clearInterval(timer);
        }
    }, 10);
})();
