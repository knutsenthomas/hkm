// donor records methods for AdminManager.
export function createDonorRecordsMethods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    getFilteredDonorRecords() {
      const records = Array.isArray(this.allDonationRecords)
        ? this.allDonationRecords
        : [];
      const filters = this.donationFilters || {};
      const { start, end } = this.buildDonationDateRange(
        filters.preset || "30",
        filters.start || "",
        filters.end || "",
      );
      const status = String(filters.status || "all").toLowerCase();
      const method = String(filters.method || "all").toLowerCase();
      const type = String(filters.type || "all").toLowerCase();

      return records.filter((record) => {
        if (record.isInKind) return false;

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

        return true;
      });
    },

    buildDonorSummaries(records) {
      const userMap = this.adminUserMap || new Map();
      const donors = new Map();

      records.forEach((record) => {
        const email = this.getDonationDonorEmail(record, userMap);
        const name = this.getDonationDonorName(record, userMap);

        let key = record.userId;
        if (!key && email) {
          const matchedUser = Array.from(userMap.values()).find(
            (u) =>
              u.email &&
              u.email.trim().toLowerCase() === email.trim().toLowerCase(),
          );
          if (matchedUser) {
            key = matchedUser.id;
          } else {
            key = email;
          }
        }
        if (!key && name) {
          const cleanName = name.trim().toLowerCase();
          if (
            cleanName &&
            cleanName !== "ukjent" &&
            cleanName !== "unknown" &&
            cleanName !== "ukjent giver"
          ) {
            const matchedUser = Array.from(userMap.values()).find((u) => {
              const uName = String(u.displayName || u.fullName || u.name || "")
                .trim()
                .toLowerCase();
              return uName && uName === cleanName;
            });
            if (matchedUser) {
              key = matchedUser.id;
            } else {
              key = name.trim();
            }
          }
        }
        if (!key) {
          key = record.id;
        }

        const resolvedUserId =
          key &&
          !key.includes("@") &&
          !key.startsWith("bank-import-") &&
          key !== record.id
            ? key
            : "";

        const existing = donors.get(key) || {
          key,
          name,
          email,
          userId: record.userId || resolvedUserId,
          giftCount: 0,
          completedCount: 0,
          total: 0,
          totalGifts: 0,
          totalShop: 0,
          latestDate: null,
          methods: new Set(),
          types: new Set(),
          statuses: new Set(),
          names: new Set(),
        };

        const amount = this.normalizeDonationAmountNok(record);
        const date = this.getDonationDate(record);
        existing.giftCount += 1;
        if (
          ["completed", "succeeded", "captured"].includes(
            String(record.status || "").toLowerCase(),
          )
        ) {
          existing.completedCount += 1;
          existing.total += amount;
          const recType = String(record.type || "").toLowerCase();
          if (
            recType === "butikk" ||
            recType === "kurs" ||
            recType === "course" ||
            recType === "product"
          ) {
            existing.totalShop += amount;
          } else {
            existing.totalGifts += amount;
          }
        }
        if (date && (!existing.latestDate || date > existing.latestDate))
          existing.latestDate = date;
        if (record.method) existing.methods.add(String(record.method));
        if (record.type) existing.types.add(String(record.type).toLowerCase());
        if (record.status) existing.statuses.add(String(record.status));

        const recName = this.getDonationDonorName(record, userMap);
        if (
          recName &&
          recName !== "Ukjent giver" &&
          recName !== "ukjent" &&
          recName !== "unknown"
        ) {
          existing.names.add(recName);
        }

        donors.set(key, existing);
      });

      const sortBy = this.donationFilters?.donorSortBy || "latestDate";
      const sortDir = this.donationFilters?.donorSortDir || "desc";
      return Array.from(donors.values()).sort((a, b) => {
        let comp = 0;
        if (sortBy === "total") {
          comp = a.total - b.total || a.giftCount - b.giftCount;
        } else if (sortBy === "giftCount") {
          comp = a.giftCount - b.giftCount || a.total - b.total;
        } else if (sortBy === "name") {
          const aName = a.name || "";
          const bName = b.name || "";
          comp = aName.localeCompare(bName, "no");
        } else {
          const aTime = a.latestDate?.getTime() || 0;
          const bTime = b.latestDate?.getTime() || 0;
          comp = aTime - bTime;
        }
        return sortDir === "desc" ? -comp : comp;
      });
    },

    openLinkProfileModal(donationId, currentUserId) {
      let modal = document.getElementById("link-profile-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "link-profile-modal";
        modal.style.cssText =
          "display:none;position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;padding:24px;";
        document.body.appendChild(modal);
      }

      const donation = this.allDonationRecords?.find(
        (r) => r.id === donationId,
      );
      const userMap = this.adminUserMap || new Map();
      const donorName = donation
        ? this.getDonationDonorName(donation, userMap)
        : "";
      const donorEmail = donation
        ? this.getDonationDonorEmail(donation, userMap)
        : "";

      const otherUnlinkedDonations = donation
        ? (this.allDonationRecords || []).filter((r) => {
            if (r.id === donationId) return false;
            if (r.userId) return false;
            if (r.isInKind) return false;

            const rEmail = this.getDonationDonorEmail(r, userMap);
            if (donorEmail && rEmail === donorEmail) return true;

            const rName = this.getDonationDonorName(r, userMap);
            const cleanDonorName = donorName.trim().toLowerCase();
            const cleanRName = rName.trim().toLowerCase();
            if (
              cleanDonorName &&
              cleanDonorName !== "ukjent giver" &&
              cleanDonorName !== "ukjent" &&
              cleanDonorName !== "unknown" &&
              cleanRName === cleanDonorName
            ) {
              return true;
            }

            return false;
          })
        : [];

      let additionalGiftsHtml = "";
      if (otherUnlinkedDonations.length > 0) {
        const listItems = otherUnlinkedDonations
          .map((r) => {
            const amt = this.formatDonationCurrency(
              this.normalizeDonationAmountNok(r),
            );
            const date = this.getDonationDate(r);
            const dateStr = date
              ? date.toLocaleDateString("no-NO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Ukjent dato";
            const methodLabel = this.getDonationMethodLabel(r.method);
            return `
                    <label style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; font-size:0.875rem; color:#334155; transition:background 0.2s; user-select:none; line-height: 1.4;" class="additional-donation-checkbox-label">
                        <input type="checkbox" name="additionalDonationId" value="${this.escapeHtml(r.id)}" checked style="width:16px; height:16px; accent-color:#1B4965; cursor:pointer; margin:0;">
                        <div style="flex:1;">
                            <strong>${amt}</strong> (${methodLabel})
                            <div style="font-size:0.75rem; color:#64748b;">Dato: ${dateStr}</div>
                        </div>
                    </label>
                `;
          })
          .join("");

        additionalGiftsHtml = `
                <div class="form-group" style="margin-top:16px; border-top:1px solid #f1f5f9; padding-top:16px;">
                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">
                        Vi fant ${otherUnlinkedDonations.length} andre ukoblede gaver fra "${this.escapeHtml(donorName)}":
                    </label>
                    <div style="display:flex; flex-direction:column; gap:8px; max-height:180px; overflow-y:auto; padding-right:4px;">
                        ${listItems}
                    </div>
                    <p style="font-size:0.75rem; color:#64748b; margin:6px 0 0 0;">De valgte gavene vil også koble seg til denne brukerprofilen.</p>
                </div>
            `;
      }

      const userOptions = Array.from(this.adminUserMap?.values?.() || [])
        .slice()
        .sort((a, b) =>
          String(a.displayName || a.email || "").localeCompare(
            String(b.displayName || b.email || ""),
            "no",
          ),
        )
        .map((user) => {
          const label =
            user.displayName || user.fullName || user.email || user.id;
          const email = user.email ? ` (${user.email})` : "";
          const selected = user.id === currentUserId ? "selected" : "";
          return `<option value="${this.escapeHtml(user.id)}" ${selected}>${this.escapeHtml(label + email)}</option>`;
        })
        .join("");

      modal.innerHTML = `
            <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(8px);"></div>
            <div class="modal-content" style="max-width:500px;position:relative;background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);width:100%;overflow:hidden;animation: modalAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="modal-header" style="padding:20px 24px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:1.25rem; color:#0f172a; font-weight:700;">Koble gave til profil</h3>
                    <button class="modal-close" type="button" style="background:transparent; border:none; color:#64748b; cursor:pointer; padding:4px; display:flex; align-items:center; justify-content:center;">
                        <span class="material-symbols-outlined" style="font-size:24px;">close</span>
                    </button>
                </div>
                <div class="modal-body" style="padding:20px 24px; display:flex; flex-direction:column; gap:16px;">
                    <div class="form-group">
                        <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Velg brukerprofil</label>
                        <select id="link-profile-user-select" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none;">
                            <option value="">(Ukoblet / Ingen profil)</option>
                            ${userOptions}
                        </select>
                    </div>
                    ${additionalGiftsHtml}
                </div>
                <div class="modal-footer" style="padding:16px 24px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:12px;">
                    <button class="btn-secondary modal-cancel" type="button" style="padding:8px 16px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; font-weight:600;">Avbryt</button>
                    <button class="btn-primary modal-save" type="button" style="padding:8px 16px; border-radius:8px; background:#1B4965; color:#fff; border:none; cursor:pointer; font-weight:600;">Lagre kobling</button>
                </div>
            </div>
        `;

      modal.style.display = "flex";

      const closeModal = () => {
        modal.style.display = "none";
      };

      modal
        .querySelector(".modal-backdrop")
        .addEventListener("click", closeModal);
      modal.querySelector(".modal-close").addEventListener("click", closeModal);
      modal
        .querySelector(".modal-cancel")
        .addEventListener("click", closeModal);

      const saveBtn = modal.querySelector(".modal-save");
      saveBtn.addEventListener("click", async () => {
        const select = document.getElementById("link-profile-user-select");
        const newUserId = select.value || null;

        const checkedBoxes = modal.querySelectorAll(
          'input[name="additionalDonationId"]:checked',
        );
        const donationIdsToUpdate = [donationId];
        checkedBoxes.forEach((cb) => {
          donationIdsToUpdate.push(cb.value);
        });

        closeModal();
        await this.updateMultipleDonationsUserLink(
          donationIdsToUpdate,
          newUserId,
        );
      });
    },

    openDonorDetailsModal(donorKey) {
      let modal = document.getElementById("donor-details-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "donor-details-modal";
        modal.style.cssText =
          "display:none;position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;padding:24px;";
        document.body.appendChild(modal);
      }

      const donations = this.getDonationsForDonor(donorKey);
      if (donations.length === 0) {
        this.showToast(
          "Fant ingen transaksjoner for denne giveren.",
          "error",
          4000,
        );
        return;
      }

      const userMap = this.adminUserMap || new Map();
      const firstRec = donations[0];
      const donorName = this.getDonationDonorName(firstRec, userMap);
      const donorEmail = this.getDonationDonorEmail(firstRec, userMap);

      // Collect alternative names
      const names = new Set();
      donations.forEach((d) => {
        const n = this.getDonationDonorName(d, userMap);
        if (n && n !== "Ukjent giver" && n !== "ukjent" && n !== "unknown") {
          names.add(n);
        }
      });
      const otherNames = Array.from(names).filter((n) => n !== donorName);
      const otherNamesStr =
        otherNames.length > 0
          ? `Også registrert som: ${otherNames.map((n) => this.escapeHtml(n)).join(", ")}`
          : "";

      // Calculate summary stats
      const isCompleted = (r) =>
        ["completed", "succeeded", "captured"].includes(
          String(r.status || "").toLowerCase(),
        );
      const completedOnly = donations.filter(isCompleted);

      const isProdType = (r) =>
        ["butikk", "kurs", "course", "product"].includes(
          String(r.type || "").toLowerCase(),
        );
      const completedGifts = completedOnly.filter((r) => !isProdType(r));
      const completedProducts = completedOnly.filter(isProdType);

      const donorTotalGifts = completedGifts.reduce(
        (sum, r) => sum + this.normalizeDonationAmountNok(r),
        0,
      );
      const donorTotalProducts = completedProducts.reduce(
        (sum, r) => sum + this.normalizeDonationAmountNok(r),
        0,
      );

      const giftCount = donations.filter((r) => !isProdType(r)).length;
      const completedCount = completedGifts.length;

      const latestDate = this.getDonationDate(firstRec);
      const latestDateStr = latestDate
        ? latestDate.toLocaleDateString("no-NO")
        : "Ukjent";

      // Extract unique years for the dropdown
      const yearsSet = new Set();
      donations.forEach((d) => {
        const date = this.getDonationDate(d);
        if (date) yearsSet.add(date.getFullYear());
      });
      const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
      const yearOptionsHtml = [
        '<option value="all">Alle år</option>',
        ...sortedYears.map((y) => `<option value="${y}">${y}</option>`),
      ].join("");

      const tableRowsHtml = donations
        .map((d) => {
          const date = this.getDonationDate(d);
          const dateStr = date
            ? date.toLocaleDateString("no-NO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Ukjent";
          const method = this.escapeHtml(
            this.getDonationMethodLabel(d.method) ||
              (d.isInKind ? "Fysisk" : "Ukjent"),
          );

          const recType = String(d.type || "").toLowerCase();
          let typeBadge = "";
          if (d.isInKind) {
            typeBadge = `<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">Fysisk</span>`;
          } else if (recType === "fast") {
            typeBadge = `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">Fast</span>`;
          } else if (recType === "butikk" || recType === "product") {
            typeBadge = `<span style="background: #fef3c7; color: #d97706; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">Butikk</span>`;
          } else if (recType === "kurs" || recType === "course") {
            typeBadge = `<span style="background: #f0fdf4; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">Kurs</span>`;
          } else {
            typeBadge = `<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">Enkelt</span>`;
          }

          const statusLabel = this.escapeHtml(
            this.getDonationStatusLabel(d.status),
          );
          const statusBadge = `<span class="method-tag">${statusLabel}</span>`;

          const amountVal = this.normalizeDonationAmountNok(d);
          const amountStr =
            isCompleted(d) || d.isInKind
              ? `<strong>${this.formatDonationCurrency(amountVal)}</strong>`
              : `<span style="color:#94a3b8; text-decoration:line-through;">${this.formatDonationCurrency(amountVal)}</span>`;

          return `
                <tr>
                    <td style="padding:10px 12px; font-size:13px;">${dateStr}</td>
                    <td style="padding:10px 12px; font-size:13px;">${method}</td>
                    <td style="padding:10px 12px; font-size:13px;">${typeBadge}</td>
                    <td style="padding:10px 12px; font-size:13px;">${statusBadge}</td>
                    <td style="padding:10px 12px; font-size:13px; text-align:right;">${amountStr}</td>
                    <td style="padding:10px 12px; text-align:right; width:1px; white-space:nowrap;">
                        <button type="button" class="action-btn delete-donor-detail-donation-btn" data-id="${d.id}" data-inkind="${d.isInKind ? "true" : "false"}" title="Slett gave" style="color:#ef4444; background:none; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:4px; border-radius:4px; transition:background 0.2s;">
                            <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");

      modal.innerHTML = `
            <div class="modal-backdrop" style="position:absolute;inset:0;background:rgba(15,23,42,0.3);backdrop-filter:blur(4px);transition:opacity 0.2s ease;"></div>
            <div class="modal-container" style="position:relative;background:white;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);width:100%;max-width:750px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;animation:modalAppear 0.2s ease-out;z-index:1;">
                
                <!-- Header -->
                <div style="padding:20px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
                    <div>
                        <h3 style="margin:0; font-size:20px; font-weight:700; color:#1B4965; display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:24px; color:#1B4965;">person</span>
                            ${this.escapeHtml(donorName)}
                        </h3>
                        <div style="font-size:13px; color:#64748b; margin-top:4px;">
                            ${this.escapeHtml(donorEmail || "Ingen e-post registrert")}
                            ${otherNamesStr ? ` &bull; ${otherNamesStr}` : ""}
                        </div>
                    </div>
                    <button type="button" class="close-donor-details-btn" style="background:none; border:none; cursor:pointer; color:#64748b; display:flex; align-items:center; justify-content:center; padding:6px; border-radius:999px; transition:background 0.2s;">
                        <span class="material-symbols-outlined" style="font-size:24px;">close</span>
                    </button>
                </div>
                
                <!-- Body -->
                <div style="padding:24px; overflow-y:auto; flex:1;">
                    <!-- Stats Summary Box -->
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:24px;">
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:12px; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                            <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Gaver totalt</span>
                            <div id="donor-modal-total-sum" style="font-size:18px; font-weight:800; color:#047857; margin-top:4px;">${this.formatDonationCurrency(donorTotalGifts)}</div>
                            <span style="font-size:11px; color:#64748b; margin-top:2px;">${completedCount} av ${giftCount} fullført</span>
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:12px; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                            <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Produktkjøp (butikk/kurs)</span>
                            <div id="donor-modal-gifts-count" style="font-size:18px; font-weight:800; color:#1B4965; margin-top:4px;">${this.formatDonationCurrency(donorTotalProducts)}</div>
                            <span style="font-size:11px; color:#64748b; margin-top:2px;">${completedProducts.length} fullførte kjøp</span>
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:12px; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                            <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Siste aktivitet</span>
                            <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:6px;">${latestDateStr}</div>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h4 style="margin:0; font-size:15px; font-weight:700; color:#0f172a;">Transaksjonshistorikk</h4>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <select id="donor-modal-year-filter" class="form-control" style="font-size:13px; padding:4px 38px 4px 8px !important; height:32px; border-radius:6px; font-weight:600; width:140px; margin:0;">
                                ${yearOptionsHtml}
                            </select>
                            <button type="button" class="btn-primary" id="donor-modal-print-btn" style="display:inline-flex !important; align-items:center !important; justify-content:center !important; gap:6px !important; padding:6px 12px !important; border-radius:6px !important; font-size:13px !important; font-weight:600 !important; height:32px !important; min-height:32px !important; background:#1B4965 !important; color:white !important; border:none !important; cursor:pointer !important; transform-origin: center !important;">
                                <span class="material-symbols-outlined" style="font-size:18px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; vertical-align:middle !important; line-height:1 !important; transform: translateY(2.5px) !important; margin:0 !important; margin-right:4px !important;">print</span>
                                <span style="display:inline-flex !important; align-items:center !important; line-height:1 !important;">Skriv ut</span>
                            </button>
                            <button type="button" class="btn-secondary" id="donor-modal-email-btn" style="display:inline-flex !important; align-items:center !important; justify-content:center !important; gap:6px !important; padding:6px 12px !important; border-radius:6px !important; font-size:13px !important; font-weight:600 !important; height:32px !important; min-height:32px !important; cursor:pointer !important; transform-origin: center !important;">
                                <span class="material-symbols-outlined" style="font-size:18px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; vertical-align:middle !important; line-height:1 !important; transform: translateY(2.5px) !important; margin:0 !important; margin-right:4px !important;">mail</span>
                                <span style="display:inline-flex !important; align-items:center !important; line-height:1 !important;">Send e-post</span>
                            </button>
                        </div>
                    </div>
                    
                    <div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:10px; background:white;">
                        <table class="data-table" style="width:100%; margin:0;">
                            <thead>
                                <tr>
                                    <th style="font-size:12px; padding:10px 12px;">Dato</th>
                                    <th style="font-size:12px; padding:10px 12px;">Metode</th>
                                    <th style="font-size:12px; padding:10px 12px;">Type</th>
                                    <th style="font-size:12px; padding:10px 12px;">Status</th>
                                    <th style="font-size:12px; padding:10px 12px; text-align:right;">Beløp</th>
                                    <th style="font-size:12px; padding:10px 12px; text-align:right; width:1px;"></th>
                                </tr>
                            </thead>
                            <tbody id="donor-modal-tbody">
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Footer -->
                <div style="padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; background:#f8fafc; gap:12px;">
                    <button type="button" class="btn-secondary close-donor-details-btn" style="padding:10px 20px; border-radius:8px; font-weight:600;">Lukk</button>
                </div>
            </div>
        `;

      const closeModal = () => {
        modal.style.display = "none";
      };

      modal.style.display = "flex";

      modal.querySelectorAll(".close-donor-details-btn").forEach((el) => {
        el.addEventListener("click", closeModal);
      });
      modal
        .querySelector(".modal-backdrop")
        .addEventListener("click", closeModal);

      const yearFilterEl = modal.querySelector("#donor-modal-year-filter");
      const updateRows = () => {
        const selectedYear = yearFilterEl.value;
        const filtered =
          selectedYear === "all"
            ? donations
            : donations.filter((d) => {
                const date = this.getDonationDate(d);
                return date && date.getFullYear().toString() === selectedYear;
              });

        const completed = filtered.filter(isCompleted);
        const total = completed.reduce(
          (sum, r) => sum + this.normalizeDonationAmountNok(r),
          0,
        );

        modal.querySelector("#donor-modal-total-sum").textContent =
          this.formatDonationCurrency(total);
        modal.querySelector("#donor-modal-gifts-count").textContent =
          `${completed.length} av ${filtered.length}`;

        const rowsHtml = filtered
          .map((d) => {
            const date = this.getDonationDate(d);
            const dateStr = date
              ? date.toLocaleDateString("no-NO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Ukjent";
            const method = this.escapeHtml(
              this.getDonationMethodLabel(d.method) ||
                (d.isInKind ? "Fysisk" : "Ukjent"),
            );

            const isRecurring = String(d.type || "").toLowerCase() === "fast";
            const typeText = d.isInKind
              ? "Fysisk"
              : isRecurring
                ? "Fast"
                : "Enkelt";
            const typeBadge = `<span style="background: ${d.isInKind ? "#fef3c7" : isRecurring ? "#e0f2fe" : "#f1f5f9"}; color: ${d.isInKind ? "#b45309" : isRecurring ? "#0369a1" : "#475569"}; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">${typeText}</span>`;

            const statusLabel = this.escapeHtml(
              this.getDonationStatusLabel(d.status),
            );
            const statusBadge = `<span class="method-tag">${statusLabel}</span>`;

            const amountVal = this.normalizeDonationAmountNok(d);
            const amountStr =
              isCompleted(d) || d.isInKind
                ? `<strong>${this.formatDonationCurrency(amountVal)}</strong>`
                : `<span style="color:#94a3b8; text-decoration:line-through;">${this.formatDonationCurrency(amountVal)}</span>`;

            return `
                    <tr>
                        <td style="padding:10px 12px; font-size:13px;">${dateStr}</td>
                        <td style="padding:10px 12px; font-size:13px;">${method}</td>
                        <td style="padding:10px 12px; font-size:13px;">${typeBadge}</td>
                        <td style="padding:10px 12px; font-size:13px;">${statusBadge}</td>
                        <td style="padding:10px 12px; font-size:13px; text-align:right;">${amountStr}</td>
                        <td style="padding:10px 12px; text-align:right; width:1px; white-space:nowrap;">
                            <button type="button" class="action-btn delete-donor-detail-donation-btn" data-id="${d.id}" data-inkind="${d.isInKind ? "true" : "false"}" title="Slett gave" style="color:#ef4444; background:none; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:4px; border-radius:4px; transition:background 0.2s;">
                                <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                            </button>
                        </td>
                    </tr>
                `;
          })
          .join("");

        modal.querySelector("#donor-modal-tbody").innerHTML =
          rowsHtml ||
          `
                <tr><td colspan="6" style="padding:20px; text-align:center; color:#64748b;">Ingen transaksjoner registrert i ${selectedYear}.</td></tr>
            `;

        // Bind delete donation button listeners in the details modal
        modal
          .querySelectorAll(".delete-donor-detail-donation-btn")
          .forEach((btn) => {
            btn.addEventListener("click", async (e) => {
              e.stopPropagation();
              const donationId = btn.dataset.id;
              const isInKind = btn.dataset.inkind === "true";
              let deleted = false;
              if (isInKind) {
                deleted = await this.deleteInKindDonation(donationId);
              } else {
                deleted = await this.deleteDonation(donationId);
              }
              if (deleted) {
                const remaining = this.getDonationsForDonor(donorKey);
                if (remaining.length > 0) {
                  this.openDonorDetailsModal(donorKey);
                } else {
                  modal.style.display = "none";
                }
              }
            });
          });
      };

      if (yearFilterEl) {
        yearFilterEl.addEventListener("change", updateRows);
      }

      // Bind print button in modal
      modal
        .querySelector("#donor-modal-print-btn")
        ?.addEventListener("click", () => {
          this.printReport("donor-statement", donorKey);
        });

      // Bind email button in modal
      modal
        .querySelector("#donor-modal-email-btn")
        ?.addEventListener("click", () => {
          if (
            !donorEmail ||
            donorEmail === "ukjent" ||
            donorEmail === "unknown"
          ) {
            this.showToast(
              "Kan ikke sende e-post: Giveren har ingen registrert e-postadresse.",
              "error",
            );
            return;
          }

          // Get selected year from dropdown
          const yearSelect = document.getElementById("donor-modal-year-filter");
          const selectedYear = yearSelect ? yearSelect.value : "all";

          this.openEmailPreviewModal(donorKey, selectedYear, donorEmail);
        });

      // Initial binding of delete buttons (since updateRows isn't run initially)
      modal
        .querySelectorAll(".delete-donor-detail-donation-btn")
        .forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const donationId = btn.dataset.id;
            const isInKind = btn.dataset.inkind === "true";
            let deleted = false;
            if (isInKind) {
              deleted = await this.deleteInKindDonation(donationId);
            } else {
              deleted = await this.deleteDonation(donationId);
            }
            if (deleted) {
              const remaining = this.getDonationsForDonor(donorKey);
              if (remaining.length > 0) {
                this.openDonorDetailsModal(donorKey);
              } else {
                modal.style.display = "none";
              }
            }
          });
        });
    },

    async printReport(type, donorKey = null) {
      const userMap = this.adminUserMap || new Map();
      let title = "";
      let headersHtml = "";
      let rowsHtml = "";
      let summaryCardsHtml = "";
      let footerHtml = "";

      // Get global period text
      const isShop = this.currentSection === "shop";
      const presetEl = document.getElementById(
        isShop ? "shop-date-preset" : "causes-date-preset",
      );
      let periodText = presetEl
        ? presetEl.options[presetEl.selectedIndex].text
        : "Valgt periode";
      if (presetEl && presetEl.value === "custom") {
        const start = document.getElementById(
          isShop ? "shop-start-date" : "causes-start-date",
        )?.value;
        const end = document.getElementById(
          isShop ? "shop-end-date" : "causes-end-date",
        )?.value;
        if (start && end) {
          periodText = `${new Date(start).toLocaleDateString("no-NO")} - ${new Date(end).toLocaleDateString("no-NO")}`;
        }
      }

      const isCompleted = (r) =>
        ["completed", "succeeded", "captured"].includes(
          String(r.status || "").toLowerCase(),
        );

      if (type === "donations") {
        title = "Gaverapport";
        const records = this.getFilteredDonationRecords();
        const completedRecords = records.filter(isCompleted);
        const totalSum = completedRecords.reduce(
          (sum, r) => sum + this.normalizeDonationAmountNok(r),
          0,
        );
        const avgSum = completedRecords.length
          ? totalSum / completedRecords.length
          : 0;

        summaryCardsHtml = `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Fullført totalt</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${this.formatDonationCurrency(totalSum)}</div>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Antall gaver</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${records.length}</div>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Snittgave</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${this.formatDonationCurrency(avgSum)}</div>
                </div>
            `;

        headersHtml = `
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Dato</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Giver</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">E-post</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Metode</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Type</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Status</th>
                <th style="padding:10px 8px; font-size:11px; text-align:right;">Beløp</th>
            `;

        rowsHtml = records
          .map((r) => {
            const date = this.getDonationDate(r);
            const dateStr = date
              ? date.toLocaleDateString("no-NO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Ukjent";
            const name = this.getDonationDonorName(r, userMap);
            const email =
              this.getDonationDonorEmail(r, userMap) || "Ingen e-post";
            const method = this.getDonationMethodLabel(r.method);
            const isRecurring = String(r.type || "").toLowerCase() === "fast";
            const typeText = r.isInKind
              ? "Fysisk"
              : isRecurring
                ? "Fast"
                : "Enkelt";
            const status = this.getDonationStatusLabel(r.status);
            const amount = this.normalizeDonationAmountNok(r);

            return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px; font-size:11px; color:#334155;">${this.escapeHtml(dateStr)}</td>
                        <td style="padding:8px; font-size:11px; color:#0f172a; font-weight:600;">${this.escapeHtml(name)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(email)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(method)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${typeText}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(status)}</td>
                        <td style="padding:8px; font-size:11px; text-align:right; font-weight:700;">${this.formatDonationCurrency(amount)}</td>
                    </tr>
                `;
          })
          .join("");
      } else if (type === "donors") {
        title = "Giverrapport";
        const donorRecords = this.getFilteredDonorRecords();
        const donors = this.buildDonorSummaries(donorRecords);
        const totalGifts = donors.reduce((sum, d) => sum + d.totalGifts, 0);
        const totalShop = donors.reduce((sum, d) => sum + d.totalShop, 0);

        summaryCardsHtml = `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Givere totalt</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${donors.length}</div>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Gave-omsetning</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${this.formatDonationCurrency(totalGifts)}</div>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Butikk-omsetning</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${this.formatDonationCurrency(totalShop)}</div>
                </div>
            `;

        headersHtml = `
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Giver</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">E-post</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Antall (Fullført / Totalt)</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Metoder</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Siste aktivitet</th>
                <th style="padding:10px 8px; font-size:11px; text-align:right;">Gave-sum</th>
                <th style="padding:10px 8px; font-size:11px; text-align:right;">Butikk-sum</th>
            `;

        rowsHtml = donors
          .map((d) => {
            const methodList = Array.from(d.methods).map((m) =>
              this.getDonationMethodLabel(m),
            );
            if (d.types && d.types.has("butikk")) {
              methodList.push("Butikk");
            }
            const methodText = methodList.join(", ") || "Ukjent";
            const latestDateStr = d.latestDate
              ? d.latestDate.toLocaleDateString("no-NO")
              : "Ukjent";

            return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px; font-size:11px; color:#0f172a; font-weight:600;">${this.escapeHtml(d.name)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(d.email || "Ingen e-post")}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${d.completedCount} / ${d.giftCount}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(methodText)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${latestDateStr}</td>
                        <td style="padding:8px; font-size:11px; text-align:right; font-weight:700; color:#047857;">${this.formatDonationCurrency(d.totalGifts)}</td>
                        <td style="padding:8px; font-size:11px; text-align:right; font-weight:700; color:#1B4965;">${this.formatDonationCurrency(d.totalShop)}</td>
                    </tr>
                `;
          })
          .join("");
      } else if (type === "shop") {
        title = "Salgsrapport Butikk";
        const records = this.getFilteredShopRecords();
        const completedRecords = records.filter(isCompleted);
        const totalSum = completedRecords.reduce(
          (sum, r) => sum + this.normalizeDonationAmountNok(r),
          0,
        );
        const avgSum = completedRecords.length
          ? totalSum / completedRecords.length
          : 0;

        summaryCardsHtml = `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Omsetning butikk</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${this.formatDonationCurrency(totalSum)}</div>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Antall ordre</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${records.length}</div>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Snittordre</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${this.formatDonationCurrency(avgSum)}</div>
                </div>
            `;

        headersHtml = `
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Dato</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Kjøper</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">E-post</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Metode</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">ID / Referanse</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Status</th>
                <th style="padding:10px 8px; font-size:11px; text-align:right;">Beløp</th>
            `;

        rowsHtml = records
          .map((r) => {
            const date = this.getDonationDate(r);
            const dateStr = date
              ? date.toLocaleDateString("no-NO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Ukjent";
            const name = this.getDonationDonorName(r, userMap);
            const email =
              this.getDonationDonorEmail(r, userMap) || "Ingen e-post";
            const method = this.getDonationMethodLabel(r.method);
            const reference =
              r.transactionId || r.reference || r.id || "Ingen referanse";
            const status = this.getDonationStatusLabel(r.status);
            const amount = this.normalizeDonationAmountNok(r);

            return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px; font-size:11px; color:#334155;">${this.escapeHtml(dateStr)}</td>
                        <td style="padding:8px; font-size:11px; color:#0f172a; font-weight:600;">${this.escapeHtml(name)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(email)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(method)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(reference)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(status)}</td>
                        <td style="padding:8px; font-size:11px; text-align:right; font-weight:700;">${this.formatDonationCurrency(amount)}</td>
                    </tr>
                `;
          })
          .join("");
      } else if (type === "donor-statement") {
        const donations = this.getDonationsForDonor(donorKey).filter((d) => {
          const recType = String(d.type || "Gave").toLowerCase();
          return (
            recType !== "butikk" &&
            recType !== "kurs" &&
            recType !== "course" &&
            recType !== "product"
          );
        });
        if (donations.length === 0) return;

        const firstRec = donations[0];
        const donorName = this.getDonationDonorName(firstRec, userMap);
        const donorEmail = this.getDonationDonorEmail(firstRec, userMap);

        // Get selected year from modal or default to 'all'
        const yearSelect = document.getElementById("donor-modal-year-filter");
        const selectedYear = yearSelect ? yearSelect.value : "all";

        const filtered =
          selectedYear === "all"
            ? donations
            : donations.filter((d) => {
                const date = this.getDonationDate(d);
                return date && date.getFullYear().toString() === selectedYear;
              });

        const completed = filtered.filter(isCompleted);
        const totalSum = completed.reduce(
          (sum, r) => sum + this.normalizeDonationAmountNok(r),
          0,
        );
        const giftCount = filtered.length;
        const completedCount = completed.length;

        title = "Rapport over gaver";
        periodText =
          selectedYear === "all"
            ? "Hele historikken"
            : `Kalenderåret ${selectedYear}`;

        // Get address info if available
        const userId = filtered.find((d) => d.userId)?.userId;
        const user = userId ? userMap.get(userId) : null;
        const address = user?.address || user?.adresse || "";
        const zipCode = user?.zipCode || user?.postnummer || "";
        const city = user?.city || user?.poststed || "";
        const country = user?.country || user?.land || "";
        let addressHtml = "";
        if (address) {
          addressHtml = `
                    <div style="margin-top:12px; font-size:12px; line-height:1.5; color:#334155; border-left:2px solid #1B4965; padding-left:12px;">
                        <strong>Postadresse:</strong><br>
                        ${this.escapeHtml(address)}<br>
                        ${this.escapeHtml(zipCode)} ${this.escapeHtml(city)}${country ? ` &bull; ${this.escapeHtml(country)}` : ""}
                    </div>
                `;
        }

        summaryCardsHtml = `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Mottatt beløp</span>
                    <div style="font-size:18px; font-weight:800; color:#047857; margin-top:2px;">${this.formatDonationCurrency(totalSum)}</div>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:8px; text-align:center; flex:1;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Fullførte overføringer</span>
                    <div style="font-size:18px; font-weight:800; color:#1B4965; margin-top:2px;">${completedCount} av ${giftCount}</div>
                </div>
            `;

        headersHtml = `
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Dato</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Betalingsmetode</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Type</th>
                <th style="padding:10px 8px; font-size:11px; text-align:left;">Status</th>
                <th style="padding:10px 8px; font-size:11px; text-align:right;">Beløp</th>
            `;

        rowsHtml = filtered
          .map((d) => {
            const date = this.getDonationDate(d);
            const dateStr = date
              ? date.toLocaleDateString("no-NO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Ukjent";
            const method =
              this.getDonationMethodLabel(d.method) ||
              (d.isInKind ? "Fysisk" : "Ukjent");
            const isRecurring = String(d.type || "").toLowerCase() === "fast";
            const typeText = d.isInKind
              ? "Fysisk"
              : isRecurring
                ? "Fast"
                : "Enkelt";
            const status = this.getDonationStatusLabel(d.status);
            const amountVal = this.normalizeDonationAmountNok(d);
            const amountText =
              isCompleted(d) || d.isInKind
                ? `<strong>${this.formatDonationCurrency(amountVal)}</strong>`
                : `<span style="color:#94a3b8; text-decoration:line-through;">${this.formatDonationCurrency(amountVal)}</span>`;

            return `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:8px; font-size:11px; color:#334155;">${this.escapeHtml(dateStr)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(method)}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${typeText}</td>
                        <td style="padding:8px; font-size:11px; color:#475569;">${this.escapeHtml(status)}</td>
                        <td style="padding:8px; font-size:11px; text-align:right;">${amountText}</td>
                    </tr>
                `;
          })
          .join("");

        const donorMetaHeader = `
                <div style="margin-bottom:24px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px;">
                    <div>
                        <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Giverinformasjon</span>
                        <div style="font-size:16px; font-weight:700; color:#0f172a; margin-top:4px;">${this.escapeHtml(donorName)}</div>
                        <div style="font-size:12px; color:#475569; margin-top:2px;">${this.escapeHtml(donorEmail || "Ingen e-post registrert")}</div>
                        ${addressHtml}
                    </div>
                    <div style="text-align:right; min-width:150px;">
                        <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Organisasjon</span>
                        <div style="font-size:14px; font-weight:700; color:#1B4965; margin-top:4px;">His Kingdom Ministry</div>
                        <div style="font-size:11px; color:#475569; margin-top:2px;">Org.nr: 925 832 995</div>
                        <div style="font-size:11px; color:#475569;">Lyngdal, Norge</div>
                    </div>
                </div>
            `;

        footerHtml = "";

        title =
          donorMetaHeader +
          '<h2 style="margin:0 0 16px 0; font-size:18px; font-weight:700; color:#0f172a;">' +
          title +
          "</h2>";
      }

      // Write to popup window and print
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        this.showToast(
          "Popup-blokkerer forhindret åpning av utskriftsvinduet. Vennligst tillat popups for dette nettstedet.",
          "error",
          5000,
        );
        return;
      }

      printWindow.document.write(`
            <html>
            <head>
                <title>${type === "donor-statement" ? "Rapport over gaver" : title} - His Kingdom Ministry</title>
                <style>
                    body {
                        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        color: #1e293b;
                        background: white;
                        margin: 0;
                        padding: 20px;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom:20px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:13px; color:#475569; font-weight:500;">Dette er en forhåndsvisning av rapporten. Bruk utskriftsknappen eller Ctrl+P/Cmd+P for å lagre som PDF / skrive ut.</span>
                    <button onclick="window.print()" style="background:#1B4965; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:6px;">
                        Skriv ut / PDF
                    </button>
                </div>

                <div style="padding: 20px; max-width: 1000px; margin: 0 auto;">
                    <!-- Logo & Header -->
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #1B4965; padding-bottom:16px; margin-bottom:24px;">
                        <div style="display:flex; align-items:center; gap:16px;">
                            <img src="/img/logo-hkm.png" alt="Logo" style="height:55px; width:auto; object-fit:contain; border-radius:4px;">
                            <div>
                                <h1 style="margin:0; font-size:24px; font-weight:800; color:#1B4965; letter-spacing:-0.02em;">HIS KINGDOM MINISTRY</h1>
                                <p style="margin:4px 0 0; font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Regnskapsrapport</p>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <p style="margin:0; font-size:11px; color:#64748b;">Dato: ${new Date().toLocaleDateString("no-NO")}</p>
                            <p style="margin:2px 0 0; font-size:11px; color:#64748b;">Generert av: Administrator</p>
                        </div>
                    </div>
                    
                    <!-- Content Area -->
                    <div style="margin-bottom:24px;">
                        ${type !== "donor-statement" ? `<h2 style="margin:0; font-size:18px; font-weight:700; color:#0f172a;">${title}</h2>` : title}
                        ${type !== "donor-statement" ? `<p style="margin:4px 0 0; font-size:13px; color:#64748b; font-weight:500;">Periode: ${periodText}</p>` : ""}
                    </div>
                    
                    <!-- Summary Cards -->
                    <div style="display:flex; gap:16px; margin-bottom:24px;">
                        ${summaryCardsHtml}
                    </div>
                    
                    <!-- Main Table -->
                    <table style="width:100%; border-collapse:collapse; margin-bottom:40px;">
                        <thead>
                            <tr style="border-bottom:2px solid #1B4965;">
                                ${headersHtml}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml || '<tr><td colspan="10" style="padding:24px; text-align:center; color:#64748b;">Ingen transaksjoner funnet.</td></tr>'}
                        </tbody>
                    </table>

                    <!-- Footer Details -->
                    ${footerHtml}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 300);
                    };
                </script>
            </body>
            </html>
        `);
      printWindow.document.close();
    },
  };
}
