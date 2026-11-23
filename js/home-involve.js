// Forsiden: «Bli involvert» viser én ting om gangen.
// Hold musen over (eller fokus) et punkt for å vise det. Klikk åpner siden for punktet.
const section = document.getElementById('bli-involvert');
if (section) {
    const steps = Array.from(section.querySelectorAll('.hkm-inv-step'));
    const panels = Array.from(section.querySelectorAll('.hkm-inv-panel'));
    let current = 0;

    const setActive = (i) => {
        if (i === current) return;
        current = i;
        steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
        panels.forEach((p, n) => p.classList.toggle('is-active', n === i));
    };

    steps.forEach((s, i) => {
        s.addEventListener('click', () => {
            const href = panels[i] && panels[i].getAttribute('href');
            if (href) window.location.href = href;
        });
        s.addEventListener('mouseenter', () => setActive(i));
        s.addEventListener('focus', () => setActive(i));
    });
}
