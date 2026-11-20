// ===================================
// Teaching Content Loader
// ===================================


// Faste-undervisningen er en egen side (ikke et CMS-innlegg) og vises først under Bibelstudier.
const FASTE_ID = 'item-1795125986813-h8n6uapai';
function getFasteTeachingItem() {
    const lang = (document.documentElement.lang || 'no').toLowerCase();
    const base = { id: FASTE_ID, date: '2026-11-20', imageUrl: 'https://images.unsplash.com/photo-1457139621581-298d1801c832?auto=format&fit=crop&w=1200&q=80', category: 'Bibelstudie', teachingType: 'Bibelstudie', published: true };
    if (lang.startsWith('en')) return Object.assign(base, { title: 'Fasting – making more room for God', href: '/en/teaching/fasting', seoDescription: 'What is biblical fasting, why do we fast, and how can you get started safely? With videos, questions and a checklist.' });
    if (lang.startsWith('es')) return Object.assign(base, { title: 'El ayuno – dar más espacio a Dios', href: '/es/ensenanza/ayuno', seoDescription: '¿Qué es el ayuno bíblico, por qué ayunamos y cómo empezar de forma segura? Con videos, preguntas y lista de control.' });
    return Object.assign(base, { title: 'Faste – å gi Gud mer plass', href: '/undervisning/faste', seoDescription: 'Hva er bibelsk faste, hvorfor faster vi, og hvordan kommer du i gang på en trygg måte? Med videoer, spørsmål og sjekkliste.' });
}

/**
 * Load and render teaching content by category
 * @param {string} categoryName - The category to filter by (e.g., 'Bibelstudier', 'Seminarer', 'Undervisningsserier')
 * @param {string} gridContainerId - The ID of the container to render into
 * @param {string} countElementSelector - The selector for the element to update with count (e.g., '.section-title')
 * @param {string} emptyLabel - Label for empty message (e.g., 'Bibelstudier', 'Seminarer')
 */
async function loadTeachingCategory(categoryName, gridContainerId = 'teaching-grid', countElementSelector = '.section-title', emptyLabel = 'undervisning') {
    try {
        // Get the teaching collection data
        let teachingData = await firebaseService.getPageContent('collection_teaching');

        if (String(categoryName).toLowerCase().includes('bibelstudie')) {
            const rest = (teachingData && Array.isArray(teachingData.items) ? teachingData.items : []).filter(i => i && i.id !== FASTE_ID);
            teachingData = Object.assign({}, teachingData || {}, { items: [getFasteTeachingItem(), ...rest] });
        }

        if (!teachingData || !teachingData.items || teachingData.items.length === 0) {
            renderEmptyTeachingState(gridContainerId, emptyLabel);
            updateTeachingCount(countElementSelector, 0, emptyLabel);
            return;
        }

        // Filter items by category (flexible match for singular/plural)
        const filteredItems = teachingData.items.filter(item => {
            if (item && item.published === false) return false;
            const itemCat = String(item.category || item.teachingType || '').trim().toLowerCase();
            const targetCat = categoryName.trim().toLowerCase();

            if (!itemCat) return false;
            if (itemCat === targetCat) return true;

            // Loose matching for plurals/singulars
            if (targetCat.includes('bibelstudie') && itemCat.includes('bibelstudie')) return true;
            if (targetCat.includes('seminar') && itemCat.includes('seminar')) return true;
            if (targetCat.includes('undervisningsserie') && itemCat.includes('undervisningsserie')) return true;

            return false;
        });

        const container = document.getElementById(gridContainerId);
        if (!container) {
            console.error(`Container with ID ${gridContainerId} not found`);
            return;
        }

        // Update the count display
        updateTeachingCount(countElementSelector, filteredItems.length, emptyLabel);

        // Render empty state if no items
        if (filteredItems.length === 0) {
            renderEmptyTeachingState(gridContainerId, emptyLabel);
            return;
        }

        // Render media cards
        container.innerHTML = '';
        filteredItems.forEach((item, index) => {
            const card = createTeachingCard(item, index);
            container.appendChild(card);
        });

    } catch (error) {
        console.error(`Error loading teaching category ${categoryName}:`, error);
        const container = document.getElementById(gridContainerId);
        if (container) {
            const lang = document.documentElement.lang || 'no';
            let usageErrorMsg = '';

            if (lang === 'en') {
                usageErrorMsg = 'Sorry, could not load teaching content.';
            } else if (lang === 'es') {
                usageErrorMsg = 'Lo siento, no se pudo cargar el contenido de enseñanza.';
            } else {
                usageErrorMsg = 'Beklager, kunne ikke laste undervisningsinnhold.';
            }

            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #666;">${usageErrorMsg}</p>`;
        }
    }
}

/**
 * Create a media card element for a teaching item
 * @param {object} item - The teaching item data
 * @param {number} index - The index of the item
 * @returns {HTMLElement} The card element
 */
function createTeachingCard(item, index) {
    const itemKey = item.id || item.title;
    const isClickable = !!itemKey;
    const detailsUrl = item.href ? item.href : (isClickable ? `${getLocalizedPostLink()}?id=${encodeURIComponent(itemKey)}` : '#');

    const card = document.createElement(isClickable ? 'a' : 'div');
    card.className = 'media-card';
    if (isClickable) {
        card.href = detailsUrl;
    }

    // Determine image URL (use item image or fallback to unsplash)
    const imageUrl = item.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop';

    // Extract title - handle markdown/text safely
    const title = item.title || `Undervisning ${index + 1}`;

    // Extract description - handle markdown/text safely
    const description = getDescriptionText(item) || 'Klikk for mer informasjon';

    // Format date if available
    let dateStr = '';
    if (item.date) {
        try {
            const date = new Date(item.date);
            dateStr = date.toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            dateStr = item.date;
        }
    }

    card.innerHTML = `
        <div class="media-thumbnail">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" onerror="this.src='https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop'">
            ${item.date ? `<span class="media-duration">${escapeHtml(dateStr)}</span>` : ''}
        </div>
        <div class="media-content">
            <h3 class="media-title">${escapeHtml(title)}</h3>
            <p class="media-description">${escapeHtml(description.substring(0, 120))}${description.length > 120 ? '...' : ''}</p>
            <div class="media-meta">
                ${item.author ? `<span><i class="fas fa-user"></i> ${escapeHtml(item.author)}</span>` : ''}
                ${item.date ? `<span><i class="far fa-calendar"></i> ${escapeHtml(dateStr)}</span>` : ''}
            </div>
        </div>
    `;

    return card;
}

function getLocalizedPostLink() {
    const lang = document.documentElement.lang || 'no';
    if (lang.startsWith('en')) return 'blog-post.html';
    if (lang.startsWith('es')) return 'blog-post.html';
    return 'blogg-post.html';
}

function getDescriptionText(item) {
    if (typeof item.seoDescription === 'string' && item.seoDescription.trim()) {
        return item.seoDescription.trim();
    }
    if (typeof item.description === 'string' && item.description.trim()) {
        return item.description.trim();
    }

    if (item.content && typeof item.content === 'object' && Array.isArray(item.content.blocks)) {
        const text = item.content.blocks
            .filter(block => block.type !== 'header')
            .map(block => {
                if (!block || !block.data) return '';
                if (typeof block.data.text === 'string') return stripHtml(block.data.text);
                if (Array.isArray(block.data.items)) return stripHtml(block.data.items.join(' '));
                if (typeof block.data.caption === 'string') return stripHtml(block.data.caption);
                return '';
            })
            .filter(Boolean)
            .join(' ');
        if (text) return text;
    } else if (typeof item.content === 'string' && item.content.trim()) {
        return stripHtml(item.content.trim());
    }

    return '';
}

function stripHtml(text) {
    return String(text || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Render empty state message
 * @param {string} gridContainerId - The ID of the container
 * @param {string} label - Label for the empty message (e.g., 'Bibelstudier')
 */
function renderEmptyTeachingState(gridContainerId, label = 'undervisning') {
    const container = document.getElementById(gridContainerId);
    if (!container) return;

    const lang = document.documentElement.lang || 'no';
    let message = '', subMessage = '';

    if (lang === 'en') {
        message = `No ${label.toLowerCase()} available right now`;
        subMessage = 'Please check back later';
    } else if (lang === 'es') {
        message = `No hay ${label.toLowerCase()} disponibles en este momento`;
        subMessage = 'Por favor, vuelve a comprobar más tarde';
    } else {
        // Default Norwegian
        message = `Ingen ${label.toLowerCase()} er tilgjengelig akkurat nå`;
        subMessage = 'Vennligst sjekk tilbake senere';
    }

    container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #666;">
            <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
            <p style="font-size: 18px; margin: 20px 0;">${message}</p>
            <p style="font-size: 14px; opacity: 0.7;">${subMessage}</p>
        </div>
    `;
}

/**
 * Update the teaching count display
 * @param {string} selector - CSS selector for the count element
 * @param {number} count - The count to display
 * @param {string} label - Label for singular/plural (e.g., 'Bibelstudier')
 */
function updateTeachingCount(selector, count, label = 'undervisning') {
    const element = document.querySelector(selector);
    if (!element) return;

    const lang = document.documentElement.lang || 'no';
    let countText = '';

    if (lang === 'en') {
        countText = count === 0 ? `No ${label}` : `${count} ${label}`;
    } else if (lang === 'es') {
        countText = count === 0 ? `No hay ${label}` : `${count} ${label}`;
    } else {
        // Default Norwegian
        countText = count === 0 ? `Ingen ${label}` : `${count} ${label}`;
    }

    element.textContent = countText;
}

/**
 * Escape HTML special characters
 * @param {string} text - The text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

window.loadTeachingCategory = loadTeachingCategory;
