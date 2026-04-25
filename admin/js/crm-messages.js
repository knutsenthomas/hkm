/**
 * HKM CRM Meldinger Logic
 * Handles contact form messages, status updates, and tabbed navigation.
 */

class MessagesManager {
    constructor() {
        this.messages = [];
        this.visitorChats = [];
        this.activeVisitorChatId = null;
        this.activeVisitorChatUnsub = null;
        this.isSendingVisitorReply = false;
        this.init();
    }

    async init() {
        console.log("Messages Manager Initializing...");

        // Setup UI Listeners
        this.setupEventListeners();

        // Wait for Firebase to be ready
        const waitForFirebase = setInterval(() => {
            if (window.firebaseService && window.firebaseService.isInitialized) {
                clearInterval(waitForFirebase);
                this.startAuthListener();
            }
        }, 100);
    }

    startAuthListener() {
        window.firebaseService.onAuthChange((user) => {
            if (user) {
                this.loadMessages();
                this.loadVisitorChats();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('message-search');
        if (searchInput) {
            searchInput.oninput = (e) => this.handleSearch(e.target.value);
        }

        // List clicks (Mark as read)
        const listEl = document.getElementById('messages-list-body');
        if (listEl) {
            listEl.addEventListener('click', async (e) => {
                const badge = e.target.closest('.message-badge-new');
                const btn = e.target.closest('.message-mark-read');
                const deleteBtn = e.target.closest('.btn-delete-message');

                if (btn || badge) {
                    const id = (btn || badge).closest('tr').dataset.id;
                    await this.markAsRead(id);
                }

                if (deleteBtn) {
                    const id = deleteBtn.closest('tr').dataset.id;
                    await this.deleteMessage(id);
                }
            });
        }

        const visitorChatsBody = document.getElementById('visitor-chats-body');
        if (visitorChatsBody) {
            visitorChatsBody.addEventListener('click', async (e) => {
                const copyBtn = e.target.closest('.copy-reply-command');
                if (copyBtn) {
                    const command = copyBtn.getAttribute('data-command') || '';
                    if (!command) return;

                    try {
                        await navigator.clipboard.writeText(command);
                        copyBtn.textContent = 'Kopiert';
                        window.setTimeout(() => {
                            copyBtn.textContent = 'Kopier kommando';
                        }, 1400);
                    } catch (error) {
                        console.error('Could not copy command:', error);
                        alert('Kunne ikke kopiere automatisk. Kommando: ' + command);
                    }
                    return;
                }

                const row = e.target.closest('tr[data-chat-id]');
                if (!row) return;
                const chatId = row.getAttribute('data-chat-id') || '';
                if (!chatId) return;
                this.openVisitorChat(chatId);
            });
        }

        const sendBtn = document.getElementById('visitor-chat-send');
        const replyEl = document.getElementById('visitor-chat-reply');
        if (sendBtn && replyEl) {
            sendBtn.addEventListener('click', () => this.sendVisitorChatReply());
            replyEl.addEventListener('keydown', (e) => {
                // Enter = send. Shift+Enter = newline.
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendVisitorChatReply();
                }
            });
        }

        const copyIdBtn = document.getElementById('visitor-chat-copy-id');
        if (copyIdBtn) {
            copyIdBtn.addEventListener('click', async () => {
                const chatId = this.activeVisitorChatId || '';
                if (!chatId) return;
                try {
                    await navigator.clipboard.writeText(chatId);
                    const prev = copyIdBtn.innerHTML;
                    copyIdBtn.textContent = 'Kopiert';
                    window.setTimeout(() => {
                        copyIdBtn.innerHTML = prev;
                    }, 900);
                } catch (err) {
                    console.error('Could not copy chat id:', err);
                }
            });
        }
    }

    async loadMessages() {
        const tableBody = document.getElementById('messages-list-body');
        if (!tableBody) return;

        try {
            const snapshot = await window.firebaseService.db
                .collection('contactMessages')
                .orderBy('createdAt', 'desc')
                .get();

            this.messages = [];
            snapshot.forEach(doc => {
                this.messages.push({ id: doc.id, ...doc.data() });
            });

            this.renderMessages();
            this.updateBadges();
        } catch (error) {
            console.error("Error loading messages:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Feil ved lasting av meldinger.</td></tr>`;
        }
    }

    async loadVisitorChats() {
        const tableBody = document.getElementById('visitor-chats-body');
        const countEl = document.getElementById('active-chat-count');
        if (!tableBody) return;

        try {
            const chatsSnapshot = await window.firebaseService.db
                .collection('visitorChats')
                .orderBy('updatedAt', 'desc')
                .limit(40)
                .get();

            const chatItems = await Promise.all(chatsSnapshot.docs.map(async (doc) => {
                const chatData = doc.data() || {};
                const lastMsgSnapshot = await window.firebaseService.db
                    .collection('visitorChats')
                    .doc(doc.id)
                    .collection('messages')
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();

                const lastMsgDoc = lastMsgSnapshot.docs[0];
                const lastMessage = lastMsgDoc ? (lastMsgDoc.data() || {}) : null;

                return {
                    id: doc.id,
                    ...chatData,
                    lastMessage
                };
            }));

            this.visitorChats = chatItems;
            this.renderVisitorChats();
            if (countEl) countEl.textContent = String(this.visitorChats.length);
        } catch (error) {
            console.error('Error loading visitor chats:', error);
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Feil ved lasting av nettsidechatter.</td></tr>';
            if (countEl) countEl.textContent = '0';
        }
    }

    handleSearch(query) {
        const q = query.toLowerCase();
        const filtered = this.messages.filter(m =>
            (m.name || '').toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q) ||
            (m.subject || '').toLowerCase().includes(q) ||
            (m.message || '').toLowerCase().includes(q)
        );
        this.renderMessages(filtered);
    }

    renderMessages(data = this.messages) {
        const tableBody = document.getElementById('messages-list-body');
        if (!tableBody) return;

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">Ingen meldinger funnet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = data.map(msg => {
            const date = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)).toLocaleString('no-NO') : 'Ukjent tid';
            const isRead = msg.status === 'lest';

            return `
                <tr data-id="${msg.id}" class="${isRead ? 'read' : 'unread'}">
                    <td>
                        <div style="font-weight: 600;">${msg.name || 'Ukjent'}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${msg.email || ''}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${msg.subject || '(Ingen emne)'}</div>
                        <div style="font-size: 13px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">
                            ${msg.message || ''}
                        </div>
                    </td>
                    <td>
                        <span class="badge ${isRead ? 'status-read' : 'status-new'}">
                            ${isRead ? 'Lest' : 'Ny'}
                        </span>
                    </td>
                    <td>${date}</td>
                    <td class="col-actions">
                        ${!isRead ? `<button class="btn-icon message-mark-read" title="Marker som lest"><span class="material-symbols-outlined">done_all</span></button>` : ''}
                        <button class="btn-icon btn-delete-message" title="Slett"><span class="material-symbols-outlined">delete</span></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderVisitorChats(data = this.visitorChats) {
        const tableBody = document.getElementById('visitor-chats-body');
        if (!tableBody) return;

        if (!data.length) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">Ingen aktive nettsidechatter enda.</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map((chat) => {
            const updatedDate = chat.updatedAt
                ? (chat.updatedAt.toDate ? chat.updatedAt.toDate() : new Date(chat.updatedAt))
                : null;
            const updatedLabel = updatedDate ? updatedDate.toLocaleString('no-NO') : 'Ukjent';
            const visitorName = chat.visitorName || 'Anonym besøkende';
            const visitorEmail = chat.visitorEmail || '';

            const lastMessageText = chat.lastMessage && typeof chat.lastMessage.text === 'string'
                ? chat.lastMessage.text
                : '(Ingen meldinger enda)';

            let fromLabel = 'Sist fra besøkende';
            if (chat.lastMessage && chat.lastMessage.sender === 'agent') {
                fromLabel = chat.lastMessage.source === 'ai_gemini' ? 'Sist fra AI' : 'Sist fra team';
            }

            const command = `reply ${chat.id} `;
            const safeMessage = this.escapeHtml(lastMessageText.length > 140 ? `${lastMessageText.slice(0, 139)}…` : lastMessageText);

            return `
                <tr class="visitor-chat-row ${this.activeVisitorChatId === chat.id ? 'is-selected' : ''}" data-chat-id="${this.escapeHtml(chat.id)}">
                    <td>
                        <div style="font-weight: 600;">${this.escapeHtml(visitorName)}</div>
                        <div class="chat-meta">
                            <span>${this.escapeHtml(visitorEmail || 'Ingen e-post')}</span>
                            <span>${this.escapeHtml(chat.lastPagePath || chat.sourcePage || '-')}</span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 500; margin-bottom: 4px;">${fromLabel}</div>
                        <div style="font-size: 13px; color: var(--text-muted);">${safeMessage}</div>
                    </td>
                    <td><span class="chat-id">${this.escapeHtml(chat.id)}</span></td>
                    <td>${updatedLabel}</td>
                    <td class="col-actions">
                        <button class="btn btn-outline btn-sm copy-reply-command" data-command="${this.escapeHtml(command)}">Kopier kommando</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    setVisitorChatStatus(text, kind = 'muted') {
        const el = document.getElementById('visitor-chat-status');
        if (!el) return;
        el.textContent = text || '';
        el.dataset.kind = kind;
        el.style.color = kind === 'danger'
            ? '#b91c1c'
            : kind === 'success'
                ? '#166534'
                : 'var(--text-muted)';
    }

    openVisitorChat(chatId) {
        if (!chatId) return;
        if (this.activeVisitorChatId === chatId) return;

        // Highlight selected row immediately
        this.activeVisitorChatId = chatId;
        this.renderVisitorChats();

        const chatMeta = this.visitorChats.find(c => c.id === chatId) || {};
        const titleEl = document.getElementById('visitor-chat-title');
        const subtitleEl = document.getElementById('visitor-chat-subtitle');
        const copyIdBtn = document.getElementById('visitor-chat-copy-id');
        const replyEl = document.getElementById('visitor-chat-reply');
        const sendBtn = document.getElementById('visitor-chat-send');
        const emptyEl = document.getElementById('visitor-chat-empty');
        const bodyEl = document.getElementById('visitor-chat-body');

        if (titleEl) titleEl.textContent = chatMeta.visitorName || 'Anonym besøkende';
        if (subtitleEl) {
            const page = chatMeta.lastPagePath || chatMeta.sourcePage || '';
            const email = chatMeta.visitorEmail || '';
            subtitleEl.textContent = [
                email ? email : null,
                page ? `Side: ${page}` : null,
                `Chat-ID: ${chatId}`
            ].filter(Boolean).join(' · ');
        }
        if (copyIdBtn) copyIdBtn.disabled = false;
        if (replyEl) replyEl.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        this.setVisitorChatStatus('Laster meldinger...', 'muted');

        // Clear previous UI
        if (bodyEl) {
            bodyEl.innerHTML = '';
            if (emptyEl) bodyEl.appendChild(emptyEl);
            if (emptyEl) emptyEl.classList.remove('hkm-chat-hidden');
        }

        // Unsubscribe previous listener
        if (typeof this.activeVisitorChatUnsub === 'function') {
            try { this.activeVisitorChatUnsub(); } catch (e) {}
        }

        // Subscribe to messages in this chat
        this.activeVisitorChatUnsub = window.firebaseService.db
            .collection('visitorChats')
            .doc(chatId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limit(250)
            .onSnapshot((snap) => {
                const msgs = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
                this.renderVisitorChatThread(msgs);
                this.setVisitorChatStatus('', 'muted');
            }, (err) => {
                console.error('Error subscribing to visitor chat messages:', err);
                this.setVisitorChatStatus('Kunne ikke laste chatten. Sjekk tilgang og prøv igjen.', 'danger');
            });
    }

    renderVisitorChatThread(messages = []) {
        const bodyEl = document.getElementById('visitor-chat-body');
        const emptyEl = document.getElementById('visitor-chat-empty');
        if (!bodyEl) return;

        bodyEl.innerHTML = '';

        if (!messages.length) {
            if (emptyEl) {
                emptyEl.textContent = 'Ingen meldinger i denne chatten enda.';
                bodyEl.appendChild(emptyEl);
            } else {
                bodyEl.textContent = 'Ingen meldinger i denne chatten enda.';
            }
            return;
        }

        messages.forEach((m) => {
            const bubble = document.createElement('div');
            const isAgent = m.sender === 'agent';
            bubble.className = `visitor-chat-bubble ${isAgent ? 'is-agent' : ''}`;

            const text = typeof m.text === 'string' ? m.text : '';
            bubble.textContent = text;

            const meta = document.createElement('div');
            meta.className = 'visitor-chat-bubble-meta';
            const createdAt = m.createdAt && typeof m.createdAt.toDate === 'function'
                ? m.createdAt.toDate()
                : (m.createdAt ? new Date(m.createdAt) : null);
            const timeLabel = createdAt ? createdAt.toLocaleString('no-NO') : 'Nå';
            const channelLabel = m.targetMode
                ? `Kanal: ${m.targetMode}`
                : (m.source ? `Kilde: ${m.source}` : '');
            meta.textContent = [isAgent ? 'Team' : 'Besøkende', timeLabel, channelLabel].filter(Boolean).join(' · ');
            bubble.appendChild(meta);

            bodyEl.appendChild(bubble);
        });

        // Scroll to latest
        bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    async sendVisitorChatReply() {
        if (this.isSendingVisitorReply) return;
        const chatId = this.activeVisitorChatId || '';
        if (!chatId) return;

        const replyEl = document.getElementById('visitor-chat-reply');
        const sendBtn = document.getElementById('visitor-chat-send');
        if (!replyEl || !sendBtn) return;

        const text = String(replyEl.value || '').trim();
        if (!text) {
            this.setVisitorChatStatus('Skriv en melding før du sender.', 'danger');
            return;
        }

        this.isSendingVisitorReply = true;
        sendBtn.disabled = true;
        this.setVisitorChatStatus('Sender...', 'muted');

        try {
            await window.firebaseService.db
                .collection('visitorChats')
                .doc(chatId)
                .collection('messages')
                .add({
                    sender: 'agent',
                    source: 'google_chat', // Make it visible in the visitor widget's "Google Chat-team" mode.
                    text,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    adminOrigin: 'admin_dashboard'
                });

            await window.firebaseService.db
                .collection('visitorChats')
                .doc(chatId)
                .set({
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastAgentMessageAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            replyEl.value = '';
            this.setVisitorChatStatus('Sendt.', 'success');
            window.setTimeout(() => this.setVisitorChatStatus('', 'muted'), 1200);
        } catch (err) {
            console.error('Error sending visitor chat reply:', err);
            this.setVisitorChatStatus('Kunne ikke sende. Prøv igjen.', 'danger');
        } finally {
            sendBtn.disabled = false;
            this.isSendingVisitorReply = false;
        }
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async markAsRead(id) {
        try {
            await window.firebaseService.db.collection('contactMessages').doc(id).update({
                status: 'lest',
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.messages = this.messages.map(m => m.id === id ? { ...m, status: 'lest' } : m);
            this.renderMessages();
            this.updateBadges();
        } catch (err) {
            console.error("Error marking read:", err);
        }
    }

    async deleteMessage(id) {
        if (!confirm("Er du sikker på at du vil slette denne meldingen?")) return;
        try {
            await window.firebaseService.db.collection('contactMessages').doc(id).delete();
            this.messages = this.messages.filter(m => m.id !== id);
            this.renderMessages();
            this.updateBadges();
        } catch (err) {
            console.error("Error deleting message:", err);
        }
    }

    updateBadges() {
        const unread = this.messages.filter(m => m.status !== 'lest').length;
        const badge = document.getElementById('message-unread-count');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'inline-block' : 'none';
        }
    }
}

// Global instance
window.messagesManager = new MessagesManager();
