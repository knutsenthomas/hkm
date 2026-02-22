import"./modulepreload-polyfill-B5Qt9EMX.js";/* empty css                      *//* empty css                       */import"./error-logger-DVkGMsfx.js";import"./firebase-config-BNsh33Gw.js";import"./firebase-service-DNKZ8naa.js";import"./user-roles-D0mdCVLS.js";import"./i18n-CkTTiwon.js";import"./script-C6j4tohW.js";import"./content-manager-Aaq_A_3n.js";import"./cookie-consent-DUwA3p5Q.js";(async function(){let r=0;for(;(!window.firebaseService||!window.firebaseService.isInitialized)&&r<100;)await new Promise(e=>setTimeout(e,50)),r++;const t=document.getElementById("admin-link"),n=window.firebaseService;!t||!n||!n.isInitialized||firebase.auth().onAuthStateChanged(async e=>{if(!e)return;let i="medlem";try{i=await n.getUserRole(e.uid)}catch(a){console.warn("Kunne ikke hente rolle for admin-lenke:",a)}const o=window.HKM_PERMISSIONS&&Array.isArray(window.HKM_PERMISSIONS.ACCESS_ADMIN)&&window.HKM_PERMISSIONS.ACCESS_ADMIN.includes(i);t.href=o?"admin/index.html":"minside/index.html"})})();(async function(){let r=0;for(;(!window.firebaseService||!window.firebaseService.isInitialized)&&r<100;)await new Promise(e=>setTimeout(e,50)),r++;const t=document.getElementById("header-profile-link"),n=window.firebaseService;!t||!n||!n.isInitialized||firebase.auth().onAuthStateChanged(async e=>{if(!e)return;let i="medlem";try{i=await n.getUserRole(e.uid)}catch(a){console.warn("Kunne ikke hente rolle for profil-lenke:",a)}const o=window.HKM_PERMISSIONS&&Array.isArray(window.HKM_PERMISSIONS.ACCESS_ADMIN)&&window.HKM_PERMISSIONS.ACCESS_ADMIN.includes(i);t.href=o?"admin/index.html":"minside/index.html"})})();(async function(){let r=0;for(;(!window.firebaseService||!window.firebaseService.isInitialized)&&r<100;)await new Promise(e=>setTimeout(e,50)),r++;const t=window.firebaseService;if(!t||!t.isInitialized)return;async function n(){try{const e=await t.getPageContent("collection_causes"),i=e&&Array.isArray(e.items)?e.items:[],o=document.getElementById("innsamling");if(!o)return;if(i.length===0){o.style.display="none";return}o.style.display="block";const a=o.querySelector(".causes-grid");if(!a)return;a.innerHTML=i.map(s=>{const c=s.goal>0?Math.round(s.collected/s.goal*100):0;return`
                            <div class="cause-card">
                                <div class="cause-image">
                                    <img src="${s.image||"https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop"}" alt="${s.title}" style="width: 100%; height: 100%; object-fit: cover;">
                                </div>
                                <div class="cause-content">
                                    <h3 class="cause-title">${s.title||"Innsamlingsaksjon"}</h3>
                                    <p class="cause-text">${s.description||""}</p>

                                    <div class="cause-progress">
                                        <div class="progress-bar">
                                            <div class="progress-fill" data-progress="${c}" style="width: ${c}%;"></div>
                                        </div>
                                        <div class="progress-stats">
                                            <span><strong>${(s.collected||0).toLocaleString("no-NO")} kr</strong> samlet inn</span>
                                            <span><strong>${(s.goal||0).toLocaleString("no-NO")} kr</strong> mål</span>
                                        </div>
                                    </div>

                                    <a href="donasjoner.html" class="btn btn-primary btn-block">Donér nå</a>
                                </div>
                            </div>
                        `}).join("")}catch(e){console.error("Error loading causes:",e);const i=document.getElementById("innsamling");i&&(i.style.display="none")}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",n):n()})();
