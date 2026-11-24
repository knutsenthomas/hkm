import { firebaseService } from './firebase-service.js';

window.hkmTx = window.hkmTx || function (no, en, es) { const l = (document.documentElement.lang || 'no').slice(0, 2); return l === 'en' ? en : l === 'es' ? (es == null ? en : es) : no; };
export class InteractionsManager {
    constructor(containerId, postId) {
        this.containerId = containerId;
        this.postId = postId;
        this.userId = null;
        try { this.userId = localStorage.getItem('hkm_anon_user_id'); } catch (_) {}
        
        this.likesCount = 0;
        this.isLiked = false;
        this.comments = [];
        
        this.unsubLikes = null;
        this.unsubComments = null;
        
        this._init();
    }
    
    _getOrGenerateUserId() {
        let uid = null;
        try {
            uid = localStorage.getItem('hkm_anon_user_id');
        } catch (e) {
            console.warn('[Interactions] Failed to read from localStorage:', e);
        }
        if (!uid) {
            uid = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            try {
                localStorage.setItem('hkm_anon_user_id', uid);
            } catch (e) {
                console.warn('[Interactions] Failed to write to localStorage:', e);
            }
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
            container.innerHTML = ("<div class=\"comments-empty\"><p>" + hkmTx("Interaksjoner er for øyeblikket utilgjengelige.", "Interactions are currently unavailable.", "Las interacciones no están disponibles en este momento.") + "</p></div>");
        }
    }
    
    renderShell(container) {
        container.innerHTML = `
            <div class="interactions-container">
                <!-- Likes -->
                <div class="likes-section">
                    <button id="interaction-like-btn" class="like-btn" aria-label="${hkmTx("Liker", "Like", "Me gusta")}">
                        <i class="fa-regular fa-heart"></i>
                        <span>${hkmTx("Liker", "Like", "Me gusta")}</span>
                    </button>
                    <span id="interaction-likes-count" class="likes-count-text">${hkmTx("Henter likes...", "Loading likes...", "Cargando me gusta...")}</span>
                </div>
                
                <!-- Comments -->
                <div class="comments-section">
                    <h3 class="comments-header">${hkmTx("Kommentarer", "Comments", "Comentarios")}</h3>
                    
                    <form id="interaction-comment-form" class="comment-form">
                        <div class="comment-input-group">
                            <label for="comment-name">${hkmTx("Ditt navn", "Your name", "Tu nombre")}</label>
                            <input type="text" id="comment-name" placeholder="${hkmTx("F.eks. Ola Nordmann", "E.g. John Smith", "Ej.: Juan Pérez")}" required />
                        </div>
                        <div class="comment-input-group">
                            <label for="comment-text">${hkmTx("Din kommentar", "Your comment", "Tu comentario")}</label>
                            <textarea id="comment-text" placeholder="${hkmTx("Hva synes du om dette?", "What do you think about this?", "¿Qué te parece esto?")}" required></textarea>
                        </div>
                        <button type="submit" class="comment-submit-btn" id="comment-submit-btn">
                            <span>${hkmTx("Publiser kommentar", "Post comment", "Publicar comentario")}</span>
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </form>
                    
                    <div id="interaction-comments-list" class="comments-list">
                        <!-- Loading or empty state -->
                        <div class="comments-empty">
                            <i class="fa-regular fa-comments"></i>
                            <p>${hkmTx("Ingen kommentarer enda. Bli den første til å kommentere!", "No comments yet. Be the first to comment!", "Aún no hay comentarios. ¡Sé el primero en comentar!")}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Restore name from localStorage if exists
        let savedName = null;
        try {
            savedName = sessionStorage.getItem('hkm_comment_name');
        } catch (e) {
            console.warn('[Interactions] Failed to read from localStorage:', e);
        }
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
        
        this.userId ||= this._getOrGenerateUserId();

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
                alert(hkmTx("Du har ikke tilgang til å like dette innlegget for øyeblikket.", "You cannot like this post right now.", "No puedes indicar que te gusta esta publicación en este momento."));
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
        
        this.userId ||= this._getOrGenerateUserId();

        // Save name for next time
        try {
            sessionStorage.setItem('hkm_comment_name', name);
        } catch (e) {
            console.warn('[Interactions] Failed to write to localStorage:', e);
        }
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = ("<i class=\"fas fa-spinner fa-spin\"></i> " + hkmTx("Publiserer...", "Posting...", "Publicando..."));
            
            await firebaseService.addComment(this.postId, {
                author_name: name,
                text: text,
                user_id: this.userId
            });
            
            textInput.value = ''; // clear text
        } catch (error) {
            console.error('[Interactions] Failed to post comment:', error);
            alert(hkmTx("Det skjedde en feil ved publisering av kommentaren. Prøv igjen senere.", "An error occurred while posting the comment. Please try again later.", "Se produjo un error al publicar el comentario. Inténtalo de nuevo más tarde."));
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = ("<span>" + hkmTx("Publiser kommentar", "Post comment", "Publicar comentario") + "</span> <i class=\"fas fa-paper-plane\"></i>");
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
            countText.textContent = hkmTx("Bli den første til å like dette", "Be the first to like this", "Sé el primero en indicar que te gusta");
        } else if (this.likesCount === 1) {
            countText.textContent = hkmTx("1 person liker dette", "1 person likes this", "A 1 persona le gusta esto");
        } else {
            countText.textContent = `${this.likesCount} ${hkmTx("personer liker dette", "people like this", "personas les gusta esto")}`;
        }
    }
    
    updateCommentsUI() {
        const list = document.getElementById('interaction-comments-list');
        if (!list) return;
        
        if (this.comments.length === 0) {
            list.innerHTML = `
                <div class="comments-empty">
                    <i class="far fa-comments"></i>
                    <p>${hkmTx("Ingen kommentarer enda. Bli den første til å kommentere!", "No comments yet. Be the first to comment!", "Aún no hay comentarios. ¡Sé el primero en comentar!")}</p>
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
        if (!timestamp) return hkmTx("Akkurat nå", "Just now", "Justo ahora");
        
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
        return date.toLocaleDateString(({ en: 'en-GB', es: 'es-ES' })[(document.documentElement.lang || 'no').slice(0, 2)] || 'nb-NO', { 
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
