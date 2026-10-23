// dashboard methods for AdminManager.
export function createMethods7({ firebaseService, adminUtils, showErrorUI }) {
  return {
    renderOverviewLoadingState() {
      const section = document.getElementById("overview-section");
      if (!section) return;

      // Replace seeded/static demo content immediately to avoid showing an outdated dashboard on hard refresh.
      section.innerHTML = `
            <div class="card">
                <div class="card-body" style="min-height:180px; display:flex; align-items:center; justify-content:center;">
                    <div class="loader"></div>
                </div>
            </div>
        `;
    },

    _scheduleOverviewRefresh(reason = "unknown") {
      if (this.currentSection !== "overview") return;
      if (this._overviewRefreshTimer) clearTimeout(this._overviewRefreshTimer);
      this._overviewRefreshTimer = setTimeout(() => {
        this._overviewRefreshTimer = null;
        const section = document.getElementById("overview-section");
        if (!section) return;
        console.log(`[AdminManager] Refreshing overview stats (${reason})`);
        this.renderOverview();
      }, 250);
    },

    _initOverviewRealtimeSubscriptions() {
      if (this._overviewRealtimeInitialized || !firebaseService?.db) return;

      this._overviewRealtimeInitialized = true;

      const refresh = (reason) => this._scheduleOverviewRefresh(reason);
      const safeSub = (fn) => {
        try {
          return fn();
        } catch (e) {
          console.warn(
            "[AdminManager] Overview realtime subscription failed:",
            e,
          );
          return null;
        }
      };

      const pageSubs = [
        "collection_blog",
        "collection_teaching",
        "collection_events",
        "collection_causes",
        "index",
      ];
      pageSubs.forEach((docId) => {
        const unsub = firebaseService.subscribeToPage(docId, () =>
          refresh(`content:${docId}`),
        );
        if (typeof unsub === "function") {
          this._collectionRealtimeUnsubs[`overview:${docId}`] = unsub;
        }
      });

      const dbSubs = [
        {
          key: "overview:donations",
          ref: firebaseService.db.collection("donations"),
        },
        { key: "overview:users", ref: firebaseService.db.collection("users") },
      ];

      dbSubs.forEach(({ key, ref }) => {
        const unsub = safeSub(() =>
          ref.onSnapshot(
            () => refresh(key),
            (err) =>
              console.warn(`[AdminManager] ${key} subscription error:`, err),
          ),
        );
        if (typeof unsub === "function")
          this._collectionRealtimeUnsubs[key] = unsub;
      });
    },

    initDashboard() {
      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn && logoutBtn.dataset.hkmLogoutBound !== "1") {
        logoutBtn.dataset.hkmLogoutBound = "1";
        logoutBtn.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          logoutBtn.disabled = true;
          if (firebaseService.isInitialized) await firebaseService.logout();
          window.location.href = "/admin/login.html";
        });
      }

      // Top nav tabs
      const topNavTabs = document.querySelectorAll(".top-nav-tab");
      topNavTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const category = tab.dataset.category;
          this.filterSidebar(category);
        });
      });

      // Remove any seeded/static overview markup immediately to avoid a "double dashboard" flash on hard refresh.
      this.renderOverviewLoadingState();

      // Render initial overview
      this.renderOverview();
      console.log("Dashboard initialized.");

      // Søke-funksjon i toppfeltet
      this.initSearch();

      // Set initial sidebar filter
      this.filterSidebar("nettsted");

      // Init Automation Modal
      this.initTemplateEditorModal();

      // Chart Dropdown Logic (Delegated)
      document.addEventListener("click", (e) => {
        const btn = e.target.closest(".chart-options-btn");
        const dropdown = document.querySelector(".chart-dropdown");

        if (btn) {
          e.stopPropagation();
          if (dropdown) {
            dropdown.style.display =
              dropdown.style.display === "none" ? "block" : "none";
          }
        } else if (dropdown && dropdown.style.display === "block") {
          dropdown.style.display = "none";
        }
      });

      document.addEventListener("click", (e) => {
        const item = e.target.closest(".dropdown-item");
        if (item && item.closest(".dropdown-container")) {
          const view = item.dataset.view;
          const container = item.closest(".chart-container");
          const title = container.querySelector(".card-title");

          // Update Title & Data
          const bars = container.querySelectorAll(".bar");
          const dailyData = [40, 65, 85, 55, 75, 45, 80, 60];
          const weeklyData = [60, 40, 50, 90, 30, 70, 45, 85];
          const monthlyData = [30, 50, 40, 60, 80, 95, 70, 55];

          const dailyLabels = [
            "08:00",
            "",
            "12:00",
            "",
            "16:00",
            "",
            "20:00",
            "",
          ];
          const weeklyLabels = [
            "Man",
            "Tir",
            "Ons",
            "Tor",
            "Fre",
            "Lør",
            "Søn",
            "Tot",
          ];
          const monthlyLabels = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "Mai",
            "Jun",
            "Jul",
            "Aug",
          ];

          let selectedData = dailyData;
          let selectedLabels = dailyLabels;

          if (view === "daily") {
            title.textContent = "Trafikkovervåking (Daglig)";
            selectedData = dailyData;
            selectedLabels = dailyLabels;
          } else if (view === "weekly") {
            title.textContent = "Trafikkovervåking (Ukentlig)";
            selectedData = weeklyData;
            selectedLabels = weeklyLabels;
          } else if (view === "monthly") {
            title.textContent = "Trafikkovervåking (Månedlig)";
            selectedData = monthlyData;
            selectedLabels = monthlyLabels;
          }

          // Update Bars & Labels
          bars.forEach((bar, index) => {
            if (selectedData[index] !== undefined) {
              const value = selectedData[index];
              const label =
                selectedLabels[index] ||
                (view === "daily"
                  ? `${8 + index * 2}:00`
                  : `Punkt ${index + 1}`);

              bar.style.height = value + "%";

              // Add detailed tooltip info
              const visitorCount = Math.round(value * 8.5); // Mock visitor count
              bar.setAttribute(
                "data-tooltip-info",
                `${label}: ${visitorCount} besøkende`,
              );
              bar.title = ""; // Remove native title to avoid double tooltips

              // Find or create span for label
              let span = bar.querySelector("span");
              if (!span) {
                span = document.createElement("span");
                bar.appendChild(span);
              }
              span.textContent = selectedLabels[index] || "";
            }
          });

          // Update Active State
          container.querySelectorAll(".dropdown-item").forEach((i) => {
            i.style.color = "var(--text-muted)";
            i.classList.remove("active");
          });
          item.style.color = "var(--accent-color)";
          item.classList.add("active");

          // Close dropdown
          const dropdown = item.closest(".chart-dropdown");
          if (dropdown) dropdown.style.display = "none";
        }
      });

      // Global Tooltip Logic
      document.addEventListener("mouseover", (e) => {
        const el =
          e.target.closest(".bar") || e.target.closest("[data-tooltip]");
        if (el) {
          let tooltip = document.querySelector(".hkm-tooltip");
          if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.className = "hkm-tooltip";
            document.body.appendChild(tooltip);
          }
          const info =
            el.getAttribute("data-tooltip-info") ||
            el.getAttribute("data-tooltip");
          if (info) {
            tooltip.textContent = info;
            tooltip.style.display = "block";
          }
        }
      });

      document.addEventListener("mousemove", (e) => {
        const tooltip = document.querySelector(".hkm-tooltip");
        if (tooltip && tooltip.style.display === "block") {
          const padding = 15;
          let x = e.clientX + 10;
          let y = e.clientY + 15;

          // Prevent overflow right
          const tooltipWidth = tooltip.offsetWidth;
          if (x + tooltipWidth > window.innerWidth - padding) {
            x = e.clientX - tooltipWidth - 10;
          }

          // Prevent overflow bottom
          const tooltipHeight = tooltip.offsetHeight;
          if (y + tooltipHeight > window.innerHeight - padding) {
            y = e.clientY - tooltipHeight - 10;
          }

          tooltip.style.left = x + "px";
          tooltip.style.top = y + "px";
        }
      });

      document.addEventListener("mouseout", (e) => {
        const el =
          e.target.closest(".bar") || e.target.closest("[data-tooltip]");
        if (el) {
          const tooltip = document.querySelector(".hkm-tooltip");
          if (tooltip) tooltip.style.display = "none";
        }
      });
    },

    async loadActivityLog(filter = "all") {
      const container = document.getElementById("activity-log-list");
      if (!container) return;
      container.innerHTML =
        '<div class="loader" style="padding:24px;">Laster...</div>';

      try {
        const db = firebaseService.db;
        const results = [];

        // Fetch push log
        if (filter === "all" || filter === "push") {
          const pushSnap = await db
            .collection("push_log")
            .orderBy("sentAt", "desc")
            .limit(30)
            .get();
          pushSnap.forEach((doc) => {
            const d = doc.data();
            results.push({
              id: doc.id,
              type: "push",
              icon: "campaign",
              color: "#3b82f6",
              bg: "#eff6ff",
              title: d.title || "Push-varsling",
              meta: `${d.body || ""} · Til: ${d.targetRole === "all" ? "Alle" : d.targetRole} · Sendt av ${d.sentBy || "?"}`,
              date: d.sentAt?.toDate ? d.sentAt.toDate() : new Date(0),
              raw: d,
            });
          });
        }

        // Fetch contact messages
        if (filter === "all" || filter === "message") {
          const msgSnap = await db
            .collection("contactMessages")
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();
          msgSnap.forEach((doc) => {
            const d = doc.data();
            results.push({
              id: doc.id,
              type: "message",
              icon: "mail",
              color: "#10b981",
              bg: "#f0fdf4",
              title: `Melding fra ${d.name || "ukjent"}`,
              meta: `${d.subject || d.email || ""} · Status: ${d.status || "ny"}`,
              date: d.createdAt?.toDate
                ? d.createdAt.toDate()
                : d.timestamp?.toDate
                  ? d.timestamp.toDate()
                  : new Date(0),
              raw: d,
            });
          });
        }

        // Fetch new user events
        if (filter === "all" || filter === "new_user") {
          const notifSnap = await db
            .collection("admin_notifications")
            .where("type", "==", "NEW_USER_REGISTRATION")
            .orderBy("timestamp", "desc")
            .limit(20)
            .get();
          notifSnap.forEach((doc) => {
            const d = doc.data();
            results.push({
              id: doc.id,
              type: "new_user",
              icon: "person_add",
              color: "#f59e0b",
              bg: "#fffbeb",
              title: `Ny bruker: ${d.userName || d.userEmail || "ukjent"}`,
              meta: d.userEmail || "",
              date: d.timestamp?.toDate ? d.timestamp.toDate() : new Date(0),
              raw: d,
            });
          });
        }

        // Fetch System Logs (Errors & Warnings)
        if (filter === "all" || filter === "system") {
          const logSnap = await db
            .collection("system_logs")
            .orderBy("timestamp", "desc")
            .limit(15)
            .get();
          logSnap.forEach((doc) => {
            const d = doc.data();
            const isError = d.level === "error" || d.severity === "CRITICAL";
            results.push({
              id: doc.id,
              type: "system_log",
              icon: isError ? "report" : "warning",
              color: isError ? "#ef4444" : "#f59e0b",
              bg: isError ? "#fef2f2" : "#fffbeb",
              title: `System: ${d.type || "Feil"}`,
              meta: d.message || "",
              date: d.timestamp?.toDate ? d.timestamp.toDate() : new Date(0),
              raw: d,
            });
          });
        }

        // Sort by date descending
        results.sort((a, b) => b.date - a.date);

        if (results.length === 0) {
          container.innerHTML = `
                    <div style="padding:40px; text-align:center; color:#94a3b8;">
                        <span class="material-symbols-outlined" style="font-size:40px; display:block; margin-bottom:8px;">history</span>
                        Ingen aktiviteter funnet.
                    </div>`;
          return;
        }

        const timeAgo = (date) => {
          const diff = Math.floor((Date.now() - date) / 1000);
          if (diff < 60) return "Akkurat nå";
          if (diff < 3600) return `${Math.floor(diff / 60)} min siden`;
          if (diff < 86400) return `${Math.floor(diff / 3600)} t siden`;
          if (diff < 604800) return `${Math.floor(diff / 86400)} d siden`;
          return date.toLocaleDateString("no-NO", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        };

        this._activityLogItems = results;

        container.innerHTML = results
          .map(
            (item, index) => `
                <div class="activity-log-entry" data-activity-index="${index}" role="button" tabindex="0"
                    style="display:flex; align-items:flex-start; gap:14px; padding:14px 0;
                    border-bottom:1px solid var(--border-color);">
                    <div style="width:38px; height:38px; border-radius:50%; background:${item.bg};
                        display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-symbols-outlined" style="font-size:18px; color:${item.color};">${item.icon}</span>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; font-size:0.9rem; margin-bottom:2px;">${this.escapeHtml(item.title)}</div>
                        <div style="font-size:0.82rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${this.escapeHtml(item.meta || "")}</div>
                    </div>
                    <div style="font-size:0.75rem; color:#94a3b8; flex-shrink:0; text-align:right;">${timeAgo(item.date)}</div>
                </div>
            `,
          )
          .join("");

        container.querySelectorAll(".activity-log-entry").forEach((row) => {
          const openDetail = () => {
            const idx = Number(row.dataset.activityIndex);
            const item = this._activityLogItems[idx];
            if (item) this.openDetailPreview(item);
          };
          row.addEventListener("click", openDetail);
          row.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openDetail();
            }
          });
        });
      } catch (err) {
        console.error("Activity log error:", err);
        container.innerHTML = `<div style="padding:20px; color:#94a3b8; text-align:center;">Kunne ikke laste aktivitetslogg.</div>`;
      }
    },

    initWidgetConfig() {
      const configBtn = document.getElementById("configure-widgets-btn");
      const modal = document.getElementById("widget-config-modal");
      const closeBtn = document.getElementById("close-widget-config");
      const saveBtn = document.getElementById("save-widgets-btn");
      const container = document.getElementById("widget-list-container");

      if (!configBtn || !modal || !container) return;

      const openWidgetConfig = () => {
        // Build the list
        container.innerHTML = "";
        const savedOrder = JSON.parse(
          localStorage.getItem("hkm_dashboard_widgets"),
        );
        let enabledWidgets =
          savedOrder ||
          Object.keys(this.widgetLibrary).filter(
            (id) => this.widgetLibrary[id].default,
          );
        if (
          savedOrder &&
          savedOrder.includes("donations") &&
          !savedOrder.includes("donation-amount")
        ) {
          const idx = savedOrder.indexOf("donations");
          savedOrder.splice(idx + 1, 0, "donation-amount");
          enabledWidgets = savedOrder;
          localStorage.setItem(
            "hkm_dashboard_widgets",
            JSON.stringify(savedOrder),
          );
        }

        Object.values(this.widgetLibrary).forEach((widget) => {
          const isChecked = enabledWidgets.includes(widget.id);
          const item = document.createElement("label");
          item.className = "widget-config-item" + (isChecked ? " active" : "");
          item.innerHTML = `
                    <input type="checkbox" value="${widget.id}" ${isChecked ? "checked" : ""}>
                    <span class="material-symbols-outlined">${widget.icon}</span>
                    <span style="font-size: 14px; font-weight: 600; flex: 1;">${widget.label}</span>
                `;

          const checkbox = item.querySelector("input");
          checkbox.addEventListener("change", () => {
            item.classList.toggle("active", checkbox.checked);
          });

          container.appendChild(item);
        });

        modal.style.display = "flex";
      };

      configBtn.onclick = openWidgetConfig;

      const closeModal = () => (modal.style.display = "none");

      closeBtn.onclick = closeModal;

      if (!window.__hkmWidgetConfigWindowBound) {
        window.addEventListener("click", (e) => {
          const currentModal = document.getElementById("widget-config-modal");
          if (currentModal && e.target === currentModal) {
            currentModal.style.display = "none";
          }
        });
        window.__hkmWidgetConfigWindowBound = true;
      }

      saveBtn.onclick = () => {
        const selected = Array.from(
          container.querySelectorAll("input:checked"),
        ).map((cb) => cb.value);
        localStorage.setItem("hkm_dashboard_widgets", JSON.stringify(selected));
        closeModal();
        showToast("Oversikt oppdatert!", "success");
        this.renderOverview(); // Re-render with new widgets
      };
    },

    _getSavedAnalyticsRangeDays() {
      const saved = parseInt(
        localStorage.getItem("hkm_analytics_range_days"),
        10,
      );
      const allowed = [1, 7, 14, 30, 60, 90, 180, 365];
      return allowed.includes(saved) ? saved : 30;
    },

    _formatAnalyticsRangeLabel(days = this.analyticsRangeDays) {
      if (days === 1) return "Siste døgnet";
      return `Siste ${days} dager`;
    },

    initAnalyticsRangeControl() {
      const select = document.getElementById("analytics-range-days");
      if (!select) return;

      select.value = String(this.analyticsRangeDays);
      select.addEventListener("change", () => {
        const nextDays = parseInt(select.value, 10);
        if (!Number.isFinite(nextDays) || nextDays === this.analyticsRangeDays)
          return;

        this.analyticsRangeDays = nextDays;
        localStorage.setItem("hkm_analytics_range_days", String(nextDays));
        this.renderOverview();
        this.showToast(
          `Viser ${this._formatAnalyticsRangeLabel(nextDays).toLowerCase()}.`,
          "success",
          2500,
        );
      });
    },

    async renderOverview() {
      const section = document.getElementById("overview-section");
      if (!section) return;

      section.setAttribute("data-rendered", "true");

      // Fetch Data
      let blogCount = 0,
        teachingCount = 0,
        eventCount = 0,
        campaignCount = 0,
        userCount = 0;
      let donationCount = 0,
        donationTotal = 0;
      let indexStats = {};
      let youtubeStats = { subscribers: "N/A", videos: "N/A", views: "0" };
      let podcastCount = "...";
      let fullEvents = [];

      try {
        const [
          blogData,
          teachingData,
          eventData,
          causesData,
          indexData,
          yt,
          pod,
          coursesDoc,
          gaData,
        ] = await Promise.all([
          firebaseService.getPageContent("collection_blog").catch(() => null),
          firebaseService
            .getPageContent("collection_teaching")
            .catch(() => null),
          firebaseService.getPageContent("collection_events").catch(() => null),
          firebaseService.getPageContent("collection_causes").catch(() => null),
          firebaseService.getPageContent("settings_index").catch(() => null),
          this.fetchYouTubeStats().catch(() => null),
          this.fetchPodcastEpisodesForAdmin().catch(() => null),
          firebaseService
            .getPageContent("collection_courses")
            .catch(() => null),
          this.fetchAnalyticsData(this.analyticsRangeDays).catch(() => null),
        ]);

        blogCount = Array.isArray(blogData)
          ? blogData.length
          : blogData?.items
            ? Object.keys(blogData.items).length
            : 0;
        teachingCount = Array.isArray(teachingData)
          ? teachingData.length
          : teachingData?.items
            ? Object.keys(teachingData.items).length
            : 0;
        eventCount = Array.isArray(eventData)
          ? eventData.length
          : eventData?.items
            ? Object.keys(eventData.items).length
            : 0;
        campaignCount = Array.isArray(causesData)
          ? causesData.length
          : causesData?.items
            ? Object.keys(causesData.items).length
            : 0;
        indexStats = indexData || {};
        youtubeStats = yt || { subscribers: "N/A", videos: "N/A", views: "0" };
        podcastCount = Array.isArray(pod)
          ? pod.length
          : pod?.items
            ? Object.keys(pod.items).length
            : "0";
        fullEvents = Array.isArray(eventData)
          ? eventData
          : eventData?.items
            ? Object.values(eventData.items)
            : [];

        // Count users securely directly from the 'users' collection
        try {
          const usersSnap = await firebaseService.db.collection("users").get();
          userCount = usersSnap.size;
        } catch (uErr) {
          console.warn(
            "[AdminManager] Failed to fetch users collection:",
            uErr,
          );
          // Fallback to getSiteContent summary
          const usersSnap = await firebaseService
            .getSiteContent("users")
            .catch(() => null);
          userCount = Array.isArray(usersSnap)
            ? usersSnap.length
            : usersSnap?.items
              ? Object.keys(usersSnap.items).length
              : 0;
        }

        // Fetch donations summary directly from the 'donations' collection (filtered for the last 30 days)
        try {
          const donationsSnap = await firebaseService.db
            .collection("donations")
            .get();
          const now = new Date();
          const thirtyDaysAgo = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          );

          let completed30dCount = 0;
          let completed30dTotal = 0;

          donationsSnap.docs.forEach((doc) => {
            const data = doc.data();
            if (!data) return;

            const isInKind = !!data.isInKind;
            const status = String(data.status || "").toLowerCase();
            const type = String(data.type || "").toLowerCase();

            // Count completed monetary donations (exclude shop products and course payments)
            if (
              !isInKind &&
              ["completed", "succeeded", "captured"].includes(status)
            ) {
              if (!["butikk", "kurs", "course", "product"].includes(type)) {
                const dDate = this.getDonationDate(data);
                if (dDate && dDate >= thirtyDaysAgo) {
                  completed30dCount++;
                  completed30dTotal += this.normalizeDonationAmountNok(data);
                }
              }
            }
          });

          donationCount = completed30dCount;
          donationTotal = completed30dTotal;
        } catch (dErr) {
          console.warn(
            "[AdminManager] Failed to fetch donations collection:",
            dErr,
          );
          // Fallback to getSiteContent summary
          const donationsSnap = await firebaseService
            .getSiteContent("donations")
            .catch(() => null);
          const donations = Array.isArray(donationsSnap)
            ? donationsSnap
            : donationsSnap?.items
              ? Object.values(donationsSnap.items)
              : [];

          const now = new Date();
          const thirtyDaysAgo = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          );

          let completed30dCount = 0;
          let completed30dTotal = 0;

          donations.forEach((data) => {
            if (!data) return;
            const isInKind = !!data.isInKind;
            const status = String(data.status || "").toLowerCase();
            const type = String(data.type || "").toLowerCase();

            if (
              !isInKind &&
              ["completed", "succeeded", "captured"].includes(status)
            ) {
              if (!["butikk", "kurs", "course", "product"].includes(type)) {
                const dDate = this.getDonationDate(data);
                if (dDate && dDate >= thirtyDaysAgo) {
                  completed30dCount++;
                  completed30dTotal += this.normalizeDonationAmountNok(data);
                }
              }
            }
          });

          donationCount = completed30dCount;
          donationTotal = completed30dTotal;
        }

        this.gaData = gaData;

        // Fetch recent course enrollments for overview card
        let recentCourseEnrollments = [];
        try {
          const db =
            window.firebaseService?.db ||
            (typeof firebase !== "undefined" ? firebase.firestore() : null);
          if (db) {
            const enrollSnap = await db
              .collection("courseEnrollments")
              .orderBy("enrolledAt", "desc")
              .limit(5)
              .get();
            enrollSnap.forEach((doc) => {
              recentCourseEnrollments.push({ id: doc.id, ...doc.data() });
            });
          }
        } catch (cErr) {
          console.warn(
            "[AdminManager] Could not fetch courseEnrollments:",
            cErr,
          );
        }

        this.recentCourseEnrollments = recentCourseEnrollments;
      } catch (err) {
        console.warn(
          "[AdminManager] Failed to fetch overview data, using mock statistics:",
          err,
        );
      }

      // Build Recent Course Signups Card HTML
      let courseSignupsItemsHtml = "";
      const enrollments = this.recentCourseEnrollments || [];
      if (enrollments.length > 0) {
        courseSignupsItemsHtml = enrollments
          .map((item) => {
            const name = this.escapeHtml(
              item.name || item.userName || "Ukjent påmeldt",
            );
            const email = this.escapeHtml(item.email || item.userEmail || "");
            const course = this.escapeHtml(
              item.courseTitle || item.courseName || "HKM Kurs",
            );

            let initials =
              name
                .trim()
                .split(/\s+/)
                .map((p) => p[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "KP";
            if (initials.length === 1 && name.length >= 2)
              initials = name.substring(0, 2).toUpperCase();

            let dateStr = "Nylig";
            if (item.enrolledAt) {
              const d = item.enrolledAt.toDate
                ? item.enrolledAt.toDate()
                : new Date(item.enrolledAt);
              dateStr = d.toLocaleDateString("no-NO", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
            }

            const status = String(item.status || "godkjent").toLowerCase();
            let statusBadge =
              '<span class="status-pill status-approved"><span class="material-symbols-outlined" style="font-size: 14px; display: block;">check_circle</span>Påmeldt</span>';
            if (["pending", "venter"].includes(status)) {
              statusBadge =
                '<span class="status-pill status-pending"><span class="material-symbols-outlined" style="font-size: 14px; display: block;">hourglass_empty</span>Venter</span>';
            } else if (["fullført", "completed"].includes(status)) {
              statusBadge =
                '<span class="status-pill status-completed"><span class="material-symbols-outlined" style="font-size: 14px; display: block;">verified</span>Fullført</span>';
            }

            return `
                    <div class="recent-signup-item">
                        <div class="recent-signup-left">
                            <div class="recent-signup-avatar">
                                ${initials}
                            </div>
                            <div class="recent-signup-info">
                                <div class="recent-signup-name">${name}</div>
                                <div class="recent-signup-meta-row">
                                    ${email ? `<span class="recent-signup-email">${email}</span><span class="meta-dot">•</span>` : ""}
                                    <span class="recent-signup-course-tag">
                                        <span class="material-symbols-outlined" style="font-size: 13px; display: block;">school</span>
                                        ${course}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="recent-signup-right">
                            <span class="recent-signup-date">${dateStr}</span>
                            ${statusBadge}
                        </div>
                    </div>
                `;
          })
          .join("");
      } else {
        courseSignupsItemsHtml = `
                <div class="recent-signups-empty">
                    <div class="empty-icon-wrap">
                        <span class="material-symbols-outlined" style="font-size: 28px; display: block;">school</span>
                    </div>
                    <h4>Ingen nye kurspåmeldinger enda</h4>
                    <p>Når nye studenter melder seg på et kurs, vil deres registreringer vises her i sanntid.</p>
                </div>
            `;
      }

      const courseSignupsCardHtml = `
            <div class="dashboard-course-signups-card">
                <div class="dashboard-course-signups-header">
                    <div class="header-left-info">
                        <div class="header-icon-badge">
                            <span class="material-symbols-outlined" style="font-size: 24px; display: block;">school</span>
                        </div>
                        <div>
                            <h3>Siste kurspåmeldinger</h3>
                            <p>Nylig registrert deltakelse på HKM Kurs</p>
                        </div>
                    </div>
                    <a href="/admin/index.html#courses" class="dashboard-see-all-link" data-section="courses">
                        <span>Se alle påmeldinger</span>
                        <span class="material-symbols-outlined" style="font-size: 16px; display: block;">arrow_forward</span>
                    </a>
                </div>
                <div class="recent-signups-list">
                    ${courseSignupsItemsHtml}
                </div>
            </div>
        `;

      // Render dashboard grid with stats
      const enabledWidgets = [
        "visitors",
        "analytics-engagement",
        "users",
        "status",
        "blog",
        "teaching",
        "donations",
        "donation-amount",
        "youtube",
        "podcast",
      ];

      const categories = [
        {
          id: "traffic",
          label: "Trafikk & Innsikt",
          icon: "monitoring",
          widgets: ["visitors", "analytics-engagement", "users"],
        },
        {
          id: "content",
          label: "Innholdsmåling",
          icon: "description",
          widgets: ["status", "blog", "teaching", "podcast", "youtube"],
        },
        {
          id: "donations",
          label: "Gaver & Bidrag",
          icon: "volunteer_activism",
          widgets: ["donations", "donation-amount"],
        },
      ];

      let widgetsHtml = "";

      categories.forEach((cat) => {
        const catWidgets = cat.widgets.filter((id) =>
          enabledWidgets.includes(id),
        );
        if (catWidgets.length === 0) return;

        widgetsHtml += `
                <div class="hkm-dashboard-section" style="width: 100%;">
                    <div class="dashboard-col-header" style="margin-bottom: 16px;">
                        <span class="material-symbols-outlined" style="color: #1B4965;">${cat.icon}</span>
                        <h4>${cat.label}</h4>
                    </div>
                    <div class="hkm-widgets-grid">
            `;

        catWidgets.forEach((id) => {
          const w = this.widgetLibrary[id];
          if (!w) return;

          let value = "0",
            trend = "";

          const trends = {
            visitors:
              this.analyticsRangeDays === 7
                ? { val: "9.1%", up: true }
                : { val: "12%", up: true },
            "analytics-engagement":
              this.analyticsRangeDays === 7
                ? { val: "35.1%", up: false }
                : { val: "4%", up: true },
            users: { val: "8%", up: true },
            youtube: { val: "8%", up: true },
          };

          if (trends[id]) {
            trend = `
                        <div class="trend-indicator ${trends[id].up ? "trend-up" : "trend-down"}">
                            <span class="material-symbols-outlined" style="font-size: 14px;">${trends[id].up ? "show_chart" : "trending_down"}</span>
                            ${trends[id].val}
                        </div>
                    `;
          }

          switch (id) {
            case "visitors":
              let liveVisits = this.gaData
                ? this.gaData.activeRangeUsers || this.gaData.active30dUsers
                : null;
              if (!liveVisits) {
                const rangeVisits = {
                  1: 3,
                  7: 12,
                  14: 22,
                  30: 48,
                  60: 90,
                  90: 130,
                  180: 250,
                  365: 500,
                };
                liveVisits = rangeVisits[this.analyticsRangeDays] || 48;
              }
              value = liveVisits
                ? parseInt(liveVisits).toLocaleString("no-NO")
                : "—";
              break;
            case "analytics-engagement":
              let duration = this.gaData?.avgDuration || 0;
              if (!this.gaData) {
                duration = this.analyticsRangeDays === 7 ? 132 : 135;
              }
              const mins = Math.floor(duration / 60);
              const secs = Math.round(duration % 60);
              value = `${mins}m ${secs}s`;
              break;
            case "status":
              value = `
                            <span class="status-pulse-dot" style="width: 10px; height: 10px; flex-shrink: 0;"></span>
                            <span>Normal</span>
                        `;
              trend = "";
              break;
            case "users":
              value = userCount;
              break;
            case "blog":
              value = blogCount;
              break;
            case "teaching":
              value = teachingCount;
              break;
            case "donations":
              value = donationCount;
              break;
            case "donation-amount":
              value = `kr ${donationTotal.toLocaleString("no-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              break;
            case "youtube":
              value = youtubeStats.subscribers || "453";
              break;
            case "podcast":
              value = podcastCount;
              break;
          }

          widgetsHtml += `
                    <div class="stat-card modern" data-id="${id}">
                        <div class="stat-label">${w.label.toUpperCase()}</div>
                        <div class="stat-value">${value}</div>
                        ${trend}
                    </div>
                `;
        });

        widgetsHtml += `
                    </div>
                </div>
            `;
      });

      // Build Analytics Footer HTML with real data if available
      const ga = this.gaData || {};
      const topPagesArr =
        ga.topPages && Array.isArray(ga.topPages) && ga.topPages.length > 0
          ? ga.topPages.slice(0, 5).map((p) => {
              const title = p.title || p.path || "/";
              return {
                path:
                  title.length > 30 ? title.substring(0, 30) + "..." : title,
                pct:
                  Math.round(
                    (parseInt(p.views) / (parseInt(ga.screenPageViews) || 1)) *
                      100,
                  ) || 5,
              };
            })
          : [
              { path: "/hjem", pct: 42 },
              { path: "/blogg", pct: 28 },
              { path: "/podcast", pct: 15 },
              { path: "/kurs", pct: 10 },
              { path: "/kontakt", pct: 5 },
            ];

      // Render dynamic premium interactive SVG chart
      const sparklineHtml = `
            <div id="analytics-svg-chart-container" style="width: 100%; height: 100%; position: relative; overflow: visible;"></div>
        `;

      const analyticsFooterHtml = `
            <style>
                @keyframes hkm-pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
                }
            </style>
            <div class="analytics-bottom-row" style="display: grid; grid-template-columns: 2fr 1fr; gap: 32px; margin-top: 32px;">
                <div class="big-card">
                    <div class="big-card-title" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                        <span style="font-weight:700; color: var(--admin-text, #1e293b);">Trafikkovervåking (Google Analytics)</span>
                        <select id="analytics-range-days" class="analytics-range-select" aria-label="Velg periode">
                            ${[1, 7, 14, 30, 60, 90, 180, 365]
                              .map(
                                (days) => `
                                <option value="${days}" ${days === this.analyticsRangeDays ? "selected" : ""}>${this._formatAnalyticsRangeLabel(days).toUpperCase()}</option>
                            `,
                              )
                              .join("")}
                        </select>
                    </div>
                    <div style="height: 300px; background: var(--admin-surface, white); border: 1px solid var(--admin-border, #f1f5f9); border-radius: 12px; display: flex; flex-direction: column; align-items: stretch; color: var(--admin-text-muted, #94a3b8); padding: 24px;">
                        ${sparklineHtml}
                    </div>
                </div>
                <div class="side-card">
                    <div class="side-card-title" style="font-weight:700; color: var(--admin-text, #1e293b); margin-bottom: 16px;">Mest leste sider</div>
                    <div style="display:flex; flex-direction:column; gap: 16px; margin-top: 16px;">
                        ${topPagesArr
                          .map(
                            (p) => `
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                                    <span style="color: var(--admin-text, #475569); font-weight: 500;">${this.escapeHtml(p.path)}</span>
                                    <span style="color: var(--admin-text-muted, #64748b);">${p.pct}%</span>
                                </div>
                                <div style="width:100%; height:6px; background: var(--admin-surface-muted, #f1f5f9); border-radius:3px; overflow:hidden;">
                                    <div style="width:${p.pct}%; height:100%; background: var(--admin-accent-color, #1B4965); border-radius:3px;"></div>
                                </div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                    <a href="/admin/admin-analytics.html" style="display:flex; align-items:center; gap:8px; margin-top:20px; font-size:13px; color: var(--admin-accent-color, #1B4965); text-decoration:none; font-weight:600;">
                        <span>Se detaljert analyse</span>
                        <span class="material-symbols-outlined" aria-hidden="true" style="font-size: 16px;">arrow_forward</span>
                    </a>
                </div>
            </div>
        `;

      section.innerHTML = `
            <style>
                .hkm-dashboard-grid-saas {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 32px !important;
                    width: 100% !important;
                    margin-top: 32px !important;
                }
                .hkm-widgets-grid {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)) !important;
                    gap: 24px !important;
                    width: 100% !important;
                }
                .dashboard-col-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                    color: var(--admin-text, #1e293b);
                }
                .dashboard-col-header h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 700;
                }
                .stat-card.modern {
                    background: var(--admin-surface, white) !important;
                    border: 1px solid var(--admin-border, #e2e8f0) !important;
                    border-radius: 12px !important;
                    padding: 24px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 8px !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                }
                .stat-card.modern:hover {
                    border-color: var(--admin-accent-color, #d17d39) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
                    transform: translateY(-2px);
                }
                .stat-label {
                    font-size: 11px !important;
                    font-weight: 700 !important;
                    color: var(--admin-text-muted, #64748b) !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                }
                .stat-value {
                    font-size: 28px !important;
                    font-weight: 800 !important;
                    color: var(--admin-text, #1e293b) !important;
                    margin: 0 !important;
                }
                .trend-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    font-weight: 700;
                    margin-top: 4px;
                }
                .trend-up { color: #16a34a; }
                .trend-down { color: #dc2626; }
                
                /* Mobile Optimizations for Hero Card */
                @media (max-width: 768px) {
                    .overview-hero-card {
                        padding: 32px !important;
                    }
                    .overview-hero-title {
                        font-size: 28px !important;
                    }
                    .hero-actions-container {
                        flex-direction: column !important;
                        width: 100% !important;
                    }
                    .overview-hero-action, .overview-hero-action-secondary {
                        width: 100% !important;
                        justify-content: center !important;
                    }
                }
                
                /* Override dashboard.css SaaS styles with premium buttons */
                .overview-hero-action {
                    height: 42px !important;
                    background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%) !important;
                    color: white !important;
                    border-radius: 8px !important;
                    padding: 0 12px !important;
                    font-weight: 600 !important;
                    border: none !important;
                    box-shadow: 0 4px 12px rgba(209, 125, 57, 0.25) !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                    font-family: 'Inter', sans-serif !important;
                    transition: all 0.2s ease !important;
                    font-size: 13px !important;
                    white-space: nowrap !important;
                    margin: 0 !important;
                }
                .overview-hero-action:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 6px 16px rgba(209, 125, 57, 0.35) !important;
                    filter: brightness(1.05) !important;
                }
                .overview-hero-action-secondary {
                    height: 42px !important;
                    background: var(--admin-surface-muted, #ffffff) !important;
                    color: var(--admin-text-muted, #475569) !important;
                    border-radius: 8px !important;
                    padding: 0 12px !important;
                    font-weight: 600 !important;
                    border: 1px solid var(--admin-border, #cbd5e1) !important;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.05) !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                    font-family: 'Inter', sans-serif !important;
                    transition: all 0.2s ease !important;
                    font-size: 13px !important;
                    white-space: nowrap !important;
                    margin: 0 !important;
                }
                .overview-hero-action-secondary:hover {
                    background: var(--admin-surface, #f8fafc) !important;
                    color: var(--admin-text, #0f172a) !important;
                    border-color: var(--admin-border, #94a3b8) !important;
                    transform: translateY(-1px) !important;
                }
                .overview-hero-action .material-symbols-outlined,
                .overview-hero-action-secondary .material-symbols-outlined {
                    font-size: 18px !important;
                    color: inherit !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    vertical-align: middle !important;
                    line-height: 1 !important;
                    width: 18px !important;
                    height: 18px !important;
                }
                
                /* Dark Mode overrides for local page layout */
                html[data-theme="dark"] .dashboard-col-header {
                    color: var(--admin-text, #f8fafc) !important;
                }
                html[data-theme="dark"] .stat-card.modern {
                    background: #1e293b !important;
                    border-color: #334155 !important;
                }
                html[data-theme="dark"] .stat-label {
                    color: #94a3b8 !important;
                }
                html[data-theme="dark"] .stat-value {
                    color: #f8fafc !important;
                }
                html[data-theme="dark"] .overview-hero-action-secondary {
                    background: #0f172a !important;
                    color: #cbd5e1 !important;
                    border-color: #334155 !important;
                }
                html[data-theme="dark"] .overview-hero-action-secondary:hover {
                    background: #1e293b !important;
                    color: #f8fafc !important;
                    border-color: #475569 !important;
                }
            </style>
            <div class="overview-hero-card" style="background: var(--admin-orange-gradient); border-radius: 16px; padding: 48px; position: relative; overflow: hidden; color: white;">
                <div class="overview-hero-content" style="position: relative; z-index: 2;">
                    <h2 class="overview-hero-title" style="font-size: 36px; font-weight: 800; margin-bottom: 12px;">Velkommen tilbake!</h2>
                    <p class="overview-hero-text" style="font-size: 16px; opacity: 0.9; max-width: 600px; line-height: 1.6;">
                        Her har du en fullstendig oversikt over HKM Studio. Se sanntidsdata, administrer innhold og svar på meldinger fra én sentral flate.
                    </p>
                    <div class="hero-actions-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 32px; align-items: center !important; justify-content: flex-start !important;">
                        <button type="button" class="overview-hero-action" onclick="window.location.href='/admin/admin-meldinger.html'">
                            <span class="material-symbols-outlined">mail</span>
                            Gå til meldinger
                        </button>
                        <button type="button" class="overview-hero-action-secondary" onclick="window.location.href='/admin/index.html#content'">
                            <span class="material-symbols-outlined">dashboard_customize</span>
                            Se sideinnhold
                        </button>
                        <button type="button" class="overview-hero-action-secondary" onclick="if(window.handleSectionSwitch){window.handleSectionSwitch('causes')}else{window.location.hash='causes'}">
                            <span class="material-symbols-outlined">volunteer_activism</span>
                            Se gaver
                        </button>
                        <button type="button" class="overview-hero-action-secondary" onclick="if(window.handleSectionSwitch){window.handleSectionSwitch('shop')}else{window.location.hash='shop'}">
                            <span class="material-symbols-outlined">shopping_cart</span>
                            Se butikk
                        </button>
                    </div>
                </div>
                <!-- Subtle background decoration -->
                <span class="material-symbols-outlined" style="position: absolute; right: -40px; bottom: -40px; font-size: 320px; opacity: 0.1; transform: rotate(-15deg);">auto_graph</span>
            </div>
            <div class="hkm-dashboard-grid-saas">
                ${widgetsHtml}
            </div>
            <div class="analytics-footer-section">
                ${analyticsFooterHtml}
            </div>
            ${courseSignupsCardHtml}
        `;
      // Initialize supporting systems
      this._initOverviewRealtimeSubscriptions();
      this.initWidgetConfig();
      this.initSortableWidgets();
      this.initWidgetResizers();

      // RE-INIT DROPDOWN, CONFIG BTN and SORTABLE
      this._initOverviewRealtimeSubscriptions();
      this.initWidgetConfig();
      this.initSortableWidgets();
      this.initSortableMainGrid();
      this.initWidgetResizers();
      this.initAnalyticsRangeControl();

      // Edit Mode Toggle
      const editToggle = document.getElementById("toggle-edit-mode");
      const statsGrid = document.getElementById("dashboard-stats-grid");
      const mainGrid = document.getElementById("dashboard-main-grid");
      if (editToggle && statsGrid && mainGrid) {
        editToggle.addEventListener("click", () => {
          const isEditing = statsGrid.classList.toggle("edit-mode");
          mainGrid.classList.toggle("edit-mode", isEditing);

          if (isEditing) {
            editToggle.innerHTML =
              '<span class="material-symbols-outlined" style="font-size: 20px;">check</span>';
            showToast(
              "Dra boksene for å flytte, eller bruk hjørnet for å endre størrelse",
              "info",
            );
          } else {
            editToggle.innerHTML =
              '<span class="material-symbols-outlined" style="font-size: 20px;">open_with</span>';
          }
        });
      }

      this.checkSystemHealth();

      this._initialOverviewRenderComplete = true;

      // Remove splash/cloak after initial render
      setTimeout(() => this.removeSplashScreen(), 300);

      // Render premium interactive SVG chart
      setTimeout(() => {
        this.drawPremiumChart(this.gaData, this.analyticsRangeDays);
      }, 150);
    },

    initSortableWidgets() {
      const el = document.getElementById("dashboard-stats-grid");
      if (!el || typeof Sortable === "undefined") return;

      Sortable.create(el, {
        animation: 150,
        handle: ".drag-handle",
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        onEnd: () => {
          const order = Array.from(
            el.querySelectorAll(".stat-card.modern"),
          ).map((card) => card.dataset.id);
          localStorage.setItem("hkm_dashboard_widgets", JSON.stringify(order));
          showToast("Rekkefølge lagret!", "success");
        },
      });
    },

    initWidgetResizers() {
      let activeCard = null;
      let startX, startY, startSpan, startSpanV;
      let gridRect, colWidth, rowHeight;

      const onMouseDown = (e) => {
        const handle = e.target.closest(".corner-resize");
        if (!handle) return;
        e.preventDefault();
        e.stopPropagation();

        activeCard = handle.closest(".stat-card.modern");
        const grid = activeCard.parentElement;
        gridRect = grid.getBoundingClientRect();

        const gap = 24;
        colWidth = (gridRect.width + gap) / 4;
        const sampleCard =
          grid.querySelector('.stat-card.modern[data-span-v="1"]') ||
          activeCard;
        rowHeight =
          sampleCard.offsetHeight / parseInt(sampleCard.dataset.spanV || 1);

        startX = e.clientX;
        startY = e.clientY;
        startSpan = parseInt(activeCard.dataset.span || 1);
        startSpanV = parseInt(activeCard.dataset.spanV || 1);

        activeCard.classList.add("resizing");

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!activeCard) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const addCols = Math.round(deltaX / colWidth);
        const addRows = Math.round(deltaY / (rowHeight + 24));

        let newSpan = Math.max(1, Math.min(4, startSpan + addCols));
        let newSpanV = Math.max(1, Math.min(3, startSpanV + addRows));

        if (
          newSpan.toString() !== activeCard.dataset.span ||
          newSpanV.toString() !== activeCard.dataset.spanV
        ) {
          activeCard.dataset.span = newSpan;
          activeCard.dataset.spanV = newSpanV;
        }
      };

      const onMouseUp = () => {
        if (!activeCard) return;
        activeCard.classList.remove("resizing");

        const id = activeCard.dataset.id;
        const savedSpans =
          JSON.parse(localStorage.getItem("hkm_dashboard_widget_spans")) || {};
        const savedSpansV =
          JSON.parse(localStorage.getItem("hkm_dashboard_widget_spans_v")) ||
          {};

        savedSpans[id] = parseInt(activeCard.dataset.span);
        savedSpansV[id] = parseInt(activeCard.dataset.spanV);

        localStorage.setItem(
          "hkm_dashboard_widget_spans",
          JSON.stringify(savedSpans),
        );
        localStorage.setItem(
          "hkm_dashboard_widget_spans_v",
          JSON.stringify(savedSpansV),
        );

        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        activeCard = null;
      };

      const grid = document.getElementById("dashboard-stats-grid");
      if (grid) {
        grid.addEventListener("mousedown", onMouseDown);
      }
    },

    async fetchAnalyticsData(days = this.analyticsRangeDays) {
      try {
        const safeDays = [7, 14, 30, 60, 90, 180, 365].includes(Number(days))
          ? Number(days)
          : 30;

        const idToken = await this.getAdminAuthToken();
        if (!idToken) throw new Error("Du er ikke logget inn.");

        // Call the Firebase Function with Authorization header
        const response = await fetch(
          `https://getanalyticsoverview-42bhgdjkcq-uc.a.run.app?days=${safeDays}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          },
        );

        const result = await response
          .json()
          .catch(() => ({ error: `HTTP error ${response.status}` }));

        if (response.ok && result.status === "success") {
          this._analyticsFetchFailed = false;
          this._analyticsUnconfigured = false;
          return result.data;
        } else if (result.status === "unconfigured") {
          console.warn("Analytics is not configured:", result.message);
          this._analyticsFetchFailed = true;
          this._analyticsUnconfigured = true;
          this._analyticsErrorMessage = result.message;
          return null;
        }

        this._analyticsErrorMessage =
          result.error || result.message || "Kunne ikke hente data";
        throw new Error(this._analyticsErrorMessage);
      } catch (error) {
        console.error("Error fetching Analytics data:", error);
        this._analyticsFetchFailed = true;
        this._analyticsErrorMessage = error.message;
        return null;
      }
    },
  };
}
