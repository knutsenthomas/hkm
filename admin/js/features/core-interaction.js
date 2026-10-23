// core interaction methods for AdminManager.
export function createMethods3({ firebaseService, adminUtils, showErrorUI }) {
  return {
    init() {
      console.log("Initializing AdminManager...");

      if (!firebaseService) {
        throw new Error("Firebase Service er ikke lastet!");
      }

      // Initialize global notifications if not already available
      if (!window.hkm_notifications) {
        console.log("Global notifications not found, initializing...");
        // The notifications.js should already be loaded, but as a fallback:
        const container = document.querySelector(".toast-container");
        if (container) this.toastContainer = container;
        else {
          this.toastContainer = document.createElement("div");
          this.toastContainer.className = "toast-container";
          document.body.appendChild(this.toastContainer);
        }
      } else {
        this.toastContainer = window.hkm_notifications.toastContainer;
      }

      this.initAuth();
      this.initDashboard();
      this.initMessageListener();
      this.initWidgetConfig();
      this.injectAddressSearchStyles();

      // Expose to window for the inline navigation script
      window.adminManager = this;
      console.log("AdminManager initialized successfully.");

      // Robust initial section switch on startup to prevent race conditions
      const hash = window.location.hash.substring(1);
      const rememberedSection = sessionStorage.getItem(
        "hkm_admin_last_dashboard_section",
      );
      const initialSection = hash || rememberedSection || "overview";
      if (initialSection && initialSection !== "overview") {
        console.log(
          `[AdminManager] Auto-triggering initial section switch on startup: ${initialSection}`,
        );
        setTimeout(() => {
          if (typeof window.handleSectionSwitch === "function") {
            window.handleSectionSwitch(initialSection);
          } else {
            this.onSectionSwitch(initialSection);
          }
        }, 100);
      }

      // Auto-cleanup trigger if hash is present
      if (window.location.hash === "#force-wix-cleanup") {
        console.log("[Auto-Cleanup] Triggered via hash!");
        setTimeout(() => this.performWixDatabaseCleanup(), 2000);
      }

      // Safety fallback: never reveal seeded HTML; show a neutral loading state instead.
      setTimeout(() => {
        if (!document.body.classList.contains("cloak")) return;
        if (this._initialOverviewRenderComplete) {
          this.removeSplashScreen();
          return;
        }
        this.renderOverviewLoadingState();
        this.removeSplashScreen();
      }, 6000);
    },

    /**
     * Show a prominent alert (Modal-like toast)
     */
    showAlert(message, type = "warning", duration = 8000) {
      this.showToast(message, type, duration);
    },

    /**
     * Executes a task while holding a write lock to prevent race conditions.
     */
    async _runWriteLocked(lockKey, callback) {
      if (this._pendingWriteLocks.has(lockKey)) {
        this.showToast(
          "En lagringsoperasjon pågår allerede. Vent et øyeblikk.",
          "warning",
          3500,
        );
        return;
      }
      this._pendingWriteLocks.add(lockKey);
      try {
        return await callback();
      } finally {
        this._pendingWriteLocks.delete(lockKey);
      }
    },

    /**
     * Executes an async callback while showing a loading state on the provided button.
     */
    async _withButtonLoading(btn, callback, options = {}) {
      if (!btn) return await callback();
      const utils = window.HKMAdminUtils || {};
      if (typeof utils.withButtonLoading === "function") {
        return await utils.withButtonLoading(btn, callback, options);
      }
      return await callback();
    },

    /**
     * Shows a premium confirmation modal.
     */
    showConfirm(
      title,
      message,
      confirmText = "Bekreft",
      cancelText = "Avbryt",
    ) {
      return new Promise((resolve) => {
        let modal = document.getElementById("hkm-confirm-modal");
        if (!modal) {
          modal = document.createElement("div");
          modal.id = "hkm-confirm-modal";
          modal.className = "profile-modal";
          modal.style.cssText = `
                    display: none;
                    z-index: 999999;
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.65);
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    padding: 16px;
                `;
          const isDark =
            document.documentElement.getAttribute("data-theme") === "dark";
          const cardBg = isDark ? "#1e293b" : "#ffffff";
          const subTextColor = isDark ? "#cbd5e1" : "#475569";
          const footerBg = isDark ? "#0f172a" : "#f8fafc";
          const borderColor = isDark ? "#334155" : "#e2e8f0";

          modal.innerHTML = `
                    <div class="profile-modal-content card modern" style="max-width: 420px; width: 100%; height: auto !important; min-height: 0 !important; flex: 0 1 auto !important; margin: auto !important; padding: 0; overflow: hidden; border-radius: 20px; background: ${cardBg}; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35); display: flex; flex-direction: column; border: 1px solid ${borderColor};">
                        <div class="modal-header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px 24px; display: flex; align-items: center; gap: 14px; border-bottom: none;">
                            <div style="background: rgba(255,255,255,0.2); width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <span class="material-symbols-outlined" style="font-size: 22px; color: white;">delete</span>
                            </div>
                            <h3 id="confirm-modal-title" style="margin: 0; font-size: 18px; font-weight: 700; color: white; letter-spacing: -0.01em;">${this.escapeHtml ? this.escapeHtml(title) : title}</h3>
                        </div>
                        <div class="modal-body" style="padding: 24px; font-size: 15px; line-height: 1.5; color: ${subTextColor};">
                            <p id="confirm-modal-message" style="margin: 0; font-weight: 500;">${this.escapeHtml ? this.escapeHtml(message) : message}</p>
                        </div>
                        <div class="modal-footer" style="padding: 16px 24px; background: ${footerBg}; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid ${borderColor};">
                            <button id="confirm-modal-cancel" type="button" class="btn-secondary" style="padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: 1px solid ${borderColor}; background: transparent; color: ${subTextColor}; font-size: 14px;">${cancelText}</button>
                            <button id="confirm-modal-confirm" type="button" class="btn-primary" style="padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; background: #ef4444; color: white; border: none; font-size: 14px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">${confirmText}</button>
                        </div>
                    </div>
                `;
          document.body.appendChild(modal);
        }

        const titleEl = modal.querySelector("#confirm-modal-title");
        const messageEl = modal.querySelector("#confirm-modal-message");
        const confirmBtn = modal.querySelector("#confirm-modal-confirm");
        const cancelBtn = modal.querySelector("#confirm-modal-cancel");
        const headerEl = modal.querySelector(".modal-header");

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        if (cancelBtn) {
          if (cancelText) {
            cancelBtn.style.display = "block";
            cancelBtn.textContent = cancelText;
          } else {
            cancelBtn.style.display = "none";
          }
        }

        if (confirmBtn) {
          confirmBtn.textContent = confirmText;
          if (/slett/i.test(confirmText) || /slett/i.test(title)) {
            confirmBtn.style.background = "#ef4444";
            if (headerEl)
              headerEl.style.background =
                "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
          } else {
            const orangeGradient =
              "linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%)";
            confirmBtn.style.background = orangeGradient;
            if (headerEl) headerEl.style.background = orangeGradient;
          }
        }

        const cleanup = () => {
          modal.style.display = "none";
          if (confirmBtn) confirmBtn.onclick = null;
          if (cancelBtn) cancelBtn.onclick = null;
        };

        if (confirmBtn) {
          confirmBtn.onclick = (e) => {
            e.preventDefault();
            cleanup();
            resolve(true);
          };
        }

        if (cancelBtn) {
          cancelBtn.onclick = (e) => {
            e.preventDefault();
            cleanup();
            resolve(false);
          };
        }

        modal.style.display = "flex";
      });
    },

    /**
     * Shows a premium prompt modal with an input field.
     */
    showPrompt(
      title,
      message,
      defaultValue = "",
      placeholder = "E-postadresse...",
    ) {
      return new Promise((resolve) => {
        const modal = document.getElementById("hkm-prompt-modal");
        if (!modal) {
          resolve(prompt(message, defaultValue));
          return;
        }

        const titleEl = document.getElementById("prompt-modal-title");
        const messageEl = document.getElementById("prompt-modal-message");
        const inputEl = document.getElementById("prompt-modal-input");
        const confirmBtn = document.getElementById("prompt-modal-confirm");
        const cancelBtn = document.getElementById("prompt-modal-cancel");

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (inputEl) {
          inputEl.value = defaultValue;
          inputEl.placeholder = placeholder;
        }

        const cleanup = () => {
          modal.style.display = "none";
          confirmBtn.onclick = null;
          cancelBtn.onclick = null;
          inputEl.onkeydown = null;
        };

        const handleConfirm = () => {
          const val = inputEl.value ? inputEl.value.trim() : "";
          cleanup();
          resolve(val);
        };

        confirmBtn.onclick = (e) => {
          e.preventDefault();
          handleConfirm();
        };

        cancelBtn.onclick = (e) => {
          e.preventDefault();
          cleanup();
          resolve(null);
        };

        inputEl.onkeydown = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleConfirm();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cleanup();
            resolve(null);
          }
        };

        modal.style.display = "flex";
        if (inputEl) {
          setTimeout(() => inputEl.focus(), 100);
        }
      });
    },

    removeSplashScreen() {
      // Since splash screen is removed, we just remove the cloak to reveal the UI
      document.body.classList.remove("cloak");
      console.log("UI revealed (cloak removed)");
    },

    _hashString(value) {
      const text = String(value || "");
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      return String(hash);
    },

    showToast(message, type = "success", duration = 5000) {
      if (window.showToast) {
        window.showToast(message, type, duration);
      } else {
        console.log("Fallback showToast:", message);
        // Re-implement basic one if global missing (shouldn't happen)
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-content"><p class="toast-message">${message}</p></div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
      }
    },

    filterSidebar(category) {
      // Disabled per request, all items always visible
    },

    /**
     * Called by the inline navigation script in index.html
     */
    onSectionSwitch(sectionId) {
      if (typeof window.triggerProgressAnimation === "function") {
        window.triggerProgressAnimation();
      }
      console.log(`[AdminManager] Switching to section: ${sectionId}`);
      this.currentSection = sectionId;

      // HKM Studio: Capture pending creation request from studio cards
      const createSection = sessionStorage.getItem(
        "hkm_admin_create_item_state",
      );
      if (createSection === sectionId) {
        sessionStorage.removeItem("hkm_admin_create_item_state");
        setTimeout(() => {
          this.addNewItem(sectionId);
        }, 600);
      }

      // Update currentMediaPath based on section to ensure media library stays in sync
      const sectionMap = {
        blog: "editor/blog/",
        events: "editor/events/",
        teaching: "editor/teaching/",
        media: "editor/",
        podcast: "editor/podcast/",
        hero: "hero/",
        courses: "editor/courses/",
        automation: "editor/automation/",
        "reading-plans": "editor/reading-plans/",
        content: "editor/index/", // Default for static content
      };

      if (sectionMap[sectionId]) {
        this.currentMediaPath = sectionMap[sectionId];
      }

      const section = document.getElementById(`${sectionId}-section`);
      if (!section) {
        console.warn(
          `[AdminManager] ⚠️ Section element not found: ${sectionId}-section`,
        );
        return;
      }

      const alreadyRendered = section.getAttribute("data-rendered") === "true";
      console.log(
        `[AdminManager] Section ${sectionId} alreadyRendered: ${alreadyRendered}`,
      );

      if (alreadyRendered) {
        if (sectionId === "overview") {
          this.renderOverview();
        } else if (
          ["blog", "events", "teaching", "comments"].includes(sectionId)
        ) {
          if (sectionId === "comments") {
            this.loadComments();
          } else {
            this.loadCollection(sectionId);
          }
        } else if (sectionId === "courses") {
          this._loadCoursesList();
        } else if (sectionId === "users" && !this.currentUserDetailId) {
          this.loadUsersList();
        } else if (sectionId === "media") {
          this.loadMediaLibrary();
        } else if (sectionId === "podcast") {
          this.loadPodcastEpisodes();
        } else if (sectionId === "integrations") {
          this.loadMediaSettings();
          this._loadIntegrationsSettings();
        }
      }

      if (
        section.getAttribute("data-rendered") !== "true" ||
        sectionId === "integrations"
      ) {
        console.log(`[AdminManager] Initializing render for: ${sectionId}`);
        switch (sectionId) {
          case "content":
            this.renderContentEditor();
            break;
          case "blog":
            this.renderCollectionEditor("blog", "Blogginnlegg");
            break;
          case "events":
            this.renderCollectionEditor("events", "Arrangementer");
            break;

          case "media":
            this.renderMediaLibrarySection();
            break;
          case "integrations":
            this.renderIntegrationsSection();
            break;
          case "app":
            this.renderAppSection();
            break;
          case "school-payments":
            import("../skolebetalinger.js")
              .then((module) =>
                module.mountSchoolPayments(
                  section.querySelector(".school-finance"),
                ),
              )
              .catch((error) => {
                console.error("Kunne ikke åpne skolebetalinger:", error);
                section.querySelector('[role="status"]').textContent =
                  "Kunne ikke åpne skolebetalinger. Last siden på nytt.";
              });
            break;
          case "causes":
            this.renderCausesManager();
            break;
          case "shop":
            this.renderShopManager();
            break;
          case "hero":
            this.renderHeroManager();
            break;
          case "teaching":
            this.renderTeachingManager();
            break;
          case "courses":
            this.renderCoursesManager();
            break;
          case "design":
            this.renderDesignSection();
            break;
          case "profile":
            this.renderProfileSection();
            break;
          case "seo":
            this.renderSEOSection();
            break;
          case "overview":
            this.renderOverview();
            break;
          case "settings":
            this.renderSettingsSection();
            break;
          case "users":
            this.currentUserDetailId = null;
            this.userEditMode = false;
            this.renderUsersSection();
            break;
          case "automation":
            this.renderAutomationSection();
            break;
          case "comments":
            this.renderCommentsSection();
            break;
          case "podcast":
            this.renderPodcastSection();
            break;
          case "kommunikasjon":
            this.renderKommunikasjonSection();
            break;
          case "reading-plans":
            this.renderReadingPlansManager();
            break;
        }
      }

      // Check for pending AI Drafts
      this._checkPendingAiDrafts(sectionId);
    },

    async _checkPendingAiDrafts(sectionId) {
      try {
        const raw = sessionStorage.getItem("pendingAiDraft");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.type !== sectionId) return; // Not for this section

        // Clear immediately to prevent infinite triggers!
        sessionStorage.removeItem("pendingAiDraft");

        // Create and append the premium brand loading overlay
        const loaderOverlay = document.createElement("div");
        loaderOverlay.id = "ai-generation-overlay";
        loaderOverlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
        loaderOverlay.innerHTML = `
                <div class="card" style="padding: 40px !important; text-align: center !important; max-width: 480px !important; width: 90% !important; height: auto !important; min-height: auto !important; border-radius: 24px !important; background: var(--admin-surface, white) !important; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important; transform: scale(0.9); transition: transform 0.3s ease; box-sizing: border-box !important;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 24px; background: linear-gradient(135deg, #d17d39, #bd4f2a); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(209, 125, 57, 0.25);">
                        <span class="material-symbols-outlined" style="font-size: 36px; color: white; animation: spin 2s linear infinite;">auto_awesome</span>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 800; color: var(--admin-text, #1e293b); margin: 0 0 12px; font-family: 'Inter', sans-serif !important;">Oppretter AI-utkast</h3>
                    <p style="font-size: 14px; color: var(--admin-text-muted, #64748b); font-weight: 500; margin: 0 0 24px; line-height: 1.6; font-family: 'Inter', sans-serif !important;">Vennligst vent mens vår AI-assistent skriver et engasjerende blogginnlegg for <strong>"${this.escapeHtml(parsed.title)}"</strong>. Dette tar normalt 5-10 sekunder.</p>
                    <div style="width: 100%; height: 6px; background: var(--admin-border, #e2e8f0); border-radius: 3px; overflow: hidden; position: relative;">
                        <div style="position: absolute; top: 0; bottom: 0; left: 0; width: 40%; background: linear-gradient(90deg, #d17d39, #bd4f2a); border-radius: 3px; animation: loading-bar 1.5s infinite ease-in-out;"></div>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes loading-bar {
                        0% { left: -40%; width: 40%; }
                        50% { width: 60%; }
                        100% { left: 100%; width: 40%; }
                    }
                </style>
            `;
        document.body.appendChild(loaderOverlay);
        setTimeout(() => {
          loaderOverlay.style.opacity = "1";
          loaderOverlay.querySelector(".card").style.transform = "scale(1)";
        }, 50);

        // Call the AI Process to generate the draft
        const callable = firebase.functions().httpsCallable("aiProcess");
        const response = await callable({
          task: "generate_blog_draft",
          prompt: parsed.prompt,
          options: {
            type: sectionId === "teaching" ? "undervisning" : "blogginnlegg",
          },
        });

        const data = response.data;
        if (data && data.blocks && Array.isArray(data.blocks)) {
          // Determine user profile author details if logged in
          let currentAuthor = "AI-Assistent";
          let currentAuthorPhoto = "";
          const currentUser = firebase.auth().currentUser;
          if (currentUser) {
            currentAuthor =
              this._lastKnownDisplayName ||
              currentUser.displayName ||
              currentUser.email;
            currentAuthorPhoto =
              this._lastKnownPhotoURL || currentUser.photoURL || "";
          }

          // Create persistent newItem
          const newItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: (parsed.title || "").replace(/Ă/g, "Å").replace(/ă/g, "å"),
            date: new Date().toISOString().split("T")[0],
            content: data, // EditorJS blocks
            published: false, // Utkast
            author: currentAuthor,
            authorPhoto: currentAuthorPhoto,
            category: sectionId === "teaching" ? "Undervisning" : "Blogg",
            imageUrl: "",
            tags: [],
            dashboardEdited: true,
            dashboardEditedAt: new Date().toISOString(),
          };

          // Get the current list from Firestore, unshift, and save back immediately
          firebaseService.invalidatePageContentCache(`collection_${sectionId}`);
          const currentData = await firebaseService.getPageContent(
            `collection_${sectionId}`,
          );
          const list = this._getSafeCollectionListForSave(
            sectionId,
            currentData,
          );
          list.unshift(newItem);

          await firebaseService.savePageContent(`collection_${sectionId}`, {
            items: list,
          });

          // Sync the local memory cache and trigger list refresh
          this._collectionItemsCache[sectionId] = list;
          this.currentItems = list;
          this.renderItems(sectionId, list);

          // Fade out and remove the loader
          loaderOverlay.style.opacity = "0";
          loaderOverlay.querySelector(".card").style.transform = "scale(0.9)";
          setTimeout(() => {
            loaderOverlay.remove();
          }, 300);

          // Immediately open the editor for this item
          this.showToast(`AI-utkast opprettet og lagret!`, "success", 5000);
          setTimeout(() => {
            this.editCollectionItem(sectionId, 0);
          }, 400);
        } else {
          throw new Error("Feil format på AI-svar.");
        }
      } catch (error) {
        console.error("Failed to process pending AI draft:", error);
        const overlay = document.getElementById("ai-generation-overlay");
        if (overlay) overlay.remove();
        this.showToast(
          `Kunne ikke generere AI-utkast: ${error.message || error}`,
          "error",
          5000,
        );
      }
    },

    getSectionIcon(sectionId) {
      return window.HKMAdminUtils.getSectionIcon(sectionId);
    },

    renderSectionHeader(
      icon,
      title,
      subtitle,
      actionsHtml = "",
      subtitleId = "",
    ) {
      return window.HKMAdminUtils.renderSectionHeader(
        icon,
        title,
        subtitle,
        actionsHtml,
        subtitleId,
      );
    },

    async _promiseWithTimeout(promise, timeoutMs = 5000) {
      let timerId;
      const timeoutSymbol = Symbol("timeout");
      try {
        const result = await Promise.race([
          promise,
          new Promise((resolve) => {
            timerId = setTimeout(() => resolve(timeoutSymbol), timeoutMs);
          }),
        ]);
        return {
          timedOut: result === timeoutSymbol,
          value: result === timeoutSymbol ? null : result,
        };
      } finally {
        if (timerId) clearTimeout(timerId);
      }
    },

    async seedExistingData() {
      this.showToast(
        "Import fra statiske filer er deaktivert for å beskytte publisert Firestore-innhold.",
        "warning",
        7000,
      );
      return;
    },

    createPlaceholderSection(id) {
      const contentArea = document.getElementById("content-area");
      const section = document.createElement("div");
      section.id = `${id}-section`;
      section.className = "section-content";
      section.innerHTML = `<div class="card"><div class="card-body"><h2>${id}</h2><p>Kommer snart...</p></div></div>`;
      contentArea.appendChild(section);
    },
  };
}
