// shop manager methods for AdminManager.
export function createMethods29({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async navigateToShopTab(targetTab = "kurs") {
      if (typeof window.handleSectionSwitch === "function") {
        window.handleSectionSwitch("shop");
      } else {
        this.onSectionSwitch("shop");
        const sections = document.querySelectorAll(".section-content");
        sections.forEach((s) => s?.classList?.remove("active"));
        document.getElementById("shop-section")?.classList.add("active");
        window.location.hash = "shop";
      }

      const section = document.getElementById("shop-section");
      if (section && section.getAttribute("data-rendered") !== "true") {
        await this.renderShopManager();
      } else if (this._shopManagerRenderingPromise) {
        await this._shopManagerRenderingPromise;
      }

      const tabBtn = document.querySelector(
        `#shop-section .automation-tab[data-tab="${targetTab}"]`,
      );
      if (tabBtn) {
        tabBtn.click();
      }
    },

    async renderShopManager() {
      const section = document.getElementById("shop-section");
      if (!section) return;

      if (section.getAttribute("data-rendered") === "true") return;
      if (this._shopManagerRenderingPromise)
        return this._shopManagerRenderingPromise;

      this._shopManagerRenderingPromise =
        this._renderShopManagerInternal(section);
      try {
        await this._shopManagerRenderingPromise;
      } finally {
        this._shopManagerRenderingPromise = null;
      }
    },

    async _renderShopManagerInternal(section) {
      if (!section) return;
      if (section.getAttribute("data-rendered") === "true") return;

      if (!this.allDonationRecords || !this.adminUserMap) {
        try {
          if (firebaseService.db) {
            const donationsSnapshot = await firebaseService.db
              .collection("donations")
              .get();
            const donationRecords = donationsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            this.allDonationRecords = donationRecords.sort((a, b) => {
              const aDate = this.getDonationDate(a)?.getTime?.() || 0;
              const bDate = this.getDonationDate(b)?.getTime?.() || 0;
              return bDate - aDate;
            });
            const usersSnapshot = await firebaseService.db
              .collection("users")
              .get();
            const users = usersSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            this.adminUserMap = new Map(users.map((user) => [user.id, user]));
          }
        } catch (e) {
          console.warn("Kunne ikke hente donasjoner for Butikk-siden:", e);
        }
      }
      if (this.donationFilters === undefined) {
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
      }

      const users = this.adminUserMap
        ? Array.from(this.adminUserMap.values())
        : [];
      const manualDonationUserOptions = users
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
          return `<option value="${this.escapeHtml(user.id)}">${this.escapeHtml(label + email)}</option>`;
        })
        .join("");

      section.innerHTML = `
            <!-- Tabs Navigation -->
            <div class="causes-tabs-container" style="margin-bottom: 24px; margin-top: 8px;">
                <div class="automation-tabs" style="border-bottom: 2px solid #e2e8f0; background: #fff; border-radius: 12px 12px 0 0; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="automation-tab active" data-tab="wix">Oversikt</button>
                        <button class="automation-tab" data-tab="wix-orders">Ordrehistorikk</button>
                        <button class="automation-tab" data-tab="shop">Manuelle ordre</button>
                        <button class="automation-tab" data-tab="kurs">Kurskjøp</button>
                    </div>
                    
                    <!-- Global Period Selector -->
                    <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0;">
                        <div class="form-group" style="margin: 0; display: flex; align-items: center; gap: 8px;">
                            <label style="font-weight: 700; color: #1B4965; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; white-space: nowrap;">Periode:</label>
                            <select id="shop-date-preset" class="form-control" style="font-weight: 600; color: #0f172a; border-radius: 8px; height: 36px; padding: 0 42px 0 12px !important; font-size: 13px; min-width: 140px; margin: 0; border: 1px solid #cbd5e1; background-color: #fff;">
                                <option value="7">Siste 7 dager</option>
                                <option value="30" selected>Siste 30 dager</option>
                                <option value="90">Siste 90 dager</option>
                                <option value="365">Siste 365 dager</option>
                                <option value="year">Dette året</option>
                                <option value="all">Alt tid</option>
                                <option value="custom">Egendefinert...</option>
                            </select>
                        </div>
                        <div id="shop-custom-dates" style="display: none; gap: 8px; align-items: center;">
                            <div class="form-group" style="margin: 0; display: flex; align-items: center; gap: 4px;">
                                <label style="font-weight: 700; color: #1B4965; font-size: 11px; text-transform: uppercase; margin: 0;">Fra:</label>
                                <input type="date" id="shop-start-date" class="form-control" style="border-radius: 8px; height: 36px; padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1;">
                            </div>
                            <div class="form-group" style="margin: 0; display: flex; align-items: center; gap: 4px;">
                                <label style="font-weight: 700; color: #1B4965; font-size: 11px; text-transform: uppercase; margin: 0;">Til:</label>
                                <input type="date" id="shop-end-date" class="form-control" style="border-radius: 8px; height: 36px; padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Wix Store Content -->
            <div id="cause-tab-content-wix" class="cause-tab-pane" style="display: block;">
                <div id="wix-stats-container">
                    <div style="display:flex; justify-content:center; padding:32px;">
                        <div class="loader">Laster Wix-statistikk...</div>
                    </div>
                </div>
            </div>

            <!-- Tab: Wix Ordrehistorikk -->
            <div id="cause-tab-content-wix-orders" class="cause-tab-pane" style="display: none;">
                <div id="wix-orders-container">
                    <div style="display:flex; justify-content:center; padding:32px;">
                        <div class="loader">Laster Wix-ordrehistorikk...</div>
                    </div>
                </div>
            </div>

            <!-- Tab: Shop Content -->
            <div id="cause-tab-content-shop" class="cause-tab-pane" style="display: none;">
                <div class="stats-grid causes-stats-grid" style="margin-bottom: 32px;">
                    <div class="stat-card modern">
                        <div class="stat-icon-wrap green">
                            <span class="material-symbols-outlined">shopping_bag</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Omsetning i perioden</h3>
                            <p class="stat-value" id="shop-total-amount">0 kr</p>
                            <p class="stat-trend" style="padding-left: 0 !important; margin-left: 0 !important;">Fullførte butikkjøp i perioden</p>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap blue">
                            <span class="material-symbols-outlined">receipt_long</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Antall ordre i perioden</h3>
                            <p class="stat-value" id="shop-total-count">0</p>
                            <span class="stat-meta">Registrerte butikkordre i perioden</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap mint">
                            <span class="material-symbols-outlined">trending_up</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Snittordre i perioden</h3>
                            <p class="stat-value" id="shop-average-amount">0 kr</p>
                            <span class="stat-meta">Snitt per butikkjøp i perioden</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap purple">
                            <span class="material-symbols-outlined">today</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Dagens salg</h3>
                            <p class="stat-value" id="shop-today-amount">0 kr</p>
                            <span class="stat-meta" id="shop-today-count">0 ordre</span>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header flex-between">
                        <div>
                            <h3 class="card-title">Butikktransaksjoner</h3>
                            <p class="section-subtitle" style="margin-bottom: 0;">Filtrer på status, metode eller søk etter kjøper.</p>
                        </div>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="position:relative; width:180px;">
                                <span class="material-symbols-outlined" style="position:absolute; left:10px; top:50%; transform:translateY(-50%) !important; font-size:18px; color:#64748b; pointer-events:none;">search</span>
                                <input id="shop-search" class="form-control" type="search" placeholder="Søk etter kjøper..." style="padding-left:36px !important; height:40px; font-size:13px; border-radius:8px; border:1px solid #cbd5e1; width:100%; margin:0;">
                            </div>
                            <button type="button" class="btn-primary" id="open-manual-sale-btn" style="display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; height:40px; background:#1B4965; border-color:#1B4965; color:white; cursor:pointer;">
                                <span class="material-symbols-outlined" style="font-size:20px;">add_shopping_cart</span>
                                Registrer salg
                            </button>
                            <button type="button" class="btn-secondary" id="open-shop-csv-import-btn" style="display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; height:40px; background:white; border:1px solid #cbd5e1; color:#1e293b; cursor:pointer;">
                                <span class="material-symbols-outlined" style="font-size:20px;">upload_file</span>
                                Importer CSV
                            </button>
                            <button type="button" class="btn-secondary" id="print-shop-report-btn" style="display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; height:40px; background:white; border:1px solid #cbd5e1; color:#1e293b; cursor:pointer;">
                                <span class="material-symbols-outlined" style="font-size:20px;">print</span>
                                Skriv ut rapport
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 130px), 1fr));gap:12px;margin-bottom:16px;">
                            <div class="form-group" style="margin:0;">
                                <label>Status</label>
                                <select id="shop-status-filter" class="form-control">
                                    <option value="all">Alle statuser</option>
                                    <option value="completed">Fullført</option>
                                    <option value="pending">Venter</option>
                                    <option value="processing">Behandles</option>
                                    <option value="failed">Feilet</option>
                                    <option value="cancelled">Avbrutt</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label>Metode</label>
                                <select id="shop-method-filter" class="form-control">
                                    <option value="all">Alle metoder</option>
                                    <option value="stripe">Stripe</option>
                                    <option value="vipps">Vipps</option>
                                    <option value="vipps_manual">Vipps manuelt</option>
                                    <option value="card">Kort</option>
                                    <option value="bank">Bank</option>
                                    <option value="cash">Kontant</option>
                                    <option value="manual">Manuell</option>
                                    <option value="other">Annen tjeneste</option>
                                </select>
                            </div>

                            <div style="display:flex; align-items:flex-end;">
                                <button type="button" class="btn-secondary" id="shop-clear-filters" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; width:100%; height:40px;">
                                    <span class="material-symbols-outlined" style="font-size:20px;">filter_alt_off</span>
                                    Nullstill
                                </button>
                            </div>
                        </div>

                        <div class="stats-grid donation-metrics-grid causes-stats-grid" style="margin-bottom: 20px;">
                            <div class="stat-card modern">
                                <div class="stat-content">
                                    <h3 class="stat-label">Valgt periode</h3>
                                    <p class="stat-value" id="shop-period-amount">--</p>
                                    <span class="stat-meta" id="shop-period-count">Laster...</span>
                                </div>
                            </div>
                            <div class="stat-card modern">
                                <div class="stat-content">
                                    <h3 class="stat-label">Kunder</h3>
                                    <p class="stat-value" id="shop-customer-count">--</p>
                                    <span class="stat-meta">Unike kunder i filteret</span>
                                </div>
                            </div>
                            <div class="stat-card modern">
                                <div class="stat-content">
                                    <h3 class="stat-label">Under behandling</h3>
                                    <p class="stat-value" id="shop-pending-count">--</p>
                                    <span class="stat-meta">Ikke fullført ennå</span>
                                </div>
                            </div>
                            <div class="stat-card modern">
                                <div class="stat-content">
                                    <h3 class="stat-label">Ukoblede</h3>
                                    <p class="stat-value" id="shop-unmatched-count">--</p>
                                    <span class="stat-meta">Ikke koblet til nettstedsprofil</span>
                                </div>
                            </div>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="data-table" style="width:100%;">
                                <thead>
                                    <tr>
                                        <th class="sortable-header" data-sort="date" style="cursor:pointer; user-select:none; transition:background-color 0.2s, color 0.2s;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1B4965'" onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                            <div class="sort-header-wrapper" style="display:inline-flex; align-items:center; gap:6px;">
                                                Dato
                                                <span class="material-symbols-outlined sort-icon" style="font-size:14px; display:none; vertical-align:middle; line-height:1; position:relative; top:-1px;">arrow_upward</span>
                                            </div>
                                        </th>
                                        <th class="sortable-header" data-sort="name" style="cursor:pointer; user-select:none; transition:background-color 0.2s, color 0.2s;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1B4965'" onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                            <div class="sort-header-wrapper" style="display:inline-flex; align-items:center; gap:6px;">
                                                Kjøper
                                                <span class="material-symbols-outlined sort-icon" style="font-size:14px; display:none; vertical-align:middle; line-height:1; position:relative; top:-1px;">arrow_upward</span>
                                            </div>
                                        </th>
                                        <th>Metode</th>
                                        <th>Produkt</th>
                                        <th>ID / Referanse</th>
                                        <th>Profil</th>
                                        <th class="sortable-header text-right" data-sort="amount" style="cursor:pointer; user-select:none; transition:background-color 0.2s, color 0.2s; text-align:right;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1B4965'" onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                            <div class="sort-header-wrapper" style="display:inline-flex; align-items:center; justify-content:flex-end; gap:6px; width:100%;">
                                                Beløp
                                                <span class="material-symbols-outlined sort-icon" style="font-size:14px; display:none; vertical-align:middle; line-height:1; position:relative; top:-1px;">arrow_upward</span>
                                            </div>
                                        </th>
                                        <th style="width:1px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="shop-transactions-body">
                                    <tr><td colspan="8" style="padding:28px;text-align:center;color:#64748b;">Laster transaksjoner...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab: Kurskjøp Content -->
            <div id="cause-tab-content-kurs" class="cause-tab-pane" style="display: none;">
                <div class="stats-grid causes-stats-grid" style="margin-bottom: 32px;">
                    <div class="stat-card modern">
                        <div class="stat-icon-wrap green">
                            <span class="material-symbols-outlined">school</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Kursomsetning i perioden</h3>
                            <p class="stat-value" id="kurs-shop-total-amount">0 kr</p>
                            <p class="stat-trend" style="padding-left: 0 !important; margin-left: 0 !important;">Fullførte kurskjøp i perioden</p>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap blue">
                            <span class="material-symbols-outlined">auto_stories</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Antall kurskjøp</h3>
                            <p class="stat-value" id="kurs-shop-total-count">0</p>
                            <span class="stat-meta">Registrerte kurskjøp i perioden</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap mint">
                            <span class="material-symbols-outlined">trending_up</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Snittkurspris</h3>
                            <p class="stat-value" id="kurs-shop-average-amount">0 kr</p>
                            <span class="stat-meta">Gjennomsnitt per kurskjøp</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap purple">
                            <span class="material-symbols-outlined">today</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Dagens kurskjøp</h3>
                            <p class="stat-value" id="kurs-shop-today-amount">0 kr</p>
                            <span class="stat-meta" id="kurs-shop-today-count">0 kjøp</span>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header flex-between">
                        <div>
                            <h3 class="card-title">Kurstransaksjoner</h3>
                            <p class="section-subtitle" style="margin-bottom: 0;">Oversikt over alle betalte og registrerte kurskjøp.</p>
                        </div>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="position:relative; width:220px;">
                                <span class="material-symbols-outlined" style="position:absolute; left:10px; top:50%; transform:translateY(-50%) !important; font-size:18px; color:#64748b; pointer-events:none;">search</span>
                                <input id="kurs-shop-search" class="form-control" type="search" placeholder="Søk i kurskjøp..." style="padding-left:36px !important; height:40px; font-size:13px; border-radius:8px; border:1px solid #cbd5e1; width:100%; margin:0;">
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="width:100%;">
                                <thead>
                                    <tr>
                                        <th>Dato</th>
                                        <th>Kunde / Student</th>
                                        <th>Kurs</th>
                                        <th>Metode</th>
                                        <th>Status</th>
                                        <th class="text-right">Beløp</th>
                                    </tr>
                                </thead>
                                <tbody id="kurs-shop-transactions-body">
                                    <tr>
                                        <td colspan="6" style="padding:28px; text-align:center; color:#64748b;">Laster kurstransaksjoner...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Manual Sale Modal -->
            <div id="manual-sale-modal" style="display:none;position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;padding:24px;">
                <div class="modal-backdrop" onclick="window.adminManager?.closeManualSaleModal?.()" style="position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(8px);"></div>
                <div class="modal-content" style="max-width:720px;position:relative;max-height:min(90vh,760px);overflow:auto;">
                    <div class="modal-header" style="padding:24px 32px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h3 id="manual-sale-modal-title" style="margin:0; font-size:1.5rem; color:#0f172a; font-weight:700;">Registrer manuelt butikksalg</h3>
                            <p id="manual-sale-modal-subtitle" class="section-subtitle" style="margin:8px 0 0; color:#64748b; font-size:0.875rem; line-height:1.5;">Registrer et manuelt salg i butikken (f.eks. Vipps, kontant eller bankoverføring).</p>
                        </div>
                        <button class="modal-close" type="button" onclick="window.adminManager?.closeManualSaleModal?.()" style="background:transparent; border:none; color:#64748b; cursor:pointer; padding:4px; margin:-4px; display:flex; align-items:center; justify-content:center; transition:color 0.2s ease, transform 0.2s ease;" onmouseover="this.style.color='#0f172a'; this.style.transform='scale(1.1)';" onmouseout="this.style.color='#64748b'; this.style.transform='scale(1)';">
                            <span class="material-symbols-outlined" style="font-size:24px;">close</span>
                        </button>
                    </div>
                    <form id="manual-sale-form">
                        <div class="modal-body" style="display:grid;gap:24px; padding:24px 32px;">
                            <div class="form-group" style="margin:0;">
                                <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Koble til eksisterende bruker</label>
                                <select id="manual-sale-user" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                    <option value="">Ikke koble til profil</option>
                                    ${manualDonationUserOptions}
                                </select>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Velg produkt (fra Wix)</label>
                                <!-- Hidden input carries the selected product id -->
                                <input type="hidden" id="manual-sale-product" value="custom">
                                <!-- Search box -->
                                <div style="position: relative; margin-bottom: 10px;">
                                    <span class="material-symbols-outlined" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 20px; pointer-events:none;">search</span>
                                    <input type="text" id="manual-sale-product-search" placeholder="Søk i produkter..." style="width: 100%; padding: 10px 16px 10px 40px !important; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; transition: border-color 0.2s ease; font-size: 0.875rem; box-sizing:border-box;">
                                </div>
                                <!-- Visual product image grid -->
                                <div id="manual-sale-product-grid"
                                     style="display:grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 108px), 1fr)); gap:8px; max-height:280px; overflow-y:auto; padding:4px; border:1px solid #e2e8f0; border-radius:10px; background:#f8fafc;">
                                    <div style="grid-column:1/-1; padding:24px; text-align:center; color:#64748b; font-size:0.875rem;">Laster produkter...</div>
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 220px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Kjøpers navn</label>
                                    <input id="manual-sale-buyer-name" class="form-control" type="text" placeholder="Fullt navn" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Kjøpers e-post</label>
                                    <input id="manual-sale-buyer-email" class="form-control" type="email" placeholder="navn@eksempel.no" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 140px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Antall</label>
                                    <input id="manual-sale-quantity" class="form-control" type="number" min="1" step="1" value="1" required style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Beløp (NOK)</label>
                                    <input id="manual-sale-amount" class="form-control" type="number" min="1" step="0.01" required placeholder="250" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Dato</label>
                                    <input id="manual-sale-date" class="form-control" type="datetime-local" required style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 180px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Metode</label>
                                    <select id="manual-sale-method" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                        <option value="vipps_manual">Vipps manuelt</option>
                                        <option value="stripe">Stripe</option>
                                        <option value="vipps">Vipps</option>
                                        <option value="card">Kort</option>
                                        <option value="bank">Bank</option>
                                        <option value="cash">Kontant</option>
                                        <option value="manual">Manuell</option>
                                        <option value="other">Annen tjeneste</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Status</label>
                                    <select id="manual-sale-status" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                        <option value="completed">Fullført</option>
                                        <option value="pending">Venter</option>
                                        <option value="processing">Behandles</option>
                                        <option value="failed">Feilet</option>
                                        <option value="cancelled">Avbrutt</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Referanse / Ordre-ID</label>
                                    <input id="manual-sale-reference" class="form-control" type="text" placeholder="F.eks. Vipps-referanse eller nettbutikk-ID" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Notat</label>
                                <textarea id="manual-sale-note" class="form-control" rows="3" placeholder="Valgfritt internt notat eller produktinformasjon" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease; resize:vertical;"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:24px 32px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; align-items:center; gap:16px;">
                            <button class="btn-secondary" type="button" id="cancel-manual-sale-btn" style="padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; transition:all 0.2s ease;">Avbryt</button>
                            <button class="btn-primary" type="submit" id="save-manual-sale-btn" style="padding:12px 24px; border-radius:8px; font-weight:600; display:flex; align-items:center; gap:8px; cursor:pointer; transition:all 0.2s ease; background:#1B4965; border-color:#1B4965; color:white;">
                                <span class="material-symbols-outlined" style="font-size:20px;">save</span>
                                Lagre salg
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Shop CSV Import Modal -->
            <div id="shop-csv-import-modal" style="display:none;position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;padding:20px;">
                <div class="modal-backdrop" onclick="window.adminManager?.closeShopCsvImportModal?.()" style="position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(8px);"></div>
                <div class="modal-content" style="max-width:1100px;position:relative;max-height:min(92vh,820px);overflow:auto;">
                    <div class="modal-header" style="padding:24px 32px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0;">Importer salg fra CSV</h3>
                            <p class="section-subtitle" style="margin:4px 0 0;">Last opp en CSV-fil (Vipps, Stripe eller bank) med butikksalg. Du får se og redigere rader før lagring.</p>
                        </div>
                        <button class="modal-close" type="button" onclick="window.adminManager?.closeShopCsvImportModal?.()">×</button>
                    </div>
                    <div class="modal-body" style="display:grid;gap:16px; padding:24px 32px;">
                        <div class="form-group" style="margin:0;">
                            <label style="display:block; font-weight:600; color:#334155; font-size:0.875rem; margin-bottom:12px;">Butikk CSV-fil</label>
                            <input id="shop-csv-import-file" type="file" accept=".csv,.txt,text/csv,text/plain" style="display:none;">
                            <div id="shop-csv-import-dropzone" style="border:2px dashed #cbd5e1; border-radius:12px; padding:32px 24px; text-align:center; background:#f8fafc; cursor:pointer; transition:all 0.2s ease-in-out; display:flex; flex-direction:column; align-items:center; gap:12px;" onmouseover="this.style.borderColor='#1B4965'; this.style.background='#f0f4f8';" onmouseout="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc';">
                                <span class="material-symbols-outlined" style="font-size:48px; color:#1B4965;">cloud_upload</span>
                                <div>
                                    <span style="font-weight:700; color:#1B4965; font-size:1rem;">Dra og slipp CSV-filen her</span>
                                    <span style="color:#64748b; font-size:0.875rem; display:block; margin-top:4px;">eller klikk for å velge fra filutforsker</span>
                                </div>
                                <span style="font-size:0.75rem; color:#94a3b8; line-height:1.5; margin-top:4px;">
                                    Støtter vanlige CSV-formater som inneholder dato, beløp, kjøpernavn og e-post.
                                </span>
                            </div>
                        </div>
                        <div id="shop-csv-import-summary" style="font-size:13px;color:#475569;font-weight:700;"></div>
                        <div id="shop-csv-import-preview">
                            <div style="padding:24px;text-align:center;color:#64748b;">Velg eller slipp en CSV-fil for å forhåndsvise innholdet.</div>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding:24px 32px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:12px;">
                        <button class="btn-secondary" type="button" id="cancel-shop-csv-import-btn">Avbryt</button>
                        <button class="btn-primary" type="button" id="save-shop-csv-import-btn" disabled style="background:#1B4965; border-color:#1B4965; color:white; cursor:pointer;">
                            <span class="material-symbols-outlined">cloud_upload</span>
                            Importer valgte salg
                        </button>
                    </div>
                </div>
            </div>
        `;
      section.setAttribute("data-rendered", "true");

      this.bindDonationAdminFilters();
      this.bindShopTabs();
    },

    bindShopTabs() {
      const tabs = document.querySelectorAll("#shop-section .automation-tab");
      const panes = document.querySelectorAll("#shop-section .cause-tab-pane");

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const target = tab.dataset.tab;
          tabs.forEach((t) => {
            t.classList.toggle("active", t === tab);
            if (t === tab) {
              t.style.color = "#1B4965";
              t.style.borderBottomColor = "#1B4965";
            } else {
              t.style.color = "#64748b";
              t.style.borderBottomColor = "transparent";
            }
          });
          panes.forEach((p) => {
            p.style.display =
              p.id === `cause-tab-content-${target}` ? "block" : "none";
          });

          if (target === "wix" || target === "wix-orders") {
            this.renderWixStats();
          } else if (target === "shop") {
            this.renderDonationAdminViews();
          } else if (target === "kurs") {
            this.renderKursShopViews();
          }
        });
      });

      const kursSearch = document.getElementById("kurs-shop-search");
      if (kursSearch) {
        kursSearch.oninput = () => this.renderKursShopViews();
      }

      const activeTab =
        document.querySelector("#shop-section .automation-tab.active")?.dataset
          .tab || "wix";
      if (activeTab === "wix" || activeTab === "wix-orders") {
        this.renderWixStats();
      } else if (activeTab === "kurs") {
        this.renderKursShopViews();
      } else {
        this.renderDonationAdminViews();
      }
    },

    renderKursShopViews() {
      const records = (this.allDonationRecords || []).filter((r) => {
        const recType = String(
          r.type || r.metadata?.type || r.donationType || "",
        ).toLowerCase();
        const courseTitle = String(
          r.courseTitle ||
            r.courseName ||
            r.itemTitle ||
            r.metadata?.courseTitle ||
            "",
        ).trim();
        return (
          recType === "kurs" ||
          recType === "course" ||
          Boolean(courseTitle) ||
          Boolean(r.courseId)
        );
      });

      const presetEl = document.getElementById("shop-date-preset");
      const preset = presetEl ? presetEl.value : "30";
      const startVal = document.getElementById("shop-start-date")?.value || "";
      const endVal = document.getElementById("shop-end-date")?.value || "";
      const { start, end } = this.buildDonationDateRange(
        preset,
        startVal,
        endVal,
      );

      const filteredRecords = records.filter((r) => {
        const d = this.getDonationDate(r);
        if (start && (!d || d < start)) return false;
        if (end && (!d || d > end)) return false;
        return true;
      });

      const isCompleted = (r) =>
        ["completed", "succeeded", "captured"].includes(
          String(r.status || "").toLowerCase(),
        );
      const completedRecords = filteredRecords.filter(isCompleted);
      const totalAmount = completedRecords.reduce(
        (sum, r) => sum + this.normalizeDonationAmountNok(r),
        0,
      );
      const averageAmount = completedRecords.length
        ? totalAmount / completedRecords.length
        : 0;

      const todayRange = this.buildDonationDateRange("today");
      const todayRecords = records.filter((r) => {
        const d = this.getDonationDate(r);
        return d && d >= todayRange.start && d <= todayRange.end;
      });
      const todayAmount = todayRecords
        .filter(isCompleted)
        .reduce((sum, r) => sum + this.normalizeDonationAmountNok(r), 0);

      const totalEl = document.getElementById("kurs-shop-total-amount");
      const countEl = document.getElementById("kurs-shop-total-count");
      const avgEl = document.getElementById("kurs-shop-average-amount");
      const todayAmountEl = document.getElementById("kurs-shop-today-amount");
      const todayCountEl = document.getElementById("kurs-shop-today-count");

      if (totalEl)
        totalEl.textContent = this.formatDonationCurrency(totalAmount);
      if (countEl)
        countEl.textContent = filteredRecords.length.toLocaleString("no-NO");
      if (avgEl) avgEl.textContent = this.formatDonationCurrency(averageAmount);
      if (todayAmountEl)
        todayAmountEl.textContent = this.formatDonationCurrency(todayAmount);
      if (todayCountEl)
        todayCountEl.textContent = `${todayRecords.length} kjøp`;

      const searchInput = document.getElementById("kurs-shop-search");
      const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

      let displayRecords = filteredRecords;
      if (query) {
        displayRecords = filteredRecords.filter((r) => {
          const name = (r.donorName || r.name || "").toLowerCase();
          const email = (r.donorEmail || r.email || "").toLowerCase();
          const course = (
            r.courseTitle ||
            r.courseName ||
            r.itemTitle ||
            r.title ||
            ""
          ).toLowerCase();
          return (
            name.includes(query) ||
            email.includes(query) ||
            course.includes(query)
          );
        });
      }

      const tbody = document.getElementById("kurs-shop-transactions-body");
      if (tbody) {
        if (displayRecords.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#64748b;">Ingen kurstransaksjoner funnet for valgt periode.</td></tr>`;
          return;
        }

        const userMap = this.adminUserMap || new Map();
        tbody.innerHTML = displayRecords
          .map((r) => {
            const date = this.getDonationDate(r);
            const name = this.escapeHtml(this.getDonationDonorName(r, userMap));
            const email = this.escapeHtml(
              this.getDonationDonorEmail(r, userMap) || "Ingen e-post",
            );
            const courseTitle = this.escapeHtml(
              r.courseTitle ||
                r.courseName ||
                r.itemTitle ||
                r.title ||
                "HKM Kurs",
            );
            const method = this.escapeHtml(
              this.getDonationMethodLabel(r.method),
            );
            const status = this.escapeHtml(
              this.getDonationStatusLabel(r.status),
            );
            const amount = this.formatDonationCurrency(
              this.normalizeDonationAmountNok(r),
            );

            return `
                    <tr>
                        <td style="white-space:nowrap;">${date ? date.toLocaleString("no-NO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Ukjent"}</td>
                        <td style="white-space:nowrap;">
                            <strong class="table-customer-name" style="font-weight:700; color:#000000; font-size:13.5px; display:block;">${name}</strong>
                            <span style="font-size:12px; color:#64748b; display:block; margin-top:2px;">${email}</span>
                        </td>
                        <td style="white-space:nowrap;">
                            <span class="badge" style="background:#f0fdf4; color:#16a34a; font-weight:700; padding:4px 8px; border-radius:6px;">${courseTitle}</span>
                        </td>
                        <td style="white-space:nowrap;">${method}</td>
                        <td style="white-space:nowrap;">${status}</td>
                        <td class="text-right" style="white-space:nowrap; font-weight:700; color:#0f172a;">${amount}</td>
                    </tr>
                `;
          })
          .join("");
      }
    },
  };
}
