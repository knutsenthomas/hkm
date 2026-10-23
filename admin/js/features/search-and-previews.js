// search and previews methods for AdminManager.
export function createMethods22({ firebaseService, adminUtils, showErrorUI }) {
  return {
    initSearch() {
      const searchModal = document.getElementById("search-modal");
      const modalSearchInput = document.getElementById(
        "global-modal-search-input",
      );
      const closeSearchModal = document.getElementById("close-search-modal");
      const searchOpener = document.getElementById("global-search-opener");

      if (!searchModal || !modalSearchInput) return;

      // Open search modal
      const openModal = () => {
        searchModal.style.display = "flex";
        setTimeout(() => modalSearchInput.focus(), 100);
      };

      // Expose to window for FAB and other access
      window.openGlobalSearch = openModal;

      if (searchOpener) {
        searchOpener.addEventListener("click", openModal);
      }

      // Close search modal
      const closeModal = () => {
        searchModal.style.display = "none";
      };

      if (closeSearchModal) {
        closeSearchModal.addEventListener("click", closeModal);
      }

      // Close when clicking outside of the modal content
      searchModal.addEventListener("click", (e) => {
        if (e.target === searchModal) {
          closeModal();
        }
      });

      // Escape key to close
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && searchModal.style.display === "flex") {
          closeModal();
        }
      });

      // Perform search on Enter
      modalSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const query = modalSearchInput.value.trim();
          if (query) {
            closeModal(); // Close modal immediately upon search
            this.performSearch(query);
          }
        }
      });

      // Live suggestions
      const suggestionsContainer =
        document.getElementById("search-suggestions");
      modalSearchInput.addEventListener("input", () => {
        const query = modalSearchInput.value.trim();
        this.updateSearchSuggestions(query, suggestionsContainer);
      });
    },

    async updateSearchSuggestions(query, container) {
      const q = (query || "").trim().toLowerCase();
      if (!q || q.length < 1) {
        container.style.display = "none";
        container.innerHTML = "";
        return;
      }

      // Fast match on common nav items and system areas
      const staticItems = [
        { label: "Oversikt", type: "Navigasjon", icon: "grid_view" },
        { label: "Blogg / Nyheter", type: "Side", icon: "rss_feed" },
        { label: "Arrangementer", type: "Side", icon: "event" },
        { label: "Mediebibliotek", type: "Filer", icon: "folder_open" },
        {
          label: "Gavehåndtering",
          type: "Økonomi",
          icon: "volunteer_activism",
        },
        { label: "Brukerliste", type: "Medlemmer", icon: "group" },
        { label: "Ny bruker", type: "Handling", icon: "person_add" },
        { label: "Podcast", type: "Side", icon: "podcasts" },
        { label: "Om oss", type: "Side", icon: "info" },
        { label: "Kontaktinformasjon", type: "Side", icon: "mail" },
        { label: "Bibelstudier", type: "Innhold", icon: "menu_book" },
        { label: "Systemlogger", type: "Admin", icon: "assignment" },
        { label: "Hjem / Forside", type: "Side", icon: "home" },
      ];

      const matches = staticItems
        .filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.type.toLowerCase().includes(q),
        )
        .slice(0, 6);

      if (matches.length > 0) {
        container.innerHTML = matches
          .map(
            (m) => `
                <div class="search-suggestion-item" onclick="window.adminManager.handleSuggestionClick('${m.label}')">
                    <div class="search-suggestion-icon">
                        <span class="material-symbols-outlined">${m.icon}</span>
                    </div>
                    <div class="search-suggestion-content">
                        <span class="search-suggestion-label">${m.label}</span>
                        <span class="search-suggestion-type">${m.type}</span>
                    </div>
                </div>
            `,
          )
          .join("");
        container.style.display = "block";
      } else {
        container.style.display = "none";
      }
    },

    handleSuggestionClick(label) {
      const input = document.getElementById("global-modal-search-input");
      if (input) input.value = label;
      const modal = document.getElementById("search-modal");
      if (modal) modal.style.display = "none";
      const suggestionsContainer =
        document.getElementById("search-suggestions");
      if (suggestionsContainer) suggestionsContainer.style.display = "none";
      this.performSearch(label);
    },

    async performSearch(query) {
      const q = (query || "").trim();
      if (!q) return;

      const section = document.getElementById("search-section");
      if (!section) return;

      // Vis søke-seksjonen
      const allSections = document.querySelectorAll(".section-content");
      allSections.forEach((s) => s.classList.remove("active"));
      section.classList.add("active");

      section.innerHTML = `
            <div class="card">
                <div class="card-body" id="search-results">
                    <p style="font-size:14px; color:#64748b;">Søker i dashboard-innhold for "${this.escapeHtml(q)}"...</p>
                </div>
            </div>
        `;
      section.setAttribute("data-rendered", "true");

      const resultsEl = document.getElementById("search-results");
      if (!resultsEl) return;

      if (!firebaseService.isInitialized) {
        resultsEl.innerHTML =
          '<p style="color:#ef4444; font-size:14px;">Firebase er ikke konfigurert, kan ikke søke i innhold.</p>';
        return;
      }

      const results = [];
      const qLower = q.toLowerCase();

      try {
        // 1) Faste sider (content)
        const pages = [
          { id: "index", label: "Forside" },
          { id: "om-oss", label: "Om oss" },
          { id: "media", label: "Media" },
          { id: "arrangementer", label: "Arrangementer" },
          { id: "blogg", label: "Blogg" },
          { id: "kontakt", label: "Kontakt" },
          { id: "donasjoner", label: "Donasjoner" },
          { id: "undervisning", label: "Undervisning" },
          { id: "for-menigheter", label: "For menigheter" },
          { id: "for-bedrifter", label: "For bedrifter" },
          { id: "bnn", label: "Business Network" },
          { id: "reisevirksomhet", label: "Reisevirksomhet" },
          { id: "bibelstudier", label: "Bibelstudier" },
          { id: "seminarer", label: "Seminarer" },
          { id: "settings_global", label: "Globale tekster (Footer)" },
          { id: "settings_facebook_feed", label: "Facebook-feed" },
          { id: "podcast", label: "Podcast" },
          { id: "kurs", label: "Kurs-portalside" },
        ];

        for (const page of pages) {
          const data = await firebaseService.getPageContent(page.id);
          if (!data) continue;

          const entries = this.collectTextEntries(data);
          const hit = entries.find(
            (entry) => entry.text && entry.text.toLowerCase().includes(qLower),
          );
          if (hit) {
            results.push({
              type: "Sideinnhold",
              title: page.label,
              meta: hit.path,
              snippet: this.makeSnippet(hit.text, q),
            });
          }
        }

        // 2) Samlinger: blogg, arrangementer, undervisning
        const collections = [
          { id: "blog", docId: "collection_blog", label: "Blogginnlegg" },
          { id: "events", docId: "collection_events", label: "Arrangementer" },
          {
            id: "teaching",
            docId: "collection_teaching",
            label: "Undervisning",
          },
        ];

        for (const col of collections) {
          const raw = await firebaseService.getPageContent(col.docId);
          const items = Array.isArray(raw)
            ? raw
            : raw && Array.isArray(raw.items)
              ? raw.items
              : [];

          items.forEach((item) => {
            const combined = [
              item.title,
              item.content,
              item.category,
              item.author,
              item.seoTitle,
              item.seoDescription,
              item.hero?.title, // Added hero.title
              item.hero?.subtitle, // Added hero.subtitle
              item.hero?.bg, // Added hero.bg
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (combined.includes(qLower)) {
              results.push({
                type: col.label,
                title: item.title || "(uten tittel)",
                meta: item.date || item.category || "",
                snippet: this.makeSnippet(
                  item.content || item.seoDescription || "",
                  q,
                ),
              });
            }
          });
        }

        // 3) Kontaktmeldinger (nyere)
        if (firebaseService.db) {
          const snapshot = await firebaseService.db
            .collection("contactMessages")
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();

          snapshot.forEach((doc) => {
            const data = doc.data() || {};
            const combined = [
              data.name,
              data.email,
              data.phone,
              data.subject,
              data.message,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (combined.includes(qLower)) {
              results.push({
                type: "Melding",
                title: data.subject || "(ingen emne)",
                meta: data.name || data.email || "",
                snippet: this.makeSnippet(data.message || "", q),
              });
            }
          });
        }
      } catch (err) {
        console.error("Feil ved søk:", err);
        resultsEl.innerHTML =
          '<p style="color:#ef4444; font-size:14px;">Det oppstod en feil under søk. Prøv igjen.</p>';
        return;
      }

      if (!results.length) {
        resultsEl.innerHTML =
          '<p style="font-size:14px; color:#64748b;">Ingen treff for dette søket.</p>';
        return;
      }

      const getIcon = (type) => {
        const t = type.toLowerCase();
        if (t.includes("blog")) return "edit_note";
        if (t.includes("arr")) return "event";
        if (t.includes("und")) return "school";
        if (t.includes("media") || t.includes("video")) return "play_circle";
        if (t.includes("user") || t.includes("bruk")) return "person";
        if (t.includes("side") || t.includes("content")) return "description";
        return "article";
      };

      const html = `
            <div class="search-results-gallery">
                ${results
                  .map(
                    (r) => `
                    <div class="search-result" onclick="window.location.hash = '${r.type === "Blogg" ? "blog" : r.type === "Undervisning" ? "teaching" : r.type === "Arrangementer" ? "events" : ""}';">
                        <div class="search-result-header">
                            <span class="search-result-type-tag">${this.escapeHtml(r.type)}</span>
                            ${r.meta ? `<span class="search-result-meta">${this.escapeHtml(r.meta)}</span>` : ""}
                        </div>
                        <div class="search-result-body">
                            <div class="search-result-icon">
                                <span class="material-symbols-outlined">${getIcon(r.type)}</span>
                            </div>
                            <div class="search-result-info">
                                <div class="search-result-title">${this.escapeHtml(r.title)}</div>
                                ${r.snippet ? `<div class="search-result-snippet">${this.escapeHtml(r.snippet)}</div>` : ""}
                            </div>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `;

      resultsEl.innerHTML = html;
    },

    collectTextEntries(obj, path = "") {
      const entries = [];
      if (!obj || typeof obj !== "object") return entries;

      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === "string") {
          entries.push({ text: value, path: currentPath });
        } else if (value && typeof value === "object") {
          entries.push(...this.collectTextEntries(value, currentPath));
        }
      });

      return entries;
    },

    makeSnippet(text, query) {
      if (!text) return "";
      const str = String(text).replace(/\s+/g, " ").trim();
      if (str.length <= 160) return str;

      const lower = str.toLowerCase();
      const qLower = query.toLowerCase();
      const idx = lower.indexOf(qLower);

      if (idx === -1) {
        return str.substring(0, 157) + "...";
      }

      const start = Math.max(0, idx - 40);
      const end = Math.min(str.length, idx + qLower.length + 60);
      const prefix = start > 0 ? "..." : "";
      const suffix = end < str.length ? "..." : "";
      return prefix + str.substring(start, end) + suffix;
    },

    escapeHtml(str) {
      if (str == null) return "";
      return String(str).replace(/[&<>"']/g, (c) => {
        switch (c) {
          case "&":
            return "&amp;";
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          case '"':
            return "&quot;";
          case "'":
            return "&#39;";
          default:
            return c;
        }
      });
    },

    _formatAdminDateTime(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime()))
        return "Ukjent tidspunkt";
      return (
        date.toLocaleDateString("no-NO", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }) +
        ", " +
        date.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" })
      );
    },

    _ensureDetailModal() {
      let modal = document.getElementById("admin-detail-modal");
      if (modal) return modal;

      modal = document.createElement("div");
      modal.id = "admin-detail-modal";
      modal.className = "admin-detail-modal";
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = `
            <div class="admin-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-detail-title">
                <div class="admin-detail-header">
                    <div>
                        <h3 id="admin-detail-title" class="admin-detail-title">Detaljer</h3>
                        <p class="admin-detail-meta" id="admin-detail-meta"></p>
                    </div>
                    <button type="button" class="admin-detail-close" aria-label="Lukk detaljer">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="admin-detail-body" id="admin-detail-body"></div>
                <div class="admin-detail-actions" id="admin-detail-actions" style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px; display: none;">
                    <button id="admin-detail-delete-btn" class="btn btn-ghost" style="color: var(--danger);">
                        <span class="material-symbols-outlined">delete</span> Slett
                    </button>
                </div>
            </div>
        `;

      const closeModal = () => {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
      };

      modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest(".admin-detail-close")) {
          closeModal();
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("is-open")) {
          closeModal();
        }
      });

      document.body.appendChild(modal);
      return modal;
    },

    _renderDetailField(label, value, options = {}) {
      if (value == null) return "";
      const text = String(value).trim();
      if (!text) return "";

      const safe = this.escapeHtml(text);
      const bodyHtml = options.multiline ? safe.replace(/\n/g, "<br>") : safe;
      const valueClasses = ["admin-detail-value"];
      if (options.boxed !== false) valueClasses.push("admin-detail-value--box");
      if (options.multiline) valueClasses.push("admin-detail-value--multiline");

      return `
            <div class="admin-detail-row">
                <div class="admin-detail-label">${this.escapeHtml(label)}</div>
                <div class="${valueClasses.join(" ")}">${bodyHtml}</div>
            </div>
        `;
    },

    extractYoutubeId(url) {
      if (!url) return "";
      const regExp =
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11
        ? match[2]
        : url.length === 11
          ? url
          : "";
    },

    openDetailPreview(item) {
      if (!item) return;
      const modal = this._ensureDetailModal();
      const titleEl = modal.querySelector("#admin-detail-title");
      const metaEl = modal.querySelector("#admin-detail-meta");
      const bodyEl = modal.querySelector("#admin-detail-body");
      if (!titleEl || !metaEl || !bodyEl) return;

      const raw = item.raw || {};
      const typeLabelMap = {
        push: "Push-varsling",
        message: "Melding",
        new_user: "Ny bruker",
        system_log: "Systemlogg",
      };
      const typeLabel = typeLabelMap[item.type] || "Aktivitet";
      const absoluteDate = this._formatAdminDateTime(item.date);
      const rows = [];

      rows.push(this._renderDetailField("Type", typeLabel));
      rows.push(this._renderDetailField("Tidspunkt", absoluteDate));

      if (item.type === "push") {
        rows.push(
          this._renderDetailField(
            "Tittel",
            raw.title || item.title || "Push-varsling",
          ),
        );
        rows.push(
          this._renderDetailField(
            "Målgruppe",
            raw.targetRole === "all"
              ? "Alle brukere"
              : raw.targetRole || "Ukjent",
          ),
        );
        rows.push(this._renderDetailField("Sendt av", raw.sentBy || "Ukjent"));
        rows.push(
          this._renderDetailField(
            "Link",
            raw.click_action || raw.clickAction || "",
            { multiline: false },
          ),
        );
        rows.push(
          this._renderDetailField("Melding", raw.body || "", {
            multiline: true,
          }),
        );
      } else if (item.type === "message") {
        rows.push(this._renderDetailField("Fra", raw.name || "Ukjent"));
        rows.push(this._renderDetailField("E-post", raw.email || ""));
        rows.push(
          this._renderDetailField("Telefon", raw.phone || raw.telephone || ""),
        );
        rows.push(
          this._renderDetailField("Emne", raw.subject || "(ingen emne)"),
        );
        rows.push(this._renderDetailField("Status", raw.status || "ny"));
        rows.push(
          this._renderDetailField("Melding", raw.message || "", {
            multiline: true,
          }),
        );
      } else if (item.type === "new_user") {
        rows.push(
          this._renderDetailField(
            "Bruker",
            raw.userName || item.title || "Ukjent",
          ),
        );
        rows.push(
          this._renderDetailField("E-post", raw.userEmail || item.meta || ""),
        );
        rows.push(
          this._renderDetailField(
            "Melding",
            raw.message || raw.description || "",
            { multiline: true },
          ),
        );
      } else if (item.type === "system_log") {
        rows.push(
          this._renderDetailField("Feiltype", raw.type || "Systemfeil"),
        );
        rows.push(
          this._renderDetailField(
            "Alvorlighet",
            (raw.severity || raw.level || "warning").toUpperCase(),
          ),
        );
        rows.push(this._renderDetailField("Kilde", raw.source || "Ukjent"));
        rows.push(
          this._renderDetailField("URL", raw.url || "", { multiline: false }),
        );
        rows.push(
          this._renderDetailField("Feilmelding", raw.message || "", {
            multiline: true,
          }),
        );
        if (raw.additionalData && raw.additionalData.stack) {
          rows.push(
            this._renderDetailField("Stack Trace", raw.additionalData.stack, {
              multiline: true,
            }),
          );
        }
      } else {
        rows.push(this._renderDetailField("Tittel", item.title || ""));
        rows.push(
          this._renderDetailField("Detaljer", item.meta || "", {
            multiline: true,
          }),
        );
      }

      titleEl.textContent = item.title || typeLabel;
      metaEl.textContent = `${typeLabel} • ${absoluteDate}`;
      bodyEl.innerHTML = rows.filter(Boolean).join("");

      // Action Buttons Setup
      const actionsEl = modal.querySelector("#admin-detail-actions");
      const deleteBtn = modal.querySelector("#admin-detail-delete-btn");

      // Remove old listeners by cloning and replacing the button
      const newDeleteBtn = deleteBtn.cloneNode(true);
      deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

      if (item.type === "push" || item.type === "message") {
        actionsEl.style.display = "flex";
        actionsEl.style.justifyContent = "flex-end";

        newDeleteBtn.onclick = async () => {
          const isPush = item.type === "push";
          const typeText = isPush ? "denne push-varslingen" : "denne meldingen";
          if (
            !confirm(
              `Er du sikker på at du vil slett ${typeText}? Dette kan ikke angres.`,
            )
          )
            return;

          newDeleteBtn.disabled = true;
          newDeleteBtn.textContent = "Sletter...";

          try {
            const db = firebaseService.db;
            if (isPush) {
              // Delete from push log
              await db.collection("push_log").doc(item.id).delete();
              // Delete related user_notifications (where title + body match, roughly)
              // A more robust way would be storing push_log ID in user_notifications, but this prevents orphan data.
              if (raw.title) {
                const relatedNotifs = await db
                  .collection("user_notifications")
                  .where("title", "==", raw.title)
                  .get();
                const batch = db.batch();
                relatedNotifs.forEach((doc) => batch.delete(doc.ref));
                await batch.commit();
              }
            } else if (item.type === "message") {
              await db.collection("contactMessages").doc(item.id).delete();
            }

            const closeModal = () => {
              modal.classList.remove("is-open");
              modal.setAttribute("aria-hidden", "true");
            };
            closeModal();

            // Refresh the activity log to reflect deletion
            this.loadActivityLog(
              document.querySelector(".log-filter-btn.active")?.dataset
                .filter || "all",
            );
          } catch (err) {
            console.error("Error deleting item:", err);
            alert("Kunne ikke slette element: " + err.message);
          } finally {
            newDeleteBtn.disabled = false;
            newDeleteBtn.innerHTML =
              '<span class="material-symbols-outlined">delete</span> Slett';
          }
        };
      } else {
        actionsEl.style.display = "none";
      }

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    },
  };
}
