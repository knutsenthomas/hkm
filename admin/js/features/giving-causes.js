import { givingTabLinks } from './giving-navigation.js';
// giving causes methods for AdminManager.
export function createGivingCausesMethods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    bindCausesTabs() {
      const tabs = document.querySelectorAll(
        "#causes-section .automation-tab[data-tab]",
      );
      const panes = document.querySelectorAll(
        "#causes-section .cause-tab-pane",
      );

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

          if (target === "dashboard") {
            this.renderGiftsDashboard();
          } else if (target === "causes") {
            this.loadCauses();
          } else if (target === "wix") {
            this.renderWixStats();
          } else if (target === "inkind") {
            this.renderInKindDonations();
          }
        });
      });

      this.renderGiftsDashboard();
      if (this.pendingGivingTab) {
        const requested = this.pendingGivingTab;
        delete this.pendingGivingTab;
        document.querySelector(`#causes-section .automation-tab[data-tab="${requested}"]`)?.click();
      }
    },

    async renderCausesManager() {
      const section = document.getElementById("causes-section");
      if (!section) return;

      let totalDonations = 0;
      let donationCount = 0;
      let completedDonationCount = 0;
      let averageDonation = 0;
      let donationRecords = [];
      let users = [];

      try {
        if (firebaseService.db) {
          const donationsSnapshot = await firebaseService.db
            .collection("donations")
            .get();
          donationRecords = donationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          const monetaryRecords = donationRecords.filter((r) => !r.isInKind);
          donationCount = monetaryRecords.length;
          if (!donationsSnapshot.empty) {
            monetaryRecords.forEach((data) => {
              if (
                ["completed", "succeeded", "captured"].includes(
                  String(data.status || "").toLowerCase(),
                )
              ) {
                const recType = String(data.type || "").toLowerCase();
                if (
                  recType !== "butikk" &&
                  recType !== "kurs" &&
                  recType !== "course" &&
                  recType !== "product"
                ) {
                  completedDonationCount++;
                  totalDonations += this.normalizeDonationAmountNok(data);
                }
              }
            });
          }
          const usersSnapshot = await firebaseService.db
            .collection("users")
            .get();
          users = usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          if (completedDonationCount > 0) {
            averageDonation = totalDonations / completedDonationCount;
          }
          const causesData =
            await firebaseService.getPageContent("collection_causes");
          this.allCauses =
            causesData && Array.isArray(causesData.items)
              ? causesData.items
              : [];
        }
      } catch (e) {
        console.warn("Kunne ikke hente donasjoner for Gaver-siden:", e);
      }

      const formattedTotal = totalDonations.toLocaleString("no-NO", {
        style: "currency",
        currency: "NOK",
        maximumFractionDigits: 0,
      });
      const formattedAverage = averageDonation.toLocaleString("no-NO", {
        style: "currency",
        currency: "NOK",
        maximumFractionDigits: 0,
      });
      this.allDonationRecords = donationRecords.sort((a, b) => {
        const aDate = this.getDonationDate(a)?.getTime?.() || 0;
        const bDate = this.getDonationDate(b)?.getTime?.() || 0;
        return bDate - aDate;
      });
      this.adminUserMap = new Map(users.map((user) => [user.id, user]));
      this.donationFilters = this.donationFilters || {
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
            <!-- Style overrides to fix Terminal Layout conflict on Gifts Page -->
            <style>
                body.admin-body .causes-stats-grid {
                    display: grid !important;
                    grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
                    grid-auto-flow: row !important;
                    gap: 24px !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    align-items: stretch !important;
                }
                @media (max-width: 1024px) {
                    body.admin-body .causes-stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                    body.admin-body .causes-stats-grid > * {
                        grid-column: 1 / -1 !important;
                    }
                }
                .btn-link-profile, .btn-link-donor-profile {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    white-space: nowrap !important;
                }
                .btn-link-profile:hover, .btn-link-donor-profile:hover {
                    transform: translateY(-1px) !important;
                    filter: brightness(0.95) !important;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08) !important;
                }
                .btn-link-profile:active, .btn-link-donor-profile:active {
                    transform: translateY(0) scale(0.97) !important;
                }
                .data-table th, .data-table th div {
                    white-space: nowrap !important;
                }
                .modal-container, .modal-content {
                    transform-origin: center !important;
                }
                @keyframes modalAppear {
                    from { opacity: 0; transform: scale(0.85); }
                    to { opacity: 1; transform: scale(1); }
                }
            </style>

            <!-- Tabs Navigation -->
            <div class="causes-tabs-container" style="margin-bottom: 24px;">
                <div class="automation-tabs" style="border-bottom: 2px solid #e2e8f0; background: #fff; border-radius: 12px 12px 0 0; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    ${givingTabLinks()}
                    
                    <div class="causes-toolbar" style="display: flex; align-items: center; gap: 12px; padding: 8px 0; flex-wrap: wrap;">
                        <!-- Global Period Selector -->
                        <div class="form-group" style="margin: 0; display: flex; align-items: center; gap: 8px;">
                            <label style="font-weight: 700; color: #1B4965; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; white-space: nowrap;">Periode:</label>
                            <select id="global-date-preset" class="form-control" style="font-weight: 600; color: #0f172a; border-radius: 8px; height: 36px; padding: 0 42px 0 12px !important; font-size: 13px; min-width: 140px; margin: 0; border: 1px solid #cbd5e1; background-color: #fff;">
                                <option value="today">I dag</option>
                                <option value="7">Siste 7 dager</option>
                                <option value="30" selected>Siste 30 dager</option>
                                <option value="month">Denne måneden</option>
                                <option value="year">I år</option>
                                <option value="all">Alle</option>
                                <option value="custom">Egendefinert</option>
                            </select>
                        </div>
                        <div id="global-custom-dates" style="display: none; gap: 8px; align-items: center;">
                            <div class="form-group" style="margin: 0; display: flex; align-items: center; gap: 4px;">
                                <label style="font-weight: 700; color: #1B4965; font-size: 11px; text-transform: uppercase; margin: 0;">Fra:</label>
                                <input type="date" id="global-start-date" class="form-control" style="border-radius: 8px; height: 36px; padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1;">
                            </div>
                            <div class="form-group" style="margin: 0; display: flex; align-items: center; gap: 4px;">
                                <label style="font-weight: 700; color: #1B4965; font-size: 11px; text-transform: uppercase; margin: 0;">Til:</label>
                                <input type="date" id="global-end-date" class="form-control" style="border-radius: 8px; height: 36px; padding: 4px 8px; font-size: 12px; border: 1px solid #cbd5e1;">
                            </div>
                        </div>
                        <div class="causes-toolbar-actions" style="display: flex; gap: 8px; align-items: center;">
                            <button type="button" class="btn-primary" id="add-manual-donation-btn" style="display:flex; align-items:center; gap:8px; padding:8px 16px; border-radius:8px; font-weight:600; height:36px; font-size: 13px; margin: 0;">
                                <span class="material-symbols-outlined" style="font-size:18px;">add_card</span>
                                Registrer gave
                            </button>
                            <button type="button" class="btn-secondary" id="open-bank-import-btn" style="display:flex; align-items:center; gap:8px; padding:8px 16px; border-radius:8px; font-weight:600; height:36px; font-size: 13px; margin: 0; border: 1px solid #cbd5e1; background: #fff;">
                                <span class="material-symbols-outlined" style="font-size:18px;">upload_file</span>
                                Importer bank
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 1: Dashboard Content -->
            <div id="cause-tab-content-dashboard" class="cause-tab-pane" style="display: block;">
                <div id="causes-dashboard-container">
                    <div style="display:flex; justify-content:center; padding:32px;">
                        <div class="loader">Laster dashboard...</div>
                    </div>
                </div>
            </div>

            <!-- Tab: Innsamlinger Content -->
            <div id="cause-tab-content-causes" class="cause-tab-pane" style="display: none;">
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header flex-between">
                        <div>
                            <h3 class="card-title">Aktive innsamlingsaksjoner</h3>
                            <p class="section-subtitle" style="margin-bottom: 0;">Administrer dine pågående kampanjer.</p>
                        </div>
                        <button class="btn-primary" id="add-cause-btn">
                            <span class="material-symbols-outlined">add</span>
                            Ny aksjon
                        </button>
                    </div>
                    <div class="card-body" id="causes-list">
                        <div class="loader"></div>
                    </div>
                </div>
                
                <div class="stats-grid causes-stats-grid" id="causes-extra-widgets" style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; width: 100%;">
                    <!-- Populated dynamically in loadCauses() -->
                </div>
            </div>

            <!-- Tab 2: By Donation Content -->
            <div id="cause-tab-content-donations" class="cause-tab-pane" style="display: none;">
                <div class="stats-grid causes-stats-grid" style="margin-bottom: 32px;">
                    <div class="stat-card modern">
                        <div class="stat-icon-wrap green">
                            <span class="material-symbols-outlined">payments</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Fullført i perioden</h3>
                            <p class="stat-value" id="donation-total-amount">${formattedTotal}</p>
                            <p class="stat-trend" id="donation-total-subtitle" style="padding-left: 0 !important; margin-left: 0 !important;">Fullførte gaver i perioden</p>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap blue">
                            <span class="material-symbols-outlined">volunteer_activism</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Antall gaver i perioden</h3>
                            <p class="stat-value" id="donation-total-count">${donationCount}</p>
                            <span class="stat-meta" id="donation-count-subtitle">Transaksjoner i perioden</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap mint">
                            <span class="material-symbols-outlined">trending_up</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Snittgave i perioden</h3>
                            <p class="stat-value" id="donation-average-amount">${formattedAverage}</p>
                            <span class="stat-meta" id="donation-average-subtitle">Snitt per donasjon i perioden</span>
                        </div>
                    </div>

                    <div class="stat-card modern">
                        <div class="stat-icon-wrap purple">
                            <span class="material-symbols-outlined">today</span>
                        </div>
                        <div class="stat-content">
                            <h3 class="stat-label">Dagens gaver</h3>
                            <p class="stat-value" id="donation-today-amount">--</p>
                            <span class="stat-meta" id="donation-today-count">Laster...</span>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header flex-between">
                        <div>
                            <h3 class="card-title">Gaveoversikt</h3>
                            <p class="section-subtitle" style="margin-bottom: 0;">Filtrer på status, metode, transaksjonstype eller giver.</p>
                        </div>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="position:relative; width:220px;">
                                <span class="material-symbols-outlined" style="position:absolute; left:10px; top:50%; transform:translateY(-50%) !important; font-size:18px; color:#64748b; pointer-events:none;">search</span>
                                <input id="donation-search" class="form-control" type="search" placeholder="Søk..." style="padding-left:36px !important; height:40px; font-size:13px; border-radius:8px; border:1px solid #cbd5e1; width:100%; margin:0;">
                            </div>
                            <button type="button" class="btn-secondary" id="print-donations-report-btn" style="display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; height:40px;">
                                <span class="material-symbols-outlined" style="font-size:20px;">print</span>
                                Skriv ut rapport
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 130px), 1fr));gap:12px;margin-bottom:16px;">
                            <div class="form-group" style="margin:0;">
                                <label>Status</label>
                                <select id="donation-status-filter" class="form-control">
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
                                <select id="donation-method-filter" class="form-control">
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
                            <div class="form-group" style="margin:0;">
                                <label>Type transaksjon</label>
                                <select id="donation-type-filter" class="form-control">
                                    <option value="all">Alle typer</option>
                                    <option value="gave">Enkeltgave</option>
                                    <option value="fast">Fast avtale</option>
                                </select>
                            </div>

                            <div style="display:flex; align-items:flex-end;">
                                <button type="button" class="btn-secondary" id="donation-clear-filters" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; width:100%; height:40px;">
                                    <span class="material-symbols-outlined" style="font-size:20px;">filter_alt_off</span>
                                    Nullstill
                                </button>
                            </div>
                        </div>

                        <div class="stats-grid donation-metrics-grid causes-stats-grid" style="margin-bottom: 20px;">
                            <div class="stat-card modern">
                                <div class="stat-content">
                                    <h3 class="stat-label">Valgt periode</h3>
                                    <p class="stat-value" id="donation-period-amount">--</p>
                                    <span class="stat-meta" id="donation-period-count">Laster...</span>
                                </div>
                            </div>
                            <div class="stat-card modern">
                                <div class="stat-content">
                                    <h3 class="stat-label">Givere</h3>
                                    <p class="stat-value" id="donation-donor-count">--</p>
                                    <span class="stat-meta">Unike givere i filteret</span>
                                </div>
                            </div>
                            <div class="stat-card modern">
                                <div class="stat-content">
                                    <h3 class="stat-label">Under behandling</h3>
                                    <p class="stat-value" id="donation-pending-count">--</p>
                                    <span class="stat-meta">Ikke fullført ennå</span>
                                </div>
                            </div>
                            <div class="stat-card modern">
                                <div class="stat-content">
                                    <h3 class="stat-label">Ukoblede</h3>
                                    <p class="stat-value" id="donation-unmatched-count">--</p>
                                    <span class="stat-meta">Mangler profilkobling</span>
                                </div>
                            </div>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="data-table" style="width:100%;">
                                <thead>
                                    <tr>
                                        <th>Dato</th>
                                        <th>Giver</th>
                                        <th>Metode</th>
                                        <th>Status</th>
                                        <th>Profil</th>
                                        <th class="text-right">Beløp</th>
                                    </tr>
                                </thead>
                                <tbody id="donation-transactions-body">
                                    <tr><td colspan="6" style="padding:28px;text-align:center;color:#64748b;">Laster gaver...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 3: By Donor Content -->
            <div id="cause-tab-content-donors" class="cause-tab-pane" style="display: none;">
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header flex-between">
                        <div>
                            <h3 class="card-title">Givere</h3>
                            <p class="section-subtitle" style="margin-bottom: 0;">Aggregert oversikt per giver i valgt periode.</p>
                        </div>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="position:relative; width:220px;">
                                <span class="material-symbols-outlined" style="position:absolute; left:10px; top:50%; transform:translateY(-50%) !important; font-size:18px; color:#64748b; pointer-events:none;">search</span>
                                <input id="donor-search" class="form-control" type="search" placeholder="Søk etter giver..." style="padding-left:36px !important; height:40px; font-size:13px; border-radius:8px; border:1px solid #cbd5e1; width:100%; margin:0;">
                            </div>
                            <button type="button" class="btn-secondary" id="print-donors-report-btn" style="display:flex; align-items:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; height:40px;">
                                <span class="material-symbols-outlined" style="font-size:20px;">print</span>
                                Skriv ut rapport
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 130px), 1fr));gap:12px;margin-bottom:16px;">
                            <div class="form-group" style="margin:0;">
                                <label>Status</label>
                                <select id="donor-status-filter" class="form-control">
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
                                <select id="donor-method-filter" class="form-control">
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
                            <div class="form-group" style="margin:0;">
                                <label>Type transaksjon</label>
                                <select id="donor-type-filter" class="form-control">
                                    <option value="all">Alle typer</option>
                                    <option value="gave">Enkeltgave</option>
                                    <option value="fast">Fast avtale</option>
                                    <option value="butikk">Butikk</option>
                                    <option value="kurs">Kurs</option>
                                </select>
                            </div>

                            <div class="form-group" style="margin:0;">
                                <label>Sortering</label>
                                <select id="donor-sort-by" class="form-control">
                                    <option value="latestDate">Siste aktivitet (Standard)</option>
                                    <option value="total">Sum totalt (Høyest først)</option>
                                    <option value="totalGifts">Sum gaver (Høyest først)</option>
                                    <option value="totalShop">Sum butikk (Høyest først)</option>
                                    <option value="giftCount">Antall transaksjoner (Flest først)</option>
                                    <option value="name">Navn (A-Å)</option>
                                </select>
                            </div>
                            <div style="display:flex; align-items:flex-end;">
                                <button type="button" class="btn-secondary" id="donor-clear-filters" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 16px; border-radius:8px; font-weight:600; width:100%; height:40px;">
                                    <span class="material-symbols-outlined" style="font-size:20px;">filter_alt_off</span>
                                    Nullstill
                                </button>
                            </div>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th class="sortable-header" data-sort="name" style="cursor:pointer; user-select:none; transition:background-color 0.2s, color 0.2s;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1B4965'" onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                        <div class="sort-header-wrapper" style="display:inline-flex; align-items:center; gap:6px;">
                                            Giver
                                            <span class="material-symbols-outlined sort-icon" style="font-size:14px; display:none; vertical-align:middle; line-height:1; position:relative; top:-1px;">arrow_upward</span>
                                        </div>
                                    </th>
                                    <th class="sortable-header" data-sort="giftCount" style="cursor:pointer; user-select:none; transition:background-color 0.2s, color 0.2s;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1B4965'" onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                        <div class="sort-header-wrapper" style="display:inline-flex; align-items:center; gap:6px;">
                                            Fullført / totalt
                                            <span class="material-symbols-outlined sort-icon" style="font-size:14px; display:none; vertical-align:middle; line-height:1; position:relative; top:-1px;">arrow_upward</span>
                                        </div>
                                    </th>
                                    <th>Metoder</th>
                                    <th class="sortable-header" data-sort="latestDate" style="cursor:pointer; user-select:none; transition:background-color 0.2s, color 0.2s;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1B4965'" onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                        <div class="sort-header-wrapper" style="display:inline-flex; align-items:center; gap:6px;">
                                            Siste gave
                                            <span class="material-symbols-outlined sort-icon" style="font-size:14px; display:none; vertical-align:middle; line-height:1; position:relative; top:-1px;">arrow_upward</span>
                                        </div>
                                    </th>
                                    <th>Profil</th>
                                    <th class="sortable-header text-right" data-sort="totalGifts" style="cursor:pointer; user-select:none; transition:background-color 0.2s, color 0.2s; text-align:right;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1B4965'" onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                        <div class="sort-header-wrapper" style="display:inline-flex; align-items:center; justify-content:flex-end; gap:6px; width:100%;">
                                            Gave-sum
                                            <span class="material-symbols-outlined sort-icon" style="font-size:14px; display:none; vertical-align:middle; line-height:1; position:relative; top:-1px;">arrow_upward</span>
                                        </div>
                                    </th>
                                    <th class="sortable-header text-right" data-sort="totalShop" style="cursor:pointer; user-select:none; transition:background-color 0.2s, color 0.2s; text-align:right;" onmouseover="this.style.backgroundColor='#f1f5f9'; this.style.color='#1B4965'" onmouseout="this.style.backgroundColor=''; this.style.color=''">
                                        <div class="sort-header-wrapper" style="display:inline-flex; align-items:center; justify-content:flex-end; gap:6px; width:100%;">
                                            Butikk-sum
                                            <span class="material-symbols-outlined sort-icon" style="font-size:14px; display:none; vertical-align:middle; line-height:1; position:relative; top:-1px;">arrow_upward</span>
                                        </div>
                                    </th>
                                    <th style="width:1px;"></th>
                                </tr>
                            </thead>
                            <tbody id="donation-donors-body">
                                <tr><td colspan="8" style="padding:28px;text-align:center;color:#64748b;">Laster givere...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>



            <!-- Tab 4: In-Kind Content -->
            <div id="cause-tab-content-inkind" class="cause-tab-pane" style="display: none;">
                <div id="inkind-donations-container">
                    <!-- Loaded dynamically -->
                </div>
            </div>

            <!-- Global Modals -->
            <dialog id="bank-import-modal" class="donation-admin-dialog" aria-label="Importer bankgaver">
                <div class="modal-content" style="max-width:1100px;position:relative;max-height:min(92vh,820px);overflow:auto;">
                    <div class="modal-header" style="padding:24px 32px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3 style="margin:0;">Importer bankgaver</h3>
                            <p class="section-subtitle" style="margin:4px 0 0;">Last opp CSV eller CAMT/XML fra nettbanken. Du får forhåndsvisning før lagring.</p>
                        </div>
                        <button class="modal-close" aria-label="Lukk vinduet" type="button" onclick="window.adminManager?.closeBankImportModal?.()">×</button>
                    </div>
                    <div class="modal-body" style="display:grid;gap:16px; padding:24px 32px;">
                        <div class="form-group" style="margin:0;">
                            <label for="bank-import-file" style="display:block; font-weight:600; color:#334155; font-size:0.875rem; margin-bottom:12px;">Bankfil</label>
                            <input id="bank-import-file" type="file" accept=".csv,.txt,.xml,text/csv,text/plain,application/xml,text/xml" style="display:none;">
                            <div id="bank-import-dropzone" style="border:2px dashed #cbd5e1; border-radius:12px; padding:32px 24px; text-align:center; background:#f8fafc; cursor:pointer; transition:all 0.2s ease-in-out; display:flex; flex-direction:column; align-items:center; gap:12px;" onmouseover="this.style.borderColor='#1B4965'; this.style.background='#f0f4f8';" onmouseout="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc';">
                                <span class="material-symbols-outlined" style="font-size:48px; color:#1B4965;">cloud_upload</span>
                                <div>
                                    <span style="font-weight:700; color:#1B4965; font-size:1rem;">Dra og slipp bankfilen her</span>
                                    <span style="color:#64748b; font-size:0.875rem; display:block; margin-top:4px;">eller klikk for å velge fra filutforsker</span>
                                </div>
                                <span style="font-size:0.75rem; color:#94a3b8; line-height:1.5; margin-top:4px;">
                                    Støtter vanlige CSV-filer (inkludert Vipps) og ISO 20022 CAMT XML.
                                </span>
                            </div>
                        </div>
                        <div id="bank-import-summary" style="font-size:13px;color:#475569;font-weight:700;"></div>
                        <div id="bank-import-preview">
                            <div style="padding:24px;text-align:center;color:#64748b;">Velg en CSV- eller CAMT/XML-fil fra nettbanken.</div>
                        </div>
                    </div>
                    <div class="modal-footer" style="padding:24px 32px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:12px;">
                        <button class="btn-secondary" type="button" id="cancel-bank-import-btn">Avbryt</button>
                        <button class="btn-primary" type="button" id="save-bank-import-btn" disabled>
                            <span class="material-symbols-outlined">cloud_upload</span>
                            Importer valgte
                        </button>
                    </div>
                </div>
            </dialog>

            <dialog id="manual-donation-modal" class="donation-admin-dialog" aria-label="Registrer gave">
                <div class="modal-content" style="max-width:720px;position:relative;max-height:min(90vh,760px);overflow:auto;">
                    <div class="modal-header" style="padding:24px 32px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h3 style="margin:0; font-size:1.5rem; color:#0f172a; font-weight:700;">Registrer manuell gave</h3>
                            <p class="section-subtitle" style="margin:8px 0 0; color:#64748b; font-size:0.875rem; line-height:1.5;">For bank, kontant, Vipps utenom nettbetaling eller andre tjenester.</p>
                        </div>
                        <button class="modal-close" aria-label="Lukk vinduet" type="button" onclick="window.adminManager?.closeManualDonationModal?.()" style="background:transparent; border:none; color:#64748b; cursor:pointer; padding:4px; margin:-4px; display:flex; align-items:center; justify-content:center; transition:color 0.2s ease, transform 0.2s ease;" onmouseover="this.style.color='#0f172a'; this.style.transform='scale(1.1)';" onmouseout="this.style.color='#64748b'; this.style.transform='scale(1)';">
                            <span class="material-symbols-outlined" style="font-size:24px;">close</span>
                        </button>
                    </div>
                    <form id="manual-donation-form">
                        <div class="modal-body" style="display:grid;gap:24px; padding:24px 32px;">
                            <div class="form-group" style="margin:0;">
                                <label for="manual-donation-user" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Koble til eksisterende bruker</label>
                                <select id="manual-donation-user" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                    <option value="">Ikke koble til profil</option>
                                    ${manualDonationUserOptions}
                                </select>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 220px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-donor-name" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Givers navn</label>
                                    <input id="manual-donor-name" class="form-control" type="text" placeholder="Fullt navn" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-donor-email" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Givers e-post</label>
                                    <input id="manual-donor-email" class="form-control" type="email" placeholder="navn@eksempel.no" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label for="manual-donation-fund" style="display:block;margin-bottom:8px;font-weight:600;">Innsamlingsaksjon</label>
                                <select id="manual-donation-fund" class="form-control" style="width:100%;padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;" disabled><option value="">Henter innsamlingsaksjoner …</option></select>
                                <p id="manual-donation-fund-hint" role="status" style="font-size:13px;color:#64748b;line-height:1.5;margin:8px 0 0;"></p>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 160px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-donation-amount" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Beløp (NOK)</label>
                                    <input id="manual-donation-amount" class="form-control" type="number" min="1" step="0.01" required placeholder="500" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-donation-date" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Dato</label>
                                    <input id="manual-donation-date" class="form-control" type="datetime-local" required style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 180px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-donation-method" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Metode</label>
                                    <select id="manual-donation-method" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                        <option value="bank">Bank</option>
                                        <option value="manual">Manuell</option>
                                        <option value="vipps_manual">Vipps manuelt</option>
                                        <option value="cash">Kontant</option>
                                        <option value="other">Annen tjeneste</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-donation-status" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Status</label>
                                    <select id="manual-donation-status" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                        <option value="completed">Fullført</option>
                                        <option value="pending">Venter</option>
                                        <option value="processing">Behandles</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-donation-reference" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Referanse</label>
                                    <input id="manual-donation-reference" class="form-control" type="text" placeholder="Bankreferanse e.l." style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label for="manual-donation-note" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Notat</label>
                                <textarea id="manual-donation-note" class="form-control" rows="3" placeholder="Valgfritt internt notat" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease; resize:vertical;"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:24px 32px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; align-items:center; gap:16px;">
                            <button class="btn-secondary" type="button" id="cancel-manual-donation-btn" style="padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; transition:all 0.2s ease;">Avbryt</button>
                            <button class="btn-primary" type="submit" id="save-manual-donation-btn" style="padding:12px 24px; border-radius:8px; font-weight:600; display:flex; align-items:center; gap:8px; cursor:pointer; transition:all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size:20px;">save</span>
                                Lagre gave
                            </button>
                        </div>
                    </form>
                </div>
            </dialog>

            <dialog id="cause-form-modal" aria-labelledby="form-title">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header" style="padding:24px 32px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
                        <h3 id="form-title">Ny innsamlingsaksjon</h3>
                        <button class="modal-close" aria-label="Lukk vinduet" onclick="document.getElementById('cause-form-modal').close()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="cause-title">Tittel</label>
                            <input type="text" id="cause-title" class="form-control" placeholder="f.eks. Støtt vårt arbeid">
                        </div>
                        <div class="form-group">
                            <label for="cause-description">Beskrivelse</label>
                            <p class="text-muted">Oversettelser kan redigeres i feltene for engelsk og spansk nedenfor. Tomme felt forsøkes oversatt automatisk.</p>
                            <textarea id="cause-description" class="form-control" style="height: 100px;" placeholder="Beskriv hva innsamlingen er for..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="cause-collected">Innsamlet beløp (kr)</label>
                            <input type="number" id="cause-collected" class="form-control" placeholder="0" value="0">
                        </div>
                        <div class="form-group">
                            <label for="cause-goal">Målbeløp (kr)</label>
                            <input type="number" id="cause-goal" class="form-control" placeholder="100000" value="100000">
                        </div>
                        <div class="form-group"><label for="cause-hero-intro">Kort tekst i toppbildet (valgfritt)</label><textarea id="cause-hero-intro" class="form-control" maxlength="220" rows="2" placeholder="En kort introduksjon til aksjonen"></textarea><small>Maks 220 tegn. La feltet stå tomt for å vise bare tittelen.</small></div>
                        <details class="cause-language-fields"><summary>Engelsk</summary><p class="text-muted">Utfylte felt brukes direkte. Tomme felt forsøkes oversatt automatisk.</p><div class="form-group"><label for="cause-en-title">Tittel (engelsk)</label><input id="cause-en-title" class="form-control"></div><div class="form-group"><label for="cause-en-description">Beskrivelse (engelsk)</label><textarea id="cause-en-description" class="form-control" rows="5"></textarea></div><div class="form-group"><label for="cause-en-heroIntro">Kort tekst i toppbildet (engelsk)</label><textarea id="cause-en-heroIntro" class="form-control" rows="2" maxlength="220"></textarea></div></details>
                        <details class="cause-language-fields"><summary>Spansk</summary><p class="text-muted">Utfylte felt brukes direkte. Tomme felt forsøkes oversatt automatisk.</p><div class="form-group"><label for="cause-es-title">Tittel (spansk)</label><input id="cause-es-title" class="form-control"></div><div class="form-group"><label for="cause-es-description">Beskrivelse (spansk)</label><textarea id="cause-es-description" class="form-control" rows="5"></textarea></div><div class="form-group"><label for="cause-es-heroIntro">Kort tekst i toppbildet (spansk)</label><textarea id="cause-es-heroIntro" class="form-control" rows="2" maxlength="220"></textarea></div></details>
                        <div class="form-group"><label for="cause-amount-mode">Gavebeløp</label><select id="cause-amount-mode" class="form-control"><option value="open">Valgfritt beløp</option><option value="fixed">Ett bestemt beløp</option><option value="presets">Flere beløpsvalg</option></select></div>
                        <div class="form-group" id="cause-fixed-group" hidden><label for="cause-fixed-amount">Fast beløp (kr)</label><input id="cause-fixed-amount" class="form-control" type="number" min="1" max="100000" step="1" value="250"></div>
                        <div class="form-group" id="cause-presets-group" hidden><label for="cause-amount-options">Beløpsvalg i kroner, adskilt med komma</label><input id="cause-amount-options" class="form-control" value="100, 250, 500"><label><input id="cause-allow-custom" type="checkbox" checked> Tillat også valgfritt beløp</label></div>
                        <div class="form-group"><label for="cause-frequency">Gavetype</label><select id="cause-frequency" class="form-control"><option value="both">Engangsgave og fast gave</option><option value="once">Bare engangsgave</option><option value="monthly">Bare fast månedlig gave</option></select></div>
                        <div class="form-group"><label for="cause-info-url">Lenke til mer informasjon (valgfritt)</label><input type="url" id="cause-info-url" class="form-control" placeholder="https://..."><small>Lenke til mer informasjon eller en ekstern side.</small></div>
                        <div class="form-group"><label><input type="checkbox" id="cause-active" checked> Vis aksjonen på donasjonssiden</label></div>
                        <div class="form-group">
                            <label for="cause-image">Bildekilde (URL)</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="url" id="cause-image" class="form-control" placeholder="https://images.unsplash.com/..." style="flex: 1;">
                                <button type="button" id="cause-upload-btn" class="btn btn-secondary">Last opp bilde</button>
                                <input type="file" id="cause-image-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
                                <button type="button" id="cause-unsplash-btn" class="btn btn-secondary" style="padding: 0 12px; border-radius: 8px; display: flex; align-items: center; gap: 4px; font-size: 13px;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">image_search</span> Unsplash
                                </button>
                            </div>
                        </div>
                        <p id="cause-upload-status" role="status" class="cause-upload-status"></p><img id="cause-image-preview" alt="Valgt aksjonsbilde" hidden>
                    </div>
                    <div class="modal-footer" style="padding:24px 32px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:12px;">
                        <button class="btn-secondary" onclick="document.getElementById('cause-form-modal').close()">Avbryt</button>
                        <button type="button" class="btn-secondary" id="save-cause-draft-btn">Lagre som kladd</button>
                        <button class="btn-primary" id="save-cause-btn">Lagre</button>
                    </div>
                </div>
            </dialog>

            <!-- Manual In-Kind Modal -->
            <dialog id="manual-inkind-modal" class="donation-admin-dialog" aria-label="Registrer fysisk gave">
                <div class="modal-content" style="max-width:720px;position:relative;max-height:min(90vh,760px);overflow:auto;">
                    <div class="modal-header" style="padding:24px 32px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h3 style="margin:0; font-size:1.5rem; color:#0f172a; font-weight:700;">Registrer fysisk gave</h3>
                            <p class="section-subtitle" style="margin:8px 0 0; color:#64748b; font-size:0.875rem; line-height:1.5;">For registrering av fysiske gaver, utstyr, tjenester eller aksjer.</p>
                        </div>
                        <button class="modal-close" aria-label="Lukk vinduet" type="button" onclick="window.adminManager?.closeManualInKindModal?.()" style="background:transparent; border:none; color:#64748b; cursor:pointer; padding:4px; margin:-4px; display:flex; align-items:center; justify-content:center; transition:color 0.2s ease, transform 0.2s ease;" onmouseover="this.style.color='#0f172a'; this.style.transform='scale(1.1)';" onmouseout="this.style.color='#64748b'; this.style.transform='scale(1)';">
                            <span class="material-symbols-outlined" style="font-size:24px;">close</span>
                        </button>
                    </div>
                    <form id="manual-inkind-form">
                        <div class="modal-body" style="display:grid;gap:24px; padding:24px 32px;">
                            <div class="form-group" style="margin:0;">
                                <label for="manual-inkind-user" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Koble til eksisterende bruker</label>
                                <select id="manual-inkind-user" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                    <option value="">Ikke koble til profil</option>
                                    ${manualDonationUserOptions}
                                </select>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 220px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-inkind-donor-name" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Givers navn</label>
                                    <input id="manual-inkind-donor-name" class="form-control" type="text" placeholder="Fullt navn" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-inkind-donor-email" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Givers e-post</label>
                                    <input id="manual-inkind-donor-email" class="form-control" type="email" placeholder="navn@eksempel.no" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 220px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-inkind-desc" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Beskrivelse av fysisk gave</label>
                                    <input id="manual-inkind-desc" class="form-control" type="text" required placeholder="f.eks. Kjøleskap, maling, etc." style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-inkind-date" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Dato mottatt</label>
                                    <input id="manual-inkind-date" class="form-control" type="date" required style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%, 180px), 1fr));gap:16px;">
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-inkind-fund" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Formål (Fund)</label>
                                    <select id="manual-inkind-fund" class="form-control" style="width:100%; padding:10px 42px 10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                        <option value="general">general</option>
                                        <option value="basar">basar</option>
                                        <option value="misjon">misjon</option>
                                        <option value="new-building">new-building</option>
                                        <option value="domestic-missions-sandnes">domestic-missions-sandnes</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin:0;">
                                    <label for="manual-inkind-value" style="display:block; margin-bottom:8px; font-weight:600; color:#334155; font-size:0.875rem;">Verdi (USD, valgfritt)</label>
                                    <input id="manual-inkind-value" class="form-control" type="number" min="0" step="0.01" placeholder="300" style="width:100%; padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border-color 0.2s ease;">
                                </div>
                                <div class="form-group" style="margin:0; display:flex; align-items:center; padding-top:28px;">
                                    <label style="display:flex; align-items:center; gap:8px; font-weight:600; color:#334155; font-size:0.875rem; cursor:pointer;">
                                        <input id="manual-inkind-ack" type="checkbox" style="width:18px; height:18px; cursor:pointer;">
                                        Mottaksbekreftelse sendt
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer" style="padding:24px 32px; background:#f8fafc; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; align-items:center; gap:16px;">
                            <button class="btn-secondary" type="button" id="cancel-manual-inkind-btn" style="padding:12px 24px; border-radius:8px; font-weight:600; cursor:pointer; transition:all 0.2s ease;">Avbryt</button>
                            <button class="btn-primary" type="submit" id="save-manual-inkind-btn" style="padding:12px 24px; border-radius:8px; font-weight:600; display:flex; align-items:center; gap:8px; cursor:pointer; transition:all 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size:20px;">save</span>
                                Lagre fysisk gave
                            </button>
                        </div>
                    </form>
                </div>
            </dialog>
        `;
      section.setAttribute("data-rendered", "true");

      this.bindDonationAdminFilters();
      this.renderDonationAdminViews();
      await this.loadCauses();

      this.bindCausesTabs();

      document
        .getElementById("manual-inkind-user")
        ?.addEventListener("change", (event) =>
          this.handleManualInKindUserSelect(event.target.value),
        );
      document
        .getElementById("manual-inkind-form")
        ?.addEventListener("submit", (event) => {
          event.preventDefault();
          this.saveManualInKind();
        });
      document
        .getElementById("cancel-manual-inkind-btn")
        ?.addEventListener("click", () => this.closeManualInKindModal());

      document.getElementById("add-cause-btn").addEventListener("click", () => {
        document.getElementById("form-title").textContent =
          "Ny innsamlingsaksjon";
        document.getElementById("cause-title").value = "";
        document.getElementById("cause-description").value = "";
        document.getElementById("cause-collected").value = "0";
        document.getElementById("cause-goal").value = "100000";
        document.getElementById("cause-image").value = "";
        this.setCauseGivingFields({});
        document.getElementById("cause-active").checked = true;
        document.getElementById("cause-form-modal").dataset.editId = "";
        document.getElementById("cause-form-modal").showModal();
      });

      const causeUnsplashBtn = document.getElementById("cause-unsplash-btn");
      if (causeUnsplashBtn) {
        causeUnsplashBtn.onclick = () => {
          if (window.unsplashManager) {
            window.unsplashManager.open((selection) => {
              const input = document.getElementById("cause-image");
              if (input && selection && selection.url) {
                input.value = selection.url;
                this.updateCauseImagePreview();
              }
            }, document.getElementById("cause-form-modal"));
          }
        };
      }

      document
        .getElementById("cause-amount-mode")
        .addEventListener("change", () => this.toggleCauseGivingFields());
      document.getElementById("cause-upload-btn").onclick = () =>
        document.getElementById("cause-image-file").click();
      document.getElementById("cause-image-file").onchange = (event) =>
        this.uploadCauseImage(event.target.files[0]);
      document
        .getElementById("cause-image")
        .addEventListener("change", () => this.updateCauseImagePreview());
      document
        .getElementById("save-cause-draft-btn")
        .addEventListener("click", () => this.saveCause(true));
      document
        .getElementById("save-cause-btn")
        .addEventListener("click", () => this.saveCause());
    },

    async loadCauses() {
      const listEl = document.getElementById("causes-list");
      if (!listEl) return;

      try {
        const causesData =
          await firebaseService.getPageContent("collection_causes");
        const causes =
          causesData && Array.isArray(causesData.items) ? causesData.items : [];

        if (causes.length === 0) {
          listEl.innerHTML = `
                    <div class="empty-state-container">
                        <span class="material-symbols-outlined empty-state-icon">volunteer_activism</span>
                        <p class="empty-state-text">Ingen innsamlingsaksjoner er opprettet ennå.</p>
                        <button class="btn-primary" style="margin: 24px auto 0; display: block;" onclick="document.getElementById('add-cause-btn').click()">
                            Opprett din første aksjon
                        </button>
                    </div>
                `;
        } else {
          const itemsHtml = causes
            .map((cause, index) => {
              const checkedCollected = cause.collected || 0;
              const checkedGoal = cause.goal || 100000;
              const progress =
                checkedGoal > 0
                  ? Math.round((checkedCollected / checkedGoal) * 100)
                  : 0;

              // Beregn faktiske betalinger registrert på denne aksjonen
              const causeId = cause.id || this.generateSlug(cause.title || "");
              const matchingDonations = (this.allDonationRecords || []).filter(
                (r) => {
                  const isCompleted = [
                    "completed",
                    "succeeded",
                    "captured",
                  ].includes(String(r.status).toLowerCase());
                  if (!isCompleted) return false;
                  const f = String(r.fund || "")
                    .toLowerCase()
                    .trim();
                  return (
                    f === causeId.toLowerCase().trim() ||
                    f ===
                      String(cause.title || "")
                        .toLowerCase()
                        .trim()
                  );
                },
              );
              const actualSum = matchingDonations.reduce(
                (sum, r) => sum + this.normalizeDonationAmountNok(r),
                0,
              );
              const hasDifference = actualSum !== checkedCollected;

              return `
                        <div class="cause-item" style="border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 16px; background: white;">
                            <div class="cause-header-row" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                                <div class="cause-title-wrap">
                                    <h4 class="cause-title-text" style="margin:0 0 4px 0; font-size:16px; font-weight:700; color:#1e293b;">${cause.title || "Uten tittel"}</h4><span class="cause-publication-status">${cause.status === "draft" ? "Kladd" : cause.active === false ? "Skjult" : "Publisert"}</span>
                                    <p class="cause-desc-text" style="margin:0; font-size:13px; color:#64748b;">${cause.description || ""}</p>
                                    <span style="font-size:11px; background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:4px; font-weight:600; text-transform:lowercase; display:inline-block; margin-top:6px;">ID: ${causeId}</span>
                                </div>
                                <div class="cause-actions-wrap" style="display:flex; gap:8px;"><a class="btn-secondary" href="/donasjoner?aksjon=${encodeURIComponent(causeId)}" target="_blank" rel="noopener">Se aksjon</a>
                                    <button class="action-btn edit-cause-btn" data-index="${index}" title="Rediger" aria-label="Rediger aksjon">
                                        <span class="material-symbols-outlined" style="pointer-events: none;">edit</span>
                                    </button>
                                    <button class="action-btn delete-cause-btn" data-index="${index}" title="Slett" aria-label="Slett aksjon" style="color: #ef4444;">
                                        <span class="material-symbols-outlined" style="pointer-events: none;">delete</span>
                                    </button>
                                </div>
                            </div>
                            <div class="cause-stats-row" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:16px; margin-top:16px; padding-top:16px; border-top:1px solid #f1f5f9;">
                                <div class="cause-stat-unit">
                                    <span class="cause-stat-label" style="display:block; font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase;">Visningsbeløp</span>
                                    <span class="cause-stat-number success" style="font-size:15px; font-weight:700; color:#10b981;">${parseInt(checkedCollected).toLocaleString("no-NO")} kr</span>
                                </div>
                                <div class="cause-stat-unit">
                                    <span class="cause-stat-label" style="display:block; font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase;">Betalinger i DB</span>
                                    <span class="cause-stat-number" style="font-size:15px; font-weight:700; color:#1B4965;">${parseInt(actualSum).toLocaleString("no-NO")} kr</span>
                                </div>
                                <div class="cause-stat-unit">
                                    <span class="cause-stat-label" style="display:block; font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase;">Mål</span>
                                    <span class="cause-stat-number" style="font-size:15px; font-weight:700; color:#475569;">${parseInt(checkedGoal).toLocaleString("no-NO")} kr</span>
                                </div>
                                <div class="cause-stat-unit">
                                    <span class="cause-stat-label" style="display:block; font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase;">Progresjon</span>
                                    <span class="cause-stat-number highlight" style="font-size:15px; font-weight:700; color:#d97706;">${progress}%</span>
                                </div>
                            </div>
                            
                            ${
                              hasDifference
                                ? `
                            <div class="cause-reconcile" style="margin-top:16px; padding:12px; background:#fffbeb; border:1px solid #fef3c7; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="color:#d97706; font-size:20px;">warning</span>
                                    <span style="font-size:13px; color:#b45309; font-weight:500;">Avvik: Det er registrert ${actualSum.toLocaleString("no-NO")} kr i betalinger.</span>
                                </div>
                                <button type="button" class="btn btn-secondary sync-cause-btn" data-index="${index}" data-sum="${actualSum}" style="padding:6px 12px; font-size:12px; background:#fff; border:1px solid #d97706; color:#d97706; border-radius:6px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                                    <span class="material-symbols-outlined" style="font-size:16px;">sync</span>
                                    Synkroniser
                                </button>
                            </div>
                            `
                                : ""
                            }

                            <div class="progress-bar-wrap" style="margin-top: 16px; height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden;">
                                <div class="progress-bar" style="width: ${Math.min(progress, 100)}%; height:100%; background:#10b981; border-radius:3px;"></div>
                            </div>
                        </div>
                        `;
            })
            .join("");

          listEl.innerHTML = itemsHtml;
        }

        // Render extra widgets (Donasjonsfordeling & Aksjonsprogresjon) under causes list
        const extraWidgetsEl = document.getElementById("causes-extra-widgets");
        if (extraWidgetsEl) {
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

          extraWidgetsEl.innerHTML = `
                    <div class="card" style="grid-column: span 6; padding: 24px; min-height: 240px; display:flex; flex-direction:column; align-items:center; justify-content:center; margin: 0;">
                        <div style="width:100%; text-align:left; margin-bottom:12px;">
                            <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Donasjonsfordeling</span>
                        </div>
                        <div style="position:relative; width:100px; height:100px;">
                            <div style="position:absolute; inset:0; border-radius:50%; background:#eff6ff; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(59,130,246,0.1);">
                                <div style="width:68px; height:68px; border-radius:50%; background:#3b82f6; color:white; display:flex; align-items:center; justify-content:center;">
                                    <span class="material-symbols-outlined" style="color:#fff; font-size:28px;">volunteer_activism</span>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top:12px; font-size:12px; font-weight:600; color:#64748b; text-align:center;">
                            Alle fullførte donasjoner
                        </div>
                    </div>

                    <div class="card" style="grid-column: span 6; padding: 24px; min-height: 240px; display:flex; flex-direction:column; justify-content:space-between; margin: 0;">
                        <div>
                            <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Aksjonsprogresjon</span>
                            <h4 style="margin: 4px 0 0; font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom:16px;">Mål vs Innsamlet</h4>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:16px; flex:1; justify-content:center;">
                            ${causesProgressHtml}
                        </div>
                    </div>
                `;
        }

        // Add event listeners
        document.querySelectorAll(".edit-cause-btn").forEach((btn) => {
          btn.addEventListener("click", (e) =>
            this.editCause(parseInt(e.target.dataset.index)),
          );
        });

        document.querySelectorAll(".delete-cause-btn").forEach((btn) => {
          btn.addEventListener("click", (e) =>
            this.deleteCause(parseInt(e.target.dataset.index)),
          );
        });

        document.querySelectorAll(".sync-cause-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const idx = parseInt(e.currentTarget.dataset.index);
            const sum = parseInt(e.currentTarget.dataset.sum);
            this.syncCauseCollected(idx, sum);
          });
        });
      } catch (error) {
        console.error("Error loading causes:", error);
        listEl.innerHTML =
          '<p style="color:#ef4444;">Feil ved lasting av innsamlingsaksjoner.</p>';
      }
    },

    async saveCause(asDraft = false) {
      const title = document.getElementById("cause-title").value.trim();
      const description = document
        .getElementById("cause-description")
        .value.trim();
      const heroIntro = document
        .getElementById("cause-hero-intro")
        .value.trim();
      if (heroIntro.length > 220) {
        this.showToast("Bruk maks 220 tegn i toppbildet.", "warning");
        return;
      }
      const collected = Number(
        document.getElementById("cause-collected").value,
      );
      const goal = Number(document.getElementById("cause-goal").value);
      const image = document.getElementById("cause-image").value.trim();
      const infoUrl = document.getElementById("cause-info-url").value.trim();
      const editId = document.getElementById("cause-form-modal").dataset.editId;

      if (!title) {
        this.showToast("Tittel er påkrevd", "warning", 3000);
        return;
      }

      if (
        !Number.isFinite(collected) ||
        collected < 0 ||
        !Number.isFinite(goal) ||
        goal <= 0
      ) {
        this.showToast(
          "Bruk et positivt målbeløp og et innsamlet beløp på minst 0.",
          "warning",
        );
        return;
      }
      if (image && !/^https?:\/\//i.test(image)) {
        this.showToast("Bruk en gyldig bildeadresse.", "warning");
        return;
      }
      if (infoUrl) {
        try {
          const url = new URL(infoUrl);
          if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        } catch {
          this.showToast(
            "Bruk en gyldig lenke som begynner med https:// eller http://.",
            "warning",
          );
          return;
        }
      }
      let giving;
      try {
        const amountMode = document.getElementById("cause-amount-mode").value;
        const amounts =
          amountMode === "fixed"
            ? [Number(document.getElementById("cause-fixed-amount").value)]
            : amountMode === "presets"
              ? [
                  ...new Set(
                    document
                      .getElementById("cause-amount-options")
                      .value.split(",")
                      .map((value) => Number(value.trim())),
                  ),
                ]
              : [];
        if (
          amounts.length > 8 ||
          amounts.some(
            (amount) =>
              !Number.isSafeInteger(amount) || amount < 1 || amount > 100000,
          )
        )
          throw new Error(
            "Velg inntil åtte hele beløp mellom 1 og 100 000 kr.",
          );
        giving = {
          amountMode,
          amounts,
          allowCustom:
            amountMode === "open" ||
            (amountMode === "presets" &&
              document.getElementById("cause-allow-custom").checked),
          frequency: document.getElementById("cause-frequency").value,
        };
      } catch (error) {
        this.showToast(error.message, "warning");
        return;
      }
      const saveButtons = ["save-cause-btn", "save-cause-draft-btn"].map((id) =>
        document.getElementById(id),
      );
      saveButtons.forEach((button) => (button.disabled = true));
      const translationStatus = document.getElementById("cause-upload-status");
      translationStatus.textContent = "Oversetter og lagrer aksjonen …";
      try {
        let causesData =
          await firebaseService.getPageContent("collection_causes");
        let causes =
          causesData && Array.isArray(causesData.items) ? causesData.items : [];
        const previous = editId !== "" ? causes[parseInt(editId)] : null;
        const translations = { no: { title, description, heroIntro } };
        let translationStatusValue = "complete";
        const translationResults = await Promise.allSettled(
          ["en", "es"].flatMap((lang) => {
            translations[lang] = {};
            return ["title", "description", "heroIntro"].map(async (field) => {
              const original = translations.no[field];
              const manual = document
                .getElementById(`cause-${lang}-${field}`)
                .value.trim();
              const old = previous?.translations?.[lang]?.[field];
              if (manual) translations[lang][field] = manual;
              else if (!original) translations[lang][field] = "";
              else if (old && previous[field] === original)
                translations[lang][field] = old;
              else
                translations[lang][field] = await this._translateTextChunk(
                  original,
                  lang,
                  "no",
                  true,
                );
            });
          }),
        );
        const translationFailure = translationResults.find(
          (result) => result.status === "rejected",
        );
        if (translationFailure) {
          console.warn(
            "Aksjonen lagres med ventende oversettelser:",
            translationFailure.reason,
          );
          translationStatusValue = "pending";
        }

        // Opprett en stabil slug-ID
        let causeId = "";
        if (editId !== "" && causes[parseInt(editId)]) {
          causeId = causes[parseInt(editId)].id || this.generateSlug(title);
        } else {
          causeId = this.generateSlug(title) || `cause-${Date.now()}`;
          if (causes.some((cause) => cause.id === causeId))
            causeId += "-" + Date.now();
        }

        const newCause = {
          ...(editId !== "" ? causes[parseInt(editId)] : {}),
          id: causeId,
          title,
          description,
          heroIntro,
          collected,
          goal,
          image,
          infoUrl,
          giving,
          translations,
          translationStatus: translationStatusValue,
          status: asDraft ? "draft" : "published",
          active: !asDraft && document.getElementById("cause-active").checked,
        };

        if (editId !== "") {
          causes[parseInt(editId)] = newCause;
        } else {
          causes.push(newCause);
        }

        await firebaseService.savePageContent("collection_causes", {
          items: causes,
        });
        document.getElementById("cause-form-modal").close();
        await this.loadCauses();
        if (translationStatusValue === "pending") {
          this.showToast(
            (asDraft ? "Kladden" : "Aksjonen") +
              " er lagret. Oversettelsestjenesten svarte ikke. Norsk vises inntil du åpner aksjonen og lagrer på nytt.",
            "warning",
            10000,
          );
        } else {
          this.showToast(
            asDraft
              ? "Innsamlingsaksjonen er lagret som kladd."
              : "Innsamlingsaksjon lagret!",
            "success",
          );
        }
      } catch (error) {
        console.error("Error saving cause:", error);
        const reason = String(error?.message || "Ukjent feil");
        translationStatus.textContent = `Kunne ikke lagre aksjonen: ${reason}. Innholdet ligger fortsatt i skjemaet.`;
        this.showToast(
          "Aksjonen kunne ikke lagres. Se feilmeldingen i skjemaet.",
          "error",
          7000,
        );
      } finally {
        saveButtons.forEach((button) => (button.disabled = false));
      }
    },

    editCause(index) {
      const listEl = document.getElementById("causes-list");
      const causesData = firebaseService
        .getPageContent("collection_causes")
        .then(async (data) => {
          const causes = data && Array.isArray(data.items) ? data.items : [];
          if (causes[index]) {
            const cause = causes[index];
            document.getElementById("form-title").textContent =
              "Rediger innsamlingsaksjon";
            document.getElementById("cause-title").value = cause.title || "";
            document.getElementById("cause-description").value =
              cause.description || "";
            document.getElementById("cause-collected").value =
              cause.collected || 0;
            document.getElementById("cause-goal").value = cause.goal || 100000;
            document.getElementById("cause-image").value = cause.image || "";
            this.setCauseGivingFields(cause);
            document.getElementById("cause-active").checked =
              cause.active !== false && cause.status !== "draft";
            document.getElementById("cause-form-modal").dataset.editId = index;
            document.getElementById("cause-form-modal").showModal();
          }
        });
    },

    async deleteCause(index) {
      const confirmed = await this.showConfirm(
        "Slett aksjon",
        "Er du sikker på at du vil slette denne innsamlingsaksjon?",
        "Slett",
      );
      if (!confirmed) return;

      try {
        let causesData =
          await firebaseService.getPageContent("collection_causes");
        let causes =
          causesData && Array.isArray(causesData.items) ? causesData.items : [];
        causes.splice(index, 1);
        await firebaseService.savePageContent("collection_causes", {
          items: causes,
        });
        await this.loadCauses();
        this.showToast("Innsamlingsaksjon slettet!", "success");
      } catch (error) {
        console.error("Error deleting cause:", error);
        this.showToast("Feil ved sletting av innsamlingsaksjon", "error", 5000);
      }
    },

    generateSlug(text) {
      return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/æ/g, "ae")
        .replace(/ø/g, "o")
        .replace(/å/g, "a")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },

    async syncCauseCollected(index, actualSum) {
      try {
        let causesData =
          await firebaseService.getPageContent("collection_causes");
        let causes =
          causesData && Array.isArray(causesData.items) ? causesData.items : [];
        if (causes[index]) {
          causes[index].collected = actualSum;
          await firebaseService.savePageContent("collection_causes", {
            items: causes,
          });
          this.showToast("Fremgang synkronisert!", "success");
          await this.loadCauses();
        }
      } catch (error) {
        console.error("Error syncing cause collected:", error);
        this.showToast("Feil under synkronisering", "error", 5000);
      }
    },
  };
}
