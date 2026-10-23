// content editor methods for AdminManager.
export function createContentEditor4Methods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async loadFacebookFeedSettingsLivePreview(container, config = {}) {
      if (!container) return;

      const livePostCount = Math.min(
        Math.max(Math.round(Number(config.livePostCount) || 3), 1),
        3,
      );
      const pageId =
        typeof config.pageId === "string" ? config.pageId.trim() : "";
      const pageUrl =
        typeof config.pageUrl === "string" ? config.pageUrl.trim() : "";
      this._facebookFeedPreviewRequestId =
        (this._facebookFeedPreviewRequestId || 0) + 1;
      const requestId = this._facebookFeedPreviewRequestId;

      if (config.useLiveFeed === false) {
        this.renderFacebookFeedLivePreviewState(container, {
          status: "disabled",
          message:
            "Live-feed er slått av. Kortene under brukes som fallback på forsiden.",
        });
        return;
      }

      this.renderFacebookFeedLivePreviewState(container, { status: "loading" });

      if (config.feedSource === "juicer" && config.juicerFeedId) {
        try {
          // Use JSONP to bypass CORS restrictions in the browser
          const callbackName =
            "juicer_jsonp_" + Date.now() + Math.round(Math.random() * 1000);
          const payload = await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `https://www.juicer.io/api/feeds/${config.juicerFeedId}?callback=${callbackName}`;

            window[callbackName] = (data) => {
              resolve(data);
              script.remove();
              delete window[callbackName];
            };

            script.onerror = () => {
              reject(new Error("Juicer JSONP request failed"));
              script.remove();
              delete window[callbackName];
            };

            document.body.appendChild(script);
          });

          const items = Array.isArray(payload?.posts?.items)
            ? payload.posts.items
            : [];

          if (requestId === this._facebookFeedPreviewRequestId) {
            const parsedPosts = items
              .slice(0, livePostCount)
              .map((item, idx) => {
                const message = item.message || "";
                const cleanText = message.replace(/<[^>]*>/g, "").trim();
                let excerpt = cleanText;
                if (excerpt.length > 180) {
                  excerpt = excerpt.substring(0, 177) + "...";
                }

                let title = cleanText;
                if (title.length > 50) {
                  title = title.substring(0, 47) + "...";
                }
                if (!title) {
                  title = "Innlegg";
                }

                const link =
                  item.full_url ||
                  pageUrl ||
                  "https://www.facebook.com/hiskingdomministry777";
                const pubDate = item.external_created_at || "";

                let friendlyDate = "Nylig";
                if (pubDate) {
                  const date = new Date(pubDate);
                  const diffTime = Math.abs(new Date() - date);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays <= 1) friendlyDate = "I går";
                  else if (diffDays <= 7)
                    friendlyDate = `${diffDays} dager siden`;
                  else
                    friendlyDate = date.toLocaleDateString("no-NO", {
                      day: "numeric",
                      month: "short",
                    });
                }

                const sourceName = item.source?.source || "Facebook";
                const isYoutube =
                  String(sourceName).toLowerCase() === "youtube";

                return {
                  id: item.id || idx + 1,
                  date: friendlyDate,
                  title: title,
                  excerpt: excerpt,
                  cta: isYoutube ? "Se på YouTube" : "Les på Facebook",
                  image: item.image || "",
                  link: link,
                  likes:
                    typeof item.like_count === "number" ? item.like_count : 0,
                  comments:
                    typeof item.comment_count === "number"
                      ? item.comment_count
                      : 0,
                  source: sourceName,
                };
              });

            if (parsedPosts.length > 0) {
              this.renderFacebookFeedLivePreviewState(container, {
                status: "ready",
                items: parsedPosts,
                pageUrl: pageUrl,
                message:
                  "Dette er innleggene som hentes live via API-et akkurat nå.",
              });
              return;
            }
          }
        } catch (err) {
          console.warn(
            "[Admin] Failed to load live Facebook feed preview via Juicer JSONP:",
            err,
          );
        }
      }

      if (config.feedSource === "rss" && config.feedUrl) {
        try {
          const response = await fetch(config.feedUrl.trim());
          if (!response.ok)
            throw new Error(
              `RSS feed fetch failed with status ${response.status}`,
            );

          const xmlText = await response.text();
          const parser = new DOMParser();
          const xml = parser.parseFromString(xmlText, "text/xml");
          const items = xml.querySelectorAll("item");

          if (requestId === this._facebookFeedPreviewRequestId) {
            const parsedPosts = Array.from(items)
              .slice(0, livePostCount)
              .map((item, idx) => {
                const title = item.querySelector("title")?.textContent || "";
                const link =
                  item.querySelector("link")?.textContent ||
                  pageUrl ||
                  "https://www.facebook.com/hiskingdomministry777";
                const pubDate =
                  item.querySelector("pubDate")?.textContent || "";
                const description =
                  item.querySelector("description")?.textContent || "";

                let image = "";
                const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) {
                  image = imgMatch[1];
                }

                const cleanText = description.replace(/<[^>]*>/g, "").trim();
                let excerpt = cleanText || title;
                if (excerpt.length > 180) {
                  excerpt = excerpt.substring(0, 177) + "...";
                }

                let friendlyDate = "Nylig";
                if (pubDate) {
                  const date = new Date(pubDate);
                  const diffTime = Math.abs(new Date() - date);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (diffDays <= 1) friendlyDate = "I går";
                  else if (diffDays <= 7)
                    friendlyDate = `${diffDays} dager siden`;
                  else
                    friendlyDate = date.toLocaleDateString("no-NO", {
                      day: "numeric",
                      month: "short",
                    });
                }

                return {
                  id: idx + 1,
                  date: friendlyDate,
                  title:
                    cleanText && cleanText.length > 50
                      ? cleanText.substring(0, 47) + "..."
                      : title || "Innlegg",
                  excerpt: excerpt,
                  cta: "Les på Facebook",
                  image: image,
                  link: link,
                };
              });

            if (parsedPosts.length > 0) {
              this.renderFacebookFeedLivePreviewState(container, {
                status: "ready",
                items: parsedPosts,
                pageUrl: pageUrl,
                message:
                  "Dette er innleggene som hentes live via RSS akkurat nå.",
              });
              return;
            }
          }
        } catch (err) {
          console.warn(
            "[Admin] Failed to load live Facebook feed preview via RSS URL:",
            err,
          );
        }
      }

      let lastMessage = "";

      for (const url of this.getFacebookFeedPreviewUrls(livePostCount, {
        pageId,
        pageUrl,
      })) {
        try {
          const response = await fetch(url, {
            headers: {
              Accept: "application/json",
            },
          });

          let payload = null;
          try {
            payload = await response.json();
          } catch (parseError) {
            payload = null;
          }

          if (!response.ok) {
            lastMessage =
              payload && payload.error
                ? String(payload.error)
                : `Facebook feed request failed with ${response.status}`;
            continue;
          }

          const items = Array.isArray(payload && payload.items)
            ? payload.items
            : [];
          if (requestId !== this._facebookFeedPreviewRequestId) {
            return;
          }

          if (!items.length) {
            this.renderFacebookFeedLivePreviewState(container, {
              status: "empty",
              message:
                "Meta svarte, men returnerte ingen innlegg for denne siden.",
            });
            return;
          }

          this.renderFacebookFeedLivePreviewState(container, {
            status: "ready",
            items: items.slice(0, livePostCount),
            pageUrl: (payload && payload.pageUrl) || pageUrl,
            message: "Dette er innleggene som hentes live akkurat nå.",
          });
          return;
        } catch (error) {
          lastMessage = error && error.message ? error.message : String(error);
        }
      }

      if (requestId !== this._facebookFeedPreviewRequestId) {
        return;
      }

      const errorMessage =
        lastMessage && lastMessage.includes("META_FACEBOOK_PAGE_ACCESS_TOKEN")
          ? "Meta-token mangler i Functions-miljoet. Sett opp META_FACEBOOK_PAGE_ACCESS_TOKEN for a hente live innlegg."
          : lastMessage
            ? `Kunne ikke hente live innlegg: ${lastMessage}`
            : "Kunne ikke hente live innlegg akkurat na.";

      this.renderFacebookFeedLivePreviewState(container, {
        status: "error",
        message: errorMessage,
      });
    },

    renderFacebookFeedSettingsEditor(data) {
      const container = document.getElementById("editor-fields");
      const feed =
        data && data.facebookFeed && typeof data.facebookFeed === "object"
          ? data.facebookFeed
          : {};
      const posts = feed.posts || {};

      container.innerHTML = `
            <div style="display:grid; gap:24px; grid-column:1 / -1; width:100%;">
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap:24px; align-items:start;">
                    <div class="card" style="margin:0;">
                        <div class="card-body" style="display:grid; gap:18px;">
                            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px;">
                                <div>
                                    <h3 style="margin:0 0 6px; font-size:18px;">Facebook-feed</h3>
                                    <p style="margin:0; color:#64748b; font-size:14px;">Styr visning, live Meta-feed og standardinnhold for kortene på forsiden.</p>
                                </div>
                                <span style="display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; background:#eff6ff; color:#2563eb; font-size:12px; font-weight:700;">
                                    <span class="material-symbols-outlined" style="font-size:16px;">rss_feed</span>
                                    Live + fallback
                                </span>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap:16px;">
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.enabled",
                                  label: "Vis seksjonen",
                                  value:
                                    feed.enabled === false ? "false" : "true",
                                  valueType: "boolean",
                                  options: [
                                    {
                                      value: "true",
                                      label: "Ja, vis seksjonen",
                                    },
                                    {
                                      value: "false",
                                      label: "Nei, skjul seksjonen",
                                    },
                                  ],
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.useLiveFeed",
                                  label: "Bruk live-feed",
                                  value:
                                    feed.useLiveFeed === false
                                      ? "false"
                                      : "true",
                                  valueType: "boolean",
                                  options: [
                                    {
                                      value: "true",
                                      label: "Ja, hent live innlegg",
                                    },
                                    {
                                      value: "false",
                                      label: "Nei, bruk kun fallback-kort",
                                    },
                                  ],
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.feedSource",
                                  label: "Kilde til live-feed",
                                  value: feed.feedSource || "rss",
                                  options: [
                                    {
                                      value: "rss",
                                      label: "RSS Feed URL (rss.app)",
                                    },
                                    {
                                      value: "juicer",
                                      label: "Juicer.io integrasjon",
                                    },
                                    {
                                      value: "meta",
                                      label: "Meta API (Klassisk)",
                                    },
                                  ],
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.juicerFeedId",
                                  label: "Juicer Feed ID (Brukernavn/slug)",
                                  value:
                                    feed.juicerFeedId ||
                                    "hiskingdomministry777",
                                  placeholder: "hiskingdomministry777",
                                  help: "F.eks. hiskingdomministry777 hvis embed URL er https://www.juicer.io/embed/hiskingdomministry777",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.livePostCount",
                                  label: "Antall live innlegg",
                                  value:
                                    feed.livePostCount == null
                                      ? 3
                                      : feed.livePostCount,
                                  type: "number",
                                  valueType: "number",
                                  min: "1",
                                  max: "10",
                                  step: "1",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.pageId",
                                  label: "Facebook Page ID / slug",
                                  value: feed.pageId || "",
                                  placeholder: "Valgfritt hvis URL brukes",
                                  help: "Kan stå tomt. Hvis du fyller inn side-URL under, brukes den også til å finne riktig side.",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.pageUrl",
                                  label: "Facebook-side URL",
                                  value: feed.pageUrl || "",
                                  placeholder: "https://www.facebook.com/...",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.feedUrl",
                                  label:
                                    "Facebook RSS/XML Feed URL (fra f.eks. rss.app)",
                                  value: feed.feedUrl || "",
                                  placeholder: "https://rss.app/feeds/...",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.accessToken",
                                  label:
                                    "Meta Page Access Token (Sidetilgangskode)",
                                  value: feed.accessToken || "",
                                  type: "password",
                                  placeholder: "EAACEdEose0cBA...",
                                  help: "Kreves kun hvis kilde er Meta API. Lim inn din permanente Facebook Page Access Token her.",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.pageCta",
                                  label: "Knappetekst",
                                  value: feed.pageCta || "",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.label",
                                  label: "Etikett",
                                  value: feed.label || "",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.title",
                                  label: "Overskrift",
                                  value: feed.title || "",
                                })}
                                ${this.renderFacebookFeedField({
                                  key: "facebookFeed.description",
                                  label: "Beskrivelse",
                                  value: feed.description || "",
                                  textarea: true,
                                  fullWidth: true,
                                })}
                            </div>
                        </div>
                    </div>

                    <div class="card" style="margin:0;">
                        <div class="card-body" style="display:grid; gap:16px;">
                            <div>
                                <h3 style="margin:0 0 6px; font-size:16px;">Seksjonsforhåndsvisning</h3>
                                <p style="margin:0; color:#64748b; font-size:13px;">Oppdateres mens du skriver.</p>
                            </div>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap:12px;">
                                <div style="border:1px solid #e2e8f0; border-radius:16px; padding:14px; background:#fff;">
                                    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8;">Seksjon</div>
                                    <div data-preview-status="enabled" style="margin-top:6px; font-size:16px; font-weight:700; color:#0f172a;">
                                        ${feed.enabled === false ? "Skjult" : "Synlig"}
                                    </div>
                                </div>
                                <div style="border:1px solid #e2e8f0; border-radius:16px; padding:14px; background:#fff;">
                                    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8;">Kilde</div>
                                    <div data-preview-status="source" style="margin-top:6px; font-size:16px; font-weight:700; color:#0f172a;">
                                        ${feed.useLiveFeed === false ? "Fallback-kort" : "Live via Meta"}
                                    </div>
                                </div>
                                <div style="border:1px solid #e2e8f0; border-radius:16px; padding:14px; background:#fff;">
                                    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8;">Live innlegg</div>
                                    <div style="margin-top:6px; font-size:16px; font-weight:700; color:#0f172a;">
                                        <span data-preview-status="count">${this.escapeHtml(feed.livePostCount == null ? 3 : String(feed.livePostCount))}</span> av 3
                                    </div>
                                </div>
                                <div style="border:1px solid #e2e8f0; border-radius:16px; padding:14px; background:#fff; grid-column:1 / -1;">
                                    <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8;">Side</div>
                                    <div data-preview-status="page" style="margin-top:6px; font-size:15px; line-height:1.35; font-weight:700; color:#0f172a; overflow-wrap:anywhere;">
                                        ${this.escapeHtml((feed.pageId || "").trim() || (feed.pageUrl || "").trim() || "Ikke satt")}
                                    </div>
                                </div>
                            </div>
                            <div data-preview-status="note" style="font-size:13px; line-height:1.6; color:#64748b;">
                                ${
                                  feed.useLiveFeed === false
                                    ? "Fallback-kortene brukes direkte på forsiden."
                                    : "Live-feed prioriteres, men fallback-kortene brukes fortsatt hvis Meta ikke svarer."
                                }
                            </div>
                            <div style="display:grid; gap:12px; padding-top:4px; border-top:1px solid #e2e8f0;">
                                <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                                    <div>
                                        <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:#0f172a;">Siste live innlegg</h4>
                                        <p style="margin:0; font-size:12px; line-height:1.5; color:#64748b;">Hentes fra Meta API med gjeldende innstillinger.</p>
                                    </div>
                                    <span data-facebook-live-badge style="display:inline-flex; align-items:center; justify-content:center; min-height:30px; padding:6px 10px; border-radius:999px; font-size:11px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; color:#475569; background:#f8fafc;">
                                        Klar
                                    </span>
                                </div>
                                <div data-facebook-live-note style="font-size:13px; line-height:1.6; color:#64748b;"></div>
                                <div data-facebook-live-preview style="display:grid; gap:12px;"></div>
                            </div>
                            <div style="border:1px solid #e2e8f0; border-radius:24px; padding:20px; background:linear-gradient(180deg,#f8fafc 0%,#fff 100%); display:grid; gap:14px;">
                                <div data-preview-key="label" style="font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#f97316;">
                                    ${this.escapeHtml(feed.label || "")}
                                </div>
                                <div data-preview-key="title" style="font-size:24px; font-weight:800; line-height:1.2; color:#0f172a;">
                                    ${this.escapeHtml(feed.title || "")}
                                </div>
                                <div data-preview-key="description" style="font-size:14px; line-height:1.7; color:#64748b;">
                                    ${this.escapeHtml(feed.description || "")}
                                </div>
                                <a data-preview-key="pageCta" data-preview-href="pageUrl" href="${this.escapeHtml(feed.pageUrl || "#")}"
                                    style="display:inline-flex; align-items:center; justify-content:center; padding:12px 18px; border-radius:999px; border:1px solid #cbd5e1; color:#0f172a; font-weight:700; text-decoration:none; background:#fff;">
                                    ${this.escapeHtml(feed.pageCta || "")}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap:20px;">
                    ${this.renderFacebookFeedPostEditor("first", "Kort 1", "#2563eb", "img/facebook-post-1.svg", posts.first || {})}
                    ${this.renderFacebookFeedPostEditor("second", "Kort 2", "#0ea5e9", "img/facebook-post-2.svg", posts.second || {})}
                    ${this.renderFacebookFeedPostEditor("third", "Kort 3", "#f97316", "img/facebook-post-3.svg", posts.third || {})}
                </div>
            </div>
        `;

      const refreshPreview = () => {
        const formData = this.collectEditorFormData(container);
        const liveFeed = (formData && formData.facebookFeed) || {};
        const normalizedCount = Math.max(
          1,
          Math.min(3, Number(liveFeed.livePostCount) || 0),
        );

        container.querySelectorAll("[data-preview-key]").forEach((node) => {
          const path = node.getAttribute("data-preview-key");
          if (!path) return;

          const value = path
            .split(".")
            .reduce(
              (acc, part) =>
                acc && typeof acc === "object" ? acc[part] : undefined,
              liveFeed,
            );

          if (node.tagName === "IMG") {
            const fallbackSrc = node.getAttribute("data-fallback-src") || "";
            node.src =
              typeof value === "string" && value.trim()
                ? value.trim()
                : fallbackSrc;
            return;
          }

          node.textContent = value == null ? "" : String(value);
        });

        container.querySelectorAll("[data-preview-href]").forEach((node) => {
          const path = node.getAttribute("data-preview-href");
          if (!path) return;
          const value = path
            .split(".")
            .reduce(
              (acc, part) =>
                acc && typeof acc === "object" ? acc[part] : undefined,
              liveFeed,
            );
          node.setAttribute(
            "href",
            typeof value === "string" && value.trim() ? value.trim() : "#",
          );
        });

        container.querySelectorAll("[data-preview-status]").forEach((node) => {
          const statusType = node.getAttribute("data-preview-status");
          if (statusType === "enabled") {
            node.textContent = liveFeed.enabled === false ? "Skjult" : "Synlig";
          } else if (statusType === "source") {
            node.textContent =
              liveFeed.useLiveFeed === false
                ? "Fallback-kort"
                : "Live via Meta";
          } else if (statusType === "count") {
            node.textContent = String(normalizedCount);
          } else if (statusType === "page") {
            const resolvedPageTarget =
              typeof liveFeed.pageId === "string" && liveFeed.pageId.trim()
                ? liveFeed.pageId.trim()
                : typeof liveFeed.pageUrl === "string" &&
                    liveFeed.pageUrl.trim()
                  ? liveFeed.pageUrl.trim()
                  : "";
            node.textContent = resolvedPageTarget
              ? resolvedPageTarget
              : "Ikke satt";
          } else if (statusType === "note") {
            node.textContent =
              liveFeed.useLiveFeed === false
                ? "Fallback-kortene brukes direkte på forsiden."
                : "Live-feed prioriteres, men fallback-kortene brukes fortsatt hvis Meta ikke svarer.";
          }
        });

        return liveFeed;
      };

      const scheduleLivePreviewFetch = (liveFeed) => {
        if (this._facebookFeedPreviewTimer) {
          clearTimeout(this._facebookFeedPreviewTimer);
        }

        this._facebookFeedPreviewTimer = setTimeout(() => {
          this.loadFacebookFeedSettingsLivePreview(container, liveFeed || {});
        }, 350);
      };

      const syncEditorPreview = () => {
        const liveFeed = refreshPreview();
        scheduleLivePreviewFetch(liveFeed);
      };

      container.querySelectorAll(".form-control").forEach((input) => {
        input.addEventListener("input", syncEditorPreview);
        input.addEventListener("change", syncEditorPreview);
      });

      syncEditorPreview();
    },

    collectEditorFormData(root = document.getElementById("editor-fields")) {
      const dataToSave = {};
      if (!root) return dataToSave;

      // 1. Collect standard form fields (inputs/textareas with data-key)
      const inputs = root.querySelectorAll(".form-control[data-key]");
      inputs.forEach((input) => {
        // Skip inputs that are inside a dynamic list container to prevent double collection
        if (input.closest("[data-list-key]")) return;

        const keys = input.dataset.key.split(".");
        let value = input.value;

        if (input.dataset.valueType === "boolean") {
          value = value === "true";
        } else if (input.dataset.valueType === "number") {
          const parsed = Number(value);
          value = Number.isFinite(parsed) ? parsed : 0;
        }

        let curr = dataToSave;
        keys.forEach((k, i) => {
          if (i === keys.length - 1) {
            curr[k] = value;
          } else {
            curr[k] = curr[k] || {};
            curr = curr[k];
          }
        });
      });

      // 2. Collect list fields (containers with data-list-key)
      const listContainers = root.querySelectorAll("[data-list-key]");
      listContainers.forEach((container) => {
        const listKey = container.getAttribute("data-list-key");
        const keys = listKey.split(".");

        const itemInputs = container.querySelectorAll(".list-item-input");
        const arrayValue = [];
        itemInputs.forEach((itemInput) => {
          arrayValue.push(itemInput.value);
        });

        let curr = dataToSave;
        keys.forEach((k, i) => {
          if (i === keys.length - 1) {
            curr[k] = arrayValue;
          } else {
            curr[k] = curr[k] || {};
            curr = curr[k];
          }
        });
      });

      return dataToSave;
    },

    async savePageContent() {
      const activePageEl = document.querySelector(".page-item.active");
      if (!activePageEl) {
        this.showToast("Ingen aktiv side er valgt.", "error", 3500);
        return;
      }
      const pageId = activePageEl.dataset.page;
      const saveBtn = document.getElementById("save-content");
      const dataToSave = this.collectEditorFormData();

      const sanitized =
        typeof adminUtils.sanitizeForFirestore === "function"
          ? adminUtils.sanitizeForFirestore(dataToSave, {
              stripUndefined: true,
              stripEmptyStrings: false,
            }) || {}
          : dataToSave;

      await this._runWriteLocked(`page-content:${pageId}`, async () => {
        await this._withButtonLoading(
          saveBtn,
          async () => {
            try {
              // Automatically build page content translations for static pages
              if (
                pageId &&
                pageId !== "personvern" &&
                !pageId.startsWith("settings_")
              ) {
                sanitized.translations = sanitized.translations || {};
                try {
                  this.showToast(
                    "Oversetter innhold til engelsk og spansk...",
                    "info",
                    3000,
                  );
                  const currentDoc =
                    (await firebaseService.getPageContent(pageId)) || {};
                  sanitized.translations.en =
                    await this._buildPageContentTranslation(
                      sanitized,
                      "en",
                      "no",
                      currentDoc?.translations?.en,
                      currentDoc,
                    );
                  sanitized.translations.es =
                    await this._buildPageContentTranslation(
                      sanitized,
                      "es",
                      "no",
                      currentDoc?.translations?.es,
                      currentDoc,
                    );
                } catch (transErr) {
                  console.error(
                    "Kunne ikke fullføre automatisk oversettelse:",
                    transErr,
                  );
                  this.showToast(
                    "Lagret, men oversettelse feilet: " + transErr.message,
                    "warning",
                    8000,
                  );
                }
              }
              await firebaseService.savePageContent(pageId, sanitized, {
                versionLabel:
                  document
                    .getElementById("editing-page-title")
                    ?.textContent?.trim() || pageId,
                versionReason: "Manuell lagring",
                versionSource: "website-page-editor",
                versionMinIntervalMs: 0,
              });
              this.showToast("Innholdet er lagret!", "success", 5000);
            } catch (err) {
              this.showToast("Feil ved lagring: " + err.message, "error", 5000);
            }
          },
          {
            loadingText: "Lagrer...",
          },
        );
      });
    },

    async openPageVersionHistory() {
      const activePageEl = document.querySelector(".page-item.active");
      if (!activePageEl) {
        this.showToast(
          "Velg en side før du åpner versjonshistorikken.",
          "warning",
          4000,
        );
        return;
      }

      if (!window.HKMVersionHistory) {
        this.showToast(
          "Versjonshistorikken er ikke klar ennå. Prøv igjen om et øyeblikk.",
          "warning",
          4000,
        );
        return;
      }

      const pageId = activePageEl.dataset.page;
      const pageLabel =
        document.getElementById("editing-page-title")?.textContent?.trim() ||
        activePageEl.textContent?.trim() ||
        pageId;

      await window.HKMVersionHistory.openForResource({
        scope: "site",
        resourceCollection: "content",
        resourceId: pageId,
        resourceLabel: pageLabel,
        onRestore: async () => {
          firebaseService.invalidatePageContentCache(pageId);
          await this.loadPageFields(pageId);
          this.showToast(
            `"${pageLabel}" er hentet tilbake fra versjonshistorikken.`,
            "success",
            5500,
          );
        },
      });
    },

    flatten(obj, prefix = "") {
      return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + "." : "";
        if (
          typeof obj[k] === "object" &&
          obj[k] !== null &&
          !Array.isArray(obj[k])
        ) {
          Object.assign(acc, this.flatten(obj[k], pre + k));
        } else {
          acc[pre + k] = obj[k];
        }
        return acc;
      }, {});
    },

    // Helper method to convert HTML to Editor.js blocks (for legacy podcast transcripts)
    htmlToEditorJsBlocks(html) {
      if (!html || typeof html !== "string") {
        return { blocks: [], time: Date.now(), version: "2.29.0" };
      }

      const blocks = [];
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
      const elements = doc.body.firstChild.childNodes;

      // Helper: push an <img> element as an image block
      const pushImageBlock = (imgEl) => {
        const url =
          imgEl.src ||
          imgEl.getAttribute("src") ||
          imgEl.getAttribute("data-src") ||
          imgEl.getAttribute("data-image-src") ||
          "";
        if (!url) return;
        blocks.push({
          type: "image",
          data: {
            file: { url },
            caption: imgEl.alt || "",
            withBorder: false,
            stretched: false,
            withBackground: false,
          },
        });
      };

      const pushVideoBlock = (vidEl) => {
        const url = vidEl.src || vidEl.getAttribute("src") || "";
        if (!url) return;
        blocks.push({
          type: "video",
          data: { file: { url }, url },
        });
      };

      const pushIframeBlock = (iframeEl) => {
        const url = iframeEl.src || iframeEl.getAttribute("src") || "";
        if (!url) return;
        blocks.push({
          type: "youtubeVideo",
          data: { url },
        });
      };

      const wrapPersistedInlineStyles = (elem, innerHtml) => {
        const styles = [];
        const fontSize = elem?.style?.fontSize;
        const lineHeight = elem?.style?.lineHeight;
        const marginBottom = elem?.style?.marginBottom;

        if (fontSize) styles.push(`font-size:${fontSize}`);
        if (lineHeight) styles.push(`line-height:${lineHeight}`);
        if (marginBottom)
          styles.push(
            `margin-bottom:${marginBottom}`,
            "display:inline-block",
            "width:100%",
          );

        if (!styles.length) return innerHtml;
        return `<span style="${styles.join(";")}">${innerHtml}</span>`;
      };

      // Helper: process a <p> or <div> — split around any media children
      const pushParagraphOrMedia = (elem) => {
        const medias = elem.querySelectorAll("img, video, iframe");
        if (medias.length === 0) {
          const clone = elem.cloneNode(true);
          const text = wrapPersistedInlineStyles(elem, clone.innerHTML.trim());
          if (text.length > 0) {
            blocks.push({ type: "paragraph", data: { text } });
          }
          return;
        }

        let pendingHTML = "";
        const flushPending = () => {
          const trimmed = pendingHTML.trim();
          if (trimmed.length > 0) {
            blocks.push({ type: "paragraph", data: { text: trimmed } });
          }
          pendingHTML = "";
        };

        for (const child of elem.childNodes) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const tag = child.tagName.toLowerCase();
            if (tag === "img") {
              flushPending();
              pushImageBlock(child);
              continue;
            } else if (tag === "video") {
              flushPending();
              pushVideoBlock(child);
              continue;
            } else if (tag === "iframe") {
              flushPending();
              pushIframeBlock(child);
              continue;
            } else if (tag === "div" && child.querySelector("iframe")) {
              const iframe = child.querySelector("iframe");
              flushPending();
              pushIframeBlock(iframe);
              continue;
            }
          }

          pendingHTML +=
            child.nodeType === Node.TEXT_NODE
              ? child.textContent
              : child.outerHTML || "";
        }
        flushPending();
      };

      for (let elem of elements) {
        if (elem.nodeType === Node.TEXT_NODE) {
          const text = elem.textContent.trim();
          if (text.length > 0) {
            blocks.push({
              type: "paragraph",
              data: { text: text },
            });
          }
        } else if (elem.nodeType === Node.ELEMENT_NODE) {
          const tagName = elem.tagName.toLowerCase();

          if (tagName === "p" || tagName === "div") {
            pushParagraphOrMedia(elem);
          } else if (
            tagName === "h1" ||
            tagName === "h2" ||
            tagName === "h3" ||
            tagName === "h4" ||
            tagName === "h5" ||
            tagName === "h6"
          ) {
            const level = parseInt(tagName.charAt(1)) || 2;
            const text = wrapPersistedInlineStyles(
              elem,
              elem.innerHTML || elem.textContent || "",
            );
            blocks.push({
              type: "header",
              data: {
                text,
                level: Math.min(level, 6),
              },
            });
          } else if (tagName === "ul" || tagName === "ol") {
            const items = [];
            for (let li of elem.querySelectorAll("li")) {
              items.push(li.textContent);
            }
            if (items.length > 0) {
              blocks.push({
                type: "list",
                data: {
                  style: tagName === "ol" ? "ordered" : "unordered",
                  items: items,
                },
              });
            }
          } else if (tagName === "blockquote") {
            blocks.push({
              type: "quote",
              data: {
                text: elem.textContent,
                caption: "",
                alignment: "left",
              },
            });
          } else if (tagName === "hr") {
            blocks.push({ type: "delimiter", data: {} });
          } else if (tagName === "figure") {
            const img =
              elem.querySelector("img") || elem.querySelector("[data-src]");
            const figcaption = elem.querySelector("figcaption");
            if (img) {
              const url =
                img.src ||
                img.getAttribute("src") ||
                img.getAttribute("data-src") ||
                img.getAttribute("data-image-src") ||
                "";
              if (url) {
                blocks.push({
                  type: "image",
                  data: {
                    file: { url },
                    caption: figcaption
                      ? figcaption.textContent
                      : img.alt || img.getAttribute("alt") || "",
                    withBorder: false,
                    stretched: false,
                    withBackground: false,
                  },
                });
              }
            }
          } else if (tagName === "img") {
            pushImageBlock(elem);
          } else if (tagName === "video") {
            pushVideoBlock(elem);
          } else if (tagName === "iframe") {
            pushIframeBlock(elem);
          }
        }
      }

      return {
        blocks:
          blocks.length > 0
            ? blocks
            : [{ type: "paragraph", data: { text: "" } }],
        time: Date.now(),
        version: "2.29.0",
      };
    },

    // Helper method to convert Editor.js blocks to HTML
    editorJsBlocksToHtml(blocks) {
      if (!Array.isArray(blocks)) return "";

      return blocks
        .map((block) => {
          if (!block || typeof block !== "object") return "";
          const type = String(block.type || "").toLowerCase();
          const data = block.data || {};

          switch (type) {
            case "paragraph":
              return `<p class="block-paragraph">${data.text || ""}</p>`;
            case "header": {
              const level = Math.min(Math.max(Number(data.level) || 2, 1), 6);
              return `<h${level} class="block-header">${data.text || ""}</h${level}>`;
            }
            case "list": {
              const tag = data.style === "ordered" ? "ol" : "ul";
              const items = (Array.isArray(data.items) ? data.items : [])
                .map(
                  (i) =>
                    `<li>${typeof i === "string" ? i : i?.content || i?.text || ""}</li>`,
                )
                .join("");
              return `<${tag} class="block-list">${items}</${tag}>`;
            }
            case "quote":
              return `<blockquote class="block-quote"><p>${data.text || ""}</p>${data.caption ? `<cite>— ${data.caption}</cite>` : ""}</blockquote>`;
            case "delimiter":
              return '<hr class="block-delimiter">';
            case "image": {
              const url = data.file?.url || data.url || "";
              const alt = data.caption || "";
              return url
                ? `<figure class="block-image"><img src="${url}" alt="${alt}"><figcaption>${alt}</figcaption></figure>`
                : "";
            }
            case "youtubevideo":
            case "youtubeVideo": {
              const ytUrl = data.url || "";
              const fileUrl = data.fileUrl || "";
              if (fileUrl) {
                return `<div class="block-video" style="margin-bottom:10px;"><video src="${fileUrl}" controls style="width:100%; max-height:480px; border-radius:8px; display:block; background:#000;"></video></div>`;
              }
              if (!ytUrl) return "";
              const ytMatch = ytUrl.match(
                /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
              );
              if (ytMatch) {
                return `<div class="block-video" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe></div>`;
              }
              return `<p class="block-paragraph"><a href="${ytUrl}">${ytUrl}</a></p>`;
            }
            case "video": {
              const vidUrl = data.file?.url || data.url || "";
              return vidUrl
                ? `<p class="block-video"><video src="${vidUrl}" controls style="max-width:100%;height:auto;border-radius:10px;"></video></p>`
                : "";
            }
            default:
              return "";
          }
        })
        .join("\n");
    },
  };
}
