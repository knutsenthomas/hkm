// Sanitized, consent-aware measurement of confirmations already verified by payment APIs.
const pending = new Map();
const delivered = new Set();
export function trackConfirmedDonation(provider, payment, environment = window) {
    if (!/^\/(?:donasjoner|en\/donations|es\/donaciones)(?:\.html)?\/?$/.test(environment.location.pathname)) return false;
    let id, minor, currency;
    if (provider === 'stripe' && payment?.status === 'succeeded') {
        id = payment.id; minor = payment.amount_received; currency = payment.currency;
    } else if (provider === 'vipps' && payment?.state === 'CAPTURED') {
        id = payment.reference; minor = payment.amount?.value; currency = payment.amount?.currency;
    } else if (provider === 'paypal' && payment?.status === 'success') {
        id = payment.orderId;
    } else return false;
    if (!id) return false;
    const payload = {payment_provider: provider, transaction_id: String(id)};
    // Existing integrations use NOK. Other currencies need explicit minor-unit handling.
    if (String(currency).toUpperCase() === 'NOK' && Number.isInteger(minor) && minor >= 0) {
        payload.currency = 'NOK'; payload.value = minor / 100;
    }
    pending.set(`${provider}:${id}`, payload);
    return flushDonationAnalytics(environment);
}
export function flushDonationAnalytics(environment = window) {
    try {
        if (!environment.SitePrivacy?.allows('analytics') || typeof environment.gtag !== 'function') return false;
        let sent = false;
        for (const [id, payload] of pending) {
            const key = `hkm-ga-donation:${id}`;
            if (delivered.has(id) || environment.localStorage.getItem(key)) { pending.delete(id); continue; }
            environment.gtag('event', 'donation_completed', {...payload, page_location:environment.location.origin + environment.location.pathname});
            delivered.add(id);
            environment.localStorage.setItem(key, '1');
            pending.delete(id); sent = true;
        }
        return sent;
    } catch { return false; }
}
