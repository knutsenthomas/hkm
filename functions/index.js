const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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

/**
 * Trigger som sender velkomst-e-post til nye brukere.
 */
exports.onUserCreate = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }
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
  await verifyAdmin(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
});

/**
 * Paginert henting av alle brukere fra Firestore.
 * @param {string} [role] - Filtrer brukere etter rolle.
 */
async function getAllUsers(role) {
  const users = [];
  let usersQuery = db.collection('users');

  if (role && role !== 'all') {
    usersQuery = usersQuery.where('role', '==', role);
  }

  const querySnapshot = await usersQuery.get();
  querySnapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });

  return users;
}

/**
 * Verifies that the user is an admin.
 * Express-style middleware for use in onRequest functions.
 */
const verifyAdmin = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];

    if (!idToken) {
        res.status(401).send({ error: 'Unauthorized: Missing authorization token.' });
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (userDoc.exists) {
            const userRole = userDoc.data().role;
            // Allow 'admin' or 'superadmin'
            if (userRole === 'admin' || userRole === 'superadmin') {
                req.user = decodedToken; // Pass user info to the handler
                return next();
            }
        }

        res.status(403).send({ error: 'Forbidden: You do not have permission to perform this action.' });
    } catch (error) {
        console.error('Error verifying admin token:', error);
        res.status(401).send({ error: 'Unauthorized: Invalid token.' });
    }
};

/**
 * Utsendelse av e-post til en gruppe brukere.
 * Krever admin-autentisering.
 */
exports.sendBulkEmail = onRequest({ cors: true }, async (req, res) => {
    // Wrap the core logic in the verifyAdmin middleware
    await verifyAdmin(req, res, async () => {
        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'POST');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.status(204).send('');
            return;
        }

        try {
            const { targetRole, subject, message, fromName } = req.body;

            if (!targetRole || !subject || !message) {
                res.status(400).send({ error: "Mangler targetRole, subject eller message." });
                return;
            }

            console.log(`Starter masseutsendelse for rolle: ${targetRole}`);

            const users = await getAllUsers(targetRole);
            
            if (users.length === 0) {
                res.status(404).send({ error: "Ingen brukere funnet for den valgte rollen." });
                return;
            }
            
            const emails = users.map(u => u.email).filter(Boolean);
            console.log(`Fant ${emails.length} e-postadresser å sende til.`);

            // For now, lets send in parallel. If there are many users, a batching queue would be better.
            const emailPromises = emails.map(email => {
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
                return sendEmail({ to: email, subject, html, text: message, fromName });
            });

            await Promise.all(emailPromises);

            res.status(200).send({ success: true, message: `E-poster er sendt til ${emails.length} brukere.` });

        } catch (error) {
            console.error("Feil ved masseutsendelse av e-post:", error);
            res.status(500).send({ error: error.message });
        }
    });
});

/**
 * Utsendelse av push-varslinger til en gruppe brukere.
 * Krever admin-autentisering.
 */
exports.sendPushNotification = onRequest({ cors: true }, async (req, res) => {
    await verifyAdmin(req, res, async () => {
        if (req.method === 'OPTIONS') {
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'POST');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.status(204).send('');
            return;
        }

        try {
            const { targetRole, title, body, icon, click_action } = req.body;

            if (!targetRole || !title || !body) {
                res.status(400).send({ error: "Mangler targetRole, title eller body." });
                return;
            }

            console.log(`Starter utsendelse av push-varsling for rolle: ${targetRole}`);

            const users = await getAllUsers(targetRole);
            
            if (users.length === 0) {
                res.status(404).send({ error: "Ingen brukere funnet for den valgte rollen." });
                return;
            }

            // Create a map of token to user ID
            const tokenUserMap = new Map();
            users.forEach(user => {
                if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
                    user.fcmTokens.forEach(token => {
                        tokenUserMap.set(token, user.id);
                    });
                }
            });

            const tokens = Array.from(tokenUserMap.keys());

            if (tokens.length === 0) {
                res.status(404).send({ error: "Ingen brukere med varslingstokens funnet." });
                return;
            }

            console.log(`Fant ${tokens.length} tokens å sende til.`);

            const message = {
                notification: {
                    title,
                    body,
                    icon: icon || '/img/logo-hkm.png',
                },
                webpush: {
                    fcm_options: {
                        link: click_action || 'https://his-kingdom-ministry.web.app/'
                    }
                }
            };

            const response = await admin.messaging().sendToDevice(tokens, message);
            let failureCount = 0;
            let successCount = 0;

            const tokensToClean = [];

            response.results.forEach((result, index) => {
                const error = result.error;
                if (error) {
                    failureCount++;
                    console.error('Failure sending notification to', tokens[index], error);
                    // Cleanup the tokens that are not registered anymore.
                    if (error.code === 'messaging/registration-token-not-registered' ||
                        error.code === 'messaging/invalid-registration-token') {
                        const token = tokens[index];
                        tokensToClean.push(token);
                    }
                } else {
                    successCount++;
                }
            });
            
            if (tokensToClean.length > 0) {
                console.log(`Cleaning ${tokensToClean.length} invalid tokens.`);
                const cleanupPromises = tokensToClean.map(async (token) => {
                    const userId = tokenUserMap.get(token);
                    if (userId) {
                        const userRef = db.collection('users').doc(userId);
                        return userRef.update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
                        });
                    }
                });
                await Promise.all(cleanupPromises);
                console.log("Token cleanup complete.");
            }

            console.log(`Successfully sent message to ${successCount} devices. Failed for ${failureCount} devices.`);
            res.status(200).send({ success: true, message: `Varsling sendt til ${successCount} enheter. ${failureCount} feilet.` });

        } catch (error) {
            console.error("Feil ved utsendelse av push-varsling:", error);
            res.status(500).send({ error: error.message });
        }
    });
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