# Public page layout

- Every public page uses the shared site shell from `js/site-shell.js` for the header, mega menu, search dialog, and footer.
- New public pages must load `script.js`; the build also injects the shared site shell as a safety net.
- Do not create page-specific copies or variants of the public header, mega menu, or footer.
- Only opt a page out with `data-site-shell="off"` when the user explicitly asks for a different layout.
- Update navigation, global contact information, or social links in `js/site-shell.js` so the change applies everywhere.
