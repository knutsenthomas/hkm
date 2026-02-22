// ===================================
// Firebase Service Wrapper (Compat Version)
// ===================================

class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
        this.auth = null;
        this.storage = null;
        this.isInitialized = false;

        // Try load from localStorage first
        const savedConfig = localStorage.getItem('hkm_firebase_config');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                this.init(config);
                return;
            } catch (e) {
                console.error("Local config error:", e);
            }
        }

        // Only initialize if static config is provided
        if (window.firebaseConfig && window.firebaseConfig.apiKey !== "YOUR_API_KEY") {
            this.init(window.firebaseConfig);
        }
    }

    init(config) {
        try {
            // Check if firebase is available globally (from script tag)
            if (typeof firebase === 'undefined') {
                console.error("❌ Firebase SDK not found. Make sure compat scripts are loaded.");
                return;
            }

            // In Compat mode, we check if app is already initialized
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(config);
            } else {
                this.app = firebase.app();
            }

            this.db = firebase.firestore();
            this.auth = firebase.auth();
            this.storage = firebase.storage();
            this.isInitialized = true;
            console.log("✅ Firebase initialized (Compat)");

            // Enable offline persistence for faster subsequent loads
            this.db.enablePersistence().catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn("[FirebaseService] Persistence failed (multiple tabs open)");
                } else if (err.code === 'unimplemented') {
                    console.warn("[FirebaseService] Persistence not supported by browser");
                }
            });
        } catch (error) {
            console.error("❌ Firebase initialization failed:", error);
        }
    }

    /**
     * Get content for a specific page section
     * @param {string} pageId - e.g., 'index'
     */
    async getPageContent(pageId) {
        if (!this.isInitialized) return null;

        try {
            // Use cache-first intelligence (removed source: 'server' for speed)
            const docSnap = await this.db.collection("content").doc(pageId).get();
            if (docSnap.exists) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error(`❌ Failed to load content for page '${pageId}':`, error);
            return null;
        }
    }

    /**
     * Save/Update page content
     * @param {string} pageId 
     * @param {object} data 
     */
    async updatePageContent(pageId, data) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        await this.db.collection("content").doc(pageId).set(data, { merge: true });
    }

    async savePageContent(pageId, data) {
        return this.updatePageContent(pageId, data);
    }

    /**
     * Subscribe to real-time content updates
     * @param {string} pageId 
     * @param {function} callback 
     */
    subscribeToPage(pageId, callback) {
        if (!this.isInitialized) return null;

        try {
            return this.db.collection("content").doc(pageId).onSnapshot((doc) => {
                if (doc.exists) {
                    callback(doc.data());
                }
            });
        } catch (error) {
            console.error(`❌ Failed to subscribe to page '${pageId}':`, error);
            return null;
        }
    }

    /**
     * Auth Methods
     */
    async login(email, password) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        return this.auth.signInWithEmailAndPassword(email, password);
    }

    async loginWithGoogle() {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const provider = new firebase.auth.GoogleAuthProvider();
        return this.auth.signInWithPopup(provider);
    }

    async logout() {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        return this.auth.signOut();
    }

    /**
     * User Roles & Profile
     */
    async register(email, password) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Initialize user document with 'medlem' role
        await this.db.collection('users').doc(user.uid).set({
            email: user.email,
            role: 'medlem',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return userCredential;
    }

    async getUserRole(uid) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const fallbackSuperadmins = ['thomas@hiskingdomministry.no'];
        const currentUser = this.auth && this.auth.currentUser ? this.auth.currentUser : null;
        if (currentUser && fallbackSuperadmins.includes((currentUser.email || '').toLowerCase())) {
            return 'superadmin';
        }
        const doc = await this.db.collection('users').doc(uid).get();
        if (doc.exists) {
            const rawRole = doc.data().role;
            if (typeof rawRole === 'string' && rawRole.trim()) {
                return rawRole.trim().toLowerCase();
            }
            return 'medlem';
        }
        return 'medlem'; // Default fallback
    }

    async sendEmailVerification() {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const user = this.auth.currentUser;
        if (user) {
            return user.sendEmailVerification();
        }
        throw new Error("Ingen bruker er logget inn");
    }

    async updatePhoneNumber(phone) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const user = this.auth.currentUser;
        if (!user) throw new Error("Ingen bruker er logget inn");

        // Note: For actual phone auth, we need Recaptcha and verifyPhoneNumber
        // This method updates the phone number field in the users collection
        return this.db.collection('users').doc(user.uid).update({
            phone: phone,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    /**
     * Storage Methods
     */
    async uploadImage(file, path, options = {}) {
        if (!this.isInitialized) throw new Error("Firebase not initialized");
        const storageRef = this.storage.ref(path);
        const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : 45000;

        return new Promise((resolve, reject) => {
            const uploadTask = storageRef.put(file);
            let didTimeout = false;

            const timeoutId = setTimeout(() => {
                didTimeout = true;
                uploadTask.cancel();
                reject(new Error('Upload timeout'));
            }, timeoutMs);

            uploadTask.on(
                'state_changed',
                null,
                (error) => {
                    clearTimeout(timeoutId);
                    if (!didTimeout) reject(error);
                },
                async () => {
                    clearTimeout(timeoutId);
                    try {
                        const url = await storageRef.getDownloadURL();
                        resolve(url);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    onAuthChange(callback) {
        if (!this.isInitialized) return;
        this.auth.onAuthStateChanged(callback);
    }
}

// Global instance
window.firebaseService = new FirebaseService();
