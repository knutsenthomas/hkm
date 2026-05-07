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
        this.selectedThreads = new Set();
        this.pushNotifications = [];
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

        // Bulk Actions
        const selectAll = document.getElementById('select-all-threads');
        if (selectAll) {
            selectAll.onchange = (e) => this.toggleAllThreads(e.target.checked);
        }
        // Push Notification Listeners
        const btnNewPush = document.getElementById('btn-new-push');
        if (btnNewPush) {
            btnNewPush.onclick = () => {
                document.getElementById('push-modal').style.display = 'flex';
                this.resetPushForm();
            };
        }

        const pushTarget = document.getElementById('inbox-push-target');
        if (pushTarget) {
            pushTarget.onchange = (e) => {
                const selection = document.getElementById('inbox-push-user-selection');
                if (e.target.value === 'selected') {
                    this.renderUserSelection('inbox-push-user-selection');
                    selection.style.display = 'block';
                } else {
                    selection.style.display = 'none';
                }
            };
        }

        const pushForm = document.getElementById('inbox-push-form');
        if (pushForm) {
            pushForm.onsubmit = (e) => this.handlePushSubmit(e);
            
            // Real-time Preview Listeners
            const titleInput = document.getElementById('inbox-push-title');
            const bodyInput = document.getElementById('inbox-push-body');
            const previewTitle = document.getElementById('preview-push-title');
            const previewBody = document.getElementById('preview-push-body');

            if (titleInput && previewTitle) {
                titleInput.addEventListener('input', (e) => {
                    previewTitle.textContent = e.target.value || 'Tittel på varsel';
                });
            }
            if (bodyInput && previewBody) {
                bodyInput.addEventListener('input', (e) => {
                    previewBody.textContent = e.target.value || 'Meldingen din vil vises her...';
                });
            }
        }

        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.onclick = () => this.deleteSelectedThreads();
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
                .limit(20)
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
                .limit(20)
                .get();

            this.visitorChats = chatsSnapshot.docs.map(doc => ({
                id: doc.id,
                type: 'chat',
                ...doc.data()
            }));

            // Fetch Push Notifications (Campaign logs)
            const pushSnapshot = await window.firebaseService.db
                .collection('push_log')
                .orderBy('sentAt', 'desc')
                .limit(20)
                .get();

            this.pushNotifications = pushSnapshot.docs.map(doc => ({
                id: doc.id,
                type: 'push',
                ...doc.data(),
                createdAt: doc.data().sentAt // Normalize timestamp
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
        const combined = [...this.messages, ...this.visitorChats, ...this.pushNotifications];
        
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
        } else if (this.activeFilter === 'push') {
            filtered = threads.filter(t => t.type === 'push');
        }

        if (filtered.length === 0) {
            listEl.innerHTML = '<p class="inbox-empty" style="padding: 40px; text-align:center; color: var(--text-muted);">Ingen meldinger funnet.</p>';
            this.updateBulkToolbar(filtered);
            return;
        }

        listEl.innerHTML = filtered.map(t => this.renderThreadItem(t)).join('');
        this.updateBulkToolbar(filtered);
    }

    renderThreadItem(t) {
        const isEmail = t.type === 'email';
        const isPush = t.type === 'push';
        const isChat = t.type === 'chat';

        let name = 'Ukjent';
        if (isEmail) name = t.name || 'Ukjent';
        else if (isChat) name = t.visitorName || 'Anonym';
        else if (isPush) name = 'Kampanje: ' + (t.sentBy || 'Admin');

        const time = (t.updatedAt || t.createdAt || t.sentAt)?.toDate?.() || new Date(t.updatedAt || t.createdAt || t.sentAt || 0);
        const timeLabel = this.formatTime(time);
        
        let preview = '';
        if (isEmail) {
            preview = t.subject || t.message || '';
        } else if (isChat) {
            preview = t.lastMessage?.text || 'Ingen meldinger enda';
        } else if (isPush) {
            preview = t.title || t.body || '';
        }

        const isUnread = isEmail ? t.status !== 'lest' : (isChat && t.lastMessage && t.lastMessage.sender === 'visitor');
        const isActive = this.activeThreadId === t.id;
        const isSelected = this.selectedThreads.has(t.id);

        let icon = 'person';
        let channelIcon = 'mail';
        let avatarClass = '';

        if (isChat) {
            icon = 'chat_bubble';
            channelIcon = 'forum';
        } else if (isPush) {
            icon = 'send_to_mobile';
            channelIcon = 'campaign';
            avatarClass = 'push';
        }

        return `
            <div class="thread-item ${isUnread ? 'unread' : ''} ${isActive ? 'active' : ''}" data-id="${t.id}" data-type="${t.type}">
                <div class="thread-item-checkbox" onclick="event.stopPropagation()">
                    <input type="checkbox" class="thread-checkbox" data-id="${t.id}" ${isSelected ? 'checked' : ''} onchange="window.messagesManager.toggleThreadSelection('${t.id}', this.checked)">
                </div>
                <div class="thread-avatar ${avatarClass}">
                    <span class="material-symbols-outlined">${icon}</span>
                    <div class="thread-channel-icon">
                        <span class="material-symbols-outlined">${channelIcon}</span>
                    </div>
                </div>
                <div class="thread-info">
                    <div class="thread-top">
                        <span class="thread-name">${this.escapeHtml(name)}</span>
                        <span class="thread-time">${timeLabel}</span>
                    </div>
                    ${(isEmail || isPush) && (t.title || t.subject) ? `<div class="thread-subject">${this.escapeHtml(t.title || t.subject)}</div>` : ''}
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
        } else if (type === 'push') {
            await this.renderPushView(id);
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

    async renderPushView(id) {
        const push = this.pushNotifications.find(p => p.id === id);
        const viewEl = document.getElementById('inbox-thread-view');
        if (!push || !viewEl) return;

        const time = (push.sentAt || push.createdAt)?.toDate?.() || new Date(push.sentAt || push.createdAt || 0);
        
        viewEl.innerHTML = `
            <div class="message-detail">
                <div class="message-detail-header">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
                        <div>
                            <h2 class="message-subject">${this.escapeHtml(push.title || 'Push-varsling')}</h2>
                            <div class="message-meta">
                                <span>Sendt av: ${this.escapeHtml(push.sentBy || 'Admin')}</span>
                                <span class="meta-separator">•</span>
                                <span>Målgruppe: ${this.escapeHtml(push.targetRole || 'alle')}</span>
                                <span class="meta-separator">•</span>
                                <span>Dato: ${time.toLocaleString('no-NO')}</span>
                            </div>
                        </div>
                        <button class="btn-icon delete-btn" onclick="window.messagesManager.deleteMessage('${push.id}', 'push')">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
                <div class="message-body">
                    <div class="message-card">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; color: #4338ca; font-weight: 700; font-size: 13px; letter-spacing: 0.5px;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">send_to_mobile</span>
                            PUSH-VARSLING KAMPANJE
                        </div>
                        <div style="font-weight: 700; font-size: 18px; margin-bottom: 12px; color: #1e293b;">${this.escapeHtml(push.title)}</div>
                        <div style="font-size: 15px; color: #334155; line-height: 1.7;">${this.escapeHtml(push.body)}</div>
                        ${push.link ? `<div style="margin-top:20px; padding-top:15px; border-top:1px solid #e2e8f0; font-size: 13px;"><span style="color:#64748b; margin-right:8px;">Link:</span><a href="${push.link}" target="_blank" style="color:var(--inbox-orange); text-decoration:none; font-weight:600;">${push.link}</a></div>` : ''}
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; font-style: italic;">Denne loggføringen viser en push-varsling som ble sendt til brukere via administrasjonspanelet.</p>
                </div>
            </div>
        `;
    }

    // Selection Methods
    toggleThreadSelection(id, isSelected) {
        if (isSelected) {
            this.selectedThreads.add(id);
        } else {
            this.selectedThreads.delete(id);
        }
        this.updateBulkToolbar();
    }

    toggleAllThreads(isSelected) {
        const threads = this.getCurrentFilteredThreads();
        threads.forEach(t => {
            if (isSelected) this.selectedThreads.add(t.id);
            else this.selectedThreads.delete(t.id);
        });
        this.renderThreadList();
    }

    getCurrentFilteredThreads() {
        let threads = this.unifiedThreads;
        if (this.activeFilter === 'unread') {
            threads = threads.filter(t => (t.type === 'email' && t.status !== 'lest') || (t.type === 'chat' && t.lastMessage?.sender === 'visitor'));
        } else if (this.activeFilter && this.activeFilter !== 'all') {
            threads = threads.filter(t => t.type === this.activeFilter);
        }
        return threads;
    }

    updateBulkToolbar(filtered = this.getCurrentFilteredThreads()) {
        const toolbar = document.getElementById('bulk-actions');
        const countEl = document.getElementById('selected-count');
        const selectAllCb = document.getElementById('select-all-threads');
        
        if (!toolbar || !countEl) return;

        const selectedCount = this.selectedThreads.size;
        
        if (selectedCount > 0) {
            toolbar.style.display = 'flex';
            countEl.textContent = `${selectedCount} valgt`;
            
            // Update select all state
            if (selectAllCb) {
                const allSelected = filtered.length > 0 && filtered.every(t => this.selectedThreads.has(t.id));
                selectAllCb.checked = allSelected;
            }
        } else {
            toolbar.style.display = 'none';
            if (selectAllCb) selectAllCb.checked = false;
        }
    }

    async deleteSelectedThreads() {
        const count = this.selectedThreads.size;
        if (count === 0) return;

        const confirmText = count === 1 
            ? "Er du sikker på at du vil slette denne meldingen?" 
            : `Er du sikker på at du vil slette ${count} valgte meldinger?`;

        if (!confirm(confirmText)) return;

        const btn = document.getElementById('bulk-delete-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined rotating">sync</span> Sletter...';

        try {
            const promises = [];
            this.selectedThreads.forEach(id => {
                const thread = this.unifiedThreads.find(t => t.id === id);
                if (thread) {
                    promises.push(this.performDelete(thread.id, thread.type));
                }
            });

            await Promise.all(promises);
            window.showToast?.(`Slettet ${count} meldinger`, 'success');
            
            this.selectedThreads.clear();
            await this.loadUnifiedInbox();
            
            // Clear view if active thread was deleted
            const viewEl = document.getElementById('inbox-thread-view');
            if (viewEl) viewEl.innerHTML = '<div class="inbox-empty-view">Ingen samtale valgt</div>';

        } catch (error) {
            console.error("Bulk delete error:", error);
            window.showToast?.("Kunne ikke slette alle meldinger", 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    async deleteMessage(id, type) {
        if (!confirm("Er du sikker på at du vil slette denne meldingen?")) return;
        
        try {
            await this.performDelete(id, type);
            window.showToast?.("Melding slettet", 'success');
            
            this.selectedThreads.delete(id);
            await this.loadUnifiedInbox();
            
            const viewEl = document.getElementById('inbox-thread-view');
            if (viewEl) viewEl.innerHTML = '<div class="inbox-empty-view">Ingen samtale valgt</div>';
            
        } catch (error) {
            console.error("Delete error:", error);
            window.showToast?.("Kunne ikke slette meldingen", 'error');
        }
    }

    async performDelete(id, type) {
        let collection = '';
        if (type === 'email') collection = 'contactMessages';
        else if (type === 'chat') collection = 'visitorChats';
        else if (type === 'push') collection = 'push_log';

        if (!collection) return;

        await window.firebaseService.db.collection(collection).doc(id).delete();
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
            let name = '';
            let preview = '';
            
            if (t.type === 'email') {
                name = t.name || '';
                preview = t.subject || '';
            } else if (t.type === 'chat') {
                name = t.visitorName || '';
                preview = t.lastMessage?.text || '';
            } else if (t.type === 'push') {
                name = 'Kampanje: ' + (t.sentBy || 'Admin');
                preview = t.title || t.body || '';
            }
            
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

    resetPushForm() {
        const form = document.getElementById('inbox-push-form');
        if (form) form.reset();
        const selection = document.getElementById('inbox-push-user-selection');
        if (selection) selection.style.display = 'none';
        const status = document.getElementById('inbox-push-status');
        if (status) status.textContent = '';
    }

    async renderUserSelection(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '<div class="loader"></div>';

        try {
            const snap = await window.firebaseService.db.collection('users').get();
            if (snap.empty) {
                container.innerHTML = '<p>Ingen brukere funnet.</p>';
                return;
            }

            container.innerHTML = snap.docs.map(doc => {
                const data = doc.data();
                return `
                    <div style="display:flex; align-items:center; gap:10px; padding: 5px 0;">
                        <input type="checkbox" class="inbox-user-select" value="${doc.id}">
                        <span style="font-size: 13px;">${this.escapeHtml(data.displayName || data.email || doc.id)}</span>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error("Error loading users:", err);
            container.innerHTML = '<p>Feil ved lasting av brukere.</p>';
        }
    }

    async handlePushSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const statusEl = document.getElementById('inbox-push-status');
        
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined rotating">sync</span> Sender...';
        statusEl.textContent = 'Forbereder utsendelse...';
        statusEl.style.color = 'var(--text-muted)';

        try {
            const user = window.firebaseService.auth.currentUser;
            if (!user) throw new Error('Du må være logget inn.');

            const idToken = await user.getIdToken();
            const targetRole = document.getElementById('inbox-push-target').value;
            const title = document.getElementById('inbox-push-title').value;
            const body = document.getElementById('inbox-push-body').value;
            const link = document.getElementById('inbox-push-link').value;

            let payload = { targetRole, title, body, click_action: link };

            if (targetRole === 'selected') {
                const selectedIds = Array.from(document.querySelectorAll('.inbox-user-select:checked')).map(cb => cb.value);
                if (selectedIds.length === 0) throw new Error("Velg minst én bruker.");
                payload.selectedUserIds = selectedIds;
            }

            // 1. Save to user_notifications (in-app)
            let targetUsers = [];
            const allUsersSnap = await window.firebaseService.db.collection('users').get();
            allUsersSnap.forEach(doc => {
                const data = doc.data();
                if (targetRole === 'all') targetUsers.push(doc.id);
                else if (targetRole === 'medlem' && data.role === 'medlem') targetUsers.push(doc.id);
                else if (targetRole === 'selected' && payload.selectedUserIds?.includes(doc.id)) targetUsers.push(doc.id);
            });

            if (targetUsers.length > 0) {
                const batch = window.firebaseService.db.batch();
                targetUsers.forEach(uid => {
                    const ref = window.firebaseService.db.collection('user_notifications').doc();
                    batch.set(ref, {
                        userId: uid,
                        title,
                        body,
                        type: 'push',
                        link,
                        read: false,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                await batch.commit();
            }

            // 2. Call FCM Cloud Function
            try {
                const response = await fetch('https://sendpushnotification-42bhgdjkcq-uc.a.run.app', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) console.warn("Cloud Function reported error, but notification was saved in-app.");
            } catch (fcmErr) {
                console.warn("FCM failed:", fcmErr);
            }

            // 3. Log to push_log
            await window.firebaseService.db.collection('push_log').add({
                title,
                body,
                targetRole,
                link,
                sentBy: user.email || 'Admin',
                sentAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            window.showToast?.("Push-varsling er sendt!", "success");
            document.getElementById('push-modal').style.display = 'none';
            this.loadUnifiedInbox(); // Refresh log

        } catch (error) {
            console.error("Push send error:", error);
            statusEl.textContent = error.message;
            statusEl.style.color = '#ef4444';
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
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
