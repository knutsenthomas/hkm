// Static visual model: no Firebase SDK, authentication, data requests or writes.
const toggle = document.getElementById('menu-toggle');
toggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Lukk meny' : 'Åpne meny');
});
let dismissTimer;
document.querySelectorAll('[data-demo]').forEach(button => {
  button.addEventListener('click', () => {
    const message = document.getElementById('demo-message');
    message.textContent = `${button.dataset.demo}: Dette er en visningsmodell. Funksjonen finnes i den beskyttede admin-siden.`;
    message.hidden = false;
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => { message.hidden = true; }, 5000);
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Åpne meny');
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Åpne meny');
  }
});
