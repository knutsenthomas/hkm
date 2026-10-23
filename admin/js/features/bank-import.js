// bank import methods for AdminManager.
export function createBankImportMethods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    openBankImportModal() {
      const modal = document.getElementById("bank-import-modal");
      if (!modal) return;
      const fileInput = document.getElementById("bank-import-file");
      const preview = document.getElementById("bank-import-preview");
      const summary = document.getElementById("bank-import-summary");
      const saveBtn = document.getElementById("save-bank-import-btn");
      if (fileInput) fileInput.value = "";
      if (preview)
        preview.innerHTML =
          '<div style="padding:24px;text-align:center;color:#64748b;">Velg en CSV- eller CAMT/XML-fil fra nettbanken.</div>';
      if (summary) summary.textContent = "";
      if (saveBtn) saveBtn.disabled = true;
      this.pendingBankImportRows = [];
      this.resetBankImportDropzone();
      if (!modal.open) modal.showModal();
    },

    closeBankImportModal() {
      const modal = document.getElementById("bank-import-modal");
      if (modal?.open) modal.close();
    },

    resetBankImportDropzone() {
      const dropzone = document.getElementById("bank-import-dropzone");
      if (!dropzone) return;
      dropzone.innerHTML = `
            <span class="material-symbols-outlined" style="font-size:48px; color:#1B4965;">cloud_upload</span>
            <div>
                <span style="font-weight:700; color:#1B4965; font-size:1rem;">Dra og slipp bankfilen her</span>
                <span style="color:#64748b; font-size:0.875rem; display:block; margin-top:4px;">eller klikk for å velge fra filutforsker</span>
            </div>
            <span style="font-size:0.75rem; color:#94a3b8; line-height:1.5; margin-top:4px;">
                Støtter vanlige CSV-filer (inkludert Vipps) og ISO 20022 CAMT XML.
            </span>
        `;
      dropzone.style.borderColor = "#cbd5e1";
      dropzone.style.background = "#f8fafc";
    },

    updateBankImportDropzone(fileName) {
      const dropzone = document.getElementById("bank-import-dropzone");
      if (!dropzone) return;
      dropzone.innerHTML = `
            <span class="material-symbols-outlined" style="font-size:48px; color:#10b981;">check_circle</span>
            <div>
                <span style="font-weight:700; color:#0f172a; font-size:1rem;">Fil valgt: ${this.escapeHtml(fileName)}</span>
                <span style="color:#d17d39; font-size:0.875rem; display:block; margin-top:4px; font-weight:600;">Klikk eller dra en ny fil hit for å erstatte</span>
            </div>
            <span style="font-size:0.75rem; color:#64748b; line-height:1.5; margin-top:4px;">
                Klar til import! Se forhåndsvisning under.
            </span>
        `;
      dropzone.style.borderColor = "#10b981";
      dropzone.style.background = "#f0fdf4";
    },

    showBankImportDropzoneError(errorMessage) {
      const dropzone = document.getElementById("bank-import-dropzone");
      if (!dropzone) return;
      dropzone.innerHTML = `
            <span class="material-symbols-outlined" style="font-size:48px; color:#ef4444;">error</span>
            <div>
                <span style="font-weight:700; color:#ef4444; font-size:1rem;">Feil ved lesing av fil</span>
                <span style="color:#d17d39; font-size:0.875rem; display:block; margin-top:4px; font-weight:600;">Klikk eller dra en ny fil hit for å prøve igjen</span>
            </div>
            <span style="font-size:0.75rem; color:#64748b; line-height:1.5; margin-top:4px;">
                ${this.escapeHtml(errorMessage)}
            </span>
        `;
      dropzone.style.borderColor = "#ef4444";
      dropzone.style.background = "#fef2f2";
    },

    async handleBankImportFile(file) {
      if (!file) return;
      this.updateBankImportDropzone(file.name);
      const preview = document.getElementById("bank-import-preview");
      const summary = document.getElementById("bank-import-summary");
      const saveBtn = document.getElementById("save-bank-import-btn");
      if (preview)
        preview.innerHTML =
          '<div class="loading-state"><div class="spinner"></div><p>Leser fil...</p></div>';
      if (saveBtn) saveBtn.disabled = true;

      try {
        const text = await this.readTextFile(file);
        const rows = this.parseBankImportText(text, file.name || "");
        this.pendingBankImportRows = rows.map((row, index) => {
          const match = this.matchBankImportUser(row);
          const isDuplicate = this.isLikelyDuplicateBankDonation(row);
          const type = this.determineBankDonationType(row);
          return {
            ...row,
            importId: `bank-import-${Date.now()}-${index}`,
            selected: row.amountNok > 0 && !isDuplicate,
            isDuplicate,
            userId: match?.user?.id || "",
            type,
            matchLabel: isDuplicate
              ? "Mulig duplikat - ikke valgt"
              : match?.label || "Ingen sikker match",
          };
        });

        if (summary) {
          const matched = this.pendingBankImportRows.filter(
            (row) => row.userId,
          ).length;
          summary.textContent = `${this.pendingBankImportRows.length} innbetalinger funnet. ${matched} foreslått koblet til profil.`;
        }
        this.renderBankImportPreview();
        if (saveBtn) saveBtn.disabled = this.pendingBankImportRows.length === 0;
      } catch (error) {
        console.error("Bank import parse failed:", error);
        this.pendingBankImportRows = [];
        this.showBankImportDropzoneError(error.message || "Ukjent feil");
        if (preview)
          preview.innerHTML = `<div style="padding:24px;text-align:center;color:#991b1b;">Kunne ikke lese filen: ${this.escapeHtml(error.message || "Ukjent feil")}</div>`;
        if (summary) summary.textContent = "";
      }
    },

    readTextFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const text = String(reader.result || "");
          if (text.includes("\uFFFD")) {
            const reader2 = new FileReader();
            reader2.onload = () => resolve(String(reader2.result || ""));
            reader2.onerror = () =>
              reject(new Error("Kunne ikke lese filen med ISO-8859-1."));
            reader2.readAsText(file, "ISO-8859-1");
          } else {
            resolve(text);
          }
        };
        reader.onerror = () => reject(new Error("Kunne ikke lese filen."));
        reader.readAsText(file, "utf-8");
      });
    },

    parseBankImportText(text, filename = "") {
      const trimmed = String(text || "").trim();
      if (!trimmed) throw new Error("Filen er tom.");
      const looksXml =
        filename.toLowerCase().endsWith(".xml") || trimmed.startsWith("<");
      const rows = looksXml
        ? this.parseCamtBankImport(trimmed)
        : this.parseCsvBankImport(trimmed);
      const incoming = rows
        .map((row) => ({
          ...row,
          amountNok: this.parseBankAmount(row.amountNok ?? row.amount),
          date:
            row.date instanceof Date ? row.date : this.parseBankDate(row.date),
          text: String(row.text || row.description || row.message || "").trim(),
          reference: String(
            row.reference || row.kid || row.transactionId || "",
          ).trim(),
          donorName: String(
            row.donorName || row.name || row.payer || "",
          ).trim(),
          donorEmail: String(row.donorEmail || row.email || "")
            .trim()
            .toLowerCase(),
          category: String(row.category || "").trim(),
        }))
        .filter((row) => row.amountNok > 0)
        .filter((row) => row.date && !Number.isNaN(row.date.getTime()));

      if (!incoming.length)
        throw new Error("Fant ingen positive innbetalinger i filen.");
      return incoming;
    },

    parseCsvBankImport(text) {
      const lines = String(text || "")
        .split(/\r?\n/)
        .filter((line) => line.trim());
      if (lines.length < 2) throw new Error("CSV-filen mangler rader.");
      const delimiter = this.detectCsvDelimiter(lines[0]);
      const rows = lines.map((line) => this.parseCsvLine(line, delimiter));
      const headers = rows[0].map((header) => this.normalizeBankHeader(header));

      return rows.slice(1).map((values) => {
        const raw = {};
        headers.forEach((header, index) => {
          raw[header] = values[index] || "";
        });

        const amount =
          raw.amount ||
          raw.belop ||
          raw.belopinn ||
          raw.belpinn ||
          raw.belp ||
          raw.innbetalt ||
          raw.inn ||
          raw.credit ||
          raw.kredit ||
          raw.sum ||
          raw.valuta ||
          raw.innskudd ||
          raw.innbetaling;
        const outAmount =
          raw.ut ||
          raw.debet ||
          raw.debit ||
          raw.withdrawal ||
          raw.beloput ||
          raw.belput ||
          raw.utbetaling ||
          raw.uttak;
        const resolvedAmount = amount || (outAmount ? `-${outAmount}` : "");

        return {
          date:
            raw.dato ||
            raw.date ||
            raw.bokfortdato ||
            raw.bokfrtdato ||
            raw.utfortdato ||
            raw.utfrtdato ||
            raw.valutadato ||
            raw.posteringsdato ||
            raw.tidspunkt ||
            raw.bokforingsdato ||
            raw.rentedato,
          amountNok: resolvedAmount,
          donorName:
            raw.navn ||
            raw.name ||
            raw.avsender ||
            raw.fra ||
            raw.betaler ||
            raw.payer ||
            raw.kundensnavn ||
            raw.kundenavn,
          donorEmail: raw.epost || raw.email,
          text:
            raw.tekst ||
            raw.beskrivelse ||
            raw.description ||
            raw.melding ||
            raw.message ||
            raw.info ||
            raw.detaljer ||
            raw.meldingkidfaktnr,
          reference:
            raw.kid ||
            raw.referanse ||
            raw.reference ||
            raw.bilag ||
            raw.transactionid ||
            raw.transaksjonsid ||
            raw.ordreidreferanse ||
            raw.pspreferanse ||
            raw.meldingkidfaktnr ||
            raw.arkivref ||
            raw.numref,
          category: raw.kategori || "",
        };
      });
    },

    detectCsvDelimiter(headerLine) {
      const candidates = [";", ",", "\t"];
      return candidates
        .map((delimiter) => ({
          delimiter,
          count: String(headerLine).split(delimiter).length,
        }))
        .sort((a, b) => b.count - a.count)[0].delimiter;
    },

    parseCsvLine(line, delimiter) {
      const result = [];
      let current = "";
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          quoted = !quoted;
        } else if (char === delimiter && !quoted) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    },

    normalizeBankHeader(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[æ]/g, "ae")
        .replace(/[ø]/g, "o")
        .replace(/[å]/g, "a")
        .replace(/[^a-z0-9]+/g, "");
    },

    parseCamtBankImport(xmlText) {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      if (doc.getElementsByTagName("parsererror").length)
        throw new Error("XML-filen kunne ikke tolkes.");
      const entries = Array.from(doc.getElementsByTagName("*")).filter(
        (node) => node.localName === "Ntry",
      );
      return entries.map((entry) => {
        const getText = (root, localName) => {
          const found = Array.from(root.getElementsByTagName("*")).find(
            (node) => node.localName === localName,
          );
          return found ? String(found.textContent || "").trim() : "";
        };
        const amountNode = Array.from(entry.getElementsByTagName("*")).find(
          (node) => node.localName === "Amt",
        );
        const creditDebit = getText(entry, "CdtDbtInd");
        const rawAmount = amountNode ? amountNode.textContent : "";
        const signedAmount =
          creditDebit === "DBIT" ? `-${rawAmount}` : rawAmount;
        const remittance =
          getText(entry, "Ustrd") || getText(entry, "AddtlNtryInf");
        const reference =
          getText(entry, "EndToEndId") ||
          getText(entry, "AcctSvcrRef") ||
          getText(entry, "NtryRef");
        const debtorNameNode = Array.from(entry.getElementsByTagName("*")).find(
          (node) => node.localName === "Dbtr",
        );
        const donorName = debtorNameNode ? getText(debtorNameNode, "Nm") : "";

        return {
          date: getText(entry, "Dt"),
          amountNok: signedAmount,
          donorName,
          text: remittance,
          reference,
        };
      });
    },

    parseBankAmount(value) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      let raw = String(value || "").trim();
      if (!raw) return 0;
      const isNegative = raw.includes("-") || raw.includes("−");

      raw = raw.replace(/\s/g, "").replace(/[^\d,.-]/g, "");

      if (raw.includes(".") && raw.includes(",")) {
        const dotIndex = raw.indexOf(".");
        const commaIndex = raw.indexOf(",");
        if (dotIndex < commaIndex) {
          raw = raw.replace(/\./g, "").replace(",", ".");
        } else {
          raw = raw.replace(/,/g, "");
        }
      } else if (raw.includes(",")) {
        raw = raw.replace(",", ".");
      } else if (raw.includes(".")) {
        const parts = raw.split(".");
        if (parts.length === 2 && parts[1].length === 3) {
          const beforeDot = parts[0];
          if (beforeDot.length <= 3) {
            raw = raw.replace(/\./g, "");
          }
        } else if (parts.length > 2) {
          raw = raw.replace(/\./g, "");
        }
      }

      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return 0;
      return isNegative && parsed > 0 ? -parsed : parsed;
    },

    parseBankDate(value) {
      const raw = String(value || "").trim();
      if (!raw) return null;
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(raw);
      const dotMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
      if (dotMatch) {
        const day = dotMatch[1].padStart(2, "0");
        const month = dotMatch[2].padStart(2, "0");
        const year =
          dotMatch[3].length === 2 ? `20${dotMatch[3]}` : dotMatch[3];
        return new Date(`${year}-${month}-${day}T12:00:00`);
      }
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    },

    renderBankImportPreview() {
      const preview = document.getElementById("bank-import-preview");
      if (!preview) return;
      const rows = this.pendingBankImportRows || [];
      if (!rows.length) {
        preview.innerHTML =
          '<div style="padding:24px;text-align:center;color:#64748b;">Ingen innbetalinger klare for import.</div>';
        return;
      }

      const userOptions = Array.from(this.adminUserMap?.values?.() || [])
        .slice()
        .sort((a, b) =>
          String(a.displayName || a.email || "").localeCompare(
            String(b.displayName || b.email || ""),
            "no",
          ),
        )
        .map((user) => {
          const label =
            user.displayName || user.fullName || user.email || user.id;
          const email = user.email ? ` (${user.email})` : "";
          return `<option value="${this.escapeHtml(user.id)}">${this.escapeHtml(label + email)}</option>`;
        })
        .join("");

      preview.innerHTML = `
            <div style="overflow:auto;max-height:420px;border:1px solid #e2e8f0;border-radius:14px;">
                <table class="data-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>Importer</th>
                            <th>Dato</th>
                            <th>Giver/tekst</th>
                            <th>Kobling</th>
                            <th class="text-right">Beløp</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows
                          .map(
                            (row, index) => `
                            <tr>
                                <td><input type="checkbox" class="bank-import-select" data-index="${index}" ${row.selected ? "checked" : ""}></td>
                                <td>${row.date ? row.date.toLocaleDateString("no-NO") : "Ukjent"}</td>
                                <td>
                                    <div style="display:inline-flex; align-items:center; gap:8px;">
                                        <strong>${this.escapeHtml(row.donorName || "Ukjent giver")}</strong>
                                        ${
                                          row.type === "Butikk"
                                            ? `<span style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; line-height:1.2;">Butikk</span>`
                                            : `<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; line-height:1.2;">Gave</span>`
                                        }
                                    </div>
                                    <div style="font-size:12px;color:#64748b;max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(row.text || row.reference || "")}</div>
                                    ${row.reference ? `<div style="font-size:12px;color:#94a3b8;">Ref: ${this.escapeHtml(row.reference)}</div>` : ""}
                                </td>
                                <td>
                                    <select class="form-control bank-import-user" data-index="${index}" style="min-width:220px;">
                                        <option value="">Ukoblet</option>
                                        ${userOptions}
                                    </select>
                                    <div style="font-size:11px;color:${row.userId ? "#166534" : "#92400e"};margin-top:4px;">${this.escapeHtml(row.matchLabel || "")}</div>
                                </td>
                                <td class="text-right"><strong>${this.formatDonationCurrency(row.amountNok)}</strong></td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

      preview.querySelectorAll(".bank-import-user").forEach((select) => {
        const index = Number(select.dataset.index);
        select.value = rows[index]?.userId || "";
        select.addEventListener("change", (event) => {
          const row = this.pendingBankImportRows[index];
          if (!row) return;
          row.userId = event.target.value;
          row.matchLabel = row.userId ? "Valgt manuelt" : "Ukoblet";
        });
      });
      preview.querySelectorAll(".bank-import-select").forEach((input) => {
        input.addEventListener("change", (event) => {
          const row =
            this.pendingBankImportRows[Number(event.target.dataset.index)];
          if (row) row.selected = event.target.checked;
        });
      });
    },

    async saveBankImportRows() {
      const rows = (this.pendingBankImportRows || []).filter(
        (row) => row.selected,
      );
      if (!rows.length) {
        this.showToast("Velg minst én rad å importere.", "warning", 3500);
        return;
      }

      const saveBtn = document.getElementById("save-bank-import-btn");
      await this._runWriteLocked("bank-import:create", async () =>
        this._withButtonLoading(
          saveBtn,
          async () => {
            const batch = firebase.firestore().batch();
            const currentAdmin = firebase.auth().currentUser;
            const importedRecords = [];

            rows.forEach((row) => {
              const docRef = firebaseService.db.collection("donations").doc();
              const docId = docRef.id;
              const user = row.userId
                ? this.adminUserMap?.get(row.userId)
                : null;
              const timestamp = firebase.firestore.Timestamp.fromDate(
                row.date || new Date(),
              );
              const amountOre = Math.round(row.amountNok * 100);
              const payload = {
                transactionId: docId,
                manualDonationId: docId,
                bankImportId: docId,
                amount: row.amountNok,
                amountNok: row.amountNok,
                amountOre,
                currency: "NOK",
                method: "bank",
                status: "completed",
                timestamp,
                completedAt: timestamp,
                userId: row.userId || null,
                donorName:
                  (user
                    ? user.displayName || user.fullName || user.email
                    : null) ||
                  (row.donorName && row.donorName.trim()
                    ? row.donorName.trim()
                    : null) ||
                  "Ukjent",
                donorEmail: row.donorEmail || user?.email || "Ukjent",
                message: row.text || "",
                reference: row.reference || "",
                type: row.type || "Gave",
                source: "bank_import",
                matchMethod: row.userId
                  ? row.matchLabel || "bank_import_match"
                  : "bank_import_unmatched",
                registeredBy: currentAdmin?.uid || null,
                registeredByEmail: currentAdmin?.email || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              };
              batch.set(docRef, payload);
              importedRecords.push({
                id: docId,
                ...payload,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });

            await batch.commit();
            this.allDonationRecords = [
              ...importedRecords,
              ...(this.allDonationRecords || []),
            ].sort((a, b) => {
              const aDate = this.getDonationDate(a)?.getTime?.() || 0;
              const bDate = this.getDonationDate(b)?.getTime?.() || 0;
              return bDate - aDate;
            });
            this.closeBankImportModal();
            this.renderDonationAdminViews();
            this.showToast(
              `Importerte ${importedRecords.length} bankgaver.`,
              "success",
              5000,
            );
          },
          {
            loadingText: "Importerer...",
          },
        ),
      );
    },
  };
}
