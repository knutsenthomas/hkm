// collections methods for AdminManager.
export function createCollectionsMethods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async renderCommentsSection() {
      const section = document.getElementById("comments-section");
      if (!section) return;

      section.setAttribute("data-rendered", "true");

      section.innerHTML = `
            <div class="design-ui-shell">
                <div class="design-ui-workspace" style="padding: 0;">
                    <div class="design-ui-panel" style="border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                        <div class="table-container full-bleed">
                            <table class="crm-table">
                                <thead>
                                    <tr>
                                        <th>Dato</th>
                                        <th>Forfatter</th>
                                        <th>Kommentar</th>
                                        <th>Post ID</th>
                                        <th class="col-actions" style="text-align:right; padding-right:24px;">Handlinger</th>
                                    </tr>
                                </thead>
                                <tbody id="comments-list-body">
                                    <tr><td colspan="5" style="text-align:center;"><div class="loader" style="margin:20px auto;"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

      this.loadComments();
    },

    async loadComments() {
      const listBody = document.getElementById("comments-list-body");
      if (!listBody) return;

      try {
        const interactionsSnap = await firebaseService.db
          .collection("interactions")
          .get();
        let allComments = [];

        const fetchPromises = [];
        interactionsSnap.forEach((postDoc) => {
          const postId = postDoc.id;
          fetchPromises.push(
            postDoc.ref
              .collection("comments")
              .get()
              .then((snap) => {
                snap.forEach((commentDoc) => {
                  allComments.push({
                    id: commentDoc.id,
                    postId: postId,
                    data: commentDoc.data(),
                  });
                });
              }),
          );
        });

        await Promise.all(fetchPromises);

        allComments.sort((a, b) => {
          const tA = a.data.timestamp?.toDate?.() || new Date(0);
          const tB = b.data.timestamp?.toDate?.() || new Date(0);
          return tB - tA;
        });

        if (allComments.length === 0) {
          listBody.innerHTML =
            '<tr><td colspan="5" style="text-align:center; padding: 40px; color:#64748b;">Ingen kommentarer funnet.</td></tr>';
          return;
        }

        listBody.innerHTML = allComments
          .map((c) => {
            const d = c.data;
            const date = d.timestamp?.toDate?.()
              ? d.timestamp
                  .toDate()
                  .toLocaleDateString("no-NO", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
              : "Ukjent dato";
            return `
                    <tr data-comment-id="${c.id}" data-post-id="${c.postId}">
                        <td style="white-space: nowrap; font-size: 13px; color:#64748b;">${date}</td>
                        <td style="font-weight: 600;">${this.escapeHtml(d.author_name || "Anonym")}</td>
                        <td style="max-width: 400px; line-height: 1.5; padding: 12px 15px; overflow-wrap: break-word;">${this.escapeHtml(d.text || "")}</td>
                        <td style="font-size: 11px; color: #94a3b8; font-family: monospace;">${this.escapeHtml(c.postId)}</td>
                        <td class="col-actions" style="text-align:right; padding-right:20px;">
                            <button class="btn btn-icon danger delete-comment-btn" data-comment-id="${c.id}" data-post-id="${c.postId}" title="Slett kommentar" 
                                style="color: #ef4444 !important; background: #fee2e2 !important; border-radius: 8px !important; width: 34px !important; height: 34px !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; border: none !important; cursor: pointer !important; padding: 0 !important; box-shadow: none !important; outline: none !important;">
                                <span class="material-symbols-outlined" style="font-size: 20px !important; line-height: 0 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important; padding: 0 !important; width: 20px !important; height: 20px !important;">delete</span>
                            </button>
                        </td>
                    </tr>
                `;
          })
          .join("");

        listBody.querySelectorAll(".delete-comment-btn").forEach((btn) => {
          btn.onclick = async () => {
            const confirmed = await this.showConfirm(
              "Slett kommentar",
              "Er du sikker på at du vil slette denne kommentaren?",
              "Slett",
            );
            if (confirmed) {
              const cid = btn.dataset.commentId;
              const pid = btn.dataset.postId;
              try {
                await firebaseService.deleteComment(pid, cid);
                this.showToast("Kommentar slettet");
                this.loadComments();
              } catch (err) {
                console.error("Kunne ikke slette kommentar:", err);
                this.showToast("Feil ved sletting", "error");
              }
            }
          };
        });
      } catch (err) {
        console.error("Kunne ikke laste kommentarer:", err);
        listBody.innerHTML =
          '<tr><td colspan="5" style="text-align:center; color:red; padding: 20px;">Feil ved lasting av kommentarer.</td></tr>';
      }
    },

    renderItems(collectionId, items) {
      const container = document.getElementById(`${collectionId}-list`);
      if (items.length === 0) {
        container.innerHTML =
          '<p class="collection-empty-state">Ingen elementer funnet. Klikk "Legg til ny".</p>';
        return;
      }

      const isPodcastTranscriptCollection =
        collectionId === "podcast_transcripts";
      const podcastOverview = isPodcastTranscriptCollection
        ? this.getPodcastTranscriptOverview(items)
        : null;

      const rowsHtml = items
        .map((item, index) => {
          const rawTitle = item.title || "Uten tittel";
          const title = this.escapeHtml(rawTitle);
          const category = item.category ? this.escapeHtml(item.category) : "";
          const author = item.author ? this.escapeHtml(item.author) : "";
          const dateText = item.date
            ? this.escapeHtml(String(item.date).split("T")[0])
            : "—";
          const podcastAudit = isPodcastTranscriptCollection
            ? this.getPodcastTranscriptAudit(item)
            : null;
          const statusPill = isPodcastTranscriptCollection
            ? `
                    <div style="display:flex; gap:8px; flex-wrap:nowrap; align-items:center;">
                        <span class="cms-pill ${podcastAudit.hasTranscript ? "cms-pill--success" : "cms-pill--danger"}">${podcastAudit.hasTranscript ? "TEKST OK" : "MANGLER TEKST"}</span>
                        <span class="cms-pill ${podcastAudit.hasSummary ? "cms-pill--info" : "cms-pill--warning"}">${podcastAudit.hasSummary ? "OPPSUMMERING OK" : "MANGLER OPPSUMMERING"}</span>
                    </div>
                `
            : (() => {
                if (collectionId === "blog" || collectionId === "teaching") {
                  const translationStats = this._getBlogTranslationStatus(item);
                  const hasTranscript = !!(item.text || item.content);
                  const hasSummary = !!(item.summary || item.description);
                  const publishedPill =
                    item.published === false
                      ? '<span class="cms-pill cms-pill--warning">UTKAST</span>'
                      : '<span class="cms-pill cms-pill--success">PUBLISERT</span>';

                  let extraBadges = "";
                  if (collectionId === "teaching") {
                    if (hasTranscript) {
                      extraBadges += `<span class="cms-pill cms-pill--green-outline">TEKST</span>`;
                    }
                    if (hasSummary) {
                      extraBadges += `<span class="cms-pill cms-pill--info">AI</span>`;
                    }
                  }

                  let translationPill = "";
                  if (translationStats.level === "ok") {
                    translationPill = `<span class="cms-pill cms-pill--info">OVERSATT (${translationStats.upToDate}/${translationStats.total})</span>`;
                  } else if (translationStats.level === "partial") {
                    translationPill = `<span class="cms-pill cms-pill--amber">DELVIS OVERSATT (${translationStats.upToDate}/${translationStats.total})</span>`;
                  } else if (translationStats.level === "stale") {
                    translationPill = `<span class="cms-pill cms-pill--warning">UTDATERT (${translationStats.upToDate}/${translationStats.total})</span>`;
                  } else {
                    translationPill =
                      '<span class="cms-pill cms-pill--muted">IKKE OVERSATT</span>';
                  }
                  return `<div style="display:flex;gap:6px;flex-wrap:nowrap;align-items:center;">${publishedPill}${extraBadges}${translationPill}</div>`;
                }
                return item.isSynced
                  ? '<span class="cms-pill cms-pill--muted">SYNKRONISERT</span>'
                  : "";
              })();
          const imageCell = item.imageUrl
            ? `<img src="${this.escapeHtml(item.imageUrl)}" alt="" style="width:48px;height:48px;border-radius:12px;object-fit:cover;border:1px solid #f1f5f9;">`
            : '<div style="width:48px;height:48px;border-radius:12px;background:#f8fafc;color:#94a3b8;display:flex;align-items:center;justify-content:center;border:1px solid #f1f5f9;"><span class="material-symbols-outlined" style="font-size:24px;">image</span></div>';
          const subline = isPodcastTranscriptCollection
            ? podcastAudit.isComplete
              ? "Klar for publisering"
              : !podcastAudit.hasTranscript
                ? "Mangler transkripsjonstekst"
                : "Mangler oppsummering"
            : category ||
              (collectionId === "teaching"
                ? "Undervisning"
                : collectionId === "blog"
                  ? "Blogg"
                  : "Innhold");

          return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: all 0.2s;">
                    <td style="padding: 24px; min-width: 280px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            ${imageCell}
                            <div>
                                <div style="font-weight: 700; font-size: 15px; color: #1e293b; margin-bottom: 2px;">${title}</div>
                                <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">${this.escapeHtml(subline)}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding: 24px; color: #64748b; font-size: 13px; font-weight: 600; white-space: nowrap; min-width: 120px;">${dateText}</td>
                    <td style="padding: 24px; color: #64748b; font-size: 13px; font-weight: 600; white-space: nowrap;">${author || '<span style="color: #cbd5e1;">—</span>'}</td>
                    <td style="padding: 24px; white-space: nowrap;">${statusPill}</td>
                    <td style="padding: 24px; text-align: right; white-space: nowrap;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px; white-space: nowrap;">
                            <button type="button" onclick="window.adminManager.editCollectionItem('${collectionId}', ${index})" 
                                style="background: white; border: 1px solid #e2e8f0; color: #1e293b; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); white-space: nowrap; flex-shrink: 0;">
                                Rediger
                            </button>
                            <button type="button" class="icon-btn delete" onclick="window.adminManager.deleteItem('${collectionId}', ${index})" 
                                style="background: transparent !important; border: none !important; color: #cbd5e1 !important; cursor: pointer !important; padding: 0 !important; transition: color 0.2s !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; flex-shrink: 0 !important; box-shadow: none !important; outline: none !important; width: 34px !important; height: 34px !important;" 
                                onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#cbd5e1'">
                                <span class="material-symbols-outlined" style="font-size: 20px !important; line-height: 0 !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important; padding: 0 !important; width: 20px !important; height: 20px !important;">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");

      const overviewHtml =
        isPodcastTranscriptCollection && podcastOverview
          ? `
                <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px;">
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 16px; min-width:140px;">
                        <div style="font-size:11px; font-weight:800; letter-spacing:0.08em; color:#94a3b8; text-transform:uppercase;">Totalt</div>
                        <div style="font-size:24px; font-weight:800; color:#0f172a;">${podcastOverview.total}</div>
                    </div>
                    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:12px 16px; min-width:140px;">
                        <div style="font-size:11px; font-weight:800; letter-spacing:0.08em; color:#b91c1c; text-transform:uppercase;">Mangler tekst</div>
                        <div style="font-size:24px; font-weight:800; color:#991b1b;">${podcastOverview.missingTranscript}</div>
                    </div>
                    <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:12px; padding:12px 16px; min-width:160px;">
                        <div style="font-size:11px; font-weight:800; letter-spacing:0.08em; color:#c2410c; text-transform:uppercase;">Mangler oppsummering</div>
                        <div style="font-size:24px; font-weight:800; color:#9a3412;">${podcastOverview.missingSummary}</div>
                    </div>
                    <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:12px 16px; min-width:140px;">
                        <div style="font-size:11px; font-weight:800; letter-spacing:0.08em; color:#047857; text-transform:uppercase;">Komplette</div>
                        <div style="font-size:24px; font-weight:800; color:#065f46;">${podcastOverview.complete}</div>
                    </div>
                </div>
            `
          : "";

      container.innerHTML = `
            ${overviewHtml}
            <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <table style="width: 100%; min-width: 800px; border-collapse: collapse; text-align: left; table-layout: auto;">
                    <thead style="background: var(--admin-surface-muted, #fafbfc); border-bottom: 1px solid var(--admin-border, #f1f5f9);">
                        <tr>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; min-width: 280px;">Innhold</th>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; min-width: 120px; white-space: nowrap;">Dato</th>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; white-space: nowrap;">Forfatter</th>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; white-space: nowrap;">Status</th>
                            <th style="padding: 20px 24px; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; text-align: right; white-space: nowrap;">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },

    async addNewItem(collectionId) {
      const btn = document.getElementById(`add-new-${collectionId}`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML =
          '<span class="material-symbols-outlined">hourglass_empty</span> Forbereder...';
      }

      try {
        // First, ensure we have the latest data locally
        await this.loadCollection(collectionId);

        // Create new item with empty title and a unique ID
        const newItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: "",
          date: new Date().toISOString().split("T")[0],
          content: "",
        };

        // Add to the beginning of the local list only (don't save to Firebase yet)
        if (!this._collectionItemsCache[collectionId])
          this._collectionItemsCache[collectionId] = [];
        this._collectionItemsCache[collectionId].unshift(newItem);
        this.currentItems = this._collectionItemsCache[collectionId];

        // Immediately open the editor for this new item (index 0)
        // It will save for the first time when the user clicks "Lagre"
        this.editCollectionItem(collectionId, 0);
      } catch (error) {
        console.error("Error preparing new item:", error);
        this.showToast("Kunne ikke forberede nytt element.", "error", 5000);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML =
            '<span class="material-symbols-outlined">add</span> Legg til ny';
        }
      }
    },

    async deleteItem(collectionId, index) {
      // Permission Check
      if (!this.hasPermission("MANAGE_CONTENT")) {
        this.showToast(
          "Du har ikke tilgang til å slette elementer.",
          "error",
          5000,
        );
        return;
      }

      const collectionItems =
        this._collectionItemsCache[collectionId] || this.currentItems || [];
      const itemToDelete = collectionItems[index] || null;
      const btn = document.querySelector(
        `#${collectionId}-list tbody tr:nth-child(${index + 1}) .icon-btn.delete`,
      );

      if (!itemToDelete) {
        this.showToast("Kunne ikke finne elementet som skal slettes.", "error");
        return;
      }

      const confirmed = await this.showConfirm(
        "Bekreft sletting",
        `Er du sikker på at du vil slette "${itemToDelete.title || "dette elementet"}"? Dette kan ikke angres.`,
        "Slett",
      );

      if (!confirmed) return;

      await this._runWriteLocked(
        `collection-delete:${collectionId}`,
        async () => {
          await this._withButtonLoading(
            btn,
            async () => {
              try {
                if (collectionId === "podcast_transcripts") {
                  // For podcast transcripts, delete directly from Firestore collection
                  if (itemToDelete.id) {
                    await firebase
                      .firestore()
                      .collection("podcast_transcripts")
                      .doc(itemToDelete.id)
                      .delete();
                  }
                } else {
                  const currentData = await firebaseService.getPageContent(
                    `collection_${collectionId}`,
                  );
                  const list = Array.isArray(currentData)
                    ? currentData
                    : currentData && currentData.items
                      ? currentData.items
                      : [];

                  // Find match in Firestore
                  const matchIdx = list.findIndex((fi) => {
                    if (itemToDelete.id && fi.id === itemToDelete.id)
                      return true;
                    return (
                      (itemToDelete.gcalId &&
                        fi.gcalId === itemToDelete.gcalId) ||
                      (fi.title === itemToDelete.title &&
                        fi.date?.split("T")[0] ===
                          itemToDelete.date?.split("T")[0])
                    );
                  });

                  if (matchIdx >= 0) {
                    list.splice(matchIdx, 1);
                    await firebaseService.savePageContent(
                      `collection_${collectionId}`,
                      { items: list },
                    );

                    // Force clear public cache
                    if (collectionId === "events") {
                      this.clearPublicEventCache();

                      // If connected to Google, delete from there too
                      if (this.googleAccessToken && itemToDelete.gcalId) {
                        await this.updateGoogleCalendarEvent(
                          itemToDelete,
                          "DELETE",
                        );
                      }
                    }
                  } else {
                    // If it's not in Firestore, we can't delete it (it's a pure GCal item)
                    this.showToast(
                      "Dette elementet kan ikke slettes da det hentes direkte fra Google Calendar.",
                      "error",
                    );
                    return;
                  }
                }

                await this.loadCollection(collectionId);
                this.showToast("Element slettet!", "success");
              } catch (err) {
                console.error("Delete failed:", err);
                this.showToast("Kunne ikke slette elementet.", "error", 5000);
              }
            },
            {
              loadingText:
                '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span>',
            },
          );
        },
      );
    },
  };
}
