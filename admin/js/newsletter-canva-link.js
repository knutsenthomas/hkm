export function normalizeCanvaDesignUrl(value) {
    if (!String(value || '').trim()) return '';
    try {
        const url = new URL(String(value).trim());
        if (url.protocol !== 'https:' || !['canva.com', 'www.canva.com'].includes(url.hostname)
            || url.username || url.password || url.port || !/^\/design\/[a-zA-Z0-9_-]+(?:\/|$)/.test(url.pathname)) return null;
        url.hostname = 'www.canva.com';
        url.hash = '';
        return url.href;
    } catch { return null; }
}

export function openNewsletterCanvaLink(builder, image) {
    if (!image?.isConnected) return;
    document.getElementById('newsletter-canva-link-modal')?.remove();
    const language = builder.currentEditorLang;
    const key = builder.editorDocumentKey || builder.currentDraftId;
    const modal = document.createElement('div');
    modal.id = 'newsletter-canva-link-modal';
    modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'canva-link-title');
    modal.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.65);';
    modal.innerHTML = `<style>#newsletter-canva-link-modal [hidden]{display:none!important}</style><div style="width:100%;max-width:520px;max-height:90vh;overflow:auto;background:white;padding:24px;border-radius:16px;box-sizing:border-box;font-family:Inter,sans-serif;">
        <h3 id="canva-link-title" style="margin-top:0;">Rediger bildet med Canva</h3>
        <ol style="padding-left:20px;font-size:14px;color:#475569;line-height:1.7;"><li>Åpne designen i Canva. Lag gjerne en kopi for engelsk tekst.</li><li>Rediger teksten og last ned som PNG eller JPG.</li><li>Last opp den ferdige bildefilen her.</li></ol>
        <label for="canva-design-link" style="display:block;font-size:13px;font-weight:600;color:#475569;margin-bottom:6px;">Lenke til Canva-design</label>
        <input type="url" id="canva-design-link" placeholder="https://www.canva.com/design/…/edit" style="width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;box-sizing:border-box;font-size:14px;">
        <p style="font-size:12px;color:#64748b;line-height:1.5;">Lenken lagres på bildet i ${language === 'en' ? 'engelsk' : 'norsk'}versjonen. Den tas ikke med i e-posten til abonnentene.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;"><button type="button" id="save-canva-link">Lagre lenke</button><a id="open-canva-design" target="_blank" rel="noopener noreferrer" hidden>Åpne i Canva ↗</a></div>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;">
        <button type="button" id="upload-canva-file">Last opp ferdig bilde</button><input type="file" id="canva-file" accept="image/png,image/jpeg,image/webp" hidden>
        <p id="canva-link-status" role="status" aria-live="polite" style="font-size:13px;line-height:1.5;"></p>
        <button type="button" id="close-canva-link">Lukk</button>
    </div>`;
    const el = id => modal.querySelector(`#${id}`);
    modal.querySelectorAll('button,a').forEach(node => { node.style.cssText += 'display:inline-block;padding:10px 14px;border:1px solid #cbd5e1;border-radius:9px;background:white;color:#1B4965;font:600 13px Inter,sans-serif;cursor:pointer;text-decoration:none;'; });
    const status = (message, error = false) => { el('canva-link-status').textContent = message; el('canva-link-status').style.color = error ? '#b91c1c' : '#475569'; };
    const validTarget = () => image.isConnected && builder.currentEditorLang === language && (builder.editorDocumentKey || builder.currentDraftId) === key;
    let busy = false;
    const previousFocus = document.activeElement;
    const close = () => { if (!busy) { modal.remove(); previousFocus?.focus(); } };
    el('close-canva-link').onclick = close;
    modal.onkeydown = event => { if (event.key === 'Escape') close(); };
    const updateLink = () => {
        const url = normalizeCanvaDesignUrl(el('canva-design-link').value);
        const link = el('open-canva-design');
        link.hidden = !url;
        if (url) link.href = url; else link.removeAttribute('href');
    };
    el('canva-design-link').value = image.dataset.canvaDesignUrl || '';
    el('canva-design-link').oninput = updateLink;
    updateLink();
    el('save-canva-link').onclick = () => {
        if (!validTarget()) return status('Nyhetsbrevet eller språket er endret. Velg bildet på nytt.', true);
        const url = normalizeCanvaDesignUrl(el('canva-design-link').value);
        if (url === null) return status('Lim inn en gyldig HTTPS-lenke til en design på canva.com.', true);
        if (url) image.dataset.canvaDesignUrl = url; else delete image.dataset.canvaDesignUrl;
        builder.syncUnifiedBlocks(); builder.triggerAutosave(); updateLink();
        status(url ? 'Lenken er lagt til. Endringen lagres automatisk.' : 'Canva-lenken er fjernet.');
    };
    el('upload-canva-file').onclick = () => el('canva-file').click();
    el('canva-file').onchange = async () => {
        const file = el('canva-file').files?.[0];
        if (!file) return;
        if (!validTarget()) return status('Nyhetsbrevet eller språket er endret. Velg bildet på nytt.', true);
        if (!['image/png','image/jpeg','image/webp'].includes(file.type)) return status('Velg et PNG-, JPG- eller WebP-bilde.', true);
        busy = true;
        modal.querySelectorAll('button,input').forEach(node => { node.disabled = true; });
        status('Laster opp bildet …');
        try {
            const replaced = await builder.replaceEditorImageFromFile(image, file);
            status(replaced ? `Bildet i ${language === 'en' ? 'engelsk' : 'norsk'}versjonen er byttet. Endringen lagres automatisk.` : 'Bildet kunne ikke byttes. Prøv igjen.', !replaced);
        } catch { status('Bildet kunne ikke lastes opp. Prøv igjen.', true); }
        finally { busy = false; modal.querySelectorAll('button,input').forEach(node => { node.disabled = false; }); el('canva-file').value = ''; }
    };
    document.body.append(modal); el('canva-design-link').focus();
}
