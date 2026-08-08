/**
 * HKM MinSide Profile Module
 * Manages user profile fields, avatar uploads, and user details.
 */
(function (window) {
    'use strict';

    const MinSideProfile = {
        validateProfile(profileData) {
            const errors = [];
            if (!profileData.displayName || !profileData.displayName.trim()) {
                errors.push('Navn kan ikke være tomt');
            }
            if (profileData.email && !profileData.email.includes('@')) {
                errors.push('Ugyldig e-postadresse');
            }
            return {
                isValid: errors.length === 0,
                errors
            };
        },

        formatPhoneNumber(phone) {
            if (!phone) return '';
            const cleaned = String(phone).replace(/\D/g, '');
            if (cleaned.length === 8) {
                return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 5)} ${cleaned.substring(5, 8)}`;
            }
            return phone;
        }
    };

    window.MinSideProfile = MinSideProfile;
})(window);
