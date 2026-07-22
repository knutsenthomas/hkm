// Replace 'test' with your live Client ID.
const PAYPAL_CLIENT_ID = "Adja3K8kDYk5_GUz10nBkwlYMgHNNXwiiwfGdGD7wkU354Z-qf9UJApOfD_YfV98t-SuzjXJZg2kPp-a"; 
const PAYPAL_CREATE_ORDER_URL = "https://createpaypalorder-42bhgdjkcq-uc.a.run.app";
const PAYPAL_CAPTURE_ORDER_URL = "https://capturepaypalorder-42bhgdjkcq-uc.a.run.app";

let paypalSdkLoaded = false;

// Function to load PayPal SDK dynamically
function loadPayPalSdk(clientId, callback) {
    if (paypalSdkLoaded) {
        callback();
        return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=NOK&intent=capture`;
    script.async = true;
    script.onload = () => {
        paypalSdkLoaded = true;
        callback();
    };
    script.onerror = () => {
        console.error("Failed to load PayPal SDK");
        alert("Kunne ikke laste PayPal-betalingstjenesten. Vennligst prøv igjen.");
    };
    document.head.appendChild(script);
}

// Helper to dynamically gather form values
function getDonationDetails() {
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };
    
    let amount = 0;
    const customAmount = document.getElementById('custom-amount').value;
    const selectedBtn = document.querySelector('.amount-btn.selected');
    if (customAmount) {
        amount = parseInt(customAmount);
    } else if (selectedBtn) {
        amount = parseInt(selectedBtn.dataset.amount);
    }

    const currentUser = (window.firebase && firebase.auth && firebase.auth().currentUser)
        ? firebase.auth().currentUser
        : null;
    const donorEmail = getValue('donor-email').trim();
    const currentUserEmail = (currentUser && currentUser.email ? currentUser.email : '').trim().toLowerCase();
    const shouldAttachCurrentUser = currentUser && donorEmail.toLowerCase() === currentUserEmail;

    const fundSelect = document.getElementById('donation-purpose');
    
    return {
        amount,
        customerDetails: {
            name: getValue('donor-name'),
            email: donorEmail,
            phone: getValue('donor-phone'),
            address: getValue('donor-address'),
            zip: getValue('donor-zip'),
            city: getValue('donor-city'),
            message: getValue('donor-message'),
            userId: shouldAttachCurrentUser ? currentUser.uid : null,
            fund: fundSelect ? fundSelect.value : 'general'
        }
    };
}

// Function to handle donation form submit when PayPal is selected
export function initPayPalDonation() {
    const paypalContainer = document.getElementById("paypal-button-container");
    if (!paypalContainer) return;

    // Show PayPal container
    paypalContainer.style.display = "block";

    // Clear previous button if any and render heading
    paypalContainer.innerHTML = `
        <h4 style="margin-bottom: 16px; color: #1B4965; font-weight: 700; font-size: 16px; text-align: center;">Fullfør med PayPal</h4>
        <div id="paypal-button" style="margin-bottom: 16px;"></div>
    `;

    // Load SDK and render buttons
    loadPayPalSdk(PAYPAL_CLIENT_ID, () => {
        if (typeof paypal === "undefined") {
            console.error("PayPal global object is missing after SDK load.");
            alert("Det oppstod et problem med å starte PayPal. Vennligst prøv igjen.");
            return;
        }

        paypal.Buttons({
            onClick: function(data, actions) {
                // Validate form inputs before opening the PayPal window
                const form = document.querySelector('.donation-form-content');
                if (!form) return actions.resolve();

                const details = getDonationDetails();
                if (details.amount <= 0) {
                    alert("Vennligst velg eller skriv inn et beløp.");
                    return actions.reject();
                }

                if (!form.checkValidity()) {
                    form.reportValidity();
                    return actions.reject();
                }

                return actions.resolve();
            },
            createOrder: async () => {
                try {
                    const details = getDonationDetails();
                    const response = await fetch(PAYPAL_CREATE_ORDER_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            amount: details.amount,
                            currency: "NOK",
                            customerDetails: details.customerDetails
                        })
                    });

                    const data = await response.json();
                    if (!response.ok || !data.orderId) {
                        throw new Error(data.error || "Failed to create PayPal order");
                    }
                    return data.orderId;
                } catch (error) {
                    console.error("PayPal order creation failed:", error);
                    alert("Kunne ikke opprette PayPal-ordre: " + error.message);
                    throw error;
                }
            },
            onApprove: async (data, actions) => {
                showLoadingOverlay(true);

                try {
                    const response = await fetch(PAYPAL_CAPTURE_ORDER_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            orderId: data.orderID
                        })
                    });

                    const resData = await response.json();
                    if (!response.ok || resData.status !== "success") {
                        throw new Error(resData.error || "Failed to capture PayPal order");
                    }

                    // Success modal or alert
                    if (window.showResultModal) {
                        window.showResultModal(true, "Tusen takk for din gave! Betalingen via PayPal var vellykket.");
                    } else {
                        alert("Tusen takk! Din PayPal-donasjon ble fullført.");
                    }
                    
                    // Reset form and container
                    paypalContainer.style.display = "none";
                    const donationForm = document.querySelector('.donation-form-content');
                    if (donationForm) {
                        donationForm.reset();
                        // Re-trigger default selection
                        const defaultBtn = document.querySelector('.amount-btn[data-amount="500"]');
                        if (defaultBtn) defaultBtn.click();
                    }

                } catch (error) {
                    console.error("PayPal capture failed:", error);
                    if (window.showResultModal) {
                        window.showResultModal(false, "PayPal-betalingen feilet under bekreftelse: " + error.message);
                    } else {
                        alert("Betalingen feilet: " + error.message);
                    }
                } finally {
                    showLoadingOverlay(false);
                }
            },
            onError: (err) => {
                console.error("PayPal Smart Button Error:", err);
                alert("Det oppstod en feil i PayPal-vinduet. Vennligst prøv igjen.");
            },
            style: {
                layout: 'vertical',
                color:  'gold',
                shape:  'rect',
                label:  'paypal'
            }
        }).render('#paypal-button');
    });
}

function showLoadingOverlay(show) {
    let overlay = document.getElementById("hkm-paypal-loading");
    if (show) {
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "hkm-paypal-loading";
            overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 99999;";
            overlay.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #FF5B24; margin-bottom: 15px;"></i>
                    <p style="font-weight: 600; color: #333; margin: 0;">Bekrefter betalingen med PayPal...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    } else {
        if (overlay) overlay.remove();
    }
}

// Expose globally
window.initPayPalDonation = initPayPalDonation;
