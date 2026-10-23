// communications methods for AdminManager.
export function createMethods19({ firebaseService, adminUtils, showErrorUI }) {
  return {
    initTemplateEditorModal() {
      const modal = document.getElementById("template-editor-modal");
      const closeBtn = document.getElementById("close-template-modal");
      const cancelBtn = document.getElementById("cancel-template-edit");
      const saveBtn = document.getElementById("save-template-btn");

      if (!modal || !saveBtn) return;

      // Initialize Quill
      if (typeof Quill !== "undefined" && !this.quill) {
        this.quill = new Quill("#edit-template-body", {
          theme: "snow",
          modules: {
            toolbar: [
              [{ header: [1, 2, 3, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ color: [] }, { background: [] }],
              [{ list: "ordered" }, { list: "bullet" }],
              [{ align: [] }],
              ["link", "clean"],
            ],
          },
        });
      }

      const closeModal = () => {
        modal.style.display = "none";
      };

      if (closeBtn) closeBtn.onclick = closeModal;
      if (cancelBtn) cancelBtn.onclick = closeModal;

      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.style.display === "flex") {
          closeModal();
        }
      });

      // Initialize HTML/Code toggle logic (Live Read-Only Preview Frame)
      const previewTabBtn = document.getElementById("toggle-preview-mode-btn");
      const codeTabBtn = document.getElementById("toggle-code-mode-btn");
      const rawTextarea = document.getElementById("edit-template-body-raw");
      const previewContainer = document.getElementById(
        "template-live-preview-container",
      );
      const quillContainer = document.getElementById("quill-editor-container");

      this.updatePreviewIframe = (templateId, htmlContent) => {
        const iframe = document.getElementById("template-preview-iframe");
        if (!iframe) return;
        let sampleHtml = htmlContent || "";

        // Format mock values for Norwegian visualization
        sampleHtml = sampleHtml
          .replace(/\{\{name\}\}/g, "Ola Nordmann")
          .replace(/\{\{email\}\}/g, "ola.nordmann@eksempel.no")
          .replace(/\{\{phone\}\}/g, "412 34 567")
          .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus")
          .replace(/\{\{amount\}\}/g, "Kr 0,- (Vipps / Gratis)")
          .replace(/\{\{paymentMethod\}\}/g, "Vipps")
          .replace(/\{\{status\}\}/g, "Godkjent")
          .replace(/\{\{day\}\}/g, "1")
          .replace(/\{\{title\}\}/g, "Johannesevangeliet")
          .replace(/\{\{passage\}\}/g, "Johannes 3:16-21")
          .replace(
            /\{\{devotional\}\}/g,
            "Dette er en inspirerende andaktstekst for dagens lesing.",
          )
          .replace(/\{\{planId\}\}/g, "leseplan-1");

        if (sampleHtml.includes("{{reading_content}}")) {
          const mockReadingCard = `
                    <div style="background-color: #FCF9F5; padding: 20px; border-radius: 12px; font-family: 'Inter', sans-serif;">
                        <section style="margin-bottom: 20px; text-align: center;">
                            <h2 style="font-family: Georgia, serif; font-size: 22px; color: #121c2c; margin: 0 0 6px 0; font-style: italic;">Hei Ola Nordmann</h2>
                            <p style="font-size: 13px; color: #56423b; margin: 0; font-style: italic;">Måtte dagens ord bringe deg stillhet, refleksjon og fornyet styrke.</p>
                        </section>
                        <section style="background: #ffffff; border-left: 4px solid #1B4965; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                            <div style="font-size: 9px; font-weight: 800; color: #1B4965; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">BIBELTEKST</div>
                            <h3 style="font-family: Georgia, serif; font-size: 16px; color: #121c2c; margin: 0 0 4px 0;">Johannesevangeliet - Dag 1</h3>
                            <p style="font-size: 13px; color: #56423b; margin: 0; font-weight: 600;">Johannes 3:16-21</p>
                        </section>
                        <section style="background: #ffffff; border-left: 4px solid #d17d39; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                            <div style="font-size: 9px; font-weight: 800; color: #d17d39; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">ANDAKT & BØNN</div>
                            <h4 style="font-family: Georgia, serif; font-size: 15px; color: #121c2c; margin: 0 0 6px 0;">Dagens andakt og bønn</h4>
                            <p style="font-size: 13px; line-height: 1.6; color: #121c2c; margin: 0;">For så høyt har Gud elsket verden at han ga sin Sønn, den enbårne, for at hver den som tror på ham, ikke skal gå fortapt, men ha evig liv.</p>
                        </section>
                        <div style="text-align: center;">
                            <a href="#" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 10px 32px; border-radius: 20px; font-weight: 700; text-decoration: none; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; display: inline-block;">LES PLAN</a>
                        </div>
                    </div>
                `;
          sampleHtml = sampleHtml.replace(
            /\{\{reading_content\}\}/g,
            mockReadingCard,
          );
        }

        const fullHtmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:20px;background:#FCF9F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#121c2c;}</style></head><body>${sampleHtml}</body></html>`;
        iframe.srcdoc = fullHtmlDoc;
        try {
          const doc =
            iframe.contentDocument ||
            (iframe.contentWindow && iframe.contentWindow.document);
          if (doc) {
            doc.open();
            doc.write(fullHtmlDoc);
            doc.close();
          }
        } catch (e) {}
      };

      if (rawTextarea) {
        rawTextarea.addEventListener("input", () => {
          const templateId = document.getElementById("edit-template-id")?.value;
          if (this.updatePreviewIframe && templateId) {
            this.updatePreviewIframe(templateId, rawTextarea.value);
          }
        });
      }

      const switchToPreviewTab = () => {
        const templateId = document.getElementById("edit-template-id").value;
        if (rawTextarea) rawTextarea.style.display = "none";
        if (quillContainer) quillContainer.style.display = "none";
        if (previewContainer) {
          previewContainer.style.display = "block";
          const currentCode = rawTextarea ? rawTextarea.value : "";
          if (this.updatePreviewIframe) {
            this.updatePreviewIframe(templateId, currentCode);
          }
        }

        if (previewTabBtn) {
          previewTabBtn.style.background = "#1B4965";
          previewTabBtn.style.color = "#ffffff";
          previewTabBtn.style.border = "none";
        }
        if (codeTabBtn) {
          codeTabBtn.style.background = "#f1f5f9";
          codeTabBtn.style.color = "#475569";
          codeTabBtn.style.border = "1px solid #cbd5e1";
        }
      };

      const switchToCodeTab = () => {
        if (previewContainer) previewContainer.style.display = "none";
        if (quillContainer) quillContainer.style.display = "none";
        if (rawTextarea) rawTextarea.style.display = "block";

        if (codeTabBtn) {
          codeTabBtn.style.background = "#1B4965";
          codeTabBtn.style.color = "#ffffff";
          codeTabBtn.style.border = "none";
        }
        if (previewTabBtn) {
          previewTabBtn.style.background = "#f1f5f9";
          previewTabBtn.style.color = "#475569";
          previewTabBtn.style.border = "1px solid #cbd5e1";
        }
      };

      if (previewTabBtn) previewTabBtn.onclick = switchToPreviewTab;
      if (codeTabBtn) codeTabBtn.onclick = switchToCodeTab;

      const testBtn = document.getElementById("send-test-template-btn");
      if (testBtn) {
        testBtn.onclick = async () => {
          const templateId = document.getElementById("edit-template-id").value;
          const subject = document.getElementById(
            "edit-template-subject",
          ).value;
          const body =
            rawTextarea && rawTextarea.value
              ? rawTextarea.value
              : this.quill
                ? this.quill.root.innerHTML
                : "";

          if (!subject) {
            this.showToast("Emnefeltet kan ikke være tomt.", "error");
            return;
          }

          const currentUser = firebase.auth().currentUser;
          const email = await this.showPrompt(
            "Motta test-e-post",
            "Oppgi e-postadresse du vil sende test-e-post til:",
            currentUser ? currentUser.email : "",
          );
          if (!email) return;

          testBtn.disabled = true;
          const originalText = testBtn.innerHTML;
          testBtn.textContent = "Sender...";

          try {
            let testHtml = "";
            let testSubject = subject;

            if (templateId === "welcome_email") {
              const emailSubject = subject.replace("{{name}}", "Test-bruker");
              const htmlBody = body.replace("{{name}}", "Test-bruker");
              testSubject = emailSubject;
              testHtml =
                htmlBody.includes("FCF9F5") ||
                htmlBody.includes("hkm-email-container")
                  ? htmlBody
                  : `
                                <div style="font-family: sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; padding: 20px 12px;">
                                    ${htmlBody}
                                    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                                        Dette er en automatisk utsendt test-e-post fra His Kingdom Ministry.
                                    </div>
                                </div>
                            `;
            } else if (templateId === "course_registration") {
              const emailSubject = subject
                .replace(/\{\{name\}\}/g, "Test-bruker")
                .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus");
              const htmlBody = body
                .replace(/\{\{name\}\}/g, "Test-bruker")
                .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus");
              testSubject = emailSubject;
              testHtml =
                htmlBody.includes("FCF9F5") ||
                htmlBody.includes("hkm-email-container")
                  ? htmlBody
                  : `
                                <div style="font-family: sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; padding: 20px 12px;">
                                    ${htmlBody}
                                    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                                        Dette er en automatisk utsendt test-e-post fra His Kingdom Ministry.
                                    </div>
                                </div>
                            `;
            } else if (templateId === "course_registration_admin") {
              const emailSubject = subject
                .replace(/\{\{name\}\}/g, "Test-bruker")
                .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus");
              const htmlBody = body
                .replace(/\{\{name\}\}/g, "Test-bruker")
                .replace(/\{\{email\}\}/g, email)
                .replace(/\{\{phone\}\}/g, "41234567")
                .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus")
                .replace(/\{\{amount\}\}/g, "Kr 0,-")
                .replace(/\{\{paymentMethod\}\}/g, "Vipps / Gratis")
                .replace(/\{\{status\}\}/g, "Venter på godkjenning");
              testSubject = emailSubject;
              testHtml =
                htmlBody.includes("FCF9F5") ||
                htmlBody.includes("hkm-email-container")
                  ? htmlBody
                  : `
                                <div style="font-family: sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; padding: 20px 12px;">
                                    ${htmlBody}
                                    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                                        Dette er et automatisk varsel til admin om ny kurspåmelding.
                                    </div>
                                </div>
                            `;
            } else if (templateId === "course_registration_approved") {
              const emailSubject = subject
                .replace(/\{\{name\}\}/g, "Test-bruker")
                .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus");
              const htmlBody = body
                .replace(/\{\{name\}\}/g, "Test-bruker")
                .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus");
              testSubject = emailSubject;
              testHtml =
                htmlBody.includes("FCF9F5") ||
                htmlBody.includes("hkm-email-container")
                  ? htmlBody
                  : `
                                <div style="font-family: sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; padding: 20px 12px;">
                                    ${htmlBody}
                                    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                                        Dette er en automatisk bekreftelse på godkjent tilgang fra His Kingdom Ministry.
                                    </div>
                                </div>
                            `;
            } else if (templateId === "newsletter_confirmation") {
              const emailSubject = subject.replace("{{email}}", email);
              const htmlBody = body.replace("{{email}}", email);
              testSubject = emailSubject;
              testHtml =
                htmlBody.includes("FCF9F5") ||
                htmlBody.includes("hkm-email-container")
                  ? htmlBody
                  : `
                                <div style="font-family: sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; padding: 20px 12px;">
                                    ${htmlBody}
                                    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                                        Du kan melde deg av når som helst ved å svare på denne e-posten.
                                    </div>
                                </div>
                            `;
            } else if (templateId === "daily_bible_reading") {
              const planId = "P0goQTHeFCsRjwHrxI9m";
              const planTitle = "Johannesevangeliet";
              const currentDayNum = 3;
              const verses = "Johannes 3:16-21";
              const prayerFocus =
                "For så høyt har Gud elsket verden at han ga sin Sønn, den enbårne, for at hver den som tror på ham, ikke skal gå fortapt, men ha evig liv. Les ordet for dagen og finn styrke.";

              const readingContentHtml = `
                            <div style="background-color: #FCF9F5;">
                                <!-- Personal Greeting -->
                                <section style="margin-bottom: 32px; text-align: center; max-width: 440px; margin-left: auto; margin-right: auto;">
                                    <h2 style="font-family: 'Merriweather', Georgia, serif; font-size: 32px; line-height: 40px; font-weight: 700; color: #121c2c; margin: 0 0 12px 0; font-style: italic;">Hei Test-bruker</h2>
                                    <p style="font-family: 'Inter', sans-serif; font-size: 16px; line-height: 26px; font-weight: 400; color: #56423b; margin: 0; font-style: italic; opacity: 0.8;">
                                        Måtte dagens ord bringe deg stillhet, refleksjon og fornyet styrke.
                                    </p>
                                </section>

                                <!-- Reading Section Card (Original style + premium details) -->
                                <section style="margin-bottom: 32px; background-color: #ffffff; border-left: 4px solid #1B4965; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(27, 73, 101, 0.02); border-top: 1px solid rgba(27, 73, 101, 0.05); border-right: 1px solid rgba(27, 73, 101, 0.05); border-bottom: 1px solid rgba(27, 73, 101, 0.05); text-align: left;">
                                    <div style="display: inline-block; padding: 2px 6px; background-color: rgba(27, 73, 101, 0.08); color: #1B4965; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 12px;">
                                        BIBELTEKST
                                    </div>
                                    <h3 style="font-family: 'Merriweather', Georgia, serif; font-size: 22px; line-height: 30px; font-weight: 700; color: #121c2c; margin: 0 0 8px 0;">
                                        \${planTitle} - Dag \${currentDayNum}
                                    </h3>
                                    <p style="margin: 0; color: #56423b; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600;">
                                        Bibeltekst: \${verses}
                                    </p>
                                </section>

                                <!-- Devotional Section Card (Original style + premium details) -->
                                <section style="margin-bottom: 40px; background-color: #ffffff; border-left: 4px solid #d17d39; border-radius: 0 12px 12px 0; padding: 20px 24px; box-shadow: 0 2px 8px rgba(209, 125, 57, 0.02); border-top: 1px solid rgba(209, 125, 57, 0.05); border-right: 1px solid rgba(209, 125, 57, 0.05); border-bottom: 1px solid rgba(209, 125, 57, 0.05); text-align: left;">
                                    <div style="display: inline-block; padding: 2px 6px; background-color: rgba(209, 125, 57, 0.08); color: #d17d39; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; border-radius: 4px; margin-bottom: 12px;">
                                        ANDAKT &amp; BØNN
                                    </div>
                                    <h4 style="font-family: 'Merriweather', Georgia, serif; font-size: 18px; line-height: 26px; font-weight: 600; color: #121c2c; margin: 0 0 12px 0;">
                                        Dagens andakt og bønn
                                    </h4>
                                    <div style="font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.7; color: rgba(18, 28, 44, 0.9); text-align: left; white-space: pre-line;">\${prayerFocus}</div>
                                </section>

                                <!-- CTA Button (Asymmetrical, Orange Gradient) -->
                                <div style="text-align: center; margin-bottom: 48px;">
                                    <a href="https://www.hiskingdomministry.no/bibel.html?plan=\${planId}&day=\${currentDayNum}" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 14px 44px; border-radius: 24px 8px 24px 8px; font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.2em; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25);">
                                        LES PLAN
                                    </a>
                                </div>
                            </div>
                        `;

              const emailSubject = subject
                .replace("{{day}}", String(currentDayNum))
                .replace("{{title}}", planTitle);

              let emailBody = body;
              if (emailBody.includes("{{reading_content}}")) {
                emailBody = emailBody
                  .replace("{{name}}", "Test-bruker")
                  .replace("{{day}}", String(currentDayNum))
                  .replace("{{title}}", planTitle)
                  .replace("{{reading_content}}", readingContentHtml);

                testHtml = `
                                <div class="hkm-email-container" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; background-color: #FCF9F5; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #EAE4DC; text-align: left; padding: 0;">
                                    <!-- Minimal Top Accent -->
                                    <div style="height: 4px; background: linear-gradient(90deg, #1B4965 0%, #d17d39 50%, #bd4f2a 100%);"></div>

                                    <!-- Editorial Header -->
                                    <header style="padding: 32px 20px 24px 20px; box-sizing: border-box; max-width: 100%; text-align: center; background-color: #FCF9F5;">
                                        <div style="margin-bottom: 16px;">
                                            <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 48px; width: auto; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
                                        </div>
                                        <h1 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700; color: rgba(18, 28, 44, 0.6); text-transform: uppercase; letter-spacing: 0.25em; line-height: 1.5;">His Kingdom Ministry</h1>
                                        <div style="width: 32px; height: 1px; background-color: rgba(137, 114, 105, 0.4); margin: 20px auto 0 auto;"></div>
                                    </header>

                                    <!-- Body -->
                                    <div class="hkm-email-body" style="padding: 0 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: #FCF9F5; color: #121c2c;">
                                        \${emailBody}
                                    </div>

                                    <!-- Footer -->
                                    <footer style="padding: 24px 20px 32px 20px; box-sizing: border-box; max-width: 100%; background-color: rgba(252, 249, 245, 0.5); text-align: center; border-top: 1px solid rgba(221, 193, 182, 0.1);">
                                        <div style="margin-bottom: 24px;">
                                            <a href="https://www.hiskingdomministry.no/" style="color: rgba(18, 28, 44, 0.3); text-decoration: none; margin: 0 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;">Hjem</a>
                                            <a href="https://www.hiskingdomministry.no/minside" style="color: rgba(18, 28, 44, 0.3); text-decoration: none; margin: 0 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;">Min Side</a>
                                            <a href="mailto:kontakt@hiskingdomministry.no" style="color: rgba(18, 28, 44, 0.3); text-decoration: none; margin: 0 16px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;">Kontakt</a>
                                        </div>
                                        <p style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(18, 28, 44, 0.4); margin: 0 0 12px 0;">© 2026 His Kingdom Ministry</p>
                                        <a href="https://www.hiskingdomministry.no/minside" style="font-family: 'Inter', sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #1B4965; text-decoration: underline; text-underline-offset: 4px; font-weight: 600;">
                                            Endre dine varslingsinnstillinger
                                        </a>
                                    </footer>
                                </div>
                            `;
              } else {
                testHtml = emailBody
                  .replace(/\{\{name\}\}/g, "Test-bruker")
                  .replace(/\{\{day\}\}/g, String(currentDayNum))
                  .replace(/\{\{title\}\}/g, planTitle)
                  .replace(/\{\{passage\}\}/g, verses)
                  .replace(/\{\{devotional\}\}/g, prayerFocus)
                  .replace(/\{\{planId\}\}/g, planId);
              }
              testSubject = emailSubject;
            } else {
              // Fallback simple wrap with variable replacements
              const htmlBody = body
                .replace(/\{\{name\}\}/g, "Test-bruker")
                .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus")
                .replace(/\{\{email\}\}/g, email);
              testSubject = subject
                .replace(/\{\{name\}\}/g, "Test-bruker")
                .replace(/\{\{courseTitle\}\}/g, "Identitet i Kristus");
              testHtml =
                htmlBody.includes("FCF9F5") ||
                htmlBody.includes("hkm-email-container")
                  ? htmlBody
                  : `
                                <div style="font-family: sans-serif; width: 100%; max-width: 600px; box-sizing: border-box; margin: 0 auto; padding: 20px 12px;">
                                    ${htmlBody}
                                </div>
                            `;
            }

            await this.sendEmailToUser(
              email,
              `[TEST] ${testSubject}`,
              "Test e-postmal",
              testHtml,
            );
          } catch (error) {
            console.error("Feil ved sending av test-e-post:", error);
            this.showToast(
              "Kunne ikke sende test-e-post: " + error.message,
              "error",
            );
          } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = originalText;
          }
        };
      }

      saveBtn.onclick = async () => {
        const templateId = document.getElementById("edit-template-id").value;
        const subject = document.getElementById("edit-template-subject").value;
        const body =
          rawTextarea && rawTextarea.value
            ? rawTextarea.value
            : this.quill
              ? this.quill.root.innerHTML
              : "";

        if (!subject) {
          this.showToast("Emnefeltet kan ikke være tomt.", "error");
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "Lagrer...";

        try {
          await firebaseService.db
            .collection("email_templates")
            .doc(templateId)
            .set(
              {
                subject,
                body,
                updatedAt: new Date().toISOString(),
              },
              { merge: true },
            );

          this.showToast(`Malen er oppdatert.`, "success");
          closeModal();
          await this.loadEmailTemplates();
        } catch (error) {
          console.error("Feil ved lagring av mal:", error);
          this.showToast("Kunne ikke lagre malen.", "error");
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Lagre mal";
        }
      };
    },

    async openTemplateEditor(templateId, templateName, currentData) {
      const modal = document.getElementById("template-editor-modal");
      if (!modal) return;

      document.getElementById("edit-template-id").value = templateId;
      document.getElementById("template-editor-title").textContent =
        `Rediger mal: ${templateName}`;

      const subjectInput = document.getElementById("edit-template-subject");
      if (subjectInput) subjectInput.value = currentData.subject || "";

      const bodyContent = currentData.body || "";

      const rawTextarea = document.getElementById("edit-template-body-raw");
      const quillContainer = document.getElementById("quill-editor-container");
      const previewContainer = document.getElementById(
        "template-live-preview-container",
      );
      const toggleBtn = document.getElementById("toggle-editor-mode-btn");
      const warningEl = document.getElementById("template-editor-warning");
      const permissionNotice = document.getElementById(
        "template-permission-notice",
      );
      const saveBtn = document.getElementById("save-template-btn");

      // Check Editing Permissions: Only Thomas Knutsen (or explicitly granted template editors) can edit/save
      const currentUser = firebase.auth().currentUser;
      const userEmail = (
        currentUser && currentUser.email ? currentUser.email : ""
      )
        .toLowerCase()
        .trim();
      const isThomasKnutsen =
        userEmail === "knutsenthomas@gmail.com" ||
        userEmail === "thomas@hiskingdomministry.no";
      const isAuthorizedEditor =
        isThomasKnutsen ||
        (this.currentUserPermissions &&
          (this.currentUserPermissions.canEditEmailTemplates === true ||
            this.currentUserPermissions.role === "super_admin"));

      if (!isAuthorizedEditor) {
        if (subjectInput) subjectInput.readOnly = true;
        if (rawTextarea) rawTextarea.readOnly = true;
        if (saveBtn) saveBtn.style.display = "none";
        if (permissionNotice) {
          permissionNotice.innerHTML =
            "<strong>Visningsmodus:</strong> Kun Thomas Knutsen og godkjente redaktører har tilgang til å redigere og lagre e-postmaler.";
          permissionNotice.style.display = "block";
        }
      } else {
        if (subjectInput) subjectInput.readOnly = false;
        if (rawTextarea) rawTextarea.readOnly = false;
        if (saveBtn) saveBtn.style.display = "inline-block";
        if (permissionNotice) permissionNotice.style.display = "none";
      }

      // Set raw textarea value
      if (rawTextarea) {
        rawTextarea.value = bodyContent;
        rawTextarea.style.display = "none";
      }
      if (quillContainer) quillContainer.style.display = "none";

      // Show visual live preview BY DEFAULT when opening modal!
      if (previewContainer) {
        previewContainer.style.display = "block";
        if (this.updatePreviewIframe) {
          this.updatePreviewIframe(templateId, bodyContent);
        }
      }

      // Set tab styles (Preview active by default)
      const previewTabBtn = document.getElementById("toggle-preview-mode-btn");
      const codeTabBtn = document.getElementById("toggle-code-mode-btn");
      if (previewTabBtn) {
        previewTabBtn.style.background = "#1B4965";
        previewTabBtn.style.color = "#ffffff";
        previewTabBtn.style.border = "none";
      }
      if (codeTabBtn) {
        codeTabBtn.style.background = "#f1f5f9";
        codeTabBtn.style.color = "#475569";
        codeTabBtn.style.border = "1px solid #cbd5e1";
      }

      if (warningEl) {
        warningEl.textContent =
          'Du ser den visuelle forhåndsvisningen. Velg "Rediger HTML-kode" for å gjøre endringer i koden.';
        warningEl.style.display = "block";
      }

      // Render dynamic variables
      const varsContainer = document.getElementById(
        "template-variables-container",
      );
      if (varsContainer) {
        varsContainer.innerHTML = "";

        let vars = [];
        if (templateId === "welcome_email") {
          vars = [{ tag: "{{name}}", label: "Navn" }];
        } else if (templateId === "course_registration") {
          vars = [
            { tag: "{{name}}", label: "Navn" },
            { tag: "{{courseTitle}}", label: "Kurstittel" },
          ];
        } else if (templateId === "course_registration_admin") {
          vars = [
            { tag: "{{name}}", label: "Navn" },
            { tag: "{{email}}", label: "E-post" },
            { tag: "{{phone}}", label: "Telefon" },
            { tag: "{{courseTitle}}", label: "Kurstittel" },
            { tag: "{{amount}}", label: "Beløp" },
            { tag: "{{paymentMethod}}", label: "Metode" },
            { tag: "{{status}}", label: "Status" },
          ];
        } else if (templateId === "course_registration_approved") {
          vars = [
            { tag: "{{name}}", label: "Navn" },
            { tag: "{{courseTitle}}", label: "Kurstittel" },
          ];
        } else if (templateId === "newsletter_confirmation") {
          vars = [{ tag: "{{email}}", label: "E-post" }];
        } else if (templateId === "daily_bible_reading") {
          vars = [
            { tag: "{{name}}", label: "Navn" },
            { tag: "{{day}}", label: "Dag-nummer" },
            { tag: "{{title}}", label: "Leseplan tittel" },
            { tag: "{{passage}}", label: "Bibeltekst" },
            { tag: "{{devotional}}", label: "Andakt" },
            { tag: "{{reading_content}}", label: "Fullt lesekort" },
          ];
        } else {
          vars = [
            { tag: "{{name}}", label: "Navn" },
            { tag: "{{email}}", label: "E-post" },
          ];
        }

        vars.forEach((v) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn-sm insert-var-btn";
          btn.dataset.var = v.tag;
          btn.style.width = "auto";
          btn.style.display = "inline-flex";
          btn.style.padding = "6px 14px";
          btn.style.fontSize = "11px";
          btn.style.height = "auto";
          btn.style.background = "#fff";
          btn.style.border = "1px solid #cbd5e1";
          btn.style.color = "#475569";
          btn.style.borderRadius = "6px";
          btn.style.cursor = "pointer";
          btn.style.fontWeight = "600";
          btn.textContent = `+ ${v.label}`;

          btn.onclick = () => {
            const isCodeView =
              rawTextarea && rawTextarea.style.display !== "none";
            if (isCodeView) {
              const startPos = rawTextarea.selectionStart;
              const endPos = rawTextarea.selectionEnd;
              const text = rawTextarea.value;
              rawTextarea.value =
                text.substring(0, startPos) + v.tag + text.substring(endPos);
              rawTextarea.focus();
              rawTextarea.selectionStart = startPos + v.tag.length;
              rawTextarea.selectionEnd = startPos + v.tag.length;
            } else if (this.quill) {
              const range = this.quill.getSelection(true);
              this.quill.insertText(range.index, v.tag);
              this.quill.setSelection(range.index + v.tag.length);
            }
          };

          varsContainer.appendChild(btn);
        });
      }

      modal.style.display = "flex";
    },
  };
}
