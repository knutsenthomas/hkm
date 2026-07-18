const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const newHtml = `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
  <!-- Minimal Top Accent -->
  <div style="height: 4px; background: linear-gradient(90deg, #1B4965 0%, #d17d39 50%, #bd4f2a 100%);"></div>

  <!-- Editorial Header -->
  <header style="padding: 40px 32px 24px 32px; text-align: center; background-color: #FCF9F5;">
    <div style="margin-bottom: 16px;">
      <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 48px; width: auto; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
    </div>
    <h1 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: rgba(18, 28, 44, 0.6); text-transform: uppercase; letter-spacing: 0.25em; line-height: 1.5;">His Kingdom Ministry</h1>
    <div style="width: 32px; height: 1px; background-color: rgba(137, 114, 105, 0.4); margin: 20px auto 0 auto;"></div>
  </header>

  <!-- Main Content Wrapper -->
  <div style="padding: 0 32px 40px 32px; background-color: #FCF9F5;">
    <!-- Personal Greeting -->
    <section style="margin-bottom: 32px; text-align: center; max-width: 440px; margin-left: auto; margin-right: auto;">
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Hei {{name}}</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Måtte dagens ord bringe deg stillhet, refleksjon og fornyet styrke.
      </p>
    </section>

    <!-- Reading Section Card -->
    <section style="margin-bottom: 40px; margin-left: 8px;">
      <div style="display: inline-block; padding: 2px 0; color: #1B4965; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 16px;">
        BIBELTEKST
      </div>
      <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 26px; line-height: 34px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; line-height: 1.2;">
        {{title}}:<br/><span style="color: rgba(209, 125, 57, 0.8); font-weight: 400; font-style: italic;">Dag {{day}}</span>
      </h3>
      <div style="display: flex; align-items: center; gap: 8px; color: #56423b; font-family: 'Inter', sans-serif; font-size: 15px; border-top: 1px solid rgba(221, 193, 182, 0.2); padding-top: 16px; max-width: 280px;">
        <span style="font-size: 14px; font-weight: 600; color: #56423b;">📖 Bibeltekst: {{passage}}</span>
      </div>
    </section>

    <!-- Devotional Section -->
    <section style="margin-bottom: 48px; position: relative;">
      <!-- Asymmetrical accent -->
      <div style="position: absolute; left: -32px; top: 0; bottom: 0; width: 4px; background-color: rgba(209, 125, 57, 0.2);"></div>
      <div style="padding: 4px 8px;">
        <div style="display: inline-block; padding: 2px 0; color: #d17d39; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 20px;">
          ANDAKT &amp; BØNN
        </div>
        <h4 style="font-family: 'Merriweather', Georgia, serif; font-size: 20px; line-height: 28px; font-weight: 600; color: #121c2c; margin: 0 0 20px 0; line-height: 1.3; max-width: 500px;">
          Dagens andakt og bønn
        </h4>
        <div style="font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.7; color: rgba(18, 28, 44, 0.9); text-align: left; white-space: pre-line;">
          {{devotional}}
        </div>
      </div>
    </section>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/bibel.html?plan={{planId}}&day={{day}}" style="background-color: #1B4965; color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 12px rgba(27, 73, 101, 0.15);">
        LES PLAN
      </a>
    </div>

    <!-- Closing -->
    <section style="border-top: 1px solid rgba(221, 193, 182, 0.1); padding-top: 40px; margin-bottom: 16px; text-align: left;">
      <p style="font-family: 'Inter', sans-serif; font-size: 15px; color: #56423b; font-style: italic; margin: 0 0 20px 0;">Vennlig hilsen,</p>
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 32px; height: 1px; background-color: rgba(27, 73, 101, 0.3); display: inline-block; vertical-align: middle; margin-right: 8px;"></div>
        <p style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: #1B4965; text-transform: uppercase; letter-spacing: 0.3em; margin: 0; display: inline-block; vertical-align: middle;">HIS KINGDOM MINISTRY</p>
      </div>
    </section>
  </div>

  <!-- Footer -->
  <footer style="padding: 32px 32px 40px 32px; background-color: rgba(252, 249, 245, 0.5); text-align: center; border-top: 1px solid rgba(221, 193, 182, 0.1);">
    <div style="margin-bottom: 24px;">
      <a href="https://www.hiskingdomministry.no/" style="color: rgba(18, 28, 44, 0.3); text-decoration: none; margin: 0 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;">Hjem</a>
      <a href="https://www.hiskingdomministry.no/minside" style="color: rgba(18, 28, 44, 0.3); text-decoration: none; margin: 0 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;">Min Side</a>
      <a href="mailto:kontakt@hiskingdomministry.no" style="color: rgba(18, 28, 44, 0.3); text-decoration: none; margin: 0 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;">Kontakt</a>
    </div>
    <p style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(18, 28, 44, 0.4); margin: 0 0 12px 0;">© 2026 His Kingdom Ministry</p>
    <a href="https://www.hiskingdomministry.no/minside" style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #1B4965; text-decoration: underline; text-underline-offset: 4px; font-weight: 600;">
      Endre dine varslingsinnstillinger
    </a>
  </footer>
</div>`;

async function updateTemplate() {
  try {
    const docId = 'daily_bible_reading';
    console.log(`Oppdaterer leseplan-mal med ID: ${docId}...`);
    
    const docRef = db.collection('email_templates').doc(docId);
    
    await docRef.set({
      subject: 'Dagens bibellesing: Dag {{day}} - {{title}}',
      body: newHtml.trim(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log("✅ Leseplan-malen ble oppdatert med suksess!");
  } catch (err) {
    console.error("❌ Feil ved oppdatering av mal:", err);
  }
  process.exit(0);
}

updateTemplate();
