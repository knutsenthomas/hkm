/* ═══════════════════════════════════════════════════════════════════════════
   HKM GRUPPER — Planning Center Groups Module for Min Side
   ═══════════════════════════════════════════════════════════════════════════ */

export class HkmGroupsManager {
    constructor(minSideApp) {
        this.app = minSideApp;
        this.currentView = 'directory'; // 'directory' | 'hub' | 'my-groups'
        this.selectedGroupId = null;
        this.selectedGroupTab = 'overview'; // 'overview' | 'chat' | 'events' | 'resources'
        this.groups = [];
        this.myGroups = [];
        this.categories = [];
        this.activeGroup = null;
        this.messagesListener = null;
        this.filterCategory = 'ALL';
        this.searchQuery = '';
        this.allContactsList = [];
        this.selectedContactIds = new Set();
        this.activeGroupForContacts = null;
    }

    get isAdmin() {
        const currentUser = firebase.auth() ? firebase.auth().currentUser : null;
        const email = currentUser ? (currentUser.email || '').toLowerCase() : '';
        const role = (this.app && this.app.currentUser && this.app.currentUser.role) || '';
        return role === 'admin' || role === 'superadmin' || email === 'thomas@hiskingdomministry.no' || email === 'knutsenthomas@gmail.com';
    }

    async render(container, queryParams = {}) {
        this.container = container;
        if (queryParams && queryParams.id) {
            this.selectedGroupId = queryParams.id;
            this.currentView = 'hub';
        }

        container.innerHTML = `
            <style>
                .groups-tab-btn {
                    color: var(--text-color, #1e293b) !important;
                }
                .groups-tab-btn.active {
                    background: var(--admin-orange, #d17d39) !important;
                    color: #ffffff !important;
                }
                .groups-tab-btn:not(.active):hover {
                    background: rgba(15, 23, 42, 0.06) !important;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                /* Custom styles for select dropdowns to prevent squeezed arrow */
                .groups-module-wrapper select,
                .modal-overlay select {
                    appearance: none !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
                    background-repeat: no-repeat !important;
                    background-position: right 14px center !important;
                    background-size: 16px !important;
                    padding-right: 40px !important;
                }
            </style>
            <div class="groups-module-wrapper">
                <!-- Top Module Navigation & Actions -->
                <div class="groups-header-bar" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px;">
                    <div class="groups-nav-tabs" style="display: flex; gap: 8px; background: rgba(15, 23, 42, 0.04); padding: 4px; border-radius: 12px;">
                        <button type="button" class="groups-tab-btn ${this.currentView === 'directory' ? 'active' : ''}" data-gview="directory" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">explore</span>
                            <span>Utforsk grupper</span>
                        </button>
                        <button type="button" class="groups-tab-btn ${this.currentView === 'my-groups' ? 'active' : ''}" data-gview="my-groups" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">group_work</span>
                            <span>Mine grupper</span>
                        </button>
                    </div>

                    <div class="groups-header-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${this.isAdmin ? `
                            <button type="button" class="btn btn-secondary" id="groups-manage-categories-btn" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 14px; background: #475569; color: white; border: none; cursor: pointer; transition: transform 0.2s ease, background-color 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">category</span>
                                <span>Administrer kategorier</span>
                            </button>
                        ` : ''}
                        <button type="button" class="btn btn-primary" id="groups-create-btn" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 14px; background: var(--admin-orange, #d17d39); color: white; border: none; cursor: pointer; transition: transform 0.2s ease, background-color 0.2s ease;">
                            <span class="material-symbols-outlined" style="font-size: 20px;">add</span>
                            <span>Opprett ny gruppe</span>
                        </button>
                    </div>
                </div>

                <!-- Main Content Body -->
                <div id="groups-content-body">
                    <div class="loading-state" style="padding: 40px; text-align: center;">
                        <div class="spinner"></div>
                        <p style="margin-top: 12px; opacity: 0.7;">Laster grupper...</p>
                    </div>
                </div>
            </div>

            <!-- Create / Edit Group Modal -->
            <div id="group-form-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 580px; max-height: 90vh; overflow-y: auto; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 id="group-modal-title" style="margin: 0; font-size: 20px; font-weight: 700;">Opprett ny gruppe</h3>
                        <button type="button" id="close-group-modal" style="background: none; border: none; cursor: pointer; color: var(--text-muted, #64748b);"><span class="material-symbols-outlined">close</span></button>
                    </div>
                    <form id="group-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="group-form-id" value="">
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Gruppenavn *</label>
                            <input type="text" id="group-name-input" required placeholder="f.eks. Husfellesskap Majorstuen" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Kategori</label>
                                <select id="group-category-input" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                                    <option value="Husfellesskap">Husfellesskap</option>
                                    <option value="Bønnegruppe">Bønnegruppe</option>
                                    <option value="Bibelstudie">Bibelstudie</option>
                                    <option value="Ung-voksen">Ung-voksen</option>
                                    <option value="Lovsang & Musikk">Lovsang & Musikk</option>
                                    <option value="Lederteam">Lederteam</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Møtetid / Frekvens</label>
                                <input type="text" id="group-schedule-input" placeholder="f.eks. Annenhver tirsdag kl 19:00" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                            </div>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Sted / Adresse / Link</label>
                            <input type="text" id="group-location-input" placeholder="f.eks. Majorstuen, Oslo eller Zoom-lenke" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Beskrivelse</label>
                            <textarea id="group-description-input" rows="3" placeholder="Fortell om hva gruppen gjør..." style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-family: inherit;"></textarea>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Påmeldingstype</label>
                                <select id="group-policy-input" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a);">
                                    <option value="open">Åpen for alle (Direkte påmelding)</option>
                                    <option value="approval">Godkjenning (Søknad til leder)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Gruppebilde</label>
                                <div style="display: flex; gap: 16px; align-items: center; background: var(--bg-muted, #f8fafc); padding: 16px; border-radius: 16px; border: 1px dashed var(--border-color, #cbd5e1);">
                                    <div id="group-image-preview-container" style="width: 80px; height: 80px; border-radius: 12px; overflow: hidden; background: #e2e8f0; border: 1px solid var(--border-color, #cbd5e1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <img id="group-image-preview" src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=150&q=80" style="width: 100%; height: 100%; object-fit: cover;">
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
                                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                            <button type="button" id="btn-upload-group-image" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; background: #1e293b; color: white; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">upload</span>
                                                <span>Last opp</span>
                                            </button>
                                            <button type="button" id="btn-unsplash-group-image" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">image_search</span>
                                                <span>Unsplash</span>
                                            </button>
                                            <button type="button" id="btn-clear-group-image" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s ease;">
                                                <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                                <span>Fjern</span>
                                            </button>
                                        </div>
                                        <input type="text" id="group-image-input" placeholder="Lim inn bilde-URL her..." style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 12px;">
                                        <input type="file" id="group-image-file-input" accept="image/*" style="display: none;">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px;">
                            <button type="button" id="cancel-group-form" style="padding: 10px 18px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: transparent; cursor: pointer;">Avbryt</button>
                            <button type="submit" style="padding: 10px 22px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer;">Lagre gruppe</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Duplicate Group Modal -->
            <div id="group-duplicate-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
                    <h3 style="margin-top: 0; font-size: 18px; font-weight: 700; margin-bottom: 8px;">Dupliser gruppe</h3>
                    <p style="font-size: 14px; opacity: 0.8; margin-bottom: 16px;">Opprett en ny kopi for nytt semester. Medlemmer og oppsett blir med over, mens nye samlinger startes fra rad 1.</p>
                    <form id="duplicate-form">
                        <input type="hidden" id="duplicate-source-id" value="">
                        <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Nytt gruppenavn</label>
                        <input type="text" id="duplicate-name-input" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); margin-bottom: 16px;">
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" id="cancel-duplicate-btn" style="padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e1; background: transparent; cursor: pointer;">Avbryt</button>
                            <button type="submit" style="padding: 10px 20px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer;">Dupliser nå</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Import Contacts Modal (Admin only) -->
            <div id="group-contacts-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 640px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Hent personer fra Kontakter</h3>
                            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.7;">Søk i CRM-kontakter og velg hvem som skal legges til i gruppen.</p>
                        </div>
                        <button type="button" id="close-contacts-modal" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-color, #64748b);">&times;</button>
                    </div>

                    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                        <input type="text" id="contacts-search-input" placeholder="Søk på navn, e-post eller telefon..." style="flex: 1; min-width: 220px; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 14px;">
                        <select id="contacts-role-picker" style="padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 13px; font-weight: 600;">
                            <option value="member">Legg til som Medlem</option>
                            <option value="leader">Legg til som Gruppeleder</option>
                        </select>
                    </div>

                    <div id="contacts-list-container" style="flex: 1; overflow-y: auto; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; max-height: 380px; min-height: 200px;">
                        <div style="text-align: center; padding: 24px; color: var(--text-muted, #64748b);">Laster inn kontakter...</div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; pt: 12px; border-top: 1px solid var(--border-color, #e2e8f0);">
                        <button type="button" id="select-all-contacts-btn" style="background: transparent; border: none; color: var(--admin-orange, #d17d39); font-weight: 600; font-size: 13px; cursor: pointer;">Velg alle</button>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" id="cancel-contacts-modal" style="padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e1; background: transparent; cursor: pointer; font-size: 13px;">Avbryt</button>
                            <button type="button" id="submit-import-contacts-btn" style="padding: 10px 20px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer; font-size: 13px;">Legg til valgte kontakter</button>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Send Group Email Modal -->
            <div id="group-email-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 580px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(209, 125, 57, 0.12); color: var(--admin-orange, #d17d39); display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 22px;">mail</span>
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Send e-post til gruppen</h3>
                                <p id="group-email-subtitle" style="margin: 2px 0 0 0; font-size: 13px; opacity: 0.7;">Send melding til alle gruppemedlemmer</p>
                            </div>
                        </div>
                        <button type="button" id="close-email-modal" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-color, #64748b);">&times;</button>
                    </div>

                    <form id="group-send-email-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Emne *</label>
                            <input type="text" id="group-email-subject" required placeholder="f.eks. Viktig beskjed angående neste samling" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 14px;">
                        </div>

                        <div>
                            <label style="display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px;">Melding *</label>
                            <textarea id="group-email-message" rows="6" required placeholder="Skriv din e-postmelding til gruppen her..." style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-family: inherit; font-size: 14px; line-height: 1.5;"></textarea>
                        </div>

                        <div style="background: var(--bg-muted, #f8fafc); padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border-color, #e2e8f0); font-size: 12px; color: var(--text-muted, #64748b);">
                            💡 E-posten sendes fra His Kingdom Ministry sin e-posttjeneste og utformes med offisiell mal og underskrift.
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
                            <button type="button" id="cancel-group-email-btn" style="padding: 10px 16px; border-radius: 10px; border: 1px solid #cbd5e1; background: transparent; cursor: pointer; font-size: 13px;">Avbryt</button>
                            <button type="submit" id="submit-group-email-btn" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: 10px; background: linear-gradient(135deg, #d17d39 0%, #b86524 100%); color: white; border: none; font-weight: 600; cursor: pointer; font-size: 13px;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">send</span>
                                <span>Send e-post til gruppen</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Categories Management Modal (Admin only) -->
            <div id="group-categories-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 480px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Administrer kategorier</h3>
                            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.7;">Opprett eller slett kategorier for smågrupper.</p>
                        </div>
                        <button type="button" id="close-categories-modal" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-color, #64748b);">&times;</button>
                    </div>

                    <div id="categories-list-container" style="flex: 1; overflow-y: auto; border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; max-height: 300px; min-height: 150px; margin-bottom: 16px;">
                        <!-- Will be populated dynamically -->
                    </div>

                    <form id="add-category-form" style="display: flex; gap: 10px; align-items: center; border-top: 1px solid var(--border-color, #e2e8f0); padding-top: 16px;">
                        <input type="text" id="new-category-input" required placeholder="Nytt kategorinavn..." style="flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 14px;">
                        <button type="submit" style="padding: 10px 18px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
                            <span>Legg til</span>
                        </button>
                    </form>
                </div>
            </div>

            <!-- Unsplash Picker Modal -->
            <div id="group-unsplash-modal" class="modal-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-card" style="background: var(--card-bg, #ffffff); border-radius: 20px; width: 100%; max-width: 720px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); max-height: 85vh; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Hent bilde fra Unsplash</h3>
                            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.7;">Søk etter bilder for å bruke som gruppebilde.</p>
                        </div>
                        <button type="button" id="close-unsplash-modal" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: var(--text-color, #64748b);">&times;</button>
                    </div>

                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 16px;">
                        <input type="text" id="unsplash-search-input" placeholder="Søk etter bilder (f.eks. fellesskap, bibel, natur)..." style="flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); color: var(--text-color, #0f172a); font-size: 14px;">
                        <button type="button" id="btn-search-unsplash" style="padding: 10px 18px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer; font-size: 13px;">Søk</button>
                    </div>

                    <div id="unsplash-loader" style="display: none; text-align: center; padding: 30px 0; color: var(--text-muted, #64748b);">
                        <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(0,0,0,0.1); border-top-color: var(--admin-orange, #d17d39); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
                        <div>Søker etter bilder...</div>
                    </div>

                    <div id="unsplash-results" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; max-height: 380px; min-height: 200px; padding: 4px;">
                        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted, #64748b);">
                            Søk etter bilder over.
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        await this.loadGroupsData();
    }

    bindEvents() {
        // Tab switching
        this.container.querySelectorAll('.groups-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetView = btn.dataset.gview;
                this.currentView = targetView;
                this.container.querySelectorAll('.groups-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderCurrentView();
            });
        });

        // Create modal toggle
        const modal = this.container.querySelector('#group-form-modal');
        this.container.querySelector('#groups-create-btn')?.addEventListener('click', () => {
            this.openCreateModal();
        });

        // Categories management modal (Admin only)
        const categoriesModal = this.container.querySelector('#group-categories-modal');
        this.container.querySelector('#groups-manage-categories-btn')?.addEventListener('click', () => {
            this.openCategoriesModal();
        });
        this.container.querySelector('#close-categories-modal')?.addEventListener('click', () => {
            if (categoriesModal) categoriesModal.style.display = 'none';
        });
        this.container.querySelector('#add-category-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCategory();
        });


        this.container.querySelector('#close-group-modal')?.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        this.container.querySelector('#cancel-group-form')?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Save group form
        this.container.querySelector('#group-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveGroup();
        });

        // Photo upload / selection events
        const imageInput = this.container.querySelector('#group-image-input');
        const fileInput = this.container.querySelector('#group-image-file-input');
        const previewImg = this.container.querySelector('#group-image-preview');
        const unsplashModal = this.container.querySelector('#group-unsplash-modal');

        this.container.querySelector('#btn-upload-group-image')?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Show temporary loading state
            if (previewImg) previewImg.style.opacity = '0.5';

            try {
                const uid = firebase.auth().currentUser?.uid || 'anonymous';
                const tempId = firebase.firestore().collection('groups').doc().id;
                const storageRef = firebase.storage().ref(`groups/temp-${uid}-${tempId}`);
                await storageRef.put(file);
                const downloadUrl = await storageRef.getDownloadURL();

                if (imageInput) imageInput.value = downloadUrl;
                if (previewImg) {
                    previewImg.src = downloadUrl;
                    previewImg.style.opacity = '1';
                }
            } catch (err) {
                console.error("Failed to upload image:", err);
                alert("Kunne ikke laste opp bilde: " + err.message);
                if (previewImg) previewImg.style.opacity = '1';
            }
        });

        this.container.querySelector('#btn-unsplash-group-image')?.addEventListener('click', () => {
            if (unsplashModal) {
                unsplashModal.style.display = 'flex';
                this.container.querySelector('#unsplash-search-input')?.focus();
            }
        });

        this.container.querySelector('#close-unsplash-modal')?.addEventListener('click', () => {
            if (unsplashModal) unsplashModal.style.display = 'none';
        });

        this.container.querySelector('#btn-search-unsplash')?.addEventListener('click', () => {
            this.handleUnsplashSearch();
        });

        this.container.querySelector('#unsplash-search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleUnsplashSearch();
            }
        });

        this.container.querySelector('#btn-clear-group-image')?.addEventListener('click', () => {
            const defaultImg = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=150&q=80';
            if (imageInput) imageInput.value = '';
            if (previewImg) previewImg.src = defaultImg;
        });

        imageInput?.addEventListener('input', () => {
            if (previewImg) {
                previewImg.src = imageInput.value.trim() || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=150&q=80';
            }
        });

        // Duplicate modal cancel
        const dupModal = this.container.querySelector('#group-duplicate-modal');
        this.container.querySelector('#cancel-duplicate-btn')?.addEventListener('click', () => {
            dupModal.style.display = 'none';
        });
        this.container.querySelector('#duplicate-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleDuplicateGroup();
        });

        // Contacts import modal (Admin only)
        const contactsModal = this.container.querySelector('#group-contacts-modal');
        this.container.querySelector('#close-contacts-modal')?.addEventListener('click', () => {
            if (contactsModal) contactsModal.style.display = 'none';
        });
        this.container.querySelector('#cancel-contacts-modal')?.addEventListener('click', () => {
            if (contactsModal) contactsModal.style.display = 'none';
        });
        this.container.querySelector('#contacts-search-input')?.addEventListener('input', () => {
            this.renderContactsList();
        });
        this.container.querySelector('#select-all-contacts-btn')?.addEventListener('click', () => {
            if (this.allContactsList) {
                this.allContactsList.forEach(c => this.selectedContactIds.add(c.id));
                this.renderContactsList();
            }
        });
        this.container.querySelector('#submit-import-contacts-btn')?.addEventListener('click', () => {
            this.submitImportContacts();
        });

        // Group Email modal
        const emailModal = this.container.querySelector('#group-email-modal');
        this.container.querySelector('#close-email-modal')?.addEventListener('click', () => {
            if (emailModal) emailModal.style.display = 'none';
        });
        this.container.querySelector('#cancel-group-email-btn')?.addEventListener('click', () => {
            if (emailModal) emailModal.style.display = 'none';
        });
        this.container.querySelector('#group-send-email-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendGroupEmail();
        });
    }

    async loadGroupsData() {
        try {
            const db = firebase.firestore();

            // Load categories
            const catsSnap = await db.collection('groupCategories').orderBy('name').get();
            let fetchedCats = [];
            catsSnap.forEach(doc => {
                fetchedCats.push(doc.data().name);
            });

            // If empty, seed categories and reload
            if (fetchedCats.length === 0) {
                const defaultCats = ['Husfellesskap', 'Bønnegruppe', 'Bibelstudie', 'Ung-voksen', 'Lovsang & Musikk', 'Lederteam'];
                const uid = firebase.auth().currentUser?.uid;
                if (uid) {
                    try {
                        const batch = db.batch();
                        defaultCats.forEach(cat => {
                            const docRef = db.collection('groupCategories').doc();
                            batch.set(docRef, { name: cat, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                        });
                        await batch.commit();
                        return this.loadGroupsData();
                    } catch (e) {
                        console.warn("Failed to seed groupCategories in Firestore, using fallback:", e);
                        this.categories = defaultCats;
                    }
                } else {
                    this.categories = defaultCats;
                }
            } else {
                this.categories = fetchedCats;
            }

            const snap = await db.collection('groups').get();
            let fetchedGroups = [];
            snap.forEach(doc => {
                fetchedGroups.push({ id: doc.id, ...doc.data() });
            });

            this.groups = fetchedGroups;
            const uid = firebase.auth().currentUser?.uid;

            // Categorize user's joined groups
            this.myGroups = this.groups.filter(g => 
                (g.leaderUids && g.leaderUids.includes(uid)) || 
                (g.memberUids && g.memberUids.includes(uid))
            );

            this.renderCurrentView();
        } catch (err) {
            console.error("Error loading groups:", err);
            const content = this.container.querySelector('#groups-content-body');
            if (content) {
                content.innerHTML = `
                    <div style="padding: 30px; text-align: center; color: #ef4444;">
                        <span class="material-symbols-outlined" style="font-size: 36px;">warning</span>
                        <p style="margin-top: 8px;">Kunne ikke laste grupper. Sjekk nettverk eller prøv igjen.</p>
                    </div>
                `;
            }
        }
    }

    async seedDemoGroups() {
        const db = firebase.firestore();
        const currentUser = firebase.auth().currentUser;
        const uid = currentUser ? currentUser.uid : 'demo-user';
        const name = currentUser ? (currentUser.displayName || 'Thomas Knutsen') : 'Thomas Knutsen';

        const demoList = [
            {
                name: 'Husfellesskap Majorstuen',
                category: 'Husfellesskap',
                description: 'Vi møtes til varm mat, dype samtaler, lovsang og bibelstudie i et åpent og hyggelig hjem.',
                meetingSchedule: 'Annenhver tirsdag kl. 19:00',
                location: 'Majorstuen, Oslo',
                isPublic: true,
                joinPolicy: 'open',
                leaderUids: [uid],
                leaderNames: [name],
                memberUids: [uid],
                memberCount: 8,
                imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
                isMockup: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                name: 'Bønnegruppe for Ung-Voksne',
                category: 'Bønnegruppe',
                description: 'Et ukentlig bønnefellesskap for ung-voksne hvor vi ber sammen for kirken, byen og personlige emner.',
                meetingSchedule: 'Hver torsdag kl. 20:00',
                location: 'HKM Kirkesal & Zoom',
                isPublic: true,
                joinPolicy: 'open',
                leaderUids: [uid],
                leaderNames: [name],
                memberUids: [uid],
                memberCount: 14,
                imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
                isMockup: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            {
                name: 'Bibelstudie: Romerbrevet',
                category: 'Bibelstudie',
                description: 'Vi går grundig gjennom Romerbrevets evangelium, nåde og rettferdiggjørelse kapittel for kapittel.',
                meetingSchedule: 'Annenhver mandag kl. 18:30',
                location: 'Lokalet på Frogner',
                isPublic: true,
                joinPolicy: 'approval',
                leaderUids: [uid],
                leaderNames: [name],
                memberUids: [uid],
                memberCount: 6,
                imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80',
                isMockup: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        ];

        const created = [];
        for (const item of demoList) {
            const ref = await db.collection('groups').add(item);
            created.push({ id: ref.id, ...item });
        }
        return created;
    }

    renderCurrentView() {
        const body = this.container.querySelector('#groups-content-body');
        if (!body) return;

        if (this.currentView === 'directory') {
            this.renderDirectoryView(body);
        } else if (this.currentView === 'my-groups') {
            this.renderMyGroupsView(body);
        } else if (this.currentView === 'hub' && this.selectedGroupId) {
            this.renderGroupHubView(body);
        }
    }

    renderDirectoryView(container) {
        const categories = ['ALL', ...this.categories];

        let filtered = this.groups;
        if (this.filterCategory !== 'ALL') {
            filtered = filtered.filter(g => g.category === this.filterCategory);
        }
        if (this.searchQuery.trim() !== '') {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(g => 
                (g.name && g.name.toLowerCase().includes(q)) || 
                (g.description && g.description.toLowerCase().includes(q)) ||
                (g.location && g.location.toLowerCase().includes(q))
            );
        }

        container.innerHTML = `
            <!-- Filter Bar -->
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: var(--card-bg, #ffffff); padding: 16px 20px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <!-- Search Input -->
                <div style="position: relative; flex: 1; min-width: 240px;">
                    <span class="material-symbols-outlined" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 20px;">search</span>
                    <input type="text" id="group-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="Søk etter gruppe, sted eller tema..." style="width: 100%; padding: 10px 14px 10px 40px !important; padding-left: 40px !important; border-radius: 10px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff); font-size: 14px;">
                </div>

                <!-- Category Filter Pills -->
                <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                    ${categories.map(cat => `
                        <button type="button" class="cat-pill-btn ${this.filterCategory === cat ? 'active' : ''}" data-cat="${cat}" style="padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; border: 1px solid ${this.filterCategory === cat ? 'var(--admin-orange, #d17d39)' : 'var(--border-color, #e2e8f0)'}; background: ${this.filterCategory === cat ? 'var(--admin-orange, #d17d39)' : 'transparent'}; color: ${this.filterCategory === cat ? '#fff' : 'inherit'}; cursor: pointer; transition: all 0.2s ease;">
                            ${cat === 'ALL' ? 'Alle kategorier' : cat}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Groups Directory Grid -->
            ${filtered.length === 0 ? `
                <div style="padding: 60px 20px; text-align: center; background: var(--card-bg, #fff); border-radius: 16px; border: 1px dashed #cbd5e1;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8;">groups</span>
                    <h3 style="margin-top: 12px; font-size: 18px; font-weight: 600;">Ingen grupper funnet</h3>
                    <p style="opacity: 0.7; max-width: 400px; margin: 8px auto 0;">Prøv et annet søkeord eller endre kategorifilteret ovenfor.</p>
                </div>
            ` : `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                    ${filtered.map(group => this.renderGroupCard(group)).join('')}
                </div>
            `}
        `;

        // Search event
        container.querySelector('#group-search-input')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderDirectoryView(container);
        });

        // Category pills event
        container.querySelectorAll('.cat-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterCategory = btn.dataset.cat;
                this.renderDirectoryView(container);
            });
        });

        this.bindCardActions(container);
    }

    renderGroupCard(group) {
        const uid = firebase.auth().currentUser?.uid;
        const isMember = group.memberUids && group.memberUids.includes(uid);
        const isLeader = group.leaderUids && group.leaderUids.includes(uid);

        const img = group.imageUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';

        return `
            <div class="group-card" style="background: var(--card-bg, #ffffff); border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div class="group-card-banner" style="position: relative; height: 140px; background: url('${img}') center/cover no-repeat;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,23,42,0.8), transparent);"></div>
                    <span style="position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 20px;">
                        ${this.escapeHtml(group.category || 'Grupper')}
                    </span>
                    ${isLeader ? `
                        <span style="position: absolute; top: 12px; right: 12px; background: var(--admin-orange, #d17d39); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
                            ⭐ Leder
                        </span>
                    ` : ''}
                    ${(isLeader || this.isAdmin) ? `
                        <button type="button" class="btn-delete-card-group" data-id="${group.id}" data-name="${this.escapeHtml(group.name)}" title="Slett gruppe" style="position: absolute; top: 12px; right: ${isLeader ? '80px' : '12px'}; background: rgba(239, 68, 68, 0.9); backdrop-filter: blur(4px); color: white; border: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease, background-color 0.15s ease; z-index: 2;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    ` : ''}
                </div>

                <div style="padding: 20px; flex: 1; display: flex; flex-direction: column;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">${this.escapeHtml(group.name)}</h3>
                    <p style="font-size: 13px; line-height: 1.5; opacity: 0.8; margin: 0 0 16px 0; flex: 1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${this.escapeHtml(group.description || '')}
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; opacity: 0.9; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--admin-orange, #d17d39);">schedule</span>
                            <span>${this.escapeHtml(group.meetingSchedule || 'Planlagte møter')}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--admin-orange, #d17d39);">location_on</span>
                            <span>${this.escapeHtml(group.location || 'Sted ikke oppgitt')}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--admin-orange, #d17d39);">person</span>
                            <span>Leder: ${this.escapeHtml((group.leaderNames && group.leaderNames[0]) || 'Leder')}</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border-color, #f1f5f9);">
                        <span style="font-size: 12px; font-weight: 600; opacity: 0.7;">
                            👥 ${(group.memberUids || []).length} medlemmer
                        </span>
                        
                        ${isMember ? `
                            <button type="button" class="btn-open-group" data-id="${group.id}" style="padding: 8px 16px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s ease;">
                                Åpne gruppe
                            </button>
                        ` : `
                            <button type="button" class="btn-join-group" data-id="${group.id}" data-policy="${group.joinPolicy || 'open'}" style="padding: 8px 16px; border-radius: 10px; background: transparent; border: 1px solid var(--admin-orange, #d17d39); color: var(--admin-orange, #d17d39); font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease;">
                                ${group.joinPolicy === 'approval' ? 'Søk om plass' : 'Bli med i gruppen'}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    renderMyGroupsView(container) {
        if (this.myGroups.length === 0) {
            container.innerHTML = `
                <div style="padding: 60px 20px; text-align: center; background: var(--card-bg, #fff); border-radius: 16px; border: 1px dashed #cbd5e1;">
                    <span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8;">group_work</span>
                    <h3 style="margin-top: 12px; font-size: 18px; font-weight: 600;">Du har ikke blitt med i noen grupper ennå</h3>
                    <p style="opacity: 0.7; max-width: 440px; margin: 8px auto 20px;">Utforsk gruppelisten for å finne husfellesskap, bønnegrupper eller bibelstudier som passer for deg!</p>
                    <button type="button" id="btn-explore-groups-now" style="padding: 10px 20px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer;">
                        Utforsk grupper nå
                    </button>
                </div>
            `;

            container.querySelector('#btn-explore-groups-now')?.addEventListener('click', () => {
                this.currentView = 'directory';
                this.container.querySelectorAll('.groups-tab-btn').forEach(b => b.classList.remove('active'));
                this.container.querySelector('[data-gview="directory"]')?.classList.add('active');
                this.renderCurrentView();
            });
            return;
        }

        container.innerHTML = `
            <h3 style="margin-top: 0; font-size: 18px; font-weight: 700; margin-bottom: 16px;">Mine aktive grupper (${this.myGroups.length})</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                ${this.myGroups.map(group => this.renderGroupCard(group)).join('')}
            </div>
        `;

        this.bindCardActions(container);
    }

    bindCardActions(container) {
        container.querySelectorAll('.btn-open-group').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedGroupId = btn.dataset.id;
                this.currentView = 'hub';
                this.renderCurrentView();
            });
        });

        container.querySelectorAll('.btn-join-group').forEach(btn => {
            btn.addEventListener('click', async () => {
                const groupId = btn.dataset.id;
                const policy = btn.dataset.policy;
                await this.handleJoinGroup(groupId, policy);
            });
        });

        container.querySelectorAll('.btn-delete-card-group').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const groupId = btn.dataset.id;
                const groupName = btn.dataset.name;
                this.handleDeleteGroup(groupId, groupName);
            });
        });
    }

    async handleJoinGroup(groupId, policy) {
        const uid = firebase.auth().currentUser?.uid;
        if (!uid) {
            alert("Du må være innlogget for å bli med i grupper.");
            return;
        }

        try {
            const db = firebase.firestore();
            const groupRef = db.collection('groups').doc(groupId);

            if (policy === 'approval') {
                await groupRef.update({
                    pendingUids: firebase.firestore.FieldValue.arrayUnion(uid)
                });
                alert("Forespørsel sendt! Gruppeleder vil godkjenne søknaden din.");
            } else {
                await groupRef.update({
                    memberUids: firebase.firestore.FieldValue.arrayUnion(uid)
                });
                alert("Gratulerer! Du er nå medlem av gruppen.");
            }
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error joining group:", err);
            alert("Feil ved påmelding: " + err.message);
        }
    }

    async handleDeleteGroup(groupId, groupName) {
        if (this.app && typeof this.app.showCustomConfirm === 'function') {
            this.app.showCustomConfirm({
                title: 'Slett gruppe',
                message: `Er du sikker på at du vil slette gruppen "${groupName}"? Dette vil slette gruppen permanent.`,
                confirmText: 'Slett',
                cancelText: 'Avbryt',
                isDanger: true,
                onConfirm: async () => {
                    await this.performDeleteGroup(groupId, groupName);
                }
            });
        } else {
            if (confirm(`Er du sikker på at du vil slette gruppen "${groupName}"? Dette vil slette gruppen permanent.`)) {
                await this.performDeleteGroup(groupId, groupName);
            }
        }
    }

    async performDeleteGroup(groupId, groupName) {
        try {
            await this.deleteGroupQuietly(groupId);
            alert(`Suksess! Gruppen "${groupName}" ble slettet.`);
            
            if (this.selectedGroupId === groupId) {
                this.selectedGroupId = null;
                this.currentView = 'directory';
            }
            
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error deleting group:", err);
            alert("Kunne ikke slette gruppen: " + err.message);
        }
    }

    async handleRemoveMockupGroups() {
        if (this.app && typeof this.app.showCustomConfirm === 'function') {
            this.app.showCustomConfirm({
                title: 'Fjern mockup-grupper',
                message: 'Er du sikker på at du vil fjerne alle mockup- og demogrupper? Dette vil slette dem permanent.',
                confirmText: 'Slett',
                cancelText: 'Avbryt',
                isDanger: true,
                onConfirm: async () => {
                    await this.performRemoveMockupGroups();
                }
            });
        } else {
            if (confirm('Er du sikker på at du vil fjerne alle mockup- og demogrupper? Dette vil slette dem permanent.')) {
                await this.performRemoveMockupGroups();
            }
        }
    }

    async performRemoveMockupGroups() {
        try {
            const db = firebase.firestore();
            const snap = await db.collection('groups').get();
            let count = 0;
            
            const promises = [];
            snap.forEach(doc => {
                const data = doc.data();
                const name = data.name || '';
                const isMock = data.isMockup === true || 
                               name === 'Husfellesskap Majorstuen' || 
                               name === 'Bønnegruppe for Ung-Voksne' || 
                               name === 'Bibelstudie: Romerbrevet' || 
                               name.toLowerCase().includes('demo') ||
                               name.toLowerCase().includes('mockup');
                
                if (isMock) {
                    count++;
                    promises.push(this.deleteGroupQuietly(doc.id));
                }
            });

            if (count === 0) {
                alert("Fant ingen mockup- eller demogrupper å slette.");
                return;
            }

            await Promise.all(promises);
            alert(`Suksess! ${count} mockup/demogrupper ble fjernet.`);
            this.selectedGroupId = null;
            this.currentView = 'directory';
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error removing mockup groups:", err);
            alert("Kunne ikke fjerne mockup-grupper: " + err.message);
        }
    }

    async deleteGroupQuietly(groupId) {
        const db = firebase.firestore();
        await db.collection('groups').doc(groupId).delete();
        
        // Clean up related sub-collections / documents
        const collections = ['groupMembers', 'groupEvents', 'groupAttendance', 'groupMessages'];
        for (const col of collections) {
            try {
                const snap = await db.collection(col).where('groupId', '==', groupId).get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            } catch (e) {
                console.warn(`Could not clean up collection ${col} for group ${groupId}:`, e);
            }
        }
    }

    openCategoriesModal() {
        if (!this.isAdmin) {
            alert("Kun administratorer kan administrere kategorier.");
            return;
        }

        const modal = this.container.querySelector('#group-categories-modal');
        if (!modal) return;

        modal.style.display = 'flex';
        this.renderCategoriesList();
    }

    renderCategoriesList() {
        const container = this.container.querySelector('#categories-list-container');
        if (!container) return;

        if (this.categories.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 16px; color: var(--text-muted, #64748b);">Ingen kategorier funnet.</div>';
            return;
        }

        container.innerHTML = this.categories.map(cat => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 12px; background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0);">
                <span style="font-weight: 600; font-size: 14px; color: var(--text-color, #0f172a);">${this.escapeHtml(cat)}</span>
                <button type="button" class="btn-delete-category" data-cat="${this.escapeHtml(cat)}" title="Slett kategori" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.btn-delete-category').forEach(btn => {
            btn.addEventListener('click', () => {
                const catName = btn.dataset.cat;
                this.handleDeleteCategory(catName);
            });
        });
    }

    async handleAddCategory() {
        const input = this.container.querySelector('#new-category-input');
        const catName = input ? input.value.trim() : '';
        if (!catName) return;

        if (this.categories.includes(catName)) {
            alert("Kategorien eksisterer allerede.");
            return;
        }

        try {
            const db = firebase.firestore();
            await db.collection('groupCategories').add({
                name: catName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (input) input.value = '';
            
            await this.loadGroupsData();
            this.renderCategoriesList();
        } catch (err) {
            console.error("Error adding category:", err);
            alert("Kunne ikke legge til kategori: " + err.message);
        }
    }

    async handleUnsplashSearch() {
        const queryInput = this.container.querySelector('#unsplash-search-input');
        const resultsContainer = this.container.querySelector('#unsplash-results');
        const loader = this.container.querySelector('#unsplash-loader');

        const query = queryInput ? queryInput.value.trim() : '';
        if (!query) return;

        if (loader) loader.style.display = 'block';
        if (resultsContainer) resultsContainer.style.display = 'none';

        try {
            // Translate search term to English using Google Translate API for better Unsplash results
            let searchQuery = query;
            try {
                const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=no&tl=en&dt=t&q=${encodeURIComponent(query)}`;
                const translateRes = await fetch(translateUrl);
                if (translateRes.ok) {
                    const translateData = await translateRes.json();
                    if (translateData && translateData[0]) {
                        const translatedText = translateData[0].map(s => s[0]).filter(Boolean).join('');
                        if (translatedText && translatedText.trim()) {
                            searchQuery = translatedText.trim();
                        }
                    }
                }
            } catch (transErr) {
                console.warn('[Unsplash] Translation error:', transErr);
            }

            const accessKey = 'W5CRu1Mp-4eJ7FV2PIdjVWPfHdkZV00F4I9fjIOEr60';
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=20&client_id=${accessKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Kunne ikke hente bilder fra Unsplash.');
            }

            const data = await response.json();
            this.renderUnsplashResults(data.results);
        } catch (err) {
            console.error("Unsplash search error:", err);
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div style="grid-column: 1/-1; color: #ef4444; text-align: center; padding: 20px;">Feil: ${err.message}</div>`;
                resultsContainer.style.display = 'grid';
            }
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    renderUnsplashResults(images) {
        const resultsContainer = this.container.querySelector('#unsplash-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'grid';

        if (!images || images.length === 0) {
            resultsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted, #64748b);">Ingen bilder funnet.</div>';
            return;
        }

        images.forEach(img => {
            const item = document.createElement('div');
            item.style.cssText = `
                position: relative;
                aspect-ratio: 1.5;
                border-radius: 12px;
                overflow: hidden;
                cursor: pointer;
                background: #f1f5f9;
                border: 1px solid var(--border-color, #e2e8f0);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;

            item.innerHTML = `
                <img src="${img.urls.small}" style="width: 100%; height: 100%; object-fit: cover;">
                <div class="hover-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.4); opacity: 0; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; color: white;">
                    <span class="material-symbols-outlined" style="font-size: 28px;">check_circle</span>
                </div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 4px 8px; background: rgba(0,0,0,0.6); color: white; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    av ${img.user.name}
                </div>
            `;

            item.addEventListener('mouseenter', () => {
                item.style.transform = 'scale(1.03)';
                item.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                item.querySelector('.hover-overlay').style.opacity = '1';
            });

            item.addEventListener('mouseleave', () => {
                item.style.transform = 'scale(1)';
                item.style.boxShadow = 'none';
                item.querySelector('.hover-overlay').style.opacity = '0';
            });

            item.addEventListener('click', () => {
                this.selectUnsplashImage(img.urls.regular, img.links.download_location);
            });

            resultsContainer.appendChild(item);
        });
    }

    async selectUnsplashImage(imageUrl, downloadLocation) {
        const imageInput = this.container.querySelector('#group-image-input');
        const previewImg = this.container.querySelector('#group-image-preview');
        const unsplashModal = this.container.querySelector('#group-unsplash-modal');

        if (imageInput) imageInput.value = imageUrl;
        if (previewImg) previewImg.src = imageUrl;

        if (unsplashModal) unsplashModal.style.display = 'none';

        // Trigger download tracking as required by Unsplash API terms
        try {
            const accessKey = 'W5CRu1Mp-4eJ7FV2PIdjVWPfHdkZV00F4I9fjIOEr60';
            await fetch(`${downloadLocation}?client_id=${accessKey}`);
        } catch (e) {
            console.warn('[Unsplash] Download tracking failed:', e);
        }
    }

    async handleDeleteCategory(catName) {
        if (this.app && typeof this.app.showCustomConfirm === 'function') {
            this.app.showCustomConfirm({
                title: 'Slett kategori',
                message: `Er du sikker på at du vil slette kategorien "${catName}"?`,
                confirmText: 'Slett',
                cancelText: 'Avbryt',
                isDanger: true,
                onConfirm: async () => {
                    await this.performDeleteCategory(catName);
                }
            });
        } else {
            if (confirm(`Er du sikker på at du vil slette kategorien "${catName}"?`)) {
                await this.performDeleteCategory(catName);
            }
        }
    }

    async performDeleteCategory(catName) {
        try {
            const db = firebase.firestore();
            const snap = await db.collection('groupCategories').where('name', '==', catName).get();
            
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            await this.loadGroupsData();
            this.renderCategoriesList();
        } catch (err) {
            console.error("Error deleting category:", err);
            alert("Kunne ikke slette kategori: " + err.message);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       GROUP HUB VIEW (Oversikt, Meldinger/Chat, Samlinger & Ressurser)
       ═══════════════════════════════════════════════════════════════════════════ */
    async renderGroupHubView(container) {
        this.activeGroup = this.groups.find(g => g.id === this.selectedGroupId);
        if (!this.activeGroup) {
            container.innerHTML = `<div style="padding:40px; text-align:center;">Fant ikke gruppen.</div>`;
            return;
        }

        const group = this.activeGroup;
        const uid = firebase.auth().currentUser?.uid;
        const isLeader = group.leaderUids && group.leaderUids.includes(uid);
        const img = group.imageUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80';

        container.innerHTML = `
            <!-- Back to groups button -->
            <button type="button" id="btn-back-to-directory" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); background: transparent; cursor: pointer; font-size: 13px; font-weight: 600; margin-bottom: 16px;">
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
                <span>Tilbake til grupper</span>
            </button>

            <!-- Group Banner & Header Card -->
            <div style="background: var(--card-bg, #ffffff); border-radius: 20px; border: 1px solid var(--border-color, #e2e8f0); overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
                <div style="position: relative; height: 180px; background: url('${img}') center/cover no-repeat;">
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,23,42,0.85), transparent);"></div>
                    <div style="position: absolute; bottom: 20px; left: 24px; right: 24px; color: white;">
                        <span style="background: var(--admin-orange, #d17d39); font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px;">
                            ${this.escapeHtml(group.category)}
                        </span>
                        <h2 style="margin: 8px 0 4px 0; font-size: 28px; font-weight: 800;">${this.escapeHtml(group.name)}</h2>
                        <p style="margin: 0; opacity: 0.9; font-size: 14px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                            <span>📍 ${this.escapeHtml(group.location || 'Sted ikke oppgitt')}</span>
                            <span>🕒 ${this.escapeHtml(group.meetingSchedule || '')}</span>
                            <span>👥 ${(group.memberUids || []).length} medlemmer</span>
                        </p>
                    </div>
                </div>

                <!-- Hub Sub-navigation Tabs -->
                <div style="display: flex; gap: 4px; padding: 12px 24px; background: var(--card-bg, #fff); border-top: 1px solid var(--border-color, #f1f5f9); overflow-x: auto;">
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'overview' ? 'active' : ''}" data-htab="overview" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">info</span> Oversikt
                    </button>
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'chat' ? 'active' : ''}" data-htab="chat" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">chat</span> Meldinger & Chat
                    </button>
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'events' ? 'active' : ''}" data-htab="events" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">calendar_month</span> Samlinger & Oppmøte
                    </button>
                    <button type="button" class="hub-tab-btn ${this.selectedGroupTab === 'resources' ? 'active' : ''}" data-htab="resources" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">folder</span> Ressurser
                    </button>

                    <div style="margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" id="btn-open-group-email-modal" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; background: linear-gradient(135deg, #d17d39 0%, #b86524 100%); color: white; border: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: transform 0.15s ease;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">mail</span>
                            <span>Send e-post til gruppen</span>
                        </button>
                        ${isLeader ? `
                            <button type="button" id="btn-duplicate-group-modal" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); background: transparent; cursor: pointer; font-size: 13px; font-weight: 600;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span> Dupliser gruppe
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Hub Tab Body -->
            <div id="hub-tab-body"></div>
        `;

        // Back button
        container.querySelector('#btn-back-to-directory')?.addEventListener('click', () => {
            this.currentView = 'directory';
            this.renderCurrentView();
        });

        // Open Group Email modal
        container.querySelector('#btn-open-group-email-modal')?.addEventListener('click', () => {
            this.openGroupEmailModal();
        });

        // Tab click
        container.querySelectorAll('.hub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedGroupTab = btn.dataset.htab;
                container.querySelectorAll('.hub-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderHubTabBody(container.querySelector('#hub-tab-body'));
            });
        });

        // Duplicate button
        container.querySelector('#btn-duplicate-group-modal')?.addEventListener('click', () => {
            this.openDuplicateModal(group);
        });

        this.renderHubTabBody(container.querySelector('#hub-tab-body'));
    }

    renderHubTabBody(tabContainer) {
        if (!tabContainer || !this.activeGroup) return;

        if (this.selectedGroupTab === 'overview') {
            this.renderHubOverview(tabContainer);
        } else if (this.selectedGroupTab === 'chat') {
            this.renderHubChat(tabContainer);
        } else if (this.selectedGroupTab === 'events') {
            this.renderHubEvents(tabContainer);
        } else if (this.selectedGroupTab === 'resources') {
            this.renderHubResources(tabContainer);
        }
    }

    renderHubOverview(tabContainer) {
        const group = this.activeGroup;
        tabContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                <div style="background: var(--card-bg, #fff); padding: 24px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0);">
                    <h3 style="margin-top: 0; font-size: 18px; font-weight: 700; margin-bottom: 12px;">Om gruppen</h3>
                    <p style="line-height: 1.6; opacity: 0.9; font-size: 15px; margin-bottom: 24px;">
                        ${this.escapeHtml(group.description || 'Ingen beskrivelse skrevet ennå.')}
                    </p>

                    <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">Praktisk informasjon</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--bg-muted, #f8fafc); padding: 16px; border-radius: 12px;">
                        <div>
                            <span style="font-size: 12px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">Møtetid</span>
                            <p style="margin: 4px 0 0 0; font-weight: 600;">${this.escapeHtml(group.meetingSchedule)}</p>
                        </div>
                        <div>
                            <span style="font-size: 12px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">Sted</span>
                            <p style="margin: 4px 0 0 0; font-weight: 600;">${this.escapeHtml(group.location)}</p>
                        </div>
                        <div>
                            <span style="font-size: 12px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">Påmeldingstype</span>
                            <p style="margin: 4px 0 0 0; font-weight: 600;">${group.joinPolicy === 'approval' ? 'Søknad / Godkjenning' : 'Åpen for alle'}</p>
                        </div>
                        <div>
                            <span style="font-size: 12px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">Gruppeledere</span>
                            <p style="margin: 4px 0 0 0; font-weight: 600;">${this.escapeHtml((group.leaderNames || []).join(', '))}</p>
                        </div>
                    </div>
                </div>

                <div style="background: var(--card-bg, #fff); padding: 24px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Medlemmer & Ledere (${((group.memberNames || []).length + (group.leaderNames || []).length) || (group.memberUids || []).length})</h3>
                        ${this.isAdmin ? `
                            <button type="button" id="btn-open-contacts-modal" style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; padding: 8px 16px; border-radius: 10px; background: linear-gradient(135deg, #d17d39 0%, #b86524 100%); color: white; border: none; font-weight: 600; cursor: pointer; transition: transform 0.15s ease;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">contacts</span>
                                <span>Hent fra kontakter (Admin)</span>
                            </button>
                        ` : ''}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${(group.leaderNames || []).map(leader => `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0);">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--admin-orange, #d17d39); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                                    ${leader.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight: 600; font-size: 14px;">${this.escapeHtml(leader)}</div>
                                    <div style="font-size: 12px; color: var(--admin-orange, #d17d39); font-weight: 600;">⭐ Gruppeleder</div>
                                </div>
                            </div>
                        `).join('')}
                        ${(group.memberNames || []).filter(m => !(group.leaderNames || []).includes(m)).map(member => `
                            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0);">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                                    ${member.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight: 600; font-size: 14px;">${this.escapeHtml(member)}</div>
                                    <div style="font-size: 12px; color: var(--text-muted, #64748b); font-weight: 600;">Medlem</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        tabContainer.querySelector('#btn-open-contacts-modal')?.addEventListener('click', () => {
            this.openContactsModal(group);
        });
    }

    renderHubChat(tabContainer) {
        tabContainer.innerHTML = `
            <div style="background: var(--card-bg, #fff); border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); height: 500px; display: flex; flex-direction: column; overflow: hidden;">
                <!-- Chat Feed -->
                <div id="group-chat-feed" style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
                    <div style="text-align: center; color: #94a3b8; font-size: 13px; margin: auto;">Laster gruppechat...</div>
                </div>

                <!-- Chat Input Form -->
                <form id="group-chat-form" style="display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border-color, #f1f5f9); background: var(--bg-muted, #f8fafc);">
                    <input type="text" id="chat-msg-input" placeholder="Skriv en melding, et bønneemne eller hilsen..." required style="flex: 1; padding: 12px 16px; border-radius: 20px; border: 1px solid var(--border-color, #cbd5e1); background: var(--input-bg, #fff);">
                    <button type="submit" style="padding: 10px 20px; border-radius: 20px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">send</span> Send
                    </button>
                </form>
            </div>
        `;

        this.listenToGroupMessages(tabContainer.querySelector('#group-chat-feed'));

        tabContainer.querySelector('#group-chat-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = tabContainer.querySelector('#chat-msg-input');
            const msg = input.value.trim();
            if (!msg) return;

            input.value = '';
            await this.sendGroupMessage(msg);
        });
    }

    listenToGroupMessages(feedContainer) {
        if (this.messagesListener) this.messagesListener();

        const db = firebase.firestore();
        this.messagesListener = db.collection('groups').doc(this.activeGroup.id)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limitToLast(50)
            .onSnapshot(snap => {
                if (snap.empty) {
                    feedContainer.innerHTML = `
                        <div style="text-align: center; color: #94a3b8; font-size: 14px; margin: auto;">
                            💬 Ingen meldinger i gruppen ennå. Bli den første til å skrive en hilsen!
                        </div>
                    `;
                    return;
                }

                const uid = firebase.auth().currentUser?.uid;
                let html = '';
                snap.forEach(doc => {
                    const m = doc.data();
                    const isMine = m.senderUid === uid;
                    const dateStr = m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                    html += `
                        <div style="display: flex; flex-direction: column; align-items: ${isMine ? 'flex-end' : 'flex-start'}; max-width: 80%; align-self: ${isMine ? 'flex-end' : 'flex-start'};">
                            <span style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 2px;">${this.escapeHtml(m.senderName || 'Medlem')} • ${dateStr}</span>
                            <div style="padding: 10px 16px; border-radius: 16px; font-size: 14px; line-height: 1.4; ${isMine ? 'background: var(--admin-orange, #d17d39); color: white; border-bottom-right-radius: 4px;' : 'background: var(--bg-muted, #f1f5f9); color: inherit; border-bottom-left-radius: 4px;'}">
                                ${this.escapeHtml(m.content)}
                            </div>
                        </div>
                    `;
                });
                feedContainer.innerHTML = html;
                feedContainer.scrollTop = feedContainer.scrollHeight;
            }, err => {
                console.error("Chat listener error:", err);
            });
    }

    async sendGroupMessage(content) {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;

        try {
            const db = firebase.firestore();
            await db.collection('groups').doc(this.activeGroup.id)
                .collection('messages')
                .add({
                    senderUid: currentUser.uid,
                    senderName: currentUser.displayName || 'HKM Medlem',
                    content: content,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (err) {
            console.error("Error sending message:", err);
        }
    }

    renderHubEvents(tabContainer) {
        const events = [
            { id: 'e1', title: 'Ukentlig samling & Matfellesskap', date: 'Tirsdag 12. August', time: '19:00', location: this.activeGroup.location },
            { id: 'e2', title: 'Bønnenatt & Lovsang', date: 'Tirsdag 26. August', time: '19:00', location: this.activeGroup.location }
        ];

        const uid = firebase.auth().currentUser?.uid;
        const isLeader = this.activeGroup.leaderUids && this.activeGroup.leaderUids.includes(uid);

        tabContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px;">
                ${events.map(evt => `
                    <div style="background: var(--card-bg, #fff); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
                        <div>
                            <span style="font-size: 12px; font-weight: 700; color: var(--admin-orange, #d17d39); text-transform: uppercase;">${evt.date} kl. ${evt.time}</span>
                            <h4 style="margin: 4px 0; font-size: 16px; font-weight: 700;">${evt.title}</h4>
                            <p style="margin: 0; font-size: 13px; opacity: 0.8;">📍 ${evt.location}</p>
                        </div>
                        <div style="display: flex; items-center; gap: 10px;">
                            <button type="button" class="btn-rsvp" data-status="yes" style="padding: 8px 16px; border-radius: 10px; background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; font-weight: 600; font-size: 13px; cursor: pointer;">
                                ✓ Jeg kommer
                            </button>
                            <button type="button" class="btn-rsvp" data-status="no" style="padding: 8px 16px; border-radius: 10px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; font-weight: 600; font-size: 13px; cursor: pointer;">
                                ✕ Kan ikke
                            </button>

                            ${isLeader ? `
                                <button type="button" class="btn-attendance" style="padding: 8px 14px; border-radius: 10px; background: var(--admin-orange, #d17d39); color: white; border: none; font-weight: 600; font-size: 13px; cursor: pointer;">
                                    📝 Oppmøte
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        tabContainer.querySelectorAll('.btn-attendance').forEach(btn => {
            btn.addEventListener('click', () => {
                alert("Oppmøterapport: Alle 8 medlemmer ble registrert til stede ✓");
            });
        });
    }

    renderHubResources(tabContainer) {
        const resources = [
            { title: 'Studiehefte: Å leve i Guds rike (PDF)', type: 'PDF', icon: 'picture_as_pdf', url: '#' },
            { title: 'Bønneguide & Ukens vers', type: 'Dokument', icon: 'description', url: '#' }
        ];

        tabContainer.innerHTML = `
            <div style="background: var(--card-bg, #fff); padding: 24px; border-radius: 16px; border: 1px solid var(--border-color, #e2e8f0);">
                <h3 style="margin-top: 0; font-size: 18px; font-weight: 700; margin-bottom: 16px;">Delte ressurser & pensum</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${resources.map(res => `
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-radius: 12px; background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0);">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span class="material-symbols-outlined" style="color: var(--admin-orange, #d17d39); font-size: 24px;">${res.icon}</span>
                                <div>
                                    <div style="font-weight: 600; font-size: 14px;">${res.title}</div>
                                    <span style="font-size: 11px; opacity: 0.6; font-weight: 600;">${res.type}</span>
                                </div>
                            </div>
                            <a href="${res.url}" style="padding: 6px 14px; border-radius: 8px; background: var(--admin-orange, #d17d39); color: white; text-decoration: none; font-size: 13px; font-weight: 600;">
                                Last ned
                            </a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       MODAL & GROUP MANAGEMENT (Create, Edit, Duplicate)
       ═══════════════════════════════════════════════════════════════════════════ */
    openCreateModal(groupToEdit = null) {
        const modal = this.container.querySelector('#group-form-modal');
        const form = this.container.querySelector('#group-form');
        const titleEl = this.container.querySelector('#group-modal-title');

        if (!modal || !form) return;

        // Populate categories dynamically
        const categorySelect = form.querySelector('#group-category-input');
        if (categorySelect) {
            categorySelect.innerHTML = this.categories.map(cat => `
                <option value="${this.escapeHtml(cat)}">${this.escapeHtml(cat)}</option>
            `).join('');
        }

        form.reset();
        const previewEl = form.querySelector('#group-image-preview');
        const defaultImg = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=150&q=80';
        if (groupToEdit) {
            titleEl.textContent = 'Rediger gruppe';
            form.querySelector('#group-form-id').value = groupToEdit.id;
            form.querySelector('#group-name-input').value = groupToEdit.name || '';
            form.querySelector('#group-category-input').value = groupToEdit.category || (this.categories[0] || 'Husfellesskap');
            form.querySelector('#group-schedule-input').value = groupToEdit.meetingSchedule || '';
            form.querySelector('#group-location-input').value = groupToEdit.location || '';
            form.querySelector('#group-description-input').value = groupToEdit.description || '';
            form.querySelector('#group-policy-input').value = groupToEdit.joinPolicy || 'open';
            form.querySelector('#group-image-input').value = groupToEdit.imageUrl || '';
            if (previewEl) previewEl.src = groupToEdit.imageUrl || defaultImg;
        } else {
            titleEl.textContent = 'Opprett ny gruppe';
            form.querySelector('#group-form-id').value = '';
            form.querySelector('#group-image-input').value = '';
            if (previewEl) previewEl.src = defaultImg;
        }

        modal.style.display = 'flex';
    }

    openDuplicateModal(group) {
        const modal = this.container.querySelector('#group-duplicate-modal');
        if (!modal) return;

        modal.querySelector('#duplicate-source-id').value = group.id;
        modal.querySelector('#duplicate-name-input').value = `${group.name} - Nytt semester`;
        modal.style.display = 'flex';
    }

    async handleSaveGroup() {
        const form = this.container.querySelector('#group-form');
        const id = form.querySelector('#group-form-id').value;
        const currentUser = firebase.auth().currentUser;
        const uid = currentUser ? currentUser.uid : 'demo-user';
        const name = currentUser ? (currentUser.displayName || 'Thomas Knutsen') : 'Thomas Knutsen';

        const payload = {
            name: form.querySelector('#group-name-input').value.trim(),
            category: form.querySelector('#group-category-input').value,
            meetingSchedule: form.querySelector('#group-schedule-input').value.trim(),
            location: form.querySelector('#group-location-input').value.trim(),
            description: form.querySelector('#group-description-input').value.trim(),
            joinPolicy: form.querySelector('#group-policy-input').value,
            imageUrl: form.querySelector('#group-image-input').value.trim() || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            const db = firebase.firestore();
            if (id) {
                await db.collection('groups').doc(id).update(payload);
            } else {
                payload.leaderUids = [uid];
                payload.leaderNames = [name];
                payload.memberUids = [uid];
                payload.memberCount = 1;
                payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('groups').add(payload);
            }

            this.container.querySelector('#group-form-modal').style.display = 'none';
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error saving group:", err);
            alert("Kunne ikke lagre gruppe: " + err.message);
        }
    }

    async handleDuplicateGroup() {
        const sourceId = this.container.querySelector('#duplicate-source-id').value;
        const newName = this.container.querySelector('#duplicate-name-input').value.trim();

        const source = this.groups.find(g => g.id === sourceId);
        if (!source || !newName) return;

        try {
            const db = firebase.firestore();
            const copyPayload = {
                ...source,
                name: newName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            delete copyPayload.id;

            const ref = await db.collection('groups').add(copyPayload);
            this.container.querySelector('#group-duplicate-modal').style.display = 'none';
            alert(`Suksess! Gruppen ble duplisert som "${newName}".`);
            this.selectedGroupId = ref.id;
            this.currentView = 'hub';
            await this.loadGroupsData();
        } catch (err) {
            console.error("Error duplicating group:", err);
            alert("Kunne ikke duplisere gruppe: " + err.message);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       CONTACTS IMPORT (ADMIN ONLY)
       ═══════════════════════════════════════════════════════════════════════════ */
    async openContactsModal(targetGroup = null) {
        if (!this.isAdmin) {
            alert("Kun administratorer kan hente personer fra kontakter.");
            return;
        }

        this.activeGroupForContacts = targetGroup || this.groups.find(g => g.id === this.selectedGroupId) || this.activeGroup;
        if (!this.activeGroupForContacts) {
            alert("Vennligst velg en gruppe først.");
            return;
        }

        const modal = this.container.querySelector('#group-contacts-modal');
        const container = this.container.querySelector('#contacts-list-container');
        if (!modal || !container) return;

        modal.style.display = 'flex';
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted, #64748b);">Laster inn kontakter fra CRM...</div>';

        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('contacts').get();
            this.allContactsList = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                const name = data.displayName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Uten navn';
                this.allContactsList.push({
                    id: doc.id,
                    name,
                    email: data.email || '',
                    phone: data.phone || '',
                    ...data
                });
            });

            this.selectedContactIds.clear();
            this.renderContactsList();
        } catch (err) {
            console.error("Feil ved henting av kontakter:", err);
            container.innerHTML = `<div style="text-align: center; padding: 24px; color: #ef4444;">Kunne ikke laste kontakter: ${this.escapeHtml(err.message)}</div>`;
        }
    }

    renderContactsList() {
        const container = this.container.querySelector('#contacts-list-container');
        const queryInput = this.container.querySelector('#contacts-search-input');
        if (!container) return;

        const query = (queryInput ? queryInput.value : '').toLowerCase().trim();
        const filtered = this.allContactsList.filter(c => 
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            c.phone.toLowerCase().includes(query)
        );

        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-muted, #64748b);">Ingen kontakter funnet.</div>';
            return;
        }

        container.innerHTML = filtered.map(contact => {
            const isChecked = this.selectedContactIds.has(contact.id);
            return `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: var(--bg-muted, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); cursor: pointer; transition: background 0.15s ease;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <input type="checkbox" class="contact-checkbox" data-cid="${contact.id}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--admin-orange, #d17d39); cursor: pointer;">
                        <div style="width: 34px; height: 34px; border-radius: 50%; background: var(--admin-orange, #d17d39); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
                            ${(contact.name.charAt(0) || 'K').toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 14px; color: var(--text-color, #0f172a);">${this.escapeHtml(contact.name)}</div>
                            <div style="font-size: 12px; opacity: 0.7; color: var(--text-muted, #64748b);">${this.escapeHtml(contact.email)}${contact.phone ? ` • ${this.escapeHtml(contact.phone)}` : ''}</div>
                        </div>
                    </div>
                </label>
            `;
        }).join('');

        container.querySelectorAll('.contact-checkbox').forEach(box => {
            box.addEventListener('change', () => {
                const cid = box.dataset.cid;
                if (box.checked) {
                    this.selectedContactIds.add(cid);
                } else {
                    this.selectedContactIds.delete(cid);
                }
            });
        });
    }

    async submitImportContacts() {
        if (!this.activeGroupForContacts) return;
        if (this.selectedContactIds.size === 0) {
            alert("Vennligst velg minst én kontakt.");
            return;
        }

        const rolePicker = this.container.querySelector('#contacts-role-picker');
        const roleType = rolePicker ? rolePicker.value : 'member';
        const group = this.activeGroupForContacts;

        const selectedContacts = this.allContactsList.filter(c => this.selectedContactIds.has(c.id));
        const selectedNames = selectedContacts.map(c => c.name);

        try {
            const db = firebase.firestore();
            const groupRef = db.collection('groups').doc(group.id);

            if (roleType === 'leader') {
                const updatedLeaders = Array.from(new Set([...(group.leaderNames || []), ...selectedNames]));
                await groupRef.update({
                    leaderNames: updatedLeaders,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                group.leaderNames = updatedLeaders;
            } else {
                const updatedMembers = Array.from(new Set([...(group.memberNames || []), ...selectedNames]));
                const updatedCount = updatedMembers.length;
                await groupRef.update({
                    memberNames: updatedMembers,
                    memberCount: updatedCount,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                group.memberNames = updatedMembers;
                group.memberCount = updatedCount;
            }

            // Create individual groupMembers docs
            const batch = db.batch();
            selectedContacts.forEach(contact => {
                const memRef = db.collection('groupMembers').doc(`${group.id}_${contact.id}`);
                batch.set(memRef, {
                    groupId: group.id,
                    contactId: contact.id,
                    name: contact.name,
                    email: contact.email || '',
                    phone: contact.phone || '',
                    role: roleType,
                    addedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            });
            await batch.commit();

            this.container.querySelector('#group-contacts-modal').style.display = 'none';
            alert(`Suksess! ${selectedContacts.length} kontakter ble lagt til i "${group.name}".`);

            await this.loadGroupsData();
            if (this.currentView === 'hub') {
                this.renderCurrentView();
            }
        } catch (err) {
            console.error("Feil ved import av kontakter til gruppe:", err);
            alert("Kunne ikke legge til kontakter: " + err.message);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       SEND EMAIL TO GROUP
       ═══════════════════════════════════════════════════════════════════════════ */
    openGroupEmailModal(targetGroup = null) {
        const group = targetGroup || this.activeGroup || this.groups.find(g => g.id === this.selectedGroupId);
        if (!group) {
            alert("Velg en gruppe først.");
            return;
        }

        const modal = this.container.querySelector('#group-email-modal');
        const subtitle = this.container.querySelector('#group-email-subtitle');
        if (!modal) return;

        if (subtitle) {
            subtitle.textContent = `Send e-postmelding til alle medlemmer i "${group.name}"`;
        }

        modal.style.display = 'flex';
    }

    async handleSendGroupEmail() {
        const group = this.activeGroup || this.groups.find(g => g.id === this.selectedGroupId);
        if (!group) return;

        const subjectInput = this.container.querySelector('#group-email-subject');
        const messageInput = this.container.querySelector('#group-email-message');
        const submitBtn = this.container.querySelector('#submit-group-email-btn');

        const subject = subjectInput ? subjectInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!subject || !message) {
            alert("Vennligst fyll ut både emne og melding.");
            return;
        }

        let recipients = [];
        try {
            const db = firebase.firestore();
            const memDocs = await db.collection('groupMembers').where('groupId', '==', group.id).get();
            memDocs.forEach(d => {
                const data = d.data();
                if (data.email) recipients.push({ name: data.name || '', email: data.email });
            });
        } catch (e) {
            console.warn("Mangler direkte groupMembers:", e);
        }

        if (recipients.length === 0) {
            (this.allContactsList || []).forEach(c => {
                if (c.email && (group.memberNames || []).some(m => m.toLowerCase().includes((c.name || '').toLowerCase()))) {
                    recipients.push({ name: c.name, email: c.email });
                }
            });
        }

        if (recipients.length === 0 && firebase.auth().currentUser?.email) {
            recipients.push({
                name: firebase.auth().currentUser.displayName || 'Gruppeleder',
                email: firebase.auth().currentUser.email
            });
        }

        if (recipients.length === 0) {
            alert("Fant ingen e-postadresser registrert for gruppens medlemmer. Legg til kontakter eller medlemmer med e-post først.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px;"></span> <span>Sender e-post...</span>';

        try {
            const token = await firebase.auth().currentUser.getIdToken();
            const response = await fetch('/sendGroupEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    groupId: group.id,
                    groupName: group.name,
                    recipients,
                    subject,
                    message
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || data.message || "Kunne ikke sende e-post");
            }

            alert(`Suksess! E-post ble sendt til ${data.successCount || recipients.length} medlemmer i gruppen "${group.name}".`);
            this.container.querySelector('#group-email-modal').style.display = 'none';
            if (subjectInput) subjectInput.value = '';
            if (messageInput) messageInput.value = '';
        } catch (err) {
            console.error("Feil ved utsending av e-post til gruppen:", err);
            alert("Kunne ikke sende e-post: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">send</span> <span>Send e-post til gruppen</span>';
        }
    }

    escapeHtml(str) {
        return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
}
