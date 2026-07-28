const VERSION_HISTORY_COLLECTION = 'version_history';
const MAX_VERSIONS_PER_RESOURCE = 50;
const DEFAULT_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;

class HKMVersionHistoryManager {
    constructor() {
        this.activeTarget = null;
        this.versions = [];
        this.selectedVersionId = null;
        this.modal = null;
        this.previousBodyOverflow = '';
        this.isBusy = false;
    }

    get firebaseService() {
        return window.firebaseService || null;
    }

    get db() {
        return this.firebaseService?.db || null;
    }

    _assertReady() {
        if (!this.firebaseService?.isInitialized || !this.db) {
            throw new Error('Versjonshistorikken er ikke klar ennå. Prøv igjen om et øyeblikk.');
        }
    }

    _normalizeTarget(target = {}) {
        const scope = String(target.scope || '').trim();
        const resourceCollection = String(target.resourceCollection || '').trim();
        const resourceId = String(target.resourceId || '').trim();

        if (!scope || !resourceCollection || !resourceId) {
            throw new Error('Mangler informasjon om innholdet som skal versjoneres.');
        }

        return {
            ...target,
            scope,
            resourceCollection,
            resourceId,
            resourceLabel: String(target.resourceLabel || resourceId).trim() || resourceId
        };
    }

    _resourceDocumentId(target) {
        const raw = `${target.scope}:${target.resourceCollection}:${target.resourceId}`;
        try {
            const bytes = new TextEncoder().encode(raw);
            let binary = '';
            bytes.forEach(byte => {
                binary += String.fromCharCode(byte);
            });
            return btoa(binary)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/g, '');
        } catch (_) {
            return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 1200);
        }
    }

    _resourceRef(target) {
        return this.db.collection(VERSION_HISTORY_COLLECTION).doc(this._resourceDocumentId(target));
    }

    _cloneSnapshot(value, seen = new WeakSet()) {
        if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
            return undefined;
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (value && typeof value.toDate === 'function') {
            try {
                return value.toDate().toISOString();
            } catch (_) {
                return String(value);
            }
        }

        if (Array.isArray(value)) {
            return value
                .map(item => this._cloneSnapshot(item, seen))
                .filter(item => typeof item !== 'undefined');
        }

        if (typeof value === 'object') {
            if (seen.has(value)) {
                return undefined;
            }
            seen.add(value);
            const clone = {};
            Object.keys(value).forEach(key => {
                const clonedValue = this._cloneSnapshot(value[key], seen);
                if (typeof clonedValue !== 'undefined') {
                    clone[key] = clonedValue;
                }
            });
            seen.delete(value);
            return clone;
        }

        return String(value);
    }

    _stableSerialize(value) {
        if (Array.isArray(value)) {
            return `[${value.map(item => this._stableSerialize(item)).join(',')}]`;
        }
        if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map(key => (
                `${JSON.stringify(key)}:${this._stableSerialize(value[key])}`
            )).join(',')}}`;
        }
        return JSON.stringify(value);
    }

    async _checksum(snapshot) {
        const serialized = this._stableSerialize(snapshot);
        if (window.crypto?.subtle && typeof TextEncoder !== 'undefined') {
            const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
            return Array.from(new Uint8Array(digest))
                .map(byte => byte.toString(16).padStart(2, '0'))
                .join('');
        }

        let hash = 2166136261;
        for (let i = 0; i < serialized.length; i += 1) {
            hash ^= serialized.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return `fallback-${(hash >>> 0).toString(16)}`;
    }

    async _latestVersion(target) {
        const snapshot = await this._resourceRef(target)
            .collection('versions')
            .orderBy('createdAtIso', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    async recordVersion(options = {}) {
        this._assertReady();
        const target = this._normalizeTarget(options);
        const snapshot = this._cloneSnapshot(options.snapshot);

        if (!snapshot || typeof snapshot !== 'object') {
            throw new Error('Kan ikke lagre en tom versjon.');
        }

        const checksum = await this._checksum(snapshot);
        const latest = await this._latestVersion(target);
        const forceDuplicate = options.forceDuplicate === true;
        const minIntervalMs = Number.isFinite(options.minIntervalMs)
            ? Math.max(0, options.minIntervalMs)
            : DEFAULT_AUTOSAVE_INTERVAL_MS;

        if (!forceDuplicate && latest?.checksum === checksum) {
            return { created: false, reason: 'unchanged', version: latest };
        }

        if (!forceDuplicate && latest?.createdAtIso && minIntervalMs > 0) {
            const elapsed = Date.now() - new Date(latest.createdAtIso).getTime();
            if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < minIntervalMs) {
                return { created: false, reason: 'throttled', version: latest };
            }
        }

        const nowIso = new Date().toISOString();
        const user = this.firebaseService.auth?.currentUser || null;
        const resourceRef = this._resourceRef(target);
        const versionRef = resourceRef.collection('versions').doc();
        const versionData = {
            scope: target.scope,
            resourceCollection: target.resourceCollection,
            resourceId: target.resourceId,
            resourceLabel: target.resourceLabel,
            snapshot,
            checksum,
            reason: String(options.reason || 'Automatisk lagring'),
            source: String(options.source || 'admin'),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAtIso: nowIso,
            createdByUid: user?.uid || null,
            createdByEmail: user?.email || null
        };

        const batch = this.db.batch();
        batch.set(resourceRef, {
            scope: target.scope,
            resourceCollection: target.resourceCollection,
            resourceId: target.resourceId,
            resourceLabel: target.resourceLabel,
            latestVersionId: versionRef.id,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAtIso: nowIso
        }, { merge: true });
        batch.set(versionRef, versionData);
        await batch.commit();
        await this._trimVersions(target);

        return {
            created: true,
            version: { id: versionRef.id, ...versionData }
        };
    }

    async _trimVersions(target) {
        try {
            const snapshot = await this._resourceRef(target)
                .collection('versions')
                .orderBy('createdAtIso', 'desc')
                .get();

            if (snapshot.size <= MAX_VERSIONS_PER_RESOURCE) return;

            const batch = this.db.batch();
            snapshot.docs.slice(MAX_VERSIONS_PER_RESOURCE).forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.warn('[VersionHistory] Kunne ikke rydde eldre versjoner:', error);
        }
    }

    async listVersions(targetInput) {
        this._assertReady();
        const target = this._normalizeTarget(targetInput);
        const snapshot = await this._resourceRef(target)
            .collection('versions')
            .orderBy('createdAtIso', 'desc')
            .limit(MAX_VERSIONS_PER_RESOURCE)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async ensureBaselineVersion(targetInput) {
        const target = this._normalizeTarget(targetInput);
        const versions = await this.listVersions(target);
        if (versions.length > 0) return versions;

        const currentDoc = await this.db
            .collection(target.resourceCollection)
            .doc(target.resourceId)
            .get();

        if (!currentDoc.exists) return [];

        await this.recordVersion({
            ...target,
            snapshot: currentDoc.data(),
            reason: 'Første registrerte versjon',
            source: 'baseline',
            minIntervalMs: 0,
            forceDuplicate: true
        });

        return this.listVersions(target);
    }

    async restoreVersion(targetInput, versionId) {
        this._assertReady();
        const target = this._normalizeTarget(targetInput);
        const versionRef = this._resourceRef(target).collection('versions').doc(versionId);
        const versionDoc = await versionRef.get();

        if (!versionDoc.exists) {
            throw new Error('Denne versjonen finnes ikke lenger.');
        }

        const version = { id: versionDoc.id, ...versionDoc.data() };
        const targetRef = this.db.collection(target.resourceCollection).doc(target.resourceId);
        const currentDoc = await targetRef.get();

        if (currentDoc.exists) {
            await this.recordVersion({
                ...target,
                snapshot: currentDoc.data(),
                reason: 'Sikkerhetskopi før gjenoppretting',
                source: 'restore-safety-copy',
                minIntervalMs: 0,
                forceDuplicate: true
            });
        }

        let restoredSnapshot = this._cloneSnapshot(version.snapshot);
        if (typeof target.prepareRestoreSnapshot === 'function') {
            restoredSnapshot = await target.prepareRestoreSnapshot(
                restoredSnapshot,
                currentDoc.exists ? this._cloneSnapshot(currentDoc.data()) : null,
                version
            );
        }

        if (!restoredSnapshot || typeof restoredSnapshot !== 'object') {
            throw new Error('Den valgte versjonen inneholder ikke gyldig innhold.');
        }

        await targetRef.set(restoredSnapshot, { merge: false });
        await this.recordVersion({
            ...target,
            snapshot: restoredSnapshot,
            reason: `Gjenopprettet versjon fra ${this._formatDate(version.createdAtIso)}`,
            source: 'restore',
            minIntervalMs: 0,
            forceDuplicate: true
        });

        return {
            restoredSnapshot,
            restoredVersion: version
        };
    }

    async openForResource(targetInput) {
        try {
            this._assertReady();
            this.activeTarget = this._normalizeTarget(targetInput);
            this.selectedVersionId = null;
            this._ensureModal();
            if (this.activeTarget.scope === 'newsletter') {
                const editorRoot = document.getElementById('newsletter-editor-modal-root');
                if (editorRoot) {
                    editorRoot.appendChild(this.modal);
                    this.modal.style.setProperty('z-index', '200000', 'important');
                }
            } else if (this.modal.parentElement !== document.body) {
                document.body.appendChild(this.modal);
                this.modal.style.removeProperty('z-index');
            }
            this.previousBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            this.modal.style.display = 'flex';
            this.modal.setAttribute('aria-hidden', 'false');
            await this._reloadModal();
        } catch (error) {
            this._notify(error.message || 'Kunne ikke åpne versjonshistorikken.', 'error');
        }
    }

    close() {
        if (!this.modal || this.isBusy) return;
        this.modal.style.display = 'none';
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = this.previousBodyOverflow;
        this.activeTarget = null;
        this.versions = [];
        this.selectedVersionId = null;
    }

    _ensureModal() {
        if (this.modal) return;

        const modal = document.createElement('div');
        modal.id = 'hkm-version-history-modal';
        modal.className = 'hkm-version-history-modal';
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="hkm-version-history-dialog" role="dialog" aria-modal="true" aria-labelledby="hkm-version-history-title">
                <header class="hkm-version-history-header">
                    <div class="hkm-version-history-heading">
                        <span class="material-symbols-outlined">history</span>
                        <div>
                            <p>TRYGG REDIGERING</p>
                            <h2 id="hkm-version-history-title">Versjonshistorikk</h2>
                        </div>
                    </div>
                    <button type="button" class="hkm-version-history-close" aria-label="Lukk versjonshistorikk">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </header>
                <div class="hkm-version-history-resource">
                    <span class="material-symbols-outlined">description</span>
                    <div>
                        <small>Innhold</small>
                        <strong id="hkm-version-history-resource-label">–</strong>
                    </div>
                    <span class="hkm-version-history-count" id="hkm-version-history-count">0 versjoner</span>
                </div>
                <div class="hkm-version-history-body">
                    <div class="hkm-version-history-list" id="hkm-version-history-list"></div>
                    <div class="hkm-version-history-detail" id="hkm-version-history-detail"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;

        modal.querySelector('.hkm-version-history-close')?.addEventListener('click', () => this.close());
        modal.addEventListener('click', event => {
            if (event.target === modal) this.close();
        });
        modal.querySelector('#hkm-version-history-list')?.addEventListener('click', event => {
            const button = event.target.closest('[data-version-id]');
            if (!button) return;
            this.selectedVersionId = button.dataset.versionId;
            this._renderModal();
        });
        modal.querySelector('#hkm-version-history-detail')?.addEventListener('click', event => {
            if (event.target.closest('[data-action="restore"]')) {
                this._showRestoreConfirmation();
            } else if (event.target.closest('[data-action="cancel-restore"]')) {
                this._renderDetail();
            } else if (event.target.closest('[data-action="confirm-restore"]')) {
                this._restoreSelectedVersion();
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.modal?.style.display === 'flex') {
                this.close();
            }
        });
    }

    async _reloadModal() {
        const list = this.modal.querySelector('#hkm-version-history-list');
        const detail = this.modal.querySelector('#hkm-version-history-detail');
        const label = this.modal.querySelector('#hkm-version-history-resource-label');

        if (label) label.textContent = this.activeTarget.resourceLabel;
        if (list) {
            list.innerHTML = `
                <div class="hkm-version-history-loading">
                    <span class="material-symbols-outlined">sync</span>
                    <strong>Henter versjoner…</strong>
                </div>
            `;
        }
        if (detail) detail.innerHTML = '';

        try {
            this.versions = await this.ensureBaselineVersion(this.activeTarget);
            if (!this.selectedVersionId || !this.versions.some(version => version.id === this.selectedVersionId)) {
                this.selectedVersionId = this.versions[0]?.id || null;
            }
            this._renderModal();
        } catch (error) {
            if (list) {
                list.innerHTML = `
                    <div class="hkm-version-history-empty error">
                        <span class="material-symbols-outlined">error</span>
                        <strong>Kunne ikke hente versjoner</strong>
                        <p>${this._escapeHtml(error.message)}</p>
                    </div>
                `;
            }
        }
    }

    _renderModal() {
        const list = this.modal.querySelector('#hkm-version-history-list');
        const count = this.modal.querySelector('#hkm-version-history-count');
        if (count) {
            count.textContent = `${this.versions.length} ${this.versions.length === 1 ? 'versjon' : 'versjoner'}`;
        }

        if (!list) return;
        if (this.versions.length === 0) {
            list.innerHTML = `
                <div class="hkm-version-history-empty">
                    <span class="material-symbols-outlined">history_toggle_off</span>
                    <strong>Ingen versjoner ennå</strong>
                    <p>Første versjon opprettes neste gang innholdet lagres.</p>
                </div>
            `;
            this._renderDetail();
            return;
        }

        list.innerHTML = this.versions.map((version, index) => {
            const isSelected = version.id === this.selectedVersionId;
            const label = index === 0 ? 'Nyeste' : `Versjon ${this.versions.length - index}`;
            return `
                <button type="button" class="hkm-version-history-item${isSelected ? ' active' : ''}" data-version-id="${this._escapeHtml(version.id)}">
                    <span class="hkm-version-history-dot"></span>
                    <span class="hkm-version-history-item-copy">
                        <span class="hkm-version-history-item-topline">
                            <strong>${this._escapeHtml(label)}</strong>
                            ${index === 0 ? '<em>Gjeldende</em>' : ''}
                        </span>
                        <span>${this._escapeHtml(this._formatDate(version.createdAtIso))}</span>
                        <small>${this._escapeHtml(version.reason || 'Lagret versjon')}</small>
                    </span>
                    <span class="material-symbols-outlined">chevron_right</span>
                </button>
            `;
        }).join('');

        this._renderDetail();
    }

    _renderDetail() {
        const detail = this.modal.querySelector('#hkm-version-history-detail');
        if (!detail) return;
        const version = this.versions.find(item => item.id === this.selectedVersionId);

        if (!version) {
            detail.innerHTML = `
                <div class="hkm-version-history-empty detail-empty">
                    <span class="material-symbols-outlined">manage_history</span>
                    <strong>Velg en versjon</strong>
                    <p>Detaljer og gjenoppretting vises her.</p>
                </div>
            `;
            return;
        }

        const summary = this._summarizeSnapshot(version.snapshot);
        const createdBy = version.createdByEmail || 'Administrator';
        detail.innerHTML = `
            <div class="hkm-version-history-detail-card">
                <div class="hkm-version-history-detail-icon">
                    <span class="material-symbols-outlined">restore_page</span>
                </div>
                <p class="hkm-version-history-kicker">VALGT VERSJON</p>
                <h3>${this._escapeHtml(this._formatDate(version.createdAtIso))}</h3>
                <p class="hkm-version-history-reason">${this._escapeHtml(version.reason || 'Lagret versjon')}</p>
                <dl>
                    <div>
                        <dt>Lagret av</dt>
                        <dd>${this._escapeHtml(createdBy)}</dd>
                    </div>
                    <div>
                        <dt>Innhold</dt>
                        <dd>${this._escapeHtml(summary)}</dd>
                    </div>
                    <div>
                        <dt>Størrelse</dt>
                        <dd>${this._formatSize(version.snapshot)}</dd>
                    </div>
                </dl>
                <div class="hkm-version-history-safety-note">
                    <span class="material-symbols-outlined">verified_user</span>
                    <p>Den nåværende versjonen sikkerhetskopieres automatisk før gjenoppretting.</p>
                </div>
                <button type="button" class="hkm-version-history-restore" data-action="restore">
                    <span class="material-symbols-outlined">settings_backup_restore</span>
                    Gjenopprett denne versjonen
                </button>
            </div>
        `;
    }

    _showRestoreConfirmation() {
        const detail = this.modal.querySelector('#hkm-version-history-detail');
        const version = this.versions.find(item => item.id === this.selectedVersionId);
        if (!detail || !version) return;

        detail.innerHTML = `
            <div class="hkm-version-history-confirm">
                <div class="hkm-version-history-confirm-icon">
                    <span class="material-symbols-outlined">settings_backup_restore</span>
                </div>
                <p class="hkm-version-history-kicker">BEKREFT GJENOPPRETTING</p>
                <h3>Hent tilbake versjonen fra<br>${this._escapeHtml(this._formatDate(version.createdAtIso))}?</h3>
                <p>Innholdet i editoren erstattes med denne versjonen. Dagens innhold lagres automatisk i historikken først.</p>
                <div class="hkm-version-history-confirm-actions">
                    <button type="button" data-action="cancel-restore">Avbryt</button>
                    <button type="button" class="primary" data-action="confirm-restore">
                        <span class="material-symbols-outlined">restore</span>
                        Ja, gjenopprett
                    </button>
                </div>
            </div>
        `;
    }

    async _restoreSelectedVersion() {
        if (this.isBusy || !this.activeTarget || !this.selectedVersionId) return;
        const confirmButton = this.modal.querySelector('[data-action="confirm-restore"]');
        this.isBusy = true;

        if (confirmButton) {
            confirmButton.disabled = true;
            confirmButton.innerHTML = '<span class="material-symbols-outlined hkm-version-spin">sync</span> Gjenoppretter…';
        }

        try {
            const result = await this.restoreVersion(this.activeTarget, this.selectedVersionId);
            if (typeof this.activeTarget.onRestore === 'function') {
                await this.activeTarget.onRestore(result.restoredSnapshot, result.restoredVersion);
            }
            this._notify('Versjonen er gjenopprettet. Den forrige tilstanden er bevart i historikken.', 'success');
            this.selectedVersionId = null;
            await this._reloadModal();
        } catch (error) {
            this._notify(error.message || 'Gjenopprettingen feilet.', 'error');
            this._renderDetail();
        } finally {
            this.isBusy = false;
        }
    }

    _summarizeSnapshot(snapshot = {}) {
        if (this.activeTarget?.scope === 'newsletter') {
            const subject = snapshot.subject || snapshot.name || 'Nyhetsbrev';
            const blockCount = Array.isArray(snapshot.blocks) ? snapshot.blocks.length : 0;
            return `${subject} · ${blockCount} ${blockCount === 1 ? 'innholdsblokk' : 'innholdsblokker'}`;
        }

        const keys = Object.keys(snapshot || {}).filter(key => !key.startsWith('_'));
        if (keys.length === 0) return 'Sideinnhold';
        const visibleKeys = keys.slice(0, 4).join(', ');
        return keys.length > 4 ? `${visibleKeys} + ${keys.length - 4} felt` : visibleKeys;
    }

    _formatSize(snapshot) {
        try {
            const bytes = new Blob([JSON.stringify(snapshot || {})]).size;
            if (bytes < 1024) return `${bytes} byte`;
            return `${(bytes / 1024).toFixed(bytes > 10240 ? 0 : 1)} kB`;
        } catch (_) {
            return 'Ukjent';
        }
    }

    _formatDate(value) {
        const date = value ? new Date(value) : null;
        if (!date || Number.isNaN(date.getTime())) return 'Ukjent tidspunkt';
        return date.toLocaleString('no-NO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    _notify(message, type = 'info') {
        if (window.adminManager && typeof window.adminManager.showToast === 'function') {
            window.adminManager.showToast(message, type, 5500);
            return;
        }
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        console[type === 'error' ? 'error' : 'log'](message);
    }

    _escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

if (!window.HKMVersionHistory) {
    window.HKMVersionHistory = new HKMVersionHistoryManager();
}

export { HKMVersionHistoryManager };
export default window.HKMVersionHistory;
