import { uniquePurchaseRecords } from '../../../js/shop-history.js';
// shop records methods for AdminManager.
export function createShopRecordsMethods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    getFilteredShopRecords() {
      const records = Array.isArray(this.allDonationRecords)
        ? uniquePurchaseRecords(this.allDonationRecords)
        : [];
      const filters = this.donationFilters || {};
      const { start, end } = this.buildDonationDateRange(
        filters.preset || "30",
        filters.start || "",
        filters.end || "",
      );
      const query = String(filters.shopQuery || "")
        .trim()
        .toLowerCase();
      const status = String(filters.shopStatus || "all").toLowerCase();
      const method = String(filters.shopMethod || "all").toLowerCase();

      return records.filter((record) => {
        if (record.isInKind) return false;
        // Only include shop transactions
        if (String(record.type || "").toLowerCase() !== "butikk") return false;

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

        if (!query) return true;
        const haystack = [
          record.id,
          record.transactionId,
          record.donorName,
          record.donorEmail,
          record.email,
          record.method,
          record.status,
          record.productName,
          record.reference,
          record.wixOrderNumber,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    },

    async openEditSaleModal(recordId) {
      const record = (this.allDonationRecords || []).find(
        (r) => r.id === recordId,
      );
      if (!record) {
        this.showToast("Fant ikke salget.", "error", 3000);
        return;
      }

      // Open modal first so the DOM is present
      this.openManualSaleModal();

      // Mark modal as edit mode
      const modal = document.getElementById("manual-sale-modal");
      if (modal) modal.dataset.editId = recordId;

      // Update modal title and button
      const titleEl = document.getElementById("manual-sale-modal-title");
      const subtitleEl = document.getElementById("manual-sale-modal-subtitle");
      const saveBtnEl = document.getElementById("save-manual-sale-btn");
      if (titleEl) titleEl.textContent = "Rediger butikksalg";
      if (subtitleEl)
        subtitleEl.textContent =
          "Oppdater detaljer for det registrerte salget.";
      if (saveBtnEl)
        saveBtnEl.innerHTML =
          '<span class="material-symbols-outlined" style="font-size:20px;">save</span> Lagre endringer';

      // Fill in existing values
      const setValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? "";
      };
      setValue("manual-sale-buyer-name", record.donorName || "");
      setValue(
        "manual-sale-buyer-email",
        record.donorEmail && record.donorEmail !== "Ukjent"
          ? record.donorEmail
          : "",
      );
      setValue("manual-sale-method", record.method || "vipps_manual");
      setValue("manual-sale-status", record.status || "completed");
      setValue("manual-sale-reference", record.reference || "");
      setValue("manual-sale-note", record.message || "");
      setValue("manual-sale-amount", record.amountNok ?? record.amount ?? "");
      setValue("manual-sale-quantity", record.quantity || 1);
      setValue("manual-sale-user", record.userId || "");

      // Set date
      const saleDate = record.timestamp?.toDate
        ? record.timestamp.toDate()
        : record.timestamp
          ? new Date(record.timestamp)
          : new Date();
      const pad = (v) => String(v).padStart(2, "0");
      const localDT = `${saleDate.getFullYear()}-${pad(saleDate.getMonth() + 1)}-${pad(saleDate.getDate())}T${pad(saleDate.getHours())}:${pad(saleDate.getMinutes())}`;
      setValue("manual-sale-date", localDT);

      // Pre-select product in grid once products are loaded
      if (record.productId) {
        await this.fetchWixProducts();
        const productHidden = document.getElementById("manual-sale-product");
        if (productHidden) productHidden.value = record.productId;
        this.filterWixProducts("");
      }
    },

    async saveEditSale(recordId) {
      const saveBtn = document.getElementById("save-manual-sale-btn");
      const getValue = (id) => document.getElementById(id)?.value?.trim() || "";
      const amountNok = Number(
        getValue("manual-sale-amount").replace(",", "."),
      );
      const selectedUserId = getValue("manual-sale-user");
      const buyerName = getValue("manual-sale-buyer-name");
      const buyerEmail = getValue("manual-sale-buyer-email").toLowerCase();
      const method = getValue("manual-sale-method") || "vipps_manual";
      const status = getValue("manual-sale-status") || "completed";
      const dateValue = getValue("manual-sale-date");
      const note = getValue("manual-sale-note");
      const reference = getValue("manual-sale-reference");
      const selectedProductId = getValue("manual-sale-product");
      const quantity = Number(getValue("manual-sale-quantity")) || 1;

      let productName = null;
      let productId = null;
      if (selectedProductId && selectedProductId !== "custom") {
        const product = this.wixProducts?.find(
          (p) => p.id === selectedProductId,
        );
        if (product) {
          productName = product.name;
          productId = product.id;
        }
      }

      const selectedUser = selectedUserId
        ? this.adminUserMap?.get(selectedUserId)
        : null;
      const resolvedName =
        buyerName ||
        selectedUser?.displayName ||
        selectedUser?.fullName ||
        selectedUser?.email ||
        "Ukjent kjøper";
      const resolvedEmail = buyerEmail || selectedUser?.email || "";

      if (!Number.isFinite(amountNok) || amountNok <= 0) {
        this.showToast("Skriv inn et gyldig beløp.", "warning", 3500);
        return;
      }
      const saleDate = dateValue ? new Date(dateValue) : new Date();
      if (Number.isNaN(saleDate.getTime())) {
        this.showToast("Datoen er ikke gyldig.", "warning", 3500);
        return;
      }

      await this._runWriteLocked("manual-sale:edit", async () =>
        this._withButtonLoading(
          saveBtn,
          async () => {
            const timestamp = firebase.firestore.Timestamp.fromDate(saleDate);
            const amountOre = Math.round(amountNok * 100);
            const isCompletedStatus = [
              "completed",
              "succeeded",
              "captured",
            ].includes(String(status).toLowerCase());

            const updates = {
              amount: amountNok,
              amountNok,
              amountOre,
              method,
              status,
              timestamp,
              completedAt: isCompletedStatus ? timestamp : null,
              userId: selectedUserId || null,
              donorName: resolvedName,
              donorEmail: resolvedEmail || "Ukjent",
              message: note,
              reference: reference || "",
              productId: productId || null,
              productName: productName || null,
              quantity,
              matchMethod: selectedUserId
                ? "manual_user_select"
                : "manual_unmatched",
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            await firebaseService.db
              .collection("donations")
              .doc(recordId)
              .update(updates);

            // Update local cache
            const idx = (this.allDonationRecords || []).findIndex(
              (r) => r.id === recordId,
            );
            if (idx !== -1)
              this.allDonationRecords[idx] = {
                ...this.allDonationRecords[idx],
                ...updates,
                updatedAt: new Date(),
              };

            this.closeManualSaleModal();
            this.renderDonationAdminViews();
            this.showToast("Salget er oppdatert.", "success", 4000);
          },
          { loadingText: "Lagrer..." },
        ),
      );
    },

    openManualSaleModal() {
      const modal = document.getElementById("manual-sale-modal");
      if (!modal) return;

      const now = new Date();
      const pad = (value) => String(value).padStart(2, "0");
      const localDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const form = document.getElementById("manual-sale-form");
      if (form) form.reset();
      const dateInput = document.getElementById("manual-sale-date");
      if (dateInput) dateInput.value = localDateTime;
      const statusInput = document.getElementById("manual-sale-status");
      if (statusInput) statusInput.value = "completed";
      const methodInput = document.getElementById("manual-sale-method");
      if (methodInput) methodInput.value = "vipps_manual";

      // Reset search input
      const searchInput = document.getElementById("manual-sale-product-search");
      if (searchInput) searchInput.value = "";

      // Reset hidden product input and populate image grid
      const productHidden = document.getElementById("manual-sale-product");
      if (productHidden) productHidden.value = "custom";
      const productGrid = document.getElementById("manual-sale-product-grid");
      if (productGrid)
        productGrid.innerHTML =
          '<div style="grid-column:1/-1; padding:24px; text-align:center; color:#64748b; font-size:0.875rem;">Laster produkter...</div>';
      this.fetchWixProducts()
        .then(() => {
          this.filterWixProducts("");
        })
        .catch((err) => {
          console.warn("Kunne ikke laste produkter:", err);
          if (productGrid)
            productGrid.innerHTML =
              '<div style="grid-column:1/-1; padding:16px; text-align:center; color:#ef4444; font-size:0.875rem;">Feil ved henting av produkter</div>';
        });

      // Reset edit mode
      delete modal.dataset.editId;
      const titleEl = document.getElementById("manual-sale-modal-title");
      const subtitleEl = document.getElementById("manual-sale-modal-subtitle");
      const saveBtnEl = document.getElementById("save-manual-sale-btn");
      if (titleEl) titleEl.textContent = "Registrer manuelt butikksalg";
      if (subtitleEl)
        subtitleEl.textContent =
          "Registrer et manuelt salg i butikken (f.eks. Vipps, kontant eller bankoverføring).";
      if (saveBtnEl)
        saveBtnEl.innerHTML =
          '<span class="material-symbols-outlined" style="font-size:20px;">save</span> Lagre salg';

      modal.style.display = "flex";
    },

    closeManualSaleModal() {
      const modal = document.getElementById("manual-sale-modal");
      if (!modal) return;
      modal.style.display = "none";
      // Always clear edit mode so re-opening the modal starts fresh
      delete modal.dataset.editId;
      const titleEl = document.getElementById("manual-sale-modal-title");
      const subtitleEl = document.getElementById("manual-sale-modal-subtitle");
      const saveBtnEl = document.getElementById("save-manual-sale-btn");
      if (titleEl) titleEl.textContent = "Registrer manuelt butikksalg";
      if (subtitleEl)
        subtitleEl.textContent =
          "Registrer et manuelt salg i butikken (f.eks. Vipps, kontant eller bankoverf\u00f8ring).";
      if (saveBtnEl)
        saveBtnEl.innerHTML =
          '<span class="material-symbols-outlined" style="font-size:20px;">save</span> Lagre salg';
    },

    async fetchWixProducts() {
      if (this.wixProducts && this.wixProducts.length > 0) {
        return this.wixProducts;
      }
      try {
        const res = await fetch(
          "https://hiskingdomdesigns.no/api/get-wix-products",
        );
        const data = await res.json();
        if (data.success && data.products) {
          this.wixProducts = data.products.sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          return this.wixProducts;
        }
      } catch (e) {
        console.warn("Kunne ikke hente produkter fra Wix API:", e);
      }
      return [];
    },

    filterWixProducts(query) {
      const gridContainer = document.getElementById("manual-sale-product-grid");
      const hiddenInput = document.getElementById("manual-sale-product");
      if (!gridContainer) return;

      const products = this.wixProducts || [];
      const normQuery = (query || "").toLowerCase().trim();

      // Flexible stem-based synonym search.
      // We match on ROOT STEMS so "kopper" hits "koppen", "Norgeskoppen" etc.
      let searchTerms = [normQuery];
      const q = normQuery;
      if (
        q.includes("kopp") ||
        q.includes("krus") ||
        q.includes("mug") ||
        q.includes("cup")
      ) {
        searchTerms = ["kopp", "krus", "mug", "cup", "enamel", "ceramic"];
      } else if (
        q.includes("genser") ||
        q.includes("hoodie") ||
        q.includes("hettejakke") ||
        q.includes("hettegenser") ||
        q.includes("zip")
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
        q.includes("t-skjorte") ||
        q.includes("tskjorte") ||
        q.includes("t-shirt") ||
        q.includes("tee") ||
        (q.includes("skjorte") && !q.includes("hette"))
      ) {
        searchTerms = ["t-skjorte", "t-shirt", "tee", "skjorte"];
      } else if (
        q.includes("plakat") ||
        q.includes("poster") ||
        q.includes("trykk")
      ) {
        searchTerms = ["plakat", "poster", "trykk", "print"];
      } else if (q.includes("klistremerke") || q.includes("sticker")) {
        searchTerms = ["klistremerke", "sticker"];
      } else if (
        q.includes("bag") ||
        q.includes("veske") ||
        q.includes("tote")
      ) {
        searchTerms = ["bag", "veske", "tote", "handlenett"];
      } else if (
        q.includes("bok") ||
        q.includes("book") ||
        q.includes("fargelegg")
      ) {
        searchTerms = ["bok", "book", "fargelegg", "coloring"];
      }

      const currentSelected = hiddenInput?.value || "custom";

      let filtered = products;
      if (normQuery) {
        filtered = products.filter((p) => {
          const nameLower = (p.name || "").toLowerCase();
          const descLower = (p.description || "").toLowerCase();
          return searchTerms.some(
            (term) => nameLower.includes(term) || descLower.includes(term),
          );
        });
      }

      // Build image-grid cards

      const customSelected =
        currentSelected === "custom"
          ? "border:2px solid #1B4965; background:#f0f6fb;"
          : "border:2px solid #e2e8f0; background:#fff;";
      let html = `
            <div class="wix-product-card" data-id="custom" data-price="0"
                 onclick="window.adminManager?.selectWixProduct?.('custom', 0)"
                 style="display:flex; flex-direction:column; align-items:center; border-radius:10px; padding:10px 8px; cursor:pointer; transition:all 0.18s ease; ${customSelected} text-align:center; gap:6px;">
                <div style="width:72px; height:72px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:28px;"><span class="material-symbols-outlined">edit</span></div>
                <span style="font-size:0.75rem; font-weight:600; color:#334155; line-height:1.2;">Egendefinert</span>
                <span style="font-size:0.7rem; color:#64748b;">–</span>
            </div>`;

      filtered.forEach((p) => {
        const isSelected = currentSelected === p.id;
        const borderStyle = isSelected
          ? "border:2px solid #1B4965; background:#f0f6fb;"
          : "border:2px solid #e2e8f0; background:#fff;";
        const imgEl = p.imageUrl
          ? `<img src="${p.imageUrl}" alt="" style="width:72px; height:72px; object-fit:cover; border-radius:8px; display:block;" loading="lazy">`
          : `<div style="width:72px; height:72px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:24px;"><span class="material-symbols-outlined">shopping_bag</span></div>`;
        const stockBadge = p.inStock
          ? ""
          : `<span style="position:absolute; top:4px; right:4px; background:#ef4444; color:white; font-size:0.6rem; padding:1px 5px; border-radius:4px; font-weight:700;">Utsolgt</span>`;
        html += `
                <div class="wix-product-card" data-id="${p.id}" data-price="${p.price}"
                     onclick="window.adminManager?.selectWixProduct?.('${p.id.replace(/'/g, "\\'")}', ${p.price})"
                     style="display:flex; flex-direction:column; align-items:center; border-radius:10px; padding:10px 8px; cursor:pointer; transition:all 0.18s ease; ${borderStyle} text-align:center; gap:6px; position:relative;">
                    ${imgEl}
                    ${stockBadge}
                    <span style="font-size:0.73rem; font-weight:600; color:#334155; line-height:1.3; max-width:100px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${p.name}</span>
                    <span style="font-size:0.7rem; font-weight:700; color:#1B4965;">kr ${p.price},-</span>
                </div>`;
      });

      if (filtered.length === 0 && normQuery) {
        html += `<div style="grid-column:1/-1; padding:24px; text-align:center; color:#64748b; font-size:0.875rem;">Ingen produkter funnet for "${normQuery}"</div>`;
      }

      gridContainer.innerHTML = html;
    },

    selectWixProduct(productId, price) {
      const hiddenInput = document.getElementById("manual-sale-product");
      const qtyInput = document.getElementById("manual-sale-quantity");
      const amountInput = document.getElementById("manual-sale-amount");
      if (hiddenInput) hiddenInput.value = productId;

      // Update card highlight
      document.querySelectorAll(".wix-product-card").forEach((card) => {
        const isSelected = card.dataset.id === productId;
        card.style.border = isSelected
          ? "2px solid #1B4965"
          : "2px solid #e2e8f0";
        card.style.background = isSelected ? "#f0f6fb" : "#fff";
      });

      // Update amount
      if (amountInput && price > 0) {
        const qty = parseInt(qtyInput?.value || 1, 10);
        amountInput.value = (price * qty).toFixed(2);
      }
    },

    async saveManualSale() {
      const saveBtn = document.getElementById("save-manual-sale-btn");
      const getValue = (id) => document.getElementById(id)?.value?.trim() || "";
      const amountNok = Number(
        getValue("manual-sale-amount").replace(",", "."),
      );
      const selectedUserId = getValue("manual-sale-user");
      const buyerName = getValue("manual-sale-buyer-name");
      const buyerEmail = getValue("manual-sale-buyer-email").toLowerCase();
      const method = getValue("manual-sale-method") || "vipps_manual";
      const status = getValue("manual-sale-status") || "completed";
      const dateValue = getValue("manual-sale-date");
      const note = getValue("manual-sale-note");
      const reference = getValue("manual-sale-reference");

      // Wix product sync
      const selectedProductId = getValue("manual-sale-product");
      const quantity = Number(getValue("manual-sale-quantity")) || 1;
      let productName = "";
      let productId = "";
      if (selectedProductId && selectedProductId !== "custom") {
        const product = this.wixProducts?.find(
          (p) => p.id === selectedProductId,
        );
        if (product) {
          productName = product.name;
          productId = product.id;
        }
      }

      const selectedUser = selectedUserId
        ? this.adminUserMap?.get(selectedUserId)
        : null;
      const resolvedUserId = selectedUserId || "";
      const resolvedName =
        buyerName ||
        selectedUser?.displayName ||
        selectedUser?.fullName ||
        selectedUser?.email ||
        "Ukjent kjøper";
      const resolvedEmail = buyerEmail || selectedUser?.email || "";

      if (!Number.isFinite(amountNok) || amountNok <= 0) {
        this.showToast("Skriv inn et gyldig beløp.", "warning", 3500);
        return;
      }

      if (!resolvedName && !resolvedEmail) {
        this.showToast(
          "Velg en bruker eller skriv inn navn/e-post for kjøperen.",
          "warning",
          3500,
        );
        return;
      }

      const saleDate = dateValue ? new Date(dateValue) : new Date();
      if (Number.isNaN(saleDate.getTime())) {
        this.showToast("Datoen er ikke gyldig.", "warning", 3500);
        return;
      }

      await this._runWriteLocked("manual-sale:create", async () =>
        this._withButtonLoading(
          saveBtn,
          async () => {
            let wixOrderId = null;
            let wixOrderNumber = null;

            // Only register in Wix if status is completed/succeeded/captured
            const isCompletedStatus = [
              "completed",
              "succeeded",
              "captured",
            ].includes(String(status).toLowerCase());

            if (isCompletedStatus) {
              try {
                const token = await this.getAdminAuthToken();
                const headers = {
                  "Content-Type": "application/json",
                };
                if (token) {
                  headers["Authorization"] = `Bearer ${token}`;
                }

                const wixRes = await fetch(
                  "https://hiskingdomdesigns.no/api/create-manual-order",
                  {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                      productId: productId || "custom",
                      productName: productName || note || "Egendefinert vare",
                      quantity: quantity,
                      price:
                        productId && productId !== "custom"
                          ? amountNok / quantity
                          : amountNok,
                      buyerName: resolvedName,
                      buyerEmail: resolvedEmail,
                      paymentMethod: method,
                    }),
                  },
                );

                const wixData = await wixRes.json();
                if (wixData.success) {
                  wixOrderId = wixData.orderId;
                  wixOrderNumber = wixData.orderNumber;
                } else {
                  throw new Error(
                    wixData.error || "Feil ved registrering i Wix",
                  );
                }
              } catch (err) {
                this.showToast(
                  "Kunne ikke registrere i Wix: " + err.message,
                  "error",
                  6000,
                );
                throw err; // Cancel Firestore write
              }
            }

            const docRef = firebaseService.db.collection("donations").doc();
            const docId = docRef.id;
            const timestamp = firebase.firestore.Timestamp.fromDate(saleDate);
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
              completedAt: isCompletedStatus ? timestamp : null,
              userId: resolvedUserId || null,
              donorName: resolvedName,
              donorEmail: resolvedEmail || "Ukjent",
              message: note,
              reference: reference || wixOrderNumber || "",
              type: "butikk",
              source: "manual_admin",
              matchMethod: resolvedUserId
                ? "manual_user_select"
                : "manual_unmatched",
              registeredBy: currentAdmin?.uid || null,
              registeredByEmail: currentAdmin?.email || "",
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              productId: productId || null,
              productName: productName || null,
              quantity: quantity,
              wixOrderId: wixOrderId || null,
              wixOrderNumber: wixOrderNumber || null,
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

            this.closeManualSaleModal();
            this.renderDonationAdminViews();
            this.showToast(
              "Salget er registrert i Firebase og Wix.",
              "success",
              4000,
            );
          },
          {
            loadingText: "Lagrer...",
          },
        ),
      );
    },

    openShopCsvImportModal() {
      const modal = document.getElementById("shop-csv-import-modal");
      if (!modal) return;

      const preview = document.getElementById("shop-csv-import-preview");
      if (preview)
        preview.innerHTML =
          '<div style="padding:24px;text-align:center;color:#64748b;">Velg eller slipp en CSV-fil med butikksalg.</div>';

      const summary = document.getElementById("shop-csv-import-summary");
      if (summary) summary.innerHTML = "";

      const saveBtn = document.getElementById("save-shop-csv-import-btn");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML =
          '<span class="material-symbols-outlined">cloud_upload</span> Importer valgte salg';
      }

      const fileInput = document.getElementById("shop-csv-import-file");
      if (fileInput) fileInput.value = "";

      this.pendingShopImportRows = [];
      modal.style.display = "flex";
    },

    closeShopCsvImportModal() {
      const modal = document.getElementById("shop-csv-import-modal");
      if (modal) modal.style.display = "none";
      this.pendingShopImportRows = [];
    },

    async handleShopCsvImportFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const rows = this.parseShopCsvImport(text);

          // Match rows against userMap
          const users = Array.from(this.adminUserMap?.values() || []);
          this.pendingShopImportRows = rows.map((row, idx) => {
            const rowAmt = Number(
              String(row.amountNok).replace(/[^0-9.-]/g, ""),
            );
            const email = String(row.donorEmail || "")
              .trim()
              .toLowerCase();
            const name = String(row.donorName || "").trim();

            // User matching
            let matchedUser = null;
            if (email) {
              matchedUser = users.find(
                (u) => String(u.email || "").toLowerCase() === email,
              );
            }
            if (!matchedUser && name) {
              matchedUser = users.find(
                (u) =>
                  String(u.displayName || u.fullName || "").toLowerCase() ===
                  name.toLowerCase(),
              );
            }

            // Parse Date
            let parsedDate = null;
            if (row.date) {
              const cleanDate = String(row.date).trim();
              const noMatch = cleanDate.match(
                /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/,
              );
              if (noMatch) {
                const day = parseInt(noMatch[1], 10);
                const month = parseInt(noMatch[2], 10) - 1;
                const year = parseInt(noMatch[3], 10);
                const hour = noMatch[4] ? parseInt(noMatch[4], 10) : 12;
                const min = noMatch[5] ? parseInt(noMatch[5], 10) : 0;
                parsedDate = new Date(year, month, day, hour, min);
              } else {
                parsedDate = new Date(cleanDate);
              }
            }
            if (!parsedDate || isNaN(parsedDate.getTime())) {
              parsedDate = new Date();
            }

            return {
              id: `row-${idx}`,
              date: parsedDate,
              amountNok: isNaN(rowAmt) ? 0 : rowAmt,
              donorName: name || "Ukjent kjøper",
              donorEmail: email || "",
              text: row.text || "",
              reference: row.reference || "",
              userId: matchedUser ? matchedUser.id : "",
              selected: !isNaN(rowAmt) && rowAmt > 0,
            };
          });

          this.renderShopCsvPreview();
        } catch (err) {
          console.error("Failed to parse shop CSV:", err);
          this.showToast(
            "Kunne ikke tolke CSV-filen: " + err.message,
            "error",
            5000,
          );
        }
      };
      reader.readAsText(file, "UTF-8");
    },

    parseShopCsvImport(text) {
      const lines = String(text || "")
        .split(/\r?\n/)
        .filter((line) => line.trim());
      if (lines.length < 2) throw new Error("CSV-filen mangler rader.");
      const delimiter = this.detectCsvDelimiter(lines[0]);
      const rows = lines.map((line) => this.parseCsvLine(line, delimiter));
      const headers = rows[0].map((header) => this.normalizeBankHeader(header));

      return rows.slice(1).map((values) => {
        const raw = {};
        headers.forEach((header, index) => {
          raw[header] = values[index] || "";
        });

        const amount =
          raw.amount ||
          raw.belop ||
          raw.belopinn ||
          raw.belpinn ||
          raw.belp ||
          raw.innbetalt ||
          raw.inn ||
          raw.credit ||
          raw.kredit ||
          raw.sum ||
          raw.total ||
          raw.prisen ||
          raw.pris ||
          raw.netto;
        const buyerName =
          raw.navn ||
          raw.name ||
          raw.avsender ||
          raw.fra ||
          raw.betaler ||
          raw.payer ||
          raw.kundenavn ||
          raw.kjoper ||
          raw.buyer;
        const buyerEmail =
          raw.epost ||
          raw.email ||
          raw.buyeremail ||
          raw.kjoperemail ||
          raw.adresse;

        return {
          date:
            raw.dato ||
            raw.date ||
            raw.timestamp ||
            raw.tidspunkt ||
            raw.orderdate ||
            raw.salgsdato,
          amountNok: amount,
          donorName: buyerName,
          donorEmail: buyerEmail,
          text:
            raw.tekst ||
            raw.beskrivelse ||
            raw.description ||
            raw.melding ||
            raw.items ||
            raw.products ||
            raw.produkter,
          reference:
            raw.kid ||
            raw.referanse ||
            raw.reference ||
            raw.transactionid ||
            raw.transaksjonsid ||
            raw.ordreid ||
            raw.orderid ||
            raw.id,
          category: raw.kategori || "",
        };
      });
    },

    renderShopCsvPreview() {
      const preview = document.getElementById("shop-csv-import-preview");
      const summary = document.getElementById("shop-csv-import-summary");
      const saveBtn = document.getElementById("save-shop-csv-import-btn");
      if (!preview) return;

      const rows = this.pendingShopImportRows || [];
      if (rows.length === 0) {
        preview.innerHTML =
          '<div style="padding:24px;text-align:center;color:#64748b;">Ingen gyldige rader funnet i filen.</div>';
        if (saveBtn) saveBtn.disabled = true;
        return;
      }

      const selectedCount = rows.filter((r) => r.selected).length;
      const totalAmount = rows
        .filter((r) => r.selected)
        .reduce((sum, r) => sum + r.amountNok, 0);

      if (summary) {
        summary.innerHTML = `Funnet ${rows.length} rader. Valgt for import: ${selectedCount} salg (totalt ${totalAmount.toLocaleString("no-NO")} kr).`;
      }

      if (saveBtn) {
        saveBtn.disabled = selectedCount === 0;
        saveBtn.innerHTML = `<span class="material-symbols-outlined">cloud_upload</span> Importer ${selectedCount} salg`;
      }

      let html = `
            <table class="data-table" style="width:100%; font-size:12px;">
                <thead>
                    <tr>
                        <th style="width:40px; text-align:center;"><input type="checkbox" id="shop-csv-select-all" ${rows.every((r) => r.selected) ? "checked" : ""}></th>
                        <th>Dato</th>
                        <th>Kjøper (fra CSV)</th>
                        <th>E-post (fra CSV)</th>
                        <th>Koble til brukerprofil</th>
                        <th>Beskrivelse</th>
                        <th>Referanse</th>
                        <th class="text-right">Beløp</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows
                      .map((row, idx) => {
                        const dateStr = row.date
                          ? row.date.toLocaleDateString("no-NO")
                          : "";
                        return `
                            <tr style="${row.selected ? "" : "opacity:0.5; background:#f8fafc;"}">
                                <td style="text-align:center;">
                                    <input type="checkbox" class="shop-csv-row-checkbox" data-idx="${idx}" ${row.selected ? "checked" : ""}>
                                </td>
                                <td>${dateStr}</td>
                                <td><strong>${this.escapeHtml(row.donorName)}</strong></td>
                                <td>${this.escapeHtml(row.donorEmail || "-")}</td>
                                <td>
                                    <select class="form-control shop-csv-row-user" data-idx="${idx}" style="font-size:11px; padding:4px 38px 4px 8px; height:28px;">
                                        <option value="">(Ikke koblet)</option>
                                        ${Array.from(
                                          this.adminUserMap?.values() || [],
                                        )
                                          .map((u) => {
                                            const isSelected =
                                              u.id === row.userId;
                                            return `<option value="${u.id}" ${isSelected ? "selected" : ""}>${this.escapeHtml(u.displayName || u.fullName || u.email)}</option>`;
                                          })
                                          .join("")}
                                    </select>
                                </td>
                                <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${this.escapeHtml(row.text)}">${this.escapeHtml(row.text || "-")}</td>
                                <td>${this.escapeHtml(row.reference || "-")}</td>
                                <td class="text-right"><strong>${row.amountNok.toLocaleString("no-NO")} kr</strong></td>
                            </tr>
                        `;
                      })
                      .join("")}
                </tbody>
            </table>
        `;

      preview.innerHTML = html;

      const selectAll = document.getElementById("shop-csv-select-all");
      if (selectAll) {
        selectAll.onclick = () => {
          const checked = selectAll.checked;
          rows.forEach((r) => (r.selected = checked));
          this.renderShopCsvPreview();
        };
      }

      preview.querySelectorAll(".shop-csv-row-checkbox").forEach((cb) => {
        cb.onclick = (e) => {
          const idx = parseInt(cb.dataset.idx, 10);
          rows[idx].selected = cb.checked;
          this.renderShopCsvPreview();
        };
      });

      preview.querySelectorAll(".shop-csv-row-user").forEach((sel) => {
        sel.onchange = () => {
          const idx = parseInt(sel.dataset.idx, 10);
          rows[idx].userId = sel.value;
        };
      });
    },

    async saveShopCsvImportRows() {
      const rows = (this.pendingShopImportRows || []).filter(
        (row) => row.selected,
      );
      if (!rows.length) {
        this.showToast("Velg minst én rad å importere.", "warning", 3500);
        return;
      }

      const saveBtn = document.getElementById("save-shop-csv-import-btn");
      await this._runWriteLocked("shop-csv-import:create", async () =>
        this._withButtonLoading(
          saveBtn,
          async () => {
            const batch = firebase.firestore().batch();
            const currentAdmin = firebase.auth().currentUser;
            const importedRecords = [];

            rows.forEach((row) => {
              const docRef = firebaseService.db.collection("donations").doc();
              const docId = docRef.id;
              const timestamp = firebase.firestore.Timestamp.fromDate(
                row.date || new Date(),
              );
              const amountOre = Math.round(row.amountNok * 100);
              const payload = {
                transactionId: docId,
                manualDonationId: docId,
                shopImportId: docId,
                amount: row.amountNok,
                amountNok: row.amountNok,
                amountOre,
                currency: "NOK",
                method: "manual",
                status: "completed",
                timestamp,
                completedAt: timestamp,
                userId: row.userId || null,
                donorName: row.donorName,
                donorEmail: row.donorEmail || "Ukjent",
                message: row.text,
                reference: row.reference || "",
                type: "butikk",
                source: "manual_csv_import",
                matchMethod: row.userId
                  ? "csv_email_or_name_match"
                  : "csv_unmatched",
                registeredBy: currentAdmin?.uid || null,
                registeredByEmail: currentAdmin?.email || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              };

              batch.set(docRef, payload);
              importedRecords.push({
                id: docId,
                ...payload,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });

            await batch.commit();

            this.allDonationRecords = [
              ...importedRecords,
              ...(this.allDonationRecords || []),
            ].sort((a, b) => {
              const aDate = this.getDonationDate(a)?.getTime?.() || 0;
              const bDate = this.getDonationDate(b)?.getTime?.() || 0;
              return bDate - aDate;
            });

            this.closeShopCsvImportModal();
            this.renderDonationAdminViews();
            this.showToast(
              `Vellykket importert ${importedRecords.length} salg.`,
              "success",
              4500,
            );
          },
          {
            loadingText: "Importerer...",
          },
        ),
      );
    },

    async renderWixStats() {
      const container = document.getElementById("wix-stats-container");
      const ordersContainer = document.getElementById("wix-orders-container");
      if (!container && !ordersContainer) return;

      if (container) {
        container.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; padding:64px; flex-direction:column; gap:16px;">
                    <div class="loader"></div>
                    <p style="color:#64748b; font-weight:600; font-size:14px; margin:0;">Henter ordredata fra Wix-butikken...</p>
                </div>
            `;
      }
      if (ordersContainer) {
        ordersContainer.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; padding:64px; flex-direction:column; gap:16px;">
                    <div class="loader"></div>
                    <p style="color:#64748b; font-weight:600; font-size:14px; margin:0;">Henter ordrehistorikk...</p>
                </div>
            `;
      }

      try {
        const token = await this.getAdminAuthToken();
        const headers = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(
          "https://hiskingdomdesigns.no/api/get-wix-stats",
          { headers },
        );
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Feil ved henting av data");
        }

        const orders = data.orders || [];

        // Get date range filters
        const filters = this.donationFilters || {};
        const { start, end } = this.buildDonationDateRange(
          filters.preset || "30",
          filters.start || "",
          filters.end || "",
        );

        // Filter orders based on date range
        const filteredOrders = orders.filter((o) => {
          const dateStr = o._createdDate || o.purchasedDate;
          if (!dateStr) return true;
          const date = new Date(dateStr);
          if (start && date < start) return false;
          if (end && date > end) return false;
          return true;
        });

        // Get manual shop records from Firestore for the same period
        const isCompleted = (record) =>
          ["completed", "succeeded", "captured"].includes(
            String(record.status || "").toLowerCase(),
          );
        const manualShopOrders = uniquePurchaseRecords(this.allDonationRecords || [], orders).filter((r) => {
          if (r.isInKind) return false;
          if (String(r.type || "").toLowerCase() !== "butikk") return false;
          if (!isCompleted(r)) return false;

          const date = this.getDonationDate(r);
          if (!date) return false;
          if (start && date < start) return false;
          if (end && date > end) return false;
          return true;
        });

        // Process statistics
        let totalSales = 0;
        let paidSales = 0;
        let paidCount = 0;
        let totalItemsSold = 0;
        const statusCounts = {};
        const monthlySales = {};
        const customerSales = {};
        let validOrderCount = 0;

        // 1. Process Wix Orders
        filteredOrders.forEach((o) => {
          const refunded = parseFloat(o.balanceSummary?.refunded?.amount || 0);
          const price = Math.max(0, parseFloat(o.priceSummary?.total?.amount || 0) - refunded);
          const pStatus = o.paymentStatus || "UNKNOWN";
          const isRefundedOrCanceled =
            pStatus === "FULLY_REFUNDED" ||
            o.status === "CANCELED" ||
            o.status === "REFUNDED";

          statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

          if (isRefundedOrCanceled) {
            return; // Skip adding to sales metrics
          }

          totalSales += price;
          validOrderCount++;

          if (["PAID", "PARTIALLY_REFUNDED", "PARTIALLY_PAID"].includes(pStatus)) {
            paidSales += Math.max(0, parseFloat(o.balanceSummary?.paid?.amount ?? o.priceSummary?.total?.amount ?? 0) - refunded);
            paidCount++;
          }

          const items = o.lineItems || [];
          items.forEach((item) => {
            totalItemsSold += parseInt(item.quantity || 0, 10);
          });

          const dateStr = o._createdDate || o.purchasedDate;
          if (dateStr) {
            const date = new Date(dateStr);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            monthlySales[yearMonth] = (monthlySales[yearMonth] || 0) + price;
          }

          const buyerName =
            `${o.billingInfo?.contactDetails?.firstName || ""} ${o.billingInfo?.contactDetails?.lastName || ""}`.trim() ||
            o.buyerInfo?.email ||
            "Ukjent kjøper";
          customerSales[buyerName] = (customerSales[buyerName] || 0) + price;
        });

        // 2. Process Manual Shop Orders
        manualShopOrders.forEach((r) => {
          const amount = this.normalizeDonationAmountNok(r);
          const mStatus = String(r.status || "COMPLETED").toLowerCase();
          const isRefundedOrCancelled = [
            "refunded",
            "cancelled",
            "canceled",
          ].includes(mStatus);

          const mStatusUpper = mStatus.toUpperCase();
          statusCounts[mStatusUpper] = (statusCounts[mStatusUpper] || 0) + 1;

          if (isRefundedOrCancelled) {
            return; // Skip adding to sales metrics
          }

          totalSales += amount;
          validOrderCount++;
          paidSales += amount;
          paidCount++;

          // If quantity field is present, use it, otherwise assume 1 item
          const quantity = parseInt(r.quantity || 1, 10);
          totalItemsSold += quantity;

          const date = this.getDonationDate(r);
          if (date) {
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            monthlySales[yearMonth] = (monthlySales[yearMonth] || 0) + amount;
          }

          const buyerName =
            r.donorName ||
            r.name ||
            r.email ||
            r.donorEmail ||
            "Manuell Registrering";
          customerSales[buyerName] = (customerSales[buyerName] || 0) + amount;
        });

        const avgOrder = validOrderCount > 0 ? totalSales / validOrderCount : 0;
        const avgItems =
          validOrderCount > 0
            ? (totalItemsSold / validOrderCount).toFixed(1)
            : 0;
        const totalOrderCount = validOrderCount;

        // Render stats grid
        let statsHtml = `
                <div class="stats-grid donation-metrics-grid causes-stats-grid" style="margin-bottom: 32px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 24px;">
                    <div class="stat-card modern">
                        <div class="stat-icon-wrap green">
                            <span class="material-symbols-outlined">payments</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Total omsetning</h3>
                            <p class="stat-value" style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 4px 0 0;">${this.formatDonationCurrency(totalSales)}</p>
                            <span class="stat-meta">Valgt periode</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap blue">
                            <span class="material-symbols-outlined">shopping_cart</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Antall ordre</h3>
                            <p class="stat-value" style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 4px 0 0;">${totalOrderCount}</p>
                            <span class="stat-meta">Totalt i valgt periode</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap purple">
                            <span class="material-symbols-outlined">analytics</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Snittordre</h3>
                            <p class="stat-value" style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 4px 0 0;">${this.formatDonationCurrency(avgOrder)}</p>
                            <span class="stat-meta">Snitt per bestilling</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap mint">
                            <span class="material-symbols-outlined">shopping_bag</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Solgte varer</h3>
                            <p class="stat-value" style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 4px 0 0;">${totalItemsSold} stk</p>
                            <span class="stat-meta">Snitt på ${avgItems} per ordre</span>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 24px; margin-bottom: 24px; align-items: start;">
                    <!-- Monthly Breakdown -->
                    <div class="card" style="margin: 0;">
                        <div class="card-header" style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9;">
                            <h3 class="card-title" style="margin: 0; font-size: 15px; font-weight: 700; color: #1B4965;">Månedlig omsetning</h3>
                        </div>
                        <div class="card-body" style="padding: 16px 24px;">
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${
                                  Object.keys(monthlySales).length === 0
                                    ? `
                                    <div style="text-align: center; color: #64748b; padding: 16px; font-size: 13px;">Ingen salgsdata for denne perioden</div>
                                `
                                    : Object.entries(monthlySales)
                                        .sort()
                                        .reverse()
                                        .map(([month, amount]) => {
                                          const date = new Date(month + "-01");
                                          const monthName =
                                            date.toLocaleDateString("no-NO", {
                                              month: "long",
                                              year: "numeric",
                                            });
                                          return `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
                                            <span style="font-weight: 500; color: #475569; text-transform: capitalize; font-size: 13px;">${monthName}</span>
                                            <span style="font-weight: 700; color: #0f172a; font-size: 14px;">${this.formatDonationCurrency(amount)}</span>
                                        </div>
                                    `;
                                        })
                                        .join("")
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Top Customers -->
                    <div class="card" style="margin: 0;">
                        <div class="card-header" style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9;">
                            <h3 class="card-title" style="margin: 0; font-size: 15px; font-weight: 700; color: #1B4965;">Toppkunder</h3>
                        </div>
                        <div class="card-body" style="padding: 16px 24px;">
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${
                                  Object.keys(customerSales).length === 0
                                    ? `
                                    <div style="text-align: center; color: #64748b; padding: 16px; font-size: 13px;">Ingen toppkunder i denne perioden</div>
                                `
                                    : Object.entries(customerSales)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([name, amount], index) => {
                                          return `
                                        <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
                                            <div style="display: flex; align-items: center; gap: 12px;">
                                                <span style="font-weight: 700; color: #94a3b8; font-size: 13px;">#${index + 1}</span>
                                                <span style="font-weight: 600; color: #334155; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${name}</span>
                                            </div>
                                            <span style="font-weight: 700; color: #1B4965; font-size: 14px;">${this.formatDonationCurrency(amount)}</span>
                                        </div>
                                    `;
                                        })
                                        .join("")
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `;

        // Render Wix Order List
        let ordersHtml = `
                <div class="card" style="margin: 0; width: 100%;">
                    <div class="card-header flex-between" style="padding: 24px 32px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
                        <div>
                            <h3 class="card-title" style="margin: 0; font-size: 16px; font-weight: 700; color: #1B4965;">Ordrehistorikk</h3>
                            <p class="section-subtitle" style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Klikk på en ordre for å se detaljer.</p>
                        </div>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="position:relative; width:220px;">
                                <span class="material-symbols-outlined" style="position:absolute; left:10px; top:50%; transform:translateY(-50%) !important; font-size:18px; color:#64748b; pointer-events:none;">search</span>
                                <input id="wix-search" class="form-control" type="search" placeholder="Søk etter kunde..." style="padding-left:36px !important; padding-top:0px !important; padding-bottom:0px !important; height:40px; font-size:13px; border-radius:8px; border:1px solid #cbd5e1; width:100%; margin:0;" oninput="window.adminManager.filterWixOrders()">
                            </div>
                            <button type="button" class="btn-secondary" onclick="window.adminManager.renderWixStats()" style="display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; height:40px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">
                                <span class="material-symbols-outlined" style="font-size:20px;">refresh</span>
                                Synkroniser
                            </button>
                        </div>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <!-- Filters Grid -->
                        <div style="display:flex; flex-wrap:wrap; gap:16px; padding: 16px 32px; border-bottom: 1px solid #f1f5f9; background: #fafafa;">
                            <div class="form-group" style="margin:0; flex:1 1 180px; min-width: 140px;">
                                <label style="font-weight:700; color:#1B4965; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">Betalingsstatus</label>
                                <select id="wix-payment-status-filter" class="form-control" style="height:40px; font-size:13px; border-radius:8px; font-weight:600; width: 100%; padding-top:0px !important; padding-bottom:0px !important; padding-left:12px !important; padding-right:42px !important;" onchange="window.adminManager.filterWixOrders()">
                                    <option value="all">Alle statuser</option>
                                    <option value="PAID">Betalt</option>
                                    <option value="PENDING">Venter</option>
                                    <option value="FULLY_REFUNDED">Refundert</option>
                                    <option value="PARTIALLY_REFUNDED">Delvis refundert</option>
                                    <option value="NOT_PAID">Ikke betalt</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin:0; flex:1 1 180px; min-width: 140px;">
                                <label style="font-weight:700; color:#1B4965; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">Ordrestatus</label>
                                <select id="wix-order-status-filter" class="form-control" style="height:40px; font-size:13px; border-radius:8px; font-weight:600; width: 100%; padding-top:0px !important; padding-bottom:0px !important; padding-left:12px !important; padding-right:42px !important;" onchange="window.adminManager.filterWixOrders()">
                                    <option value="all">Alle statuser</option>
                                    <option value="COMPLETED">Fullført</option>
                                    <option value="APPROVED">Godkjent</option>
                                    <option value="IN_PROGRESS">Behandles</option>
                                    <option value="CANCELED">Kansellert</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin:0; flex:1 1 180px; min-width: 140px;">
                                <label style="font-weight:700; color:#1B4965; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">Utsendelse</label>
                                <select id="wix-fulfillment-status-filter" class="form-control" style="height:40px; font-size:13px; border-radius:8px; font-weight:600; width: 100%; padding-top:0px !important; padding-bottom:0px !important; padding-left:12px !important; padding-right:42px !important;" onchange="window.adminManager.filterWixOrders()">
                                    <option value="all">Alle statuser</option>
                                    <option value="FULFILLED">Sendt</option>
                                    <option value="NOT_FULFILLED">Ikke sendt</option>
                                </select>
                            </div>
                            <div style="display:flex; align-items:flex-end; flex:1 1 140px; min-width: 120px;">
                                <button type="button" class="btn-secondary" onclick="window.adminManager.clearWixFilters()" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; width:100%; height:40px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">
                                    <span class="material-symbols-outlined" style="font-size:20px;">filter_alt_off</span>
                                    Nullstill
                                </button>
                            </div>
                        </div>

                        <div class="table-responsive" style="overflow-x: auto;">
                            <table class="data-table" style="width: 100%; margin: 0; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th>Ordrenummer</th>
                                        <th>Dato</th>
                                        <th>Kunde</th>
                                        <th class="text-right">Beløp</th>
                                        <th>Betaling</th>
                                        <th>Utsendelse</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="wix-transactions-body">
                                    ${
                                      filteredOrders.length === 0
                                        ? `
                                        <tr><td colspan="7" style="padding:28px;text-align:center;color:#64748b;">Ingen ordre funnet for denne perioden</td></tr>
                                    `
                                        : filteredOrders
                                            .map((o) => {
                                              const date = o._createdDate
                                                ? new Date(
                                                    o._createdDate,
                                                  ).toLocaleDateString(
                                                    "no-NO",
                                                    {
                                                      day: "2-digit",
                                                      month: "short",
                                                      year: "numeric",
                                                    },
                                                  )
                                                : "Ukjent";
                                              const buyer =
                                                `${o.billingInfo?.contactDetails?.firstName || ""} ${o.billingInfo?.contactDetails?.lastName || ""}`.trim() ||
                                                o.buyerInfo?.email ||
                                                "Ukjent";
                                              const amount = parseFloat(
                                                o.priceSummary?.total?.amount ||
                                                  0,
                                              );
                                              const pStatus =
                                                o.paymentStatus || "UNKNOWN";

                                              let pBadge = `<span class="badge badge-secondary">${pStatus}</span>`;
                                              if (pStatus === "PAID")
                                                pBadge = `<span class="badge badge-success" style="background:#dcfce7; color:#15803d; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Betalt</span>`;
                                              else if (pStatus === "PENDING")
                                                pBadge = `<span class="badge badge-warning" style="background:#fef9c3; color:#a16207; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Venter</span>`;
                                              else if (
                                                pStatus === "FULLY_REFUNDED"
                                              )
                                                pBadge = `<span class="badge badge-danger" style="background:#fee2e2; color:#b91c1c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Refundert</span>`;
                                              else if (
                                                pStatus === "PARTIALLY_REFUNDED"
                                              )
                                                pBadge = `<span class="badge badge-warning" style="background:#ffedd5; color:#c2410c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Delvis ref.</span>`;

                                              const fStatus =
                                                o.fulfillmentStatus ||
                                                "NOT_FULFILLED";
                                              let fBadge = `<span class="badge badge-secondary">${fStatus}</span>`;
                                              if (fStatus === "FULFILLED")
                                                fBadge = `<span class="badge badge-success" style="background:#dcfce7; color:#15803d; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Sendt</span>`;
                                              else if (
                                                fStatus === "NOT_FULFILLED"
                                              )
                                                fBadge = `<span class="badge badge-warning" style="background:#ffedd5; color:#c2410c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Ikke sendt</span>`;

                                              let statusBadge = `<span class="badge badge-secondary">${o.status}</span>`;
                                              if (o.status === "APPROVED")
                                                statusBadge = `<span class="badge badge-info" style="background:#e0f2fe; color:#0369a1; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Godkjent</span>`;
                                              else if (o.status === "COMPLETED")
                                                statusBadge = `<span class="badge badge-success" style="background:#dcfce7; color:#15803d; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Fullført</span>`;
                                              else if (o.status === "CANCELED")
                                                statusBadge = `<span class="badge badge-danger" style="background:#fee2e2; color:#b91c1c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Avbrutt</span>`;

                                              return `
                                            <tr style="cursor: pointer; border-bottom: 1px solid #f1f5f9;" onclick="window.adminManager.showWixOrderDetails('${o._id}')">
                                                <td style="font-weight: 700; color:#1B4965; padding: 14px 16px;">#${o.number}</td>
                                                <td style="white-space: nowrap; padding: 14px 16px;">${date}</td>
                                                <td style="padding: 14px 16px;">${buyer}</td>
                                                <td class="text-right" style="font-weight: 600; padding: 14px 16px;">${this.formatDonationCurrency(amount)}</td>
                                                <td style="padding: 14px 16px;">${pBadge}</td>
                                                <td style="padding: 14px 16px;">${fBadge}</td>
                                                <td style="padding: 14px 16px;">${statusBadge}</td>
                                            </tr>
                                        `;
                                            })
                                            .join("")
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

        this.wixOrders = filteredOrders;
        if (container) container.innerHTML = statsHtml;
        if (ordersContainer) ordersContainer.innerHTML = ordersHtml;
      } catch (err) {
        console.error("Kunne ikke hente Wix-statistikk:", err);
        const errHtml = `
                <div class="card" style="padding: 32px; text-align: center;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;">error</span>
                    <h3 style="margin-bottom: 8px; color: #0f172a;">Feil ved lasting av Wix-data</h3>
                    <p style="color: #64748b; margin-bottom: 24px;">${err.message || "Det oppstod en feil under kommunikasjon med Wix-serveren."}</p>
                    <button class="btn btn-primary" onclick="window.adminManager.renderWixStats()" style="margin: 0 auto;">Prøv igjen</button>
                </div>
            `;
        if (container) container.innerHTML = errHtml;
        if (ordersContainer) ordersContainer.innerHTML = errHtml;
      }
    },

    filterWixOrders() {
      const queryEl = document.getElementById("wix-search");
      const payStatusEl = document.getElementById("wix-payment-status-filter");
      const ordStatusEl = document.getElementById("wix-order-status-filter");
      const fulfillmentStatusEl = document.getElementById(
        "wix-fulfillment-status-filter",
      );

      const q = queryEl
        ? String(queryEl.value || "")
            .toLowerCase()
            .trim()
        : "";
      const payStatus = payStatusEl
        ? String(payStatusEl.value || "all")
        : "all";
      const ordStatus = ordStatusEl
        ? String(ordStatusEl.value || "all")
        : "all";
      const fulfillmentStatus = fulfillmentStatusEl
        ? String(fulfillmentStatusEl.value || "all")
        : "all";

      const tbody = document.getElementById("wix-transactions-body");
      if (!tbody || !this.wixOrders) return;

      const filtered = this.wixOrders.filter((o) => {
        // Search filter
        const num = String(o.number || "");
        const buyer =
          `${o.billingInfo?.contactDetails?.firstName || ""} ${o.billingInfo?.contactDetails?.lastName || ""}`.toLowerCase();
        const email = String(o.buyerInfo?.email || "").toLowerCase();
        const matchesQuery =
          !q || num.includes(q) || buyer.includes(q) || email.includes(q);

        // Payment status filter
        const pStatus = o.paymentStatus || "UNKNOWN";
        const matchesPay = payStatus === "all" || pStatus === payStatus;

        // Order status filter
        const oStatus = o.status || "UNKNOWN";
        const matchesOrd = ordStatus === "all" || oStatus === ordStatus;

        // Fulfillment status filter
        const fStatus = o.fulfillmentStatus || "NOT_FULFILLED";
        const matchesFulfillment =
          fulfillmentStatus === "all" || fStatus === fulfillmentStatus;

        return matchesQuery && matchesPay && matchesOrd && matchesFulfillment;
      });

      if (this.wixSortField) {
        filtered.sort((a, b) => {
          let comp = 0;
          if (this.wixSortField === "number") {
            comp = (parseInt(a.number) || 0) - (parseInt(b.number) || 0);
          } else if (this.wixSortField === "date") {
            const timeA = a._createdDate
              ? new Date(a._createdDate).getTime()
              : 0;
            const timeB = b._createdDate
              ? new Date(b._createdDate).getTime()
              : 0;
            comp = timeA - timeB;
          } else if (this.wixSortField === "buyer") {
            const buyerA =
              `${a.billingInfo?.contactDetails?.firstName || ""} ${a.billingInfo?.contactDetails?.lastName || ""}`.trim() ||
              a.buyerInfo?.email ||
              "";
            const buyerB =
              `${b.billingInfo?.contactDetails?.firstName || ""} ${b.billingInfo?.contactDetails?.lastName || ""}`.trim() ||
              b.buyerInfo?.email ||
              "";
            comp = buyerA.localeCompare(buyerB, "no");
          } else if (this.wixSortField === "amount") {
            comp =
              parseFloat(a.priceSummary?.total?.amount || 0) -
              parseFloat(b.priceSummary?.total?.amount || 0);
          } else if (this.wixSortField === "paymentStatus") {
            comp = (a.paymentStatus || "").localeCompare(
              b.paymentStatus || "",
              "no",
            );
          } else if (this.wixSortField === "fulfillmentStatus") {
            comp = (a.fulfillmentStatus || "").localeCompare(
              b.fulfillmentStatus || "",
              "no",
            );
          } else if (this.wixSortField === "status") {
            comp = (a.status || "").localeCompare(b.status || "", "no");
          }
          return this.wixSortDir === "desc" ? -comp : comp;
        });
      }

      tbody.innerHTML = filtered.length
        ? filtered
            .map((o) => {
              const date = o._createdDate
                ? new Date(o._createdDate).toLocaleDateString("no-NO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Ukjent";
              const buyer =
                `${o.billingInfo?.contactDetails?.firstName || ""} ${o.billingInfo?.contactDetails?.lastName || ""}`.trim() ||
                o.buyerInfo?.email ||
                "Ukjent";
              const amount = parseFloat(o.priceSummary?.total?.amount || 0);
              const pStatus = o.paymentStatus || "UNKNOWN";

              let pBadge = `<span class="badge badge-secondary">${pStatus}</span>`;
              if (pStatus === "PAID")
                pBadge = `<span class="badge badge-success" style="background:#dcfce7; color:#15803d; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Betalt</span>`;
              else if (pStatus === "PENDING")
                pBadge = `<span class="badge badge-warning" style="background:#fef9c3; color:#a16207; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Venter</span>`;
              else if (pStatus === "FULLY_REFUNDED")
                pBadge = `<span class="badge badge-danger" style="background:#fee2e2; color:#b91c1c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Refundert</span>`;
              else if (pStatus === "PARTIALLY_REFUNDED")
                pBadge = `<span class="badge badge-warning" style="background:#ffedd5; color:#c2410c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Delvis ref.</span>`;

              const fStatus = o.fulfillmentStatus || "NOT_FULFILLED";
              let fBadge = `<span class="badge badge-secondary">${fStatus}</span>`;
              if (fStatus === "FULFILLED")
                fBadge = `<span class="badge badge-success" style="background:#dcfce7; color:#15803d; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Sendt</span>`;
              else if (fStatus === "NOT_FULFILLED")
                fBadge = `<span class="badge badge-warning" style="background:#ffedd5; color:#c2410c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Ikke sendt</span>`;

              let statusBadge = `<span class="badge badge-secondary">${o.status}</span>`;
              if (o.status === "APPROVED")
                statusBadge = `<span class="badge badge-info" style="background:#e0f2fe; color:#0369a1; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Godkjent</span>`;
              else if (o.status === "COMPLETED")
                statusBadge = `<span class="badge badge-success" style="background:#dcfce7; color:#15803d; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Fullført</span>`;
              else if (o.status === "CANCELED")
                statusBadge = `<span class="badge badge-danger" style="background:#fee2e2; color:#b91c1c; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;">Avbrutt</span>`;

              return `
                <tr style="cursor: pointer; border-bottom: 1px solid #f1f5f9;" onclick="window.adminManager.showWixOrderDetails('${o._id}')">
                    <td style="font-weight: 700; color:#1B4965; padding: 14px 16px;">#${o.number}</td>
                    <td style="white-space: nowrap; padding: 14px 16px;">${date}</td>
                    <td style="padding: 14px 16px;">${buyer}</td>
                    <td class="text-right" style="font-weight: 600; padding: 14px 16px;">${this.formatDonationCurrency(amount)}</td>
                    <td style="padding: 14px 16px;">${pBadge}</td>
                    <td style="padding: 14px 16px;">${fBadge}</td>
                    <td style="padding: 14px 16px;">${statusBadge}</td>
                </tr>
            `;
            })
            .join("")
        : `
            <tr><td colspan="7" style="padding:28px;text-align:center;color:#64748b;">Ingen ordre matcher søket eller filteret.</td></tr>
        `;

      // Update Sorting UI
      const container = document
        .getElementById("wix-transactions-body")
        ?.closest(".table-responsive");
      if (container) {
        const headers = container.querySelectorAll("table.data-table thead th");
        const sortFields = [
          "number",
          "date",
          "buyer",
          "amount",
          "paymentStatus",
          "fulfillmentStatus",
          "status",
        ];
        headers.forEach((header, index) => {
          const field = sortFields[index];
          if (field) {
            if (!header.dataset.initialized) {
              header.dataset.initialized = "true";
              header.style.cursor = "pointer";
              header.style.userSelect = "none";
              header.style.position = "relative";

              header.addEventListener("mouseover", () => {
                header.style.backgroundColor = "#f1f5f9";
                header.style.color = "#1B4965";
              });
              header.addEventListener("mouseout", () => {
                header.style.backgroundColor = "";
                header.style.color = "";
              });

              header.addEventListener("click", () => {
                if (this.wixSortField === field) {
                  this.wixSortDir = this.wixSortDir === "asc" ? "desc" : "asc";
                } else {
                  this.wixSortField = field;
                  this.wixSortDir =
                    field === "date" || field === "amount" || field === "number"
                      ? "desc"
                      : "asc";
                }
                this.filterWixOrders();
              });
            }

            // Add/update sort-icon span
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

            if (field === this.wixSortField) {
              icon.style.display = "inline-flex";
              icon.textContent =
                this.wixSortDir === "asc" ? "arrow_upward" : "arrow_downward";
              icon.style.color = "#d17d39";
            } else {
              icon.style.display = "none";
            }
          }
        });
      }
    },

    clearWixFilters() {
      const queryEl = document.getElementById("wix-search");
      const payStatusEl = document.getElementById("wix-payment-status-filter");
      const ordStatusEl = document.getElementById("wix-order-status-filter");
      const fulfillmentStatusEl = document.getElementById(
        "wix-fulfillment-status-filter",
      );

      if (queryEl) queryEl.value = "";
      if (payStatusEl) payStatusEl.value = "all";
      if (ordStatusEl) ordStatusEl.value = "all";
      if (fulfillmentStatusEl) fulfillmentStatusEl.value = "all";

      this.filterWixOrders();
    },

    showWixOrderDetails(orderId) {
      const order = (this.wixOrders || []).find((o) => o._id === orderId);
      if (!order) return;

      const existing = document.getElementById("wix-order-modal");
      if (existing) existing.remove();

      const itemsHtml = (order.lineItems || [])
        .map((item) => {
          const price = parseFloat(item.price?.amount || 0);
          const qty = item.quantity || 1;
          const total = price * qty;
          const imgUrl = item.image
            ? item.image
                .replace(
                  "wix:image://v1/",
                  "https://static.wixstatic.com/media/",
                )
                .split("#")[0]
            : "";
          const imgHtml = imgUrl
            ? `<img src="${imgUrl}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" alt="${item.productName?.translated || item.productName?.original}">`
            : `<div style="width: 50px; height: 50px; border-radius: 8px; background: #e2e8f0; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-outlined" style="color:#94a3b8; font-size: 20px;">image</span></div>`;

          return `
                <div style="display:flex; gap:16px; align-items:center; padding:12px 0; border-bottom:1px solid #f1f5f9;">
                    ${imgHtml}
                    <div style="flex:1;">
                        <h4 style="font-weight:600; font-size:13px; margin:0; color:#0f172a;">${item.productName?.translated || item.productName?.original}</h4>
                        <p style="font-size:11px; color:#64748b; margin:4px 0 0;">${qty} stk x ${this.formatDonationCurrency(price)}</p>
                    </div>
                    <div style="font-weight:700; color:#0f172a; font-size:13px;">${this.formatDonationCurrency(total)}</div>
                </div>
            `;
        })
        .join("");

      const buyer =
        `${order.billingInfo?.contactDetails?.firstName || ""} ${order.billingInfo?.contactDetails?.lastName || ""}`.trim() ||
        order.buyerInfo?.email ||
        "Ukjent";
      const address = order.billingInfo?.address;
      const addressStr = address
        ? `${address.addressLine1 || ""}, ${address.postalCode || ""} ${address.city || ""}, ${address.countryFullname || ""}`
        : "Ingen adresse registrert";

      const modalHtml = `
            <div id="wix-order-modal" style="display:flex; position:fixed; inset:0; z-index:10000; align-items:center; justify-content:center; padding:20px;">
                <div class="modal-backdrop" onclick="document.getElementById('wix-order-modal').remove()" style="position:absolute; inset:0; background:rgba(15,23,42,.55); backdrop-filter:blur(8px);"></div>
                <div class="modal-content" style="max-width:600px; position:relative; max-height:min(90vh,700px); overflow:auto; width:100%; border-radius:16px; background:#fff; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1); display: flex; flex-direction: column;">
                    <div class="modal-header" style="padding:24px 32px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0; color:#1B4965; font-size: 18px; font-weight: 700;">Ordredetaljer #${order.number}</h3>
                            <p style="font-size:13px; color:#64748b; margin:4px 0 0;">Opprettet ${new Date(order._createdDate || order.purchasedDate).toLocaleString("no-NO")}</p>
                        </div>
                        <button class="modal-close" type="button" onclick="document.getElementById('wix-order-modal').remove()" style="font-size:28px; background:none; border:none; cursor:pointer; color:#94a3b8; line-height: 1; padding: 0 8px;">×</button>
                    </div>
                    <div class="modal-body" style="padding:24px 32px; display:flex; flex-direction:column; gap:20px; overflow-y: auto;">
                        <!-- Levering & Utsendelse status -->
                        <div style="display:flex; gap:24px; background:#f8fafc; border-radius:12px; padding:16px; border:1px solid #e2e8f0;">
                            <div>
                                <h4 style="font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; color:#64748b; margin:0 0 6px 0;">Leveringsstatus</h4>
                                ${
                                  order.fulfillmentStatus === "FULFILLED"
                                    ? '<span class="badge badge-success" style="background:#dcfce7; color:#15803d; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;">Sendt</span>'
                                    : '<span class="badge badge-warning" style="background:#ffedd5; color:#c2410c; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;">Ikke sendt / Behandles</span>'
                                }
                            </div>
                            <div style="border-left:1px solid #e2e8f0; padding-left:24px;">
                                <h4 style="font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; color:#64748b; margin:0 0 6px 0;">Betalingsstatus</h4>
                                ${
                                  order.paymentStatus === "PAID"
                                    ? '<span class="badge badge-success" style="background:#dcfce7; color:#15803d; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;">Betalt</span>'
                                    : '<span class="badge badge-warning" style="background:#fef9c3; color:#a16207; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;">Venter</span>'
                                }
                            </div>
                        </div>

                        <!-- Kundeinfo -->
                        <div>
                            <h4 style="font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; color:#64748b; margin:0 0 8px 0;">Kundeinfo</h4>
                            <p style="font-weight:600; margin:0; color:#0f172a; font-size: 14px;">${buyer}</p>
                            <p style="margin:4px 0 0; font-size:13px; color:#475569;">E-post: ${order.buyerInfo?.email || "Ingen"}</p>
                            <p style="margin:4px 0 0; font-size:13px; color:#475569;">Telefon: ${order.billingInfo?.contactDetails?.phone || "Ingen"}</p>
                        </div>

                        <!-- Adresse -->
                        <div>
                            <h4 style="font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; color:#64748b; margin:0 0 8px 0;">Fakturaadresse</h4>
                            <p style="font-size:13px; color:#475569; margin:0; line-height: 1.4;">${addressStr}</p>
                        </div>

                        <!-- Produkter -->
                        <div>
                            <h4 style="font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; color:#64748b; margin:0 0 8px 0;">Varer i bestillingen</h4>
                            <div style="display:flex; flex-direction:column;">
                                ${itemsHtml}
                            </div>
                        </div>

                        <!-- Pris-sammendrag -->
                        <div style="background:#f8fafc; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                            <div style="display:flex; justify-content:space-between; font-size:13px; color:#475569;">
                                <span>Subtotal</span>
                                <span>${this.formatDonationCurrency(parseFloat(order.priceSummary?.subtotal?.amount || 0))}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:13px; color:#475569;">
                                <span>Frakt</span>
                                <span>${this.formatDonationCurrency(parseFloat(order.priceSummary?.shipping?.amount || 0))}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-weight:700; font-size:15px; color:#0f172a; padding-top:8px; border-top:1px solid #e2e8f0; margin-top:4px;">
                                <span>Totalbeløp</span>
                                <span>${this.formatDonationCurrency(parseFloat(order.priceSummary?.total?.amount || 0))}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);
    },
  };
}
