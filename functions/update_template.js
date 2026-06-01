const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const newHtml = `
<div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 0; background-color: transparent;">
  <!-- Studio Badge -->
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; font-size: 11px; font-weight: 800; padding: 6px 16px; border-radius: 9999px; letter-spacing: 0.08em; text-transform: uppercase; display: inline-block; box-shadow: 0 4px 6px rgba(209, 125, 57, 0.15);">
      HKM Studio Assistent
    </span>
  </div>

  <!-- Headline & Subtitle -->
  <h1 class="email-headline" style="font-size: 32px; font-weight: 850; color: #1B4965; text-align: center; margin: 0 0 16px 0; line-height: 1.2; letter-spacing: -0.03em;">
    Nye ukentlige innholdskampanjer er klare til vurdering
  </h1>
  
  <p style="font-size: 15.5px; line-height: 1.6; color: #475569; text-align: center; margin: 0 0 32px 0; font-weight: 500; padding: 0 16px;">
    Gå til AI-assistenten i HKM Studio for å vurdere de nye andaktene, blogginnleggene og undervisningstemaene, og godkjenne dem for sending.
  </p>

  <!-- Premium CTA Button -->
  <div style="text-align: center; margin-bottom: 48px;">
    <a href="https://hkm-dusky.vercel.app/admin/index.html#newsletter" style="display: inline-block; background-color: #1B4965; color: #ffffff; text-decoration: none; font-size: 14.5px; font-weight: 700; padding: 16px 36px; border-radius: 9999px; box-shadow: 0 10px 20px rgba(27, 73, 101, 0.22); transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.05em;">
      Vurder og godkjenn i HKM Studio
    </a>
  </div>

  <!-- Devotional Preview Card -->
  <div class="email-preview-card" style="background-color: #f8fafc; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 12px 24px rgba(15, 23, 42, 0.03);">
    <img src="https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=800&h=450&q=80" width="600" height="338" alt="Åpen bibel" style="width: 100%; height: auto; max-height: 338px; object-fit: cover; display: block; border-top-left-radius: 22px; border-top-right-radius: 22px; border-bottom: 1px solid #e2e8f0;">
    
    <div class="email-preview-card-body" style="padding: 32px;">
      <!-- Date Badge -->
      <div style="font-size: 11px; font-weight: 700; color: #d17d39; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.08em; line-height: 1.2;">
        <span style="color: #d17d39; font-size: 12px; vertical-align: middle; margin-right: 6px; line-height: 1;">&#9679;</span>Planlagt til torsdag 4. juni
      </div>
      
      <!-- Card Title -->
      <h3 style="font-size: 20px; font-weight: 800; color: #1B4965; margin: 0 0 12px 0; line-height: 1.3; letter-spacing: -0.01em;">
        Ukens Andakt: Lær å vokse i tro og modenhet
      </h3>
      
      <!-- Card Body -->
      <p style="font-size: 14px; line-height: 1.55; color: #64748b; margin: 0 0 24px 0; font-weight: 500;">
        Gå inn i HKM Studio for å tilpasse andakten, legge til egne tanker eller godkjenne den for umiddelbar utsendelse til alle abonnenter.
      </p>
      
      <!-- Card CTA Link -->
      <div>
        <a href="https://hkm-dusky.vercel.app/admin/index.html#newsletter" style="text-decoration: none; display: inline-block; vertical-align: middle;">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; display: inline-table; vertical-align: middle;">
            <tr>
              <td style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: #d17d39; line-height: 1.2; vertical-align: middle; padding: 0 6px 0 0; margin: 0; border: none;">
                Åpne i HKM Studio
              </td>
              <td style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; color: #d17d39; line-height: 1; vertical-align: middle; padding: 0; margin: 0; border: none;">
                &rarr;
              </td>
            </tr>
          </table>
        </a>
      </div>
    </div>
  </div>
</div>
`;

async function updateTemplate() {
  try {
    const docId = 'tTtkWktmVlOjkrGAP9G8';
    console.log(`Oppdaterer mal med ID: ${docId}...`);
    
    const docRef = db.collection('newsletter_templates').doc(docId);
    
    await docRef.update({
      blocks: [
        {
          id: 'unified_content',
          type: 'text',
          content: {
            text: newHtml.trim()
          }
        }
      ],
      updatedAt: new Date().toISOString()
    });
    
    console.log("✅ Malen ble oppdatert med suksess!");
  } catch (err) {
    console.error("❌ Feil ved oppdatering av mal:", err);
  }
  process.exit(0);
}

updateTemplate();
