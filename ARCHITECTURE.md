# Administration structure

`admin/js/admin.js` owns initialization, common dependencies and the AdminManager instance. Its methods are organized by responsibility under `admin/js/features/`: access, communications, translation, content, giving, school, media, search, integrations and site settings. Large domains have numbered files in a deliberate order.

Feature factories receive the existing Firebase service and administrator utilities. They add methods to the same prototype before the manager is created; existing `window.adminManager` callers and inline handlers remain compatible. Method descriptors remain non-enumerable as they were on the class. Keep cross-feature calls on `this` and put new methods in the appropriate feature.

Public pages continue to use the shared header and footer from `js/site-shell.js`, as required by AGENTS.md. The optional consent controller is `public/privacy-consent.js`.

Validate with `node --test tests/*.test.mjs` and `npm run build`. Never hand-edit dist output as a source change.
