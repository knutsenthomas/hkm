const giftForm = document.getElementById('donor-gift-form');
const details = document.getElementById('gi-gave');
if (giftForm && details) {
    const params = new URLSearchParams(location.search);
    if (params.get('frequency') === 'once') giftForm.elements.frequency.value = 'once';
    const syncFrequency = () => {
        const monthly = giftForm.elements.frequency.value === 'monthly';
        const method = giftForm.elements['gift-payment']?.value || 'vipps';
        const names = { vipps:'Vipps', stripe:'kort', paypal:'PayPal' };
        const bank = method === 'bank';
        const trigger = document.getElementById('vipps-recurring-trigger');
        document.getElementById('donor-amount-label').textContent = monthly ? 'Månedlig beløp' : 'Gavebeløp';
        trigger.hidden = bank;
        trigger.innerHTML = `${monthly ? 'Bli fast giver med' : 'Fortsett med'} ${names[method] || 'Vipps'} <i class="fas fa-arrow-right" aria-hidden="true"></i>`;
        giftForm.querySelector('h2 + p').textContent = bank
            ? 'Gi direkte fra nettbanken din.'
            : monthly ? `Velg din månedlige gave. Du bekrefter avtalen trygt ${method === 'vipps' ? 'i Vipps' : method === 'paypal' ? 'hos PayPal' : 'med kort'}.` : 'Velg beløp og formål. Du fyller inn opplysningene dine i neste steg.';
        document.getElementById('donor-bank-information').hidden = !bank;
        const fund = giftForm.elements.fund.selectedOptions[0].textContent;
        const amount = giftForm.elements.amount.value;
        document.getElementById('donor-bank-instructions').textContent = monthly
            ? `Opprett et fast oppdrag på ${amount} kr per måned i nettbanken. Merk betalingen «Gave – ${fund}». Du velger selv betalingsdato og kan stoppe oppdraget i nettbanken.`
            : `Overfør ${amount} kr i nettbanken. Merk betalingen «Gave – ${fund}».`;
        details.hidden = true;
    };
    giftForm.querySelectorAll('[name="frequency"], [name="gift-payment"], [name="fund"]').forEach(input => input.addEventListener('change', syncFrequency));
    giftForm.elements.amount.addEventListener('input', syncFrequency);
    giftForm.querySelectorAll('[data-donor-amount]').forEach(button => button.addEventListener('click', () => { giftForm.elements.amount.value = button.dataset.donorAmount; syncFrequency(); }));
    document.getElementById('donor-copy-account').addEventListener('click', async () => {
        const account = document.getElementById('donor-bank-account').textContent.trim();
        const output = document.getElementById('donor-copy-status');
        try { await navigator.clipboard.writeText(account.replace(/[.\s]/g, '')); output.textContent = 'Kontonummeret er kopiert.'; }
        catch { output.textContent = 'Marker kontonummeret over og kopier det manuelt.'; }
    });
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
