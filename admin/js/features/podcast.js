// podcast methods for AdminManager.
export function createMethods21({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async renderPodcastSection() {
      const section = document.getElementById("podcast-section");
      if (!section) return;

      section.setAttribute("data-rendered", "true");

      section.innerHTML = `
            <div style="display:flex; justify-content:flex-end; gap:10px; align-items:center; margin-top: 4px; padding-top: 8px; margin-bottom:16px;">
                <button class="btn btn-secondary" id="toggle-podcast-settings-btn" type="button" style="display:inline-flex; align-items:center; gap:6px;">
                    <span class="material-symbols-outlined">settings</span>
                    Innstillinger
                    <span class="material-symbols-outlined" id="podcast-settings-chevron">expand_more</span>
                </button>
                <button class="btn btn-secondary" onclick="window.adminManager.loadPodcastEpisodes()">
                    <span class="material-symbols-outlined">refresh</span>
                    Synkroniser
                </button>
                <button class="btn btn-primary" id="save-podcast-overrides" style="display:none;">
                    Lagre endringer
                </button>
            </div>

            <!-- Collapsible Podcast Settings Card -->
            <div id="podcast-settings-collapsible" style="display: none; margin-bottom: 24px; transition: all 0.3s ease;">
                <div class="card modern" style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
                    <div class="card-header flex-between" style="padding: 16px 20px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; border-top-left-radius: 16px; border-top-right-radius: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="material-symbols-outlined" style="color: #d17d39;">tune</span>
                            <h3 class="card-title" style="margin: 0; font-size: 16px; font-weight: 700;">Podcast-innstillinger & RSS-feed</h3>
                        </div>
                        <button type="button" id="close-podcast-settings-card" class="btn-icon" style="background: transparent; border: none; cursor: pointer; color: #64748b;">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="card-body" style="padding: 20px;">
                        <div class="form-section" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 16px;">
                            <div class="form-group">
                                <label style="font-weight: 700; font-size: 13px; color: #334155;">RSS Feed URL</label>
                                <input type="text" id="podcast-rss-url" class="form-control" placeholder="https://anchor.fm/s/f7a13dec/podcast/rss">
                            </div>
                            <div class="form-group">
                                <label style="font-weight: 700; font-size: 13px; color: #334155;">Spotify Podcast URL</label>
                                <input type="text" id="podcast-spotify-url" class="form-control" placeholder="https://open.spotify.com/show/...">
                            </div>
                            <div class="form-group">
                                <label style="font-weight: 700; font-size: 13px; color: #334155;">Apple Podcasts URL</label>
                                <input type="text" id="podcast-apple-url" class="form-control" placeholder="https://podcasts.apple.com/...">
                            </div>
                            <div class="form-group" style="grid-column: 1 / -1;">
                                <label style="font-weight: 700; font-size: 13px; color: #334155;">Globale kategorier (hurtigvalg)</label>
                                <input type="text" id="podcast-custom-categories" class="form-control" placeholder="f.eks. Vitnesbyrd, Lydbok, Undervisning">
                                <input type="hidden" id="podcast-global-categories-sync">
                                <p style="font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.4;">Separer med komma. Disse vises som hurtigvalg når du redigerer enkeltepisoder.</p>
                            </div>
                        </div>
                        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                            <button class="btn btn-primary" id="save-podcast-settings" style="padding: 8px 24px;">Lagre podcast-innstillinger</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="podcast-management-grid" style="display: grid; grid-template-columns: 1fr; gap: 24px;">
                <!-- Main Episode List -->
                <div class="card kinetic-card" style="padding: 0; overflow: hidden; border-radius: 20px; background: white; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
                    <div class="table-container full-bleed">
                        <table class="crm-table podcast-table">
                            <thead>
                                <tr>
                                    <th style="width: 80px; padding-left: 24px;">Bilde</th>
                                    <th>Episode</th>
                                    <th>Dato</th>
                                    <th>AI-Status</th>
                                    <th class="col-actions" style="text-align:right; padding-right:24px;">Handlinger</th>
                                </tr>
                            </thead>
                            <tbody id="podcast-episodes-list">
                                <tr>
                                    <td colspan="5" style="text-align:center; padding: 60px 0;">
                                        <div class="loader" style="margin:0 auto;"></div>
                                        <p style="margin-top: 16px; color: #64748b; font-weight: 500;">Henter episoder fra RSS-feed...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

      this.loadPodcastEpisodes();
      this.loadPodcastSettings();
      this.loadPodcastOverrides();

      section.addEventListener("click", (event) => {
        const toggleBtn = event.target.closest("#toggle-podcast-settings-btn");
        const closeBtn = event.target.closest("#close-podcast-settings-card");

        if (toggleBtn || closeBtn) {
          const panel = document.getElementById("podcast-settings-collapsible");
          const chevron = document.getElementById("podcast-settings-chevron");
          if (panel) {
            const isHidden = panel.style.display === "none";
            panel.style.display = isHidden ? "block" : "none";
            if (chevron)
              chevron.textContent = isHidden ? "expand_less" : "expand_more";
          }
          return;
        }

        if (event.target.id === "save-podcast-settings")
          this.savePodcastSettings("save-podcast-settings");
        if (event.target.id === "save-podcast-overrides")
          this.savePodcastOverrides();
        if (event.target.id === "refresh-podcast-list")
          this.loadPodcastOverrides();
        if (event.target.id === "open-podcast-transcripts-full")
          this.renderCollectionEditor(
            "podcast_transcripts",
            "Podcast Transkripsjon",
            "podcast",
          );

        const editBtn = event.target.closest("button[data-open-podcast-id]");
        if (editBtn) {
          event.preventDefault();
          this.openPodcastTranscriptEditorById(
            editBtn.getAttribute("data-open-podcast-id") || "",
          );
        }
      });
    },

    async loadPodcastEpisodes() {
      const listBody = document.getElementById("podcast-episodes-list");
      if (!listBody) return;

      try {
        // 1. Fetch episodes from feed
        const episodes = await this.fetchPodcastEpisodesForAdmin();

        // 2. Fetch existing transcripts metadata from Firestore
        const transcriptsSnap = await firebase
          .firestore()
          .collection("podcast_transcripts")
          .get();
        const transcriptMap = {};
        transcriptsSnap.forEach((doc) => {
          transcriptMap[doc.id] = doc.data();
        });

        // 3. Render list
        if (episodes.length === 0) {
          listBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: #64748b;">Ingen episoder funnet i feeden.</td></tr>`;
          return;
        }

        listBody.innerHTML = episodes
          .map((ep, idx) => {
            const id = ep.id;
            const transcriptData = transcriptMap[id] || {};
            const hasTranscript = !!(
              transcriptData.text || transcriptData.content
            );
            const summary = (
              transcriptData.summary ||
              transcriptData.description ||
              ""
            ).trim();
            const hasSummary = !!summary;
            const translationStats = this._getBlogTranslationStatus({
              ...transcriptData,
              title: ep.title || "Uten tittel",
              text: summary || transcriptData.text || ep.description || "",
            });
            const title = ep.title || "Uten tittel";
            const dateStr = this._formatPodcastDateForDisplay(ep.date);
            const imageUrl = ep.imageUrl || "";

            return `
                    <tr data-episode-id="${id}" style="transition: background 0.2s;">
                        <td style="padding-left: 24px; min-width: 70px;">
                            <div style="width: 54px; height: 54px; border-radius: 12px; overflow: hidden; background: #f1f5f9; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                ${
                                  imageUrl
                                    ? `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none';this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\' style=\\'font-size:24px;color:#94a3b8\\'>mic</span>'">`
                                    : `<span class="material-symbols-outlined" style="font-size: 24px; color: #94a3b8;">mic</span>`
                                }
                            </div>
                        </td>
                        <td style="min-width: 240px; max-width: 400px;">
                            <div style="font-weight: 700; color: #1e293b; font-size: 15px; margin-bottom: 4px; line-height: 1.3;">${this.escapeHtml(title)}</div>
                            <div style="font-size: 13px; color: #64748b; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4;">
                                ${(() => {
                                  const raw = summary || ep.description || "";
                                  const tmp = document.createElement("div");
                                  tmp.innerHTML = raw;
                                  const cleanText = (
                                    tmp.textContent ||
                                    tmp.innerText ||
                                    ""
                                  ).trim();
                                  return this.escapeHtml(
                                    cleanText.substring(0, 160),
                                  );
                                })()}...
                            </div>
                        </td>
                        <td style="min-width: 100px;">
                            <div style="font-size: 13px; font-weight: 500; color: #64748b; white-space: nowrap;">${dateStr}</div>
                        </td>
                        <td style="min-width: 240px;">
                            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: nowrap;">
                                <span class="podcast-status-badge" style="background: ${hasTranscript ? "#dcfce7" : "#f1f5f9"}; color: ${hasTranscript ? "#166534" : "#64748b"}; border: 1px solid ${hasTranscript ? "#bbf7d0" : "#e2e8f0"}; white-space: nowrap; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 5px !important; min-height: 32px !important; padding: 4px 12px !important; font-size: 12px !important; font-weight: 800 !important;">
                                    <span class="material-symbols-outlined podcast-status-icon" style="font-size: 16px !important; width: 16px !important; height: 16px !important; min-width: 16px !important; min-height: 16px !important; flex: 0 0 16px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important; margin: 0 !important; padding: 0 !important;">${hasTranscript ? "check_circle" : "hourglass_empty"}</span>
                                    TEKST
                                </span>
                                <span class="podcast-status-badge" style="background: ${hasSummary ? "#eff6ff" : "#f1f5f9"}; color: ${hasSummary ? "#1e40af" : "#64748b"}; border: 1px solid ${hasSummary ? "#bfdbfe" : "#e2e8f0"}; white-space: nowrap; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 5px !important; min-height: 32px !important; padding: 4px 12px !important; font-size: 12px !important; font-weight: 800 !important;">
                                    <span class="material-symbols-outlined podcast-status-icon" style="font-size: 16px !important; width: 16px !important; height: 16px !important; min-width: 16px !important; min-height: 16px !important; flex: 0 0 16px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important; margin: 0 !important; padding: 0 !important;">${hasSummary ? "auto_awesome" : "hourglass_empty"}</span>
                                    AI
                                </span>
                                <span class="podcast-status-badge" style="background: ${translationStats.level === "ok" ? "#eff6ff" : translationStats.level === "stale" ? "#fff7ed" : translationStats.level === "partial" ? "#fffbeb" : "#f8fafc"}; color: ${translationStats.level === "ok" ? "#1e40af" : translationStats.level === "stale" ? "#c2410c" : translationStats.level === "partial" ? "#92400e" : "#94a3b8"}; border: 1px solid ${translationStats.level === "ok" ? "#bfdbfe" : translationStats.level === "stale" ? "#fdba74" : translationStats.level === "partial" ? "#fde68a" : "#e2e8f0"}; white-space: nowrap; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 5px !important; min-height: 32px !important; padding: 4px 12px !important; font-size: 12px !important; font-weight: 800 !important;">
                                    <span class="material-symbols-outlined podcast-status-icon" style="font-size: 16px !important; width: 16px !important; height: 16px !important; min-width: 16px !important; min-height: 16px !important; flex: 0 0 16px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; line-height: 1 !important; margin: 0 !important; padding: 0 !important;">${translationStats.level === "ok" ? "translate" : translationStats.level === "stale" ? "sync_problem" : "language"}</span>
                                    ${translationStats.level === "ok" ? "OVERSATT" : translationStats.level === "stale" ? "UTDATERT" : translationStats.level === "partial" ? "DELVIS" : "IKKE OVERSATT"}
                                </span>
                            </div>
                        </td>
                        <td style="text-align:right; padding-right:24px; min-width: 80px;">
                            <div style="display:flex; gap:8px; justify-content:flex-end;">
                                <button class="btn-icon-round" onclick="window.adminManager.openPodcastTranscriptEditorById('${id}')" title="Rediger tekst">
                                    <span class="material-symbols-outlined">edit</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
          })
          .join("");

        // Update stats
        const totalCount = episodes.length;
        const transcribedCount = Object.values(transcriptMap).filter(
          (t) => t.text || t.content,
        ).length;

        const totalEl = document.getElementById("podcast-total-count");
        const transcribedEl = document.getElementById(
          "podcast-transcribed-count",
        );
        if (totalEl) totalEl.textContent = totalCount;
        if (transcribedEl) transcribedEl.textContent = transcribedCount;
      } catch (error) {
        console.error("Error loading podcast episodes:", error);
        listBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: #ef4444;">Kunne ikke laste episoder: ${error.message}</td></tr>`;
      }
    },

    async openPodcastSettingsModal(episodeId) {
      try {
        // 1. Fetch current overrides and podcast settings
        const overridesData =
          (await firebaseService.getPageContent(
            "settings_podcast_overrides",
          )) || {};
        const overrides = overridesData.overrides || {};

        const podcastSettings = await this.getPodcastSettings();
        const customCatStr = podcastSettings.podcastCustomCategories || "";
        const customCatArr = customCatStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        // 2. Find episode details from cache
        const episodes =
          this._collectionItemsCache["podcast_episodes_raw"] ||
          (await this.fetchPodcastEpisodesForAdmin());
        this._collectionItemsCache["podcast_episodes_raw"] = episodes;

        const ep = episodes.find((e) => e.id === episodeId);
        if (!ep) {
          this.showToast("Fant ikke episode-detaljer.", "error");
          return;
        }

        const currentCats = this.parsePodcastOverrideCategories(
          overrides[episodeId],
        );
        const normalizedCurrentCats = currentCats.map((c) => c.toLowerCase());

        const podcastCategories = [
          { value: "tro", label: "Tro" },
          { value: "bibel", label: "Bibel" },
          { value: "bønn", label: "Bønn" },
          { value: "undervisning", label: "Undervisning" },
        ];

        customCatArr.forEach((cat) => {
          const val = cat.toLowerCase();
          if (!podcastCategories.find((p) => p.value === val)) {
            podcastCategories.push({ value: val, label: cat });
          }
        });

        // 3. Create Modal
        const modal = document.createElement("div");
        modal.className = "admin-modal active";
        modal.style.cssText =
          "position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);";

        modal.innerHTML = `
                <div class="modal-content" style="background:white; border-radius:24px; width:100%; max-width:600px; box-shadow:0 20px 50px rgba(0,0,0,0.2); overflow:hidden; animation: modalSlideUp 0.3s ease;">
                    <div class="modal-header" style="padding:24px 32px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; font-size:18px; font-weight:800; color:#1e293b;">Episodeinnstillinger</h3>
                            <p style="margin:4px 0 0; font-size:13px; color:#64748b; font-weight:500;">${this.escapeHtml(ep.title)}</p>
                        </div>
                        <button class="close-modal-btn" style="background:none; border:none; cursor:pointer; color:#94a3b8; padding:8px; border-radius:50%; transition:all 0.2s;">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="modal-body" style="padding:32px; max-height:70vh; overflow-y:auto;">
                        <div style="margin-bottom:24px;">
                            <label style="display:block; font-size:13px; font-weight:700; color:#1e293b; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.04em;">Kategorier</label>
                            <div class="podcast-category-chip-group" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
                                ${podcastCategories
                                  .map((cat) => {
                                    const isSelected =
                                      normalizedCurrentCats.includes(
                                        cat.value.toLowerCase(),
                                      );
                                    return `
                                        <button type="button" class="podcast-modal-chip" data-value="${cat.value}" data-selected="${isSelected}"
                                            style="padding:10px 18px; border-radius:999px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; border:1px solid ${isSelected ? "#d17d39" : "#e2e8f0"}; background:${isSelected ? "#d17d39" : "white"}; color:${isSelected ? "white" : "#64748b"};">
                                            ${cat.label}
                                        </button>
                                    `;
                                  })
                                  .join("")}
                            </div>
                            
                            <!-- AI-knapp for tagger/SEO/meta -->
                            <button id="ai-suggest-seo" type="button" style="margin:16px 0 8px 0; display:flex; align-items:center; gap:8px; background:#f1f5f9; color:#d17d39; border:none; border-radius:8px; padding:10px 18px; font-weight:700; font-size:14px; cursor:pointer;">
                                <span class="material-symbols-outlined" style="vertical-align:middle;">auto_awesome</span>
                                Foreslå tagger og SEO med AI
                            </button>

                            <!-- Tagger input -->
                            <div style="margin: 18px 0 0 0;">
                                <label for="tag-input" style="font-size:12px; font-weight:700; color:#64748b; letter-spacing:0.04em;">Tagger</label>
                                <input id="tag-input" type="text" class="admin-input" placeholder="Legg til tag + Enter" style="width:100%; padding:12px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; margin-top:6px;">
                            </div>

                            <!-- SEO & Synlighet -->
                            <div style="margin: 18px 0 0 0;">
                                <label for="col-item-seo-title" style="font-size:12px; font-weight:700; color:#64748b; letter-spacing:0.04em;">Meta-tittel (SEO)</label>
                                <input id="col-item-seo-title" type="text" class="admin-input" placeholder="Meta-tittel for søkemotorer" style="width:100%; padding:12px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; margin-top:6px;">
                            </div>
                            <div style="margin: 18px 0 0 0;">
                                <label for="col-item-seo-desc" style="font-size:12px; font-weight:700; color:#64748b; letter-spacing:0.04em;">Meta-beskrivelse</label>
                                <textarea id="col-item-seo-desc" class="admin-input" placeholder="Meta-beskrivelse for søkemotorer" style="width:100%; padding:12px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px; margin-top:6px; min-height:60px;"></textarea>
                            </div>

                            <div style="display:flex; flex-direction:column; gap:8px; margin-top:18px;">
                                <label style="font-size:12px; font-weight:600; color:#64748b;">Legg til egne kategorier (kommaseparert)</label>
                                <input type="text" id="modal-custom-cats" class="admin-input" placeholder="f.eks. lederskap, familie" 
                                    value="${currentCats.filter((c) => !podcastCategories.find((pc) => pc.value === c.toLowerCase())).join(", ")}"
                                    style="width:100%; padding:12px; border-radius:12px; border:1.5px solid #e2e8f0; font-size:14px;">
                            </div>
                        </div>

                        <div style="background:#f8fafc; border-radius:16px; padding:20px; border:1px solid #e2e8f0;">
                            <h4 style="margin:0 0 8px; font-size:14px; font-weight:700; color:#1e293b; display:flex; align-items:center; gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:18px; color:#d17d39;">info</span>
                                Info
                            </h4>
                            <p style="margin:0; font-size:13px; color:#64748b; line-height:1.6;">
                                Kategorier brukes for å filtrere episoder på nettsiden. Hvis ingen velges, vil systemet prøve å autokategorisere basert på innholdet.
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding:24px 32px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:12px;">
                        <button class="btn btn-secondary cancel-btn" style="padding:12px 24px; font-weight:700;">Avbryt</button>
                        <button class="btn btn-primary save-btn" style="padding:12px 24px; font-weight:700; background:linear-gradient(135deg, #d17d39, #bd4f2a);">Lagre innstillinger</button>
                    </div>
                </div>
            `;

        document.body.appendChild(modal);

        // Koble AI-knapp for SEO/tagger etter at modal er i DOM
        const aiBtn = modal.querySelector("#ai-suggest-seo");
        if (aiBtn) {
          aiBtn.onclick = async () => {
            aiBtn.disabled = true;
            aiBtn.innerHTML = "Henter forslag...";
            try {
              const response = await fetch("/seoSuggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: ep.title,
                  description: ep.description,
                  categories: currentCats,
                  transcript: ep.transcript || "",
                }),
              });
              let data = {};
              let errorText = "";
              if (!response.ok) {
                // Try to get error details from backend
                try {
                  data = await response.json();
                  errorText = data.error || data.message || "";
                } catch (err) {
                  errorText = await response.text();
                }
                let msg = "Kunne ikke hente AI-forslag.";
                if (response.status === 429) {
                  msg =
                    "AI-tjenesten er midlertidig overbelastet (rate limit). Prøv igjen om litt.";
                }
                if (errorText) msg += "\n" + errorText;
                if (typeof window.adminManager?.showToast === "function") {
                  window.adminManager.showToast(msg, "error", 7000);
                } else {
                  alert(msg);
                }
                return;
              } else {
                data = await response.json();
              }
              // Update tag UI properly
              if (data.tags) {
                // Split tags and update the tag UI
                const tags = data.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                const tagInput = modal.querySelector("#tag-input");
                if (tagInput) tagInput.value = "";
                // Try to update the tag badge UI if present
                if (typeof renderTags === "function") {
                  currentTags = tags;
                  renderTags();
                } else {
                  // fallback: set input value as comma-separated
                  if (tagInput) tagInput.value = tags.join(", ");
                }
              }
              if (data.metaTitle)
                modal.querySelector("#col-item-seo-title").value =
                  data.metaTitle;
              if (data.metaDescription)
                modal.querySelector("#col-item-seo-desc").value =
                  data.metaDescription;
            } catch (e) {
              let msg = "Kunne ikke hente AI-forslag.";
              if (e && e.message) msg += "\n" + e.message;
              if (typeof window.adminManager?.showToast === "function") {
                window.adminManager.showToast(msg, "error", 7000);
              } else {
                alert(msg);
              }
            } finally {
              aiBtn.disabled = false;
              aiBtn.innerHTML =
                '<span class="material-symbols-outlined" style="vertical-align:middle;">auto_awesome</span> Foreslå tagger og SEO med AI';
            }
          };
        }

        // Handle chip clicks
        const chips = modal.querySelectorAll(".podcast-modal-chip");
        chips.forEach((chip) => {
          chip.onclick = () => {
            const isSelected = chip.getAttribute("data-selected") === "true";
            const newVal = !isSelected;
            chip.setAttribute("data-selected", newVal);
            chip.style.background = newVal ? "#d17d39" : "white";
            chip.style.color = newVal ? "white" : "#64748b";
            chip.style.borderColor = newVal ? "#d17d39" : "#e2e8f0";
          };
        });

        const close = () => {
          modal.style.opacity = "0";
          modal.querySelector(".modal-content").style.transform =
            "translateY(20px)";
          setTimeout(() => modal.remove(), 300);
        };

        modal.querySelector(".close-modal-btn").onclick = close;
        modal.querySelector(".cancel-btn").onclick = close;
        modal.onclick = (e) => {
          if (e.target === modal) close();
        };

        modal.querySelector(".save-btn").onclick = async () => {
          const saveBtn = modal.querySelector(".save-btn");
          saveBtn.disabled = true;
          saveBtn.textContent = "Lagrer...";

          try {
            const selected = Array.from(
              modal.querySelectorAll(
                '.podcast-modal-chip[data-selected="true"]',
              ),
            ).map((c) => c.getAttribute("data-value"));

            const customStr =
              document.getElementById("modal-custom-cats").value;
            const customArr = this.parsePodcastOverrideCategories(customStr);

            const merged = Array.from(new Set([...selected, ...customArr]));

            // Save to Firebase
            const currentOverridesSnap = (await firebaseService.getPageContent(
              "settings_podcast_overrides",
            )) || { overrides: {} };
            const updatedOverrides = { ...currentOverridesSnap.overrides };

            if (merged.length === 0) {
              delete updatedOverrides[episodeId];
            } else if (merged.length === 1) {
              updatedOverrides[episodeId] = merged[0];
            } else {
              updatedOverrides[episodeId] = merged;
            }

            await firebaseService.savePageContent(
              "settings_podcast_overrides",
              {
                overrides: updatedOverrides,
                updatedAt: new Date().toISOString(),
              },
            );

            // Also check if we need to add to global custom categories
            const newGlobalCats = new Set(customCatArr);
            customArr.forEach((c) => newGlobalCats.add(c));

            if (newGlobalCats.size > customCatArr.length) {
              await firebaseService.savePageContent("settings_podcast", {
                ...podcastSettings,
                podcastCustomCategories: Array.from(newGlobalCats).join(", "),
                updatedAt: new Date().toISOString(),
              });
            }

            this.showToast("Innstillinger lagret!", "success");
            close();
          } catch (err) {
            console.error("Save podcast settings error:", err);
            this.showToast("Kunne ikke lagre innstillinger.", "error");
          } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Lagre innstillinger";
          }
        };
      } catch (error) {
        console.error("Open podcast settings error:", error);
        this.showToast("Kunne ikke åpne innstillinger.", "error");
      }
    },

    async fetchPodcastStats() {
      try {
        const response = await fetch(
          "https://getpodcast-42bhgdjkcq-uc.a.run.app",
        );
        const data = await response.json();
        // The Cloud Function uses xml2js, so items are in data.rss.channel[0].item
        const channel = Array.isArray(data?.rss?.channel)
          ? data.rss.channel[0]
          : data?.rss?.channel;
        const items = channel?.item;
        if (items && Array.isArray(items)) {
          return items.length;
        }
      } catch (error) {
        console.error(
          "Error fetching Podcast stats via Cloud Function:",
          error,
        );
      }
      return "...";
    },

    _extractPodcastText(value) {
      if (Array.isArray(value)) {
        return this._extractPodcastText(value[0]);
      }
      if (value && typeof value === "object") {
        if (typeof value._ === "string") return value._;
        if (typeof value["#text"] === "string") return value["#text"];
        if (typeof value.$?.href === "string") return value.$.href;
        if (typeof value.$?.url === "string") return value.$.url;
        return "";
      }
      return typeof value === "string" ? value : "";
    },

    _normalizePodcastDate(value) {
      const raw = typeof value === "string" ? value.trim() : "";
      if (!raw) return "";
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        return raw.split("T")[0] || raw;
      }
      return parsed.toISOString().split("T")[0];
    },

    _formatPodcastDateForDisplay(value) {
      const raw = typeof value === "string" ? value.trim() : "";
      if (!raw) return "";

      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? new Date(`${raw}T12:00:00`)
        : new Date(raw);

      if (Number.isNaN(parsed.getTime())) {
        return raw;
      }

      return parsed.toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },

    async fetchPodcastEpisodesForAdmin() {
      try {
        const response = await fetch(
          "https://getpodcast-42bhgdjkcq-uc.a.run.app",
        );
        const data = await response.json();
        const channel = Array.isArray(data?.rss?.channel)
          ? data.rss.channel[0]
          : data?.rss?.channel;
        const rawItems = channel?.item;
        const items = Array.isArray(rawItems) ? rawItems : [];

        return items
          .map((episode) => {
            const guid = this._extractPodcastText(episode?.guid);
            const link = this._extractPodcastText(episode?.link);
            const title =
              this._extractPodcastText(episode?.title) || "Uten tittel";
            const date = this._normalizePodcastDate(
              this._extractPodcastText(episode?.pubDate),
            );
            const description =
              this._extractPodcastText(episode?.description) ||
              this._extractPodcastText(episode?.["itunes:summary"]) ||
              "";

            const imageNode = Array.isArray(episode?.["itunes:image"])
              ? episode["itunes:image"][0]
              : episode?.["itunes:image"];
            const imageUrl = imageNode?.$?.href || "";
            const enclosureNode = Array.isArray(episode?.enclosure)
              ? episode.enclosure[0]
              : episode?.enclosure;
            const audioUrl =
              enclosureNode?.$?.url ||
              this._extractPodcastText(enclosureNode?.url) ||
              "";

            const id = guid || link || title;

            return {
              id,
              title,
              date,
              description,
              imageUrl,
              audioUrl,
              source: "feed",
            };
          })
          .filter((ep) => ep.id);

        // Cache results for settings modal
        this._collectionItemsCache["podcast_episodes_raw"] = items;

        return items;
      } catch (error) {
        console.error("Error fetching podcast episodes for admin:", error);
        return [];
      }
    },

    async getPodcastTranscriptItems() {
      const [snapshots, feedEpisodes] = await Promise.all([
        firebase.firestore().collection("podcast_transcripts").get(),
        this.fetchPodcastEpisodesForAdmin(),
      ]);

      const transcriptById = new Map(
        snapshots.docs.map((doc) => [
          doc.id,
          {
            id: doc.id,
            ...doc.data(),
            isFirestore: true,
          },
        ]),
      );

      const merged = [];

      feedEpisodes.forEach((episode) => {
        const existingTranscript = transcriptById.get(episode.id);
        if (existingTranscript) {
          merged.push({
            ...episode,
            ...existingTranscript,
            // Preserve RSS description as fallback; allow summary to bridge from legacy description field
            description:
              existingTranscript.description || episode.description || "",
            summary:
              existingTranscript.summary ||
              existingTranscript.description ||
              "",
            id: existingTranscript.id,
            isFirestore: true,
          });
          transcriptById.delete(episode.id);
        } else {
          merged.push({
            ...episode,
            text: "",
            content: "",
            isFirestore: false,
          });
        }
      });

      transcriptById.forEach((docItem) => {
        merged.push(docItem);
      });

      const toTimestamp = (dateValue) => {
        const parsed = new Date(dateValue || "");
        return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      };
      merged.sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

      return merged;
    },

    hasPodcastTranscriptText(item) {
      const text = typeof item?.text === "string" ? item.text.trim() : "";
      if (text) return true;

      const content = item?.content;
      if (typeof content === "string" && content.trim()) return true;
      if (this._hasMeaningfulEditorContent(content)) return true;

      return false;
    },

    hasPodcastTranscriptSummary(item) {
      const description =
        typeof item?.description === "string" ? item.description.trim() : "";
      const summary =
        typeof item?.summary === "string" ? item.summary.trim() : "";
      return Boolean(description || summary);
    },

    getPodcastTranscriptAudit(item) {
      const hasTranscript = this.hasPodcastTranscriptText(item);
      const hasSummary = this.hasPodcastTranscriptSummary(item);

      return {
        hasTranscript,
        hasSummary,
        isComplete: hasTranscript && hasSummary,
      };
    },

    getPodcastTranscriptOverview(items) {
      const list = Array.isArray(items) ? items : [];
      const stats = {
        total: list.length,
        missingTranscript: 0,
        missingSummary: 0,
        complete: 0,
      };

      list.forEach((item) => {
        const audit = this.getPodcastTranscriptAudit(item);
        if (!audit.hasTranscript) stats.missingTranscript += 1;
        if (!audit.hasSummary) stats.missingSummary += 1;
        if (audit.isComplete) stats.complete += 1;
      });

      return stats;
    },

    podcastBlocksToPlainText(blocks) {
      const list = Array.isArray(blocks) ? blocks : [];
      return list
        .map((block) => {
          const type = String(block?.type || "").toLowerCase();
          const data = block?.data || {};

          if (type === "header" || type === "quote" || type === "paragraph") {
            return String(data.text || "").trim();
          }

          if (type === "list") {
            const items = Array.isArray(data.items) ? data.items : [];
            return items
              .map((item) => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object")
                  return item.content || item.text || "";
                return "";
              })
              .filter(Boolean)
              .join(" ");
          }

          return String(data.text || "").trim();
        })
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    },

    podcastHtmlToPlainText(value) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(value || ""), "text/html");
      return String(doc.body?.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
    },

    getPodcastTranscriptPlainText(item) {
      const content = item?.content;
      if (
        content &&
        typeof content === "object" &&
        Array.isArray(content.blocks)
      ) {
        const blockText = this.podcastBlocksToPlainText(content.blocks);
        if (blockText) return blockText;
      }

      if (typeof item?.text === "string" && item.text.trim()) {
        return this.podcastHtmlToPlainText(item.text);
      }

      if (typeof content === "string" && content.trim()) {
        return this.podcastHtmlToPlainText(content);
      }

      return "";
    },

    buildPodcastLocalSummarySuggestion(title, transcriptText) {
      const cleaned = String(transcriptText || "")
        .replace(/\s+/g, " ")
        .replace(/\b\d{1,3}[.:]\s*/g, "")
        .trim();

      if (!cleaned) return "";

      const sentences = cleaned
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 35)
        .slice(0, 3);

      const core = sentences.join(" ").trim();
      if (!core) return "";

      if (!title) return core;

      return `I denne episoden ${title.toLowerCase().includes("lydbok") ? "får du en lydboklesning" : "får du undervisning"} som tar deg gjennom sentrale poeng i teksten. ${core}`;
    },

    async generatePodcastTranscriptForItem(item) {
      const episodeId = String(item?.id || "").trim();
      const audioUrl = String(item?.audioUrl || "").trim();

      if (!episodeId || !audioUrl) {
        throw new Error("Mangler episode-ID eller lydfil.");
      }

      const callable = firebase.functions().httpsCallable("transcribePodcast");
      await callable({
        episodeId,
        audioUrl,
        episodeTitle: String(item?.title || ""),
      });

      const refreshedDoc = await firebase
        .firestore()
        .collection("podcast_transcripts")
        .doc(episodeId)
        .get();
      return refreshedDoc.exists
        ? { id: episodeId, ...refreshedDoc.data() }
        : item;
    },

    async generatePodcastSummaryForItem(item) {
      const episodeId = String(item?.id || "").trim();
      if (!episodeId) {
        throw new Error("Mangler episode-ID for oppsummering.");
      }

      const transcriptText = this.getPodcastTranscriptPlainText(item);
      if (transcriptText.length < 120) {
        throw new Error("For lite tekstgrunnlag til å lage oppsummering.");
      }

      let summary = "";

      try {
        const callable = firebase
          .functions()
          .httpsCallable("generatePodcastSummary");
        const response = await callable({
          episodeTitle: String(item?.title || "").trim(),
          transcriptText,
        });
        summary = String(response?.data?.summary || "").trim();
      } catch (error) {
        console.warn(
          "AI-oppsummering feilet i bulk, bruker lokal fallback:",
          error,
        );
      }

      if (!summary) {
        summary = this.buildPodcastLocalSummarySuggestion(
          String(item?.title || ""),
          transcriptText,
        );
      }

      if (!summary) {
        throw new Error("Kunne ikke lage oppsummering.");
      }

      await firebase
        .firestore()
        .collection("podcast_transcripts")
        .doc(episodeId)
        .set(
          {
            summary: summary,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      return {
        ...item,
        summary: summary,
      };
    },

    async runPodcastBulkAiFillMissing(triggerBtn = null) {
      const collectionId = "podcast_transcripts";

      if (
        !Array.isArray(this._collectionItemsCache[collectionId]) ||
        this._collectionItemsCache[collectionId].length === 0
      ) {
        await this.loadCollection(collectionId);
      }

      const items = Array.isArray(this._collectionItemsCache[collectionId])
        ? [...this._collectionItemsCache[collectionId]]
        : [];

      const targets = items.filter((item) => {
        const audit = this.getPodcastTranscriptAudit(item);
        return !audit.hasTranscript || !audit.hasSummary;
      });

      if (!targets.length) {
        this.showToast(
          "Alle podcast-episoder har allerede tekst og oppsummering.",
          "success",
          5000,
        );
        return;
      }

      const confirmed = await this.showConfirm(
        "Generer innhold",
        `Dette vil generere manglende tekst og oppsummering for ${targets.length} podcast-episoder. Vil du fortsette?`,
        "Fortsett",
      );
      if (!confirmed) return;

      const originalBtnHtml = triggerBtn ? triggerBtn.innerHTML : "";
      if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.innerHTML =
          '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Kjører...';
      }

      let processed = 0;
      let failed = 0;

      try {
        for (const target of targets) {
          const title = String(target?.title || "Uten tittel");
          this.showToast(`Jobber med podcast: ${title}`, "info", 2500);

          try {
            let workingItem = { ...target };
            const auditBefore = this.getPodcastTranscriptAudit(workingItem);

            if (!auditBefore.hasTranscript) {
              workingItem =
                await this.generatePodcastTranscriptForItem(workingItem);
            }

            const auditAfterTranscript =
              this.getPodcastTranscriptAudit(workingItem);
            if (!auditAfterTranscript.hasSummary) {
              workingItem =
                await this.generatePodcastSummaryForItem(workingItem);
            }

            this._collectionItemsCache[collectionId] = (
              this._collectionItemsCache[collectionId] || []
            ).map((entry) =>
              entry?.id === workingItem.id
                ? { ...entry, ...workingItem }
                : entry,
            );

            processed += 1;
          } catch (error) {
            failed += 1;
            console.error(
              "Bulk podcast AI-generering feilet for episode:",
              target?.id,
              error,
            );
          }
        }

        await this.loadCollection(collectionId);

        if (failed === 0) {
          this.showToast(
            `Ferdig. Oppdaterte ${processed} podcast-episoder.`,
            "success",
            6000,
          );
        } else {
          this.showToast(
            `Ferdig med feil. Oppdaterte ${processed} episoder, ${failed} feilet.`,
            "warning",
            7000,
          );
        }
      } finally {
        if (triggerBtn) {
          triggerBtn.disabled = false;
          triggerBtn.innerHTML = originalBtnHtml;
        }
      }
    },

    async openPodcastTranscriptEditorById(episodeId) {
      const targetId = (episodeId || "").trim();

      if (
        !Array.isArray(this._collectionItemsCache["podcast_transcripts"]) ||
        this._collectionItemsCache["podcast_transcripts"].length === 0
      ) {
        try {
          const podcastItems = await this.getPodcastTranscriptItems();
          this._collectionItemsCache["podcast_transcripts"] = podcastItems;
        } catch (error) {
          console.error(
            "Could not load podcast transcript items for editor:",
            error,
          );
          this.showToast(
            "Kunne ikke laste podcast-episoder akkurat nå.",
            "error",
            5000,
          );
          return;
        }
      }

      if (!targetId) return;

      const items = this._collectionItemsCache["podcast_transcripts"] || [];
      const idx = items.findIndex((it) => (it?.id || "") === targetId);
      if (idx >= 0) {
        this.editCollectionItem("podcast_transcripts", idx);
      } else {
        this.showToast(
          "Fant ikke episode i podcastlisten ennå. Prøv igjen om et øyeblikk.",
          "warning",
          5000,
        );
      }
    },

    async getPodcastSettings() {
      try {
        const [podcastSettings, legacyMediaSettings] = await Promise.all([
          firebaseService.getPageContent("settings_podcast").catch(() => ({})),
          firebaseService.getPageContent("settings_media").catch(() => ({})),
        ]);

        const legacyPodcastFields = {};
        [
          "podcastRssUrl",
          "spotifyUrl",
          "appleUrl",
          "podcastCustomCategories",
        ].forEach((key) => {
          if (legacyMediaSettings && legacyMediaSettings[key] !== undefined) {
            legacyPodcastFields[key] = legacyMediaSettings[key];
          }
        });

        return {
          ...legacyPodcastFields,
          ...(podcastSettings || {}),
        };
      } catch (error) {
        console.error("Load podcast settings error:", error);
        return {};
      }
    },

    async loadPodcastSettings() {
      try {
        const settings = await this.getPodcastSettings();

        // Podcast page inputs
        const podcastRss = document.getElementById("podcast-rss-url");
        const spotify = document.getElementById("podcast-spotify-url");
        const apple = document.getElementById("podcast-apple-url");
        const podcastCategories = document.getElementById(
          "podcast-custom-categories",
        );

        if (podcastRss) podcastRss.value = settings.podcastRssUrl || "";
        if (spotify) spotify.value = settings.spotifyUrl || "";
        if (apple) apple.value = settings.appleUrl || "";
        if (podcastCategories)
          podcastCategories.value = settings.podcastCustomCategories || "";

        // Integrations page inputs
        const integRss = document.getElementById("integ-podcast-rss-url");
        const integSpotify = document.getElementById(
          "integ-podcast-spotify-url",
        );
        const integApple = document.getElementById("integ-podcast-apple-url");
        const integCategories = document.getElementById(
          "integ-podcast-custom-categories",
        );

        if (integRss) integRss.value = settings.podcastRssUrl || "";
        if (integSpotify) integSpotify.value = settings.spotifyUrl || "";
        if (integApple) integApple.value = settings.appleUrl || "";
        if (integCategories)
          integCategories.value = settings.podcastCustomCategories || "";

        const syncInput = document.getElementById(
          "podcast-global-categories-sync",
        );
        if (syncInput) syncInput.value = settings.podcastCustomCategories || "";
      } catch (e) {
        console.error("Load podcast settings error:", e);
      }
    },

    async savePodcastSettings(buttonId = "save-podcast-settings") {
      const btn =
        document.getElementById(buttonId) ||
        document.getElementById("save-podcast-settings");

      const podcastRssInput =
        document.getElementById("podcast-rss-url") ||
        document.getElementById("integ-podcast-rss-url");
      const spotifyInput =
        document.getElementById("podcast-spotify-url") ||
        document.getElementById("integ-podcast-spotify-url");
      const appleInput =
        document.getElementById("podcast-apple-url") ||
        document.getElementById("integ-podcast-apple-url");
      const podcastCategoriesInput =
        document.getElementById("podcast-custom-categories") ||
        document.getElementById("integ-podcast-custom-categories");

      const originalText = btn?.textContent || "Lagre";
      if (btn) {
        btn.textContent = "Lagrer...";
        btn.disabled = true;
      }

      try {
        const currentSettings = await this.getPodcastSettings();
        const nextSettings = {
          ...currentSettings,
          updatedAt: new Date().toISOString(),
        };

        if (podcastRssInput)
          nextSettings.podcastRssUrl = podcastRssInput.value.trim();
        if (spotifyInput) nextSettings.spotifyUrl = spotifyInput.value.trim();
        if (appleInput) nextSettings.appleUrl = appleInput.value.trim();
        if (podcastCategoriesInput)
          nextSettings.podcastCustomCategories =
            podcastCategoriesInput.value.trim();

        await firebaseService.savePageContent("settings_podcast", nextSettings);
        this.showToast("Podcast-innstillingene er lagret!", "success", 5000);

        // Reload in both places
        this.loadPodcastSettings();
        if (document.getElementById("podcast-overrides-list"))
          this.loadPodcastOverrides();
      } catch (err) {
        console.error("Save podcast settings error:", err);
        this.showToast("Feil ved lagring: " + err.message, "error", 5000);
      } finally {
        if (btn) {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      }
    },

    parsePodcastOverrideCategories(rawValue) {
      if (Array.isArray(rawValue)) {
        return rawValue
          .map((value) => String(value || "").trim())
          .filter(Boolean);
      }

      const asString = String(rawValue || "").trim();
      if (!asString) return [];

      return asString
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    },

    async loadPodcastOverrides() {
      const listContainer = document.getElementById("podcast-overrides-list");
      if (!listContainer) return;

      listContainer.innerHTML = '<div class="loader">Henter episoder...</div>';

      try {
        // 1. Fetch current overrides from Firebase
        const overridesData =
          (await firebaseService.getPageContent(
            "settings_podcast_overrides",
          )) || {};
        const overrides = overridesData.overrides || {};

        const podcastSettings = await this.getPodcastSettings();
        const customCatStr = podcastSettings.podcastCustomCategories || "";
        const customCatArr = customCatStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        // 2. Fetch episodes from the same source used by Podcast redigering
        const episodes = await this.fetchPodcastEpisodesForAdmin();
        const podcastCategories = [
          { value: "tro", label: "Tro" },
          { value: "bibel", label: "Bibel" },
          { value: "bønn", label: "Bønn" },
          { value: "undervisning", label: "Undervisning" },
        ];

        customCatArr.forEach((cat) => {
          const val = cat.toLowerCase();
          if (!podcastCategories.find((p) => p.value === val)) {
            podcastCategories.push({ value: val, label: cat });
          }
        });

        if (episodes.length > 0) {
          listContainer.innerHTML = episodes
            .map((ep) => {
              const id = ep.id;
              const encodedId = encodeURIComponent(String(id || "").trim());
              const currentCats = this.parsePodcastOverrideCategories(
                overrides[id],
              );

              const normalizedCurrentCats = currentCats.map((c) =>
                c.toLowerCase(),
              );
              const knownValues = podcastCategories.map((category) =>
                category.value.toLowerCase(),
              );
              const customCats = currentCats.filter(
                (value) => !knownValues.includes(value.toLowerCase()),
              );
              const title = this.escapeHtml(ep.title || "Uten tittel");

              const chipsHtml = podcastCategories
                .map((category) => {
                  const isSelected = normalizedCurrentCats.includes(
                    category.value.toLowerCase(),
                  );
                  return `
                            <button
                                type="button"
                                class="podcast-category-chip"
                                data-value="${category.value}"
                                data-selected="${isSelected ? "true" : "false"}"
                                aria-pressed="${isSelected ? "true" : "false"}"
                                style="border:1px solid ${isSelected ? "#fdba74" : "#e2e8f0"}; background:${isSelected ? "#fff7ed" : "#ffffff"}; color:${isSelected ? "#c2410c" : "#334155"}; padding:7px 12px; border-radius:999px; font-size:12px; font-weight:700; letter-spacing:0.02em; cursor:pointer; transition:all .15s ease;">
                                ${category.label}
                            </button>
                        `;
                })
                .join("");

              return `
                        <div class="podcast-override-item" data-episode-key="${encodedId}" style="padding: 14px 12px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 10px;">
                            <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${title}">${title}</div>
                            <div style="display: flex; align-items: flex-start; gap: 12px; justify-content: space-between; width: 100%;">
                                <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
                                    <div class="podcast-category-chip-group" style="display:flex; flex-wrap:wrap; gap:8px;">
                                        ${chipsHtml}
                                    </div>
                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        <label style="font-size:11px; font-weight:700; color:#64748b; letter-spacing:0.04em; text-transform:uppercase;">Egne kategorier</label>
                                        <input
                                            type="text"
                                            class="custom-podcast-categories form-control"
                                            placeholder="f.eks. vitnesbyrd, lederskap"
                                            value="${this.escapeHtml(customCats.join(", "))}"
                                            style="font-size:12px; padding:8px 10px; max-width:380px; border-radius:10px; border:1px solid #e2e8f0; background:#fff;">
                                    </div>
                                    <span style="font-size:11px; color:#94a3b8;">Klikk for å velge flere. Ingen valg = Auto (nøkkelord).</span>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; min-width:120px;">
                                    <button type="button" class="btn-secondary btn-sm clear-podcast-categories" style="font-size:12px;">Auto</button>
                                    <button type="button" class="btn-secondary btn-sm" data-open-podcast-id="${this.escapeHtml(id)}">Rediger tekst</button>
                                </div>
                            </div>
                        </div>
                    `;
            })
            .join("");

          listContainer
            .querySelectorAll(".podcast-override-item")
            .forEach((itemEl) => {
              const chips = Array.from(
                itemEl.querySelectorAll(".podcast-category-chip"),
              );
              const clearBtn = itemEl.querySelector(
                ".clear-podcast-categories",
              );

              const updateChip = (chip, selected) => {
                chip.dataset.selected = selected ? "true" : "false";
                chip.setAttribute("aria-pressed", selected ? "true" : "false");
                chip.style.borderColor = selected ? "#fdba74" : "#e2e8f0";
                chip.style.background = selected ? "#fff7ed" : "#ffffff";
                chip.style.color = selected ? "#c2410c" : "#334155";
              };

              chips.forEach((chip) => {
                chip.addEventListener("click", () => {
                  const isSelected = chip.dataset.selected === "true";
                  updateChip(chip, !isSelected);
                });
              });

              clearBtn?.addEventListener("click", () => {
                chips.forEach((chip) => updateChip(chip, false));
                const customInput = itemEl.querySelector(
                  ".custom-podcast-categories",
                );
                if (customInput) customInput.value = "";
              });
            });
        } else {
          listContainer.innerHTML =
            '<p class="text-muted">Ingen episoder funnet.</p>';
        }
      } catch (err) {
        console.error("Load podcast overrides error:", err);
        listContainer.innerHTML =
          '<p class="text-danger">Kunne ikke laste episoder.</p>';
      }
    },

    async savePodcastOverrides() {
      const btn = document.getElementById("save-podcast-overrides");
      const rows = document.querySelectorAll(".podcast-override-item");
      const overrides = {};

      // 1. Start with categories from the global sync input
      const syncInput = document.getElementById(
        "podcast-global-categories-sync",
      );
      const currentGlobalStr = syncInput?.value || "";

      // Use a Map to keep track of categories case-insensitively (key is lowercase, value is original casing)
      const globalCatsMap = new Map();

      // Helper to add to map safely
      const addToGlobal = (cat) => {
        const trimmed = String(cat || "").trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!globalCatsMap.has(key)) {
          globalCatsMap.set(key, trimmed);
        }
      };

      // Add initial global ones
      currentGlobalStr.split(",").forEach(addToGlobal);

      rows.forEach((row) => {
        const encodedId = row.getAttribute("data-episode-key") || "";
        const episodeId = decodeURIComponent(encodedId || "");
        if (!episodeId) return;

        const selected = Array.from(
          row.querySelectorAll('.podcast-category-chip[data-selected="true"]'),
        )
          .map((chip) => String(chip.getAttribute("data-value") || "").trim())
          .filter(Boolean);

        const customInput = row.querySelector(".custom-podcast-categories");
        const customValue = customInput?.value || "";
        const customCategories =
          this.parsePodcastOverrideCategories(customValue);

        // Add any NEW custom categories from this episode to the global list
        customCategories.forEach(addToGlobal);

        // Merge selected chips and new text input for this episode
        const merged = Array.from(new Set([...selected, ...customCategories]));

        if (merged.length === 1) {
          overrides[episodeId] = merged[0];
        } else if (merged.length > 1) {
          overrides[episodeId] = merged;
        }
      });

      btn.textContent = "Lagrer...";
      btn.disabled = true;

      try {
        // 1. Fetch latest podcast settings to avoid overwriting other changes (like Spotify URL)
        const podcastSettings = await this.getPodcastSettings();

        // Also merge in categories that might already be in the database
        const dbGlobalStr = podcastSettings.podcastCustomCategories || "";
        dbGlobalStr.split(",").forEach(addToGlobal);

        // Final string of all global categories
        const updatedGlobalStr = Array.from(globalCatsMap.values()).join(", ");

        // 2. Save updated global categories
        await firebaseService.savePageContent("settings_podcast", {
          ...podcastSettings,
          podcastCustomCategories: updatedGlobalStr,
          updatedAt: new Date().toISOString(),
        });

        // 3. Save episode overrides
        await firebaseService.savePageContent("settings_podcast_overrides", {
          overrides: overrides,
          updatedAt: new Date().toISOString(),
        });

        // Update UI inputs
        if (syncInput) syncInput.value = updatedGlobalStr;
        const mainCustomInput = document.getElementById(
          "podcast-custom-categories",
        );
        if (mainCustomInput) mainCustomInput.value = updatedGlobalStr;

        this.showToast("Lagret! Alle kategorier er nå faste.", "success", 3000);

        // Reload the list to convert text inputs into chips
        await this.loadPodcastOverrides();
      } catch (err) {
        console.error("Save overrides error:", err);
        this.showToast("Feil ved lagring: " + err.message, "error", 5000);
      } finally {
        btn.textContent = "Lagre overstyringer";
        btn.disabled = false;
      }
    },
  };
}
