# HKM browser storage and consent

Reviewed 2026-10-23. Scope: the HKM website source, not the separate Community app, Wix-hosted checkout, or all third-party retention practices.

`public/privacy-consent.js` is the early, blocking controller injected by Vite. HKM uses consent schema 2 under the existing `hkm-privacy-v1` key. Old Analytics-only choices do not authorize the new external-content category. Other websites retain their existing controller and schema.

| Purpose | Trigger and control | Storage/lifetime |
| --- | --- | --- |
| Consent | User accepts/rejects/saves | localStorage; checked for 180-day expiry |
| Analytics | Explicit analytics approval on public pages | Google `_ga*`; configured 180 days; never enabled in account/checkout routes |
| External content | Explicit external-content approval | YouTube/Vimeo iframe URLs and Juicer JSONP remain inert until approval; provider storage duration is not controlled by HKM |
| Sign-in/access | Account functionality | Firebase auth state and HKM account/role caches; local and server deletion are separate |
| Chat | User opens chat | Conversation, random visitor ID and submitted contact details in sessionStorage; in-memory fallback if storage is blocked. No new persistent chat identity on page load |
| Bible/reading plans | User uses Bible, progress, notes or bookmarks | Existing localStorage keys; notes/progress may sync to the account; no automatic deletion introduced |
| Display preferences | Explicit theme/language/view choice | Existing localStorage preferences; no automatic writes of default theme/language |
| Likes/comments | User likes or submits a valid comment | Pseudonymous like/comment ID; comment name only in sessionStorage |
| Payments | User starts payment, manages an agreement, or returns from payment | Existing provider flow and session idempotency keys; Stripe SDK loads on demand. Optional consent must not block payment |
| Public content cache | Page data fetching | Page-memory Map, not persistent browser storage |

External iframe markup must use `data-privacy-src`, not `src`. Raw CMS HTML must pass through `SitePrivacy.protectMediaHtml()` before insertion into the live DOM. The detached template prevents a request before the observer handles the placeholder. Min Side receives the controller without adding the public site shell. Withdrawal removes iframe URLs and reloads the page because deleting script tags cannot stop a running third-party script. The site cannot delete third-party cookies belonging to other origins.

Tests: `node --test tests/privacy-consent.test.mjs tests/admin-features.test.mjs tests/donation-analytics.test.mjs`. Run `npm run build` and verify the resulting public banner, about-page lightbox, rejection, media-only acceptance, withdrawal, chat open/close, and privacy copy.

This inventory is not a certificate of legal compliance. Provider retention, agreements/transfers, browser network behavior across all authenticated lessons, and actual payment settlement require separate verification. Do not infer that checking a banner proves those properties.
