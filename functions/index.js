const { onRequest } = require("firebase-functions/v2/https");
const fetch = require("node-fetch");
const { parseStringPromise } = require("xml2js");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

// Stripe is initialized inside the function to avoid build-time errors
const stripeInit = require("stripe");

exports.getPodcast = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  const rssUrl = "https://anchor.fm/s/f7a13dec/podcast/rss";

  try {
    const response = await fetch(rssUrl);
    const text = await response.text();
    const data = await parseStringPromise(text);
    res.json(data);
  } catch (error) {
    console.error("Error fetching podcast:", error);
    res.status(500).send("Error fetching podcast");
  }
});

/**
 * Oppretter en PaymentIntent for Stripe.
 * Tar imot: amount (NOK), currency (optional, default NOK).
 */
exports.createPaymentIntent = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  // Håndter preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { amount, currency = "nok", customerDetails = {} } = req.body;

    if (!amount) {
      res.status(400).send({ error: "Missing amount" });
      return;
    }

    // Initialize Stripe lazily
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("Stripe Secret Key is missing!");
      res.status(500).send({ error: "Server configuration error: Missing Stripe Key." });
      return;
    }
    const stripe = stripeInit(stripeKey);

    // Opprett PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe bruker øre (cents)
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerDetails.email || undefined,
      description: `Donasjon fra ${customerDetails.name || 'Ukjent'}`,
      metadata: {
        customer_name: customerDetails.name,
        customer_email: customerDetails.email,
        customer_phone: customerDetails.phone,
        customer_address: customerDetails.address,
        customer_zip: customerDetails.zip,
        customer_city: customerDetails.city,
        message: customerDetails.message,
      },
      shipping: customerDetails.name && customerDetails.address ? {
        name: customerDetails.name,
        address: {
          line1: customerDetails.address,
          city: customerDetails.city,
          postal_code: customerDetails.zip,
          country: 'NO', // Default to Norway
        },
      } : undefined,
    });

    // Returner clientSecret til frontend
    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * Logger systemfeil til Firestore og sender e-post ved kritiske feil.
 */
exports.logSystemError = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  // Håndter preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { type, message, severity = "INFO", userId = null, additionalData = {} } = req.body;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // 1. Lagre til Firestore
    await db.collection("system_logs").add({
      type,
      message,
      severity,
      userId,
      additionalData,
      timestamp, // Firestore server timestamp
      createdAt: new Date().toISOString(), // Readable timestamp
      read: false // Markert som ulest for dashboardet
    });

    // 2. Send e-post hvis CRITICAL
    if (severity === "CRITICAL") {
      // Sjekk om e-postkonfigurasjon finnes
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;
      const adminEmail = process.env.ADMIN_EMAIL || emailUser; // Fallback to sender if not specified

      if (emailUser && emailPass) {
        const transporter = nodemailer.createTransport({
          service: "gmail", // Eller annen SMTP-tjeneste
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        });

        await transporter.sendMail({
          from: `"System Alert" <${emailUser}>`,
          to: adminEmail,
          subject: `🚨 KRITISK FEIL: ${type}`,
          text: `En kritisk feil har oppstått i systemet.\n\nType: ${type}\nMelding: ${message}\nBruker: ${userId || "Ukjent"}\nTidspunkt: ${new Date().toLocaleString()}\n\nSjekk dashboardet for flere detaljer.`,
          html: `
            <h2>🚨 Kritisk Systemfeil</h2>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Melding:</strong> ${message}</p>
            <p><strong>Bruker:</strong> ${userId || "Ukjent"}</p>
            <p><strong>Tidspunkt:</strong> ${new Date().toLocaleString()}</p>
            <br>
            <p><a href="https://his-kingdom-ministry.web.app/admin">Gå til Dashboard</a></p>
          `
        });
        console.log("Kritisk varsel sendt på e-post.");
      } else {
        console.warn("Mangler e-postkonfigurasjon (EMAIL_USER, EMAIL_PASS) for å sende varsel.");
      }
    }

    res.status(200).send({ success: true });

  } catch (error) {
    console.error("Feil ved logging:", error);
    res.status(500).send({ error: "Kunne ikke logge feil." });
  }
});