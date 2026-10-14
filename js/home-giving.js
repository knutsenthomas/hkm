const form = document.getElementById('home-giving-form');
if (form) {
    const amount = form.querySelector('[name="amount"]');
    const presets = [...form.querySelectorAll('[data-gift-amount]')];
    const syncAmount = () => presets.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.giftAmount === amount.value)));
    presets.forEach(button => button.addEventListener('click', () => {
        amount.value = button.dataset.giftAmount;
        syncAmount();
    }));
    amount.addEventListener('input', syncAmount);
    form.addEventListener('change', () => {
        const monthly = form.elements.frequency.value === 'monthly';
        form.action = '/donasjoner';
        document.getElementById('home-giving-note').textContent = monthly
            ? 'Gaven trekkes hver måned. Du bekrefter avtalen i Vipps i neste steg.'
            : 'Du fyller inn opplysningene dine i neste steg.';
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const monthly = form.elements.frequency.value === 'monthly';
        const params = new URLSearchParams(new FormData(form));
        window.location.assign(`${'/donasjoner'}?${params}${monthly ? '' : '#gi-gave'}`);
    });
}
