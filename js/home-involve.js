// Forsiden: «Bli involvert» viser én ting om gangen.
// PC: seksjonen blir stående mens man scroller, og innholdet bytter for hver tredjedel.
// Klikk på et punkt åpner siden for det punktet.
const section = document.getElementById('bli-involvert');
if (section) {
    const steps = Array.from(section.querySelectorAll('.hkm-inv-step'));
    const panels = Array.from(section.querySelectorAll('.hkm-inv-panel'));
    const count = panels.length;
    let current = 0;

    const setActive = (i) => {
        if (i === current) return;
        current = i;
        steps.forEach((s, n) => {
            s.classList.toggle('is-active', n === i);
        });
        panels.forEach((p, n) => p.classList.toggle('is-active', n === i));
    };

    const scrollMode = () => window.matchMedia('(min-width: 901px)').matches
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onScroll = () => {
        if (!scrollMode()) return;
        const sticky = section.querySelector('.hkm-inv-sticky');
        const rect = section.getBoundingClientRect();
        const travel = section.offsetHeight - sticky.offsetHeight;
        if (travel <= 0) return;
        const p = Math.min(Math.max(-rect.top / travel, 0), 0.999);
        setActive(Math.floor(p * count));
    };

    // Klikk går til siden for punktet. Hold musen over (eller fokus) viser punktet med en gang.
    steps.forEach((s, i) => {
        s.addEventListener('click', () => {
            const href = panels[i] && panels[i].getAttribute('href');
            if (href) window.location.href = href;
        });
        s.addEventListener('mouseenter', () => setActive(i));
        s.addEventListener('focus', () => setActive(i));
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
}
