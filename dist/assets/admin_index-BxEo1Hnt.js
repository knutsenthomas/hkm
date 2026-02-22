import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css                      */import"./error-logger-DVkGMsfx.js";import"./admin-header-61a71NKR.js";import"./firebase-config-BNsh33Gw.js";import"./user-roles-D0mdCVLS.js";class K{constructor(){this.app=null,this.db=null,this.auth=null,this.storage=null,this.isInitialized=!1;const e=localStorage.getItem("hkm_firebase_config");if(e)try{const t=JSON.parse(e);this.init(t);return}catch(t){console.error("Local config error:",t)}window.firebaseConfig&&window.firebaseConfig.apiKey!=="YOUR_API_KEY"&&this.init(window.firebaseConfig)}init(e){try{if(typeof firebase>"u"){console.error("❌ Firebase SDK not found. Make sure compat scripts are loaded.");return}firebase.apps.length?this.app=firebase.app():this.app=firebase.initializeApp(e),this.db=firebase.firestore(),this.auth=firebase.auth(),this.storage=firebase.storage(),this.isInitialized=!0,console.log("✅ Firebase initialized (Compat)"),this.db.enablePersistence({synchronizeTabs:!0}).catch(t=>{t.code==="failed-precondition"?console.warn("[FirebaseService] Persistence failed (multiple tabs open without sync)"):t.code==="unimplemented"&&console.warn("[FirebaseService] Persistence not supported by browser")})}catch(t){console.error("❌ Firebase initialization failed:",t)}}async getPageContent(e){if(!this.isInitialized)return null;try{const t=await this.db.collection("content").doc(e).get();return t.exists?t.data():null}catch(t){return console.error(`❌ Failed to load content for page '${e}':`,t),null}}async updatePageContent(e,t){if(!this.isInitialized)throw new Error("Firebase not initialized");await this.db.collection("content").doc(e).set(t,{merge:!0})}async savePageContent(e,t){return this.updatePageContent(e,t)}subscribeToPage(e,t){if(!this.isInitialized)return null;try{return this.db.collection("content").doc(e).onSnapshot(s=>{s.exists&&t(s.data())})}catch(s){return console.error(`❌ Failed to subscribe to page '${e}':`,s),null}}async login(e,t){if(!this.isInitialized)throw new Error("Firebase not initialized");return this.auth.signInWithEmailAndPassword(e,t)}async loginWithGoogle(){if(!this.isInitialized)throw new Error("Firebase not initialized");const e=new firebase.auth.GoogleAuthProvider;return this.auth.signInWithPopup(e)}async logout(){if(!this.isInitialized)throw new Error("Firebase not initialized");return this.auth.signOut()}async register(e,t){if(!this.isInitialized)throw new Error("Firebase not initialized");const s=await this.auth.createUserWithEmailAndPassword(e,t),i=s.user;return await this.db.collection("users").doc(i.uid).set({email:i.email,role:"medlem",createdAt:firebase.firestore.FieldValue.serverTimestamp()}),s}async subscribeNewsletter(e){if(!this.isInitialized)throw new Error("Firebase not initialized");return this.db.collection("newsletter_subscriptions").add({email:e,subscribedAt:firebase.firestore.FieldValue.serverTimestamp(),source:"website_footer"})}async connectToGoogle(){if(!this.isInitialized)throw new Error("Firebase not initialized");const e=new firebase.auth.GoogleAuthProvider;e.addScope("https://www.googleapis.com/auth/calendar.events");try{const t=await this.auth.signInWithPopup(e);return{user:t.user,accessToken:t.credential.accessToken}}catch(t){throw console.error("❌ Google Connection Failed:",t),t}}async getUserRole(e){if(!this.isInitialized)throw new Error("Firebase not initialized");const t=["thomas@hiskingdomministry.no"],s=this.auth&&this.auth.currentUser?this.auth.currentUser:null;if(s&&t.includes((s.email||"").toLowerCase()))return"superadmin";const i=await this.db.collection("users").doc(e).get();if(i.exists){const n=i.data().role;return typeof n=="string"&&n.trim()?n.trim().toLowerCase():"medlem"}return"medlem"}async sendEmailVerification(){if(!this.isInitialized)throw new Error("Firebase not initialized");const e=this.auth.currentUser;if(e)return e.sendEmailVerification();throw new Error("Ingen bruker er logget inn")}async updatePhoneNumber(e){if(!this.isInitialized)throw new Error("Firebase not initialized");const t=this.auth.currentUser;if(!t)throw new Error("Ingen bruker er logget inn");return this.db.collection("users").doc(t.uid).update({phone:e,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})}async uploadImage(e,t,s={}){if(!this.isInitialized)throw new Error("Firebase not initialized");const i=this.storage.ref(t),n=typeof s.timeoutMs=="number"?s.timeoutMs:45e3;return new Promise((o,a)=>{const r=i.put(e);let l=!1;const d=setTimeout(()=>{l=!0,r.cancel(),a(new Error("Upload timeout"))},n);r.on("state_changed",null,c=>{clearTimeout(d),l||a(c)},async()=>{clearTimeout(d);try{const c=await i.getDownloadURL();o(c)}catch(c){a(c)}})})}async requestNotificationPermission(){if(!this.isInitialized||typeof firebase.messaging!="function"||!firebase.messaging.isSupported())return console.warn("Firebase Messaging is not initialized or supported in this browser."),null;const e=firebase.messaging();try{if(await Notification.requestPermission()==="granted"){console.log("Notification permission granted.");const s=await e.getToken({vapidKey:"BI2k24dp-3eJWtLSPvGWQkD00A_duNRCIMY_2ozLFI0-anJDamFBALaTdtzGYQEkoFz8X0JxTcCX6tn3P_i0YrA"});if(s){console.log("FCM Token:",s);const i=this.auth.currentUser;return i&&(await this.db.collection("users").doc(i.uid).update({fcmTokens:firebase.firestore.FieldValue.arrayUnion(s)}),console.log("FCM token saved to user profile.")),s}else return console.log("No registration token available. Request permission to generate one."),null}else return console.log("Unable to get permission to notify."),null}catch(t){return console.error("An error occurred while requesting permission or getting token:",t),null}}onAuthChange(e){this.isInitialized&&this.auth.onAuthStateChanged(e)}}window.firebaseService=new K;window.onerror=function(U,e,t,s,i){return U&&U.toString().includes("ResizeObserver loop completed with undelivered notifications")||(console.error("Global Error Caught:",U,e,t,s,i),D("En uventet feil oppstod: "+U)),!1};window.onunhandledrejection=function(U){if((U.reason?U.reason.toString():"").includes("ResizeObserver loop completed with undelivered notifications"))return!1;console.error("Unhandled Promise Rejection:",U.reason),D("En asynkron feil oppstod: "+(U.reason?U.reason.message:"Ukjent feil"))};function D(U){const e=document.getElementById("global-error-container");if(e){const t=document.getElementById("global-error-message");t&&(t.textContent=U),e.style.display="flex"}else showToast(U)}const p=window.firebaseService;class R{constructor(){this.currentSection="overview",this.unreadMessageCount=0,this.messagesUnsub=null,this.currentUserDetailId=null,this.userEditMode=!1,this.widgetLibrary={visitors:{id:"visitors",label:"Sidevisninger",icon:"visibility",color:"purple",default:!0},status:{id:"status",label:"Systemstatus",icon:"check_circle",color:"green",default:!0},blog:{id:"blog",label:"Blogginnlegg",icon:"edit_note",color:"blue",default:!0},teaching:{id:"teaching",label:"Undervisning",icon:"school",color:"mint",default:!0},donations:{id:"donations",label:"Donasjoner",icon:"volunteer_activism",color:"donation",default:!0},youtube:{id:"youtube",label:"YouTube Abonnenter",icon:"video_library",color:"youtube",default:!0},podcast:{id:"podcast",label:"Podcast Episoder",icon:"podcasts",color:"podcast",default:!1},campaigns:{id:"campaigns",label:"Innsamlinger",icon:"campaign",color:"megaphone",default:!1},events:{id:"events",label:"Arrangementer",icon:"event",color:"blue",default:!1},"next-events":{id:"next-events",label:"Neste Arrangementer",icon:"event_upcoming",color:"purple",default:!1,type:"list"},"latest-contacts":{id:"latest-contacts",label:"Siste Meldinger",icon:"quick_reference_all",color:"mint",default:!1,type:"list"}};try{this.init()}catch(e){console.error("Critical: Failed to initialize AdminManager",e),D("Klarte ikke å starte admin-panelet: "+e.message)}}init(){if(console.log("Initializing AdminManager..."),!p)throw new Error("Firebase Service er ikke lastet!");if(window.hkm_notifications)this.toastContainer=window.hkm_notifications.toastContainer;else{console.log("Global notifications not found, initializing...");const e=document.querySelector(".toast-container");e?this.toastContainer=e:(this.toastContainer=document.createElement("div"),this.toastContainer.className="toast-container",document.body.appendChild(this.toastContainer))}this.initAuth(),this.initDashboard(),this.initMessageListener(),this.initWidgetConfig(),window.adminManager=this,console.log("AdminManager initialized successfully.")}removeSplashScreen(){document.body.classList.remove("cloak"),console.log("UI revealed (cloak removed)")}showToast(e,t="success",s=5e3){if(window.showToast)window.showToast(e,t,s);else{console.log("Fallback showToast:",e);const i=document.createElement("div");i.className=`toast ${t}`,i.innerHTML=`<div class="toast-content"><p class="toast-message">${e}</p></div>`,this.toastContainer.appendChild(i),setTimeout(()=>i.remove(),s)}}showAlert(e,t="warning",s=8e3){this.showToast(e,t,s)}clearPublicEventCache(){try{Object.keys(localStorage).forEach(e=>{e.startsWith("hkm_events_")&&(localStorage.removeItem(e),console.log(`[AdminManager] Cleared cache key: ${e}`))})}catch(e){console.warn("[AdminManager] Failed to clear public cache",e)}}async updateGoogleCalendarEvent(e,t="PATCH"){var a,r;if(!this.googleAccessToken){console.log("[AdminManager] Google Access Token missing. Skipping GCal sync.");return}if(!e.gcalId){console.log("[AdminManager] Item has no gcalId. Skipping GCal sync.");return}const i=(a=(await p.getPageContent("settings_integrations")||{}).googleCalendar)==null?void 0:a.calendarId;if(!i){this.showToast("Kalender-ID mangler i innstillinger. Kan ikke synkronisere.","error");return}const n=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(i)}/events/${e.gcalId}`;let o={method:t,headers:{Authorization:`Bearer ${this.googleAccessToken}`,"Content-Type":"application/json"}};if(t==="PATCH"){const l=typeof e.content=="object"&&e.content.blocks?this.blocksToHtml(e.content):e.description||e.content||"";o.body=JSON.stringify({summary:e.title,description:l})}try{const l=await fetch(n,o);if(!l.ok){const d=await l.json();if(l.status===404){console.warn("[AdminManager] GCal event not found. It might have been deleted manually.");return}throw new Error(((r=d.error)==null?void 0:r.message)||`API Status ${l.status}`)}console.log(`[AdminManager] GCal sync (${t}) successful.`),this.showToast(`✅ Google Calendar: ${t==="DELETE"?"Slettet":"Oppdatert"}`,"success",3e3)}catch(l){console.error("[AdminManager] Google Calendar sync failed:",l),l.message.includes("401")||l.message.includes("token")||l.message.includes("expired")?(this.googleAccessToken=null,this.showToast("Google-tilkoblingen er utløpt. Vennligst koble til på nytt.","error")):this.showToast("GCal Sync feilet: "+l.message,"error")}}blocksToHtml(e){return!e||!e.blocks?"":e.blocks.map(t=>{switch(t.type){case"header":return`<h${t.data.level}>${t.data.text}</h${t.data.level}>`;case"paragraph":return`<p>${t.data.text}</p>`;case"list":const s=t.data.style==="ordered"?"ol":"ul",i=t.data.items.map(n=>`<li>${n}</li>`).join("");return`<${s}>${i}</${s}>`;default:return t.data.text||""}}).join(`
`)}initAuth(){if(!p.isInitialized){console.warn("⚠️ Firebase not initialized. Auth check skipped for development.");return}p.onAuthChange(async e=>{if(!e){window.location.href="login.html";return}try{const t=await p.getUserRole(e.uid);if(this.userRole=t,t===window.HKM_ROLES.MEDLEM){console.warn("Access denied: User is a member, not an official/admin."),window.location.href="../minside/index.html";return}await this.syncProfileFromGoogleProvider(e),await this.updateUserInfo(e),this.applyRoleRestrictions(t)}catch(t){console.error("Error verifying admin role:",t),window.location.href="../minside/index.html"}})}applyRoleRestrictions(e){console.log(`Applying restrictions for role: ${e}`);const t=window.HKM_ROLES;if(e===t.EDITOR){const s=["settings","integrations","hero","design","seo","users"];document.querySelectorAll(".nav-item").forEach(i=>{var o;const n=(o=i.querySelector("a"))==null?void 0:o.getAttribute("data-section");s.includes(n)&&(i.style.display="none")})}t.SUPERADMIN}hasPermission(e){const t=window.HKM_PERMISSIONS||{},s=this.userRole||(window.HKM_ROLES?window.HKM_ROLES.MEDLEM:"medlem"),i=t[e];return Array.isArray(i)?i.includes(s):!1}async syncProfileFromGoogleProvider(e){if(!e)return;const t=(e.providerData||[]).find(s=>s.providerId==="google.com");if(t)try{const s={};!e.displayName&&t.displayName&&(s.displayName=t.displayName),!e.photoURL&&t.photoURL&&(s.photoURL=t.photoURL),Object.keys(s).length>0&&await e.updateProfile(s),await firebase.firestore().collection("users").doc(e.uid).set({displayName:e.displayName||t.displayName||e.email||"",photoURL:e.photoURL||t.photoURL||"",email:e.email||"",updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:!0})}catch(s){console.warn("Kunne ikke synkronisere Google-profil i admin:",s)}}async updateUserInfo(e){const t=document.getElementById("admin-name"),s=document.getElementById("admin-avatar");let i=null,n=null;try{i=await p.getPageContent("settings_profile")}catch{}try{const u=await firebase.firestore().collection("users").doc(e.uid).get();u.exists&&(n=u.data())}catch{}const o=n&&n.displayName||e.displayName||i&&i.fullName||e.email,a=n&&n.photoURL||e.photoURL||i&&i.photoUrl;if(t&&(t.textContent=o),s)if(a)s.innerHTML=`<img src="${a}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;else{const u=o.split(" ").map(m=>m[0]).join("").toUpperCase();s.textContent=u.substring(0,2)}const r=document.getElementById("admin-profile-trigger");r&&r.addEventListener("click",u=>{u.preventDefault(),window.adminManager&&typeof window.adminManager.onSectionSwitch=="function"&&(window.adminManager.onSectionSwitch("profile"),document.querySelectorAll(".nav-link[data-section]").forEach(g=>{g.classList.toggle("active",g.getAttribute("data-section")==="profile")}),document.querySelectorAll(".section-content").forEach(g=>{g.classList.remove("active"),g.id==="profile-section"&&g.classList.add("active")}))});const l=document.getElementById("profile-modal"),d=document.getElementById("close-profile-modal"),c=document.getElementById("admin-modal-profile-form");l&&d&&(d.onclick=()=>{l.style.display="none"},l.addEventListener("click",u=>{u.target===l&&(l.style.display="none")}),document.addEventListener("keydown",u=>{u.key==="Escape"&&l.style.display==="flex"&&(l.style.display="none")})),c&&!c.dataset.bound&&(c.dataset.bound="1",c.addEventListener("submit",async u=>{u.preventDefault(),await this.saveAdminProfileModal(e)}))}openAdminProfileModal(e,t){const s=document.getElementById("profile-modal");if(!s)return;const i=t.displayName||e.displayName||e.email||"Bruker";document.getElementById("modal-admin-name").textContent=i,document.getElementById("modal-admin-role").textContent="Administrator",document.getElementById("modal-admin-email").textContent=e.email||"";const n=document.getElementById("modal-admin-avatar");if(t.photoURL)n.innerHTML=`<img src="${t.photoURL}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;else{const o=i.split(" ").map(a=>a[0]).join("").toUpperCase();n.textContent=o.substring(0,2)}document.getElementById("admin-modal-display-name").value=i,document.getElementById("admin-modal-phone").value=t.phone||"",document.getElementById("admin-modal-address").value=t.address||"",document.getElementById("admin-modal-bio").value=t.bio||"",s.style.display="flex"}async saveAdminProfileModal(e){const t=document.getElementById("admin-modal-save-btn"),s=t?t.textContent:"";t&&(t.disabled=!0,t.textContent="Lagrer...");try{const i=(document.getElementById("admin-modal-display-name").value||"").trim(),n=(document.getElementById("admin-modal-phone").value||"").trim(),o=(document.getElementById("admin-modal-address").value||"").trim(),a=(document.getElementById("admin-modal-bio").value||"").trim();i&&i!==e.displayName&&await e.updateProfile({displayName:i}),await firebase.firestore().collection("users").doc(e.uid).set({displayName:i,phone:n,address:o,bio:a,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:!0}),await p.savePageContent("settings_profile",{fullName:i,phone:n,address:o,bio:a,updatedAt:new Date().toISOString()});const r=document.getElementById("profile-modal");r&&(r.style.display="none"),await this.updateUserInfo(e),this.showToast("Profil oppdatert.","success",4e3)}catch(i){console.error("Kunne ikke lagre admin-profil:",i),this.showToast("Kunne ikke lagre profil.","error",5e3)}finally{t&&(t.disabled=!1,t.textContent=s)}}initDashboard(){const e=document.getElementById("logout-btn");e&&e.addEventListener("click",async()=>{confirm("Logg ut?")&&(p.isInitialized&&await p.logout(),window.location.href="login.html")}),document.querySelectorAll(".top-nav-tab").forEach(s=>{s.addEventListener("click",()=>{const i=s.dataset.category;this.filterSidebar(i)})}),this.renderOverview(),console.log("Dashboard initialized."),this.initMessageNotifications(),this.initSearch(),this.filterSidebar("nettsted"),this.initTemplateEditorModal(),document.addEventListener("click",s=>{const i=s.target.closest(".chart-options-btn"),n=document.querySelector(".chart-dropdown");i?(s.stopPropagation(),n&&(n.style.display=n.style.display==="none"?"block":"none")):n&&n.style.display==="block"&&(n.style.display="none")}),document.addEventListener("click",s=>{const i=s.target.closest(".dropdown-item");if(i&&i.closest(".dropdown-container")){const n=i.dataset.view,o=i.closest(".chart-container"),a=o.querySelector(".card-title"),r=o.querySelectorAll(".bar"),l=[40,65,85,55,75,45,80,60],d=[60,40,50,90,30,70,45,85],c=[30,50,40,60,80,95,70,55],u=["08:00","","12:00","","16:00","","20:00",""],m=["Man","Tir","Ons","Tor","Fre","Lør","Søn","Tot"],v=["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug"];let g=l,w=u;n==="daily"?(a.textContent="Trafikkovervåking (Daglig)",g=l,w=u):n==="weekly"?(a.textContent="Trafikkovervåking (Ukentlig)",g=d,w=m):n==="monthly"&&(a.textContent="Trafikkovervåking (Månedlig)",g=c,w=v),r.forEach((h,b)=>{if(g[b]!==void 0){const f=g[b],L=w[b]||(n==="daily"?`${8+b*2}:00`:`Punkt ${b+1}`);h.style.height=f+"%";const $=Math.round(f*8.5);h.setAttribute("data-tooltip-info",`${L}: ${$} besøkende`),h.title="";let I=h.querySelector("span");I||(I=document.createElement("span"),h.appendChild(I)),I.textContent=w[b]||""}}),o.querySelectorAll(".dropdown-item").forEach(h=>{h.style.color="var(--text-muted)",h.classList.remove("active")}),i.style.color="var(--accent-color)",i.classList.add("active");const x=i.closest(".chart-dropdown");x&&(x.style.display="none")}}),document.addEventListener("mouseover",s=>{const i=s.target.closest(".bar")||s.target.closest("[data-tooltip]");if(i){let n=document.querySelector(".hkm-tooltip");n||(n=document.createElement("div"),n.className="hkm-tooltip",document.body.appendChild(n));const o=i.getAttribute("data-tooltip-info")||i.getAttribute("data-tooltip");o&&(n.textContent=o,n.style.display="block")}}),document.addEventListener("mousemove",s=>{const i=document.querySelector(".hkm-tooltip");if(i&&i.style.display==="block"){let o=s.clientX+10,a=s.clientY+15;const r=i.offsetWidth;o+r>window.innerWidth-15&&(o=s.clientX-r-10);const l=i.offsetHeight;a+l>window.innerHeight-15&&(a=s.clientY-l-10),i.style.left=o+"px",i.style.top=a+"px"}}),document.addEventListener("mouseout",s=>{if(s.target.closest(".bar")||s.target.closest("[data-tooltip]")){const n=document.querySelector(".hkm-tooltip");n&&(n.style.display="none")}})}filterSidebar(e){}async logout(){try{await p.signOut(),window.location.href="login.html"}catch(e){console.error("Error signing out:",e),this.showToast("Failed to log out. Please try again.","error",5e3)}}initMessageListener(){if(!p.isInitialized||!p.db)return;const e=document.getElementById("messages-bell");e&&e.addEventListener("click",()=>{window.adminManager&&typeof window.adminManager.onSectionSwitch=="function"&&window.adminManager.onSectionSwitch("messages"),document.querySelectorAll(".nav-link[data-section]").forEach(i=>{i.classList.toggle("active",i.getAttribute("data-section")==="messages")}),document.querySelectorAll(".section-content").forEach(i=>{i.classList.remove("active"),i.id==="messages-section"&&i.classList.add("active")})});try{this.messagesUnsub=p.db.collection("contactMessages").where("status","==","ny").onSnapshot(t=>{const s=t.size;this.unreadMessageCount=s,this.updateMessageBell(s)},t=>{console.error("Feil i meldings-lytter:",t)})}catch(t){console.error("Kunne ikke starte meldings-lytter:",t)}}updateMessageBell(e){const t=document.getElementById("messages-bell"),s=document.getElementById("messages-badge");!t||!s||(e>0?(t.classList.add("has-unread"),s.style.display="flex",s.textContent=e>9?"9+":String(e)):(t.classList.remove("has-unread"),s.style.display="none"))}onSectionSwitch(e){this.currentSection=e,console.log(`🚀 Switching to section: ${e}`);const t=document.getElementById(`${e}-section`);if(t&&t.getAttribute("data-rendered")!=="true")switch(e){case"content":this.renderContentEditor();break;case"blog":this.renderCollectionEditor("blog","Blogginnlegg");break;case"events":this.renderCollectionEditor("events","Arrangementer");break;case"messages":this.renderMessagesSection();break;case"media":this.renderMediaManager();break;case"causes":this.renderCausesManager();break;case"hero":this.renderHeroManager();break;case"teaching":this.renderTeachingManager();break;case"courses":this.renderCoursesManager();break;case"design":this.renderDesignSection();break;case"profile":this.renderProfileSection();break;case"seo":this.renderSEOSection();break;case"overview":this.renderOverview();break;case"settings":this.renderSettingsSection();break;case"integrations":this.renderIntegrationsSection();break;case"users":this.currentUserDetailId=null,this.userEditMode=!1,this.renderUsersSection();break;case"automation":this.renderAutomationSection();break;case"kommunikasjon":this.renderKommunikasjonSection();break}}async loadAllUsers(){if(!this.allUsersData)try{const e=await p.db.collection("users").orderBy("createdAt","desc").get(),t=[];e.forEach(s=>{t.push({id:s.id,...s.data()})}),this.allUsersData=t}catch(e){console.error("Error fetching users:",e)}}async renderKommunikasjonSection(){const e=document.getElementById("kommunikasjon-section");if(!e)return;e.setAttribute("data-rendered","true"),await this.loadAllUsers();const t=c=>{const u=document.getElementById(c);if(!u||!this.allUsersData)return;const m=this.allUsersData.map(v=>`
                <label class="user-checkbox-label">
                    <input type="checkbox" class="user-select-checkbox" value="${v.id}">
                    ${v.displayName||v.email}
                </label>
            `).join("");u.innerHTML=`<div class="user-list-scroll">${m}</div>`},s=document.getElementById("bulk-email-form"),i=document.getElementById("email-status"),n=document.getElementById("target-role"),o=document.getElementById("email-user-selection");n&&n.addEventListener("change",c=>{c.target.value==="selected"?(t("email-user-selection"),o&&(o.style.display="block")):o&&(o.style.display="none")}),s&&s.addEventListener("submit",async c=>{c.preventDefault();const u=s.querySelector('button[type="submit"]');u.disabled=!0,u.textContent="Sender...",i.textContent="Forbereder utsendelse...",i.className="status-message info";try{const m=firebase.auth().currentUser;if(!m)throw new Error("Du er ikke logget inn.");const v=await m.getIdToken(),g=n.value,w=document.getElementById("email-subject").value,x=document.getElementById("email-message").value;let h={targetRole:g,subject:w,message:x,fromName:"His Kingdom Ministry"};if(g==="selected"){const L=Array.from(o.querySelectorAll(".user-select-checkbox:checked")).map($=>$.value);if(L.length===0)throw new Error("Ingen brukere er valgt.");h.selectedUserIds=L}const b=await fetch("https://us-central1-his-kingdom-ministry.cloudfunctions.net/sendBulkEmail",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${v}`},body:JSON.stringify(h)}),f=await b.json();if(!b.ok)throw new Error(f.error||`Server responded with ${b.status}`);i.textContent=f.message||"E-poster er sendt!",i.className="status-message success",s.reset(),o.style.display="none"}catch(m){console.error("Feil ved masseutsendelse:",m),i.textContent=`Feil: ${m.message}`,i.className="status-message error"}finally{u.disabled=!1,u.textContent="Send E-poster"}});const a=document.getElementById("push-notification-form"),r=document.getElementById("push-status"),l=document.getElementById("push-target-role"),d=document.getElementById("push-user-selection");l&&l.addEventListener("change",c=>{c.target.value==="selected"?(t("push-user-selection"),d&&(d.style.display="block")):d&&(d.style.display="none")}),a&&a.addEventListener("submit",async c=>{var m;c.preventDefault();const u=a.querySelector('button[type="submit"]');u.disabled=!0,u.textContent="Sender...",r.textContent="Forbereder utsendelse...",r.className="status-message info";try{const v=firebase.auth().currentUser;if(!v)throw new Error("Du er ikke logget inn.");const g=await v.getIdToken(),w=l.value,x=document.getElementById("push-title").value,h=document.getElementById("push-body").value,b=document.getElementById("push-click-action").value;let f={targetRole:w,title:x,body:h,click_action:b};if(w==="selected"){const L=Array.from(d.querySelectorAll(".user-select-checkbox:checked")).map($=>$.value);if(L.length===0)throw new Error("Ingen brukere er valgt.");f.selectedUserIds=L}try{let L=[];(await p.db.collection("users").get()).forEach(M=>{var k;const y=M.data();(w==="all"||w==="medlem"&&y.role==="medlem"||w==="selected"&&((k=f.selectedUserIds)!=null&&k.includes(M.id)))&&L.push(M.id)});const I=p.db.batch();L.forEach(M=>{const y=p.db.collection("user_notifications").doc();I.set(y,{userId:M,title:f.title,body:f.body,type:"push",link:f.click_action||"",read:!1,createdAt:firebase.firestore.FieldValue.serverTimestamp()})}),await I.commit(),r.textContent=`Varsling lagret for ${L.length} bruker(e). Sender push...`}catch(L){console.warn("Firestore notification write failed:",L)}try{const L=await fetch("https://us-central1-his-kingdom-ministry.cloudfunctions.net/sendPushNotification",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${g}`},body:JSON.stringify(f)}),$=await L.json();if(!L.ok)throw new Error($.error||`Server responded with ${L.status}`);r.textContent=$.message||"Push-varsling er sendt!"}catch(L){console.warn("FCM push failed (in-app notification was still saved):",L),r.textContent="Varsling lagret i appen. (Push til telefon krevde innstillinger.)"}r.className="status-message success";try{await p.db.collection("push_log").add({title:f.title,body:f.body,targetRole:w,sentBy:((m=firebase.auth().currentUser)==null?void 0:m.email)||"ukjent",sentAt:firebase.firestore.FieldValue.serverTimestamp()})}catch(L){console.warn("Push log write failed:",L)}a.reset(),d&&(d.style.display="none"),this.loadActivityLog("all")}catch(v){console.error("Feil ved utsendelse av push-varsling:",v),r.textContent=`Feil: ${v.message}`,r.className="status-message error"}finally{u.disabled=!1,u.textContent="Send Push-varsling"}}),this.loadActivityLog("all"),document.querySelectorAll(".log-filter-btn").forEach(c=>{c.addEventListener("click",()=>{document.querySelectorAll(".log-filter-btn").forEach(u=>u.classList.remove("active")),c.classList.add("active"),this.loadActivityLog(c.dataset.filter)})})}async loadActivityLog(e="all"){const t=document.getElementById("activity-log-list");if(t){t.innerHTML='<div class="loader" style="padding:24px;">Laster...</div>';try{const s=p.db,i=[];if((e==="all"||e==="push")&&(await s.collection("push_log").orderBy("sentAt","desc").limit(30).get()).forEach(a=>{var l;const r=a.data();i.push({type:"push",icon:"campaign",color:"#3b82f6",bg:"#eff6ff",title:r.title||"Push-varsling",meta:`${r.body||""} · Til: ${r.targetRole==="all"?"Alle":r.targetRole} · Sendt av ${r.sentBy||"?"}`,date:(l=r.sentAt)!=null&&l.toDate?r.sentAt.toDate():new Date(0)})}),(e==="all"||e==="message")&&(await s.collection("contactMessages").orderBy("createdAt","desc").limit(20).get()).forEach(a=>{var l,d;const r=a.data();i.push({type:"message",icon:"mail",color:"#10b981",bg:"#f0fdf4",title:`Melding fra ${r.name||"ukjent"}`,meta:`${r.subject||r.email||""} · Status: ${r.status||"ny"}`,date:(l=r.createdAt)!=null&&l.toDate?r.createdAt.toDate():(d=r.timestamp)!=null&&d.toDate?r.timestamp.toDate():new Date(0)})}),(e==="all"||e==="new_user")&&(await s.collection("admin_notifications").where("type","==","NEW_USER_REGISTRATION").orderBy("timestamp","desc").limit(20).get()).forEach(a=>{var l;const r=a.data();i.push({type:"new_user",icon:"person_add",color:"#f59e0b",bg:"#fffbeb",title:`Ny bruker: ${r.userName||r.userEmail||"ukjent"}`,meta:r.userEmail||"",date:(l=r.timestamp)!=null&&l.toDate?r.timestamp.toDate():new Date(0)})}),i.sort((o,a)=>a.date-o.date),i.length===0){t.innerHTML=`
                    <div style="padding:40px; text-align:center; color:#94a3b8;">
                        <span class="material-symbols-outlined" style="font-size:40px; display:block; margin-bottom:8px;">history</span>
                        Ingen aktiviteter funnet.
                    </div>`;return}const n=o=>{const a=Math.floor((Date.now()-o)/1e3);return a<60?"Akkurat nå":a<3600?`${Math.floor(a/60)} min siden`:a<86400?`${Math.floor(a/3600)} t siden`:a<604800?`${Math.floor(a/86400)} d siden`:o.toLocaleDateString("no-NO",{day:"numeric",month:"short",year:"numeric"})};t.innerHTML=i.map(o=>`
                <div style="display:flex; align-items:flex-start; gap:14px; padding:14px 0;
                    border-bottom:1px solid var(--border-color);">
                    <div style="width:38px; height:38px; border-radius:50%; background:${o.bg};
                        display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-symbols-outlined" style="font-size:18px; color:${o.color};">${o.icon}</span>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; font-size:0.9rem; margin-bottom:2px;">${o.title}</div>
                        <div style="font-size:0.82rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${o.meta}</div>
                    </div>
                    <div style="font-size:0.75rem; color:#94a3b8; flex-shrink:0; text-align:right;">${n(o.date)}</div>
                </div>
            `).join("")}catch(s){console.error("Activity log error:",s),t.innerHTML='<div style="padding:20px; color:#94a3b8; text-align:center;">Kunne ikke laste aktivitetslogg.</div>'}}}initMessageNotifications(){if(!p.isInitialized||!p.db)return;const e=document.getElementById("notification-icon"),t=document.getElementById("notification-dot");if(!(!e||!t))try{this.unsubscribeMessagesListener=p.db.collection("contactMessages").where("status","==","ny").onSnapshot(s=>{const i=s.size;i>0?(t.style.display="block",e.classList.add("has-unread"),t.textContent=i>9?"9+":String(i)):(t.style.display="none",e.classList.remove("has-unread"),t.textContent="")},s=>{console.error("Feil ved melding-notifikasjoner:",s)})}catch(s){console.error("Kunne ikke starte melding-notifikasjoner:",s)}}initWidgetConfig(){const e=document.getElementById("configure-widgets-btn"),t=document.getElementById("widget-config-modal"),s=document.getElementById("close-widget-config"),i=document.getElementById("save-widgets-btn"),n=document.getElementById("widget-list-container");if(!e||!t||!n)return;e.addEventListener("click",()=>{n.innerHTML="";const a=JSON.parse(localStorage.getItem("hkm_dashboard_widgets"))||Object.keys(this.widgetLibrary).filter(r=>this.widgetLibrary[r].default);Object.values(this.widgetLibrary).forEach(r=>{const l=a.includes(r.id),d=document.createElement("label");d.className="widget-config-item"+(l?" active":""),d.innerHTML=`
                    <input type="checkbox" value="${r.id}" ${l?"checked":""}>
                    <span class="material-symbols-outlined">${r.icon}</span>
                    <span style="font-size: 14px; font-weight: 600; flex: 1;">${r.label}</span>
                `;const c=d.querySelector("input");c.addEventListener("change",()=>{d.classList.toggle("active",c.checked)}),n.appendChild(d)}),t.style.display="flex"});const o=()=>t.style.display="none";s.addEventListener("click",o),window.addEventListener("click",a=>{a.target===t&&o()}),i.addEventListener("click",()=>{const a=Array.from(n.querySelectorAll("input:checked")).map(r=>r.value);localStorage.setItem("hkm_dashboard_widgets",JSON.stringify(a)),o(),showToast("Oversikt oppdatert!","success"),this.renderOverview()})}initSearch(){const e=document.getElementById("global-search-opener"),t=document.getElementById("search-modal"),s=document.getElementById("close-search-modal"),i=document.getElementById("global-modal-search-input");if(!e||!t||!i)return;e.addEventListener("click",()=>{t.style.display="flex",setTimeout(()=>i.focus(),100)});const n=()=>{t.style.display="none"};s&&s.addEventListener("click",n),t.addEventListener("click",o=>{o.target===t&&n()}),document.addEventListener("keydown",o=>{o.key==="Escape"&&t.style.display==="flex"&&n()}),i.addEventListener("keydown",o=>{if(o.key==="Enter"){o.preventDefault();const a=i.value.trim();a&&(n(),this.performSearch(a))}})}async performSearch(e){const t=(e||"").trim();if(!t)return;const s=document.getElementById("search-section");if(!s)return;document.querySelectorAll(".section-content").forEach(d=>d.classList.remove("active")),s.classList.add("active"),s.innerHTML=`
            <div class="section-header">
                <h2 class="section-title">Søk</h2>
                <p class="section-subtitle">Resultater for "${this.escapeHtml(t)}"</p>
            </div>
            <div class="card">
                <div class="card-body" id="search-results">
                    <p style="font-size:14px; color:#64748b;">Søker i dashboard-innhold...</p>
                </div>
            </div>
        `,s.setAttribute("data-rendered","true");const n=document.getElementById("search-results");if(!n)return;if(!p.isInitialized){n.innerHTML='<p style="color:#ef4444; font-size:14px;">Firebase er ikke konfigurert, kan ikke søke i innhold.</p>';return}const o=[],a=t.toLowerCase();try{const d=[{id:"index",label:"Forside"},{id:"om-oss",label:"Om oss"},{id:"media",label:"Media"},{id:"arrangementer",label:"Arrangementer"},{id:"blogg",label:"Blogg"},{id:"kontakt",label:"Kontakt"},{id:"donasjoner",label:"Donasjoner"},{id:"undervisning",label:"Undervisning"},{id:"reisevirksomhet",label:"Reisevirksomhet"},{id:"bibelstudier",label:"Bibelstudier"},{id:"seminarer",label:"Seminarer"},{id:"podcast",label:"Podcast"}];for(const u of d){const m=await p.getPageContent(u.id);if(!m)continue;const g=this.collectTextEntries(m).find(w=>w.text&&w.text.toLowerCase().includes(a));g&&o.push({type:"Sideinnhold",title:u.label,meta:g.path,snippet:this.makeSnippet(g.text,t)})}const c=[{id:"blog",docId:"collection_blog",label:"Blogginnlegg"},{id:"events",docId:"collection_events",label:"Arrangementer"},{id:"teaching",docId:"collection_teaching",label:"Undervisning"}];for(const u of c){const m=await p.getPageContent(u.docId);(Array.isArray(m)?m:m&&Array.isArray(m.items)?m.items:[]).forEach(g=>{var x,h,b;[g.title,g.content,g.category,g.author,g.seoTitle,g.seoDescription,(x=g.hero)==null?void 0:x.title,(h=g.hero)==null?void 0:h.subtitle,(b=g.hero)==null?void 0:b.bg].filter(Boolean).join(" ").toLowerCase().includes(a)&&o.push({type:u.label,title:g.title||"(uten tittel)",meta:g.date||g.category||"",snippet:this.makeSnippet(g.content||g.seoDescription||"",t)})})}p.db&&(await p.db.collection("contactMessages").orderBy("createdAt","desc").limit(100).get()).forEach(m=>{const v=m.data()||{};[v.name,v.email,v.phone,v.subject,v.message].filter(Boolean).join(" ").toLowerCase().includes(a)&&o.push({type:"Melding",title:v.subject||"(ingen emne)",meta:v.name||v.email||"",snippet:this.makeSnippet(v.message||"",t)})})}catch(d){console.error("Feil ved søk:",d),n.innerHTML='<p style="color:#ef4444; font-size:14px;">Det oppstod en feil under søk. Prøv igjen.</p>';return}if(!o.length){n.innerHTML='<p style="font-size:14px; color:#64748b;">Ingen treff for dette søket.</p>';return}const r=d=>{const c=d.toLowerCase();return c.includes("blog")?"edit_note":c.includes("arr")?"event":c.includes("und")?"school":c.includes("media")||c.includes("video")?"play_circle":c.includes("user")||c.includes("bruk")?"person":c.includes("side")||c.includes("content")?"description":"article"},l=`
            <div class="search-results-gallery">
                ${o.map(d=>`
                    <div class="search-result" onclick="window.location.hash = '${d.type==="Blogg"?"blog":d.type==="Undervisning"?"teaching":d.type==="Arrangementer"?"events":""}';">
                        <div class="search-result-header">
                            <span class="search-result-type-tag">${this.escapeHtml(d.type)}</span>
                            ${d.meta?`<span class="search-result-meta">${this.escapeHtml(d.meta)}</span>`:""}
                        </div>
                        <div class="search-result-body">
                            <div class="search-result-icon">
                                <span class="material-symbols-outlined">${r(d.type)}</span>
                            </div>
                            <div class="search-result-info">
                                <div class="search-result-title">${this.escapeHtml(d.title)}</div>
                                ${d.snippet?`<div class="search-result-snippet">${this.escapeHtml(d.snippet)}</div>`:""}
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;n.innerHTML=l}collectTextEntries(e,t=""){const s=[];return!e||typeof e!="object"||Object.keys(e).forEach(i=>{const n=e[i],o=t?`${t}.${i}`:i;typeof n=="string"?s.push({text:n,path:o}):n&&typeof n=="object"&&s.push(...this.collectTextEntries(n,o))}),s}makeSnippet(e,t){if(!e)return"";const s=String(e).replace(/\s+/g," ").trim();if(s.length<=160)return s;const i=s.toLowerCase(),n=t.toLowerCase(),o=i.indexOf(n);if(o===-1)return s.substring(0,157)+"...";const a=Math.max(0,o-40),r=Math.min(s.length,o+n.length+60),l=a>0?"...":"",d=r<s.length?"...":"";return l+s.substring(a,r)+d}escapeHtml(e){return e==null?"":String(e).replace(/[&<>"']/g,t=>{switch(t){case"&":return"&amp;";case"<":return"&lt;";case">":return"&gt;";case'"':return"&quot;";case"'":return"&#39;";default:return t}})}async renderOverview(){const e=document.getElementById("overview-section");if(!e)return;e.setAttribute("data-rendered","true");let t=0,s=0,i=0,n=0,o=0,a=0,r={},l={subscribers:"N/A",videos:"N/A",views:"0"},d="...",c=[],u=[];try{const[I,M,y,k,E,S,C]=await Promise.all([p.getPageContent("collection_blog"),p.getPageContent("collection_teaching"),p.getPageContent("collection_events"),p.getPageContent("collection_causes"),p.getPageContent("index"),this.fetchYouTubeStats(),this.fetchPodcastStats()]);t=(Array.isArray(I)?I:(I==null?void 0:I.items)||[]).length,s=(Array.isArray(M)?M:(M==null?void 0:M.items)||[]).length;const j=Array.isArray(y)?y:(y==null?void 0:y.items)||[];i=j.length,c=j,n=(Array.isArray(k)?k:(k==null?void 0:k.items)||[]).length,r=(E==null?void 0:E.stats)||{},S&&(l=S),C&&(d=C),p.db&&((await p.db.collection("donations").get()).forEach(A=>{const z=A.data();o++,z.amount&&(a+=z.amount/100)}),(await p.db.collection("contactMessages").orderBy("timestamp","desc").limit(4).get()).forEach(A=>u.push({id:A.id,...A.data()})))}catch(I){console.warn("Feil ved henting av statistikk:",I)}const v=JSON.parse(localStorage.getItem("hkm_dashboard_widgets"))||Object.keys(this.widgetLibrary).filter(I=>this.widgetLibrary[I].default),g=JSON.parse(localStorage.getItem("hkm_dashboard_widget_spans"))||{};let w="";v.forEach(I=>{const M=this.widgetLibrary[I];if(!M)return;const y=JSON.parse(localStorage.getItem("hkm_dashboard_widget_spans_v"))||{};let k=g[I];k===void 0&&(k=M.type==="list"?2:1);const E=y[I]||1;let S="0",C="";switch(I){case"visitors":{const T=localStorage.getItem("hkm_stat_visits"),A=r.website_visits;A?(localStorage.setItem("hkm_stat_visits",A),S=A.toLocaleString("no-NO")):T?S=parseInt(T).toLocaleString("no-NO"):S="—",C="";break}case"status":S='<span class="text-green" style="font-size: 24px;">Normal</span>',C='<span class="stat-meta">Alle systemer operative</span>';break;case"blog":S=t;break;case"teaching":S=s;break;case"donations":S=o,C=`<span class="stat-meta">Totalt: ${a} kr</span>`;break;case"youtube":S=parseInt(l.views||0).toLocaleString("no-NO"),C=`<span class="stat-meta">${l.subscribers} abonnenter</span>`;break;case"podcast":S=d,C='<span class="stat-meta">Episoder totalt</span>';break;case"campaigns":S=n;break;case"events":S=i;break;case"next-events":const j=new Date,_=c.filter(T=>T.date&&new Date(T.date)>=j).sort((T,A)=>new Date(T.date)-new Date(A.date)).slice(0,3);S=_.length>0?"":"Ingen kommende",C=`<ul class="stat-list">
                        ${_.map(T=>`
                            <li class="stat-list-item">
                                <span class="item-main">${T.title}</span>
                                <span class="item-meta">${new Date(T.date).toLocaleDateString("no-NO",{day:"2-digit",month:"short"})}</span>
                            </li>
                        `).join("")}
                    </ul>`;break;case"latest-contacts":S=u.length>0?"":"Ingen meldinger",C=`<ul class="stat-list">
                        ${u.map(T=>`
                            <li class="stat-list-item">
                                <span class="item-main">${T.name||"Ukjent"}</span>
                                <span class="item-meta">${T.status==="ny"?'<span class="dot" style="background:#22c55e; width:6px; height:6px; margin-right:4px;"></span>':""}${T.subject||"Ingen emne"}</span>
                            </li>
                        `).join("")}
                    </ul>`;break}w+=`
                <div class="stat-card modern" data-id="${M.id}" data-span="${k}" data-span-v="${E}">
                    <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                    <div class="resize-handle corner-resize" data-tooltip="Dra for å endre størrelse">
                        <span class="material-symbols-outlined">filter_list</span>
                    </div>
                    <div class="stat-icon-wrap ${M.color}">
                        <span class="material-symbols-outlined">${M.icon}</span>
                    </div>
                    <div class="stat-content">
                        <h3 class="stat-label">${M.label}</h3>
                        <p class="stat-value">${S}</p>
                        ${C}
                    </div>
                </div>
            `}),e.innerHTML=`
            <div class="section-header-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
                <h2 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin: 0;">Analyseoversikt</h2>
                <div style="display: flex; gap: 8px;">
                    <button id="toggle-edit-mode" class="btn btn-accent btn-icon" data-tooltip="Endre rekkefølge og størrelse">
                        <span class="material-symbols-outlined" style="font-size: 20px;">open_with</span>
                    </button>
                    <button id="configure-widgets-btn" class="btn btn-accent btn-icon" data-tooltip="Tilpass oversikt">
                        <span class="material-symbols-outlined" style="font-size: 20px;">settings_suggest</span>
                    </button>
                </div>
            </div>
            <div class="stats-grid" id="dashboard-stats-grid">
                ${w}
                ${v.length===0?'<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-style: italic;">Ingen analysebokser valgt. Klikk på "Tilpass oversikt" for å legge til.</p>':""}
            </div>
`;const x=JSON.parse(localStorage.getItem("hkm_dashboard_main_order"))||["chart","top-pages"],h={chart:`
                <div class="chart-container card" data-id="chart" style="position: relative;">
                    <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                    <div class="card-header-simple">
                        <div>
                            <h3 class="card-title">Trafikkovervåking (Google Analytics)</h3>
                            <div class="live-indicator">
                                <span class="dot"></span>
                                Sanntid: 24 aktive akkurat nå
                            </div>
                        </div>
                        <div class="dropdown-container" style="position: relative;">
                            <button class="chart-options-btn" style="background:none; border:none; cursor:pointer; color:var(--text-muted); padding:4px; display:flex; align-items:center;">
                                <span class="material-symbols-outlined">more_vert</span>
                            </button>
                            <div class="chart-dropdown dropdown-menu" style="display:none; position:absolute; top:100%; right:0; background:white; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.1); border:1px solid #f1f5f9; width:180px; z-index:100; padding:8px; overflow:hidden;">
                                <button class="dropdown-item" data-view="daily" style="width:100%; text-align:left; padding:10px 12px; border:none; background:none; border-radius:8px; font-size:13px; font-weight:600; color:var(--text-main); cursor:pointer; display:flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:18px;">calendar_view_day</span> Daglig visning
                                </button>
                                <button class="dropdown-item" data-view="weekly" style="width:100%; text-align:left; padding:10px 12px; border:none; background:none; border-radius:8px; font-size:13px; font-weight:600; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:18px;">calendar_view_week</span> Ukentlig oversikt
                                </button>
                                <button class="dropdown-item" data-view="monthly" style="width:100%; text-align:left; padding:10px 12px; border:none; background:none; border-radius:8px; font-size:13px; font-weight:600; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:18px;">calendar_month</span> Månedlig analyse
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="chart-placeholder">
                        <div class="bar-chart">
                            <div class="bar" style="height: 40%;" data-tooltip-info="08:00: 340 besøkende"><span>08:00</span></div>
                            <div class="bar" style="height: 65%;" data-tooltip-info="10:00: 552 besøkende"></div>
                            <div class="bar" style="height: 85%;" data-tooltip-info="12:00: 722 besøkende"><span>12:00</span></div>
                            <div class="bar" style="height: 55%;" data-tooltip-info="14:00: 467 besøkende"></div>
                            <div class="bar" style="height: 75%;" data-tooltip-info="16:00: 637 besøkende"><span>16:00</span></div>
                            <div class="bar" style="height: 45%;" data-tooltip-info="18:00: 382 besøkende"></div>
                            <div class="bar" style="height: 80%;" data-tooltip-info="20:00: 680 besøkende"><span>20:00</span></div>
                            <div class="bar" style="height: 60%;" data-tooltip-info="22:00: 510 besøkende"></div>
                        </div>
                    </div>
                </div>`,"top-pages":`
                <div class="top-pages-widget card" data-id="top-pages" style="position: relative;">
                    <span class="material-symbols-outlined drag-handle">drag_indicator</span>
                    <h3 class="card-title">Topp Sider</h3>
                    <ul class="page-rank-list">
                        <li>
                            <div class="page-info">
                                <span class="page-url">/index.html</span>
                                <span class="page-count">4,230</span>
                            </div>
                            <div class="progress-bar-wrap">
                                <div class="progress-bar" style="width: 85%;"></div>
                            </div>
                        </li>
                        <li>
                            <div class="page-info">
                                <span class="page-url">/blogg.html</span>
                                <span class="page-count">2,150</span>
                            </div>
                            <div class="progress-bar-wrap">
                                <div class="progress-bar" style="width: 45%;"></div>
                            </div>
                        </li>
                        <li>
                            <div class="page-info">
                                <span class="page-url">/media.html</span>
                                <span class="page-count">1,890</span>
                            </div>
                            <div class="progress-bar-wrap">
                                <div class="progress-bar" style="width: 35%;"></div>
                            </div>
                        </li>
                    </ul>
                </div>`},b=x.map(I=>h[I]).join("");e.innerHTML+=`
            <div class="dashboard-main-grid" id="dashboard-main-grid">
                ${b}
            </div>
        `,this.initWidgetConfig(),this.initSortableWidgets(),this.initSortableMainGrid(),this.initWidgetResizers();const f=document.getElementById("toggle-edit-mode"),L=document.getElementById("dashboard-stats-grid"),$=document.getElementById("dashboard-main-grid");f&&L&&$&&f.addEventListener("click",()=>{const I=L.classList.toggle("edit-mode");$.classList.toggle("edit-mode",I),I?(f.innerHTML='<span class="material-symbols-outlined" style="font-size: 20px;">check</span>',showToast("Dra boksene for å flytte, eller bruk hjørnet for å endre størrelse","info")):f.innerHTML='<span class="material-symbols-outlined" style="font-size: 20px;">open_with</span>'}),this.checkSystemHealth(),setTimeout(()=>this.removeSplashScreen(),300)}initSortableWidgets(){const e=document.getElementById("dashboard-stats-grid");!e||typeof Sortable>"u"||Sortable.create(e,{animation:150,handle:".drag-handle",ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",onEnd:()=>{const t=Array.from(e.querySelectorAll(".stat-card.modern")).map(s=>s.dataset.id);localStorage.setItem("hkm_dashboard_widgets",JSON.stringify(t)),showToast("Rekkefølge lagret!","success")}})}initSortableMainGrid(){const e=document.getElementById("dashboard-main-grid");!e||typeof Sortable>"u"||Sortable.create(e,{animation:150,handle:".drag-handle",ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",onEnd:()=>{const t=Array.from(e.children).map(s=>s.dataset.id);localStorage.setItem("hkm_dashboard_main_order",JSON.stringify(t)),showToast("Layout lagret!","success")}})}initWidgetResizers(){let e=null,t,s,i,n,o,a,r;const l=m=>{const v=m.target.closest(".corner-resize");if(!v)return;m.preventDefault(),m.stopPropagation(),e=v.closest(".stat-card.modern");const g=e.parentElement;o=g.getBoundingClientRect(),a=(o.width+24)/4;const x=g.querySelector('.stat-card.modern[data-span-v="1"]')||e;r=x.offsetHeight/parseInt(x.dataset.spanV||1),t=m.clientX,s=m.clientY,i=parseInt(e.dataset.span||1),n=parseInt(e.dataset.spanV||1),e.classList.add("resizing"),document.addEventListener("mousemove",d),document.addEventListener("mouseup",c)},d=m=>{if(!e)return;const v=m.clientX-t,g=m.clientY-s,w=Math.round(v/a),x=Math.round(g/(r+24));let h=Math.max(1,Math.min(4,i+w)),b=Math.max(1,Math.min(3,n+x));(h.toString()!==e.dataset.span||b.toString()!==e.dataset.spanV)&&(e.dataset.span=h,e.dataset.spanV=b)},c=()=>{if(!e)return;e.classList.remove("resizing");const m=e.dataset.id,v=JSON.parse(localStorage.getItem("hkm_dashboard_widget_spans"))||{},g=JSON.parse(localStorage.getItem("hkm_dashboard_widget_spans_v"))||{};v[m]=parseInt(e.dataset.span),g[m]=parseInt(e.dataset.spanV),localStorage.setItem("hkm_dashboard_widget_spans",JSON.stringify(v)),localStorage.setItem("hkm_dashboard_widget_spans_v",JSON.stringify(g)),document.removeEventListener("mousemove",d),document.removeEventListener("mouseup",c),e=null},u=document.getElementById("dashboard-stats-grid");u&&u.addEventListener("mousedown",l)}async renderContentEditor(){const e=document.getElementById("content-editor-section");e&&(e.setAttribute("data-rendered","true"),e.innerHTML=`
            <div class="section-header">
                <h2 class="section-title">Innholdsredigering</h2>
                <p class="section-subtitle">Administrer og rediger blogginnlegg, undervisningsserier og mer.</p>
            </div>

            <div class="grid-2-cols">
                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Blogginnlegg</h3>
                        <button class="btn-primary btn-sm" id="new-blog-post">Nytt innlegg</button>
                    </div>
                    <div class="card-body">
                        <ul class="content-list" id="blog-posts-list">
                            <li class="loading-item">Laster blogginnlegg...</li>
                        </ul>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Undervisningsserier</h3>
                        <button class="btn-primary btn-sm" id="new-teaching-series">Ny serie</button>
                    </div>
                    <div class="card-body">
                        <ul class="content-list" id="teaching-series-list">
                            <li class="loading-item">Laster undervisningsserier...</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="card mt-4">
                <div class="card-header">
                    <h3 class="card-title">Sider</h3>
                </div>
                <div class="card-body">
                    <ul class="content-list" id="pages-list">
                        <li class="loading-item">Laster sider...</li>
                    </ul>
                </div>
            </div>
`,this.loadContentList("collection_blog","blog-posts-list","blog"),this.loadContentList("collection_teaching","teaching-series-list","teaching"),this.loadContentList("collection_pages","pages-list","page"),document.getElementById("new-blog-post").addEventListener("click",()=>this.openContentModal("blog")),document.getElementById("new-teaching-series").addEventListener("click",()=>this.openContentModal("teaching")))}async checkSystemHealth(){if(p.db)try{const t=(await p.db.collection("system_logs").where("severity","==","CRITICAL").where("read","==",!1).get()).size,s=document.getElementById("system-health-card"),i=document.getElementById("system-health-icon"),n=document.getElementById("system-health-status"),o=document.getElementById("system-health-text");s&&t>0&&(i.className="stat-icon red",i.innerHTML='<span class="material-symbols-outlined">warning</span>',n.textContent="Kritisk",n.style.color="#ef4444",o.textContent=`${t} ulest(e) kritisk feil`,s.style.border="1px solid #ef4444",s.style.cursor="pointer",s.onclick=()=>showToast(`Det er ${t} kritiske feil i loggen.Sjekk Firestore 'system_logs' eller e - postvarsler.`))}catch(e){console.error("Failed to check system health:",e)}}async fetchYouTubeStats(){const n=`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=UCFbX-Mf7NqDm2a07hk6hveg&key=${"AIzaSy"+"ClPHHywl7Vr0naj2JnK_t-lY-V86gmKys"}`;try{const a=await(await fetch(n)).json();if(a.items&&a.items.length>0){const r=a.items[0].statistics;return{subscribers:r.subscriberCount,videos:r.videoCount,views:r.viewCount}}}catch(o){throw console.error("Error fetching YouTube stats:",o),o}return null}async fetchPodcastStats(){var t,s;const e="https://getpodcast-42bhgdjkcq-uc.a.run.app";try{const n=await(await fetch(e)).json(),o=Array.isArray((t=n.rss)==null?void 0:t.channel)?n.rss.channel[0]:(s=n.rss)==null?void 0:s.channel,a=o==null?void 0:o.item;if(a)return Array.isArray(a)?a.length:1}catch(i){throw console.error("Error fetching Podcast stats:",i),i}return null}async renderMediaManager(){const e=document.getElementById("media-section");e&&(e.innerHTML=`
            <div class="section-header">
                <h2 class="section-title">Media-integrasjoner</h2>
                <p class="section-subtitle">Koble til YouTube og Podcast-strømmer.</p>
            </div>
            
            <div class="grid-2-cols" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
                <div class="card">
                    <div class="card-header"><h3 class="card-title">YouTube & RSS</h3></div>
                    <div class="card-body">
                        <div class="form-section">
                            <h4>YouTube Innstillinger</h4>
                            <div class="form-group">
                                <label>YouTube Channel ID</label>
                                <input type="text" id="yt-channel-id" class="form-control" placeholder="f.eks. UCxxxxxxxxxxxx">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>YouTube Kategorier (Playlister)</label>
                                <textarea id="yt-playlists" class="form-control" style="height: 100px;" placeholder="Navn: PlaylistID (én per linje)"></textarea>
                            </div>
                        </div>
                        
                        <div class="divider"></div>

                        <div class="form-section">
                            <h4>Podcast Innstillinger</h4>
                            <div class="form-group">
                                <label>RSS Feed URL</label>
                                <input type="text" id="podcast-rss-url" class="form-control" placeholder="https://feeds.simplecast.com/xxxxxx">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>Spotify Podcast URL</label>
                                <input type="text" id="podcast-spotify-url" class="form-control" placeholder="https://open.spotify.com/show/...">
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label>Apple Podcasts URL</label>
                                <input type="text" id="podcast-apple-url" class="form-control" placeholder="https://podcasts.apple.com/...">
                            </div>
                        </div>

                        <div style="margin-top: 30px;">
                            <button class="btn-primary" id="save-media-settings">Lagre media-innstillinger</button>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header flex-between">
                        <h3 class="card-title">Podcast-kategorier (Manuell overstyring)</h3>
                        <button class="btn-secondary btn-sm" id="refresh-podcast-list">Oppdater liste</button>
                    </div>
                    <div class="card-body" style="max-height: 600px; overflow-y: auto;">
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">Her kan du manuelt overstyre kategorien for hver episode. Hvis ingen er valgt, brukes automatisk kategorisering.</p>
                        <div id="podcast-overrides-list">
                            <div class="loader">Henter episoder...</div>
                        </div>
                        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                            <button class="btn-primary" id="save-podcast-overrides" style="width: 100%;">Lagre overstyringer</button>
                        </div>
                    </div>
                </div>
            </div>
        `,e.setAttribute("data-rendered","true"),this.loadMediaSettings(),this.loadPodcastOverrides(),document.getElementById("save-media-settings").addEventListener("click",()=>this.saveMediaSettings()),document.getElementById("save-podcast-overrides").addEventListener("click",()=>this.savePodcastOverrides()),document.getElementById("refresh-podcast-list").addEventListener("click",()=>this.loadPodcastOverrides()))}async renderMessagesSection(){const e=document.getElementById("messages-section");if(!e)return;e.setAttribute("data-rendered","true"),e.innerHTML=`
            <div class="section-header">
                <h2 class="section-title">Meldinger fra kontaktskjema</h2>
                <p class="section-subtitle">Alle henvendelser som er sendt inn via kontaktskjemaet.</p>
            </div>

            <div class="card">
                <div class="card-header flex-between">
                    <h3 class="card-title">Innboks</h3>
                </div>
                <div class="card-body" id="messages-list">
                    <p style="font-size:14px; color:#64748b;">Laster meldinger...</p>
                </div>
            </div>
        `;const t=document.getElementById("messages-list");if(!p.isInitialized){t&&(t.innerHTML='<p style="color:#ef4444; font-size:14px;">Firebase er ikke konfigurert. Meldinger kan ikke hentes.</p>');return}try{const s=await p.db.collection("contactMessages").orderBy("createdAt","desc").limit(100).get();if(!t)return;if(s.empty){t.innerHTML='<p style="font-size:14px; color:#64748b;">Ingen meldinger er sendt inn ennå.</p>';return}const i=[];s.forEach(n=>{const o=n.data()||{},a=o.createdAt&&typeof o.createdAt.toDate=="function"?o.createdAt.toDate().toLocaleString("no-NO"):"",r=o.name||"Ukjent",l=o.email||"",d=o.phone||"",c=o.subject||"(ingen emne)",u=o.message||"",m=o.status==="lest",v=m?'<span class="message-badge message-badge-read">Lest</span>':'<span class="message-badge message-badge-new">Ny</span>',g=m?"":`<button class="btn-secondary btn-sm message-mark-read" data-id="${n.id}">Marker som lest</button>`;i.push(`
                    <div class="message-item ${m?"message-read":"message-new"}" data-id="${n.id}">
                        <div class="message-header-row">
                            <div>
                                <div class="message-name">${r}</div>
                                <div class="message-meta">
                                    ${l?`<span>${l}</span>`:""}
                                    ${l&&d?" · ":""}
                                    ${d?`<span>${d}</span>`:""}
                                </div>
                            </div>
                            <div class="message-header-right">
                                <div class="message-time">${a}</div>
                                <div class="message-actions">
                                    ${v}
                                    ${g}
                                </div>
                            </div>
                        </div>
                        <div class="message-subject">${c}</div>
                        <div class="message-body">${u}</div>
                    </div>
                `)}),t.innerHTML=i.join(""),t.addEventListener("click",async n=>{const o=n.target.closest(".message-mark-read");if(!o)return;const a=o.getAttribute("data-id");if(a)try{await p.db.collection("contactMessages").doc(a).update({status:"lest",readAt:firebase.firestore.FieldValue.serverTimestamp()});const r=o.closest(".message-item");if(r){r.classList.remove("message-new"),r.classList.add("message-read");const l=r.querySelector(".message-badge");l&&(l.textContent="Lest",l.classList.remove("message-badge-new"),l.classList.add("message-badge-read"))}o.remove()}catch(r){console.error("Kunne ikke oppdatere melding som lest:",r),showToast("Kunne ikke markere melding som lest. Prøv igjen.")}},{once:!1})}catch(s){console.error("Kunne ikke hente kontaktmeldinger:",s),t&&(t.innerHTML='<p style="color:#ef4444; font-size:14px;">Feil ved henting av meldinger. Prøv igjen senere.</p>')}}async loadMediaSettings(){try{const e=await p.getPageContent("settings_media");e&&(e.youtubeChannelId&&(document.getElementById("yt-channel-id").value=e.youtubeChannelId),e.youtubePlaylists&&(document.getElementById("yt-playlists").value=e.youtubePlaylists),e.podcastRssUrl&&(document.getElementById("podcast-rss-url").value=e.podcastRssUrl),e.spotifyUrl&&(document.getElementById("podcast-spotify-url").value=e.spotifyUrl),e.appleUrl&&(document.getElementById("podcast-apple-url").value=e.appleUrl))}catch(e){console.error("Load media settings error:",e)}}async saveMediaSettings(){const e=document.getElementById("save-media-settings"),t=document.getElementById("yt-channel-id").value.trim(),s=document.getElementById("yt-playlists").value.trim(),i=document.getElementById("podcast-rss-url").value.trim(),n=document.getElementById("podcast-spotify-url").value.trim(),o=document.getElementById("podcast-apple-url").value.trim();e.textContent="Lagrer...",e.disabled=!0;try{await p.savePageContent("settings_media",{youtubeChannelId:t,youtubePlaylists:s,podcastRssUrl:i,spotifyUrl:n,appleUrl:o,updatedAt:new Date().toISOString()}),this.showToast("✅ Media-innstillinger er lagret!","success",5e3)}catch(a){console.error("Save media settings error:",a),this.showToast("❌ Feil ved lagring: "+a.message,"error",5e3)}finally{e.textContent="Lagre media-innstillinger",e.disabled=!1}}async loadPodcastOverrides(){var t,s;const e=document.getElementById("podcast-overrides-list");if(e){e.innerHTML='<div class="loader">Henter episoder...</div>';try{const n=(await p.getPageContent("settings_podcast_overrides")||{}).overrides||{},o=await p.getPageContent("settings_media"),l=await(await fetch("https://getpodcast-42bhgdjkcq-uc.a.run.app")).json(),d=Array.isArray((t=l.rss)==null?void 0:t.channel)?l.rss.channel[0]:(s=l.rss)==null?void 0:s.channel,c=d==null?void 0:d.item;if(c){const u=Array.isArray(c)?c:[c];e.innerHTML=u.map((m,v)=>{var x;const g=((x=m.guid)==null?void 0:x._)||m.guid||m.link,w=n[g]||"";return`
                        <div class="podcast-override-item" style="padding: 12px; border-bottom: 1px solid #eee; display: flex; flex-direction: column; gap: 8px;">
                            <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.title}">${m.title}</div>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <select class="override-select form-control" data-id="${g}" style="font-size: 12px; padding: 4px 8px; height: auto;">
                                    <option value="">Auto (Nøkkelord)</option>
                                    <option value="tro" ${w==="tro"?"selected":""}>Tro</option>
                                    <option value="bibel" ${w==="bibel"?"selected":""}>Bibel</option>
                                    <option value="bønn" ${w==="bønn"?"selected":""}>Bønn</option>
                                    <option value="undervisning" ${w==="undervisning"?"selected":""}>Undervisning</option>
                                </select>
                            </div>
                        </div>
                    `}).join("")}else e.innerHTML='<p class="text-muted">Ingen episoder funnet.</p>'}catch(i){console.error("Load podcast overrides error:",i),e.innerHTML='<p class="text-danger">Kunne ikke laste episoder.</p>'}}}async savePodcastOverrides(){const e=document.getElementById("save-podcast-overrides"),t=document.querySelectorAll(".override-select"),s={};t.forEach(i=>{i.value&&(s[i.getAttribute("data-id")]=i.value)}),e.textContent="Lagrer...",e.disabled=!0;try{await p.savePageContent("settings_podcast_overrides",{overrides:s,updatedAt:new Date().toISOString()}),this.showToast("✅ Podcast-overstyringer er lagret!","success",5e3)}catch(i){console.error("Save overrides error:",i),this.showToast("❌ Feil ved lagring: "+i.message,"error",5e3)}finally{e.textContent="Lagre overstyringer",e.disabled=!1}}renderContentEditor(){const e=document.getElementById("content-section");e&&(e.innerHTML=`
            <div class="section-header">
                <h2 class="section-title">Sideinnhold</h2>
                <p class="section-subtitle">Rediger tekst på de faste sidene.</p>
            </div>
            <div class="content-editor-grid">
                <aside class="content-sidebar card">
                    <div class="content-sidebar-head">
                        <h3>Sider</h3>
                        <p>Velg side for redigering</p>
                    </div>
                    <ul class="page-list">
                        <li class="page-item active" data-page="index">Forside</li>
                        <li class="page-item" data-page="om-oss">Om oss</li>
                        <li class="page-item" data-page="media">Media</li>
                        <li class="page-item" data-page="arrangementer">Arrangementer</li>
                        <li class="page-item" data-page="blogg">Blogg</li>
                        <li class="page-item" data-page="for-menigheter">For menigheter</li>
                        <li class="page-item" data-page="kontakt">Kontakt</li>
                        <li class="page-item" data-page="donasjoner">Donasjoner</li>
                        <li class="page-item" data-page="undervisning">Undervisning</li>
                        <li class="page-item" data-page="reisevirksomhet">Reisevirksomhet</li>
                        <li class="page-item" data-page="bibelstudier">Bibelstudier</li>
                        <li class="page-item" data-page="seminarer">Seminarer</li>
                        <li class="page-item" data-page="podcast">Podcast</li>
                        <li class="page-item" data-page="youtube">YouTube</li>
                        <li class="page-item" data-page="for-bedrifter">For bedrifter</li>
                        <li class="page-item" data-page="bnn">Business Network</li>
                    </ul>
                </aside>
                <div class="content-main">
                    <div class="card content-editor-card">
                        <div class="card-header flex-between content-editor-toolbar">
                            <h3 id="editing-page-title" class="editing-page-title">Forside</h3>
                            <button class="btn-primary btn-save-content" id="save-content">Lagre endringer</button>
                        </div>
                        <div class="card-body" id="editor-fields">
                            <div class="loader">Laster...</div>
                        </div>
                    </div>
                </div>
            </div>
        `,e.setAttribute("data-rendered","true"),e.querySelectorAll(".page-item").forEach(t=>{t.addEventListener("click",()=>{e.querySelectorAll(".page-item").forEach(i=>i.classList.remove("active")),t.classList.add("active");const s=t.getAttribute("data-page");document.getElementById("editing-page-title").textContent=t.textContent,this.loadPageFields(s)})}),document.getElementById("save-content").addEventListener("click",()=>this.savePageContent()),this.loadPageFields("index"))}async renderCollectionEditor(e,t){const s=document.getElementById(`${e}-section`);s&&(s.innerHTML=`
            <div class="section-header flex-between">
                <div>
                    <h2 class="section-title">${t}</h2>
                    <p class="section-subtitle">Administrer dine ${t.toLowerCase()}.</p>
                </div>
                <!-- Skjult knapp siden FAB brukes i stedet -->
                <button class="btn-primary" id="add-new-${e}" style="display: none;">
                    <span class="material-symbols-outlined">add</span> Legg til ny
                </button>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="collection-list" id="${e}-list">
                        <div class="loader">Laster ${t.toLowerCase()}...</div>
                    </div>
                </div>
            </div>
        `,s.setAttribute("data-rendered","true"),document.getElementById(`add-new-${e}`).addEventListener("click",()=>this.addNewItem(e)),this.loadCollection(e))}async loadCollection(e){const t=document.getElementById(`${e}-list`);if(!p.isInitialized){const s=[`Config: ${!!window.firebaseConfig}`,`SDK: ${typeof firebase<"u"}`,`Service: ${!!p}`].join(", ");t.innerHTML=`<div class="text-danger" style="padding: 20px;">
                <p><strong>Firebase er ikke tilkoblet.</strong></p>
                <code style="display:block; margin-top:10px; font-size: 12px; background: #eee; padding: 10px;">Debug: ${s}</code>
                <p>Prøv å laste siden på nytt (Shift + R).</p>
            </div>`;return}try{const s=await p.getPageContent(`collection_${e}`);let i=Array.isArray(s)?s:s&&s.items?s.items:[];if(i.forEach(n=>n.isFirestore=!0),e==="events")try{const n=await p.getPageContent("settings_integrations"),o=(n==null?void 0:n.googleCalendar)||{},a=o.apiKey,r=o.calendarId;if(a&&r){const l=new Date,d=new Date;d.setMonth(l.getMonth()+3);const c=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(r)}/events?key=${a}&timeMin=${l.toISOString()}&timeMax=${d.toISOString()}&orderBy=startTime&singleEvents=true`,m=await(await fetch(c)).json();m.items&&m.items.map(g=>({title:g.summary,date:g.start.dateTime||g.start.date,isSynced:!0,id:g.id})).forEach(g=>{if(!i.some(x=>{var h,b;return x.gcalId&&x.gcalId===g.id||x.title===g.title&&((h=x.date)==null?void 0:h.split("T")[0])===((b=g.date)==null?void 0:b.split("T")[0])}))i.push(g);else{const x=i.find(h=>{var b,f;return h.gcalId&&h.gcalId===g.id||h.title===g.title&&((b=h.date)==null?void 0:b.split("T")[0])===((f=g.date)==null?void 0:f.split("T")[0])});x&&(x.isSynced=!0,x.gcalId||(x.gcalId=g.id))}})}}catch(n){console.error("GCal fetch failed in admin:",n)}this.currentItems=i,this.renderItems(e,i)}catch{t.innerHTML="<p>Kunne ikke laste data.</p>"}}renderItems(e,t){const s=document.getElementById(`${e}-list`);if(t.length===0){s.innerHTML='<p class="collection-empty-state">Ingen elementer funnet. Klikk "Legg til ny".</p>';return}s.innerHTML=`<div class="collection-grid">${t.map((i,n)=>`
            <div class="item-card collection-item-card ${i.isSynced?"synced-item":""}">
                ${i.imageUrl?`<div class="item-thumb"><img src="${i.imageUrl}" alt="Thumb"></div>`:""}
                <div class="item-content">
                    <div class="item-head">
                        <h4 class="item-title">${i.title||"Uten tittel"}</h4>
                        ${i.isSynced?'<span class="badge item-badge-synced">Synkronisert</span>':""}
                    </div>
                    <p class="item-meta">${i.date||""}</p>
                    <div class="item-actions">
                        <button class="icon-btn" onclick="window.adminManager.editCollectionItem('${e}', ${n})">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        ${i.isFirestore?`
                        <button class="icon-btn delete" onclick="window.adminManager.deleteItem('${e}', ${n})">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                        `:""}
                    </div>
                </div>
            </div>
        `).join("")}</div>`}async editCollectionItem(e,t){try{const s=this.currentItems&&this.currentItems[t]?{...this.currentItems[t]}:{};let i=new Date().toISOString().split("T")[0];s.date&&typeof s.date=="string"&&(i=s.date.split("T")[0]);const n=Array.isArray(s.tags)?s.tags:[],o=e==="teaching",a=(s.teachingType||s.category||"Bibelstudie").toLowerCase(),r=Array.isArray(s.seriesItems)?s.seriesItems:[],l=(this.currentItems||[]).filter((y,k)=>k!==t).filter(y=>y.id||y.title).map(y=>{const k=y.id||y.title,E=r.includes(k)?"selected":"";return`<option value="${k}" ${E}>${y.title||"Uten tittel"}</option>`}).join(""),d=document.createElement("div");if(d.className="dashboard-modal",d.innerHTML=`
                <div class="editor-layout-v2">
                    <header class="editor-header-v2">
                        <div class="editor-header-left">
                             <button class="btn-ghost" id="close-col-modal">
                                <span class="material-symbols-outlined">arrow_back</span> Tilbake
                             </button>
                             <span style="color: #94a3b8; margin: 0 8px;">|</span>
                             <span style="font-weight: 600; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">
                                ${e==="blog"?"Blogginnlegg":e==="events"?"Arrangement":e==="teaching"?"Undervisning":"Rediger innhold"}
                             </span>
                        </div>
                        <div class="editor-header-right">
                             <button class="btn-ghost" id="print-col-item" title="Skriv ut" style="display:flex; align-items:center; gap:6px;">
                                <span class="material-symbols-outlined">print</span> Skriv ut
                             </button>
                             <button class="btn-primary" id="save-col-item">
                                <span class="material-symbols-outlined">publish</span> Lagre og publiser
                             </button>
                        </div>
                    </header>
                    <div class="editor-content-wrapper">
                        <div class="editor-main-canvas">
                            <div class="editor-paper">
                                <input type="text" id="col-item-title-v2" placeholder="Skriv din tittel her..." value="${s.title||""}">
                                <div id="editorjs-container-v2"></div>
                            </div>
                        </div>
                        <aside class="editor-sidebar-v2">
                             <h4 class="sidebar-section-title">DETALJER</h4>
                             <div class="sidebar-group">
                                 <label>Publiseringsdato</label>
                                 <input type="date" id="col-item-date" class="sidebar-control" value="${i}">
                             </div>
                             <div class="sidebar-group">
                                 <label>Forfatter</label>
                                 <input type="text" id="col-item-author" class="sidebar-control" value="${s.author||""}" placeholder="Navn">
                             </div>
                             ${o?`
                             <div class="sidebar-group">
                                 <label>Type undervisning</label>
                                 <select id="col-item-type" class="sidebar-control">
                                     <option value="Bibelstudie" ${a.includes("bibelstudie")?"selected":""}>Bibelstudie</option>
                                     <option value="Seminarer" ${a.includes("seminar")?"selected":""}>Seminar</option>
                                     <option value="Undervisningsserier" ${a.includes("undervisningsserie")?"selected":""}>Undervisningsserie</option>
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Velg 'Undervisningsserie' for å koble sammen flere undervisninger.</p>
                             </div>
                             <div class="sidebar-group" id="col-item-series-group" style="${a.includes("undervisningsserie")?"":"display:none;"}">
                                 <label>Koble undervisninger i serie</label>
                                 <select id="col-item-series-items" class="sidebar-control" multiple style="height: 140px;">
                                     ${l}
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Hold Cmd/Ctrl nede for å velge flere undervisninger i serien.</p>
                             </div>
                             `:`
                             <div class="sidebar-group">
                                 <label>Kategori</label>
                                 <input type="text" id="col-item-cat" class="sidebar-control" value="${s.category||""}" placeholder="Eks: Undervisning">
                             </div>
                             `}
                             
                              <h4 class="sidebar-section-title">OMSLAGSBILDE</h4>
                              <div class="sidebar-group">
                                  <div class="sidebar-img-preview" id="sidebar-img-trigger" style="cursor: pointer; position: relative; overflow: hidden; border: 2px dashed #e2e8f0; border-radius: 12px; height: 160px; display: flex; align-items: center; justify-content: center; background: #f8fafc; transition: all 0.2s;">
                                      ${s.imageUrl?`<img src="${s.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">`:'<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span>'}
                                      <div class="upload-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.7); color: #fff; font-size: 11px; padding: 6px; text-align: center; opacity: 0; transition: opacity 0.2s;">KLIKK FOR Å ENDRE</div>
                                  </div>
                                  <input type="file" id="col-item-img-file" style="display: none;" accept="image/*">
                                  <input type="text" id="col-item-img" class="sidebar-control" style="margin-top:8px;" placeholder="Eller lim inn bilde-URL" value="${s.imageUrl||""}">
                                  <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Tips: Klikk på boksen over for å laste opp bilde fra maskinen.</p>
                              </div>

                             <h4 class="sidebar-section-title">TAGGER</h4>
                             <div class="sidebar-group">
                                 <div class="tags-input-container">
                                     <div id="active-tags" class="active-tags-list"></div>
                                     <input type="text" id="tag-input" class="sidebar-control" placeholder="Legg til tag + Enter">
                                 </div>
                             </div>

                             <h4 class="sidebar-section-title">SEO & SYNLIGHET</h4>
                             <div class="sidebar-group">
                                 <label>Meta-tittel (SEO)</label>
                                 <input type="text" id="col-item-seo-title" class="sidebar-control" value="${s.seoTitle||""}" placeholder="Tittel for søkemotorer">
                             </div>
                             <div class="sidebar-group">
                                 <label>Meta-beskrivelse</label>
                                 <textarea id="col-item-seo-desc" class="sidebar-control" style="height: 100px;" placeholder="Kort oppsummering...">${s.seoDescription||""}</textarea>
                             </div>
                             ${e==="blog"?`
                             <h4 class="sidebar-section-title">RELATERTE INNLEGG</h4>
                             <div class="sidebar-group">
                                 <select id="col-item-related" class="sidebar-control" multiple style="height: 100px;">
                                     ${(this.currentItems||[]).map((y,k)=>{if(k===t)return"";const E=y.id||y.title,S=(s.relatedPosts||[]).includes(E)?"selected":"";return`<option value="${E}" ${S}>${y.title||"Uten Tittel"}</option>`}).join("")}
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Hold Cmd/Ctrl nede for å velge flere.</p>
                             </div>
                             `:""}
                        </aside>
                    </div>
                </div>
                `,document.body.appendChild(d),o){const y=document.getElementById("col-item-type"),k=document.getElementById("col-item-series-group");if(y&&k){const E=()=>{k.style.display=y.value==="Undervisningsserier"?"":"none"};y.addEventListener("change",E),E()}}let c={};typeof s.content=="object"&&s.content!==null&&s.content.blocks?c=s.content:typeof s.content=="string"&&s.content.trim().length>0&&console.warn("Legacy HTML content detected. Editor.js works best with JSON.");class u{static get toolbox(){return{title:"Video (YouTube)",icon:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582 7.186a2.506 2.506 0 0 0-1.762-1.769C18.265 5 12 5 12 5s-6.265 0-7.82.417A2.506 2.506 0 0 0 2.418 7.186 26.302 26.302 0 0 0 2 12a26.302 26.302 0 0 0 .418 4.814 2.506 2.506 0 0 0 1.762 1.769C5.735 19 12 19 12 19s6.265 0 7.82-.417a2.506 2.506 0 0 0 1.762-1.769A26.302 26.302 0 0 0 22 12a26.302 26.302 0 0 0-.418-4.814zM9.954 15.477V8.523L15.818 12l-5.864 3.477z"/></svg>'}}static get isReadOnlySupported(){return!0}constructor({data:k,readOnly:E}){this.data=k||{},this.readOnly=E,this._wrapper=null}_getYouTubeId(k){if(!k)return null;const E=k.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);return E?E[1]:null}render(){this._wrapper=document.createElement("div"),this._wrapper.style.cssText="padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;";const k=this._getYouTubeId(this.data.url||"");if(k?this._wrapper.innerHTML=`
                            <div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;">
                                <iframe src="https://www.youtube.com/embed/${k}" frameborder="0" allowfullscreen
                                    style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>
                            </div>`:this._wrapper.innerHTML=`<div style="text-align:center; padding:20px; color:#94a3b8;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#cbd5e1"><path d="M21.582 7.186a2.506 2.506 0 0 0-1.762-1.769C18.265 5 12 5 12 5s-6.265 0-7.82.417A2.506 2.506 0 0 0 2.418 7.186 26.302 26.302 0 0 0 2 12a26.302 26.302 0 0 0 .418 4.814 2.506 2.506 0 0 0 1.762 1.769C5.735 19 12 19 12 19s6.265 0 7.82-.417a2.506 2.506 0 0 0 1.762-1.769A26.302 26.302 0 0 0 22 12a26.302 26.302 0 0 0-.418-4.814zM9.954 15.477V8.523L15.818 12l-5.864 3.477z"/></svg>
                            <p style="margin:8px 0 0; font-size:13px;">Ingen video lastet ennå</p>
                        </div>`,!this.readOnly){const E=document.createElement("div");E.style.cssText="display:flex; gap:8px; margin-top:8px;";const S=document.createElement("input");S.type="url",S.placeholder="Lim inn YouTube-lenke her...",S.value=this.data.url||"",S.style.cssText="flex:1; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none;";const C=document.createElement("button");C.type="button",C.textContent="Last inn",C.style.cssText="padding:8px 14px; background:#6366f1; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:13px; white-space:nowrap;",C.onclick=()=>{this.data.url=S.value.trim();const j=this._getYouTubeId(this.data.url),_=this._wrapper.querySelector('div[style*="padding-bottom"], div[style*="text-align"]');if(j){const T=document.createElement("div");T.style.cssText="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;",T.innerHTML=`<iframe src="https://www.youtube.com/embed/${j}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>`,_?_.replaceWith(T):this._wrapper.prepend(T)}else _&&(_.innerHTML='<p style="text-align:center; color:#ef4444; font-size:13px;">Ugyldig YouTube-lenke</p>')},E.appendChild(S),E.appendChild(C),this._wrapper.appendChild(E)}return this._wrapper}save(){const k=this._wrapper?this._wrapper.querySelector('input[type="url"]'):null;return{url:k?k.value.trim():this.data.url||""}}}const m={};typeof Header<"u"&&(m.header={class:Header,inlineToolbar:!0,config:{placeholder:"Overskrift",levels:[2,3,4],defaultLevel:2}}),typeof List<"u"&&(m.list={class:List,inlineToolbar:!0,config:{defaultStyle:"unordered"}}),typeof ImageTool<"u"&&(m.image={class:ImageTool,config:{uploader:{async uploadByFile(y){try{const k=`editor/${e}/${Date.now()}_${y.name}`;return{success:1,file:{url:await p.uploadImage(y,k)}}}catch(k){return console.error("Upload failed:",k),{success:0}}},uploadByUrl(y){return Promise.resolve({success:1,file:{url:y}})}}}}),typeof Quote<"u"&&(m.quote={class:Quote,inlineToolbar:!0,config:{quotePlaceholder:"Sitat tekst",captionPlaceholder:"Forfatter"}}),typeof Delimiter<"u"&&(m.delimiter=Delimiter),m.youtubeVideo={class:u},console.log("Final EditorJS Tools Config Keys:",Object.keys(m));const v=new EditorJS({holder:"editorjs-container-v2",data:c,placeholder:'Trykk "/" for å velge blokker...',tools:m,logLevel:"ERROR",onReady:()=>{console.log("Editor.js is ready for work!")}});let g=[...n];const w=document.getElementById("active-tags"),x=document.getElementById("tag-input"),h=()=>{w&&(w.innerHTML=g.map(y=>`
                    <span class="tag-badge">
                        ${y}
                        <button type="button" class="remove-tag" data-tag="${y}">&times;</button>
                    </span>
                `).join(""),document.querySelectorAll(".remove-tag").forEach(y=>{y.onclick=()=>{const k=y.getAttribute("data-tag");g=g.filter(E=>E!==k),h()}}))};h(),x&&x.addEventListener("keydown",y=>{if(y.key==="Enter"||y.key===","){y.preventDefault();const k=x.value.trim().replace(",","");k&&!g.includes(k)&&(g.push(k),h(),x.value="")}});const b=document.getElementById("col-item-img");b&&b.addEventListener("input",y=>{const k=y.target.value,E=document.getElementById("sidebar-img-trigger");E&&(k&&k.length>10?E.innerHTML=`<img src="${k}" style="width:100%; height:100%; object-fit:cover;">`:E.innerHTML='<span class="material-symbols-outlined" style="opacity:0.3; font-size:48px;">add_a_photo</span>')});const f=document.getElementById("sidebar-img-trigger"),L=document.getElementById("col-item-img-file");f&&L&&(f.onclick=()=>L.click(),f.onmouseenter=()=>{const y=f.querySelector(".upload-overlay");y&&(y.style.opacity="1")},f.onmouseleave=()=>{const y=f.querySelector(".upload-overlay");y&&(y.style.opacity="0")},L.onchange=async y=>{const k=y.target.files[0];if(!k)return;f.style.opacity="0.5",f.style.pointerEvents="none";const E=f.innerHTML;f.innerHTML='<span class="loader-sm"></span>';try{const S=`covers/${e}/${Date.now()}_${k.name}`,C=await p.uploadImage(k,S);b.value=C,b.dispatchEvent(new Event("input")),this.showToast("Bilde lastet opp!","success")}catch(S){console.error("Upload error:",S),this.showToast("Kunne ikke laste opp bilde.","error"),f.innerHTML=E}finally{f.style.opacity="1",f.style.pointerEvents="auto"}});const $=document.getElementById("close-col-modal");$&&($.onclick=()=>d.remove());const I=document.getElementById("print-col-item");I&&(I.onclick=async()=>{var T,A,z;I.disabled=!0,I.innerHTML='<span class="material-symbols-outlined">hourglass_empty</span> Forbereder...';let y;try{y=await v.save()}catch(B){console.error("Could not save editor for print:",B),I.disabled=!1,I.innerHTML='<span class="material-symbols-outlined">print</span> Skriv ut';return}const k=((T=document.getElementById("col-item-title-v2"))==null?void 0:T.value)||"(Uten tittel)",E=((A=document.getElementById("col-item-author"))==null?void 0:A.value)||"",S=((z=document.getElementById("col-item-date"))==null?void 0:z.value)||"",C=(y.blocks||[]).map(B=>{var P;switch(B.type){case"paragraph":return`<p>${B.data.text||""}</p>`;case"header":return`<h${B.data.level}>${B.data.text||""}</h${B.data.level}>`;case"list":{const H=B.data.style==="ordered"?"ol":"ul",N=(B.data.items||[]).map(O=>`<li>${O}</li>`).join("");return`<${H}>${N}</${H}>`}case"quote":return`<blockquote><p>${B.data.text||""}</p>${B.data.caption?`<cite>— ${B.data.caption}</cite>`:""}</blockquote>`;case"delimiter":return'<div class="print-delimiter">⁂</div>';case"image":return`<figure><img src="${((P=B.data.file)==null?void 0:P.url)||B.data.url||""}" alt="${B.data.caption||""}"><figcaption>${B.data.caption||""}</figcaption></figure>`;case"youtubeVideo":{const H=B.data.url||"";return H?`<div class="print-video-ref"><span>🎥 Video: </span><a href="${H}">${H}</a></div>`:""}default:return""}}).join(`
`),j=S?new Date(S).toLocaleDateString("nb-NO",{year:"numeric",month:"long",day:"numeric"}):"",_=window.open("","_blank","width=900,height=700");_.document.write(`<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <title>${k}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', Georgia, serif;
            font-size: 11pt;
            color: #1e293b;
            background: white;
            line-height: 1.75;
        }

        .page {
            max-width: 750px;
            margin: 0 auto;
            padding: 50px 60px 80px;
        }

        .print-header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 24px;
            margin-bottom: 36px;
        }

        .print-category {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #64748b;
            margin-bottom: 10px;
        }

        h1.print-title {
            font-size: 28pt;
            font-weight: 800;
            line-height: 1.15;
            color: #0f172a;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
        }

        .print-meta {
            font-size: 10pt;
            color: #64748b;
            display: flex;
            gap: 24px;
        }

        .print-meta span { display: flex; align-items: center; gap: 6px; }

        .print-body p {
            font-size: 11pt;
            margin-bottom: 16px;
            color: #334155;
        }

        .print-body h2 {
            font-size: 18pt;
            font-weight: 800;
            color: #0f172a;
            margin: 36px 0 12px;
            letter-spacing: -0.01em;
            border-top: 1px solid #e2e8f0;
            padding-top: 24px;
        }

        .print-body h3 {
            font-size: 14pt;
            font-weight: 700;
            color: #1e293b;
            margin: 28px 0 10px;
        }

        .print-body h4 {
            font-size: 12pt;
            font-weight: 700;
            color: #334155;
            margin: 20px 0 8px;
        }

        .print-body ul, .print-body ol {
            padding-left: 24px;
            margin-bottom: 16px;
        }

        .print-body li {
            margin-bottom: 6px;
            color: #334155;
        }

        .print-body blockquote {
            border-left: 4px solid #0f172a;
            padding: 16px 24px;
            margin: 28px 0;
            background: #f8fafc;
            border-radius: 0 8px 8px 0;
        }

        .print-body blockquote p {
            font-size: 13pt;
            font-style: italic;
            color: #1e293b;
            margin: 0 0 8px;
        }

        .print-body blockquote cite {
            font-size: 10pt;
            color: #64748b;
            font-style: normal;
        }

        .print-body figure {
            margin: 28px 0;
            text-align: center;
        }

        .print-body figure img {
            max-width: 100%;
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .print-body figure figcaption {
            font-size: 9pt;
            color: #94a3b8;
            margin-top: 8px;
            font-style: italic;
        }

        .print-delimiter {
            text-align: center;
            font-size: 18pt;
            color: #94a3b8;
            margin: 32px 0;
            letter-spacing: 12px;
        }

        .print-video-ref {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 10pt;
            color: #475569;
            margin: 20px 0;
        }

        .print-video-ref a {
            color: #6366f1;
            word-break: break-all;
        }

        .print-footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 9pt;
            color: #94a3b8;
            text-align: center;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .page { padding: 20px 40px; }
            h2, h3 { page-break-after: avoid; }
            figure, blockquote { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="print-header">
            <div class="print-category">His Kingdom Ministry${e==="blog"?" — Blogg":e==="teaching"?" — Undervisning":""}</div>
            <h1 class="print-title">${k}</h1>
            <div class="print-meta">
                ${E?`<span>✍️ ${E}</span>`:""}
                ${j?`<span>📅 ${j}</span>`:""}
            </div>
        </div>
        <div class="print-body">
            ${C}
        </div>
        <div class="print-footer">
            His Kingdom Ministry &nbsp;·&nbsp; Skrevet ut ${new Date().toLocaleDateString("nb-NO")}
        </div>
    </div>
    <script>
        window.onload = function() {
            window.print();
        };
    <\/script>
</body>
</html>`),_.document.close(),I.disabled=!1,I.innerHTML='<span class="material-symbols-outlined">print</span> Skriv ut'});const M=document.getElementById("save-col-item");M&&(M.onclick=async()=>{var E,S,C,j,_,T,A,z;const y=document.getElementById("save-col-item");if(!y)return;let k;try{k=await v.save()}catch(B){console.error("Saving failed",B),showToast("Kunne ikke hente innhold fra editor.");return}if(s.title=((E=document.getElementById("col-item-title-v2"))==null?void 0:E.value)||"",s.content=k,s.date=((S=document.getElementById("col-item-date"))==null?void 0:S.value)||"",s.imageUrl=((C=document.getElementById("col-item-img"))==null?void 0:C.value)||"",s.author=((j=document.getElementById("col-item-author"))==null?void 0:j.value)||"",o){const B=((_=document.getElementById("col-item-type"))==null?void 0:_.value)||"Bibelstudier",P=document.getElementById("col-item-series-items");s.teachingType=B,s.category=B,s.seriesItems=B==="Undervisningsserier"&&P?Array.from(P.selectedOptions).map(H=>H.value):[]}else s.category=((T=document.getElementById("col-item-cat"))==null?void 0:T.value)||"";if(s.seoTitle=((A=document.getElementById("col-item-seo-title"))==null?void 0:A.value)||"",s.seoDescription=((z=document.getElementById("col-item-seo-desc"))==null?void 0:z.value)||"",s.tags=g,e==="blog"){const B=document.getElementById("col-item-related");B&&(s.relatedPosts=Array.from(B.selectedOptions).map(P=>P.value))}s.isSynced&&s.id&&!s.gcalId&&(s.gcalId=s.id),y.textContent="Lagrer...",y.disabled=!0;try{const B=await p.getPageContent(`collection_${e}`),P=Array.isArray(B)?B:B&&B.items?B.items:[];let H=-1;s.id&&(H=P.findIndex(N=>N.id===s.id)),H===-1&&(e==="events"?H=P.findIndex(N=>{var O,F;return s.gcalId&&N.gcalId===s.gcalId||N.title===s.title&&((O=N.date)==null?void 0:O.split("T")[0])===((F=s.date)==null?void 0:F.split("T")[0])}):s.isFirestore&&typeof t=="number"&&t>=0&&!s.isSynced&&(H=t)),H>=0?P[H]=s:P.unshift(s),await p.savePageContent(`collection_${e}`,{items:P}),e==="events"&&(this.clearPublicEventCache(),this.googleAccessToken&&s.gcalId&&await this.updateGoogleCalendarEvent(s,"PATCH")),d.remove(),this.loadCollection(e),this.showToast("✅ Lagret!","success")}catch(B){console.error("Error saving item:",B),this.showToast("Kunne ikke lagre. Sjekk konsollen for detaljer.","error",5e3)}finally{y&&(y.textContent="Lagre endringer",y.disabled=!1)}})}catch(s){console.error("Error opening editor:",s);const i=s.message||JSON.stringify(s);this.showToast(`Kunne ikke åpne elementet.Feilmelding: ${i}. Sjekk at Editor.js scriptet er lastet.`,"error",7e3)}}async addNewItem(e){const t=document.getElementById(`add-new-${e}`);t&&(t.disabled=!0,t.innerHTML='<span class="material-symbols-outlined">hourglass_empty</span> Forbereder...');try{await this.loadCollection(e);const s={id:`item-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,title:"",date:new Date().toISOString().split("T")[0],content:""};this.currentItems||(this.currentItems=[]),this.currentItems.unshift(s),this.editCollectionItem(e,0)}catch(s){console.error("Error preparing new item:",s),this.showToast("Kunne ikke forberede nytt element.","error",5e3)}finally{t&&(t.disabled=!1,t.innerHTML='<span class="material-symbols-outlined">add</span> Legg til ny')}}async deleteItem(e,t){if(!this.hasPermission("MANAGE_CONTENT")){this.showToast("Du har ikke tilgang til å slette elementer.","error",5e3);return}if(!confirm("Er du sikker på at du vil slette dette elementet?"))return;const s=await p.getPageContent(`collection_${e}`),i=Array.isArray(s)?s:s&&s.items?s.items:[],n=this.currentItems&&this.currentItems[t]?this.currentItems[t]:null;if(!n){this.showToast("Kunne ikke finne elementet som skal slettes.","error");return}const o=i.findIndex(a=>{var r,l;return n.id&&a.id===n.id?!0:n.gcalId&&a.gcalId===n.gcalId||a.title===n.title&&((r=a.date)==null?void 0:r.split("T")[0])===((l=n.date)==null?void 0:l.split("T")[0])});if(o>=0)i.splice(o,1),await p.savePageContent(`collection_${e}`,{items:i}),e==="events"&&(this.clearPublicEventCache(),this.googleAccessToken&&n.gcalId&&await this.updateGoogleCalendarEvent(n,"DELETE"));else{this.showToast("Dette elementet kan ikke slettes da det hentes direkte fra Google Calendar.","error");return}this.loadCollection(e),this.showToast("✅ Element slettet!","success")}async renderDesignSection(){const e=document.getElementById("design-section");if(!e)return;e.innerHTML=`
                <div class="section-header">
                <h2 class="section-title">Design & Identitet</h2>
                <p class="section-subtitle">Administrer logo, favicon, fonter, globale farger og tekststørrelser.</p>
            </div>

                <div class="settings-grid">
                    <!-- Site Identity Card -->
                    <div class="settings-card">
                        <div class="settings-card-header">
                            <span class="material-symbols-outlined">fingerprint</span>
                            <h3>Nettstedsidentitet</h3>
                        </div>
                        <div class="settings-card-body">
                            <div class="form-group">
                                <label>Logo URL</label>
                                <input type="text" id="site-logo-url" class="form-control" placeholder="https://...">
                                    <div class="upload-row">
                                        <input type="file" id="site-logo-file" class="form-control file-input" accept="image/*">
                                            <button class="btn-secondary" id="upload-logo-btn" type="button">Last opp logo</button>
                                    </div>
                                    <div class="preview-container" id="logo-preview-container" style="margin-top: 15px;"></div>
                            </div>
                            <div class="form-group">
                                <label>Tekst ved siden av logo</label>
                                <input type="text" id="site-logo-text" class="form-control" placeholder="His Kingdom Ministry">
                            </div>
                            <div class="form-group">
                                <label>Favicon URL</label>
                                <input type="text" id="site-favicon-url" class="form-control" placeholder="https://...">
                                    <div class="upload-row">
                                        <input type="file" id="site-favicon-file" class="form-control file-input" accept="image/png,image/x-icon,image/svg+xml">
                                            <button class="btn-secondary" id="upload-favicon-btn" type="button">Last opp favicon</button>
                                    </div>
                                    <div class="preview-container" id="favicon-preview-container" style="margin-top: 15px;"></div>
                            </div>
                            <div class="form-group">
                                <label>Sidetittel (SEO)</label>
                                <input type="text" id="site-title-seo" class="form-control" placeholder="His Kingdom Ministry">
                            </div>
                        </div>
                    </div>

                    <!-- Typography Card -->
                    <div class="settings-card">
                        <div class="settings-card-header">
                            <span class="material-symbols-outlined">palette</span>
                            <h3>Typografi & Styling</h3>
                        </div>
                        <div class="settings-card-body">
                            <div class="form-group">
                                <label>Hovedfont (Google Fonts)</label>
                                <select id="main-font-select" class="form-control">
                                    <option value="Inter">Inter</option>
                                    <option value="DM Sans">DM Sans</option>
                                    <option value="Merriweather">Merriweather</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Open Sans">Open Sans</option>
                                    <option value="Montserrat">Montserrat</option>
                                    <option value="Outfit">Outfit</option>
                                </select>
                            </div>

                            <div class="premium-range-group">
                                <div class="premium-range-header">
                                    <label>H1 Størrelse (Desktop)</label>
                                    <span class="premium-range-val" id="font-size-h1-desktop-val">48px</span>
                                </div>
                                <input type="range" id="font-size-h1-desktop" class="premium-slider" min="24" max="80" value="48">
                            </div>

                            <div class="premium-range-group">
                                <div class="premium-range-header">
                                    <label>Brødtekst (Body Text)</label>
                                    <span class="premium-range-val" id="font-size-base-val">16px</span>
                                </div>
                                <input type="range" id="font-size-base" class="premium-slider" min="12" max="24" value="16">
                            </div>

                            <div class="form-group">
                                <label>Primærfarge</label>
                                <div class="premium-color-wrapper">
                                    <input type="color" id="primary-color-picker" class="premium-color-picker-input" value="#1a1a1a">
                                        <input type="text" id="primary-color-hex" class="premium-color-hex" value="#1a1a1a">
                                        </div>
                                </div>

                                <!-- Live Preview Area -->
                                <div class="live-preview-box" id="live-preview-area">
                                    <span class="preview-label">Live Forhåndsvisning</span>
                                    <h2 id="typography-preview-text">Slik ser teksten ut</h2>
                                    <p style="margin-top: 10px; opacity: 0.7;">Dette er et eksempel på brødtekst-størrelsen din.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 32px; display: flex; justify-content: flex-end;">
                        <button class="btn-primary" id="save-design-settings" style="padding: 14px 32px; font-size: 16px;">
                            <span class="material-symbols-outlined">auto_awesome</span> Lagre alle endringer
                        </button>
                    </div>
                    `,e.setAttribute("data-rendered","true");const t=()=>{const a=document.getElementById("main-font-select").value,r=document.getElementById("font-size-h1-desktop").value,l=document.getElementById("font-size-base").value,d=document.getElementById("primary-color-hex").value,c=document.getElementById("typography-preview-text"),u=document.getElementById("live-preview-area");c&&(c.style.fontFamily=`'${a}', sans-serif`,c.style.fontSize=`${r}px`,c.style.color=d),u&&(u.style.fontFamily=`'${a}', sans-serif`,u.querySelector("p").style.fontSize=`${l}px`)},s=a=>{const r=document.getElementById(a),l=document.getElementById(`${a}-val`);r.oninput=()=>{l.textContent=`${r.value}px`,t()}};s("font-size-base"),s("font-size-h1-desktop");const i=document.getElementById("main-font-select");i.onchange=t,((a,r)=>{const l=document.getElementById(a),d=document.getElementById(r);l.oninput=()=>{d.value=l.value.toUpperCase(),t()},d.oninput=()=>{l.value=d.value,t()}})("primary-color-picker","primary-color-hex");try{const a=await p.getPageContent("settings_design");a&&(a.logoUrl&&(document.getElementById("site-logo-url").value=a.logoUrl,this.updatePreview("logo-preview-container",a.logoUrl)),a.faviconUrl&&(document.getElementById("site-favicon-url").value=a.faviconUrl,this.updatePreview("favicon-preview-container",a.faviconUrl)),a.siteTitle&&(document.getElementById("site-title-seo").value=a.siteTitle),a.logoText&&(document.getElementById("site-logo-text").value=a.logoText),a.mainFont&&(document.getElementById("main-font-select").value=a.mainFont),a.fontSizeBase&&(document.getElementById("font-size-base").value=a.fontSizeBase,document.getElementById("font-size-base-val").textContent=`${a.fontSizeBase}px`),a.fontSizeH1Desktop&&(document.getElementById("font-size-h1-desktop").value=a.fontSizeH1Desktop,document.getElementById("font-size-h1-desktop-val").textContent=`${a.fontSizeH1Desktop}px`),a.primaryColor&&(document.getElementById("primary-color-picker").value=a.primaryColor,document.getElementById("primary-color-hex").value=a.primaryColor),t())}catch(a){console.error("Load design error:",a)}document.getElementById("save-design-settings").onclick=async()=>{const a=document.getElementById("save-design-settings"),r={logoUrl:document.getElementById("site-logo-url").value,faviconUrl:document.getElementById("site-favicon-url").value,logoText:document.getElementById("site-logo-text").value,siteTitle:document.getElementById("site-title-seo").value,mainFont:document.getElementById("main-font-select").value,fontSizeBase:document.getElementById("font-size-base").value,fontSizeH1Desktop:document.getElementById("font-size-h1-desktop").value,primaryColor:document.getElementById("primary-color-hex").value,updatedAt:new Date().toISOString()};a.textContent="Lagrer...",a.disabled=!0;try{await p.savePageContent("settings_design",r),this.showToast("✅ Design-innstillinger er lagret!","success",5e3)}catch{this.showToast("❌ Feil ved lagring","error",5e3)}finally{a.textContent="Lagre alle endringer",a.disabled=!1}},document.getElementById("site-logo-url").onchange=a=>this.updatePreview("logo-preview-container",a.target.value),document.getElementById("site-favicon-url").onchange=a=>this.updatePreview("favicon-preview-container",a.target.value);const o=(a,r,l,d,c,u)=>{const m=document.getElementById(a),v=document.getElementById(r),g=document.getElementById(l);!m||!v||!g||(v.onclick=async()=>{if(!p.isInitialized){this.showToast("Firebase er ikke konfigurert. Kan ikke laste opp.","error",5e3);return}const w=m.files&&m.files[0];if(!w){this.showToast("Velg en fil for opplasting.","warning",3e3);return}v.disabled=!0,v.textContent="Laster opp...";try{const x=w.name.replace(/[^a-zA-Z0-9._-]/g,"_"),h=`${c}/${Date.now()}-${x}`,b=await p.uploadImage(w,h);g.value=b,this.updatePreview(d,b)}catch(x){console.error("Upload error:",x),this.showToast("Feil ved opplasting. Prøv igjen.","error",5e3)}finally{v.disabled=!1,v.textContent=u}})};o("site-logo-file","upload-logo-btn","site-logo-url","logo-preview-container","branding/logo","Last opp logo"),o("site-favicon-file","upload-favicon-btn","site-favicon-url","favicon-preview-container","branding/favicon","Last opp favicon")}updatePreview(e,t){const s=document.getElementById(e);t&&t.startsWith("http")?s.innerHTML=`<img src="${t}" class="preview-img" style="margin-top: 10px; max-height: 100px; border-radius: 4px; border: 1px solid #ddd;">`:s.innerHTML=""}async renderCausesManager(){const e=document.getElementById("causes-section");if(!e)return;let t=0,s=0,i=0;try{if(p.db){const a=await p.db.collection("donations").get();s=a.size,a.empty||a.forEach(r=>{const l=r.data();l.amount&&(t+=l.amount/100)}),s>0&&(i=t/s)}}catch(a){console.warn("Kunne ikke hente donasjoner for Gaver-siden:",a)}const n=t.toLocaleString("no-NO",{style:"currency",currency:"NOK",maximumFractionDigits:0}),o=i.toLocaleString("no-NO",{style:"currency",currency:"NOK",maximumFractionDigits:0});e.innerHTML=`
                    <div class="section-header">
                        <h2 class="section-title">Gaver & Donasjoner</h2>
                        <p class="section-subtitle">Oversikt over alle inntekter og aktive innsamlingsaksjoner.</p>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card modern">
                            <div class="stat-icon-wrap donation">
                                <span class="material-symbols-outlined">payments</span>
                            </div>
                            <div class="stat-content">
                                <h3 class="stat-label">Totalt donert</h3>
                                <p class="stat-value">${n}</p>
                                <span class="stat-meta">Via nettsiden</span>
                            </div>
                        </div>

                        <div class="stat-card modern">
                            <div class="stat-icon-wrap blue">
                                <span class="material-symbols-outlined">volunteer_activism</span>
                            </div>
                            <div class="stat-content">
                                <h3 class="stat-label">Antall gaver</h3>
                                <p class="stat-value">${s}</p>
                                <span class="stat-meta">Registrerte transaksjoner</span>
                            </div>
                        </div>

                        <div class="stat-card modern">
                            <div class="stat-icon-wrap mint">
                                <span class="material-symbols-outlined">trending_up</span>
                            </div>
                            <div class="stat-content">
                                <h3 class="stat-label">Snittgave</h3>
                                <p class="stat-value">${o}</p>
                                <span class="stat-meta">Per donasjon</span>
                            </div>
                        </div>

                        <div class="stat-card modern">
                            <div class="stat-icon-wrap purple">
                                <span class="material-symbols-outlined">pie_chart</span>
                            </div>
                            <div class="stat-content">
                                <h3 class="stat-label">Konvertering</h3>
                                <p class="stat-value">-- %</p>
                                <span class="stat-meta">Besøkende til givere</span>
                            </div>
                        </div>
                    </div>

                    <div class="card">
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

                    <div id="cause-form-modal" style="display: none;">
                        <div class="modal-backdrop" onclick="document.getElementById('cause-form-modal').style.display = 'none'"></div>
                        <div class="modal-content" style="max-width: 600px;">
                            <div class="modal-header">
                                <h3 id="form-title">Ny innsamlingsaksjon</h3>
                                <button class="modal-close" onclick="document.getElementById('cause-form-modal').style.display = 'none'">×</button>
                            </div>
                            <div class="modal-body">
                                <div class="form-group">
                                    <label>Tittel</label>
                                    <input type="text" id="cause-title" class="form-control" placeholder="f.eks. Støtt vårt arbeid">
                                </div>
                                <div class="form-group">
                                    <label>Beskrivelse</label>
                                    <textarea id="cause-description" class="form-control" style="height: 100px;" placeholder="Beskriv hva innsamlingen er for..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label>Innsamlet beløp (kr)</label>
                                    <input type="number" id="cause-collected" class="form-control" placeholder="0" value="0">
                                </div>
                                <div class="form-group">
                                    <label>Målbeløp (kr)</label>
                                    <input type="number" id="cause-goal" class="form-control" placeholder="100000" value="100000">
                                </div>
                                <div class="form-group">
                                    <label>Bildekilde (URL)</label>
                                    <input type="url" id="cause-image" class="form-control" placeholder="https://images.unsplash.com/...">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn-secondary" onclick="document.getElementById('cause-form-modal').style.display = 'none'">Avbryt</button>
                                <button class="btn-primary" id="save-cause-btn">Lagre</button>
                            </div>
                        </div>
                    </div>
                    `,e.setAttribute("data-rendered","true"),await this.loadCauses(),document.getElementById("add-cause-btn").addEventListener("click",()=>{document.getElementById("form-title").textContent="Ny innsamlingsaksjon",document.getElementById("cause-title").value="",document.getElementById("cause-description").value="",document.getElementById("cause-collected").value="0",document.getElementById("cause-goal").value="100000",document.getElementById("cause-image").value="",document.getElementById("cause-form-modal").dataset.editId="",document.getElementById("cause-form-modal").style.display="flex"}),document.getElementById("save-cause-btn").addEventListener("click",()=>this.saveCause())}async loadCauses(){const e=document.getElementById("causes-list");if(e)try{const t=await p.getPageContent("collection_causes"),s=t&&Array.isArray(t.items)?t.items:[];if(s.length===0){e.innerHTML=`
                    <div class="empty-state-container">
                        <span class="material-symbols-outlined empty-state-icon">volunteer_activism</span>
                        <p class="empty-state-text">Ingen innsamlingsaksjoner er opprettet ennå.</p>
                        <button class="btn-primary" style="margin: 0 auto;" onclick="document.getElementById('add-cause-btn').click()">
                            Opprett din første aksjon
                        </button>
                    </div>
                `;return}const i=s.map((n,o)=>{const a=n.collected||0,r=n.goal||1e5,l=r>0?Math.round(a/r*100):0;return`
                    <div class="cause-item">
                        <div class="cause-header-row">
                            <div class="cause-title-wrap">
                                <h4 class="cause-title-text">${n.title||"Uten tittel"}</h4>
                                <p class="cause-desc-text">${n.description||""}</p>
                            </div>
                            <div class="cause-actions-wrap">
                                <button class="action-btn edit-cause-btn" data-index="${o}" title="Rediger">
                                    <span class="material-symbols-outlined" style="pointer-events: none;">edit</span>
                                </button>
                                <button class="action-btn delete-cause-btn" data-index="${o}" title="Slett" style="color: #ef4444;">
                                    <span class="material-symbols-outlined" style="pointer-events: none;">delete</span>
                                </button>
                            </div>
                        </div>
                        <div class="cause-stats-row">
                            <div class="cause-stat-unit">
                                <span class="cause-stat-label">Samlet inn</span>
                                <span class="cause-stat-number success">${parseInt(a).toLocaleString("no-NO")} kr</span>
                            </div>
                            <div class="cause-stat-unit">
                                <span class="cause-stat-label">Mål</span>
                                <span class="cause-stat-number">${parseInt(r).toLocaleString("no-NO")} kr</span>
                            </div>
                            <div class="cause-stat-unit">
                                <span class="cause-stat-label">Progresjon</span>
                                <span class="cause-stat-number highlight">${l}%</span>
                            </div>
                        </div>
                        <div class="progress-bar-wrap" style="margin-top: 16px;">
                            <div class="progress-bar" style="width: ${Math.min(l,100)}%;"></div>
                        </div>
                    </div>
                    `}).join("");e.innerHTML=i,document.querySelectorAll(".edit-cause-btn").forEach(n=>{n.addEventListener("click",o=>this.editCause(parseInt(o.target.dataset.index)))}),document.querySelectorAll(".delete-cause-btn").forEach(n=>{n.addEventListener("click",o=>this.deleteCause(parseInt(o.target.dataset.index)))})}catch(t){console.error("Error loading causes:",t),e.innerHTML='<p style="color:#ef4444;">Feil ved lasting av innsamlingsaksjoner.</p>'}}async saveCause(){const e=document.getElementById("cause-title").value.trim(),t=document.getElementById("cause-description").value.trim(),s=parseInt(document.getElementById("cause-collected").value)||0,i=parseInt(document.getElementById("cause-goal").value)||1e5,n=document.getElementById("cause-image").value.trim(),o=document.getElementById("cause-form-modal").dataset.editId;if(!e){this.showToast("Tittel er påkrevd","warning",3e3);return}try{let a=await p.getPageContent("collection_causes"),r=a&&Array.isArray(a.items)?a.items:[];const l={title:e,description:t,collected:s,goal:i,image:n};o!==""?r[parseInt(o)]=l:r.push(l),await p.savePageContent("collection_causes",{items:r}),document.getElementById("cause-form-modal").style.display="none",await this.loadCauses(),this.showToast("✅ Innsamlingsaksjon lagret!","success")}catch(a){console.error("Error saving cause:",a),this.showToast("Feil ved lagring av innsamlingsaksjon","error",5e3)}}editCause(e){document.getElementById("causes-list"),p.getPageContent("collection_causes").then(async t=>{const s=t&&Array.isArray(t.items)?t.items:[];if(s[e]){const i=s[e];document.getElementById("form-title").textContent="Rediger innsamlingsaksjon",document.getElementById("cause-title").value=i.title||"",document.getElementById("cause-description").value=i.description||"",document.getElementById("cause-collected").value=i.collected||0,document.getElementById("cause-goal").value=i.goal||1e5,document.getElementById("cause-image").value=i.image||"",document.getElementById("cause-form-modal").dataset.editId=e,document.getElementById("cause-form-modal").style.display="flex"}})}async deleteCause(e){if(confirm("Er du sikker på at du vil slette denne innsamlingsaksjon?"))try{let t=await p.getPageContent("collection_causes"),s=t&&Array.isArray(t.items)?t.items:[];s.splice(e,1),await p.savePageContent("collection_causes",{items:s}),await this.loadCauses(),this.showToast("✅ Innsamlingsaksjon slettet!","success")}catch(t){console.error("Error deleting cause:",t),this.showToast("Feil ved sletting av innsamlingsaksjon","error",5e3)}}async renderHeroManager(){const e=document.getElementById("hero-section");e&&(e.innerHTML=`
                    <div class="section-header flex-between">
                        <div>
                            <h2 class="section-title">Forside-innhold</h2>
                            <p class="section-subtitle">Administrer slides og statistikk på forsiden.</p>
                        </div>
                        <button class="btn-primary" id="add-hero-slide">
                            <span class="material-symbols-outlined">add</span> Ny Slide
                        </button>
                    </div>

                    <div class="collection-grid" id="hero-slides-list">
                        <div class="loader">Laster slides...</div>
                    </div>

                    <div class="section-header" style="margin-top: 40px; border-top: 1px solid #e2e8f0; pt-4">
                        <div style="padding-top: 24px;">
                            <h3 class="section-title">Nøkkeltall (Forside-statistikk)</h3>
                            <p class="section-subtitle">Rediger tallene som vises i "Funfacts"-seksjonen på forsiden.</p>
                        </div>
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
                    `,e.setAttribute("data-rendered","true"),document.getElementById("add-hero-slide").onclick=()=>this.editHeroSlide(),this.loadHeroSlides(),this.loadIndexStats(),document.getElementById("stats-form").onsubmit=async t=>{t.preventDefault(),await this.saveIndexStats()})}async loadHeroSlides(){const e=document.getElementById("hero-slides-list");if(e)try{const t=await p.getPageContent("hero_slides");this.heroSlides=t?t.slides||[]:[],this.renderHeroSlides(this.heroSlides)}catch{e.innerHTML="<p>Kunne ikke laste slides.</p>",this.showToast("Kunne ikke laste slides.","error",5e3)}}async loadIndexStats(){try{const e=await p.getPageContent("index");if(e&&e.stats){const t=e.stats;document.getElementById("stat-countries")&&(document.getElementById("stat-countries").value=t.countries_visited||""),document.getElementById("stat-podcast")&&(document.getElementById("stat-podcast").value=t.podcast_episodes||""),document.getElementById("stat-yt-videos")&&(document.getElementById("stat-yt-videos").value=t.youtube_videos||""),document.getElementById("stat-yt-views")&&(document.getElementById("stat-yt-views").value=t.youtube_views||"")}}catch(e){console.error("Kunne ikke laste statistikk:",e)}}async saveIndexStats(){const e=document.getElementById("save-stats-btn"),t=e.innerHTML;e.disabled=!0,e.innerHTML='<span class="material-symbols-outlined">sync</span> Lagrer...';try{const s=document.getElementById("stat-countries").value,i=document.getElementById("stat-podcast").value,n=document.getElementById("stat-yt-videos").value,o=document.getElementById("stat-yt-views").value;let a={};try{a=await p.getPageContent("index")||{}}catch{}a.stats={countries_visited:s,podcast_episodes:i,youtube_videos:n,youtube_views:o},await p.savePageContent("index",a),this.showToast("🚀 Statistikk er nå oppdatert på forsiden!","success",5e3)}catch(s){console.error("Feil ved lagring av statistikk:",s),this.showToast("Kunne ikke lagre statistikk.","error",5e3)}finally{e.disabled=!1,e.innerHTML=t}}async renderProfileSection(){const e=document.getElementById("profile-section");if(!e)return;const t=p.auth&&p.auth.currentUser?p.auth.currentUser:null;if(!t)return;e.innerHTML=`
                    <div style="width: 100%; margin: 0 auto; padding: 0 16px;">
                        <div class="card" style="padding: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                                <h3>Min Profil</h3>
                                <span class="badge" style="font-size: 0.9rem; padding: 6px 12px;">Medlem siden 2024</span>
                            </div>

                            <div style="background: white; border-bottom: 1px solid var(--border-color); padding-bottom: 30px; margin-bottom: 30px; display: flex; align-items: center; gap: 24px;">
                                <div id="profile-picture-container-admin" style="position: relative; width: 100px; height: 100px; border-radius: 50%; background: #D17D39; display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem; font-weight: 700; overflow: hidden; border: 4px solid white; box-shadow: var(--shadow);">
                                    ${t.photoURL?`<img src="${t.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`:(t.displayName||t.email||"?").charAt(0).toUpperCase()}
                                    <label for="profile-upload-admin" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; opacity: 0; transition: opacity 0.3s ease; cursor: pointer;">
                                        <span class="material-symbols-outlined">photo_camera</span>
                                    </label>
                                    <input type="file" id="profile-upload-admin" style="display: none;" accept="image/*">
                                </div>
                                <div>
                                    <h4 style="margin-bottom: 4px;">Profilbilde</h4>
                                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Last opp et bilde fra din enhet eller bruk bildet fra Google.</p>
                                    <div style="display: flex; gap: 10px;">
                                        <button type="button" id="upload-profile-btn-admin" style="padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border-color); background: white; border-radius: 8px; cursor: pointer;">Last opp nytt</button>
                                        ${Array.isArray(t.providerData)&&t.providerData.some(h=>h&&h.providerId==="google.com")?'<button type="button" id="google-photo-btn-admin" style="padding: 6px 12px; font-size: 0.85rem; border: 1px solid var(--border-color); background: white; border-radius: 8px; cursor: pointer;">Hent fra Google</button>':""}
                                    </div>
                                </div>
                            </div>

                            <form id="admin-profile-full-form">
                                <h4 style="margin-bottom: 16px; color: #D17D39; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personalia</h4>
                                <div class="form-grid-2" style="gap: 20px; margin-bottom: 20px;">
                                    <div>
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Navn</label>
                                        <input type="text" name="displayName" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Telefon</label>
                                        <input type="tel" name="phone" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                                    </div>
                                    <div style="grid-column: span 2;">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">E-post</label>
                                        <input type="email" name="email" disabled style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: #f8fafc; color: #64748b;">
                                    </div>
                                </div>

                                <h4 style="margin-bottom: 16px; color: #D17D39; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Adresse</h4>
                                <div class="form-grid-2" style="gap: 20px; margin-bottom: 20px;">
                                    <div style="grid-column: span 2;">
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Gateadresse</label>
                                        <input type="text" name="address" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Postnummer</label>
                                        <input type="text" name="zip" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                                    </div>
                                    <div>
                                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Sted</label>
                                        <input type="text" name="city" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;">
                                    </div>
                                </div>

                                <h4 style="margin-bottom: 16px; color: #D17D39; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Kommunikasjon</h4>
                                <div style="margin-bottom: 30px;">
                                    <label style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; cursor: pointer;">
                                        <input type="checkbox" name="newsletter" style="width: 18px; height: 18px; accent-color: #D17D39;">
                                            <span>Motta nyhetsbrev på e-post</span>
                                    </label>
                                </div>

                                <h4 style="margin-bottom: 16px; color: #D17D39; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Personvern & Samtykke</h4>
                                <div id="admin-consent-status-display" style="padding: 15px; background: #f1f5f9; border-radius: 8px; margin-bottom: 30px;">
                                    <div class="loader">Henter samtykkestatus...</div>
                                </div>

                                <div style="display: flex; gap: 16px; align-items: center; border-top: 1px solid var(--border-color); padding-top: 24px;">
                                    <button type="submit" id="save-profile-btn" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; border:none; border-radius:10px; padding:12px 16px; color:#fff; font-weight:600; cursor:pointer; background: linear-gradient(135deg, #D17D39, #B54D2B);">
                                        <span class="material-symbols-outlined">save</span> Lagre endringer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    `,e.setAttribute("data-rendered","true");const s=await p.getPageContent("settings_profile");let i=null;try{const h=await firebase.firestore().collection("users").doc(t.uid).get();h.exists&&(i=h.data())}catch(h){console.warn("Kunne ikke hente users-profil i admin:",h)}const n=i&&i.displayName||t&&t.displayName||s&&s.fullName||"",o=i&&i.photoURL||t.photoURL||s&&s.photoUrl||"",a=i&&i.address||s&&s.address||"",r=i&&i.zip||s&&s.zip||"",l=i&&i.city||s&&s.city||"",d=i&&i.phone||s&&s.phone||"",c=i&&i.bio||s&&s.bio||"",u=i&&typeof i.newsletter=="boolean"?i.newsletter:!0,m=document.getElementById("admin-profile-full-form");if(!m)return;m.querySelector('[name="displayName"]').value=n,m.querySelector('[name="email"]').value=t.email||"",m.querySelector('[name="address"]').value=a,m.querySelector('[name="zip"]').value=r,m.querySelector('[name="city"]').value=l,m.querySelector('[name="phone"]').value=d,m.querySelector('[name="newsletter"]').checked=u;const v=document.getElementById("profile-picture-container-admin");if(o){const h=v.querySelector('label[for="profile-upload-admin"]'),b=v.querySelector("#profile-upload-admin");v.innerHTML=`<img src="${o}" style="width: 100%; height: 100%; object-fit: cover;">`,h&&v.appendChild(h),b&&v.appendChild(b)}try{const h=document.getElementById("admin-consent-status-display"),b=await firebase.firestore().collection("users").doc(t.uid).get();if(h)if(b.exists&&b.data().privacySettings){const f=b.data().privacySettings.choices||{};h.innerHTML=`
                        <p style="font-size: 0.95rem; line-height: 1.5;">
                            <strong>Aktivt samtykke:</strong><br>
                                Nødvendige: <span style="color: green;">Ja</span><br>
                                    Statistikk: ${f.analytics?'<span style="color: green;">Ja</span>':'<span style="color: red;">Nei</span>'}<br>
                                        Markedsføring: ${f.marketing?'<span style="color: green;">Ja</span>':'<span style="color: red;">Nei</span>'}
                                    </p>
                                    `}else h.innerHTML='<p style="font-size: 0.95rem;">Ingen lagret samtykkestatus funnet.</p>'}catch{const b=document.getElementById("admin-consent-status-display");b&&(b.textContent="Kunne ikke hente samtykkestatus.")}const g=document.getElementById("profile-upload-admin"),w=document.getElementById("upload-profile-btn-admin");w&&g&&(w.onclick=()=>g.click()),g.onchange=async()=>{if(g.files.length!==0){w.disabled=!0,w.textContent="Laster opp...";try{const h=await p.uploadImage(g.files[0],`profiles/${t.uid}/avatar.jpg`);await t.updateProfile({photoURL:h}),await firebase.firestore().collection("users").doc(t.uid).set({photoURL:h,displayName:m.querySelector('[name="displayName"]').value||t.displayName||"",email:t.email||"",updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:!0}),await p.savePageContent("settings_profile",{fullName:m.querySelector('[name="displayName"]').value||t.displayName||"",photoUrl:h,updatedAt:new Date().toISOString()});const b=v.querySelector('label[for="profile-upload-admin"]'),f=v.querySelector("#profile-upload-admin");v.innerHTML=`<img src="${h}" style="width: 100%; height: 100%; object-fit: cover;">`,b&&v.appendChild(b),f&&v.appendChild(f),await this.updateUserInfo(t),this.showToast("Profilbilde oppdatert.","success",4e3)}catch(h){this.showToast("Opplasting feilet: "+h.message,"error",6e3)}finally{w.disabled=!1,w.textContent="Last opp nytt"}}};const x=document.getElementById("google-photo-btn-admin");x&&(x.onclick=async()=>{const h=(t.providerData||[]).find(b=>b&&b.providerId==="google.com");if(!(!h||!h.photoURL))try{await t.updateProfile({photoURL:h.photoURL}),await firebase.firestore().collection("users").doc(t.uid).set({photoURL:h.photoURL,displayName:m.querySelector('[name="displayName"]').value||t.displayName||h.displayName||"",email:t.email||"",updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:!0}),await p.savePageContent("settings_profile",{fullName:m.querySelector('[name="displayName"]').value||t.displayName||h.displayName||"",photoUrl:h.photoURL,updatedAt:new Date().toISOString()}),await this.renderProfileSection(),await this.updateUserInfo(t),this.showToast("Profilbilde hentet fra Google.","success",4e3)}catch{this.showToast("Kunne ikke hente bilde fra Google.","error",5e3)}}),m.onsubmit=async h=>{h.preventDefault();const b=document.getElementById("save-profile-btn"),f={fullName:m.querySelector('[name="displayName"]').value||"",address:m.querySelector('[name="address"]').value||"",zip:m.querySelector('[name="zip"]').value||"",city:m.querySelector('[name="city"]').value||"",phone:m.querySelector('[name="phone"]').value||"",bio:c||"",newsletter:m.querySelector('[name="newsletter"]').checked,photoUrl:t.photoURL||o||"",updatedAt:new Date().toISOString()},L=b.textContent;b.textContent="Lagrer...",b.disabled=!0;try{const $={};f.fullName&&f.fullName!==t.displayName&&($.displayName=f.fullName),Object.keys($).length>0&&await t.updateProfile($),await firebase.firestore().collection("users").doc(t.uid).set({displayName:f.fullName,address:f.address,zip:f.zip,city:f.city,phone:f.phone,bio:f.bio,newsletter:f.newsletter,photoURL:f.photoUrl,email:t.email||"",updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:!0}),await p.savePageContent("settings_profile",f),this.showToast("✅ Profilen er lagret!","success",5e3),await this.updateUserInfo(t)}catch($){console.error($),this.showToast("❌ Feil ved lagring","error",5e3)}finally{b.textContent=L,b.disabled=!1}}}renderHeroSlides(e){const t=document.getElementById("hero-slides-list");if(e.length===0){t.innerHTML='<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">Ingen slides ennå. Legg til din første!</p>';return}t.innerHTML=e.map((s,i)=>`
                                        <div class="item-card">
                                            <div class="item-thumb">
                                                <img src="${s.imageUrl||"https://via.placeholder.com/400x225?text=Ingen+bilde"}" alt="Slide Thumb">
                                            </div>
                                            <div class="item-content">
                                                <h4 style="margin-bottom: 4px;">${s.title||"Uten tittel"}</h4>
                                                <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">${s.subtitle||""}</p>
                                                <div class="item-actions">
                                                    <button class="icon-btn" onclick="adminManager.editHeroSlide(${i})">
                                                        <span class="material-symbols-outlined">edit</span>
                                                    </button>
                                                    <button class="icon-btn delete" onclick="adminManager.deleteHeroSlide(${i})">
                                                        <span class="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        `).join("")}async editHeroSlide(e=-1){const t=e===-1,s=t?{title:"",subtitle:"",imageUrl:"",btnText:"",btnLink:""}:this.heroSlides[e],i=document.createElement("div");i.className="dashboard-modal",i.innerHTML=`
                                        <div class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                                            <div class="card" style="width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                                                <div class="card-header flex-between">
                                                    <h3 class="card-title">${t?"Legg til ny slide":"Rediger slide"}</h3>
                                                    <button class="icon-btn" id="close-modal"><span class="material-symbols-outlined">close</span></button>
                                                </div>
                                                <div class="card-body">
                                                    <div class="form-group">
                                                        <label>Bilde URL / Last opp</label>
                                                        <div style="display: flex; gap: 8px;">
                                                            <input type="text" id="slide-img-url" class="form-control" value="${s.imageUrl||""}" style="flex: 1;">
                                                                <button class="btn-primary" id="upload-slide-img" style="padding: 0 12px;"><span class="material-symbols-outlined">upload</span></button>
                                                                <input type="file" id="slide-file-input" style="display: none;" accept="image/*">
                                                                </div>
                                                        </div>
                                                        <div class="form-group">
                                                            <label>Overskrift</label>
                                                            <input type="text" id="slide-title" class="form-control" value="${s.title||""}">
                                                        </div>
                                                        <div class="form-group">
                                                            <label>Undertekst</label>
                                                            <textarea id="slide-subtitle" class="form-control" style="height: 80px;">${s.subtitle||""}</textarea>
                                                        </div>
                                                        <div class="form-group">
                                                            <label>Knapptekst</label>
                                                            <input type="text" id="slide-btn-text" class="form-control" value="${s.btnText||""}">
                                                        </div>
                                                        <div class="form-group">
                                                            <label>Knapp-lenke</label>
                                                            <input type="text" id="slide-btn-link" class="form-control" value="${s.btnLink||""}">
                                                        </div>
                                                        <div style="margin-top: 24px;">
                                                            <button class="btn-primary" style="width: 100%;" id="save-slide-btn">Lagre slide</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            `,document.body.appendChild(i);const n=document.getElementById("slide-img-url"),o=document.getElementById("slide-file-input"),a=document.getElementById("upload-slide-img");a.onclick=()=>o.click(),o.onchange=async()=>{if(o.files.length!==0){a.disabled=!0,a.innerHTML='<span class="material-symbols-outlined rotating">sync</span>';try{const r=await p.uploadImage(o.files[0],`hero/${Date.now()}_${o.files[0].name}`);n.value=r}catch(r){this.showToast("Opplasting feilet: "+r.message,"error",5e3)}finally{a.disabled=!1,a.innerHTML='<span class="material-symbols-outlined">upload</span> Last opp nytt bilde'}}},document.getElementById("close-modal").onclick=()=>i.remove(),document.getElementById("save-slide-btn").onclick=async()=>{const r=document.getElementById("save-slide-btn"),l={imageUrl:document.getElementById("slide-img-url").value,title:document.getElementById("slide-title").value,subtitle:document.getElementById("slide-subtitle").value,btnText:document.getElementById("slide-btn-text").value,btnLink:document.getElementById("slide-btn-link").value};r.textContent="Lagrer...",r.disabled=!0,t?this.heroSlides.push(l):this.heroSlides[e]=l;try{await p.savePageContent("hero_slides",{slides:this.heroSlides}),i.remove(),this.renderHeroSlides(this.heroSlides),this.showToast("✅ Slide lagret!","success")}catch{this.showToast("Feil ved lagring","error",5e3),r.textContent="Lagre slide",r.disabled=!1}}}async deleteHeroSlide(e){if(confirm("Vil du slette denne sliden?")){this.heroSlides.splice(e,1);try{await p.savePageContent("hero_slides",{slides:this.heroSlides}),this.renderHeroSlides(this.heroSlides),this.showToast("✅ Slettet!","success")}catch{this.showToast("❌ Feil ved sletting","error",5e3)}}}async renderTeachingManager(){this.renderCollectionEditor("teaching","Undervisning")}async renderCoursesManager(){const e=document.getElementById("courses-section");e&&(e.innerHTML=`
            <div class="section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <div>
                    <h2 class="section-title">Kursadministrasjon</h2>
                    <p class="section-subtitle">Opprett og administrer kurs med leksjoner – Udemy-stil.</p>
                </div>
                <button class="btn-primary" id="new-course-btn" style="display:none;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;">
                    <span class="material-symbols-outlined" style="font-size:1.1rem;">add</span> Nytt kurs
                </button>
            </div>

            <div id="courses-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;margin-bottom:32px;">
                <div class="loader" style="grid-column:1/-1;text-align:center;padding:40px;color:#94a3b8;">Laster kurs...</div>
            </div>

            <!-- Course Modal -->
            <div id="course-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;overflow-y:auto;padding:20px;">
                <div style="background:white;border-radius:16px;max-width:780px;margin:20px auto;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                        <h3 id="course-modal-title" style="font-size:1.4rem;font-weight:700;">Nytt kurs</h3>
                        <button id="close-course-modal" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:1.5rem;">✕</button>
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
                                <select id="course-category" style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;background:white;">
                                    <option value="Bibelstudium">Bibelstudium</option>
                                    <option value="Bønn">Bønn</option>
                                    <option value="Lederskap">Lederskap</option>
                                    <option value="Helbredelse">Helbredelse</option>
                                    <option value="Evangelisering">Evangelisering</option>
                                    <option value="Identitet">Identitet</option>
                                    <option value="Annet">Annet</option>
                                </select>
                            </div>
                            <div>
                                <label style="display:block;font-weight:600;margin-bottom:6px;">Pris (NOK) – 0 = gratis</label>
                                <input id="course-price" type="number" min="0" placeholder="0" value="0"
                                    style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                            </div>
                            <div style="grid-column:span 2;">
                                <label style="display:block;font-weight:600;margin-bottom:6px;">Forsidebilde URL</label>
                                <input id="course-image" type="url" placeholder="https://..."
                                    style="width:100%;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:1rem;">
                            </div>
                        </div>

                        <!-- Lessons -->
                        <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:4px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                                <h4 style="font-size:1rem;font-weight:700;">Leksjoner</h4>
                                <button type="button" id="add-lesson-btn" style="background:#fff8f0;color:#e07b39;border:1.5px solid #ffd5b0;padding:7px 14px;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                                    <span class="material-symbols-outlined" style="font-size:1rem;">add</span> Legg til leksjon
                                </button>
                            </div>
                            <div id="lessons-container" style="display:flex;flex-direction:column;gap:12px;"></div>
                        </div>

                        <div style="display:flex;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
                            <button type="submit" id="save-course-btn" class="btn-primary" style="padding:12px 28px;border-radius:10px;font-weight:600;display:flex;align-items:center;gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:1rem;">save</span> Lagre kurs
                            </button>
                            <button type="button" id="delete-course-btn" style="display:none;padding:12px 20px;border-radius:10px;background:white;color:#ef4444;border:1.5px solid #fee2e2;font-weight:600;cursor:pointer;">
                                Slett kurs
                            </button>
                        </div>
                        <p id="course-save-status" style="margin-top:12px;font-size:0.85rem;"></p>
                    </form>
                </div>
            </div>
        `,await this._loadCoursesList(),document.getElementById("new-course-btn").addEventListener("click",()=>this._openCourseModal()),document.getElementById("close-course-modal").addEventListener("click",()=>this._closeCourseModal()),document.getElementById("course-modal").addEventListener("click",t=>{t.target===document.getElementById("course-modal")&&this._closeCourseModal()}),document.getElementById("add-lesson-btn").addEventListener("click",()=>this._addLessonRow()),document.getElementById("course-form").addEventListener("submit",t=>{t.preventDefault(),this._saveCourse()}),document.getElementById("delete-course-btn").addEventListener("click",()=>this._deleteCourse()))}async _loadCoursesList(){var t;const e=document.getElementById("courses-list");if(e)try{const s=await firebase.firestore().collection("siteContent").doc("collection_courses").get(),i=(s.exists?(t=s.data())==null?void 0:t.items:null)||[];if(i.length===0){e.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:#f8fafc;border-radius:16px;border:2px dashed #e2e8f0;">
                    <span class="material-symbols-outlined" style="font-size:48px;color:#94a3b8;display:block;margin-bottom:12px;">menu_book</span>
                    <p style="color:#64748b;font-size:1rem;">Ingen kurs opprettet ennå. Klikk "Nytt kurs" for å komme i gang.</p>
                </div>`;return}e.innerHTML=i.map((n,o)=>`
                <div style="background:white;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;transition:box-shadow .2s;"
                     onmouseover="this.style.boxShadow='0 8px 30px rgba(0,0,0,0.12)'" onmouseout="this.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)'">
                    <div style="height:150px;background:${n.imageUrl?`url('${n.imageUrl}') center/cover`:"linear-gradient(135deg,#f39c12,#e74c3c)"};position:relative;">
                        ${n.price>0?`<span style="position:absolute;top:10px;right:10px;background:#f39c12;color:white;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">kr ${n.price},-</span>`:'<span style="position:absolute;top:10px;right:10px;background:#10b981;color:white;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;">Gratis</span>'}
                        ${n.category?`<span style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.5);color:white;font-size:11px;padding:3px 10px;border-radius:20px;">${n.category}</span>`:""}
                    </div>
                    <div style="padding:18px;">
                        <h4 style="margin-bottom:6px;font-size:1rem;">${n.title||"Uten tittel"}</h4>
                        <p style="color:#64748b;font-size:0.85rem;margin-bottom:12px;line-height:1.4;">${(n.description||"").substring(0,80)}${(n.description||"").length>80?"...":""}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:0.8rem;color:#94a3b8;">${(n.lessons||[]).length} leksjoner</span>
                            <button onclick="window.adminApp._openCourseModal(${o})" style="background:#f1f5f9;color:#334155;border:none;padding:7px 14px;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">Rediger</button>
                        </div>
                    </div>
                </div>
            `).join("")}catch(s){console.error("Kurs-feil:",s),e&&(e.innerHTML='<p style="color:#ef4444;">Kunne ikke laste kurs.</p>')}}async _openCourseModal(e=null){var a;const t=document.getElementById("course-modal"),s=document.getElementById("course-modal-title"),i=document.getElementById("delete-course-btn"),n=document.getElementById("lessons-container"),o=document.getElementById("course-save-status");if(document.getElementById("course-form").reset(),document.getElementById("course-id").value="",document.getElementById("course-price").value="0",n.innerHTML="",o&&(o.textContent=""),e!==null){s.textContent="Rediger kurs",i.style.display="inline-flex";try{const r=await firebase.firestore().collection("siteContent").doc("collection_courses").get(),d=((r.exists?(a=r.data())==null?void 0:a.items:null)||[])[e];if(!d)return;document.getElementById("course-id").value=e,document.getElementById("course-title").value=d.title||"",document.getElementById("course-description").value=d.description||"",document.getElementById("course-category").value=d.category||"Bibelstudium",document.getElementById("course-price").value=d.price||0,document.getElementById("course-image").value=d.imageUrl||"",(d.lessons||[]).forEach(c=>this._addLessonRow(c.title,c.videoUrl))}catch(r){console.error(r)}}else s.textContent="Nytt kurs",i.style.display="none",this._addLessonRow();t.style.display="block"}_closeCourseModal(){const e=document.getElementById("course-modal");e&&(e.style.display="none")}_addLessonRow(e="",t=""){const s=document.getElementById("lessons-container");if(!s)return;const i=s.children.length+1,n=document.createElement("div");n.style.cssText="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;",n.innerHTML=`
            <input type="text" placeholder="Leksjon ${i}: Tittel" value="${e}"
                style="padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;" class="lesson-title">
            <input type="url" placeholder="YouTube/Vimeo URL" value="${t}"
                style="padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.9rem;" class="lesson-video">
            <button type="button" style="background:#fee2e2;color:#ef4444;border:none;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:1.1rem;flex-shrink:0;"
                onclick="this.closest('div').remove()">✕</button>
        `,s.appendChild(n)}async _saveCourse(){var o;const e=document.getElementById("save-course-btn"),t=document.getElementById("course-save-status"),s=document.getElementById("course-id").value,i=[];document.querySelectorAll("#lessons-container > div").forEach(a=>{var d,c,u,m;const r=(c=(d=a.querySelector(".lesson-title"))==null?void 0:d.value)==null?void 0:c.trim(),l=(m=(u=a.querySelector(".lesson-video"))==null?void 0:u.value)==null?void 0:m.trim();(r||l)&&i.push({title:r||"",videoUrl:l||""})});const n={id:`course_${Date.now()}`,title:document.getElementById("course-title").value.trim(),description:document.getElementById("course-description").value.trim(),category:document.getElementById("course-category").value,price:parseInt(document.getElementById("course-price").value)||0,imageUrl:document.getElementById("course-image").value.trim(),lessons:i,updatedAt:new Date().toISOString()};if(!n.title){t&&(t.style.color="#ef4444",t.textContent="Kurstitel er påkrevd.");return}e&&(e.disabled=!0,e.textContent="Lagrer...");try{const a=firebase.firestore().collection("siteContent").doc("collection_courses"),r=await a.get();let l=(r.exists?(o=r.data())==null?void 0:o.items:null)||[];s!==""?l[parseInt(s)]={...l[parseInt(s)],...n}:l.push(n),await a.set({items:l,updatedAt:new Date().toISOString()},{merge:!0}),t&&(t.style.color="#16a34a",t.textContent="✅ Kurs lagret!"),setTimeout(()=>{this._closeCourseModal(),this._loadCoursesList()},800)}catch(a){console.error(a),t&&(t.style.color="#ef4444",t.textContent="Feil: "+a.message)}finally{e&&(e.disabled=!1,e.innerHTML='<span class="material-symbols-outlined" style="font-size:1rem;">save</span> Lagre kurs')}}async _deleteCourse(){var t;const e=document.getElementById("course-id").value;if(!(e===""||!confirm("Er du sikker på at du vil slette dette kurset?")))try{const s=firebase.firestore().collection("siteContent").doc("collection_courses"),i=await s.get();let n=(i.exists?(t=i.data())==null?void 0:t.items:null)||[];n.splice(parseInt(e),1),await s.set({items:n,updatedAt:new Date().toISOString()},{merge:!0}),this._closeCourseModal(),this._loadCoursesList()}catch(s){alert("Kunne ikke slette kurs: "+s.message)}}async renderSEOSection(){const e=document.getElementById("seo-section");if(!e)return;e.innerHTML=`
                                            <div class="section-header">
                                                <h2 class="section-title">SEO & Synlighet</h2>
                                                <p class="section-subtitle">Styr hvordan nettsiden din ser ut i søkemotorer og sosiale medier.</p>
                                            </div>

                                            <div class="ai-info-card">
                                                <div class="ai-icon-circle">
                                                    <span class="material-symbols-outlined">auto_awesome</span>
                                                </div>
                                                <div class="ai-content">
                                                    <h4>AI-Søk Optimalisering</h4>
                                                    <p>Ved å legge til GEO-data og tydelige SEO-titler hjelper du AIer som ChatGPT og Perplexity å finne innholdet ditt mer presist. Dette øker sjansen for at kirken blir anbefalt i samtaler.</p>
                                                </div>
                                            </div>

                                            <div class="grid-2">
                                                <!-- Global SEO Card -->
                                                <div class="card">
                                                    <div class="card-header"><h3 class="card-title">Global SEO</h3></div>
                                                    <div class="card-body">
                                                        <div class="form-group">
                                                            <label>Nettsteds Tittel (Prefix/Suffix)</label>
                                                            <input type="text" id="seo-global-title" class="form-control" placeholder="His Kingdom Ministry">
                                                        </div>
                                                        <div class="form-group">
                                                            <label>Standard Beskrivelse (Meta Description)</label>
                                                            <textarea id="seo-global-desc" class="form-control" style="height: 100px;"></textarea>
                                                        </div>
                                                        <div class="form-group">
                                                            <label>Søkeord (Keywords)</label>
                                                            <input type="text" id="seo-global-keywords" class="form-control" placeholder="tro, jesus, undervisning">
                                                                <span class="helper-text">Separer med komma.</span>
                                                        </div>

                                                        <div class="divider"></div>

                                                        <h4 style="font-size: 15px; margin-bottom: 16px; color: var(--text-main);">GEO Metadata (Lokal SEO)</h4>
                                                        <div class="form-group">
                                                            <label>GEO Posisjon (Lat, Long)</label>
                                                            <input type="text" id="seo-global-geo-pos" class="form-control" placeholder="59.9139, 10.7522">
                                                        </div>
                                                        <div class="grid-2-cols" style="gap: 16px;">
                                                            <div class="form-group">
                                                                <label>GEO Region</label>
                                                                <input type="text" id="seo-global-geo-region" class="form-control" placeholder="NO-Oslo">
                                                            </div>
                                                            <div class="form-group">
                                                                <label>GEO Sted</label>
                                                                <input type="text" id="seo-global-geo-place" class="form-control" placeholder="Oslo">
                                                            </div>
                                                        </div>
                                                        <div style="margin-top: 10px;">
                                                            <button class="btn-primary" id="save-global-seo" style="width: 100%;">Lagre Globale Innstillinger</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <!-- Open Graph / Social Media Card -->
                                                <div class="card">
                                                    <div class="card-header"><h3 class="card-title">Sosiale Medier (Open Graph)</h3></div>
                                                    <div class="card-body">
                                                        <div class="form-group">
                                                            <label style="margin-bottom: 12px; display: block;">Dele-bilde (OG Image)</label>

                                                            <!-- Modern Upload Area -->
                                                            <div class="upload-area" id="upload-og-img">
                                                                <span class="material-symbols-outlined upload-icon">add_photo_alternate</span>
                                                                <span class="upload-label">Last opp bilde</span>
                                                                <span class="upload-hint">Anbefalt størrelse: 1200 x 630 px</span>
                                                            </div>
                                                            <input type="file" id="og-file-input" style="display: none;" accept="image/*">
                                                                <input type="hidden" id="seo-og-image">
                                                                </div>

                                                                <div id="og-preview" style="margin-top: 20px; border-radius: 12px; overflow: hidden; display: none; border: 1px solid var(--border-color);"></div>
                                                                <p style="font-size: 13px; color: #64748b; margin-top: 16px; line-height: 1.5;">Dette bildet vises når du deler linker til nettsiden på Facebook, LinkedIn, Slack og andre plattformer.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div class="card" style="margin-top: 32px;">
                                                    <div class="card-header flex-between">
                                                        <div>
                                                            <h3 class="card-title">Sidespesifikk SEO</h3>
                                                            <p class="section-subtitle" style="margin-bottom: 0;">Overstyr globale innstillinger for enkeltsider.</p>
                                                        </div>
                                                        <select id="seo-page-selector" class="form-control" style="width: 250px;">
                                                            <option value="index">Forside</option>
                                                            <option value="om-oss">Om Oss</option>
                                                            <option value="media">Media</option>
                                                            <option value="arrangementer">Arrangementer</option>
                                                            <option value="blogg">Blogg</option>
                                                            <option value="donasjoner">Donasjoner</option>
                                                            <option value="kontakt">Kontakt</option>
                                                            <option value="undervisning">Undervisning</option>
                                                            <option value="bibelstudier">Bibelstudier</option>
                                                            <option value="seminarer">Seminarer</option>
                                                            <option value="podcast">Podcast</option>
                                                        </select>
                                                    </div>
                                                    <div class="card-body">
                                                        <div class="form-group">
                                                            <label>Side-tittel (Vises i fanen)</label>
                                                            <input type="text" id="seo-page-title" class="form-control" placeholder="La stå tom for å bruke standard">
                                                        </div>
                                                        <div class="form-group">
                                                            <label>Side-beskrivelse</label>
                                                            <textarea id="seo-page-desc" class="form-control" style="height: 80px;" placeholder="Optimalisert beskrivelse for denne spesifikke siden..."></textarea>
                                                        </div>
                                                        <div class="grid-2-cols" style="gap: 24px;">
                                                            <div class="form-group">
                                                                <label>GEO Posisjon (Side)</label>
                                                                <input type="text" id="seo-page-geo-pos" class="form-control">
                                                            </div>
                                                            <div class="form-group">
                                                                <label>GEO Sted (Side)</label>
                                                                <input type="text" id="seo-page-geo-place" class="form-control">
                                                            </div>
                                                        </div>
                                                        <button class="btn-secondary" id="save-page-seo" style="width: 100%; margin-top: 10px;">Lagre SEO for denne siden</button>
                                                    </div>
                                                </div>
                                                `,e.setAttribute("data-rendered","true");const t=await p.getPageContent("settings_seo")||{};document.getElementById("seo-global-title").value=t.globalTitle||"",document.getElementById("seo-global-desc").value=t.globalDescription||"",document.getElementById("seo-global-keywords").value=t.globalKeywords||"",document.getElementById("seo-og-image").value=t.ogImage||"",document.getElementById("seo-global-geo-pos").value=t.geoPosition||"",document.getElementById("seo-global-geo-region").value=t.geoRegion||"",document.getElementById("seo-global-geo-place").value=t.geoPlacename||"";const s=()=>{const r=document.getElementById("seo-og-image").value,l=document.getElementById("og-preview");r?(l.innerHTML=`<img src="${r}" style="width: 100%; display: block;">`,l.style.display="block"):l.style.display="none"};s();const i=document.getElementById("seo-page-selector"),n=()=>{const r=i.value,l=t.pages&&t.pages[r]||{};document.getElementById("seo-page-title").value=l.title||"",document.getElementById("seo-page-desc").value=l.description||"",document.getElementById("seo-page-geo-pos").value=l.geoPosition||"",document.getElementById("seo-page-geo-place").value=l.geoPlacename||""};i.onchange=n,n();const o=document.getElementById("og-file-input"),a=document.getElementById("upload-og-img");a.onclick=()=>o.click(),o.onchange=async()=>{if(o.files.length!==0){a.disabled=!0,a.innerHTML='<span class="material-symbols-outlined rotating">sync</span>';try{const r=await p.uploadImage(o.files[0],`seo/og_image_${Date.now()}`);document.getElementById("seo-og-image").value=r,s()}catch{showToast("Upload failed")}finally{a.disabled=!1,a.innerHTML='<span class="material-symbols-outlined">upload</span>'}}},document.getElementById("save-global-seo").onclick=async()=>{const r=document.getElementById("save-global-seo");t.globalTitle=document.getElementById("seo-global-title").value,t.globalDescription=document.getElementById("seo-global-desc").value,t.globalKeywords=document.getElementById("seo-global-keywords").value,t.ogImage=document.getElementById("seo-og-image").value,t.geoPosition=document.getElementById("seo-global-geo-pos").value,t.geoRegion=document.getElementById("seo-global-geo-region").value,t.geoPlacename=document.getElementById("seo-global-geo-place").value,r.textContent="Lagrer...",r.disabled=!0;try{await p.savePageContent("settings_seo",t),this.showToast("✅ Globale SEO-innstillinger lagret!","success",5e3)}catch{this.showToast("❌ Feil ved lagring","error",5e3)}finally{r.textContent="Lagre Globale Innstillinger",r.disabled=!1}},document.getElementById("save-page-seo").onclick=async()=>{const r=document.getElementById("save-page-seo"),l=i.value;t.pages||(t.pages={}),t.pages[l]={title:document.getElementById("seo-page-title").value,description:document.getElementById("seo-page-desc").value},r.textContent="Lagrer...",r.disabled=!0;try{await p.savePageContent("settings_seo",t),showToast(`SEO for ${l} lagret!`)}catch{showToast("Feil ved lagring")}finally{r.textContent="Lagre SEO for denne siden",r.disabled=!1}}}async renderIntegrationsSection(){const e=document.getElementById("integrations-section");if(!e)return;e.innerHTML=`
                                                <div class="section-header">
                                                    <h2 class="section-title">Integrasjoner</h2>
                                                    <p class="section-subtitle">Koble nettsiden din til eksterne tjenester som Google Calendar.</p>
                                                </div>

                                                <div class="grid-2-cols" style="gap: 24px;">
                                                    <!-- Google Calendar Integration -->
                                                    <div class="card">
                                                        <div class="card-header flex-between">
                                                            <h3 class="card-title">Google Calendar</h3>
                                                            <div class="status-badge" id="gcal-status" style="font-size: 12px; padding: 4px 8px; border-radius: 12px; background: #fee2e2; color: #991b1b;">Frakoblet</div>
                                                        </div>
                                                        <div class="card-body">
                                                            <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Hent arrangementer automatisk fra din Google-kalender til nettsiden.</p>

                                                            <div class="form-group">
                                                                <label>Google API Key</label>
                                                                <input type="password" id="gcal-api-key" class="form-control" placeholder="Din Google Cloud API Key">
                                                                    <p style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Sørg for at 'Google Calendar API' er aktivert i Cloud Console.</p>
                                                            </div>

                                                            <div class="form-group">
                                                                <label>Calendar ID</label>
                                                                <div id="gcal-list" class="gcal-list"></div>
                                                                <button type="button" class="btn btn-outline" id="add-gcal" style="margin-top: 10px;">Legg til kalender</button>
                                                                <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Legg inn flere kalendere for filtrering. Calendar ID finner du under "Integrer kalender".</p>
                                                            </div>

                                                            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                                                                <h4 style="margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                                                    <span class="material-symbols-outlined" style="font-size: 18px; color: #f39c12;">sync</span>
                                                                    Synkronisering (To-veis)
                                                                </h4>
                                                                <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">Aktiver to-veis synkronisering for å sende endringer fra dashbordet tilbake til Google Calendar.</p>

                                                                <div id="google-auth-status" style="margin-bottom: 15px;">
                                                                    ${this.googleAccessToken?`
                                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                                        <span class="material-symbols-outlined" style="color: #16a34a;">check_circle</span>
                                        <div style="flex: 1;">
                                            <p style="font-size: 12px; font-weight: 600; color: #166534; margin: 0;">Tilkoblet Google</p>
                                            <p style="font-size: 10px; color: #15803d; margin: 0;">Skrivetilgang er aktivert</p>
                                        </div>
                                        <button id="disconnect-google" class="btn-text" style="color: #dc2626; font-size: 11px;">Koble fra</button>
                                    </div>
                                `:`
                                    <button class="btn-outline" id="connect-google-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="Google">
                                        Koble til Google for skrivetilgang
                                    </button>
                                `}
                                                                </div>
                                                            </div>

                                                            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                                                                <h4 style="margin-bottom: 12px; font-size: 14px;">Visningsinnstillinger</h4>
                                                                <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                                                                    <input type="checkbox" id="gcal-show-month" style="width: 18px; height: 18px;">
                                                                        <label for="gcal-show-month" style="margin-bottom: 0; cursor: pointer;">Vis Månedskalender</label>
                                                                </div>
                                                                <div class="form-group" style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                                                                    <input type="checkbox" id="gcal-show-agenda" style="width: 18px; height: 18px;">
                                                                        <label for="gcal-show-agenda" style="margin-bottom: 0; cursor: pointer;">Vis Agendaoversikt (Kommende arrangementer)</label>
                                                                </div>
                                                            </div>

                                                            <div style="margin-top: 10px;">
                                                                <button class="btn-primary" id="save-gcal-settings" style="width: 100%;">Lagre Kalender-innstillinger</button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Guidance Card -->
                                                    <div class="card" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
                                                        <div class="card-body">
                                                            <h4 style="margin-bottom: 15px;">Slik setter du opp Google Calendar:</h4>
                                                            <ol style="font-size: 13px; padding-left: 20px; line-height: 1.6; color: #334155;">
                                                                <li>Gå til <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>.</li>
                                                                <li>Opprett et prosjekt og aktiver <b>Google Calendar API</b>.</li>
                                                                <li>Gå til "Credentials" og opprett en <b>API Key</b> (begrens den gjerne til ditt domene).</li>
                                                                <li>I Google Calendar: Gå til innstillinger for kalenderen du vil dele.</li>
                                                                <li>Under "Access permissions", huk av for <b>Make available to public</b>.</li>
                                                                <li>Finn <b>Calendar ID</b> under "Integrate calendar" og lim den inn her.</li>
                                                            </ol>
                                                        </div>
                                                    </div>
                                                </div>
                                                `;const t=document.getElementById("connect-google-btn");t&&(t.onclick=async()=>{try{const d=await p.connectToGoogle();this.googleAccessToken=d.accessToken,this.showToast("Tilkoblet Google! Du har nå skrivetilgang.","success"),this.renderIntegrationsSection()}catch(d){console.error("Google connection failed:",d),this.showToast("Kunne ikke koble til Google: "+(d.message||"Ukjent feil"),"error")}});const s=document.getElementById("disconnect-google");s&&(s.onclick=()=>{this.googleAccessToken=null,this.showToast("Koblet fra Google. Skrivetilgang deaktivert."),this.renderIntegrationsSection()});const i=await p.getPageContent("settings_integrations")||{},n=i.googleCalendar||{};document.getElementById("gcal-api-key").value=n.apiKey||"",document.getElementById("gcal-show-month").checked=i.showMonthView!==!1,document.getElementById("gcal-show-agenda").checked=i.showAgendaView!==!1;const o=document.getElementById("gcal-list"),a=document.getElementById("add-gcal"),r=Array.isArray(i.googleCalendars)?i.googleCalendars:n.calendarId?[{id:n.calendarId,label:n.label||""}]:[],l=(d={})=>{const c=document.createElement("div");c.className="gcal-row",c.style.display="grid",c.style.gridTemplateColumns="1fr 2fr auto",c.style.gap="8px",c.style.marginBottom="8px",c.innerHTML=`
                                                <input type="text" class="form-control gcal-label" placeholder="Navn (f.eks. Moter)" value="${this.escapeHtml(d.label||"")}">
                                                    <input type="text" class="form-control gcal-id" placeholder="Calendar ID" value="${this.escapeHtml(d.id||"")}">
                                                        <button type="button" class="btn btn-outline gcal-remove">Fjern</button>
                                                        `,c.querySelector(".gcal-remove").addEventListener("click",()=>{c.remove()}),o.appendChild(c)};if(r.length>0?r.forEach(l):l(),a&&a.addEventListener("click",()=>l()),n.apiKey&&(r.length>0||n.calendarId)){const d=document.getElementById("gcal-status");d.textContent="Konfigurert",d.style.background="#dcfce7",d.style.color="#166534"}document.getElementById("save-gcal-settings").onclick=async d=>{var g,w;const c=d.target,u=document.getElementById("gcal-api-key").value.trim(),v=Array.from(document.querySelectorAll("#gcal-list .gcal-row")).map(x=>{var f,L;const h=(f=x.querySelector(".gcal-label"))==null?void 0:f.value.trim(),b=(L=x.querySelector(".gcal-id"))==null?void 0:L.value.trim();return{label:h,id:b}}).filter(x=>x.id);c.textContent="Lagrer...",c.disabled=!0;try{const x={...i,showMonthView:document.getElementById("gcal-show-month").checked,showAgendaView:document.getElementById("gcal-show-agenda").checked,googleCalendar:{apiKey:u,calendarId:((g=v[0])==null?void 0:g.id)||"",label:((w=v[0])==null?void 0:w.label)||"",lastUpdated:new Date().toISOString()},googleCalendars:v};await p.savePageContent("settings_integrations",x),c.textContent="Lagret!";const h=document.getElementById("gcal-status");u&&v.length>0&&(h.textContent="Konfigurert",h.style.background="#dcfce7",h.style.color="#166534"),setTimeout(()=>{c.textContent="Lagre Kalender-innstillinger",c.disabled=!1},2e3)}catch(x){console.error("Save Error:",x),c.textContent="Feil ved lagring",c.style.setProperty("background","#ef4444","important"),setTimeout(()=>{c.textContent="Lagre Kalender-innstillinger",c.disabled=!1,c.style.setProperty("background","","")},2e3)}},e.setAttribute("data-rendered","true")}renderSettingsSection(){const e=document.getElementById("settings-section");e&&(e.innerHTML=`
                                                        <div class="section-header">
                                                            <div>
                                                                <h2 class="section-title">Innstillinger & Verktøy</h2>
                                                                <p class="section-subtitle">Administrer systeminnstillinger og datasync.</p>
                                                            </div>
                                                        </div>

                                                        <!-- System Status Banner -->
                                                        <div class="status-banner success">
                                                            <div class="status-icon-pulse">
                                                                <span class="material-symbols-outlined">check_circle</span>
                                                            </div>
                                                            <div class="status-content">
                                                                <span class="status-label">SYSTEMSTATUS: NORMAL</span>
                                                                <p>Alle systemer fungerer optimalt. Siste backup ble kjørt automatisk i natt.</p>
                                                            </div>
                                                            <div class="status-action">
                                                                <a href="admin-logger.html" class="btn-text-white" style="text-decoration: none; display: inline-block;">Se logger</a>
                                                            </div>
                                                        </div>

                                                        <div class="grid-2-cols" style="gap: 24px; margin-top: 24px;">
                                                            <!-- Firebase Config Card -->
                                                            <div class="card">
                                                                <div class="card-header flex-between">
                                                                    <h3 class="card-title">Firebase Konfigurasjon</h3>
                                                                    <div class="status-badge success">
                                                                        <span class="dot"></span> Tilkoblet
                                                                    </div>
                                                                </div>
                                                                <div class="card-body">
                                                                    <p style="font-size: 14px; color: #64748b; margin-bottom: 16px;">
                                                                        Endre konfigurasjonen kun hvis du vet hva du gjør. Feil her kan stoppe nettsiden.
                                                                    </p>

                                                                    <div class="code-editor-container">
                                                                        <div class="code-editor-header">
                                                                            <span class="lang-tag">JSON</span>
                                                                            <span class="file-name">firebase-config.js</span>
                                                                        </div>
                                                                        <div class="code-editor-wrap">
                                                                            <div class="line-numbers">
                                                                                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                                                            </div>
                                                                            <textarea id="fb-config" class="code-input" spellcheck="false">${localStorage.getItem("hkm_firebase_config")||""}</textarea>
                                                                        </div>
                                                                    </div>

                                                                    <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
                                                                        <button class="btn-primary" id="save-fb" style="width: 100%;">
                                                                            <span class="material-symbols-outlined">save</span>
                                                                            Lagre & Koble til
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <!-- Data Tools Card -->
                                                            <div class="card">
                                                                <div class="card-header"><h3 class="card-title">Datasynkronisering & Verktøy</h3></div>
                                                                <div class="card-body">
                                                                    <div class="tools-grid">
                                                                        <!-- Import Tool -->
                                                                        <div class="tool-card">
                                                                            <div class="tool-icon-circle sync">
                                                                                <span class="material-symbols-outlined">sync</span>
                                                                            </div>
                                                                            <div class="tool-info">
                                                                                <h4>Importer Innhold</h4>
                                                                                <p>Hent innhold fra statiske sider til databasen.</p>
                                                                            </div>
                                                                            <button class="btn-secondary btn-sm" id="sync-existing-content">
                                                                                Kjør Import
                                                                            </button>
                                                                            <div id="sync-status" class="tool-status"></div>
                                                                        </div>

                                                                        <!-- Cache Tool -->
                                                                        <div class="tool-card">
                                                                            <div class="tool-icon-circle warning">
                                                                                <span class="material-symbols-outlined">delete_forever</span>
                                                                            </div>
                                                                            <div class="tool-info">
                                                                                <h4>Nullstille Cache</h4>
                                                                                <p>Tøm lokal lagring og last siden på nytt.</p>
                                                                            </div>
                                                                            <button class="btn-outline-danger btn-sm" onclick="localStorage.clear(); window.location.reload();">
                                                                                Tøm Cache
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        `,e.setAttribute("data-rendered","true"),document.getElementById("save-fb").addEventListener("click",()=>{const t=document.getElementById("fb-config").value;localStorage.setItem("hkm_firebase_config",t),this.showToast("✅ Lagret! Laster på nytt...","success",5e3),setTimeout(()=>window.location.reload(),2e3)}),document.getElementById("sync-existing-content").addEventListener("click",()=>this.seedExistingData()))}async seedExistingData(){const e=document.getElementById("sync-status"),t=document.getElementById("sync-existing-content");if(confirm("Dette vil overskrive eventuelle endringer du har gjort i dashboardet med innhold fra de statiske HTML-filene. Fortsette?")){t.disabled=!0,e.innerHTML='<span style="color: #64748b;">Starter synkronisering...</span>';try{e.innerHTML+="<br>Syncing Hero Slides...";const s=[{imageUrl:"https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=1080&fit=crop",title:"Tenk & gi nestekjærlighet",subtitle:"Vi er her for å støtte deg på din åndelige reise. Bli med i et trygt miljø der vi utforsker Guds ord, deler livet og styrker relasjonen til Jesus.",btnText:"Utforsk mer",btnLink:"om-oss.html"},{imageUrl:"https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1920&h=1080&fit=crop",title:"Vekst gjennom felleskap",subtitle:"Uansett hvor du er på din vandring, ønsker vi å gå sammen med deg. Bli med i et felleskap som utforsker Guds ord og styrker troen.",btnText:"Les mer",btnLink:"om-oss.html"},{imageUrl:"https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=1080&fit=crop",title:"Støtt vårt arbeid",subtitle:"Din gave gjør en forskjell. Hjelp oss å nå flere mennesker med evangeliet gjennom undervisning, reisevirksomhet og felleskap.",btnText:"Gi gave nå",btnLink:"donasjoner.html"}];await p.savePageContent("hero_slides",{slides:s}),e.innerHTML+="<br>Syncing Blog Posts...";const i=[{title:"Hvordan bevare troen i en travel hverdag",date:"05 Feb, 2024",category:"Undervisning",content:"Vi utforsker praktiske tips og bibelske prinsipper for å opprettholde en nær relasjon med Gud til tross for en hektisk tidsplan...",imageUrl:"https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},{title:"Rapport fra misjonsturen til Kenya",date:"28 Jan, 2024",category:"Reise",content:"Bli med på reisen gjennom våre opplevelser i Kenya. Vi så Guds godhet i aksjon gjennom helbredelse, omsorg og glede...",imageUrl:"https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},{title:"Ny Podcast Episode: Tro, tvil og vekst",date:"15 Jan, 2024",category:"Podcast",content:"Lytt til vår nyeste episode hvor vi diskuterer de ærlige sidene ved troslivet og hvordan vi kan finne hvile i Guds løfter...",imageUrl:"https://images.unsplash.com/photo-1475483768296-6163e08872a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},{title:"Viktigheten av å stå sammen",date:"10 Jan, 2024",category:"Felleskap",content:"Hvorfor felleskapet er essensielt for den kristne vandringen og hvordan vi kan støtte hverandre gjennom livets ulike sesonger...",imageUrl:"https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"},{title:"Min reise fra mørke til lys",date:"02 Jan, 2024",category:"Vitnesbyrd",content:"Et sterkt vitnesbyrd om hvordan Gud forandret et liv preget av håpløshet til et liv fylt med mening, fred og fremtidstro...",imageUrl:"https://images.unsplash.com/photo-1507413245164-6160d8298b31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}];await p.savePageContent("collection_blog",{items:i}),e.innerHTML+="<br>Syncing Teaching Series...";const n=[{title:"Tro og Tvil",content:"Hvordan håndtere tvil og styrke din tro i utfordrende tider.",category:"5 episoder",author:"His Kingdom",date:"02 Feb, 2024",imageUrl:"https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop"},{title:"Guds Karakter",content:"Utforsk Guds egenskaper og hva de betyr for våre liv.",category:"8 episoder",author:"His Kingdom",date:"25 Jan, 2024",imageUrl:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop"},{title:"Åndelige Gaver",content:"Oppdag og bruk dine åndelige gaver til Guds ære.",category:"6 episoder",author:"His Kingdom",date:"15 Jan, 2024",imageUrl:"https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=600&h=400&fit=crop"},{title:"Kristen Disippelskap",content:"Lær hva det betyr å være en disippel av Jesus.",category:"10 episoder",author:"His Kingdom",date:"10 Jan, 2024",imageUrl:"https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&h=400&fit=crop"},{title:"Bønneliv",content:"Utvikle et kraftfullt og meningsfullt bønneliv.",category:"7 episoder",author:"His Kingdom",date:"05 Jan, 2024",imageUrl:"https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=400&fit=crop"},{title:"Å Finne Guds Vilje",content:"Hvordan søke og følge Guds plan for ditt liv.",category:"4 episoder",author:"His Kingdom",date:"02 Jan, 2024",imageUrl:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop"},{title:"Tilgivelse og Forsoning",content:"Kraften i tilgivelse og hvordan leve i forsoning.",category:"5 episoder",author:"His Kingdom",date:"28 Dec, 2023",imageUrl:"https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop"},{title:"Åndelig Krigføring",content:"Stå fast i kampen mot åndelige krefter.",category:"6 episoder",author:"His Kingdom",date:"20 Dec, 2023",imageUrl:"https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop"},{title:"Din Identitet i Kristus",content:"Forstå hvem du er som Guds barn.",category:"5 episoder",author:"His Kingdom",date:"15 Dec, 2023",imageUrl:"https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&h=400&fit=crop"},{title:"Kallet til Tjeneste",content:"Hvordan tjene Gud og andre effektivt.",category:"8 episoder",author:"His Kingdom",date:"10 Dec, 2023",imageUrl:"https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop"},{title:"Helliggjørelse",content:"Vokse i hellighet og likhet med Kristus.",category:"7 episoder",author:"His Kingdom",date:"05 Dec, 2023",imageUrl:"https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=600&h=400&fit=crop"},{title:"Endetidsprofetier",content:"Forstå Bibelens profetier om endetiden.",category:"9 episoder",author:"His Kingdom",date:"01 Dec, 2023",imageUrl:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop"}];await p.savePageContent("collection_teaching",{items:n}),e.innerHTML+="<br>Syncing Page Text...";const o={about:{label:"Velkommen til Fellesskapet",title:"Vi er en Non-Profit Organisasjon",description:"His Kingdom Ministry driver med åndelig samlinger som bønnemøter, undervisningseminarer, og forkynnende reisevirksomhet. Vi ønsker å være et felleskap der mennesker kan vokse i sin tro og relasjon til Jesus.",features:{mission:{title:"Vårt Oppdrag",text:"Å utruste og inspirere mennesker til et dypere liv med Gud gjennom undervisning, fellesskap og bønn."},story:{title:"Vår Historie",text:"Startet med en visjon om å samle mennesker i åndelig vekst, har vi vokst til et levende felleskap som driver med bønnemøter, undervisning og reisevirksomhet."}}},features:{teaching:{title:"Undervisning",text:"Bibelskoler, seminarer og dyptgående undervisning."},podcast:{title:"Podcast",text:"Lytt til våre samtaler om tro, liv og åndelig vekst."},travel:{title:"Reisevirksomhet",text:"Forkynnelse og konferanser rundt om i verden."}},stats:{youtube_videos:"449",youtube_views:"56699",podcast_episodes:"45",countries_visited:"9"}};await p.savePageContent("index",o),e.innerHTML+="<br>Syncing Om Oss...";const a={hero:{title:"Om Oss",subtitle:"Lær mer om vår visjon, oppdrag og historie"},intro:{label:"Velkommen til Fellesskapet",title:"Vi er en Non-Profit Organisasjon",text:"His Kingdom Ministry driver med åndelig samlinger som bønnemøter, undervisningseminarer, og forkynnende reisevirksomhet. Vi ønsker å være et felleskap der mennesker kan vokse i sin tro og relasjon til Jesus."},mission:{title:"Vårt Oppdrag",text:"Å utruste og inspirere mennesker til et dypere liv med Gud gjennom undervisning, fellesskap og bønn."},history:{title:"Vår Historie",text:"Startet med en visjon om å samle mennesker i åndelig vekst, har vi vokst til et levende felleskap som driver med bønnemøter, undervisning og reisevirksomhet."},values:{title:"Hva Vi Står For",bible:{title:"Bibeltro Undervisning",text:"Vi forankrer alt vi gjør i Guds ord og søker å leve etter Bibelens prinsipper."},prayer:{title:"Bønn & Tilbedelse",text:"Bønn er hjertet av alt vi gjør, og vi søker Guds nærvær i alt."},community:{title:"Fellesskap",text:"Vi tror på kraften i felleskap og støtter hverandre i troen."},love:{title:"Kjærlighet & Omsorg",text:"Vi møter alle med Kristi kjærlighet og omsorg."}}};await p.savePageContent("om-oss",a),e.innerHTML+="<br>Syncing Kontakt...";const r={hero:{title:"Kontakt Oss",subtitle:"Vi vil gjerne høre fra deg. Send oss en melding eller besøk oss."},info:{title:"Ta Kontakt",text:"Har du spørsmål, bønnebehov eller ønsker du å vite mer om vår tjeneste? Ikke nøl med å ta kontakt med oss.",email:"post@hiskingdomministry.no",phone:"+47 930 94 615",address:"Norge"}};await p.savePageContent("kontakt",r),e.innerHTML+="<br>Syncing Media...";const l={hero:{title:"Media",subtitle:"Utforsk våre videoer, podcaster og annet innhold"},youtube:{title:"Siste Videoer",description:"Se våre nyeste videoer og undervisninger"},podcast:{title:"Siste Episoder",description:"Lytt til våre podcaster om tro, liv og åndelig vekst"},teaching:{title:"Undervisningsressurser",description:"Dyptgående bibelstudier og undervisningsserier"}};await p.savePageContent("media",l),e.innerHTML+="<br>Syncing Donasjoner...";const d={hero:{title:"Donasjoner"},intro:{title:"Våre aktive innsamlingsaksjoner",description:"Din gave utgjør en forskjell. Velg et prosjekt du ønsker å støtte og bli med på å forandre liv."},form:{title:"Støtt vårt arbeid",description:"Din gave gjør en reell forskjell. Velg beløp og betalingsmetode nedenfor."}};await p.savePageContent("donasjoner",d),e.innerHTML+="<br>Syncing Blogg...";const c={hero:{title:"Nyheter / Blogg",subtitle:"Les våre siste artikler og oppdateringer"},section:{title:"Siste Nytt",label:"Nyheter & Blogg",description:"Les våre siste artikler og oppdateringer."}};await p.savePageContent("blogg",c),e.innerHTML+="<br>Syncing Arrangementer...";const u={hero:{title:"Arrangementer",subtitle:"Bli med på våre kommende hendelser"},section:{title:"Kommende Arrangementer",description:"Se våre kommende arrangementer og meld deg på."}};await p.savePageContent("arrangementer",u),e.innerHTML+="<br>Syncing Undervisning...";const m={hero:{title:"Undervisning",subtitle:"Dyptgående bibelundervisning"}};await p.savePageContent("undervisning",m),e.innerHTML+="<br>Syncing Bibelstudier...";const v={hero:{title:"Bibelstudier",subtitle:"Utforsk Guds ord sammen med oss"}};await p.savePageContent("bibelstudier",v),e.innerHTML+="<br>Syncing Seminarer...";const g={hero:{title:"Seminarer",subtitle:"Temabaserte undervisningsdager"}};await p.savePageContent("seminarer",g),e.innerHTML+="<br>Syncing Podcast...";const w={hero:{title:"Podcast",subtitle:"Lytt til våre samtaler"}};await p.savePageContent("podcast",w),e.innerHTML+="<br>Syncing SEO-innstillinger...";const x={globalTitle:"His Kingdom Ministry",globalDescription:"His Kingdom Ministry driver med åndelig samlinger, undervisning og forkynnelse. Velkommen til vårt fellesskap.",globalKeywords:"tro, bibel, undervisning, bønn, fellesskap, jesus, kristendom",ogImage:"",pages:{index:{title:"Forside | His Kingdom Ministry",description:"Velkommen til His Kingdom Ministry."},"om-oss":{title:"Om Oss | His Kingdom Ministry",description:"Les om vår visjon og historie."},media:{title:"Media & Undervisning",description:"Se våre videoer og undervisning."},blogg:{title:"Siste Nytt & Blogg",description:"Følg med på hva som skjer."}}};await p.savePageContent("settings_seo",x),e.innerHTML='<span style="color: #10b981; font-weight: 600;">✅ Datasynkronisering fullført!</span>',showToast("Synkronisering ferdig! Innholdet er nå tilgjengelig i dashboardet.")}catch(s){console.error(s),e.innerHTML='<span style="color: #ef4444;">❌ Synkronisering feilet: '+s.message+"</span>"}finally{t.disabled=!1}}}createPlaceholderSection(e){const t=document.getElementById("content-area"),s=document.createElement("div");s.id=`${e}-section`,s.className="section-content",s.innerHTML=`<div class="card"><div class="card-body"><h2>${e}</h2><p>Kommer snart...</p></div></div>`,t.appendChild(s)}async loadPageFields(e){const t=document.getElementById("editor-fields");t.innerHTML='<div class="loader">Laster...</div>';try{const s=await p.getPageContent(e)||{};e!=="index"&&(s.hero||(s.hero={}),s.hero.title===void 0&&(s.hero.title=""),s.hero.subtitle===void 0&&(s.hero.subtitle=""),e==="for-bedrifter"||e==="bnn"||e==="for-menigheter"||e==="blogg"?s.hero.bg===void 0&&s.hero.backgroundImage===void 0?s.hero.bg="":s.hero.bg===void 0&&s.hero.backgroundImage!==void 0&&(s.hero.bg=s.hero.backgroundImage):s.hero.backgroundImage===void 0&&(s.hero.backgroundImage="")),this.renderFields(s)}catch{t.innerHTML="<p>Error.</p>"}}renderFields(e){const t=document.getElementById("editor-fields");t.innerHTML="";const s=this.flatten(e);if(Object.keys(s).length===0){t.innerHTML="<p>Ingen redigerbare felt funnet for denne siden.</p>";return}Object.keys(s).forEach(i=>{const n=s[i],o=document.createElement("div");o.className="form-group";const a=document.createElement("label");a.textContent=i.replace(/\./g," > ").toUpperCase();let r;if(typeof n=="string"&&(n.length>100||i.includes("description")||i.includes("content"))?(r=document.createElement("textarea"),r.style.height="120px",o.classList.add("is-textarea")):(r=document.createElement("input"),r.type="text"),r.className="form-control",r.value=n||"",r.setAttribute("data-key",i),o.appendChild(a),o.appendChild(r),i.includes("backgroundImage")||i.includes("imageUrl")||i.endsWith(".bg")){const l=document.createElement("div");l.className="img-preview-mini",l.style.marginTop="10px",l.style.height="60px",l.style.width="100px",l.style.background="#f1f5f9",l.style.borderRadius="4px",l.style.overflow="hidden",l.style.display="flex",l.style.alignItems="center",l.style.justifyContent="center",l.style.border="1px solid #e2e8f0";const d=c=>{c&&c.length>5?l.innerHTML=`<img src="${c}" style="width:100%; height:100%; object-fit:cover;">`:l.innerHTML='<span class="material-symbols-outlined" style="font-size:20px; color:#cbd5e1;">image</span>'};d(n),r.addEventListener("input",c=>d(c.target.value)),o.appendChild(l)}t.appendChild(o)})}async savePageContent(){const e=document.querySelector(".page-item.active").dataset.page,t=document.querySelectorAll("#editor-fields .form-control"),s={};t.forEach(i=>{const n=i.dataset.key.split(".");let o=s;n.forEach((a,r)=>{r===n.length-1?o[a]=i.value:(o[a]=o[a]||{},o=o[a])})});try{await p.savePageContent(e,s),this.showToast("✅ Innholdet er lagret!","success",5e3)}catch{this.showToast("❌ Feil ved lagring","error",5e3)}}flatten(e,t=""){return Object.keys(e).reduce((s,i)=>{const n=t.length?t+".":"";return typeof e[i]=="object"&&e[i]!==null&&!Array.isArray(e[i])?Object.assign(s,this.flatten(e[i],n+i)):s[n+i]=e[i],s},{})}async renderUsersSection(){const e=document.getElementById("users-section");if(!e)return;if(this.currentUserDetailId){await this.renderUserDetailView(this.currentUserDetailId);return}e.innerHTML=`
                                                                                                                <div class="section-header flex-between">
                                                                                                                    <div>
                                                                                                                        <h2 class="section-title">Brukerhåndtering</h2>
                                                                                                                        <p class="section-subtitle">Oversikt over alle registrerte brukere og deres tilgangsnivåer.</p>
                                                                                                                    </div>
                                                                                                                    <!-- Skjult knapp slik at FAB (pluss-knappen) fortsatt fungerer -->
                                                                                                                    <button id="add-user-btn" style="display: none;"></button>
                                                                                                                </div>

                                                                                                                <div class="card">
                                                                                                                    <div class="card-header">
                                                                                                                        <div class="header-search" style="width: 100%; max-width: 400px;">
                                                                                                                            <span class="material-symbols-outlined">search</span>
                                                                                                                            <input type="text" id="user-search-input" placeholder="Søk etter navn eller e-post...">
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                    <div class="card-body" id="users-list-container">
                                                                                                                        <div class="loader"></div>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                `,e.setAttribute("data-rendered","true");const t=document.getElementById("add-user-btn");t&&(t.onclick=()=>this.openUserModal());const s=document.getElementById("user-search-input");s&&(s.oninput=i=>{const n=i.target.value.toLowerCase();this.filterUsersTable(n)}),await this.loadUsersList()}async loadUsersList(){const e=document.getElementById("users-list-container");if(e)try{const t=await p.db.collection("users").orderBy("createdAt","desc").get(),s=[];t.forEach(i=>{s.push({id:i.id,...i.data()})}),this.allUsersData=s,this.renderUsersTable(s)}catch(t){console.error("Error fetching users:",t),e.innerHTML=`<p class="error-text">Kunne ikke laste brukere: ${t.message}</p>`}}renderUsersTable(e){const t=document.getElementById("users-list-container");if(!t)return;if(e.length===0){t.innerHTML='<p class="empty-text">Ingen brukere funnet.</p>';return}let s=`
                                                                                                                <div class="table-responsive">
                                                                                                                    <table class="hkm-table">
                                                                                                                        <thead>
                                                                                                                            <tr>
                                                                                                                                <th>Bruker</th>
                                                                                                                                <th>E-post</th>
                                                                                                                                <th>Rolle</th>
                                                                                                                                <th>Opprettet</th>
                                                                                                                                <th style="text-align:right;">Handlinger</th>
                                                                                                                            </tr>
                                                                                                                        </thead>
                                                                                                                        <tbody>
                                                                                                                            `;e.forEach(i=>{const n=i.displayName||i.fullName||"Ukjent Navn",o=n.split(" ").map(d=>d[0]).join("").toUpperCase().substring(0,2),a=`role-badge-${i.role||"medlem"}`,r=(i.role||"medlem").charAt(0).toUpperCase()+(i.role||"medlem").slice(1),l=i.createdAt?i.createdAt.toDate?i.createdAt.toDate().toLocaleDateString("no-NO"):new Date(i.createdAt).toLocaleDateString("no-NO"):"---";s+=`
                                                                                                                            <tr>
                                                                                                                                <td>
                                                                                                                                    <div class="user-cell">
                                                                                                                                        <div class="user-avatar-sm" style="${i.photoURL?`background-image: url('${i.photoURL}'); background-size: cover;`:""}">
                                                                                                                                            ${i.photoURL?"":o}
                                                                                                                                        </div>
                                                                                                                                        <div class="user-cell-info">
                                                                                                                                            <div class="user-cell-name">${this.escapeHtml(n)}</div>
                                                                                                                                            <div class="user-cell-id">ID: ${i.id.substring(0,8)}...</div>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </td>
                                                                                                                                <td>${this.escapeHtml(i.email||"Ingen e-post")}</td>
                                                                                                                                <td><span class="role-badge ${a}">${r}</span></td>
                                                                                                                                <td>${l}</td>
                                                                                                                                <td style="text-align:right;">
                                                                                                                                    <div class="item-actions">
                                                                                                                                        <button class="icon-btn edit-user-btn" data-id="${i.id}" title="Rediger">
                                                                                                                                            <span class="material-symbols-outlined">edit</span>
                                                                                                                                        </button>
                                                                                                                                        <button class="icon-btn delete-user-btn danger" data-id="${i.id}" title="Slett">
                                                                                                                                            <span class="material-symbols-outlined">delete</span>
                                                                                                                                        </button>
                                                                                                                                    </div>
                                                                                                                                </td>
                                                                                                                            </tr>
                                                                                                                            `}),s+=`
                                                                                                                        </tbody>
                                                                                                                    </table>
                                                                                                                </div>
                                                                                                                `,t.innerHTML=s,t.querySelectorAll(".edit-user-btn").forEach(i=>{i.onclick=()=>{const n=i.getAttribute("data-id");this.currentUserDetailId=n,this.userEditMode=!1,this.renderUsersSection()}}),t.querySelectorAll(".delete-user-btn").forEach(i=>{i.onclick=()=>{const n=i.getAttribute("data-id"),o=this.allUsersData.find(r=>r.id===n),a=o&&(o.displayName||o.fullName)||"Ukjent";this.showDeleteUserConfirmationModal(n,a)}})}showDeleteUserConfirmationModal(e,t){const s=document.getElementById("hkm-delete-modal-overlay");s&&s.remove();const n=`
                                                                                                                <div id="hkm-delete-modal-overlay" class="hkm-modal-overlay">
                                                                                                                    <div class="hkm-modal-container">
                                                                                                                        <div class="hkm-modal-icon">
                                                                                                                            <span class="material-symbols-outlined">warning</span>
                                                                                                                        </div>
                                                                                                                        <h3 class="hkm-modal-title">⚠️ Slett bruker?</h3>
                                                                                                                        <p class="hkm-modal-message">${`Er du sikker på at du vil slette brukeren "${t}" fra oversikten? Dette sletter kun profildata i Firestore og kan ikke angres.`}</p>
                                                                                                                        <div class="hkm-modal-actions">
                                                                                                                            <button id="hkm-modal-cancel" class="hkm-modal-btn hkm-modal-btn-cancel">Avbryt</button>
                                                                                                                            <button id="hkm-modal-confirm" class="hkm-modal-btn hkm-modal-btn-delete">Slett bruker</button>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                `;document.body.insertAdjacentHTML("beforeend",n);const o=document.getElementById("hkm-delete-modal-overlay"),a=document.getElementById("hkm-modal-cancel"),r=document.getElementById("hkm-modal-confirm"),l=()=>{o.classList.remove("active"),setTimeout(()=>o.remove(),200)};a.onclick=l,o.onclick=d=>{d.target===o&&l()},r.onclick=async()=>{r.disabled=!0,r.textContent="Sletter...",await this.deleteUser(e),l()},requestAnimationFrame(()=>{o.classList.add("active")})}filterUsersTable(e){if(!this.allUsersData)return;const t=this.allUsersData.filter(s=>{const i=(s.displayName||s.fullName||"").toLowerCase(),n=(s.email||"").toLowerCase();return i.includes(e)||n.includes(e)});this.renderUsersTable(t)}openUserModal(e=null){const t="user-edit-modal";let s=document.getElementById(t);s||(s=document.createElement("div"),s.id=t,s.className="profile-modal",s.style.cssText="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.25); z-index:2000; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;",document.body.appendChild(s));const i=window.HKM_ROLES,n=Object.values(i).map(d=>`<option value="${d}" ${e&&e.role===d?"selected":""}>${d.charAt(0).toUpperCase()+d.slice(1)}</option>`).join("");s.innerHTML=`
                                                                                                                <div class="profile-modal-content" style="background:#fff; border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.15); padding:32px; width:100%; max-width:600px; max-height:90vh; overflow-y:auto; position:relative;">
                                                                                                                    <button class="close-modal-btn" style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:22px; cursor:pointer; color:#888;">&times;</button>
                                                                                                                    <h3 style="font-size:20px; font-weight:700; margin-bottom:20px;">${e?"Rediger bruker":"Opprett ny bruker"}</h3>

                                                                                                                    <form id="user-edit-form" style="display:grid; gap:16px;">
                                                                                                                        <input type="hidden" name="id" value="${e?e.id:""}">

                                                                                                                            <div class="form-group">
                                                                                                                                <label>Fullt navn</label>
                                                                                                                                <input type="text" name="displayName" class="form-control" value="${e&&(e.displayName||e.fullName)||""}" required>
                                                                                                                            </div>

                                                                                                                            <div class="form-group">
                                                                                                                                <label>E-post</label>
                                                                                                                                <input type="email" name="email" class="form-control" value="${e&&e.email||""}" required ${e?"readonly":""}>
                                                                                                                                    ${e?"":'<p class="helper-text">Brukeren må fortsatt registrere seg selv via "Min Side" for å kunne logge inn.</p>'}
                                                                                                                            </div>

                                                                                                                            <div class="form-group">
                                                                                                                                <label>Rolle / Tilgangsnivå</label>
                                                                                                                                <select name="role" class="form-control">
                                                                                                                                    ${n}
                                                                                                                                </select>
                                                                                                                            </div>

                                                                                                                            <div class="form-group">
                                                                                                                                <label>Telefon</label>
                                                                                                                                <input type="tel" name="phone" class="form-control" value="${e&&e.phone||""}">
                                                                                                                            </div>

                                                                                                                            <div class="form-group">
                                                                                                                                <label>Adresse</label>
                                                                                                                                <input type="text" name="address" class="form-control" value="${e&&e.address||""}">
                                                                                                                            </div>

                                                                                                                            <div class="form-grid-2 zip-city">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label>Postnummer</label>
                                                                                                                                    <input type="text" name="zip" class="form-control" value="${e&&e.zip||""}">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label>Poststed</label>
                                                                                                                                    <input type="text" name="city" class="form-control" value="${e&&e.city||""}">
                                                                                                                                </div>
                                                                                                                            </div>

                                                                                                                            <div class="form-grid-2">
                                                                                                                                <div class="form-group">
                                                                                                                                    <label>Fødselsdato</label>
                                                                                                                                    <input type="date" name="birthdate" class="form-control" value="${e&&e.birthdate||""}">
                                                                                                                                </div>
                                                                                                                                <div class="form-group">
                                                                                                                                    <label>Medlemsnummer</label>
                                                                                                                                    <input type="text" name="membershipNumber" class="form-control" value="${e&&e.membershipNumber||""}">
                                                                                                                                </div>
                                                                                                                            </div>

                                                                                                                            <div class="form-group">
                                                                                                                                <label>Interne notater</label>
                                                                                                                                <textarea name="adminNotes" class="form-control" style="min-height:80px; resize:vertical;">${e&&e.adminNotes||""}</textarea>
                                                                                                                            </div>

                                                                                                                            <div class="form-group">
                                                                                                                                <label>Fødselsnummer (11 siffer - for skattefradrag)</label>
                                                                                                                                <input type="password" name="ssn" class="form-control" value="${e&&e.ssn||""}" placeholder="00000000000" maxlength="11" autocomplete="off">
                                                                                                                                    <p class="helper-text">Lagres kryptert/sikkert i Firestore for rapportering til Skatteetaten.</p>
                                                                                                                            </div>

                                                                                                                            <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px;">
                                                                                                                                <button type="button" class="btn-cancel" style="padding:10px 20px; border-radius:8px; border:1px solid #e2e8f0; background:none; cursor:pointer;">Avbryt</button>
                                                                                                                                <button type="submit" class="btn-primary">Lagre endringer</button>
                                                                                                                            </div>
                                                                                                                    </form>
                                                                                                                </div>
                                                                                                                `,s.style.display="flex";const o=s.querySelector(".close-modal-btn"),a=s.querySelector(".btn-cancel"),r=s.querySelector("#user-edit-form"),l=()=>s.style.display="none";o.onclick=l,a.onclick=l,s.onclick=d=>{d.target===s&&l()},r.onsubmit=async d=>{d.preventDefault();const c=new FormData(r),u={displayName:c.get("displayName"),email:c.get("email"),role:c.get("role"),phone:c.get("phone"),address:c.get("address"),zip:c.get("zip"),city:c.get("city"),birthdate:c.get("birthdate"),membershipNumber:c.get("membershipNumber"),adminNotes:c.get("adminNotes"),ssn:c.get("ssn")},m=c.get("id");await this.saveUser(m,u),l()}}async renderUserDetailView(e){const t=document.getElementById("users-section");if(!t)return;t.innerHTML=`
                                                                                                                <div class="section-header">
                                                                                                                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                                                                                                                        <button id="back-to-users-btn" class="icon-btn" title="Tilbake til oversikt">
                                                                                                                            <span class="material-symbols-outlined">arrow_back</span>
                                                                                                                        </button>
                                                                                                                        <h2 class="section-title">Brukerprofil</h2>
                                                                                                                    </div>
                                                                                                                    <p class="section-subtitle">Detaljert informasjon og rettigheter for valgt bruker.</p>
                                                                                                                </div>

                                                                                                                <div id="user-detail-container" class="loader"></div>
                                                                                                                `;const s=document.getElementById("back-to-users-btn");s&&(s.onclick=()=>{this.currentUserDetailId=null,this.userEditMode=!1,this.renderUsersSection()});const i=document.getElementById("user-detail-container");try{const n=await p.db.collection("users").doc(e).get();if(!n.exists){i.innerHTML='<p class="error-text">Bruker ble ikke funnet.</p>';return}const o={id:n.id,...n.data()};this.renderUserDetailLayout(i,o)}catch(n){console.error("Error loading user details:",n),i.innerHTML=`<p class="error-text">Feil ved lasting av brukerdetaljer: ${n.message}</p>`}}renderUserDetailLayout(e,t){const s=t.displayName||t.fullName||"Ukjent Navn",i=s.split(" ").map(c=>c[0]).join("").toUpperCase().substring(0,2),n=window.HKM_ROLES,o=Object.values(n).map(c=>`<option value="${c}" ${t.role===c?"selected":""}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join("");if(e.innerHTML=`
                                                                                                                <div style="max-width: 900px;">
                                                                                                                    <div class="card" style="margin-bottom: 24px;">
                                                                                                                        <div class="card-body" style="display: flex; align-items: center; gap: 32px; padding: 32px;">
                                                                                                                            <div class="user-avatar-lg" style="width: 100px; height: 100px; font-size: 36px; position: relative; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; ${t.photoURL?`background-image: url('${t.photoURL}'); background-size: cover; background-position: center;`:"background-color: var(--accent-color);"}">
                                                                                                                                ${t.photoURL?"":i}
                                                                                                                                ${this.userEditMode?`
                                <div id="change-photo-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; border-radius: inherit; cursor: pointer; color: white;">
                                    <span class="material-symbols-outlined">photo_camera</span>
                                </div>
                                <input type="file" id="user-photo-input" style="display: none;" accept="image/*">
                            `:""}
                                                                                                                            </div>
                                                                                                                            <div style="flex:1;">
                                                                                                                                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                                                                                                                    <div>
                                                                                                                                        <h3 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${this.escapeHtml(s)}</h3>
                                                                                                                                        <p style="color: var(--text-muted); font-size: 15px;">${this.escapeHtml(t.email||"Ingen e-post")}</p>
                                                                                                                                    </div>
                                                                                                                                    <div style="display:flex; gap:12px;">
                                                                                                                                        ${this.userEditMode?`
                                        <button id="cancel-edit-btn" class="action-btn">
                                            Avbryt
                                        </button>
                                        <button id="save-user-detail-btn" class="btn-primary">
                                            Lagre endringer
                                        </button>
                                    `:`
                                        <button id="activate-edit-btn" class="btn-secondary">
                                            <span class="material-symbols-outlined">edit</span>
                                            Aktiver redigering
                                        </button>
                                    `}
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <div style="margin-top:16px; display:flex; gap:16px;">
                                                                                                                                    <span class="role-badge role-badge-${t.role||"medlem"}">${(t.role||"medlem").toUpperCase()}</span>
                                                                                                                                    <span style="font-size:13px; color:var(--text-muted);">Opprettet: ${t.createdAt?t.createdAt.toDate?t.createdAt.toDate().toLocaleDateString("no-NO"):new Date(t.createdAt).toLocaleDateString("no-NO"):"Ukjent"}</span>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    </div>

                                                                                                                    ${this.userEditMode?`
                    <div id="upload-progress-container" style="display: none; margin-bottom: 24px;">
                        <div style="height: 4px; background: #eee; border-radius: 2px; overflow: hidden;">
                            <div id="upload-progress-bar" style="height: 100%; background: var(--accent-color); width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Laster opp bilde...</p>
                    </div>
                `:""}

                                                                                                                    <form id="user-detail-form" class="${this.userEditMode?"":"readonly-form"}">
                                                                                                                        <input type="hidden" name="id" value="${t.id}">

                                                                                                                            <div class="grid-2-cols equal" style="margin-bottom: 24px; gap: 24px;">
                                                                                                                                <div class="card">
                                                                                                                                    <div class="card-header"><h4 class="card-title">Personalia</h4></div>
                                                                                                                                    <div class="card-body">
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>Fullt navn</label>
                                                                                                                                            <input type="text" name="displayName" class="form-control" value="${this.escapeHtml(s)}" ${this.userEditMode?"":"disabled"} required>
                                                                                                                                        </div>
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>E-post (kun lesetilgang)</label>
                                                                                                                                            <input type="email" class="form-control" value="${this.escapeHtml(t.email||"")}" disabled>
                                                                                                                                        </div>
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>Telefon</label>
                                                                                                                                            <input type="tel" name="phone" class="form-control" value="${this.escapeHtml(t.phone||"")}" ${this.userEditMode?"":"disabled"}>
                                                                                                                                        </div>
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>Fødselsdato</label>
                                                                                                                                            <input type="date" name="birthdate" class="form-control" value="${t.birthdate||""}" ${this.userEditMode?"":"disabled"}>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </div>

                                                                                                                                <div class="card">
                                                                                                                                    <div class="card-header"><h4 class="card-title">Adresse</h4></div>
                                                                                                                                    <div class="card-body">
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>Gateadresse</label>
                                                                                                                                            <input type="text" name="address" class="form-control" value="${this.escapeHtml(t.address||"")}" ${this.userEditMode?"":"disabled"}>
                                                                                                                                        </div>
                                                                                                                                        <div class="form-grid-2 zip-city">
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label>Postnr</label>
                                                                                                                                                <input type="text" name="zip" class="form-control" value="${this.escapeHtml(t.zip||"")}" ${this.userEditMode?"":"disabled"}>
                                                                                                                                            </div>
                                                                                                                                            <div class="form-group">
                                                                                                                                                <label>Sted</label>
                                                                                                                                                <input type="text" name="city" class="form-control" value="${this.escapeHtml(t.city||"")}" ${this.userEditMode?"":"disabled"}>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>Fødselsnummer (kun for skattefradrag)</label>
                                                                                                                                            <input type="password" name="ssn" class="form-control" value="${t.ssn||""}" placeholder="11 siffer" maxlength="11" autocomplete="off" ${this.userEditMode?"":"disabled"}>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>

                                                                                                                            <div class="grid-2-cols equal" style="gap: 24px;">
                                                                                                                                <div class="card">
                                                                                                                                    <div class="card-header"><h4 class="card-title">Medlemskap & Tilgang</h4></div>
                                                                                                                                    <div class="card-body">
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>Rolle / Tilgangsnivå</label>
                                                                                                                                            <select name="role" class="form-control" ${this.userEditMode?"":"disabled"}>
                                                                                                                                                ${o}
                                                                                                                                            </select>
                                                                                                                                        </div>
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>Medlemsnummer</label>
                                                                                                                                            <input type="text" name="membershipNumber" class="form-control" value="${this.escapeHtml(t.membershipNumber||"")}" ${this.userEditMode?"":"disabled"}>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </div>

                                                                                                                                <div class="card">
                                                                                                                                    <div class="card-header"><h4 class="card-title">Interne notater</h4></div>
                                                                                                                                    <div class="card-body">
                                                                                                                                        <div class="form-group">
                                                                                                                                            <label>Notater (kun synlig for admin)</label>
                                                                                                                                            <textarea name="adminNotes" class="form-control" style="min-height:120px;" ${this.userEditMode?"":"disabled"}>${this.escapeHtml(t.adminNotes||"")}</textarea>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>

                                                                                                                            <div class="card" style="margin-top: 24px;">
                                                                                                                                <div class="card-header">
                                                                                                                                    <div style="display:flex; align-items:center; gap:8px;">
                                                                                                                                        <span class="material-symbols-outlined" style="color: var(--accent-color);">mail</span>
                                                                                                                                        <h4 class="card-title">Kommunikasjon</h4>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <div class="card-body">
                                                                                                                                    <div class="form-group">
                                                                                                                                        <label>Send e-post til bruker</label>
                                                                                                                                        <input type="text" id="manual-email-subject" class="form-control" placeholder="Emne..." style="margin-bottom:12px;">
                                                                                                                                            <textarea id="manual-email-message" class="form-control" style="min-height:150px;" placeholder="Skriv meldingen her..."></textarea>
                                                                                                                                    </div>
                                                                                                                                    <div style="display:flex; justify-content:flex-end; margin-top:16px;">
                                                                                                                                        <button type="button" id="send-manual-email-btn" class="btn-primary">
                                                                                                                                            <span class="material-symbols-outlined">send</span>
                                                                                                                                            Send e-post
                                                                                                                                        </button>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                    </form>
                                                                                                                </div>
                                                                                                                `,this.userEditMode){const c=document.getElementById("change-photo-overlay"),u=document.getElementById("user-photo-input");c&&u&&(c.onclick=()=>u.click(),u.onchange=async m=>{const v=m.target.files[0];v&&await this.handleUserPhotoUpload(t.id,v)})}const a=document.getElementById("activate-edit-btn");a&&(a.onclick=()=>{this.userEditMode=!0,this.renderUserDetailLayout(e,t)});const r=document.getElementById("cancel-edit-btn");r&&(r.onclick=()=>{this.userEditMode=!1,this.renderUserDetailLayout(e,t)});const l=document.getElementById("save-user-detail-btn");l&&(l.onclick=async()=>{const c=document.getElementById("user-detail-form"),u=new FormData(c),m={displayName:u.get("displayName"),phone:u.get("phone"),gender:t.gender||null,birthdate:u.get("birthdate"),address:u.get("address"),zip:u.get("zip"),city:u.get("city"),ssn:u.get("ssn"),membershipNumber:u.get("membershipNumber"),role:u.get("role"),adminNotes:u.get("adminNotes")};l.disabled=!0,l.textContent="Lagrer...";try{await this.saveUser(t.id,m),this.userEditMode=!1,await this.renderUserDetailView(t.id)}catch{l.disabled=!1,l.textContent="Lagre endringer"}});const d=document.getElementById("send-manual-email-btn");d&&(d.onclick=async()=>{const c=document.getElementById("manual-email-subject").value,u=document.getElementById("manual-email-message").value;if(!c||!u){this.showToast("Vennligst fyll ut både emne og melding.","warning");return}d.disabled=!0;const m=d.innerHTML;d.innerHTML='<span class="material-symbols-outlined">sync</span> Sender...';try{await this.sendEmailToUser(t.email,c,u),document.getElementById("manual-email-subject").value="",document.getElementById("manual-email-message").value=""}finally{d.disabled=!1,d.innerHTML=m}})}async saveUser(e,t){const s={};Object.keys(t).forEach(i=>{t[i]!==void 0&&t[i]!==null&&(s[i]=t[i])});try{if(e)await p.db.collection("users").doc(e).set({...s,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:!0}),this.showToast("Bruker oppdatert.","success");else{const i=await p.db.collection("users").add({...s,createdAt:firebase.firestore.FieldValue.serverTimestamp()});await this.createAdminNotification({type:"NEW_USER",userId:i.id,userEmail:s.email,userName:s.displayName,message:`Ny bruker registrert: ${s.displayName||s.email}`}),this.showToast("Brukerrettigheter opprettet og admin varslet.","success")}await this.loadUsersList()}catch(i){console.error("Error saving user:",i),this.showToast("Kunne ikke lagre bruker: "+i.message,"error")}}async handleUserPhotoUpload(e,t){const s=document.getElementById("upload-progress-bar"),i=document.getElementById("upload-progress-container"),n=document.querySelector(".user-avatar-lg");i&&(i.style.display="block");try{const o=`profiles/${e}/avatar_${Date.now()}.jpg`,a=await p.uploadImage(t,o,r=>{s&&(s.style.value=r)});if(n){n.style.backgroundImage=`url('${a}')`,n.style.backgroundColor="transparent",n.innerHTML=`
                                                                                                                <div id="change-photo-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; border-radius: inherit; cursor: pointer; color: white;">
                                                                                                                    <span class="material-symbols-outlined">photo_camera</span>
                                                                                                                </div>
                                                                                                                <input type="file" id="user-photo-input" style="display: none;" accept="image/*">
                                                                                                                    `;const r=document.getElementById("change-photo-overlay"),l=document.getElementById("user-photo-input");r&&l&&(r.onclick=()=>l.click(),l.onchange=d=>this.handleUserPhotoUpload(e,d.target.files[0]))}await p.db.collection("users").doc(e).update({photoURL:a,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}),this.showToast("Profilbilde er oppdatert.","success")}catch(o){console.error("Error uploading photo:",o),this.showToast("Kunne ikke laste opp bilde: "+o.message,"error")}finally{i&&(i.style.display="none")}}async sendEmailToUser(e,t,s){if(!e){this.showToast("Brukeren mangler e-postadresse.","error");return}try{const n=await(await fetch("https://sendmanualemail-7fskzic55a-uc.a.run.app",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:e,subject:t,message:s,fromName:"His Kingdom Ministry"})})).json();if(n.success)this.showToast("E-post er sendt!","success");else throw new Error(n.error||"Kunne ikke sende e-post.")}catch(i){console.error("Feil ved sending av e-post:",i),this.showToast("Feil ved sending: "+i.message,"error")}}async deleteUser(e){try{await p.db.collection("users").doc(e).delete(),this.showToast("Bruker fjernet fra oversikten.","success"),await this.loadUsersList()}catch(t){console.error("Error deleting user:",t),this.showToast("Kunne ikke slette bruker: "+t.message,"error")}}async renderAutomationSection(){const e=document.getElementById("automation-section");e&&(console.log("Rendering Automation Section..."),this.initAutomationTabs(),await Promise.all([this.loadEmailTemplates(),this.loadEmailLogs()]),e.setAttribute("data-rendered","true"))}initAutomationTabs(){const e=document.querySelectorAll(".automation-tab"),t=document.querySelectorAll(".automation-pane");e.forEach(s=>{s.dataset.bound||(s.dataset.bound="true",s.addEventListener("click",()=>{const i=s.dataset.tab;e.forEach(n=>n.classList.toggle("active",n===s)),t.forEach(n=>n.classList.toggle("active",n.id===`automation-${i}`))}))})}async loadEmailTemplates(){const e=document.getElementById("email-templates-body");if(e)try{const t=[{id:"welcome_email",name:"Velkomst-e-post",description:"Sendes når en ny bruker registrerer seg."},{id:"newsletter_confirmation",name:"Nyhetsbrev-bekreftelse",description:"Sendes ved påmelding til nyhetsbrev."}];e.innerHTML="";for(const s of t){const i=await p.db.collection("email_templates").doc(s.id).get(),n=i.exists?i.data():{},o=document.createElement("tr");o.innerHTML=`
                    <td>
                        <div class="user-info-cell">
                            <span class="user-name">${s.name}</span>
                        </div>
                    </td>
                    <td><span class="text-muted">${s.description}</span></td>
                    <td>${n.updatedAt?new Date(n.updatedAt).toLocaleDateString("no-NO"):"Standard"}</td>
                    <td class="col-actions">
                        <button class="icon-btn edit-template-btn" title="Rediger mal">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    </td>
                `,o.querySelector(".edit-template-btn").addEventListener("click",()=>{this.openTemplateEditor(s.id,s.name,n)}),e.appendChild(o)}}catch(t){console.error("Feil ved lasting av e-postmaler:",t),e.innerHTML='<tr><td colspan="4">Kunne ikke laste maler.</td></tr>'}}async loadEmailLogs(){const e=document.getElementById("email-logs-body");if(e)try{const t=await p.db.collection("email_logs").orderBy("timestamp","desc").limit(50).get();e.innerHTML=t.empty?'<tr><td colspan="5">Ingen logger funnet.</td></tr>':"",t.forEach(s=>{const i=s.data(),n=document.createElement("tr"),o=i.timestamp?i.timestamp.toDate():new Date(i.sentAt);n.innerHTML=`
                    <td>${i.to}</td>
                    <td>${i.subject}</td>
                    <td><span class="badge status-read">${i.type||"automated"}</span></td>
                    <td>${o.toLocaleString("no-NO")}</td>
                    <td>
                        <span class="status-pill ${i.status}">
                            ${i.status==="sent"?"Sendt":"Feilet"}
                        </span>
                    </td>
                `,e.appendChild(n)})}catch(t){console.error("Feil ved lasting av e-postlogger:",t),e.innerHTML='<tr><td colspan="5">Kunne ikke laste logger.</td></tr>'}}initTemplateEditorModal(){const e=document.getElementById("template-editor-modal"),t=document.getElementById("close-template-modal"),s=document.getElementById("cancel-template-edit"),i=document.getElementById("save-template-btn");if(!e||!i)return;typeof Quill<"u"&&!this.quill&&(this.quill=new Quill("#edit-template-body",{theme:"snow",modules:{toolbar:[[{header:[1,2,3,!1]}],["bold","italic","underline","strike"],[{color:[]},{background:[]}],[{list:"ordered"},{list:"bullet"}],[{align:[]}],["link","clean"]]}}));const n=()=>{e.style.display="none"};t&&(t.onclick=n),s&&(s.onclick=n),e.onclick=o=>{o.target===e&&n()},document.addEventListener("keydown",o=>{o.key==="Escape"&&e.style.display==="flex"&&n()}),document.querySelectorAll(".insert-var-btn").forEach(o=>{o.onclick=()=>{const a=o.dataset.var;if(this.quill){const r=this.quill.getSelection(!0);this.quill.insertText(r.index,a),this.quill.setSelection(r.index+a.length)}}}),i.onclick=async()=>{const o=document.getElementById("edit-template-id").value,a=document.getElementById("edit-template-subject").value,r=this.quill?this.quill.root.innerHTML:"";if(!a){this.showToast("Emnefeltet kan ikke være tomt.","error");return}i.disabled=!0,i.textContent="Lagrer...";try{await p.db.collection("email_templates").doc(o).set({subject:a,body:r,updatedAt:new Date().toISOString()},{merge:!0}),this.showToast("Malen er oppdatert.","success"),n(),await this.loadEmailTemplates()}catch(l){console.error("Feil ved lagring av mal:",l),this.showToast("Kunne ikke lagre malen.","error")}finally{i.disabled=!1,i.textContent="Lagre mal"}}}async openTemplateEditor(e,t,s){const i=document.getElementById("template-editor-modal");if(!i)return;document.getElementById("edit-template-id").value=e,document.getElementById("template-editor-title").textContent=`Rediger mal: ${t}`,document.getElementById("edit-template-subject").value=s.subject||"";const n=s.body||"";this.quill&&(this.quill.root.innerHTML=n),i.style.display="flex"}async createAdminNotification(e){try{await p.db.collection("admin_notifications").add({...e,timestamp:firebase.firestore.FieldValue.serverTimestamp(),read:!1}),console.log("Admin notification created:",e)}catch(t){console.warn("Failed to create admin notification:",t)}}}window.adminManager=new R;
