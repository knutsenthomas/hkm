document.addEventListener("DOMContentLoaded",()=>{const o=localStorage.getItem("hkm_cookie_consent");if(!o)l();else{const t=JSON.parse(o);s(t)}});function l(){document.body.insertAdjacentHTML("beforeend",`
    <div id="cookie-consent-backdrop"></div>
    <div id="cookie-consent-banner">
        <div class="cookie-content">
            <h3 class="cookie-title">Vi bryr oss om ditt personvern</h3>
            <p class="cookie-text">
                Vi bruker informasjonskapsler (cookies) for at nettsiden skal fungere, for å analysere trafikken vår og for å tilby deg en bedre brukeropplevelse. 
                Du kan velge hvilke kategorier du vil tillate.
                <a href="personvern.html" class="cookie-details-link">Les vår personvernerklæring</a>
            </p>
            
            <div class="cookie-options">
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-necessary" class="cookie-toggle" checked disabled>
                    <label for="cookie-necessary">Nødvendige (Alltid på)</label>
                </div>
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-analytics" class="cookie-toggle">
                    <label for="cookie-analytics">Statistikk</label>
                </div>
                <div class="cookie-option">
                    <input type="checkbox" id="cookie-marketing" class="cookie-toggle">
                    <label for="cookie-marketing">Markedsføring</label>
                </div>
            </div>

            <div class="cookie-buttons">
                <button id="btn-accept-all" class="btn-cookie btn-cookie-accept">Tillat alle</button>
                <button id="btn-accept-selection" class="btn-cookie btn-cookie-selection">Tillat utvalgte</button>
                <button id="btn-deny-all" class="btn-cookie btn-cookie-deny">Avvis alle</button>
            </div>
        </div>
    </div>
    `);const o=document.getElementById("cookie-consent-banner"),t=document.getElementById("cookie-consent-backdrop");setTimeout(()=>{o.classList.add("visible"),t.classList.add("visible")},100),document.getElementById("btn-accept-all").addEventListener("click",()=>{i({necessary:!0,analytics:!0,marketing:!0}),n()}),document.getElementById("btn-deny-all").addEventListener("click",()=>{i({necessary:!0,analytics:!1,marketing:!1}),n()}),document.getElementById("btn-accept-selection").addEventListener("click",()=>{const c=document.getElementById("cookie-analytics").checked,a=document.getElementById("cookie-marketing").checked;i({necessary:!0,analytics:c,marketing:a}),n()})}function n(){const e=document.getElementById("cookie-consent-banner"),o=document.getElementById("cookie-consent-backdrop");e&&(e.classList.remove("visible"),o&&o.classList.remove("visible"),setTimeout(()=>{e.remove(),o&&o.remove()},500))}async function i(e){if(localStorage.setItem("hkm_cookie_consent",JSON.stringify(e)),window.firebaseService&&window.firebaseService.isInitialized){const o={choices:e,timestamp:firebase.firestore.FieldValue.serverTimestamp(),userAgent:navigator.userAgent,url:window.location.href};try{const t=firebase.auth().currentUser;t?(await firebase.firestore().collection("users").doc(t.uid).set({privacySettings:o},{merge:!0}),console.log("Consent saved to profile.")):(await firebase.firestore().collection("consent_logs").add(o),console.log("Anonymous consent logged."))}catch(t){console.error("Error persisting consent:",t)}}s(e)}function s(e){console.log("Applying Cookie Consent:",e),e.analytics&&console.log("Analytics Enabled - Loading scripts..."),e.marketing&&console.log("Marketing Enabled - Loading pixel...")}
