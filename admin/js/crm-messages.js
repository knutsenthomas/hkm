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
        this.replyAttachments = [];
        this.currentAdminEmail = '';
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
                this.currentAdminEmail = user.email || '';
                this.loadUnifiedInbox();
            } else {
                window.location.href = '/admin/login';
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
                    <div
                        id="inbox-reply-text"
                        class="reply-editor"
                        contenteditable="true"
                        role="textbox"
                        aria-multiline="true"
                        data-placeholder="Skriv et svar til ${this.escapeHtml(chatData.visitorName || 'besøkende')}..."></div>
                    <div class="reply-attachments" id="inbox-reply-attachments"></div>
                    <div class="reply-toolbar">
                        <div class="reply-actions">
                            <button type="button" class="reply-tool-btn" data-command="bold" title="Fet">
                                <span class="material-symbols-outlined">format_bold</span>
                            </button>
                            <button type="button" class="reply-tool-btn" data-command="italic" title="Kursiv">
                                <span class="material-symbols-outlined">format_italic</span>
                            </button>
                            <button type="button" class="reply-tool-btn" data-command="insertUnorderedList" title="Punktliste">
                                <span class="material-symbols-outlined">format_list_bulleted</span>
                            </button>
                            <button type="button" class="reply-tool-btn" data-command="createLink" title="Lenke">
                                <span class="material-symbols-outlined">link</span>
                            </button>
                            <button type="button" class="reply-tool-btn" data-emoji-toggle title="Emoji">
                                <span class="material-symbols-outlined">mood</span>
                            </button>
                            <label class="reply-tool-btn" title="Bilde/video">
                                <span class="material-symbols-outlined">attach_file</span>
                                <input type="file" id="inbox-image-upload" accept="image/*,video/*" hidden>
                            </label>
                            <button type="button" class="reply-tool-btn" data-video-link title="Video-lenke">
                                <span class="material-symbols-outlined">smart_display</span>
                            </button>
                        </div>
                        <button class="btn btn-primary" id="inbox-send-btn">Send svar</button>
                    </div>
                    <div class="reply-emoji-panel" id="inbox-emoji-panel" hidden>
                        ${['😀','😊','🙏','❤️','🔥','🙌','👍','🎉','✨','☀️','📌','📷','🎥'].map(emoji => `<button type="button" data-emoji="${emoji}">${emoji}</button>`).join('')}
                    </div>
                </div>
                <div id="inbox-reply-status" style="margin-top: 8px; font-size: 12px;"></div>
            </div>
        `;

        // Event listener for send
        const sendBtn = document.getElementById('inbox-send-btn');
        const replyArea = document.getElementById('inbox-reply-text');
        if (sendBtn && replyArea) {
            this.replyAttachments = [];
            this.setupRichReplyComposer(replyArea);
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
            const body = m.html
                ? this.sanitizeRichHtml(m.html)
                : this.renderPlainMessage(m.text || '');
            const attachments = this.renderMessageAttachments(m.attachments || []);
            
            return `
                <div class="msg-group">
                    <div class="msg-bubble ${isAgent ? 'agent' : 'visitor'}">${body}${attachments}<div class="msg-time">${time.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</div></div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    setupRichReplyComposer(replyArea) {
        const toolbar = document.querySelector('.reply-toolbar');
        const emojiPanel = document.getElementById('inbox-emoji-panel');
        const imageInput = document.getElementById('inbox-image-upload');

        toolbar?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-command], [data-emoji-toggle], [data-video-link]');
            if (!button) return;

            event.preventDefault();
            replyArea.focus();

            const command = button.dataset.command;
            if (command === 'createLink') {
                const url = window.prompt('Lim inn lenke:');
                if (url) document.execCommand('createLink', false, this.normalizeUrl(url));
                return;
            }

            if (command) {
                document.execCommand(command, false, null);
                return;
            }

            if (button.hasAttribute('data-emoji-toggle') && emojiPanel) {
                emojiPanel.hidden = !emojiPanel.hidden;
                return;
            }

            if (button.hasAttribute('data-video-link')) {
                const url = window.prompt('Lim inn YouTube/Vimeo/video-lenke:');
                if (url) this.addReplyAttachment({
                    type: 'video',
                    url: this.normalizeUrl(url),
                    name: 'Video'
                });
            }
        });

        emojiPanel?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-emoji]');
            if (!button) return;
            event.preventDefault();
            replyArea.focus();
            document.execCommand('insertText', false, button.dataset.emoji);
            emojiPanel.hidden = true;
        });

        imageInput?.addEventListener('change', async (event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            if (!files.length) return;
            for (const file of files) {
                await this.uploadReplyMedia(file);
            }
        });
    }

    async uploadReplyMedia(file) {
        const statusEl = document.getElementById('inbox-reply-status');
        const isImage = file.type && file.type.startsWith('image/');
        const isVideo = file.type && file.type.startsWith('video/');
        const allowAnyFile = this.activeThreadType === 'email';
        if (!allowAnyFile && !isImage && !isVideo) {
            if (statusEl) statusEl.textContent = 'Velg et bilde eller en video.';
            return;
        }

        const maxSize = allowAnyFile ? 25 * 1024 * 1024 : 50 * 1024 * 1024;
        if (file.size > maxSize) {
            if (statusEl) statusEl.textContent = `Filen er for stor. Maks ${allowAnyFile ? '25' : '50'} MB.`;
            return;
        }

        if (statusEl) statusEl.textContent = isImage ? 'Laster opp bilde...' : (isVideo ? 'Laster opp video...' : 'Laster opp vedlegg...');

        try {
            const ext = (file.name.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase();
            const folder = allowAnyFile ? 'inbox-email' : 'visitor-chat';
            const path = `editor/${folder}/${this.activeThreadId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            let url = '';
            if (isImage && typeof window.firebaseService.uploadImage === 'function' && !allowAnyFile) {
                url = await window.firebaseService.uploadImage(file, path, null, {
                    maxSizeBytes: 10 * 1024 * 1024
                });
            } else {
                const storageRef = window.firebaseService.storage.ref(path);
                const snapshot = await storageRef.put(file);
                url = await snapshot.ref.getDownloadURL();
            }
            this.addReplyAttachment({
                type: isImage ? 'image' : (isVideo ? 'video' : 'file'),
                url,
                name: file.name,
                mimeType: file.type || ''
            });
            if (statusEl) statusEl.textContent = isImage ? 'Bilde lagt til.' : (isVideo ? 'Video lagt til.' : 'Vedlegg lagt til.');
            setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 1600);
        } catch (error) {
            console.error('Media upload failed:', error);
            if (statusEl) statusEl.textContent = 'Kunne ikke laste opp filen.';
        }
    }

    addReplyAttachment(attachment) {
        this.replyAttachments = [...this.replyAttachments, attachment];
        this.renderReplyAttachments();
    }

    renderReplyAttachments() {
        const container = document.getElementById('inbox-reply-attachments');
        if (!container) return;

        container.innerHTML = this.replyAttachments.map((attachment, index) => `
            <div class="reply-attachment-chip">
                <span class="material-symbols-outlined">${attachment.type === 'image' ? 'image' : (attachment.type === 'video' ? 'smart_display' : 'attach_file')}</span>
                <span>${this.escapeHtml(attachment.name || attachment.url || 'Vedlegg')}</span>
                <button type="button" data-remove-attachment="${index}" title="Fjern">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('[data-remove-attachment]').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.removeAttachment);
                this.replyAttachments = this.replyAttachments.filter((_, i) => i !== index);
                this.renderReplyAttachments();
            });
        });
    }

    getReplyPlainText(html, attachments = []) {
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = (div.textContent || '').trim();
        const attachmentText = attachments.map(item => item.url).filter(Boolean).join('\n');
        return [text, attachmentText].filter(Boolean).join('\n').trim();
    }

    sanitizeRichHtml(html) {
        const template = document.createElement('template');
        template.innerHTML = html || '';
        const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI', 'A']);

        template.content.querySelectorAll('*').forEach((node) => {
            if (!allowedTags.has(node.tagName)) {
                node.replaceWith(...Array.from(node.childNodes));
                return;
            }

            Array.from(node.attributes).forEach((attr) => {
                const name = attr.name.toLowerCase();
                if (node.tagName === 'A' && name === 'href') {
                    node.setAttribute('href', this.normalizeUrl(attr.value));
                    node.setAttribute('target', '_blank');
                    node.setAttribute('rel', 'noopener noreferrer');
                    return;
                }
                node.removeAttribute(attr.name);
            });
        });

        return template.innerHTML;
    }

    renderPlainMessage(text) {
        return this.escapeHtml(text || '').replace(/\n/g, '<br>');
    }

    renderMessageAttachments(attachments) {
        if (!Array.isArray(attachments) || attachments.length === 0) return '';
        return `<div class="msg-attachments">${attachments.map((attachment) => {
            const url = this.escapeHtml(attachment.url || '');
            const name = this.escapeHtml(attachment.name || attachment.url || 'Vedlegg');
            if (!url) return '';
            if (attachment.type === 'image') {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${url}" alt="${name}" class="msg-attachment-image"></a>`;
            }
            if (attachment.type === 'video') {
                const player = this.isDirectVideoAttachment(attachment)
                    ? `<video controls class="msg-attachment-video" src="${url}"></video>`
                    : '';
                return `${player}<a href="${url}" target="_blank" rel="noopener noreferrer" class="msg-attachment-link"><span class="material-symbols-outlined">${player ? 'open_in_new' : 'smart_display'}</span>${name}</a>`;
            }
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="msg-attachment-link">${name}</a>`;
        }).join('')}</div>`;
    }

    isDirectVideoAttachment(attachment) {
        const mimeType = String(attachment?.mimeType || '').toLowerCase();
        const url = String(attachment?.url || '').toLowerCase();
        return mimeType.startsWith('video/') || /\.(mp4|webm|ogg|mov)(?:[?#]|$)/i.test(url);
    }

    normalizeUrl(url) {
        const value = String(url || '').trim();
        if (!value) return '';
        if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
        return `https://${value.replace(/^\/+/, '')}`;
    }

    async renderEmailView(msgId) {
        const viewEl = document.getElementById('inbox-thread-view');
        const msg = this.messages.find(m => m.id === msgId);
        if (!msg) return;

        const date = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)).toLocaleString('no-NO') : 'Ukjent';
        const replySubject = /^re:/i.test(msg.subject || '') ? (msg.subject || '') : `Re: ${msg.subject || 'Kontakt'}`;
        const adminEmail = this.currentAdminEmail || window.firebaseService?.auth?.currentUser?.email || '';

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
                <div class="email-composer">
                    <div class="email-composer-grid">
                        <label>
                            <span>Fra</span>
                            <select id="email-from-mode">
                                <option value="post">His Kingdom Ministry &lt;post@hiskingdomministry.no&gt;</option>
                                ${adminEmail ? `<option value="admin">${this.escapeHtml(adminEmail)}</option>` : ''}
                            </select>
                        </label>
                        <label>
                            <span>Til</span>
                            <input id="email-to" type="email" value="${this.escapeHtml(msg.email || '')}">
                        </label>
                        <label>
                            <span>Cc</span>
                            <input id="email-cc" type="text" placeholder="Cc">
                        </label>
                        <label>
                            <span>Bcc</span>
                            <input id="email-bcc" type="text" placeholder="Bcc">
                        </label>
                    </div>
                    <label class="email-subject-field">
                        <span>Emne</span>
                        <input id="email-subject" type="text" value="${this.escapeHtml(replySubject)}">
                    </label>
                    <div class="reply-box email-reply-box">
                        <div
                            id="inbox-reply-text"
                            class="reply-editor"
                            contenteditable="true"
                            role="textbox"
                            aria-multiline="true"
                            data-placeholder="Skriv e-postsvaret..."></div>
                        <div class="reply-attachments" id="inbox-reply-attachments"></div>
                        <div class="reply-toolbar">
                            <div class="reply-actions">
                                <button type="button" class="reply-tool-btn" data-command="bold" title="Fet"><span class="material-symbols-outlined">format_bold</span></button>
                                <button type="button" class="reply-tool-btn" data-command="italic" title="Kursiv"><span class="material-symbols-outlined">format_italic</span></button>
                                <button type="button" class="reply-tool-btn" data-command="underline" title="Understrek"><span class="material-symbols-outlined">format_underlined</span></button>
                                <button type="button" class="reply-tool-btn" data-command="insertUnorderedList" title="Punktliste"><span class="material-symbols-outlined">format_list_bulleted</span></button>
                                <button type="button" class="reply-tool-btn" data-command="insertOrderedList" title="Nummerert liste"><span class="material-symbols-outlined">format_list_numbered</span></button>
                                <button type="button" class="reply-tool-btn" data-command="createLink" title="Lenke"><span class="material-symbols-outlined">link</span></button>
                                <button type="button" class="reply-tool-btn" data-emoji-toggle title="Emoji"><span class="material-symbols-outlined">mood</span></button>
                                <label class="reply-tool-btn" title="Vedlegg">
                                    <span class="material-symbols-outlined">attach_file</span>
                                    <input type="file" id="inbox-image-upload" multiple hidden>
                                </label>
                                <button type="button" class="reply-tool-btn" data-video-link title="Video-lenke"><span class="material-symbols-outlined">smart_display</span></button>
                            </div>
                            <button class="btn btn-primary" id="inbox-send-btn">Send e-post</button>
                        </div>
                        <div class="reply-emoji-panel" id="inbox-emoji-panel" hidden>
                            ${['😀','😊','🙏','❤️','🔥','🙌','👍','🎉','✨','☀️','📌','📷','🎥'].map(emoji => `<button type="button" data-emoji="${emoji}">${emoji}</button>`).join('')}
                        </div>
                    </div>
                    <div id="inbox-reply-status" style="margin-top: 8px; font-size: 12px;"></div>
                </div>
            </div>
        `;

        const replyArea = document.getElementById('inbox-reply-text');
        const sendBtn = document.getElementById('inbox-send-btn');
        if (replyArea && sendBtn) {
            this.replyAttachments = [];
            this.setupRichReplyComposer(replyArea);
            sendBtn.onclick = () => this.sendReply();
            replyArea.focus();
        }
    }

    async sendReply() {
        if (this.isSendingReply) return;
        
        const replyArea = document.getElementById('inbox-reply-text');
        const html = this.sanitizeRichHtml(replyArea?.innerHTML || '').trim();
        const attachments = Array.isArray(this.replyAttachments) ? this.replyAttachments : [];
        const text = this.getReplyPlainText(html, attachments);
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
                        html,
                        attachments,
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

                replyArea.innerHTML = '';
                this.replyAttachments = [];
                this.renderReplyAttachments();
                if (statusEl) statusEl.textContent = 'Sendt!';
                setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
            } else if (this.activeThreadType === 'email') {
                const to = document.getElementById('email-to')?.value.trim() || '';
                const cc = document.getElementById('email-cc')?.value.trim() || '';
                const bcc = document.getElementById('email-bcc')?.value.trim() || '';
                const subject = document.getElementById('email-subject')?.value.trim() || '';
                const fromMode = document.getElementById('email-from-mode')?.value || 'post';

                if (!to || !subject) {
                    if (statusEl) statusEl.textContent = 'Mottaker og emne må fylles ut.';
                    return;
                }

                const user = window.firebaseService?.auth?.currentUser;
                const idToken = user ? await user.getIdToken(true) : '';
                const response = await fetch('https://us-central1-his-kingdom-ministry.cloudfunctions.net/sendInboxEmail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                        messageId: this.activeThreadId,
                        to,
                        cc,
                        bcc,
                        subject,
                        text,
                        html,
                        attachments,
                        fromMode,
                        fromName: fromMode === 'admin' ? (this.currentAdminEmail || 'HKM Team') : 'His Kingdom Ministry'
                    })
                });

                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Kunne ikke sende e-post.');
                }

                replyArea.innerHTML = '';
                this.replyAttachments = [];
                this.renderReplyAttachments();
                if (statusEl) statusEl.textContent = 'E-post sendt!';
                setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2200);
                this.messages = this.messages.map((message) =>
                    message.id === this.activeThreadId ? { ...message, status: 'besvart' } : message
                );
                this.updateBadges();
                this.renderThreadList();
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
