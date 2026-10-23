// users and access methods for AdminManager.
export function createMethods1({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async getAdminAuthToken() {
      try {
        let user =
          typeof firebase !== "undefined" && firebase.auth
            ? firebase.auth().currentUser
            : null;
        if (!user && window.firebaseService && window.firebaseService.auth) {
          user = window.firebaseService.auth.currentUser;
        }
        if (!user && typeof firebase !== "undefined" && firebase.auth) {
          user = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 2500);
            const unsubscribe = firebase.auth().onAuthStateChanged((u) => {
              clearTimeout(timer);
              if (typeof unsubscribe === "function") unsubscribe();
              resolve(u);
            });
          });
        }
        if (user && typeof user.getIdToken === "function") {
          return await user.getIdToken();
        }
      } catch (e) {
        console.warn("[AdminManager] Kunne ikke hente admin auth-token:", e);
      }
      return null;
    },

    _ensureUsersRealtimeSubscription() {
      if (this._collectionRealtimeUnsubs.users || !firebaseService?.db) return;
      try {
        this._collectionRealtimeUnsubs.users = firebaseService.db
          .collection("users")
          .onSnapshot(
            () => {
              if (
                this.currentSection === "users" &&
                !this.currentUserDetailId
              ) {
                this.loadUsersList();
              }
              this._scheduleOverviewRefresh("users");
            },
            (err) =>
              console.warn("[AdminManager] users realtime sync failed:", err),
          );
      } catch (e) {
        console.warn("[AdminManager] Could not subscribe to users:", e);
      }
    },

    /**
     * Handle Admin Authentication & Roles
     */
    initAuth() {
      const bindAuthListener = () =>
        firebaseService.onAuthChange(async (user) => {
          if (this._pendingAuthRedirectTimer) {
            clearTimeout(this._pendingAuthRedirectTimer);
            this._pendingAuthRedirectTimer = null;
          }

          if (!user) {
            if (
              window.location.hostname === "127.0.0.1" ||
              window.location.hostname === "localhost"
            ) {
              console.log("Dev Mode: Bypassing auth for testing");
              this.userRole = "admin";
              this.initDashboard();
              return;
            }
            // Delay redirect slightly to avoid random logouts during transient auth/token refresh.
            this._pendingAuthRedirectTimer = setTimeout(() => {
              if (!firebaseService?.auth?.currentUser) {
                window.location.href = "/admin/login.html";
              }
            }, 2500);
            return;
          }

          try {
            // Fetch user role
            const role = await firebaseService.getUserRole(user.uid, {
              timeoutMs: 2500,
            });
            this.userRole = role;

            const hasAdminAccess =
              typeof adminUtils.isElevatedAdminRole === "function"
                ? adminUtils.isElevatedAdminRole(role)
                : ["editor", "admin", "superadmin"].includes(
                    String(role || "").toLowerCase(),
                  );

            // Strict RBAC: only allowed roles may access admin directory
            if (!hasAdminAccess) {
              console.warn("Access denied: User lacks admin role.");
              if (
                typeof adminUtils.redirectToMinSideWithAccessDenied ===
                "function"
              ) {
                adminUtils.redirectToMinSideWithAccessDenied({
                  path: "/minside/index.html",
                  message:
                    "Access Denied: Du har ikke administratorrettigheter til adminpanelet.",
                });
              } else {
                window.location.href = "/minside/index.html";
              }
              return;
            }

            await this.syncUserProfile(user, role);
            await this.updateUserInfo(user);
            this.applyRoleRestrictions(role);

            // Ensure existing Norwegian blog posts are fully translated to EN/ES.
            // Run once per browser/day to avoid unnecessary repeated writes.
            try {
              const todayKey = new Date().toISOString().slice(0, 10);
              const backfillKey = "hkm_blog_translation_backfill_last_run";
              const lastRun = localStorage.getItem(backfillKey);
              if (lastRun !== todayKey) {
                this.translateAllExistingBlogPosts({
                  force: true,
                  silent: true,
                })
                  .then(() => localStorage.setItem(backfillKey, todayKey))
                  .catch((err) =>
                    console.warn(
                      "[AdminManager] Forced blog translation backfill failed",
                      err,
                    ),
                  );
              }
            } catch (error) {
              console.warn(
                "[AdminManager] Could not schedule forced blog translation backfill",
                error,
              );
            }

            console.log(
              "[AdminManager] Admin access verified, removing cloak.",
            );
            this.removeSplashScreen();

            // Reload current section to ensure Firestore fetches succeed with authenticated user
            if (this.currentSection) {
              console.log(
                `[AdminManager] Reloading current section after auth verification: ${this.currentSection}`,
              );
              this.onSectionSwitch(this.currentSection);
            }
          } catch (error) {
            console.error("Error verifying admin role:", error);
            this.removeSplashScreen(); // Still remove cloak to show error UI
            // On error, steer to safety (public area)
            if (
              typeof adminUtils.redirectToMinSideWithAccessDenied === "function"
            ) {
              adminUtils.redirectToMinSideWithAccessDenied({
                path: "/minside/index.html",
                message:
                  "Tilgang kunne ikke verifiseres. Prøv igjen eller kontakt administrator.",
              });
            } else {
              window.location.href = "/minside/index.html";
            }
          }
        });

      const waitForFirebaseAuth = async (timeoutMs = 8000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          if (firebaseService.isInitialized) return true;
          if (
            typeof firebaseService.tryAutoInit === "function" &&
            firebaseService.tryAutoInit()
          )
            return true;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return firebaseService.isInitialized;
      };

      if (firebaseService.isInitialized) {
        bindAuthListener();
        return;
      }

      console.warn("⚠️ Firebase not initialized yet. Waiting for auth...");
      (async () => {
        const ready = await waitForFirebaseAuth();
        if (!ready) {
          console.warn("⚠️ Firebase auth failed to initialize in time.");
          this.showAlert(
            "Kunne ikke koble til innloggingstjenesten. Last inn siden på nytt.",
            "warning",
            10000,
          );
          return;
        }
        bindAuthListener();
      })();
    },

    applyRoleRestrictions(role) {
      console.log(`Applying restrictions for role: ${role}`);
      const ROLES = window.HKM_ROLES || {
        MEDLEM: "medlem",
        EDITOR: "editor",
        ADMIN: "admin",
        SUPERADMIN: "superadmin",
      };

      // 1. Sidebar Menu Filtering
      document.querySelectorAll(".nav-item").forEach((item) => {
        const section = item.querySelector("a")?.getAttribute("data-section");
        const link = item.querySelector("a")?.getAttribute("href");

        // Editor Restrictions: Only Blog, Overview, and Media
        if (role === ROLES.EDITOR) {
          const allowedSections = ["overview", "blog", "media"];
          const allowedLinks = []; // Strictly content only

          const isAllowed =
            allowedSections.includes(section) ||
            allowedLinks.some((l) => link && link.includes(l)) ||
            item.getAttribute("data-nav-category") === "all";

          if (!isAllowed) {
            item.style.display = "none";
          }
        }

        // Hide specific high-level management for non-superadmins
        if (role !== ROLES.SUPERADMIN) {
          const superAdminOnlySections = [
            "settings",
            "automation",
            "integrations",
          ];
          if (superAdminOnlySections.includes(section)) {
            item.style.display = "none";
          }
        }
      });

      // 2. Hide specific admin categories if they end up empty
      if (role === ROLES.EDITOR) {
        document.querySelectorAll(".nav-category-header").forEach((header) => {
          const cat = header.getAttribute("data-target-category");
          if (cat === "administrasjon" || cat === "nettsted") {
            // We keep 'nettsted' because Blog is there, but could hide others
          }
        });
      }

      // 3. Deletion Restrictions: Disable delete buttons for non-superadmins in certain contexts
      if (role !== ROLES.SUPERADMIN) {
        // We'll add classes to the body to help with CSS-based hiding of delete buttons
        document.body.classList.add("hide-critical-deletes");
      }
    },

    hasPermission(permissionKey) {
      const permissions = window.HKM_PERMISSIONS || {};
      const role =
        this.userRole ||
        (window.HKM_ROLES ? window.HKM_ROLES.MEDLEM : "medlem");
      const allowedRoles = permissions[permissionKey];
      if (!Array.isArray(allowedRoles)) return false;
      return allowedRoles.includes(role);
    },

    async syncUserProfile(user, currentRole = "medlem") {
      if (!user) return;
      const googleProvider = (user.providerData || []).find(
        (p) => p.providerId === "google.com",
      );

      try {
        console.log(
          `[AdminManager] Syncing profile for ${user.email} (UID: ${user.uid || "N/A"}) with Role: ${currentRole}`,
        );
        const userRef = firebaseService.db.collection("users").doc(user.uid);
        const userDoc = await userRef.get();

        const userData = {
          email: user.email || "",
          displayName:
            user.displayName || googleProvider?.displayName || user.email || "",
          photoURL: user.photoURL || googleProvider?.photoURL || "",
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // Only set role if the doc doesn't already exist or if we want to ensure superadmin status
        if (!userDoc.exists) {
          userData.role = currentRole;
          userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await userRef.set(userData);
          console.log(
            `[AdminManager] New user document created for ${user.email}`,
          );
        } else {
          // If it exists, we might still want to update role if currentRole is superadmin but doc says medlem
          const docData = userDoc.data();
          if (currentRole === "superadmin" && docData.role !== "superadmin") {
            userData.role = "superadmin";
          }
          // Also ensure createdAt exists for any reason
          if (!docData.createdAt) {
            userData.createdAt =
              firebase.firestore.FieldValue.serverTimestamp();
            console.log(
              `[AdminManager] Restored missing createdAt for ${user.email}`,
            );
          }
          await userRef.update(userData);
        }

        // Sync auth profile name/photo if missing but available in Google
        if (googleProvider && (!user.displayName || !user.photoURL)) {
          const authUpdates = {};
          if (!user.displayName && googleProvider.displayName)
            authUpdates.displayName = googleProvider.displayName;
          if (!user.photoURL && googleProvider.photoURL)
            authUpdates.photoURL = googleProvider.photoURL;
          if (Object.keys(authUpdates).length > 0) {
            await user.updateProfile(authUpdates);
          }
        }

        // Auto-register FCM token if notification permission is already granted
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted" &&
          firebase.messaging &&
          firebase.messaging.isSupported()
        ) {
          (async () => {
            try {
              const msg = firebase.messaging();
              const registration = await this._getAdminPushRegistration();
              const token = await msg.getToken({
                vapidKey:
                  "BI2k24dp-3eJWtLSPvGWQkD00A_duNRCIMY_2ozLFI0-anJDamFBALaTdtzGYQEkoFz8X0JxTcCX6tn3P_i0YrA",
                serviceWorkerRegistration: registration,
              });
              if (token) {
                await userRef.update({
                  fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
                  pushEnabled: true,
                });
                console.log("[AdminManager] Auto-registered FCM token:", token);
              }
            } catch (fcmErr) {
              console.warn(
                "[AdminManager] Auto FCM registration failed:",
                fcmErr.message,
              );
            }
          })();
        }

        // Store for blog author attribution
        this._lastKnownDisplayName = userData.displayName;
        this._lastKnownPhotoURL = userData.photoURL;
      } catch (e) {
        console.warn("Kunne ikke synkronisere brukerprofil i admin:", e);
      }
    },

    async updateUserInfo(user) {
      const adminName = document.getElementById("admin-name");
      const adminAvatar = document.getElementById("admin-avatar");
      const identityCacheKey = "hkm_admin_identity_cache";

      const renderHeaderIdentity = (name, photoURL) => {
        const safeName = (name || "").trim() || "Administrator";
        if (adminName) adminName.textContent = safeName;
        if (!adminAvatar) return;

        // Clear any previous state
        adminAvatar.textContent = "";
        adminAvatar.innerHTML = "";

        if (photoURL && photoURL.trim().length > 5) {
          // Show actual photo
          const img = document.createElement("img");
          img.src = photoURL;
          img.style.cssText =
            "width:100%; height:100%; object-fit:cover; border-radius:inherit;";

          // Fallback if image fails to load
          img.onerror = () => {
            adminAvatar.innerHTML = "";
            const initials = safeName
              .split(" ")
              .map((n) => n.trim())
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .toUpperCase();
            adminAvatar.textContent = (initials || "A").substring(0, 2);
          };

          adminAvatar.appendChild(img);
        } else {
          // Fallback: Use initials
          const initials = safeName
            .split(" ")
            .map((n) => n.trim())
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .toUpperCase();
          adminAvatar.textContent = (initials || "A").substring(0, 2);
        }
      };

      const cacheHeaderIdentity = (name, photoURL) => {
        try {
          localStorage.setItem(
            identityCacheKey,
            JSON.stringify({
              displayName: name || "",
              photoURL: photoURL || "",
              ts: Date.now(),
            }),
          );
        } catch (e) {
          // noop
        }
      };

      const withTimeout = async (promise, ms = 1500) => {
        let timerId;
        try {
          return await Promise.race([
            promise,
            new Promise((resolve) => {
              timerId = setTimeout(() => resolve(null), ms);
            }),
          ]);
        } finally {
          if (timerId) clearTimeout(timerId);
        }
      };

      // Immediate fallback from Auth to avoid visible "Laster..." while Firestore resolves.
      const authName = user?.displayName || user?.email || "Administrator";
      const authPhoto = user?.photoURL || "";
      renderHeaderIdentity(authName, authPhoto);
      cacheHeaderIdentity(authName, authPhoto);

      // Try load custom profile data
      let profile = null;
      let userProfile = null;
      try {
        const [profileRes, userDoc] = await Promise.all([
          withTimeout(firebaseService.getPageContent("settings_profile"), 1500),
          withTimeout(
            firebase.firestore().collection("users").doc(user.uid).get(),
            1500,
          ),
        ]);
        profile = profileRes;
        if (userDoc && userDoc.exists) userProfile = userDoc.data();
      } catch (e) {}

      const displayName =
        (userProfile && userProfile.displayName) ||
        user.displayName ||
        (profile && profile.fullName) ||
        user.email;
      const photoURL =
        (userProfile && userProfile.photoURL) ||
        user.photoURL ||
        (profile && profile.photoUrl);

      renderHeaderIdentity(displayName, photoURL);
      cacheHeaderIdentity(displayName, photoURL);

      // Store for blog author attribution
      this._lastKnownDisplayName = displayName;
      this._lastKnownPhotoURL = photoURL;

      // Profile trigger in dashboard header -> Open full profile section
      const profileTrigger = document.getElementById("admin-profile-trigger");
      if (profileTrigger && !profileTrigger.dataset.boundProfileNav) {
        profileTrigger.dataset.boundProfileNav = "1";
        profileTrigger.addEventListener("click", (e) => {
          e.preventDefault();
          window.location.hash = "profile";
        });
      }

      // Modal variables (if still used via other triggers)
      const profileModal = document.getElementById("profile-modal");
      const closeProfileModal = document.getElementById("close-profile-modal");
      const profileForm = document.getElementById("admin-modal-profile-form");

      if (profileModal && closeProfileModal) {
        closeProfileModal.onclick = () => {
          profileModal.style.display = "none";
        };
        // Lukk modal ved klikk utenfor innhold
        if (!profileModal.dataset.boundClick) {
          profileModal.dataset.boundClick = "1";
          profileModal.addEventListener("click", (e) => {
            if (e.target === profileModal) profileModal.style.display = "none";
          });
        }
        if (!this._boundProfileEsc) {
          this._boundProfileEsc = true;
          document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && profileModal.style.display === "flex") {
              profileModal.style.display = "none";
            }
          });
        }
      }

      if (profileForm && !profileForm.dataset.bound) {
        profileForm.dataset.bound = "1";
        profileForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          await this.saveAdminProfileModal(user);
        });
      }
    },

    openAdminProfileModal(user, profile) {
      const profileModal = document.getElementById("profile-modal");
      if (!profileModal) return;

      const displayName =
        profile.displayName || user.displayName || user.email || "Bruker";
      const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };

      setText("modal-admin-name", displayName);
      setText("modal-admin-role", "Administrator");
      setText("modal-admin-email", user.email || "");

      const modalAvatar = document.getElementById("modal-admin-avatar");
      if (modalAvatar) {
        modalAvatar.innerHTML = "";
        modalAvatar.textContent = "";
        if (profile.photoURL && profile.photoURL.trim().length > 5) {
          const img = document.createElement("img");
          img.src = profile.photoURL;
          img.alt = "Profile";
          img.style.cssText =
            "width: 100%; height: 100%; border-radius: inherit; object-fit: cover;";
          img.onerror = () => {
            modalAvatar.innerHTML = "";
            const initials = displayName
              .split(" ")
              .map((n) => n.trim())
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .toUpperCase();
            modalAvatar.textContent = (initials || "B").substring(0, 2);
          };
          modalAvatar.appendChild(img);
        } else {
          const initials = displayName
            .split(" ")
            .map((n) => n.trim())
            .filter(Boolean)
            .map((n) => n[0])
            .join("")
            .toUpperCase();
          modalAvatar.textContent = (initials || "B").substring(0, 2);
        }
      }

      setVal("admin-modal-display-name", displayName);
      setVal("admin-modal-phone", profile.phone || "");
      setVal("admin-modal-address", profile.address || "");
      setVal("admin-modal-bio", profile.bio || "");

      profileModal.style.display = "flex";
    },

    async saveAdminProfileModal(user) {
      const btn = document.getElementById("admin-modal-save-btn");
      const originalText = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Lagrer...";
      }

      try {
        const displayName = (
          document.getElementById("admin-modal-display-name").value || ""
        ).trim();
        const phone = (
          document.getElementById("admin-modal-phone").value || ""
        ).trim();
        const address = (
          document.getElementById("admin-modal-address").value || ""
        ).trim();
        const bio = (
          document.getElementById("admin-modal-bio").value || ""
        ).trim();

        if (displayName && displayName !== user.displayName) {
          await user.updateProfile({ displayName });
        }

        await firebase.firestore().collection("users").doc(user.uid).set(
          {
            displayName,
            phone,
            address,
            bio,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        await firebaseService.savePageContent("settings_profile", {
          fullName: displayName,
          phone,
          address,
          bio,
          updatedAt: new Date().toISOString(),
        });

        const profileModal = document.getElementById("profile-modal");
        if (profileModal) profileModal.style.display = "none";
        await this.updateUserInfo(user);
        this.showToast("Profil oppdatert.", "success", 4000);
      } catch (error) {
        console.error("Kunne ikke lagre admin-profil:", error);
        this.showToast("Kunne ikke lagre profil.", "error", 5000);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }
    },

    async logout() {
      try {
        await firebaseService.logout();
        window.location.href = "/admin/login.html";
      } catch (error) {
        console.error("Error signing out:", error);
        this.showToast("Failed to log out. Please try again.", "error", 5000);
      }
    },

    async loadAllUsers() {
      if (this.allUsersData) return; // Use cache if available
      try {
        const snapshot = await firebaseService.db
          .collection("users")
          .orderBy("createdAt", "desc")
          .get();
        const users = [];
        snapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() });
        });
        this.allUsersData = users; // Cache for filtering
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    },

    _updateGoogleAuthUI() {
      const authContainer = document.getElementById("google-auth-status");
      if (!authContainer) return;

      authContainer.innerHTML = this.googleAccessToken
        ? `
            <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                <span class="material-symbols-outlined" style="color: #16a34a; pointer-events: none;">check_circle</span>
                <div style="flex: 1; pointer-events: none;">
                    <p style="font-size: 13px; font-weight: 600; color: #166534; margin: 0;">Tilkoblet Google</p>
                    <p style="font-size: 11px; color: #15803d; margin: 0;">Skrivetilgang er aktivert</p>
                </div>
                <button id="disconnect-google" class="btn btn-outline" style="color: #dc2626; border-color: #fca5a5; font-size: 12px; padding: 4px 8px;">Koble fra</button>
            </div>
        `
        : `
            <button class="btn btn-outline" id="connect-google-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="Google" style="pointer-events: none;">
                <span style="pointer-events: none;">Koble til Google for skrivetilgang</span>
            </button>
        `;

      // Direct listener registration to bypass browser popup blocker rules
      const connectBtn = document.getElementById("connect-google-btn");
      if (connectBtn) {
        connectBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleGoogleAuth();
        });
      }

      const disconnectBtn = document.getElementById("disconnect-google");
      if (disconnectBtn) {
        disconnectBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleGoogleDisconnect();
        });
      }
    },

    handleGoogleAuth() {
      if (this._googleAuthConnecting) return;

      const btn = document.getElementById("connect-google-btn");
      if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kobler til...';
      }

      this._googleAuthConnecting = true;
      firebaseService
        .connectToGoogle()
        .then((result) => {
          this.googleAccessToken = result.accessToken;
          this.showToast(
            "Tilkoblet Google! Du har nå skrivetilgang.",
            "success",
          );
          this._updateGoogleAuthUI();
        })
        .catch((error) => {
          console.error("Google connection failed:", error);
          this.showToast(
            "Kunne ikke koble til Google: " + (error.message || "Ukjent feil"),
            "error",
          );
          this._updateGoogleAuthUI();
        })
        .finally(() => {
          this._googleAuthConnecting = false;
        });
    },

    handleManualSaleUserSelect(userId) {
      const user = userId ? this.adminUserMap?.get(userId) : null;
      const nameInput = document.getElementById("manual-sale-buyer-name");
      const emailInput = document.getElementById("manual-sale-buyer-email");
      if (!user) return;

      if (nameInput) {
        nameInput.value =
          user.displayName ||
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.email ||
          "";
      }
      if (emailInput) emailInput.value = user.email || "";
    },

    matchBankImportUser(row) {
      const users = Array.from(this.adminUserMap?.values?.() || []);
      const haystack =
        `${row.donorName || ""} ${row.donorEmail || ""} ${row.text || ""} ${row.reference || ""}`.toLowerCase();
      const emailMatch = haystack.match(
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
      );
      if (emailMatch) {
        const user = users.find(
          (candidate) =>
            String(candidate.email || "").toLowerCase() ===
            emailMatch[0].toLowerCase(),
        );
        if (user) return { user, label: `E-post: ${user.email}` };
      }

      const normalizedReference = String(row.reference || "").replace(
        /\D/g,
        "",
      );
      if (normalizedReference) {
        const user = users.find((candidate) => {
          const refs = [
            candidate.kid,
            candidate.donationKid,
            candidate.giverKid,
            candidate.membershipNumber,
            candidate.customerNumber,
          ]
            .map((value) => String(value || "").replace(/\D/g, ""))
            .filter(Boolean);
          return refs.includes(normalizedReference);
        });
        if (user)
          return { user, label: `Referanse/KID: ${normalizedReference}` };
      }

      const donorName = String(row.donorName || "")
        .trim()
        .toLowerCase();
      if (donorName && donorName.length >= 5) {
        const user = users.find((candidate) => {
          const name = String(
            candidate.displayName ||
              candidate.fullName ||
              `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim(),
          ).toLowerCase();
          return (
            name &&
            (name === donorName ||
              donorName.includes(name) ||
              name.includes(donorName))
          );
        });
        if (user)
          return {
            user,
            label: `Navn: ${user.displayName || user.fullName || user.email}`,
          };
      }

      return null;
    },

    async _requestAdminPushPermission(uid) {
      try {
        if (!("Notification" in window)) return;
        if (!firebase.messaging || !firebase.messaging.isSupported()) return;
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
        const msg = firebase.messaging();
        // Use the existing admin PWA service worker registration to avoid collisions
        const registration = await this._getAdminPushRegistration();
        const token = await msg.getToken({
          vapidKey:
            "BI2k24dp-3eJWtLSPvGWQkD00A_duNRCIMY_2ozLFI0-anJDamFBALaTdtzGYQEkoFz8X0JxTcCX6tn3P_i0YrA",
          serviceWorkerRegistration: registration,
        });
        if (token) {
          await firebase
            .firestore()
            .collection("users")
            .doc(uid)
            .update({
              fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
            });
        }
      } catch (e) {
        console.warn("admin push permission:", e);
      }
    },

    async renderUsersSection() {
      const section = document.getElementById("users-section");
      if (!section) return;

      // If a user is selected, render the detail view instead of the list
      if (this.currentUserDetailId) {
        await this.renderUserDetailView(this.currentUserDetailId);
        return;
      }

      section.innerHTML = `
            <div class="design-ui-shell">
                <div class="design-ui-workspace">
                    <div class="design-ui-panel">
                        <div class="user-admin-panel-header">
                            <div class="user-admin-header-title-wrap">
                                <h3 class="design-ui-panel-title" style="margin: 0;">Aktive brukere</h3>
                                <span class="status-badge" id="user-count-badge" style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 12px;">- BRUKERE</span>
                            </div>
                            <div class="user-admin-controls">
                                <div class="user-admin-search-wrap">
                                    <span class="material-symbols-outlined search-icon">search</span>
                                    <input type="text" id="user-search-input" class="form-control user-search-input" placeholder="Søk etter brukere...">
                                </div>
                                <button type="button" id="add-user-btn" class="btn btn-primary add-user-header-btn" onclick="window.adminManager.openAddUserModal()">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
                                    Ny bruker
                                </button>
                            </div>
                        </div>
                        <div class="design-ui-panel-body p-0" id="users-list-container" style="padding: 0;">
                            <div class="loader" style="margin: 24px auto;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

      section.setAttribute("data-rendered", "true");

      const searchInput = document.getElementById("user-search-input");
      if (searchInput) {
        searchInput.oninput = (e) => {
          const query = e.target.value.trim().toLowerCase();
          this.filterUsers(query);
        };
      }

      this._ensureUsersRealtimeSubscription();
      await this.loadUsersList();
    },

    openAddUserModal() {
      const existing = document.getElementById("add-user-modal");
      if (existing) existing.remove();

      const ROLES = window.HKM_ROLES || {
        MEDLEM: "medlem",
        EDITOR: "editor",
        ADMIN: "admin",
        SUPERADMIN: "superadmin",
      };

      const rolesOptions = Object.values(ROLES)
        .map(
          (role) =>
            `<option value="${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</option>`,
        )
        .join("");

      const modal = document.createElement("div");
      modal.id = "add-user-modal";
      modal.className = "hkm-add-user-modal-overlay";
      modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(4px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        `;

      modal.innerHTML = `
            <div class="hkm-add-user-modal-card" style="background: #ffffff; border-radius: 20px; width: 100%; max-width: 520px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden; display: flex; flex-direction: column; animation: modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="modal-card-header" style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #f8fafc;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(209, 125, 57, 0.12); color: #d17d39; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span class="material-symbols-outlined" style="font-size: 22px;">person_add</span>
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #0f172a;" class="modal-card-title">Legg til ny bruker</h3>
                            <p style="margin: 2px 0 0 0; font-size: 12.5px; color: #64748b;" class="modal-card-desc">Opprett profil og tildel rettigheter</p>
                        </div>
                    </div>
                    <button type="button" class="modal-close-btn" style="background: #f1f5f9; border: none; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s ease;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
                    </button>
                </div>
                
                <form id="modal-add-user-form" style="padding: 24px; display: flex; flex-direction: column; gap: 18px; margin: 0;">
                    <div class="form-group" style="display: flex; flex-direction: column; gap: 6px; margin: 0;">
                        <label style="font-size: 13px; font-weight: 700; color: #334155;" class="form-label-txt">Fullt navn</label>
                        <input type="text" name="displayName" class="form-control add-user-input" placeholder="f.eks. Ola Nordmann" required style="padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; outline: none;">
                    </div>
                    <div class="form-group" style="display: flex; flex-direction: column; gap: 6px; margin: 0;">
                        <label style="font-size: 13px; font-weight: 700; color: #334155;" class="form-label-txt">E-post *</label>
                        <input type="email" name="email" class="form-control add-user-input" placeholder="ola@eksempel.no" required style="padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; outline: none;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="form-group" style="display: flex; flex-direction: column; gap: 6px; margin: 0;">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;" class="form-label-txt">Telefonnr</label>
                            <input type="tel" name="phone" class="form-control add-user-input" placeholder="900 00 000" style="padding: 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; outline: none;">
                        </div>
                        <div class="form-group" style="display: flex; flex-direction: column; gap: 6px; margin: 0;">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;" class="form-label-txt">Rolle / Tilgang</label>
                            <select name="role" class="form-control add-user-input" style="padding: 10px 42px 10px 14px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; background-color: #ffffff; cursor: pointer;">
                                ${rolesOptions}
                            </select>
                        </div>
                    </div>

                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; display: flex; gap: 12px; align-items: flex-start;" class="add-user-warning-box">
                        <span class="material-symbols-outlined" style="color: #d97706; font-size: 20px; flex-shrink: 0; margin-top: 1px;">priority_high</span>
                        <div>
                            <h4 style="font-size: 12.5px; font-weight: 800; color: #92400e; margin: 0 0 2px 0;" class="warning-title">VIKTIG!</h4>
                            <p style="font-size: 12px; line-height: 1.5; color: #b45309; margin: 0;" class="warning-desc">Når du legger til en bruker her, må de fortsatt registrere seg eller du må sende dem en invitasjon for at de skal kunne logge inn.</p>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 6px; padding-top: 16px; border-top: 1px solid #f1f5f9;" class="modal-card-footer">
                        <button type="button" class="modal-cancel-btn" style="padding: 10px 20px; border-radius: 999px; border: 1px solid #cbd5e1; background: transparent; font-weight: 600; font-size: 13.5px; color: #475569; cursor: pointer; transition: all 0.2s ease;">
                            Avbryt
                        </button>
                        <button type="submit" class="btn btn-primary" style="padding: 10px 24px; border-radius: 999px; border: none; background: linear-gradient(135deg, #d17d39, #bd4f2a); font-weight: 700; font-size: 13.5px; color: #ffffff; cursor: pointer; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.3); display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">add</span> Legg til bruker
                        </button>
                    </div>
                </form>
            </div>
        `;

      document.body.appendChild(modal);

      const closeModal = () => modal.remove();
      modal.querySelector(".modal-close-btn").onclick = closeModal;
      modal.querySelector(".modal-cancel-btn").onclick = closeModal;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      const form = modal.querySelector("#modal-add-user-form");
      form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          role: formData.get("role"),
          phone: formData.get("phone"),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.textContent = "Lagrer...";

        try {
          await this.saveUser(null, data);
          closeModal();
        } catch (err) {
          console.error("Feil ved lagring av bruker:", err);
          this.showToast(
            "Kunne ikke legge til bruker: " + err.message,
            "error",
          );
        } finally {
          if (document.body.contains(modal)) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
          }
        }
      };
    },

    async loadUsersList() {
      const container = document.getElementById("users-list-container");
      if (!container) return;

      try {
        // Fetch all without orderBy to avoid exclusion of docs with missing fields
        const snapshot = await firebaseService.db.collection("users").get();
        const users = [];
        snapshot.forEach((doc) => {
          users.push({ id: doc.id, ...doc.data() });
        });

        console.log(
          `[AdminManager] Firing renderUsersTable with ${users.length} users.`,
        );

        // In-memory sort
        users.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        this.allUsersData = users; // Cache for filtering

        const searchInput = document.getElementById("user-search-input");
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        if (query) {
          const filtered = users.filter((user) => {
            const name = (
              user.displayName ||
              user.fullName ||
              ""
            ).toLowerCase();
            const email = (user.email || "").toLowerCase();
            const phone = (user.phone || "").toLowerCase();
            const role = (user.role || "").toLowerCase();
            return (
              name.includes(query) ||
              email.includes(query) ||
              phone.includes(query) ||
              role.includes(query)
            );
          });
          this.renderUsersTable(filtered);
        } else {
          this.renderUsersTable(users);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        container.innerHTML = `<p class="empty-text">Kunne ikke laste brukere: ${error.message}</p>`;
      }
    },

    filterUsers(query) {
      if (!this.allUsersData) return;
      if (!query) {
        this.renderUsersTable(this.allUsersData);
        return;
      }

      const filtered = this.allUsersData.filter((user) => {
        const name = (user.displayName || user.fullName || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        const phone = (user.phone || "").toLowerCase();
        const role = (user.role || "").toLowerCase();
        return (
          name.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          role.includes(query)
        );
      });

      this.renderUsersTable(filtered);
    },

    renderUsersTable(users) {
      const container = document.getElementById("users-list-container");
      const badge = document.getElementById("user-count-badge");
      if (!container) return;

      // Update badge
      if (badge) {
        badge.textContent = `${users.length} ${users.length === 1 ? "BRUKER" : "BRUKERE"}`;
      }

      // Remove loader
      container.classList.remove("loader");
      container.innerHTML = "";

      if (users.length === 0) {
        container.innerHTML =
          '<p class="empty-text" style="padding: 24px; color: var(--text-muted); text-align: center;">Ingen brukere funnet.</p>';
        return;
      }
      const roleLabels = {
        superadmin: "Systemansvarlig",
        admin: "Administrator",
        editor: "Redaktør",
        medlem: "Medlem",
        pastor: "Pastor",
        leder: "Leder",
        frivillig: "Frivillig",
      };

      const canDelete =
        this.userRole === (window.HKM_ROLES?.SUPERADMIN || "superadmin");
      const rowsHtml = users
        .map((user) => {
          const name = user.displayName || user.fullName || "Ukjent Navn";
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
          const role = String(user.role || "medlem");
          const roleLabel =
            roleLabels[role.toLowerCase()] ||
            role.charAt(0).toUpperCase() + role.slice(1);
          const email = user.email || "Ingen e-post";
          const phoneCountryCode = user.phoneCountryCode || "";
          const phoneText = [phoneCountryCode, user.phone]
            .filter(Boolean)
            .join(" ")
            .trim();
          const createdAt = user.createdAt?.toDate?.()
            ? user.createdAt.toDate()
            : user.createdAt
              ? new Date(user.createdAt)
              : null;
          const createdText =
            createdAt && !Number.isNaN(createdAt.getTime())
              ? createdAt.toLocaleDateString("no-NO")
              : "—";

          return `
                <tr data-user-id="${user.id}">
                    <td style="white-space: nowrap; min-width: 180px;">
                        <div class="user-info-cell" style="display: flex; align-items: center; gap: 10px; white-space: nowrap;">
                            <div class="user-avatar-sm" style="width: 36px; height: 36px; min-width: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #e2e8f0; font-weight: 700; font-size: 13px; color: #475569; overflow: hidden; flex-shrink: 0;">
                                ${
                                  user.photoURL
                                    ? `<img src="${this.escapeHtml(user.photoURL)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                                    : this.escapeHtml(initials)
                                }
                            </div>
                            <div style="min-width: 0; white-space: nowrap;">
                                <div class="user-name" style="font-weight: 700; font-size: 13.5px; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(name)}</div>
                                <div class="text-muted" style="font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(email)}</div>
                            </div>
                        </div>
                    </td>
                    <td style="white-space: nowrap;"><span class="badge status-automated" style="white-space: nowrap;">${this.escapeHtml(roleLabel)}</span></td>
                    <td style="white-space: nowrap;">${phoneText ? this.escapeHtml(phoneText) : '<span class="text-muted">—</span>'}</td>
                    <td style="white-space: nowrap;">${createdText}</td>
                    <td class="col-actions" style="white-space: nowrap; text-align: right;">
                        <button class="btn btn-outline edit-user-btn" type="button" data-id="${user.id}" style="white-space: nowrap;">Rediger</button>
                        ${
                          canDelete
                            ? `
                            <button class="icon-btn delete-user-btn danger" type="button" data-id="${user.id}" title="Slett">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        `
                            : ""
                        }
                    </td>
                </tr>
            `;
        })
        .join("");

      container.innerHTML = `
            <div class="table-container" style="overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;">
                <table class="crm-table" style="min-width: 620px; width: 100%;">
                    <thead>
                        <tr>
                            <th style="white-space: nowrap;">Bruker</th>
                            <th style="white-space: nowrap;">Rolle</th>
                            <th style="white-space: nowrap;">Telefon</th>
                            <th style="white-space: nowrap;">Opprettet</th>
                            <th class="col-actions" style="white-space: nowrap; text-align: right;">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;

      container.querySelectorAll(".edit-user-btn").forEach((btn) => {
        btn.onclick = () => {
          const userId = btn.dataset.id;
          this.currentUserDetailId = userId;
          this.userEditMode = false;
          this.renderUsersSection();
        };
      });

      container.querySelectorAll(".delete-user-btn").forEach((btn) => {
        btn.onclick = () => {
          const userId = btn.dataset.id;
          const user = users.find((u) => u.id === userId);
          this.showDeleteUserConfirmationModal(
            userId,
            user?.displayName || user?.fullName || "bruker",
          );
        };
      });
    },

    showDeleteUserConfirmationModal(userId, userName) {
      // Remove existing if any
      const existing = document.getElementById("hkm-delete-modal-overlay");
      if (existing) existing.remove();

      const warningMsg = `Er du sikker på at du vil slette brukeren "${userName}" fra oversikten? Dette sletter kun profildata i Firestore og kan ikke angres.`;

      const modalHtml = `
                                                                            <div id="hkm-delete-modal-overlay" class="hkm-modal-overlay">
                                                                                <div class="hkm-modal-container">
                                                                                    <div class="hkm-modal-icon">
                                                                                        <span class="material-symbols-outlined">warning</span>
                                                                                    </div>
                                                                                    <h3 class="hkm-modal-title">\u26A0\uFE0F Slett bruker?</h3>
                                                                                    <p class="hkm-modal-message">${warningMsg}</p>
                                                                                    <div class="hkm-modal-actions">
                                                                                        <button id="hkm-modal-cancel" class="hkm-modal-btn hkm-modal-btn-cancel">Avbryt</button>
                                                                                        <button id="hkm-modal-confirm" class="hkm-modal-btn hkm-modal-btn-delete">Slett bruker</button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);

      const overlay = document.getElementById("hkm-delete-modal-overlay");
      const cancelBtn = document.getElementById("hkm-modal-cancel");
      const confirmBtn = document.getElementById("hkm-modal-confirm");

      // Close on cancel or overlay click
      const closeModal = () => {
        overlay.classList.remove("active");
        setTimeout(() => overlay.remove(), 200);
      };

      cancelBtn.onclick = closeModal;
      overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
      };

      // Confirm deletion
      confirmBtn.onclick = async () => {
        if (
          !confirm(
            "ER DU HELT SIKKER? Dette vil permanent slette brukerens profildata. Denne handlingen er 100% permanent og kan ikke angres.",
          )
        )
          return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Sletter...";
        await this.deleteUser(userId);
        closeModal();
      };

      // Show with animation
      requestAnimationFrame(() => {
        overlay.classList.add("active");
      });
    },

    filterUsersTable(query) {
      if (!this.allUsersData) return;
      const filtered = this.allUsersData.filter((user) => {
        const name = (user.displayName || user.fullName || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
      });
      this.renderUsersTable(filtered);
    },

    openUserModal(userData = null) {
      const modalId = "user-edit-modal";
      let modal = document.getElementById(modalId);

      if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "profile-modal";
        modal.style.cssText =
          "display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.25); z-index:2000; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;";
        document.body.appendChild(modal);
      }

      const ROLES = window.HKM_ROLES || {
        MEDLEM: "medlem",
        EDITOR: "editor",
        ADMIN: "admin",
        SUPERADMIN: "superadmin",
      };
      const rolesOptions = Object.values(ROLES)
        .map(
          (role) =>
            `<option value="${role}" ${userData && userData.role === role ? "selected" : ""}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`,
        )
        .join("");

      const esc = (v) => this.escapeHtml(v || "");
      const phoneCountryCode = userData
        ? userData.phoneCountryCode ||
          (String(userData.phone || "")
            .trim()
            .startsWith("+")
            ? ""
            : "+47")
        : "+47";
      const phoneCountryOptions = this._getPhoneCountries()
        .map(([iso, dial, name]) => {
          const selected = dial === phoneCountryCode ? "selected" : "";
          return `<option value="${esc(dial)}" data-country="${esc(iso)}" ${selected}>${esc(`${dial} ${name}`)}</option>`;
        })
        .join("");

      modal.innerHTML = `
                                                                            <div class="profile-modal-content" style="background:#fff; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.15); padding:32px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; position:relative;">
                                                                                <button class="close-modal-btn" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:22px; cursor:pointer; color:#888;">&times;</button>
                                                                                <h3 style="font-size:20px; font-weight:700; margin-bottom:20px;">${userData ? "Rediger bruker" : "Opprett ny bruker"}</h3>

                                                                                <form id="user-edit-form" style="display:grid; gap:16px;">
                                                                                    <input type="hidden" name="id" value="${userData ? userData.id : ""}">

                                                                                        <div class="form-group">
                                                                                            <label>Fullt navn</label>
                                                                                            <input type="text" name="displayName" class="form-control" value="${userData ? userData.displayName || userData.fullName || "" : ""}" required>
                                                                                        </div>

                                                                                        <div class="form-group">
                                                                                            <label>E-post</label>
                                                                                            <input type="email" name="email" class="form-control" value="${userData ? userData.email || "" : ""}" required ${userData ? "readonly" : ""}>
                                                                                                ${!userData ? '<p class="helper-text">Brukeren må fortsatt registrere seg selv via "Min Side" for å kunne logge inn.</p>' : ""}
                                                                                        </div>

                                                                                        <div class="form-group">
                                                                                            <label>Rolle / Tilgangsnivå</label>
                                                                                            <select name="role" class="form-control">
                                                                                                ${rolesOptions}
                                                                                            </select>
                                                                                        </div>

                                                                                        <div class="form-group">
                                                                                            <label>Telefon</label>
                                                                                            <div style="display:flex; gap:8px;">
                                                                                                <select name="phoneCountryCode" class="form-control" style="width:145px; flex-shrink:0;">
                                                                                                    ${phoneCountryOptions}
                                                                                                </select>
                                                                                                <input type="tel" name="phone" class="form-control" value="${userData ? userData.phone || "" : ""}">
                                                                                            </div>
                                                                                        </div>

                                                                                        <div class="form-group" style="position:relative;">
                                                                                            <label>Adresse</label>
                                                                                            <input type="text" id="modal-address-input" name="address" class="form-control" value="${userData ? userData.address || "" : ""}" placeholder="Søk etter adresse...">
                                                                                            <div id="modal-address-search-status" style="font-size:12px; color:var(--text-muted); margin-top:4px;"></div>
                                                                                            <div id="modal-address-search-results" class="admin-address-search-results"></div>
                                                                                        </div>

                                                                                        <div class="form-grid-2 zip-city">
                                                                                            <div class="form-group">
                                                                                                <label>Postnummer</label>
                                                                                                <input type="text" name="zip" class="form-control" value="${userData ? userData.zip || "" : ""}">
                                                                                            </div>
                                                                                            <div class="form-group">
                                                                                                <label>Poststed</label>
                                                                                                <input type="text" name="city" class="form-control" value="${userData ? userData.city || "" : ""}">
                                                                                            </div>
                                                                                        </div>

                                                                                        <div class="form-group">
                                                                                            <label>Land</label>
                                                                                            <input type="text" name="country" class="form-control" value="${userData ? userData.country || "" : ""}">
                                                                                        </div>

                                                                                        <div class="form-grid-2">
                                                                                            <div class="form-group">
                                                                                                <label>Fødselsdato</label>
                                                                                                <input type="date" name="birthdate" class="form-control" value="${userData ? userData.birthdate || "" : ""}">
                                                                                            </div>
                                                                                            <div class="form-group">
                                                                                                <label>Medlemsnummer</label>
                                                                                                <input type="text" name="membershipNumber" class="form-control" value="${userData ? userData.membershipNumber || "" : ""}">
                                                                                            </div>
                                                                                        </div>

                                                                                        <div class="form-group">
                                                                                            <label>Interne notater</label>
                                                                                            <textarea name="adminNotes" class="form-control" style="min-height:80px; resize:vertical;">${userData ? userData.adminNotes || "" : ""}</textarea>
                                                                                        </div>

                                                                                        <div class="form-group">
                                                                                            <label>Fødselsnummer (11 siffer - for skattefradrag)</label>
                                                                                            <input type="text" name="ssn" class="form-control" value="${userData ? userData.ssn || userData.nationalIdNumber || "" : ""}" placeholder="00000000000" maxlength="11" autocomplete="off">
                                                                                                <p class="helper-text">Lagres sikkert i Firestore for rapportering til Skatteetaten (11 siffer).</p>
                                                                                        </div>

                                                                                        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
                                                                                            <button type="button" class="btn-cancel" style="padding:10px 20px; border-radius:8px; border:1px solid #e2e8f0; background:none; cursor:pointer;">Avbryt</button>
                                                                                            <button type="submit" class="btn-primary">Lagre endringer</button>
                                                                                        </div>
                                                                                </form>
                                                                            </div>
                                                                            `;

      modal.style.display = "flex";
      this._wireAdminAddressAutocomplete(
        "modal-address-input",
        "modal-address-search-results",
        "modal-address-search-status",
        "#user-edit-form",
      );

      const closeBtn = modal.querySelector(".close-modal-btn");
      const cancelBtn = modal.querySelector(".btn-cancel");
      const form = modal.querySelector("#user-edit-form");

      const closeModal = () => (modal.style.display = "none");
      closeBtn.onclick = closeModal;
      cancelBtn.onclick = closeModal;
      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };

      form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const ssnVal = formData.get("ssn") || "";
        const data = {
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          role: formData.get("role"),
          phone: formData.get("phone"),
          phoneCountryCode: formData.get("phoneCountryCode"),
          address: formData.get("address"),
          zip: formData.get("zip"),
          city: formData.get("city"),
          country: formData.get("country"),
          birthdate: formData.get("birthdate"),
          membershipNumber: formData.get("membershipNumber"),
          adminNotes: formData.get("adminNotes"),
          ssn: ssnVal,
          nationalIdNumber: ssnVal,
        };
        const userId = formData.get("id");
        await this.saveUser(userId, data);
        closeModal();
      };
    },

    async renderUserDetailView(userId) {
      const section = document.getElementById("users-section");
      if (!section) return;

      section.innerHTML = `
            <div style="display: flex; justify-content: flex-start; margin-bottom: 24px;">
                <button id="back-to-users-btn" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 8px;">
                    <span class="material-symbols-outlined">arrow_back</span> Tilbake til oversikt
                </button>
            </div>
            <div id="user-detail-container" class="loader"></div>
        `;

      const backBtn = document.getElementById("back-to-users-btn");
      if (backBtn) {
        backBtn.onclick = () => {
          this.currentUserDetailId = null;
          this.userEditMode = false;
          this.renderUsersSection();
        };
      }

      const container = document.getElementById("user-detail-container");
      try {
        const doc = await firebaseService.db
          .collection("users")
          .doc(userId)
          .get();
        if (!doc.exists) {
          container.innerHTML =
            '<p class="error-text">Bruker ble ikke funnet.</p>';
          return;
        }
        const userData = { id: doc.id, ...doc.data() };
        if (container && container.classList) {
          container.classList.remove("loader");
        }
        this.renderUserDetailLayout(container, userData);
      } catch (err) {
        console.error("Error loading user details:", err);
        container.innerHTML = `<p class="error-text">Feil ved lasting av brukerdetaljer: ${err.message}</p>`;
      }
    },

    renderUserDetailLayout(container, userData) {
      const name = userData.displayName || userData.fullName || "Ukjent Navn";
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
      const ROLES = window.HKM_ROLES || {
        MEDLEM: "medlem",
        EDITOR: "editor",
        ADMIN: "admin",
        SUPERADMIN: "superadmin",
      };
      const rolesOptions = Object.values(ROLES)
        .map(
          (role) =>
            `<option value="${role}" ${userData.role === role ? "selected" : ""}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`,
        )
        .join("");

      const esc = (v) => this.escapeHtml(v || "");
      const phoneCountryCode =
        userData.phoneCountryCode ||
        (String(userData.phone || "")
          .trim()
          .startsWith("+")
          ? ""
          : "+47");
      const phoneCountryOptions = this._getPhoneCountries()
        .map(([iso, dial, name]) => {
          const selected = dial === phoneCountryCode ? "selected" : "";
          return `<option value="${esc(dial)}" data-country="${esc(iso)}" ${selected}>${esc(`${dial} ${name}`)}</option>`;
        })
        .join("");

      container.innerHTML = `
                                                                            <div style="width: 100%;">
                                                                                <div class="card" style="margin-bottom: 24px;">
                                                                                    <div class="card-body profile-header-card-body">
                                                                                        <div class="user-avatar-lg" style="width: 100px; height: 100px; font-size: 36px; position: relative; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; ${userData.photoURL ? `background-image: url('${userData.photoURL}'); background-size: cover; background-position: center;` : "background-color: var(--accent-color);"}">
                                                                                            ${!userData.photoURL ? initials : ""}
                                                                                            ${
                                                                                              this
                                                                                                .userEditMode
                                                                                                ? `
                                <div id="change-photo-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; border-radius: inherit; cursor: pointer; color: white;">
                                    <span class="material-symbols-outlined">photo_camera</span>
                                </div>
                                <input type="file" id="user-photo-input" style="display: none;" accept="image/*">
                            `
                                                                                                : ""
                                                                                            }
                                                                                        </div>
                                                                                        <div class="profile-header-info" style="flex:1;">
                                                                                            <div class="profile-header-meta-row" style="display:flex; justify-content:space-between; align-items:flex-start;">
                                                                                                <div>
                                                                                                    <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${this.escapeHtml(name)}</h3>
                                                                                                    <p style="color: var(--text-muted); font-size: 15px;">${this.escapeHtml(userData.email || "Ingen e-post")}</p>
                                                                                                </div>
                                                                                                <div style="display:flex; gap:12px; flex-shrink: 0;">
                                                                                                    ${
                                                                                                      !this
                                                                                                        .userEditMode
                                                                                                        ? `
                                        <button id="activate-edit-btn" class="btn-secondary">
                                            <span class="material-symbols-outlined">edit</span>
                                            Aktiver redigering
                                        </button>
                                    `
                                                                                                        : `
                                        <button id="cancel-edit-btn" class="action-btn">
                                            Avbryt
                                        </button>
                                        <button id="save-user-detail-btn" class="btn-primary">
                                            Lagre endringer
                                        </button>
                                    `
                                                                                                    }
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="profile-header-badge-row" style="margin-top:16px; display:flex; gap:16px;">
                                                                                                <span class="role-badge role-badge-${userData.role || "medlem"}">${(userData.role || "medlem").toUpperCase()}</span>
                                                                                                <span style="font-size:13px; color:var(--text-muted);">Opprettet: ${userData.createdAt ? (userData.createdAt.toDate ? userData.createdAt.toDate().toLocaleDateString("no-NO") : new Date(userData.createdAt).toLocaleDateString("no-NO")) : "Ukjent"}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                ${
                                                                                  this
                                                                                    .userEditMode
                                                                                    ? `
                    <div id="upload-progress-container" style="display: none; margin-bottom: 24px;">
                        <div style="height: 4px; background: #eee; border-radius: 2px; overflow: hidden;">
                            <div id="upload-progress-bar" style="height: 100%; background: var(--accent-color); width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Laster opp bilde...</p>
                    </div>
                `
                                                                                    : ""
                                                                                }

                                                                                <form id="user-detail-form" class="${!this.userEditMode ? "readonly-form" : ""}">
                                                                                    <input type="hidden" name="id" value="${userData.id}">

                                                                                        <div class="grid-2-cols equal" style="margin-bottom: 24px; gap: 24px;">
                                                                                            <div class="card">
                                                                                                <div class="card-header"><h4 class="card-title">Personalia</h4></div>
                                                                                                <div class="card-body">
                                                                                                    <div class="form-group">
                                                                                                        <label>Fullt navn</label>
                                                                                                        <input type="text" name="displayName" class="form-control" value="${this.escapeHtml(name)}" ${!this.userEditMode ? "disabled" : ""} required>
                                                                                                    </div>
                                                                                                    <div class="form-group">
                                                                                                        <label>E-post (kun lesetilgang)</label>
                                                                                                        <input type="email" class="form-control" value="${this.escapeHtml(userData.email || "")}" disabled>
                                                                                                    </div>
                                                                                                    <div class="form-group">
                                                                                                        <label>Telefon</label>
                                                                                                        ${
                                                                                                          this
                                                                                                            .userEditMode
                                                                                                            ? `
                                                                                                            <div style="display:flex; gap:8px;">
                                                                                                                <select name="phoneCountryCode" class="form-control" style="width:145px; flex-shrink:0;">
                                                                                                                    ${phoneCountryOptions}
                                                                                                                </select>
                                                                                                                <input type="tel" name="phone" class="form-control" value="${this.escapeHtml(userData.phone || "")}">
                                                                                                            </div>
                                                                                                        `
                                                                                                            : `
                                                                                                            <input type="text" class="form-control" value="${this.escapeHtml([userData.phoneCountryCode, userData.phone].filter(Boolean).join(" "))}" disabled>
                                                                                                        `
                                                                                                        }
                                                                                                    </div>
                                                                                                    <div class="form-group">
                                                                                                        <label>Fødselsdato</label>
                                                                                                        <input type="date" name="birthdate" class="form-control" value="${userData.birthdate || ""}" ${!this.userEditMode ? "disabled" : ""}>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div class="card">
                                                                                                <div class="card-header"><h4 class="card-title">Adresse</h4></div>
                                                                                                <div class="card-body">
                                                                                                    <div class="form-group" style="position:relative;">
                                                                                                        <label>Gateadresse</label>
                                                                                                        <input type="text" id="detail-address-input" name="address" class="form-control" value="${this.escapeHtml(userData.address || "")}" ${!this.userEditMode ? "disabled" : ""} placeholder="Søk etter adresse...">
                                                                                                        ${
                                                                                                          this
                                                                                                            .userEditMode
                                                                                                            ? `
                                                                                                            <div id="detail-address-search-status" style="font-size:12px; color:var(--text-muted); margin-top:4px;"></div>
                                                                                                            <div id="detail-address-search-results" class="admin-address-search-results"></div>
                                                                                                        `
                                                                                                            : ""
                                                                                                        }
                                                                                                    </div>
                                                                                                    <div class="form-grid-2 zip-city">
                                                                                                        <div class="form-group">
                                                                                                            <label>Postnr</label>
                                                                                                            <input type="text" name="zip" class="form-control" value="${this.escapeHtml(userData.zip || "")}" ${!this.userEditMode ? "disabled" : ""}>
                                                                                                        </div>
                                                                                                        <div class="form-group">
                                                                                                            <label>Sted</label>
                                                                                                            <input type="text" name="city" class="form-control" value="${this.escapeHtml(userData.city || "")}" ${!this.userEditMode ? "disabled" : ""}>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div class="form-group">
                                                                                                        <label>Land</label>
                                                                                                        <input type="text" name="country" class="form-control" value="${this.escapeHtml(userData.country || "")}" ${!this.userEditMode ? "disabled" : ""}>
                                                                                                    </div>
                                                                                                    <div class="form-group">
                                                                                                        <label>Fødselsnummer (kun for skattefradrag)</label>
                                                                                                        <input type="password" name="ssn" class="form-control" value="${userData.ssn || ""}" placeholder="11 siffer" maxlength="11" autocomplete="off" ${!this.userEditMode ? "disabled" : ""}>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div class="grid-2-cols equal" style="gap: 24px;">
                                                                                            <div class="card">
                                                                                                <div class="card-header"><h4 class="card-title">Medlemskap & Tilgang</h4></div>
                                                                                                <div class="card-body">
                                                                                                    <div class="form-group">
                                                                                                        <label>Rolle / Tilgangsnivå</label>
                                                                                                        <select name="role" class="form-control" ${!this.userEditMode ? "disabled" : ""}>
                                                                                                            ${rolesOptions}
                                                                                                        </select>
                                                                                                    </div>
                                                                                                    <div class="form-group">
                                                                                                        <label>Medlemsnummer</label>
                                                                                                        <input type="text" name="membershipNumber" class="form-control" value="${this.escapeHtml(userData.membershipNumber || "")}" ${!this.userEditMode ? "disabled" : ""}>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div class="card">
                                                                                                <div class="card-header"><h4 class="card-title">Interne notater</h4></div>
                                                                                                <div class="card-body">
                                                                                                    <div class="form-group">
                                                                                                        <label>Notater (kun synlig for admin)</label>
                                                                                                        <textarea name="adminNotes" class="form-control" style="min-height:120px;" ${!this.userEditMode ? "disabled" : ""}>${this.escapeHtml(userData.adminNotes || "")}</textarea>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div class="card" style="margin-top: 24px;">
                                                                                            <div class="card-header">
                                                                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                                                                     <span class="material-symbols-outlined" style="color: var(--accent-color); margin: 0 !important; display: flex; align-items: center;">mail</span>
                                                                                                     <h4 class="card-title" style="margin: 0 !important; line-height: 1 !important;">Kommunikasjon</h4>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="card-body">
                                                                                                <div class="form-group">
                                                                                                    <label>Send e-post til bruker</label>
                                                                                                    <input type="text" id="manual-email-subject" class="form-control" placeholder="Emne..." style="margin-bottom:12px;">
                                                                                                        <textarea id="manual-email-message" class="form-control" style="min-height:150px;" placeholder="Skriv meldingen her..."></textarea>
                                                                                                </div>
                                                                                                <div style="display:flex; justify-content:flex-end; margin-top:16px;">
                                                                                                    <button type="button" id="send-manual-email-btn" class="btn-primary">
                                                                                                        <span class="material-symbols-outlined">send</span>
                                                                                                        Send e-post
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                </form>
                                                                            </div>
                                                                            `;

      // Event Listeners
      if (this.userEditMode) {
        const overlay = document.getElementById("change-photo-overlay");
        const fileInput = document.getElementById("user-photo-input");
        if (overlay && fileInput) {
          overlay.onclick = () => fileInput.click();
          fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
              await this.handleUserPhotoUpload(userData.id, file);
            }
          };
        }
        this._wireAdminAddressAutocomplete(
          "detail-address-input",
          "detail-address-search-results",
          "detail-address-search-status",
          "#user-detail-form",
        );
      }

      const activateEditBtn = document.getElementById("activate-edit-btn");
      if (activateEditBtn) {
        activateEditBtn.onclick = () => {
          this.userEditMode = true;
          this.renderUserDetailLayout(container, userData);
        };
      }

      const cancelEditBtn = document.getElementById("cancel-edit-btn");
      if (cancelEditBtn) {
        cancelEditBtn.onclick = () => {
          this.userEditMode = false;
          this.renderUserDetailLayout(container, userData);
        };
      }

      const saveBtn = document.getElementById("save-user-detail-btn");
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const form = document.getElementById("user-detail-form");
          const formData = new FormData(form);
          const ssnVal = formData.get("ssn") || "";
          const updates = {
            displayName: formData.get("displayName"),
            phone: formData.get("phone"),
            phoneCountryCode: formData.get("phoneCountryCode"),
            gender: userData.gender || null, // preserve or null
            birthdate: formData.get("birthdate"),
            address: formData.get("address"),
            zip: formData.get("zip"),
            city: formData.get("city"),
            country: formData.get("country"),
            ssn: ssnVal,
            nationalIdNumber: ssnVal,
            membershipNumber: formData.get("membershipNumber"),
            role: formData.get("role"),
            adminNotes: formData.get("adminNotes"),
          };

          saveBtn.disabled = true;
          saveBtn.textContent = "Lagrer...";

          try {
            await this.saveUser(userData.id, updates);
            this.userEditMode = false;
            // reload details to reflect fresh data
            await this.renderUserDetailView(userData.id);
          } catch (e) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Lagre endringer";
          }
        };
      }

      const sendMailBtn = document.getElementById("send-manual-email-btn");
      if (sendMailBtn) {
        sendMailBtn.onclick = async () => {
          const subject = document.getElementById("manual-email-subject").value;
          const message = document.getElementById("manual-email-message").value;

          if (!subject || !message) {
            this.showToast(
              "Vennligst fyll ut både emne og melding.",
              "warning",
            );
            return;
          }

          sendMailBtn.disabled = true;
          const originalText = sendMailBtn.innerHTML;
          sendMailBtn.innerHTML =
            '<span class="material-symbols-outlined">sync</span> Sender...';

          try {
            await this.sendEmailToUser(userData.email, subject, message);
            document.getElementById("manual-email-subject").value = "";
            document.getElementById("manual-email-message").value = "";
          } finally {
            sendMailBtn.disabled = false;
            sendMailBtn.innerHTML = originalText;
          }
        };
      }
    },
  };
}
