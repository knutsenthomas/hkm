// school and giving methods for AdminManager.
export function createMethods15({ firebaseService, adminUtils, showErrorUI }) {
  return {
    bindDonationAdminFilters() {
      const addFilteredListener = (id, eventType, callback) => {
        const el = document.getElementById(id);
        if (el) {
          if (el.dataset.filtersBound) return;
          el.dataset.filtersBound = "true";
          el.addEventListener(eventType, callback);
        }
      };

      const setFilter = (key, value) => {
        if (typeof key === "object") {
          this.donationFilters = { ...(this.donationFilters || {}), ...key };
        } else {
          this.donationFilters = {
            ...(this.donationFilters || {}),
            [key]: value,
          };
        }

        // Sync values to DOM elements (legacy/fallback if still used somewhere)
        const presetEl = document.getElementById("global-date-preset");
        if (presetEl) presetEl.value = this.donationFilters.preset || "30";

        const startEl = document.getElementById("global-start-date");
        if (startEl) startEl.value = this.donationFilters.start || "";

        const endEl = document.getElementById("global-end-date");
        if (endEl) endEl.value = this.donationFilters.end || "";

        const customDates = document.getElementById("global-custom-dates");
        if (customDates)
          customDates.style.display =
            this.donationFilters.preset === "custom" ? "flex" : "none";

        // Sync causes period selector
        const causesPresetEl = document.getElementById("causes-date-preset");
        if (causesPresetEl)
          causesPresetEl.value = this.donationFilters.preset || "30";
        const causesStartEl = document.getElementById("causes-start-date");
        if (causesStartEl)
          causesStartEl.value = this.donationFilters.start || "";
        const causesEndEl = document.getElementById("causes-end-date");
        if (causesEndEl) causesEndEl.value = this.donationFilters.end || "";
        const causesCustomDates = document.getElementById(
          "causes-custom-dates",
        );
        if (causesCustomDates)
          causesCustomDates.style.display =
            this.donationFilters.preset === "custom" ? "flex" : "none";

        // Sync shop period selector
        const shopPresetEl = document.getElementById("shop-date-preset");
        if (shopPresetEl)
          shopPresetEl.value = this.donationFilters.preset || "30";
        const shopStartEl = document.getElementById("shop-start-date");
        if (shopStartEl) shopStartEl.value = this.donationFilters.start || "";
        const shopEndEl = document.getElementById("shop-end-date");
        if (shopEndEl) shopEndEl.value = this.donationFilters.end || "";
        const shopCustomDates = document.getElementById("shop-custom-dates");
        if (shopCustomDates)
          shopCustomDates.style.display =
            this.donationFilters.preset === "custom" ? "flex" : "none";

        const statusEl1 = document.getElementById("donation-status-filter");
        const statusEl2 = document.getElementById("donor-status-filter");
        if (statusEl1) statusEl1.value = this.donationFilters.status || "all";
        if (statusEl2) statusEl2.value = this.donationFilters.status || "all";

        const methodEl1 = document.getElementById("donation-method-filter");
        const methodEl2 = document.getElementById("donor-method-filter");
        if (methodEl1) methodEl1.value = this.donationFilters.method || "all";
        if (methodEl2) methodEl2.value = this.donationFilters.method || "all";

        const typeEl1 = document.getElementById("donation-type-filter");
        const typeEl2 = document.getElementById("donor-type-filter");
        if (typeEl1) typeEl1.value = this.donationFilters.type || "all";
        if (typeEl2) typeEl2.value = this.donationFilters.type || "all";

        const queryEl = document.getElementById("donation-search");
        if (queryEl) queryEl.value = this.donationFilters.query || "";

        const donorQueryEl = document.getElementById("donor-search");
        if (donorQueryEl)
          donorQueryEl.value = this.donationFilters.donorQuery || "";

        const donorSortEl = document.getElementById("donor-sort-by");
        if (donorSortEl)
          donorSortEl.value = this.donationFilters.donorSortBy || "latestDate";

        // Sync shop tab elements
        const shopStatusEl = document.getElementById("shop-status-filter");
        if (shopStatusEl)
          shopStatusEl.value = this.donationFilters.shopStatus || "all";

        const shopMethodEl = document.getElementById("shop-method-filter");
        if (shopMethodEl)
          shopMethodEl.value = this.donationFilters.shopMethod || "all";

        const shopQueryEl = document.getElementById("shop-search");
        if (shopQueryEl)
          shopQueryEl.value = this.donationFilters.shopQuery || "";

        this.renderDonationAdminViews();
        this.renderGiftsDashboard();
        this.renderInKindDonations();
        this.renderWixStats();
        this.renderKursShopViews();
      };

      // Legacy period listeners
      addFilteredListener("global-date-preset", "change", (event) =>
        setFilter("preset", event.target.value),
      );
      addFilteredListener("global-start-date", "change", (event) =>
        setFilter("start", event.target.value),
      );
      addFilteredListener("global-end-date", "change", (event) =>
        setFilter("end", event.target.value),
      );

      // Causes period listeners
      addFilteredListener("causes-date-preset", "change", (event) =>
        setFilter("preset", event.target.value),
      );
      addFilteredListener("causes-start-date", "change", (event) =>
        setFilter("start", event.target.value),
      );
      addFilteredListener("causes-end-date", "change", (event) =>
        setFilter("end", event.target.value),
      );

      // Shop period listeners
      addFilteredListener("shop-date-preset", "change", (event) =>
        setFilter("preset", event.target.value),
      );
      addFilteredListener("shop-start-date", "change", (event) =>
        setFilter("start", event.target.value),
      );
      addFilteredListener("shop-end-date", "change", (event) =>
        setFilter("end", event.target.value),
      );

      // Donation tab listeners
      addFilteredListener("donation-status-filter", "change", (event) =>
        setFilter("status", event.target.value),
      );
      addFilteredListener("donation-method-filter", "change", (event) =>
        setFilter("method", event.target.value),
      );
      addFilteredListener("donation-type-filter", "change", (event) =>
        setFilter("type", event.target.value),
      );
      addFilteredListener("donation-search", "input", (event) =>
        setFilter("query", event.target.value),
      );

      // Donor tab listeners
      addFilteredListener("donor-status-filter", "change", (event) =>
        setFilter("status", event.target.value),
      );
      addFilteredListener("donor-method-filter", "change", (event) =>
        setFilter("method", event.target.value),
      );
      addFilteredListener("donor-type-filter", "change", (event) =>
        setFilter("type", event.target.value),
      );
      addFilteredListener("donor-search", "input", (event) =>
        setFilter("donorQuery", event.target.value),
      );
      addFilteredListener("donor-sort-by", "change", (event) => {
        const val = event.target.value;
        const dir = val === "name" ? "asc" : "desc";
        setFilter({
          donorSortBy: val,
          donorSortDir: dir,
        });
      });

      // Shop tab listeners
      addFilteredListener("shop-status-filter", "change", (event) =>
        setFilter("shopStatus", event.target.value),
      );
      addFilteredListener("shop-method-filter", "change", (event) =>
        setFilter("shopMethod", event.target.value),
      );
      addFilteredListener("shop-search", "input", (event) =>
        setFilter("shopQuery", event.target.value),
      );

      // Sortable table headers listeners
      document.querySelectorAll(".sortable-header").forEach((header) => {
        if (!header.dataset.sortBound) {
          header.dataset.sortBound = "true";
          header.addEventListener("click", () => {
            const field = header.dataset.sort;
            const currentSortBy =
              this.donationFilters.donorSortBy || "latestDate";
            const currentSortDir = this.donationFilters.donorSortDir || "desc";

            let nextDir = "desc";
            if (field === currentSortBy) {
              nextDir = currentSortDir === "desc" ? "asc" : "desc";
            } else {
              nextDir = field === "name" ? "asc" : "desc";
            }

            setFilter({
              donorSortBy: field,
              donorSortDir: nextDir,
            });
          });
        }
      });

      addFilteredListener("add-manual-donation-btn", "click", () =>
        this.openManualDonationModal(),
      );
      addFilteredListener("open-bank-import-btn", "click", () =>
        this.openBankImportModal(),
      );
      addFilteredListener("cancel-bank-import-btn", "click", () =>
        this.closeBankImportModal(),
      );
      addFilteredListener("bank-import-file", "change", (event) =>
        this.handleBankImportFile(event.target.files?.[0]),
      );
      addFilteredListener("save-bank-import-btn", "click", () =>
        this.saveBankImportRows(),
      );
      addFilteredListener("cancel-manual-donation-btn", "click", () =>
        this.closeManualDonationModal(),
      );
      addFilteredListener("manual-donation-user", "change", (event) =>
        this.handleManualDonationUserSelect(event.target.value),
      );
      addFilteredListener("manual-donation-form", "submit", (event) => {
        event.preventDefault();
        this.saveManualDonation();
      });

      // Report print triggers
      addFilteredListener("print-donations-report-btn", "click", () =>
        this.printReport("donations"),
      );
      addFilteredListener("print-donors-report-btn", "click", () =>
        this.printReport("donors"),
      );
      addFilteredListener("print-shop-report-btn", "click", () =>
        this.printReport("shop"),
      );

      const clearFilters = () => {
        this.donationFilters = {
          preset: "30",
          status: "all",
          method: "all",
          type: "all",
          query: "",
          donorQuery: "",
          donorSortBy: "latestDate",
          donorSortDir: "desc",
          start: "",
          end: "",
          shopStatus: "all",
          shopMethod: "all",
          shopQuery: "",
        };

        const presetEl = document.getElementById("global-date-preset");
        if (presetEl) presetEl.value = "30";

        const startEl = document.getElementById("global-start-date");
        if (startEl) startEl.value = "";

        const endEl = document.getElementById("global-end-date");
        if (endEl) endEl.value = "";

        const customDates = document.getElementById("global-custom-dates");
        if (customDates) customDates.style.display = "none";

        // Clear causes inputs
        const causesPresetEl = document.getElementById("causes-date-preset");
        if (causesPresetEl) causesPresetEl.value = "30";
        const causesStartEl = document.getElementById("causes-start-date");
        if (causesStartEl) causesStartEl.value = "";
        const causesEndEl = document.getElementById("causes-end-date");
        if (causesEndEl) causesEndEl.value = "";
        const causesCustomDates = document.getElementById(
          "causes-custom-dates",
        );
        if (causesCustomDates) causesCustomDates.style.display = "none";

        // Clear shop inputs
        const shopPresetEl = document.getElementById("shop-date-preset");
        if (shopPresetEl) shopPresetEl.value = "30";
        const shopStartEl = document.getElementById("shop-start-date");
        if (shopStartEl) shopStartEl.value = "";
        const shopEndEl = document.getElementById("shop-end-date");
        if (shopEndEl) shopEndEl.value = "";
        const shopCustomDates = document.getElementById("shop-custom-dates");
        if (shopCustomDates) shopCustomDates.style.display = "none";

        const statusEl1 = document.getElementById("donation-status-filter");
        const statusEl2 = document.getElementById("donor-status-filter");
        if (statusEl1) statusEl1.value = "all";
        if (statusEl2) statusEl2.value = "all";

        const methodEl1 = document.getElementById("donation-method-filter");
        const methodEl2 = document.getElementById("donor-method-filter");
        if (methodEl1) methodEl1.value = "all";
        if (methodEl2) methodEl2.value = "all";

        const typeEl1 = document.getElementById("donation-type-filter");
        const typeEl2 = document.getElementById("donor-type-filter");
        if (typeEl1) typeEl1.value = "all";
        if (typeEl2) typeEl2.value = "all";

        const qEl = document.getElementById("donation-search");
        if (qEl) qEl.value = "";

        const dqEl = document.getElementById("donor-search");
        if (dqEl) dqEl.value = "";

        const dSortEl = document.getElementById("donor-sort-by");
        if (dSortEl) dSortEl.value = "latestDate";

        const shopStatusEl = document.getElementById("shop-status-filter");
        if (shopStatusEl) shopStatusEl.value = "all";

        const shopMethodEl = document.getElementById("shop-method-filter");
        if (shopMethodEl) shopMethodEl.value = "all";

        const shopQueryEl = document.getElementById("shop-search");
        if (shopQueryEl) shopQueryEl.value = "";

        this.renderDonationAdminViews();
        this.renderGiftsDashboard();
        this.renderInKindDonations();
        this.renderWixStats();
      };

      addFilteredListener("donation-clear-filters", "click", clearFilters);
      addFilteredListener("donor-clear-filters", "click", clearFilters);
      addFilteredListener("shop-clear-filters", "click", clearFilters);

      // Drag & Drop listeners for Premium Bank Import Dropzone
      const dropzone = document.getElementById("bank-import-dropzone");
      const fileInput = document.getElementById("bank-import-file");
      if (dropzone && fileInput && !dropzone.dataset.dropzoneBound) {
        dropzone.dataset.dropzoneBound = "true";
        dropzone.addEventListener("click", () => fileInput.click());

        dropzone.addEventListener("dragover", (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "#1B4965";
          dropzone.style.background = "#f0f4f8";
        });

        dropzone.addEventListener("dragleave", () => {
          const hasFile = fileInput.files && fileInput.files.length > 0;
          dropzone.style.borderColor = hasFile ? "#10b981" : "#cbd5e1";
          dropzone.style.background = hasFile ? "#f0fdf4" : "#f8fafc";
        });

        dropzone.addEventListener("drop", (e) => {
          e.preventDefault();
          const file = e.dataTransfer?.files?.[0];
          if (file) {
            fileInput.files = e.dataTransfer.files;
            this.handleBankImportFile(file);
          } else {
            const hasFile = fileInput.files && fileInput.files.length > 0;
            dropzone.style.borderColor = hasFile ? "#10b981" : "#cbd5e1";
            dropzone.style.background = hasFile ? "#f0fdf4" : "#f8fafc";
          }
        });
      }

      // Shop Manual Entry listeners
      addFilteredListener("open-manual-sale-btn", "click", () =>
        this.openManualSaleModal(),
      );
      addFilteredListener("cancel-manual-sale-btn", "click", () =>
        this.closeManualSaleModal(),
      );
      addFilteredListener("manual-sale-user", "change", (event) =>
        this.handleManualSaleUserSelect(event.target.value),
      );
      addFilteredListener("manual-sale-form", "submit", (event) => {
        event.preventDefault();
        const modal = document.getElementById("manual-sale-modal");
        const editId = modal?.dataset?.editId;
        if (editId) {
          this.saveEditSale(editId);
        } else {
          this.saveManualSale();
        }
      });

      // Wix Product Autocalculation listeners
      const qtyInput = document.getElementById("manual-sale-quantity");
      const amountInput = document.getElementById("manual-sale-amount");
      const updateAutoAmount = () => {
        const hiddenInput = document.getElementById("manual-sale-product");
        const selectedId = hiddenInput?.value;
        if (selectedId && selectedId !== "custom") {
          const product = this.wixProducts?.find((p) => p.id === selectedId);
          if (product) {
            const qty = parseInt(qtyInput?.value || 1, 10);
            if (amountInput)
              amountInput.value = (product.price * qty).toFixed(2);
          }
        }
      };
      addFilteredListener("manual-sale-quantity", "input", updateAutoAmount);

      // Wix Product Search listener
      addFilteredListener("manual-sale-product-search", "input", (event) => {
        this.filterWixProducts(event.target.value);
      });

      // Shop CSV Import listeners
      addFilteredListener("open-shop-csv-import-btn", "click", () =>
        this.openShopCsvImportModal(),
      );
      addFilteredListener("cancel-shop-csv-import-btn", "click", () =>
        this.closeShopCsvImportModal(),
      );
      addFilteredListener("shop-csv-import-file", "change", (event) =>
        this.handleShopCsvImportFile(event.target.files?.[0]),
      );
      addFilteredListener("save-shop-csv-import-btn", "click", () =>
        this.saveShopCsvImportRows(),
      );

      const shopDropzone = document.getElementById("shop-csv-import-dropzone");
      const shopFileInput = document.getElementById("shop-csv-import-file");
      if (
        shopDropzone &&
        shopFileInput &&
        !shopDropzone.dataset.dropzoneBound
      ) {
        shopDropzone.dataset.dropzoneBound = "true";
        shopDropzone.addEventListener("click", () => shopFileInput.click());

        shopDropzone.addEventListener("dragover", (e) => {
          e.preventDefault();
          shopDropzone.style.borderColor = "#1B4965";
          shopDropzone.style.background = "#f0f4f8";
        });

        shopDropzone.addEventListener("dragleave", () => {
          const hasFile = shopFileInput.files && shopFileInput.files.length > 0;
          shopDropzone.style.borderColor = hasFile ? "#10b981" : "#cbd5e1";
          shopDropzone.style.background = hasFile ? "#f0fdf4" : "#f8fafc";
        });

        shopDropzone.addEventListener("drop", (e) => {
          e.preventDefault();
          const file = e.dataTransfer?.files?.[0];
          if (file) {
            shopFileInput.files = e.dataTransfer.files;
            this.handleShopCsvImportFile(file);
          } else {
            const hasFile =
              shopFileInput.files && shopFileInput.files.length > 0;
            shopDropzone.style.borderColor = hasFile ? "#10b981" : "#cbd5e1";
            shopDropzone.style.background = hasFile ? "#f0fdf4" : "#f8fafc";
          }
        });
      }
    },

    async renderCoursesManager() {
      const section = document.getElementById("courses-section");
      if (!section) return;

      section.innerHTML = `
            <style>
                .rte-wrapper {
                    display: flex;
                    flex-direction: column;
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    overflow: hidden;
                    background: #ffffff;
                    transition: all 0.3s ease;
                    margin-top: 4px;
                    box-sizing: border-box;
                }
                .rte-wrapper:focus-within {
                    border-color: #d17d39;
                    box-shadow: 0 0 0 2px rgba(209, 125, 57, 0.15);
                }
                .rte-toolbar {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 8px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    flex-wrap: wrap;
                }
                .rte-btn {
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    border: none;
                    background: transparent;
                    color: #475569;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    padding: 0;
                }
                .rte-btn .material-symbols-outlined {
                    font-size: 18px;
                }
                .rte-btn:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }
                .rte-btn.active {
                    background: rgba(209, 125, 57, 0.1);
                    color: #d17d39;
                }
                .rte-divider {
                    width: 1px;
                    height: 18px;
                    background: #cbd5e1;
                    margin: 0 4px;
                }
                .rte-editor {
                    min-height: 100px;
                    max-height: 250px;
                    overflow-y: auto;
                    padding: 12px;
                    font-size: 14px;
                    color: #1e293b;
                    outline: none;
                    background: #ffffff;
                }
                .rte-editor:empty::before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    pointer-events: none;
                }
                .sub-tab-btn {
                    background: none;
                    border: none;
                    font-weight: 600;
                    padding: 12px 20px;
                    cursor: pointer;
                    color: #64748b;
                    border-bottom: 2px solid transparent;
                    transition: all 0.3s ease;
                    outline: none;
                    font-family: inherit;
                    font-size: 0.95rem;
                }
                .sub-tab-btn.active {
                    color: #1B4965;
                    border-bottom: 2px solid #1B4965;
                }
                #courses-tab-view .design-ui-header,
                #enrollments-tab-view .design-ui-header {
                    position: relative;
                    display: flex !important;
                    align-items: center !important;
                    gap: 20px !important;
                    padding: 24px 32px !important;
                    margin: 24px 0 32px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    background: #fff !important;
                    border: 1px solid var(--admin-page-panel-border) !important;
                    border-radius: 16px !important;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02) !important;
                    text-align: left !important;
                }
                #courses-tab-view .design-ui-header > *,
                #enrollments-tab-view .design-ui-header > * {
                    position: relative;
                    z-index: 1;
                }
                #courses-tab-view .design-ui-header .section-header-content,
                #enrollments-tab-view .design-ui-header .section-header-content {
                    min-width: 0;
                    flex: 1;
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 16px !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    text-align: left !important;
                }
                #courses-tab-view .design-ui-header .section-header-titles,
                #enrollments-tab-view .design-ui-header .section-header-titles {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                    text-align: left !important;
                    align-items: flex-start !important;
                }
                #courses-tab-view .design-ui-header .section-title,
                #enrollments-tab-view .design-ui-header .section-title {
                    text-align: left !important;
                    font-size: 18px !important;
                    font-weight: 800 !important;
                    color: #111827 !important;
                }
                #courses-tab-view .design-ui-header .section-subtitle,
                #enrollments-tab-view .design-ui-header .section-subtitle,
                #finance-tab-view .design-ui-header .section-subtitle {
                    text-align: left !important;
                    font-size: 13px !important;
                    color: var(--admin-page-muted) !important;
                }
                #finance-tab-view .design-ui-header {
                    position: relative;
                    display: flex !important;
                    align-items: center !important;
                    gap: 20px !important;
                    padding: 24px 32px !important;
                    margin: 24px 0 32px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    background: #fff !important;
                    border: 1px solid var(--admin-page-panel-border) !important;
                    border-radius: 16px !important;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02) !important;
                    text-align: left !important;
                }
                #finance-tab-view .design-ui-header > * {
                    position: relative;
                    z-index: 1;
                }
                #finance-tab-view .design-ui-header .section-header-content {
                    min-width: 0;
                    flex: 1;
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 16px !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    text-align: left !important;
                }
                #finance-tab-view .design-ui-header .section-header-titles {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                    text-align: left !important;
                    align-items: flex-start !important;
                }
                #finance-tab-view .design-ui-header .section-title {
                    text-align: left !important;
                    font-size: 18px !important;
                    font-weight: 800 !important;
                    color: #111827 !important;
                }
                #finance-tab-view .design-ui-header .section-subtitle {
                    text-align: left !important;
                    font-size: 13px !important;
                    color: var(--admin-page-muted) !important;
                }
            </style>

            <!-- Sub-tab Bar -->
            <div class="courses-sub-tabs" style="display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; padding-bottom: 0;">
                <button class="sub-tab-btn active" id="courses-list-tab-btn">Kursliste</button>
                <button class="sub-tab-btn" id="courses-enrollments-tab-btn">Påmeldinger & Tilganger</button>
                <button class="sub-tab-btn" id="courses-finance-tab-btn">Økonomi</button>
            </div>

            <!-- VIEW 1: COURSES VIEW -->
            <div id="courses-tab-view">
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:16px;">
                    <button class="btn btn-secondary" id="see-course-purchases-btn" type="button" style="display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; padding:8px 16px; border-radius:8px; font-weight:600; font-size:13px; cursor:pointer;" onclick="if(window.adminManager?.navigateToShopTab){window.adminManager.navigateToShopTab('kurs');}else if(typeof window.handleSectionSwitch==='function'){window.handleSectionSwitch('shop');}else{window.location.hash='shop';}">
                        <span class="material-symbols-outlined" style="font-size:18px;">payments</span> Se kurskjøp
                    </button>
                    <button class="btn btn-primary" id="create-course-btn">
                        <span class="material-symbols-outlined">add</span> Nytt kurs
                    </button>
                </div>

                <div class="design-ui-shell">
                    <div class="design-ui-workspace" style="padding: 0;">
                        <div class="design-ui-panel" style="border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                            <div id="courses-list">
                                <div class="loader" style="text-align:center;padding:40px;color:#94a3b8;">Laster kurs...</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Course Modal -->
                <div id="course-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;overflow-y:auto;padding:20px;">
                    <div style="background:white;border-radius:16px;max-width:780px;margin:20px auto;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                            <h3 id="course-modal-title" style="font-size:1.4rem;font-weight:700;">Nytt kurs</h3>
                            <button id="close-course-modal" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.5rem;">&times;</button>
                        </div>

                        <form id="course-form">
                            <input type="hidden" id="course-id">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                                <div style="grid-column:span 2;">
                                    <label style="display:block;font-weight:600;margin-bottom:6px;">Kurstitel *</label>
                                    <input id="course-title" type="text" placeholder="Eks: Identitet i Kristus" required
                                        style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                                </div>
                                <div style="grid-column:span 2;">
                                    <label style="display:block;font-weight:600;margin-bottom:6px;">Beskrivelse</label>
                                    <textarea id="course-description" rows="3" placeholder="Hva lærer studentene?"
                                        style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:1rem;resize:vertical;"></textarea>
                                </div>
                                <div>
                                    <label style="display:block;font-weight:600;margin-bottom:6px;">Kategori</label>
                                    <select id="course-category" style="width:100%;padding:12px 42px 12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;background-color:white;margin-bottom:8px;">
                                        <option value="Bibelstudium">Bibelstudium</option>
                                        <option value="Bønn">Bønn</option>
                                        <option value="Lederskap">Lederskap</option>
                                        <option value="Helbredelse">Helbredelse</option>
                                        <option value="Evangelisering">Evangelisering</option>
                                        <option value="Identitet">Identitet</option>
                                        <option value="Annet">Annet</option>
                                    </select>
                                    <div id="new-category-container" style="display:none;">
                                        <input id="course-new-category" type="text" placeholder="Skriv ny kategori..."
                                            style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                                    </div>
                                </div>
                                <div style="grid-column:span 2; background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; margin-top:4px;">
                                    <label style="display:block;font-weight:700;margin-bottom:8px;color:#1e293b;font-size:0.95rem;">
                                        Prismodell (Hvordan skal kurset prises?)
                                    </label>
                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                                        <label id="pricing-model-course-label" style="display:flex; align-items:flex-start; gap:10px; padding:12px 14px; background:#fffbf7; border:1.5px solid #d17d39; border-radius:10px; cursor:pointer; transition:all 0.2s;">
                                            <input type="radio" name="course-pricing-type" id="pricing-model-course" value="course" checked style="accent-color:#d17d39; margin-top:2px;">
                                            <div>
                                                <strong style="display:block; font-size:0.92rem; color:#1e293b;">🎓 Fast pris for hele kurset</strong>
                                                <span style="display:block; font-size:0.8rem; color:#64748b; margin-top:2px;">Én samlet pris for hele kurset (gir automatisk tilgang til alle leksjoner).</span>
                                            </div>
                                        </label>
                                        <label id="pricing-model-lesson-label" style="display:flex; align-items:flex-start; gap:10px; padding:12px 14px; background:white; border:1.5px solid #e2e8f0; border-radius:10px; cursor:pointer; transition:all 0.2s;">
                                            <input type="radio" name="course-pricing-type" id="pricing-model-lesson" value="per_lesson" style="accent-color:#d17d39; margin-top:2px;">
                                            <div>
                                                <strong style="display:block; font-size:0.92rem; color:#1e293b;">📝 Pris pr. leksjon</strong>
                                                <span style="display:block; font-size:0.8rem; color:#64748b; margin-top:2px;">Deltaker kan velge og betale for enkeltleksjoner ved påmelding.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label id="course-price-label" style="display:block;font-weight:600;margin-bottom:6px;">Pris for hele kurset (NOK) – 0 = gratis</label>
                                    <input id="course-price" type="number" min="0" placeholder="0" value="0"
                                        style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                                </div>
                                <div>
                                    <label style="display:block;font-weight:600;margin-bottom:6px;">Pris-tekst / Suffix (f.eks. "totalt", "pr. leksjon")</label>
                                    <input id="course-price-suffix" type="text" placeholder="Eks: totalt (eller la stå tomt)"
                                        style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                                    <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;" id="suffix-quick-chips">
                                        <button type="button" class="btn-suffix-chip" data-val="totalt" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">+ "totalt"</button>
                                        <button type="button" class="btn-suffix-chip" data-val="for hele kurset" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">+ "for hele kurset"</button>
                                        <button type="button" class="btn-suffix-chip" data-val="" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">Bare "kr" (tom)</button>
                                    </div>
                                </div>
                                <div style="grid-column:span 2;">
                                    <label style="display:block;font-weight:600;margin-bottom:6px;">Forsidebilde URL</label>
                                    <div style="display: flex; gap: 10px;">
                                        <input id="course-image" type="url" placeholder="https://..."
                                            style="flex: 1; padding:12px 16px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:1rem;">
                                        <button type="button" id="course-unsplash-btn" class="btn btn-secondary" style="padding: 10px 16px; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; line-height: 1;">
                                            <span class="material-symbols-outlined" style="font-size:1.15rem;transform:none !important;line-height:1;">image_search</span> Unsplash
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Lessons -->
                            <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:4px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                                    <h4 style="font-size:1rem;font-weight:700;">Leksjoner</h4>
                                    <button type="button" id="add-lesson-btn" style="background:#fff8f0;color:#e07b39;border:1.5px solid #ffd5b0;padding:7px 14px;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;line-height:1;">
                                        <span class="material-symbols-outlined" style="font-size:1.15rem;transform:none !important;line-height:1;">add</span> Legg til leksjon
                                    </button>
                                </div>
                                <div id="lessons-container" style="display:flex;flex-direction:column;gap:12px;"></div>
                            </div>

                            <div style="display:flex;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
                                <button type="submit" id="save-course-btn" class="btn-primary" style="padding:12px 28px;border-radius:10px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;line-height:1;">
                                    <span class="material-symbols-outlined" style="font-size:1.15rem;transform:none !important;line-height:1;">save</span> Lagre kurs
                                </button>
                                <button type="button" id="delete-course-btn" style="display:none;padding:12px 20px;border-radius:10px;background:white;color:#ef4444;border:1.5px solid #fee2e2;font-weight:600;cursor:pointer;">
                                    Slett kurs
                                </button>
                            </div>
                            <p id="course-save-status" style="margin-top:12px;font-size:0.85rem;"></p>
                        </form>
                    </div>
                </div>
            </div>

            <!-- VIEW 2: ENROLLMENTS VIEW -->
            <div id="enrollments-tab-view" style="display: none;">
                <div class="design-ui-shell">
                    <!-- Search & Filter Controls -->
                    <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; background: white; padding: 16px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.02); align-items: center;">
                        <div style="flex: 1; min-width: 200px; position: relative;">
                            <input type="text" id="enrollment-search" placeholder="Søk på navn eller e-post..." style="width: 100%; padding: 10px 16px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem;">
                        </div>
                        <div style="min-width: 180px;">
                            <select id="enrollment-course-filter" style="width: 100%; padding: 10px 42px 10px 16px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; background-color: white; font-family: inherit;">
                                <option value="">Alle kurs</option>
                            </select>
                        </div>
                        <div style="min-width: 180px;">
                            <select id="enrollment-status-filter" style="width: 100%; padding: 10px 42px 10px 16px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; background-color: white; font-family: inherit;">
                                <option value="">Alle statuser</option>
                                <option value="pending">Venter (Standard)</option>
                                <option value="pending_stripe">Venter (Stripe)</option>
                                <option value="pending_vipps">Venter (Vipps)</option>
                                <option value="paid">Godkjent (Paid)</option>
                                <option value="success">Godkjent (Success)</option>
                                <option value="refunded">Refundert</option>
                            </select>
                        </div>
                    </div>

                    <div class="design-ui-workspace" style="padding: 0;">
                        <div class="design-ui-panel" style="border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                            <div id="enrollments-list">
                                <div class="loader" style="text-align:center;padding:40px;color:#94a3b8;">Laster påmeldinger...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VIEW 3: FINANCE VIEW -->
            <div id="finance-tab-view" style="display: none;">
                <div class="design-ui-shell">
                    <!-- Key stats cards grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 16px; margin-bottom: 24px;">
                        <div class="design-ui-panel" style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Total Omsetning</div>
                            <div id="finance-total-revenue" style="font-size: 24px; font-weight: 800; color: #1B4965;">kr 0</div>
                            <div style="font-size: 12px; color: #16a34a; font-weight: 500;">Fra godkjente betalinger</div>
                        </div>
                        <div class="design-ui-panel" style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Utestående beløp</div>
                            <div id="finance-pending-revenue" style="font-size: 24px; font-weight: 800; color: #d17d39;">kr 0</div>
                            <div style="font-size: 12px; color: #64748b; font-weight: 500;">Registreringer til godkjenning</div>
                        </div>
                        <div class="design-ui-panel" style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Refundert beløp</div>
                            <div id="finance-refunded-revenue" style="font-size: 24px; font-weight: 800; color: #ef4444;">kr 0</div>
                            <div style="font-size: 12px; color: #64748b; font-weight: 500;">Avbrutte påmeldinger</div>
                        </div>
                        <div class="design-ui-panel" style="padding: 20px; border-radius: 12px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Betalte kursdeltakere</div>
                            <div id="finance-paid-count" style="font-size: 24px; font-weight: 800; color: #1e293b;">0</div>
                            <div style="font-size: 12px; color: #64748b; font-weight: 500;">Aktive betalte lisenser</div>
                        </div>
                    </div>

                    <!-- Revenue breakdown per course -->
                    <div style="display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 24px;">
                        <div class="design-ui-panel" style="padding: 24px; border-radius: 16px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                            <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 16px;">Omsetning per kurs</h3>
                            <div id="finance-courses-breakdown">
                                <div class="loader" style="text-align:center;padding:20px;color:#94a3b8;">Beregner...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Lesson Access Modal -->
            <div id="lesson-access-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2000;overflow-y:auto;padding:20px;">
                <div style="background:white;border-radius:16px;max-width:500px;margin:80px auto;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                        <h3 style="font-size:1.25rem;font-weight:700;color:#1B4965;margin:0;">Leksjonstilgang</h3>
                        <button id="close-lesson-access-modal" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.5rem;padding:0;line-height:1;">&times;</button>
                    </div>
                    <p style="font-size:14px;color:#64748b;margin-bottom:20px;line-height:1.5;">
                        Velg hvilke leksjoner denne brukeren skal ha tilgang til. Huker du av alle (eller ingen), vil brukeren ha tilgang til hele kurset.
                    </p>
                    <form id="lesson-access-form">
                        <input type="hidden" id="access-enrollment-id">
                        <div id="lesson-checkboxes-container" style="display:flex;flex-direction:column;gap:12px;margin-bottom:24px;max-height:280px;overflow-y:auto;padding-right:8px;">
                            <!-- Dynamic checkboxes -->
                        </div>
                        <div style="display:flex;gap:12px;justify-content:flex-end;border-top:1px solid #e2e8f0;padding-top:20px;">
                            <button type="button" id="cancel-lesson-access" style="padding:10px 16px;border-radius:8px;border:1.5px solid #cbd5e1;background:white;font-weight:600;cursor:pointer;font-family:inherit;">Avbryt</button>
                            <button type="submit" style="padding:10px 20px;border-radius:8px;background:#1B4965;color:white;border:none;font-weight:600;cursor:pointer;font-family:inherit;">Lagre tilgang</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
      section.setAttribute("data-rendered", "true");

      // Load courses
      this._ensureCoursesRealtimeSubscription();
      await this._loadCoursesList();

      // Course actions
      const createCourseBtn =
        document.getElementById("create-course-btn") ||
        document.getElementById("new-course-btn");
      const closeCourseModalBtn = document.getElementById("close-course-modal");
      const courseModal = document.getElementById("course-modal");
      const addLessonBtn = document.getElementById("add-lesson-btn");
      const courseForm = document.getElementById("course-form");
      const deleteCourseBtn = document.getElementById("delete-course-btn");

      createCourseBtn?.addEventListener("click", () => this._openCourseModal());
      const seeCoursePurchasesBtn = document.getElementById(
        "see-course-purchases-btn",
      );
      seeCoursePurchasesBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        this.navigateToShopTab("kurs");
      });
      closeCourseModalBtn?.addEventListener("click", () =>
        this._closeCourseModal(),
      );
      courseModal?.addEventListener("click", (e) => {
        if (e.target === courseModal) this._closeCourseModal();
      });
      addLessonBtn?.addEventListener("click", () => this._addLessonRow());
      courseForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        this._saveCourse();
      });
      deleteCourseBtn?.addEventListener("click", () => this._deleteCourse());

      document
        .querySelectorAll('input[name="course-pricing-type"]')
        .forEach((radio) => {
          radio.addEventListener("change", () => {
            this._updatePricingModelUI();
          });
        });
      document
        .getElementById("pricing-model-course-label")
        ?.addEventListener("click", (e) => {
          if (e.target.tagName !== "INPUT") {
            const radio = document.getElementById("pricing-model-course");
            if (radio) {
              radio.checked = true;
              this._updatePricingModelUI("course");
            }
          }
        });
      document
        .getElementById("pricing-model-lesson-label")
        ?.addEventListener("click", (e) => {
          if (e.target.tagName !== "INPUT") {
            const radio = document.getElementById("pricing-model-lesson");
            if (radio) {
              radio.checked = true;
              this._updatePricingModelUI("per_lesson");
            }
          }
        });

      // Tab selection & routing
      const listTabBtn = document.getElementById("courses-list-tab-btn");
      const enrollmentsTabBtn = document.getElementById(
        "courses-enrollments-tab-btn",
      );
      const financeTabBtn = document.getElementById("courses-finance-tab-btn");
      const coursesView = document.getElementById("courses-tab-view");
      const enrollmentsView = document.getElementById("enrollments-tab-view");
      const financeView = document.getElementById("finance-tab-view");

      listTabBtn?.addEventListener("click", () => {
        listTabBtn?.classList.add("active");
        enrollmentsTabBtn?.classList.remove("active");
        financeTabBtn?.classList.remove("active");
        if (coursesView) coursesView.style.display = "block";
        if (enrollmentsView) enrollmentsView.style.display = "none";
        if (financeView) financeView.style.display = "none";
      });

      enrollmentsTabBtn?.addEventListener("click", async () => {
        enrollmentsTabBtn?.classList.add("active");
        listTabBtn?.classList.remove("active");
        financeTabBtn?.classList.remove("active");
        if (coursesView) coursesView.style.display = "none";
        if (enrollmentsView) enrollmentsView.style.display = "block";
        if (financeView) financeView.style.display = "none";
        await this._loadEnrollmentsList();
      });

      financeTabBtn?.addEventListener("click", async () => {
        financeTabBtn?.classList.add("active");
        listTabBtn?.classList.remove("active");
        enrollmentsTabBtn?.classList.remove("active");
        if (coursesView) coursesView.style.display = "none";
        if (enrollmentsView) enrollmentsView.style.display = "none";
        if (financeView) financeView.style.display = "block";
        await this._loadFinanceData();
      });

      // Search & Filter event bindings
      const searchInput = document.getElementById("enrollment-search");
      searchInput?.addEventListener("input", () =>
        this._renderEnrollmentsList(),
      );

      const courseFilter = document.getElementById("enrollment-course-filter");
      courseFilter?.addEventListener("change", () =>
        this._renderEnrollmentsList(),
      );

      const statusFilter = document.getElementById("enrollment-status-filter");
      statusFilter?.addEventListener("change", () =>
        this._renderEnrollmentsList(),
      );
    },

    async _loadCoursesList() {
      const list = document.getElementById("courses-list");
      if (!list) return;
      try {
        const data =
          typeof firebaseService.getSiteContent === "function"
            ? await firebaseService.getSiteContent("collection_courses")
            : null;
        const items = Array.isArray(data) ? data : data?.items || [];
        this.coursesItems = items;

        if (items.length === 0) {
          list.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:#f8fafc;border-radius:16px;border:2px dashed #e2e8f0;">
                    <span class="material-symbols-outlined" style="font-size:48px;color:#94a3b8;display:block;margin-bottom:12px;">menu_book</span>
                    <p style="color:#64748b;font-size:1rem;">Ingen kurs opprettet ennå. Klikk "Nytt kurs" for å komme i gang.</p>
                </div>`;
          return;
        }

        const rows = items
          .map((course, i) => {
            const title = this.escapeHtml(course.title || "Uten tittel");
            const description = this.escapeHtml(
              (course.description || "").trim(),
            );
            const shortDesc =
              description.length > 40
                ? `${description.slice(0, 40).trim()}...`
                : description;
            const category = course.category
              ? this.escapeHtml(course.category)
              : "—";
            const lessonsCount = Array.isArray(course.lessons)
              ? course.lessons.length
              : 0;
            const price = Number(course.price || 0);
            const pricingModel =
              course.pricingModel ||
              (course.priceSuffix &&
              course.priceSuffix.toLowerCase().includes("leksjon")
                ? "per_lesson"
                : "course");
            let suffix = course.priceSuffix ? " " + course.priceSuffix : "";
            if (!course.priceSuffix && price > 0) {
              suffix =
                pricingModel === "per_lesson" ? " pr. leksjon" : " totalt";
            }
            const priceText =
              price > 0
                ? `kr ${Math.round(price).toLocaleString("no-NO")}${suffix}`
                : "Gratis";

            return `
                    <tr>
                        <td>
                            <div class="user-info-cell">
                                <div style="width:44px;height:44px;min-width:44px;border-radius:8px;overflow:hidden;flex-shrink:0;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;background:#fff7ed;color:#f97316;">
                                    ${
                                      course.imageUrl
                                        ? `<img src="${this.escapeHtml(course.imageUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;">`
                                        : `<span class="material-symbols-outlined" style="font-size:20px;">menu_book</span>`
                                    }
                                </div>
                                <div style="min-width: 0; max-width: 240px; flex: 1;">
                                    <div class="user-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${title}">${title}</div>
                                    ${shortDesc ? `<div class="text-muted" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.82rem; color: #64748b;" title="${description}">${shortDesc}</div>` : ""}
                                </div>
                            </div>
                        </td>
                        <td>${category}</td>
                        <td>${price > 0 ? `<span class="badge status-pending" style="text-transform:none; font-weight:600;">${priceText}</span>` : `<span class="badge status-read" style="text-transform:none; font-weight:600;">${priceText}</span>`}</td>
                        <td>${lessonsCount}</td>
                        <td class="col-actions">
                            <div style="display:flex; gap:6px; justify-content: flex-end;">
                                <button type="button" class="btn-secondary" onclick="window.adminManager._openCourseModal(${i})" style="padding:8px 12px;border-radius:8px;font-size:12px;">
                                    Rediger
                                </button>
                                <button type="button" class="btn-secondary" onclick="window.adminManager.createEventFromCourse(${i})" style="padding:8px 12px;border-radius:8px;font-size:12px;background:#f0fdf4;border-color:#bbf7d0;color:#15803d;display:inline-flex;align-items:center;gap:4px;" title="Opprett kalenderarrangement">
                                    <span class="material-symbols-outlined" style="font-size:16px;">calendar_add_on</span> Kalender
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
          })
          .join("");

        list.innerHTML = `
                <div class="table-container full-bleed">
                    <table class="crm-table">
                        <thead>
                            <tr>
                                <th>Kurs</th>
                                <th>Kategori</th>
                                <th>Pris</th>
                                <th>Leksjoner</th>
                                <th class="col-actions" style="text-align: right; padding-right: 24px;">Handlinger</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
      } catch (err) {
        console.error("Kurs-feil:", err);
        if (list)
          list.innerHTML = `<p style="color:#ef4444;">Kunne ikke laste kurs.</p>`;
      }
    },

    async createEventFromCourse(courseIndex) {
      const course = this.coursesItems ? this.coursesItems[courseIndex] : null;
      if (!course) {
        this.showToast("Kunne ikke finne kurset.", "error");
        return;
      }

      const confirmed = await this.showConfirm(
        "Opprett arrangement",
        `Vil du opprette et kalenderarrangement for kurset "${course.title || "Uten tittel"}"?`,
        "Opprett",
      );

      if (!confirmed) return;

      try {
        // Force invalidation of events cache
        firebaseService.invalidatePageContentCache("collection_events");

        const currentData =
          await firebaseService.getPageContent("collection_events");
        const list = this._getCollectionItems(currentData);

        // Construct new event from course details
        const eventTitle = `Kurs: ${course.title || "Nytt kurs"}`;
        const courseLink = `/kurs.html?courseId=${course.id}`;

        const newEvent = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: eventTitle,
          date: new Date().toISOString().split("T")[0],
          imageUrl: course.imageUrl || "",
          description: course.description || "",
          eventLink: courseLink,
          eventLinkText: "Start kurs",
          category: "Kurs",
          tags: ["Kurs", "Undervisning"],
          published: true,
        };

        list.unshift(newEvent);

        await firebaseService.savePageContent("collection_events", {
          items: list,
        });

        this.showToast(
          "Kalenderarrangement opprettet! Åpner Arrangementer...",
          "success",
          3000,
        );

        this.clearPublicEventCache();

        // Automatically switch view to the Events editor list
        setTimeout(() => {
          const eventsMenuItem =
            document.querySelector('.sidebar-menu-item[data-tab="events"]') ||
            document.querySelector('[data-page="events"]') ||
            document.querySelector('a[href="#events"]') ||
            document.querySelector('[onclick*="events"]');
          if (eventsMenuItem) {
            eventsMenuItem.click();
          } else {
            // Fallback to loading collection editor directly
            this.renderCollectionEditor("events", "Arrangementer");
          }
        }, 1000);
      } catch (error) {
        console.error("Failed to create event from course:", error);
        this.showToast("Kunne ikke opprette kalenderarrangement.", "error");
      }
    },

    async _openCourseModal(index = null) {
      const modal = document.getElementById("course-modal");
      const title = document.getElementById("course-modal-title");
      const deleteBtn = document.getElementById("delete-course-btn");
      const lessonsContainer = document.getElementById("lessons-container");
      const status = document.getElementById("course-save-status");
      const courseForm = document.getElementById("course-form");
      const courseIdInput = document.getElementById("course-id");
      const coursePriceInput = document.getElementById("course-price");
      const coursePriceSuffixInput = document.getElementById(
        "course-price-suffix",
      );

      if (
        !modal ||
        !title ||
        !deleteBtn ||
        !lessonsContainer ||
        !courseForm ||
        !courseIdInput ||
        !coursePriceInput
      ) {
        console.warn(
          "Kursmodal mangler forventede felter og kunne ikke åpnes trygt.",
        );
        return;
      }

      // Reset form
      courseForm.reset();
      courseIdInput.value = "";
      coursePriceInput.value = "0";
      if (coursePriceSuffixInput) coursePriceSuffixInput.value = "";
      lessonsContainer.innerHTML = "";
      if (status) status.textContent = "";

      // Dynamic categories populating
      const select = document.getElementById("course-category");
      if (select) {
        const categories = new Set([
          "Bibelstudium",
          "Bønn",
          "Lederskap",
          "Helbredelse",
          "Evangelisering",
          "Identitet",
        ]);
        if (Array.isArray(this.coursesItems)) {
          this.coursesItems.forEach((c) => {
            if (c.category) categories.add(c.category);
          });
        }
        select.innerHTML =
          Array.from(categories)
            .map(
              (cat) => `
                <option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>
            `,
            )
            .join("") +
          `
                <option value="__NEW__">+ Opprett ny kategori...</option>
            `;

        const newCatContainer = document.getElementById(
          "new-category-container",
        );
        const newCatInput = document.getElementById("course-new-category");

        select.onchange = () => {
          if (select.value === "__NEW__") {
            newCatContainer.style.display = "block";
            if (newCatInput) newCatInput.focus();
          } else {
            newCatContainer.style.display = "none";
            if (newCatInput) newCatInput.value = "";
          }
        };
        newCatContainer.style.display = "none";
        if (newCatInput) newCatInput.value = "";
      }

      if (index !== null) {
        // Edit existing
        title.textContent = "Rediger kurs";
        deleteBtn.style.display = "inline-flex";
        try {
          const data =
            typeof firebaseService.getSiteContent === "function"
              ? await firebaseService.getSiteContent("collection_courses")
              : null;
          const items = Array.isArray(data) ? data : data?.items || [];
          this.coursesItems = items;
          const course = items[index];
          if (!course) return;

          document.getElementById("course-id").value =
            course.id || `idx:${index}`;
          document.getElementById("course-title").value = course.title || "";
          document.getElementById("course-description").value =
            course.description || "";
          document.getElementById("course-category").value =
            course.category || "Bibelstudium";
          document.getElementById("course-price").value = course.price || 0;
          if (coursePriceSuffixInput)
            coursePriceSuffixInput.value = course.priceSuffix || "";
          document.getElementById("course-image").value = course.imageUrl || "";

          const pricingModel =
            course.pricingModel ||
            (course.priceSuffix &&
            course.priceSuffix.toLowerCase().includes("leksjon")
              ? "per_lesson"
              : "course");
          const courseRadio = document.getElementById("pricing-model-course");
          const lessonRadio = document.getElementById("pricing-model-lesson");
          if (pricingModel === "per_lesson") {
            if (lessonRadio) lessonRadio.checked = true;
          } else {
            if (courseRadio) courseRadio.checked = true;
          }

          (course.lessons || []).forEach((l) =>
            this._addLessonRow(
              l.title,
              l.videoUrl,
              l.price,
              l.date,
              l.zoomUrl,
              l.id,
              l.resource,
              l.resourceUrl,
              l.description,
              l.resources,
            ),
          );
          this._updatePricingModelUI(pricingModel);
        } catch (err) {
          console.error(err);
        }
      } else {
        title.textContent = "Nytt kurs";
        deleteBtn.style.display = "none";
        const courseRadio = document.getElementById("pricing-model-course");
        if (courseRadio) courseRadio.checked = true;
        this._addLessonRow(); // Start with one empty lesson
        this._updatePricingModelUI("course");
      }

      modal.style.display = "block";

      // Initialize Sortable on lessonsContainer
      if (typeof Sortable !== "undefined") {
        if (this.lessonsSortable) {
          this.lessonsSortable.destroy();
        }
        this.lessonsSortable = Sortable.create(lessonsContainer, {
          animation: 200,
          handle: ".lesson-drag-handle",
          ghostClass: "lesson-row-ghost",
          onEnd: () => {
            this._updateLessonIndices();
          },
        });
      }

      // --- Unsplash Listener for Kurs ---
      const unsplashBtn = document.getElementById("course-unsplash-btn");
      const imgInput = document.getElementById("course-image");
      if (unsplashBtn && imgInput) {
        unsplashBtn.onclick = () => {
          if (window.unsplashManager) {
            window.unsplashManager.open((selection) => {
              if (selection && selection.url) {
                imgInput.value = selection.url;
              }
            });
          }
        };
      }
    },

    _closeCourseModal() {
      const modal = document.getElementById("course-modal");
      if (modal) modal.style.display = "none";
    },

    _addLessonRow(
      lessonTitle = "",
      videoUrl = "",
      price = "",
      date = "",
      zoomUrl = "",
      lessonId = "",
      resource = "",
      resourceUrl = "",
      description = "",
      resources = null,
    ) {
      const container = document.getElementById("lessons-container");
      if (!container) return;
      const index = container.children.length + 1;
      const row = document.createElement("div");
      row.className = "lesson-row-item";

      // Preserve or generate unique ID for this lesson
      const id =
        lessonId ||
        `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      row.dataset.id = id;

      // Prepare existing resources array
      let initialResources = [];
      if (Array.isArray(resources) && resources.length > 0) {
        initialResources = resources.map((r) =>
          typeof r === "string"
            ? { title: r, url: "#" }
            : { title: r.title || r.name || "", url: r.url || r.link || "" },
        );
      } else if (resource || resourceUrl) {
        initialResources = [{ title: resource || "", url: resourceUrl || "" }];
      } else {
        initialResources = [{ title: "", url: "" }];
      }

      const isPerLesson =
        document.getElementById("pricing-model-lesson")?.checked || false;

      row.style.cssText =
        "display:flex;flex-direction:column;gap:10px;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:12px;position:relative;";
      row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:0.95rem;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="material-symbols-outlined lesson-drag-handle" style="cursor:grab;font-size:1.2rem;color:#94a3b8;user-select:none;transition:color 0.2s;" title="Dra for å endre rekkefølge">drag_indicator</span>
                    <span class="lesson-header-index">Leksjon ${index}</span>
                </div>
                <button type="button" class="lesson-delete-btn" style="background:#fee2e2;color:#ef4444;border:none;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:0.9rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s;"
                    onclick="this.closest('div.lesson-row-item').remove(); window.adminManager._updateLessonIndices();">&times;</button>
            </div>
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;">
                <input type="text" placeholder="Tittel" value="${lessonTitle}"
                    style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;" class="lesson-title admin-input">
                <div class="lesson-price-wrapper" style="position:relative; width:100%;">
                    <input type="number" placeholder="Pris (NOK)" value="${price}"
                        style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;display:${isPerLesson ? "block" : "none"};" class="lesson-price admin-input">
                    <div class="lesson-price-included-badge" style="display:${isPerLesson ? "none" : "flex"};height:100%;min-height:38px;padding:0 10px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:8px;align-items:center;justify-content:center;font-size:0.82rem;color:#475569;font-weight:600;white-space:nowrap;user-select:none;">
                        <span class="material-symbols-outlined" style="font-size:16px;margin-right:4px;color:#10b981;">check_circle</span> Inkludert
                    </div>
                </div>
                <input type="datetime-local" placeholder="Dato/Tid" value="${date}"
                    style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;" class="lesson-date admin-input">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <input type="url" placeholder="Zoom Møtelenke" value="${zoomUrl}"
                    style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;" class="lesson-zoom admin-input">
                <input type="url" placeholder="Videoopptak URL (f.eks. Vimeo)" value="${videoUrl}"
                    style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;" class="lesson-video admin-input">
            </div>

            <!-- Multi-resource upload section -->
            <div style="display:flex;flex-direction:column;gap:8px;background:#ffffff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <label style="font-weight:600;font-size:0.85rem;color:#1e293b;">Ressurser & Vedlegg (filopplasting til kurssiden)</label>
                    <button type="button" class="add-resource-row-btn" style="background:#f1f5f9;color:#1e293b;border:1px solid #cbd5e1;padding:4px 10px;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size:1rem;color:#1B4965;">add</span> Legg til ressurs / fil
                    </button>
                </div>
                <div class="lesson-resources-container" style="display:flex;flex-direction:column;gap:8px;"></div>
            </div>

            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-weight:600;font-size:0.85rem;color:#1e293b;margin-bottom:2px;">Beskrivelse / Tekstinnhold</label>
                <div class="rte-wrapper">
                    <div class="rte-toolbar" id="rte-toolbar-${id}">
                        <button type="button" class="rte-btn" data-cmd="bold" title="Fet"><span class="material-symbols-outlined">format_bold</span></button>
                        <button type="button" class="rte-btn" data-cmd="italic" title="Kursiv"><span class="material-symbols-outlined">format_italic</span></button>
                        <button type="button" class="rte-btn" data-cmd="underline" title="Understrek"><span class="material-symbols-outlined">format_underlined</span></button>
                        <div class="rte-divider"></div>
                        <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="H2" title="Overskrift"><span class="material-symbols-outlined">title</span></button>
                        <button type="button" class="rte-btn" data-cmd="formatBlock" data-val="P" title="Avsnitt"><span class="material-symbols-outlined">format_paragraph</span></button>
                        <div class="rte-divider"></div>
                        <button type="button" class="rte-btn" data-cmd="insertUnorderedList" title="Punktliste"><span class="material-symbols-outlined">format_list_bulleted</span></button>
                        <button type="button" class="rte-btn" data-cmd="insertOrderedList" title="Numrert liste"><span class="material-symbols-outlined">format_list_numbered</span></button>
                        <div class="rte-divider"></div>
                        <button type="button" class="rte-btn" data-cmd="removeFormat" title="Fjern formatering"><span class="material-symbols-outlined">format_clear</span></button>
                    </div>
                    <div class="rte-editor lesson-description" id="lesson-description-editor-${id}" contenteditable="true"
                        data-placeholder="Leksjonsbeskrivelse / Tekstinnhold">${description}</div>
                </div>
            </div>
        `;
      container.appendChild(row);

      // Populate resource rows
      const resourcesContainer = row.querySelector(
        ".lesson-resources-container",
      );
      const addResourceBtn = row.querySelector(".add-resource-row-btn");

      const appendResourceRow = (rTitle = "", rUrl = "") => {
        const rRow = document.createElement("div");
        rRow.className = "lesson-resource-row";
        rRow.style.cssText =
          "display:grid;grid-template-columns:1fr 1.2fr auto;gap:8px;align-items:center;";
        rRow.innerHTML = `
                <input type="text" placeholder="Ressurs-navn (f.eks. Arbeidsark PDF)" value="${rTitle}"
                    style="padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;" class="resource-item-name admin-input">
                <div style="display:flex;gap:6px;">
                    <input type="url" placeholder="Ressurs URL (Lenke til fil/nettside)" value="${rUrl}"
                        style="flex:1;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:0.85rem;" class="resource-item-url admin-input">
                    <button type="button" class="resource-upload-btn" style="padding:8px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:1.5px solid #e2e8f0;background:white;line-height:1;" title="Last opp fil fra mobil/PC">
                        <span class="material-symbols-outlined" style="font-size:1.1rem;color:#1B4965;line-height:1;">cloud_upload</span>
                    </button>
                    <input type="file" class="resource-file-input" style="display:none;">
                </div>
                <button type="button" class="resource-remove-btn" style="background:#fee2e2;color:#ef4444;border:none;width:30px;height:30px;border-radius:6px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" title="Fjern denne ressursen">&times;</button>
            `;
        resourcesContainer.appendChild(rRow);

        const uploadBtn = rRow.querySelector(".resource-upload-btn");
        const fileInput = rRow.querySelector(".resource-file-input");
        const urlInput = rRow.querySelector(".resource-item-url");
        const nameInput = rRow.querySelector(".resource-item-name");
        const removeBtn = rRow.querySelector(".resource-remove-btn");

        removeBtn.addEventListener("click", () => rRow.remove());

        if (uploadBtn && fileInput && urlInput) {
          uploadBtn.addEventListener("click", () => fileInput.click());
          fileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadBtn.disabled = true;
            uploadBtn.innerHTML =
              '<span class="material-symbols-outlined" style="font-size:1.1rem; animation: spin 1.5s linear infinite; display: inline-block;">sync</span>';

            try {
              const uploadedUrl = await firebaseService.uploadFile(
                file,
                `course_resources/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
                ["image/", "application/", "text/", "audio/", "video/"],
                50,
                null,
                { timeoutMs: 180000 },
              );
              urlInput.value = uploadedUrl;
              if (!nameInput.value.trim()) {
                nameInput.value = file.name;
              }
            } catch (err) {
              console.error("Resource file upload error:", err);
              alert("Feil ved filopplasting: " + err.message);
            } finally {
              uploadBtn.disabled = false;
              uploadBtn.innerHTML =
                '<span class="material-symbols-outlined" style="font-size:1.1rem;color:#1B4965;">cloud_upload</span>';
              fileInput.value = "";
            }
          });
        }
      };

      initialResources.forEach((r) => appendResourceRow(r.title, r.url));
      if (addResourceBtn) {
        addResourceBtn.addEventListener("click", () =>
          appendResourceRow("", ""),
        );
      }

      // Wire up rich text editor toolbar
      this._wireRteToolbar(
        `rte-toolbar-${id}`,
        `lesson-description-editor-${id}`,
      );
    },

    _updateLessonIndices() {
      const container = document.getElementById("lessons-container");
      if (!container) return;
      Array.from(container.children).forEach((row, i) => {
        const indexSpan = row.querySelector(".lesson-header-index");
        if (indexSpan) {
          indexSpan.textContent = `Leksjon ${i + 1}`;
        }
      });
    },

    async _saveCourse() {
      const status = document.getElementById("course-save-status");
      const editCourseKey = document.getElementById("course-id").value;
      const saveBtn = document.getElementById("save-course-btn");

      const lessons = [];
      document
        .querySelectorAll("#lessons-container > .lesson-row-item")
        .forEach((row) => {
          const id = row.dataset.id;
          const t = row.querySelector(".lesson-title")?.value?.trim();
          const v = row.querySelector(".lesson-video")?.value?.trim();
          const p = parseInt(row.querySelector(".lesson-price")?.value) || 0;
          const d = row.querySelector(".lesson-date")?.value || "";
          const z = row.querySelector(".lesson-zoom")?.value?.trim() || "";
          const desc =
            row.querySelector(".lesson-description")?.innerHTML?.trim() || "";

          const resourceRows = row.querySelectorAll(".lesson-resource-row");
          const resourcesList = [];
          resourceRows.forEach((rRow) => {
            const rName =
              rRow.querySelector(".resource-item-name")?.value?.trim() || "";
            const rUrl =
              rRow.querySelector(".resource-item-url")?.value?.trim() || "";
            if (rName || rUrl) {
              resourcesList.push({ title: rName || "Dokument", url: rUrl });
            }
          });

          const firstRes = resourcesList[0] || { title: "", url: "" };

          if (t) {
            lessons.push({
              id,
              title: t,
              videoUrl: v || "",
              price: p,
              date: d,
              zoomUrl: z,
              resource: firstRes.title || "",
              resourceUrl: firstRes.url || "",
              resources: resourcesList,
              description: desc,
            });
          }
        });

      let category = document.getElementById("course-category").value;
      if (category === "__NEW__") {
        category =
          document.getElementById("course-new-category")?.value?.trim() || "";
        if (!category) {
          if (status) {
            status.style.color = "#ef4444";
            status.textContent = "Vennligst oppgi navn på den nye kategorien.";
          }
          return;
        }
      }

      const pricingModel =
        document.querySelector('input[name="course-pricing-type"]:checked')
          ?.value || "course";

      const rawCourse = {
        id:
          editCourseKey && !editCourseKey.startsWith("idx:")
            ? editCourseKey
            : `course_${Date.now()}`,
        title: document.getElementById("course-title").value.trim(),
        description: document.getElementById("course-description").value.trim(),
        category: category,
        pricingModel: pricingModel,
        price: parseInt(document.getElementById("course-price").value) || 0,
        priceSuffix:
          document.getElementById("course-price-suffix")?.value?.trim() || "",
        imageUrl: document.getElementById("course-image").value.trim(),
        lessons,
        updatedAt: new Date().toISOString(),
      };

      const validated =
        typeof adminUtils.sanitizeCoursePayload === "function"
          ? adminUtils.sanitizeCoursePayload(rawCourse)
          : {
              ok: !!rawCourse.title,
              errors: rawCourse.title ? [] : ["Kurstitel er påkrevd."],
              value: rawCourse,
            };

      if (!validated.ok) {
        if (status) {
          status.style.color = "#ef4444";
          status.textContent = validated.errors.join(" ");
        }
        return;
      }

      await this._runWriteLocked("course-save", async () => {
        await this._withButtonLoading(
          saveBtn,
          async () => {
            try {
              const data =
                typeof firebaseService.getSiteContent === "function"
                  ? await firebaseService.getSiteContent("collection_courses")
                  : null;
              let items = Array.isArray(data) ? data : data?.items || [];

              const existingIdx = items.findIndex((c, idx) => {
                if (editCourseKey && !editCourseKey.startsWith("idx:")) {
                  return c?.id === editCourseKey;
                }
                if (editCourseKey && editCourseKey.startsWith("idx:")) {
                  return (
                    idx === parseInt(editCourseKey.replace("idx:", ""), 10)
                  );
                }
                return false;
              });

              if (existingIdx >= 0) {
                items[existingIdx] = {
                  ...items[existingIdx],
                  ...validated.value,
                };
                if (!rawCourse.description)
                  delete items[existingIdx].description;
                if (!rawCourse.imageUrl) delete items[existingIdx].imageUrl;
              } else {
                items.unshift(validated.value);
              }

              if (typeof firebaseService.saveSiteContent === "function") {
                await firebaseService.saveSiteContent(
                  "collection_courses",
                  {
                    items,
                    updatedAt: new Date().toISOString(),
                  },
                  { merge: true },
                );
              } else {
                const ref = firebase
                  .firestore()
                  .collection("siteContent")
                  .doc("collection_courses");
                await ref.set(
                  { items, updatedAt: new Date().toISOString() },
                  { merge: true },
                );
              }

              if (status) {
                status.style.color = "#16a34a";
                status.textContent = "Kurs lagret!";
              }
              setTimeout(() => {
                this._closeCourseModal();
                this._loadCoursesList();
              }, 500);
            } catch (err) {
              console.error(err);
              if (status) {
                status.style.color = "#ef4444";
                status.textContent = "Feil: " + err.message;
              }
            }
          },
          {
            loadingText:
              '<span class="material-symbols-outlined" style="font-size:1rem;">hourglass_top</span> Lagrer...',
          },
        );
      });
    },

    async _deleteCourse() {
      const editCourseKey = document.getElementById("course-id").value;
      const deleteBtn = document.getElementById("delete-course-btn");
      const status = document.getElementById("course-save-status");
      if (editCourseKey === "") return;
      const confirmed = await this.showConfirm(
        "Slett kurs",
        "Er du sikker på at du vil slette dette kurset?",
        "Slett",
      );
      if (!confirmed) return;

      await this._runWriteLocked("course-delete", async () => {
        await this._withButtonLoading(
          deleteBtn,
          async () => {
            try {
              const data =
                typeof firebaseService.getSiteContent === "function"
                  ? await firebaseService.getSiteContent("collection_courses")
                  : null;
              let items = Array.isArray(data) ? data : data?.items || [];

              const nextItems = items.filter((course, idx) => {
                if (editCourseKey.startsWith("idx:")) {
                  return (
                    idx !== parseInt(editCourseKey.replace("idx:", ""), 10)
                  );
                }
                return course?.id !== editCourseKey;
              });

              if (nextItems.length === items.length) {
                if (status) {
                  status.style.color = "#ef4444";
                  status.textContent =
                    "Kunne ikke finne kurset som skulle slettes.";
                }
                return;
              }

              if (typeof firebaseService.saveSiteContent === "function") {
                await firebaseService.saveSiteContent(
                  "collection_courses",
                  {
                    items: nextItems,
                    updatedAt: new Date().toISOString(),
                  },
                  { merge: true },
                );
              } else {
                const ref = firebase
                  .firestore()
                  .collection("siteContent")
                  .doc("collection_courses");
                await ref.set(
                  { items: nextItems, updatedAt: new Date().toISOString() },
                  { merge: true },
                );
              }

              this._closeCourseModal();
              await this._loadCoursesList();
              this.showToast("Kurs slettet!", "success");
            } catch (err) {
              console.error(err);
              if (status) {
                status.style.color = "#ef4444";
                status.textContent = "Kunne ikke slette kurs: " + err.message;
              }
              this.showToast("Kunne ikke slette kurs.", "error");
            }
          },
          {
            loadingText: "Sletter...",
          },
        );
      });
    },

    async _loadEnrollmentsList() {
      const list = document.getElementById("enrollments-list");
      if (!list) return;
      try {
        const db = window.firebaseService?.db || firebase.firestore();
        const snapshot = await db
          .collection("courseEnrollments")
          .orderBy("enrolledAt", "desc")
          .get();
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        this.enrollmentItems = items;

        this._populateEnrollmentCourseFilter();
        this._renderEnrollmentsList();
      } catch (err) {
        console.error("Enrollments load error:", err);
        list.innerHTML = `<p style="color:#ef4444;text-align:center;padding:20px;">Kunne ikke laste påmeldinger: ${err.message}</p>`;
      }
    },

    _populateEnrollmentCourseFilter() {
      const select = document.getElementById("enrollment-course-filter");
      if (!select) return;

      const courses = new Set();
      if (Array.isArray(this.coursesItems)) {
        this.coursesItems.forEach((c) => {
          if (c.title) courses.add(c.title);
        });
      }
      if (Array.isArray(this.enrollmentItems)) {
        this.enrollmentItems.forEach((e) => {
          if (e.courseTitle) courses.add(e.courseTitle);
        });
      }

      const currentVal = select.value;
      select.innerHTML =
        '<option value="">Alle kurs</option>' +
        Array.from(courses)
          .sort()
          .map(
            (title) => `
                <option value="${this.escapeHtml(title)}">${this.escapeHtml(title)}</option>
            `,
          )
          .join("");
      select.value = currentVal;
    },
  };
}
