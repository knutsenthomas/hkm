// Biblical Characters Catalog and Details Page Rendering Logic
import { biblicalCharacters } from './bibelske-personer-data.js';

document.addEventListener('DOMContentLoaded', () => {
    const lang = document.documentElement.lang || 'no';
    
    // 1. Catalog Grid Page
    const gridContainer = document.getElementById('characters-grid-container');
    if (gridContainer) {
        renderCatalog(gridContainer, lang);
    }
    
    // 2. Detail Page
    const detailContainer = document.getElementById('character-detail-container');
    if (detailContainer) {
        renderDetails(detailContainer, lang);
    }
});

function renderCatalog(container, lang) {
    if (!biblicalCharacters || !biblicalCharacters.length) {
        container.innerHTML = `<p>${lang === 'en' ? 'No characters found.' : (lang === 'es' ? 'No se encontraron personajes.' : 'Ingen personer funnet.')}</p>`;
        return;
    }
    
    const readBioText = lang === 'en' ? 'Read full biography' : (lang === 'es' ? 'Leer biografía completa' : 'Les hele biografien');
    
    const html = biblicalCharacters.map(char => {
        const name = char.name[lang] || char.name.no;
        const role = char.role[lang] || char.role.no;
        const era = char.era[lang] || char.era.no;
        const summary = char.summary[lang] || char.summary.no;
        
        return `
            <a href="bibelsk-person-detaljer.html?id=${char.id}" class="character-card">
                <div class="character-card-image-wrap">
                    <img src="${char.image}" alt="${name}" loading="lazy">
                </div>
                <div class="character-card-content">
                    <div class="character-card-era">${era}</div>
                    <h3 class="character-card-title">${name}</h3>
                    <div class="character-card-role">${role}</div>
                    <p class="character-card-excerpt">${summary}</p>
                    <div class="character-card-footer">
                        <span>${readBioText}</span>
                        <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
            </a>
        `;
    }).join('');
    
    container.innerHTML = html;
}

function renderDetails(container, lang) {
    const urlParams = new URLSearchParams(window.location.search);
    const charId = urlParams.get('id');
    
    if (!charId) {
        showError(container, lang, 'ID missing');
        return;
    }
    
    const char = biblicalCharacters.find(c => c.id === charId.toLowerCase());
    if (!char) {
        showError(container, lang, 'Not found');
        return;
    }
    
    // Update document title
    const charName = char.name[lang] || char.name.no;
    document.title = `${charName} | His Kingdom Ministry`;
    
    // Update Subpage Hero dynamically with relevant background portrait
    const role = char.role[lang] || char.role.no;
    const heroSection = document.querySelector('.subpage-hero');
    if (heroSection) {
        heroSection.style.setProperty('background', `linear-gradient(135deg, rgba(27, 73, 101, 0.85) 0%, rgba(209, 125, 57, 0.9) 100%), url('${char.image}') center 30% / cover no-repeat`, 'important');
        heroSection.style.setProperty('background-image', `linear-gradient(135deg, rgba(27, 73, 101, 0.85) 0%, rgba(209, 125, 57, 0.9) 100%), url('${char.image}')`, 'important');
        
        const heroTitle = heroSection.querySelector('.hero-title');
        if (heroTitle) {
            heroTitle.textContent = charName;
        }
        
        const heroSubtitle = heroSection.querySelector('p');
        if (heroSubtitle) {
            heroSubtitle.textContent = role;
        }
    }
    
    // Get translations for fact labels
    const meaningLabel = lang === 'en' ? 'Name Meaning' : (lang === 'es' ? 'Significado del Nombre' : 'Navnets betydning');
    const eraLabel = lang === 'en' ? 'Era' : (lang === 'es' ? 'Época' : 'Historisk tid');
    const roleLabel = lang === 'en' ? 'Role' : (lang === 'es' ? 'Rol/Tittel' : 'Rolle / Tittel');
    const versesTitle = lang === 'en' ? 'Key Bible Passages' : (lang === 'es' ? 'Pasajes Bíblicos Clave' : 'Sentrale bibelske skrifter');
    const storyTitle = lang === 'en' ? 'Biblical Biography & History' : (lang === 'es' ? 'Biografía e Historia Bíblica' : 'Biografi og bibelsk historie');
    const significanceTitle = lang === 'en' ? 'Theological Significance' : (lang === 'es' ? 'Teológica Importancia' : 'Teologisk betydning');
    
    const era = char.era[lang] || char.era.no;
    const meaning = char.meaning[lang] || char.meaning.no;
    const summary = char.summary[lang] || char.summary.no;
    const story = char.story[lang] || char.story.no;
    const theology = char.theologicalSignificance[lang] || char.theologicalSignificance.no;
    
    // Generate verses badges
    const biblePath = lang === 'no' ? '/bibel' : `/${lang}/bibel`;
    const versesHtml = char.verses.map(v => `
        <a href="${biblePath}?ref=${encodeURIComponent(v)}" class="verse-badge">
            <i class="fas fa-book-open"></i>
            ${v}
        </a>
    `).join('');
    
    const html = `
        <div class="detail-main-card">
            <div class="detail-section">
                <h2 class="detail-section-title">${storyTitle}</h2>
                <p class="detail-paragraph" style="font-weight: 500; font-size: 16px; color: var(--text-dark); margin-bottom: 24px;">
                    ${summary}
                </p>
                <div class="detail-paragraph-body">
                    ${story.split('\n').map(p => `<p class="detail-paragraph">${p}</p>`).join('')}
                </div>
            </div>
            
            <div class="detail-section">
                <h2 class="detail-section-title">${significanceTitle}</h2>
                <div class="detail-paragraph-body">
                    ${theology.split('\n').map(p => `<p class="detail-paragraph">${p}</p>`).join('')}
                </div>
            </div>
        </div>
        
        <div class="detail-sidebar-card">
            <div class="sidebar-image-wrap">
                <img src="${char.image}" alt="${charName}">
            </div>
            
            <h1 class="sidebar-character-name">${charName}</h1>
            <div class="sidebar-character-role">${role}</div>
            
            <div class="quick-fact-item">
                <i class="fas fa-history quick-fact-icon"></i>
                <div class="quick-fact-content">
                    <span class="quick-fact-label">${eraLabel}</span>
                    <span class="quick-fact-value">${era}</span>
                </div>
            </div>
            
            <div class="quick-fact-item">
                <i class="fas fa-tag quick-fact-icon"></i>
                <div class="quick-fact-content">
                    <span class="quick-fact-label">${meaningLabel}</span>
                    <span class="quick-fact-value">${meaning}</span>
                </div>
            </div>
            
            <div class="quick-fact-item">
                <i class="fas fa-circle-info quick-fact-icon"></i>
                <div class="quick-fact-content">
                    <span class="quick-fact-label">${roleLabel}</span>
                    <span class="quick-fact-value">${role}</span>
                </div>
            </div>
            
            <h3 class="sidebar-section-title">${versesTitle}</h3>
            <div class="verses-list">
                ${versesHtml}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function showError(container, lang, reason) {
    const errorText = lang === 'en' 
        ? 'Could not load character profile. Please check the URL or try again later.' 
        : (lang === 'es' ? 'No se pudo cargar el perfil del personaje. Por favor, compruebe la URL.' : 'Kunne ikke laste inn personprofilen. Vennligst sjekk nettadressen eller prøv igjen senere.');
    
    container.innerHTML = `
        <div class="detail-main-card" style="grid-column: 1 / -1; text-align: center; padding: 64px 24px;">
            <i class="fas fa-triangle-exclamation" style="font-size: 48px; color: var(--primary-red); margin-bottom: 16px;"></i>
            <h2 style="font-size: 20px; font-weight: 800; color: var(--text-dark);">${errorText}</h2>
            <div class="back-btn-container" style="margin-top: 24px; margin-bottom: 0;">
                <a href="bibelske-personer.html" class="back-link-btn">
                    <i class="fas fa-arrow-left"></i>
                    ${lang === 'en' ? 'Back to overview' : (lang === 'es' ? 'Volver al resumen' : 'Tilbake til oversikten')}
                </a>
            </div>
        </div>
    `;
}
