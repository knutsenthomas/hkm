(function(){const c="https://us-central1-his-kingdom-ministry.cloudfunctions.net/logSystemError",l=window.location.hostname!=="localhost"&&window.location.hostname!=="127.0.0.1";async function n(e,o,r="WARNING",a={}){if(!l&&r!=="CRITICAL"){console.warn("[Local Logger]",e,o);return}try{await fetch(c,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:e,message:o,severity:r,url:window.location.href,userAgent:navigator.userAgent,userId:d(),additionalData:a})})}catch(t){console.error("Failed to send system log:",t)}}function d(){try{const e=Object.keys(localStorage).find(o=>o.startsWith("firebase:authUser"));if(e)return JSON.parse(localStorage.getItem(e)).uid}catch{}return"anonymous"}window.onerror=function(e,o,r,a,t){const i=e||"Unknown Script Error";i.includes("Script error.")&&!t||i.includes("ResizeObserver loop completed with undelivered notifications")||(n("ScriptError",`${i} at ${o}:${r}:${a}`,"WARNING",{stack:t?t.stack:null}),u())},window.onunhandledrejection=function(e){n("UnhandledPromise",e.reason?e.reason.toString():"Unknown Promise Error","WARNING")};function u(){if(document.getElementById("hkm-error-toast"))return;const e=document.createElement("div");e.id="hkm-error-toast",e.style.cssText=`
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideUp 0.3s ease;
        `,e.innerHTML=`
            <i class="fas fa-exclamation-circle" style="color: #FFA500;"></i>
            <span>En uventet feil oppstod. Vi har logget problemet.</span>
            <button style="background:none; border:none; color:#aaa; cursor:pointer; margin-left:10px;">&times;</button>
        `,document.body.appendChild(e),e.querySelector("button").onclick=()=>e.remove(),setTimeout(()=>{e.parentNode&&e.remove()},5e3)}const s=document.createElement("style");s.innerHTML=`
        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `,document.head.appendChild(s),window.hkmLogger={log:e=>n("ManualLog",e,"INFO"),warn:e=>n("ManualWarning",e,"WARNING"),error:e=>n("ManualError",e,"CRITICAL")}})();
