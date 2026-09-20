// =========================================================================
// HKM Chat Widget - His Kingdom Ministry
// Integrert direkte mot Wix Inbox & Push-varsler til Wix Owner App
// =========================================================================

const TRANSLATIONS = {
  no: {
    title: 'HKM Assistent',
    subtitle: 'His Kingdom Ministry',
    greeting: 'Hei! Velsignet dag. Hvordan kan vi be for deg eller hjelpe deg i dag?',
    placeholder: 'Skriv din henvendelse her...',
    send: 'Send',
    sending: 'Sender...',
    sent: 'Meldingen er sendt til teamet!',
    nameLabel: 'Ditt navn (valgfritt)',
    emailLabel: 'Din e-post (for tilbakesvar)',
    error: 'Kunne ikke sende. Vennligst prøv igjen.',
    openChat: 'Åpne chat',
    closeChat: 'Lukk chat',
    statusOnline: 'Aktiv nå'
  },
  en: {
    title: 'HKM Assistant',
    subtitle: 'His Kingdom Ministry',
    greeting: 'Hello! Blessed day. How can we pray for you or assist you today?',
    placeholder: 'Type your message here...',
    send: 'Send',
    sending: 'Sending...',
    sent: 'Your message was sent to our team!',
    nameLabel: 'Your name (optional)',
    emailLabel: 'Your email (for reply)',
    error: 'Could not send. Please try again.',
    openChat: 'Open chat',
    closeChat: 'Close chat',
    statusOnline: 'Active now'
  },
  es: {
    title: 'Asistente HKM',
    subtitle: 'His Kingdom Ministry',
    greeting: '¡Hola! Bendecido día. ¿Cómo podemos orar por ti o ayudarte hoy?',
    placeholder: 'Escribe tu mensaje aquí...',
    send: 'Enviar',
    sending: 'Enviando...',
    sent: '¡Mensaje enviado a nuestro equipo!',
    nameLabel: 'Tu nombre (opcional)',
    emailLabel: 'Tu correo (para responderte)',
    error: 'No se pudo enviar. Por favor intenta de nuevo.',
    openChat: 'Abrir chat',
    closeChat: 'Cerrar chat',
    statusOnline: 'En línea'
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

  // Inject Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .hkm-chat-launcher {
      position: fixed;
      bottom: max(24px, env(safe-area-inset-bottom, 24px));
      right: max(24px, env(safe-area-inset-right, 24px));
      z-index: 9999;
      width: 56px;
      height: 56px;
      min-width: 44px;
      min-height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease;
    }
    .hkm-chat-launcher:hover {
      transform: scale(1.06);
      box-shadow: 0 12px 28px rgba(37, 99, 235, 0.45);
    }
    .hkm-chat-launcher:active {
      transform: scale(0.95);
    }
    .hkm-chat-launcher .material-symbols-outlined {
      font-size: 28px;
      line-height: 1;
    }

    .hkm-chat-box {
      position: fixed;
      bottom: max(90px, calc(env(safe-area-inset-bottom, 24px) + 68px));
      right: max(24px, env(safe-area-inset-right, 24px));
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 540px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      color: #0f172a;
      border-radius: 20px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 8px 16px rgba(0, 0, 0, 0.08);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(16px) scale(0.96);
      transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
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
      padding: 16px 20px;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .hkm-chat-header-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .hkm-chat-header-title {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.2;
    }
    .hkm-chat-header-subtitle {
      font-size: 12px;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hkm-chat-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      display: inline-block;
    }
    .hkm-chat-close-btn {
      background: transparent;
      border: none;
      color: #ffffff;
      cursor: pointer;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 150ms ease;
    }
    .hkm-chat-close-btn:hover {
      background: rgba(255, 255, 255, 0.15);
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

    .hkm-msg {
      max-width: 82%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.45;
      word-break: break-word;
    }
    .hkm-msg-bot {
      align-self: flex-start;
      background: #ffffff;
      color: #1e293b;
      border: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      border-bottom-left-radius: 4px;
    }
    .dark .hkm-msg-bot {
      background: #1e293b;
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .hkm-msg-user {
      align-self: flex-end;
      background: #2563eb;
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }

    .hkm-chat-footer {
      padding: 12px 16px;
      background: #ffffff;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .dark .hkm-chat-footer {
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .hkm-chat-inputs-row {
      display: flex;
      gap: 8px;
    }
    .hkm-chat-input-sm {
      flex: 1;
      padding: 8px 12px;
      font-size: 12px;
      border-radius: 10px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: #f8fafc;
      color: inherit;
      outline: none;
      transition: border-color 150ms ease;
    }
    .dark .hkm-chat-input-sm {
      background: #1e293b;
      border-color: rgba(255, 255, 255, 0.12);
    }
    .hkm-chat-input-sm:focus {
      border-color: #2563eb;
    }

    .hkm-chat-send-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .hkm-chat-textarea {
      flex: 1;
      resize: none;
      height: 44px;
      padding: 10px 12px;
      font-size: 14px;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: #f8fafc;
      color: inherit;
      outline: none;
      font-family: inherit;
      line-height: 1.3;
      transition: border-color 150ms ease;
    }
    .dark .hkm-chat-textarea {
      background: #1e293b;
      border-color: rgba(255, 255, 255, 0.12);
    }
    .hkm-chat-textarea:focus {
      border-color: #2563eb;
    }

    .hkm-chat-send-btn {
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      border-radius: 12px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 150ms ease, background-color 150ms ease;
    }
    .hkm-chat-send-btn:hover {
      background: #1d4ed8;
      transform: scale(1.03);
    }
    .hkm-chat-send-btn:active {
      transform: scale(0.97);
    }
    .hkm-chat-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .hkm-chat-send-btn .material-symbols-outlined {
      font-size: 20px;
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
        <div class="hkm-chat-header-info">
          <div class="hkm-chat-header-title">${t.title}</div>
          <div class="hkm-chat-header-subtitle">
            <span class="hkm-chat-status-dot"></span>
            <span>${t.statusOnline}</span>
          </div>
        </div>
        <button class="hkm-chat-close-btn" id="hkm-chat-close-btn" aria-label="${t.closeChat}">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="hkm-chat-body" id="hkm-chat-messages">
        <div class="hkm-msg hkm-msg-bot">${t.greeting}</div>
      </div>

      <div class="hkm-chat-footer">
        <div class="hkm-chat-inputs-row" id="hkm-contact-row">
          <input type="text" class="hkm-chat-input-sm" id="hkm-chat-name" placeholder="${t.nameLabel}">
          <input type="email" class="hkm-chat-input-sm" id="hkm-chat-email" placeholder="${t.emailLabel}">
        </div>
        <div class="hkm-chat-send-row">
          <textarea class="hkm-chat-textarea" id="hkm-chat-input" placeholder="${t.placeholder}" rows="1"></textarea>
          <button class="hkm-chat-send-btn" id="hkm-chat-send-btn" aria-label="${t.send}">
            <span class="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // Elements
  const launcher = document.getElementById('hkm-chat-launcher');
  const box = document.getElementById('hkm-chat-box');
  const closeBtn = document.getElementById('hkm-chat-close-btn');
  const messagesContainer = document.getElementById('hkm-chat-messages');
  const textarea = document.getElementById('hkm-chat-input');
  const sendBtn = document.getElementById('hkm-chat-send-btn');
  const nameInput = document.getElementById('hkm-chat-name');
  const emailInput = document.getElementById('hkm-chat-email');
  const contactRow = document.getElementById('hkm-contact-row');

  // State
  let isOpen = false;
  let isSending = false;
  let conversationId = sessionStorage.getItem('hkm_wix_conv_id') || null;
  let anonVisitorId = localStorage.getItem('hkm_chat_anon_id') || generateUUID();
  localStorage.setItem('hkm_chat_anon_id', anonVisitorId);

  // Prefill contact if saved
  const savedName = localStorage.getItem('hkm_chat_user_name');
  const savedEmail = localStorage.getItem('hkm_chat_user_email');
  if (savedName && nameInput) nameInput.value = savedName;
  if (savedEmail && emailInput) emailInput.value = savedEmail;

  function toggleChat(open) {
    isOpen = typeof open === 'boolean' ? open : !isOpen;
    if (isOpen) {
      box.classList.add('open');
      launcher.style.display = 'none';
      setTimeout(() => textarea.focus(), 150);
    } else {
      box.classList.remove('open');
      launcher.style.display = 'flex';
    }
  }

  launcher.addEventListener('click', () => toggleChat(true));
  closeBtn.addEventListener('click', () => toggleChat(false));

  function appendMessage(text, isUser = false) {
    const msgEl = document.createElement('div');
    msgEl.className = `hkm-msg ${isUser ? 'hkm-msg-user' : 'hkm-msg-bot'}`;
    msgEl.textContent = text;
    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function handleSendMessage() {
    const text = textarea.value.trim();
    if (!text || isSending) return;

    const name = (nameInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();

    if (name) localStorage.setItem('hkm_chat_user_name', name);
    if (email) localStorage.setItem('hkm_chat_user_email', email);

    // Render user message immediately
    appendMessage(text, true);
    textarea.value = '';
    isSending = true;
    sendBtn.disabled = true;

    try {
      // 1. Get or create Wix conversation if needed
      if (!conversationId) {
        const convRes = await fetch('/api/get-or-create-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name || undefined,
            email: email || undefined,
            anonymousVisitorId: anonVisitorId
          })
        });

        if (!convRes.ok) {
          throw new Error('Failed to create conversation');
        }

        const convData = await convRes.json();
        conversationId = convData.conversation?._id || convData.conversation?.id;
        if (conversationId) {
          sessionStorage.setItem('hkm_wix_conv_id', conversationId);
        }
      }

      // 2. Send message to Wix Inbox API (triggers phone push notification)
      const sendRes = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          senderName: name || 'Besøkende',
          senderEmail: email || '',
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
      });

      if (!sendRes.ok) {
        throw new Error('Failed to send message');
      }

      // Hide contact inputs row once we've sent
      if (contactRow && (name || email)) {
        contactRow.style.display = 'none';
      }

    } catch (err) {
      console.error('[HKM Chat] Send error:', err);
      appendMessage(t.error, false);
    } finally {
      isSending = false;
      sendBtn.disabled = false;
    }
  }

  sendBtn.addEventListener('click', handleSendMessage);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
}
