// workspace methods for AdminManager.
export function createMethods23({ firebaseService, adminUtils, showErrorUI }) {
  return {
    drawPremiumChart(ga, days = 30) {
      const container = document.getElementById(
        "analytics-svg-chart-container",
      );
      if (!container) return;

      let trafficData = [];
      let labels = [];
      let isSimulated = false;

      // Check if real GA data exists
      if (
        ga &&
        ga.dailyTraffic &&
        Array.isArray(ga.dailyTraffic) &&
        ga.dailyTraffic.length > 1
      ) {
        trafficData = ga.dailyTraffic.map((d) => parseInt(d.users) || 0);
        labels = ga.dailyTraffic.map((d, i) => {
          const rawDate = d.date || d.label || "";
          const rawDateStr = String(rawDate).trim();
          if (/^\d{8}$/.test(rawDateStr)) {
            const day = parseInt(rawDateStr.substring(6, 8), 10);
            const monthNum = parseInt(rawDateStr.substring(4, 6), 10);
            const months = [
              "jan",
              "feb",
              "mar",
              "apr",
              "mai",
              "jun",
              "jul",
              "aug",
              "sep",
              "okt",
              "nov",
              "des",
            ];
            const monthLabel = months[monthNum - 1] || "";
            return `${day}. ${monthLabel}`;
          }
          return rawDate || `Punkt ${i + 1}`;
        });
      } else {
        // Generate mock data for premium appearance
        isSimulated = true;
        if (days <= 1) {
          trafficData = [12, 18, 35, 24, 48, 62, 51, 30, 25, 45, 58, 22];
          labels = [
            "08:00",
            "09:00",
            "10:00",
            "11:00",
            "12:00",
            "13:00",
            "14:00",
            "15:00",
            "16:00",
            "17:00",
            "18:00",
            "19:00",
          ];
        } else if (days <= 7) {
          trafficData = [142, 210, 185, 320, 410, 280, 195];
          const dayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
          labels = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return dayNames[d.getDay()];
          });
        } else if (days <= 30) {
          trafficData = [
            340, 410, 390, 520, 680, 590, 480, 610, 750, 820, 710, 640, 580,
            690, 880, 940, 810, 720, 680, 790, 920, 1050, 980, 890, 840, 910,
            1120, 1250, 1100, 950,
          ];
          const months = [
            "jan",
            "feb",
            "mar",
            "apr",
            "mai",
            "jun",
            "jul",
            "aug",
            "sep",
            "okt",
            "nov",
            "des",
          ];
          labels = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i));
            return `${d.getDate()}. ${months[d.getMonth()]}`;
          });
        } else {
          trafficData = [
            2400, 3100, 2900, 4200, 4800, 3900, 3400, 4100, 5500, 6200, 5100,
            4400,
          ];
          const months = [
            "jan",
            "feb",
            "mar",
            "apr",
            "mai",
            "jun",
            "jul",
            "aug",
            "sep",
            "okt",
            "nov",
            "des",
          ];
          labels = Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (11 - i));
            const monthLabel = months[d.getMonth()];
            return monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
          });
        }
      }

      const maxVal = Math.max(...trafficData, 10);
      const minVal = Math.min(...trafficData, 0);
      const range = maxVal - minVal;

      // Build SVG dimensions
      const width = container.clientWidth || 550;
      const height = container.clientHeight || 250;
      const paddingLeft = 45;
      const paddingRight = 20;
      const paddingTop = 30;
      const paddingBottom = 30;
      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;

      // Map data points to SVG coordinates
      const points = trafficData.map((val, i) => {
        const x = paddingLeft + (i / (trafficData.length - 1)) * chartWidth;
        const y =
          paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
        return { x, y, value: val, label: labels[i] };
      });

      // Compute Bezier Curve path
      let pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 3;
        const cp1y = p0.y;
        const cp2x = p1.x - (p1.x - p0.x) / 3;
        const cp2y = p1.y;
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      }

      const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

      // Render horizontal gridlines & labels
      let gridHtml = "";
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const yVal = minVal + (i / gridSteps) * range;
        const yPos = paddingTop + chartHeight - (i / gridSteps) * chartHeight;
        gridHtml += `
                <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="var(--border-color, #f1f5f9)" stroke-width="1" stroke-dasharray="4,4" />
                <text x="${paddingLeft - 8}" y="${yPos + 4}" fill="#94a3b8" font-size="10" font-weight="600" text-anchor="end">${Math.round(yVal)}</text>
            `;
      }

      // Render vertical labels
      let labelHtml = "";
      // If we have many points, make sure we have at most 6-7 labels on x-axis to prevent crowding
      const labelInterval = Math.max(1, Math.ceil(points.length / 6));
      points.forEach((p, i) => {
        const isLast = i === points.length - 1;
        const isInterval = i % labelInterval === 0;
        const lastIntervalIndex =
          Math.floor((points.length - 1) / labelInterval) * labelInterval;
        const distanceToLastInterval = points.length - 1 - lastIntervalIndex;
        const tooCloseToLastInterval =
          isLast && distanceToLastInterval < Math.max(2, labelInterval * 0.7);

        if (isInterval || (isLast && !tooCloseToLastInterval)) {
          labelHtml += `
                    <text x="${p.x}" y="${height - 8}" fill="#94a3b8" font-size="10" font-weight="600" text-anchor="middle">${p.label}</text>
                `;
        }
      });

      // Combine into complete SVG
      container.innerHTML = `
            <style>
                .chart-line {
                    stroke-dasharray: 1200;
                    stroke-dashoffset: 1200;
                    animation: chart-draw 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .chart-area {
                    animation: chart-fade 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes chart-draw {
                    to { stroke-dashoffset: 0; }
                }
                @keyframes chart-fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .chart-dot-glow {
                    animation: dot-pulse 2s infinite;
                }
                @keyframes dot-pulse {
                    0% { r: 6; opacity: 1; }
                    50% { r: 12; opacity: 0.4; }
                    100% { r: 6; opacity: 1; }
                }
                .chart-interactive-tooltip {
                    position: absolute;
                    background: rgba(15, 23, 42, 0.95);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
                    pointer-events: none;
                    display: none;
                    z-index: 100;
                    transform: translate(-50%, -100%) translateY(-12px);
                    transition: left 0.15s cubic-bezier(0.16, 1, 0.3, 1), top 0.15s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid rgba(255,255,255,0.1);
                    white-space: nowrap;
                }
                .chart-interactive-tooltip::after {
                    content: '';
                    position: absolute;
                    bottom: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 6px 6px 0;
                    border-style: solid;
                    border-color: rgba(15, 23, 42, 0.95) transparent transparent;
                }
            </style>
            ${
              isSimulated
                ? `
                <div style="position: absolute; top: -15px; right: 0; background: rgba(249, 115, 22, 0.1); color: #f97316; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 20px; border: 1px solid rgba(249, 115, 22, 0.2); letter-spacing: 0.05em; text-transform: uppercase; z-index: 10; display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-outlined" style="font-size: 12px;">info</span>
                    ${
                      this._analyticsUnconfigured
                        ? "Demovisning (Google Analytics ikke tilkoblet)"
                        : this._analyticsFetchFailed
                          ? "Demovisning (Feil under henting av data)"
                          : "Demovisning (Venter på mer trafikkdata)"
                    }
                </div>
            `
                : ""
            }

            <svg width="100%" height="100%" style="overflow: visible; display: block;" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#d17d39" stop-opacity="0.3" />
                        <stop offset="100%" stop-color="#d17d39" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#d17d39" />
                        <stop offset="50%" stop-color="#f97316" />
                        <stop offset="100%" stop-color="#bd4f2a" />
                    </linearGradient>
                </defs>

                <!-- Grid -->
                <g class="chart-grid">${gridHtml}</g>

                <!-- Curves -->
                <path class="chart-area" d="${areaD}" fill="url(#chart-area-grad)" opacity="0" />
                <path class="chart-line" d="${pathD}" fill="none" stroke="url(#chart-line-grad)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />

                <!-- Vertical reticle line -->
                <line id="chart-reticle-line" x1="0" y1="${paddingTop}" x2="0" y2="${paddingTop + chartHeight}" stroke="#d17d39" stroke-width="1.5" stroke-dasharray="3,3" style="display:none;" />

                <!-- Glow Dot Tracker -->
                <g id="chart-tracker-group" style="display:none;">
                    <circle id="chart-tracker-glow" class="chart-dot-glow" cx="0" cy="0" r="10" fill="#f97316" opacity="0.3" />
                    <circle id="chart-tracker-point" cx="0" cy="0" r="6" fill="#ffffff" stroke="#f97316" stroke-width="3" />
                </g>
                
                <!-- X Labels -->
                <g class="chart-labels">${labelHtml}</g>
            </svg>

            <!-- Floating Tooltip -->
            <div id="chart-tooltip" class="chart-interactive-tooltip"></div>
        `;

      // Interactivity handling
      const svg = container.querySelector("svg");
      const reticle = container.querySelector("#chart-reticle-line");
      const tracker = container.querySelector("#chart-tracker-group");
      const tooltip = container.querySelector("#chart-tooltip");

      const handleHover = (clientX) => {
        const rect = svg.getBoundingClientRect();
        const mouseX = clientX - rect.left;

        // Map mouse position to SVG coordinates
        const svgX = (mouseX / rect.width) * width;

        // Find closest data point
        let closestPoint = points[0];
        let minDist = Math.abs(points[0].x - svgX);

        points.forEach((p) => {
          const dist = Math.abs(p.x - svgX);
          if (dist < minDist) {
            minDist = dist;
            closestPoint = p;
          }
        });

        // Update reticle & tracker positions
        reticle.setAttribute("x1", closestPoint.x);
        reticle.setAttribute("x2", closestPoint.x);
        reticle.style.display = "block";

        const glow = tracker.querySelector("#chart-tracker-glow");
        const pt = tracker.querySelector("#chart-tracker-point");
        glow.setAttribute("cx", closestPoint.x);
        glow.setAttribute("cy", closestPoint.y);
        pt.setAttribute("cx", closestPoint.x);
        pt.setAttribute("cy", closestPoint.y);
        tracker.style.display = "block";

        // Update Tooltip
        tooltip.innerHTML = `
                <div style="font-size:10px; text-transform:uppercase; opacity:0.7; font-weight:800; margin-bottom:2px;">${closestPoint.label}</div>
                <div style="font-size:14px; font-weight:800; display:flex; align-items:center; gap:4px;">
                    <span style="width:6px; height:6px; background:#f97316; border-radius:50%;"></span>
                    ${closestPoint.value.toLocaleString()} besøkende
                </div>
            `;

        // Calculate absolute position inside container
        const tipLeft = (closestPoint.x / width) * 100;
        const tipTop = (closestPoint.y / height) * 100;

        tooltip.style.left = `${tipLeft}%`;
        tooltip.style.top = `${tipTop}%`;
        tooltip.style.display = "block";
      };

      container.addEventListener("mousemove", (e) => {
        handleHover(e.clientX);
      });

      container.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches && e.touches[0]) {
            handleHover(e.touches[0].clientX);
          }
        },
        { passive: true },
      );

      container.addEventListener("mouseleave", () => {
        reticle.style.display = "none";
        tracker.style.display = "none";
        tooltip.style.display = "none";
      });
    },

    initSortableMainGrid() {
      const el = document.getElementById("dashboard-main-grid");
      if (!el || typeof Sortable === "undefined") return;

      Sortable.create(el, {
        animation: 150,
        handle: ".drag-handle",
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        onEnd: () => {
          const order = Array.from(el.children).map(
            (child) => child.dataset.id,
          );
          localStorage.setItem(
            "hkm_dashboard_main_order",
            JSON.stringify(order),
          );
          showToast("Layout lagret!", "success");
        },
      });
    },

    openProductLinkModal(onLinkSelected) {
      // Save selection range
      let savedRange = null;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedRange = sel.getRangeAt(0);
      }

      const modal = document.createElement("div");
      modal.id = "hkm-product-link-modal";
      modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.85); display: flex; align-items: center; justify-content: center;
            z-index: 999999; backdrop-filter: blur(8px); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #f1f5f9;
        `;
      modal.innerHTML = `
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 90%; max-width: 500px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 85vh;">
                <div style="padding: 16px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: #0f172a;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 20px; color: #d17d39;">link</span>
                        <span>Sett inn lenke</span>
                    </h3>
                    <button id="hkm-link-close" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 6px; transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
                    </button>
                </div>
                
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1;" class="hkm-modal-body">
                    <!-- URL input -->
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label style="font-size: 12px; font-weight: 600; color: #94a3b8;">Nettadresse (URL)</label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <input type="text" id="hkm-link-url-input" style="width: 100%; padding: 10px 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; font-size: 14px; outline: none; transition: border-color 0.2s;" placeholder="https://..." value="https://">
                        </div>
                    </div>
                    
                    <!-- Tabs switcher -->
                    <div style="display: flex; gap: 8px; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-top: 8px;">
                        <button type="button" id="hkm-tab-products" style="flex: 1; padding: 8px 12px; background: #1B4965; border: none; border-radius: 6px; color: white; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">shopping_bag</span>
                            <span>Produkter</span>
                        </button>
                        <button type="button" id="hkm-tab-events" style="flex: 1; padding: 8px 12px; background: transparent; border: 1px solid #334155; border-radius: 6px; color: #94a3b8; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">event</span>
                            <span>Arrangementer</span>
                        </button>
                    </div>

                    <!-- Search input -->
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label id="hkm-search-label" style="font-size: 12px; font-weight: 600; color: #94a3b8;">Søk etter produkt i His Kingdom Designs</label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <span class="material-symbols-outlined" style="position: absolute; left: 10px; color: #94a3b8; font-size: 18px;">search</span>
                            <input type="text" id="hkm-link-search-input" style="width: 100%; padding: 10px 12px 10px 34px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; font-size: 14px; outline: none; transition: border-color 0.2s;" placeholder="Søk på kopper, gensere, plakater...">
                        </div>
                    </div>

                    <!-- Search Results -->
                    <div id="hkm-link-results" style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; padding-right: 4px;">
                        <div style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">Skriv i søkefeltet over for å søke etter produkter.</div>
                    </div>
                </div>

                <div style="padding: 16px 20px; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 12px; background: #0f172a;">
                    <button id="hkm-link-cancel" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #334155; background: transparent; color: #94a3b8; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s;">Avbryt</button>
                    <button id="hkm-link-submit" style="padding: 8px 16px; border-radius: 8px; border: none; background: #1B4965; color: white; cursor: pointer; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
                        <span>Sett inn lenke</span>
                    </button>
                </div>
            </div>
        `;

      if (!document.getElementById("hkm-link-modal-styles")) {
        const style = document.createElement("style");
        style.id = "hkm-link-modal-styles";
        style.textContent = `
                .hkm-link-product-item:hover, .hkm-link-event-item:hover { background: #334155 !important; border-color: #475569 !important; }
                #hkm-link-close:hover { background: #334155 !important; color: white !important; }
                #hkm-link-url-input:focus, #hkm-link-search-input:focus { border-color: #d17d39 !important; }
            `;
        document.head.appendChild(style);
      }

      document.body.appendChild(modal);

      const searchInput = modal.querySelector("#hkm-link-search-input");
      const resultsContainer = modal.querySelector("#hkm-link-results");
      const urlInput = modal.querySelector("#hkm-link-url-input");
      const searchLabel = modal.querySelector("#hkm-search-label");

      const tabProducts = modal.querySelector("#hkm-tab-products");
      const tabEvents = modal.querySelector("#hkm-tab-events");

      let activeTab = "products";
      let productsList = [];
      const loadProducts = async () => {
        if (window.hkmWixProductsCache) {
          productsList = window.hkmWixProductsCache;
          return;
        }
        try {
          const res = await fetch(
            "https://hiskingdomdesigns.no/api/get-wix-products",
          );
          const data = await res.json();
          if (data.success && Array.isArray(data.products)) {
            window.hkmWixProductsCache = data.products.sort((a, b) =>
              a.name.localeCompare(b.name),
            );
            productsList = window.hkmWixProductsCache;
          }
        } catch (err) {
          console.error("Failed to fetch wix products for link selector:", err);
        }
      };

      let eventsList = [];
      const loadEvents = async () => {
        if (window.hkmEventsCache) {
          eventsList = window.hkmEventsCache;
          return;
        }
        try {
          const raw = await firebaseService.getPageContent("collection_events");
          eventsList = this._getCollectionItems(raw).sort((a, b) =>
            (b.date || "").localeCompare(a.date || ""),
          );
          window.hkmEventsCache = eventsList;
        } catch (err) {
          console.error("Failed to fetch local events for link selector:", err);
        }
      };

      const escapeHtml = (str) => {
        return (str || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

      const updateResults = () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
          if (activeTab === "products") {
            resultsContainer.innerHTML =
              '<div style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">Skriv i søkefeltet over for å søke etter produkter.</div>';
          } else {
            resultsContainer.innerHTML =
              '<div style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">Skriv i søkefeltet over for å søke etter arrangementer.</div>';
          }
          return;
        }

        if (activeTab === "products") {
          let searchTerms = [query];
          if (
            query.includes("kopp") ||
            query.includes("krus") ||
            query.includes("mug") ||
            query.includes("cup")
          ) {
            searchTerms = ["kopp", "krus", "mug", "cup", "enamel", "ceramic"];
          } else if (
            query.includes("genser") ||
            query.includes("hoodie") ||
            query.includes("hettejakke") ||
            query.includes("hettegenser") ||
            query.includes("zip")
          ) {
            searchTerms = [
              "genser",
              "hoodie",
              "sweater",
              "hettejakke",
              "zip",
              "hettegenser",
            ];
          } else if (
            query.includes("t-skjorte") ||
            query.includes("tskjorte") ||
            query.includes("t-shirt") ||
            query.includes("tee") ||
            (query.includes("skjorte") && !query.includes("hette"))
          ) {
            searchTerms = ["t-skjorte", "t-shirt", "tee", "skjorte"];
          } else if (
            query.includes("plakat") ||
            query.includes("poster") ||
            query.includes("trykk")
          ) {
            searchTerms = ["plakat", "poster", "trykk", "print"];
          } else if (
            query.includes("klistremerke") ||
            query.includes("sticker")
          ) {
            searchTerms = ["klistremerke", "sticker"];
          } else if (
            query.includes("bag") ||
            query.includes("veske") ||
            query.includes("tote")
          ) {
            searchTerms = ["bag", "veske", "tote", "handlenett"];
          } else if (
            query.includes("bok") ||
            query.includes("book") ||
            query.includes("fargelegg")
          ) {
            searchTerms = ["bok", "book", "fargelegg", "coloring"];
          }

          const filtered = productsList.filter((p) => {
            const nameLower = (p.name || "").toLowerCase();
            const descLower = (p.description || "").toLowerCase();
            return (
              searchTerms.some(
                (term) => nameLower.includes(term) || descLower.includes(term),
              ) || nameLower.includes(query)
            );
          });

          if (filtered.length === 0) {
            resultsContainer.innerHTML = `<div style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">Ingen produkter funnet for "${escapeHtml(query)}"</div>`;
            return;
          }

          resultsContainer.innerHTML = filtered
            .map((p) => {
              const slug =
                p.slug ||
                p.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
              const url = `https://www.hiskingdomdesigns.no/product-page/${slug}`;
              const img = p.imageUrl
                ? `<img src="${p.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; background: #334155;" />`
                : `<div style="width: 40px; height: 40px; border-radius: 6px; background: #334155; display: flex; align-items: center; justify-content: center; font-size: 16px;"><span class="material-symbols-outlined">shopping_bag</span></div>`;
              return `
                        <div class="hkm-link-product-item" data-url="${url}" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            ${img}
                            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 13px; font-weight: 600; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(p.name)}</span>
                                <span style="font-size: 11px; color: #d17d39; font-weight: 700;">kr ${p.price},-</span>
                            </div>
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #64748b;">chevron_right</span>
                        </div>
                    `;
            })
            .join("");

          resultsContainer
            .querySelectorAll(".hkm-link-product-item")
            .forEach((item) => {
              item.onclick = () => {
                const productUrl = item.dataset.url;
                urlInput.value = productUrl;
                urlInput.style.borderColor = "#d17d39";
                setTimeout(() => {
                  urlInput.style.borderColor = "#334155";
                }, 300);
              };
            });
        } else {
          const filtered = eventsList.filter((e) => {
            const titleLower = (e.title || "").toLowerCase();
            const descLower = (
              e.description ||
              e.shortDescription ||
              ""
            ).toLowerCase();
            const locLower = (e.location || "").toLowerCase();
            return (
              titleLower.includes(query) ||
              descLower.includes(query) ||
              locLower.includes(query)
            );
          });

          if (filtered.length === 0) {
            resultsContainer.innerHTML = `<div style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">Ingen arrangementer funnet for "${escapeHtml(query)}"</div>`;
            return;
          }

          resultsContainer.innerHTML = filtered
            .map((e) => {
              const dateStr = e.date
                ? String(e.date).split("T")[0]
                : "Uten dato";
              const locStr = e.location
                ? escapeHtml(e.location)
                : "Sted ikke oppgitt";
              const url = `/arrangement-detaljer.html?id=${e.id || e.key}`;
              const img = e.imageUrl
                ? `<img src="${e.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; background: #334155;" />`
                : `<div style="width: 40px; height: 40px; border-radius: 6px; background: #334155; display: flex; align-items: center; justify-content: center; font-size: 16px;"><span class="material-symbols-outlined">calendar_today</span></div>`;
              return `
                        <div class="hkm-link-event-item" data-url="${url}" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                            ${img}
                            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-size: 13px; font-weight: 600; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(e.title)}</span>
                                <span style="font-size: 11px; color: #94a3b8; font-weight: 500;">${dateStr} · ${locStr}</span>
                            </div>
                            <span class="material-symbols-outlined" style="font-size: 18px; color: #64748b;">chevron_right</span>
                        </div>
                    `;
            })
            .join("");

          resultsContainer
            .querySelectorAll(".hkm-link-event-item")
            .forEach((item) => {
              item.onclick = () => {
                const eventUrl = item.dataset.url;
                urlInput.value = eventUrl;
                urlInput.style.borderColor = "#d17d39";
                setTimeout(() => {
                  urlInput.style.borderColor = "#334155";
                }, 300);
              };
            });
        }
      };

      const switchTab = (tab) => {
        activeTab = tab;
        searchInput.value = "";
        if (tab === "products") {
          tabProducts.style.background = "#1B4965";
          tabProducts.style.borderColor = "transparent";
          tabProducts.style.color = "white";

          tabEvents.style.background = "transparent";
          tabEvents.style.borderColor = "#334155";
          tabEvents.style.color = "#94a3b8";

          searchLabel.innerText = "Søk etter produkt i His Kingdom Designs";
          searchInput.placeholder = "Søk på kopper, gensere, plakater...";

          loadProducts().then(() => {
            updateResults();
          });
        } else {
          tabEvents.style.background = "#1B4965";
          tabEvents.style.borderColor = "transparent";
          tabEvents.style.color = "white";

          tabProducts.style.background = "transparent";
          tabProducts.style.borderColor = "#334155";
          tabProducts.style.color = "#94a3b8";

          searchLabel.innerText =
            "Søk etter arrangement i His Kingdom Ministry";
          searchInput.placeholder = "Søk på navn, sted, beskrivelse...";

          loadEvents().then(() => {
            updateResults();
          });
        }
      };

      tabProducts.onclick = () => switchTab("products");
      tabEvents.onclick = () => switchTab("events");

      loadProducts().then(() => {
        if (searchInput.value) updateResults();
      });

      const submit = () => {
        const finalUrl = urlInput.value.trim();
        if (!finalUrl || finalUrl === "https://") {
          alert("Vennligst oppgi en gyldig nettadresse.");
          return;
        }
        if (savedRange) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }
        modal.remove();
        onLinkSelected(finalUrl);
      };

      modal.querySelector("#hkm-link-submit").onclick = submit;
      urlInput.onkeydown = (e) => {
        if (e.key === "Enter") submit();
      };

      let debounceTimer;
      searchInput.oninput = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateResults, 200);
      };

      const close = () => modal.remove();
      modal.querySelector("#hkm-link-close").onclick = close;
      modal.querySelector("#hkm-link-cancel").onclick = close;

      setTimeout(() => searchInput.focus(), 50);
    },

    async renderProfileSection() {
      const section = document.getElementById("profile-section");
      if (!section) return;

      const authUser =
        firebaseService.auth && firebaseService.auth.currentUser
          ? firebaseService.auth.currentUser
          : null;
      if (!authUser) return;

      section.innerHTML = `
            <div class="design-ui-shell">
                <div class="design-ui-workspace">
                    <div class="design-ui-panel">
                        <div class="design-ui-panel-body" style="padding: 32px;">
                            <div style="display: flex; align-items: center; gap: 24px; padding-bottom: 32px; border-bottom: 1px solid var(--border-color); margin-bottom: 32px;">
                                <div id="profile-picture-container-admin" style="position: relative; width: 100px; height: 100px; border-radius: 50%; background: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem; font-weight: 700; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                                    ${authUser.photoURL ? `<img src="${authUser.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">` : (authUser.displayName || authUser.email || "?").charAt(0).toUpperCase()}
                                    <label for="profile-upload-admin" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; opacity: 0; transition: opacity 0.3s ease; cursor: pointer;">
                                        <span class="material-symbols-outlined">photo_camera</span>
                                    </label>
                                    <input type="file" id="profile-upload-admin" style="display: none;" accept="image/*">
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">Profilbilde</h4>
                                    <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px 0;">Last opp et bilde fra din enhet eller bruk bildet fra Google.</p>
                                    <div style="display: flex; gap: 10px;">
                                        <button type="button" class="btn btn-outline" id="upload-profile-btn-admin" style="font-size: 13px; padding: 6px 12px;">Last opp nytt</button>
                                        ${
                                          Array.isArray(
                                            authUser.providerData,
                                          ) &&
                                          authUser.providerData.some(
                                            (p) =>
                                              p &&
                                              p.providerId === "google.com",
                                          )
                                            ? `<button type="button" class="btn btn-outline" id="google-photo-btn-admin" style="font-size: 13px; padding: 6px 12px; display: flex; align-items: center;">
                     <img src="https://www.google.com/favicon.ico" width="14" height="14" style="margin-right: 6px;">
                     Hent fra Google
                   </button>`
                                            : ""
                                        }
                                    </div>
                                </div>
                            </div>

                            <form id="admin-profile-full-form">
                                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: var(--text-main);">Personalia</h4>
                                <div class="form-grid-2" style="gap: 20px; margin-bottom: 32px;">
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Navn</label>
                                        <input type="text" name="displayName" class="form-control" style="width: 100%;">
                                    </div>
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Telefon</label>
                                        <input type="tel" name="phone" class="form-control" style="width: 100%;">
                                    </div>
                                    <div class="form-group" style="grid-column: span 2; margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">E-post</label>
                                        <input type="email" name="email" class="form-control" disabled style="width: 100%; background: #f8fafc; color: #64748b; cursor: not-allowed;">
                                    </div>
                                </div>

                                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: var(--text-main); border-top: 1px solid var(--border-color); padding-top: 32px;">Adresse</h4>
                                <div class="form-grid-2" style="gap: 20px; margin-bottom: 32px;">
                                    <div class="form-group" style="grid-column: span 2; margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Gateadresse</label>
                                        <input type="text" name="address" class="form-control" style="width: 100%;">
                                    </div>
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Postnummer</label>
                                        <input type="text" name="zip" class="form-control" style="width: 100%;">
                                    </div>
                                    <div class="form-group" style="margin: 0;">
                                        <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px;">Sted</label>
                                        <input type="text" name="city" class="form-control" style="width: 100%;">
                                    </div>
                                </div>

                                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: var(--text-main); border-top: 1px solid var(--border-color); padding-top: 32px;">Kommunikasjon</h4>
                                <div style="margin-bottom: 24px; padding: 20px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 10px;">
                                    <!-- Newsletter toggle -->
                                    <div class="admin-setting-row">
                                        <div>
                                            <div class="admin-setting-row-label">E-postvarslinger</div>
                                            <div class="admin-setting-row-sub">Motta nyhetsbrev og oppdateringer på e-post</div>
                                        </div>
                                        <label class="admin-toggle">
                                            <input type="checkbox" name="newsletter" id="admin-newsletter-toggle">
                                            <span class="admin-toggle-slider"></span>
                                        </label>
                                    </div>
                                    <!-- Push toggle -->
                                    <div class="admin-setting-row">
                                        <div>
                                            <div class="admin-setting-row-label">Push-varslinger</div>
                                            <div class="admin-setting-row-sub">Motta push-varslinger på denne enheten</div>
                                        </div>
                                        <label class="admin-toggle">
                                            <input type="checkbox" name="pushEnabled" id="admin-push-toggle">
                                            <span class="admin-toggle-slider"></span>
                                        </label>
                                    </div>
                                    <!-- Push sub-category toggles -->
                                    <div class="admin-push-sub-settings" id="admin-push-sub-settings" style="display:none;">
                                        <div class="admin-setting-row admin-setting-row-sub-item">
                                            <div>
                                                <div class="admin-setting-row-label">Ny undervisning</div>
                                                <div class="admin-setting-row-sub">Få pushvarsel når ny undervisning publiseres</div>
                                            </div>
                                            <label class="admin-toggle admin-toggle-sm">
                                                <input type="checkbox" name="pushTeachings" id="admin-push-teachings-toggle">
                                                <span class="admin-toggle-slider"></span>
                                            </label>
                                        </div>
                                        <div class="admin-setting-row admin-setting-row-sub-item">
                                            <div>
                                                <div class="admin-setting-row-label">Ny podcast</div>
                                                <div class="admin-setting-row-sub">Få pushvarsel når ny podcastepisode legges ut</div>
                                            </div>
                                            <label class="admin-toggle admin-toggle-sm">
                                                <input type="checkbox" name="pushPodcasts" id="admin-push-podcasts-toggle">
                                                <span class="admin-toggle-slider"></span>
                                            </label>
                                        </div>
                                        <div class="admin-setting-row admin-setting-row-sub-item">
                                            <div>
                                                <div class="admin-setting-row-label">Nytt blogginnlegg</div>
                                                <div class="admin-setting-row-sub">Få pushvarsel når nytt blogginnlegg publiseres</div>
                                            </div>
                                            <label class="admin-toggle admin-toggle-sm">
                                                <input type="checkbox" name="pushBlogs" id="admin-push-blogs-toggle">
                                                <span class="admin-toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>


                                <h4 style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: var(--text-main); border-top: 1px solid var(--border-color); padding-top: 32px;">Personvern & Samtykke</h4>
                                <div id="admin-consent-status-display" style="padding: 16px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 32px; font-size: 14px;">
                                    <div class="loader" style="margin: 0 auto;"></div>
                                </div>

                                <div style="display: flex; gap: 16px; align-items: center; border-top: 1px solid var(--border-color); padding-top: 24px; justify-content: flex-end;">
                                    <button type="submit" class="btn btn-primary" id="save-profile-btn" style="min-width: 180px;">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">save</span> 
                                        Lagre endringer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
      section.setAttribute("data-rendered", "true");

      // Load existing profile data from the same source as Min Side
      const profile = await firebaseService.getPageContent("settings_profile");
      let userProfile = null;
      try {
        const userDoc = await firebase
          .firestore()
          .collection("users")
          .doc(authUser.uid)
          .get();
        if (userDoc.exists) userProfile = userDoc.data();
      } catch (e) {
        console.warn("Kunne ikke hente users-profil i admin:", e);
      }

      const mergedName =
        (userProfile && userProfile.displayName) ||
        (authUser && authUser.displayName) ||
        (profile && profile.fullName) ||
        "";
      const mergedPhoto =
        (userProfile && userProfile.photoURL) ||
        authUser.photoURL ||
        (profile && profile.photoUrl) ||
        "";
      const mergedAddress =
        (userProfile && userProfile.address) ||
        (profile && profile.address) ||
        "";
      const mergedZip =
        (userProfile && userProfile.zip) || (profile && profile.zip) || "";
      const mergedCity =
        (userProfile && userProfile.city) || (profile && profile.city) || "";
      const mergedPhone =
        (userProfile && userProfile.phone) || (profile && profile.phone) || "";
      const mergedBio =
        (userProfile && userProfile.bio) || (profile && profile.bio) || "";
      const mergedNewsletter =
        userProfile && typeof userProfile.newsletter === "boolean"
          ? userProfile.newsletter
          : true;
      const mergedPushEnabled =
        userProfile && typeof userProfile.pushEnabled === "boolean"
          ? userProfile.pushEnabled
          : false;
      const mergedPushTeachings =
        userProfile && typeof userProfile.pushTeachings === "boolean"
          ? userProfile.pushTeachings
          : true;
      const mergedPushPodcasts =
        userProfile && typeof userProfile.pushPodcasts === "boolean"
          ? userProfile.pushPodcasts
          : true;
      const mergedPushBlogs =
        userProfile && typeof userProfile.pushBlogs === "boolean"
          ? userProfile.pushBlogs
          : true;

      const form = document.getElementById("admin-profile-full-form");
      if (!form) return;

      form.querySelector('[name="displayName"]').value = mergedName;
      form.querySelector('[name="email"]').value = authUser.email || "";
      form.querySelector('[name="address"]').value = mergedAddress;
      form.querySelector('[name="zip"]').value = mergedZip;
      form.querySelector('[name="city"]').value = mergedCity;
      form.querySelector('[name="phone"]').value = mergedPhone;
      form.querySelector('[name="newsletter"]').checked = mergedNewsletter;
      form.querySelector('[name="pushEnabled"]').checked = mergedPushEnabled;
      form.querySelector('[name="pushTeachings"]').checked =
        mergedPushTeachings;
      form.querySelector('[name="pushPodcasts"]').checked = mergedPushPodcasts;
      form.querySelector('[name="pushBlogs"]').checked = mergedPushBlogs;

      // Show/hide sub-settings based on saved state
      const adminPushSubSettings = document.getElementById(
        "admin-push-sub-settings",
      );
      if (adminPushSubSettings) {
        adminPushSubSettings.style.display = mergedPushEnabled ? "" : "none";
      }

      // Wire push toggle show/hide
      const adminPushToggle = document.getElementById("admin-push-toggle");
      if (adminPushToggle && adminPushSubSettings) {
        adminPushToggle.addEventListener("change", (e) => {
          adminPushSubSettings.style.display = e.target.checked ? "" : "none";
        });
      }

      const pictureContainer = document.getElementById(
        "profile-picture-container-admin",
      );
      if (mergedPhoto) {
        const overlay = pictureContainer.querySelector(
          'label[for="profile-upload-admin"]',
        );
        const input = pictureContainer.querySelector("#profile-upload-admin");
        pictureContainer.innerHTML = `<img src="${mergedPhoto}" style="width: 100%; height: 100%; object-fit: cover;">`;
        if (overlay) pictureContainer.appendChild(overlay);
        if (input) pictureContainer.appendChild(input);
      }

      // Consent status
      try {
        const consentDiv = document.getElementById(
          "admin-consent-status-display",
        );
        const userDoc = await firebase
          .firestore()
          .collection("users")
          .doc(authUser.uid)
          .get();
        if (consentDiv) {
          if (userDoc.exists && userDoc.data().privacySettings) {
            const choices = userDoc.data().privacySettings.choices || {};
            consentDiv.innerHTML = `
                        <p style="font-size: 0.95rem; line-height: 1.5;">
                            <strong>Aktivt samtykke:</strong><br>
                                Nødvendige: <span style="color: green;">Ja</span><br>
                                    Statistikk: ${choices.analytics ? '<span style="color: green;">Ja</span>' : '<span style="color: red;">Nei</span>'}<br>
                                        Markedsføring: ${choices.marketing ? '<span style="color: green;">Ja</span>' : '<span style="color: red;">Nei</span>'}
                                    </p>
                                    `;
          } else {
            consentDiv.innerHTML =
              '<p style="font-size: 0.95rem;">Ingen lagret samtykkestatus funnet.</p>';
          }
        }
      } catch (e) {
        const consentDiv = document.getElementById(
          "admin-consent-status-display",
        );
        if (consentDiv)
          consentDiv.textContent = "Kunne ikke hente samtykkestatus.";
      }

      // Image upload
      const fileInput = document.getElementById("profile-upload-admin");
      const uploadBtn = document.getElementById("upload-profile-btn-admin");
      if (uploadBtn && fileInput) uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = async () => {
        if (fileInput.files.length === 0) return;
        uploadBtn.disabled = true;
        uploadBtn.textContent = "Laster opp...";
        try {
          const url = await firebaseService.uploadImage(
            fileInput.files[0],
            `profiles/${authUser.uid}/avatar.jpg`,
          );
          await authUser.updateProfile({ photoURL: url });
          await firebase
            .firestore()
            .collection("users")
            .doc(authUser.uid)
            .set(
              {
                photoURL: url,
                displayName:
                  form.querySelector('[name="displayName"]').value ||
                  authUser.displayName ||
                  "",
                email: authUser.email || "",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          await firebaseService.savePageContent("settings_profile", {
            fullName:
              form.querySelector('[name="displayName"]').value ||
              authUser.displayName ||
              "",
            photoUrl: url,
            updatedAt: new Date().toISOString(),
          });

          const overlay = pictureContainer.querySelector(
            'label[for="profile-upload-admin"]',
          );
          const input = pictureContainer.querySelector("#profile-upload-admin");
          pictureContainer.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
          if (overlay) pictureContainer.appendChild(overlay);
          if (input) pictureContainer.appendChild(input);
          await this.updateUserInfo(authUser);
          this.showToast("Profilbilde oppdatert.", "success", 4000);
        } catch (err) {
          this.showToast("Opplasting feilet: " + err.message, "error", 6000);
        } finally {
          uploadBtn.disabled = false;
          uploadBtn.textContent = "Last opp nytt";
        }
      };

      // Google photo sync
      const googlePhotoBtn = document.getElementById("google-photo-btn-admin");
      if (googlePhotoBtn) {
        googlePhotoBtn.onclick = async () => {
          const provider = (authUser.providerData || []).find(
            (p) => p && p.providerId === "google.com",
          );
          if (!provider || !provider.photoURL) return;
          try {
            await authUser.updateProfile({ photoURL: provider.photoURL });
            await firebase
              .firestore()
              .collection("users")
              .doc(authUser.uid)
              .set(
                {
                  photoURL: provider.photoURL,
                  displayName:
                    form.querySelector('[name="displayName"]').value ||
                    authUser.displayName ||
                    provider.displayName ||
                    "",
                  email: authUser.email || "",
                  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
              );
            await firebaseService.savePageContent("settings_profile", {
              fullName:
                form.querySelector('[name="displayName"]').value ||
                authUser.displayName ||
                provider.displayName ||
                "",
              photoUrl: provider.photoURL,
              updatedAt: new Date().toISOString(),
            });
            await this.renderProfileSection();
            await this.updateUserInfo(authUser);
            this.showToast("Profilbilde hentet fra Google.", "success", 4000);
          } catch (err) {
            this.showToast("Kunne ikke hente bilde fra Google.", "error", 5000);
          }
        };
      }

      // Save full profile
      form.onsubmit = async (event) => {
        event.preventDefault();
        const btn = document.getElementById("save-profile-btn");
        const pushEnabled =
          form.querySelector('[name="pushEnabled"]')?.checked ?? false;
        const pushTeachings =
          form.querySelector('[name="pushTeachings"]')?.checked ?? true;
        const pushPodcasts =
          form.querySelector('[name="pushPodcasts"]')?.checked ?? true;
        const pushBlogs =
          form.querySelector('[name="pushBlogs"]')?.checked ?? true;
        const data = {
          fullName: form.querySelector('[name="displayName"]').value || "",
          address: form.querySelector('[name="address"]').value || "",
          zip: form.querySelector('[name="zip"]').value || "",
          city: form.querySelector('[name="city"]').value || "",
          phone: form.querySelector('[name="phone"]').value || "",
          bio: mergedBio || "",
          newsletter: form.querySelector('[name="newsletter"]').checked,
          photoUrl: authUser.photoURL || mergedPhoto || "",
          updatedAt: new Date().toISOString(),
        };

        const original = btn.innerHTML;
        btn.innerHTML =
          '<span class="material-symbols-outlined" style="font-size:18px;">sync</span> Lagrer...';
        btn.disabled = true;

        try {
          const authUpdates = {};
          if (data.fullName && data.fullName !== authUser.displayName)
            authUpdates.displayName = data.fullName;
          if (Object.keys(authUpdates).length > 0) {
            await authUser.updateProfile(authUpdates);
          }

          await firebase
            .firestore()
            .collection("users")
            .doc(authUser.uid)
            .set(
              {
                displayName: data.fullName,
                address: data.address,
                zip: data.zip,
                city: data.city,
                phone: data.phone,
                bio: data.bio,
                newsletter: data.newsletter,
                pushEnabled,
                pushTeachings,
                pushPodcasts,
                pushBlogs,
                photoURL: data.photoUrl,
                email: authUser.email || "",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );

          if (pushEnabled) {
            this._requestAdminPushPermission(authUser.uid).catch((e) =>
              console.warn(e),
            );
          }

          await firebaseService.savePageContent("settings_profile", data);
          this.showToast("Profilen er lagret!", "success", 5000);
          await this.updateUserInfo(authUser);
        } catch (err) {
          console.error(err);
          this.showToast("Feil ved lagring", "error", 5000);
        } finally {
          btn.innerHTML = original;
          btn.disabled = false;
        }
      };
    },

    async _getAdminPushRegistration() {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        {
          scope: "/firebase-cloud-messaging-push-scope/",
        },
      );
      if (registration.active) return registration;
      const worker = registration.installing || registration.waiting;
      if (!worker) throw new Error("Push-tjenesten kunne ikke startes.");
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          worker.removeEventListener("statechange", check);
        };
        const check = () => {
          if (worker.state === "activated") {
            cleanup();
            resolve();
          } else if (worker.state === "redundant") {
            cleanup();
            reject(new Error("Push-tjenesten kunne ikke aktiveres."));
          }
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("Oppstart av push-tjenesten tok for lang tid."));
        }, 10000);
        worker.addEventListener("statechange", check);
        check();
      });
      return registration;
    },
  };
}
