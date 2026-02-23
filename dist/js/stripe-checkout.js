// Replace with your public key
// TODO: User needs to replace this placeholder or configure environment variables
const stripe = Stripe("pk_live_51Pab8rAL393JGrO9bTUitYflDKlHGpLiqZCCBp0dCzBEV3ZFxARFfK6MgWraehq7i79tJHPIEzlpMwPiT2K3HsiZ00gJ1TQ71Y");

let elements;
let emailAddress = '';

async function initializeStripe(amount, customerDetails = {}) {
    // Show spinner
    setLoading(true);

    try {
        // Call your backend to create the PaymentIntent
        const response = await fetch("https://us-central1-his-kingdom-ministry.cloudfunctions.net/createPaymentIntent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: amount,
                currency: "nok",
                customerDetails: customerDetails
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const { clientSecret } = await response.json();

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
        };

        const paymentElement = elements.create("payment", paymentElementOptions);
        paymentElement.mount("#payment-element");

        // Show the container
        document.getElementById("stripe-checkout-container").style.display = "block";

        // Scroll to the container
        document.getElementById("stripe-checkout-container").scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error("Stripe initialization failed:", error);
        alert("Kunne ikke starte betalingen: " + error.message + ". Vennligst prøv igjen senere.");

        // Log to system logger if available
        if (window.hkmLogger) window.hkmLogger.error(`Payment Init Failed: ${error.message}`);
    } finally {
        setLoading(false);
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
    messageContainer.classList.remove("hidden");
    messageContainer.textContent = messageText;

    setTimeout(function () {
        messageContainer.classList.add("hidden");
        messageContainer.textContent = "";
    }, 4000);
}

function setLoading(isLoading) {
    if (isLoading) {
        // Disable the button and show a spinner
        document.querySelector("#submit-payment").disabled = true;
        document.querySelector("#spinner").classList.remove("hidden");
        document.querySelector("#button-text").classList.add("hidden");
    } else {
        document.querySelector("#submit-payment").disabled = false;
        document.querySelector("#spinner").classList.add("hidden");
        document.querySelector("#button-text").classList.remove("hidden");
    }
}

// Expose functions to global scope
window.initializeStripe = initializeStripe;
window.checkStatus = checkStatus;
window.handleStripeSubmit = handleSubmit;

// Auto-check status on load
document.addEventListener("DOMContentLoaded", checkStatus);
