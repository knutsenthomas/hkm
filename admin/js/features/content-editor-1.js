// content editor methods for AdminManager.
export function createContentEditor1Methods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    _persistOpenEditorState(collectionId, item) {
      try {
        if (!collectionId || !item || typeof item !== "object") return;
        const payload = {
          collectionId: String(collectionId),
          itemId: item.id ? String(item.id) : "",
          itemTitle: item.title ? String(item.title) : "",
          savedAt: Date.now(),
        };
        sessionStorage.setItem(
          this._editorRestoreStateKey,
          JSON.stringify(payload),
        );
      } catch (error) {
        console.warn("[AdminManager] Could not persist editor state", error);
      }
    },

    _clearOpenEditorState(collectionId = null) {
      try {
        if (!collectionId) {
          sessionStorage.removeItem(this._editorRestoreStateKey);
          return;
        }

        const raw = sessionStorage.getItem(this._editorRestoreStateKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.collectionId === collectionId) {
          sessionStorage.removeItem(this._editorRestoreStateKey);
        }
      } catch (error) {
        sessionStorage.removeItem(this._editorRestoreStateKey);
      }
    },

    _getOpenEditorState() {
      try {
        const raw = sessionStorage.getItem(this._editorRestoreStateKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
      } catch (error) {
        return null;
      }
    },

    _attemptRestoreOpenEditor(collectionId, items) {
      if (this._restoringEditorState) return;

      // If the editor modal is already active in the DOM, skip restoring/re-opening
      if (
        this.isEditorOpen ||
        document.querySelector(".dashboard-modal .editor-layout-v2") ||
        document.querySelector(".dashboard-modal") ||
        this._activeEditorInstance
      ) {
        return;
      }

      const saved = this._getOpenEditorState();
      if (!saved || saved.collectionId !== collectionId) return;

      if (
        saved.savedAt &&
        Date.now() - Number(saved.savedAt) > 12 * 60 * 60 * 1000
      ) {
        this._clearOpenEditorState(collectionId);
        return;
      }

      const list = Array.isArray(items) ? items : [];
      if (!list.length) return;

      let targetIndex = -1;
      if (saved.itemId) {
        targetIndex = list.findIndex(
          (entry) => String(entry?.id || "") === String(saved.itemId),
        );
      }

      if (targetIndex === -1 && saved.itemTitle) {
        targetIndex = list.findIndex(
          (entry) => String(entry?.title || "") === String(saved.itemTitle),
        );
      }

      if (targetIndex === -1) return;

      this._restoringEditorState = true;
      setTimeout(() => {
        Promise.resolve(this.editCollectionItem(collectionId, targetIndex))
          .catch((error) =>
            console.warn("[AdminManager] Could not restore open editor", error),
          )
          .finally(() => {
            this._restoringEditorState = false;
          });
      }, 120);
    },

    _getCollectionItems(raw) {
      if (Array.isArray(raw)) return raw;
      if (!raw || typeof raw !== "object") return [];
      if (Array.isArray(raw.items)) return raw.items;
      if (raw.items && typeof raw.items === "object")
        return Object.values(raw.items);
      return [];
    },

    _getSafeCollectionListForSave(collectionId, currentData) {
      let list = this._getCollectionItems(currentData);
      const cachedList =
        this._collectionItemsCache[collectionId] || this.currentItems;
      if (
        (!list || list.length === 0) &&
        Array.isArray(cachedList) &&
        cachedList.length > 0
      ) {
        console.warn(
          `[AdminManager] currentData was empty for collection_${collectionId}. Using memory cache fallback with ${cachedList.length} items to prevent data loss.`,
        );
        list = [...cachedList];
      } else if (Array.isArray(cachedList) && cachedList.length > list.length) {
        console.warn(
          `[AdminManager] currentData had only ${list.length} items while memory cache has ${cachedList.length}. Merging to prevent data loss.`,
        );
        const mergedList = [...list];
        cachedList.forEach((cachedItem) => {
          if (!cachedItem) return;
          const exists = mergedList.some(
            (item) =>
              (item.id && cachedItem.id && item.id === cachedItem.id) ||
              (item.title &&
                cachedItem.title &&
                item.title === cachedItem.title),
          );
          if (!exists) {
            mergedList.push(cachedItem);
          }
        });
        list = mergedList;
      }
      return list;
    },

    _ensureCollectionRealtimeSubscription(collectionId) {
      if (
        !collectionId ||
        this._collectionRealtimeUnsubs[`collection:${collectionId}`]
      )
        return;
      const docId = `collection_${collectionId}`;
      const unsub = firebaseService.subscribeToPage(docId, () => {
        const isActive = this.currentSection === collectionId;
        const listEl = document.getElementById(`${collectionId}-list`);

        // Guard: If the editor modal is open, do not reload the collection and re-render the background list in real-time.
        // This prevents screen flickering and focus/UI lag caused by background updates.
        if (
          this.isEditorOpen ||
          document.querySelector(".dashboard-modal .editor-layout-v2")
        ) {
          console.log(
            `[AdminManager] Ignoring realtime Firestore update for '${collectionId}' because the editor is currently open.`,
          );
          return;
        }

        if (isActive && listEl) {
          this.loadCollection(collectionId);
        }
      });
      if (typeof unsub === "function") {
        this._collectionRealtimeUnsubs[`collection:${collectionId}`] = unsub;
      }
    },

    /**
     * Minimal EditorJS to HTML converter for GCal description
     */
    blocksToHtml(content) {
      if (!content || !content.blocks) return "";
      return content.blocks
        .map((block) => {
          switch (block.type) {
            case "header":
              return `<h${block.data.level}>${block.data.text}</h${block.data.level}>`;
            case "paragraph":
              return `<p>${block.data.text}</p>`;
            case "list":
              const tag = block.data.style === "ordered" ? "ol" : "ul";
              const items = block.data.items
                .map((i) => `<li>${i}</li>`)
                .join("");
              return `<${tag}>${items}</${tag}>`;
            default:
              return block.data.text || "";
          }
        })
        .join("\n");
    },

    async renderLegacyContentDashboard() {
      const section = document.getElementById("content-editor-section");
      if (!section) return;

      section.setAttribute("data-rendered", "true");

      section.innerHTML = `
            <div class="grid-2-cols">
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Blogginnlegg</h3>
                        <button class="btn-primary btn-sm" id="new-blog-post">Nytt innlegg</button>
                    </div>
                    <div class="card-body">
                        <ul class="content-list" id="blog-posts-list">
                            <li class="loading-item">Laster blogginnlegg...</li>
                        </ul>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Undervisningsserier</h3>
                        <button class="btn-primary btn-sm" id="new-teaching-series">Ny serie</button>
                    </div>
                    <div class="card-body">
                        <ul class="content-list" id="teaching-series-list">
                            <li class="loading-item">Laster undervisningsserier...</li>
                        </ul>
                    </div>
                </div>
            </div >

                    <div class="card mt-4">
                        <div class="card-header">
                            <h3 class="card-title">Sider</h3>
                        </div>
                        <div class="card-body">
                            <ul class="content-list" id="pages-list">
                                <li class="loading-item">Laster sider...</li>
                            </ul>
                        </div>
                    </div>
`;

      // Load content lists (Removed undefined loadContentList calls)

      // Add event listeners for new content buttons
      document
        .getElementById("new-blog-post")
        ?.addEventListener("click", () => this.openContentModal("blog"));
      document
        .getElementById("new-teaching-series")
        ?.addEventListener("click", () => this.openContentModal("teaching"));

      // Keep existing posts translated in background without adding an extra manual button.
      this.translateAllExistingBlogPosts({ force: true, silent: true }).catch(
        (error) => {
          console.warn(
            "[AdminManager] Background blog translation backfill failed",
            error,
          );
        },
      );
    },

    _hasMeaningfulEditorContent(editorData) {
      const blocks = Array.isArray(editorData?.blocks) ? editorData.blocks : [];
      if (!blocks.length) return false;

      const stripText = (value) =>
        String(value || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/gi, " ")
          .replace(/\s+/g, " ")
          .trim();

      return blocks.some((block) => {
        const type = String(block?.type || "").toLowerCase();
        const data = block?.data || {};

        if (type === "header" || type === "paragraph" || type === "quote") {
          return stripText(data.text).length > 0;
        }
        if (type === "image" || type === "video" || type === "youtubevideo") {
          const url = data.file?.url || data.url || data.fileUrl || "";
          return url.length > 0;
        }
        if (type === "list") {
          const items = Array.isArray(data.items) ? data.items : [];
          return items.some((item) => {
            const txt =
              typeof item === "string"
                ? item
                : item?.content || item?.text || "";
            return stripText(txt).length > 0;
          });
        }

        if (type === "image") {
          const url = data?.file?.url || data?.url || "";
          return String(url).trim().length > 0;
        }

        if (type === "youtubevideo") {
          return String(data?.url || data?.fileUrl || "").trim().length > 0;
        }

        return stripText(data.text).length > 0;
      });
    },

    /**
     * Render the Content Editor Section (for static pages)
     */
    renderContentEditor() {
      const section = document.getElementById("content-section");
      if (!section) return;

      section.innerHTML = `

            <div class="content-editor-grid">
                <aside class="content-sidebar card">
                    <div class="content-sidebar-head">
                        <h3>Sider</h3>
                        <p>Velg side for redigering</p>
                    </div>
                    <ul class="page-list">
                        <li class="page-item active" data-page="index">Forside</li>
                        <li class="page-item" data-page="settings_facebook_feed">Facebook-feed</li>
                        <li class="page-item" data-page="om-oss">Om oss</li>
                        <li class="page-item" data-page="media">Media</li>
                        <li class="page-item" data-page="arrangementer">Arrangementer</li>
                        <li class="page-item" data-page="kalender">Kalender</li>
                        <li class="page-item" data-page="blogg">Blogg</li>
                        <li class="page-item" data-page="butikk">Butikk</li>
                        <li class="page-item" data-page="for-menigheter">For menigheter</li>
                        <li class="page-item" data-page="kontakt">Kontakt</li>
                        <li class="page-item" data-page="donasjoner">Donasjoner</li>
                        <li class="page-item" data-page="bli-fast-giver">Bli fast giver</li>
                        <li class="page-item" data-page="undervisning">Undervisning</li>
                        <li class="page-item" data-page="reisevirksomhet">Reisevirksomhet</li>
                        <li class="page-item" data-page="bibelstudier">Bibelstudier</li>
                        <li class="page-item" data-page="seminarer">Seminarer</li>
                        <li class="page-item" data-page="podcast">Podcast</li>
                        <li class="page-item" data-page="youtube">YouTube</li>
                        <li class="page-item" data-page="for-bedrifter">For bedrifter</li>
                        <li class="page-item" data-page="bnn">Business Network</li>
                        <li class="page-item" data-page="personvern">Personvern</li>
                        <li class="page-item" data-page="tilgjengelighet">Tilgjengelighet</li>
                        <li class="page-item" data-page="betingelser">Betingelser</li>
                    </ul>
                </aside>
                <div class="content-main">
                    <div class="card content-editor-card">
                        <div class="card-header flex-between content-editor-toolbar">
                            <h3 id="editing-page-title" class="editing-page-title">Forside</h3>
                            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end;">
                                <button class="btn-secondary" id="page-version-history" type="button" style="display: inline-flex; align-items: center; gap: 7px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">history</span>
                                    <span>Versjoner</span>
                                </button>
                                <button class="btn-primary btn-save-content" id="save-content">Lagre endringer</button>
                            </div>
                        </div>
                        <div class="card-body" id="editor-fields">
                            <div class="loader">Laster...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
      section.setAttribute("data-rendered", "true");

      // Sidebar logic
      section.querySelectorAll(".page-item").forEach((item) => {
        item.addEventListener("click", () => {
          section
            .querySelectorAll(".page-item")
            .forEach((i) => i.classList.remove("active"));
          item.classList.add("active");
          const pageId = item.getAttribute("data-page");
          document.getElementById("editing-page-title").textContent =
            item.textContent;

          // Set media path for this specific page
          this.currentMediaPath = `editor/${pageId}/`;

          this.loadPageFields(pageId);
        });
      });

      document
        .getElementById("save-content")
        ?.addEventListener("click", () => this.savePageContent());
      document
        .getElementById("page-version-history")
        ?.addEventListener("click", () => this.openPageVersionHistory());
      this.loadPageFields("index");
    },

    /**
     * Render Collection Editor (Blog/Events) with Add/Delete support
     */
    async renderCollectionEditor(
      collectionId,
      title,
      sectionId = collectionId,
    ) {
      const section = document.getElementById(`${sectionId}-section`);
      if (!section) return;

      const actionsHtml =
        collectionId === "podcast_transcripts"
          ? `
                <div class="kinetic-actions-wrapper">
                    <button class="btn btn-secondary" id="bulk-fill-${collectionId}">
                        <span class="material-symbols-outlined">auto_awesome</span> Fyll manglende tekst og oppsummering
                    </button>
                    <button class="btn btn-primary" id="add-new-${collectionId}">
                        <span class="material-symbols-outlined">add</span> Legg til ny
                    </button>
                </div>
            `
          : `
                <div class="kinetic-actions-wrapper">
                    <button class="btn btn-primary" id="add-new-${collectionId}">
                        <span class="material-symbols-outlined">add</span> Legg til ny
                    </button>
                </div>
            `;

      section.innerHTML = `
            <div class="card kinetic-header-card">
                <div class="kinetic-header-left">
                    <div class="kinetic-header-icon-circle">
                        <span class="material-symbols-outlined">edit_square</span>
                    </div>
                    <div class="kinetic-header-info">
                        <h2>${title}</h2>
                        <p>Administrer dine ${title.toLowerCase()}.</p>
                    </div>
                </div>
                <div class="kinetic-header-actions">
                    ${actionsHtml}
                </div>
            </div>
            <div class="card" style="padding: 0 !important; overflow: hidden !important; border-radius: 20px !important; border: 1px solid var(--admin-border, #f1f5f9) !important; background: var(--admin-surface, white) !important; box-shadow: 0 2px 15px rgba(0,0,0,0.03) !important; width: 100% !important; box-sizing: border-box !important;">
                <div id="${collectionId}-list" class="table-container full-bleed">
                    <div class="loader">Laster ${title.toLowerCase()}...</div>
                </div>
            </div>
        `;
      section.setAttribute("data-rendered", "true");

      document
        .getElementById(`add-new-${collectionId}`)
        .addEventListener("click", () => this.addNewItem(collectionId));
      if (collectionId === "podcast_transcripts") {
        const bulkBtn = document.getElementById(`bulk-fill-${collectionId}`);
        bulkBtn?.addEventListener("click", () =>
          this.runPodcastBulkAiFillMissing(bulkBtn),
        );
      }
      this._ensureCollectionRealtimeSubscription(collectionId);
      this.loadCollection(collectionId);
    },

    async loadCollection(collectionId) {
      const listContainer = document.getElementById(`${collectionId}-list`);
      if (!listContainer) return;
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this._collectionLoadRequestIds[collectionId] = requestId;
      const isCurrentRequest = () =>
        this._collectionLoadRequestIds[collectionId] === requestId;

      // Ensure Firebase is ready before attempting to fetch
      if (!firebaseService.isInitialized) {
        console.log(
          `[AdminManager] Waiting for Firebase to initialize for collection: ${collectionId}`,
        );
        await firebaseService.waitForInitialization(8000);
      }

      if (!firebaseService.isInitialized) {
        const debugInfo = [
          `Config: ${!!window.firebaseConfig}`,
          `SDK: ${typeof firebase !== "undefined"}`,
          `Service: ${!!firebaseService}`,
        ].join(", ");
        listContainer.innerHTML = `<div class="text-danger" style="padding: 20px;">
                <p><strong>Firebase er ikke tilkoblet.</strong></p>
                <code style="display:block; margin-top:10px; font-size: 12px; background: #eee; padding: 10px;">Debug: ${debugInfo}</code>
                <p>Prøv å laste siden på nytt (Shift + R).</p>
            </div>`;
        return;
      }

      try {
        let items = [];

        if (collectionId === "podcast_transcripts") {
          items = await this.getPodcastTranscriptItems();
        } else {
          const dataRes = await this._promiseWithTimeout(
            firebaseService.getPageContent(`collection_${collectionId}`),
            5000,
          );

          if (!isCurrentRequest()) return;

          if (dataRes.timedOut) {
            const cachedItems = this._collectionItemsCache[collectionId];
            if (Array.isArray(cachedItems) && cachedItems.length > 0) {
              this.renderItems(collectionId, cachedItems);
              this.showToast(
                "Viser sist lastede data. Henting tok for lang tid.",
                "warning",
                4000,
              );
            } else {
              this._renderCollectionLoadMessage(
                collectionId,
                "Lasting tok for lang tid. Prøv igjen.",
                "warning",
              );
            }
            return;
          }

          const data = dataRes.value;
          items = this._getCollectionItems(data);
        }

        if (!isCurrentRequest()) return;

        if (collectionId !== "podcast_transcripts") {
          // Mark items that exist in Firestore so we can delete them
          items.forEach((it) => {
            if (it) it.isFirestore = true;
          });
        }

        this._collectionItemsCache[collectionId] = items;
        this.currentItems = items;
        this.renderItems(collectionId, items);
        this._attemptRestoreOpenEditor(collectionId, items);

        // Enrich events in background so UI never blocks on external Google Calendar fetch.
        if (collectionId === "events") {
          this._mergeEventsWithGoogleCalendarNonBlocking(items, requestId);
        }
      } catch (e) {
        console.error(`Could not load collection '${collectionId}':`, e);
        const cachedItems = this._collectionItemsCache[collectionId];
        if (Array.isArray(cachedItems) && cachedItems.length > 0) {
          this.renderItems(collectionId, cachedItems);
          this.showToast(
            "Kunne ikke oppdatere listen nå. Viser sist lastede data.",
            "warning",
            5000,
          );
          return;
        }
        this._renderCollectionLoadMessage(
          collectionId,
          "Kunne ikke laste data akkurat nå.",
          "error",
        );
      }
    },
  };
}
