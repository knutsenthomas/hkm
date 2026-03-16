(function () {
    const FLASH_NOTICE_KEY = 'hkm_flash_notice';
    const fallbackToastClass = 'hkm-admin-fallback-toast';

    function normalizeRole(role) {
        return typeof role === 'string' ? role.trim().toLowerCase() : '';
    }

    function isElevatedAdminRole(role) {
        const normalized = normalizeRole(role);
        return normalized === 'admin' || normalized === 'superadmin';
    }

    function ensureFallbackToastContainer() {
        let container = document.querySelector(`.${fallbackToastClass}-container`);
        if (container) return container;
        container = document.createElement('div');
        container.className = `${fallbackToastClass}-container`;
        container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;display:flex;flex-direction:column;gap:10px;max-width:360px;';
        document.body.appendChild(container);
        return container;
    }

    function showToast(message, type = 'info', duration = 4500) {
        if (!message) return;
        if (typeof window.showToast === 'function') {
            window.showToast(String(message), type, duration);
            return;
        }

        const container = ensureFallbackToastContainer();
        const toast = document.createElement('div');
        const bg = type === 'success' ? '#ecfdf5'
            : type === 'error' ? '#fef2f2'
                : type === 'warning' ? '#fffbeb'
                    : '#eff6ff';
        const color = type === 'success' ? '#166534'
            : type === 'error' ? '#991b1b'
                : type === 'warning' ? '#92400e'
                    : '#1d4ed8';
        toast.style.cssText = `background:${bg};color:${color};border:1px solid rgba(15,23,42,.08);border-radius:12px;padding:12px 14px;font:500 14px/1.35 Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(15,23,42,.08);`;
        toast.textContent = String(message);
        container.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, Math.max(1000, duration || 4500));
    }

    function setButtonLoading(button, isLoading, options = {}) {
        if (!button) return;

        const {
            loadingText = 'Lagrer...',
            preserveWidth = true
        } = options;

        if (isLoading) {
            if (button.dataset.hkmLoading === '1') return;
            if (preserveWidth) {
                const rect = button.getBoundingClientRect();
                if (rect.width > 0) {
                    button.style.minWidth = `${Math.ceil(rect.width)}px`;
                }
            }
            button.dataset.hkmLoading = '1';
            button.dataset.hkmOriginalHtml = button.innerHTML;
            button.dataset.hkmOriginalDisabled = button.disabled ? '1' : '0';
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            button.innerHTML = loadingText;
            return;
        }

        if (button.dataset.hkmOriginalHtml) {
            button.innerHTML = button.dataset.hkmOriginalHtml;
        }
        button.disabled = button.dataset.hkmOriginalDisabled === '1';
        button.removeAttribute('aria-busy');
        button.style.removeProperty('min-width');
        delete button.dataset.hkmLoading;
        delete button.dataset.hkmOriginalHtml;
        delete button.dataset.hkmOriginalDisabled;
    }

    async function withButtonLoading(button, fn, options = {}) {
        if (!button || typeof fn !== 'function') {
            return fn ? fn() : undefined;
        }
        if (button.dataset.hkmLoading === '1') return undefined;
        setButtonLoading(button, true, options);
        try {
            return await fn();
        } finally {
            setButtonLoading(button, false);
        }
    }

    function pushFlashNotice(message, type = 'warning', duration = 4500) {
        if (!message) return;
        try {
            sessionStorage.setItem(FLASH_NOTICE_KEY, JSON.stringify({
                message: String(message),
                type,
                duration,
                createdAt: Date.now()
            }));
        } catch (e) {
            // noop
        }
    }

    function consumeFlashNotice(maxAgeMs = 30000) {
        try {
            const raw = sessionStorage.getItem(FLASH_NOTICE_KEY);
            if (!raw) return null;
            sessionStorage.removeItem(FLASH_NOTICE_KEY);
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.message) return null;
            if (parsed.createdAt && (Date.now() - parsed.createdAt > maxAgeMs)) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function redirectToMinSideWithAccessDenied(options = {}) {
        const {
            path = '../minside/index.html',
            message = 'Tilgang nektet. Du må ha administratorrettigheter for å åpne adminpanelet.',
            type = 'error'
        } = options;
        pushFlashNotice(message, type, 6000);
        window.location.href = path;
    }

    function sanitizeForFirestore(value, options = {}) {
        const cfg = {
            trimStrings: options.trimStrings !== false,
            stripUndefined: options.stripUndefined !== false,
            stripEmptyStrings: options.stripEmptyStrings === true,
            stripNull: options.stripNull === true,
            stripEmptyObjects: options.stripEmptyObjects === true,
            stripEmptyArrays: options.stripEmptyArrays === true
        };

        const walk = (input) => {
            if (input === undefined) return cfg.stripUndefined ? undefined : input;
            if (input === null) return cfg.stripNull ? undefined : null;

            if (typeof input === 'number') {
                return Number.isFinite(input) ? input : undefined;
            }

            if (typeof input === 'string') {
                const str = cfg.trimStrings ? input.trim() : input;
                if (cfg.stripEmptyStrings && str === '') return undefined;
                return str;
            }

            if (typeof input === 'boolean') return input;

            if (input instanceof Date) {
                return Number.isNaN(input.getTime()) ? undefined : input;
            }

            if (Array.isArray(input)) {
                const arr = input.map(walk).filter((v) => v !== undefined);
                if (cfg.stripEmptyArrays && arr.length === 0) return undefined;
                return arr;
            }

            if (typeof input === 'object') {
                // Preserve Firebase sentinels/Timestamps and custom class instances
                const proto = Object.getPrototypeOf(input);
                if (proto && proto !== Object.prototype && proto !== null) {
                    return input;
                }

                const out = {};
                Object.keys(input).forEach((key) => {
                    const sanitized = walk(input[key]);
                    if (sanitized !== undefined) {
                        out[key] = sanitized;
                    }
                });
                if (cfg.stripEmptyObjects && Object.keys(out).length === 0) return undefined;
                return out;
            }

            return input;
        };

        return walk(value);
    }

    function sanitizeCollectionItem(collectionId, rawItem) {
        const type = (collectionId || '').toLowerCase();
        const item = sanitizeForFirestore(rawItem || {}, {
            trimStrings: true,
            stripUndefined: true,
            stripEmptyStrings: true,
            stripEmptyObjects: false,
            stripEmptyArrays: false
        }) || {};

        const errors = [];

        const title = typeof rawItem?.title === 'string' ? rawItem.title.trim() : '';
        if (!title) {
            errors.push('Tittel er påkrevd.');
        } else {
            item.title = title;
        }

        const needsDate = ['blog', 'events', 'teaching'].includes(type);
        if (needsDate) {
            const date = typeof rawItem?.date === 'string' ? rawItem.date.trim() : '';
            if (!date) {
                errors.push('Dato er påkrevd.');
            } else {
                item.date = date;
            }
        }

        if (rawItem && Array.isArray(rawItem.tags)) {
            const tags = rawItem.tags.map((tag) => String(tag || '').trim()).filter(Boolean);
            if (tags.length > 0) item.tags = tags;
            else delete item.tags;
        }

        if (type === 'blog' && Array.isArray(rawItem?.relatedPosts)) {
            const relatedPosts = rawItem.relatedPosts.map((id) => String(id || '').trim()).filter(Boolean);
            if (relatedPosts.length > 0) item.relatedPosts = relatedPosts;
            else delete item.relatedPosts;
        }

        if (type === 'teaching' && Array.isArray(rawItem?.seriesItems)) {
            const seriesItems = rawItem.seriesItems.map((id) => String(id || '').trim()).filter(Boolean);
            if (seriesItems.length > 0) item.seriesItems = seriesItems;
            else delete item.seriesItems;
        }

        if (rawItem && rawItem.content && typeof rawItem.content === 'object' && !Array.isArray(rawItem.content) && !item.content) {
            item.content = rawItem.content;
        }

        if (rawItem && typeof rawItem.isFirestore === 'boolean') item.isFirestore = rawItem.isFirestore;
        if (rawItem && typeof rawItem.isSynced === 'boolean') item.isSynced = rawItem.isSynced;

        if (!item.id) {
            item.id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        return {
            ok: errors.length === 0,
            errors,
            value: item
        };
    }

    function normalizeAmountNok(raw) {
        if (raw == null) return 0;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
            return raw;
        }
        if (typeof raw === 'string') {
            const normalized = Number(raw.replace(',', '.').replace(/[^\d.-]/g, ''));
            return Number.isFinite(normalized) ? normalized : 0;
        }
        return 0;
    }

    function sanitizeCoursePayload(rawCourse) {
        const errors = [];
        const title = String(rawCourse?.title || '').trim();
        const description = String(rawCourse?.description || '').trim();
        const category = String(rawCourse?.category || 'Bibelstudium').trim() || 'Bibelstudium';
        const imageUrl = String(rawCourse?.imageUrl || '').trim();
        const priceNum = Number(rawCourse?.price || 0);
        const price = Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum) : 0;

        if (!title) errors.push('Kurstitel er påkrevd.');

        if (imageUrl) {
            try {
                new URL(imageUrl);
            } catch (e) {
                errors.push('Forsidebilde må være en gyldig URL.');
            }
        }

        const lessons = [];
        const rawLessons = Array.isArray(rawCourse?.lessons) ? rawCourse.lessons : [];
        rawLessons.forEach((lesson, index) => {
            const lessonTitle = String(lesson?.title || '').trim();
            const videoUrl = String(lesson?.videoUrl || '').trim();

            if (!lessonTitle && !videoUrl) return;
            if (!lessonTitle || !videoUrl) {
                errors.push(`Leksjon ${index + 1} må ha både tittel og video-URL.`);
                return;
            }
            try {
                new URL(videoUrl);
            } catch (e) {
                errors.push(`Leksjon ${index + 1} har ugyldig video-URL.`);
                return;
            }
            lessons.push({ title: lessonTitle, videoUrl });
        });

        const payload = {
            id: String(rawCourse?.id || `course_${Date.now()}`).trim(),
            title,
            category,
            price,
            lessons,
            updatedAt: new Date().toISOString()
        };

        if (description) payload.description = description;
        if (imageUrl) payload.imageUrl = imageUrl;

        return {
            ok: errors.length === 0,
            errors,
            value: payload
        };
    }

    window.HKMAdminUtils = {
        FLASH_NOTICE_KEY,
        normalizeRole,
        isElevatedAdminRole,
        showToast,
        setButtonLoading,
        withButtonLoading,
        pushFlashNotice,
        consumeFlashNotice,
        redirectToMinSideWithAccessDenied,
        sanitizeForFirestore,
        sanitizeCollectionItem,
        sanitizeCoursePayload,
        normalizeAmountNok,
        getSectionIcon(sectionId) {
            const iconMap = {
                'overview': 'grid_view',
                'content': 'description',
                'media': 'perm_media',
                'blog': 'edit_note',
                'teaching': 'school',
                'courses': 'local_library',
                'events': 'event',
                'contacts': 'contacts',
                'messages': 'mail',
                'newsletter': 'campaign',
                'design': 'palette',
                'causes': 'volunteer_activism',
                'seo': 'search_insights',
                'users': 'group',
                'profile': 'person_outline',
                'automation': 'auto_awesome',
                'integrations': 'integration_instructions',
                'hero': 'view_carousel'
            };
            return iconMap[sectionId] || 'apps';
        },
        renderSectionHeader(icon, title, subtitle, actionsHtml = '', subtitleId = '') {
            return `
                <div class="section-header design-ui-header">
                    <div class="section-header-icon">
                        <span class="material-symbols-outlined">${icon}</span>
                    </div>
                    <div class="section-header-content">
                        <div class="section-header-titles">
                            <h2 class="section-title">${title}</h2>
                            <p class="section-subtitle" ${subtitleId ? `id="${subtitleId}"` : ''}>${subtitle}</p>
                        </div>
                        ${actionsHtml ? `<div class="section-header-actions">${actionsHtml}</div>` : ''}
                    </div>
                </div>
            `;
        }
    };
})();
