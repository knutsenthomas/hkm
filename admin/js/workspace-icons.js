// Reveal ligature icons only after their actual font face has loaded. A timeout
// must never reveal raw names such as "menu" or "notifications".
(async function () {
  if (!document.fonts) return;
  try {
    const faces = await document.fonts.load('24px "Material Symbols Outlined"');
    if (!faces.length || !faces.every(face => face.status === 'loaded')) return;
    document.documentElement.setAttribute('data-workspace-icons-ready', 'true');
    // Compatibility with the member portal's existing font visibility rule.
    document.documentElement.classList.add('fonts-loaded');
  } catch {
    // Leave the reserved icon space empty if the font fails to load.
  }
})();
