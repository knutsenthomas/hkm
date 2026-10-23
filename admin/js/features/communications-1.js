// communications methods for AdminManager.
export function createCommunications1Methods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    initMessageListener() {
      const bell = document.getElementById("messages-bell");
      if (bell) {
        bell.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = "/admin/admin-meldinger.html";
        };
        console.log(
          "[AdminManager] Bell click listener registered successfully.",
        );
      }

      const startSubscription = () => {
        try {
          if (this.messagesUnsub) {
            this.messagesUnsub();
          }
          this.messagesUnsub = firebaseService.db
            .collection("contactMessages")
            .where("status", "==", "ny")
            .onSnapshot(
              (snapshot) => {
                const count = snapshot.size;
                this.unreadMessageCount = count;
                this.updateMessageBell(count);
              },
              (err) => {
                console.error("Feil i meldings-lytter:", err);
              },
            );
          console.log("[AdminManager] Bell Firebase listener active.");
        } catch (err) {
          console.error("Kunne ikke starte meldings-lytter:", err);
        }
      };

      if (firebaseService.isInitialized && firebaseService.db) {
        startSubscription();
      } else {
        console.log(
          "[AdminManager] Firebase not ready yet. Deferring message listener subscription.",
        );
        const interval = setInterval(() => {
          if (firebaseService.isInitialized && firebaseService.db) {
            clearInterval(interval);
            startSubscription();
          }
        }, 100);
        setTimeout(() => clearInterval(interval), 10000);
      }
    },

    updateMessageBell(count) {
      const bell = document.getElementById("messages-bell");
      const badge = document.getElementById("messages-badge");
      const icon = document.getElementById("notification-icon");
      const dot = document.getElementById("notification-dot");

      const displayCount = count > 9 ? "9+" : String(count);

      if (count > 0) {
        if (bell) bell.classList.add("has-unread");
        if (icon) icon.classList.add("has-unread");
        if (badge) {
          badge.style.display = "flex";
          badge.textContent = displayCount;
        }
        if (dot) {
          dot.style.display = "block";
          dot.textContent = displayCount;
        }
      } else {
        if (bell) bell.classList.remove("has-unread");
        if (icon) icon.classList.remove("has-unread");
        if (badge) {
          badge.style.display = "none";
        }
        if (dot) {
          dot.style.display = "none";
          dot.textContent = "";
        }
      }
    },

    async renderKommunikasjonSection() {
      const section = document.getElementById("kommunikasjon-section");
      if (!section) return;
      section.setAttribute("data-rendered", "true");

      await this.loadAllUsers();

      const renderUserSelection = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container || !this.allUsersData) return;
        const userCheckboxes = this.allUsersData
          .map(
            (user) => `
                <label class="user-checkbox-label">
                    <input type="checkbox" class="user-select-checkbox" value="${user.id}">
                    ${user.displayName || user.email}
                </label>
            `,
          )
          .join("");
        container.innerHTML = `<div class="user-list-scroll">${userCheckboxes}</div>`;
      };

      // Email form
      const emailForm = document.getElementById("bulk-email-form");
      const emailStatusEl = document.getElementById("email-status");
      const emailTargetRole = document.getElementById("target-role");
      const emailUserSelection = document.getElementById(
        "email-user-selection",
      );

      if (emailTargetRole && !emailTargetRole.dataset.bound) {
        emailTargetRole.dataset.bound = "1";
        emailTargetRole.addEventListener("change", (e) => {
          if (e.target.value === "selected") {
            renderUserSelection("email-user-selection");
            if (emailUserSelection) emailUserSelection.style.display = "block";
          } else {
            if (emailUserSelection) emailUserSelection.style.display = "none";
          }
        });
      }

      if (emailForm && !emailForm.dataset.bound) {
        emailForm.dataset.bound = "1";
        emailForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const btn = emailForm.querySelector('button[type="submit"]');
          if (btn) {
            btn.disabled = true;
            btn.textContent = "Sender...";
          }
          emailStatusEl.textContent = "Forbereder utsendelse...";
          emailStatusEl.className = "status-message info";

          try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error("Du er ikke logget inn.");

            const idToken = await user.getIdToken();
            const targetRole = emailTargetRole.value;
            const subject = document.getElementById("email-subject").value;
            const message = document.getElementById("email-message").value;

            let payload = {
              targetRole,
              subject,
              message,
              fromName: "His Kingdom Ministry",
            };

            if (targetRole === "selected") {
              const selectedUserIds = Array.from(
                emailUserSelection.querySelectorAll(
                  ".user-select-checkbox:checked",
                ),
              ).map((cb) => cb.value);
              if (selectedUserIds.length === 0) {
                throw new Error("Ingen brukere er valgt.");
              }
              payload.selectedUserIds = selectedUserIds;
            }

            const response = await fetch(
              "https://sendbulkemail-42bhgdjkcq-uc.a.run.app",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify(payload),
              },
            );

            const result = await response.json();
            if (!response.ok)
              throw new Error(
                result.error || `Server responded with ${response.status}`,
              );

            emailStatusEl.textContent = result.message || "E-poster er sendt!";
            emailStatusEl.className = "status-message success";
            emailForm.reset();
            emailUserSelection.style.display = "none";
          } catch (error) {
            console.error("Feil ved masseutsendelse:", error);
            emailStatusEl.textContent = `Feil: ${error.message}`;
            emailStatusEl.className = "status-message error";
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Send E-poster";
            }
          }
        });
      }

      // Push form
      const pushForm = document.getElementById("push-notification-form");
      const pushStatusEl = document.getElementById("push-status");
      const pushTargetRole = document.getElementById("push-target-role");
      const pushUserSelection = document.getElementById("push-user-selection");

      if (pushTargetRole && !pushTargetRole.dataset.bound) {
        pushTargetRole.dataset.bound = "1";
        pushTargetRole.addEventListener("change", (e) => {
          if (e.target.value === "selected") {
            renderUserSelection("push-user-selection");
            if (pushUserSelection) pushUserSelection.style.display = "block";
          } else {
            if (pushUserSelection) pushUserSelection.style.display = "none";
          }
        });
      }

      if (pushForm && !pushForm.dataset.bound) {
        pushForm.dataset.bound = "1";
        pushForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const btn = pushForm.querySelector('button[type="submit"]');
          if (btn) {
            btn.disabled = true;
            btn.textContent = "Sender...";
          }
          pushStatusEl.textContent = "Forbereder utsendelse...";
          pushStatusEl.className = "status-message info";

          try {
            const user = firebase.auth().currentUser;
            if (!user) throw new Error("Du er ikke logget inn.");

            const idToken = await user.getIdToken();
            const targetRole = pushTargetRole.value;
            const title = document.getElementById("push-title").value;
            const body = document.getElementById("push-body").value;
            const click_action =
              document.getElementById("push-click-action").value;

            let payload = { targetRole, title, body, click_action };

            if (targetRole === "selected") {
              const selectedUserIds = Array.from(
                pushUserSelection.querySelectorAll(
                  ".user-select-checkbox:checked",
                ),
              ).map((cb) => cb.value);
              if (selectedUserIds.length === 0) {
                throw new Error("Ingen brukere er valgt.");
              }
              payload.selectedUserIds = selectedUserIds;
            }

            // 1. Save to Firestore user_notifications (in-app notifications)
            try {
              let targetUsers = [];
              const allUsersSnap = await firebaseService.db
                .collection("users")
                .get();
              allUsersSnap.forEach((doc) => {
                const data = doc.data();
                if (targetRole === "all") {
                  targetUsers.push(doc.id);
                } else if (targetRole === "medlem" && data.role === "medlem") {
                  targetUsers.push(doc.id);
                } else if (
                  targetRole === "selected" &&
                  payload.selectedUserIds?.includes(doc.id)
                ) {
                  targetUsers.push(doc.id);
                }
              });

              const batch = firebaseService.db.batch();
              targetUsers.forEach((userId) => {
                const ref = firebaseService.db
                  .collection("user_notifications")
                  .doc();
                batch.set(ref, {
                  userId,
                  title: payload.title,
                  body: payload.body,
                  type: "push",
                  link: payload.click_action || "",
                  read: false,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
              });
              await batch.commit();
              pushStatusEl.textContent = `Varsling lagret for ${targetUsers.length} bruker(e). Sender push...`;
            } catch (firestoreErr) {
              console.warn(
                "Firestore notification write failed:",
                firestoreErr,
              );
            }

            // 2. Attempt Cloud Function push (FCM)
            try {
              const response = await fetch(
                "https://sendpushnotification-42bhgdjkcq-uc.a.run.app",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                  },
                  body: JSON.stringify(payload),
                },
              );
              const result = await response.json();
              if (!response.ok)
                throw new Error(
                  result.error || `Server responded with ${response.status}`,
                );
              pushStatusEl.textContent =
                result.message || "Push-varsling er sendt!";
            } catch (fcmErr) {
              console.warn(
                "FCM push failed (in-app notification was still saved):",
                fcmErr,
              );
              pushStatusEl.textContent =
                "Varsling lagret i appen. (Push til telefon krevde innstillinger.)";
            }

            pushStatusEl.className = "status-message success";

            // 3. Log this push send to Firestore
            try {
              await firebaseService.db.collection("push_log").add({
                title: payload.title,
                body: payload.body,
                targetRole: targetRole,
                sentBy: firebase.auth().currentUser?.email || "ukjent",
                sentAt: firebase.firestore.FieldValue.serverTimestamp(),
              });
            } catch (logErr) {
              console.warn("Push log write failed:", logErr);
            }

            pushForm.reset();
            if (pushUserSelection) pushUserSelection.style.display = "none";
            // Refresh activity log
            this.loadActivityLog("all");
          } catch (error) {
            console.error("Feil ved utsendelse av push-varsling:", error);
            pushStatusEl.textContent = `Feil: ${error.message}`;
            pushStatusEl.className = "status-message error";
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Send push-varsling";
            }
          }
        });
      }

      // Load activity log
      this.loadActivityLog("all");

      // Filter buttons
      document.querySelectorAll(".log-filter-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          document
            .querySelectorAll(".log-filter-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.loadActivityLog(btn.dataset.filter);
        });
      });
    },

    _renderCollectionLoadMessage(collectionId, message, type = "warning") {
      const listContainer = document.getElementById(`${collectionId}-list`);
      if (!listContainer) return;

      const tone =
        type === "error"
          ? {
              bg: "#fef2f2",
              border: "#fecaca",
              color: "#991b1b",
              icon: "error",
            }
          : {
              bg: "#fffbeb",
              border: "#fde68a",
              color: "#92400e",
              icon: "warning",
            };

      listContainer.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;padding:26px;">
                <div style="width:100%;max-width:640px;border:1px solid ${tone.border};background:${tone.bg};color:${tone.color};border-radius:14px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="material-symbols-outlined" style="font-size:20px;">${tone.icon}</span>
                        <span style="font-weight:600;">${this.escapeHtml(message)}</span>
                    </div>
                    <button type="button" class="btn-secondary" id="retry-load-${collectionId}" style="padding:8px 12px;border-radius:8px;font-size:12px;">
                        Prøv igjen
                    </button>
                </div>
            </div>
        `;

      const retryBtn = document.getElementById(`retry-load-${collectionId}`);
      if (retryBtn) {
        retryBtn.onclick = () => this.loadCollection(collectionId);
      }
    },

    generateEmailReportHtml(donorKey, selectedYear, customIntroHtml = null) {
      const userMap = this.adminUserMap || new Map();
      const donations = this.getDonationsForDonor(donorKey);

      const firstRec = donations[0];
      const donorName = this.getDonationDonorName(firstRec, userMap);

      const filtered =
        selectedYear === "all"
          ? donations
          : donations.filter((d) => {
              const date = this.getDonationDate(d);
              return date && date.getFullYear().toString() === selectedYear;
            });

      const isCompleted = (r) =>
        ["completed", "succeeded", "captured"].includes(
          String(r.status || "").toLowerCase(),
        );
      const completed = filtered.filter(isCompleted);
      const totalSum = completed.reduce(
        (sum, r) => sum + this.normalizeDonationAmountNok(r),
        0,
      );

      const periodText =
        selectedYear === "all"
          ? "hele historikken"
          : `kalenderåret ${selectedYear}`;

      const rowsHtml = filtered
        .map((d) => {
          const date = this.getDonationDate(d);
          const dateStr = date
            ? date.toLocaleDateString("no-NO", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Ukjent";
          const method =
            this.getDonationMethodLabel(d.method) ||
            (d.isInKind ? "Fysisk" : "Ukjent");
          const isRecurring = String(d.type || "").toLowerCase() === "fast";
          const typeText = d.isInKind
            ? "Fysisk"
            : isRecurring
              ? "Fast"
              : "Enkelt";
          const status = this.getDonationStatusLabel(d.status);
          const amountVal = this.normalizeDonationAmountNok(d);
          const amountText =
            isCompleted(d) || d.isInKind
              ? `<strong>${this.formatDonationCurrency(amountVal)}</strong>`
              : `<span style="color:#94a3b8; text-decoration:line-through;">${this.formatDonationCurrency(amountVal)}</span>`;

          return `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:10px; font-size:12px; color:#334155; border-bottom:1px solid #f1f5f9;">${dateStr}</td>
                    <td style="padding:10px; font-size:12px; color:#475569; border-bottom:1px solid #f1f5f9;">${method}</td>
                    <td style="padding:10px; font-size:12px; color:#475569; border-bottom:1px solid #f1f5f9;">${typeText}</td>
                    <td style="padding:10px; font-size:12px; color:#475569; border-bottom:1px solid #f1f5f9;">${status}</td>
                    <td style="padding:10px; font-size:12px; text-align:right; border-bottom:1px solid #f1f5f9;">${amountText}</td>
                </tr>
            `;
        })
        .join("");

      return `
            <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1e293b; background:#f8fafc; padding:32px 16px; min-height:100%;">
                <div style="width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <div style="background:#1B4965; padding:24px; text-align:center;">
                        <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" alt="His Kingdom Ministry Logo" style="height:60px; width:auto; border-radius:6px; margin-bottom:12px;">
                        <h2 style="margin:0; color:white; font-size:20px; font-weight:800; letter-spacing:-0.01em;">HIS KINGDOM MINISTRY</h2>
                        <p style="margin:4px 0 0; color:#93c5fd; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Gaveoversikt</p>
                    </div>

                    <!-- Intro -->
                    <div style="padding:24px 24px 16px;">
                        <h3 style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">Hei ${this.escapeHtml(donorName)},</h3>
                        <p style="margin:10px 0 0; font-size:14px; line-height:1.5; color:#475569;">
                            ${customIntroHtml !== null ? customIntroHtml.replace(/\n/g, "<br>") : `Her er en oversikt over gaver registrert hos oss for ${periodText}.<br><br>Tusen takk for dine bidrag og din støtte til arbeidet vårt!`}
                        </p>
                    </div>

                    <!-- Summary Card -->
                    <div style="margin: 0 24px 24px; background:#f8fafc; border:1px solid #e2e8f0; padding:16px; border-radius:8px; text-align:center;">
                        <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">Mottatt beløp totalt</span>
                        <div style="font-size:24px; font-weight:800; color:#047857; margin-top:4px;">${this.formatDonationCurrency(totalSum)}</div>
                    </div>

                    <!-- Table -->
                    <div style="padding:0 24px 24px;">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="border-bottom:2px solid #1B4965; text-align:left;">
                                    <th style="padding:10px; font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase;">Dato</th>
                                    <th style="padding:10px; font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase;">Metode</th>
                                    <th style="padding:10px; font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase;">Type</th>
                                    <th style="padding:10px; font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase;">Status</th>
                                    <th style="padding:10px; font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase; text-align:right;">Beløp</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- Footer -->
                    <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:20px; text-align:center; font-size:12px; color:#64748b;">
                        <p style="margin:0; font-weight:600;">His Kingdom Ministry</p>
                        <p style="margin:4px 0 0;">Org.nr: 925 832 995 &bull; Lyngdal, Norge</p>
                        <p style="margin:12px 0 0; font-size:11px; color:#94a3b8; line-height:1.4;">
                            Hvis du har spørsmål vedrørende denne oversikten, vennligst ta kontakt med oss ved å svare på denne e-posten.
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    openEmailPreviewModal(donorKey, selectedYear, donorEmail) {
      let previewModal = document.getElementById("email-preview-modal");
      if (!previewModal) {
        previewModal = document.createElement("div");
        previewModal.id = "email-preview-modal";
        previewModal.style.cssText =
          "display:none;position:fixed;inset:0;z-index:20000;align-items:center;justify-content:center;padding:24px;";
        document.body.appendChild(previewModal);
      }

      const periodText =
        selectedYear === "all"
          ? "hele historikken"
          : `kalenderåret ${selectedYear}`;
      const defaultIntro = `Her er en oversikt over gaver registrert hos oss for ${periodText}.\n\nTusen takk for dine bidrag og din støtte til arbeidet vårt!`;
      const defaultSubject =
        selectedYear === "all"
          ? "Gaveoversikt - His Kingdom Ministry"
          : `Gaveoversikt for kalenderåret ${selectedYear} - His Kingdom Ministry`;

      previewModal.innerHTML = `
            <div class="modal-backdrop close-email-preview-btn" style="position:absolute;inset:0;background:rgba(15,23,42,0.4);backdrop-filter:blur(4px);"></div>
            <div class="modal-container" style="position:relative;background:white;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:100%;max-width:1100px;height:85vh;display:flex;flex-direction:column;overflow:hidden;animation:modalAppear 0.25s ease-out;z-index:1;">
                <!-- Header -->
                <div style="padding:16px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
                    <div>
                        <h3 style="margin:0; font-size:18px; font-weight:700; color:#1B4965; display:flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:22px; display:inline-flex; align-items:center; justify-content:center; vertical-align:middle; line-height:1;">mail</span>
                            <span style="display:inline-flex; align-items:center; line-height:1;">Forhåndsvis og rediger e-post</span>
                        </h3>
                    </div>
                    <button type="button" class="close-email-preview-btn" style="background:none; border:none; cursor:pointer; color:#64748b; display:flex; align-items:center; justify-content:center; padding:6px; border-radius:999px; transition:background 0.2s;">
                        <span class="material-symbols-outlined" style="font-size:22px;">close</span>
                    </button>
                </div>
                
                <!-- Two-column Body -->
                <div style="flex:1; display:flex; min-height:0; overflow:hidden;">
                    <!-- Left Panel: Form & Editor -->
                    <div style="width:40%; border-right:1px solid #e2e8f0; padding:20px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; background:#f8fafc;">
                        <div class="form-group" style="margin:0;">
                            <label style="font-weight:700; color:#1b4965; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">Mottaker</label>
                            <input type="email" id="email-preview-to" class="form-control" style="font-weight:600; width:100%; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px;" value="${this.escapeHtml(donorEmail)}">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-weight:700; color:#1b4965; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">Emne</label>
                            <input type="text" id="email-preview-subject" class="form-control" style="font-weight:600; width:100%; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px;" value="${this.escapeHtml(defaultSubject)}">
                        </div>
                        <div class="form-group" style="margin:0; flex:1; display:flex; flex-direction:column;">
                            <label style="font-weight:700; color:#1b4965; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">Følgebrev / Melding (HTML tillatt)</label>
                            <textarea id="email-preview-intro" class="form-control" style="flex:1; resize:none; font-family:inherit; font-size:13px; line-height:1.5; padding:12px; border: 1px solid #cbd5e1; border-radius:8px; min-height:200px; margin:0;">${defaultIntro}</textarea>
                            <span style="font-size:11px; color:#64748b; margin-top:4px;">Dette vil erstatte introduksjonsteksten i e-posten.</span>
                        </div>
                    </div>
                    
                    <!-- Right Panel: Live HTML Preview -->
                    <div style="width:60%; padding:20px; display:flex; flex-direction:column; background:#cbd5e1; min-height:0;">
                        <label style="font-weight:700; color:#475569; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:8px;">Live Forhåndsvisning</label>
                        <div style="flex:1; background:white; border-radius:8px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); border:1px solid #94a3b8; display:flex; flex-direction:column;">
                            <iframe id="email-preview-iframe" style="width:100%; flex:1; border:none; background:#f8fafc;"></iframe>
                        </div>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; background:#f8fafc; gap:12px;">
                    <button type="button" class="btn-secondary close-email-preview-btn" style="padding:10px 20px; border-radius:8px; font-weight:600; height:38px; cursor:pointer;">Avbryt</button>
                    <button type="button" class="btn-primary" id="email-preview-send-btn" style="display:inline-flex !important; align-items:center !important; justify-content:center !important; gap:6px !important; padding:6px 20px !important; border-radius:8px !important; font-size:13px !important; font-weight:600 !important; height:38px !important; min-height:38px !important; background:#1B4965 !important; color:white !important; border:none !important; cursor:pointer !important; transform-origin: center !important;">
                        <span class="material-symbols-outlined" style="font-size:18px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; vertical-align:middle !important; line-height:1 !important; transform: translateY(2.5px) !important; margin:0 !important; margin-right:4px !important;">send</span>
                        <span style="display:inline-flex !important; align-items:center !important; line-height:1 !important;">Send e-post nå</span>
                    </button>
                </div>
            </div>
        `;

      const updatePreview = () => {
        const introVal = document.getElementById("email-preview-intro").value;
        const html = this.generateEmailReportHtml(
          donorKey,
          selectedYear,
          introVal,
        );
        const iframe = document.getElementById("email-preview-iframe");
        if (iframe) {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          doc.open();
          doc.write(html);
          doc.close();
        }
      };

      const closeModal = () => {
        previewModal.style.display = "none";
      };

      previewModal
        .querySelectorAll(".close-email-preview-btn")
        .forEach((btn) => {
          btn.addEventListener("click", closeModal);
        });

      document
        .getElementById("email-preview-intro")
        .addEventListener("input", updatePreview);

      document
        .getElementById("email-preview-send-btn")
        .addEventListener("click", async () => {
          const recipient = document
            .getElementById("email-preview-to")
            .value.trim();
          const subject = document
            .getElementById("email-preview-subject")
            .value.trim();
          const introText = document.getElementById(
            "email-preview-intro",
          ).value;

          if (!recipient) {
            this.showToast("Mottaker e-post kan ikke være tom.", "error");
            return;
          }
          if (!subject) {
            this.showToast("Emnefeltet kan ikke være tomt.", "error");
            return;
          }

          const sendBtn = document.getElementById("email-preview-send-btn");
          if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = `
                    <span style="display:inline-flex !important; align-items:center !important; justify-content:center !important; width:18px !important; height:18px !important; margin-right:4px !important; line-height:1 !important;">
                        <span class="material-symbols-outlined" style="font-size:18px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; width:18px !important; height:18px !important; transform-origin:center center !important; animation:admin-spin 1s linear infinite !important; margin:0 !important; padding:0 !important; line-height:1 !important;">sync</span>
                    </span>
                    <span style="display:inline-flex !important; align-items:center !important; line-height:1 !important;">Sender...</span>
                `;
          }

          try {
            const htmlContent = this.generateEmailReportHtml(
              donorKey,
              selectedYear,
              introText,
            );
            await this.sendEmailToUser(
              recipient,
              subject,
              "Se vedlagt gaveoversikt i e-posten.",
              htmlContent,
            );
            closeModal();
          } catch (error) {
            console.error("Feil ved sending av e-postrapport:", error);
            this.showToast(
              "Kunne ikke sende e-post: " + error.message,
              "error",
            );
          } finally {
            if (sendBtn) {
              sendBtn.disabled = false;
              sendBtn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size:18px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; vertical-align:middle !important; line-height:1 !important; transform: translateY(2.5px) !important; margin:0 !important; margin-right:4px !important;">send</span>
                        <span style="display:inline-flex !important; align-items:center !important; line-height:1 !important;">Send e-post nå</span>
                    `;
            }
          }
        });

      previewModal.style.display = "flex";
      updatePreview();
    },

    async sendEmailToUser(email, subject, message, html = null) {
      if (!email) {
        this.showToast("Brukeren mangler e-postadresse.", "error");
        return;
      }

      try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error("Du er ikke logget inn.");
        const idToken = await user.getIdToken();

        const payload = {
          to: email,
          subject: subject,
          fromName: "His Kingdom Ministry",
        };
        if (html) {
          payload.html = html;
          payload.message = message || "Se vedlagte rapport.";
        } else {
          payload.message = message;
        }

        const response = await fetch(
          "https://sendmanualemail-42bhgdjkcq-uc.a.run.app",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(payload),
          },
        );

        const result = await response.json();
        if (result.success) {
          this.showToast("E-post er sendt!", "success");
        } else {
          throw new Error(result.error || "Kunne ikke sende e-post.");
        }
      } catch (error) {
        console.error("Feil ved sending av e-post:", error);
        this.showToast("Feil ved sending: " + error.message, "error");
      }
    },

    getDefaultTemplateData(id) {
      const defaults = {
        welcome_email: {
          subject: "Velkommen til His Kingdom Ministry!",
          body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
  <div style="height: 4px; background: linear-gradient(90deg, #1B4965 0%, #d17d39 50%, #bd4f2a 100%);"></div>
  <header style="padding: 32px 20px 24px 20px; box-sizing: border-box; max-width: 100%; text-align: center; background-color: #FCF9F5;">
    <div style="margin-bottom: 16px;">
      <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 48px; width: auto; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
    </div>
    <h1 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: rgba(18, 28, 44, 0.6); text-transform: uppercase; letter-spacing: 0.25em; line-height: 1.5;">His Kingdom Ministry</h1>
    <div style="width: 32px; height: 1px; background-color: rgba(137, 114, 105, 0.4); margin: 20px auto 0 auto;"></div>
  </header>
  <div style="padding: 0 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: #FCF9F5;">
    <section style="margin-bottom: 32px; text-align: center; max-width: 440px; margin-left: auto; margin-right: auto;">
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Velkommen, {{name}}!</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Vi er så glade for at du har registrert deg i vårt system. Måtte fellesskapet være til velsignelse for deg.
      </p>
    </section>
    <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #1B4965; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(27, 73, 101, 0.02); border-top: 1px solid rgba(27, 73, 101, 0.05); border-right: 1px solid rgba(27, 73, 101, 0.05); border-bottom: 1px solid rgba(27, 73, 101, 0.05);">
      <div style="display: inline-block; padding: 2px 6px; background-color: rgba(27, 73, 101, 0.08); color: #1B4965; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 16px;">
        DITT MEDLEMSKAP
      </div>
      <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 20px; line-height: 28px; font-weight: 600; color: #121c2c; margin: 0 0 16px 0;">
        Hva kan du gjøre på Min Side?
      </h3>
      <ul style="margin: 0; padding: 0 0 0 20px; font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.8; color: rgba(18, 28, 44, 0.9);">
        <li style="margin-bottom: 8px;"><strong>Min Side:</strong> Hold oversikt over profilen din og dine aktive leseplaner.</li>
        <li style="margin-bottom: 8px;"><strong>Ressurser:</strong> Få tilgang til eksklusive artikler, videoer og undervisning.</li>
        <li><strong>Kurs:</strong> Påmelding og progresjon på våre bibelkurs.</li>
      </ul>
    </section>
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/minside" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
        Gå til Min Side
      </a>
    </div>
  </div>
  <footer style="padding: 24px 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: rgba(252, 249, 245, 0.5); text-align: center; border-top: 1px solid rgba(221, 193, 182, 0.1);">
    <p style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(18, 28, 44, 0.4); margin: 0 0 12px 0;">© 2026 His Kingdom Ministry</p>
  </footer>
</div>`,
        },
        course_registration: {
          subject: "Bekreftelse på kurspåmelding: {{courseTitle}}",
          body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
  <div style="height: 4px; background: linear-gradient(90deg, #1B4965 0%, #d17d39 50%, #bd4f2a 100%);"></div>
  <header style="padding: 32px 20px 24px 20px; box-sizing: border-box; max-width: 100%; text-align: center; background-color: #FCF9F5;">
    <div style="margin-bottom: 16px;">
      <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 48px; width: auto; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
    </div>
    <h1 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: rgba(18, 28, 44, 0.6); text-transform: uppercase; letter-spacing: 0.25em; line-height: 1.5;">His Kingdom Ministry</h1>
    <div style="width: 32px; height: 1px; background-color: rgba(137, 114, 105, 0.4); margin: 20px auto 0 auto;"></div>
  </header>
  <div style="padding: 0 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: #FCF9F5;">
    <section style="margin-bottom: 32px; text-align: center; max-width: 440px; margin-left: auto; margin-right: auto;">
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Takk for din påmelding, {{name}}!</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Vi har mottatt din påmelding til <strong>{{courseTitle}}</strong>.
      </p>
    </section>
    <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #1B4965; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(27, 73, 101, 0.02); border-top: 1px solid rgba(27, 73, 101, 0.05); border-right: 1px solid rgba(27, 73, 101, 0.05); border-bottom: 1px solid rgba(27, 73, 101, 0.05);">
      <div style="display: inline-block; padding: 2px 6px; background-color: rgba(27, 73, 101, 0.08); color: #1B4965; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 12px;">
        KURSINFORMASJON
      </div>
      <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 20px; line-height: 28px; font-weight: 600; color: #121c2c; margin: 0 0 12px 0;">
        {{courseTitle}}
      </h3>
      <p style="margin: 0; color: rgba(18, 28, 44, 0.9); font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6;">
        Din påmelding behandles nå. Du vil motta en oppdatering så snart kurstilgangen din er godkjent og klar på Min Side.
      </p>
    </section>
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/minside" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
        Gå til Min Side
      </a>
    </div>
  </div>
  <footer style="padding: 24px 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: rgba(252, 249, 245, 0.5); text-align: center; border-top: 1px solid rgba(221, 193, 182, 0.1);">
    <p style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(18, 28, 44, 0.4); margin: 0 0 12px 0;">© 2026 His Kingdom Ministry</p>
  </footer>
</div>`,
        },
        course_registration_admin: {
          subject: "Ny kurspåmelding: {{name}} ({{courseTitle}})",
          body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
  <div style="height: 4px; background: linear-gradient(90deg, #1B4965 0%, #d17d39 50%, #bd4f2a 100%);"></div>
  <header style="padding: 32px 20px 24px 20px; box-sizing: border-box; max-width: 100%; text-align: center; background-color: #FCF9F5;">
    <div style="margin-bottom: 16px;">
      <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 48px; width: auto; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
    </div>
    <h1 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: rgba(18, 28, 44, 0.6); text-transform: uppercase; letter-spacing: 0.25em; line-height: 1.5;">His Kingdom Ministry Admin</h1>
    <div style="width: 32px; height: 1px; background-color: rgba(137, 114, 105, 0.4); margin: 20px auto 0 auto;"></div>
  </header>
  <div style="padding: 0 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: #FCF9F5;">
    <section style="margin-bottom: 32px; text-align: center; max-width: 440px; margin-left: auto; margin-right: auto;">
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 28px; line-height: 36px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Ny kurspåmelding registrert!</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 15px; line-height: 24px; font-weight: 400; color: #56423b; margin: 0; opacity: 0.85;">
        {{name}} har registrert seg til kurset <strong>{{courseTitle}}</strong>.
      </p>
    </section>
    <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #d17d39; border-radius: 0 12px 12px 0; padding: 24px; box-shadow: 0 2px 8px rgba(209, 125, 57, 0.05); border-top: 1px solid rgba(221, 193, 182, 0.2); border-right: 1px solid rgba(221, 193, 182, 0.2); border-bottom: 1px solid rgba(221, 193, 182, 0.2);">
      <div style="display: inline-block; padding: 2px 8px; background-color: rgba(209, 125, 57, 0.1); color: #d17d39; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 16px;">
        DETALJER OM PÅMELDINGEN
      </div>
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: 14px; color: #121c2c;">
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b; width: 110px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">Deltaker:</td>
          <td style="padding: 8px 0; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9; word-break: break-word; vertical-align: top;">{{name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b; border-bottom: 1px solid #f1f5f9; vertical-align: top;">E-post:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; word-break: break-all; overflow-wrap: anywhere; vertical-align: top;"><a href="mailto:{{email}}" style="color: #d17d39; text-decoration: underline; word-break: break-all; word-wrap: break-word;">{{email}}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b; border-bottom: 1px solid #f1f5f9; vertical-align: top;">Telefon:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; word-break: break-word; vertical-align: top;">{{phone}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b; border-bottom: 1px solid #f1f5f9; vertical-align: top;">Kurs:</td>
          <td style="padding: 8px 0; font-weight: 700; border-bottom: 1px solid #f1f5f9; word-break: break-word; vertical-align: top;">{{courseTitle}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b; border-bottom: 1px solid #f1f5f9; vertical-align: top;">Beløp / Metode:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; word-break: break-word; vertical-align: top;">{{amount}} ({{paymentMethod}})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 700; color: #64748b; vertical-align: top;">Status:</td>
          <td style="padding: 8px 0; vertical-align: top;"><span style="background: #ffedd5; color: #c2410c; padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; display: inline-block;">{{status}}</span></td>
        </tr>
      </table>
    </section>
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/admin/index.html#courses" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
        Behandle påmelding i Admin
      </a>
    </div>
  </div>
  <footer style="padding: 24px 32px; background-color: rgba(252, 249, 245, 0.5); text-align: center; border-top: 1px solid rgba(221, 193, 182, 0.1);">
    <p style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(18, 28, 44, 0.4); margin: 0;">© 2026 His Kingdom Ministry Admin Notification</p>
  </footer>
</div>`,
        },
        course_registration_approved: {
          subject: "Din tilgang er godkjent: {{courseTitle}}",
          body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
  <div style="height: 4px; background: linear-gradient(90deg, #1B4965 0%, #d17d39 50%, #bd4f2a 100%);"></div>
  <header style="padding: 32px 20px 24px 20px; box-sizing: border-box; max-width: 100%; text-align: center; background-color: #FCF9F5;">
    <div style="margin-bottom: 16px;">
      <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 48px; width: auto; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
    </div>
    <h1 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: rgba(18, 28, 44, 0.6); text-transform: uppercase; letter-spacing: 0.25em; line-height: 1.5;">His Kingdom Ministry</h1>
    <div style="width: 32px; height: 1px; background-color: rgba(137, 114, 105, 0.4); margin: 20px auto 0 auto;"></div>
  </header>
  <div style="padding: 0 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: #FCF9F5;">
    <section style="margin-bottom: 32px; text-align: center; max-width: 440px; margin-left: auto; margin-right: auto;">
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Tilgang Godkjent!</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Hei {{name}}! Påmeldingen din er nå godkjent og du har full tilgang.
      </p>
    </section>
    <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #1B4965; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(27, 73, 101, 0.02); border-top: 1px solid rgba(27, 73, 101, 0.05); border-right: 1px solid rgba(27, 73, 101, 0.05); border-bottom: 1px solid rgba(27, 73, 101, 0.05);">
      <div style="display: inline-block; padding: 2px 6px; background-color: rgba(27, 73, 101, 0.08); color: #1B4965; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 12px;">
        KURS
      </div>
      <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 20px; line-height: 28px; font-weight: 600; color: #121c2c; margin: 0 0 12px 0;">
        {{courseTitle}}
      </h3>
      <p style="margin: 0; color: rgba(18, 28, 44, 0.9); font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.6;">
        Du kan nå logge inn på Min Side og gå i gang med kurset når det passer deg!
      </p>
    </section>
    <div style="text-align: center; margin-bottom: 48px;">
      <a href="https://www.hiskingdomministry.no/minside" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
        Gå til Min Side og start kurset
      </a>
    </div>
  </div>
  <footer style="padding: 24px 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: rgba(252, 249, 245, 0.5); text-align: center; border-top: 1px solid rgba(221, 193, 182, 0.1);">
    <p style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(18, 28, 44, 0.4); margin: 0 0 12px 0;">© 2026 His Kingdom Ministry</p>
  </footer>
</div>`,
        },
        newsletter_confirmation: {
          subject: "Bekreftelse på nyhetsbrev - His Kingdom Ministry",
          body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
  <div style="height: 4px; background: linear-gradient(90deg, #1B4965 0%, #d17d39 50%, #bd4f2a 100%);"></div>
  <header style="padding: 32px 20px 24px 20px; box-sizing: border-box; max-width: 100%; text-align: center; background-color: #FCF9F5;">
    <div style="margin-bottom: 16px;">
      <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 48px; width: auto; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
    </div>
    <h1 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: rgba(18, 28, 44, 0.6); text-transform: uppercase; letter-spacing: 0.25em; line-height: 1.5;">His Kingdom Ministry</h1>
    <div style="width: 32px; height: 1px; background-color: rgba(137, 114, 105, 0.4); margin: 20px auto 0 auto;"></div>
  </header>
  <div style="padding: 0 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: #FCF9F5;">
    <section style="margin-bottom: 32px; text-align: center; max-width: 440px; margin-left: auto; margin-right: auto;">
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Velkommen til nyhetsbrevet!</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Takk for at du meldte deg på vårt nyhetsbrev. Du vil nå motta jevnlige oppdateringer, oppmuntringer og nyheter fra His Kingdom Ministry.
      </p>
    </section>
  </div>
  <footer style="padding: 24px 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: rgba(252, 249, 245, 0.5); text-align: center; border-top: 1px solid rgba(221, 193, 182, 0.1);">
    <p style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(18, 28, 44, 0.4); margin: 0 0 12px 0;">© 2026 His Kingdom Ministry</p>
  </footer>
</div>`,
        },
        daily_bible_reading: {
          subject: "Dagens Bibellesing - His Kingdom Ministry",
          body: `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left;">
  <div style="height: 4px; background: linear-gradient(90deg, #1B4965 0%, #d17d39 50%, #bd4f2a 100%);"></div>
  <header style="padding: 32px 20px 24px 20px; box-sizing: border-box; max-width: 100%; text-align: center; background-color: #FCF9F5;">
    <div style="margin-bottom: 16px;">
      <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 48px; width: auto; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
    </div>
    <h1 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: rgba(18, 28, 44, 0.6); text-transform: uppercase; letter-spacing: 0.25em; line-height: 1.5;">Dagens Bibellesing</h1>
    <div style="width: 32px; height: 1px; background-color: rgba(137, 114, 105, 0.4); margin: 20px auto 0 auto;"></div>
  </header>
  <div style="padding: 0 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: #FCF9F5;">
    <section style="margin-bottom: 32px; text-align: center; max-width: 440px; margin-left: auto; margin-right: auto;">
      <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Dagens Ord til deg, {{name}}</h2>
      <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
        Her er dagens avsnitt i din leseplan.
      </p>
    </section>
  </div>
  <footer style="padding: 24px 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: rgba(252, 249, 245, 0.5); text-align: center; border-top: 1px solid rgba(221, 193, 182, 0.1);">
    <p style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(18, 28, 44, 0.4); margin: 0 0 12px 0;">© 2026 His Kingdom Ministry</p>
  </footer>
</div>`,
        },
      };
      return defaults[id] || { subject: "", body: "" };
    },

    async loadEmailTemplates() {
      const tbody = document.getElementById("email-templates-body");
      if (!tbody) return;

      try {
        // Standardmaler som alltid bør finnes
        const defaultTemplates = [
          {
            id: "welcome_email",
            name: "Velkomst-e-post",
            description: "Sendes når en ny bruker registrerer seg.",
          },
          {
            id: "course_registration",
            name: "Kurspåmelding (Deltaker)",
            description: "Sendes til deltaker ved registrering til et kurs.",
          },
          {
            id: "course_registration_admin",
            name: "Kurspåmelding (Admin-varsel)",
            description:
              "Sendes til admin (thomas@ & post@) ved ny kurspåmelding.",
          },
          {
            id: "course_registration_approved",
            name: "Kurstilgang Godkjent (Deltaker)",
            description: "Sendes til deltaker når kurstilgangen godkjennes.",
          },
          {
            id: "newsletter_confirmation",
            name: "Nyhetsbrev-bekreftelse",
            description: "Sendes ved påmelding til nyhetsbrev.",
          },
          {
            id: "daily_bible_reading",
            name: "Dagens bibellesing",
            description: "Sendes som daglig e-postvarsel for leseplaner.",
          },
        ];

        const loadedTemplates = await Promise.all(
          defaultTemplates.map(async (t) => {
            const doc = await firebaseService.db
              .collection("email_templates")
              .doc(t.id)
              .get();
            const dbData = doc.exists ? doc.data() : {};
            const fallbackData = this.getDefaultTemplateData(t.id);
            return {
              ...t,
              data: {
                subject: dbData.subject || fallbackData.subject,
                body: dbData.body || fallbackData.body,
                updatedAt: dbData.updatedAt || null,
              },
            };
          }),
        );

        tbody.innerHTML = "";

        for (const t of loadedTemplates) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
                                                                                <td>
                                                                                    <div class="user-info-cell">
                                                                                        <span class="email-template-name">${t.name}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td><span class="text-muted">${t.description}</span></td>
                                                                                <td>${t.data.updatedAt ? new Date(t.data.updatedAt).toLocaleDateString("no-NO") : "Standard"}</td>
                                                                                <td class="col-actions">
                                                                                    <button class="icon-btn edit-template-btn" title="Rediger mal">
                                                                                        <span class="material-symbols-outlined">edit</span>
                                                                                    </button>
                                                                                </td>
                                                                                `;

          tr.querySelector(".edit-template-btn").addEventListener(
            "click",
            () => {
              this.openTemplateEditor(t.id, t.name, t.data);
            },
          );

          tbody.appendChild(tr);
        }
      } catch (error) {
        console.error("Feil ved lasting av e-postmaler:", error);
        tbody.innerHTML =
          '<tr><td colspan="4">Kunne ikke laste maler.</td></tr>';
      }
    },

    async loadEmailLogs() {
      const tbody = document.getElementById("email-logs-body");
      if (!tbody) return;

      const countBadge = document.getElementById("email-log-count-badge");
      const limitSelect = document.getElementById("email-log-limit-select");
      const fetchLimit = limitSelect
        ? parseInt(limitSelect.value, 10) || 500
        : 500;

      if (countBadge) countBadge.textContent = "Henter logger...";
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; padding: 24px; color: #64748b;">Laster inn e-postlogger...</td></tr>';

      try {
        const snapshot = await firebaseService.db
          .collection("email_logs")
          .orderBy("timestamp", "desc")
          .limit(fetchLimit)
          .get();

        this.emailLogs = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const dateObj =
            data.timestamp && data.timestamp.toDate
              ? data.timestamp.toDate()
              : data.sentAt
                ? new Date(data.sentAt)
                : data.createdAt
                  ? new Date(data.createdAt)
                  : new Date();

          this.emailLogs.push({
            id: doc.id,
            to: data.to || data.recipient || "Ukjent mottaker",
            subject: data.subject || "(Ingen emne)",
            type: data.type || "automated",
            status: data.status || "sent",
            date: dateObj,
            error: data.error || data.errorMessage || null,
            html: data.html || data.body || data.text || null,
            raw: data,
          });
        });

        this.bindEmailLogListeners();
        this.renderFilteredEmailLogs();
      } catch (error) {
        console.error("Feil ved lasting av e-postlogger:", error);
        tbody.innerHTML =
          '<tr><td colspan="6" style="text-align:center; padding: 24px; color: #e53e3e;">Kunne ikke laste logger: ' +
          (error.message || "Ukjent feil") +
          "</td></tr>";
        if (countBadge) countBadge.textContent = "Feil ved innlasting";
      }
    },

    bindEmailLogListeners() {
      if (this.emailLogListenersBound) return;
      this.emailLogListenersBound = true;

      const searchInput = document.getElementById("email-log-search");
      const datePreset = document.getElementById("email-log-date-preset");
      const customDatesContainer = document.getElementById(
        "email-log-custom-dates",
      );
      const dateFrom = document.getElementById("email-log-date-from");
      const dateTo = document.getElementById("email-log-date-to");
      const statusFilter = document.getElementById("email-log-status-filter");
      const limitSelect = document.getElementById("email-log-limit-select");
      const refreshBtn = document.getElementById("email-log-refresh-btn");
      const exportBtn = document.getElementById("email-log-export-btn");
      const modal = document.getElementById("email-log-detail-modal");
      const closeBtn = document.getElementById("close-email-log-modal");
      const modalCloseBtn = document.getElementById("modal-log-close-btn");

      if (searchInput)
        searchInput.addEventListener("input", () =>
          this.renderFilteredEmailLogs(),
        );

      if (datePreset) {
        datePreset.addEventListener("change", () => {
          if (datePreset.value === "custom") {
            if (customDatesContainer)
              customDatesContainer.style.display = "inline-flex";
          } else {
            if (customDatesContainer)
              customDatesContainer.style.display = "none";
          }
          this.renderFilteredEmailLogs();
        });
      }

      if (dateFrom)
        dateFrom.addEventListener("change", () =>
          this.renderFilteredEmailLogs(),
        );
      if (dateTo)
        dateTo.addEventListener("change", () => this.renderFilteredEmailLogs());
      if (statusFilter)
        statusFilter.addEventListener("change", () =>
          this.renderFilteredEmailLogs(),
        );
      if (limitSelect)
        limitSelect.addEventListener("change", () => this.loadEmailLogs());
      if (refreshBtn)
        refreshBtn.addEventListener("click", () => this.loadEmailLogs());
      if (exportBtn)
        exportBtn.addEventListener("click", () => this.exportEmailLogsCSV());

      const closeModal = () => {
        if (modal) modal.style.display = "none";
      };

      if (closeBtn) closeBtn.onclick = closeModal;
      if (modalCloseBtn) modalCloseBtn.onclick = closeModal;
      if (modal) {
        modal.onclick = (e) => {
          if (e.target === modal) closeModal();
        };
      }
    },

    renderFilteredEmailLogs() {
      const tbody = document.getElementById("email-logs-body");
      const countBadge = document.getElementById("email-log-count-badge");
      if (!tbody || !this.emailLogs) return;

      const searchVal = (
        document.getElementById("email-log-search")?.value || ""
      )
        .toLowerCase()
        .trim();
      const datePreset =
        document.getElementById("email-log-date-preset")?.value || "all";
      const dateFromVal = document.getElementById("email-log-date-from")?.value;
      const dateToVal = document.getElementById("email-log-date-to")?.value;
      const statusVal =
        document.getElementById("email-log-status-filter")?.value || "all";

      const now = new Date();
      let minDate = null;
      let maxDate = null;

      if (datePreset === "today") {
        minDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        );
      } else if (datePreset === "7days") {
        minDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (datePreset === "30days") {
        minDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (datePreset === "custom") {
        if (dateFromVal) {
          const parts = dateFromVal.split("-");
          minDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
        }
        if (dateToVal) {
          const parts = dateToVal.split("-");
          maxDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);
        }
      }

      this.filteredEmailLogs = this.emailLogs.filter((log) => {
        // Search filter
        if (searchVal) {
          const toStr = Array.isArray(log.to)
            ? log.to.join(", ").toLowerCase()
            : String(log.to).toLowerCase();
          const subjStr = String(log.subject).toLowerCase();
          const typeStr = String(log.type).toLowerCase();
          const statusStr = String(log.status).toLowerCase();
          const match =
            toStr.includes(searchVal) ||
            subjStr.includes(searchVal) ||
            typeStr.includes(searchVal) ||
            statusStr.includes(searchVal);
          if (!match) return false;
        }

        // Status filter
        if (statusVal !== "all" && log.status !== statusVal) {
          return false;
        }

        // Date filter
        if (minDate && log.date < minDate) return false;
        if (maxDate && log.date > maxDate) return false;

        return true;
      });

      // Update count badge
      if (countBadge) {
        if (this.filteredEmailLogs.length === this.emailLogs.length) {
          countBadge.textContent = `Viser ${this.emailLogs.length} e-poster`;
        } else {
          countBadge.textContent = `Viser ${this.filteredEmailLogs.length} av ${this.emailLogs.length} e-poster`;
        }
      }

      if (this.filteredEmailLogs.length === 0) {
        tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 48px 24px;">
                        <div style="max-width: 320px; margin: 0 auto; display: flex; flex-direction: column; align-items: center;">
                            <span class="material-symbols-outlined" style="font-size: 48px; color: #a0aec0; margin-bottom: 12px;">mark_email_read</span>
                            <h4 style="font-size: 16px; font-weight: 600; color: #2d3748; margin: 0 0 6px 0;">Ingen e-postlogger funnet</h4>
                            <p style="font-size: 13px; color: #718096; margin: 0;">Prøv å endre søkeord, datofilter eller tilbakestill søket.</p>
                        </div>
                    </td>
                </tr>
            `;
        return;
      }

      tbody.innerHTML = "";
      this.filteredEmailLogs.forEach((log) => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.className = "email-log-row";

        const recipientStr = Array.isArray(log.to) ? log.to.join(", ") : log.to;
        const dateStr = log.date
          ? log.date.toLocaleString("no-NO", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "-";

        const statusClass = log.status === "sent" ? "sent" : "failed";
        const statusLabel = log.status === "sent" ? "Sendt" : "Feilet";

        tr.innerHTML = `
                <td style="font-weight: 500; color: #1e293b;">${recipientStr}</td>
                <td style="color: #334155; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.subject}</td>
                <td><span class="badge status-read">${log.type}</span></td>
                <td style="font-size: 13px; color: #64748b; white-space: nowrap;">${dateStr}</td>
                <td>
                    <span class="status-pill ${statusClass}">
                        ${statusLabel}
                    </span>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm log-detail-btn" style="padding: 4px 8px; border-radius: 8px; border: 1px solid #cbd5e1;" title="Vis detaljer">
                        <span class="material-symbols-outlined" style="font-size: 18px; display: block; color: #475569;">info</span>
                    </button>
                </td>
            `;

        tr.addEventListener("click", () => this.showEmailLogDetailModal(log));
        tbody.appendChild(tr);
      });
    },

    showEmailLogDetailModal(log) {
      const modal = document.getElementById("email-log-detail-modal");
      if (!modal) return;

      const toEl = document.getElementById("modal-log-to");
      const dateEl = document.getElementById("modal-log-date");
      const typeEl = document.getElementById("modal-log-type");
      const statusEl = document.getElementById("modal-log-status");
      const subjectEl = document.getElementById("modal-log-subject");
      const errorContainer = document.getElementById(
        "modal-log-error-container",
      );
      const errorText = document.getElementById("modal-log-error-text");
      const bodyContainer = document.getElementById("modal-log-body-container");

      const recipientStr = Array.isArray(log.to) ? log.to.join(", ") : log.to;
      if (toEl) toEl.textContent = recipientStr;
      if (dateEl)
        dateEl.textContent = log.date ? log.date.toLocaleString("no-NO") : "-";
      if (typeEl) typeEl.textContent = log.type || "automated";

      if (statusEl) {
        const isSent = log.status === "sent";
        statusEl.className = `status-pill ${isSent ? "sent" : "failed"}`;
        statusEl.textContent = isSent ? "Sendt" : "Feilet";
      }

      if (subjectEl) subjectEl.textContent = log.subject || "(Ingen emne)";

      if (log.error && errorContainer && errorText) {
        errorText.textContent =
          typeof log.error === "object"
            ? JSON.stringify(log.error, null, 2)
            : String(log.error);
        errorContainer.style.display = "block";
      } else if (errorContainer) {
        errorContainer.style.display = "none";
      }

      if (bodyContainer) {
        if (log.html) {
          bodyContainer.innerHTML = log.html;
        } else {
          bodyContainer.innerHTML =
            '<span style="color: #94a3b8; font-style: italic;">Ingen e-posttekst lagret for denne loggen.</span>';
        }
      }

      modal.style.display = "flex";
    },

    exportEmailLogsCSV() {
      if (!this.filteredEmailLogs || this.filteredEmailLogs.length === 0) {
        this.showToast("Ingen logger å eksportere.", "error");
        return;
      }

      // Rule #3: CSV with ';' separator and UTF-8 BOM (\uFEFF) for Norwegian Excel
      let csvContent =
        "\uFEFFMottaker;Emne;Type;Tidspunkt;Status;Feilmelding\n";

      this.filteredEmailLogs.forEach((log) => {
        const recipientStr = (
          Array.isArray(log.to) ? log.to.join(", ") : String(log.to || "")
        ).replace(/;/g, ",");
        const subjectStr = String(log.subject || "")
          .replace(/;/g, ",")
          .replace(/\n/g, " ");
        const typeStr = String(log.type || "").replace(/;/g, ",");
        const dateStr = log.date ? log.date.toLocaleString("no-NO") : "";
        const statusStr = log.status === "sent" ? "Sendt" : "Feilet";
        const errorStr = (
          log.error
            ? typeof log.error === "object"
              ? JSON.stringify(log.error)
              : String(log.error)
            : ""
        )
          .replace(/;/g, ",")
          .replace(/\n/g, " ");

        csvContent += `"${recipientStr}";"${subjectStr}";"${typeStr}";"${dateStr}";"${statusStr}";"${errorStr}"\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const todayStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `utsendelseslogg-hkm-${todayStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast("E-postlogg eksportert til CSV.", "success");
    },
  };
}
