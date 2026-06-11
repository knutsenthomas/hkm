// Vipps, Stripe, and PayPal Recurring Payments integration for Bli Fast Giver page
const VIPPS_CREATE_AGREEMENT_URL = "https://createvippsagreement-42bhgdjkcq-uc.a.run.app";
const VIPPS_FINALIZE_AGREEMENT_URL = "https://finalizevippsagreement-42bhgdjkcq-uc.a.run.app";
const PAYPAL_CREATE_PLAN_URL = "https://createpaypalsubscriptionplan-42bhgdjkcq-uc.a.run.app";
const PAYPAL_ACTIVATE_SUB_URL = "https://activatepaypalsubscription-42bhgdjkcq-uc.a.run.app";

// Localization settings
const isEnglish = window.location.href.includes("/en/");
const isSpanish = window.location.href.includes("/es/");

const translations = {
    vipps_subtitle: {
        no: "Opprett en fast månedlig avtale direkte i Vipps",
        en: "Create a recurring monthly agreement directly in Vipps",
        es: "Cree un acuerdo mensual recurrente directamente en Vipps"
    },
    stripe_subtitle: {
        no: "Opprett en fast månedlig avtale med bankkort (Stripe)",
        en: "Create a recurring monthly agreement with card (Stripe)",
        es: "Cree un acuerdo mensual recurrente con tarjeta (Stripe)"
    },
    paypal_subtitle: {
        no: "Opprett en fast månedlig avtale med PayPal",
        en: "Create a recurring monthly agreement with PayPal",
        es: "Cree un acuerdo mensual recurrente con PayPal"
    },
    vipps_btn: {
        no: "Opprett avtale i Vipps",
        en: "Create agreement in Vipps",
        es: "Crear acuerdo en Vipps"
    },
    stripe_btn: {
        no: "Gå til betaling",
        en: "Proceed to payment",
        es: "Proceder al pago"
    },
    paypal_btn: {
        no: "Gå til betaling",
        en: "Proceed to payment",
        es: "Proceder al pago"
    },
    amount_label: {
        no: "Velg månedlig beløp",
        en: "Choose monthly amount",
        es: "Elija el monto mensual"
    },
    custom_amount_placeholder: {
        no: "Annet månedlig beløp (kr)",
        en: "Other monthly amount (kr)",
        es: "Otro monto mensual (kr)"
    },
    details_label: {
        no: "Dine opplysninger",
        en: "Your information",
        es: "Sus datos"
    },
    name_placeholder: {
        no: "Fullt navn",
        en: "Full name",
        es: "Nombre completo"
    },
    email_placeholder: {
        no: "E-postadresse",
        en: "Email address",
        es: "Correo electrónico"
    },
    phone_placeholder: {
        no: "Mobilnummer",
        en: "Mobile number",
        es: "Número de móvil"
    },
    address_placeholder: {
        no: "Adresse",
        en: "Address",
        es: "Dirección"
    },
    zip_placeholder: {
        no: "Postnr",
        en: "Zip code",
        es: "Código postal"
    },
    city_placeholder: {
        no: "Sted",
        en: "City",
        es: "Ciudad"
    },
    title: {
        no: "Bli fast giver",
        en: "Become a regular partner",
        es: "Conviértase en donante regular"
    },
    validation_amount: {
        no: "Vennligst velg eller skriv inn et gyldig beløp.",
        en: "Please select or enter a valid amount.",
        es: "Por favor, seleccione o ingrese un monto válido."
    },
    loading_vipps: {
        no: "Starter Vipps...",
        en: "Starting Vipps...",
        es: "Iniciando Vipps..."
    },
    loading_init: {
        no: "Initialiserer...",
        en: "Initializing...",
        es: "Inicializando..."
    },
    stripe_details_title: {
        no: "Tast inn kortopplysninger",
        en: "Enter card details",
        es: "Ingrese los datos de la tarjeta"
    },
    stripe_confirm_btn: {
        no: "Bekreft avtale",
        en: "Confirm agreement",
        es: "Confirmar acuerdo"
    },
    success_title: {
        no: "Fullført!",
        en: "Completed!",
        es: "¡Completado!"
    },
    cancel_title: {
        no: "Avbrutt",
        en: "Cancelled",
        es: "Cancelado"
    },
    close_btn: {
        no: "Lukk",
        en: "Close",
        es: "Cerrar"
    }
};

function t(key) {
    const lang = isEnglish ? "en" : (isSpanish ? "es" : "no");
    return (translations[key] && translations[key][lang]) ? translations[key][lang] : "";
}

// Inject required scoped CSS for the recurring modal
const modalStyles = `
.hkm-modal-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(16px) saturate(180%);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    z-index: 100005 !important;
    overflow-y: auto;
    padding: 20px 0;
}
.hkm-modal-overlay.active {
    opacity: 1;
    pointer-events: auto;
}
.hkm-modal-panel {
    background: rgba(255, 255, 255, 0.98);
    width: 100%;
    max-width: 480px;
    border-radius: 24px;
    box-shadow: 0 32px 64px -12px rgba(27, 73, 101, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
    padding: 32px;
    margin: auto 16px;
    position: relative;
    transform: translateY(24px) translateZ(0) !important;
    backface-visibility: hidden !important;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
}
.hkm-modal-overlay.active .hkm-modal-panel {
    transform: translateY(0) translateZ(0) !important;
}
.hkm-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
}
.hkm-modal-title-wrapper {
    flex: 1;
}
.hkm-modal-title {
    font-size: 24px;
    font-weight: 800;
    color: #1B4965;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
}
.hkm-modal-subtitle {
    font-size: 14px;
    color: #5a6e7f;
    margin: 8px 0 0 0;
    font-weight: 500;
    line-height: 1.5;
}
.hkm-modal-close {
    background: rgba(27, 73, 101, 0.05);
    border: 1px solid rgba(27, 73, 101, 0.08);
    cursor: pointer;
    color: #1B4965;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    margin-left: 16px;
    flex-shrink: 0;
}
.hkm-modal-close:hover {
    background-color: rgba(27, 73, 101, 0.12);
    color: #1b4965;
    transform: scale(1.08);
}
.hkm-modal-close:active {
    transform: scale(0.92);
}
.hkm-form-group {
    margin-bottom: 24px;
}
.hkm-form-label {
    display: block;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
    color: #5a6e7f;
}
.hkm-input {
    display: block !important;
    width: 100% !important;
    padding: 12px 16px !important;
    border: 1.5px solid rgba(27, 73, 101, 0.15) !important;
    border-radius: 12px !important;
    font-size: 15px !important;
    font-family: inherit !important;
    background: #ffffff !important;
    color: #0f172a !important;
    outline: none !important;
    transition: all 0.25s ease !important;
    transform: translateZ(0) !important;
    backface-visibility: hidden !important;
}
.hkm-input::placeholder {
    color: #9cb2c6 !important;
}
.hkm-input:hover {
    border-color: rgba(27, 73, 101, 0.3) !important;
}
.hkm-input:focus {
    border-color: #FF5B24 !important;
    box-shadow: 0 0 0 4px rgba(255, 91, 36, 0.12) !important;
    background: #ffffff !important;
}
.hkm-amount-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
}
.hkm-amount-btn {
    padding: 12px 8px;
    border: 1.5px solid rgba(27, 73, 101, 0.15);
    background: #ffffff;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 700;
    font-size: 15px;
    color: #1B4965;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    text-align: center;
}
.hkm-amount-btn:hover {
    border-color: #FF5B24;
    color: #FF5B24;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 91, 36, 0.08);
}
.hkm-amount-btn:active {
    transform: scale(0.95);
}
.hkm-amount-btn.selected {
    border-color: #FF5B24;
    background: linear-gradient(135deg, #FF5B24 0%, #E04813 100%);
    color: #ffffff;
    box-shadow: 0 8px 16px rgba(255, 91, 36, 0.25);
}
.hkm-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #FF5B24 0%, #E04813 100%);
    border: none;
    border-radius: 12px;
    color: #ffffff;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 8px 20px rgba(255, 91, 36, 0.2);
}
.hkm-submit-btn:hover {
    filter: brightness(1.05);
    transform: translateY(-2px);
    box-shadow: 0 12px 25px rgba(255, 91, 36, 0.3);
}
.hkm-submit-btn:active {
    transform: translateY(-1px) scale(0.98);
}
.hkm-submit-btn:disabled {
    background: #cbd5e1;
    color: #64748b;
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
}
.hkm-status-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100006 !important;
    color: #ffffff;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}
.hkm-status-overlay.active {
    opacity: 1;
    pointer-events: auto;
}
.hkm-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: #FF5B24;
    border-radius: 50%;
    animation: hkm-spin 1s linear infinite;
    margin-bottom: 20px;
}
@keyframes hkm-spin {
    to { transform: rotate(360deg); }
}
@media (max-width: 480px) {
    .hkm-modal-overlay {
        align-items: flex-start;
        padding: 16px 0;
    }
    .hkm-modal-panel {
        margin: 16px auto;
        padding: 24px 20px;
        border-radius: 20px;
    }
    .hkm-modal-title {
        font-size: 20px;
    }
    .hkm-modal-subtitle {
        font-size: 13px;
        margin-top: 6px;
    }
    .hkm-amount-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
}
@media (max-height: 550px) and (orientation: landscape) {
    .hkm-modal-panel {
        max-height: 90vh;
        overflow-y: auto;
        padding: 16px;
        border-radius: 16px;
    }
    .hkm-modal-header {
        margin-bottom: 12px;
    }
    .hkm-form-group {
        margin-bottom: 12px;
    }
    .hkm-input {
        padding: 10px !important;
    }
    .hkm-amount-btn {
        padding: 8px 4px;
    }
}
`;

// Inject styles into page head
const styleEl = document.createElement("style");
styleEl.textContent = modalStyles;
document.head.appendChild(styleEl);

let paypalSdkRecurringLoaded = false;
function loadPayPalSdkRecurring(callback) {
    if (paypalSdkRecurringLoaded) {
        callback();
        return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=test&currency=NOK&vault=true&intent=subscription`;
    script.async = true;
    script.onload = () => {
        paypalSdkRecurringLoaded = true;
        callback();
    };
    script.onerror = () => {
        console.error("Failed to load PayPal Subscription SDK");
        alert("Kunne ikke laste PayPal-betalingstjenesten. Vennligst prøv igjen.");
    };
    document.head.appendChild(script);
}

function showLoadingOverlayRecurring(show) {
    let overlay = document.getElementById("hkm-paypal-loading-recurring");
    if (show) {
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "hkm-paypal-loading-recurring";
            overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 100010;";
            const text = isEnglish ? "Confirming PayPal agreement..." : (isSpanish ? "Confirmando el acuerdo con PayPal..." : "Bekrefter avtalen med PayPal...");
            overlay.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #FF5B24; margin-bottom: 15px;"></i>
                    <p style="font-weight: 600; color: #333; margin: 0;">${text}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    } else {
        if (overlay) overlay.remove();
    }
}

// Initialize trigger listener
document.addEventListener("DOMContentLoaded", () => {
    const trigger = document.getElementById("vipps-recurring-trigger");
    if (trigger) {
        trigger.setAttribute("href", "javascript:void(0)");
        trigger.removeAttribute("target");
        trigger.addEventListener("click", (e) => {
            e.preventDefault();
            openAgreementModal("vipps");
        });
    }

    const stripeTrigger = document.getElementById("stripe-recurring-trigger");
    if (stripeTrigger) {
        stripeTrigger.setAttribute("href", "javascript:void(0)");
        stripeTrigger.removeAttribute("target");
        stripeTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            openAgreementModal("stripe");
        });
    }

    const paypalTrigger = document.getElementById("paypal-recurring-trigger");
    if (paypalTrigger) {
        paypalTrigger.setAttribute("href", "javascript:void(0)");
        paypalTrigger.removeAttribute("target");
        paypalTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            openAgreementModal("paypal");
        });
    }
    
    // Check if we are returning from Vipps
    handleVippsReturn();
});

// Helper to open modal
function openAgreementModal(method = "vipps") {
    // Remove existing modal if any
    const existing = document.getElementById("vipps-recurring-modal");
    if (existing) existing.remove();

    const currentUser = (window.firebase && firebase.auth && firebase.auth().currentUser) 
        ? firebase.auth().currentUser 
        : null;

    const modal = document.createElement("div");
    modal.id = "vipps-recurring-modal";
    modal.className = "hkm-modal-overlay";
    
    let subtitleText = "";
    let submitBtnText = "";
    
    if (method === "vipps") {
        subtitleText = t("vipps_subtitle");
        submitBtnText = t("vipps_btn");
    } else if (method === "stripe") {
        subtitleText = t("stripe_subtitle");
        submitBtnText = t("stripe_btn");
    } else if (method === "paypal") {
        subtitleText = t("paypal_subtitle");
        submitBtnText = t("paypal_btn");
    }

    modal.innerHTML = `
        <div class="hkm-modal-panel">
            <div class="hkm-modal-header">
                <div class="hkm-modal-title-wrapper">
                    <h3 class="hkm-modal-title">${t('title')}</h3>
                    <p class="hkm-modal-subtitle">${subtitleText}</p>
                </div>
                <button class="hkm-modal-close" id="hkm-modal-close-btn" type="button" aria-label="Lukk">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <form id="vipps-recurring-form">
                <!-- Amount Selection -->
                <div class="hkm-form-group">
                    <label class="hkm-form-label">${t('amount_label')}</label>
                    <div class="hkm-amount-grid">
                        <button type="button" class="hkm-amount-btn" data-amount="100">100 kr</button>
                        <button type="button" class="hkm-amount-btn" data-amount="250">250 kr</button>
                        <button type="button" class="hkm-amount-btn selected" data-amount="500">500 kr</button>
                        <button type="button" class="hkm-amount-btn" data-amount="1000">1000 kr</button>
                    </div>
                    <input type="number" id="hkm-custom-amount" class="hkm-input" placeholder="${t('custom_amount_placeholder')}">
                </div>

                <!-- Personal Info -->
                <div class="hkm-form-group">
                    <label class="hkm-form-label">${t('details_label')}</label>
                    <label for="hkm-donor-name" class="sr-only">${t('name_placeholder')}</label>
                    <input type="text" id="hkm-donor-name" name="name" autocomplete="name" class="hkm-input" placeholder="${t('name_placeholder')}" required style="margin-bottom: 16px;">
                    
                    <label for="hkm-donor-email" class="sr-only">${t('email_placeholder')}</label>
                    <input type="email" id="hkm-donor-email" name="email" autocomplete="email" class="hkm-input" placeholder="${t('email_placeholder')}" required style="margin-bottom: 16px;">
                    
                    <label for="hkm-donor-phone" class="sr-only">${t('phone_placeholder')}</label>
                    <input type="tel" id="hkm-donor-phone" name="tel" autocomplete="tel" class="hkm-input" placeholder="${t('phone_placeholder')}" required style="margin-bottom: 16px;">
                    
                    <label for="hkm-donor-address" class="sr-only">${t('address_placeholder')}</label>
                    <input type="text" id="hkm-donor-address" name="address" autocomplete="street-address" class="hkm-input" placeholder="${t('address_placeholder')}" required style="margin-bottom: 16px;">
                    
                    <div style="display: flex; gap: 12px;">
                        <div style="flex: 1;">
                            <label for="hkm-donor-zip" class="sr-only">${t('zip_placeholder')}</label>
                            <input type="text" id="hkm-donor-zip" name="postal-code" autocomplete="postal-code" class="hkm-input" placeholder="${t('zip_placeholder')}" required>
                        </div>
                        <div style="flex: 2;">
                            <label for="hkm-donor-city" class="sr-only">${t('city_placeholder')}</label>
                            <input type="text" id="hkm-donor-city" name="city" autocomplete="address-level2" class="hkm-input" placeholder="${t('city_placeholder')}" required>
                        </div>
                    </div>
                </div>

                <!-- Fund purpose (hidden or defaults to general) -->
                <input type="hidden" id="hkm-donor-fund" value="general">

                <button type="submit" class="hkm-submit-btn" id="hkm-submit-btn">
                    ${submitBtnText}
                </button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Smooth fade-in
    setTimeout(() => modal.classList.add("active"), 10);

    // Amount buttons events
    const amountBtns = modal.querySelectorAll(".hkm-amount-btn");
    const customInput = modal.querySelector("#hkm-custom-amount");

    amountBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            amountBtns.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            customInput.value = "";
        });
    });

    customInput.addEventListener("input", () => {
        amountBtns.forEach(b => b.classList.remove("selected"));
    });

    // Close buttons events
    const closeBtn = modal.querySelector("#hkm-modal-close-btn");
    const closeModal = () => {
        modal.classList.remove("active");
        setTimeout(() => modal.remove(), 300);
    };
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    // Form submit
    const form = modal.querySelector("#vipps-recurring-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Get selected amount
        let amount = 0;
        const selectedBtn = modal.querySelector(".hkm-amount-btn.selected");
        if (customInput.value) {
            amount = parseInt(customInput.value);
        } else if (selectedBtn) {
            amount = parseInt(selectedBtn.dataset.amount);
        }

        if (!amount || amount <= 0) {
            alert(t("validation_amount"));
            return;
        }

        const submitBtn = modal.querySelector("#hkm-submit-btn");
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;

        const donorName = modal.querySelector("#hkm-donor-name").value.trim();
        const donorEmail = modal.querySelector("#hkm-donor-email").value.trim();
        const donorPhone = modal.querySelector("#hkm-donor-phone").value.trim();
        const donorAddress = modal.querySelector("#hkm-donor-address").value.trim();
        const donorZip = modal.querySelector("#hkm-donor-zip").value.trim();
        const donorCity = modal.querySelector("#hkm-donor-city").value.trim();
        const fund = modal.querySelector("#hkm-donor-fund").value;

        if (method === "vipps") {
            submitBtn.innerHTML = `<span class="hkm-spinner" style="width: 20px; height: 20px; border-width: 2px; margin-right: 10px; margin-bottom: 0; display: inline-block; vertical-align: middle;"></span>${t('loading_vipps')}`;

            try {
                const response = await fetch(VIPPS_CREATE_AGREEMENT_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount,
                        currency: "NOK",
                        customerDetails: {
                            name: donorName,
                            email: donorEmail,
                            phone: donorPhone,
                            address: donorAddress,
                            zip: donorZip,
                            city: donorCity,
                            fund: fund,
                            userId: currentUser ? currentUser.uid : null
                        },
                        returnUrl: window.location.href.split("?")[0]
                    })
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || `Serverfeil: ${response.status}`);
                }

                if (!data.redirectUrl) {
                    throw new Error("Mottok ikke bekreftelseslenke fra Vipps.");
                }

                window.location.href = data.redirectUrl;

            } catch (err) {
                console.error("Vipps recurring initiation failed:", err);
                alert("Kunne ikke starte avtalen: " + err.message);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } else if (method === "stripe") {
            submitBtn.innerHTML = `<span class="hkm-spinner" style="width: 20px; height: 20px; border-width: 2px; margin-right: 10px; margin-bottom: 0; display: inline-block; vertical-align: middle;"></span>${t('loading_init')}`;

            try {
                const customerDetails = {
                    name: donorName,
                    email: donorEmail,
                    phone: donorPhone,
                    address: donorAddress,
                    zip: donorZip,
                    city: donorCity,
                    fund: fund,
                    userId: currentUser ? currentUser.uid : null
                };

                form.innerHTML = `
                    <div id="stripe-checkout-container" style="display: block; margin: 0; padding: 0; box-shadow: none; background: transparent;">
                        <h4 style="margin-bottom: 16px; color: #1B4965; font-weight: 700; font-size: 16px; text-align: center;">${t('stripe_details_title')}</h4>
                        <div id="payment-element" style="margin-bottom: 16px;">
                        </div>
                        <button id="submit-payment" class="hkm-submit-btn" type="button">
                            <span class="hkm-spinner hidden" id="spinner" style="width: 20px; height: 20px; border-width: 2px; margin-right: 10px; margin-bottom: 0; display: inline-block; vertical-align: middle;"></span>
                            <span id="button-text">${t('stripe_confirm_btn')} (${amount} kr/mnd)</span>
                        </button>
                        <div id="payment-message" class="hidden"></div>
                    </div>
                `;

                if (typeof window.initializeStripe !== "function") {
                    throw new Error("Stripe checkout-skriptet er ikke ferdig lastet.");
                }

                await window.initializeStripe(amount, customerDetails, "card", true);

                const submitPaymentBtn = form.querySelector("#submit-payment");
                if (submitPaymentBtn) {
                    submitPaymentBtn.addEventListener("click", async (ev) => {
                        ev.preventDefault();
                        
                        const billingDetails = {
                            name: donorName,
                            email: donorEmail,
                            phone: donorPhone,
                            address: {
                                line1: donorAddress,
                                city: donorCity,
                                postal_code: donorZip,
                                country: 'NO',
                            }
                        };
                        
                        if (window.handleStripeSubmit) {
                            await window.handleStripeSubmit(ev, { billingDetails });
                        } else {
                            console.error("handleStripeSubmit is not defined!");
                            alert("Kunne ikke fullføre betalingen: betalingsskriptet mangler.");
                        }
                    });
                }

            } catch (err) {
                console.error("Stripe recurring initiation failed:", err);
                alert("Kunne ikke starte avtalen: " + err.message);
                modal.classList.remove("active");
                setTimeout(() => modal.remove(), 300);
            }
        } else if (method === "paypal") {
            submitBtn.innerHTML = `<span class="hkm-spinner" style="width: 20px; height: 20px; border-width: 2px; margin-right: 10px; margin-bottom: 0; display: inline-block; vertical-align: middle;"></span>${t('loading_init')}`;

            try {
                const customerDetails = {
                    name: donorName,
                    email: donorEmail,
                    phone: donorPhone,
                    address: donorAddress,
                    zip: donorZip,
                    city: donorCity,
                    fund: fund,
                    userId: currentUser ? currentUser.uid : null
                };

                // 1. Call backend to create Subscription Plan
                const planResponse = await fetch(PAYPAL_CREATE_PLAN_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount })
                });

                const planData = await planResponse.json();
                if (!planResponse.ok || !planData.planId) {
                    throw new Error(planData.error || "Failed to create PayPal subscription plan");
                }

                const planId = planData.planId;

                // 2. Replace form with PayPal container
                const payPalHeadingText = isEnglish ? "Complete with PayPal" : (isSpanish ? "Completar con PayPal" : "Fullfør med PayPal");
                form.innerHTML = `
                    <div id="paypal-checkout-container" style="display: block; margin: 0; padding: 0; background: transparent;">
                        <h4 style="margin-bottom: 16px; color: #1B4965; font-weight: 700; font-size: 16px; text-align: center;">${payPalHeadingText}</h4>
                        <div id="paypal-button-container-recurring" style="margin-bottom: 16px;"></div>
                    </div>
                `;

                // 3. Load PayPal SDK & Render Smart buttons
                loadPayPalSdkRecurring(() => {
                    if (typeof paypal === "undefined") {
                        alert("PayPal SDK could not be loaded.");
                        return;
                    }

                    paypal.Buttons({
                        createSubscription: function(data, actions) {
                            return actions.subscription.create({
                                plan_id: planId
                            });
                        },
                        onApprove: async function(data, actions) {
                            showLoadingOverlayRecurring(true);

                            try {
                                const activateResponse = await fetch(PAYPAL_ACTIVATE_SUB_URL, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        subscriptionId: data.subscriptionID,
                                        customerDetails,
                                        amount
                                    })
                                });

                                const activateData = await activateResponse.json();
                                if (!activateResponse.ok || activateData.status !== "success") {
                                    throw new Error(activateData.error || "Failed to activate PayPal subscription");
                                }

                                showLoadingOverlayRecurring(false);
                                modal.classList.remove("active");
                                setTimeout(() => modal.remove(), 300);

                                const successMsg = isEnglish 
                                    ? "Thank you! Your regular donation agreement via PayPal has been successfully created." 
                                    : (isSpanish ? "¡Gracias! Su acuerdo de donación regular a través de PayPal ha sido creado con éxito." : "Tusen takk! Din faste avtale via PayPal ble vellykket opprettet.");
                                showResultModal(true, successMsg);

                            } catch (error) {
                                console.error("PayPal Subscription activation failed:", error);
                                showLoadingOverlayRecurring(false);
                                alert("Aktivering av avtalen feilet: " + error.message);
                            }
                        },
                        onError: function(err) {
                            console.error("PayPal Subscription error:", err);
                            alert("Det oppstod en feil under opprettelsen av avtalen i PayPal-vinduet.");
                        },
                        style: {
                            layout: 'vertical',
                            color:  'gold',
                            shape:  'rect',
                            label:  'subscribe'
                        }
                    }).render('#paypal-button-container-recurring');
                });

            } catch (err) {
                console.error("PayPal recurring initiation failed:", err);
                alert("Kunne ikke starte avtalen: " + err.message);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });
}

// Check URL and handle agreement validation
async function handleVippsReturn() {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("vipps_reference");
    const isReturn = params.get("vipps_return") === "1";

    if (!reference || !isReturn) return;

    const overlay = document.createElement("div");
    overlay.className = "hkm-status-overlay active";
    overlay.innerHTML = `
        <div class="hkm-spinner"></div>
        <h3 style="font-weight: 700; font-size: 20px; margin-bottom: 8px;">Bekrefter avtale med Vipps...</h3>
        <p style="color: #94a3b8; font-size: 14px;">Dette tar bare et øyeblikk.</p>
    `;
    document.body.appendChild(overlay);

    try {
        const response = await fetch(VIPPS_FINALIZE_AGREEMENT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference })
        });

        const data = await response.json();
        overlay.remove();

        const url = new URL(window.location.href);
        url.searchParams.delete("vipps_reference");
        url.searchParams.delete("vipps_return");
        window.history.replaceState({}, document.title, url.toString());

        if (response.ok && data.status === "ACTIVE") {
            showResultModal(true, "Avtalen ble vellykket opprettet! Tusen takk for at du blir fast giver.");
        } else {
            const errorMsg = data.error || "Avtalen ble ikke godkjent eller ble avbrutt i Vipps-appen.";
            showResultModal(false, errorMsg);
        }

    } catch (err) {
        console.error("Vipps agreement finalization error:", err);
        overlay.remove();
        showResultModal(false, "Det oppstod en feil under bekreftelsen av avtalen: " + err.message);
    }
}

// Show success/error modal
function showResultModal(isSuccess, message) {
    const existing = document.getElementById("vipps-result-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "vipps-result-modal";
    modal.className = "hkm-modal-overlay";
    modal.innerHTML = `
        <div class="hkm-modal-panel" style="text-align: center; max-width: 400px; padding: 40px 32px;">
            <div style="width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: white; font-size: 32px; background: ${isSuccess ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}; box-shadow: ${isSuccess ? '0 8px 20px rgba(16, 185, 129, 0.2)' : '0 8px 20px rgba(239, 68, 68, 0.2)'};">
                ${isSuccess ? '&#10003;' : '&#33;'}
            </div>
            <h3 class="hkm-modal-title" style="margin-bottom: 16px; color: ${isSuccess ? '#1B4965' : '#ef4444'}; text-align: center;">
                ${isSuccess ? t('success_title') : t('cancel_title')}
            </h3>
            <p style="color: #5a6e7f; font-size: 15px; margin-bottom: 32px; line-height: 1.6; text-align: center; font-weight: 500;">${message}</p>
            <button class="hkm-submit-btn" id="hkm-result-close-btn">
                ${t('close_btn')}
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add("active"), 10);

    const closeBtn = modal.querySelector("#hkm-result-close-btn");
    const closeModal = () => {
        modal.classList.remove("active");
        setTimeout(() => modal.remove(), 300);
    };
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });
}

// Expose globally
window.showResultModal = showResultModal;
