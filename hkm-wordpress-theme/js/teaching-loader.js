// ===================================
// Teaching Content Loader
// ===================================

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
        const teachingData = await firebaseService.getPageContent('collection_teaching');

        if (!teachingData || !teachingData.items || teachingData.items.length === 0) {
            renderEmptyTeachingState(gridContainerId, emptyLabel);
            updateTeachingCount(countElementSelector, 0, emptyLabel);
            return;
        }

        // Filter items by category
        const filteredItems = teachingData.items.filter(item =>
            item.category && item.category.trim().toLowerCase() === categoryName.trim().toLowerCase()
        );

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
    const card = document.createElement('div');
    card.className = 'media-card';

    // Determine image URL (use item image or fallback to unsplash)
    const imageUrl = item.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&h=400&fit=crop';

    // Extract title - handle markdown/text safely
    const title = item.title || `Undervisning ${index + 1}`;

    // Extract description - handle markdown/text safely
    const description = item.description || item.content || 'Klikk for mer informasjon';

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
            <div class="media-play-button">
                <i class="fas fa-book-open"></i>
            </div>
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
