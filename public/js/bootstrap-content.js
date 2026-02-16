// ===================================
// Content Bootstrapper
// Run this in the console to extract current content
// ===================================

function extractPageContent() {
    const data = {};
    const elements = document.querySelectorAll("[data-content-key]");

    elements.forEach(el => {
        const key = el.getAttribute("data-content-key");
        const value = el.tagName === "IMG" ? el.src : el.textContent.trim();

        // Build nested object
        const keys = key.split('.');
        let current = data;

        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (i === keys.length - 1) {
                current[k] = value;
            } else {
                current[k] = current[k] || {};
                current = current[k];
            }
        }
    });

    console.log("📦 Extracted Content Object:");
    console.log(JSON.stringify(data, null, 2));
    return data;
}

window.extractPageContent = extractPageContent;
