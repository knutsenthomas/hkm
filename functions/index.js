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
 * Helper-funksjon for å sende e-post.
 */
async function sendEmail({ to, subject, text, html, fromName = "His Kingdom Ministry" }) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn("Mangler e-postkonfigurasjon (EMAIL_USER, EMAIL_PASS).");
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${emailUser}>`,
    to,
    subject,
    text,
    html,
  });

  return true;
}

/**
 * Trigger som sender velkomst-e-post til nye brukere.
 */
exports.onUserCreate = admin.firestore().collection("users").onCreate(async (snapshot, context) => {
  const userData = snapshot.data();
  const email = userData.email;
  const name = userData.displayName || userData.fullName || "venn";

  if (!email) return;

  const subject = "Velkommen til His Kingdom Ministry!";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #ff6b2b;">Velkommen til oss, ${name}!</h2>
      <p>Vi er så glade for at du har registrert deg i vårt system.</p>
      <p>Her er litt informasjon om hva du kan gjøre:</p>
      <ul>
        <li><strong>Min Side:</strong> Her kan du se din profil, oppdatere dine opplysninger og se din historikk.</li>
        <li><strong>Undervisning & Ressurser:</strong> Få tilgang til eksklusivt innhold og undervisningsserier.</li>
        <li><strong>Gaver & Støtte:</strong> Administrer dine faste bidrag og se skattefradrag.</li>
      </ul>
      <h3 style="margin-top: 24px;">Retningslinjer</h3>
      <p style="font-size: 14px; color: #666;">
        Vi ønsker å skape et trygt og inkluderende fellesskap. Vennligst behandle andre med respekt og følg våre brukervilkår som du finner på nettsiden.
      </p>
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
        Dette er en automatisk utsendt e-post fra His Kingdom Ministry.
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html,
      text: `Velkommen til oss, ${name}!\n\nVi er glade for at du har registrert deg. Se informasjon om Min Side og våre retningslinjer på nettsiden.`
    });
    console.log(`Velkomst-e-post sendt til ${email}`);
  } catch (error) {
    console.error("Feil ved sending av velkomst-e-post:", error);
  }
});

/**
 * Manuel utsendelse av e-post fra admin-panelet.
 */
exports.sendManualEmail = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { to, subject, message, fromName } = req.body;

    if (!to || !subject || !message) {
      res.status(400).send({ error: "Mangler mottaker, emne eller melding." });
      return;
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="margin-bottom: 20px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
          Vennlig hilsen,<br>
          His Kingdom Ministry
        </div>
      </div>
    `;

    const success = await sendEmail({ to, subject, html, text: message, fromName });

    if (success) {
      res.status(200).send({ success: true });
    } else {
      res.status(500).send({ error: "E-postkonfigurasjon mangler på serveren." });
    }

  } catch (error) {
    console.error("Feil ved manuell e-postsending:", error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * Logger systemfeil til Firestore og sender e-post ved kritiske feil.
 */
exports.logSystemError = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
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

    await db.collection("system_logs").add({
      type,
      message,
      severity,
      userId,
      additionalData,
      timestamp,
      createdAt: new Date().toISOString(),
      read: false
    });

    if (severity === "CRITICAL") {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

      const html = `
        <h2>🚨 Kritisk Systemfeil</h2>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Melding:</strong> ${message}</p>
        <p><strong>Bruker:</strong> ${userId || "Ukjent"}</p>
        <p><strong>Tidspunkt:</strong> ${new Date().toLocaleString()}</p>
        <br>
        <p><a href="https://his-kingdom-ministry.web.app/admin">Gå til Dashboard</a></p>
      `;

      await sendEmail({
        to: adminEmail,
        subject: `🚨 KRITISK FEIL: ${type}`,
        html,
        text: `En kritisk feil har oppstått: ${message}`,
        fromName: "System Alert"
      });
      console.log("Kritisk varsel sendt på e-post.");
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Feil ved logging:", error);
    res.status(500).send({ error: "Kunne ikke logge feil." });
  }
});