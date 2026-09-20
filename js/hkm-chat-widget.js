// =========================================================================
// HKM Chat Widget - His Kingdom Ministry
// Unified Orange Theme (#d17d39 - #bd4f2a)
// Hybrid AI-svar + Wix Inbox Push Notifications
// =========================================================================

const TRANSLATIONS = {
  no: {
    title: 'His Kingdom Ministry',
    subtitle: 'Aktiv nå',
    greeting: 'Hei! Velsignet dag og velkommen til His Kingdom Ministry. 🙏 Hvordan kan vi be for deg eller hjelpe deg i dag?',
    placeholder: 'Skriv din melding her...',
    send: 'Send',
    sending: 'Sender...',
    error: 'Beklager, en feil oppstod. Prøv igjen.',
    openChat: 'Åpne chat',
    closeChat: 'Lukk chat',
    statusOnline: 'Aktiv nå',
    typing: 'Tenker...',
    offlineTitle: 'Vi er ikke tilstede nå',
    offlineDesc: 'Våre åpningstider for kundeservice er mandag–fredag 08:00–16:00. Du kan fortsatt sende oss meldinger, så svarer vi deg her eller på e-post så fort vi er tilbake! 😊',
    quick: [
      { text: 'Kan dere be for meg? 🙏', label: '🙏 Bønnebegjær', actionRequired: true },
      { text: 'Hvor finner jeg bibelstudiene? 📖', label: '📖 Bibelstudier', actionRequired: false },
      { text: 'Hvilke arrangementer kommer snart? 🗓️', label: '🗓️ Arrangementer', actionRequired: false },
      { text: 'Hvor kan jeg lytte til podcasten? 🎙️', label: '🎙️ Podkast', actionRequired: false },
      { text: 'Hvordan kan jeg bli fast giver? 💛', label: '💛 Bli fast giver', actionRequired: false },
      { text: 'Hvordan kommer jeg i kontakt med dere? ✉️', label: '✉️ Kontakt oss', actionRequired: false }
    ]
  },
  en: {
    title: 'His Kingdom Ministry',
    subtitle: 'Active now',
    greeting: 'Hello! Blessed day and welcome to His Kingdom Ministry. 🙏 How can we pray for you or assist you today?',
    placeholder: 'Type your message here...',
    send: 'Send',
    sending: 'Sending...',
    error: 'Sorry, an error occurred. Please try again.',
    openChat: 'Open chat',
    closeChat: 'Close chat',
    statusOnline: 'Active now',
    typing: 'Thinking...',
    offlineTitle: 'We are currently offline',
    offlineDesc: 'Our support hours are Mon–Fri 08:00–16:00. You can still send a message, and we will reply as soon as we are back! 😊',
    quick: [
      { text: 'Can you pray for me? 🙏', label: '🙏 Prayer request', actionRequired: true },
      { text: 'Where can I find Bible studies? 📖', label: '📖 Bible studies', actionRequired: false },
      { text: 'What events are coming up? 🗓️', label: '🗓️ Events', actionRequired: false },
      { text: 'Where can I listen to the podcast? 🎙️', label: '🎙️ Podcast', actionRequired: false },
      { text: 'How can I support your ministry? 💛', label: '💛 Support ministry', actionRequired: false },
      { text: 'How can I get in touch? ✉️', label: '✉️ Contact us', actionRequired: false }
    ]
  },
  es: {
    title: 'His Kingdom Ministry',
    subtitle: 'En línea',
    greeting: '¡Hola! Bendecido día y bienvenido a His Kingdom Ministry. 🙏 ¿Cómo podemos orar por ti o ayudarte hoy?',
    placeholder: 'Escribe tu mensaje aquí...',
    send: 'Enviar',
    sending: 'Enviando...',
    error: 'Lo sentimos, ocurrió un error. Intenta de nuevo.',
    openChat: 'Abrir chat',
    closeChat: 'Cerrar chat',
    statusOnline: 'En línea',
    typing: 'Pensando...',
    offlineTitle: 'Estamos fuera de horario',
    offlineDesc: 'Nuestro horario de atención es de lunes a viernes de 08:00 a 16:00. ¡Aún puedes dejarnos un mensaje y te responderemos pronto! 😊',
    quick: [
      { text: '¿Pueden orar por mí? 🙏', label: '🙏 Petición de oración', actionRequired: true },
      { text: '¿Dónde encuentro estudios bíblicos? 📖', label: '📖 Estudios bíblicos', actionRequired: false },
      { text: '¿Cuáles son los próximos eventos? 🗓️', label: '🗓️ Eventos', actionRequired: false },
      { text: '¿Dónde puedo escuchar el podcast? 🎙️', label: '🎙️ Pódcast', actionRequired: false },
      { text: '¿Cómo puedo apoyar al ministerio? 💛', label: '💛 Donaciones', actionRequired: false },
      { text: '¿Cómo puedo contactarlos? ✉️', label: '✉️ Contáctanos', actionRequired: false }
    ]
  }
};

function getSiteLanguage() {
  if (typeof window === 'undefined') return 'no';
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/en/') || path === '/en') return 'en';
  if (path.startsWith('/es/') || path === '/es') return 'es';
  const docLang = document.documentElement.lang?.toLowerCase();
  if (docLang?.startsWith('en')) return 'en';
  if (docLang?.startsWith('es')) return 'es';
  return 'no';
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isOutsideOpeningHours() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday, 1-5 = Mon-Fri
  const hour = now.getHours();
  if (day === 0 || day === 6) return true;
  if (hour < 8 || hour >= 16) return true;
  return false;
}

// Knowledge base and AI response generator for HKM
function generateHkmAiResponse(text, lang = 'no') {
  const lower = text.toLowerCase();

  if (lower.includes('bønn') || lower.includes('be for') || lower.includes('pray') || lower.includes('oraci') || lower.includes('orar')) {
    if (lang === 'en') {
      return '🙏 **We would love to pray for you!**\n\nJesus hears every prayer and cares deeply for your heart. Your prayer request has also been forwarded directly to our team in the Wix app so Thomas and our intercessors can lift you up.\n\n*"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."* – Philippians 4:6 ✨';
    }
    if (lang === 'es') {
      return '🙏 **¡Nos encantaría orar por ti!**\n\nJesús escucha cada oración y se preocupa profundamente por tu vida. Tu petición ha sido enviada directamente a nuestro equipo en la aplicación Wix para que Thomas y nuestros intercesores oren por ti.\n\n*"Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias."* – Filipenses 4:6 ✨';
    }
    return '🙏 **Vi vil mer enn gjerne be for deg!**\n\nJesus hører enhver bønn og bryr seg om deg og din situasjon. Bønnebegjæret ditt er også sendt rett inn til teamet vårt i Wix-appen slik at Thomas og bønnelederne våre kan løfte deg opp i bønn.\n\n*"Vær ikke bekymret for noe, men legg i alle ting deres bønner fram for Gud i påkallelse og bønn med takk."* – Filipperne 4:6 ✨';
  }

  if (lower.includes('bibel') || lower.includes('studie') || lower.includes('undervisning') || lower.includes('reading plan') || lower.includes('leseplan')) {
    if (lang === 'en') {
      return '📖 **Bible Studies & Reading Plans**\n\nYou can explore our rich collection of Bible studies, audio teachings, and daily reading plans under our [Bible & Teaching](/en/bibelstudier.html) section! Feel free to ask if you are looking for teaching on a specific topic.';
    }
    if (lang === 'es') {
      return '📖 **Estudios Bíblicos y Planes de Lectura**\n\nPuedes explorar nuestra colección de estudios bíblicos y enseñanzas en la sección [Estudios Bíblicos](/es/bibelstudier.html). ¡Pregúntanos si buscas enseñanza sobre un tema específico!';
    }
    return '📖 **Bibelstudier og Leseplaner**\n\nDu finner et stort utvalg av bibelstudier, undervisning og daglige leseplaner under [Bibelstudier](/bibelstudier.html) her på nettsiden vår! Lurer du på undervisning om et spesifikt tema eller bibelvers, hjelper vi deg gjerne.';
  }

  if (lower.includes('arrangement') || lower.includes('møte') || lower.includes('event') || lower.includes('kurs') || lower.includes('konferanse')) {
    if (lang === 'en') {
      return '🗓️ **Upcoming Events & Meetings**\n\nCheck out our full event calendar under [Events](/en/arrangementer.html). There you will find info about conferences, webinars, physical meetings, and courses!';
    }
    if (lang === 'es') {
      return '🗓️ **Próximos Eventos y Cursos**\n\nPuedes ver nuestro calendario de actividades en [Eventos](/es/arrangementer.html). ¡Allí encontrarás conferencias, seminarios y reuniones!';
    }
    return '🗓️ **Kommende Arrangementer & Samlinger**\n\nDu finner hele oversikten over våre møter, stevner, nettkurs og samlinger under [Arrangementer](/arrangementer.html). Vi gleder oss til å se deg der!';
  }

  if (lower.includes('podcast') || lower.includes('podkast') || lower.includes('lytte') || lower.includes('spotify') || lower.includes('tale') || lower.includes('taler')) {
    if (lang === 'en') {
      return '🎙️ **His Kingdom Ministry Podcast**\n\nYou can listen to our inspiring podcast episodes directly on Spotify, Apple Podcasts, YouTube, or on our website under [Podcast](/en/podcast.html)!';
    }
    if (lang === 'es') {
      return '🎙️ **Pódcast de His Kingdom Ministry**\n\nPuedes escuchar nuestros episodios en Spotify, Apple Podcasts, YouTube o directamente en [Pódcast](/es/podcast.html).';
    }
    return '🎙️ **His Kingdom Ministry Podkast**\n\nDu kan lytte til inspirerende taler og samtaler på Spotify, Apple Podcasts, YouTube, eller direkte på nettsiden vår under [Podcast](/podcast.html)!';
  }

  if (lower.includes('giver') || lower.includes('støtte') || lower.includes('donasjon') || lower.includes('gave') || lower.includes('give') || lower.includes('donate') || lower.includes('vipps')) {
    if (lang === 'en') {
      return '💛 **Support the Ministry**\n\nThank you so much for your heart to bless this work! You can become a regular partner or give a gift at [Support Us](/en/bli-fast-giver.html). May God richly bless your generosity!';
    }
    if (lang === 'es') {
      return '💛 **Apoya al Ministerio**\n\n¡Muchas gracias por tu generosidad! Puedes convertirte en donante mensual o dar una ofrenda en [Donar](/es/bli-fast-giver.html). ¡Que Dios multiplique tu siembra!';
    }
    return '💛 **Støtt arbeidet / Bli fast giver**\n\nTusen takk for ditt hjerte for å velsigne Guds rike! Du kan enkelt gi en enkeltgave eller bli fast giver via Vipps og kort på siden vår [Bli fast giver](/bli-fast-giver.html). Måtte Herren velsigne deg rikelig tilbake!';
  }

  if (lower.includes('kontakt') || lower.includes('hvem er') || lower.includes('thomas') || lower.includes('e-post') || lower.includes('telefon') || lower.includes('adresse') || lower.includes('contact')) {
    if (lang === 'en') {
      return '✉️ **Contact Us**\n\nHis Kingdom Ministry is led by Thomas and Hilde Karin Knutsen. You can reach us here in the chat, or by email at **post@hiskingdomministry.no**. Your message has been sent to our phone in the Wix app, and we will reply as soon as possible!';
    }
    if (lang === 'es') {
      return '✉️ **Contacto**\n\nHis Kingdom Ministry es dirigido por Thomas y Hilde Karin Knutsen. Puedes escribirnos aquí en el chat o por correo a **post@hiskingdomministry.no**. ¡Tu mensaje ya fue enviado a nuestro teléfono y responderemos pronto!';
    }
    return '✉️ **Kontakt His Kingdom Ministry**\n\nHis Kingdom Ministry ledes av Thomas og Hilde Karin Knutsen. Du kan nå oss direkte her i chatten, eller på e-post til **post@hiskingdomministry.no**.\n\nMeldingen din er allerede overført til telefonen vår via Wix-appen, og vi svarer deg så fort vi har anledning!';
  }

  // General helpful faith-filled response
  if (lang === 'en') {
    return '✨ **Thank you for reaching out!**\n\nWe have received your message and sent a push notification directly to our team in the Wix app. We will get back to you shortly.\n\n*"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you."* – Numbers 6:24-25 🙏';
  }
  if (lang === 'es') {
    return '✨ **¡Gracias por contactarnos!**\n\nHemos recibido tu mensaje y enviado una notificación a nuestro equipo en la aplicación Wix. Te responderemos a la brevedad.\n\n*"Jehová te bendiga, y te guarde; Jehová haga resplandecer su rostro sobre ti, y tenga de ti misericordia."* – Números 6:24-25 🙏';
  }
  return '✨ **Takk for henvendelsen!**\n\nMeldingen din er mottatt og sendt som et direkte push-varsel til teamet vårt i Wix-appen. Vi svarer deg her så snart vi kan.\n\n*"Herren velsigne deg og bevare deg! Herren la sitt ansikt lyse over deg og være deg nådig!"* – 4. Mosebok 6:24-25 🙏';
}

function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="hkm-chat-link" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
}

export function initHkmChatWidget() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('hkm-chat-widget-root')) return;

  const lang = getSiteLanguage();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.no;

  // Sørg for at Material Symbols bruker &display=block for å forhindre råtekst-flash
  if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Material+Symbols+Outlined"]')) {
    const iconFont = document.createElement('link');
    iconFont.rel = 'stylesheet';
    iconFont.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block';
    document.head.appendChild(iconFont);
  }

  // Inject Styles matching His Kingdom Designs warm orange palette (#d17d39 - #bd4f2a)
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .hkm-chat-launcher {
      position: fixed;
      bottom: max(24px, env(safe-area-inset-bottom, 24px));
      right: max(20px, env(safe-area-inset-right, 20px));
      z-index: 9999;
      width: 56px;
      height: 56px;
      min-width: 44px;
      min-height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important;
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 24px rgba(209, 125, 57, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease;
    }
    .hkm-chat-launcher:hover {
      transform: scale(1.06);
      box-shadow: 0 12px 28px rgba(209, 125, 57, 0.45);
    }
    .hkm-chat-launcher:active {
      transform: scale(0.95);
    }
    .hkm-chat-launcher svg, .hkm-chat-launcher .material-symbols-outlined {
      font-size: 26px;
      line-height: 1;
      color: #ffffff;
    }

    .hkm-chat-box {
      position: fixed;
      bottom: max(90px, calc(env(safe-area-inset-bottom, 24px) + 68px));
      right: max(20px, env(safe-area-inset-right, 20px));
      width: 360px;
      max-width: calc(100vw - 32px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      color: #1e293b;
      border-radius: 16px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 8px 16px rgba(0, 0, 0, 0.08);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(16px) scale(0.96);
      transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @media (max-width: 640px) {
      .hkm-chat-box {
        bottom: 0 !important;
        right: 0 !important;
        width: 100vw !important;
        max-width: 100vw !important;
        height: 100dvh !important;
        max-height: 100dvh !important;
        border-radius: 0 !important;
        border: none !important;
      }
    }

    .dark .hkm-chat-box {
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 8px 16px rgba(0, 0, 0, 0.3);
    }

    .hkm-chat-box.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .hkm-chat-header {
      padding: 14px 18px;
      background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    .hkm-chat-header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hkm-chat-header-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #ffffff;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .hkm-chat-header-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .hkm-chat-header-title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
      color: #ffffff;
    }
    .hkm-chat-header-subtitle {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.9);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .hkm-chat-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #34d399;
      display: inline-block;
      animation: hkmPulseDot 2s infinite ease-in-out;
    }
    @keyframes hkmPulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    .hkm-chat-close-btn {
      background: transparent;
      border: none;
      color: #ffffff;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 150ms ease;
    }
    .hkm-chat-close-btn:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    .hkm-chat-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
    }
    .dark .hkm-chat-body {
      background: #090d16;
    }

    .hkm-offline-banner {
      background: rgba(255, 247, 237, 0.95);
      border: 1px solid rgba(254, 215, 170, 0.7);
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 11px;
      color: #bd4f2a;
      line-height: 1.45;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .hkm-offline-banner .material-symbols-outlined {
      font-size: 16px;
      color: #d17d39;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .hkm-msg-row {
      display: flex;
      gap: 8px;
      max-width: 85%;
    }
    .hkm-msg-row-user {
      margin-left: auto;
      justify-content: flex-end;
    }
    .hkm-msg-row-bot {
      margin-right: auto;
      justify-content: flex-start;
    }

    .hkm-msg-avatar {
      font-size: 18px;
      color: #d17d39;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .hkm-msg-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13.5px;
      line-height: 1.45;
      word-break: break-word;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .hkm-msg-bubble-bot {
      background: #ffffff;
      color: #1e293b;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-top-left-radius: 2px;
    }
    .dark .hkm-msg-bubble-bot {
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .hkm-msg-bubble-owner {
      background: rgba(254, 243, 199, 0.85);
      color: #1e293b;
      border: 1px solid rgba(251, 191, 36, 0.6);
      border-top-left-radius: 2px;
    }
    .hkm-msg-bubble-user {
      background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important;
      color: #ffffff !important;
      border-top-right-radius: 2px;
      box-shadow: 0 2px 8px rgba(209, 125, 57, 0.25);
    }

    .hkm-msg-time {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 3px;
      padding: 0 4px;
      font-family: monospace;
    }
    .hkm-msg-row-user .hkm-msg-time {
      text-align: right;
    }

    .hkm-chat-link {
      color: #bd4f2a;
      text-decoration: underline;
      font-weight: 600;
    }
    .dark .hkm-chat-link {
      color: #fb923c;
    }

    .hkm-chips-bar {
      padding: 8px 12px 4px 12px;
      background: #f8fafc;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      flex-shrink: 0;
      scrollbar-width: none;
    }
    .hkm-chips-bar::-webkit-scrollbar {
      display: none;
    }
    .dark .hkm-chips-bar {
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .hkm-chip-btn {
      flex-shrink: 0;
      background: #ffffff;
      border: 1px solid rgba(209, 125, 57, 0.35);
      color: #bd4f2a;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 9999px;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      transition: all 150ms ease;
      white-space: nowrap;
    }
    .dark .hkm-chip-btn {
      background: #1e293b;
      color: #fb923c;
      border-color: rgba(251, 146, 60, 0.35);
    }
    .hkm-chip-btn:hover {
      background: #fff7ed;
      border-color: #bd4f2a;
      transform: scale(1.03);
    }
    .hkm-chip-btn:active {
      transform: scale(0.96);
    }

    .hkm-typing-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #ffffff;
      border-radius: 16px;
      border-top-left-radius: 2px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      font-size: 12px;
      color: #64748b;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
    .dark .hkm-typing-indicator {
      background: #1e293b;
      color: #94a3b8;
    }
    .hkm-typing-dot {
      width: 5px;
      height: 5px;
      background: #d17d39;
      border-radius: 50%;
      animation: hkmBlink 1.4s infinite ease-in-out both;
    }
    .hkm-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .hkm-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes hkmBlink {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    .hkm-chat-footer {
      padding: 10px 12px;
      background: #ffffff;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
      position: relative;
    }
    .dark .hkm-chat-footer {
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .hkm-chat-input-wrap {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }
    .hkm-chat-input {
      width: 100%;
      background: #f8fafc;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 11px 44px 11px 14px;
      font-size: 13.5px;
      font-family: inherit;
      color: #1e293b;
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .dark .hkm-chat-input {
      background: #1e293b;
      border-color: rgba(255, 255, 255, 0.12);
      color: #f1f5f9;
    }
    .hkm-chat-input:focus {
      border-color: #d17d39;
      box-shadow: 0 0 0 1px #d17d39;
    }

    .hkm-chat-send-btn {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #d17d39;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: color 150ms ease, transform 150ms ease;
    }
    .hkm-chat-send-btn:hover {
      color: #bd4f2a;
      transform: translateY(-50%) scale(1.08);
    }
    .hkm-chat-send-btn:disabled {
      color: #94a3b8;
      cursor: not-allowed;
      transform: translateY(-50%);
      opacity: 0.5;
    }
    .hkm-chat-send-btn .material-symbols-outlined {
      font-size: 18px;
    }
  `;
  document.head.appendChild(styleEl);

  // Create DOM
  const root = document.createElement('div');
  root.id = 'hkm-chat-widget-root';
  root.innerHTML = `
    <button class="hkm-chat-launcher" id="hkm-chat-launcher" aria-label="${t.openChat}">
      <span class="material-symbols-outlined">chat</span>
    </button>

    <div class="hkm-chat-box" id="hkm-chat-box" role="dialog" aria-modal="false" aria-label="${t.title}">
      <div class="hkm-chat-header">
        <div class="hkm-chat-header-brand">
          <div class="hkm-chat-header-logo">
            <img src="/img/logo-hkm.png" alt="His Kingdom Ministry Logo" onerror="this.src='/logo-hkm.png'">
          </div>
          <div>
            <div class="hkm-chat-header-title">${t.title}</div>
            <div class="hkm-chat-header-subtitle">
              <span class="hkm-chat-status-dot"></span>
              <span>${t.statusOnline}</span>
            </div>
          </div>
        </div>
        <button class="hkm-chat-close-btn" id="hkm-chat-close-btn" aria-label="${t.closeChat}">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="hkm-chat-body" id="hkm-chat-messages">
        ${isOutsideOpeningHours() ? `
          <div class="hkm-offline-banner">
            <span class="material-symbols-outlined">schedule</span>
            <div>
              <strong>${t.offlineTitle}</strong><br>
              ${t.offlineDesc}
            </div>
          </div>
        ` : ''}

        <div class="hkm-msg-row hkm-msg-row-bot">
          <span class="material-symbols-outlined hkm-msg-avatar">support_agent</span>
          <div>
            <div class="hkm-msg-bubble hkm-msg-bubble-bot">
              ${formatMarkdown(t.greeting)}
            </div>
            <div class="hkm-msg-time">${new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>

      <div class="hkm-chips-bar" id="hkm-chips-bar">
        ${t.quick.map(q => `<button type="button" class="hkm-chip-btn" data-text="${q.text}" data-action="${q.actionRequired ? 'true' : 'false'}">${q.label}</button>`).join('')}
      </div>

      <div class="hkm-chat-footer">
        <form id="hkm-chat-form" class="hkm-chat-input-wrap">
          <input type="text" class="hkm-chat-input" id="hkm-chat-input" placeholder="${t.placeholder}" autocomplete="off">
          <button type="submit" class="hkm-chat-send-btn" id="hkm-chat-send-btn" aria-label="${t.send}">
            <span class="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // Elements
  const launcher = document.getElementById('hkm-chat-launcher');
  const box = document.getElementById('hkm-chat-box');
  const closeBtn = document.getElementById('hkm-chat-close-btn');
  const messagesContainer = document.getElementById('hkm-chat-messages');
  const chatForm = document.getElementById('hkm-chat-form');
  const inputEl = document.getElementById('hkm-chat-input');
  const sendBtn = document.getElementById('hkm-chat-send-btn');
  const chipsBar = document.getElementById('hkm-chips-bar');

  // State
  let isOpen = false;
  let isSending = false;
  let pollInterval = null;
  const renderedMessageIds = new Set();

  let conversationId = sessionStorage.getItem('hkm_wix_conv_id') || null;
  let anonVisitorId = localStorage.getItem('hkm_chat_anon_id') || generateUUID();
  localStorage.setItem('hkm_chat_anon_id', anonVisitorId);

  function toggleChat(open) {
    isOpen = typeof open === 'boolean' ? open : !isOpen;
    if (isOpen) {
      box.classList.add('open');
      launcher.innerHTML = '<span class="material-symbols-outlined">close</span>';
      setTimeout(() => inputEl.focus(), 150);
      startPolling();
    } else {
      box.classList.remove('open');
      launcher.innerHTML = '<span class="material-symbols-outlined">chat</span>';
      stopPolling();
    }
  }

  launcher.addEventListener('click', () => toggleChat());
  closeBtn.addEventListener('click', () => toggleChat(false));

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSendMessage();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  function appendMessage(text, isUser, senderLabel) {
    const msgEl = document.createElement('div');
    msgEl.className = `hkm-msg-row ${isUser ? 'user' : 'bot'}`;
    
    const timeStr = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    const isOwner = !!senderLabel;

    msgEl.innerHTML = `
      ${!isUser ? `
        <div class="hkm-avatar ${isOwner ? 'hkm-avatar-owner' : ''}">
          <span class="material-symbols-outlined">${isOwner ? 'person' : 'support_agent'}</span>
        </div>
      ` : ''}
      <div class="hkm-msg-content">
        ${isOwner ? `<div class="hkm-owner-tag">👤 ${senderLabel}</div>` : ''}
        <div class="hkm-msg-bubble ${isUser ? 'hkm-msg-bubble-user' : (isOwner ? 'hkm-msg-bubble-owner' : 'hkm-msg-bubble-bot')}">
          ${formatMarkdown(text)}
        </div>
        <div class="hkm-msg-time">${timeStr}</div>
      </div>
    `;

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTypingIndicator() {
    removeTypingIndicator();
    const ind = document.createElement('div');
    ind.id = 'hkm-active-typing';
    ind.className = 'hkm-msg-row bot';
    ind.innerHTML = `
      <div class="hkm-avatar">
        <span class="material-symbols-outlined">support_agent</span>
      </div>
      <div class="hkm-msg-content">
        <div class="hkm-typing-indicator">
          <span class="hkm-typing-text">${t.typing}</span>
          <div class="hkm-typing-dot"></div>
          <div class="hkm-typing-dot"></div>
          <div class="hkm-typing-dot"></div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(ind);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('hkm-active-typing');
    if (el) el.remove();
  }

  // Quick reply chips click: only push to phone if action is required (like prayer requests)
  chipsBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.hkm-chip-btn');
    if (chip && chip.dataset.text) {
      const isActionRequired = chip.dataset.action === 'true';
      handleSendMessage(chip.dataset.text, { skipWixPush: !isActionRequired });
    }
  });

  async function handleSendMessage(customText, options = {}) {
    const text = (typeof customText === 'string' ? customText : inputEl.value).trim();
    if (!text || isSending) return;

    const skipWixPush = options.skipWixPush === true;

    // 1. Render user message immediately
    appendMessage(text, true);
    inputEl.value = '';
    isSending = true;
    sendBtn.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    try {
      // 2 & 3. Forward to Wix Inbox ONLY IF action is required (like Prayer request) or user-typed text
      if (!skipWixPush) {
        if (!conversationId) {
          const convRes = await fetch('/api/get-or-create-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              anonymousVisitorId: anonVisitorId
            })
          });

          if (convRes.ok) {
            const convData = await convRes.json();
            conversationId = convData.conversation?._id || convData.conversation?.id;
            if (conversationId) {
              sessionStorage.setItem('hkm_wix_conv_id', conversationId);
            }
          }
        }

        // Send message to Wix Inbox API in background (triggers phone push notification)
        if (conversationId) {
          fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              senderName: 'Besøkende',
              message: {
                direction: 'PARTICIPANT_TO_BUSINESS',
                visibility: 'BUSINESS_AND_PARTICIPANT',
                content: {
                  basic: {
                    items: [{ text }]
                  }
                }
              }
            })
          }).catch(err => console.warn('[HKM Chat] Wix dispatch warning:', err));
        }
      }

      // 4. Generate AI response with natural delay
      setTimeout(() => {
        removeTypingIndicator();
        const aiReply = generateHkmAiResponse(text, lang);
        appendMessage(aiReply, false);
      }, 700);

    } catch (err) {
      console.error('[HKM Chat] Send error:', err);
      removeTypingIndicator();
      appendMessage(t.error, false);
    } finally {
      isSending = false;
      sendBtn.disabled = false;
    }
  }

  // Poll for replies from owner in Wix Inbox
  async function pollOwnerReplies() {
    if (!conversationId || !isOpen) return;
    try {
      const res = await fetch('/api/list-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });
      if (!res.ok) return;
      const data = await res.json();
      const messages = data.messages || [];

      messages.forEach(msg => {
        if (msg.direction === 'BUSINESS_TO_PARTICIPANT' && !renderedMessageIds.has(msg._id)) {
          renderedMessageIds.add(msg._id);
          const replyText = msg.content?.basic?.items?.map(i => i.text).join('\n') || msg.content?.minimal?.text;
          if (replyText) {
            appendMessage(replyText, false, 'Thomas (His Kingdom Ministry)');
          }
        }
      });
    } catch (e) {
      // Non-blocking
    }
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(pollOwnerReplies, 5000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSendMessage();
  });
}
