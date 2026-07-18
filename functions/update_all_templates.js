const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const templates = {
  daily_bible_reading: {
    subject: 'Dagens bibellesing: Dag {{day}} - {{title}}',
    body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
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

    <!-- Reading Section Card (Original style + premium details) -->
    <section style="margin-bottom: 32px; background-color: #ffffff; border-left: 4px solid #1B4965; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(27, 73, 101, 0.02); border-top: 1px solid rgba(27, 73, 101, 0.05); border-right: 1px solid rgba(27, 73, 101, 0.05); border-bottom: 1px solid rgba(27, 73, 101, 0.05);">
      <div style="display: inline-block; padding: 2px 6px; background-color: rgba(27, 73, 101, 0.08); color: #1B4965; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 12px;">
        BIBELTEKST
      </div>
      <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 22px; line-height: 30px; font-weight: 700; color: #121c2c; margin: 0 0 8px 0;">
        {{title}} - Dag {{day}}
      </h3>
      <p style="margin: 0; color: #56423b; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600;">
        📖 Bibeltekst: {{passage}}
      </p>
    </section>

    <!-- Devotional Section Card (Original style + premium details) -->
    <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #d17d39; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(209, 125, 57, 0.02); border-top: 1px solid rgba(209, 125, 57, 0.05); border-right: 1px solid rgba(209, 125, 57, 0.05); border-bottom: 1px solid rgba(209, 125, 57, 0.05);">
      <div style="display: inline-block; padding: 2px 6px; background-color: rgba(209, 125, 57, 0.08); color: #d17d39; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 12px;">
        ANDAKT &amp; BØNN
      </div>
      <h4 style="font-family: 'Merriweather', Georgia, serif; font-size: 18px; line-height: 26px; font-weight: 600; color: #121c2c; margin: 0 0 12px 0;">
        Dagens andakt og bønn
      </h4>
      <div style="font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.7; color: rgba(18, 28, 44, 0.9); text-align: left; white-space: pre-line;">
        {{devotional}}
      </div>
    </section>

    <!-- CTA Button (Asymmetrical, Orange Gradient) -->
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/bibel.html?plan={{planId}}&day={{day}}" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
        LES PLAN
      </a>
    </div>

    <!-- Closing -->
    <section style="border-top: 1px solid rgba(221, 193, 182, 0.1); padding-top: 40px; margin-bottom: 16px; text-align: left;">
      <p style="font-family: 'Inter', sans-serif; font-size: 15px; color: #56423b; font-style: italic; margin: 0 0 20px 0;">Vennlig hilsen,</p>
      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; display: inline-table; vertical-align: middle;">
        <tr>
          <td style="vertical-align: middle; padding-right: 12px;">
            <div style="width: 32px; height: 1px; background-color: rgba(27, 73, 101, 0.3); font-size: 1px; line-height: 1px; overflow: hidden;"></div>
          </td>
          <td style="vertical-align: middle; line-height: 1;">
            <span style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: #1B4965; text-transform: uppercase; letter-spacing: 0.3em; margin: 0; display: inline-block; line-height: 1; vertical-align: middle;">HIS KINGDOM MINISTRY</span>
          </td>
        </tr>
      </table>
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
</div>`
  },
  welcome_email: {
    subject: 'Velkommen til His Kingdom Ministry!',
    body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
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
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Velkommen, {{name}}!</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Vi er så glade for at du har registrert deg i vårt system. Måtte fellesskapet være til velsignelse for deg.
      </p>
    </section>

    <!-- Info Card -->
    <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #1B4965; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(27, 73, 101, 0.02); border-top: 1px solid rgba(27, 73, 101, 0.05); border-right: 1px solid rgba(27, 73, 101, 0.05); border-bottom: 1px solid rgba(27, 73, 101, 0.05);">
      <div style="display: inline-block; padding: 2px 6px; background-color: rgba(27, 73, 101, 0.08); color: #1B4965; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 16px;">
        DITT MEDLEMSKAP
      </div>
      <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 20px; line-height: 28px; font-weight: 600; color: #121c2c; margin: 0 0 16px 0;">
        Hva kan du gjøre på Min Side?
      </h3>
      <ul style="margin: 0; padding: 0 0 0 20px; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.8; color: rgba(18, 28, 44, 0.9);">
        <li style="margin-bottom: 8px;"><strong>Min Side:</strong> Hold oversikt over profilen din og dine aktive leseplaner.</li>
        <li style="margin-bottom: 8px;"><strong>Ressurser:</strong> Få tilgang til eksklusive artikler, videoer og undervisning.</li>
        <li><strong>Kurs:</strong> Påmelding og progresjon på våre bibelkurs.</li>
      </ul>
    </section>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/minside" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
        Gå til Min Side
      </a>
    </div>

    <!-- Closing -->
    <section style="border-top: 1px solid rgba(221, 193, 182, 0.1); padding-top: 40px; margin-bottom: 16px; text-align: left;">
      <p style="font-family: 'Inter', sans-serif; font-size: 15px; color: #56423b; font-style: italic; margin: 0 0 20px 0;">Vennlig hilsen,</p>
      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; display: inline-table; vertical-align: middle;">
        <tr>
          <td style="vertical-align: middle; padding-right: 12px;">
            <div style="width: 32px; height: 1px; background-color: rgba(27, 73, 101, 0.3); font-size: 1px; line-height: 1px; overflow: hidden;"></div>
          </td>
          <td style="vertical-align: middle; line-height: 1;">
            <span style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: #1B4965; text-transform: uppercase; letter-spacing: 0.3em; margin: 0; display: inline-block; line-height: 1; vertical-align: middle;">HIS KINGDOM MINISTRY</span>
          </td>
        </tr>
      </table>
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
</div>`
  },
  course_registration: {
    subject: 'Bekreftelse på kursregistrering: {{courseTitle}}',
    body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
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
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Hei {{name}}!</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Takk for din påmelding til kurset vårt. Vi gleder oss til å følge deg på denne reisen!
      </p>
    </section>

    <!-- Info Card -->
    <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #1B4965; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(27, 73, 101, 0.02); border-top: 1px solid rgba(27, 73, 101, 0.05); border-right: 1px solid rgba(27, 73, 101, 0.05); border-bottom: 1px solid rgba(27, 73, 101, 0.05);">
      <div style="display: inline-block; padding: 2px 6px; background-color: rgba(27, 73, 101, 0.08); color: #1B4965; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 12px;">
        KURSPÅMELDING
      </div>
      <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 20px; line-height: 28px; font-weight: 600; color: #121c2c; margin: 0 0 12px 0;">
        {{courseTitle}}
      </h3>
      <p style="margin: 0 0 16px 0; color: rgba(18, 28, 44, 0.9); font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6;">
        Vi har registrert din påmelding til kurset.
      </p>
      <div style="border-top: 1px solid rgba(221, 193, 182, 0.2); padding-top: 16px;">
        <h4 style="margin: 0 0 8px 0; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: #121c2c;">Hva skjer videre?</h4>
        <ul style="margin: 0; padding: 0 0 0 20px; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.7; color: rgba(18, 28, 44, 0.8);">
          <li style="margin-bottom: 6px;">Hvis kurset er gratis, eller du allerede har betalt, kan du logge inn på Min Side og starte umiddelbart.</li>
          <li>Hvis det krever betaling og du ikke har fullført denne, vil kurstilgangen åpnes så snart betalingen er registrert.</li>
        </ul>
      </div>
    </section>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/minside" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
        Start kurset nå
      </a>
    </div>

    <!-- Closing -->
    <section style="border-top: 1px solid rgba(221, 193, 182, 0.1); padding-top: 40px; margin-bottom: 16px; text-align: left;">
      <p style="font-family: 'Inter', sans-serif; font-size: 15px; color: #56423b; font-style: italic; margin: 0 0 20px 0;">Vennlig hilsen,</p>
      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; display: inline-table; vertical-align: middle;">
        <tr>
          <td style="vertical-align: middle; padding-right: 12px;">
            <div style="width: 32px; height: 1px; background-color: rgba(27, 73, 101, 0.3); font-size: 1px; line-height: 1px; overflow: hidden;"></div>
          </td>
          <td style="vertical-align: middle; line-height: 1;">
            <span style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: #1B4965; text-transform: uppercase; letter-spacing: 0.3em; margin: 0; display: inline-block; line-height: 1; vertical-align: middle;">HIS KINGDOM MINISTRY</span>
          </td>
        </tr>
      </table>
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
</div>`
  },
  newsletter_confirmation: {
    subject: 'Bekreftelse: Du er påmeldt nyhetsbrevet vårt!',
    body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
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
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Takk for din påmelding!</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Vi er veldig takknemlige for at du ønsker å følge arbeidet vårt gjennom nyhetsbrevet.
      </p>
    </section>

    <!-- Info Card -->
    <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #d17d39; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(209, 125, 57, 0.02); border-top: 1px solid rgba(209, 125, 57, 0.05); border-right: 1px solid rgba(209, 125, 57, 0.05); border-bottom: 1px solid rgba(209, 125, 57, 0.05);">
      <div style="display: inline-block; padding: 2px 6px; background-color: rgba(209, 125, 57, 0.08); color: #d17d39; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 12px;">
        NYHETSBREV
      </div>
      <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 20px; line-height: 28px; font-weight: 600; color: #121c2c; margin: 0 0 12px 0;">
        Du er nå registrert
      </h3>
      <p style="margin: 0 0 12px 0; color: rgba(18, 28, 44, 0.9); font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6;">
        Vi har lagt til din e-postadresse: <strong>{{email}}</strong>.
      </p>
      <p style="margin: 0; color: rgba(18, 28, 44, 0.9); font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6;">
        Du vil fremover motta jevnlige oppdateringer om bibelstudier, nye leseplaner, podcast-episoder og andre nyheter fra oss.
      </p>
    </section>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
        Besøk nettsiden
      </a>
    </div>

    <!-- Closing -->
    <section style="border-top: 1px solid rgba(221, 193, 182, 0.1); padding-top: 40px; margin-bottom: 16px; text-align: left;">
      <p style="font-family: 'Inter', sans-serif; font-size: 15px; color: #56423b; font-style: italic; margin: 0 0 20px 0;">Vennlig hilsen,</p>
      <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; display: inline-table; vertical-align: middle;">
        <tr>
          <td style="vertical-align: middle; padding-right: 12px;">
            <div style="width: 32px; height: 1px; background-color: rgba(27, 73, 101, 0.3); font-size: 1px; line-height: 1px; overflow: hidden;"></div>
          </td>
          <td style="vertical-align: middle; line-height: 1;">
            <span style="font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: #1B4965; text-transform: uppercase; letter-spacing: 0.3em; margin: 0; display: inline-block; line-height: 1; vertical-align: middle;">HIS KINGDOM MINISTRY</span>
          </td>
        </tr>
      </table>
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
      Avregistrer nyhetsbrev
    </a>
  </footer>
</div>`
  }
};

async function updateAll() {
  for (const [id, t] of Object.entries(templates)) {
    console.log(`Oppdaterer epostmal med ID: ${id}...`);
    const docRef = db.collection('email_templates').doc(id);
    await docRef.set({
      subject: t.subject,
      body: t.body,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`✅ ${id} ble oppdatert!`);
  }
  console.log('\nAlle epostmaler oppdatert med suksess!');
  process.exit(0);
}

updateAll().catch(err => {
  console.error('Feil under oppdatering:', err);
  process.exit(1);
});
