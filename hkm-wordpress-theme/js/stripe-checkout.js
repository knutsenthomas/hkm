// Replace with your public key
// TODO: User needs to replace this placeholder or configure environment variables
const stripe = Stripe("pk_live_51Pab8rAL393JGrO9bTUitYflDKlHGpLiqZCCBp0dCzBEV3ZFxARFfK6MgWraehq7i79tJHPIEzlpMwPiT2K3HsiZ00gJ1TQ71Y");
const STRIPE_PAYMENT_INTENT_URL = "https://us-central1-his-kingdom-ministry.cloudfunctions.net/createPaymentIntent";
const VIPPS_CREATE_PAYMENT_URL = "https://us-central1-his-kingdom-ministry.cloudfunctions.net/createVippsPayment";
const VIPPS_FINALIZE_PAYMENT_URL = "https://us-central1-his-kingdom-ministry.cloudfunctions.net/finalizeVippsPayment";

let elements;
let emailAddress = '';

function getVippsStateMessage(state) {
    const normalizedState = typeof state === "string" ? state.toUpperCase() : "";

    switch (normalizedState) {
        case "CAPTURED":
            return "Vipps-betalingen er fullført. Tusen takk for gaven.";
        case "AUTHORIZED":
            return "Vipps-betalingen er godkjent og blir ferdigstilt nå.";
        case "ABORTED":
            return "Vipps-betalingen ble avbrutt.";
        case "EXPIRED":
            return "Vipps-betalingen utløp før den ble godkjent.";
        case "CANCELLED":
            return "Vipps-betalingen ble kansellert.";
        case "TERMINATED":
            return "Vipps-betalingen ble avsluttet.";
        default:
            return "Vi mottok svar fra Vipps, men klarte ikke å fastslå betalingsstatus.";
    }
}

async function parseJsonOrThrow(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
    }
    return data;
}

async function initializeStripe(amount, customerDetails = {}, paymentMethodPreference = "auto") {
    // Show spinner
    setLoading(true);

    try {
        // Call your backend to create the PaymentIntent
        const response = await fetch(STRIPE_PAYMENT_INTENT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: amount,
                currency: "nok",
                customerDetails: customerDetails,
                paymentMethodPreference: paymentMethodPreference
            }),
        });

        const { clientSecret } = await parseJsonOrThrow(response);

        const appearance = {
            theme: 'stripe',
            variables: {
                colorPrimary: '#FFA500',
                colorBackground: '#ffffff',
                colorText: '#30313d',
                colorDanger: '#df1b41',
                fontFamily: 'Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '6px',
            },
        };

        const elementsOptions = {
            appearance,
            clientSecret,
        };

        elements = stripe.elements(elementsOptions);

        const paymentElementOptions = {
            layout: "tabs",
            paymentMethodOrder: ["vipps", "card"],
        };

        const paymentElement = elements.create("payment", paymentElementOptions);
        paymentElement.mount("#payment-element");

        // Show the container
        document.getElementById("stripe-checkout-container").style.display = "block";

        // Scroll to the container
        document.getElementById("stripe-checkout-container").scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error("Stripe initialization failed:", error);
        const message = (error && error.message) ? error.message : "Ukjent feil";
        if (message.toLowerCase().includes("vipps")) {
            alert("Vipps er ikke tilgjengelig akkurat nå. Sjekk at Vipps er aktivert i Stripe-kontoen, eller velg kort.");
        } else {
            alert("Kunne ikke starte betalingen: " + message + ". Vennligst prøv igjen senere.");
        }

        // Log to system logger if available
        if (window.hkmLogger) window.hkmLogger.error(`Payment Init Failed: ${message}`);
    } finally {
        setLoading(false);
    }
}

async function startVippsPayment(amount, customerDetails = {}) {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        alert("Vennligst velg eller skriv inn et gyldig beløp.");
        return;
    }

    const submitButton = document.querySelector(".donation-form-content button[type='submit']");
    const originalButtonContent = submitButton ? submitButton.innerHTML : "";

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = "<i class='fas fa-spinner fa-spin' style='margin-right: 10px;'></i>Starter Vipps...";
    }

    try {
        const response = await fetch(VIPPS_CREATE_PAYMENT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: parsedAmount,
                currency: "NOK",
                customerDetails,
                returnUrl: window.location.href.split("?")[0],
            }),
        });

        const data = await parseJsonOrThrow(response);
        if (!data.redirectUrl) {
            throw new Error("Vipps returnerte ikke redirectUrl.");
        }

        window.location.href = data.redirectUrl;
    } catch (error) {
        console.error("Vipps initialization failed:", error);
        const message = (error && error.message) ? error.message : "Ukjent Vipps-feil";
        alert("Kunne ikke starte Vipps-betalingen: " + message);

        if (window.hkmLogger) {
            window.hkmLogger.error(`Vipps Init Failed: ${message}`);
        }

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonContent;
        }
    }
}

async function finalizeVippsReturn() {
    const searchParams = new URLSearchParams(window.location.search);
    const reference = searchParams.get("vipps_reference");
    const isVippsReturn = searchParams.get("vipps_return") === "1";

    if (!reference || !isVippsReturn) {
        return;
    }

    try {
        const response = await fetch(VIPPS_FINALIZE_PAYMENT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference }),
        });

        const data = await parseJsonOrThrow(response);
        showMessage(getVippsStateMessage(data.state));

        if (data.state === "CAPTURED") {
            alert("Vipps-betalingen er fullført. Takk for gaven.");
        }
    } catch (error) {
        console.error("Vipps finalize failed:", error);
        const message = (error && error.message) ? error.message : "Ukjent Vipps-feil";
        alert("Vi klarte ikke å bekrefte Vipps-betalingen automatisk: " + message);
    } finally {
        const cleanedParams = new URLSearchParams(window.location.search);
        cleanedParams.delete("vipps_reference");
        cleanedParams.delete("vipps_return");
        const cleanedUrl = `${window.location.pathname}${cleanedParams.toString() ? `?${cleanedParams.toString()}` : ""}${window.location.hash}`;
        window.history.replaceState({}, document.title, cleanedUrl);
    }
}

// Handle form submission
async function handleSubmit(e, options = {}) {
    if (e) e.preventDefault();
    setLoading(true);

    const { customReturnUrl, billingDetails } = options;

    // Default return URL is the current page, or a specific success page if provided
    const returnUrl = customReturnUrl || window.location.href.split('?')[0];

    // Prepare confirmParams
    const confirmParams = {
        return_url: returnUrl,
    };

    // Add billing details if provided (Critical for Klarna)
    if (billingDetails) {
        confirmParams.payment_method_data = {
            billing_details: billingDetails
        };
    }

    const { error } = await stripe.confirmPayment({
        elements,
        confirmParams,
    });

    // This point will only be reached if there is an immediate error (e.g. card declined)
    // or if the payment method does not require a redirect (rare for SCA/Vipps).
    if (error) {
        if (error.type === "card_error" || error.type === "validation_error") {
            showMessage(error.message);
        } else {
            showMessage("En uventet feil oppstod: " + error.message);
        }
    }

    setLoading(false);
}

// Fetches the payment intent status after payment submission
async function checkStatus() {
    const clientSecret = new URLSearchParams(window.location.search).get(
        "payment_intent_client_secret"
    );

    if (!clientSecret) {
        return;
    }

    const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

    switch (paymentIntent.status) {
        case "succeeded":
            showMessage("Betalingen var vellykket! Takk for din gave.");
            // Record to Firestore
            await recordDonation(paymentIntent);
            break;
        case "processing":
            showMessage("Betalingen behandles.");
            break;
        case "requires_payment_method":
            showMessage("Betalingen feilet, vennligst prøv igjen.");
            break;
        default:
            showMessage("Noe gikk galt.");
            break;
    }
}

async function recordDonation(paymentIntent) {
    try {
        // Only record if we are on a page where firebase is initialized
        if (typeof firebase === 'undefined') return;

        const db = firebase.firestore();
        const auth = firebase.auth();
        const user = auth.currentUser;

        // Use paymentIntent ID as document ID to prevent duplicates
        const donationRef = db.collection("donations").doc(paymentIntent.id);

        // Check if already recorded
        const doc = await donationRef.get();
        if (doc.exists) return;

        await donationRef.set({
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            uid: user ? user.uid : null,
            email: user ? user.email : (paymentIntent.receipt_email || null),
            type: "Donation",
            method: paymentIntent.payment_method_types[0] || "card"
        });

        console.log("Donation recorded successfully");
    } catch (error) {
        console.error("Error recording donation:", error);
    }
}

// UI Helpers
function showMessage(messageText) {
    const messageContainer = document.querySelector("#payment-message");
    if (!messageContainer) {
        return;
    }
    messageContainer.classList.remove("hidden");
    messageContainer.textContent = messageText;

    setTimeout(function () {
        messageContainer.classList.add("hidden");
        messageContainer.textContent = "";
    }, 4000);
}

function setLoading(isLoading) {
    const submitButton = document.querySelector("#submit-payment");
    const spinner = document.querySelector("#spinner");
    const buttonText = document.querySelector("#button-text");

    if (!submitButton || !spinner || !buttonText) {
        return;
    }

    if (isLoading) {
        // Disable the button and show a spinner
        submitButton.disabled = true;
        spinner.classList.remove("hidden");
        buttonText.classList.add("hidden");
    } else {
        submitButton.disabled = false;
        spinner.classList.add("hidden");
        buttonText.classList.remove("hidden");
    }
}

// Expose functions to global scope
window.initializeStripe = initializeStripe;
window.startVippsPayment = startVippsPayment;
window.checkStatus = checkStatus;
window.handleStripeSubmit = handleSubmit;

// Auto-check status on load
document.addEventListener("DOMContentLoaded", async () => {
    await finalizeVippsReturn();
    await checkStatus();
});
