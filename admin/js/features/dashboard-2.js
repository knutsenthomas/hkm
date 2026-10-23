// dashboard methods for AdminManager.
export function createDashboard2Methods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    renderGiftsDashboard() {
      const container = document.getElementById("causes-dashboard-container");
      if (!container) return;

      const allRecords = Array.isArray(this.allDonationRecords)
        ? this.allDonationRecords
        : [];
      const monetaryRecords = allRecords.filter((r) => !r.isInKind);

      const filters = this.donationFilters || {};
      let { start, end } = this.buildDonationDateRange(
        filters.preset || "30",
        filters.start || "",
        filters.end || "",
      );
      const now = new Date();
      if (!start) {
        if (monetaryRecords.length > 0) {
          const dates = monetaryRecords
            .map((r) => this.getDonationDate(r))
            .filter(Boolean);
          if (dates.length > 0) {
            start = new Date(Math.min(...dates.map((d) => d.getTime())));
          }
        }
        if (!start) {
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        }
      }
      if (!end) {
        end = now;
      }

      const periodRecords = monetaryRecords.filter((r) => {
        const d = this.getDonationDate(r);
        return d && d >= start && d <= end;
      });

      const isCompleted = (r) =>
        ["completed", "succeeded", "captured"].includes(
          String(r.status || "").toLowerCase(),
        );
      const periodCompleted = periodRecords.filter(isCompleted);
      const periodTotal = periodCompleted.reduce(
        (sum, r) => sum + this.normalizeDonationAmountNok(r),
        0,
      );

      const pad = (n) => String(n).padStart(2, "0");
      const rangeText = `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()} - ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()} - ${this.formatDonationCurrency(periodTotal)}`;

      const diffMs = end.getTime() - start.getTime();
      const numIntervals = 15;
      const intervalMs = diffMs / numIntervals;
      const dailyData = Array.from({ length: numIntervals }).map((_, idx) => {
        const intervalStart = new Date(start.getTime() + idx * intervalMs);
        const intervalEnd = new Date(intervalStart.getTime() + intervalMs);
        const intervalRecords = periodCompleted.filter((r) => {
          const d = this.getDonationDate(r);
          return d && d >= intervalStart && d < intervalEnd;
        });
        const amount = intervalRecords.reduce(
          (sum, r) => sum + this.normalizeDonationAmountNok(r),
          0,
        );
        return { start: intervalStart, end: intervalEnd, amount };
      });

      const maxAmount = Math.max(...dailyData.map((d) => d.amount), 1000);

      // Calculate points for SVG line chart
      const points = dailyData.map((d, idx) => {
        const x = (idx / (numIntervals - 1)) * 800;
        const y = 240 - (d.amount / maxAmount) * 200; // range 40 to 240
        let dateLabel = "";
        if (diffMs <= 24 * 60 * 60 * 1000) {
          dateLabel = `${d.start.getHours().toString().padStart(2, "0")}:${d.start.getMinutes().toString().padStart(2, "0")}`;
        } else {
          dateLabel = `${d.start.getDate()}/${d.start.getMonth() + 1}`;
        }
        return { x, y, amount: d.amount, dateLabel };
      });

      const linePath = `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
      const areaPath = `${linePath} L 800 260 L 0 260 Z`;
      // Render SVG elements
      const svgPathHtml = `
            <svg viewBox="0 0 800 260" width="100%" height="100%" preserveAspectRatio="none" style="display: block; overflow: visible;">
                <defs>
                    <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#1B4965" stop-opacity="0.25"></stop>
                        <stop offset="100%" stop-color="#1B4965" stop-opacity="0.00"></stop>
                    </linearGradient>
                </defs>
                <!-- Horizontal Grid Lines -->
                <line x1="0" y1="20" x2="800" y2="20" stroke="#f1f5f9" stroke-width="1"></line>
                <line x1="0" y1="130" x2="800" y2="130" stroke="#f1f5f9" stroke-width="1"></line>
                <line x1="0" y1="240" x2="800" y2="240" stroke="#e2e8f0" stroke-width="1"></line>
                
                <!-- Area -->
                <path d="${areaPath}" fill="url(#chart-area-grad)"></path>
                
                <!-- Line -->
                <path d="${linePath}" fill="none" stroke="#1B4965" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;

      // Render HTML dots to avoid non-uniform SVG stretching
      const chartDotsHtml = points
        .map((p, idx) => {
          const left = (p.x / 800) * 100;
          const top = (p.y / 260) * 100;
          return `
                <div id="chart-dot-${idx}" 
                     style="position: absolute; 
                            left: ${left}%; 
                            top: ${top}%; 
                            width: 8px; 
                            height: 8px; 
                            background: #ffffff; 
                            border: 2.5px solid #1B4965; 
                            border-radius: 50%; 
                            transform: translate(-50%, -50%); 
                            transition: transform 0.15s ease-in-out, width 0.15s ease-in-out, height 0.15s ease-in-out; 
                            pointer-events: none; 
                            box-sizing: border-box; 
                            z-index: 5;">
                </div>
            `;
        })
        .join("");

      // Render overlay hover columns centered on each point
      const colWidth = 100 / (numIntervals - 1);
      const chartBarsHtml = points
        .map((p, idx) => {
          const tooltip = `${p.dateLabel}: ${p.amount.toLocaleString("no-NO")} kr`;
          const left = (idx / (numIntervals - 1)) * 100;
          return `
                <div style="position: absolute; top: 0; bottom: 0; left: ${left}%; width: ${colWidth}%; transform: translateX(-50%); cursor: pointer; z-index: 10;" 
                     title="${tooltip}"
                     onmouseover="const dot = document.getElementById('chart-dot-${idx}'); if (dot) { dot.style.width = '14px'; dot.style.height = '14px'; dot.style.transform = 'translate(-50%, -50%) scale(1.1)'; }"
                     onmouseout="const dot = document.getElementById('chart-dot-${idx}'); if (dot) { dot.style.width = '8px'; dot.style.height = '8px'; dot.style.transform = 'translate(-50%, -50%) scale(1)'; }">
                </div>
            `;
        })
        .join("");
      const uniqueDonors = new Set();
      periodRecords.forEach((r) => {
        const email = this.getDonationDonorEmail(r, this.adminUserMap);
        const name = this.getDonationDonorName(r, this.adminUserMap);
        let key = r.userId;
        if (!key && email) key = email;
        if (!key && name) {
          const cleanName = name.trim().toLowerCase();
          if (
            cleanName &&
            cleanName !== "ukjent" &&
            cleanName !== "unknown" &&
            cleanName !== "ukjent giver"
          ) {
            key = name.trim();
          }
        }
        if (!key) key = r.id;
        uniqueDonors.add(key);
      });
      const donorCount = uniqueDonors.size;

      const donorFirstDonation = new Map();
      monetaryRecords.forEach((r) => {
        const email = this.getDonationDonorEmail(r, this.adminUserMap);
        const name = this.getDonationDonorName(r, this.adminUserMap);
        let key = r.userId;
        if (!key && email) key = email;
        if (!key && name) {
          const cleanName = name.trim().toLowerCase();
          if (
            cleanName &&
            cleanName !== "ukjent" &&
            cleanName !== "unknown" &&
            cleanName !== "ukjent giver"
          ) {
            key = name.trim();
          }
        }
        if (!key) key = r.id;
        const date = this.getDonationDate(r);
        if (date) {
          if (
            !donorFirstDonation.has(key) ||
            date < donorFirstDonation.get(key)
          ) {
            donorFirstDonation.set(key, date);
          }
        }
      });

      let newDonors = 0;
      uniqueDonors.forEach((k) => {
        const firstDate = donorFirstDonation.get(k);
        if (firstDate && firstDate >= start) {
          newDonors++;
        }
      });

      const donorCompletedCounts = new Map();
      monetaryRecords.forEach((r) => {
        if (isCompleted(r)) {
          const email = this.getDonationDonorEmail(r, this.adminUserMap);
          const name = this.getDonationDonorName(r, this.adminUserMap);
          let key = r.userId;
          if (!key && email) key = email;
          if (!key && name) {
            const cleanName = name.trim().toLowerCase();
            if (
              cleanName &&
              cleanName !== "ukjent" &&
              cleanName !== "unknown" &&
              cleanName !== "ukjent giver"
            ) {
              key = name.trim();
            }
          }
          if (!key) key = r.id;
          donorCompletedCounts.set(
            key,
            (donorCompletedCounts.get(key) || 0) + 1,
          );
        }
      });

      let recurringDonors = 0;
      uniqueDonors.forEach((k) => {
        if ((donorCompletedCounts.get(k) || 0) >= 2) {
          recurringDonors++;
        }
      });

      const textDonors = periodCompleted.filter(
        (r) =>
          String(r.method || "").toLowerCase() === "vipps" ||
          String(r.method || "").toLowerCase() === "vipps_manual",
      ).length;

      const donationCountPeriod = periodCompleted.length;
      const methodsMap = new Map();
      periodCompleted.forEach((r) => {
        const m = String(r.method || "other").toLowerCase();
        methodsMap.set(m, (methodsMap.get(m) || 0) + 1);
      });

      const stripeCount = methodsMap.get("stripe") || 0;
      const vippsCount =
        (methodsMap.get("vipps") || 0) + (methodsMap.get("vipps_manual") || 0);
      const bankCount = methodsMap.get("bank") || 0;
      const otherCount =
        donationCountPeriod - stripeCount - vippsCount - bankCount;

      const stripePct = donationCountPeriod
        ? Math.round((stripeCount / donationCountPeriod) * 100)
        : 0;
      const vippsPct = donationCountPeriod
        ? Math.round((vippsCount / donationCountPeriod) * 100)
        : 0;
      const bankPct = donationCountPeriod
        ? Math.round((bankCount / donationCountPeriod) * 100)
        : 0;
      const otherPct = donationCountPeriod
        ? Math.round((otherCount / donationCountPeriod) * 100)
        : 0;

      let accumulatedPct = 0;
      const donutSlices = [
        { pct: vippsPct, color: "#3b82f6" },
        { pct: stripePct, color: "#f59e0b" },
        { pct: bankPct, color: "#a855f7" },
        { pct: otherPct, color: "#10b981" },
      ]
        .filter((s) => s.pct > 0)
        .map((s) => {
          const strokeDash = `${s.pct} ${100 - s.pct}`;
          const strokeOffset = 100 - accumulatedPct;
          accumulatedPct += s.pct;
          return `<circle class="donut-segment" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="${s.color}" stroke-width="4" stroke-dasharray="${strokeDash}" stroke-dashoffset="${strokeOffset}"></circle>`;
        })
        .join("");

      const fundDonationsMap = new Map();
      allRecords.forEach((r) => {
        if (isCompleted(r)) {
          const f = r.fund || "general";
          fundDonationsMap.set(
            f,
            (fundDonationsMap.get(f) || 0) + this.normalizeDonationAmountNok(r),
          );
        }
      });
      const fundLabelsHtml =
        Array.from(fundDonationsMap.entries())
          .map(([fund, sum]) => {
            return `
                <div style="margin-bottom: 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span class="cms-pill" style="background:#f1f5f9; color:#475569; border-radius:4px; font-weight:600; text-transform:lowercase; font-size:12px;">${fund}</span>
                        <strong style="color:#0f172a; font-size:13px;">${sum.toLocaleString("no-NO")} kr</strong>
                    </div>
                </div>
            `;
          })
          .join("") ||
        '<p style="color:#64748b; font-size:13px; text-align:center;">Ingen merkelapper brukt ennå</p>';

      const causes = Array.isArray(this.allCauses) ? this.allCauses : [];
      let causesProgressHtml = "";
      if (causes.length === 0) {
        causesProgressHtml = `
                <p style="color:#64748b; font-size:12px; text-align:center; padding: 24px 0; margin: 0;">Ingen aktive innsamlingsaksjoner registrert</p>
            `;
      } else {
        causesProgressHtml = causes
          .slice(0, 3)
          .map((cause, idx) => {
            const collected = cause.collected || 0;
            const goal = cause.goal || 100000;
            const progress =
              goal > 0 ? Math.round((collected / goal) * 100) : 0;
            const progressClamped = Math.min(progress, 100);
            const color = idx % 2 === 0 ? "#1B4965" : "#d17d39";
            return `
                    <div style="background:#f8fafc; border-radius:8px; padding:10px 14px; border:1px solid #f1f5f9;">
                        <div style="height:10px; background:#e2e8f0; border-radius:99px; overflow:hidden; margin-bottom:6px;">
                            <div style="width:${progressClamped}%; height:100%; background:${color}; border-radius:99px;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:#64748b;">
                            <span>${this.escapeHtml(cause.title || "Uten tittel")}</span>
                            <span>${progress}% oppnådd</span>
                        </div>
                    </div>
                `;
          })
          .join("");
      }

      const presetLabels = {
        today: "I dag",
        7: "Siste 7 dager",
        30: "Siste 30 dager",
        month: "Denne måneden",
        year: "I år",
        all: "Alle visninger",
        custom: "Egendefinert periode",
      };
      const periodTitle =
        presetLabels[filters.preset || "30"] || "Valgt periode";

      let footerStartLabel = "Start";
      let footerEndLabel = "Slutt";
      if (filters.preset === "today") {
        footerStartLabel = "Start på dagen";
        footerEndLabel = "Slutt på dagen";
      } else if (filters.preset === "7") {
        footerStartLabel = "7 dager siden";
        footerEndLabel = "I dag";
      } else if (filters.preset === "30") {
        footerStartLabel = "30 dager siden";
        footerEndLabel = "I dag";
      } else if (filters.preset === "month") {
        footerStartLabel = "Månedens start";
        footerEndLabel = "I dag";
      } else if (filters.preset === "year") {
        footerStartLabel = "Årets start";
        footerEndLabel = "I dag";
      } else if (filters.preset === "all") {
        footerStartLabel = "Første transaksjon";
        footerEndLabel = "I dag";
      } else {
        footerStartLabel = start.toLocaleDateString("no-NO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        footerEndLabel = end.toLocaleDateString("no-NO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }

      container.innerHTML = `
            <div class="stats-grid causes-stats-grid" style="margin-bottom: 24px;">
                <div class="card" style="grid-column: span 4; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 240px;">
                    <div style="margin-bottom: 20px;">
                        <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Givere i perioden</span>
                        <h4 style="margin: 4px 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">${donorCount} givere</h4>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:28px; height:28px; border-radius:50%; background:#eff6ff; color:#3b82f6; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${newDonors}</div>
                                <span style="font-size:13px; font-weight:600; color:#475569;">Nye givere</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:28px; height:28px; border-radius:50%; background:#f0fdf4; color:#16a34a; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${recurringDonors}</div>
                                <span style="font-size:13px; font-weight:600; color:#475569;">Faste givere</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:28px; height:28px; border-radius:50%; background:#fdf2f8; color:#db2777; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${textDonors}</div>
                                <span style="font-size:13px; font-weight:600; color:#475569;">Vipps-givere</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card" style="grid-column: span 4; padding: 24px; min-height: 240px;">
                    <div style="margin-bottom: 16px;">
                        <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Gaver registrert</span>
                        <h4 style="margin: 4px 0 0; font-size: 24px; font-weight: 800; color: #0f172a;">${donationCountPeriod} gaver</h4>
                    </div>
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <div style="flex: 1; display:flex; flex-direction:column; gap:8px;">
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:#475569; margin-bottom:2px;">
                                    <span>Vipps</span>
                                    <span>${vippsPct}%</span>
                                </div>
                                <div style="height:6px; background:#f1f5f9; border-radius:99px; overflow:hidden;">
                                    <div style="width:${vippsPct}%; height:100%; background:#3b82f6;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:#475569; margin-bottom:2px;">
                                    <span>Kort (Stripe)</span>
                                    <span>${stripePct}%</span>
                                </div>
                                <div style="height:6px; background:#f1f5f9; border-radius:99px; overflow:hidden;">
                                    <div style="width:${stripePct}%; height:100%; background:#f59e0b;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:#475569; margin-bottom:2px;">
                                    <span>Bank</span>
                                    <span>${bankPct}%</span>
                                </div>
                                <div style="height:6px; background:#f1f5f9; border-radius:99px; overflow:hidden;">
                                    <div style="width:${bankPct}%; height:100%; background:#a855f7;"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="position:relative; width:90px; height:90px; flex-shrink:0;">
                            <svg width="100%" height="100%" viewBox="0 0 42 42" class="donut">
                                <circle class="donut-hole" cx="21" cy="21" r="15.91549430918954" fill="#fff"></circle>
                                <circle class="donut-ring" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" stroke-width="4"></circle>
                                ${donutSlices}
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="card" style="grid-column: span 4; padding: 24px; min-height: 240px; display: flex; flex-direction: column;">
                    <div style="margin-bottom: 16px;">
                        <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Fordelt på formål</span>
                        <h4 style="margin: 4px 0 0; font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">Aktive formål</h4>
                    </div>
                    <div style="flex:1; overflow-y:auto; max-height:140px;">
                        ${fundLabelsHtml}
                    </div>
                </div>

                <div class="card" style="grid-column: span 12; padding: 24px;">
                    <div style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Donasjonshistorikk</span>
                            <h4 style="margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #0f172a;">${periodTitle}</h4>
                        </div>
                        <span style="font-size: 14px; font-weight: 700; color: #1B4965; background: #eff6ff; padding: 6px 12px; border-radius: 6px;">${rangeText}</span>
                    </div>
                    <div style="height: 260px; position: relative; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px;">
                        <!-- SVG background -->
                        <div style="position: absolute; top: 10px; bottom: 10px; left: 0; right: 0; pointer-events: none;">
                            ${svgPathHtml}
                        </div>
                        <!-- HTML Dots (perfectly circular overlay) -->
                        <div style="position: absolute; top: 10px; bottom: 10px; left: 0; right: 0; pointer-events: none;">
                            ${chartDotsHtml}
                        </div>
                        <!-- Hover overlay columns -->
                        <div style="position: absolute; top: 10px; bottom: 10px; left: 0; right: 0; overflow: hidden;">
                            ${chartBarsHtml}
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; color: #94a3b8; font-size: 11px; font-weight: 600;">
                        <span>${footerStartLabel}</span>
                        <span>${footerEndLabel}</span>
                    </div>
                </div>
            </div>
        `;
    },
  };
}
