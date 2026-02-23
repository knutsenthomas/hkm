async function m(e,n="teaching-grid",t=".section-title",s="undervisning"){try{const i=await firebaseService.getPageContent("collection_teaching");if(!i||!i.items||i.items.length===0){g(n,s),f(t,0,s);return}const r=i.items.filter(o=>{const c=String(o.category||o.teachingType||"").trim().toLowerCase(),a=e.trim().toLowerCase();return c?!!(c===a||a.includes("bibelstudie")&&c.includes("bibelstudie")||a.includes("seminar")&&c.includes("seminar")||a.includes("undervisningsserie")&&c.includes("undervisningsserie")):!1}),l=document.getElementById(n);if(!l){console.error(`Container with ID ${n} not found`);return}if(f(t,r.length,s),r.length===0){g(n,s);return}l.innerHTML="",r.forEach((o,c)=>{const a=h(o,c);l.appendChild(a)})}catch(i){console.error(`Error loading teaching category ${e}:`,i);const r=document.getElementById(n);if(r){const l=document.documentElement.lang||"no";let o="";l==="en"?o="Sorry, could not load teaching content.":l==="es"?o="Lo siento, no se pudo cargar el contenido de enseñanza.":o="Beklager, kunne ikke laste undervisningsinnhold.",r.innerHTML=`<p style="grid-column: 1/-1; text-align: center; color: #666;">${o}</p>`}}}function h(e,n){const t=e.id||e.title,s=!!t,i=s?`${y()}?id=${encodeURIComponent(t)}`:"#",r=document.createElement(s?"a":"div");r.className="media-card",s&&(r.href=i);const l=e.imageUrl||"https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop",o=e.title||`Undervisning ${n+1}`,c=$(e)||"Klikk for mer informasjon";let a="";if(e.date)try{a=new Date(e.date).toLocaleDateString("no-NO",{year:"numeric",month:"long",day:"numeric"})}catch{a=e.date}return r.innerHTML=`
        <div class="media-thumbnail">
            <img src="${d(l)}" alt="${d(o)}" onerror="this.src='https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'">
            <div class="media-play-button">
                <i class="fas fa-book-open"></i>
            </div>
            ${e.date?`<span class="media-duration">${d(a)}</span>`:""}
        </div>
        <div class="media-content">
            <h3 class="media-title">${d(o)}</h3>
            <p class="media-description">${d(c.substring(0,120))}${c.length>120?"...":""}</p>
            <div class="media-meta">
                ${e.author?`<span><i class="fas fa-user"></i> ${d(e.author)}</span>`:""}
                ${e.date?`<span><i class="far fa-calendar"></i> ${d(a)}</span>`:""}
            </div>
        </div>
    `,r}function y(){const e=document.documentElement.lang||"no";return e.startsWith("en")||e.startsWith("es")?"blog-post.html":"blogg-post.html"}function $(e){if(typeof e.seoDescription=="string"&&e.seoDescription.trim())return e.seoDescription.trim();if(typeof e.description=="string"&&e.description.trim())return e.description.trim();if(e.content&&typeof e.content=="object"&&Array.isArray(e.content.blocks)){const n=e.content.blocks.filter(t=>t.type!=="header").map(t=>!t||!t.data?"":typeof t.data.text=="string"?u(t.data.text):Array.isArray(t.data.items)?u(t.data.items.join(" ")):typeof t.data.caption=="string"?u(t.data.caption):"").filter(Boolean).join(" ");if(n)return n}else if(typeof e.content=="string"&&e.content.trim())return u(e.content.trim());return""}function u(e){return String(e||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim()}function g(e,n="undervisning"){const t=document.getElementById(e);if(!t)return;const s=document.documentElement.lang||"no";let i="",r="";s==="en"?(i=`No ${n.toLowerCase()} available right now`,r="Please check back later"):s==="es"?(i=`No hay ${n.toLowerCase()} disponibles en este momento`,r="Por favor, vuelve a comprobar más tarde"):(i=`Ingen ${n.toLowerCase()} er tilgjengelig akkurat nå`,r="Vennligst sjekk tilbake senere"),t.innerHTML=`
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #666;">
            <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
            <p style="font-size: 18px; margin: 20px 0;">${i}</p>
            <p style="font-size: 14px; opacity: 0.7;">${r}</p>
        </div>
    `}function f(e,n,t="undervisning"){const s=document.querySelector(e);if(!s)return;const i=document.documentElement.lang||"no";let r="";i==="en"?r=n===0?`No ${t}`:`${n} ${t}`:i==="es"?r=n===0?`No hay ${t}`:`${n} ${t}`:r=n===0?`Ingen ${t}`:`${n} ${t}`,s.textContent=r}function d(e){const n={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"};return String(e).replace(/[&<>"']/g,t=>n[t])}window.loadTeachingCategory=m;
