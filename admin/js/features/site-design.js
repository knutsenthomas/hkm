// site design methods for AdminManager.
export function createSiteDesignMethods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async renderDesignSection() {
      const section = document.getElementById("design-section");
      if (!section) return;

      const DEFAULT_THEME = {
        headingFont: "Inter",
        mainFont: "Inter",
        fontSizeH1Desktop: 48,
        fontSizeH1Mobile: 32,
        fontSizeH2Desktop: 32,
        fontSizeH2Mobile: 24,
        fontSizeBodyDesktop: 16,
        fontSizeBodyMobile: 16,
        primaryColor: "#d17d39",
        secondaryColor: "#d17d39",
        backgroundColor: "#F8F9FA",
        surfaceColor: "#FFFFFF",
        textColor: "#2C3E50",
        textLightColor: "#7F8C8D",
        headerBg: "#FFFFFF",
        footerBg: "#1B4965",
        footerText: "#FFFFFF",
        newsletterBg: "#d17d39",
        newsletterText: "#FFFFFF",
        btnPrimaryBg: "#d17d39",
        btnPrimaryText: "#FFFFFF",
        btnSecondaryBg: "#FFFFFF",
        btnSecondaryText: "#d17d39",
        btnSecondaryBorder: "#d17d39",
      };

      section.innerHTML = `


            <div class="design-ui-shell">
                <div class="design-ui-topbar design-ui-panel">
                    <div class="design-ui-topbar-main">
                        <div class="design-ui-topbar-icon">
                            <span class="material-symbols-outlined">palette</span>
                        </div>
                        <div>
                            <h3 class="design-ui-title">Tema & Utseende</h3>
                            <p class="design-ui-muted">Administrer identitet, typografi og fargepalett i ett samlet kontrollpanel.</p>
                        </div>
                    </div>
                    <div class="design-ui-actions">
                        <button class="btn btn-outline" id="reset-design-settings" type="button">
                            <span class="material-symbols-outlined">restart_alt</span>
                            Tilbakestill tema
                        </button>
                        <button class="btn btn-primary" id="save-design-settings" type="button">
                            <span class="material-symbols-outlined">save</span>
                            Lagre endringer
                        </button>
                    </div>
                </div>

                <div class="design-ui-workspace">
                    <div class="design-ui-top-grid">
                        <div class="design-ui-main-column">
                            <div class="design-ui-panel design-ui-panel--palette">
                            <div class="design-ui-panel-header">
                                <div class="design-ui-panel-header-icon">
                                    <span class="material-symbols-outlined">palette</span>
                                </div>
                                <div>
                                    <h3 class="design-ui-panel-title">Fargepalett</h3>
                                    <p class="design-ui-panel-subtitle">Fargene under er koblet til nettsidens globale stilvariabler og lagres i samme designinnstilling.</p>
                                </div>
                            </div>
                            <div class="design-ui-panel-body">
                                <div class="design-ui-color-controls">
                                    <div class="form-group" style="margin-bottom:0;">
                                        <label>Primærfarge (HKM)</label>
                                        <div class="premium-color-wrapper design-ui-primary-color-input">
                                            <input type="color" id="primary-color-picker" class="premium-color-picker-input" value="#F97316">
                                            <input type="text" id="primary-color-hex" class="premium-color-hex" value="#F97316" placeholder="#F97316">
                                        </div>
                                    </div>
                                    <div class="design-ui-form-grid design-ui-color-edit-grid">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Sekundærfarge</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="secondary-color-picker" class="premium-color-picker-input" value="#FF6B2B">
                                                <input type="text" id="secondary-color-hex" class="premium-color-hex" value="#FF6B2B" placeholder="#FF6B2B">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Bakgrunn</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="background-color-picker" class="premium-color-picker-input" value="#F8F9FA">
                                                <input type="text" id="background-color-hex" class="premium-color-hex" value="#F8F9FA" placeholder="#F8F9FA">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Kort & elementer</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="surface-color-picker" class="premium-color-picker-input" value="#FFFFFF">
                                                <input type="text" id="surface-color-hex" class="premium-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Hovedtekst</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="text-color-picker" class="premium-color-picker-input" value="#2C3E50">
                                                <input type="text" id="text-color-hex" class="premium-color-hex" value="#2C3E50" placeholder="#2C3E50">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Aksent / dempet tekst</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="text-light-color-picker" class="premium-color-picker-input" value="#7F8C8D">
                                                <input type="text" id="text-light-color-hex" class="premium-color-hex" value="#7F8C8D" placeholder="#7F8C8D">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="design-ui-divider" style="margin: 24px 0; border-top: 1px solid var(--border-color); opacity: 0.5;"></div>

                                    <h4 class="design-ui-panel-subtitle" style="margin-bottom: 16px; font-weight: 700; color: var(--text-main);">Seksjonsspesifikke farger</h4>
                                    <div class="design-ui-form-grid design-ui-color-edit-grid">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Header Bakgrunn</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="header-bg-picker" class="premium-color-picker-input" value="#FFFFFF">
                                                <input type="text" id="header-bg-hex" class="premium-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Footer Bakgrunn</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="footer-bg-picker" class="premium-color-picker-input" value="#2C3E50">
                                                <input type="text" id="footer-bg-hex" class="premium-color-hex" value="#2C3E50" placeholder="#2C3E50">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Footer Tekst</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="footer-text-picker" class="premium-color-picker-input" value="#FFFFFF">
                                                <input type="text" id="footer-text-hex" class="premium-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Nyhetsbrev Bakgrunn</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="newsletter-bg-picker" class="premium-color-picker-input" value="#d17d39">
                                                <input type="text" id="newsletter-bg-hex" class="premium-color-hex" value="#d17d39" placeholder="#d17d39">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Nyhetsbrev Tekst</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="newsletter-text-picker" class="premium-color-picker-input" value="#FFFFFF">
                                                <input type="text" id="newsletter-text-hex" class="premium-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="design-ui-divider" style="margin: 24px 0; border-top: 1px solid var(--border-color); opacity: 0.5;"></div>

                                    <h4 class="design-ui-panel-subtitle" style="margin-bottom: 16px; font-weight: 700; color: var(--text-main);">Knapper</h4>
                                    <div class="design-ui-form-grid design-ui-color-edit-grid">
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Primærknapp Bakgrunn</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="btn-primary-bg-picker" class="premium-color-picker-input" value="#d17d39">
                                                <input type="text" id="btn-primary-bg-hex" class="premium-color-hex" value="#d17d39" placeholder="#d17d39">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Primærknapp Tekst</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="btn-primary-text-picker" class="premium-color-picker-input" value="#FFFFFF">
                                                <input type="text" id="btn-primary-text-hex" class="premium-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Sekundærknapp Bakgrunn</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="btn-secondary-bg-picker" class="premium-color-picker-input" value="#FFFFFF">
                                                <input type="text" id="btn-secondary-bg-hex" class="premium-color-hex" value="#FFFFFF" placeholder="#FFFFFF">
                                            </div>
                                        </div>
                                        <div class="form-group" style="margin-bottom:0;">
                                            <label>Sekundærknapp Tekst/Ramme</label>
                                            <div class="premium-color-wrapper">
                                                <input type="color" id="btn-secondary-text-picker" class="premium-color-picker-input" value="#d17d39">
                                                <input type="text" id="btn-secondary-text-hex" class="premium-color-hex" value="#d17d39" placeholder="#d17d39">
                                            </div>
                                        </div>
                                    </div>

                                    <p class="design-ui-muted design-ui-inline-help" style="margin-top: 20px;">Tips: Bruk mørke farger på footeren for et eksklusivt uttrykk.</p>
                                </div>
                            </div>
                        </div>
                    </div> <!-- Fix: Closing tag for design-ui-main-column -->

                    <aside class="design-ui-side-column">
                            <div class="design-ui-panel design-ui-help-panel design-ui-panel--help">
                                <div class="design-ui-panel-header design-ui-panel-header--compact">
                                    <div class="design-ui-panel-header-icon">
                                        <span class="material-symbols-outlined">info</span>
                                    </div>
                                    <div>
                                        <h3 class="design-ui-panel-title">Hva gjør disse valgene?</h3>
                                    </div>
                                </div>
                                <div class="design-ui-panel-body">
                                    <div class="design-ui-help-list">
                                        <div class="design-ui-help-item">
                                            <span class="material-symbols-outlined">check_circle</span>
                                            <p><strong>Farger:</strong> påvirker knapper, markører, paneler og tydeligheten i admin/opplevelsen på nettsiden.</p>
                                        </div>
                                        <div class="design-ui-help-item">
                                            <span class="material-symbols-outlined">check_circle</span>
                                            <p><strong>Typografi:</strong> gjør uttrykket konsistent på tvers av forsider, artikler og kampanjer.</p>
                                        </div>
                                        <div class="design-ui-help-item">
                                            <span class="material-symbols-outlined">check_circle</span>
                                            <p><strong>Branding:</strong> logo og favicon brukes i faner, deling og navigasjon.</p>
                                        </div>
                                    </div>
                                    <div class="design-ui-callout">
                                        <div class="design-ui-callout-title">Merk</div>
                                        <p>Vi anbefaler å beholde varm HKM-oransje som primærfarge og bruke mørk tekst for best kontrast og lesbarhet.</p>
                                    </div>
                                </div>
                            </div>

                            <div class="design-ui-panel design-ui-brand-profile design-ui-panel--profile">
                                <div class="design-ui-brand-profile-bg"></div>
                                <div class="design-ui-brand-profile-content">
                                    <div class="design-ui-brand-profile-kicker">Grafisk profil</div>
                                    <h3>HKM uttrykk</h3>
                                    <p>Varm, tydelig og tillitsvekkende. La oransje bære handlingene, og la nøytrale flater gi ro rundt budskapet.</p>
                                    <div class="design-ui-brand-profile-chips">
                                        <span>Inter</span>
                                        <span>Oransje CTA</span>
                                        <span>Lyse flater</span>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <div class="design-ui-full-stack">
                        <div class="design-ui-panel design-ui-panel--typography">
                            <div class="design-ui-panel-header">
                                <div class="design-ui-panel-header-icon">
                                    <span class="material-symbols-outlined">text_fields</span>
                                </div>
                                <div>
                                    <h3 class="design-ui-panel-title">Typografi & Tekststørrelser</h3>
                                    <p class="design-ui-panel-subtitle">Kontroller fontfamilie og skalering med live forhåndsvisning av knapper, overskrift og innholdskort.</p>
                                </div>
                            </div>

                            <div class="design-ui-panel-body">
                                <div class="design-ui-typography-layout">
                                    <div class="design-ui-control-stack">
                                        <div class="design-ui-form-grid">
                                            <div class="form-group">
                                                <label>Overskrift font</label>
                                                <select id="heading-font-select" class="form-control">
                                                    <option value="Inter">Inter</option>
                                                    <option value="DM Sans">DM Sans</option>
                                                    <option value="Outfit">Outfit</option>
                                                    <option value="Montserrat">Montserrat</option>
                                                    <option value="Open Sans">Open Sans</option>
                                                    <option value="Roboto">Roboto</option>
                                                    <option value="Merriweather">Merriweather</option>
                                                    <option value="Playfair Display">Playfair Display</option>
                                                </select>
                                            </div>
                                            <div class="form-group">
                                                <label>Brødtekst font</label>
                                                <select id="main-font-select" class="form-control">
                                                    <option value="Inter">Inter</option>
                                                    <option value="DM Sans">DM Sans</option>
                                                    <option value="Outfit">Outfit</option>
                                                    <option value="Montserrat">Montserrat</option>
                                                    <option value="Open Sans">Open Sans</option>
                                                    <option value="Roboto">Roboto</option>
                                                    <option value="Merriweather">Merriweather</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div class="design-ui-range-grid">
                                            <div class="premium-range-group">
                                                <div class="premium-range-header">
                                                    <label>H1 Overskrift (Desktop)</label>
                                                    <span class="premium-range-val" id="font-size-h1-desktop-val">48px</span>
                                                </div>
                                                <input type="range" id="font-size-h1-desktop" class="premium-slider" min="24" max="80" value="48">
                                            </div>

                                            <div class="premium-range-group">
                                                <div class="premium-range-header">
                                                    <label>H1 Overskrift (Mobil)</label>
                                                    <span class="premium-range-val" id="font-size-h1-mobile-val">32px</span>
                                                </div>
                                                <input type="range" id="font-size-h1-mobile" class="premium-slider" min="18" max="48" value="32">
                                            </div>

                                            <div class="premium-range-group">
                                                <div class="premium-range-header">
                                                    <label>H2 Overskrift (Desktop)</label>
                                                    <span class="premium-range-val" id="font-size-h2-desktop-val">32px</span>
                                                </div>
                                                <input type="range" id="font-size-h2-desktop" class="premium-slider" min="20" max="60" value="32">
                                            </div>

                                            <div class="premium-range-group">
                                                <div class="premium-range-header">
                                                    <label>H2 Overskrift (Mobil)</label>
                                                    <span class="premium-range-val" id="font-size-h2-mobile-val">24px</span>
                                                </div>
                                                <input type="range" id="font-size-h2-mobile" class="premium-slider" min="16" max="40" value="24">
                                            </div>

                                            <div class="premium-range-group">
                                                <div class="premium-range-header">
                                                    <label>Brødtekst (PC)</label>
                                                    <span class="premium-range-val" id="font-size-body-desktop-val">16px</span>
                                                </div>
                                                <input type="range" id="font-size-body-desktop" class="premium-slider" min="12" max="24" value="16">
                                            </div>

                                            <div class="premium-range-group">
                                                <div class="premium-range-header">
                                                    <label>Brødtekst (Mobil)</label>
                                                    <span class="premium-range-val" id="font-size-body-mobile-val">16px</span>
                                                </div>
                                                <input type="range" id="font-size-body-mobile" class="premium-slider" min="12" max="24" value="16">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="live-preview-box design-ui-live-preview" id="live-preview-area">
                                        <div class="design-ui-preview-header-flex">
                                            <div class="design-ui-preview-label">Live forhåndsvisning</div>
                                            <div class="design-ui-preview-toggles">
                                                <button type="button" class="preview-toggle active" data-device="desktop">
                                                    <span class="material-symbols-outlined">desktop_windows</span>
                                                </button>
                                                <button type="button" class="preview-toggle" data-device="mobile">
                                                    <span class="material-symbols-outlined">smartphone</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="design-ui-preview-frame" id="design-preview-frame">
                                            <div class="design-ui-preview-top">
                                                <div class="design-ui-preview-brand">
                                                    <div class="design-ui-preview-brand-dot"></div>
                                                    <span>His Kingdom Ministry</span>
                                                </div>
                                                <div class="design-ui-preview-chip">Forside</div>
                                            </div>

                                            <h2 id="typography-preview-text">Slik ser teksten ut</h2>
                                            <p id="design-preview-body-copy">Dette er et eksempel på brødtekst, kontrast og spacing. Bruk denne visningen for å justere uttrykket før du lagrer.</p>

                                            <div class="design-ui-preview-actions">
                                                <button type="button" class="design-ui-preview-btn design-ui-preview-btn-primary" id="design-preview-primary-btn">Gi en gave</button>
                                                <button type="button" class="design-ui-preview-btn design-ui-preview-btn-secondary" id="design-preview-secondary-btn">Les mer</button>
                                            </div>

                                            <div class="design-ui-preview-card">
                                                <div class="design-ui-preview-card-title">Ukens fokus</div>
                                                <div class="design-ui-preview-card-text">Gudstjeneste, undervisning og fellesskap samlet i ett tydelig visuelt uttrykk.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="design-ui-panel design-ui-panel--branding">
                            <div class="design-ui-panel-header">
                                <div class="design-ui-panel-header-icon">
                                    <span class="material-symbols-outlined">branding_watermark</span>
                                </div>
                                <div>
                                    <h3 class="design-ui-panel-title">Grafiske elementer</h3>
                                    <p class="design-ui-panel-subtitle">Logo, favicon og sidetittel brukes i navigasjon, deling og nettleserfaner.</p>
                                </div>
                            </div>
                            <div class="design-ui-panel-body">
                                <div class="design-ui-branding-layout">

                                    <!-- Logo Upload Card -->
                                    <div class="design-ui-upload-card">
                                        <div class="design-ui-upload-card-preview" id="logo-preview-container">
                                            <div class="design-ui-upload-card-placeholder">
                                                <span class="material-symbols-outlined">image</span>
                                                <span>Ingen logo lastet opp</span>
                                            </div>
                                        </div>
                                        <div class="design-ui-upload-card-body">
                                            <label class="design-ui-upload-card-label">Logo</label>
                                            <p class="design-ui-upload-card-hint">Anbefalt: SVG eller PNG med transparent bakgrunn</p>
                                            <div class="design-ui-upload-card-actions">
                                                <input type="text" id="site-logo-url" class="form-control design-ui-upload-url-input" placeholder="https://...">
                                                <div class="design-ui-upload-card-btns">
                                                    <input type="file" id="site-logo-file" accept="image/*" style="display:none;">
                                                    <button class="btn btn-primary btn-sm" id="upload-logo-btn" type="button" onclick="document.getElementById('site-logo-file').click()">
                                                        <span class="material-symbols-outlined">upload</span>
                                                        Last opp
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Favicon Upload Card -->
                                    <div class="design-ui-upload-card">
                                        <div class="design-ui-upload-card-preview" id="favicon-preview-container">
                                            <div class="design-ui-upload-card-placeholder">
                                                <span class="material-symbols-outlined">web_asset</span>
                                                <span>Ingen favicon lastet opp</span>
                                            </div>
                                        </div>
                                        <div class="design-ui-upload-card-body">
                                            <label class="design-ui-upload-card-label">Favicon</label>
                                            <p class="design-ui-upload-card-hint">Anbefalt: 32×32 px PNG eller ICO-format</p>
                                            <div class="design-ui-upload-card-actions">
                                                <input type="text" id="site-favicon-url" class="form-control design-ui-upload-url-input" placeholder="https://...">
                                                <div class="design-ui-upload-card-btns">
                                                    <input type="file" id="site-favicon-file" accept="image/png,image/x-icon,image/svg+xml" style="display:none;">
                                                    <button class="btn btn-primary btn-sm" id="upload-favicon-btn" type="button" onclick="document.getElementById('site-favicon-file').click()">
                                                        <span class="material-symbols-outlined">upload</span>
                                                        Last opp
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                <div class="design-ui-form-grid">
                                    <div class="form-group">
                                        <label>Tekst ved siden av logo</label>
                                        <input type="text" id="site-logo-text" class="form-control" placeholder="His Kingdom Ministry">
                                    </div>
                                    <div class="form-group">
                                        <label>Sidetittel (SEO)</label>
                                        <input type="text" id="site-title-seo" class="form-control" placeholder="His Kingdom Ministry">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="design-ui-panel" style="margin-top: 24px;">
                            <div class="design-ui-panel-header">
                                <div class="design-ui-panel-header-icon">
                                    <span class="material-symbols-outlined">phone_android</span>
                                </div>
                                <div>
                                    <h3 class="design-ui-panel-title">Mobil bunn-meny (Bottom Nav)</h3>
                                    <p class="design-ui-panel-subtitle">Velg hvilke snarveier og ikoner som skal være synlige i navigasjonslinjen på mobil.</p>
                                </div>
                            </div>
                            <div class="design-ui-panel-body">
                                <h4 class="design-ui-panel-subtitle" style="margin-bottom: 16px; font-weight: 700; color: var(--text-main); font-size: 15px;">Min Side bunn-meny</h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 16px; margin-bottom: 24px;">
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-minside-overview" value="overview" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Oversikt</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-minside-profile" value="profile" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Profil</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-minside-courses" value="courses" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Kurs</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-minside-reading-plans" value="reading-plans" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Leseplaner</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-minside-giving" value="giving" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Gaver</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-minside-notifications" value="notifications" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Varslinger</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-minside-tasks" value="tasks" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Huskeliste</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-minside-notes" value="notes" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Notater</span>
                                    </label>
                                </div>

                                <div class="design-ui-divider" style="margin: 20px 0; border-top: 1px solid var(--border-color); opacity: 0.5;"></div>

                                <h4 class="design-ui-panel-subtitle" style="margin-bottom: 16px; font-weight: 700; color: var(--text-main); font-size: 15px;">Admin bunn-meny</h4>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 16px;">
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-admin-overview" value="overview" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Oversikt</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-admin-contacts" value="contacts" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Kontakter</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-admin-minside" value="minside" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Min Side</span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-size: 14px; color: var(--text-main);">
                                        <input type="checkbox" id="nav-admin-settings" value="settings" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #d17d39);">
                                        <span>Innstillinger</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
      section.setAttribute("data-rendered", "true");

      const normalizeHex = (value) => {
        if (typeof value !== "string") return "";
        let raw = value.trim();
        if (!raw) return "";
        if (raw.startsWith("linear-gradient")) return raw;
        if (!raw.startsWith("#")) raw = `#${raw}`;
        const shortHex = /^#([0-9a-f]{3})$/i;
        const fullHex = /^#([0-9a-f]{6})$/i;
        if (shortHex.test(raw)) {
          const [, rgb] = raw.match(shortHex);
          return `#${rgb
            .split("")
            .map((c) => c + c)
            .join("")
            .toUpperCase()}`;
        }
        if (fullHex.test(raw)) return raw.toUpperCase();
        return raw; // Return as-is if it's something else we don't recognize but might be valid CSS
      };

      const hexToRgb = (hex) => {
        const safeHex = normalizeHex(hex);
        if (!safeHex) return { r: 249, g: 115, b: 22 };
        return {
          r: parseInt(safeHex.slice(1, 3), 16),
          g: parseInt(safeHex.slice(3, 5), 16),
          b: parseInt(safeHex.slice(5, 7), 16),
        };
      };

      const rgbToHex = ({ r, g, b }) => {
        const clamp = (v) => Math.max(0, Math.min(255, Math.round(v || 0)));
        return `#${[clamp(r), clamp(g), clamp(b)]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()}`;
      };

      const mixHex = (hexA, hexB, ratioB = 0.5) => {
        const a = hexToRgb(hexA);
        const b = hexToRgb(hexB);
        const ratio = Math.max(0, Math.min(1, Number(ratioB) || 0));
        return rgbToHex({
          r: a.r + (b.r - a.r) * ratio,
          g: a.g + (b.g - a.g) * ratio,
          b: a.b + (b.b - a.b) * ratio,
        });
      };

      const rgbLabel = (hex) => {
        const { r, g, b } = hexToRgb(hex);
        return `RGB ${r} ${g} ${b}`;
      };

      const COLOR_FIELD_CONFIG = [
        {
          key: "primaryColor",
          pickerId: "primary-color-picker",
          hexId: "primary-color-hex",
          tilePrefix: "palette-primary",
          fallback: DEFAULT_THEME.primaryColor,
        },
        {
          key: "secondaryColor",
          pickerId: "secondary-color-picker",
          hexId: "secondary-color-hex",
          tilePrefix: "palette-secondary",
          fallback: DEFAULT_THEME.secondaryColor,
        },
        {
          key: "backgroundColor",
          pickerId: "background-color-picker",
          hexId: "background-color-hex",
          tilePrefix: "palette-bg",
          fallback: DEFAULT_THEME.backgroundColor,
        },
        {
          key: "surfaceColor",
          pickerId: "surface-color-picker",
          hexId: "surface-color-hex",
          tilePrefix: "palette-surface",
          fallback: DEFAULT_THEME.surfaceColor,
        },
        {
          key: "textColor",
          pickerId: "text-color-picker",
          hexId: "text-color-hex",
          tilePrefix: "palette-text",
          fallback: DEFAULT_THEME.textColor,
        },
        {
          key: "textLightColor",
          pickerId: "text-light-color-picker",
          hexId: "text-light-color-hex",
          tilePrefix: "palette-accent",
          fallback: DEFAULT_THEME.textLightColor,
        },
        {
          key: "headerBg",
          pickerId: "header-bg-picker",
          hexId: "header-bg-hex",
          tilePrefix: "palette-header",
          fallback: DEFAULT_THEME.headerBg,
        },
        {
          key: "footerBg",
          pickerId: "footer-bg-picker",
          hexId: "footer-bg-hex",
          tilePrefix: "palette-footer",
          fallback: DEFAULT_THEME.footerBg,
        },
        {
          key: "footerText",
          pickerId: "footer-text-picker",
          hexId: "footer-text-hex",
          tilePrefix: "palette-footer-text",
          fallback: DEFAULT_THEME.footerText,
        },
        {
          key: "newsletterBg",
          pickerId: "newsletter-bg-picker",
          hexId: "newsletter-bg-hex",
          tilePrefix: "palette-newsletter",
          fallback: DEFAULT_THEME.newsletterBg,
        },
        {
          key: "newsletterText",
          pickerId: "newsletter-text-picker",
          hexId: "newsletter-text-hex",
          tilePrefix: "palette-newsletter-text",
          fallback: DEFAULT_THEME.newsletterText,
        },
        {
          key: "btnPrimaryBg",
          pickerId: "btn-primary-bg-picker",
          hexId: "btn-primary-bg-hex",
          tilePrefix: "palette-btn-p-bg",
          fallback: DEFAULT_THEME.btnPrimaryBg,
        },
        {
          key: "btnPrimaryText",
          pickerId: "btn-primary-text-picker",
          hexId: "btn-primary-text-hex",
          tilePrefix: "palette-btn-p-text",
          fallback: DEFAULT_THEME.btnPrimaryText,
        },
        {
          key: "btnSecondaryBg",
          pickerId: "btn-secondary-bg-picker",
          hexId: "btn-secondary-bg-hex",
          tilePrefix: "palette-btn-s-bg",
          fallback: DEFAULT_THEME.btnSecondaryBg,
        },
        {
          key: "btnSecondaryText",
          pickerId: "btn-secondary-text-picker",
          hexId: "btn-secondary-text-hex",
          tilePrefix: "palette-btn-s-text",
          fallback: DEFAULT_THEME.btnSecondaryText,
        },
      ];

      const normalizeThemeColors = (raw = {}) => {
        return {
          primaryColor:
            normalizeHex(raw.primaryColor) || DEFAULT_THEME.primaryColor,
          secondaryColor:
            normalizeHex(raw.secondaryColor) || DEFAULT_THEME.secondaryColor,
          backgroundColor:
            normalizeHex(
              raw.backgroundColor || raw.bgLightColor || raw.bgLight,
            ) || DEFAULT_THEME.backgroundColor,
          surfaceColor:
            normalizeHex(raw.surfaceColor || raw.bgWhiteColor || raw.bgWhite) ||
            DEFAULT_THEME.surfaceColor,
          textColor:
            normalizeHex(raw.textColor || raw.textDarkColor || raw.textDark) ||
            DEFAULT_THEME.textColor,
          textLightColor:
            normalizeHex(
              raw.textLightColor ||
                raw.accentColor ||
                raw.textMutedColor ||
                raw.textLight,
            ) || DEFAULT_THEME.textLightColor,
          headerBg: normalizeHex(raw.headerBg) || DEFAULT_THEME.headerBg,
          footerBg: normalizeHex(raw.footerBg) || DEFAULT_THEME.footerBg,
          footerText: normalizeHex(raw.footerText) || DEFAULT_THEME.footerText,
          newsletterBg:
            normalizeHex(raw.newsletterBg) || DEFAULT_THEME.newsletterBg,
          newsletterText:
            normalizeHex(raw.newsletterText) || DEFAULT_THEME.newsletterText,
          btnPrimaryBg:
            normalizeHex(raw.btnPrimaryBg) || DEFAULT_THEME.btnPrimaryBg,
          btnPrimaryText:
            normalizeHex(raw.btnPrimaryText) || DEFAULT_THEME.btnPrimaryText,
          btnSecondaryBg:
            normalizeHex(raw.btnSecondaryBg) || DEFAULT_THEME.btnSecondaryBg,
          btnSecondaryText:
            normalizeHex(raw.btnSecondaryText) ||
            DEFAULT_THEME.btnSecondaryText,
          // Typography fields
          headingFont: raw.headingFont || DEFAULT_THEME.headingFont,
          mainFont: raw.mainFont || DEFAULT_THEME.mainFont,
          fontSizeH1Desktop:
            Number(raw.fontSizeH1Desktop) || DEFAULT_THEME.fontSizeH1Desktop,
          fontSizeH1Mobile:
            Number(raw.fontSizeH1Mobile) || DEFAULT_THEME.fontSizeH1Mobile,
          fontSizeH2Desktop:
            Number(raw.fontSizeH2Desktop) || DEFAULT_THEME.fontSizeH2Desktop,
          fontSizeH2Mobile:
            Number(raw.fontSizeH2Mobile) || DEFAULT_THEME.fontSizeH2Mobile,
          fontSizeBodyDesktop:
            Number(raw.fontSizeBodyDesktop) ||
            raw.fontSizeBase ||
            DEFAULT_THEME.fontSizeBodyDesktop,
          fontSizeBodyMobile:
            Number(raw.fontSizeBodyMobile) ||
            raw.fontSizeBase ||
            DEFAULT_THEME.fontSizeBodyMobile,
        };
      };

      const setPaletteTile = (prefix, hex) => {
        const safeHex = normalizeHex(hex) || "#000000";
        const swatch = document.getElementById(`${prefix}-chip`);
        const meta = document.getElementById(`${prefix}-meta`);
        const hexEl = document.getElementById(`${prefix}-hex`);
        if (swatch) swatch.style.background = safeHex;
        if (meta) meta.textContent = rgbLabel(safeHex);
        if (hexEl) hexEl.textContent = safeHex;
      };

      const getPaletteFromInputs = () => {
        const raw = {};
        COLOR_FIELD_CONFIG.forEach(({ key, hexId }) => {
          raw[key] = document.getElementById(hexId)?.value;
        });
        return normalizeThemeColors(raw);
      };

      const applyPaletteToInputs = (palette) => {
        const normalized = normalizeThemeColors(palette);
        COLOR_FIELD_CONFIG.forEach(({ key, pickerId, hexId, fallback }) => {
          const color = normalizeHex(normalized[key]) || fallback;
          const picker = document.getElementById(pickerId);
          const hex = document.getElementById(hexId);
          if (picker) picker.value = color;
          if (hex) hex.value = color;
        });
      };

      const updatePalettePreview = (paletteLike = null) => {
        const palette = normalizeThemeColors(
          paletteLike || getPaletteFromInputs(),
        );
        const primary = palette.primaryColor;
        const secondary = palette.secondaryColor;
        const background = palette.backgroundColor;
        const surface = palette.surfaceColor;
        const text = palette.textColor;
        const accent = palette.textLightColor;

        setPaletteTile("palette-primary", primary);
        setPaletteTile("palette-secondary", secondary);
        setPaletteTile("palette-bg", background);
        setPaletteTile("palette-surface", surface);
        setPaletteTile("palette-text", text);
        setPaletteTile("palette-accent", accent);

        const preview = document.getElementById("live-preview-area");
        if (preview) {
          preview.style.setProperty("--design-primary", primary);
          preview.style.setProperty("--design-secondary", secondary);
          preview.style.setProperty("--design-accent", accent);
          preview.style.setProperty("--design-text", text);
          preview.style.setProperty("--design-muted", accent);
          preview.style.setProperty("--design-bg", background);
          preview.style.setProperty("--design-surface", surface);
        }

        const brandProfile = section.querySelector(".design-ui-brand-profile");
        if (brandProfile) {
          brandProfile.style.setProperty("--design-brand-primary", primary);
          brandProfile.style.setProperty("--design-brand-secondary", secondary);
        }
      };

      // Logic for Dynamic Preview
      const updateLivePreview = () => {
        const headingFont =
          document.getElementById("heading-font-select")?.value ||
          DEFAULT_THEME.headingFont;
        const mainFont =
          document.getElementById("main-font-select")?.value ||
          DEFAULT_THEME.mainFont;

        const activeDevice =
          section
            .querySelector(".preview-toggle.active")
            ?.getAttribute("data-device") || "desktop";
        const isMobile = activeDevice === "mobile";

        const h1Size = Number(
          document.getElementById(
            isMobile ? "font-size-h1-mobile" : "font-size-h1-desktop",
          )?.value ||
            (isMobile
              ? DEFAULT_THEME.fontSizeH1Mobile
              : DEFAULT_THEME.fontSizeH1Desktop),
        );
        const h2Size = Number(
          document.getElementById(
            isMobile ? "font-size-h2-mobile" : "font-size-h2-desktop",
          )?.value ||
            (isMobile
              ? DEFAULT_THEME.fontSizeH2Mobile
              : DEFAULT_THEME.fontSizeH2Desktop),
        );
        const bodySize = Number(
          document.getElementById(
            isMobile ? "font-size-body-mobile" : "font-size-body-desktop",
          )?.value ||
            (isMobile
              ? DEFAULT_THEME.fontSizeBodyMobile
              : DEFAULT_THEME.fontSizeBodyDesktop),
        );

        const palette = getPaletteFromInputs();
        const previewText = document.getElementById("typography-preview-text");
        const previewBox = document.getElementById("live-preview-area");
        const previewBody = document.getElementById("design-preview-body-copy");
        const previewCardTitle = section.querySelector(
          ".design-ui-preview-card-title",
        );
        const previewCardText = section.querySelector(
          ".design-ui-preview-card-text",
        );
        const previewPrimaryBtn = document.getElementById(
          "design-preview-primary-btn",
        );
        const previewSecondaryBtn = document.getElementById(
          "design-preview-secondary-btn",
        );

        if (previewText) {
          previewText.style.fontFamily = `'${headingFont}', sans-serif`;
          previewText.style.fontSize = `${h1Size}px`;
          previewText.style.setProperty(
            "color",
            "var(--design-text)",
            "important",
          );
        }
        if (previewBox) {
          previewBox.style.fontFamily = `'${mainFont}', sans-serif`;
        }
        if (previewBody) {
          previewBody.style.fontFamily = `'${mainFont}', sans-serif`;
          previewBody.style.fontSize = `${bodySize}px`;
          previewBody.style.setProperty(
            "color",
            "var(--design-muted)",
            "important",
          );
        }
        if (previewCardTitle) {
          previewCardTitle.style.fontFamily = `'${headingFont}', sans-serif`;
          previewCardTitle.style.fontSize = `${h2Size}px`;
        }
        if (previewCardText) {
          previewCardText.style.fontFamily = `'${mainFont}', sans-serif`;
        }
        if (previewPrimaryBtn) {
          previewPrimaryBtn.style.fontFamily = `'${mainFont}', sans-serif`;
          previewPrimaryBtn.style.setProperty(
            "background",
            palette.primaryColor,
            "important",
          );
        }
        if (previewSecondaryBtn) {
          previewSecondaryBtn.style.fontFamily = `'${mainFont}', sans-serif`;
          previewSecondaryBtn.style.setProperty(
            "border-color",
            palette.secondaryColor,
            "important",
          );
          previewSecondaryBtn.style.setProperty(
            "color",
            palette.secondaryColor,
            "important",
          );
        }
        updatePalettePreview(palette);

        const previewFrame = document.getElementById("design-preview-frame");
        if (previewFrame) {
          if (isMobile) {
            previewFrame.style.width = "375px";
            previewFrame.style.margin = "0 auto";
          } else {
            previewFrame.style.width = "100%";
            previewFrame.style.margin = "0";
          }
        }
      };

      // Device Toggle Listeners
      section.querySelectorAll(".preview-toggle").forEach((btn) => {
        btn.onclick = () => {
          section
            .querySelectorAll(".preview-toggle")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          updateLivePreview();
        };
      });

      // Add Listeners
      const syncRange = (id) => {
        const el = document.getElementById(id);
        const valEl = document.getElementById(`${id}-val`);
        if (!el || !valEl) return;
        el.oninput = () => {
          valEl.textContent = `${el.value}px`;
          updateLivePreview();
        };
      };

      [
        "font-size-h1-desktop",
        "font-size-h1-mobile",
        "font-size-h2-desktop",
        "font-size-h2-mobile",
        "font-size-body-desktop",
        "font-size-body-mobile",
      ].forEach(syncRange);

      const headingFontSelect = document.getElementById("heading-font-select");
      const mainFontSelect = document.getElementById("main-font-select");
      if (headingFontSelect) headingFontSelect.onchange = updateLivePreview;
      if (mainFontSelect) mainFontSelect.onchange = updateLivePreview;

      const syncColor = (pickerId, hexId, fallbackHex) => {
        const picker = document.getElementById(pickerId);
        const hex = document.getElementById(hexId);
        if (!picker || !hex) return;

        picker.oninput = () => {
          hex.value = normalizeHex(picker.value) || fallbackHex;
          updateLivePreview();
        };

        hex.oninput = () => {
          const normalized = normalizeHex(hex.value);
          if (!normalized) return;
          hex.value = normalized;
          picker.value = normalized;
          updateLivePreview();
        };

        hex.onblur = () => {
          const normalized = normalizeHex(hex.value) || fallbackHex;
          hex.value = normalized;
          picker.value = normalized;
          updateLivePreview();
        };
      };
      COLOR_FIELD_CONFIG.forEach(({ pickerId, hexId, fallback }) =>
        syncColor(pickerId, hexId, fallback),
      );

      const resetBtn = document.getElementById("reset-design-settings");
      if (resetBtn) {
        resetBtn.onclick = async () => {
          if (
            !confirm(
              "Er du sikker på at du vil tilbakestille alle farger og fonter til HKM-standard?",
            )
          )
            return;

          applyPaletteToInputs(DEFAULT_THEME);

          if (document.getElementById("heading-font-select"))
            document.getElementById("heading-font-select").value =
              DEFAULT_THEME.headingFont;
          if (document.getElementById("main-font-select"))
            document.getElementById("main-font-select").value =
              DEFAULT_THEME.mainFont;

          [
            "h1-desktop",
            "h1-mobile",
            "h2-desktop",
            "h2-mobile",
            "body-desktop",
            "body-mobile",
          ].forEach((key) => {
            const id = `font-size-${key}`;
            const el = document.getElementById(id);
            const valEl = document.getElementById(`${id}-val`);
            const themeKey = `fontSize${key
              .split("-")
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join("")}`;
            if (el) el.value = DEFAULT_THEME[themeKey];
            if (valEl) valEl.textContent = `${DEFAULT_THEME[themeKey]}px`;
          });

          updateLivePreview();

          // Reset checkboxes in UI
          [
            "overview",
            "profile",
            "courses",
            "reading-plans",
            "giving",
            "notifications",
          ].forEach((id) => {
            const el = document.getElementById(`nav-minside-${id}`);
            if (el) el.checked = true;
          });
          ["overview", "contacts", "minside", "settings"].forEach((id) => {
            const el = document.getElementById(`nav-admin-${id}`);
            if (el) el.checked = true;
          });

          const resetData = {
            ...DEFAULT_THEME,
            logoUrl: document.getElementById("site-logo-url")?.value || "",
            faviconUrl:
              document.getElementById("site-favicon-url")?.value || "",
            logoText: document.getElementById("site-logo-text")?.value || "",
            siteTitle: document.getElementById("site-title-seo")?.value || "",
            minsideBottomNav: [
              "overview",
              "profile",
              "courses",
              "reading-plans",
              "giving",
              "notifications",
              "tasks",
              "notes",
            ],
            adminBottomNav: ["overview", "contacts", "minside", "settings"],
            updatedAt: new Date().toISOString(),
          };

          try {
            await firebaseService.savePageContent("settings_design", resetData);
            this.showToast("Tema er tilbakestilt og lagret!", "success", 5000);
          } catch (err) {
            console.error("Reset save error:", err);
            this.showToast(
              "Feil ved lagring av tilbakestilling",
              "error",
              5000,
            );
          }
        };
      }

      // Load existing
      try {
        const data = await firebaseService.getPageContent("settings_design");
        if (data) {
          if (data.logoUrl) {
            document.getElementById("site-logo-url").value = data.logoUrl;
            this.updatePreview("logo-preview-container", data.logoUrl);
          }
          if (data.faviconUrl) {
            document.getElementById("site-favicon-url").value = data.faviconUrl;
            this.updatePreview("favicon-preview-container", data.faviconUrl);
          }
          if (data.siteTitle)
            document.getElementById("site-title-seo").value = data.siteTitle;
          if (data.logoText)
            document.getElementById("site-logo-text").value = data.logoText;

          if (data.headingFont)
            document.getElementById("heading-font-select").value =
              data.headingFont;
          if (data.mainFont)
            document.getElementById("main-font-select").value = data.mainFont;

          const syncDataRange = (key, id) => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(`${id}-val`);
            if (data[key] !== undefined && data[key] !== null) {
              if (el) el.value = data[key];
              if (valEl) valEl.textContent = `${data[key]}px`;
            } else if (DEFAULT_THEME[key] !== undefined) {
              if (el) el.value = DEFAULT_THEME[key];
              if (valEl) valEl.textContent = `${DEFAULT_THEME[key]}px`;
            }
          };

          syncDataRange("fontSizeH1Desktop", "font-size-h1-desktop");
          syncDataRange("fontSizeH1Mobile", "font-size-h1-mobile");
          syncDataRange("fontSizeH2Desktop", "font-size-h2-desktop");
          syncDataRange("fontSizeH2Mobile", "font-size-h2-mobile");
          syncDataRange("fontSizeBodyDesktop", "font-size-body-desktop");
          syncDataRange("fontSizeBodyMobile", "font-size-body-mobile");

          // Load bottom nav checkboxes
          const minsideItems = data.minsideBottomNav || [
            "overview",
            "profile",
            "courses",
            "reading-plans",
            "giving",
            "notifications",
            "tasks",
            "notes",
          ];
          const adminItems = data.adminBottomNav || [
            "overview",
            "contacts",
            "minside",
            "settings",
          ];

          [
            "overview",
            "profile",
            "courses",
            "reading-plans",
            "giving",
            "notifications",
            "tasks",
            "notes",
          ].forEach((id) => {
            const el = document.getElementById(`nav-minside-${id}`);
            if (el) el.checked = minsideItems.includes(id);
          });

          ["overview", "contacts", "minside", "settings"].forEach((id) => {
            const el = document.getElementById(`nav-admin-${id}`);
            if (el) el.checked = adminItems.includes(id);
          });

          applyPaletteToInputs(data);
          updateLivePreview();
        }
      } catch (e) {
        console.error("Load design error:", e);
      }
      updateLivePreview();

      document.getElementById("save-design-settings").onclick = async () => {
        const btn = document.getElementById("save-design-settings");
        const palette = getPaletteFromInputs();

        const minsideBottomNav = [
          "overview",
          "profile",
          "courses",
          "reading-plans",
          "giving",
          "notifications",
          "tasks",
          "notes",
        ].filter((id) => {
          const el = document.getElementById(`nav-minside-${id}`);
          return el ? el.checked : false;
        });

        const adminBottomNav = [
          "overview",
          "contacts",
          "minside",
          "settings",
        ].filter((id) => {
          const el = document.getElementById(`nav-admin-${id}`);
          return el ? el.checked : false;
        });

        const data = {
          ...palette,
          logoUrl: document.getElementById("site-logo-url").value,
          faviconUrl: document.getElementById("site-favicon-url").value,
          logoText: document.getElementById("site-logo-text").value,
          siteTitle: document.getElementById("site-title-seo").value,
          headingFont: document.getElementById("heading-font-select").value,
          mainFont: document.getElementById("main-font-select").value,
          fontSizeBodyDesktop: Number(
            document.getElementById("font-size-body-desktop").value,
          ),
          fontSizeBodyMobile: Number(
            document.getElementById("font-size-body-mobile").value,
          ),
          fontSizeH1Desktop: Number(
            document.getElementById("font-size-h1-desktop").value,
          ),
          fontSizeH1Mobile: Number(
            document.getElementById("font-size-h1-mobile").value,
          ),
          fontSizeH2Desktop: Number(
            document.getElementById("font-size-h2-desktop").value,
          ),
          fontSizeH2Mobile: Number(
            document.getElementById("font-size-h2-mobile").value,
          ),
          minsideBottomNav,
          adminBottomNav,
          updatedAt: new Date().toISOString(),
        };

        try {
          btn.disabled = true;
          btn.innerHTML =
            '<span class="material-symbols-outlined spin">sync</span> Lagrer...';
          await firebaseService.savePageContent("settings_design", data);
          this.showToast("Design lagret!", "success", 3000);
        } catch (err) {
          console.error("Save error:", err);
          this.showToast("Kunne ikke lagre", "error", 5000);
        } finally {
          btn.disabled = false;
          btn.innerHTML =
            '<span class="material-symbols-outlined">save</span> Lagre Design';
        }
      };

      // Preview URL inputs
      document.getElementById("site-logo-url").onchange = (e) =>
        this.updatePreview("logo-preview-container", e.target.value);
      document.getElementById("site-favicon-url").onchange = (e) =>
        this.updatePreview("favicon-preview-container", e.target.value);

      const wireUpload = (
        fileInputId,
        buttonId,
        urlInputId,
        previewId,
        pathPrefix,
        idleText,
      ) => {
        const fileInput = document.getElementById(fileInputId);
        const button = document.getElementById(buttonId);
        const urlInput = document.getElementById(urlInputId);
        const previewContainer = document.getElementById(previewId);

        if (!fileInput || !button || !urlInput) return;

        const triggerSelect = () => {
          fileInput.click();
        };

        // Clicking either the button or the preview container opens the file dialog
        button.onclick = triggerSelect;
        if (previewContainer) {
          previewContainer.onclick = triggerSelect;
        }

        // Trigger the upload automatically when a file is selected
        fileInput.onchange = async () => {
          if (!firebaseService.isInitialized) {
            this.showToast(
              "Firebase er ikke konfigurert. Kan ikke laste opp.",
              "error",
              5000,
            );
            return;
          }

          const file = fileInput.files && fileInput.files[0];
          if (!file) return;

          button.disabled = true;
          button.innerHTML =
            '<span class="material-symbols-outlined spin" style="animation:spin 1s linear infinite;">sync</span> Laster opp...';

          try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const uploadPath = `${pathPrefix}/${Date.now()}-${safeName}`;
            const url = await firebaseService.uploadImage(file, uploadPath);
            urlInput.value = url;
            this.updatePreview(previewId, url);
            this.showToast(
              "Filen ble lastet opp med suksess!",
              "success",
              3000,
            );
          } catch (err) {
            console.error("Upload error:", err);
            this.showToast("Feil ved opplasting. Prøv igjen.", "error", 5000);
          } finally {
            button.disabled = false;
            button.innerHTML = `<span class="material-symbols-outlined">upload</span> ${idleText}`;
            // Clear value so the same file can be selected again
            fileInput.value = "";
          }
        };
      };

      wireUpload(
        "site-logo-file",
        "upload-logo-btn",
        "site-logo-url",
        "logo-preview-container",
        "branding/logo",
        "Last opp",
      );
      wireUpload(
        "site-favicon-file",
        "upload-favicon-btn",
        "site-favicon-url",
        "favicon-preview-container",
        "branding/favicon",
        "Last opp",
      );
    },

    updatePreview(containerId, url) {
      const container = document.getElementById(containerId);
      if (!container) return;
      if (url && url.startsWith("http")) {
        const safeUrl = this.escapeHtml ? this.escapeHtml(url) : url;
        container.innerHTML = `
                <div class="design-ui-preview-media">
                    <img src="${safeUrl}" class="preview-img design-ui-preview-image" alt="Forhåndsvisning">
                    <div class="design-ui-preview-caption">${safeUrl}</div>
                </div>
            `;
      } else {
        const icon = containerId.includes("favicon") ? "web_asset" : "image";
        container.innerHTML = `
                <div class="design-ui-empty-preview">
                    <span class="material-symbols-outlined">${icon}</span>
                    <span>${containerId.includes("favicon") ? "Favicon-forhåndsvisning" : "Logo-forhåndsvisning"}</span>
                </div>
            `;
      }
    },

    async renderHeroManager() {
      const section = document.getElementById("hero-section");
      if (!section) return;

      section.innerHTML = `
            <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
                <button class="btn btn-primary" id="add-hero-slide">
                    <span class="material-symbols-outlined">add</span> Ny Slide
                </button>
            </div>

            <div class="collection-grid" id="hero-slides-list" style="margin-bottom:32px;">
                <div class="loader">Laster slides...</div>
            </div>

            <div class="card" style="max-width: 800px;">
                        <div class="card-body">
                            <form id="stats-form">
                                <div class="form-grid-2" style="gap: 20px;">
                                    <div class="form-group">
                                        <label>Land besøkt</label>
                                        <input type="number" id="stat-countries" class="form-control" name="countries_visited" placeholder="f.eks. 12">
                                    </div>
                                    <div class="form-group">
                                        <label>Podcast-episoder</label>
                                        <input type="number" id="stat-podcast" class="form-control" name="podcast_episodes" placeholder="f.eks. 45">
                                    </div>
                                    <div class="form-group">
                                        <label>YouTube-videoer</label>
                                        <input type="number" id="stat-yt-videos" class="form-control" name="youtube_videos" placeholder="f.eks. 449">
                                    </div>
                                    <div class="form-group">
                                        <label>YouTube-visninger</label>
                                        <input type="number" id="stat-yt-views" class="form-control" name="youtube_views" placeholder="f.eks. 56000">
                                    </div>
                                </div>
                                <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                                    <button type="submit" class="btn-primary" id="save-stats-btn">
                                        <span class="material-symbols-outlined">save</span> Lagre statistikk
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    `;
      section.setAttribute("data-rendered", "true");

      document.getElementById("add-hero-slide").onclick = () =>
        this.editHeroSlide();
      this.loadHeroSlides();
      this.loadIndexStats();

      document.getElementById("stats-form").onsubmit = async (e) => {
        e.preventDefault();
        await this.saveIndexStats();
      };
    },

    async loadHeroSlides() {
      const container = document.getElementById("hero-slides-list");
      if (!container) return;

      try {
        const data = await firebaseService.getPageContent("hero_slides");
        this.heroSlides = data ? data.slides || [] : [];
        this.renderHeroSlides(this.heroSlides);
      } catch (e) {
        container.innerHTML = "<p>Kunne ikke laste slides.</p>";
        this.showToast("Kunne ikke laste slides.", "error", 5000);
      }
    },

    async loadIndexStats() {
      try {
        const data = await firebaseService.getPageContent("index");
        if (data && data.stats) {
          const stats = data.stats;
          if (document.getElementById("stat-countries"))
            document.getElementById("stat-countries").value =
              stats.countries_visited || "";
          if (document.getElementById("stat-podcast"))
            document.getElementById("stat-podcast").value =
              stats.podcast_episodes || "";
          if (document.getElementById("stat-yt-videos"))
            document.getElementById("stat-yt-videos").value =
              stats.youtube_videos || "";
          if (document.getElementById("stat-yt-views"))
            document.getElementById("stat-yt-views").value =
              stats.youtube_views || "";
        }
      } catch (e) {
        console.error("Kunne ikke laste statistikk:", e);
      }
    },

    async saveIndexStats() {
      const btn = document.getElementById("save-stats-btn");
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<span class="material-symbols-outlined">sync</span> Lagrer...';

      try {
        const countries = document.getElementById("stat-countries").value;
        const podcast = document.getElementById("stat-podcast").value;
        const yt_videos = document.getElementById("stat-yt-videos").value;
        const yt_views = document.getElementById("stat-yt-views").value;

        // Get existing index content to avoid overwriting other parts
        let indexContent = {};
        try {
          indexContent = (await firebaseService.getPageContent("index")) || {};
        } catch (e) {}

        indexContent.stats = {
          countries_visited: countries,
          podcast_episodes: podcast,
          youtube_videos: yt_videos,
          youtube_views: yt_views,
        };

        await firebaseService.savePageContent("index", indexContent);
        this.showToast(
          "Statistikk er nå oppdatert på forsiden!",
          "success",
          5000,
        );
      } catch (e) {
        console.error("Feil ved lagring av statistikk:", e);
        this.showToast("Kunne ikke lagre statistikk.", "error", 5000);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    },

    renderHeroSlides(slides) {
      const container = document.getElementById("hero-slides-list");
      if (slides.length === 0) {
        container.innerHTML =
          '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">Ingen slides ennå. Legg til din første!</p>';
        return;
      }

      container.innerHTML = slides
        .map(
          (slide, index) => `
                                        <div class="item-card">
                                            <div class="item-thumb">
                                                <img src="${slide.imageUrl || "https://via.placeholder.com/400x225?text=Ingen+bilde"}" alt="Slide Thumb">
                                            </div>
                                            <div class="item-content">
                                                <h4 style="margin-bottom: 4px;">${slide.title || "Uten tittel"}</h4>
                                                <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">${slide.subtitle || ""}</p>
                                                <div class="item-actions">
                                                    <button class="icon-btn" onclick="adminManager.editHeroSlide(${index})">
                                                        <span class="material-symbols-outlined">edit</span>
                                                    </button>
                                                    <button class="icon-btn delete" onclick="adminManager.deleteHeroSlide(${index})">
                                                        <span class="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        `,
        )
        .join("");
    },

    async editHeroSlide(index = -1) {
      const isNew = index === -1;
      const slide = isNew
        ? {
            title: "",
            subtitle: "",
            imageUrl: "",
            youtubeId: "",
            btnText: "",
            btnLink: "",
            duration: 8,
          }
        : this.heroSlides[index];
      const safeSlideImage = this.escapeHtml(slide.imageUrl || "");
      const safeSlideYoutubeId = this.escapeHtml(slide.youtubeId || "");
      const safeSlideTitle = this.escapeHtml(slide.title || "");
      const safeSlideSubtitle = this.escapeHtml(slide.subtitle || "");
      const safeSlideBtnText = this.escapeHtml(slide.btnText || "");
      const safeSlideBtnLink = this.escapeHtml(slide.btnLink || "");
      const slideDuration = slide.duration || 8;

      const modal = document.createElement("div");
      modal.className = "dashboard-modal";
      modal.innerHTML = `
            <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div class="card" style="width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                    <div class="card-header flex-between">
                        <h3 class="card-title">${isNew ? "Legg til ny slide" : "Rediger slide"}</h3>
                        <button class="icon-btn" id="hero-close-modal"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Slide-bilde (Anbefalt: 1920x1080px)</label>
                            <div id="hero-img-trigger" style="margin-bottom: 12px; position: relative; cursor: pointer; border: 2px dashed #e2e8f0; border-radius: 12px; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden;">
                                ${safeSlideImage ? `<img src="${safeSlideImage}" style="width: 100%; height: 100%; object-fit: cover;">` : '<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span>'}
                                <div class="upload-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.78); color: #fff; font-size: 11px; padding: 8px; text-align: center; opacity: 1; transition: opacity 0.2s;">Klikk på bildet eller velg fil</div>
                            </div>
                            <input type="file" id="hero-file-input" style="display: none;" accept="image/*">
                            <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                                <button type="button" class="btn-secondary" id="hero-choose-image-btn" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; white-space:nowrap;">
                                    <span class="material-symbols-outlined">upload</span>
                                    Velg bilde
                                </button>
                                <span id="hero-upload-status" style="font-size:13px; color:#64748b;">JPG, PNG eller WebP</span>
                            </div>
                            <input type="text" id="hero-img-url" class="form-control" value="${safeSlideImage}" placeholder="Eller lim inn bilde-URL her">
                        </div>

                        <div class="form-group">
                            <label>Overskrift</label>
                            <input type="text" id="hero-title" class="form-control" value="${safeSlideTitle}">
                        </div>
                        <div class="form-group">
                            <label>Undertekst</label>
                            <textarea id="hero-subtitle" class="form-control" style="height: 80px;">${safeSlideSubtitle}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Bakgrunnsvideo (Valgfritt YouTube eller opplastet MP4)</label>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span class="material-symbols-outlined" style="color:#d17d39;">video_library</span>
                                <input type="text" id="hero-video-url" class="form-control" value="${slide.videoUrl || slide.youtubeId || ""}" placeholder="Lim inn lenke (YouTube eller MP4)">
                            </div>
                            <input type="file" id="hero-video-file" style="display: none;" accept="video/mp4,video/webm">
                            <div style="display:flex; gap:10px; align-items:center; margin-top:8px;">
                                <button type="button" class="btn-secondary" id="hero-upload-video-btn" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; white-space:nowrap; font-size:12px; padding:6px 12px;">
                                    <span class="material-symbols-outlined" style="font-size:16px;">upload</span>
                                    Last opp MP4
                                </button>
                                <span id="hero-video-upload-status" style="font-size:11px; color:#64748b;">(Maks 50 MB, MP4 anbefales)</span>
                            </div>
                            <p style="font-size:11px; color:#64748b; margin-top:4px;">Støtter YouTube-ID, YouTube-lenke eller opplastet MP4-fil.</p>
                        </div>
                        <div class="form-group">
                            <label>Visningstid i sekunder</label>
                            <input type="number" id="hero-duration" class="form-control" value="${slideDuration}" min="1" step="1">
                            <p style="font-size:11px; color:#64748b; margin-top:4px;">Hvor lenge denne sliden skal vises før den bytter automatisk (Standard er 8 sekunder). Hvis det er en video, kan du sette den høyere (f.eks. 15 eller 30).</p>
                        </div>
                        <div class="form-group">
                            <label>Knapptekst</label>
                            <input type="text" id="hero-btn-text" class="form-control" value="${safeSlideBtnText}">
                        </div>
                        <div class="form-group">
                            <label>Knapp-lenke</label>
                            <input type="text" id="hero-btn-link" class="form-control" value="${safeSlideBtnLink}">
                        </div>

                        <div style="display:flex; justify-content:flex-end; margin-top:15px; margin-bottom:-5px;">
                            <button type="button" class="btn-secondary" id="hero-auto-translate-btn" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; white-space:nowrap; font-size:12px; padding:6px 12px;">
                                <span class="material-symbols-outlined" style="font-size:16px;">g_translate</span>
                                Oversett automatisk nå
                            </button>
                        </div>

                        <!-- English Translation Section -->
                        <div class="form-group" style="border-top: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 15px;">
                            <h4 style="color:#d17d39; margin-bottom: 12px; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="font-size:18px;">translate</span>
                                Engelsk oversettelse (Valgfritt)
                            </h4>
                            <div class="form-group">
                                <label>Overskrift (EN)</label>
                                <input type="text" id="hero-title-en" class="form-control" value="${this.escapeHtml(slide.translations?.en?.title || "")}" placeholder="Leave blank to use Norwegian">
                            </div>
                            <div class="form-group">
                                <label>Undertekst (EN)</label>
                                <textarea id="hero-subtitle-en" class="form-control" style="height: 60px;" placeholder="Leave blank to use Norwegian">${this.escapeHtml(slide.translations?.en?.subtitle || "")}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Knapptekst (EN)</label>
                                <input type="text" id="hero-btn-text-en" class="form-control" value="${this.escapeHtml(slide.translations?.en?.btnText || "")}" placeholder="Leave blank to use Norwegian">
                            </div>
                        </div>

                        <!-- Spanish Translation Section -->
                        <div class="form-group" style="border-top: 1px dashed #cbd5e1; padding-top: 15px; margin-top: 15px;">
                            <h4 style="color:#bd4f2a; margin-bottom: 12px; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="font-size:18px;">translate</span>
                                Spansk oversettelse (Valgfritt)
                            </h4>
                            <div class="form-group">
                                <label>Overskrift (ES)</label>
                                <input type="text" id="hero-title-es" class="form-control" value="${this.escapeHtml(slide.translations?.es?.title || "")}" placeholder="Leave blank to use Norwegian">
                            </div>
                            <div class="form-group">
                                <label>Undertekst (ES)</label>
                                <textarea id="hero-subtitle-es" class="form-control" style="height: 60px;" placeholder="Leave blank to use Norwegian">${this.escapeHtml(slide.translations?.es?.subtitle || "")}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Knapptekst (ES)</label>
                                <input type="text" id="hero-btn-text-es" class="form-control" value="${this.escapeHtml(slide.translations?.es?.btnText || "")}" placeholder="Leave blank to use Norwegian">
                            </div>
                        </div>

                        <div style="margin-top: 24px;">
                            <button class="btn-primary" style="width: 100%;" id="hero-save-btn">Lagre slide</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
      document.body.appendChild(modal);

      // Scoped selection within the modal to avoid any ID conflicts
      const imgInput = modal.querySelector("#hero-img-url");
      const fileInput = modal.querySelector("#hero-file-input");
      const imgTrigger = modal.querySelector("#hero-img-trigger");
      const chooseImageBtn = modal.querySelector("#hero-choose-image-btn");
      const uploadStatus = modal.querySelector("#hero-upload-status");
      const saveBtn = modal.querySelector("#hero-save-btn");
      const closeBtn = modal.querySelector("#hero-close-modal");
      const autoTranslateBtn = modal.querySelector("#hero-auto-translate-btn");

      closeBtn.onclick = () => modal.remove();

      if (autoTranslateBtn) {
        autoTranslateBtn.onclick = async () => {
          autoTranslateBtn.disabled = true;
          const originalText = autoTranslateBtn.innerHTML;
          autoTranslateBtn.innerHTML =
            '<span class="material-symbols-outlined spin">sync</span> Oversetter...';

          const slideToTranslate = {
            title: modal.querySelector("#hero-title").value,
            subtitle: modal.querySelector("#hero-subtitle").value,
            btnText: modal.querySelector("#hero-btn-text").value,
            translations: {
              en: {
                title: modal.querySelector("#hero-title-en").value.trim(),
                subtitle: modal.querySelector("#hero-subtitle-en").value.trim(),
                btnText: modal.querySelector("#hero-btn-text-en").value.trim(),
              },
              es: {
                title: modal.querySelector("#hero-title-es").value.trim(),
                subtitle: modal.querySelector("#hero-subtitle-es").value.trim(),
                btnText: modal.querySelector("#hero-btn-text-es").value.trim(),
              },
            },
          };

          try {
            const finalTranslations =
              await this._translateSlide(slideToTranslate);
            modal.querySelector("#hero-title-en").value =
              finalTranslations.en.title || "";
            modal.querySelector("#hero-subtitle-en").value =
              finalTranslations.en.subtitle || "";
            modal.querySelector("#hero-btn-text-en").value =
              finalTranslations.en.btnText || "";

            modal.querySelector("#hero-title-es").value =
              finalTranslations.es.title || "";
            modal.querySelector("#hero-subtitle-es").value =
              finalTranslations.es.subtitle || "";
            modal.querySelector("#hero-btn-text-es").value =
              finalTranslations.es.btnText || "";

            this.showToast("Oversettelse fullført!", "success");
          } catch (err) {
            console.error("Auto translation error:", err);
            this.showToast("Kunne ikke oversette automatisk.", "error");
          } finally {
            autoTranslateBtn.disabled = false;
            autoTranslateBtn.innerHTML = originalText;
          }
        };
      }

      // Image Trigger Logic
      imgTrigger.onclick = () => fileInput.click();
      chooseImageBtn.onclick = () => fileInput.click();

      imgTrigger.onmouseenter = () => {
        const overlay = imgTrigger.querySelector(".upload-overlay");
        if (overlay) overlay.style.opacity = "1";
      };
      imgTrigger.onmouseleave = () => {
        const overlay = imgTrigger.querySelector(".upload-overlay");
        if (overlay) overlay.style.opacity = "0";
      };

      // Live Preview
      const renderImagePreview = (url) => {
        const safeUrl = this.escapeHtml(url || "");
        imgTrigger.innerHTML =
          safeUrl && safeUrl.length > 10
            ? `<img src="${safeUrl}" style="width: 100%; height: 100%; object-fit: cover;"><div class="upload-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.78); color: #fff; font-size: 11px; padding: 8px; text-align: center; opacity: 1; transition: opacity 0.2s;">Klikk på bildet eller velg ny fil</div>`
            : '<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span><div class="upload-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.78); color: #fff; font-size: 11px; padding: 8px; text-align: center; opacity: 1; transition: opacity 0.2s;">Klikk på bildet eller velg fil</div>';
      };

      imgInput.oninput = (e) => {
        renderImagePreview(e.target.value);
      };

      // File Upload Handling (Blog-style)
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type || !file.type.startsWith("image/")) {
          this.showToast("Velg en bildefil.", "error", 4000);
          fileInput.value = "";
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          this.showToast(
            "Bildet er for stort. Maks størrelse er 10 MB.",
            "error",
            6000,
          );
          fileInput.value = "";
          return;
        }

        imgTrigger.style.opacity = "0.5";
        imgTrigger.style.pointerEvents = "none";
        chooseImageBtn.disabled = true;
        chooseImageBtn.innerHTML =
          '<span class="material-symbols-outlined rotating">sync</span> Laster opp...';
        uploadStatus.textContent = `${file.name} - starter...`;
        const originalHTML = imgTrigger.innerHTML;
        imgTrigger.innerHTML = '<span class="loader-sm"></span>';

        try {
          const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `hero/${Date.now()}_${safeFileName}`;
          const url = await firebaseService.uploadImage(
            file,
            path,
            (progress) => {
              uploadStatus.textContent = `${file.name} - ${progress}%`;
            },
            { timeoutMs: 90000, maxSizeBytes: 10 * 1024 * 1024 },
          );

          imgInput.value = url;
          imgInput.dispatchEvent(new Event("input"));
          this.showToast("Bilde lastet opp!", "success");
          uploadStatus.textContent = "Opplasting fullført";
        } catch (err) {
          console.error("Upload error:", err);
          this.showToast(
            "Kunne ikke laste opp bilde: " + (err.message || "Ukjent feil"),
            "error",
            6000,
          );
          uploadStatus.textContent = "Opplasting feilet";
          imgTrigger.innerHTML = originalHTML;
        } finally {
          imgTrigger.style.opacity = "1";
          imgTrigger.style.pointerEvents = "auto";
          chooseImageBtn.disabled = false;
          chooseImageBtn.innerHTML =
            '<span class="material-symbols-outlined">upload</span> Velg bilde';
          fileInput.value = "";
        }
      };

      // Video Upload Logic
      const videoInput = modal.querySelector("#hero-video-url");
      const videoFileInput = modal.querySelector("#hero-video-file");
      const uploadVideoBtn = modal.querySelector("#hero-upload-video-btn");
      const uploadVideoStatus = modal.querySelector(
        "#hero-video-upload-status",
      );

      if (uploadVideoBtn && videoFileInput) {
        uploadVideoBtn.onclick = () => videoFileInput.click();

        videoFileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          uploadVideoStatus.textContent = "Laster opp...";
          uploadVideoBtn.disabled = true;
          uploadVideoBtn.innerHTML =
            '<span class="material-symbols-outlined spin">sync</span> Laster opp...';

          try {
            const url = await firebaseService.uploadFile(
              file,
              `hero_videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
              ["video/"],
              50, // 50MB max
              (progress) => {
                uploadVideoStatus.textContent = `Laster opp: ${progress}%`;
              },
              { timeoutMs: 300000 }, // 5 min timeout
            );

            videoInput.value = url;
            videoInput.dispatchEvent(new Event("input"));
            this.showToast("Video lastet opp!", "success");
            uploadVideoStatus.textContent = "Video opplastet";
          } catch (err) {
            console.error("Upload error:", err);
            this.showToast(
              "Kunne ikke laste opp video: " + (err.message || "Ukjent feil"),
              "error",
              6000,
            );
            uploadVideoStatus.textContent = "Opplasting feilet";
          } finally {
            uploadVideoBtn.disabled = false;
            uploadVideoBtn.innerHTML =
              '<span class="material-symbols-outlined" style="font-size:16px;">upload</span> Last opp MP4';
            videoFileInput.value = "";
          }
        };
      }

      // Save Logic
      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Lagrer...";

        const rawVideo = modal.querySelector("#hero-video-url").value;
        const ytId = this.extractYoutubeId(rawVideo);

        const slideTitle = modal.querySelector("#hero-title").value;
        const slideSubtitle = modal.querySelector("#hero-subtitle").value;
        const slideBtnText = modal.querySelector("#hero-btn-text").value;
        const slideBtnLink = modal.querySelector("#hero-btn-link").value;

        const translations = {
          en: {
            title: modal.querySelector("#hero-title-en").value.trim(),
            subtitle: modal.querySelector("#hero-subtitle-en").value.trim(),
            btnText: modal.querySelector("#hero-btn-text-en").value.trim(),
          },
          es: {
            title: modal.querySelector("#hero-title-es").value.trim(),
            subtitle: modal.querySelector("#hero-subtitle-es").value.trim(),
            btnText: modal.querySelector("#hero-btn-text-es").value.trim(),
          },
        };

        const slideToTranslate = {
          title: slideTitle,
          subtitle: slideSubtitle,
          btnText: slideBtnText,
          translations: translations,
        };

        let finalTranslations = translations;
        const needsTranslation =
          (!translations.en.title && slideTitle) ||
          (!translations.en.subtitle && slideSubtitle) ||
          (!translations.en.btnText && slideBtnText) ||
          (!translations.es.title && slideTitle) ||
          (!translations.es.subtitle && slideSubtitle) ||
          (!translations.es.btnText && slideBtnText);

        if (needsTranslation) {
          this.showToast(
            "Oversetter slide til engelsk og spansk...",
            "info",
            3000,
          );
          try {
            finalTranslations = await this._translateSlide(slideToTranslate);
          } catch (err) {
            console.error("Slide translation error on save:", err);
          }
        }

        const updatedSlide = {
          imageUrl: imgInput.value,
          youtubeId: ytId || "",
          videoUrl: !ytId ? rawVideo : "", // Store as generic video if not YT
          title: slideTitle,
          subtitle: slideSubtitle,
          btnText: slideBtnText,
          btnLink: slideBtnLink,
          duration:
            parseFloat(modal.querySelector("#hero-duration").value) || 8,
          translations: finalTranslations,
        };

        if (isNew) {
          this.heroSlides.push(updatedSlide);
        } else {
          this.heroSlides[index] = updatedSlide;
        }

        try {
          await firebaseService.savePageContent("hero_slides", {
            slides: this.heroSlides,
          });
          this.showToast("Slide lagret!", "success");
          modal.remove();
          this.renderHeroSlides(this.heroSlides);
        } catch (err) {
          console.error("Save error:", err);
          this.showToast("Kunne ikke lagre sliden.", "error");
          saveBtn.disabled = false;
          saveBtn.textContent = "Lagre slide";
        }
      };
    },

    async deleteHeroSlide(index) {
      const confirmed = await this.showConfirm(
        "Slett slide",
        "Vil du slette denne sliden?",
        "Slett",
      );
      if (!confirmed) return;
      this.heroSlides.splice(index, 1);
      try {
        await firebaseService.savePageContent("hero_slides", {
          slides: this.heroSlides,
        });
        this.renderHeroSlides(this.heroSlides);
        this.showToast("Slettet!", "success");
      } catch (err) {
        this.showToast("Feil ved sletting", "error", 5000);
      }
    },
  };
}
