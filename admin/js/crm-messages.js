/**
 * HKM CRM Meldinger Logic
 * Handles contact form messages, status updates, and tabbed navigation.
 */

class MessagesManager {
    constructor() {
        this.messages = [];
        this.visitorChats = [];
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
                if (!copyBtn) return;

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
                <tr>
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
