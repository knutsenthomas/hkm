/**
 * HKM CRM Unified Inbox Logic
 * Consolidates contact form messages and visitor chats into a single Wix-style interface.
 */

class MessagesManager {
    constructor() {
        this.messages = []; // From contactMessages
        this.visitorChats = []; // From visitorChats
        this.unifiedThreads = [];
        this.activeFilter = 'all';
        this.activeThreadId = null;
        this.activeThreadType = null; // 'chat' or 'email'
        this.activeVisitorChatUnsub = null;
        this.isSendingReply = false;
        this.init();
    }

    async init() {
        console.log("Unified Inbox Manager Initializing...");
        this.setupEventListeners();

        // Wait for Firebase
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
                this.loadUnifiedInbox();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('inbox-search');
        if (searchInput) {
            searchInput.oninput = (e) => this.handleSearch(e.target.value);
        }

        // Folders
        const folders = document.querySelectorAll('.folder-item');
        folders.forEach(folder => {
            folder.addEventListener('click', () => {
                folders.forEach(f => f.classList.remove('active'));
                folder.classList.add('active');
                this.activeFilter = folder.dataset.filter;
                this.renderThreadList();
            });
        });

        // Thread List Delegation
        const listEl = document.getElementById('inbox-threads-list');
        if (listEl) {
            listEl.addEventListener('click', (e) => {
                const threadItem = e.target.closest('.thread-item');
                if (threadItem) {
                    const id = threadItem.dataset.id;
                    const type = threadItem.dataset.type;
                    this.selectThread(id, type);
                }
            });
        }
    }

    async loadUnifiedInbox() {
        const listEl = document.getElementById('inbox-threads-list');
        if (!listEl) return;

        try {
            // Fetch Contact Messages
            const messagesSnapshot = await window.firebaseService.db
                .collection('contactMessages')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            this.messages = messagesSnapshot.docs.map(doc => ({
                id: doc.id,
                type: 'email',
                ...doc.data()
            }));

            // Fetch Visitor Chats
            const chatsSnapshot = await window.firebaseService.db
                .collection('visitorChats')
                .orderBy('updatedAt', 'desc')
                .limit(50)
                .get();

            this.visitorChats = await Promise.all(chatsSnapshot.docs.map(async (doc) => {
                const chatData = doc.data() || {};
                
                // Get last message for preview
                const lastMsgSnapshot = await window.firebaseService.db
                    .collection('visitorChats')
                    .doc(doc.id)
                    .collection('messages')
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();

                const lastMsg = lastMsgSnapshot.docs[0]?.data() || null;
                
                return {
                    id: doc.id,
                    type: 'chat',
                    ...chatData,
                    lastMessage: lastMsg
                };
            }));

            this.buildUnifiedThreads();
            this.renderThreadList();
            this.updateBadges();

        } catch (error) {
            console.error("Error loading unified inbox:", error);
            listEl.innerHTML = '<p class="inbox-empty" style="color:red; padding: 20px;">Kunne ikke laste innboks.</p>';
        }
    }

    buildUnifiedThreads() {
        // Merge and sort by most recent activity
        const combined = [...this.messages, ...this.visitorChats];
        
        combined.sort((a, b) => {
            const timeA = (a.updatedAt || a.createdAt)?.toDate?.() || new Date(a.updatedAt || a.createdAt || 0);
            const timeB = (b.updatedAt || b.createdAt)?.toDate?.() || new Date(b.updatedAt || b.createdAt || 0);
            return timeB - timeA;
        });

        this.unifiedThreads = combined;
    }

    renderThreadList(threads = this.unifiedThreads) {
        const listEl = document.getElementById('inbox-threads-list');
        if (!listEl) return;

        let filtered = threads;
        if (this.activeFilter === 'unread') {
            filtered = threads.filter(t => t.status !== 'lest' && t.type === 'email'); // Simple unread for email
            // For chat, we could check if last message is from visitor
            const unreadChats = threads.filter(t => t.type === 'chat' && t.lastMessage && t.lastMessage.sender === 'visitor');
            filtered = [...filtered, ...unreadChats];
            // Sort again after filter merge
            filtered.sort((a, b) => {
                const timeA = (a.updatedAt || a.createdAt)?.toDate?.() || new Date(a.updatedAt || a.createdAt || 0);
                const timeB = (b.updatedAt || b.createdAt)?.toDate?.() || new Date(b.updatedAt || b.createdAt || 0);
                return timeB - timeA;
            });
        } else if (this.activeFilter === 'chat') {
            filtered = threads.filter(t => t.type === 'chat');
        } else if (this.activeFilter === 'email') {
            filtered = threads.filter(t => t.type === 'email');
        }

        if (filtered.length === 0) {
            listEl.innerHTML = '<p class="inbox-empty" style="padding: 40px; text-align:center; color: var(--text-muted);">Ingen meldinger funnet.</p>';
            return;
        }

        listEl.innerHTML = filtered.map(t => this.renderThreadItem(t)).join('');
    }

    renderThreadItem(t) {
        const isEmail = t.type === 'email';
        const name = isEmail ? (t.name || 'Ukjent') : (t.visitorName || 'Anonym besøkende');
        const time = (t.updatedAt || t.createdAt)?.toDate?.() || new Date(t.updatedAt || t.createdAt || 0);
        const timeLabel = this.formatTime(time);
        
        let preview = '';
        if (isEmail) {
            preview = t.subject || t.message || '';
        } else {
            preview = t.lastMessage?.text || 'Ingen meldinger enda';
        }

        const isUnread = isEmail ? t.status !== 'lest' : (t.lastMessage && t.lastMessage.sender === 'visitor');
        const isActive = this.activeThreadId === t.id;

        return `
            <div class="thread-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}" data-id="${t.id}" data-type="${t.type}">
                <div class="thread-avatar">
                    <span class="material-symbols-outlined">${isEmail ? 'person' : 'chat_bubble'}</span>
                    <div class="thread-channel-icon">
                        <span class="material-symbols-outlined">${isEmail ? 'mail' : 'smart_toy'}</span>
                    </div>
                </div>
                <div class="thread-info">
                    <div class="thread-top">
                        <span class="thread-name">${this.escapeHtml(name)}</span>
                        <span class="thread-time">${timeLabel}</span>
                    </div>
                    ${isEmail && t.subject ? `<div class="thread-subject">${this.escapeHtml(t.subject)}</div>` : ''}
                    <div class="thread-preview">${this.escapeHtml(preview)}</div>
                </div>
            </div>
        `;
    }

    async selectThread(id, type) {
        this.activeThreadId = id;
        this.activeThreadType = type;
        
        // UI feedback
        this.renderThreadList();
        
        const viewEl = document.getElementById('inbox-thread-view');
        if (!viewEl) return;

        viewEl.innerHTML = '<div class="loader"></div>';

        if (type === 'chat') {
            await this.renderChatView(id);
        } else {
            await this.renderEmailView(id);
        }

        // If it was unread email, mark as read
        if (type === 'email') {
            const msg = this.messages.find(m => m.id === id);
            if (msg && msg.status !== 'lest') {
                this.markAsRead(id);
            }
        }
    }

    async renderChatView(chatId) {
        const viewEl = document.getElementById('inbox-thread-view');
        const chatData = this.visitorChats.find(c => c.id === chatId) || {};

        viewEl.innerHTML = `
            <div class="view-header">
                <div class="view-contact-info">
                    <div class="thread-avatar">
                        <span class="material-symbols-outlined">person</span>
                    </div>
                    <div>
                        <div class="view-name">${this.escapeHtml(chatData.visitorName || 'Anonym besøkende')}</div>
                        <div class="view-status">Aktiv nå</div>
                    </div>
                </div>
                <div class="view-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.messagesManager.copyChatId('${chatId}')">
                        <span class="material-symbols-outlined">content_copy</span> Kopier ID
                    </button>
                </div>
            </div>
            <div class="view-messages" id="inbox-messages-container">
                <div class="loader"></div>
            </div>
            <div class="view-reply">
                <div class="reply-box">
                    <textarea id="inbox-reply-text" placeholder="Skriv et svar til ${this.escapeHtml(chatData.visitorName || 'besøkende')}..."></textarea>
                    <div class="reply-toolbar">
                        <div class="reply-actions">
                            <!-- Optional formatting icons -->
                        </div>
                        <button class="btn btn-primary" id="inbox-send-btn">Send svar</button>
                    </div>
                </div>
                <div id="inbox-reply-status" style="margin-top: 8px; font-size: 12px;"></div>
            </div>
        `;

        // Event listener for send
        const sendBtn = document.getElementById('inbox-send-btn');
        const replyArea = document.getElementById('inbox-reply-text');
        if (sendBtn && replyArea) {
            sendBtn.onclick = () => this.sendReply();
            replyArea.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendReply();
                }
            };
        }

        // Subscribe to messages
        if (this.activeVisitorChatUnsub) this.activeVisitorChatUnsub();
        
        this.activeVisitorChatUnsub = window.firebaseService.db
            .collection('visitorChats')
            .doc(chatId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot((snap) => {
                const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                this.renderChatMessages(msgs);
            });
    }

    renderChatMessages(messages) {
        const container = document.getElementById('inbox-messages-container');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 40px;">Ingen meldinger i denne samtalen.</p>';
            return;
        }

        container.innerHTML = messages.map(m => {
            const isAgent = m.sender === 'agent';
            const time = m.createdAt?.toDate?.() || new Date(m.createdAt || Date.now());
            
            return `
                <div class="msg-group">
                    <div class="msg-bubble ${isAgent ? 'agent' : 'visitor'}">
                        ${this.escapeHtml(m.text || '')}
                        <div class="msg-time">${time.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    async renderEmailView(msgId) {
        const viewEl = document.getElementById('inbox-thread-view');
        const msg = this.messages.find(m => m.id === msgId);
        if (!msg) return;

        const date = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)).toLocaleString('no-NO') : 'Ukjent';

        viewEl.innerHTML = `
            <div class="view-header">
                <div class="view-contact-info">
                    <div class="thread-avatar">
                        <span class="material-symbols-outlined">mail</span>
                    </div>
                    <div>
                        <div class="view-name">${this.escapeHtml(msg.name || 'Ukjent')}</div>
                        <div style="font-size: 13px; color: var(--text-muted);">${this.escapeHtml(msg.email || '')}</div>
                    </div>
                </div>
                <div class="view-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.messagesManager.deleteMessage('${msgId}')">
                        <span class="material-symbols-outlined">delete</span> Slett
                    </button>
                </div>
            </div>
            <div class="threads-scroll">
                <div class="email-view-container">
                    <div class="email-header">
                        <h1 class="email-subject">${this.escapeHtml(msg.subject || '(Ingen emne)')}</h1>
                        <div class="email-meta-row">
                            <span class="email-meta-label">Fra:</span>
                            <span>${this.escapeHtml(msg.name)} &lt;${this.escapeHtml(msg.email)}&gt;</span>
                        </div>
                        <div class="email-meta-row">
                            <span class="email-meta-label">Dato:</span>
                            <span>${date}</span>
                        </div>
                    </div>
                    <div class="email-body">${this.escapeHtml(msg.message || '')}</div>
                </div>
            </div>
            <div class="view-reply">
                <a href="mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || '')}" class="btn btn-primary" style="width: 100%;">
                    Svar via e-post
                </a>
            </div>
        `;
    }

    async sendReply() {
        if (this.isSendingReply) return;
        
        const replyArea = document.getElementById('inbox-reply-text');
        const text = replyArea?.value.trim();
        if (!text) return;

        this.isSendingReply = true;
        const statusEl = document.getElementById('inbox-reply-status');
        if (statusEl) statusEl.textContent = 'Sender...';

        try {
            if (this.activeThreadType === 'chat') {
                const chatId = this.activeThreadId;
                
                await window.firebaseService.db
                    .collection('visitorChats')
                    .doc(chatId)
                    .collection('messages')
                    .add({
                        sender: 'agent',
                        source: 'google_chat',
                        text,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        adminOrigin: 'admin_dashboard'
                    });

                await window.firebaseService.db
                    .collection('visitorChats')
                    .doc(chatId)
                    .set({
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastAgentMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastTargetMode: 'google_chat',
                        requestHuman: true
                    }, { merge: true });

                replyArea.value = '';
                if (statusEl) statusEl.textContent = 'Sendt!';
                setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
            }
        } catch (err) {
            console.error("Error sending reply:", err);
            if (statusEl) statusEl.textContent = 'Feil ved sending.';
        } finally {
            this.isSendingReply = false;
        }
    }

    async markAsRead(id) {
        try {
            await window.firebaseService.db.collection('contactMessages').doc(id).update({
                status: 'lest',
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.messages = this.messages.map(m => m.id === id ? { ...m, status: 'lest' } : m);
            this.updateBadges();
            this.renderThreadList();
        } catch (err) {
            console.error("Error marking read:", err);
        }
    }

    async deleteMessage(id) {
        const ok = confirm('Er du sikker på at du vil slette denne meldingen?');
        if (!ok) return;
        try {
            await window.firebaseService.db.collection('contactMessages').doc(id).delete();
            this.messages = this.messages.filter(m => m.id !== id);
            this.buildUnifiedThreads();
            this.renderThreadList();
            document.getElementById('inbox-thread-view').innerHTML = `
                <div class="inbox-empty-view">
                    <span class="material-symbols-outlined">done_all</span>
                    <p>Meldingen er slettet</p>
                </div>
            `;
        } catch (err) {
            console.error("Error deleting message:", err);
        }
    }

    copyChatId(id) {
        navigator.clipboard.writeText(id).then(() => {
            alert('Chat-ID kopiert til utklippstavlen');
        });
    }

    updateBadges() {
        const unreadEmails = this.messages.filter(m => m.status !== 'lest').length;
        const unreadChats = this.visitorChats.filter(c => c.lastMessage && c.lastMessage.sender === 'visitor').length;
        const totalUnread = unreadEmails + unreadChats;

        const badgeAll = document.getElementById('badge-all');
        const badgeUnread = document.getElementById('badge-unread');

        if (badgeAll) {
            badgeAll.textContent = totalUnread;
            badgeAll.style.display = totalUnread > 0 ? 'inline-block' : 'none';
        }
        if (badgeUnread) {
            badgeUnread.textContent = totalUnread;
            badgeUnread.style.display = totalUnread > 0 ? 'inline-block' : 'none';
        }
    }

    handleSearch(query) {
        const q = query.toLowerCase();
        const filtered = this.unifiedThreads.filter(t => {
            const name = (t.type === 'email' ? t.name : t.visitorName) || '';
            const preview = (t.type === 'email' ? t.subject : t.lastMessage?.text) || '';
            return name.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
        });
        this.renderThreadList(filtered);
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const oneDay = 24 * 60 * 60 * 1000;

        if (diff < oneDay && now.getDate() === date.getDate()) {
            return date.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < oneDay * 7) {
            return date.toLocaleDateString('no-NO', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
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
}

// Global instance
window.messagesManager = new MessagesManager();
