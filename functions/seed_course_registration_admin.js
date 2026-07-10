const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  console.log("Seeding email template: course_registration");
  const docRef = db.collection('email_templates').doc('course_registration');
  
  await docRef.set({
    subject: "Bekreftelse på kursregistrering: {{courseTitle}}",
    body: `<div style="background-color: #f8fafc; padding: 32px 16px; border-radius: 16px; font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
  <!-- Header Branding -->
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; font-size: 11px; font-weight: 800; padding: 6px 16px; border-radius: 9999px; letter-spacing: 0.08em; text-transform: uppercase; display: inline-block; box-shadow: 0 4px 6px rgba(209, 125, 57, 0.15);">
      His Kingdom Ministry
    </span>
  </div>

  <!-- Heading -->
  <h2 style="font-size: 28px; font-weight: 800; color: #1B4965; text-align: center; margin: 0 0 16px 0; line-height: 1.2; letter-spacing: -0.02em;">
    Hei {{name}}, påmeldingen er bekreftet!
  </h2>

  <!-- Subtitle / Intro -->
  <p style="font-size: 16px; line-height: 1.6; color: #475569; text-align: center; margin: 0 0 32px 0; font-weight: 500;">
    Du er nå påmeldt kurset <strong>{{courseTitle}}</strong>. Vi gleder oss til å ha deg med på denne reisen!
  </p>

  <!-- Info Card -->
  <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(27, 73, 101, 0.04); margin-bottom: 32px; text-align: left;">
    <h3 style="font-size: 18px; font-weight: 700; color: #1B4965; margin: 0 0 16px 0;">
      Hva skjer videre?
    </h3>
    
    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155; font-size: 14px;">1. Logg inn på Min Side</p>
      <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
        Hvis kurset er gratis, eller du allerede har betalt, kan du starte umiddelbart. Logg inn på din konto.
      </p>
    </div>
    
    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155; font-size: 14px;">2. Betalingsbehandling (hvis aktuelt)</p>
      <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
        Hvis kurset krever betaling og du ikke har betalt ennå, vil vi godkjenne tilgangen så snart betalingen er registrert hos oss.
      </p>
    </div>

    <div>
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155; font-size: 14px;">3. Fullfør leksjoner og ta notater</p>
      <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
        Inne i portalen kan du se videoer, laste ned ressurser, ta personlige notater og slå opp bibelvers direkte i spilleren.
      </p>
    </div>
  </div>

  <!-- CTA Button -->
  <div style="text-align: center; margin-bottom: 16px;">
    <a href="https://hiskingdomministry.no/minside/index.html" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(209, 125, 57, 0.25);">
      Gå til Min Side
    </a>
  </div>
  
  <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
    Vennlig hilsen,<br>
    <strong style="color: #1B4965;">His Kingdom Ministry</strong>
  </p>
</div>`,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log("✅ Template successfully seeded!");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
