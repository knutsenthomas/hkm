import"./modulepreload-polyfill-B5Qt9EMX.js";import"./firebase-config-BNsh33Gw.js";import"./user-roles-D0mdCVLS.js";import"./firebase-service-DNKZ8naa.js";class ${constructor(){this.currentUser=null,this.profileData={},this.views={overview:this.renderOverview,profile:this.renderProfile,activity:this.renderActivity,notifications:this.renderNotifications,giving:this.renderGiving,courses:this.renderCourses,notes:this.renderNotes},this.init()}async init(){this.setupNavigation(),firebase.auth().onAuthStateChanged(async e=>{if(e){this.currentUser=e,await this.syncUserProfile(e),await this.syncProfileFromGoogleProvider(),this.profileData=await this.getMergedProfile(e),this.updateHeader(),this.initNotificationBadge();const t=window.location.hash.replace("#","")||"overview";this.loadView(t)}else window.location.href="login.html"})}setupNavigation(){var i,a,o,d;document.querySelectorAll(".nav-link[data-view]").forEach(c=>{c.addEventListener("click",r=>{r.preventDefault(),this.loadView(c.dataset.view),window.innerWidth<=768&&this.toggleSidebar(!1)})}),(i=document.getElementById("mobile-toggle"))==null||i.addEventListener("click",()=>this.toggleSidebar(!0)),(a=document.getElementById("sidebar-overlay"))==null||a.addEventListener("click",()=>this.toggleSidebar(!1)),(o=document.getElementById("logout-btn"))==null||o.addEventListener("click",()=>{firebase.auth().signOut().then(()=>window.location.href="../index.html")});const e=document.getElementById("actions-btn"),t=document.getElementById("actions-menu");e==null||e.addEventListener("click",c=>{c.stopPropagation(),t.classList.toggle("open")}),document.addEventListener("click",()=>t==null?void 0:t.classList.remove("open")),(d=document.getElementById("ph-upload"))==null||d.addEventListener("change",c=>this.handlePhotoUpload(c))}toggleSidebar(e){var t,i;(t=document.getElementById("sidebar"))==null||t.classList.toggle("active",e),(i=document.getElementById("sidebar-overlay"))==null||i.classList.toggle("active",e)}loadView(e){var i;this.views[e]||(e="overview"),window.location.hash=e,document.querySelectorAll(".nav-link").forEach(a=>a.classList.remove("active")),(i=document.querySelector(`.nav-link[data-view="${e}"]`))==null||i.classList.add("active");const t=document.getElementById("content-area");t.innerHTML='<div class="loading-state"><div class="spinner"></div><p>Laster...</p></div>',setTimeout(async()=>{try{await this.views[e].call(this,t)}catch(a){console.error(`View "${e}" error:`,a),t.innerHTML=`<div class="empty-state"><span class="material-symbols-outlined">error</span><h3>Noe gikk galt</h3><p>${a.message}</p></div>`}},80)}updateHeader(){var r,n;const e=this.profileData,t=e.displayName||((r=this.currentUser)==null?void 0:r.email)||"Bruker",i=document.getElementById("ph-name");i&&(i.textContent=t),this._setAvatarEl(document.getElementById("ph-avatar"),e.photoURL,t);const a=document.getElementById("ph-email-text");a&&(a.textContent=((n=this.currentUser)==null?void 0:n.email)||"—");const o=document.getElementById("ph-phone-text"),d=document.getElementById("ph-phone");e.phone?o&&(o.textContent=e.phone):d&&(d.style.display="none");const c=document.getElementById("ph-role");c&&(c.textContent=this._roleLabel(e.role))}_setAvatarEl(e,t,i){e&&(t?e.innerHTML=`<img src="${t}" alt="${i}">`:e.textContent=(i||"?").charAt(0).toUpperCase())}_roleLabel(e){return{admin:"Administrator",pastor:"Pastor",leder:"Leder",frivillig:"Frivillig",giver:"Fast Giver"}[e]||"Medlem"}async getMergedProfile(e){if(!e)return{};let t={};try{const a=await firebase.firestore().collection("users").doc(e.uid).get();a.exists&&(t=a.data()||{})}catch(a){console.warn("getMergedProfile:",a)}const i=(e.providerData||[]).find(a=>a.providerId==="google.com")||{};return{...t,displayName:t.displayName||e.displayName||i.displayName||e.email||"",photoURL:t.photoURL||e.photoURL||i.photoURL||""}}async syncUserProfile(e){if(e)try{const t=firebase.firestore().collection("users").doc(e.uid);(await t.get()).exists||(await t.set({email:e.email||"",displayName:e.displayName||"",photoURL:e.photoURL||"",role:"medlem",createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()}),await this.createAdminNotification({type:"NEW_USER_REGISTRATION",userId:e.uid,userEmail:e.email,userName:e.displayName||e.email,message:`Ny bruker: ${e.displayName||e.email}`}))}catch(t){console.warn("syncUserProfile:",t)}}async syncProfileFromGoogleProvider(){const e=this.currentUser;if(!e)return;const t=(e.providerData||[]).find(i=>i.providerId==="google.com");if(t)try{const i={};!e.displayName&&t.displayName&&(i.displayName=t.displayName),!e.photoURL&&t.photoURL&&(i.photoURL=t.photoURL),Object.keys(i).length&&await e.updateProfile(i),await firebase.firestore().collection("users").doc(e.uid).set({displayName:e.displayName||t.displayName||"",photoURL:e.photoURL||t.photoURL||"",updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:!0})}catch(i){console.warn("syncGoogleProvider:",i)}}async createAdminNotification(e){try{await firebase.firestore().collection("admin_notifications").add({...e,timestamp:firebase.firestore.FieldValue.serverTimestamp(),read:!1})}catch(t){console.warn("createAdminNotification:",t)}}initNotificationBadge(){var t;const e=(t=this.currentUser)==null?void 0:t.uid;if(e)try{firebase.firestore().collection("user_notifications").where("userId","==",e).where("read","==",!1).onSnapshot(i=>this._setBadge(i.size))}catch(i){console.warn("badge listener:",i)}}_setBadge(e){const t=document.getElementById("notif-badge");t&&(t.textContent=e>9?"9+":e,t.style.display=e>0?"inline-block":"none")}_timeAgo(e){const t=Math.floor((Date.now()-e)/1e3);return t<60?"Akkurat nå":t<3600?`${Math.floor(t/60)} min siden`:t<86400?`${Math.floor(t/3600)} t siden`:t<604800?`${Math.floor(t/86400)} d siden`:e.toLocaleDateString("no-NO",{day:"numeric",month:"short",year:"numeric"})}async renderOverview(e){var n;const t=this.profileData,i=this.currentUser,a=(t.displayName||(i==null?void 0:i.displayName)||(i==null?void 0:i.email)||"Venn").split(" ")[0],o=new Date().getFullYear(),d=new Date().getHours(),c=d<12?"God morgen":d<17?"Hei":"God kveld";e.innerHTML=`
        <div style="padding-bottom:32px">

            <!-- Welcome banner -->
            <div style="background:var(--accent-gradient); border-radius:var(--radius-lg); padding:28px 32px;
                margin-bottom:24px; box-shadow:0 8px 30px var(--accent-glow); display:flex;
                align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
                <div>
                    <h2 style="font-size:1.5rem; font-weight:800; color:#fff; letter-spacing:-0.02em; margin-bottom:6px;">
                        ${c}, ${a}! 👋
                    </h2>
                    <p style="color:rgba(255,255,255,0.85); font-size:0.9rem; font-weight:500;">
                        "For jeg vet hvilke tanker jeg har med dere, sier Herren..." — Jer 29:11
                    </p>
                </div>
                <div style="background:rgba(255,255,255,0.15); border-radius:var(--radius-sm);
                    padding:12px 18px; backdrop-filter:blur(4px);">
                    <div style="color:rgba(255,255,255,0.8); font-size:0.7rem; font-weight:700;
                        text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px;">Medlem siden</div>
                    <div style="color:#fff; font-size:1.1rem; font-weight:800;" id="ov-member-since">—</div>
                </div>
            </div>

            <!-- Stats row -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:14px; margin-bottom:24px;">
                <div class="stat-chip">
                    <div class="stat-chip-label">Uleste varslinger</div>
                    <div class="stat-chip-value" id="ov-notif-count">—</div>
                    <div class="stat-chip-sub">Trykk for å se alle</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">Gitt totalt i ${o}</div>
                    <div class="stat-chip-value" id="ov-year-total">—</div>
                    <div class="stat-chip-sub" id="ov-year-sub">Se gavehistorikk</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">Tilgjengelige kurs</div>
                    <div class="stat-chip-value" id="ov-courses-count">—</div>
                    <div class="stat-chip-sub">Undervisning fra HKM</div>
                </div>
            </div>

            <!-- Quick actions -->
            <div class="info-card" style="margin-bottom:20px">
                <div class="info-card-header"><h3>Hurtiglenker</h3></div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1px;
                    background:var(--border-color);">
                    ${[{view:"profile",icon:"person",label:"Min profil",sub:"Kontakt & personlig info"},{view:"giving",icon:"volunteer_activism",label:"Gaver",sub:"Gavehistorikk & skattefradrag"},{view:"courses",icon:"school",label:"Kurs",sub:"Undervisning fra HKM"},{view:"notifications",icon:"notifications",label:"Varslinger",sub:"Meldinger fra HKM"}].map(s=>`
                    <button class="ov-action-btn" data-view="${s.view}">
                        <div style="width:40px;height:40px;border-radius:12px;background:var(--accent-light);
                            display:flex;align-items:center;justify-content:center;margin-bottom:10px;">
                            <span class="material-symbols-outlined" style="font-size:20px;color:var(--accent-color);">${s.icon}</span>
                        </div>
                        <div style="font-size:0.88rem;font-weight:800;color:var(--text-main);margin-bottom:2px;">${s.label}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);">${s.sub}</div>
                    </button>`).join("")}
                </div>
            </div>

            <!-- Recent notifications -->
            <div class="info-card">
                <div class="info-card-header">
                    <h3>Siste varslinger</h3>
                    <button class="btn btn-ghost btn-sm" onclick="window.minSideManager.loadView('notifications')">
                        Se alle
                    </button>
                </div>
                <div id="ov-recent-notifs">
                    <div class="loading-state" style="min-height:80px"><div class="spinner"></div></div>
                </div>
            </div>

        </div>`,e.querySelectorAll(".ov-action-btn").forEach(s=>{s.addEventListener("click",()=>this.loadView(s.dataset.view))}),(n=t.createdAt)!=null&&n.toDate?document.getElementById("ov-member-since").textContent=t.createdAt.toDate().getFullYear():document.getElementById("ov-member-since").textContent=new Date().getFullYear();const r=i==null?void 0:i.uid;try{const[s,l,m,p]=await Promise.all([firebase.firestore().collection("user_notifications").where("userId","==",r).where("read","==",!1).get(),firebase.firestore().collection("donations").where("userId","==",r).get(),firebase.firestore().collection("teaching").get(),firebase.firestore().collection("user_notifications").where("userId","==",r).orderBy("createdAt","desc").limit(4).get()]),u=document.getElementById("ov-notif-count");u&&(u.textContent=s.size||"0");let f=0;l.forEach(x=>{var v,h,w,E;const b=x.data();((E=(w=(h=(v=b.timestamp)==null?void 0:v.toDate)==null?void 0:h.call(v))==null?void 0:w.getFullYear)==null?void 0:E.call(w))===new Date().getFullYear()&&(f+=(b.amount||0)/100)});const y=document.getElementById("ov-year-total");y&&(y.textContent=f>0?`kr ${f.toLocaleString("no-NO",{minimumFractionDigits:0})}`:"Ingen");const g=document.getElementById("ov-courses-count");g&&(g.textContent=m.size||"0");const k=document.getElementById("ov-recent-notifs");k&&(p.empty?k.innerHTML='<div style="padding:24px 22px; color:var(--text-muted); font-size:0.87rem;">Ingen varslinger ennå.</div>':k.innerHTML=p.docs.map(x=>{var h;const b=x.data(),v=(h=b.createdAt)!=null&&h.toDate?b.createdAt.toDate():new Date(0);return`<div style="display:flex;align-items:center;gap:14px;padding:13px 22px;
                            border-bottom:1px solid var(--border-color);transition:background 0.15s;"
                            onmouseover="this.style.background='var(--main-bg)'"
                            onmouseout="this.style.background=''">
                            <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;
                                background:${b.read?"#e2e8f0":"var(--accent-color)"};"></div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:0.88rem;font-weight:700;color:var(--text-main);
                                    margin-bottom:2px;">${b.title||"Varsling"}</div>
                                <div style="font-size:0.78rem;color:var(--text-muted);
                                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.body||""}</div>
                            </div>
                            <div style="font-size:0.73rem;color:#94a3b8;white-space:nowrap;">${this._timeAgo(v)}</div>
                        </div>`}).join("")+`<div style="padding:12px 22px;">
                        <button class="btn btn-ghost btn-sm" style="width:100%"
                            onclick="window.minSideManager.loadView('notifications')">
                            Vis alle varslinger
                        </button></div>`)}catch(s){console.warn("Overview fetch error:",s)}}async renderProfile(e){var l,m,p,u,f,y,g,k,x,b;const t=(l=this.currentUser)==null?void 0:l.uid;if(!t)return;let i={};try{const v=await firebase.firestore().collection("users").doc(t).get();v.exists&&(i=v.data()||{})}catch{}const a={...this.profileData,...i},o=v=>v?`<span class="info-row-value">${v}</span>`:'<span class="info-row-value empty">—</span>',d=(m=a.createdAt)!=null&&m.toDate?a.createdAt.toDate().getFullYear():new Date().getFullYear();e.innerHTML=`
        <div class="profile-grid">
            <!-- ── LEFT COLUMN ── -->
            <div class="profile-left">

                <!-- Contact information -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Kontaktinformasjon</h3>
                        <button class="edit-icon-btn" id="toggle-contact-edit" title="Rediger">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    </div>
                    <div class="info-rows" id="contact-display">
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">mail</span>
                            <div class="info-row-content">
                                <div class="info-row-label">E-post</div>
                                ${o(this.currentUser.email)}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">phone</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Telefon</div>
                                ${o(a.phone)}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">location_on</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Adresse</div>
                                ${a.address||a.zip||a.city?`<span class="info-row-value">${[a.address,[a.zip,a.city].filter(Boolean).join(" ")].filter(Boolean).join("<br>")}</span>`:'<span class="info-row-value empty">—</span>'}
                            </div>
                        </div>
                    </div>
                    <!-- Inline edit form -->
                    <div class="edit-form" id="contact-edit-form" style="display:none">
                        <div class="form-group">
                            <label>Fullt navn</label>
                            <input name="displayName" value="${a.displayName||""}" autocomplete="name">
                        </div>
                        <div class="form-group">
                            <label>Telefon</label>
                            <input name="phone" type="tel" value="${a.phone||""}">
                        </div>
                        <div class="form-group">
                            <label>Gateadresse</label>
                            <input name="address" value="${a.address||""}">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Postnr</label>
                                <input name="zip" value="${a.zip||""}">
                            </div>
                            <div class="form-group">
                                <label>By</label>
                                <input name="city" value="${a.city||""}">
                            </div>
                        </div>
                        <div class="edit-form-actions">
                            <button class="btn btn-ghost btn-sm" id="cancel-contact-edit">Avbryt</button>
                            <button class="btn btn-primary btn-sm" id="save-contact-btn">
                                <span class="material-symbols-outlined">save</span> Lagre
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Personal information -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Personlig informasjon</h3>
                        <button class="edit-icon-btn" id="toggle-personal-edit">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    </div>
                    <div class="info-rows" id="personal-display">
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">person</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Kjønn</div>
                                ${o(a.gender)}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">cake</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Fødselsdato</div>
                                ${o(a.birthday?new Date(a.birthday).toLocaleDateString("no-NO",{day:"numeric",month:"long",year:"numeric"}):"")}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">favorite</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Sivilstatus</div>
                                ${o(a.maritalStatus)}
                            </div>
                        </div>
                        <div class="info-row">
                            <span class="material-symbols-outlined info-row-icon">calendar_today</span>
                            <div class="info-row-content">
                                <div class="info-row-label">Medlem siden</div>
                                <span class="info-row-value">${d}</span>
                            </div>
                        </div>
                    </div>
                    <div class="edit-form" id="personal-edit-form" style="display:none">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Kjønn</label>
                                <select name="gender">
                                    <option value="">Velg...</option>
                                    <option value="Mann" ${a.gender==="Mann"?"selected":""}>Mann</option>
                                    <option value="Kvinne" ${a.gender==="Kvinne"?"selected":""}>Kvinne</option>
                                    <option value="Annet" ${a.gender==="Annet"?"selected":""}>Annet</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Sivilstatus</label>
                                <select name="maritalStatus">
                                    <option value="">Velg...</option>
                                    <option value="Ugift"     ${a.maritalStatus==="Ugift"?"selected":""}>Ugift</option>
                                    <option value="Gift"      ${a.maritalStatus==="Gift"?"selected":""}>Gift</option>
                                    <option value="Samboer"   ${a.maritalStatus==="Samboer"?"selected":""}>Samboer</option>
                                    <option value="Skilt"     ${a.maritalStatus==="Skilt"?"selected":""}>Skilt</option>
                                    <option value="Enke/Enkemann" ${a.maritalStatus==="Enke/Enkemann"?"selected":""}>Enke/Enkemann</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Fødselsdato</label>
                            <input type="date" name="birthday" value="${a.birthday||""}">
                        </div>
                        <div class="form-group">
                            <label>Personnummer (kryptert)</label>
                            <input type="password" name="ssn" placeholder="Bare for skattefradrag" value="${a.ssn||""}">
                        </div>
                        <div class="edit-form-actions">
                            <button class="btn btn-ghost btn-sm" id="cancel-personal-edit">Avbryt</button>
                            <button class="btn btn-primary btn-sm" id="save-personal-btn">
                                <span class="material-symbols-outlined">save</span> Lagre
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Kontoadministrasjon</h3>
                    </div>
                    <div style="padding: 16px 20px;">
                        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:14px;">
                            Sletting av konto er permanent og kan ikke angres.
                        </p>
                        <button class="btn btn-danger" id="delete-account-btn">
                            <span class="material-symbols-outlined">delete_forever</span>
                            Slett konto
                        </button>
                    </div>
                </div>
            </div>

            <!-- ── RIGHT COLUMN ── -->
            <div class="profile-right">

                <!-- Household -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Familie</h3>
                    </div>
                    <div id="household-content">
                        ${(p=a.familyMembers)!=null&&p.length?`
                            <p class="household-name">${((u=a.displayName)==null?void 0:u.split(" ").pop())||""} Husstand</p>
                            <div class="household-members">
                                ${a.familyMembers.map(v=>`
                                    <div class="member-row">
                                        <div class="member-avatar">${(v.name||"?").charAt(0).toUpperCase()}</div>
                                        <div class="member-info">
                                            <div class="member-info-name">${v.name}</div>
                                            <div class="member-info-sub">${v.role||""}</div>
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        `:`
                            <div class="empty-state" style="padding:32px 20px;">
                                <span class="material-symbols-outlined" style="font-size:36px;">group_off</span>
                                <p style="font-size:0.82rem;">Ingen familiemedlemmer registrert.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Push Notifications Toggle -->
                <div class="info-card">
                    <div class="info-card-header">
                        <h3>Varslingspreferanser</h3>
                    </div>
                    <div class="setting-row">
                        <div>
                            <div class="setting-row-label">Push-varslinger</div>
                            <div class="setting-row-sub">Mottar varslinger når HKM sender meldinger</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="push-toggle" ${a.pushEnabled?"checked":""}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="setting-row">
                        <div>
                            <div class="setting-row-label">E-postvarslinger</div>
                            <div class="setting-row-sub">Mottar nyhetsbrev og oppdateringer</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="email-toggle" ${a.emailConsent!==!1?"checked":""}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div style="padding:12px 20px;">
                        <button class="btn btn-primary btn-sm" id="save-prefs-btn" style="width:100%">Lagre preferanser</button>
                    </div>
                </div>

            </div>
        </div>`;const c=document.getElementById("toggle-contact-edit"),r=document.getElementById("contact-edit-form");document.getElementById("contact-display"),c==null||c.addEventListener("click",()=>{const v=r.style.display==="none";r.style.display=v?"grid":"none"}),(f=document.getElementById("cancel-contact-edit"))==null||f.addEventListener("click",()=>{r.style.display="none"}),(y=document.getElementById("save-contact-btn"))==null||y.addEventListener("click",async()=>{await this._saveProfileFields(r,["displayName","phone","address","zip","city"]),this.profileData=await this.getMergedProfile(this.currentUser),this.updateHeader(),this.loadView("profile")});const n=document.getElementById("toggle-personal-edit"),s=document.getElementById("personal-edit-form");n==null||n.addEventListener("click",()=>{s.style.display=s.style.display==="none"?"grid":"none"}),(g=document.getElementById("cancel-personal-edit"))==null||g.addEventListener("click",()=>{s.style.display="none"}),(k=document.getElementById("save-personal-btn"))==null||k.addEventListener("click",async()=>{await this._saveProfileFields(s,["gender","maritalStatus","birthday","ssn"]),this.loadView("profile")}),(x=document.getElementById("save-prefs-btn"))==null||x.addEventListener("click",async()=>{var w,E;const v=(w=document.getElementById("push-toggle"))==null?void 0:w.checked,h=(E=document.getElementById("email-toggle"))==null?void 0:E.checked;try{await firebase.firestore().collection("users").doc(this.currentUser.uid).set({pushEnabled:v,emailConsent:h,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:!0}),v&&await this._requestPushPermission()}catch(L){console.warn("save prefs:",L)}}),(b=document.getElementById("delete-account-btn"))==null||b.addEventListener("click",()=>this.showDeleteConfirmModal())}async _saveProfileFields(e,t){if(!this.currentUser)return;const i=e.querySelector('button[id^="save-"]');i&&(i.disabled=!0,i.textContent="Lagrer...");try{const a={updatedAt:firebase.firestore.FieldValue.serverTimestamp()};t.forEach(o=>{const d=e.querySelector(`[name="${o}"]`);d&&(a[o]=d.value)}),a.displayName&&a.displayName!==this.currentUser.displayName&&await this.currentUser.updateProfile({displayName:a.displayName}),await firebase.firestore().collection("users").doc(this.currentUser.uid).set(a,{merge:!0})}catch(a){console.error("saveProfileFields:",a),alert("Feil ved lagring: "+a.message)}finally{i&&(i.disabled=!1,i.textContent="Lagret ✓")}}async _requestPushPermission(){try{if(!firebase.messaging||!firebase.messaging.isSupported()||await Notification.requestPermission()!=="granted")return;const i=await firebase.messaging().getToken({vapidKey:"BI2k24dp-3eJWtLSPvGWQkD00A_duNRCIMY_2ozLFI0-anJDamFBALaTdtzGYQEkoFz8X0JxTcCX6tn3P_i0YrA"});i&&await firebase.firestore().collection("users").doc(this.currentUser.uid).update({fcmTokens:firebase.firestore.FieldValue.arrayUnion(i)})}catch(e){console.warn("push permission:",e)}}async handlePhotoUpload(e){var i;const t=(i=e.target.files)==null?void 0:i[0];if(!(!t||!this.currentUser))try{const a=firebase.storage().ref(`profilePictures/${this.currentUser.uid}`);await a.put(t);const o=await a.getDownloadURL();await this.currentUser.updateProfile({photoURL:o}),await firebase.firestore().collection("users").doc(this.currentUser.uid).set({photoURL:o},{merge:!0}),this.profileData.photoURL=o,this._setAvatarEl(document.getElementById("ph-avatar"),o,this.profileData.displayName)}catch(a){console.error("Photo upload failed:",a),alert("Feil ved opplasting: "+a.message)}}async renderActivity(e){var a;const t=(a=this.currentUser)==null?void 0:a.uid;e.innerHTML='<div style="width:100%;display:block" id="activity-inner"><div class="loading-state" style="min-height:120px"><div class="spinner"></div></div></div>';const i=e.querySelector("#activity-inner");try{const o=await firebase.firestore().collection("user_notifications").where("userId","==",t).orderBy("createdAt","desc").limit(50).get();if(o.empty){i.innerHTML=`<div class="empty-state">
                    <span class="material-symbols-outlined">history</span>
                    <h3>Ingen aktivitet ennå</h3>
                    <p>Aktivitet som push-varslinger og meldinger du mottar vil vises her.</p>
                </div>`;return}const d={push:{icon:"campaign",bg:"var(--accent-light)",color:"var(--accent-color)"},message:{icon:"mail",bg:"#f0fdf4",color:"#16a34a"},default:{icon:"notifications",bg:"#faf5ff",color:"#9333ea"}};i.innerHTML=o.docs.map(c=>{var l;const r=c.data(),n=(l=r.createdAt)!=null&&l.toDate?r.createdAt.toDate():new Date(0),s=d[r.type]||d.default;return`
                <div class="activity-item ${r.read?"":"unread"}">
                    <div class="activity-icon" style="background:${s.bg}">
                        <span class="material-symbols-outlined" style="color:${s.color}">${s.icon}</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${r.title||"Varsling"}</div>
                        ${r.body?`<div class="activity-body">${r.body}</div>`:""}
                        ${r.link?`<a href="${r.link}" target="_blank" style="font-size:0.78rem; color:var(--accent);">Åpne lenke →</a>`:""}
                        <div class="activity-time">${this._timeAgo(n)}</div>
                    </div>
                </div>`}).join("")}catch{i.innerHTML='<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Kunne ikke laste aktivitet.</p></div>'}}async renderNotifications(e){var a,o;const t=(a=this.currentUser)==null?void 0:a.uid;e.innerHTML=`
        <div style="width:100%">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                <h2 style="font-size:1.05rem; font-weight:700;">Varslinger</h2>
                <button class="btn btn-ghost btn-sm" id="mark-all-read-btn">Merk alle lest</button>
            </div>
            <div id="notifs-inner"><div class="loading-state" style="min-height:80px"><div class="spinner"></div></div></div>
        </div>`;const i=e.querySelector("#notifs-inner");try{const d=await firebase.firestore().collection("user_notifications").where("userId","==",t).orderBy("createdAt","desc").limit(30).get();if(d.empty){i.innerHTML=`<div class="empty-state">
                    <span class="material-symbols-outlined">notifications_off</span>
                    <h3>Ingen varslinger</h3>
                    <p>Du har ingen varslinger ennå.</p>
                </div>`;return}const c=d.docs.map(n=>({id:n.id,...n.data()}));i.innerHTML=c.map(n=>{var l;const s=(l=n.createdAt)!=null&&l.toDate?n.createdAt.toDate():new Date(0);return`<div class="activity-item ${n.read?"":"unread"}">
                    <div class="activity-icon" style="background:${n.read?"#1c2030":"#1e3a5f"}">
                        <span class="material-symbols-outlined" style="color:${n.read?"#475569":"#60a5fa"}">campaign</span>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${n.title||"Varsling"}</div>
                        ${n.body?`<div class="activity-body">${n.body}</div>`:""}
                        <div class="activity-time">${this._timeAgo(s)}</div>
                    </div>
                    ${n.read?"":'<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px"></div>'}
                </div>`}).join("");const r=c.filter(n=>!n.read);if(r.length){const n=firebase.firestore().batch();r.forEach(s=>n.update(firebase.firestore().collection("user_notifications").doc(s.id),{read:!0})),await n.commit(),this._setBadge(0)}(o=document.getElementById("mark-all-read-btn"))==null||o.addEventListener("click",async()=>{const n=firebase.firestore().batch();c.forEach(s=>n.update(firebase.firestore().collection("user_notifications").doc(s.id),{read:!0})),await n.commit(),this._setBadge(0),this.renderNotifications(e)})}catch{i.innerHTML='<div class="empty-state"><p>Kunne ikke laste varslinger.</p></div>'}}async renderGiving(e){var c,r;const t=(c=this.currentUser)==null?void 0:c.uid;e.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';let i=[];try{(await firebase.firestore().collection("donations").where("userId","==",t).orderBy("timestamp","desc").get()).forEach(s=>i.push({id:s.id,...s.data()}))}catch{}const a=new Date().getFullYear(),o=i.filter(n=>{var s,l,m,p;return((p=(m=(l=(s=n.timestamp)==null?void 0:s.toDate)==null?void 0:l.call(s))==null?void 0:m.getFullYear)==null?void 0:p.call(m))===a}).reduce((n,s)=>n+(s.amount||0)/100,0),d=i[0];e.innerHTML=`
        <div>
            <div class="giving-stats">
                <div class="stat-chip">
                    <div class="stat-chip-label">Gitt i ${a}</div>
                    <div class="stat-chip-value">${o>0?`kr ${o.toLocaleString("no-NO",{minimumFractionDigits:0})}`:"—"}</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">Siste gave</div>
                    <div class="stat-chip-value">${d?`kr ${(d.amount/100).toLocaleString("no-NO")}`:"—"}</div>
                    <div class="stat-chip-sub">${(r=d==null?void 0:d.timestamp)!=null&&r.toDate?d.timestamp.toDate().toLocaleDateString("no-NO"):""}</div>
                </div>
                <div class="stat-chip">
                    <div class="stat-chip-label">Totalt antall gaver</div>
                    <div class="stat-chip-value">${i.length||"—"}</div>
                </div>
            </div>

            <div class="table-card">
                <div class="table-card-header">
                    <h3>Gavehistorikk</h3>
                </div>
                ${i.length===0?`
                    <div class="empty-state" style="padding:48px 24px">
                        <span class="material-symbols-outlined">volunteer_activism</span>
                        <h3>Ingen gaver ennå</h3>
                        <p>Dine donasjoner til HKM vises her.</p>
                    </div>
                `:`
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Dato</th>
                                <th>Type</th>
                                <th>Metode</th>
                                <th class="text-right">Beløp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${i.map(n=>{var l;return`<tr>
                                    <td>${((l=n.timestamp)!=null&&l.toDate?n.timestamp.toDate():new Date).toLocaleDateString("no-NO",{day:"2-digit",month:"short",year:"numeric"})}</td>
                                    <td>${n.type||"Gave"}</td>
                                    <td><span class="method-tag">${n.method||"Kort"}</span></td>
                                    <td class="text-right"><strong>kr ${(n.amount/100).toLocaleString("no-NO",{minimumFractionDigits:2})}</strong></td>
                                </tr>`}).join("")}
                        </tbody>
                    </table>
                `}
            </div>

            ${o>=500?`
            <div class="info-card" style="margin-top:16px">
                <div class="info-card-header">
                    <h3>Skattefradrag</h3>
                </div>
                <div class="info-row">
                    <span class="material-symbols-outlined info-row-icon">receipt_long</span>
                    <div class="info-row-content">
                        <div class="info-row-label">Fradragsberettiget ${a}</div>
                        <span class="info-row-value">kr ${o.toLocaleString("no-NO",{minimumFractionDigits:2})}</span>
                    </div>
                </div>
                <div style="padding:12px 20px; font-size:0.8rem; color:var(--text-muted);">
                    Gaver over kr 500 er skattefradragsberettiget. Kontakt HKM for bekreftelse.
                </div>
            </div>`:""}
        </div>`}async renderCourses(e){e.innerHTML='<div style="width:100%"><div class="loading-state"><div class="spinner"></div></div></div>';let t=[];try{(await firebase.firestore().collection("teaching").orderBy("createdAt","desc").get()).forEach(a=>t.push({id:a.id,...a.data()}))}catch{}if(t.length===0){e.innerHTML=`<div style="width:100%"><div class="empty-state">
                <span class="material-symbols-outlined">school</span>
                <h3>Ingen kurs ennå</h3>
                <p>Undervisnings- og kursinnhold fra HKM vil vises her.</p>
            </div></div>`;return}e.innerHTML=`<div class="courses-grid">
            ${t.map(i=>`
            <div class="course-card">
                <div class="course-thumb">
                    ${i.imageUrl?`<img src="${i.imageUrl}" alt="${i.title}" loading="lazy">`:'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:40px;color:var(--border-light)">school</span></div>'}
                    ${i.category?`<span class="course-badge">${i.category}</span>`:""}
                </div>
                <div class="course-body">
                    <div class="course-title">${i.title||"Uten tittel"}</div>
                    <div class="course-desc">${i.excerpt||i.intro||""}</div>
                    ${i.videoUrl?`<a href="${i.videoUrl}" target="_blank" class="btn btn-primary btn-sm">
                        <span class="material-symbols-outlined">play_circle</span> Se video
                    </a>`:""}
                </div>
            </div>`).join("")}
        </div>`}async renderNotes(e){var o;const t=(o=this.currentUser)==null?void 0:o.uid;e.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';let i=[],a=[];try{const[d,c]=await Promise.all([firebase.firestore().collection("personal_notes").where("userId","==",t).orderBy("createdAt","desc").get(),firebase.firestore().collection("user_notes").where("userId","==",t).orderBy("createdAt","desc").get()]);d.forEach(r=>i.push({id:r.id,...r.data()})),c.forEach(r=>a.push({id:r.id,...r.data()}))}catch(d){console.warn("renderNotes fetch:",d)}this._renderNotesUI(e,i,a)}_renderNotesUI(e,t,i){var d,c,r,n;const a=s=>{var l;return`
        <div class="personal-note-card" data-id="${s.id}">
            <div class="personal-note-header">
                <div class="personal-note-title">${s.title||"Uten tittel"}</div>
                <div class="personal-note-meta">${(l=s.createdAt)!=null&&l.toDate?this._timeAgo(s.createdAt.toDate()):""}</div>
                <div class="personal-note-actions">
                    <button class="note-btn-edit" data-id="${s.id}" title="Rediger">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="note-btn-delete" data-id="${s.id}" title="Slett">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>
            <div class="personal-note-body rte-content">${s.text||""}</div>
        </div>`};e.innerHTML=`
        <div style="width:100%">

            <!-- Header row -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
                <div>
                    <h2 style="font-size:1.1rem; font-weight:800; letter-spacing:-0.01em;">Mine notater</h2>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-top:3px;">
                        Personlige notater som bare du kan se
                    </p>
                </div>
                <button class="btn btn-primary" id="new-note-btn">
                    <span class="material-symbols-outlined">add</span>
                    Nytt notat
                </button>
            </div>

            <!-- New note form (hidden by default) -->
            <div class="new-note-form" id="new-note-form" style="display:none;">
                <div class="form-group">
                    <label>Tittel</label>
                    <input id="note-title-input" placeholder="Gi notatet en tittel..." autocomplete="off">
                </div>
                <div class="form-group" style="margin-top:10px;">
                    <label>Innhold</label>
                    <div class="rte-wrapper">
                        <div class="rte-toolbar" id="rte-toolbar-new">
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
                        <div class="rte-editor" id="note-body-editor" contenteditable="true"
                            data-placeholder="Skriv notat her..."></div>
                    </div>
                </div>
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
                    <button class="btn btn-ghost btn-sm" id="cancel-note-btn">Avbryt</button>
                    <button class="btn btn-primary btn-sm" id="save-note-btn">
                        <span class="material-symbols-outlined">save</span>
                        Lagre notat
                    </button>
                </div>
            </div>

            <!-- Personal notes list -->
            <div id="personal-notes-list" class="notes-list">
                ${t.length===0?`<div class="note-empty-personal">
                        <span class="material-symbols-outlined">edit_note</span>
                        <p>Du har ingen egne notater ennå.<br>Trykk «Nytt notat» for å begynne.</p>
                       </div>`:t.map(a).join("")}
            </div>

            <!-- HKM Notes (read-only) -->
            ${i.length>0?`
            <div style="margin-top:32px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
                    <div style="flex:1; height:1px; background:var(--border-color);"></div>
                    <span style="font-size:0.7rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em; white-space:nowrap;">
                        Notater fra HKM
                    </span>
                    <div style="flex:1; height:1px; background:var(--border-color);"></div>
                </div>
                <div class="notes-list">
                    ${i.map(s=>{var l;return`
                    <div class="note-card">
                        <div class="note-author">
                            <span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle; margin-right:4px;">shield_person</span>
                            ${s.authorName||"HKM-teamet"} · ${(l=s.createdAt)!=null&&l.toDate?this._timeAgo(s.createdAt.toDate()):""}
                        </div>
                        ${s.title?`<div style="font-size:0.9rem; font-weight:700; margin-bottom:4px;">${s.title}</div>`:""}
                        <div class="note-text">${s.text||""}</div>
                    </div>`}).join("")}
                </div>
            </div>`:""}

        </div>`;const o=(d=this.currentUser)==null?void 0:d.uid;this._wireRteToolbar("rte-toolbar-new","note-body-editor"),(c=document.getElementById("new-note-btn"))==null||c.addEventListener("click",()=>{var m;const s=document.getElementById("new-note-form"),l=s.style.display!=="none";s.style.display=l?"none":"block",l||(m=document.getElementById("note-title-input"))==null||m.focus()}),(r=document.getElementById("cancel-note-btn"))==null||r.addEventListener("click",()=>{document.getElementById("new-note-form").style.display="none",document.getElementById("note-title-input").value="",document.getElementById("note-body-editor").innerHTML=""}),(n=document.getElementById("save-note-btn"))==null||n.addEventListener("click",async()=>{var f,y;const s=document.getElementById("note-title-input").value.trim(),l=document.getElementById("note-body-editor"),m=((f=l==null?void 0:l.innerHTML)==null?void 0:f.trim())||"";if(!(((y=l==null?void 0:l.innerText)==null?void 0:y.trim())||"")){l==null||l.focus();return}const u=document.getElementById("save-note-btn");u.disabled=!0,u.textContent="Lagrer...";try{const g=await firebase.firestore().collection("personal_notes").add({userId:o,title:s||"Uten tittel",text:m,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});t.unshift({id:g.id,title:s||"Uten tittel",text:m,createdAt:null}),this._renderNotesUI(e,t,i)}catch(g){console.error("Save note error:",g),alert("Feil ved lagring: "+g.message),u.disabled=!1,u.innerHTML='<span class="material-symbols-outlined">save</span> Lagre notat'}}),e.querySelectorAll(".note-btn-edit").forEach(s=>{s.addEventListener("click",()=>{const l=s.dataset.id,m=t.find(p=>p.id===l);m&&this._openNoteEditModal(m,async(p,u)=>{try{await firebase.firestore().collection("personal_notes").doc(l).update({title:p,text:u,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}),m.title=p,m.text=u,this._renderNotesUI(e,t,i)}catch(f){alert("Feil ved oppdatering: "+f.message)}})})}),e.querySelectorAll(".note-btn-delete").forEach(s=>{s.addEventListener("click",()=>{const l=s.dataset.id;confirm("Er du sikker på at du vil slette dette notatet?")&&firebase.firestore().collection("personal_notes").doc(l).delete().then(()=>{t=t.filter(m=>m.id!==l),this._renderNotesUI(e,t,i)}).catch(m=>alert("Feil: "+m.message))})})}_openNoteEditModal(e,t){const i=document.getElementById("note-edit-modal");i&&i.remove();const a=document.createElement("div");a.id="note-edit-modal",a.className="hkm-modal-overlay",a.innerHTML=`
        <div class="hkm-modal-container" style="max-width:640px; width:95vw">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
                <div class="hkm-modal-title" style="margin-bottom:0">Rediger notat</div>
                <button id="close-note-modal" style="background:none;border:none;cursor:pointer;padding:4px;">
                    <span class="material-symbols-outlined" style="font-size:20px;color:var(--text-muted);">close</span>
                </button>
            </div>
            <div class="form-group">
                <label>Tittel</label>
                <input id="edit-note-title" value="${(e.title||"").replace(/"/g,"&quot;")}" autocomplete="off">
            </div>
            <div class="form-group" style="margin-top:12px;">
                <label>Innhold</label>
                <div class="rte-wrapper">
                    <div class="rte-toolbar" id="rte-toolbar-edit">
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
                    <div class="rte-editor" id="edit-note-body" contenteditable="true"></div>
                </div>
            </div>
            <div class="hkm-modal-actions" style="margin-top:20px;">
                <button class="btn btn-ghost hkm-modal-btn" id="cancel-note-modal">Avbryt</button>
                <button class="btn btn-primary hkm-modal-btn" id="save-note-modal">
                    <span class="material-symbols-outlined">save</span> Lagre
                </button>
            </div>
        </div>`,document.body.appendChild(a),requestAnimationFrame(()=>a.classList.add("active"));const o=document.getElementById("edit-note-body");o&&(o.innerHTML=e.text||""),this._wireRteToolbar("rte-toolbar-edit","edit-note-body"),document.getElementById("edit-note-title").focus();const d=()=>{a.classList.remove("active"),setTimeout(()=>a.remove(),300)};document.getElementById("close-note-modal").addEventListener("click",d),document.getElementById("cancel-note-modal").addEventListener("click",d),a.addEventListener("click",c=>{c.target===a&&d()}),document.getElementById("save-note-modal").addEventListener("click",async()=>{var m,p;const c=document.getElementById("save-note-modal"),r=document.getElementById("edit-note-title").value.trim(),n=document.getElementById("edit-note-body"),s=((m=n==null?void 0:n.innerHTML)==null?void 0:m.trim())||"";if(!(((p=n==null?void 0:n.innerText)==null?void 0:p.trim())||"")){n==null||n.focus();return}c.disabled=!0,c.textContent="Lagrer...",await t(r||"Uten tittel",s),d()})}_wireRteToolbar(e,t){const i=document.getElementById(e),a=document.getElementById(t);!i||!a||(i.querySelectorAll(".rte-btn").forEach(o=>{o.addEventListener("mousedown",d=>{d.preventDefault();const c=o.dataset.cmd,r=o.dataset.val||null;document.execCommand(c,!1,r),a.focus(),this._updateRteActiveStates(i)})}),a.addEventListener("keyup",()=>this._updateRteActiveStates(i)),a.addEventListener("mouseup",()=>this._updateRteActiveStates(i)),a.addEventListener("focus",()=>i.classList.add("rte-focused")),a.addEventListener("blur",()=>i.classList.remove("rte-focused")))}_updateRteActiveStates(e){["bold","italic","underline","insertUnorderedList","insertOrderedList"].forEach(i=>{const a=e.querySelector(`[data-cmd="${i}"]`);a&&a.classList.toggle("active",document.queryCommandState(i))})}showDeleteConfirmModal(){const e=document.getElementById("confirm-delete-modal");e&&e.remove();const t=document.createElement("div");t.id="confirm-delete-modal",t.className="hkm-modal-overlay",t.innerHTML=`
        <div class="hkm-modal-container">
            <div class="hkm-modal-icon">
                <span class="material-symbols-outlined">warning</span>
            </div>
            <div class="hkm-modal-title">Slett konto?</div>
            <p class="hkm-modal-message">
                Dette vil permanent slette kontoen din og all tilknyttet data. 
                Handlingen kan ikke angres. Du vil bli bedt om å bekrefte identiteten din.
            </p>
            <div class="hkm-modal-actions">
                <button class="btn btn-ghost hkm-modal-btn" id="cancel-delete-btn">Avbryt</button>
                <button class="btn btn-danger hkm-modal-btn" id="confirm-delete-btn">Slett konto</button>
            </div>
        </div>`,document.body.appendChild(t),requestAnimationFrame(()=>t.classList.add("active")),t.querySelector("#cancel-delete-btn").addEventListener("click",()=>{t.classList.remove("active"),setTimeout(()=>t.remove(),300)}),t.querySelector("#confirm-delete-btn").addEventListener("click",async()=>{await this.performAccountDeletion(),t.remove()}),t.addEventListener("click",i=>{i.target===t&&(t.classList.remove("active"),setTimeout(()=>t.remove(),300))})}async performAccountDeletion(){const e=firebase.auth().currentUser;if(e)try{await firebase.firestore().collection("users").doc(e.uid).delete(),await e.delete(),window.location.href="../index.html"}catch(t){t.code==="auth/requires-recent-login"?(alert("Vennligst logg inn på nytt for å bekrefte sletting."),await firebase.auth().signOut(),window.location.href="login.html"):alert("Feil: "+t.message)}}}window.minSideManager=new $;
