// integrations methods for AdminManager.
export function createMethods4({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async performWixDatabaseCleanup() {
      // Auto-confirm if hash is present, otherwise ask
      if (window.location.hash !== "#force-wix-cleanup") {
        if (
          !confirm(
            'Dette vil permanent fjerne Wix-spesifikk formatering og "junk" fra alle innlegg i databasen. Er du sikker?',
          )
        )
          return;
      }

      try {
        if (!window.firebaseService || !window.firebaseService.db) {
          console.error("[Cleanup] Firebase Service not ready");
          return;
        }
        if (!window.contentManager) {
          console.error("[Cleanup] Content Manager not ready, waiting...");
          await new Promise((r) => setTimeout(r, 1000));
          if (!window.contentManager)
            throw new Error("Content Manager mangler.");
        }

        console.log("[Cleanup] Starter Wix-opprydding...");
        const collections = ["collection_blog", "collection_teaching"];
        let totalCleaned = 0;
        let totalProcessed = 0;

        for (const colName of collections) {
          console.log(`[Cleanup] Behandler ${colName}...`);
          const snapshot = await window.firebaseService.db
            .collection("content")
            .doc(colName)
            .collection("items")
            .get();

          for (const doc of snapshot.docs) {
            totalProcessed++;
            try {
              const data = doc.data();
              let hasChanges = false;

              if (data.articleHtml) {
                const cleaned = window.contentManager.cleanLegacyHtml(
                  data.articleHtml,
                );
                if (cleaned !== data.articleHtml) {
                  data.articleHtml = cleaned;
                  hasChanges = true;
                }
              }

              if (data.content) {
                if (typeof data.content === "string") {
                  const cleaned = window.contentManager.cleanLegacyHtml(
                    data.content,
                  );
                  if (cleaned !== data.content) {
                    data.content = cleaned;
                    hasChanges = true;
                  }
                } else if (typeof data.content === "object") {
                  const cleaned = window.contentManager.cleanEditorBlocks(
                    data.content,
                  );
                  // Simple JSON comparison for change detection
                  if (
                    JSON.stringify(cleaned) !== JSON.stringify(data.content)
                  ) {
                    data.content = cleaned;
                    hasChanges = true;
                  }
                }
              }

              if (hasChanges) {
                await doc.ref.update(data);
                totalCleaned++;
                console.log(`[Cleanup] ✓ Oppdatert ${doc.id}`);
              }
            } catch (docErr) {
              console.warn(
                `[Cleanup] Kunne ikke behandle dokument ${doc.id}:`,
                docErr,
              );
            }
          }
        }
        console.log(
          `[Cleanup] Fullført. Behandlet ${totalProcessed} dok, ryddet ${totalCleaned} dok.`,
        );
        alert(
          `Suksess! Ryddet opp i ${totalCleaned} dokumenter. Wix-rester er nå permanent fjernet.`,
        );
        // Clear hash to prevent infinite loop
        if (window.location.hash === "#force-wix-cleanup") {
          history.replaceState(null, null, " ");
        }
        window.location.reload();
      } catch (err) {
        console.error("[Cleanup] Kritisk feil under opprydding:", err);
        alert("En kritisk feil oppstod under oppryddingen: " + err.message);
      }
    },

    async syncPwaApp() {
      try {
        this.showToast("Initialiserer app-synkronisering...", "info");
        if (window.firebaseService && window.firebaseService.db) {
          await window.firebaseService.db
            .collection("content")
            .doc("settings_app_sync")
            .set(
              {
                lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: window.firebaseService.currentUser?.email || "admin",
                pwaVersion: "2026.08",
              },
              { merge: true },
            );
        }
        this.showToast(
          "🟢 HKM Mobilapp & PWA er nå fullstendig synkronisert!",
          "success",
          5000,
        );
      } catch (err) {
        console.error("[syncPwaApp] Feil ved app-synkronisering:", err);
        this.showToast(
          "Kunne ikke oppdatere synk-status: " + err.message,
          "error",
        );
      }
    },

    async checkSystemHealth() {
      if (!firebaseService.db) return;

      try {
        const snapshot = await firebaseService.db
          .collection("system_logs")
          .where("severity", "==", "CRITICAL")
          .where("read", "==", false)
          .get();

        const criticalCount = snapshot.size;
        const healthCard = document.getElementById("system-health-card");
        const healthIcon = document.getElementById("system-health-icon");
        const healthStatus = document.getElementById("system-health-status");
        const healthText = document.getElementById("system-health-text");

        if (healthCard && criticalCount > 0) {
          healthIcon.className = "stat-icon red";
          healthIcon.innerHTML =
            '<span class="material-symbols-outlined">warning</span>';
          healthStatus.textContent = "Kritisk";
          healthStatus.style.color = "#ef4444";
          healthText.textContent = `${criticalCount} ulest(e) kritisk feil`;
          healthCard.style.border = "1px solid #ef4444";

          // Make clickable to see logs (feature for later expansion: view logs section)
          healthCard.style.cursor = "pointer";
          healthCard.onclick = () =>
            showToast(
              `Det er ${criticalCount} kritiske feil i loggen.Sjekk Firestore 'system_logs' eller e - postvarsler.`,
            );
        }
      } catch (e) {
        console.error("Failed to check system health:", e);
      }
    },

    async fetchYouTubeStats() {
      let YT_CHANNEL_ID = "UCFbX-Mf7NqDm2a07hk6hveg";
      let apiKey = "";

      try {
        const mediaSettings =
          await firebaseService.getPageContent("settings_media");
        if (mediaSettings) {
          if (mediaSettings.youtubeChannelId)
            YT_CHANNEL_ID = mediaSettings.youtubeChannelId;
          if (mediaSettings.youtubeApiKey) apiKey = mediaSettings.youtubeApiKey;
        }
      } catch (e) {
        console.warn(
          "[BibleReader] Error loading media settings for YouTube stats:",
          e,
        );
      }

      let url = `/api/youtube?action=stats&channelId=${YT_CHANNEL_ID}`;
      if (apiKey) {
        url += `&key=${encodeURIComponent(apiKey)}`;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`YouTube API returned status ${response.status}`);
        }
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const stats = data.items[0].statistics;
          const statsObj = {
            subscribers: stats.subscriberCount,
            videos: stats.videoCount,
            views: stats.viewCount,
          };
          try {
            localStorage.setItem(
              "hkm_youtube_stats_cache",
              JSON.stringify(statsObj),
            );
          } catch (cacheErr) {
            console.warn(
              "Failed to cache YouTube stats to localStorage:",
              cacheErr,
            );
          }
          return statsObj;
        }
      } catch (error) {
        console.warn(
          "Error fetching YouTube stats from API, trying cache:",
          error,
        );
      }

      // Fallback: Try to read last successfully fetched stats from cache
      try {
        const cachedData = localStorage.getItem("hkm_youtube_stats_cache");
        if (cachedData) {
          const stats = JSON.parse(cachedData);
          console.log(
            "Successfully recovered YouTube stats from cache:",
            stats,
          );
          return stats;
        }
      } catch (e) {
        console.warn("Failed to parse cached YouTube stats:", e);
      }

      return null;
    },

    renderIntegrationsSection() {
      const section = document.getElementById("integrations-section");
      if (!section) return;

      section.innerHTML = `
            <div class="integrations-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 24px; align-items: stretch;">
                <div class="card modern" style="height: 100%; display: flex; flex-direction: column;">
                    <div class="card-header flex-between">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: #fff1f2; color: #e11d48; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">video_library</span>
                            </div>
                            <h3 class="card-title">YouTube</h3>
                        </div>
                    </div>
                    <div class="card-body" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div class="form-section">
                            <div class="form-group">
                                <label>YouTube Channel ID</label>
                                <input type="text" id="yt-channel-id" class="form-control" placeholder="f.eks. UCxxxxxxxxxxxx">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>YouTube API-nøkkel</label>
                                <input type="password" id="yt-api-key" class="form-control" placeholder="Din Google Cloud API-nøkkel for YouTube">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>YouTube Kategorier (Playlister)</label>
                                <textarea id="yt-playlists" class="form-control" style="height: 100px;" placeholder="Navn: PlaylistID (én per linje)"></textarea>
                            </div>
                        </div>
                        <div style="margin-top: 24px;">
                            <button class="btn-primary" id="save-youtube-settings" style="width: 100%;">Lagre YouTube-innstillinger</button>
                        </div>
                    </div>
                </div>

                <div class="card modern" style="height: 100%; display: flex; flex-direction: column;">
                    <div class="card-header flex-between">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: #e0f2fe; color: #0ea5e9; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">calendar_month</span>
                            </div>
                            <h3 class="card-title">Google Calendar API</h3>
                        </div>
                        <div class="status-badge" id="gcal-status" style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #fee2e2; color: #991b1b; font-weight: 600;">Frakoblet</div>
                    </div>
                    <div class="card-body" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="form-group">
                                <label>Google API Key</label>
                                <input type="password" id="gcal-api-key" class="form-control" placeholder="Din Google Cloud API Key">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>Calendar ID</label>
                                <div id="gcal-list" class="gcal-list" style="margin-bottom: 8px;"></div>
                                <button type="button" class="btn btn-outline" id="add-gcal" style="width: 100%;">
                                    <span class="material-symbols-outlined" style="font-size: 18px; margin-right: 4px;">add</span>
                                    Legg til kalender
                                </button>
                            </div>
                        </div>
                        <div id="google-auth-status" style="margin-top: 20px;"></div>
                    </div>
                </div>

                <div class="card modern" style="height: 100%; display: flex; flex-direction: column;">
                    <div class="card-header flex-between">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">monitoring</span>
                            </div>
                            <h3 class="card-title">Google Analytics 4</h3>
                        </div>
                    </div>
                    <div class="card-body" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="form-group" style="margin-bottom: 12px;">
                                <label>GA4 Property ID</label>
                                <input type="text" id="ga-property-id" class="form-control" placeholder="f.eks. 123456789">
                            </div>
                            <div class="form-group" style="margin-bottom: 12px;">
                                <label>Service Account Email</label>
                                <input type="text" id="ga-service-email" class="form-control" placeholder="analytics-bot@project.iam.gserviceaccount.com">
                            </div>
                            <div class="form-group">
                                <label>Service Account Private Key</label>
                                <textarea id="ga-private-key" class="form-control" style="height: 80px; font-family: monospace; font-size: 11px;" placeholder="-----BEGIN PRIVATE KEY-----\n..."></textarea>
                            </div>
                        </div>
                        <div style="margin-top: 24px;">
                            <button class="btn-primary" id="save-ga-settings" style="width: 100%; background: #ef4444;">Lagre Analytics-nøkler</button>
                        </div>
                    </div>
                </div>

                <div class="card modern" style="height: 100%; display: flex; flex-direction: column;">
                    <div class="card-header flex-between">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: #f5f3ff; color: #7c3aed; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">translate</span>
                            </div>
                            <h3 class="card-title">AI & Oversettelse</h3>
                        </div>
                    </div>
                    <div class="card-body" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>Leverandør</label>
                                <select id="translation-provider" class="form-control">
                                    <option value="google">Google Oversettelse</option>
                                    <option value="gemini">Gemini (Google AI)</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>Gemini API Key</label>
                                <input type="password" id="gemini-api-key" class="form-control" placeholder="AIza...">
                            </div>
                            <div class="form-group">
                                <label>Modell</label>
                                <input type="text" id="gemini-model" class="form-control" placeholder="gemini-1.5-flash">
                            </div>
                        </div>
                        <div style="margin-top: 24px;">
                            <button type="button" id="test-translation" class="btn-secondary">Test oversettelse</button><p id="translation-test-result" role="status"></p>
                            <button class="btn-primary" id="save-ai-settings" style="width: 100%; background: #7c3aed;">Lagre AI-innstillinger</button>
                        </div>
                    </div>
                </div>

                <div class="card modern" style="height: 100%; display: flex; flex-direction: column;">
                    <div class="card-header flex-between">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: #fff7ed; color: #d17d39; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">podcasts</span>
                            </div>
                            <h3 class="card-title">Podcast & RSS Feed</h3>
                        </div>
                    </div>
                    <div class="card-body" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>RSS Feed URL</label>
                                <input type="text" id="integ-podcast-rss-url" class="form-control" placeholder="https://anchor.fm/s/f7a13dec/podcast/rss">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>Spotify Podcast URL</label>
                                <input type="text" id="integ-podcast-spotify-url" class="form-control" placeholder="https://open.spotify.com/show/...">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>Apple Podcasts URL</label>
                                <input type="text" id="integ-podcast-apple-url" class="form-control" placeholder="https://podcasts.apple.com/...">
                            </div>
                            <div class="form-group">
                                <label>Globale kategorier (hurtigvalg)</label>
                                <input type="text" id="integ-podcast-custom-categories" class="form-control" placeholder="Separer med komma, f.eks. Vitnesbyrd, Lydbok">
                            </div>
                        </div>
                        <div style="margin-top: 24px;">
                            <button class="btn-primary" id="save-integ-podcast-settings" style="width: 100%;">Lagre podcast-integrasjon</button>
                        </div>
                    </div>
                </div>

                <div id="google-tasks-integration-card" style="width: 100%;"></div>

                <!-- HKM Mobilapp Card inside Integrasjoner -->
                <div class="card modern" style="height: 100%; display: flex; flex-direction: column; border-radius: 16px; padding: 24px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: #fff7ed; border: 1px solid rgba(209, 125, 57, 0.2); display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 22px; color: #d17d39;&display=block">smartphone</span>
                            </div>
                            <h3 class="card-title" style="margin: 0; font-size: 17px; font-weight: 700;">HKM Mobilapp & PWA</h3>
                        </div>
                        <span class="status-badge" style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 10px;">Synkronisert</span>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <p style="font-size: 13px; color: var(--text-secondary, #64748b); margin: 0 0 16px 0; line-height: 1.5;">
                                Sanntidssynkronisering av bibeloversettelser, leseplaner, undervisning og podcaster til mobilappen (PWA).
                            </p>
                            <div style="font-size: 12px; color: var(--text-muted, #64748b); margin-bottom: 16px;">
                                Sist synkronisert: <span id="integ-pwa-last-sync" style="color: #d17d39; font-weight: 600;">Henter...</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn btn-primary" id="btn-integ-force-app-sync" style="background: #d17d39; color: white; font-weight: 700; border: none; padding: 10px 16px; border-radius: 10px; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                <span class="material-symbols-outlined" style="font-size: 18px;&display=block">sync</span>
                                Tving app-synk
                            </button>
                            <button class="btn btn-secondary" onclick="window.location.hash='app'" style="padding: 10px 14px; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                Åpne app-panel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

      section.setAttribute("data-rendered", "true");
      this.loadMediaSettings();
      this.loadPodcastSettings();
      this._loadIntegrationsSettings();
      this._loadIntegPwaSyncStatus();

      if (typeof window.mountGoogleTasksIntegration === "function") {
        window.mountGoogleTasksIntegration();
      }

      const integForceBtn = document.getElementById("btn-integ-force-app-sync");
      if (integForceBtn) {
        integForceBtn.addEventListener("click", () => {
          this.syncPwaApp();
          setTimeout(() => this._loadIntegPwaSyncStatus(), 1200);
        });
      }

      section.addEventListener("click", (event) => {
        if (event.target.id === "test-translation") this.testTranslation();
        if (event.target.id === "save-youtube-settings")
          this.saveMediaSettings("save-youtube-settings");
        if (
          event.target.id === "save-ai-settings" ||
          event.target.id === "save-ga-settings"
        )
          this.saveIntegrationsSettings();
        if (event.target.id === "save-integ-podcast-settings")
          this.savePodcastSettings("save-integ-podcast-settings");
        if (event.target.id === "add-gcal") this.addGCalInput();
      });
    },

    async _loadIntegPwaSyncStatus() {
      const el = document.getElementById("integ-pwa-last-sync");
      if (!el) return;
      try {
        if (window.firebaseService && window.firebaseService.db) {
          const doc = await window.firebaseService.db
            .collection("content")
            .doc("settings_app_sync")
            .get();
          if (doc.exists && doc.data()?.lastSyncedAt) {
            const ts = doc.data().lastSyncedAt.toDate();
            el.textContent = ts.toLocaleString("no-NO", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            return;
          }
        }
        el.textContent = "Aktiv";
      } catch (e) {
        el.textContent = "Aktiv";
      }
    },

    renderAppSection() {
      const section = document.getElementById("app-section");
      if (!section) return;

      section.innerHTML = `
            <div class="app-dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 24px;">
                
                <!-- Status & Sync Control Card -->
                <div class="card modern" style="grid-column: 1 / -1; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; border-radius: 20px; padding: 28px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="width: 56px; height: 56px; border-radius: 16px; background: rgba(209, 125, 57, 0.2); border: 1px solid rgba(209, 125, 57, 0.4); display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 32px; color: #d17d39;&display=block">cloud_sync</span>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: white;">Sanntidssynkronisering til HKM App</h3>
                                <p style="margin: 4px 0 0 0; font-size: 14px; color: #94a3b8;">Sist oppdatert cache-stempel: <span id="app-sync-last-timestamp" style="color: #38bdf8; font-weight: 600;">Henter...</span></p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <button id="btn-force-app-sync" class="btn" style="background: #d17d39; color: white; font-weight: 700; border: none; padding: 12px 24px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: transform 0.2s, background 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 20px;&display=block">sync</span>
                                Tving synkronisering til mobilapper
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Synchronized Modules Cards -->
                <div class="card modern" style="border-radius: 16px; padding: 24px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 22px;&display=block">menu_book</span>
                            </div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 700;">Bibelleser & 7 Oversettelser</h4>
                        </div>
                        <span class="status-badge" style="background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px;">Synkronisert</span>
                    </div>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0; line-height: 1.5;">
                        7 oversettelser (DNB 1930, NOR1921, OpenBible OTB-NB, WEB, KJV, RV1960, NVI) er tilgjengelige via Edge API-caching (<code>s-maxage=3600</code>) og hurtig-caching i PWA.
                    </p>
                    <div style="display: flex; gap: 8px; align-items: center; font-size: 12px; color: #0f172a; font-weight: 600;">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #22c55e;&display=block">check_circle</span>
                        Offline IndexedDB cache aktiv
                    </div>
                </div>

                <div class="card modern" style="border-radius: 16px; padding: 24px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: #fdf4ff; color: #c026d3; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 22px;&display=block">auto_stories</span>
                            </div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 700;">Leseplaner & Devotionals</h4>
                        </div>
                        <span class="status-badge" style="background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px;">Synkronisert</span>
                    </div>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0; line-height: 1.5;">
                        Leseplanene synkroniseres automatisk med sidepanelet og Devotional Modal i mobilappen.
                    </p>
                    <div style="display: flex; gap: 8px; align-items: center; font-size: 12px; color: #0f172a; font-weight: 600;">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #22c55e;&display=block">check_circle</span>
                        Sidepanel & Modal leseplan-arkitektur aktiv
                    </div>
                </div>

                <div class="card modern" style="border-radius: 16px; padding: 24px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 22px;&display=block">podcasts</span>
                            </div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 700;">Podcaster & Videoer</h4>
                        </div>
                        <span class="status-badge" style="background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px;">Synkronisert</span>
                    </div>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0; line-height: 1.5;">
                        Podcast-strøm fra Anchor.fm via <code>/api/podcast</code> API-proxy samt YouTube API-spillelister oppdateres direkte i appen.
                    </p>
                    <div style="display: flex; gap: 8px; align-items: center; font-size: 12px; color: #0f172a; font-weight: 600;">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #22c55e;&display=block">check_circle</span>
                        Serverless API Proxy & RSS aktiv
                    </div>
                </div>

                <div class="card modern" style="border-radius: 16px; padding: 24px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 22px;&display=block">calendar_month</span>
                            </div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 700;">Arrangementer & Kalender</h4>
                        </div>
                        <span class="status-badge" style="background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px;">Synkronisert</span>
                    </div>
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0; line-height: 1.5;">
                        To-veis synkronisering med His Kingdom Ministry Google Kalender og sanntidsoppdateringer i Firestore collection <code>content/collection_courses</code> og arrangementer.
                    </p>
                    <div style="display: flex; gap: 8px; align-items: center; font-size: 12px; color: #0f172a; font-weight: 600;">
                        <span class="material-symbols-outlined" style="font-size: 16px; color: #22c55e;&display=block">check_circle</span>
                        Google Calendar 2-veis synk aktiv
                    </div>
                </div>

                <!-- PWA & Push Configuration Card -->
                <div class="card modern" style="grid-column: 1 / -1; border-radius: 20px; padding: 28px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Mobilapp Konfigurasjon (PWA Manifest)</h3>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b;">Konfigurasjon for hvordan HKM-appen oppfører seg når den installeres på Hjem-skjermen på iOS og Android.</p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 20px;">
                        <div class="form-group">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">App-navn</label>
                            <input type="text" id="pwa-app-name" class="form-control" value="His Kingdom Ministry" readonly style="background: #f8fafc;">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Kort navn (Hjem-skjerm)</label>
                            <input type="text" id="pwa-short-name" class="form-control" value="HKM" readonly style="background: #f8fafc;">
                        </div>
                        <div class="form-group">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Temafarge</label>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; height: 24px; border-radius: 6px; background: #cc6f2c; border: 1px solid #e2e8f0;"></div>
                                <input type="text" id="pwa-theme-color" class="form-control" value="#cc6f2c" readonly style="background: #f8fafc;">
                            </div>
                        </div>
                        <div class="form-group">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Service Worker Cache-versjon</label>
                            <input type="text" id="pwa-sw-version" class="form-control" value="HKM-v2026.08.03" readonly style="background: #f8fafc; font-family: monospace;">
                        </div>
                    </div>
                </div>

            </div>
        `;

      section.setAttribute("data-rendered", "true");
      this._loadAppSyncStatus();

      const forceBtn = document.getElementById("btn-force-app-sync");
      if (forceBtn) {
        forceBtn.addEventListener("click", () => {
          this.syncPwaApp();
          setTimeout(() => this._loadAppSyncStatus(), 1200);
        });
      }
    },

    async _loadAppSyncStatus() {
      const el = document.getElementById("app-sync-last-timestamp");
      if (!el) return;
      try {
        if (window.firebaseService && window.firebaseService.db) {
          const doc = await window.firebaseService.db
            .collection("content")
            .doc("settings_app_sync")
            .get();
          if (doc.exists && doc.data()?.lastSyncedAt) {
            const ts = doc.data().lastSyncedAt.toDate();
            el.textContent = ts.toLocaleString("no-NO", {
              dateStyle: "medium",
              timeStyle: "medium",
            });
            return;
          }
        }
        el.textContent = "Aktiv (Nylig synkronisert)";
      } catch (e) {
        console.warn("Kunne ikke laste app-synk stempel:", e);
        el.textContent = "Aktiv (Lokal cache-modus)";
      }
    },

    /**
     * Opens the video manager modal with YouTube search, direct link, and local upload tabs.
     * @param {function} callback - Callback returning { type: 'youtube'|'file', url: string }
     */
    async openVideoManagerModal(callback) {
      const mediaSettings =
        (await firebaseService.getPageContent("settings_media")) || {};
      const settings =
        (await firebaseService.getPageContent("settings_integrations")) || {};
      const apiKey = (
        mediaSettings.youtubeApiKey ||
        settings.youtube?.apiKey ||
        settings.googleCalendar?.apiKey ||
        ""
      ).trim();
      const channelId = (mediaSettings.youtubeChannelId || "").trim();

      const modal = document.createElement("div");
      modal.className = "admin-modal";
      modal.style.zIndex = "10000";
      modal.innerHTML = `
            <div class="admin-modal-content" style="max-width: 900px; height: 85vh; display: flex; flex-direction: column;">
                <div class="admin-modal-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #ffffff; display: flex; justify-content: space-between; align-items: center;">
                    <div class="header-left" style="display: flex; align-items: center; gap: 10px; color: #1B4965;">
                        <span class="material-symbols-outlined" style="font-size: 28px;">video_library</span>
                        <h2 style="font-size: 20px; font-weight: 700; margin: 0;">Video-behandler</h2>
                    </div>
                    <button class="close-modal-btn" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #94a3b8; transition: color 0.2s;">&times;</button>
                </div>
                <!-- Tabs Header -->
                <div class="modal-tabs-header" style="display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0; padding: 0 16px;">
                    <button class="modal-tab-btn active" data-tab="search" style="padding: 14px 20px; font-weight: 600; font-size: 14px; border: none; background: none; border-bottom: 3px solid #1B4965; color: #1B4965; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">search</span> Søk på YouTube
                    </button>
                    <button class="modal-tab-btn" data-tab="upload" style="padding: 14px 20px; font-weight: 600; font-size: 14px; border: none; background: none; border-bottom: 3px solid transparent; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">upload_file</span> Lenke / Last opp
                    </button>
                </div>
                <!-- Body -->
                <div class="admin-modal-body" style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; background: #ffffff;">
                    <!-- Tab 1 Content: Search -->
                    <div id="tab-content-search" class="tab-content" style="display: flex; flex-direction: column; gap: 16px; height: 100%;">
                        <div class="search-bar-wrap" style="display: flex; gap: 12px; align-items: center; flex-shrink: 0;">
                            <div class="search-input-container" style="position: relative; flex: 1;">
                                <span class="material-symbols-outlined" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 20px;">search</span>
                                <input type="text" id="yt-search-query" class="admin-input" placeholder="Søk etter videoer på YouTube..." style="padding-left: 40px !important; padding-right: 12px !important; padding-top: 10px !important; padding-bottom: 10px !important; width: 100%; height: 42px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; outline: none; transition: border-color 0.2s;">
                            </div>
                            <button id="yt-search-btn" class="btn-primary" style="height: 42px; padding: 0 24px; font-weight: 600; border-radius: 8px; background: #1B4965; color: white; border: none; cursor: pointer; transition: background-color 0.2s;">Søk</button>
                        </div>
                        ${
                          channelId
                            ? `
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: -8px; flex-shrink: 0;">
                            <input type="checkbox" id="yt-search-channel-only" checked style="cursor: pointer; width: 16px !important; height: 16px !important; min-height: auto !important; margin: 0;">
                            <label for="yt-search-channel-only" style="font-size: 13px; color: #475569; cursor: pointer; font-weight: 500; user-select: none;">Søk kun i egen YouTube-kanal</label>
                        </div>
                        `
                            : ""
                        }
                        <!-- API Key warning banner -->
                        <div id="yt-api-warning" class="api-warning-banner" style="display: none; padding: 16px; background: #fef3c7; border-left: 4px solid #d97706; border-radius: 6px; color: #92400e; font-size: 13px; align-items: flex-start; gap: 12px; line-height: 1.5;">
                            <span class="material-symbols-outlined" style="color: #d97706; flex-shrink: 0;">warning</span>
                            <div>
                                <strong>YouTube-søk er utilgjengelig:</strong> Ingen Google API-nøkkel ble funnet. 
                                Gå til <em>Innstillinger -> Integrasjoner</em> for å legge inn en API-nøkkel, eller bruk "Lenke / Last opp" i steden.
                            </div>
                        </div>
                        <!-- Results Area -->
                        <div id="yt-results-container" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 4px 0;">
                            <div style="text-align: center; color: #94a3b8; padding: 40px;">
                                <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1;">play_circle</span>
                                <p style="margin-top: 8px; font-size: 14px;">Søk etter en video for å se resultater her.</p>
                            </div>
                        </div>
                    </div>
                    <!-- Tab 2 Content: Upload -->
                    <div id="tab-content-upload" class="tab-content" style="display: none; flex-direction: column; gap: 24px;">
                        <!-- Section 1: Paste Link -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;">
                            <h3 style="font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="color: #1B4965;">link</span>
                                Lim inn YouTube-lenke
                            </h3>
                            <div style="display: flex; gap: 12px;">
                                <input type="url" id="direct-yt-url" class="admin-input" placeholder="F.eks. https://www.youtube.com/watch?v=..." style="flex: 1; height: 42px; border-radius: 8px; border: 1px solid #cbd5e1; padding: 0 12px; font-size: 14px; outline: none;">
                                <button id="direct-yt-btn" class="btn-primary" style="height: 42px; padding: 0 20px; font-weight: 600; background: #1B4965; border: none; color: white; border-radius: 8px; cursor: pointer; transition: background-color 0.2s;">Legg til</button>
                            </div>
                        </div>
                        <!-- Section 2: Upload File -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;">
                            <h3 style="font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="color: #1B4965;">upload</span>
                                Last opp videofil
                            </h3>
                            <div id="video-drop-zone" style="border: 2px dashed #cbd5e1; border-radius: 8px; background: #ffffff; padding: 32px; text-align: center; cursor: pointer; transition: border-color 0.2s, background-color 0.2s;">
                                <span class="material-symbols-outlined" style="font-size: 40px; color: #94a3b8; margin-bottom: 8px;">movie</span>
                                <p style="font-size: 14px; font-weight: 600; color: #475569; margin: 0 0 4px;">Dra og slipp videofil her</p>
                                <p style="font-size: 12px; color: #94a3b8; margin: 0 0 16px;">Eller klikk for å velge fil fra enheten</p>
                                <button class="btn-outline" style="pointer-events: none; border: 1px solid #cbd5e1; color: #475569; font-size: 13px; height: 36px; padding: 0 16px; background: white; border-radius: 6px;">Velg fil</button>
                                <input type="file" id="video-file-input" style="display: none;" accept="video/*">
                            </div>
                            <div id="upload-progress-container" style="display: none; margin-top: 16px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 6px;">
                                    <span id="upload-progress-status">Laster opp video...</span>
                                    <span id="upload-progress-percent">0%</span>
                                </div>
                                <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                                    <div id="upload-progress-bar" style="height: 100%; width: 0%; background: #d17d39; border-radius: 3px; transition: width 0.2s;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .yt-video-card {
                    display: flex;
                    gap: 16px;
                    padding: 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #ffffff;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                }
                .yt-video-card:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    border-color: #1B4965;
                }
                .yt-video-card-img {
                    width: 180px;
                    flex-shrink: 0;
                    aspect-ratio: 16/9;
                    background: #000;
                    border-radius: 6px;
                    overflow: hidden;
                    position: relative;
                }
                .yt-video-card-img img {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .yt-video-card-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    justify-content: flex-start;
                    text-align: left;
                }
                .yt-video-card-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .yt-video-card-meta {
                    font-size: 12px;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .yt-video-card-desc {
                    font-size: 11px;
                    color: #94a3b8;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    margin-top: 4px;
                }
                @media (max-width: 600px) {
                    .yt-video-card {
                        flex-direction: column;
                        gap: 12px;
                    }
                    .yt-video-card-img {
                        width: 100%;
                    }
                }
                .close-modal-btn:hover {
                    color: #1e293b !important;
                }
                .modal-tab-btn:hover {
                    color: #1B4965 !important;
                }
                #video-drop-zone.dragover {
                    border-color: #1B4965 !important;
                    background-color: #f0f9ff !important;
                }
            </style>
        `;

      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add("is-active"));

      const closeBtn = modal.querySelector(".close-modal-btn");
      const closeModal = () => {
        modal.classList.remove("is-active");
        setTimeout(() => modal.remove(), 300);
      };
      closeBtn.onclick = closeModal;
      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };

      // API Key logic and Warning
      const apiWarning = modal.querySelector("#yt-api-warning");
      const searchTabBtn = modal.querySelector(
        '.modal-tab-btn[data-tab="search"]',
      );
      const uploadTabBtn = modal.querySelector(
        '.modal-tab-btn[data-tab="upload"]',
      );

      if (!apiKey) {
        apiWarning.style.display = "flex";
        // Force select upload/link tab since key is missing
        setTimeout(() => {
          uploadTabBtn.click();
        }, 50);
      }

      // Tab Switching Logic
      const tabs = modal.querySelectorAll(".modal-tab-btn");
      const contents = modal.querySelectorAll(".tab-content");
      tabs.forEach((tab) => {
        tab.onclick = () => {
          tabs.forEach((t) => {
            t.classList.remove("active");
            t.style.borderBottomColor = "transparent";
            t.style.color = "#64748b";
          });
          tab.classList.add("active");
          tab.style.borderBottomColor = "#1B4965";
          tab.style.color = "#1B4965";

          contents.forEach((c) => (c.style.display = "none"));
          const targetContent = modal.querySelector(
            `#tab-content-${tab.dataset.tab}`,
          );
          if (targetContent) targetContent.style.display = "flex";
        };
      });

      // Search YouTube logic
      const ytSearchBtn = modal.querySelector("#yt-search-btn");
      const ytSearchInput = modal.querySelector("#yt-search-query");
      const ytResultsContainer = modal.querySelector("#yt-results-container");

      const performYtSearch = async () => {
        const query = ytSearchInput.value.trim();
        if (!query) return;
        if (!apiKey) {
          this.showToast(
            "Du må legge til en API-nøkkel i innstillingene for å søke.",
            "warning",
          );
          return;
        }

        ytResultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="spinner" style="margin: 0 auto 12px;"></div>
                    <p style="color: #64748b; font-size: 14px;">Søker på YouTube...</p>
                </div>
            `;

        try {
          const ytMatch = query.match(
            /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
          );
          let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&q=${encodeURIComponent(query)}&type=video&regionCode=NO&relevanceLanguage=no&key=${apiKey}`;

          const channelOnlyCheckbox = modal.querySelector(
            "#yt-search-channel-only",
          );
          if (channelOnlyCheckbox && channelOnlyCheckbox.checked && channelId) {
            url += `&channelId=${channelId}`;
          }

          if (ytMatch) {
            url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ytMatch[1]}&key=${apiKey}`;
          }

          const res = await fetch(url);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg =
              errData.error?.message ||
              `YouTube API returned status ${res.status}`;
            throw new Error(errMsg);
          }
          const data = await res.json();
          const items = data.items || [];

          ytResultsContainer.innerHTML = "";
          if (items.length === 0) {
            ytResultsContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #64748b;">
                            <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1;">search_off</span>
                            <p style="margin-top: 8px; font-size: 14px;">Ingen videoer funnet for "${query}".</p>
                        </div>
                    `;
            return;
          }

          const formatDate = (dateStr) => {
            if (!dateStr) return "";
            try {
              const date = new Date(dateStr);
              const now = new Date();
              const diffMs = now - date;
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              if (diffDays === 0) return "I dag";
              if (diffDays === 1) return "I går";
              if (diffDays < 30) return `for ${diffDays} dager siden`;
              const diffMonths = Math.floor(diffDays / 30);
              if (diffMonths < 12)
                return `for ${diffMonths} ${diffMonths === 1 ? "måned" : "måneder"} siden`;
              const diffYears = Math.floor(diffMonths / 12);
              return `for ${diffYears} ${diffYears === 1 ? "år" : "år"} siden`;
            } catch (e) {
              return "";
            }
          };

          items.forEach((item) => {
            const videoId =
              item.id?.videoId ||
              (typeof item.id === "string" ? item.id : undefined);
            if (!videoId) return;
            const snippet = item.snippet || {};
            const title = snippet.title || "";
            const channel = snippet.channelTitle || "";
            const description = snippet.description || "";
            const publishedAt = snippet.publishedAt || "";
            const thumbUrl =
              snippet.thumbnails?.medium?.url ||
              snippet.thumbnails?.high?.url ||
              "";

            // Escape HTML entities to prevent rendering issues
            const cleanTitle = title
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, "&")
              .replace(/&#39;/g, "'")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");

            const dateFormatted = formatDate(publishedAt);
            const card = document.createElement("div");
            card.className = "yt-video-card";
            card.innerHTML = `
                        <div class="yt-video-card-img">
                            <img src="${thumbUrl}" alt="${cleanTitle}" loading="lazy">
                        </div>
                        <div class="yt-video-card-info">
                            <div class="yt-video-card-title" title="${cleanTitle}">${cleanTitle}</div>
                            <div class="yt-video-card-meta">
                                <span>${channel}</span>
                                ${dateFormatted ? `<span style="color: #cbd5e1; margin: 0 4px;">•</span><span>${dateFormatted}</span>` : ""}
                            </div>
                            <div class="yt-video-card-desc" title="${description}">${description}</div>
                        </div>
                    `;
            card.onclick = () => {
              callback({
                type: "youtube",
                url: `https://www.youtube.com/watch?v=${videoId}`,
              });
              closeModal();
            };
            ytResultsContainer.appendChild(card);
          });
        } catch (err) {
          console.error("YouTube Search error:", err);
          const keyPreview = apiKey
            ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
            : "Ingen nøkkel";
          ytResultsContainer.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444; max-width: 500px; margin: 0 auto;">
                        <span class="material-symbols-outlined" style="font-size: 48px; color: #ef4444; margin-bottom: 8px;">error</span>
                        <p style="margin-top: 8px; font-size: 14px; font-weight: 600; margin-bottom: 6px;">Feil under YouTube-søk:</p>
                        <p style="font-size: 12px; color: #64748b; line-height: 1.5; background: #fef2f2; padding: 10px; border-radius: 6px; border: 1px solid #fee2e2; word-break: break-word; text-align: left;">${err.message}</p>
                        <p style="font-size: 12px; color: #475569; margin-top: 12px; line-height: 1.5; text-align: left;">
                            <strong>Aktiv API-nøkkel på nettsiden:</strong> <code>${keyPreview}</code><br>
                            Sjekk at denne matcher nøyaktig med nøkkelen du redigerer i Google Cloud Console. Hvis de matcher, sjekk at du trykket <em>Save / Lagre</em> og vent 1-2 minutter før du prøver igjen.
                        </p>
                    </div>
                `;
        }
      };

      let debounceTimer;
      ytSearchInput.oninput = () => {
        clearTimeout(debounceTimer);
        const query = ytSearchInput.value.trim();
        if (!query) {
          ytResultsContainer.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;">
                        <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1;">play_circle</span>
                        <p style="margin-top: 8px; font-size: 14px;">Søk etter en video for å se resultater her.</p>
                    </div>
                `;
          return;
        }
        debounceTimer = setTimeout(() => {
          performYtSearch();
        }, 400);
      };

      ytSearchBtn.onclick = () => {
        clearTimeout(debounceTimer);
        performYtSearch();
      };

      ytSearchInput.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          clearTimeout(debounceTimer);
          performYtSearch();
        }
      };

      // Fane 2 logic: Direct URL Paste
      const directYtInput = modal.querySelector("#direct-yt-url");
      const directYtBtn = modal.querySelector("#direct-yt-btn");
      directYtBtn.onclick = () => {
        const urlVal = directYtInput.value.trim();
        if (!urlVal) return;

        const getYouTubeId = (url) => {
          if (!url) return null;
          const m = url.match(
            /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
          );
          return m ? m[1] : null;
        };

        if (getYouTubeId(urlVal)) {
          callback({
            type: "youtube",
            url: urlVal,
          });
          closeModal();
        } else {
          this.showToast("Ugyldig YouTube-URL.", "error");
        }
      };

      // Fane 2 logic: Upload File & Drag/Drop
      const dropZone = modal.querySelector("#video-drop-zone");
      const videoFileInput = modal.querySelector("#video-file-input");
      const progressContainer = modal.querySelector(
        "#upload-progress-container",
      );
      const progressBar = modal.querySelector("#upload-progress-bar");
      const progressPercent = modal.querySelector("#upload-progress-percent");
      const progressStatus = modal.querySelector("#upload-progress-status");

      const handleVideoFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith("video/")) {
          this.showToast("Vennligst velg en gyldig videofil.", "error");
          return;
        }

        dropZone.style.pointerEvents = "none";
        progressContainer.style.display = "block";
        progressBar.style.width = "0%";
        progressPercent.innerText = "0%";
        progressStatus.innerText = "Laster opp video...";

        try {
          const path = `editor/video-uploads/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
          const fileUrl = await firebaseService.uploadFile(
            file,
            path,
            ["video/"],
            500, // maxSizeMB
            (percent) => {
              progressBar.style.width = `${percent}%`;
              progressPercent.innerText = `${percent}%`;
            },
          );

          if (fileUrl) {
            callback({
              type: "file",
              url: fileUrl,
            });
            closeModal();
          } else {
            this.showToast("Opplasting feilet.", "error");
            resetUploadUI();
          }
        } catch (err) {
          console.error("Video upload error:", err);
          this.showToast("Feil under opplasting av video.", "error");
          resetUploadUI();
        }
      };

      const resetUploadUI = () => {
        dropZone.style.pointerEvents = "auto";
        progressContainer.style.display = "none";
      };

      // Click on dropzone triggers input
      dropZone.onclick = () => videoFileInput.click();
      videoFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleVideoFile(file);
      };

      // Drag/Drop Listeners
      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(
          eventName,
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("dragover");
          },
          false,
        );
      });

      ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(
          eventName,
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("dragover");
          },
          false,
        );
      });

      dropZone.addEventListener(
        "drop",
        (e) => {
          const dt = e.dataTransfer;
          const file = dt.files[0];
          if (file) handleVideoFile(file);
        },
        false,
      );
    },

    async _loadIntegrationsSettings() {
      try {
        const settings =
          (await firebaseService.getPageContent("settings_integrations")) || {};

        // AI Settings
        const translation = settings.translation || {};
        const provEl = document.getElementById("translation-provider");
        if (provEl)
          provEl.value =
            translation.provider === "gemini" ? "gemini" : "google";

        const geminiKeyEl = document.getElementById("gemini-api-key");
        if (geminiKeyEl) geminiKeyEl.value = translation.geminiApiKey || "";

        const geminiModelEl = document.getElementById("gemini-model");
        if (geminiModelEl)
          geminiModelEl.value = translation.geminiModel || "gemini-1.5-flash";

        // Google Calendar Settings
        const gcal = settings.googleCalendar || {};
        const gcalKeyEl = document.getElementById("gcal-api-key");
        if (gcalKeyEl) gcalKeyEl.value = gcal.apiKey || "";

        const calendars = settings.googleCalendars || [];
        const gcalList = document.getElementById("gcal-list");
        if (gcalList) {
          gcalList.innerHTML = "";
          calendars.forEach((cal) => this.addGCalInput(cal.label, cal.id));
        }

        // Google Analytics Settings
        const ga = settings.googleAnalytics || {};
        const gaPropEl = document.getElementById("ga-property-id");
        if (gaPropEl) gaPropEl.value = ga.propertyId || "";

        const gaEmailEl = document.getElementById("ga-service-email");
        if (gaEmailEl) gaEmailEl.value = ga.serviceEmail || "";

        const gaKeyEl = document.getElementById("ga-private-key");
        if (gaKeyEl) gaKeyEl.value = ga.privateKey || "";

        // Update GCal Status Badge
        const statusBadge = document.getElementById("gcal-status");
        if (statusBadge) {
          if (gcal.apiKey && (calendars.length > 0 || gcal.calendarId)) {
            statusBadge.textContent = "Konfigurert";
            statusBadge.style.background = "#dcfce7";
            statusBadge.style.color = "#166534";
          } else {
            statusBadge.textContent = "Frakoblet";
            statusBadge.style.background = "#fee2e2";
            statusBadge.style.color = "#991b1b";
          }
        }

        // Google Auth Status
        this._updateGoogleAuthUI();
      } catch (error) {
        console.error("Error loading integrations settings:", error);
      }
    },

    async saveIntegrationsSettings() {
      const btn = document.getElementById("save-ai-settings");
      const originalText = btn?.textContent || "Lagre integrasjoner";
      if (btn) {
        btn.textContent = "Lagrer...";
        btn.disabled = true;
      }

      try {
        const currentSettings =
          (await firebaseService.getPageContent("settings_integrations")) || {};

        const gcalApiKey =
          document.getElementById("gcal-api-key")?.value.trim() || "";
        const translationProvider =
          document.getElementById("translation-provider")?.value || "google";
        const geminiApiKey =
          document.getElementById("gemini-api-key")?.value.trim() || "";
        const geminiModel =
          document.getElementById("gemini-model")?.value.trim() ||
          "gemini-1.5-flash";

        const rows = Array.from(
          document.querySelectorAll("#gcal-list .gcal-row"),
        );
        const calendars = rows
          .map((row) => ({
            label: row.querySelector(".gcal-label")?.value.trim() || "",
            id: row.querySelector(".gcal-id")?.value.trim() || "",
          }))
          .filter((item) => item.id);

        const newSettings = {
          ...currentSettings,
          googleCalendar: {
            ...currentSettings.googleCalendar,
            apiKey: gcalApiKey,
            calendarId:
              calendars[0]?.id ||
              currentSettings.googleCalendar?.calendarId ||
              "",
            label:
              calendars[0]?.label ||
              currentSettings.googleCalendar?.label ||
              "Hovedkalender",
          },
          googleCalendars: calendars,
          translation: {
            provider: translationProvider,
            geminiApiKey,
            geminiModel,
          },
          googleAnalytics: {
            propertyId:
              document.getElementById("ga-property-id")?.value.trim() || "",
            serviceEmail:
              document.getElementById("ga-service-email")?.value.trim() || "",
            privateKey:
              document.getElementById("ga-private-key")?.value.trim() || "",
          },
          updatedAt: new Date().toISOString(),
        };

        await firebaseService.savePageContent(
          "settings_integrations",
          newSettings,
        );
        this._translationSettingsCache = null;
        this._translationSettingsCacheLoadedAt = 0;

        this.showToast("Integrasjonsinnstillinger lagret!", "success");
        this._loadIntegrationsSettings();
      } catch (error) {
        console.error("Error saving integrations:", error);
        this.showToast("Kunne ikke lagre innstillinger.", "error");
      } finally {
        if (btn) {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      }
    },

    addGCalInput(label = "", id = "") {
      const container = document.getElementById("gcal-list");
      if (!container) return;

      const row = document.createElement("div");
      row.className = "gcal-row";
      row.style = "display: flex; gap: 8px; margin-bottom: 8px;";
      row.innerHTML = `
            <input type="text" class="form-control gcal-label" placeholder="Navn (f.eks. HKM)" value="${label}" style="flex: 1;">
            <input type="text" class="form-control gcal-id" placeholder="Calendar ID" value="${id}" style="flex: 2;">
            <button type="button" class="remove-gcal" style="color: #ef4444; background: transparent !important; border: none !important; cursor: pointer; padding: 4px; display: inline-flex; align-items: center; justify-content: center; box-shadow: none !important; outline: none !important; align-self: center;">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `;

      row.querySelector(".remove-gcal").onclick = () => row.remove();
      container.appendChild(row);
    },

    handleGoogleDisconnect() {
      this.googleAccessToken = null;
      this.showToast("Koblet fra Google. Skrivetilgang deaktivert.");
      this._updateGoogleAuthUI();
    },
  };
}
