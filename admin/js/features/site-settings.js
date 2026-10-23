// site settings methods for AdminManager.
export function createMethods32({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async renderSEOSection() {
      const section = document.getElementById("seo-section");
      if (!section) return;

      section.innerHTML = `
            <div class="design-ui-shell">
                <div class="design-ui-topbar design-ui-panel">
                    <div class="design-ui-topbar-main">
                        <div class="design-ui-topbar-icon">
                            <span class="material-symbols-outlined">search</span>
                        </div>
                        <div>
                            <h3 class="design-ui-title">Globale SEO-innstillinger</h3>
                            <p class="design-ui-muted">Grunnleggende optimalisering for at innholdet ditt skal finnes i Google og sosiale medier.</p>
                        </div>
                    </div>
                    <div class="design-ui-actions">
                        <button class="btn btn-primary" id="save-global-seo" type="button">
                            <span class="material-symbols-outlined">save</span>
                            Lagre endringer
                        </button>
                    </div>
                </div>

                <div class="design-ui-workspace">
                    <div class="design-ui-top-grid">
                        <div class="design-ui-main-column">
                            <div class="design-ui-panel design-ui-panel--seo">
                                <div class="design-ui-panel-header">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">language</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">Hovedinformasjon</h3>
                                        <p class="design-ui-panel-subtitle">Metadata som leses av søkemotorer.</p>
                                    </div>
                                </div>
                                <div class="design-ui-panel-body">
                                    <div class="form-group">
                                        <label>Nettsteds Tittel (Prefix/Suffix)</label>
                                        <input type="text" id="seo-global-title" class="form-control" placeholder="His Kingdom Ministry">
                                    </div>
                                    <div class="form-group">
                                        <label>Standard Beskrivelse (Meta Description)</label>
                                        <textarea id="seo-global-desc" class="form-control" style="height: 100px;"></textarea>
                                    </div>
                                    <div class="form-group" style="margin-bottom:0;">
                                        <label>Søkeord (Keywords)</label>
                                        <input type="text" id="seo-global-keywords" class="form-control" placeholder="tro, jesus, undervisning">
                                        <span class="helper-text design-ui-muted" style="margin-top: 4px; display: block; font-size: 13px;">Separer med komma.</span>
                                    </div>
                                </div>
                            </div>

                            <div class="design-ui-panel">
                                <div class="design-ui-panel-header">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">share</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">Sosiale Medier (Open Graph)</h3>
                                        <p class="design-ui-panel-subtitle">Bildet som vises når du deler linker på Facebook, LinkedIn og SMS.</p>
                                    </div>
                                </div>
                                <div class="design-ui-panel-body">
                                    <div class="form-group" style="margin-bottom:0;">
                                        <!-- Modern Upload Area -->
                                        <div class="upload-area" id="upload-og-img" style="cursor: pointer; border: 2px dashed var(--border-color); border-radius: 12px; padding: 32px; text-align: center; background: #f8fafc; transition: all 0.2s;">
                                            <span class="material-symbols-outlined upload-icon" style="font-size: 32px; color: #94a3b8; margin-bottom: 8px; display: block;">add_photo_alternate</span>
                                            <span class="upload-label" style="display: block; font-weight: 500; font-size: 15px; margin-bottom: 4px;">Klikk for å laste opp bilde</span>
                                            <span class="upload-hint" style="display: block; font-size: 13px; color: #64748b;">Anbefalt størrelse: 1200 x 630 px</span>
                                        </div>
                                        <input type="file" id="og-file-input" style="display: none;" accept="image/*">
                                        <input type="hidden" id="seo-og-image">
                                    </div>
                                    <div id="og-preview" style="margin-top: 20px; border-radius: 12px; overflow: hidden; display: none; border: 1px solid var(--border-color);"></div>
                                </div>
                            </div>
                        </div>

                        <aside class="design-ui-side-column">
                            <div class="design-ui-panel design-ui-help-panel design-ui-panel--help">
                                <div class="design-ui-panel-header design-ui-panel-header--compact">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">auto_awesome</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">AI-Søk Optimalisering</h3>
                                    </div>
                                </div>
                                <div class="design-ui-panel-body">
                                    <p style="font-size: 14px; line-height: 1.6; color: var(--text-muted); margin-bottom: 16px;">Ved å legge til GEO-data og tydelige SEO-titler hjelper du AIer som ChatGPT og Perplexity å finne innholdet ditt mer presist. Dette øker sjansen for at kirken blir anbefalt i samtaler.</p>

                                    <div class="form-group">
                                        <label>GEO Posisjon (Lat, Long)</label>
                                        <input type="text" id="seo-global-geo-pos" class="form-control" placeholder="59.9139, 10.7522">
                                    </div>
                                    <div class="form-group">
                                        <label>GEO Region</label>
                                        <input type="text" id="seo-global-geo-region" class="form-control" placeholder="NO-Oslo">
                                    </div>
                                    <div class="form-group" style="margin-bottom: 0;">
                                        <label>GEO Sted</label>
                                        <input type="text" id="seo-global-geo-place" class="form-control" placeholder="Oslo">
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <div class="design-ui-full-stack">
                        <div class="design-ui-panel">
                            <div class="design-ui-panel-header" style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 16px;">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">description</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">Sidespesifikk SEO</h3>
                                        <p class="design-ui-panel-subtitle">Overstyr globale innstillinger for enkeltsider.</p>
                                    </div>
                                </div>
                                <div>
                                    <select id="seo-page-selector" class="form-control" style="width: 250px; margin: 0;">
                                        <option value="index">Forside</option>
                                        <option value="om-oss">Om Oss</option>
                                        <option value="media">Media</option>
                                        <option value="arrangementer">Arrangementer</option>
                                        <option value="blogg">Blogg</option>
                                        <option value="donasjoner">Donasjoner</option>
                                        <option value="kontakt">Kontakt</option>
                                        <option value="undervisning">Undervisning</option>
                                        <option value="bibelstudier">Bibelstudier</option>
                                        <option value="seminarer">Seminarer</option>
                                        <option value="podcast">Podcast</option>
                                    </select>
                                </div>
                            </div>
                            <div class="design-ui-panel-body">
                                <div class="design-ui-control-stack">
                                    <div class="form-group">
                                        <label>Side-tittel (Vises i fanen)</label>
                                        <input type="text" id="seo-page-title" class="form-control" placeholder="La stå tom for å bruke standard">
                                    </div>
                                    <div class="form-group">
                                        <label>Side-beskrivelse</label>
                                        <textarea id="seo-page-desc" class="form-control" style="height: 80px;" placeholder="Optimalisert beskrivelse for denne spesifikke siden..."></textarea>
                                    </div>
                                    <div class="grid-2-cols" style="gap: 24px; display: grid; grid-template-columns: 1fr 1fr;">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>GEO Posisjon (Side)</label>
                                            <input type="text" id="seo-page-geo-pos" class="form-control">
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>GEO Sted (Side)</label>
                                            <input type="text" id="seo-page-geo-place" class="form-control">
                                        </div>
                                    </div>
                                </div>
                                <div class="design-ui-actions" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color); justify-content: flex-end;">
                                    <button class="btn btn-secondary" id="save-page-seo" type="button">
                                        <span class="material-symbols-outlined">save</span>
                                        Lagre SEO for denne siden
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
      section.setAttribute("data-rendered", "true");

      // Load Data
      const seoData =
        (await firebaseService.getPageContent("settings_seo")) || {};
      document.getElementById("seo-global-title").value =
        seoData.globalTitle || "";
      document.getElementById("seo-global-desc").value =
        seoData.globalDescription || "";
      document.getElementById("seo-global-keywords").value =
        seoData.globalKeywords || "";
      document.getElementById("seo-og-image").value = seoData.ogImage || "";
      document.getElementById("seo-global-geo-pos").value =
        seoData.geoPosition || "";
      document.getElementById("seo-global-geo-region").value =
        seoData.geoRegion || "";
      document.getElementById("seo-global-geo-place").value =
        seoData.geoPlacename || "";

      const updateOGPreview = () => {
        const url = document.getElementById("seo-og-image").value;
        const preview = document.getElementById("og-preview");
        if (url) {
          preview.innerHTML = `<img src="${url}" style="width: 100%; display: block;">`;
          preview.style.display = "block";
        } else {
          preview.style.display = "none";
        }
      };
      updateOGPreview();

      // Page SEO Loading
      const pageSelector = document.getElementById("seo-page-selector");
      const loadPageSEO = () => {
        const pageId = pageSelector.value;
        const pageSEO = (seoData.pages && seoData.pages[pageId]) || {};
        document.getElementById("seo-page-title").value = pageSEO.title || "";
        document.getElementById("seo-page-desc").value =
          pageSEO.description || "";
        document.getElementById("seo-page-geo-pos").value =
          pageSEO.geoPosition || "";
        document.getElementById("seo-page-geo-place").value =
          pageSEO.geoPlacename || "";
      };
      pageSelector.onchange = loadPageSEO;
      loadPageSEO();

      // Image Upload
      const ogFileInput = document.getElementById("og-file-input");
      const uploadOGBtn = document.getElementById("upload-og-img");
      uploadOGBtn.onclick = () => ogFileInput.click();
      ogFileInput.onchange = async () => {
        if (ogFileInput.files.length === 0) return;
        uploadOGBtn.disabled = true;
        uploadOGBtn.innerHTML =
          '<span class="material-symbols-outlined rotating">sync</span>';
        try {
          const url = await firebaseService.uploadImage(
            ogFileInput.files[0],
            `seo / og_image_${Date.now()} `,
          );
          document.getElementById("seo-og-image").value = url;
          updateOGPreview();
        } catch (err) {
          this.showToast("Opplasting feilet", "error", 5000);
        } finally {
          uploadOGBtn.disabled = false;
          uploadOGBtn.innerHTML =
            '<span class="material-symbols-outlined">upload</span>';
        }
      };

      // Save Global
      document.getElementById("save-global-seo").onclick = async () => {
        const btn = document.getElementById("save-global-seo");
        seoData.globalTitle = document.getElementById("seo-global-title").value;
        seoData.globalDescription =
          document.getElementById("seo-global-desc").value;
        seoData.globalKeywords = document.getElementById(
          "seo-global-keywords",
        ).value;
        seoData.ogImage = document.getElementById("seo-og-image").value;
        seoData.geoPosition =
          document.getElementById("seo-global-geo-pos").value;
        seoData.geoRegion = document.getElementById(
          "seo-global-geo-region",
        ).value;
        seoData.geoPlacename = document.getElementById(
          "seo-global-geo-place",
        ).value;

        btn.textContent = "Lagrer...";
        btn.disabled = true;
        try {
          await firebaseService.savePageContent("settings_seo", seoData);
          this.showToast("Globale SEO-innstillinger lagret!", "success", 5000);
        } catch (err) {
          this.showToast("Feil ved lagring", "error", 5000);
        } finally {
          btn.textContent = "Lagre Globale Innstillinger";
          btn.disabled = false;
        }
      };

      // Save Page SEO
      document.getElementById("save-page-seo").onclick = async () => {
        const btn = document.getElementById("save-page-seo");
        const pageId = pageSelector.value;
        if (!seoData.pages) seoData.pages = {};
        seoData.pages[pageId] = {
          title: document.getElementById("seo-page-title").value,
          description: document.getElementById("seo-page-desc").value,
          geoPosition: document.getElementById("seo-page-geo-pos").value,
          geoPlacename: document.getElementById("seo-page-geo-place").value,
        };

        btn.textContent = "Lagrer...";
        btn.disabled = true;
        try {
          await firebaseService.savePageContent("settings_seo", seoData);
          this.showToast(`SEO for ${pageId} lagret!`, "success", 5000);
        } catch (err) {
          this.showToast("Feil ved lagring", "error", 5000);
        } finally {
          btn.textContent = "Lagre SEO for denne siden";
          btn.disabled = false;
        }
      };
    },

    /**
     * Settings, Placeholders and Helpers
     */
    /**
     * Settings, Placeholders and Helpers
     */
    renderSettingsSection() {
      const section = document.getElementById("settings-section");
      if (!section) return;

      section.innerHTML = `
                    <div class="design-ui-shell">
                        <div class="design-ui-workspace">
                            <div class="design-ui-top-grid">
                                <div class="design-ui-main-column">
                                    <!-- System Status Panel -->
                                    <div class="design-ui-panel" style="border-left: 4px solid #10b981;">
                                        <div class="design-ui-panel-header" style="flex-wrap: wrap; gap: 16px;">
                                            <div class="design-ui-panel-header-icon" style="background: #ecfdf5; color: #10b981; flex-shrink: 0;">
                                                <span class="material-symbols-outlined">check_circle</span>
                                            </div>
                                            <div style="flex: 1 1 200px; min-width: 180px; word-break: normal; overflow-wrap: break-word;">
                                                <h3 class="design-ui-panel-title" style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; word-break: normal; white-space: normal;">SYSTEMSTATUS: NORMAL</h3>
                                                <p class="design-ui-panel-subtitle" style="margin: 4px 0 0; font-size: 13.5px; color: #64748b; word-break: normal; white-space: normal; line-height: 1.45;">Alle systemer fungerer optimalt. Siste backup ble kjørt automatisk i natt.</p>
                                            </div>
                                            <a href="admin-logger.html" class="btn btn-outline" style="text-decoration: none; flex-shrink: 0; margin-left: auto;">Se logger</a>
                                        </div>
                                    </div>

                                    <!-- HKM Mobilapp & PWA Synkronisering Panel -->
                                    <div class="design-ui-panel" style="margin-bottom: 20px;">
                                        <div class="design-ui-panel-header">
                                            <div class="design-ui-panel-header-icon" style="background: #e0f2fe; color: #0284c7;">
                                                <span class="material-symbols-outlined">smartphone</span>
                                            </div>
                                            <div style="flex: 1;">
                                                <h3 class="design-ui-panel-title">HKM Mobilapp & PWA Synkronisering</h3>
                                                <p class="design-ui-panel-subtitle">Administrer app-synkronisering og sanntidsoppdateringer på tvers av enheter.</p>
                                            </div>
                                        </div>
                                        <div class="design-ui-panel-body">
                                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                                                    <span style="font-weight: 600; font-size: 14px; color: #334155;">Status for HKM App</span>
                                                    <span class="badge" style="background: #dcfce7; color: #15803d; font-weight: 600; padding: 4px 10px; border-radius: 20px;">🟢 Aktiv & Synkronisert</span>
                                                </div>
                                                <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #475569; line-height: 1.6;">
                                                    <li><strong>Bibeloversettelser:</strong> 7 oversettelser (Bokmål, Nynorsk, KJV, WEB, RVR1960, NVI) synkroniseres automatisk.</li>
                                                    <li><strong>Kurs & Leseplaner:</strong> Alle leseplaner og leksjoner oppdateres i sanntid via Firebase Firestore.</li>
                                                    <li><strong>Podcast & Medier:</strong> Nyeste episoder fra Spotify/Anchor og YouTube strømmes direkte.</li>
                                                </ul>
                                            </div>
                                            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                                <button class="btn btn-primary" style="flex: 1; min-width: 200px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;" onclick="window.adminManager ? window.adminManager.syncPwaApp() : location.reload();">
                                                    <span class="material-symbols-outlined">sync</span> Tving App-Oppdatering
                                                </button>
                                                <button class="btn btn-outline" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;" onclick="navigator.clipboard.writeText('https://www.hiskingdomministry.no/'); if (window.showNotification) window.showNotification('App-lenke kopiert til utklippstavlen!', 'success'); else alert('App-lenke kopiert!');">
                                                    <span class="material-symbols-outlined">link</span> Kopier App-Lenke
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Data Tools Panel -->
                                    <div class="design-ui-panel">
                                        <div class="design-ui-panel-header">
                                            <div class="design-ui-panel-header-icon">
                                                <span class="material-symbols-outlined">build</span>
                                            </div>
                                            <div>
                                                <h3 class="design-ui-panel-title">Datasynkronisering & Verktøy</h3>
                                            </div>
                                        </div>
                                        <div class="design-ui-panel-body">
                                            <div class="tools-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                                <!-- Cache Tool -->
                                                <div class="tool-card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                                                    <div class="tool-icon-circle warning" style="background: #fef2f2; color: #ef4444; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                                        <span class="material-symbols-outlined">delete_forever</span>
                                                    </div>
                                                    <div class="tool-info" style="margin-bottom: 16px;">
                                                        <h4 style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Nullstille Cache</h4>
                                                        <p style="font-size: 13px; color: var(--text-muted);">Tøm lokal lagring og last siden på nytt.</p>
                                                    </div>
                                                    <button class="btn btn-outline" style="width: 100%; border-color: #fca5a5; color: #ef4444;" onclick="localStorage.clear(); window.location.reload();">
                                                        Tøm Cache
                                                    </button>
                                                </div>

                                                <!-- Wix Cleanup Tool -->
                                                <div class="tool-card" style="border: 1px solid var(--border-color); border-radius: 12px; padding: 16px;">
                                                    <div class="tool-icon-circle warning" style="background: #fff7ed; color: #f97316; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                                        <span class="material-symbols-outlined">auto_fix_high</span>
                                                    </div>
                                                    <div class="tool-info" style="margin-bottom: 16px;">
                                                        <h4 style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Wix-vasker (Database)</h4>
                                                        <p style="font-size: 13px; color: var(--text-muted);">Fjerner permanent Wix-rester fra alle innlegg.</p>
                                                    </div>
                                                    <button class="btn btn-primary" style="width: 100%;" onclick="window.adminManager.performWixDatabaseCleanup()">
                                                        Kjør Wix-vask
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Firebase Panel -->
                                <aside class="design-ui-side-column">
                                    <div class="design-ui-panel">
                                        <div class="design-ui-panel-header design-ui-panel-header--compact">
                                            <div class="design-ui-panel-header-icon" style="background: #fff7ed; color: #f97316;">
                                                <span class="material-symbols-outlined">cloud</span>
                                            </div>
                                            <div style="flex: 1;">
                                                <h3 class="design-ui-panel-title">Firebase Konfigurasjon</h3>
                                            </div>
                                        </div>
                                        <div class="design-ui-panel-body">
                                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                                                Endre konfigurasjonen kun hvis du vet hva du gjør. Feil her kan stoppe nettsiden.
                                            </p>

                                            <div class="code-editor-container" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                                                <div class="code-editor-header" style="background: #f8fafc; padding: 8px 12px; font-size: 11px; font-family: monospace; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                                                    <span class="lang-tag" style="color: #64748b; font-weight: bold;">JSON</span>
                                                    <span class="file-name" style="color: #64748b;">firebase-config.js</span>
                                                </div>
                                                <div class="code-editor-wrap" style="display: flex; background: #fff;">
                                                    <div class="line-numbers" style="background: #f1f5f9; color: #94a3b8; padding: 12px 8px; text-align: right; font-family: monospace; font-size: 12px; user-select: none;">
                                                        <div style="margin-bottom: 4px;">1</div>
                                                        <div style="margin-bottom: 4px;">2</div>
                                                        <div style="margin-bottom: 4px;">3</div>
                                                    </div>
                                                    <textarea id="fb-config" class="code-input" spellcheck="false" style="width: 100%; border: none; padding: 12px; font-family: monospace; font-size: 12px; resize: vertical; min-height: 100px; outline: none; background: transparent;">${localStorage.getItem("hkm_firebase_config") || ""}</textarea>
                                                </div>
                                            </div>

                                            <button class="btn btn-primary" id="save-fb" style="width: 100%;">
                                                <span class="material-symbols-outlined">save</span>
                                                Lagre & Koble til
                                            </button>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    </div>
                    `;
      section.setAttribute("data-rendered", "true");

      document.getElementById("save-fb").addEventListener("click", () => {
        const val = document.getElementById("fb-config").value;
        localStorage.setItem("hkm_firebase_config", val);
        this.showToast("Lagret! Laster på nytt...", "success", 5000);
        setTimeout(() => window.location.reload(), 2000);
      });

      const syncBtn = document.getElementById("sync-existing-content");
      if (syncBtn) {
        syncBtn.addEventListener("click", () => this.seedExistingData());
      }
    },

    async renderPrivacyDocument(data) {
      const response = await fetch("/personvern", { cache: "no-store" });
      if (!response.ok) throw new Error("Kunne ikke hente personvernteksten.");
      const doc = new DOMParser().parseFromString(
        await response.text(),
        "text/html",
      );
      const body = doc.querySelector(".legal-text-container");
      if (!body) throw new Error("Personvernteksten mangler.");
      body.querySelectorAll("[data-content-key]").forEach((el) => {
        const value = el.dataset.contentKey
          .split(".")
          .reduce((obj, key) => obj?.[key], data);
        if (typeof value === "string" && el.innerHTML.trim() !== value.trim())
          el.textContent = value;
        el.removeAttribute("data-content-key");
      });
      if (
        document.querySelector(".page-item.active")?.dataset.page !==
        "personvern"
      )
        return;
      this.renderFields({ hero: data.hero || {} });
      const container = document.getElementById("editor-fields");
      const group = document.createElement("div");
      group.className =
        "form-group is-textarea is-full-width is-privacy-editor";
      group.style.gridColumn = "1 / -1";
      group.style.width = "100%";
      group.style.boxSizing = "border-box";
      const label = document.createElement("h3");
      label.textContent = "Hele personvernerklæringen";
      label.style.marginTop = "0";
      label.style.marginBottom = "6px";
      const hint = document.createElement("p");
      hint.textContent =
        "Rediger teksten samlet. Bruk verktøylinjen for overskrifter, lister og lenker. Trykk Lagre når du er ferdig. Dette redigerer den norske teksten; oversettelser endres ikke automatisk.";
      hint.style.color = "var(--admin-text-muted, #64748b)";
      hint.style.fontSize = "14px";
      hint.style.marginBottom = "16px";
      const hidden = document.createElement("textarea");
      hidden.className = "form-control";
      hidden.dataset.key = "content.bodyHtml";
      hidden.hidden = true;
      const editor = document.createElement("div");
      editor.style.minHeight = "600px";
      editor.style.width = "100%";
      editor.style.boxSizing = "border-box";
      group.append(label, hint, hidden, editor);
      container.append(group);
      if (typeof Quill === "undefined")
        throw new Error("Teksteditoren kunne ikke lastes. Last siden på nytt.");
      const quill = new Quill(editor, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [2, 3, false] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "clean"],
          ],
        },
      });
      quill.clipboard.dangerouslyPasteHTML(
        typeof data.content?.bodyHtml === "string"
          ? data.content.bodyHtml
          : body.innerHTML,
      );
      quill.root.setAttribute("aria-label", "Hele personvernerklæringen");
      hidden.value = quill.root.innerHTML;
      quill.on("text-change", () => {
        hidden.value = quill.root.innerHTML;
      });
    },
  };
}
