/**
 * HKM Course Completion Certificate Generator
 * Produces elegant, print-ready certificates for students and admin.
 * No automated emails - on-demand only.
 */
(function (window) {
    'use strict';

    const CourseCertificate = {
        /**
         * Generates a unique verification certificate ID
         */
        generateCertificateId(courseId, studentEmail) {
            const raw = `${courseId || 'course'}_${studentEmail || 'user'}`;
            let hash = 0;
            for (let i = 0; i < raw.length; i++) {
                hash = ((hash << 5) - hash) + raw.charCodeAt(i);
                hash |= 0;
            }
            const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
            const year = new Date().getFullYear();
            return `HKM-${year}-${hex}`;
        },

        /**
         * Formats date in Norwegian format
         */
        formatDate(dateObj = new Date()) {
            try {
                const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
                return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
            } catch (e) {
                return new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        },

        /**
         * Opens certificate modal with printable styling
         */
        showModal(data = {}) {
            const {
                studentName = 'Kursdeltaker',
                courseTitle = 'Fullført Kurs',
                date = new Date(),
                certificateId = this.generateCertificateId(data.courseId, data.studentEmail),
                instructorName = 'Hilde Karin Knutsen',
                instructorTitle = 'His Kingdom Ministry'
            } = data;

            // Remove existing modal if any
            const existing = document.getElementById('hkm-certificate-modal');
            if (existing) existing.remove();

            const dateStr = this.formatDate(date);

            const modalHtml = `
                <div id="hkm-certificate-modal" class="hkm-cert-modal-overlay" style="position:fixed;inset:0;background:rgba(11,21,33,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;backdrop-filter:blur(4px);">
                    <div class="hkm-cert-modal-container" style="background:#0f172a;border-radius:16px;box-shadow:0 25px 60px rgba(0,0,0,0.5);width:100%;max-width:900px;overflow:hidden;animation:hkmCertFadeIn 0.25s ease-out;">
                        
                        <!-- Toolbar (Hidden on print) -->
                        <div class="hkm-cert-toolbar no-print" style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:#1e293b;border-bottom:1px solid #334155;">
                            <div style="display:flex;align-items:center;gap:8px;color:#f8fafc;font-weight:700;font-size:0.95rem;">
                                <span class="material-symbols-outlined" style="color:#d17d39;font-size:22px;">workspace_premium</span>
                                <span>Fullføringsbevis & Diplom</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <button type="button" onclick="window.CourseCertificate.print()" class="btn btn-primary" style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%);color:#ffffff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;font-size:0.88rem;cursor:pointer;box-shadow:0 2px 8px rgba(209,125,57,0.3);">
                                    <span class="material-symbols-outlined" style="font-size:18px;">print</span> Skriv ut / Lagre PDF
                                </button>
                                <button type="button" onclick="window.CourseCertificate.closeModal()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.6rem;line-height:1;padding:0 4px;" title="Lukk">&times;</button>
                            </div>
                        </div>

                        <!-- Printable Certificate Sheet -->
                        <div style="padding:24px;background:#0f172a;display:flex;justify-content:center;">
                            <div id="hkm-printable-certificate" class="hkm-certificate-sheet" style="background:#ffffff;color:#1e293b;width:100%;max-width:820px;min-height:540px;padding:40px 48px;border-radius:8px;position:relative;box-shadow:0 10px 30px rgba(0,0,0,0.3);box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;border:10px solid #1B4965;outline:2px solid #d17d39;outline-offset:-6px;font-family:'Inter',sans-serif;">
                                
                                <!-- Corner Flourishes -->
                                <div style="position:absolute;top:12px;left:12px;width:24px;height:24px;border-top:2px solid #d17d39;border-left:2px solid #d17d39;"></div>
                                <div style="position:absolute;top:12px;right:12px;width:24px;height:24px;border-top:2px solid #d17d39;border-right:2px solid #d17d39;"></div>
                                <div style="position:absolute;bottom:12px;left:12px;width:24px;height:24px;border-bottom:2px solid #d17d39;border-left:2px solid #d17d39;"></div>
                                <div style="position:absolute;bottom:12px;right:12px;width:24px;height:24px;border-bottom:2px solid #d17d39;border-right:2px solid #d17d39;"></div>

                                <!-- Header -->
                                <div style="text-align:center;">
                                    <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px;">
                                        <img src="/img/logo-hkm.png" alt="HKM Logo" style="height:44px;width:auto;" onerror="this.style.display='none'">
                                        <span style="font-size:1.15rem;font-weight:800;letter-spacing:0.18em;color:#1B4965;text-transform:uppercase;">His Kingdom Ministry</span>
                                    </div>
                                    <h1 style="font-size:2.1rem;font-weight:900;letter-spacing:0.06em;color:#1B4965;margin:4px 0 2px;text-transform:uppercase;">Fullføringsbevis</h1>
                                    <div style="width:80px;height:3px;background:linear-gradient(90deg, #1B4965, #d17d39, #1B4965);margin:6px auto 16px;"></div>
                                </div>

                                <!-- Body / Student Details -->
                                <div style="text-align:center;margin:10px 0 20px;">
                                    <p style="font-size:0.95rem;color:#64748b;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Dette bekrefter med glede at</p>
                                    <h2 style="font-size:1.9rem;font-weight:800;color:#0f172a;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid rgba(209,125,57,0.3);display:inline-block;min-width:320px;">
                                        ${this.escapeHtml(studentName)}
                                    </h2>
                                    <p style="font-size:0.95rem;color:#475569;margin:12px 0 6px;">har fullført og bestått kurset</p>
                                    <h3 style="font-size:1.45rem;font-weight:800;color:#1B4965;margin:0 0 8px;">
                                        ${this.escapeHtml(courseTitle)}
                                    </h3>
                                    <p style="font-size:0.85rem;color:#64748b;margin:0;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.4;">
                                        Undervisning og praktisk trosbygging i regi av His Kingdom Ministry.
                                    </p>
                                </div>

                                <!-- Footer / Signatures -->
                                <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
                                    <div style="text-align:left;">
                                        <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;font-weight:700;">Dato</div>
                                        <div style="font-size:0.9rem;font-weight:700;color:#334155;margin-top:2px;">${dateStr}</div>
                                        <div style="font-size:0.72rem;color:#94a3b8;margin-top:4px;font-family:monospace;">ID: ${this.escapeHtml(certificateId)}</div>
                                    </div>

                                    <!-- Seal -->
                                    <div style="width:68px;height:68px;border-radius:50%;border:2px dashed #d17d39;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#d17d39;background:#fffaf5;flex-shrink:0;">
                                        <span class="material-symbols-outlined" style="font-size:24px;">verified</span>
                                        <span style="font-size:8px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">FULLFØRT</span>
                                    </div>

                                    <div style="text-align:right;">
                                        <div style="font-family:'Caveat',cursive,serif;font-size:1.4rem;color:#1B4965;font-weight:700;line-height:1;margin-bottom:4px;">
                                            ${this.escapeHtml(instructorName)}
                                        </div>
                                        <div style="border-top:1.5px solid #cbd5e1;padding-top:4px;width:170px;margin-left:auto;">
                                            <div style="font-size:0.8rem;font-weight:700;color:#334155;">${this.escapeHtml(instructorName)}</div>
                                            <div style="font-size:0.72rem;color:#64748b;">${this.escapeHtml(instructorTitle)}</div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            `;

            // Inject styles for print if not present
            if (!document.getElementById('hkm-certificate-print-style')) {
                const style = document.createElement('style');
                style.id = 'hkm-certificate-print-style';
                style.textContent = `
                    @keyframes hkmCertFadeIn {
                        from { opacity: 0; transform: scale(0.97); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    @media print {
                        body * {
                            visibility: hidden !important;
                        }
                        #hkm-certificate-modal,
                        #hkm-certificate-modal * {
                            visibility: visible !important;
                        }
                        #hkm-certificate-modal {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            height: 100% !important;
                            background: transparent !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        .hkm-cert-modal-container {
                            background: transparent !important;
                            box-shadow: none !important;
                            max-width: 100% !important;
                        }
                        .hkm-cert-toolbar,
                        .no-print {
                            display: none !important;
                        }
                        #hkm-printable-certificate {
                            max-width: 100% !important;
                            width: 100% !important;
                            box-shadow: none !important;
                            border: 8px solid #1B4965 !important;
                            page-break-inside: avoid !important;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        },

        closeModal() {
            const modal = document.getElementById('hkm-certificate-modal');
            if (modal) modal.remove();
        },

        print() {
            window.print();
        },

        escapeHtml(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    };

    window.CourseCertificate = CourseCertificate;
})(window);
