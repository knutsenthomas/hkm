const giftForm = document.getElementById('donor-gift-form');
const details = document.getElementById('gi-gave');
if (giftForm && details) {
    const params = new URLSearchParams(location.search);
    if (params.get('frequency') === 'once') giftForm.elements.frequency.value = 'once';
    const syncFrequency = () => {
        const monthly = giftForm.elements.frequency.value === 'monthly';
        document.getElementById('donor-amount-label').textContent = monthly ? 'Månedlig beløp' : 'Gavebeløp';
        document.getElementById('vipps-recurring-trigger').innerHTML = `${monthly ? 'Bli fast giver med Vipps' : 'Gi med Vipps'} <i class="fas fa-arrow-right" aria-hidden="true"></i>`;
        giftForm.querySelector('h2 + p').textContent = monthly ? 'Velg din månedlige gave. Du bekrefter avtalen trygt i Vipps.' : 'Velg beløp og formål. Du fyller inn opplysningene dine i neste steg.';
        details.hidden = true;
    };
    giftForm.querySelectorAll('[name="frequency"]').forEach(input => input.addEventListener('change', syncFrequency));
    syncFrequency();
    window.showOneTimeGift = method => {
        if (!giftForm.reportValidity()) return;
        document.getElementById('custom-amount').value = giftForm.elements.amount.value;
        document.querySelectorAll('.amount-btn').forEach(button => button.classList.remove('selected'));
        const fund = giftForm.elements.fund.value;
        document.getElementById('donation-purpose').value = fund;
        document.querySelectorAll('#donation-purpose-grid .purpose-option-btn').forEach(button => button.classList.toggle('active', button.dataset.value === fund));
        const choice = document.querySelector(`input[name="payment-method"][value="${method === 'stripe' ? 'card' : method}"]`);
        if (choice) { choice.checked = true; choice.dispatchEvent(new Event('change', { bubbles: true })); }
        details.hidden = false;
        details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
}
