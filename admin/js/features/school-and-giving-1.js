// school and giving methods for AdminManager.
export function createSchoolAndGiving1Methods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    _ensureCoursesRealtimeSubscription() {
      if (this._siteContentRealtimeUnsubs.collection_courses) return;
      const subscribeFn =
        typeof firebaseService.subscribeToSiteContent === "function"
          ? firebaseService.subscribeToSiteContent.bind(firebaseService)
          : null;
      if (!subscribeFn) return;

      const unsub = subscribeFn("collection_courses", () => {
        const listEl = document.getElementById("courses-list");
        if (this.currentSection === "courses" && listEl) {
          this._loadCoursesList();
        }
        this._scheduleOverviewRefresh("courses");
      });
      if (typeof unsub === "function") {
        this._siteContentRealtimeUnsubs.collection_courses = unsub;
      }
    },

    normalizeDonationAmountNok(donation) {
      const raw = donation || {};
      const explicitNok = raw.amountNok ?? raw.amountNOK ?? raw.totalNok;
      if (explicitNok != null) {
        return typeof adminUtils.normalizeAmountNok === "function"
          ? adminUtils.normalizeAmountNok(explicitNok)
          : Number(explicitNok || 0);
      }

      const explicitOre = raw.amountOre ?? raw.amountCents;
      if (explicitOre != null) return (Number(explicitOre) || 0) / 100;

      const amount = Number(raw.amount || 0);
      if (!Number.isFinite(amount)) return 0;
      if (raw.paymentIntentId && !raw.transactionId) return amount / 100;
      return amount;
    },

    getDonationDate(donation) {
      const raw = donation || {};
      return (
        raw.completedAt?.toDate?.() ||
        raw.timestamp?.toDate?.() ||
        raw.createdAt?.toDate?.() ||
        (raw.completedAt ? new Date(raw.completedAt) : null) ||
        (raw.timestamp ? new Date(raw.timestamp) : null) ||
        (raw.createdAt ? new Date(raw.createdAt) : null)
      );
    },

    formatDonationCurrency(amount) {
      return (Number(amount) || 0).toLocaleString("no-NO", {
        style: "currency",
        currency: "NOK",
        maximumFractionDigits: 0,
      });
    },

    getDonationStatusLabel(status) {
      const normalized = String(status || "").toLowerCase();
      const labels = {
        completed: "Fullført",
        succeeded: "Fullført",
        captured: "Fullført",
        pending: "Venter",
        processing: "Behandles",
        failed: "Feilet",
        canceled: "Avbrutt",
        cancelled: "Avbrutt",
      };
      return labels[normalized] || status || "Ukjent";
    },

    getDonationMethodLabel(method) {
      const normalized = String(method || "").toLowerCase();
      const labels = {
        stripe: "Stripe",
        vipps: "Vipps",
        vipps_manual: "Vipps manuelt",
        card: "Kort",
        bank: "Bank",
        cash: "Kontant",
        manual: "Manuell",
        other: "Annen tjeneste",
      };
      return (
        labels[normalized] ||
        (method ? method.charAt(0).toUpperCase() + method.slice(1) : "Ukjent")
      );
    },

    getDonationDonorName(donation, userMap = new Map()) {
      let user = donation.userId ? userMap.get(donation.userId) : null;

      // Fallback: search by email in userMap
      const donorEmailRaw = String(donation.donorEmail || donation.email || "")
        .trim()
        .toLowerCase();
      if (
        !user &&
        donorEmailRaw &&
        donorEmailRaw !== "ukjent" &&
        donorEmailRaw !== "unknown"
      ) {
        for (const u of userMap.values()) {
          if (u.email && u.email.trim().toLowerCase() === donorEmailRaw) {
            user = u;
            break;
          }
        }
      }

      // Fallback: search by name in userMap
      const donorNameRaw = String(donation.donorName || donation.name || "")
        .trim()
        .toLowerCase();
      if (
        !user &&
        donorNameRaw &&
        donorNameRaw !== "ukjent giver" &&
        donorNameRaw !== "ukjent" &&
        donorNameRaw !== "unknown"
      ) {
        for (const u of userMap.values()) {
          const uName = String(u.displayName || u.fullName || u.name || "")
            .trim()
            .toLowerCase();
          if (uName && uName === donorNameRaw) {
            user = u;
            break;
          }
        }
      }

      return (
        user?.displayName ||
        user?.fullName ||
        donation.donorName ||
        donation.name ||
        user?.email ||
        donation.donorEmail ||
        donation.email ||
        "Ukjent giver"
      );
    },

    getDonationDonorEmail(donation, userMap = new Map()) {
      let user = donation.userId ? userMap.get(donation.userId) : null;

      // Fallback: search by email in userMap if userId is not linked
      const donorEmailRaw = String(donation.donorEmail || donation.email || "")
        .trim()
        .toLowerCase();
      if (
        !user &&
        donorEmailRaw &&
        donorEmailRaw !== "ukjent" &&
        donorEmailRaw !== "unknown"
      ) {
        for (const u of userMap.values()) {
          if (u.email && u.email.trim().toLowerCase() === donorEmailRaw) {
            user = u;
            break;
          }
        }
      }

      // Fallback: search by name in userMap
      const donorNameRaw = String(donation.donorName || donation.name || "")
        .trim()
        .toLowerCase();
      if (
        !user &&
        donorNameRaw &&
        donorNameRaw !== "ukjent giver" &&
        donorNameRaw !== "ukjent" &&
        donorNameRaw !== "unknown"
      ) {
        for (const u of userMap.values()) {
          const uName = String(u.displayName || u.fullName || u.name || "")
            .trim()
            .toLowerCase();
          if (uName && uName === donorNameRaw) {
            user = u;
            break;
          }
        }
      }

      const email = String(
        user?.email || donation.donorEmail || donation.email || "",
      )
        .trim()
        .toLowerCase();
      if (email === "ukjent" || email === "unknown") return "";
      return email;
    },

    buildDonationDateRange(preset, startValue, endValue) {
      const now = new Date();
      const startOfDay = (date) =>
        new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = (date) =>
        new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          23,
          59,
          59,
          999,
        );
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      if (preset === "all") return { start: null, end: null };
      if (preset === "today") return { start: todayStart, end: todayEnd };
      if (preset === "7")
        return {
          start: new Date(todayStart.getTime() - 6 * 86400000),
          end: todayEnd,
        };
      if (preset === "30")
        return {
          start: new Date(todayStart.getTime() - 29 * 86400000),
          end: todayEnd,
        };
      if (preset === "90")
        return {
          start: new Date(todayStart.getTime() - 89 * 86400000),
          end: todayEnd,
        };
      if (preset === "365")
        return {
          start: new Date(todayStart.getTime() - 364 * 86400000),
          end: todayEnd,
        };
      if (preset === "month")
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: todayEnd,
        };
      if (preset === "year")
        return { start: new Date(now.getFullYear(), 0, 1), end: todayEnd };

      const start = startValue
        ? startOfDay(new Date(`${startValue}T00:00:00`))
        : null;
      const end = endValue ? endOfDay(new Date(`${endValue}T00:00:00`)) : null;
      return { start, end };
    },

    getFilteredDonationRecords() {
      const records = Array.isArray(this.allDonationRecords)
        ? this.allDonationRecords
        : [];
      const filters = this.donationFilters || {};
      const { start, end } = this.buildDonationDateRange(
        filters.preset || "30",
        filters.start || "",
        filters.end || "",
      );
      const query = String(filters.query || "")
        .trim()
        .toLowerCase();
      const status = String(filters.status || "all").toLowerCase();
      const method = String(filters.method || "all").toLowerCase();
      const type = String(filters.type || "all").toLowerCase();

      return records.filter((record) => {
        if (record.isInKind) return false;
        // Gaver section is strictly for donations - exclude shop and course purchases
        const recTypeLower = String(record.type || "").toLowerCase();
        if (["butikk", "kurs", "course", "product"].includes(recTypeLower)) {
          return false;
        }

        const date = this.getDonationDate(record);
        if (start && (!date || date < start)) return false;
        if (end && (!date || date > end)) return false;
        const recordStatus = String(record.status || "").toLowerCase();
        if (status !== "all") {
          if (
            status === "completed" &&
            !["completed", "succeeded", "captured"].includes(recordStatus)
          )
            return false;
          if (status !== "completed" && recordStatus !== status) return false;
        }
        if (
          method !== "all" &&
          String(record.method || "").toLowerCase() !== method
        )
          return false;

        if (type !== "all") {
          const recordType = String(record.type || "gave").toLowerCase();
          if (recordType !== type) return false;
        }

        if (!query) return true;
        const haystack = [
          record.id,
          record.transactionId,
          record.donorName,
          record.donorEmail,
          record.email,
          record.method,
          record.status,
          record.type,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    },

    renderDonationAdminViews() {
      const records = this.getFilteredDonationRecords();
      const userMap = this.adminUserMap || new Map();

      // Apply sorting to donation records
      records.sort((a, b) => {
        let comp = 0;
        if (this.donationSortField === "date") {
          const dateA = this.getDonationDate(a) || new Date(0);
          const dateB = this.getDonationDate(b) || new Date(0);
          comp = dateA.getTime() - dateB.getTime();
        } else if (this.donationSortField === "giver") {
          const nameA = this.getDonationDonorName(a, userMap) || "";
          const nameB = this.getDonationDonorName(b, userMap) || "";
          comp = nameA.localeCompare(nameB, "no");
        } else if (this.donationSortField === "method") {
          const methodA = this.getDonationMethodLabel(a.method) || "";
          const methodB = this.getDonationMethodLabel(b.method) || "";
          comp = methodA.localeCompare(methodB, "no");
        } else if (this.donationSortField === "status") {
          const statusA = this.getDonationStatusLabel(a.status) || "";
          const statusB = this.getDonationStatusLabel(b.status) || "";
          comp = statusA.localeCompare(statusB, "no");
        } else if (this.donationSortField === "profile") {
          const profA = a.userId ? 1 : 0;
          const profB = b.userId ? 1 : 0;
          comp = profA - profB;
        } else if (this.donationSortField === "amount") {
          const amountA = this.normalizeDonationAmountNok(a);
          const amountB = this.normalizeDonationAmountNok(b);
          comp = amountA - amountB;
        }
        return this.donationSortDir === "asc" ? comp : -comp;
      });

      const todayRange = this.buildDonationDateRange("today");

      // 1. Calculations for donations tab
      const todayRecords = (this.allDonationRecords || []).filter((record) => {
        if (record.isInKind) return false;
        const recType = String(record.type || "").toLowerCase();
        if (
          recType === "butikk" ||
          recType === "kurs" ||
          recType === "course" ||
          recType === "product"
        )
          return false;
        const date = this.getDonationDate(record);
        return date && date >= todayRange.start && date <= todayRange.end;
      });
      const isCompleted = (record) =>
        ["completed", "succeeded", "captured"].includes(
          String(record.status || "").toLowerCase(),
        );
      const allRecords = (this.allDonationRecords || []).filter((r) => {
        if (r.isInKind) return false;
        const recType = String(r.type || "").toLowerCase();
        return (
          recType !== "butikk" &&
          recType !== "kurs" &&
          recType !== "course" &&
          recType !== "product"
        );
      });
      const allCompletedRecords = allRecords.filter(isCompleted);
      const allCompletedTotal = allCompletedRecords.reduce(
        (sum, record) => sum + this.normalizeDonationAmountNok(record),
        0,
      );
      const allAverage = allCompletedRecords.length
        ? allCompletedTotal / allCompletedRecords.length
        : 0;
      const todayTotal = todayRecords
        .filter(isCompleted)
        .reduce(
          (sum, record) => sum + this.normalizeDonationAmountNok(record),
          0,
        );
      const filteredTotal = records
        .filter(isCompleted)
        .reduce(
          (sum, record) => sum + this.normalizeDonationAmountNok(record),
          0,
        );
      const pendingCount = records.filter(
        (record) => String(record.status || "").toLowerCase() === "pending",
      ).length;
      const unmatchedCount = records.filter((record) => !record.userId).length;

      // Render donation stats
      const todayAmountEl = document.getElementById("donation-today-amount");
      const todayCountEl = document.getElementById("donation-today-count");
      const periodAmountEl = document.getElementById("donation-period-amount");
      const periodCountEl = document.getElementById("donation-period-count");
      const donorCountEl = document.getElementById("donation-donor-count");
      const pendingEl = document.getElementById("donation-pending-count");
      const unmatchedEl = document.getElementById("donation-unmatched-count");
      const topTotalEl = document.getElementById("donation-total-amount");
      const topCountEl = document.getElementById("donation-total-count");
      const topAverageEl = document.getElementById("donation-average-amount");

      const donationDonors = this.buildDonorSummaries(records);

      const filteredCompletedRecords = records.filter(isCompleted);
      const filteredAverage = filteredCompletedRecords.length
        ? filteredTotal / filteredCompletedRecords.length
        : 0;

      if (topTotalEl)
        topTotalEl.textContent = this.formatDonationCurrency(filteredTotal);
      if (topCountEl)
        topCountEl.textContent = records.length.toLocaleString("no-NO");
      if (topAverageEl)
        topAverageEl.textContent = this.formatDonationCurrency(filteredAverage);
      if (todayAmountEl)
        todayAmountEl.textContent = this.formatDonationCurrency(todayTotal);
      if (todayCountEl)
        todayCountEl.textContent = `${todayRecords.length} registrert i dag`;
      if (periodAmountEl)
        periodAmountEl.textContent = this.formatDonationCurrency(filteredTotal);
      if (periodCountEl)
        periodCountEl.textContent = `${records.length} transaksjoner i valgt periode`;
      if (donorCountEl)
        donorCountEl.textContent =
          donationDonors.length.toLocaleString("no-NO");
      if (pendingEl) pendingEl.textContent = `${pendingCount} venter`;
      if (unmatchedEl)
        unmatchedEl.textContent = `${unmatchedCount} uten profilkobling`;

      // Render donation transactions table
      const transactionsBody = document.getElementById(
        "donation-transactions-body",
      );
      if (transactionsBody) {
        const visibleRecords = records.slice(0, 100);
        transactionsBody.innerHTML = visibleRecords.length
          ? visibleRecords
              .map((record) => {
                const date = this.getDonationDate(record);
                const name = this.escapeHtml(
                  this.getDonationDonorName(record, userMap),
                );
                const email = this.escapeHtml(
                  this.getDonationDonorEmail(record, userMap) || "Ingen e-post",
                );
                const status = this.escapeHtml(
                  this.getDonationStatusLabel(record.status),
                );
                const amount = this.formatDonationCurrency(
                  this.normalizeDonationAmountNok(record),
                );
                const method = this.escapeHtml(
                  this.getDonationMethodLabel(record.method),
                );

                const recType = String(record.type || "").toLowerCase();
                let typeBadge = "";
                if (recType === "fast") {
                  typeBadge = `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-left: 6px;">FAST</span>`;
                } else if (recType === "butikk" || recType === "product") {
                  typeBadge = `<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-left: 6px;">BUTIKK</span>`;
                } else if (recType === "kurs" || recType === "course") {
                  typeBadge = `<span style="background: #f0fdf4; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-left: 6px;">KURS</span>`;
                } else {
                  typeBadge = `<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-left: 6px;">ENKELT</span>`;
                }

                const profileStatus = record.userId
                  ? `<button type="button" class="btn-link-profile link-connected" data-id="${record.id}" data-userid="${record.userId}" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; padding:4px 10px; border-radius:9999px; font-size:12px; font-weight:700; line-height:12px !important; box-shadow:0 1px 2px rgba(16,185,129,0.05); cursor:pointer; font-family:inherit;">
                        <span class="material-symbols-outlined" style="font-size:14px; font-weight:900; color:#10b981; line-height:1 !important; display:inline-flex !important; align-items:center; justify-content:center; width:14px; height:14px; margin:0 !important; padding:0 !important;">link</span>
                        Koblet
                       </button>`
                  : `<button type="button" class="btn-link-profile link-unconnected" data-id="${record.id}" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; background:#fff7ed; color:#b45309; border:1px solid #ffedd5; padding:4px 10px; border-radius:9999px; font-size:12px; font-weight:700; line-height:12px !important; box-shadow:0 1px 2px rgba(245,158,11,0.05); cursor:pointer; font-family:inherit;">
                        <span class="material-symbols-outlined" style="font-size:14px; font-weight:900; color:#f59e0b; line-height:1 !important; display:inline-flex !important; align-items:center; justify-content:center; width:14px; height:14px; margin:0 !important; padding:0 !important;">link_off</span>
                        Ukoblet
                       </button>`;
                return `
                    <tr>
                        <td style="white-space: nowrap;">${date ? date.toLocaleString("no-NO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Ukjent dato"}</td>
                        <td style="white-space: nowrap;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <strong>${name}</strong>
                                ${typeBadge}
                            </div>
                            <div style="font-size:12px;color:#64748b;">${email}</div>
                        </td>
                        <td><span class="method-tag">${method}</span></td>
                        <td><span class="method-tag">${status}</span></td>
                        <td>${profileStatus}</td>
                        <td class="text-right">
                            <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px;">
                                <strong>${amount}</strong>
                                <button type="button" class="action-btn delete-donation-btn" data-id="${record.id}" title="Slett gave" style="color: #ef4444; background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background 0.2s;">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
              })
              .join("")
          : `
                <tr><td colspan="6" style="padding:28px;text-align:center;color:#64748b;">Ingen gaver matcher filteret.</td></tr>
            `;

        // Bind click events to delete buttons
        transactionsBody
          .querySelectorAll(".delete-donation-btn")
          .forEach((btn) => {
            btn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const donationId = btn.dataset.id;
              await this.deleteDonation(donationId);
            });
          });

        // Bind click events to link buttons
        transactionsBody
          .querySelectorAll(".btn-link-profile")
          .forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const donationId = btn.dataset.id;
              const currentUserId = btn.dataset.userid || "";
              this.openLinkProfileModal(donationId, currentUserId);
            });
          });

        // Setup sorting for table headers dynamically
        const table = transactionsBody.closest("table");
        if (table) {
          const headers = table.querySelectorAll("thead th");
          const fields = [
            "date",
            "giver",
            "method",
            "status",
            "profile",
            "amount",
          ];
          headers.forEach((header, index) => {
            const field = fields[index];
            if (field) {
              header.style.cursor = "pointer";
              header.style.userSelect = "none";
              header.style.position = "relative";

              if (!header.dataset.sortBound) {
                header.dataset.sortBound = "true";
                header.addEventListener("mouseover", () => {
                  header.style.backgroundColor = "#f1f5f9";
                  header.style.color = "#1b4965";
                });
                header.addEventListener("mouseout", () => {
                  header.style.backgroundColor = "";
                  header.style.color = "";
                });
                header.addEventListener("click", () => {
                  if (this.donationSortField === field) {
                    this.donationSortDir =
                      this.donationSortDir === "asc" ? "desc" : "asc";
                  } else {
                    this.donationSortField = field;
                    this.donationSortDir =
                      field === "date" || field === "amount" ? "desc" : "asc";
                  }
                  this.renderDonationAdminViews();
                });
              }

              // Add/update sort indicator
              let wrapper = header.querySelector(".sort-header-wrapper");
              if (!wrapper) {
                wrapper = document.createElement("div");
                wrapper.className = "sort-header-wrapper";
                wrapper.style.display = "inline-flex";
                wrapper.style.alignItems = "center";
                wrapper.style.gap = "6px";
                wrapper.style.verticalAlign = "middle";
                if (
                  header.style.textAlign === "right" ||
                  header.classList.contains("text-right")
                ) {
                  wrapper.style.width = "100%";
                  wrapper.style.justifyContent = "flex-end";
                }
                while (header.firstChild) {
                  wrapper.appendChild(header.firstChild);
                }
                header.appendChild(wrapper);
              }

              let icon = wrapper.querySelector(".sort-icon");
              if (!icon) {
                icon = document.createElement("span");
                icon.className = "material-symbols-outlined sort-icon";
                icon.style.fontSize = "14px";
                icon.style.lineHeight = "1";
                icon.style.flexShrink = "0";
                icon.style.display = "inline-flex";
                icon.style.alignItems = "center";
                icon.style.position = "relative";
                icon.style.top = "-1px";
                wrapper.appendChild(icon);
              }

              if (field === this.donationSortField) {
                icon.style.display = "inline-flex";
                icon.textContent =
                  this.donationSortDir === "asc"
                    ? "arrow_upward"
                    : "arrow_downward";
                icon.style.color = "#d17d39";
              } else {
                icon.style.display = "none";
              }
            }
          });
        }
      }

      // 2. Calculations for shop tab
      const shopRecords = this.getFilteredShopRecords();
      const allShopRecords = (this.allDonationRecords || []).filter(
        (r) => !r.isInKind && String(r.type || "").toLowerCase() === "butikk",
      );
      const allCompletedShopRecords = allShopRecords.filter(isCompleted);
      const allShopTotal = allCompletedShopRecords.reduce(
        (sum, record) => sum + this.normalizeDonationAmountNok(record),
        0,
      );
      const allShopAverage = allCompletedShopRecords.length
        ? allShopTotal / allCompletedShopRecords.length
        : 0;

      const todayShopRecords = (this.allDonationRecords || []).filter(
        (record) => {
          if (record.isInKind) return false;
          if (String(record.type || "").toLowerCase() !== "butikk")
            return false;
          const date = this.getDonationDate(record);
          return date && date >= todayRange.start && date <= todayRange.end;
        },
      );
      const todayShopTotal = todayShopRecords
        .filter(isCompleted)
        .reduce(
          (sum, record) => sum + this.normalizeDonationAmountNok(record),
          0,
        );
      const filteredShopTotal = shopRecords
        .filter(isCompleted)
        .reduce(
          (sum, record) => sum + this.normalizeDonationAmountNok(record),
          0,
        );
      const pendingShopCount = shopRecords.filter(
        (record) => String(record.status || "").toLowerCase() === "pending",
      ).length;
      const unmatchedShopCount = shopRecords.filter(
        (record) => !record.userId,
      ).length;
      const shopDonors = this.buildDonorSummaries(shopRecords);

      // Render shop stats
      const shopTotalAmountEl = document.getElementById("shop-total-amount");
      const shopTotalCountEl = document.getElementById("shop-total-count");
      const shopAverageAmountEl = document.getElementById(
        "shop-average-amount",
      );
      const shopTodayAmountEl = document.getElementById("shop-today-amount");
      const shopTodayCountEl = document.getElementById("shop-today-count");
      const shopPeriodAmountEl = document.getElementById("shop-period-amount");
      const shopPeriodCountEl = document.getElementById("shop-period-count");
      const shopDonorCountEl = document.getElementById("shop-donor-count");
      const shopPendingCountEl = document.getElementById("shop-pending-count");
      const shopUnmatchedCountEl = document.getElementById(
        "shop-unmatched-count",
      );

      const filteredCompletedShopRecords = shopRecords.filter(isCompleted);
      const filteredShopAverage = filteredCompletedShopRecords.length
        ? filteredShopTotal / filteredCompletedShopRecords.length
        : 0;

      if (shopTotalAmountEl)
        shopTotalAmountEl.textContent =
          this.formatDonationCurrency(filteredShopTotal);
      if (shopTotalCountEl)
        shopTotalCountEl.textContent =
          shopRecords.length.toLocaleString("no-NO");
      if (shopAverageAmountEl)
        shopAverageAmountEl.textContent =
          this.formatDonationCurrency(filteredShopAverage);
      if (shopTodayAmountEl)
        shopTodayAmountEl.textContent =
          this.formatDonationCurrency(todayShopTotal);
      if (shopTodayCountEl)
        shopTodayCountEl.textContent = `${todayShopRecords.length} registrert i dag`;
      if (shopPeriodAmountEl)
        shopPeriodAmountEl.textContent =
          this.formatDonationCurrency(filteredShopTotal);
      if (shopPeriodCountEl)
        shopPeriodCountEl.textContent = `${shopRecords.length} transaksjoner i valgt periode`;
      if (shopDonorCountEl)
        shopDonorCountEl.textContent =
          shopDonors.length.toLocaleString("no-NO");
      if (shopPendingCountEl)
        shopPendingCountEl.textContent = `${pendingShopCount} venter`;
      if (shopUnmatchedCountEl)
        shopUnmatchedCountEl.textContent = `${unmatchedShopCount} uten profilkobling`;

      // Render shop transactions table
      const shopTransactionsBody = document.getElementById(
        "shop-transactions-body",
      );
      if (shopTransactionsBody) {
        const visibleShopRecords = shopRecords.slice(0, 100);
        shopTransactionsBody.innerHTML = visibleShopRecords.length
          ? visibleShopRecords
              .map((record) => {
                const date = this.getDonationDate(record);
                const name = this.escapeHtml(
                  this.getDonationDonorName(record, userMap),
                );
                const email = this.escapeHtml(
                  this.getDonationDonorEmail(record, userMap) || "Ingen e-post",
                );
                const reference = this.escapeHtml(
                  record.transactionId ||
                    record.reference ||
                    record.id ||
                    "Ingen referanse",
                );
                const amount = this.formatDonationCurrency(
                  this.normalizeDonationAmountNok(record),
                );
                const method = this.escapeHtml(
                  this.getDonationMethodLabel(record.method),
                );

                const profileStatus = record.userId
                  ? `<button type="button" class="btn-link-profile link-connected" data-id="${record.id}" data-userid="${record.userId}" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; padding:4px 10px; border-radius:9999px; font-size:12px; font-weight:700; line-height:12px !important; box-shadow:0 1px 2px rgba(16,185,129,0.05); cursor:pointer; font-family:inherit;">
                        <span class="material-symbols-outlined" style="font-size:14px; font-weight:900; color:#10b981; line-height:1 !important; display:inline-flex !important; align-items:center; justify-content:center; width:14px; height:14px; margin:0 !important; padding:0 !important;">link</span>
                        Koblet
                       </button>`
                  : `<button type="button" class="btn-link-profile link-unconnected" data-id="${record.id}" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; background:#fff7ed; color:#b45309; border:1px solid #ffedd5; padding:4px 10px; border-radius:9999px; font-size:12px; font-weight:700; line-height:12px !important; box-shadow:0 1px 2px rgba(245,158,11,0.05); cursor:pointer; font-family:inherit;">
                        <span class="material-symbols-outlined" style="font-size:14px; font-weight:900; color:#f59e0b; line-height:1 !important; display:inline-flex !important; align-items:center; justify-content:center; width:14px; height:14px; margin:0 !important; padding:0 !important;">link_off</span>
                        Ukoblet
                       </button>`;
                const productCell = record.productName
                  ? `<span style="font-size:12px; color:#1B4965; font-weight:600; display:block; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${this.escapeHtml(record.productName)}">${this.escapeHtml(record.productName)}</span>`
                  : `<span style="font-size:12px; color:#94a3b8;">—</span>`;
                return `
                    <tr>
                        <td style="white-space: nowrap;">${date ? date.toLocaleString("no-NO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Ukjent dato"}</td>
                        <td style="white-space: nowrap;">
                            <strong>${name}</strong>
                            <div style="font-size:12px;color:#64748b;">${email}</div>
                        </td>
                        <td><span class="method-tag">${method}</span></td>
                        <td>${productCell}</td>
                        <td><span class="method-tag">${reference}</span></td>
                        <td>${profileStatus}</td>
                        <td class="text-right"><strong>${amount}</strong></td>
                        <td class="text-right" style="width:1px; white-space:nowrap; padding-left:0;">
                            <div style="display:inline-flex; gap:4px;">
                                <button type="button" class="action-btn edit-sale-btn" data-id="${record.id}" title="Rediger salg" style="color: #1B4965; background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background 0.2s;">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">edit</span>
                                </button>
                                <button type="button" class="action-btn delete-donation-btn" data-id="${record.id}" title="Slett salg" style="color: #ef4444; background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: background 0.2s;">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
              })
              .join("")
          : `
                <tr><td colspan="8" style="padding:28px;text-align:center;color:#64748b;">Ingen salg matcher filteret.</td></tr>
            `;

        // Bind click events to delete buttons
        shopTransactionsBody
          .querySelectorAll(".delete-donation-btn")
          .forEach((btn) => {
            btn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const donationId = btn.dataset.id;
              await this.deleteDonation(donationId);
            });
          });

        // Bind click events to edit buttons
        shopTransactionsBody
          .querySelectorAll(".edit-sale-btn")
          .forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              this.openEditSaleModal(btn.dataset.id);
            });
          });

        // Bind click events to link buttons
        shopTransactionsBody
          .querySelectorAll(".btn-link-profile")
          .forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const donationId = btn.dataset.id;
              const currentUserId = btn.dataset.userid || "";
              this.openLinkProfileModal(donationId, currentUserId);
            });
          });
      }

      // 3. Render donors tab
      const donorsBody = document.getElementById("donation-donors-body");
      if (donorsBody) {
        const donorRecords = this.getFilteredDonorRecords();
        const donors = this.buildDonorSummaries(donorRecords);
        const sortBy = this.donationFilters?.donorSortBy || "latestDate";
        const sortDir = this.donationFilters?.donorSortDir || "desc";

        // Update table header sort UI
        document.querySelectorAll(".sortable-header").forEach((header) => {
          const field = header.dataset.sort;
          const icon = header.querySelector(".sort-icon");
          if (icon) {
            if (field === sortBy) {
              icon.style.display = "inline-flex";
              icon.textContent =
                sortDir === "asc" ? "arrow_upward" : "arrow_downward";
              icon.style.color = "#d17d39"; // Orange theme accent color
            } else {
              icon.style.display = "none";
            }
          }
        });

        donors.sort((a, b) => {
          let comp = 0;
          if (sortBy === "total") {
            comp = a.total - b.total || a.giftCount - b.giftCount;
          } else if (sortBy === "totalGifts") {
            comp = a.totalGifts - b.totalGifts || a.giftCount - b.giftCount;
          } else if (sortBy === "totalShop") {
            comp = a.totalShop - b.totalShop || a.giftCount - b.giftCount;
          } else if (sortBy === "giftCount") {
            comp = a.giftCount - b.giftCount || a.total - b.total;
          } else if (sortBy === "name") {
            comp = String(a.name || "").localeCompare(
              String(b.name || ""),
              "no",
            );
          } else {
            const aTime = a.latestDate?.getTime() || 0;
            const bTime = b.latestDate?.getTime() || 0;
            comp = aTime - bTime;
          }
          return sortDir === "desc" ? -comp : comp;
        });

        const query = String(this.donationFilters?.donorQuery || "")
          .trim()
          .toLowerCase();
        const visibleDonors = donors
          .filter(
            (donor) =>
              !query ||
              [donor.name, donor.email, donor.userId]
                .join(" ")
                .toLowerCase()
                .includes(query),
          )
          .slice(0, 100);

        donorsBody.innerHTML = visibleDonors.length
          ? visibleDonors
              .map((donor) => {
                const methodList = Array.from(donor.methods).map((m) =>
                  this.getDonationMethodLabel(m),
                );
                if (donor.types && donor.types.has("butikk")) {
                  methodList.push("Butikk");
                }
                const methodText = methodList.join(", ") || "Ukjent";

                const mainName = donor.name || "Ukjent giver";
                const otherNames = Array.from(donor.names).filter(
                  (n) => n !== mainName,
                );
                const otherNamesStr =
                  otherNames.length > 0
                    ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">Også registrert som: ${otherNames.map((n) => this.escapeHtml(n)).join(", ")}</div>`
                    : "";

                return `
                    <tr>
                        <td style="white-space: nowrap;">
                            <strong>${this.escapeHtml(mainName)}</strong>
                            ${otherNamesStr}
                            <div style="font-size:12px;color:#64748b;">${this.escapeHtml(donor.email || "Ingen e-post")}</div>
                        </td>
                        <td>${donor.completedCount} / ${donor.giftCount}</td>
                        <td>${this.escapeHtml(methodText)}</td>
                        <td>${donor.latestDate ? donor.latestDate.toLocaleDateString("no-NO") : "Ukjent"}</td>
                        <td>${
                          donor.userId
                            ? `<button type="button" class="btn-link-donor-profile link-connected" data-key="${this.escapeHtml(donor.key)}" data-userid="${this.escapeHtml(donor.userId)}" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; padding:4px 10px; border-radius:9999px; font-size:12px; font-weight:700; line-height:12px !important; box-shadow:0 1px 2px rgba(16,185,129,0.05); cursor:pointer; font-family:inherit;">
                                <span class="material-symbols-outlined" style="font-size:14px; font-weight:900; color:#10b981; line-height:1 !important; display:inline-flex !important; align-items:center; justify-content:center; width:14px; height:14px; margin:0 !important; padding:0 !important;">link</span>
                                Koblet
                               </button>`
                            : `<button type="button" class="btn-link-donor-profile link-unconnected" data-key="${this.escapeHtml(donor.key)}" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; background:#fff7ed; color:#b45309; border:1px solid #ffedd5; padding:4px 10px; border-radius:9999px; font-size:12px; font-weight:700; line-height:12px !important; box-shadow:0 1px 2px rgba(245,158,11,0.05); cursor:pointer; font-family:inherit;">
                                <span class="material-symbols-outlined" style="font-size:14px; font-weight:900; color:#f59e0b; line-height:1 !important; display:inline-flex !important; align-items:center; justify-content:center; width:14px; height:14px; margin:0 !important; padding:0 !important;">link_off</span>
                                Ukoblet
                               </button>`
                        }</td>
                        <td class="text-right"><strong>${this.formatDonationCurrency(donor.totalGifts)}</strong></td>
                        <td class="text-right"><strong>${this.formatDonationCurrency(donor.totalShop)}</strong></td>
                        <td class="text-right" style="text-align:right; width:1px; white-space:nowrap;">
                            <button type="button" class="action-btn view-donor-details-btn" data-key="${this.escapeHtml(donor.key)}" title="Vis historikk" style="color:#1B4965; background:none; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:4px; border-radius:4px; transition:background 0.2s;">
                                <span class="material-symbols-outlined" style="font-size:20px;">visibility</span>
                            </button>
                        </td>
                    </tr>
                `;
              })
              .join("")
          : `
                <tr><td colspan="8" style="padding:28px;text-align:center;color:#64748b;">Ingen givere matcher søket.</td></tr>
            `;

        // Bind click events to details buttons
        donorsBody
          .querySelectorAll(".view-donor-details-btn")
          .forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const donorKey = btn.dataset.key;
              this.openDonorDetailsModal(donorKey);
            });
          });

        // Bind click events to link buttons in donors tab
        donorsBody
          .querySelectorAll(".btn-link-donor-profile")
          .forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const donorKey = btn.dataset.key;
              const userId = btn.dataset.userid || "";
              const donations = this.getDonationsForDonor(donorKey);
              if (donations.length > 0) {
                this.openLinkProfileModal(donations[0].id, userId);
              } else {
                this.showToast(
                  "Ingen gaver funnet for denne giveren.",
                  "error",
                  4000,
                );
              }
            });
          });
      }
    },

    async updateDonationUserLink(donationId, userId) {
      await this.updateMultipleDonationsUserLink([donationId], userId);
    },

    async updateMultipleDonationsUserLink(donationIds, userId) {
      const loadingToast = this.showToast(
        "Oppdaterer kobling...",
        "info",
        10000,
      );
      try {
        const db = firebaseService.db;
        const batch = db.batch();

        const updates = {
          userId: userId || null,
          matchMethod: userId ? "manual_admin_linked" : "manual_admin_unlinked",
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        donationIds.forEach((id) => {
          const docRef = db.collection("donations").doc(id);
          batch.update(docRef, updates);
        });

        await batch.commit();

        if (this.allDonationRecords) {
          donationIds.forEach((id) => {
            const rec = this.allDonationRecords.find((r) => r.id === id);
            if (rec) {
              rec.userId = userId || null;
              rec.matchMethod = updates.matchMethod;
            }
          });
        }

        if (loadingToast && typeof loadingToast.dismiss === "function")
          loadingToast.dismiss();
        this.showToast(
          `${donationIds.length} gavekobling(er) oppdatert!`,
          "success",
          3000,
        );
        this.renderDonationAdminViews();
      } catch (error) {
        console.error("Kunne ikke oppdatere koblinger:", error);
        if (loadingToast && typeof loadingToast.dismiss === "function")
          loadingToast.dismiss();
        this.showToast(
          "Kunne ikke oppdatere koblinger: " + error.message,
          "danger",
          5000,
        );
      }
    },

    getDonationsForDonor(donorKey) {
      const userMap = this.adminUserMap || new Map();
      const records = Array.isArray(this.allDonationRecords)
        ? this.allDonationRecords
        : [];
      return records
        .filter((record) => {
          const email = this.getDonationDonorEmail(record, userMap);
          const name = this.getDonationDonorName(record, userMap);

          let key = record.userId;
          if (!key && email) {
            key = email;
          }
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
          if (!key) {
            key = record.id;
          }
          return key === donorKey;
        })
        .sort((a, b) => {
          const aDate = this.getDonationDate(a)?.getTime?.() || 0;
          const bDate = this.getDonationDate(b)?.getTime?.() || 0;
          return bDate - aDate;
        });
    },

    async openManualDonationModal() {
      const modal = document.getElementById("manual-donation-modal");
      if (!modal) return;

      const now = new Date();
      const pad = (value) => String(value).padStart(2, "0");
      const localDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const form = document.getElementById("manual-donation-form");
      if (form) form.reset();
      const dateInput = document.getElementById("manual-donation-date");
      if (dateInput) dateInput.value = localDateTime;
      const statusInput = document.getElementById("manual-donation-status");
      if (statusInput) statusInput.value = "completed";
      const methodInput = document.getElementById("manual-donation-method");
      if (methodInput) methodInput.value = "bank";
      if (!modal.open) modal.showModal();
      const run = (this._manualDonationLoadGeneration =
        (this._manualDonationLoadGeneration || 0) + 1);
      const fund = document.getElementById("manual-donation-fund");
      const save = document.getElementById("save-manual-donation-btn");
      const hint = document.getElementById("manual-donation-fund-hint");
      fund.disabled = true;
      save.disabled = true;
      fund.replaceChildren(new Option("Henter innsamlingsaksjoner …", ""));
      try {
        const data = await firebaseService.getPageContent("collection_causes");
        if (run !== this._manualDonationLoadGeneration) return;
        if (!data || !Array.isArray(data.items))
          throw new Error("Kunne ikke hente aksjonene");
        fund.replaceChildren(
          new Option("Generell gave (ingen aksjon)", "general"),
        );
        data.items
          .filter(
            (cause) =>
              /^[a-z0-9][a-z0-9_-]{0,119}$/i.test(cause.id || "") &&
              cause.status !== "draft",
          )
          .forEach((cause) =>
            fund.append(new Option(cause.title || cause.id, cause.id)),
          );
        hint.textContent =
          "Fullførte gaver regnes med på den valgte aksjonen. Givers e-post eller bruker brukes for å telle unike givere.";
        fund.disabled = false;
        save.disabled = false;
      } catch (error) {
        if (run !== this._manualDonationLoadGeneration) return;
        hint.textContent =
          "Kunne ikke hente innsamlingsaksjoner. Lukk skjemaet og prøv igjen før du registrerer gaven.";
        this.showToast("Kunne ikke hente innsamlingsaksjoner.", "error");
      }
    },

    closeManualDonationModal() {
      this._manualDonationLoadGeneration =
        (this._manualDonationLoadGeneration || 0) + 1;
      const modal = document.getElementById("manual-donation-modal");
      if (modal?.open) modal.close();
    },

    handleManualDonationUserSelect(userId) {
      const user = userId ? this.adminUserMap?.get(userId) : null;
      const nameInput = document.getElementById("manual-donor-name");
      const emailInput = document.getElementById("manual-donor-email");
      if (!user) return;

      if (nameInput) {
        nameInput.value =
          user.displayName ||
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.email ||
          "";
      }
      if (emailInput) emailInput.value = user.email || "";
    },

    async saveManualDonation() {
      const saveBtn = document.getElementById("save-manual-donation-btn");
      const getValue = (id) => document.getElementById(id)?.value?.trim() || "";
      const fundInput = document.getElementById("manual-donation-fund");
      if (fundInput.disabled || !fundInput.value) {
        this.showToast("Vent til innsamlingsaksjonene er lastet.", "warning");
        return;
      }
      const fund = fundInput.value;
      const amountNok = Number(
        getValue("manual-donation-amount").replace(",", "."),
      );
      const selectedUserId = getValue("manual-donation-user");
      const donorName = getValue("manual-donor-name");
      const donorEmail = getValue("manual-donor-email").toLowerCase();
      const method = getValue("manual-donation-method") || "manual";
      const status = getValue("manual-donation-status") || "completed";
      const dateValue = getValue("manual-donation-date");
      const note = getValue("manual-donation-note");
      const reference = getValue("manual-donation-reference");
      const selectedUser = selectedUserId
        ? this.adminUserMap?.get(selectedUserId)
        : null;
      const resolvedUserId = selectedUserId || "";
      const resolvedName =
        donorName ||
        selectedUser?.displayName ||
        selectedUser?.fullName ||
        selectedUser?.email ||
        "Ukjent giver";
      const resolvedEmail = donorEmail || selectedUser?.email || "";

      if (!Number.isFinite(amountNok) || amountNok <= 0) {
        this.showToast("Skriv inn et gyldig beløp.", "warning", 3500);
        return;
      }

      if (!resolvedName && !resolvedEmail) {
        this.showToast(
          "Velg en bruker eller skriv inn navn/e-post for giveren.",
          "warning",
          3500,
        );
        return;
      }

      const donationDate = dateValue ? new Date(dateValue) : new Date();
      if (Number.isNaN(donationDate.getTime())) {
        this.showToast("Datoen er ikke gyldig.", "warning", 3500);
        return;
      }

      await this._runWriteLocked("manual-donation:create", async () =>
        this._withButtonLoading(
          saveBtn,
          async () => {
            const docRef = firebaseService.db.collection("donations").doc();
            const docId = docRef.id;
            const timestamp =
              firebase.firestore.Timestamp.fromDate(donationDate);
            const amountOre = Math.round(amountNok * 100);
            const currentAdmin = firebase.auth().currentUser;
            const payload = {
              transactionId: docId,
              manualDonationId: docId,
              amount: amountNok,
              amountNok,
              amountOre,
              currency: "NOK",
              method,
              status,
              timestamp,
              completedAt: ["completed", "succeeded", "captured"].includes(
                String(status).toLowerCase(),
              )
                ? timestamp
                : null,
              userId: resolvedUserId || null,
              donorName: resolvedName,
              donorEmail: resolvedEmail || "Ukjent",
              message: note,
              reference,
              type: "Gave",
              source: "manual_admin",
              fund,
              matchMethod: resolvedUserId
                ? "manual_user_select"
                : "manual_unmatched",
              registeredBy: currentAdmin?.uid || null,
              registeredByEmail: currentAdmin?.email || "",
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            await docRef.set(payload);

            this.allDonationRecords = [
              {
                id: docId,
                ...payload,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              ...(this.allDonationRecords || []),
            ].sort((a, b) => {
              const aDate = this.getDonationDate(a)?.getTime?.() || 0;
              const bDate = this.getDonationDate(b)?.getTime?.() || 0;
              return bDate - aDate;
            });

            this.closeManualDonationModal();
            this.renderDonationAdminViews();
            this.showToast("Gaven er registrert.", "success", 4000);
          },
          {
            loadingText: "Lagrer...",
          },
        ),
      );
    },

    async deleteDonation(donationId) {
      if (!donationId) return false;
      const confirmed = await this.showConfirm(
        "Slett gave",
        "Er du sikker på at du vil slette denne gaven? Dette vil fjerne gaven permanent fra databasen.",
        "Slett",
      );
      if (!confirmed) return false;
      try {
        await firebaseService.db
          .collection("donations")
          .doc(donationId)
          .delete();
        this.allDonationRecords = (this.allDonationRecords || []).filter(
          (r) => r.id !== donationId,
        );
        this.renderDonationAdminViews();
        this.showToast("Gaven ble slettet permanent.", "success", 4000);
        return true;
      } catch (e) {
        console.error("Kunne ikke slette gave:", e);
        this.showToast("Kunne ikke slette gaven: " + e.message, "error", 5000);
        return false;
      }
    },

    async seedInKindDonationsIfEmpty() {
      // Disabled mock seeding to ensure statistics are 100% real
      return;
    },

    async renderInKindDonations() {
      const container = document.getElementById("inkind-donations-container");
      if (!container) return;

      container.innerHTML = `
            <div style="display:flex; justify-content:center; padding:32px;">
                <div class="loader">Laster fysiske gaver...</div>
            </div>
        `;

      await this.seedInKindDonationsIfEmpty();

      const allRecords = Array.isArray(this.allDonationRecords)
        ? this.allDonationRecords
        : [];
      let inKindDonations = allRecords.filter((r) => r.isInKind);

      inKindDonations.sort((a, b) => {
        let comp = 0;
        if (this.inkindSortField === "date") {
          const aDate = this.getDonationDate(a)?.getTime?.() || 0;
          const bDate = this.getDonationDate(b)?.getTime?.() || 0;
          comp = aDate - bDate;
        } else if (this.inkindSortField === "description") {
          comp = (a.description || "").localeCompare(b.description || "", "no");
        } else if (this.inkindSortField === "giver") {
          comp = (a.donorName || "").localeCompare(b.donorName || "", "no");
        } else if (this.inkindSortField === "fund") {
          comp = (a.fund || "").localeCompare(b.fund || "", "no");
        } else if (this.inkindSortField === "acknowledgment") {
          comp =
            (a.acknowledgmentSent ? 1 : 0) - (b.acknowledgmentSent ? 1 : 0);
        } else if (this.inkindSortField === "value") {
          comp = (a.amount || 0) - (b.amount || 0);
        }
        return this.inkindSortDir === "desc" ? -comp : comp;
      });

      const filters = this.donationFilters || {};
      const { start, end } = this.buildDonationDateRange(
        filters.preset || "30",
        filters.start || "",
        filters.end || "",
      );

      let filteredInKind = inKindDonations;
      if (start || end) {
        filteredInKind = inKindDonations.filter((r) => {
          const d = this.getDonationDate(r);
          if (start && (!d || d < start)) return false;
          if (end && (!d || d > end)) return false;
          return true;
        });
      }

      const inKindCount = filteredInKind.length;
      const userMap = this.adminUserMap || new Map();

      const tableRows = filteredInKind
        .map((record) => {
          const date = this.getDonationDate(record);
          const dateStr = date
            ? `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
            : "Ukjent";
          const name = this.escapeHtml(record.donorName || "Ukjent");

          const isLinked = !!record.userId;
          const donorCell = isLinked
            ? `<span style="display:inline-flex; align-items:center; gap:6px;">${name} <span class="material-symbols-outlined" style="font-size:16px; color:#1B4965; vertical-align:middle; cursor:pointer;" title="Koblet til profil">link</span></span>`
            : name;

          const fund = String(record.fund || "general").toLowerCase();
          let fundBadge = "";
          if (fund === "new-building") {
            fundBadge = `<span style="background: #ffedd5; color: #d97706; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 13px; text-transform: lowercase;">new-building</span>`;
          } else if (
            fund === "domestic-missions-sandnes" ||
            fund.includes("domestic")
          ) {
            fundBadge = `<span style="background: #d1fae5; color: #059669; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 13px; text-transform: lowercase;">domestic-missions-san...</span>`;
          } else {
            fundBadge = `<span style="background: #e2e8f0; color: #475569; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 13px; text-transform: lowercase;">general</span>`;
          }

          const ackSent = record.acknowledgmentSent
            ? `<span class="material-symbols-outlined" style="font-size:20px; color:#475569; font-weight:bold;">check</span>`
            : "";

          let valueStr = "";
          if (record.amount) {
            valueStr = record.amount.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            });
          }

          return `
                <tr>
                    <td>${dateStr}</td>
                    <td>${this.escapeHtml(record.description || "")}</td>
                    <td>${donorCell}</td>
                    <td>${fundBadge}</td>
                    <td class="text-center" style="text-align:center;">${ackSent}</td>
                    <td class="text-right" style="text-align:right; font-weight:600; color:#334155;">${valueStr}</td>
                    <td class="text-right" style="text-align:right; width:1px; white-space:nowrap;">
                        <button type="button" class="action-btn delete-inkind-btn" data-id="${record.id}" title="Slett fysisk gave" style="color:#ef4444; background:none; border:none; cursor:pointer;">
                            <span class="material-symbols-outlined" style="font-size:20px;">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");

      const tableBodyHtml =
        tableRows ||
        `<tr><td colspan="7" style="padding:28px;text-align:center;color:#64748b;">Ingen fysiske gaver registrert i denne perioden.</td></tr>`;

      container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px; padding-top:8px;">
                <h3 style="margin:0; font-size:24px; font-weight:700; color:#0f172a;">${inKindCount} fysiske gaver</h3>
                <button type="button" class="btn-primary" id="add-manual-inkind-btn" style="display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600;">
                    <span class="material-symbols-outlined" style="font-size:20px;">volunteer_activism</span>
                    Registrer fysisk gave
                </button>
            </div>
            
            <div class="card" style="margin-bottom:24px; overflow:hidden;">
                <div style="overflow-x:auto;">
                    <table class="data-table" style="width:100%;">
                        <thead>
                            <tr>
                                <th>Mottatt dato</th>
                                <th>Beskrivelse</th>
                                <th>Giver</th>
                                <th>Formål</th>
                                <th style="text-align:center;">Mottaksbekreftelse sendt</th>
                                <th style="text-align:right;">Antatt verdi (USD)</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="inkind-transactions-body">
                            ${tableBodyHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

      document
        .getElementById("add-manual-inkind-btn")
        ?.addEventListener("click", () => this.openManualInKindModal());

      const table = document
        .getElementById("inkind-transactions-body")
        ?.closest("table");
      if (table) {
        const headers = table.querySelectorAll("thead th");
        const fields = [
          "date",
          "description",
          "giver",
          "fund",
          "acknowledgment",
          "value",
        ];
        headers.forEach((header, index) => {
          const field = fields[index];
          if (field) {
            header.style.cursor = "pointer";
            header.style.userSelect = "none";
            header.style.position = "relative";

            if (!header.dataset.sortBound) {
              header.dataset.sortBound = "true";
              header.addEventListener("mouseover", () => {
                header.style.backgroundColor = "#f1f5f9";
                header.style.color = "#1b4965";
              });
              header.addEventListener("mouseout", () => {
                header.style.backgroundColor = "";
                header.style.color = "";
              });
              header.addEventListener("click", () => {
                if (this.inkindSortField === field) {
                  this.inkindSortDir =
                    this.inkindSortDir === "asc" ? "desc" : "asc";
                } else {
                  this.inkindSortField = field;
                  this.inkindSortDir =
                    field === "date" || field === "value" ? "desc" : "asc";
                }
                this.renderInKindDonations();
              });
            }

            // Add/update sort indicator
            let wrapper = header.querySelector(".sort-header-wrapper");
            if (!wrapper) {
              wrapper = document.createElement("div");
              wrapper.className = "sort-header-wrapper";
              wrapper.style.display = "inline-flex";
              wrapper.style.alignItems = "center";
              wrapper.style.gap = "6px";
              wrapper.style.verticalAlign = "middle";
              if (
                header.style.textAlign === "right" ||
                header.classList.contains("text-right")
              ) {
                wrapper.style.width = "100%";
                wrapper.style.justifyContent = "flex-end";
              }
              while (header.firstChild) {
                wrapper.appendChild(header.firstChild);
              }
              header.appendChild(wrapper);
            }

            let icon = wrapper.querySelector(".sort-icon");
            if (!icon) {
              icon = document.createElement("span");
              icon.className = "material-symbols-outlined sort-icon";
              icon.style.fontSize = "14px";
              icon.style.lineHeight = "1";
              icon.style.flexShrink = "0";
              icon.style.display = "inline-flex";
              icon.style.alignItems = "center";
              icon.style.position = "relative";
              icon.style.top = "-1px";
              wrapper.appendChild(icon);
            }

            if (field === this.inkindSortField) {
              icon.style.display = "inline-flex";
              icon.textContent =
                this.inkindSortDir === "asc"
                  ? "arrow_upward"
                  : "arrow_downward";
              icon.style.color = "#d17d39";
            } else {
              icon.style.display = "none";
            }
          }
        });
      }

      container.querySelectorAll(".delete-inkind-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const donationId = btn.dataset.id;
          await this.deleteInKindDonation(donationId);
        });
      });
    },

    openManualInKindModal() {
      const modal = document.getElementById("manual-inkind-modal");
      if (!modal) return;
      const form = document.getElementById("manual-inkind-form");
      if (form) form.reset();
      if (!modal.open) modal.showModal();
    },

    closeManualInKindModal() {
      const modal = document.getElementById("manual-inkind-modal");
      if (modal?.open) modal.close();
    },

    handleManualInKindUserSelect(userId) {
      const user = userId ? this.adminUserMap?.get(userId) : null;
      const nameInput = document.getElementById("manual-inkind-donor-name");
      const emailInput = document.getElementById("manual-inkind-donor-email");
      if (!user) return;

      if (nameInput) {
        nameInput.value =
          user.displayName ||
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.email ||
          "";
      }
      if (emailInput) emailInput.value = user.email || "";
    },

    async saveManualInKind() {
      const saveBtn = document.getElementById("save-manual-inkind-btn");
      const getValue = (id) => document.getElementById(id)?.value?.trim() || "";
      const selectedUserId = getValue("manual-inkind-user");
      const donorName = getValue("manual-inkind-donor-name");
      const donorEmail = getValue("manual-inkind-donor-email").toLowerCase();
      const desc = getValue("manual-inkind-desc");
      const dateValue = getValue("manual-inkind-date");
      const fund = getValue("manual-inkind-fund") || "general";
      const valueUsd = Number(getValue("manual-inkind-value")) || null;
      const ackSent =
        document.getElementById("manual-inkind-ack")?.checked || false;

      const selectedUser = selectedUserId
        ? this.adminUserMap?.get(selectedUserId)
        : null;
      const resolvedUserId = selectedUserId || "";
      const resolvedName =
        donorName ||
        selectedUser?.displayName ||
        selectedUser?.fullName ||
        selectedUser?.email ||
        "Ukjent giver";
      const resolvedEmail = donorEmail || selectedUser?.email || "";

      if (!desc) {
        this.showToast(
          "Skriv inn en beskrivelse av den fysiske gaven.",
          "warning",
          3500,
        );
        return;
      }

      const donationDate = dateValue ? new Date(dateValue) : new Date();
      if (Number.isNaN(donationDate.getTime())) {
        this.showToast("Datoen er ikke gyldig.", "warning", 3500);
        return;
      }

      await this._runWriteLocked("manual-inkind:create", async () =>
        this._withButtonLoading(
          saveBtn,
          async () => {
            const docRef = firebaseService.db.collection("donations").doc();
            const docId = docRef.id;
            const timestamp =
              firebase.firestore.Timestamp.fromDate(donationDate);
            const currentAdmin = firebase.auth().currentUser;
            const payload = {
              transactionId: docId,
              paymentIntentId: docId,
              manualDonationId: docId,
              amount: valueUsd || 0,
              amountNok: valueUsd || 0,
              amountOre: (valueUsd || 0) * 100,
              currency: "USD",
              method: "in_kind",
              status: "completed",
              timestamp,
              completedAt: timestamp,
              userId: resolvedUserId || null,
              donorName: resolvedName,
              donorEmail: resolvedEmail || "Ukjent",
              description: desc,
              fund,
              acknowledgmentSent: ackSent,
              isInKind: true,
              type: "Gave",
              source: "manual_admin",
              registeredBy: currentAdmin?.uid || null,
              registeredByEmail: currentAdmin?.email || "",
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            await docRef.set(payload);

            const newRecord = {
              id: docId,
              ...payload,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            this.allDonationRecords = [
              newRecord,
              ...(this.allDonationRecords || []),
            ].sort((a, b) => {
              const aDate = this.getDonationDate(a)?.getTime?.() || 0;
              const bDate = this.getDonationDate(b)?.getTime?.() || 0;
              return bDate - aDate;
            });

            this.closeManualInKindModal();
            await this.renderInKindDonations();
            this.showToast("Den fysiske gaven er registrert.", "success", 4000);
          },
          {
            loadingText: "Lagrer...",
          },
        ),
      );
    },

    async deleteInKindDonation(donationId) {
      if (!donationId) return false;
      const confirmed = await this.showConfirm(
        "Slett fysisk gave",
        "Er du sikker på at du vil slette denne fysiske gaven? Dette vil fjerne gaven permanent fra databasen.",
        "Slett",
      );
      if (!confirmed) return false;
      try {
        await firebaseService.db
          .collection("donations")
          .doc(donationId)
          .delete();
        this.allDonationRecords = (this.allDonationRecords || []).filter(
          (r) => r.id !== donationId,
        );
        await this.renderInKindDonations();
        this.showToast(
          "Den fysiske gaven ble slettet permanent.",
          "success",
          4000,
        );
        return true;
      } catch (e) {
        console.error("Kunne ikke slette fysisk gave:", e);
        this.showToast(
          "Kunne ikke slette den fysiske gaven: " + e.message,
          "error",
          5000,
        );
        return false;
      }
    },

    determineBankDonationType(row) {
      const category = String(row.category || "")
        .trim()
        .toLowerCase();
      if (category === "butikk") return "Butikk";

      const message = String(row.text || row.description || "").toLowerCase();
      const keywords = [
        "plakat",
        "plakater",
        "klistermerke",
        "klistermerker",
        "butikk",
      ];
      if (keywords.some((word) => message.includes(word))) {
        return "Butikk";
      }
      return "Gave";
    },

    isLikelyDuplicateBankDonation(row) {
      const rowRef = String(row.reference || "")
        .trim()
        .toLowerCase();
      const rowDate =
        row.date instanceof Date ? row.date : this.parseBankDate(row.date);
      const rowAmount = Number(row.amountNok || 0);
      return (this.allDonationRecords || []).some((record) => {
        const recordAmount = this.normalizeDonationAmountNok(record);
        if (Math.abs(recordAmount - rowAmount) > 0.01) return false;

        const recordRef = String(record.reference || record.transactionId || "")
          .trim()
          .toLowerCase();
        if (rowRef && recordRef && rowRef === recordRef) return true;

        const recordDate = this.getDonationDate(record);
        if (!rowDate || !recordDate) return false;
        const sameDay = rowDate.toDateString() === recordDate.toDateString();
        const sameText =
          row.text &&
          record.message &&
          String(record.message).toLowerCase() ===
            String(row.text).toLowerCase();
        return sameDay && sameText;
      });
    },
  };
}
