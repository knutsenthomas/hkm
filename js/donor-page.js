const giftForm = document.getElementById('donor-gift-form');
const details = document.getElementById('gi-gave');
if (giftForm) {
    const params = new URLSearchParams(location.search);
    if (params.get('frequency') === 'once') giftForm.elements.frequency.value = 'once';
    const lang = document.documentElement.lang?.slice(0,2);
    const localText = (no, en, es) => lang === 'en' ? en : lang === 'es' ? es : no;
    const labels = lang === 'en' ? {monthly:'Monthly amount',once:'Gift amount',card:'card',bank:'View bank details',recurring:'Give monthly with ',next:'Continue with ',bankHelp:'Give directly through your bank.',monthlyHelp:'Choose your monthly gift. Confirm securely with your payment provider.',onceHelp:'Choose an amount and purpose. Enter your details in the next step.'} : lang === 'es' ? {monthly:'Importe mensual',once:'Importe de la donación',card:'tarjeta',bank:'Ver datos bancarios',recurring:'Dona mensualmente con ',next:'Continuar con ',bankHelp:'Dona directamente desde tu banco.',monthlyHelp:'Elige tu donación mensual. Confirma de forma segura con tu proveedor de pago.',onceHelp:'Elige el importe y el destino. Introduce tus datos en el siguiente paso.'} : null;
    const syncFrequency = () => {
        const monthly = giftForm.elements.frequency.value === 'monthly';
        const method = giftForm.elements['gift-payment']?.value || 'vipps';
        const names = { vipps:'Vipps', stripe:labels?.card || 'kort', paypal:'PayPal' };
        const bank = method === 'bank';
        const trigger = document.getElementById('vipps-recurring-trigger');
        document.getElementById('donor-amount-label').textContent = monthly ? (labels?.monthly || 'Månedlig beløp') : (labels?.once || 'Gavebeløp');
        trigger.hidden = false;
        trigger.innerHTML = `${bank ? (labels?.bank || 'Vis bankinformasjon') : (monthly ? (labels?.recurring || 'Bli fast giver med ') : (labels?.next || 'Fortsett med ')) + (names[method] || 'Vipps')} <i class="fas fa-arrow-right" aria-hidden="true"></i>`;
        giftForm.querySelector('h2 + p').textContent = labels ? (bank ? labels.bankHelp : monthly ? labels.monthlyHelp : labels.onceHelp) : bank
            ? 'Gi direkte fra nettbanken din.'
            : monthly ? `Velg din månedlige gave. Du bekrefter avtalen trygt ${method === 'vipps' ? 'i Vipps' : method === 'paypal' ? 'hos PayPal' : 'med kort'}.` : 'Velg beløp og formål. Du fyller inn opplysningene dine i neste steg.';
        document.getElementById('donor-bank-information').hidden = true;
        const fund = giftForm.elements.fund.selectedOptions[0].textContent;
        const amount = giftForm.elements.amount.value;
        document.getElementById('donor-bank-instructions').textContent = monthly
            ? localText(`Opprett et fast oppdrag på ${amount} kr per måned i nettbanken. Merk betalingen «Gave – ${fund}». Du velger selv betalingsdato og kan stoppe oppdraget i nettbanken.`, `Set up a recurring transfer of NOK ${amount} per month in your bank. Use the reference “Gift – ${fund}”. Choose the payment date and cancel the transfer in your bank.`, `Programa una transferencia mensual de ${amount} NOK en tu banco. Indica el concepto «Donación – ${fund}». Elige la fecha de pago y cancela la transferencia desde tu banco.`)
            : localText(`Overfør ${amount} kr i nettbanken. Merk betalingen «Gave – ${fund}».`, `Transfer NOK ${amount} through your bank. Use the reference “Gift – ${fund}”.`, `Transfiere ${amount} NOK desde tu banco. Indica el concepto «Donación – ${fund}».`);
        if (details) details.hidden = true;
    };
    giftForm.querySelectorAll('[name="frequency"], [name="gift-payment"], [name="fund"]').forEach(input => input.addEventListener('change', syncFrequency));
    giftForm.elements.amount.addEventListener('input', syncFrequency);
    giftForm.addEventListener('click', event => {
        const button = event.target.closest('[data-donor-amount]'); if (!button || !giftForm.contains(button)) return;
        giftForm.elements.amount.value = button.dataset.donorAmount; syncFrequency();
        giftForm.querySelectorAll('[data-donor-amount]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    });
    document.getElementById('donor-copy-account').addEventListener('click', async () => {
        const account = document.getElementById('donor-bank-account').textContent.trim();
        const output = document.getElementById('donor-copy-status');
        try { await navigator.clipboard.writeText(account.replace(/[.\s]/g, '')); output.textContent = localText('Kontonummeret er kopiert.','Account number copied.','Número de cuenta copiado.'); }
        catch { output.textContent = localText('Marker kontonummeret over og kopier det manuelt.','Select the account number above and copy it manually.','Selecciona el número de cuenta anterior y cópialo manualmente.'); }
    });
    syncFrequency();
    window.showOneTimeGift = method => {
        if (!details) return;
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
