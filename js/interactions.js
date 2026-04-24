import { firebaseService } from './firebase-service.js';

export class InteractionsManager {
    constructor(containerId, postId) {
        this.containerId = containerId;
        this.postId = postId;
        this.userId = this._getOrGenerateUserId();
        
        this.likesCount = 0;
        this.isLiked = false;
        this.comments = [];
        
        this.unsubLikes = null;
        this.unsubComments = null;
        
        this._init();
    }
    
    _getOrGenerateUserId() {
        let uid = localStorage.getItem('hkm_anon_user_id');
        if (!uid) {
            uid = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('hkm_anon_user_id', uid);
        }
        return uid;
    }

    async _init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        // Wait for Firebase to be ready
        if (!firebaseService.isInitialized) {
            // Attempt auto-init
            if (typeof firebaseService.tryAutoInit === 'function') {
                firebaseService.tryAutoInit();
            }
            // Give it a moment
            await new Promise(r => setTimeout(r, 500));
        }
        
        this.renderShell(container);
        this.bindEvents();
        
        // Subscribe to real-time data
        if (firebaseService.isInitialized) {
            this.unsubLikes = firebaseService.subscribeToLikes(this.postId, (data) => {
                this.likesCount = data.likes_count || 0;
                const likedBy = data.liked_by || [];
                this.isLiked = likedBy.includes(this.userId);
                this.updateLikesUI();
            });
            
            this.unsubComments = firebaseService.subscribeToComments(this.postId, (comments) => {
                this.comments = comments || [];
                this.updateCommentsUI();
            });
        } else {
            console.warn('[Interactions] Firebase not initialized. Interactions disabled.');
            container.innerHTML = '<div class="comments-empty"><p>Interaksjoner er for øyeblikket utilgjengelige.</p></div>';
        }
    }
    
    renderShell(container) {
        container.innerHTML = `
            <div class="interactions-container">
                <!-- Likes -->
                <div class="likes-section">
                    <button id="interaction-like-btn" class="like-btn" aria-label="Liker">
                        <i class="fa-regular fa-heart"></i>
                        <span>Liker</span>
                    </button>
                    <span id="interaction-likes-count" class="likes-count-text">Henter likes...</span>
                </div>
                
                <!-- Comments -->
                <div class="comments-section">
                    <h3 class="comments-header">Kommentarer</h3>
                    
                    <form id="interaction-comment-form" class="comment-form">
                        <div class="comment-input-group">
                            <label for="comment-name">Ditt navn</label>
                            <input type="text" id="comment-name" placeholder="F.eks. Ola Nordmann" required />
                        </div>
                        <div class="comment-input-group">
                            <label for="comment-text">Din kommentar</label>
                            <textarea id="comment-text" placeholder="Hva synes du om dette?" required></textarea>
                        </div>
                        <button type="submit" class="comment-submit-btn" id="comment-submit-btn">
                            <span>Publiser kommentar</span>
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </form>
                    
                    <div id="interaction-comments-list" class="comments-list">
                        <!-- Loading or empty state -->
                        <div class="comments-empty">
                            <i class="far fa-comments"></i>
                            <p>Ingen kommentarer enda. Bli den første til å kommentere!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Restore name from localStorage if exists
        const savedName = localStorage.getItem('hkm_comment_name');
        if (savedName) {
            const nameInput = document.getElementById('comment-name');
            if (nameInput) nameInput.value = savedName;
        }
    }
    
    bindEvents() {
        const likeBtn = document.getElementById('interaction-like-btn');
        if (likeBtn) {
            likeBtn.onclick = (e) => {
                e.preventDefault();
                this.handleLikeToggle();
            };
        }
        
        const form = document.getElementById('interaction-comment-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        }
    }
    
    async handleLikeToggle() {
        const btn = document.getElementById('interaction-like-btn');
        if (!btn || btn.disabled) return;
        
        console.log(`[Interactions] Toggling like for post: ${this.postId}`);
        
        // Optimistic UI update
        this.isLiked = !this.isLiked;
        this.likesCount += this.isLiked ? 1 : -1;
        this.likesCount = Math.max(0, this.likesCount);
        this.updateLikesUI();
        
        try {
            btn.disabled = true;
            btn.style.opacity = '0.7';
            await firebaseService.toggleLike(this.postId, this.userId);
            console.log(`[Interactions] Successfully toggled like for ${this.postId}`);
        } catch (error) {
            console.error('[Interactions] Failed to toggle like:', error);
            // Revert optimistic update
            this.isLiked = !this.isLiked;
            this.likesCount += this.isLiked ? 1 : -1;
            this.likesCount = Math.max(0, this.likesCount);
            this.updateLikesUI();
            
            if (error.message.includes('permission-denied')) {
                alert('Du har ikke tilgang til å like dette innlegget for øyeblikket.');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
    }
    
    async handleCommentSubmit(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('comment-name');
        const textInput = document.getElementById('comment-text');
        const submitBtn = document.getElementById('comment-submit-btn');
        
        const name = nameInput.value.trim();
        const text = textInput.value.trim();
        
        if (!name || !text) return;
        
        // Save name for next time
        localStorage.setItem('hkm_comment_name', name);
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publiserer...';
            
            await firebaseService.addComment(this.postId, {
                author_name: name,
                text: text,
                user_id: this.userId
            });
            
            textInput.value = ''; // clear text
        } catch (error) {
            console.error('[Interactions] Failed to post comment:', error);
            alert('Det skjedde en feil ved publisering av kommentaren. Prøv igjen senere.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Publiser kommentar</span> <i class="fas fa-paper-plane"></i>';
        }
    }
    
    updateLikesUI() {
        const btn = document.getElementById('interaction-like-btn');
        const countText = document.getElementById('interaction-likes-count');
        
        if (!btn || !countText) return;
        
        const icon = btn.querySelector('i');
        
        if (this.isLiked) {
            btn.classList.add('liked');
            icon.classList.remove('fa-regular');
            icon.classList.add('fa-solid');
        } else {
            btn.classList.remove('liked');
            icon.classList.remove('fa-solid');
            icon.classList.add('fa-regular');
        }
        
        if (this.likesCount === 0) {
            countText.textContent = 'Bli den første til å like dette';
        } else if (this.likesCount === 1) {
            countText.textContent = '1 person liker dette';
        } else {
            countText.textContent = `${this.likesCount} personer liker dette`;
        }
    }
    
    updateCommentsUI() {
        const list = document.getElementById('interaction-comments-list');
        if (!list) return;
        
        if (this.comments.length === 0) {
            list.innerHTML = `
                <div class="comments-empty">
                    <i class="far fa-comments"></i>
                    <p>Ingen kommentarer enda. Bli den første til å kommentere!</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = '';
        this.comments.forEach(comment => {
            const dateStr = this.formatDate(comment.timestamp);
            const initials = this.getInitials(comment.author_name);
            
            const html = `
                <div class="comment-item">
                    <div class="comment-avatar">${initials}</div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">${this.escapeHtml(comment.author_name)}</span>
                            <span class="comment-date">${dateStr}</span>
                        </div>
                        <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                    </div>
                </div>
            `;
            
            list.insertAdjacentHTML('beforeend', html);
        });
    }
    
    getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }
    
    formatDate(timestamp) {
        if (!timestamp) return 'Akkurat nå';
        
        // Handle Firestore timestamp
        let date;
        if (typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            date = new Date(timestamp);
        }
        
        // Simple formatting e.g. "24. apr 2026 kl 14:30"
        return date.toLocaleDateString('no-NO', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
    
    cleanup() {
        if (this.unsubLikes) this.unsubLikes();
        if (this.unsubComments) this.unsubComments();
    }
}
