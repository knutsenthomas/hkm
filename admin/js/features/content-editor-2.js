// content editor methods for AdminManager.
export function createMethods10({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async editCollectionItem(collectionId, index) {
      this.isEditorOpen = true;
      let triggerAutosave = null;
      let updateLivePreview = null;
      try {
        // Hard cleanup: ensure only one editor modal exists.
        document
          .querySelectorAll(".dashboard-modal")
          .forEach((existingModal) => {
            if (existingModal.querySelector(".editor-layout-v2")) {
              existingModal.remove();
            }
          });

        // Destroy any previous EditorJS instance before opening a new one.
        // Fire-and-forget so we never block or hang on a detached DOM element.
        if (this._activeEditorInstance) {
          const stale = this._activeEditorInstance;
          this._activeEditorInstance = null;
          setTimeout(() => {
            try {
              stale.destroy();
            } catch (e) {}
          }, 0);
        }

        // Unique holder ID per open — prevents EditorJS internal registry collisions
        const editorHolderId = `editorjs-holder-${Date.now()}`;
        const collectionItems =
          this._collectionItemsCache[collectionId] || this.currentItems || [];
        const item = collectionItems[index]
          ? { ...collectionItems[index] }
          : {};
        this._persistOpenEditorState(collectionId, item);
        this.currentMediaPath = `editor/${collectionId}/`;

        let safeDate = new Date().toISOString().split("T")[0];
        let safeTime = "";
        if (item.date) {
          if (typeof item.date === "string") {
            safeDate = item.date.split("T")[0];
            const parts = item.date.split("T")[1] || item.date.split(" ")[1];
            if (parts) {
              safeTime = parts.substring(0, 5); // HH:mm
            }
          } else if (typeof item.date === "object") {
            let dateObj = null;
            if (typeof item.date.toDate === "function") {
              dateObj = item.date.toDate();
            } else if (typeof item.date.seconds === "number") {
              dateObj = new Date(item.date.seconds * 1000);
            } else if (item.date instanceof Date) {
              dateObj = item.date;
            }
            if (dateObj && !isNaN(dateObj.getTime())) {
              safeDate = dateObj.toISOString().split("T")[0];
              const hours = String(dateObj.getHours()).padStart(2, "0");
              const minutes = String(dateObj.getMinutes()).padStart(2, "0");
              safeTime = `${hours}:${minutes}`;
            }
          }
        }

        // Handle existing tags (ensure array)
        const existingTags = Array.isArray(item.tags) ? item.tags : [];
        const isTeachingCollection = collectionId === "teaching";
        const selectedTeachingType = (
          item.teachingType ||
          item.category ||
          "Bibelstudie"
        ).toLowerCase();
        const seriesSelection = Array.isArray(item.seriesItems)
          ? item.seriesItems
          : [];
        const rawDescription = item.summary || item.description || "";
        // Strip HTML tags from description for clean display in textarea
        const podcastSummary = rawDescription.replace(/<[^>]*>/g, "").trim();

        const existingKeyVerses = Array.isArray(item.keyVerses)
          ? item.keyVerses
          : [];
        const formattedKeyVerses = existingKeyVerses
          .map((kv) => {
            if (kv && kv.reference && kv.text) {
              return `${kv.reference} | ${kv.text}`;
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");

        const existingQuestions = Array.isArray(item.discussionQuestions)
          ? item.discussionQuestions
          : [];
        const formattedQuestions = existingQuestions.join("\n");
        const teachingCandidates = (collectionItems || [])
          .filter((opt, optIndex) => optIndex !== index)
          .filter((opt) => opt.id || opt.title)
          .map((opt) => {
            const optId = opt.id || opt.title;
            const selected = seriesSelection.includes(optId) ? "selected" : "";
            return `<option value="${optId}" ${selected}>${opt.title || "Uten tittel"}</option>`;
          })
          .join("");

        const modal = document.createElement("div");
        modal.className = "dashboard-modal";
        modal.innerHTML = `
                <div class="editor-layout-v2">
                    <header class="editor-header-v2">
                        <div class="editor-header-left">
                             <button class="btn-ghost" id="close-col-modal"><span class="material-symbols-outlined">arrow_back</span><span>Tilbake</span></button>
                             <span class="editor-header-divider" style="color: #94a3b8; margin: 0 8px; flex-shrink: 0;">|</span>
                             <span class="editor-header-type" style="font-weight: 600; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; flex-shrink: 0;">
                                ${collectionId === "blog" ? "Blogginnlegg" : collectionId === "events" ? "Arrangement" : collectionId === "teaching" ? "Undervisning" : collectionId === "podcast_transcripts" ? "Podcast Transkripsjon" : "Rediger innhold"}
                             </span>
                             ${
                               collectionId === "blog" ||
                               collectionId === "teaching"
                                 ? `
                             <!-- Premium Autolagring statusindikator -->
                             <div id="editor-autosave-status" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #64748b; margin-left: 8px; transition: opacity 0.3s ease; opacity: 0.8; white-space: nowrap; flex-shrink: 0;">
                                 <span class="material-symbols-outlined" style="font-size: 18px; color: #10b981; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; line-height: 1; vertical-align: middle;">cloud_done</span>
                                 <span id="editor-autosave-text" style="display: inline-flex; align-items: center; line-height: 1;">Lagret i skyen</span>
                             </div>
                             `
                                 : ""
                             }
                             ${
                               collectionId === "blog" ||
                               collectionId === "teaching" ||
                               collectionId === "podcast_transcripts"
                                 ? `
                             <span id="blog-translation-status" title="Status for oversettelser" style="display:none; white-space: nowrap; flex-shrink: 0; margin-left: 8px;"></span>
                             `
                                 : ""
                             }
                        </div>
                        
                        <div class="editor-header-center">
                            <span class="editor-header-title" style="font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;" title="${item.title || "Uten tittel"}">
                                ${item.title || "Uten tittel"}
                            </span>
                        </div>
                        
                        <div class="editor-header-right">
                                      ${
                                        collectionId === "blog" ||
                                        collectionId === "teaching" ||
                                        collectionId === "podcast_transcripts"
                                          ? `
                                      <button class="btn-ghost" id="translate-col-item" title="Oversett til tilgjengelige språk"><span class="material-symbols-outlined">g_translate</span><span>Oversett</span></button>
                                      `
                                          : ""
                                      }
                             <button class="btn-ghost" id="print-col-item" title="Skriv ut"><span class="material-symbols-outlined">print</span><span>Skriv ut</span></button>
                             ${
                               collectionId === "blog" ||
                               collectionId === "teaching"
                                 ? `
                              <button class="btn-ghost" id="toggle-split-preview" title="Forhåndsvis"><span class="material-symbols-outlined">visibility</span><span>Forhåndsvis</span></button>
                              `
                                 : ""
                             }
                             ${
                               collectionId === "blog" ||
                               collectionId === "teaching"
                                 ? `
                              <button class="btn-outline" id="save-col-item-draft"><span class="material-symbols-outlined">draft</span><span>Lagre som utkast</span></button>
                              `
                                 : ""
                             }
                             <div class="editor-mobile-actions" id="editor-mobile-actions">
                                 <button type="button" class="btn-ghost" id="editor-mobile-actions-toggle" aria-label="Flere valg" aria-expanded="false" aria-controls="editor-mobile-actions-menu" title="Flere valg"><span class="material-symbols-outlined">more_vert</span></button>
                                 <div class="editor-mobile-actions-menu" id="editor-mobile-actions-menu" hidden>
                                     ${collectionId === "blog" || collectionId === "teaching" || collectionId === "podcast_transcripts" ? '<button type="button" data-editor-action="translate-col-item"><span class="material-symbols-outlined">g_translate</span>Oversett</button>' : ""}
                                     <button type="button" data-editor-action="print-col-item"><span class="material-symbols-outlined">print</span>Skriv ut</button>
                                     ${collectionId === "blog" || collectionId === "teaching" ? '<button type="button" data-editor-action="toggle-split-preview"><span class="material-symbols-outlined">visibility</span>Forhåndsvis</button>' : ""}
                                 </div>
                             </div>
                             <button class="btn-primary" id="save-col-item"><span class="material-symbols-outlined">publish</span><span>Lagre og publiser</span></button>
                        </div>
</header>
                    <div class="editor-content-wrapper">
                        <div class="editor-main-canvas">
                            <div class="editor-toolbar-container">
                            <div class="desktop-richtools docs-toolbar" id="desktop-richtools">
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="undo" title="Angre">
                                        <span class="material-symbols-outlined">undo</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="redo" title="Gjør om">
                                        <span class="material-symbols-outlined">redo</span>
                                    </button>
                                </div>
                                <div class="docs-toolbar-divider"></div>
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="paragraph" title="Brødtekst">
                                        <span class="material-symbols-outlined">notes</span>
                                    </button>
                                    <label class="docs-toolbar-select-wrap" title="Overskriftsnivå">
                                        <span class="material-symbols-outlined">title</span>
                                        <select class="docs-toolbar-select" data-tool-select="headingLevel" aria-label="Overskriftsnivå">
                                            <option value="p" selected>Brødtekst</option>
                                            <option value="h1">H1</option>
                                            <option value="h2">H2</option>
                                            <option value="h3">H3</option>
                                            <option value="h4">H4</option>
                                            <option value="h5">H5</option>
                                            <option value="h6">H6</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="docs-toolbar-divider"></div>
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="bold" title="Fet">
                                        <span class="material-symbols-outlined">format_bold</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="italic" title="Kursiv">
                                        <span class="material-symbols-outlined">format_italic</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="underline" title="Understreket">
                                        <span class="material-symbols-outlined">format_underlined</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="strike" title="Gjennomstreket">
                                        <span class="material-symbols-outlined">format_strikethrough</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="link" title="Lenke">
                                        <span class="material-symbols-outlined">link</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="removeFormat" title="Fjern formatering">
                                        <span class="material-symbols-outlined">format_clear</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="textColor" title="Tekstfarge">
                                        <span class="material-symbols-outlined">format_color_text</span>
                                    </button>
                                    <input type="color" class="docs-color-input" data-color-input="text" value="#1f2937" title="Velg tekstfarge" style="position:absolute; opacity:0; pointer-events:none; width:1px; height:1px;" aria-hidden="true">
                                    <button type="button" class="desktop-richtools-btn" data-tool="highlightColor" title="Fremhevingsfarge">
                                        <span class="material-symbols-outlined">format_color_fill</span>
                                    </button>
                                    <input type="color" class="docs-color-input" data-color-input="highlight" value="#fde68a" title="Velg fremhevingsfarge" style="position:absolute; opacity:0; pointer-events:none; width:1px; height:1px;" aria-hidden="true">
                                    <label class="docs-toolbar-select-wrap" title="Skriftstørrelse">
                                        <span class="material-symbols-outlined">format_size</span>
                                        <select class="docs-toolbar-select" data-tool-select="fontSize" aria-label="Skriftstørrelse">
                                            <option value="12">12</option>
                                            <option value="14">14</option>
                                            <option value="16">16</option>
                                            <option value="18" selected>18</option>
                                            <option value="20">20</option>
                                            <option value="24">24</option>
                                            <option value="28">28</option>
                                            <option value="32">32</option>
                                            <option value="36">36</option>
                                            <option value="42">42</option>
                                            <option value="custom">Egendefinert...</option>
                                        </select>
                                    </label>
                                    <label class="docs-toolbar-select-wrap" title="Linjeavstand">
                                        <span class="material-symbols-outlined">format_line_spacing</span>
                                        <select class="docs-toolbar-select" data-tool-select="lineHeight" aria-label="Linjeavstand">
                                            <option value="1.0">1.0</option>
                                            <option value="1.15">1.15</option>
                                            <option value="1.25">1.25</option>
                                            <option value="1.35">1.35</option>
                                            <option value="1.5">1.5</option>
                                            <option value="1.65">1.65</option>
                                            <option value="1.75" selected>1.75</option>
                                            <option value="2.0">2.0</option>
                                            <option value="2.5">2.5</option>
                                            <option value="3.0">3.0</option>
                                            <option value="custom">Egendefinert...</option>
                                        </select>
                                    </label>
                                    <label class="docs-toolbar-select-wrap" title="Avsnittsavstand">
                                        <span class="material-symbols-outlined">notes</span>
                                        <select class="docs-toolbar-select" data-tool-select="paragraphSpacing" aria-label="Avsnittsavstand">
                                            <option value="0">0</option>
                                            <option value="0.4">0.4</option>
                                            <option value="0.6">0.6</option>
                                            <option value="0.9">0.9</option>
                                            <option value="1.2" selected>1.2</option>
                                            <option value="1.6">1.6</option>
                                            <option value="2.0">2.0</option>
                                            <option value="custom">Egendefinert...</option>
                                        </select>
                                    </label>
                                    <label class="docs-toolbar-select-wrap" title="Bokstavavstand">
                                        <span class="material-symbols-outlined">format_letter_spacing</span>
                                        <select class="docs-toolbar-select" data-tool-select="letterSpacing" aria-label="Bokstavavstand">
                                            <option value="normal" selected>Normal</option>
                                            <option value="-0.02">Smal (-0.02em)</option>
                                            <option value="-0.01">Litt smal (-0.01em)</option>
                                            <option value="0.01">Litt bred (0.01em)</option>
                                            <option value="0.02">Bred (0.02em)</option>
                                            <option value="0.05">Veldig bred (0.05em)</option>
                                            <option value="custom">Egendefinert...</option>
                                        </select>
                                    </label>
                                </div>
                                <div class="docs-toolbar-divider"></div>
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="list" title="Punktliste">
                                        <span class="material-symbols-outlined">format_list_bulleted</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="orderedList" title="Nummerert liste">
                                        <span class="material-symbols-outlined">format_list_numbered</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="outdent" title="Reduser innrykk">
                                        <span class="material-symbols-outlined">format_indent_decrease</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="indent" title="Øk innrykk">
                                        <span class="material-symbols-outlined">format_indent_increase</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="checklist" title="Kontrollliste">
                                        <span class="material-symbols-outlined">checklist</span>
                                    </button>
                                </div>
                                <div class="docs-toolbar-divider"></div>
                                <div class="docs-toolbar-group">
                                    <button type="button" class="desktop-richtools-btn" data-tool="image" title="Bilde (Last opp)">
                                        <span class="material-symbols-outlined">upload</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="media-library" title="Bilde fra bibliotek">
                                        <span class="material-symbols-outlined">photo_library</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="video" title="Video">
                                        <span class="material-symbols-outlined">smart_display</span>
                                    </button>
                                    <button type="button" class="desktop-richtools-btn" data-tool="quote" title="Sitat">
                                        <span class="material-symbols-outlined">format_quote</span>
                                    </button>
                                </div>
                            </div>
                            </div>
                            <div class="editor-scroll-area">
                                <div class="docs-workspace-shell">
                                    <div class="editor-paper docs-page-paper">
                                        <textarea id="col-item-title-v2" placeholder="Skriv din tittel her..." rows="1">${item.title || ""}</textarea>
                                        <button type="button" class="editor-format-toggle" id="editor-format-toggle" aria-expanded="false" aria-controls="desktop-richtools">
                                            <span class="material-symbols-outlined" aria-hidden="true">format_bold</span> Formater tekst
                                        </button>
                                        <div id="${editorHolderId}"></div>
                                        <input type="file" id="docs-image-upload-input" style="display:none;" accept="image/*">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Split-Screen Live Preview Panel -->
                        <div class="editor-preview-canvas" id="editor-live-preview-panel" style="display: none; flex: 1; border-left: 1px solid #e2e8f0; background: #f8fafc; flex-direction: column; overflow: hidden; position: relative;">
                            <!-- Preview toolbar -->
                            <div style="padding: 8px 16px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <span class="material-symbols-outlined" style="color: #d17d39;">devices</span>
                                    <span style="font-weight: 700; font-size: 13px; color: #475569;">Sanntidsvisning</span>
                                </div>
                                <div class="device-toggles-modern" style="margin: 0;">
                                    <button type="button" class="device-btn active" id="preview-device-desktop" title="PC-visning" style="width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:8px;">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">desktop_windows</span>
                                    </button>
                                    <button type="button" class="device-btn" id="preview-device-mobile" title="Mobilvisning" style="width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:8px;">
                                        <span class="material-symbols-outlined" style="font-size: 18px;">smartphone</span>
                                    </button>
                                </div>
                            </div>
                            <!-- Preview Container -->
                            <div id="preview-iframe-container" style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; overflow: auto; box-sizing: border-box; transition: all 0.3s ease;">
                                <iframe id="editor-live-preview-iframe" style="width: 100%; height: 100%; border: none; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);" src="about:blank"></iframe>
                            </div>
                        </div>

                        <aside class="editor-sidebar-v2">
                             <h4 class="sidebar-section-title">DETALJER</h4>
                             ${
                               collectionId === "events"
                                 ? `
                             <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                                 <div style="flex: 1;">
                                     <label style="font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 6px; display: block;">Dato</label>
                                     <input type="date" id="col-item-date" class="sidebar-control" value="${safeDate}" style="box-sizing: border-box;">
                                 </div>
                                 <div style="flex: 1;">
                                     <label style="font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 6px; display: block;">Klokkeslett</label>
                                     <input type="time" id="col-item-time" class="sidebar-control" value="${safeTime}" style="box-sizing: border-box;">
                                 </div>
                             </div>
                             `
                                 : `
                             <div class="sidebar-group">
                                 <label>Publiseringsdato</label>
                                 <input type="date" id="col-item-date" class="sidebar-control" value="${safeDate}">
                             </div>
                             `
                             }
                             <div class="sidebar-group">
                                 <label>Forfatter</label>
                                 <input type="text" id="col-item-author" class="sidebar-control" value="${item.author || ""}" placeholder="Navn">
                             </div>
                             <div class="sidebar-group">
                                 <label>Kategori</label>
                                 <input type="text" id="col-item-cat" class="sidebar-control" value="${item.category || ""}" placeholder="Eks: Undervisning">
                             </div>
                             ${
                               isTeachingCollection
                                 ? `
                             <div class="sidebar-group">
                                 <label>Type undervisning</label>
                                 <select id="col-item-type" class="sidebar-control">
                                     <option value="Bibelstudie" ${selectedTeachingType.includes("bibelstudie") ? "selected" : ""}>Bibelstudie</option>
                                     <option value="Seminarer" ${selectedTeachingType.includes("seminar") ? "selected" : ""}>Seminar</option>
                                     <option value="Undervisningsserier" ${selectedTeachingType.includes("undervisningsserie") ? "selected" : ""}>Undervisningsserie</option>
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Velg 'Undervisningsserie' for å koble sammen flere undervisninger.</p>
                             </div>
                             <div class="sidebar-group" id="col-item-series-group" style="${selectedTeachingType.includes("undervisningsserie") ? "" : "display:none;"}">
                                 <label>Koble undervisninger i serie</label>
                                 <select id="col-item-series-items" class="sidebar-control" multiple style="height: 140px;">
                                     ${teachingCandidates}
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Hold Cmd/Ctrl nede for å velge flere undervisninger i serien.</p>
                             </div>
                             `
                                 : ""
                             }
                             
                              <h4 class="sidebar-section-title">OMSLAGSBILDE</h4>
                              <div class="sidebar-group">
                                  <div class="premium-media-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: all 0.3s ease;">
                                      <!-- Preview Area -->
                                      <div id="sidebar-img-trigger" style="aspect-ratio: 16/9; background: #f8fafc; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; border-bottom: 1px solid #f1f5f9; overflow: hidden;">
                                          <div id="sidebar-img-preview" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                              ${
                                                item.imageUrl
                                                  ? `<img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">`
                                                  : `
                                                  <div style="text-align: center; color: #94a3b8;">
                                                      <span class="material-symbols-outlined" style="font-size: 40px; margin-bottom: 8px; opacity: 0.5;">add_a_photo</span>
                                                      <div style="font-size: 12px; font-weight: 500;">Klikk for å laste opp</div>
                                                  </div>
                                              `
                                              }
                                          </div>
                                          <div class="upload-overlay" style="position: absolute; inset: 0; background: rgba(15, 23, 42, 0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
                                              <span style="color: white; font-size: 12px; font-weight: 700; background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 20px; backdrop-filter: blur(4px);">ENDRE BILDE</span>
                                          </div>
                                      </div>
                                      
                                      <!-- Actions Area -->
                                      <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                                          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                              <button type="button" id="sidebar-img-upload-btn" class="btn-ghost" style="flex: 1 1 120px; justify-content: center; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 13px; font-weight: 600; color: #475569;">
                                                  <span class="material-symbols-outlined" style="font-size: 20px;">upload</span> Last opp
                                              </button>
                                              <button type="button" id="sidebar-img-library-btn" class="btn-ghost" style="flex: 1 1 120px; justify-content: center; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 13px; font-weight: 600; color: #d17d39;">
                                                  <span class="material-symbols-outlined" style="font-size: 20px;">photo_library</span> Bibliotek
                                              </button>
                                              <button type="button" id="unsplash-trigger-btn" class="btn-ghost" style="flex: 1 1 120px; justify-content: center; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 13px; font-weight: 600; color: #d17d39;">
                                                  <span class="material-symbols-outlined" style="font-size: 20px;">image_search</span> Unsplash
                                              </button>
                                              <button type="button" id="sidebar-img-remove-btn" class="btn-ghost" style="flex: 1 1 120px; justify-content: center; padding: 10px; border-radius: 10px; border: 1px solid #fee2e2; background: #fef2f2; font-size: 13px; font-weight: 600; color: #b91c1c; display: ${item.imageUrl ? "flex" : "none"};">
                                                  <span class="material-symbols-outlined" style="font-size: 20px;">delete</span> Fjern
                                              </button>
                                          </div>
                                          
                                          <div style="position: relative;">
                                              <input type="text" id="col-item-img" class="sidebar-control" style="padding-right: 40px; font-size: 12px; height: 38px; background: #f1f5f9; border: 1px solid transparent;" placeholder="Eller lim inn URL..." value="${item.imageUrl || ""}">
                                              <span class="material-symbols-outlined" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 18px; color: #94a3b8;">link</span>
                                          </div>
                                      </div>
                                  </div>
                                  <input type="file" id="col-item-img-file" style="display: none;" accept="image/*">
                              </div>

                            <button type="button" class="btn-primary" id="ai-write-content" style="margin-bottom:12px; display:flex; align-items:center; justify-content:center; gap:12px; width:100%; background:linear-gradient(135deg, #d17d39, #bd4f2a); border:none; box-shadow: 0 4px 15px rgba(209, 125, 57, 0.25); min-height: 48px; border-radius: 12px; font-weight: 700; transition: all 0.3s ease;">
                                <span class="material-symbols-outlined" style="font-size: 22px;">${collectionId === "podcast_transcripts" ? "hearing" : "edit_note"}</span>
                                ${collectionId === "podcast_transcripts" ? "Transkriber & Oppsummer med AI" : "Skriv innhold med AI"}
                            </button>

                            <button type="button" class="btn-secondary" id="ai-suggest-seo" style="margin-bottom:16px; display:flex; align-items:center; justify-content:center; gap:12px; width:100%; min-height: 48px; border-radius: 12px; font-weight: 600; border: 1px solid #e2e8f0; background: #f8fafc; color: #d17d39; transition: all 0.3s ease;">
                                <span class="material-symbols-outlined" style="font-size: 22px;">auto_awesome</span>
                                Foreslå tagger og SEO med AI
                            </button>
                            <h4 class="sidebar-section-title">TAGGER</h4>
                            <div class="sidebar-group">
                                <div class="tags-input-container">
                                    <div id="active-tags" class="active-tags-list"></div>
                                    <input type="text" id="tag-input" class="sidebar-control" placeholder="Legg til tag + Enter">
                                </div>
                            </div>

                            ${
                              collectionId === "events"
                                ? `
                            <h4 class="sidebar-section-title">ARRANGEMENTLINK</h4>
                            <div class="sidebar-group">
                                <label>Påmeldings- eller arrangementlenke (valgfri)</label>
                                <input type="text" id="col-item-event-link" class="sidebar-control" value="${item.eventLink || ""}" placeholder="F.eks. Facebook-event eller påmeldingsskjema">
                            </div>
                            <div class="sidebar-group">
                                <label>Knappetekst (valgfri)</label>
                                <input type="text" id="col-item-event-link-text" class="sidebar-control" value="${item.eventLinkText || ""}" placeholder="Eks: Kjøp billett, Bli med...">
                                <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Egendefinert tekst på påmeldingsknappen. Standard er "Meld deg på nå".</p>
                            </div>

                            <h4 class="sidebar-section-title">DATO & GJENTAKELSE</h4>
                            <div class="sidebar-group">
                                <label>Gjentakelse / Recurring (valgfri)</label>
                                <input type="text" id="col-item-event-recurring" class="sidebar-control" value="${item.eventRecurring || ""}" placeholder="Eks: Hver tirsdag kl. 19:00">
                            </div>
                            <div class="sidebar-group">
                                <label>Flere datoer (valgfri)</label>
                                <textarea id="col-item-event-additional-dates" class="sidebar-control" style="height: 60px;" placeholder="Eks:&#10;12. august kl. 18:00&#10;19. august kl. 18:00">${item.eventAdditionalDates || ""}</textarea>
                            </div>
                            <div class="sidebar-group">
                                <label>Flere tidspunkter / Program (valgfri)</label>
                                <textarea id="col-item-event-schedule" class="sidebar-control" style="height: 60px;" placeholder="Eks:&#10;Fredag: kl. 19:00&#10;Lørdag: kl. 11:00 & 18:00">${item.eventSchedule || ""}</textarea>
                            </div>
                            `
                                : ""
                            }

                             <h4 class="sidebar-section-title">SEO & SYNLIGHET</h4>
                             <div class="sidebar-group">
                                 <label>Meta-tittel (SEO)</label>
                                 <input type="text" id="col-item-seo-title" class="sidebar-control" value="${item.seoTitle || ""}" placeholder="Tittel for søkemotorer">
                             </div>
                             <div class="sidebar-group">
                                 <label>Meta-beskrivelse</label>
                                 <textarea id="col-item-seo-desc" class="sidebar-control" style="height: 100px;" placeholder="Kort oppsummering...">${item.seoDescription || ""}</textarea>
                             </div>
                             ${
                               collectionId === "podcast_transcripts"
                                 ? `
                             <h4 class="sidebar-section-title">PODCAST AI OPPSUMMERING</h4>
                             <div class="sidebar-group">
                                 <label>AI-generert oppsummering</label>
                                 <textarea id="col-item-summary" class="sidebar-control" style="height: 120px; font-size: 13px; line-height: 1.5;" placeholder="Lim inn AI-oppsummering her...">${podcastSummary}</textarea>
                             </div>
                             <div class="sidebar-group">
                                 <label>Nøkkelvers (Format: APG 1,8 | Tekst...)</label>
                                 <textarea id="col-item-key-verses" class="sidebar-control" style="height: 120px; font-size: 13px; line-height: 1.5;" placeholder="F.eks:\nAPG 1,8 | Men dere skal få kraft...\nJOH 4,7 | Da kommer en samaritansk kvinne...">${formattedKeyVerses}</textarea>
                             </div>
                             <div class="sidebar-group">
                                 <label>Diskusjonsspørsmål (Ett per linje)</label>
                                 <textarea id="col-item-questions" class="sidebar-control" style="height: 120px; font-size: 13px; line-height: 1.5;" placeholder="F.eks:\nHvilke områder unngår du?\nHvordan vise kjærlighet?">${formattedQuestions}</textarea>
                                 <button type="button" class="btn" id="generate-podcast-ai-summary" style="margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border-radius: 12px; font-weight: 600; min-height: 42px; background: linear-gradient(135deg, #d17d39, #bd4f2a); color: white; border: none; box-shadow: 0 4px 12px rgba(209, 125, 57, 0.2);">
                                     <span class="material-symbols-outlined" style="font-size: 20px;">auto_awesome</span>
                                     Generer alt med AI
                                 </button>
                                 <div id="podcast-ai-status" style="font-size: 12px; margin-top: 8px; font-weight: 500; min-height: 18px;"></div>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 12px;">Dette vises i listen og som sammendrag/nøkkelvers på nettsiden.</p>
                             </div>
                             `
                                 : ""
                             }
                             ${
                               collectionId === "blog"
                                 ? `
                             <h4 class="sidebar-section-title">RELATERTE INNLEGG</h4>
                             <div class="sidebar-group">
                                 <select id="col-item-related" class="sidebar-control" multiple style="height: 100px;">
                                     ${(this.currentItems || [])
                                       .map((opt, optIndex) => {
                                         if (optIndex === index) return "";
                                         const optId = opt.id || opt.title;
                                         const selected = (
                                           item.relatedPosts || []
                                         ).includes(optId)
                                           ? "selected"
                                           : "";
                                         return `<option value="${optId}" ${selected}>${opt.title || "Uten Tittel"}</option>`;
                                       })
                                       .join("")}
                                 </select>
                                 <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Hold Cmd/Ctrl nede for å velge flere.</p>
                             </div>
                             `
                                 : ""
                             }
                        </aside>
                    </div>
                </div>
                `;

        document.body.appendChild(modal);

        // Live synkronisering av tittel i header-center
        const mobileActions = modal.querySelector("#editor-mobile-actions");
        const mobileToggle = modal.querySelector(
          "#editor-mobile-actions-toggle",
        );
        const mobileMenu = modal.querySelector("#editor-mobile-actions-menu");
        const closeMobileActions = () => {
          mobileMenu.hidden = true;
          mobileToggle.setAttribute("aria-expanded", "false");
        };
        mobileToggle.addEventListener("click", () => {
          mobileMenu.hidden = !mobileMenu.hidden;
          mobileToggle.setAttribute(
            "aria-expanded",
            String(!mobileMenu.hidden),
          );
        });
        mobileMenu.addEventListener("click", (event) => {
          const option = event.target.closest("[data-editor-action]");
          if (!option) return;
          const action = modal.querySelector(`#${option.dataset.editorAction}`);
          closeMobileActions();
          action?.click();
        });
        modal.addEventListener("click", (event) => {
          if (!mobileActions.contains(event.target)) closeMobileActions();
        });
        modal.addEventListener("keydown", (event) => {
          if (event.key === "Escape") closeMobileActions();
        });

        const titleMainEl = document.getElementById("col-item-title-v2");
        const headerTitleEl = modal.querySelector(".editor-header-title");
        if (titleMainEl && headerTitleEl) {
          titleMainEl.addEventListener("input", () => {
            const cleanTitle = titleMainEl.value.trim();
            headerTitleEl.textContent = cleanTitle || "Uten tittel";
            headerTitleEl.setAttribute("title", cleanTitle || "Uten tittel");
          });
        }

        if (collectionId === "podcast_transcripts") {
          const titleMain = document.getElementById("col-item-title-v2");
          const titleSidebar = document.getElementById(
            "col-item-title-sidebar",
          );
          if (titleMain && titleSidebar) {
            const syncTitle = (source, target) => {
              target.value = source.value;
            };
            titleMain.addEventListener("input", () =>
              syncTitle(titleMain, titleSidebar),
            );
            titleSidebar.addEventListener("input", () =>
              syncTitle(titleSidebar, titleMain),
            );
          }
        }

        if (isTeachingCollection) {
          const typeSelect = document.getElementById("col-item-type");
          const seriesGroup = document.getElementById("col-item-series-group");
          if (typeSelect && seriesGroup) {
            const syncSeriesVisibility = () => {
              seriesGroup.style.display =
                typeSelect.value === "Undervisningsserier" ? "" : "none";
            };
            typeSelect.addEventListener("change", syncSeriesVisibility);
            syncSeriesVisibility();
          }
        }

        if (collectionId === "blog") {
          this._renderBlogTranslationStatusBadge(item);
        }

        // --- Editor.js Data Prep ---
        let editorData = {};

        // 1. Prefer existing Editor.js blocks
        if (
          typeof item.content === "object" &&
          item.content !== null &&
          item.content.blocks
        ) {
          if (
            collectionId !== "podcast_transcripts" ||
            this._hasMeaningfulEditorContent(item.content)
          ) {
            editorData = item.content;
          }
        }

        // 2. Fallback to Wix richContent (if blocks are missing or empty)
        if (!this._hasMeaningfulEditorContent(editorData) && item.richContent) {
          console.log(
            "[AdminManager] Content empty, falling back to richContent (Wix format)",
          );
          // We use the content-manager's rendering logic if possible,
          // but since we are in AdminManager, we might need a local version or a bridge.
          // For now, let's assume item.content might have been the HTML version of richContent.
        }

        // 3. Fallback to HTML string in content, description, or text
        if (!this._hasMeaningfulEditorContent(editorData)) {
          if (
            typeof item.content === "string" &&
            item.content.trim().length > 0
          ) {
            editorData = this.htmlToEditorJsBlocks(item.content);
          } else if (
            typeof item.description === "string" &&
            item.description.trim().length > 0
          ) {
            editorData = this.htmlToEditorJsBlocks(item.description);
          } else if (
            typeof item.text === "string" &&
            item.text.trim().length > 0
          ) {
            editorData = this.htmlToEditorJsBlocks(item.text);
          }
        }

        // --- Wix Artifact Cleanup (Pre-Editor Initialization) ---
        // Ensure the editor opens with sanitized content even before the first save
        if (
          editorData &&
          typeof editorData === "object" &&
          Array.isArray(editorData.blocks)
        ) {
          if (
            window.contentManager &&
            typeof window.contentManager.cleanEditorBlocks === "function"
          ) {
            editorData = window.contentManager.cleanEditorBlocks(editorData);
          }
        } else if (
          typeof editorData === "string" &&
          editorData.trim().length > 0
        ) {
          if (
            window.contentManager &&
            typeof window.contentManager.cleanLegacyHtml === "function"
          ) {
            editorData = window.contentManager.cleanLegacyHtml(editorData);
          }
        }

        // --- Initialize Editor.js ---
        // Custom YouTube Video Tool (replaces unreliable @editorjs/embed CDN plugin)
        class YoutubeVideoTool {
          static get toolbox() {
            return {
              title: "Video (YouTube)",
              icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.582 7.186a2.506 2.506 0 0 0-1.762-1.769C18.265 5 12 5 12 5s-6.265 0-7.82.417A2.506 2.506 0 0 0 2.418 7.186 26.302 26.302 0 0 0 2 12a26.302 26.302 0 0 0 .418 4.814 2.506 2.506 0 0 0 1.762 1.769C5.735 19 12 19 12 19s6.265 0 7.82-.417a2.506 2.506 0 0 0 1.762-1.769A26.302 26.302 0 0 0 22 12a26.302 26.302 0 0 0-.418-4.814zM9.954 15.477V8.523L15.818 12l-5.864 3.477z"/></svg>',
            };
          }

          static get isReadOnlySupported() {
            return true;
          }

          constructor({ data, readOnly }) {
            this.data = data || {};
            this.readOnly = readOnly;
            this._wrapper = null;
          }

          _getYouTubeId(url) {
            if (!url) return null;
            const m = url.match(
              /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
            );
            return m ? m[1] : null;
          }

          render() {
            this._wrapper = document.createElement("div");
            this._wrapper.style.cssText =
              "padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;";

            const videoId = this._getYouTubeId(this.data.url || "");
            let videoUrl = this.data.url || "";
            let fileUrl = this.data.fileUrl || "";

            // Preview area
            const previewDiv = document.createElement("div");
            previewDiv.style = "margin-bottom: 10px;";
            if (fileUrl) {
              previewDiv.innerHTML = `<video src="${fileUrl}" controls style="width:100%; border-radius:8px; background:#000;"></video>`;
            } else if (videoId) {
              previewDiv.innerHTML = `<div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe></div>`;
            } else {
              previewDiv.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="#cbd5e1"><path d="M21.582 7.186a2.506 2.506 0 0 0-1.762-1.769C18.265 5 12 5 12 5s-6.265 0-7.82.417A2.506 2.506 0 0 0 2.418 7.186 26.302 26.302 0 0 0 2 12a26.302 26.302 0 0 0 .418 4.814 2.506 2.506 0 0 0 1.762 1.769C5.735 19 12 19 12 19s6.265 0 7.82-.417a2.506 2.506 0 0 0 1.762-1.769A26.302 26.302 0 0 0 22 12a26.302 26.302 0 0 0-.418-4.814zM9.954 15.477V8.523L15.818 12l-5.864 3.477z"/></svg><p style="margin:8px 0 0; font-size:13px;">Ingen video valgt</p></div>`;
            }
            this._wrapper.appendChild(previewDiv);

            if (!this.readOnly) {
              // Tabs/buttons for upload or link
              const tabWrap = document.createElement("div");
              tabWrap.style = "display:flex; gap:8px; margin-bottom:12px;";
              const linkTab = document.createElement("button");
              linkTab.type = "button";
              linkTab.textContent = "Lim inn lenke";
              linkTab.className = "btn btn-secondary";
              const uploadTab = document.createElement("button");
              uploadTab.type = "button";
              uploadTab.textContent = "Last opp fra enhet";
              uploadTab.className = "btn btn-outline";
              tabWrap.appendChild(linkTab);
              tabWrap.appendChild(uploadTab);
              this._wrapper.appendChild(tabWrap);

              // Link input
              const linkInputWrap = document.createElement("div");
              linkInputWrap.style = "margin-top:8px;";
              const input = document.createElement("input");
              input.type = "url";
              input.placeholder = "Lim inn YouTube-lenke her...";
              input.value = videoUrl;
              input.style.cssText =
                "width:100%; padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; outline:none; margin-bottom:8px;";
              const btn = document.createElement("button");
              btn.type = "button";
              btn.textContent = "Last inn";
              btn.className = "btn btn-primary";
              btn.style = "margin-left:0;";
              linkInputWrap.appendChild(input);
              linkInputWrap.appendChild(btn);

              // Upload input
              const uploadInputWrap = document.createElement("div");
              uploadInputWrap.style = "margin-top:8px; display:none;";
              const fileInput = document.createElement("input");
              fileInput.type = "file";
              fileInput.accept = "video/*";
              fileInput.style = "margin-bottom:8px;";
              const uploadBtn = document.createElement("button");
              uploadBtn.type = "button";
              uploadBtn.textContent = "Last opp video";
              uploadBtn.className = "btn btn-primary";
              uploadInputWrap.appendChild(fileInput);
              uploadInputWrap.appendChild(uploadBtn);

              // Tab switching
              linkTab.onclick = () => {
                linkTab.className = "btn btn-secondary";
                uploadTab.className = "btn btn-outline";
                linkInputWrap.style.display = "";
                uploadInputWrap.style.display = "none";
              };
              uploadTab.onclick = () => {
                linkTab.className = "btn btn-outline";
                uploadTab.className = "btn btn-secondary";
                linkInputWrap.style.display = "none";
                uploadInputWrap.style.display = "";
              };
              // Default to link tab
              linkTab.click();

              // Link handler
              btn.onclick = () => {
                this.data.url = input.value.trim();
                this.data.fileUrl = "";
                const newId = this._getYouTubeId(this.data.url);
                videoUrl = this.data.url;
                fileUrl = "";
                if (newId) {
                  previewDiv.innerHTML = `<div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin-bottom:10px;"><iframe src="https://www.youtube.com/embed/${newId}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe></div>`;
                } else {
                  previewDiv.innerHTML =
                    '<p style="text-align:center; color:#ef4444; font-size:13px;">Ugyldig YouTube-lenke</p>';
                }
              };

              // Upload handler
              uploadBtn.onclick = async () => {
                const file = fileInput.files && fileInput.files[0];
                if (!file) {
                  alert("Velg en videofil først.");
                  return;
                }
                uploadBtn.disabled = true;
                uploadBtn.textContent = "Laster opp...";
                try {
                  const path = `editor/video-uploads/${Date.now()}_${file.name}`;
                  // Bruk eksisterende firebaseService hvis tilgjengelig
                  const url = await firebaseService.uploadFile(
                    file,
                    path,
                    ["video/"],
                    500,
                  );
                  this.data.fileUrl = url;
                  this.data.url = "";
                  fileUrl = url;
                  videoUrl = "";
                  previewDiv.innerHTML = `<video src="${url}" controls style="width:100%; border-radius:8px; background:#000;"></video>`;
                } catch (err) {
                  alert("Kunne ikke laste opp video.");
                } finally {
                  uploadBtn.disabled = false;
                  uploadBtn.textContent = "Last opp video";
                }
              };

              this._wrapper.appendChild(linkInputWrap);
              this._wrapper.appendChild(uploadInputWrap);
            }

            return this._wrapper;
          }

          save() {
            // Return both url and fileUrl, but only one will be set
            const input = this._wrapper
              ? this._wrapper.querySelector('input[type="url"]')
              : null;
            const fileUrl = this.data.fileUrl || "";
            const url = input ? input.value.trim() : this.data.url || "";
            return fileUrl ? { fileUrl } : { url };
          }
        }

        class UnsplashImageTool {
          static get toolbox() {
            return {
              title: "Unsplash",
              icon: '<span class="material-symbols-outlined">image_search</span>',
            };
          }

          constructor({ api }) {
            this.api = api;
          }

          render() {
            const btn = document.createElement("div");
            btn.style.cssText =
              "padding: 24px; border: 2px dashed #e2e8f0; border-radius: 12px; text-align: center; cursor: pointer; color: #d17d39; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s ease;";
            btn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 32px;">image_search</span>
                        <span>Klikk for å hente bilde fra Unsplash</span>
                    `;

            btn.onmouseover = () => {
              btn.style.background = "#fff7ed";
              btn.style.borderColor = "#d17d39";
            };
            btn.onmouseout = () => {
              btn.style.background = "transparent";
              btn.style.borderColor = "#e2e8f0";
            };

            btn.onclick = () => {
              if (window.unsplashManager) {
                window.unsplashManager.open((selection) => {
                  if (selection && selection.url) {
                    const index = this.api.blocks.getCurrentBlockIndex();
                    this.api.blocks.insert("image", {
                      file: { url: selection.url },
                      caption: selection.caption || "",
                      withBorder: false,
                      withBackground: false,
                      stretched: false,
                    });
                    this.api.blocks.delete(index);
                  }
                });
              }
            };

            return btn;
          }

          save() {
            return {};
          }
        }

        class MediaLibraryTool {
          static get toolbox() {
            return {
              title: "Bibliotek",
              icon: '<span class="material-symbols-outlined">photo_library</span>',
            };
          }

          constructor({ api }) {
            this.api = api;
          }

          render() {
            const btn = document.createElement("div");
            btn.style.cssText =
              "padding: 24px; border: 2px dashed #e2e8f0; border-radius: 12px; text-align: center; cursor: pointer; color: #d17d39; font-weight: 600; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s ease;";
            btn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 32px;">photo_library</span>
                        <span>Klikk for å hente bilde fra mediebibliotek</span>
                    `;

            btn.onmouseover = () => {
              btn.style.background = "#fff7ed";
              btn.style.borderColor = "#d17d39";
            };
            btn.onmouseout = () => {
              btn.style.background = "transparent";
              btn.style.borderColor = "#e2e8f0";
            };

            btn.onclick = () => {
              window.adminManager.openMediaLibraryModal((selection) => {
                if (selection && selection.url) {
                  const index = this.api.blocks.getCurrentBlockIndex();
                  this.api.blocks.insert("image", {
                    file: { url: selection.url },
                    caption: selection.name || "",
                    withBorder: false,
                    withBackground: false,
                    stretched: false,
                  });
                  this.api.blocks.delete(index);
                }
              });
            };

            return btn;
          }

          save() {
            return {};
          }
        }

        class SimpleListTool {
          static get toolbox() {
            return {
              title: "Liste",
              icon: '<span class="material-symbols-outlined">format_list_bulleted</span>',
            };
          }

          constructor({ data }) {
            this.data = {
              style: data?.style === "ordered" ? "ordered" : "unordered",
              items:
                Array.isArray(data?.items) && data.items.length
                  ? data.items
                  : [""],
            };
            this.wrapper = null;
          }

          escape(value) {
            return String(value || "")
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
          }

          render() {
            const tag = this.data.style === "ordered" ? "ol" : "ul";
            this.wrapper = document.createElement(tag);
            this.wrapper.className = `cdx-list cdx-list--${this.data.style}`;
            this.wrapper.contentEditable = "true";
            this.wrapper.innerHTML = this.data.items
              .map(
                (item) =>
                  `<li class="cdx-list__item">${this.escape(item)}</li>`,
              )
              .join("");
            return this.wrapper;
          }

          save(blockContent) {
            return {
              style: this.data.style,
              items: Array.from(blockContent.querySelectorAll("li"))
                .map((li) => li.innerHTML.trim())
                .filter(Boolean),
            };
          }
        }

        // Defines tools conditionally to prevent crashes if scripts fail to load
        const toolsConfig = {};

        if (typeof Header !== "undefined") {
          toolsConfig.header = {
            class: Header,
            inlineToolbar: true,
            config: {
              placeholder: "Overskrift",
              levels: [1, 2, 3, 4, 5, 6],
              defaultLevel: 2,
            },
          };
        }

        if (typeof List !== "undefined") {
          toolsConfig.list = {
            class: List,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+L",
            config: { defaultStyle: "unordered" },
          };
        } else {
          toolsConfig.list = {
            class: SimpleListTool,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+L",
          };
        }

        // Media Library Tool
        toolsConfig.mediaLibrary = {
          class: MediaLibraryTool,
        };

        if (typeof ImageTool !== "undefined") {
          toolsConfig.image = {
            class: ImageTool,
            config: {
              uploader: {
                async uploadByFile(file) {
                  try {
                    const path = `editor/${collectionId}/${Date.now()}_${file.name}`;
                    const url = await firebaseService.uploadImage(file, path);
                    return { success: 1, file: { url: url } };
                  } catch (error) {
                    console.error("Upload failed:", error);
                    return { success: 0 };
                  }
                },
                uploadByUrl(url) {
                  return Promise.resolve({ success: 1, file: { url: url } });
                },
              },
            },
          };
        }

        if (typeof Quote !== "undefined") {
          toolsConfig.quote = {
            class: Quote,
            inlineToolbar: true,
            config: {
              quotePlaceholder: "Sitat tekst",
              captionPlaceholder: "Forfatter",
            },
          };
        }

        if (typeof Delimiter !== "undefined") {
          toolsConfig.delimiter = Delimiter;
        }

        // Video tool – custom YoutubeVideoTool (defined above, always available)
        toolsConfig.youtubeVideo = {
          class: YoutubeVideoTool,
        };

        // Unsplash tool – custom UnsplashImageTool
        toolsConfig.unsplash = {
          class: UnsplashImageTool,
        };

        console.log(
          "Final EditorJS Tools Config Keys:",
          Object.keys(toolsConfig),
        );

        const shouldUseDocsLikeEditor = [
          "blog",
          "teaching",
          "podcast_transcripts",
        ].includes(collectionId);
        let editor;
        let editorUndo = null;
        let toolbarListenersAttached = false;
        let editorSurfaceListenersAttachedTo = null;
        let selectionChangeHandler = null;
        const getEditorHolder = () =>
          modal.querySelector(`#${CSS.escape(editorHolderId)}`);
        const getEditorRoot = () => {
          const holder = getEditorHolder();
          return holder?.querySelector(".codex-editor") || holder || null;
        };
        const getEditorRedactor = () => {
          const holder = getEditorHolder();
          return (
            holder?.querySelector(".codex-editor__redactor") || holder || null
          );
        };
        const getEditorEditable = () => {
          const holder = getEditorHolder();
          return holder?.querySelector('[contenteditable="true"]') || null;
        };
        const getEditorContact = () => {
          const holder = getEditorHolder();
          const root = getEditorRoot();
          const redactor = getEditorRedactor();
          const editable = getEditorEditable();
          const hasShell = !!(
            holder &&
            root &&
            redactor &&
            modal.contains(holder) &&
            document.body.contains(modal)
          );
          return {
            holder,
            root,
            redactor,
            editable,
            hasShell,
            hasBlocks: !!root?.querySelector(".ce-block"),
            connected: hasShell,
          };
        };
        const assertEditorContact = (context = "editor") => {
          const contact = getEditorContact();
          if (!contact.connected) {
            console.warn(
              `[AdminManager] Editor contact incomplete (${context})`,
              {
                hasHolder: !!contact.holder,
                hasRoot: !!contact.root,
                hasRedactor: !!contact.redactor,
                hasEditable: !!contact.editable,
                hasBlocks: contact.hasBlocks,
                modalConnected: document.body.contains(modal),
                holderId: editorHolderId,
                activeEditorMatches: this._activeEditorInstance === editor,
              },
            );
          }
          return contact;
        };

        // --- Editor Initialization ---
        if (shouldUseDocsLikeEditor) {
          console.log(
            "[AdminManager] Initializing Single Surface (Docs-like) Editor for:",
            collectionId,
          );
          const holder = getEditorHolder();
          if (holder) {
            holder.classList.add("docs-rte-surface");
            holder.setAttribute("contenteditable", "true");
            holder.setAttribute("spellcheck", "true");
            holder.style.outline = "none";
            holder.style.minHeight = "600px";

            // Convert blocks to HTML for the single surface
            const initialHtml = this.editorJsBlocksToHtml(
              editorData?.blocks || [],
            );
            holder.innerHTML = initialHtml || "<p><br></p>";

            // Mock EditorJS instance for compatibility with save/tools
            editor = {
              save: async () => {
                const html = holder.innerHTML;
                return this.htmlToEditorJsBlocks(html);
              },
              destroy: () => {
                holder.removeAttribute("contenteditable");
                holder.innerHTML = "";
              },
              blocks: {
                insert: (type, data) => {
                  // Fallback for programmatic inserts in Single Surface mode
                  let html = "";
                  if (type === "header") {
                    html = `<h${data.level || 2}>${data.text || ""}</h${data.level || 2}>`;
                  } else if (type === "list") {
                    const items = (data.items || [])
                      .map((i) => `<li>${i}</li>`)
                      .join("");
                    html =
                      data.style === "ordered"
                        ? `<ol>${items}</ol>`
                        : `<ul>${items}</ul>`;
                  } else if (type === "quote") {
                    html = `<blockquote><p>${data.text || ""}</p><cite>${data.caption || ""}</cite></blockquote>`;
                  } else if (type === "delimiter") {
                    html = `<hr>`;
                  } else {
                    // Default to paragraph
                    html = `<p>${data.text || ""}</p>`;
                  }

                  // Robust insertion to prevent style leakage
                  holder.focus();
                  // Add a dummy paragraph to reset formatting context if needed
                  document.execCommand(
                    "insertHTML",
                    false,
                    html + "<p><br></p>",
                  );
                },
              },
            };

            // Ensure focus works on the whole paper
            const paper = modal.querySelector(".editor-paper");
            if (paper) {
              paper.onclick = (e) => {
                if (e.target === paper) holder.focus();
              };
            }

            // Expose for toolbar handlers
            this._activeEditorInstance = editor;

            // Initialize image behaviors for single surface
            this._initImageReplaceBehavior(
              editor,
              editorHolderId,
              collectionId,
            );

            holder.addEventListener("input", () => {
              if (typeof triggerAutosave === "function") triggerAutosave();
            });
          }
        } else {
          // Standard Block-based EditorJS
          editor = new EditorJS({
            holder: editorHolderId,
            data: editorData,
            placeholder: 'Trykk "/" for å velge blokker...',
            tools: toolsConfig,
            logLevel: "ERROR",
            onChange: () => {
              if (typeof triggerAutosave === "function") triggerAutosave();
            },
            onReady: () => {
              this._activeEditorInstance = editor;
              assertEditorContact("onReady");
              this._initImageReplaceBehavior(
                editor,
                editorHolderId,
                collectionId,
              );
              if (typeof Undo !== "undefined") {
                try {
                  editorUndo = new Undo({
                    editor,
                    maxLength: 100,
                    config: {
                      debounceTimer: 150,
                      shortcuts: {
                        undo: ["CMD+Z"],
                        redo: ["CMD+SHIFT+Z", "CMD+Y"],
                      },
                    },
                  });
                  editorUndo.initialize(editorData || { blocks: [] });
                } catch (error) {
                  console.warn(
                    "Could not initialize editor undo history:",
                    error,
                  );
                }
              }
            },
          });
        }

        // Common editor surface utilities
        const getDocsSurface = () => getEditorHolder();
        let lastSelectionSnapshot = null;
        let headingSelectionPending = false;

        const splitTextToItems = (rawText) => {
          const text = String(rawText || "")
            .replace(/\r\n/g, "\n")
            .replace(/[\u2028\u2029]/g, "\n")
            .replace(/\u00A0/g, " ")
            .trim();
          if (!text) return [];

          const clean = (line) =>
            String(line || "")
              .replace(/^[-*•]\s+/, "")
              .trim();

          // Split ONLY by newlines for a standard Word-like experience
          // Sentence-splitting was too aggressive and counter-intuitive.
          return text.split(/\n+/).map(clean).filter(Boolean);
        };

        const getRangeElement = (range) => {
          if (!range) return null;
          const node = range.commonAncestorContainer;
          return node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        };

        const getBlockElementFromNode = (node) => {
          if (!node) return null;
          const el =
            node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          return el?.closest?.(".ce-block") || null;
        };

        const getBlockIndexFromElement = (blockEl) => {
          const surface = getDocsSurface();
          if (!surface || !blockEl) return -1;
          return Array.from(surface.querySelectorAll(".ce-block")).indexOf(
            blockEl,
          );
        };

        const selectionRangeStillValid = (range) => {
          const surface = getEditorRoot();
          const el = getRangeElement(range);
          return !!(range && surface && el && surface.contains(el));
        };

        const buildSelectionSnapshot = (range) => {
          if (!selectionRangeStillValid(range)) return null;
          const surface = getEditorRoot();
          const allBlocks = Array.from(
            surface?.querySelectorAll(".ce-block") || [],
          );
          const startBlock = getBlockElementFromNode(range.startContainer);
          const endBlock = getBlockElementFromNode(range.endContainer);
          let startIndex = allBlocks.indexOf(startBlock);
          let endIndex = allBlocks.indexOf(endBlock);

          if (startIndex === -1 && startBlock)
            startIndex = getBlockIndexFromElement(startBlock);
          if (endIndex === -1 && endBlock)
            endIndex = getBlockIndexFromElement(endBlock);
          if (startIndex !== -1 && endIndex !== -1 && startIndex > endIndex) {
            [startIndex, endIndex] = [endIndex, startIndex];
          }

          return {
            range: range.cloneRange(),
            text: String(range.toString() || "").trim(),
            startIndex,
            endIndex,
          };
        };

        const getBlockEditableContent = (blockEl) => {
          if (!blockEl) return null;
          return (
            blockEl.querySelector(
              '[contenteditable="true"], .ce-paragraph, .ce-header, .cdx-block',
            ) || blockEl
          );
        };

        const normalizeRangeText = (value) =>
          String(value || "")
            .replace(/\s+/g, " ")
            .trim();

        const getSelectionSurroundingText = (range) => {
          if (!selectionRangeStillValid(range)) return null;

          const startBlock = getBlockElementFromNode(range.startContainer);
          const endBlock = getBlockElementFromNode(range.endContainer);
          if (!startBlock || !endBlock) return null;

          const startContent = getBlockEditableContent(startBlock);
          const endContent = getBlockEditableContent(endBlock);
          let prefix = "";
          let suffix = "";

          try {
            if (startContent && startContent.contains(range.startContainer)) {
              const beforeRange = document.createRange();
              beforeRange.selectNodeContents(startContent);
              beforeRange.setEnd(range.startContainer, range.startOffset);
              prefix = normalizeRangeText(beforeRange.toString());
            }

            if (endContent && endContent.contains(range.endContainer)) {
              const afterRange = document.createRange();
              afterRange.selectNodeContents(endContent);
              afterRange.setStart(range.endContainer, range.endOffset);
              suffix = normalizeRangeText(afterRange.toString());
            }
          } catch (error) {
            console.warn("Could not read surrounding selection text:", error);
          }

          return { prefix, suffix, startBlock, endBlock };
        };

        const htmlToPlainText = (html) => {
          const doc = new DOMParser().parseFromString(
            String(html || ""),
            "text/html",
          );
          return String(doc.body?.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
        };

        const escapeEditorHtml = (value) =>
          this.escapeHtml(String(value || ""));

        const blockSaveToPlainText = (saved) => {
          const type = String(saved?.name || saved?.type || "").toLowerCase();
          const data = saved?.data || saved || {};
          if (type === "list" || Array.isArray(data.items)) {
            return (data.items || [])
              .map((item) =>
                typeof item === "string"
                  ? item
                  : item?.content || item?.text || "",
              )
              .filter(Boolean)
              .join("\n");
          }
          if (type === "quote") return String(data.text || "").trim();
          return htmlToPlainText(data.text || data.caption || "");
        };

        const convertSelectionToParagraphs = async () => {
          const currentEditor = this._activeEditorInstance;
          if (!currentEditor?.blocks) return;

          const selectedBlocks = getSelectedBlocks();
          let targetIndex = -1;
          let count = 0;

          if (selectedBlocks.length) {
            const firstBlock = selectedBlocks[0].closest(".ce-block");
            targetIndex = getBlockIndexFromElement(firstBlock);
            count = selectedBlocks.length;
          } else {
            targetIndex = currentEditor.blocks.getCurrentBlockIndex();
            count = targetIndex >= 0 ? 1 : 0;
          }

          if (targetIndex < 0 || count < 1) {
            exec("formatBlock", "p");
            return;
          }

          const paragraphs = [];
          for (let i = 0; i < count; i++) {
            const block = currentEditor.blocks.getBlockByIndex(targetIndex + i);
            const saved = await block?.save?.();
            const text =
              blockSaveToPlainText(saved) ||
              String(block?.holder?.textContent || "").trim();
            const lines = String(text || "")
              .split(/\n+/)
              .map((line) => line.trim())
              .filter(Boolean);
            paragraphs.push(...(lines.length ? lines : [""]));
          }

          for (let i = 0; i < paragraphs.length; i++) {
            await currentEditor.blocks.insert(
              "paragraph",
              { text: escapeEditorHtml(paragraphs[i]) },
              {},
              targetIndex + i,
            );
          }
          for (let i = 0; i < count; i++) {
            await currentEditor.blocks.delete(targetIndex + paragraphs.length);
          }
          currentEditor.caret.setToBlock(targetIndex);
        };

        const replaceSelectionWithList = async (ordered) => {
          const currentEditor = this._activeEditorInstance;
          const contact = assertEditorContact("list-command");
          if (
            !currentEditor ||
            !currentEditor.blocks ||
            !contact.holder ||
            !contact.root
          ) {
            this.showToast(
              "Editorområdet er ikke klart ennå. Klikk i teksten og prøv igjen.",
              "warning",
              4500,
            );
            return;
          }

          try {
            // Force a selection check to ensure we have the latest range before focus is lost
            saveSelectionRange();

            if (
              currentEditor.isReady &&
              typeof currentEditor.isReady.then === "function"
            ) {
              await currentEditor.isReady;
            }

            const sel = window.getSelection();
            if (
              (!sel || sel.rangeCount === 0 || sel.isCollapsed) &&
              selectionRangeStillValid(this._lastDocsSelectionRange)
            ) {
              sel.removeAllRanges();
              sel.addRange(this._lastDocsSelectionRange);
            }

            const liveRange =
              sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
            const liveSnapshot = buildSelectionSnapshot(liveRange);
            const savedSnapshot =
              buildSelectionSnapshot(this._lastDocsSelectionRange) ||
              lastSelectionSnapshot;
            const activeSnapshot = liveSnapshot?.text
              ? liveSnapshot
              : savedSnapshot;

            let items = [];
            let targetIndex = -1;
            let blocksToRemove = 0;
            let prefixText = "";
            let suffixText = "";

            // Phase 1: Identify what to convert
            if (activeSnapshot?.text) {
              items = splitTextToItems(activeSnapshot.text);
              targetIndex = activeSnapshot.startIndex;
              const endIndex = activeSnapshot.endIndex;
              blocksToRemove =
                targetIndex !== -1 && endIndex !== -1
                  ? endIndex - targetIndex + 1
                  : 1;

              const surrounding = getSelectionSurroundingText(
                activeSnapshot.range,
              );
              if (surrounding) {
                prefixText = surrounding.prefix;
                suffixText = surrounding.suffix;
              }
            } else {
              const selectedBlocks = getSelectedBlocks();
              if (selectedBlocks.length > 0) {
                const firstBlockEl = selectedBlocks[0].closest(".ce-block");
                targetIndex = getBlockIndexFromElement(firstBlockEl);
                blocksToRemove = selectedBlocks.length;

                for (const contentEl of selectedBlocks) {
                  items.push(...splitTextToItems(contentEl.textContent));
                }
              } else {
                targetIndex = currentEditor.blocks.getCurrentBlockIndex();
                if (targetIndex >= 0) {
                  const block =
                    currentEditor.blocks.getBlockByIndex(targetIndex);
                  const saved = await block?.save();
                  // Toggle OFF if it's already a list
                  if (saved?.type === "list" || saved?.name === "list") {
                    const listData = saved.data || saved || {};
                    const listItems = listData.items || [];
                    for (let i = 0; i < listItems.length; i++) {
                      await currentEditor.blocks.insert(
                        "paragraph",
                        { text: listItems[i] },
                        {},
                        targetIndex + i,
                      );
                    }
                    await currentEditor.blocks.delete(
                      targetIndex + listItems.length,
                    );
                    return;
                  }
                  items = splitTextToItems(block?.holder?.textContent || "");
                  blocksToRemove = 1;
                }
              }
            }

            if (targetIndex === -1) return;
            if (items.length === 0) items = [""];

            // Phase 2: Atomic-like replacement
            let insertOffset = 0;
            if (prefixText) {
              await currentEditor.blocks.insert(
                "paragraph",
                { text: escapeEditorHtml(prefixText) },
                {},
                targetIndex + insertOffset,
              );
              insertOffset++;
            }

            const listIndex = targetIndex + insertOffset;
            await currentEditor.blocks.insert(
              "list",
              {
                style: ordered ? "ordered" : "unordered",
                items,
              },
              {},
              listIndex,
            );
            insertOffset++;

            if (suffixText) {
              await currentEditor.blocks.insert(
                "paragraph",
                { text: escapeEditorHtml(suffixText) },
                {},
                targetIndex + insertOffset,
              );
              insertOffset++;
            }

            // DELETE in reverse order to keep indices stable during the process
            for (let i = blocksToRemove - 1; i >= 0; i--) {
              await currentEditor.blocks.delete(targetIndex + insertOffset + i);
            }

            setTimeout(() => {
              currentEditor.caret.setToBlock(listIndex, "end");
              if (typeof updateActiveStates === "function")
                updateActiveStates();
            }, 50);
          } catch (err) {
            console.error("Critical List Error:", err);
            const listTag = ordered ? "ol" : "ul";
            const fallbackItems = splitTextToItems(
              lastSelectionSnapshot?.text || "",
            );
            if (fallbackItems.length) {
              const html = `<${listTag}>${fallbackItems.map((item) => `<li>${escapeEditorHtml(item)}</li>`).join("")}</${listTag}>`;
              exec("insertHTML", html);
            }
          }
        };

        // --- Scoped Selection Engine (Modal-Aware) ---
        const getActiveSurface = () => {
          return getEditorRoot();
        };

        const selectionInsideSurface = () => {
          const surface = getActiveSurface();
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0 || !surface) return null;
          const range = sel.getRangeAt(0);
          const node = range.commonAncestorContainer;
          const el =
            node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
          if (!el || !surface.contains(el)) return null;
          return { sel, range, surface };
        };

        const saveSelectionRange = () => {
          const ctx = selectionInsideSurface();
          if (!ctx) return;
          // Opening a toolbar select can collapse the live selection on mobile.
          // Keep the highlighted range until the formatting command runs.
          const toolbar = modal.querySelector("#desktop-richtools");
          if (
            ctx.range.collapsed &&
            (headingSelectionPending ||
              toolbar?.contains(document.activeElement)) &&
            selectionRangeStillValid(this._lastDocsSelectionRange) &&
            !this._lastDocsSelectionRange.collapsed
          )
            return;
          this._lastDocsSelectionRange = ctx.range.cloneRange();
          lastSelectionSnapshot = buildSelectionSnapshot(ctx.range);
        };

        const restoreSelectionRange = () => {
          const ctx = selectionInsideSurface();
          if (ctx && !this._lastDocsSelectionRange) return true;

          const sel = window.getSelection();
          const range = selectionRangeStillValid(this._lastDocsSelectionRange)
            ? this._lastDocsSelectionRange
            : null;
          const surface = getActiveSurface();

          if (range && sel) {
            try {
              sel.removeAllRanges();
              sel.addRange(range);
              return true;
            } catch (e) {
              console.warn("Range restoration failed", e);
            }
          }

          if (surface) {
            surface.focus({ preventScroll: true });
            return true;
          }
          return false;
        };

        const exec = (command, value = null) => {
          let range = selectionRangeStillValid(this._lastDocsSelectionRange)
            ? this._lastDocsSelectionRange
            : null;
          const sel = window.getSelection();
          const surface = getActiveSurface();

          if (!range && sel && sel.rangeCount > 0) {
            const currentRange = sel.getRangeAt(0);
            const node = currentRange.commonAncestorContainer;
            const el =
              node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            if (surface && surface.contains(el)) {
              range = currentRange;
              this._lastDocsSelectionRange = range.cloneRange();
            }
          }

          if (range) {
            try {
              const container = range.commonAncestorContainer;
              const el =
                container.nodeType === Node.TEXT_NODE
                  ? container.parentElement
                  : container;
              const focusTarget = el.closest('[contenteditable="true"]');
              // On mobile, focusing after restoring a range collapses the selection.
              if (focusTarget) focusTarget.focus({ preventScroll: true });
              sel.removeAllRanges();
              sel.addRange(range);
            } catch (err) {
              console.warn("Exec: selection restore failed:", err);
            }
          } else {
            const editable =
              getEditorEditable() ||
              surface?.querySelector?.('[contenteditable="true"]');
            if (editable) editable.focus({ preventScroll: true });
          }

          try {
            document.execCommand(command, false, value);
            setTimeout(() => saveSelectionRange(), 20);
          } catch (err) {
            console.error(`execCommand failed for ${command}:`, err);
          }
        };

        const getSelectedBlocks = () => {
          const holder = getEditorRoot();
          const sel = window.getSelection();
          let range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

          // Fallback to last known range if live selection is lost (e.g. on button click)
          if (
            (!range || range.collapsed) &&
            selectionRangeStillValid(this._lastDocsSelectionRange)
          ) {
            range = this._lastDocsSelectionRange;
          }

          if (!range || !holder) return [];

          const startNode = range.startContainer;
          const endNode = range.endContainer;

          const getBlockEl = (node) => {
            if (!node) return null;
            const el =
              node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            return el.closest(".ce-block");
          };

          const startBlock = getBlockEl(startNode);
          const endBlock = getBlockEl(endNode);
          const allBlocks = Array.from(holder.querySelectorAll(".ce-block"));

          // Precise contiguous block selection
          if (
            startBlock &&
            endBlock &&
            holder.contains(startBlock) &&
            holder.contains(endBlock)
          ) {
            let startIndex = allBlocks.indexOf(startBlock);
            let endIndex = allBlocks.indexOf(endBlock);
            if (startIndex !== -1 && endIndex !== -1) {
              if (startIndex > endIndex)
                [startIndex, endIndex] = [endIndex, startIndex];
              const selected = [];
              for (let i = startIndex; i <= endIndex; i++) {
                const content = allBlocks[i].querySelector(
                  '[contenteditable="true"], .ce-paragraph, .ce-header, .cdx-block, p, h1, h2, h3, h4, h5, h6',
                );
                if (content) selected.push(content);
              }
              return selected;
            }
          }

          // Fallback to intersection if boundary logic fails
          const selected = [];
          allBlocks.forEach((block) => {
            try {
              if (range.intersectsNode(block)) {
                const content = block.querySelector(
                  '[contenteditable="true"], .ce-paragraph, .ce-header, .cdx-block, p, h1, h2, h3, h4, h5, h6',
                );
                if (content) selected.push(content);
              }
            } catch (e) {}
          });
          return selected;
        };

        const applyStyleToSelectedBlocks = (mutator) => {
          if (shouldUseDocsLikeEditor) {
            const surface = getDocsSurface();
            const range = selectionRangeStillValid(this._lastDocsSelectionRange)
              ? this._lastDocsSelectionRange
              : selectionInsideSurface()?.range;
            if (!surface || !range) return;
            const blocks = Array.from(surface.children).filter((el) =>
              /^(P|DIV|H[1-6]|BLOCKQUOTE|UL|OL)$/.test(el.tagName),
            );
            blocks
              .filter((block) => range.intersectsNode(block))
              .forEach(mutator);
            return;
          }
          const selectedBlocks = getSelectedBlocks();
          if (selectedBlocks.length) {
            selectedBlocks.forEach(mutator);
            return;
          }

          const activeIndex = editor?.blocks?.getCurrentBlockIndex?.();
          if (typeof activeIndex === "number" && activeIndex >= 0) {
            const block = editor.blocks.getBlockByIndex(activeIndex);
            const target = block?.holder?.querySelector?.(
              '[contenteditable="true"], .ce-paragraph, .ce-header, .cdx-block',
            );
            if (target) mutator(target);
          }
        };

        const desktopTools = modal.querySelector("#desktop-richtools");
        if (desktopTools) {
          const updateActiveStates = async () => {
            const holder = modal.querySelector(".docs-rte-surface");
            const isDocs =
              !!holder && holder.getAttribute("contenteditable") === "true";

            const states = {
              bold: document.queryCommandState("bold"),
              italic: document.queryCommandState("italic"),
              underline: document.queryCommandState("underline"),
              strike: document.queryCommandState("strikeThrough"),
              list: document.queryCommandState("insertUnorderedList"),
              orderedList: document.queryCommandState("insertOrderedList"),
              link: !!document
                .getSelection()
                ?.anchorNode?.parentElement?.closest("a"),
            };

            // Detect Heading levels for visual feedback
            if (isDocs) {
              try {
                let currentTag = "p";
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                  let node = sel.anchorNode;
                  // Walk up to the surface root to find a block tag
                  while (node && node !== holder) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                      const tag = node.tagName.toLowerCase();
                      if (/^h[1-6]$/.test(tag)) {
                        currentTag = tag;
                        break;
                      }
                      if (tag === "blockquote") {
                        currentTag = "blockquote";
                        break;
                      }
                    }
                    node = node.parentNode;
                  }
                }

                // Fallback to legacy queryCommandValue if DOM check found nothing but the browser knows better
                if (currentTag === "p") {
                  const blockValue = document.queryCommandValue("formatBlock");
                  const qTag = String(blockValue || "").toLowerCase();
                  if (/^h[1-6]$/.test(qTag)) currentTag = qTag;
                  if (qTag === "blockquote") currentTag = qTag;
                }

                const normalizedBlock = currentTag;
                states.paragraph = normalizedBlock === "p";
                states.h1 = normalizedBlock === "h1";
                states.h2 = normalizedBlock === "h2";
                states.h3 = normalizedBlock === "h3";
                states.h4 = normalizedBlock === "h4";
                states.h5 = normalizedBlock === "h5";
                states.h6 = normalizedBlock === "h6";
                states.blockquote = normalizedBlock === "blockquote";

                // Sync the select menu
                const headingSelect = desktopTools.querySelector(
                  '[data-tool-select="headingLevel"]',
                );
                if (headingSelect) headingSelect.value = normalizedBlock;

                // Sync Spacing controls
                if (sel && sel.rangeCount > 0) {
                  const container = sel.getRangeAt(0).commonAncestorContainer;
                  const el =
                    container.nodeType === Node.TEXT_NODE
                      ? container.parentElement
                      : container;
                  const block =
                    el.closest('[contenteditable="true"] > *') || el;

                  if (block) {
                    const computed = window.getComputedStyle(block);

                    const fontSizeSelect = desktopTools.querySelector(
                      '[data-tool-select="fontSize"]',
                    );
                    if (fontSizeSelect) {
                      const px = parseFloat(computed.fontSize);
                      const val = Math.round(px).toString();
                      if (
                        Array.from(fontSizeSelect.options).some(
                          (o) => o.value === val,
                        )
                      ) {
                        fontSizeSelect.value = val;
                      }
                    }

                    const lhSelect = desktopTools.querySelector(
                      '[data-tool-select="lineHeight"]',
                    );
                    if (lhSelect) {
                      // Line height is tricky, usually unitless in style or px
                      const lh = block.style.lineHeight || "normal";
                      if (
                        Array.from(lhSelect.options).some((o) => o.value === lh)
                      ) {
                        lhSelect.value = lh;
                      }
                    }

                    const psSelect = desktopTools.querySelector(
                      '[data-tool-select="paragraphSpacing"]',
                    );
                    if (psSelect) {
                      const mb = block.style.marginBottom;
                      const val = mb.replace("em", "");
                      if (
                        Array.from(psSelect.options).some(
                          (o) => o.value === val,
                        )
                      ) {
                        psSelect.value = val;
                      }
                    }

                    const lsSelect = desktopTools.querySelector(
                      '[data-tool-select="letterSpacing"]',
                    );
                    if (lsSelect) {
                      const ls = block.style.letterSpacing || "normal";
                      const val = ls.replace("em", "");
                      if (
                        Array.from(lsSelect.options).some(
                          (o) => o.value === val,
                        )
                      ) {
                        lsSelect.value = val;
                      }
                    }
                  }
                }
              } catch (e) {}
            } else {
              // Check block state for EditorJS mode
              const activeIndex =
                this._activeEditorInstance?.blocks?.getCurrentBlockIndex();
              if (typeof activeIndex === "number" && activeIndex >= 0) {
                const block =
                  this._activeEditorInstance.blocks.getBlockByIndex(
                    activeIndex,
                  );
                const type = (block?.name || block?.type || "").toLowerCase();
                states.paragraph = type === "paragraph";
                states.h1 = type === "header" && block.data?.level === 1;
                states.h2 = type === "header" && block.data?.level === 2;
                states.h3 = type === "header" && block.data?.level === 3;
                states.list = type === "list";
                // ... other states as needed
              }
            }

            desktopTools
              .querySelectorAll(".desktop-richtools-btn")
              .forEach((btn) => {
                const tool = btn.getAttribute("data-tool");
                if (states[tool]) {
                  btn.classList.add("is-active");
                } else {
                  btn.classList.remove("is-active");
                }
              });
          };

          // Common handlers for both modes
          const commonHandlers = {
            undo: async () => {
              if (
                editorUndo &&
                typeof editorUndo.undo === "function" &&
                (!editorUndo.canUndo || editorUndo.canUndo())
              ) {
                await editorUndo.undo();
                return;
              }
              exec("undo");
            },
            redo: async () => {
              if (
                editorUndo &&
                typeof editorUndo.redo === "function" &&
                (!editorUndo.canRedo || editorUndo.canRedo())
              ) {
                await editorUndo.redo();
                return;
              }
              exec("redo");
            },
            bold: () => exec("bold"),
            italic: () => exec("italic"),
            underline: () => exec("underline"),
            strike: () => exec("strikeThrough"),
            list: () => replaceSelectionWithList(false),
            orderedList: () => replaceSelectionWithList(true),
            link: () => {
              const ctx = selectionInsideSurface();
              if (!ctx || !ctx.sel || ctx.sel.isCollapsed) {
                window.alert("Marker tekst før du legger til lenke.");
                return;
              }
              this.openProductLinkModal((url) => {
                exec("createLink", url);
              });
            },
          };

          const insertChecklist = () => {
            const ctx = selectionInsideSurface();
            let items = [];

            if (ctx && !ctx.sel.isCollapsed) {
              const selectedText = String(ctx.sel.toString() || "").trim();
              items = splitTextToItems(selectedText);
            }

            if (!items.length) items = ["Ny oppgave"];

            const checklistHtml = `<ul>${items.map((t) => `<li>${escapeEditorHtml(`${t}`)}</li>`).join("")}</ul>`;
            exec("insertHTML", checklistHtml);
          };

          const toolHandlers = shouldUseDocsLikeEditor
            ? {
                ...commonHandlers,
                paragraph: () => exec("formatBlock", "p"),
                h1: () => {
                  exec("formatBlock", "h1");
                  // Edge case fix: if formatBlock produced a div with h1 inside, or failed
                  // we don't do much here to avoid complexity, but ensured CSS handles it.
                },
                h2: () => exec("formatBlock", "h2"),
                h3: () => exec("formatBlock", "h3"),
                h4: () => exec("formatBlock", "h4"),
                h5: () => exec("formatBlock", "h5"),
                h6: () => exec("formatBlock", "h6"),
                list: () => exec("insertUnorderedList"),
                orderedList: () => exec("insertOrderedList"),
                removeFormat: () => {
                  exec("removeFormat");
                  // Also clear styles for full cleanup
                  const sel = window.getSelection();
                  if (sel && !sel.isCollapsed) {
                    exec("formatBlock", "p");
                  }
                },
                outdent: () => exec("outdent"),
                indent: () => exec("indent"),
                checklist: () => insertChecklist(),
                textColor: () => {
                  const input = desktopTools.querySelector(
                    '[data-color-input="text"]',
                  );
                  if (input) input.click();
                },
                highlightColor: () => {
                  const input = desktopTools.querySelector(
                    '[data-color-input="highlight"]',
                  );
                  if (input) input.click();
                },
                image: () => {
                  const fileInput = document.createElement("input");
                  fileInput.type = "file";
                  fileInput.accept = "image/*";
                  fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                      this.showToast("Laster opp bilde...", "info");
                      const url = await this.handleImageUpload(
                        file,
                        this.currentMediaPath || "editor/blog",
                      );
                      const imgHtml = `<img src="${url}" alt="" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;">`;
                      exec("insertHTML", imgHtml);
                      this.showToast("Bilde lastet opp!", "success");
                    } catch (err) {
                      this.showToast("Opplasting feilet.", "error");
                    }
                  };
                  fileInput.click();
                },
                "media-library": () => {
                  this.openMediaLibraryModal((selection) => {
                    if (selection && selection.url) {
                      const imgHtml = `<img src="${selection.url}" alt="${selection.name || ""}" style="max-width:100%; height:auto; border-radius:8px; margin: 16px 0; display: block;">`;
                      exec("insertHTML", imgHtml);
                    }
                  });
                },
                quote: () => exec("formatBlock", "blockquote"),
                video: () => {
                  this.openVideoManagerModal((selection) => {
                    if (selection) {
                      if (selection.type === "youtube") {
                        const getYouTubeId = (url) => {
                          if (!url) return null;
                          const m = url.match(
                            /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
                          );
                          return m ? m[1] : null;
                        };
                        const videoId = getYouTubeId(selection.url);
                        if (videoId) {
                          const embedHtml = `<div class="youtube-embed" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px; margin:16px 0;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe></div><p></p>`;
                          exec("insertHTML", embedHtml);
                          this.showToast("YouTube-video lagt til!", "success");
                        } else {
                          this.showToast("Ugyldig YouTube-URL.", "error");
                        }
                      } else if (selection.type === "file") {
                        const videoHtml = `<video src="${selection.url}" controls style="width:100%; max-height:480px; border-radius:8px; margin:16px 0; display:block; background:#000;"></video><p></p>`;
                        exec("insertHTML", videoHtml);
                        this.showToast("Video lagt til!", "success");
                      }
                    }
                  });
                },
              }
            : {
                ...commonHandlers,
                paragraph: () =>
                  editor.blocks.insert(
                    "paragraph",
                    { text: "" },
                    undefined,
                    undefined,
                    true,
                  ),
                header: () =>
                  editor.blocks.insert(
                    "header",
                    { text: "", level: 2 },
                    undefined,
                    undefined,
                    true,
                  ),
                list: () => replaceSelectionWithList(false),
                orderedList: () => replaceSelectionWithList(true),
                image: () =>
                  editor.blocks.insert("image", {}, undefined, undefined, true),
                "media-library": () => {
                  this.openMediaLibraryModal((selection) => {
                    if (selection && selection.url) {
                      editor.blocks.insert(
                        "image",
                        {
                          file: { url: selection.url },
                          caption: selection.name || "",
                          withBorder: false,
                          withBackground: false,
                          stretched: false,
                        },
                        undefined,
                        undefined,
                        true,
                      );
                    }
                  });
                },
                quote: () =>
                  editor.blocks.insert(
                    "quote",
                    { text: "", caption: "" },
                    undefined,
                    undefined,
                    true,
                  ),
                delimiter: () =>
                  editor.blocks.insert(
                    "delimiter",
                    {},
                    undefined,
                    undefined,
                    true,
                  ),
                youtubeVideo: () => {
                  this.openVideoManagerModal((selection) => {
                    if (selection) {
                      if (selection.type === "youtube") {
                        editor.blocks.insert(
                          "youtubeVideo",
                          { url: selection.url },
                          undefined,
                          undefined,
                          true,
                        );
                      } else {
                        editor.blocks.insert(
                          "youtubeVideo",
                          { fileUrl: selection.url },
                          undefined,
                          undefined,
                          true,
                        );
                      }
                    }
                  });
                },
                video: () => {
                  this.openVideoManagerModal((selection) => {
                    if (selection) {
                      if (selection.type === "youtube") {
                        editor.blocks.insert(
                          "youtubeVideo",
                          { url: selection.url },
                          undefined,
                          undefined,
                          true,
                        );
                      } else {
                        editor.blocks.insert(
                          "youtubeVideo",
                          { fileUrl: selection.url },
                          undefined,
                          undefined,
                          true,
                        );
                      }
                    }
                  });
                },
              };

          // --- High-Reliability Event Delegation for Toolbar ---
          // Only attach the delegation listener ONCE to the container
          if (!toolbarListenersAttached) {
            toolbarListenersAttached = true;
            desktopTools.style.pointerEvents = "auto";
            // Keep the selected text when a touch moves focus to the toolbar.
            desktopTools.addEventListener(
              "pointerdown",
              saveSelectionRange,
              true,
            );
            desktopTools.addEventListener("touchstart", saveSelectionRange, {
              capture: true,
              passive: true,
            });
            const headingSelect = desktopTools.querySelector(
              '[data-tool-select="headingLevel"]',
            );
            const preserveHeadingSelection = () => {
              saveSelectionRange();
              headingSelectionPending = true;
            };
            headingSelect?.addEventListener(
              "pointerdown",
              preserveHeadingSelection,
              true,
            );
            headingSelect?.addEventListener(
              "touchstart",
              preserveHeadingSelection,
              { capture: true, passive: true },
            );

            desktopTools.addEventListener(
              "click",
              async (e) => {
                const btn = e.target.closest(".desktop-richtools-btn");
                if (
                  !btn ||
                  btn.disabled ||
                  btn.classList.contains("is-disabled")
                )
                  return;
                if (btn.dataset.pointerHandled === "true") {
                  delete btn.dataset.pointerHandled;
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }

                // Always get the latest toolHandlers from the current editor context
                // We store the current handlers on the element itself for easy access
                const currentHandlers = desktopTools._currentHandlers;
                const tool = btn.getAttribute("data-tool");
                const handler = currentHandlers ? currentHandlers[tool] : null;

                if (handler) {
                  e.preventDefault();
                  e.stopPropagation();

                  // Visual feedback pulse
                  btn.style.transform = "scale(0.95)";
                  setTimeout(() => (btn.style.transform = ""), 100);

                  try {
                    await handler();
                    if (typeof updateActiveStates === "function")
                      updateActiveStates();
                  } catch (err) {
                    console.error(`Toolbar delegation error [${tool}]:`, err);
                  }
                }
              },
              true,
            ); // Use capture phase to be first
          }

          // Update the current handlers for this specific editor session
          desktopTools._currentHandlers = toolHandlers;

          desktopTools
            .querySelectorAll(".desktop-richtools-btn")
            .forEach((btn) => {
              btn.style.pointerEvents = "auto";
              btn.onmousedown = async (e) => {
                saveSelectionRange();
                e.preventDefault();
                e.stopPropagation();

                const tool = btn.getAttribute("data-tool");
                if (tool !== "list" && tool !== "orderedList") return;

                const handler = desktopTools._currentHandlers
                  ? desktopTools._currentHandlers[tool]
                  : null;
                if (!handler) return;

                btn.dataset.pointerHandled = "true";
                btn.style.transform = "scale(0.95)";
                setTimeout(() => (btn.style.transform = ""), 100);

                try {
                  await handler();
                  if (typeof updateActiveStates === "function")
                    updateActiveStates();
                } catch (err) {
                  console.error(`Toolbar pointer error [${tool}]:`, err);
                }
              };
            });

          const textColorInput = desktopTools.querySelector(
            '[data-color-input="text"]',
          );
          if (textColorInput) {
            textColorInput.addEventListener("input", () => {
              if (!textColorInput.value) return;
              exec("styleWithCSS", true);
              exec("foreColor", textColorInput.value);
            });
          }

          const highlightColorInput = desktopTools.querySelector(
            '[data-color-input="highlight"]',
          );
          if (highlightColorInput) {
            highlightColorInput.addEventListener("input", () => {
              if (!highlightColorInput.value) return;
              exec("styleWithCSS", true);
              exec("hiliteColor", highlightColorInput.value);
            });
          }

          const fontSizeSelect = desktopTools.querySelector(
            '[data-tool-select="fontSize"]',
          );
          if (fontSizeSelect) {
            fontSizeSelect.addEventListener("change", () => {
              let val = String(fontSizeSelect.value || "").trim();
              if (val === "custom") {
                val = window.prompt(
                  "Skriv inn skriftstørrelse (kun tall, f.eks 19):",
                  "18",
                );
                if (!val) return;
              }
              const px = parseInt(val, 10);
              if (isNaN(px)) return;
              applyStyleToSelectedBlocks((block) => {
                block.style.fontSize = `${px}px`;
              });
              saveSelectionRange();
            });
          }

          const lineHeightSelect = desktopTools.querySelector(
            '[data-tool-select="lineHeight"]',
          );
          if (lineHeightSelect) {
            lineHeightSelect.addEventListener("change", () => {
              let val = String(lineHeightSelect.value || "").trim();
              if (val === "custom") {
                val = window.prompt(
                  "Skriv inn linjeavstand (f.eks 1.4 eller 1.8):",
                  "1.5",
                );
                if (!val) return;
              }
              if (!val) return;
              applyStyleToSelectedBlocks((block) => {
                block.style.lineHeight = val;
              });
              saveSelectionRange();
            });
          }

          const paragraphSpacingSelect = desktopTools.querySelector(
            '[data-tool-select="paragraphSpacing"]',
          );
          if (paragraphSpacingSelect) {
            paragraphSpacingSelect.addEventListener("change", () => {
              let val = String(paragraphSpacingSelect.value || "").trim();
              if (val === "custom") {
                val = window.prompt(
                  "Skriv inn avsnittsavstand (em, f.eks 1.5):",
                  "1.2",
                );
                if (!val) return;
              }
              if (!val) return;
              applyStyleToSelectedBlocks((block) => {
                block.style.marginBottom = `${val}em`;
              });
              saveSelectionRange();
            });
          }

          const letterSpacingSelect = desktopTools.querySelector(
            '[data-tool-select="letterSpacing"]',
          );
          if (letterSpacingSelect) {
            letterSpacingSelect.addEventListener("change", () => {
              let val = String(letterSpacingSelect.value || "").trim();
              if (val === "custom") {
                val = window.prompt(
                  "Skriv inn bokstavavstand (em, f.eks 0.03):",
                  "0.02",
                );
                if (!val) return;
              }
              if (!val) return;
              applyStyleToSelectedBlocks((block) => {
                block.style.letterSpacing =
                  val === "normal" ? "normal" : `${val}em`;
              });
              saveSelectionRange();
            });
          }

          const headingLevelSelect = desktopTools.querySelector(
            '[data-tool-select="headingLevel"]',
          );
          if (headingLevelSelect) {
            headingLevelSelect.addEventListener("change", () => {
              const val = String(headingLevelSelect.value || "p")
                .trim()
                .toLowerCase();
              if (val) exec("formatBlock", val);
              headingSelectionPending = false;
            });
          }

          // Global listeners for the editor surface
          const attachEditorSurfaceListeners = () => {
            const editorSurface = assertEditorContact("surface-listeners").root;
            if (
              !editorSurface ||
              editorSurfaceListenersAttachedTo === editorSurface
            )
              return;
            editorSurfaceListenersAttachedTo = editorSurface;

            editorSurface.addEventListener("mouseup", () => {
              saveSelectionRange();
              if (typeof updateActiveStates === "function")
                updateActiveStates();
            });

            editorSurface.addEventListener("keyup", () => {
              saveSelectionRange();
              if (typeof updateActiveStates === "function")
                updateActiveStates();
            });

            // Professional Shortcuts (CMD+1 to CMD+6 for headings, CMD+0 for paragraph)
            editorSurface.addEventListener("keydown", (e) => {
              if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
                if (e.key >= "0" && e.key <= "6") {
                  e.preventDefault();
                  const level = e.key === "0" ? "p" : `h${e.key}`;
                  exec("formatBlock", level);
                  if (typeof updateActiveStates === "function")
                    updateActiveStates();
                }
              }
            });

            // Wix/External Paste Sanitizer
            editorSurface.addEventListener("paste", (e) => {
              const html = e.clipboardData.getData("text/html");
              if (
                html &&
                (html.includes("wix-") ||
                  html.includes("mso-") ||
                  html.includes("style="))
              ) {
                e.preventDefault();
                const doc = new DOMParser().parseFromString(html, "text/html");

                // Strip all styles, classes, and meta tags
                doc.querySelectorAll("*").forEach((el) => {
                  el.removeAttribute("style");
                  el.removeAttribute("class");
                  el.removeAttribute("id");
                });

                // Remove non-essential tags but keep structure
                const cleanHtml = doc.body.innerHTML;
                exec("insertHTML", cleanHtml);
                console.log(
                  "Sanitized paste from external source (Wix/Word/etc)",
                );
              }
            });
          };

          if (!selectionChangeHandler) {
            selectionChangeHandler = () => {
              if (!document.body.contains(modal)) {
                document.removeEventListener(
                  "selectionchange",
                  selectionChangeHandler,
                );
                return;
              }
              saveSelectionRange();
            };
            document.addEventListener(
              "selectionchange",
              selectionChangeHandler,
            );
          }

          if (editor?.isReady && typeof editor.isReady.then === "function") {
            editor.isReady
              .then(() => {
                attachEditorSurfaceListeners();
              })
              .catch((error) => {
                console.warn(
                  "Could not attach editor surface listeners after ready:",
                  error,
                );
              });
          } else {
            setTimeout(attachEditorSurfaceListeners, 0);
          }
        }

        // Title Auto-resize logic
        const titleArea = modal.querySelector("#col-item-title-v2");
        const formatToggle = modal.querySelector("#editor-format-toggle");
        formatToggle?.addEventListener("click", () => {
          const isOpen = modal.classList.toggle("editor-formatting-open");
          formatToggle.setAttribute("aria-expanded", String(isOpen));
        });
        if (titleArea) {
          const adjustTitleHeight = () => {
            titleArea.style.height = "auto";
            titleArea.style.height = titleArea.scrollHeight + 10 + "px";
          };
          titleArea.addEventListener("input", adjustTitleHeight);
          // Initial adjustment
          setTimeout(adjustTitleHeight, 10);
        }

        if (collectionId === "podcast_transcripts") {
          const generateAiBtn = document.getElementById(
            "generate-podcast-ai-transcript",
          );
          const generateAiSummaryBtn = document.getElementById(
            "generate-podcast-ai-summary",
          );
          const aiStatus = document.getElementById("podcast-ai-status");
          const summaryField = document.getElementById("col-item-summary");

          const blockToPlainText = (block) => {
            const type = String(block?.type || "").toLowerCase();
            const data = block?.data || {};

            if (type === "header") return String(data.text || "").trim();
            if (type === "list") {
              const items = Array.isArray(data.items) ? data.items : [];
              return items
                .map((item) => {
                  if (typeof item === "string") return item;
                  if (item && typeof item === "object")
                    return item.content || item.text || "";
                  return "";
                })
                .filter(Boolean)
                .join(" ");
            }
            if (type === "quote") return String(data.text || "").trim();
            if (type === "paragraph") return String(data.text || "").trim();
            return String(data.text || "").trim();
          };

          const htmlToPlainText = (value) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(
              String(value || ""),
              "text/html",
            );
            return String(doc.body?.textContent || "")
              .replace(/\s+/g, " ")
              .trim();
          };

          const buildLocalSummarySuggestion = (title, transcriptText) => {
            const cleaned = String(transcriptText || "")
              .replace(/\s+/g, " ")
              .replace(/\b\d{1,3}[.:]\s*/g, "")
              .trim();

            if (!cleaned) return "";

            const sentences = cleaned
              .split(/(?<=[.!?])\s+/)
              .map((s) => s.trim())
              .filter((s) => s.length >= 35)
              .slice(0, 3);

            const core = sentences.join(" ").trim();
            if (!core) return "";

            if (!title) return core;

            return `I denne episoden ${title.toLowerCase().includes("lydbok") ? "får du en lydboklesning" : "får du undervisning"} som tar deg gjennom sentrale poeng i teksten. ${core}`;
          };

          if (generateAiBtn) {
            generateAiBtn.onclick = async () => {
              const episodeId = String(item?.id || "").trim();
              const audioUrl = String(item?.audioUrl || "").trim();

              if (!episodeId) {
                this.showToast(
                  "Mangler episode-ID. Kan ikke generere AI-tekst.",
                  "error",
                  5000,
                );
                return;
              }

              if (!audioUrl) {
                this.showToast(
                  "Fant ingen lydfil for episoden. Kan ikke generere AI-tekst.",
                  "error",
                  5000,
                );
                return;
              }

              const originalBtnHtml = generateAiBtn.innerHTML;
              generateAiBtn.disabled = true;
              generateAiBtn.innerHTML =
                '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Genererer...';
              if (aiStatus) {
                aiStatus.textContent =
                  "Genererer AI-tekst nå. Dette kan ta litt tid...";
                aiStatus.style.color = "#334155";
              }

              try {
                const callable = firebase
                  .functions()
                  .httpsCallable("transcribePodcast");
                await callable({
                  episodeId,
                  audioUrl,
                  episodeTitle: String(item?.title || ""),
                });

                const refreshedDoc = await firebase
                  .firestore()
                  .collection("podcast_transcripts")
                  .doc(episodeId)
                  .get();
                const refreshedData = refreshedDoc.exists
                  ? refreshedDoc.data()
                  : null;

                if (
                  refreshedData &&
                  typeof refreshedData.text === "string" &&
                  refreshedData.text.trim()
                ) {
                  const refreshedBlocks = this.htmlToEditorJsBlocks(
                    refreshedData.text,
                  );
                  await editor.render(refreshedBlocks);
                  item.text = refreshedData.text;
                  item.content = refreshedBlocks;
                }

                if (
                  refreshedData &&
                  typeof refreshedData.description === "string"
                ) {
                  const summaryField =
                    document.getElementById("col-item-summary");
                  if (summaryField)
                    summaryField.value = refreshedData.description;
                }

                if (
                  refreshedData &&
                  typeof refreshedData.audioUrl === "string" &&
                  refreshedData.audioUrl.trim()
                ) {
                  item.audioUrl = refreshedData.audioUrl.trim();
                }

                this.showToast(
                  "AI-tekst er klar. Du kan redigere og lagre nå.",
                  "success",
                  5000,
                );
                if (aiStatus) {
                  aiStatus.textContent =
                    "AI-tekst hentet. Husk å klikke Lagre og publiser.";
                  aiStatus.style.color = "#166534";
                }
              } catch (error) {
                console.error("AI-transkripsjon feilet:", error);
                const reason = this._getCallableErrorMessage(
                  error,
                  "Kunne ikke generere AI-tekst.",
                );
                this.showToast(
                  `Kunne ikke generere AI-tekst. ${reason}`,
                  "error",
                  7000,
                );
                if (aiStatus) {
                  aiStatus.textContent = `AI-generering feilet: ${reason}`;
                  aiStatus.style.color = "#b91c1c";
                }
              } finally {
                generateAiBtn.disabled = false;
                generateAiBtn.innerHTML = originalBtnHtml;
              }
            };
          }

          if (generateAiSummaryBtn) {
            generateAiSummaryBtn.onclick = async () => {
              if (!summaryField) {
                this.showToast("Fant ikke oppsummeringsfeltet.", "error", 5000);
                return;
              }

              let transcriptText = "";
              try {
                const saved = await editor.save();
                const blocks = Array.isArray(saved?.blocks) ? saved.blocks : [];
                transcriptText = blocks
                  .map(blockToPlainText)
                  .filter(Boolean)
                  .join(" ")
                  .replace(/\s+/g, " ")
                  .trim();
              } catch (err) {
                console.warn(
                  "Kunne ikke lese editorinnhold for AI-oppsummering:",
                  err,
                );
              }

              if (!transcriptText && typeof item?.text === "string") {
                transcriptText = htmlToPlainText(item.text);
              }

              if (transcriptText.length < 120) {
                this.showToast(
                  "For lite tekstgrunnlag. Generer eller skriv mer tekst først.",
                  "warning",
                  5000,
                );
                return;
              }

              const originalBtnHtml = generateAiSummaryBtn.innerHTML;
              generateAiSummaryBtn.disabled = true;
              generateAiSummaryBtn.innerHTML =
                '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Genererer...';

              if (aiStatus) {
                aiStatus.textContent =
                  "Genererer oppsummering, vers og spørsmål fra teksten...";
                aiStatus.style.color = "#334155";
              }

              try {
                const callable = firebase
                  .functions()
                  .httpsCallable("generatePodcastSummary");
                const response = await callable({
                  episodeTitle: String(item?.title || "").trim(),
                  transcriptText,
                });

                const aiSummary = String(response?.data?.summary || "").trim();
                if (!aiSummary) {
                  throw new Error("Tomt svar fra AI-oppsummering.");
                }

                summaryField.value = aiSummary;

                // Handle keyVerses
                const kvField = document.getElementById("col-item-key-verses");
                const kvData = response?.data?.keyVerses || [];
                if (kvField && Array.isArray(kvData)) {
                  kvField.value = kvData
                    .map((kv) => `${kv.reference} | ${kv.text}`)
                    .join("\n");
                }

                // Handle discussionQuestions
                const qField = document.getElementById("col-item-questions");
                const qData = response?.data?.discussionQuestions || [];
                if (qField && Array.isArray(qData)) {
                  qField.value = qData.join("\n");
                }

                this.showToast(
                  "AI-oppsummering, vers og diskusjonsspørsmål er klare!",
                  "success",
                  5000,
                );
                if (aiStatus) {
                  aiStatus.textContent =
                    "AI-oppsummering klar. Husk å klikke Lagre og publiser.";
                  aiStatus.style.color = "#166534";
                }
              } catch (error) {
                console.warn(
                  "AI-oppsummering feilet, bruker lokal fallback:",
                  error,
                );
                const fallbackSummary = buildLocalSummarySuggestion(
                  String(item?.title || ""),
                  transcriptText,
                );
                if (fallbackSummary) {
                  summaryField.value = fallbackSummary;
                  this.showToast(
                    "AI-oppsummering var ikke tilgjengelig. Et forslag ble laget lokalt.",
                    "warning",
                    6000,
                  );
                  if (aiStatus) {
                    aiStatus.textContent =
                      "Lokal oppsummering satt inn. Du kan redigere og lagre.";
                    aiStatus.style.color = "#92400e";
                  }
                } else {
                  const reason = this._getCallableErrorMessage(
                    error,
                    "Kunne ikke lage oppsummering fra teksten.",
                  );
                  this.showToast(reason, "error", 7000);
                  if (aiStatus) {
                    aiStatus.textContent = `Kunne ikke lage oppsummering: ${reason}`;
                    aiStatus.style.color = "#b91c1c";
                  }
                }
              } finally {
                generateAiSummaryBtn.disabled = false;
                generateAiSummaryBtn.innerHTML = originalBtnHtml;
              }
            };
          }
        }

        // --- Tag Management Logic ---
        let currentTags = [...existingTags];
        const tagsContainer = document.getElementById("active-tags");
        const tagInput = document.getElementById("tag-input");

        const renderTags = () => {
          if (!tagsContainer) return;
          tagsContainer.innerHTML = currentTags
            .map(
              (tag) => `
                    <span class="tag-badge">
                        ${tag}
                        <button type="button" class="remove-tag" data-tag="${tag}">&times;</button>
                    </span>
                `,
            )
            .join("");

          // Add remove listeners
          document.querySelectorAll(".remove-tag").forEach((btn) => {
            btn.onclick = () => {
              const tagToRemove = btn.getAttribute("data-tag");
              currentTags = currentTags.filter((t) => t !== tagToRemove);
              renderTags();
            };
          });
        };

        // Render initial tags
        renderTags();

        // Add Tag Listener
        if (tagInput) {
          tagInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              const val = tagInput.value.trim().replace(",", "");
              if (val && !currentTags.includes(val)) {
                currentTags.push(val);
                renderTags();
                tagInput.value = "";
              }
            }
          });
        }

        // --- Image Management Logic (Premium UI) ---
        const imgInput = document.getElementById("col-item-img");
        const imgTrigger = document.getElementById("sidebar-img-trigger");
        const preview = document.getElementById("sidebar-img-preview");
        const imgFile = document.getElementById("col-item-img-file");
        const uploadBtn = document.getElementById("sidebar-img-upload-btn");
        const libraryBtn = document.getElementById("sidebar-img-library-btn");
        const unsplashBtn = document.getElementById("unsplash-trigger-btn");
        const removeBtn = document.getElementById("sidebar-img-remove-btn");

        if (imgTrigger && imgFile) {
          // Drag & Drop Listeners
          imgTrigger.ondragover = (e) => {
            e.preventDefault();
            imgTrigger.style.borderColor = "#d17d39";
            imgTrigger.style.background = "#fff7ed";
          };
          imgTrigger.ondragleave = (e) => {
            e.preventDefault();
            imgTrigger.style.borderColor = "#f1f5f9";
            imgTrigger.style.background = "#f8fafc";
          };
          imgTrigger.ondrop = async (e) => {
            e.preventDefault();
            imgTrigger.style.borderColor = "#f1f5f9";
            imgTrigger.style.background = "#f8fafc";
            const file = e.dataTransfer.files[0];
            if (file) await handleImageUpload(file);
          };

          // Upload Actions
          if (uploadBtn)
            uploadBtn.onclick = (e) => {
              e.stopPropagation();
              imgFile.click();
            };
          imgTrigger.onclick = (e) => {
            if (e.target.closest("#sidebar-img-trigger")) imgFile.click();
          };

          if (libraryBtn) {
            libraryBtn.onclick = (e) => {
              e.stopPropagation();
              this.openMediaLibraryModal((selection) => {
                if (selection && selection.url && imgInput) {
                  imgInput.value = selection.url;
                  imgInput.dispatchEvent(new Event("input"));
                }
              });
            };
          }

          imgFile.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) await handleImageUpload(file);
          };

          // Real-time Preview Update
          if (imgInput) {
            imgInput.addEventListener("input", (e) => {
              const url = e.target.value;
              if (removeBtn) {
                removeBtn.style.display =
                  url && url.length > 10 ? "flex" : "none";
              }
              if (preview) {
                if (url && url.length > 10) {
                  preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                  preview.innerHTML = `
                                    <div style="text-align: center; color: #94a3b8;">
                                        <span class="material-symbols-outlined" style="font-size: 40px; margin-bottom: 8px; opacity: 0.5;">add_a_photo</span>
                                        <div style="font-size: 12px; font-weight: 500;">Klikk for å laste opp</div>
                                    </div>`;
                }
              }
            });
          }

          // --- Remove Button Listener ---
          if (removeBtn) {
            removeBtn.onclick = (e) => {
              e.stopPropagation();
              if (imgInput) {
                imgInput.value = "";
                imgInput.dispatchEvent(new Event("input"));
              }
            };
          }

          // --- Unsplash Listener ---
          if (unsplashBtn) {
            unsplashBtn.onclick = (e) => {
              e.stopPropagation();
              if (window.unsplashManager) {
                window.unsplashManager.open((selection) => {
                  if (selection && selection.url) {
                    imgInput.value = selection.url;
                    imgInput.dispatchEvent(new Event("input"));
                  }
                });
              }
            };
          }

          // Shared Upload Handler
          const handleImageUpload = async (file) => {
            if (!file) return;
            const preview = document.getElementById("sidebar-img-preview");
            const imgInput = document.getElementById("col-item-img");
            const originalContent = preview.innerHTML;
            preview.innerHTML =
              '<div style="display:flex; flex-direction:column; align-items:center; gap:10px;"><div class="loader-sm"></div><span style="font-size:11px; color:#64748b;">Laster opp...</span></div>';

            try {
              const url = await this.handleImageUpload(
                file,
                `editor/${collectionId}/`,
              );
              if (imgInput) {
                imgInput.value = url;
                imgInput.dispatchEvent(new Event("input"));
              }
              this.showToast("Bilde lastet opp!", "success");
            } catch (error) {
              preview.innerHTML = originalContent;
              this.showToast(
                "Kunne ikke laste opp bilde: " +
                  (error.message || "Ukjent feil"),
                "error",
              );
            }
          };
        }

        // --- AI Write Content Listener ---
        const aiWriteBtn = modal.querySelector("#ai-write-content");
        if (aiWriteBtn) {
          aiWriteBtn.onclick = async () => {
            const title =
              document.getElementById("col-item-title-v2")?.value ||
              document.getElementById("col-item-title-sidebar")?.value ||
              item.title ||
              "";
            if (!title) {
              this.showToast("Vennligst skriv en tittel først!", "info");
              return;
            }

            if (collectionId === "podcast_transcripts") {
              const episodeId = String(item?.id || "").trim();
              const audioUrl = String(item?.audioUrl || "").trim();

              if (!episodeId) {
                this.showToast(
                  "Mangler episode-ID. Kan ikke transkribere.",
                  "error",
                  5000,
                );
                return;
              }

              if (!audioUrl) {
                this.showToast(
                  "Fant ingen lydfil for episoden. Kan ikke transkribere.",
                  "error",
                  5000,
                );
                return;
              }

              const confirmMsg =
                "Vil du transkribere denne episoden og generere sammendrag med AI? Dette tar vanligvis 1-3 minutter.";
              if (!confirm(confirmMsg)) return;

              aiWriteBtn.disabled = true;
              const originalHtml = aiWriteBtn.innerHTML;
              aiWriteBtn.innerHTML =
                '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Transkriberer...';

              const aiStatus = document.getElementById("podcast-ai-status");
              if (aiStatus) {
                aiStatus.textContent =
                  "Transkriberer og oppsummerer nå. Vennligst vent...";
                aiStatus.style.color = "#334155";
              }

              try {
                const callable = firebase
                  .functions()
                  .httpsCallable("transcribePodcast");
                await callable({
                  episodeId,
                  audioUrl,
                  episodeTitle: title,
                });

                const refreshedDoc = await firebase
                  .firestore()
                  .collection("podcast_transcripts")
                  .doc(episodeId)
                  .get();
                const refreshedData = refreshedDoc.exists
                  ? refreshedDoc.data()
                  : null;

                if (
                  refreshedData &&
                  typeof refreshedData.text === "string" &&
                  refreshedData.text.trim()
                ) {
                  const refreshedBlocks = this.htmlToEditorJsBlocks(
                    refreshedData.text,
                  );
                  await editor.render(refreshedBlocks);
                  item.text = refreshedData.text;
                  item.content = refreshedBlocks;
                }

                if (refreshedData) {
                  if (refreshedData.summary) {
                    const summaryField =
                      document.getElementById("col-item-summary");
                    if (summaryField)
                      summaryField.value = refreshedData.summary;
                    item.summary = refreshedData.summary;
                    item.description = refreshedData.summary;
                  }
                  if (refreshedData.keyVerses) {
                    const kvField = document.getElementById(
                      "col-item-key-verses",
                    );
                    const formattedKV = refreshedData.keyVerses
                      .map((kv) => `${kv.reference} | ${kv.text}`)
                      .join("\n");
                    if (kvField) kvField.value = formattedKV;
                    item.keyVerses = refreshedData.keyVerses;
                  }
                  if (refreshedData.discussionQuestions) {
                    const qField =
                      document.getElementById("col-item-questions");
                    const formattedQuestions =
                      refreshedData.discussionQuestions.join("\n");
                    if (qField) qField.value = formattedQuestions;
                    item.discussionQuestions =
                      refreshedData.discussionQuestions;
                  }
                }

                this.showToast(
                  "Transkribering og oppsummering fullført!",
                  "success",
                  5000,
                );
                if (aiStatus) {
                  aiStatus.textContent =
                    "Fullført. Husk å klikke Lagre og publiser.";
                  aiStatus.style.color = "#166534";
                }
              } catch (err) {
                console.error("Transkripsjon og oppsummering feilet:", err);
                const reason = this._getCallableErrorMessage(
                  err,
                  "Kunne ikke fullføre transkripsjon/oppsummering.",
                );
                this.showToast(`Feilet: ${reason}`, "error", 7000);
                if (aiStatus) {
                  aiStatus.textContent = `Feilet: ${reason}`;
                  aiStatus.style.color = "#b91c1c";
                }
              } finally {
                aiWriteBtn.disabled = false;
                aiWriteBtn.innerHTML = originalHtml;
              }
              return;
            }

            const confirmMsg =
              "Vil du at jeg skal generere et utkast basert på tittelen din? Dette vil legge til innhold nederst i editoren.";
            if (!confirm(confirmMsg)) return;

            aiWriteBtn.disabled = true;
            const originalHtml = aiWriteBtn.innerHTML;
            aiWriteBtn.innerHTML =
              '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Skriver utkast...';

            try {
              const callable = firebase.functions().httpsCallable("aiProcess");
              const response = await callable({
                task: "generate_blog_draft",
                prompt: title,
                options: {
                  type: isTeachingCollection ? "undervisning" : "blogginnlegg",
                },
              });

              const data = response.data;
              if (data && data.blocks && Array.isArray(data.blocks)) {
                const activeEditor = editor || this._activeEditorInstance;
                if (!activeEditor) throw new Error("Fant ingen aktiv editor.");

                // Vent til editoren er klar
                if (activeEditor.isReady) await activeEditor.isReady;

                // Rens ut tittelen fra første blokk hvis den gjentas
                if (
                  data.blocks.length > 0 &&
                  data.blocks[0].type === "paragraph"
                ) {
                  const firstText = data.blocks[0].data.text || "";
                  if (firstText.toLowerCase().startsWith(title.toLowerCase())) {
                    data.blocks[0].data.text = firstText
                      .substring(title.length)
                      .replace(/^[:\s,.-]+/, "")
                      .trim();
                  }
                }

                // Hvis vi er i Docs-modus, sørg for at vi starter i et nytt avsnitt
                if (shouldUseDocsLikeEditor) {
                  const holder = getEditorHolder();
                  if (holder) {
                    holder.focus();
                    // Gå til bunnen
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(holder);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
                }

                let addedCount = 0;
                for (const block of data.blocks) {
                  try {
                    if (
                      activeEditor.blocks &&
                      typeof activeEditor.blocks.insert === "function"
                    ) {
                      // Hopp over tomme blokker
                      if (
                        block.type === "paragraph" &&
                        !block.data.text?.trim()
                      )
                        continue;

                      await activeEditor.blocks.insert(block.type, block.data);
                      addedCount++;
                    }
                  } catch (blockErr) {
                    console.warn(
                      "Kunne ikke sette inn AI-blokk:",
                      block,
                      blockErr,
                    );
                  }
                }

                if (addedCount > 0) {
                  this.showToast(
                    `Suksess! La til ${addedCount} avsnitt fra AI.`,
                    "success",
                  );
                } else {
                  this.showToast(
                    "AI genererte innhold, men kunne ikke sette det inn i editoren.",
                    "warning",
                  );
                }
              }
            } catch (err) {
              console.error("AI Write failed:", err);
              this.showToast(
                "Kunne ikke skrive utkast: " + err.message,
                "error",
              );
            } finally {
              aiWriteBtn.disabled = false;
              aiWriteBtn.innerHTML = originalHtml;
            }
          };
        }

        // --- AI Suggest Listener (SEO/Tags) ---
        const aiSuggestBtn = modal.querySelector("#ai-suggest-seo");
        if (aiSuggestBtn) {
          aiSuggestBtn.onclick = async () => {
            aiSuggestBtn.disabled = true;
            const originalHtml = aiSuggestBtn.innerHTML;
            aiSuggestBtn.innerHTML =
              '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Henter forslag...';

            try {
              const title =
                document.getElementById("col-item-title-v2")?.value ||
                item.title ||
                "";
              let transcriptText = "";
              try {
                const saved = await editor.save();
                transcriptText = (saved.blocks || [])
                  .map((b) => b.data?.text || "")
                  .join(" ")
                  .replace(/<[^>]*>/g, "")
                  .substring(0, 2000);
              } catch (e) {
                transcriptText =
                  typeof item.content === "string"
                    ? item.content.substring(0, 2000)
                    : "";
              }

              const callable = firebase.functions().httpsCallable("seoSuggest");
              const response = await callable({
                title,
                type: collectionId, // Forteller AI-en om det er blog, teaching eller podcast
                description:
                  document.getElementById("col-item-seo-desc")?.value ||
                  item.description ||
                  "",
                transcript: transcriptText,
              });

              const data = response.data;

              if (data.tags) {
                const newTags = data.tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                newTags.forEach((tag) => {
                  if (!currentTags.includes(tag)) currentTags.push(tag);
                });
                renderTags();
              }
              if (data.metaTitle) {
                const titleInp = document.getElementById("col-item-seo-title");
                if (titleInp) titleInp.value = data.metaTitle;
              }
              if (data.metaDescription) {
                const descInp = document.getElementById("col-item-seo-desc");
                if (descInp) descInp.value = data.metaDescription;
              }
              this.showToast("AI-forslag lagt til!", "success");
            } catch (err) {
              console.error("AI Suggest failed:", err);
              const reason = this._getCallableErrorMessage
                ? this._getCallableErrorMessage(err)
                : err.message || "Ukjent feil";
              this.showToast("Kunne ikke hente AI-forslag: " + reason, "error");
            } finally {
              aiSuggestBtn.disabled = false;
              aiSuggestBtn.innerHTML = originalHtml;
            }
          };
        }

        const closeBtn = modal.querySelector("#close-col-modal");
        if (closeBtn) {
          closeBtn.onclick = () => {
            this._clearOpenEditorState(collectionId);
            document.removeEventListener("keydown", escHandler);
            if (selectionChangeHandler) {
              document.removeEventListener(
                "selectionchange",
                selectionChangeHandler,
              );
            }
            modal.remove();
            this.isEditorOpen = false;
            this._activeEditorInstance = null;
            this.loadCollection(collectionId);
          };
        }

        // Escape key fallback: always allow closing the current editor modal.
        const escHandler = (evt) => {
          if (evt.key === "Escape" && document.body.contains(modal)) {
            this._clearOpenEditorState(collectionId);
            modal.remove();
            document.removeEventListener("keydown", escHandler);
            if (selectionChangeHandler) {
              document.removeEventListener(
                "selectionchange",
                selectionChangeHandler,
              );
            }
            this.isEditorOpen = false;
            this._activeEditorInstance = null;
            this.loadCollection(collectionId);
          }
        };
        document.addEventListener("keydown", escHandler);

        const buildSafeItemFromForm = async ({
          preserveExistingContentIfEmpty = false,
        } = {}) => {
          let savedData;
          try {
            // Race editor.save() against a 5s timeout so a broken instance never freezes the UI
            savedData = await Promise.race([
              editor.save(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("timeout")), 5000),
              ),
            ]);
          } catch (error) {
            // On timeout or error, fall back to the item's existing content
            console.warn(
              "editor.save() failed or timed out, using existing content:",
              error,
            );
            savedData = null;
          }

          const previousContent = item.content;

          let titleVal =
            document.getElementById("col-item-title-v2")?.value ||
            document.getElementById("col-item-title-sidebar")?.value ||
            "";
          item.title = titleVal.replace(/Ă/g, "Å").replace(/ă/g, "å");
          let nextContent = savedData;

          // Safety: never overwrite existing content with empty editor output.
          // If the editor returns no blocks but we had content before, keep the old content.
          if (
            !this._hasMeaningfulEditorContent(nextContent) &&
            previousContent
          ) {
            nextContent = previousContent;
          }

          // --- Wix Artifact Cleanup ---
          // Apply the aggressive cleanup logic before saving to Firestore
          if (
            nextContent &&
            typeof nextContent === "object" &&
            Array.isArray(nextContent.blocks)
          ) {
            if (
              window.contentManager &&
              typeof window.contentManager.cleanEditorBlocks === "function"
            ) {
              nextContent =
                window.contentManager.cleanEditorBlocks(nextContent);
            }
          } else if (
            typeof nextContent === "string" &&
            nextContent.trim().length > 0
          ) {
            if (
              window.contentManager &&
              typeof window.contentManager.cleanLegacyHtml === "function"
            ) {
              nextContent = window.contentManager.cleanLegacyHtml(nextContent);
            }
          }

          item.content = nextContent;
          if (collectionId === "events") {
            item.description =
              nextContent && nextContent.blocks
                ? this.blocksToHtml(nextContent)
                : typeof nextContent === "string"
                  ? nextContent
                  : item.description || "";
          }
          const dateVal = document.getElementById("col-item-date")?.value || "";
          if (collectionId === "events") {
            const timeVal =
              document.getElementById("col-item-time")?.value || "";
            item.date = timeVal ? `${dateVal}T${timeVal}` : dateVal;
          } else {
            item.date = dateVal;
          }

          item.imageUrl = document.getElementById("col-item-img")?.value || "";
          item.author = document.getElementById("col-item-author")?.value || "";

          if (isTeachingCollection) {
            const typeValue =
              document.getElementById("col-item-type")?.value || "Bibelstudier";
            const seriesSelect = document.getElementById(
              "col-item-series-items",
            );
            item.teachingType = typeValue;
            item.category = typeValue;
            item.seriesItems =
              typeValue === "Undervisningsserier" && seriesSelect
                ? Array.from(seriesSelect.selectedOptions).map(
                    (opt) => opt.value,
                  )
                : [];
          } else {
            item.category =
              document.getElementById("col-item-cat")?.value || "";
          }

          if (collectionId === "events") {
            item.eventLink =
              document.getElementById("col-item-event-link")?.value || "";
            item.eventLinkText =
              document.getElementById("col-item-event-link-text")?.value || "";
            item.eventRecurring =
              document.getElementById("col-item-event-recurring")?.value || "";
            item.eventAdditionalDates =
              document.getElementById("col-item-event-additional-dates")
                ?.value || "";
            item.eventSchedule =
              document.getElementById("col-item-event-schedule")?.value || "";
          }

          item.seoTitle =
            document.getElementById("col-item-seo-title")?.value || "";
          item.seoDescription =
            document.getElementById("col-item-seo-desc")?.value || "";
          item.tags = currentTags;

          if (collectionId === "blog") {
            const relatedSelect = document.getElementById("col-item-related");
            if (relatedSelect) {
              item.relatedPosts = Array.from(relatedSelect.selectedOptions).map(
                (opt) => opt.value,
              );
            }
          }

          if (collectionId === "podcast_transcripts") {
            const podcastSummaryVal =
              document.getElementById("col-item-summary")?.value?.trim() || "";
            item.description = podcastSummaryVal;
            item.summary = podcastSummaryVal;

            // Parse keyVerses
            const keyVersesRaw =
              document.getElementById("col-item-key-verses")?.value || "";
            item.keyVerses = keyVersesRaw
              .split("\n")
              .map((line) => {
                const parts = line.split("|");
                if (parts.length >= 2) {
                  return {
                    reference: parts[0].trim(),
                    text: parts.slice(1).join("|").trim(),
                  };
                }
                if (line.trim()) {
                  return { reference: "Skriftsted", text: line.trim() };
                }
                return null;
              })
              .filter(Boolean);

            // Parse discussionQuestions
            const questionsRaw =
              document.getElementById("col-item-questions")?.value || "";
            item.discussionQuestions = questionsRaw
              .split("\n")
              .map((q) => q.trim())
              .filter(Boolean);

            const htmlFromBlocks = this.editorJsBlocksToHtml(
              nextContent?.blocks || [],
            );
            item.text =
              htmlFromBlocks ||
              (typeof item.text === "string" ? item.text : "");
          }

          if (item.isSynced && item.id && !item.gcalId) {
            item.gcalId = item.id;
          }

          const normalizedItem =
            typeof adminUtils.sanitizeCollectionItem === "function"
              ? adminUtils.sanitizeCollectionItem(collectionId, item)
              : { ok: true, value: item, errors: [] };

          if (!normalizedItem.ok) {
            throw new Error(
              normalizedItem.errors.join(" ") || "Validering feilet.",
            );
          }

          return normalizedItem.value;
        };

        const upsertItemInList = (list, nextItem) => {
          let existingIdx = -1;

          // 1. Try matching by ID first (most reliable)
          if (nextItem.id) {
            existingIdx = list.findIndex((fi) => fi && fi.id === nextItem.id);
          }

          // 2. Fallback: match by title and date (for all collections)
          if (existingIdx === -1 && nextItem.title) {
            existingIdx = list.findIndex(
              (fi) =>
                fi &&
                fi.title === nextItem.title &&
                String(fi.date || "").split("T")[0] ===
                  String(nextItem.date || "").split("T")[0],
            );
          }

          // 3. Last resort: use the original index if it's a known Firestore item
          if (
            existingIdx === -1 &&
            nextItem.isFirestore &&
            typeof index === "number" &&
            index >= 0
          ) {
            existingIdx = index;
          }

          if (existingIdx >= 0 && existingIdx < list.length) {
            const existing = list[existingIdx];
            list[existingIdx] = { ...existing, ...nextItem };

            // HKM Safety: If the update (nextItem) is missing translations but the existing
            // item has them, we MUST preserve them. This prevents regressions if the
            // editor was opened with a stale/partial version of the item.
            if (
              existing.translations &&
              (!nextItem.translations ||
                Object.keys(nextItem.translations).length === 0)
            ) {
              list[existingIdx].translations = existing.translations;
              if (
                existing.translationSourceHash &&
                !nextItem.translationSourceHash
              ) {
                list[existingIdx].translationSourceHash =
                  existing.translationSourceHash;
              }
              if (existing.sourceLanguage && !nextItem.sourceLanguage) {
                list[existingIdx].sourceLanguage = existing.sourceLanguage;
              }
            }
          } else {
            list.unshift(nextItem);
          }
        };

        let autosaveTimer = null;
        triggerAutosave = () => {
          if (!collectionId) return;

          if (typeof updateLivePreview === "function") updateLivePreview();

          const statusEl = document.getElementById("editor-autosave-status");
          const textEl = document.getElementById("editor-autosave-text");
          if (statusEl && textEl) {
            statusEl.style.opacity = "1";
            textEl.innerHTML = "Autolagrer...";
            const icon = statusEl.querySelector(".material-symbols-outlined");
            if (icon) {
              icon.style.color = "#3b82f6";
              icon.innerHTML = "sync";
              icon.style.animation = "hkm-spin 1.5s linear infinite";
            }
          }

          if (autosaveTimer) clearTimeout(autosaveTimer);

          autosaveTimer = setTimeout(async () => {
            try {
              let safeItem = await buildSafeItemFromForm();

              // Perform the save
              firebaseService.invalidatePageContentCache(
                `collection_${collectionId}`,
              );
              const currentData = await firebaseService.getPageContent(
                `collection_${collectionId}`,
              );
              const list = this._getSafeCollectionListForSave(
                collectionId,
                currentData,
              );

              // Mark as edited
              safeItem.dashboardEdited = true;
              safeItem.dashboardEditedAt = new Date().toISOString();

              upsertItemInList(list, safeItem);
              await firebaseService.savePageContent(
                `collection_${collectionId}`,
                { items: list },
              );

              // Update status to saved
              if (statusEl && textEl) {
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                textEl.innerHTML = `Sist lagret kl. ${timeStr}`;
                const icon = statusEl.querySelector(
                  ".material-symbols-outlined",
                );
                if (icon) {
                  icon.style.color = "#10b981";
                  icon.innerHTML = "cloud_done";
                  icon.style.animation = "none";
                }
                setTimeout(() => {
                  statusEl.style.opacity = "0.7";
                }, 3000);
              }
            } catch (e) {
              console.error("Editor autosave failed:", e);
              if (statusEl && textEl) {
                textEl.innerHTML = "Lagring feilet";
                const icon = statusEl.querySelector(
                  ".material-symbols-outlined",
                );
                if (icon) {
                  icon.style.color = "#ef4444";
                  icon.innerHTML = "cloud_off";
                  icon.style.animation = "none";
                }
              }
            }
          }, 2000);
        };

        // Global modal input changes trigger autosave
        modal.addEventListener("input", (e) => {
          if (
            e.target.matches(
              ".sidebar-control, #col-item-title-v2, #col-item-title-sidebar",
            )
          ) {
            if (typeof triggerAutosave === "function") triggerAutosave();
          }
        });

        // --- Live Preview Setup ---
        const togglePreviewBtn = modal.querySelector("#toggle-split-preview");
        const previewPanel = modal.querySelector("#editor-live-preview-panel");
        const editorSidebar = modal.querySelector(".editor-sidebar-v2");
        const previewIframe = modal.querySelector(
          "#editor-live-preview-iframe",
        );

        updateLivePreview = async () => {
          if (!previewPanel || previewPanel.style.display === "none") return;

          try {
            let safeItem = await buildSafeItemFromForm({
              preserveExistingContentIfEmpty: true,
            });

            let contentHtml = "";
            if (safeItem.content && Array.isArray(safeItem.content.blocks)) {
              contentHtml = this.editorJsBlocksToHtml(safeItem.content.blocks);
            } else if (typeof safeItem.content === "string") {
              contentHtml = safeItem.content;
            }

            const titleText = safeItem.title || "Uten tittel";
            const author = safeItem.author || "Mandal Regnskapskontor";
            const dateStr = safeItem.date
              ? new Date(safeItem.date).toLocaleDateString("no")
              : "";
            const category = safeItem.category || "";
            const coverImage = safeItem.imageUrl || "";

            const docTemplate = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                            <style>
                                body {
                                    font-family: 'Inter', sans-serif;
                                    color: #1e293b;
                                    background: white;
                                    margin: 0;
                                    padding: 40px 24px;
                                    line-height: 1.6;
                                    -webkit-font-smoothing: antialiased;
                                }
                                .preview-container {
                                    max-width: 720px;
                                    margin: 0 auto;
                                }
                                .category-badge {
                                    display: inline-block;
                                    background: #fff7ed;
                                    color: #d17d39;
                                    font-size: 11px;
                                    font-weight: 800;
                                    padding: 4px 10px;
                                    border-radius: 20px;
                                    text-transform: uppercase;
                                    letter-spacing: 0.05em;
                                    margin-bottom: 16px;
                                }
                                .preview-container h1 {
                                    font-family: 'Inter', sans-serif;
                                    color: #1B4965;
                                    font-size: 32px;
                                    font-weight: 800;
                                    line-height: 1.2;
                                    margin: 0 0 16px 0;
                                }
                                .meta-area {
                                    display: flex;
                                    align-items: center;
                                    gap: 12px;
                                    font-size: 13px;
                                    color: #64748b;
                                    font-weight: 500;
                                    margin-bottom: 32px;
                                    border-bottom: 1px solid #f1f5f9;
                                    padding-bottom: 16px;
                                }
                                .meta-avatar {
                                    width: 32px;
                                    height: 32px;
                                    border-radius: 50%;
                                    background: #e2e8f0;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-weight: 700;
                                    color: #475569;
                                    font-size: 12px;
                                }
                                .cover-image {
                                    width: 100%;
                                    aspect-ratio: 16/9;
                                    object-fit: cover;
                                    border-radius: 16px;
                                    margin-bottom: 32px;
                                    background: #f8fafc;
                                }
                                .content-body {
                                    font-size: 16px;
                                    color: #334155;
                                }
                                .content-body p {
                                    margin: 0 0 20px 0;
                                }
                                .content-body h2 {
                                    font-family: 'Inter', sans-serif;
                                    color: #1B4965;
                                    font-size: 24px;
                                    font-weight: 700;
                                    margin: 40px 0 16px 0;
                                }
                                .content-body h3 {
                                    font-family: 'Inter', sans-serif;
                                    color: #1B4965;
                                    font-size: 20px;
                                    font-weight: 700;
                                    margin: 32px 0 16px 0;
                                }
                                .content-body img {
                                    width: 100%;
                                    border-radius: 12px;
                                    margin: 24px 0;
                                }
                                .content-body blockquote {
                                    border-left: 4px solid #d17d39;
                                    margin: 24px 0;
                                    padding: 8px 0 8px 20px;
                                    font-style: italic;
                                    color: #475569;
                                    background: #fff7ed;
                                    border-radius: 0 8px 8px 0;
                                }
                                .content-body ul, .content-body ol {
                                    margin: 0 0 20px 0;
                                    padding-left: 24px;
                                }
                                .content-body li {
                                    margin-bottom: 8px;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="preview-container">
                                ${category ? `<span class="category-badge">${category}</span>` : ""}
                                <h1>${titleText}</h1>
                                
                                <div class="meta-area">
                                    <div class="meta-avatar">${author.substring(0, 2).toUpperCase()}</div>
                                    <div>
                                        <div style="font-weight: 700; color: #1e293b;">${author}</div>
                                        <div style="font-size: 11px;">${dateStr}</div>
                                    </div>
                                </div>

                                ${coverImage ? `<img src="${coverImage}" class="cover-image">` : ""}

                                <div class="content-body">
                                    ${contentHtml || '<p style="color:#94a3b8; font-style:italic;">Skriv innhold for å se forhåndsvisning...</p>'}
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

            const doc =
              previewIframe.contentDocument ||
              previewIframe.contentWindow.document;
            doc.open();
            doc.write(docTemplate);
            doc.close();
          } catch (err) {
            console.error("Preview update failed:", err);
          }
        };

        if (togglePreviewBtn) {
          togglePreviewBtn.onclick = () => {
            const isActive = togglePreviewBtn.classList.toggle("active");
            if (isActive) {
              togglePreviewBtn.style.background = "#fff7ed";
              togglePreviewBtn.style.color = "#d17d39";
              previewPanel.style.display = "flex";
              editorSidebar.style.display = "none";
              updateLivePreview();
            } else {
              togglePreviewBtn.style.background = "transparent";
              togglePreviewBtn.style.color = "inherit";
              previewPanel.style.display = "none";
              editorSidebar.style.display = "block";
            }
          };
        }

        // Device toggles
        const btnDesktop = modal.querySelector("#preview-device-desktop");
        const btnMobile = modal.querySelector("#preview-device-mobile");
        if (btnDesktop && btnMobile && previewIframe) {
          btnDesktop.onclick = () => {
            btnDesktop.classList.add("active");
            btnMobile.classList.remove("active");
            previewIframe.style.width = "100%";
            previewIframe.style.borderRadius = "12px";
            previewIframe.style.height = "100%";
          };
          btnMobile.onclick = () => {
            btnMobile.classList.add("active");
            btnDesktop.classList.remove("active");
            previewIframe.style.width = "375px";
            previewIframe.style.borderRadius = "24px";
            previewIframe.style.height = "812px";
          };
        }

        const translateBtn = modal.querySelector("#translate-col-item");
        if (
          translateBtn &&
          (collectionId === "blog" ||
            collectionId === "teaching" ||
            collectionId === "podcast_transcripts")
        ) {
          translateBtn.onclick = async () => {
            await this._withButtonLoading(
              translateBtn,
              async () => {
                let slowNoticeTimer = null;
                try {
                  // Clear editor restore state before writing to Firestore, so the
                  // realtime onSnapshot that fires mid-write cannot re-open the editor.
                  this._clearOpenEditorState(collectionId);

                  slowNoticeTimer = setTimeout(() => {
                    this.showToast(
                      "Oversettelse pågår fortsatt. Dette kan ta litt tid ved store innlegg.",
                      "warning",
                      4500,
                    );
                  }, 6000);

                  const safeItem = await buildSafeItemFromForm({
                    preserveExistingContentIfEmpty: true,
                  });
                  const translatedItem = await Promise.race([
                    this.ensureBlogPostTranslations(safeItem, { force: false }),
                    new Promise((_, reject) =>
                      setTimeout(
                        () =>
                          reject(
                            new Error(
                              "Oversettelsen tok for lang tid. Prøv igjen om litt.",
                            ),
                          ),
                        600000,
                      ),
                    ),
                  ]);

                  const targetLanguages =
                    this._getBlogTranslationTargetLanguages();
                  const successfulLanguages = targetLanguages.filter((lang) => {
                    const tr = translatedItem?.translations?.[lang];
                    return (
                      tr &&
                      typeof tr === "object" &&
                      tr._translationFailed !== true
                    );
                  });
                  if (!successfulLanguages.length) {
                    const translationSettings =
                      await this._getTranslationSettings();
                    const hasGeminiKey = !!translationSettings?.geminiApiKey;
                    if (!hasGeminiKey) {
                      throw new Error(
                        "Ingen språk ble oversatt. MyMemory-kvote/no-op stopper oversettelse nå. Legg inn Gemini API key i Integrasjoner for stabil oversettelse.",
                      );
                    }

                    const diag = await this._diagnoseTranslationProviders();
                    if (String(diag.gemini).startsWith("error:")) {
                      const geminiErr = String(diag.gemini).slice(6);
                      if (
                        /403|permission|api.*not.*enabled|generativelanguage|api key/i.test(
                          geminiErr,
                        )
                      ) {
                        throw new Error(
                          "Ingen språk ble oversatt. Gemini er konfigurert, men API-tilgang feiler (403/API key/API ikke aktiv). Aktiver Generative Language API og bruk gyldig nøkkel i Integrasjoner.",
                        );
                      }
                      if (/model|not found|unsupported/i.test(geminiErr)) {
                        throw new Error(
                          "Ingen språk ble oversatt. Gemini-modellen er ikke gyldig/tilgjengelig. Velg en støttet modell i Integrasjoner.",
                        );
                      }
                      throw new Error(
                        `Ingen språk ble oversatt. Gemini-feil: ${geminiErr}`,
                      );
                    }

                    if (diag.gemini === "no-op" && diag.myMemory === "quota") {
                      throw new Error(
                        "Ingen språk ble oversatt. MyMemory-kvoten er brukt opp, og Gemini svarte uten gyldig oversettelse. Sjekk Gemini-oppsett i Integrasjoner.",
                      );
                    }

                    throw new Error(
                      "Ingen språk ble oversatt. Oversettelsestjenesten svarte uten gyldig oversettelse. Prøv igjen, eller bytt provider i Integrasjoner.",
                    );
                  }

                  if (collectionId === "podcast_transcripts") {
                    await firebase
                      .firestore()
                      .collection("podcast_transcripts")
                      .doc(translatedItem.id)
                      .set(translatedItem, { merge: true });
                  } else {
                    const currentData = await firebaseService.getPageContent(
                      `collection_${collectionId}`,
                    );
                    const list = this._getSafeCollectionListForSave(
                      collectionId,
                      currentData,
                    );
                    upsertItemInList(list, translatedItem);

                    await firebaseService.savePageContent(
                      `collection_${collectionId}`,
                      { items: list },
                    );
                  }
                  Object.assign(item, translatedItem);
                  this._renderBlogTranslationStatusBadge(item);
                  if (successfulLanguages.length === targetLanguages.length) {
                    this.showToast(
                      "Innlegget er oversatt til tilgjengelige språk og lagret.",
                      "success",
                      5000,
                    );
                  } else {
                    this.showToast(
                      `Delvis oversettelse lagret (${successfulLanguages.length}/${targetLanguages.length} språk).`,
                      "warning",
                      6500,
                    );
                  }

                  // Show checkmark success indicator on the button
                  const originalHtml =
                    translateBtn.dataset.hkmOriginalHtml ||
                    translateBtn.innerHTML;
                  setTimeout(() => {
                    translateBtn.innerHTML =
                      '<span class="material-symbols-outlined" style="font-size: 18px; color: #10b981; vertical-align: middle; margin-right: 4px;">check_circle</span><span>Oversatt</span>';
                    setTimeout(() => {
                      translateBtn.innerHTML = originalHtml;
                    }, 3000);
                  }, 50);
                } catch (error) {
                  console.error("Error translating current blog item:", error);
                  this.showToast(
                    error?.message || "Kunne ikke oversette innlegget nå.",
                    "error",
                    6000,
                  );
                } finally {
                  if (slowNoticeTimer) clearTimeout(slowNoticeTimer);
                }
              },
              {
                loadingText:
                  '<span class="material-symbols-outlined spin" style="font-size:18px; vertical-align:middle; margin-right:4px;">sync</span> Oversetter...',
              },
            );
          };
        }

        // --- Print Button ---
        const printBtn = modal.querySelector("#print-col-item");
        if (printBtn) {
          printBtn.onclick = async () => {
            printBtn.disabled = true;
            printBtn.innerHTML =
              '<span class="material-symbols-outlined">hourglass_empty</span> Forbereder...';

            let printData;
            try {
              printData = await editor.save();
            } catch (e) {
              console.error("Could not save editor for print:", e);
              printBtn.disabled = false;
              printBtn.innerHTML =
                '<span class="material-symbols-outlined">print</span> Skriv ut';
              return;
            }

            const title =
              document.getElementById("col-item-title-v2")?.value ||
              "(Uten tittel)";
            const author =
              document.getElementById("col-item-author")?.value || "";
            const date = document.getElementById("col-item-date")?.value || "";

            // Render each Editor.js block to HTML
            const blocksHtml = (printData.blocks || [])
              .map((block) => {
                switch (block.type) {
                  case "paragraph":
                    return `<p>${block.data.text || ""}</p>`;
                  case "header":
                    return `<h${block.data.level}>${block.data.text || ""}</h${block.data.level}>`;
                  case "list": {
                    const tag = block.data.style === "ordered" ? "ol" : "ul";
                    const items = (block.data.items || [])
                      .map((i) => `<li>${i}</li>`)
                      .join("");
                    return `<${tag}>${items}</${tag}>`;
                  }
                  case "quote":
                    return `<blockquote><p>${block.data.text || ""}</p>${block.data.caption ? `<cite>— ${block.data.caption}</cite>` : ""}</blockquote>`;
                  case "delimiter":
                    return `<div class="print-delimiter">⁂</div>`;
                  case "image":
                    return `<figure><img src="${block.data.file?.url || block.data.url || ""}" alt="${block.data.caption || ""}"><figcaption>${block.data.caption || ""}</figcaption></figure>`;
                  case "youtubeVideo": {
                    const ytUrl = block.data.url || "";
                    return ytUrl
                      ? `<div class="print-video-ref"><span>Video: </span><a href="${ytUrl}">${ytUrl}</a></div>`
                      : "";
                  }
                  default:
                    return "";
                }
              })
              .join("\n");

            const formattedDate = date
              ? new Date(date).toLocaleDateString("nb-NO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "";

            const printWindow = window.open(
              "",
              "_blank",
              "width=900,height=700",
            );
            printWindow.document.write(`<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', Georgia, serif;
            font-size: 11pt;
            color: #1e293b;
            background: white;
            line-height: 1.75;
        }

        .page {
            max-width: 750px;
            margin: 0 auto;
            padding: 50px 60px 80px;
        }

        .print-header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 24px;
            margin-bottom: 36px;
        }

        .print-category {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #64748b;
            margin-bottom: 10px;
        }

        h1.print-title {
            font-size: 28pt;
            font-weight: 800;
            line-height: 1.15;
            color: #0f172a;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
        }

        .print-meta {
            font-size: 10pt;
            color: #64748b;
            display: flex;
            gap: 24px;
        }

        .print-meta span { display: flex; align-items: center; gap: 6px; }

        .print-body p {
            font-size: 11pt;
            margin-bottom: 16px;
            color: #334155;
        }

        .print-body h2 {
            font-size: 18pt;
            font-weight: 800;
            color: #0f172a;
            margin: 36px 0 12px;
            letter-spacing: -0.01em;
            border-top: 1px solid #e2e8f0;
            padding-top: 24px;
        }

        .print-body h3 {
            font-size: 14pt;
            font-weight: 700;
            color: #1e293b;
            margin: 28px 0 10px;
        }

        .print-body h4 {
            font-size: 12pt;
            font-weight: 700;
            color: #334155;
            margin: 20px 0 8px;
        }

        .print-body ul, .print-body ol {
            padding-left: 24px;
            margin-bottom: 16px;
        }

        .print-body li {
            margin-bottom: 6px;
            color: #334155;
        }

        .print-body blockquote {
            border-left: 4px solid #0f172a;
            padding: 16px 24px;
            margin: 28px 0;
            background: #f8fafc;
            border-radius: 0 8px 8px 0;
        }

        .print-body blockquote p {
            font-size: 13pt;
            font-style: italic;
            color: #1e293b;
            margin: 0 0 8px;
        }

        .print-body blockquote cite {
            font-size: 10pt;
            color: #64748b;
            font-style: normal;
        }

        .print-body figure {
            margin: 28px 0;
            text-align: center;
        }

        .print-body figure img {
            max-width: 100%;
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .print-body figure figcaption {
            font-size: 9pt;
            color: #94a3b8;
            margin-top: 8px;
            font-style: italic;
        }

        .print-delimiter {
            text-align: center;
            font-size: 18pt;
            color: #94a3b8;
            margin: 32px 0;
            letter-spacing: 12px;
        }

        .print-video-ref {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 10pt;
            color: #475569;
            margin: 20px 0;
        }

        .print-video-ref a {
            color: #6366f1;
            word-break: break-all;
        }

        .print-footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 9pt;
            color: #94a3b8;
            text-align: center;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .page { padding: 20px 40px; }
            h2, h3 { page-break-after: avoid; }
            figure, blockquote { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="print-header">
            <div class="print-category">His Kingdom Ministry${collectionId === "blog" ? " — Blogg" : collectionId === "teaching" ? " — Undervisning" : ""}</div>
            <h1 class="print-title">${title}</h1>
            <div class="print-meta">
                ${author ? `<span>${author}</span>` : ""}
                ${formattedDate ? `<span>${formattedDate}</span>` : ""}
            </div>
        </div>
        <div class="print-body">
            ${blocksHtml}
        </div>
        <div class="print-footer">
            His Kingdom Ministry &nbsp;·&nbsp; Skrevet ut ${new Date().toLocaleDateString("nb-NO")}
        </div>
    </div>
    <script>
        window.onload = function() {
            window.print();
        <\/script>
</body>
</html>`);
            printWindow.document.close();

            printBtn.disabled = false;
            printBtn.innerHTML =
              '<span class="material-symbols-outlined">print</span> Skriv ut';
          };
        }

        const saveBtn = modal.querySelector("#save-col-item");
        if (saveBtn) {
          saveBtn.onclick = async () => {
            const btn = modal.querySelector("#save-col-item");
            if (!btn) return;

            // Clear immediately — before the Firestore write — so the realtime
            // onSnapshot that fires during the write cannot re-open the editor.
            this._clearOpenEditorState(collectionId);

            await this._runWriteLocked(
              `collection-save:${collectionId}`,
              async () => {
                await this._withButtonLoading(
                  btn,
                  async () => {
                    try {
                      let safeItem = await buildSafeItemFromForm();

                      if (collectionId === "podcast_transcripts") {
                        // For podcast transcripts, save directly to Firestore collection
                        const podcastPayload = { ...safeItem };

                        // CRITICAL FIX: Never overwrite translations from the manual save form.
                        // This prevents the stale UI state from deleting background AI translations.
                        delete podcastPayload.translations;

                        const summaryValue =
                          document
                            .getElementById("col-item-summary")
                            ?.value?.trim() || "";
                        if (summaryValue) {
                          podcastPayload.description = summaryValue;
                        } else {
                          podcastPayload.description =
                            firebase.firestore.FieldValue.delete();
                        }
                        await firebase
                          .firestore()
                          .collection("podcast_transcripts")
                          .doc(safeItem.id)
                          .set(podcastPayload, { merge: true });
                      } else {
                        // FORCE CACHE INVALIDATION before fetching the list for saving.
                        // This prevents the "Lost Update" problem where we fetch a stale
                        // cached list and overwrite the document with it.
                        firebaseService.invalidatePageContentCache(
                          `collection_${collectionId}`,
                        );

                        const currentData =
                          await firebaseService.getPageContent(
                            `collection_${collectionId}`,
                          );
                        const list = this._getSafeCollectionListForSave(
                          collectionId,
                          currentData,
                        );

                        // Mark as edited in dashboard so the public site prioritizes this version
                        safeItem.dashboardEdited = true;
                        safeItem.dashboardEditedAt = new Date().toISOString();

                        // Explicitly publish this post
                        if (
                          collectionId === "blog" ||
                          collectionId === "teaching"
                        ) {
                          safeItem.published = true;
                        }

                        // HKM Fix: Dynamically attach author info from logged in profile
                        if (
                          collectionId === "blog" ||
                          collectionId === "teaching"
                        ) {
                          const currentUser = firebase.auth().currentUser;
                          if (currentUser) {
                            // Prioritize Firestore profile if we have it, otherwise Auth profile
                            const displayName =
                              this._lastKnownDisplayName ||
                              currentUser.displayName ||
                              currentUser.email;
                            const photoURL =
                              this._lastKnownPhotoURL || currentUser.photoURL;

                            // Only set if not manually overridden in the form
                            if (
                              !safeItem.author ||
                              safeItem.author === "Ukjent forfatter" ||
                              safeItem.author === "Navn"
                            ) {
                              safeItem.author = displayName;
                            }

                            // Ensure the authorPhoto belongs to the actual author, not the logged-in editor
                            const authorLower = (safeItem.author || "")
                              .toLowerCase()
                              .trim();
                            const editorLower = displayName
                              .toLowerCase()
                              .trim();
                            if (authorLower.includes("hilde")) {
                              safeItem.authorPhoto =
                                "/img/Hilde%20Karin%20Knutsen.jpg";
                            } else if (authorLower.includes("thomas")) {
                              safeItem.authorPhoto = "/img/Thomas.jpeg";
                            } else if (authorLower === editorLower) {
                              if (photoURL) safeItem.authorPhoto = photoURL;
                            } else if (
                              !safeItem.authorPhoto ||
                              safeItem.authorPhoto.includes(
                                "author-placeholder",
                              )
                            ) {
                              safeItem.authorPhoto =
                                "img/author-placeholder.png";
                            }
                          }
                        }

                        upsertItemInList(list, safeItem);

                        await firebaseService.savePageContent(
                          `collection_${collectionId}`,
                          { items: list },
                        );

                        // Force clear the public visitor cache if we modified events
                        if (collectionId === "events") {
                          this.clearPublicEventCache();

                          // If connected to Google, sync back
                          if (this.googleAccessToken && safeItem.gcalId) {
                            await this.updateGoogleCalendarEvent(
                              safeItem,
                              "PATCH",
                            );
                          }
                        }
                      }

                      // Stay in the editor after saving — just show confirmation
                      this.showToast("Lagret og publisert!", "success");

                      // Clear restore state on successful save so a subsequent page refresh
                      // doesn't try to "restore" potentially stale content from session storage.
                      this._clearOpenEditorState(collectionId);

                      // Refresh the background list silently without closing the editor
                      this.loadCollection(collectionId);
                    } catch (err) {
                      console.error("Error saving item:", err);
                      this.showToast(
                        err?.message ||
                          "Kunne ikke lagre. Sjekk konsollen for detaljer.",
                        "error",
                        5000,
                      );
                    }
                  },
                  {
                    loadingText:
                      '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Lagrer...',
                  },
                );
              },
            );
          };
        }

        const saveBtnDraft = modal.querySelector("#save-col-item-draft");
        if (saveBtnDraft) {
          saveBtnDraft.onclick = async () => {
            const btn = modal.querySelector("#save-col-item-draft");
            if (!btn) return;

            // Clear immediately before Firestore write
            this._clearOpenEditorState(collectionId);

            await this._runWriteLocked(
              `collection-save:${collectionId}`,
              async () => {
                await this._withButtonLoading(
                  btn,
                  async () => {
                    try {
                      let safeItem = await buildSafeItemFromForm();

                      firebaseService.invalidatePageContentCache(
                        `collection_${collectionId}`,
                      );

                      const currentData = await firebaseService.getPageContent(
                        `collection_${collectionId}`,
                      );
                      const list = this._getSafeCollectionListForSave(
                        collectionId,
                        currentData,
                      );

                      // Mark as edited in dashboard
                      safeItem.dashboardEdited = true;
                      safeItem.dashboardEditedAt = new Date().toISOString();

                      // Explicitly save as draft
                      safeItem.published = false;

                      // HKM Fix: Dynamically attach author info
                      if (
                        collectionId === "blog" ||
                        collectionId === "teaching"
                      ) {
                        const currentUser = firebase.auth().currentUser;
                        if (currentUser) {
                          const displayName =
                            this._lastKnownDisplayName ||
                            currentUser.displayName ||
                            currentUser.email;
                          const photoURL =
                            this._lastKnownPhotoURL || currentUser.photoURL;

                          if (
                            !safeItem.author ||
                            safeItem.author === "Ukjent forfatter" ||
                            safeItem.author === "Navn"
                          ) {
                            safeItem.author = displayName;
                          }
                          // Ensure the authorPhoto belongs to the actual author, not the logged-in editor
                          const authorLower = (safeItem.author || "")
                            .toLowerCase()
                            .trim();
                          const editorLower = displayName.toLowerCase().trim();
                          if (authorLower.includes("hilde")) {
                            safeItem.authorPhoto =
                              "/img/Hilde%20Karin%20Knutsen.jpg";
                          } else if (authorLower.includes("thomas")) {
                            safeItem.authorPhoto = "/img/Thomas.jpeg";
                          } else if (authorLower === editorLower) {
                            if (photoURL) safeItem.authorPhoto = photoURL;
                          } else if (
                            !safeItem.authorPhoto ||
                            safeItem.authorPhoto.includes("author-placeholder")
                          ) {
                            safeItem.authorPhoto = "img/author-placeholder.png";
                          }
                        }
                      }

                      upsertItemInList(list, safeItem);

                      await firebaseService.savePageContent(
                        `collection_${collectionId}`,
                        { items: list },
                      );

                      this.showToast("Lagret som utkast!", "success");

                      this._clearOpenEditorState(collectionId);
                      this.loadCollection(collectionId);
                    } catch (err) {
                      console.error("Error saving item as draft:", err);
                      this.showToast(
                        err?.message || "Kunne ikke lagre utkast.",
                        "error",
                        5000,
                      );
                    }
                  },
                  {
                    loadingText:
                      '<span class="material-symbols-outlined" style="font-size:18px;">hourglass_top</span> Lagrer utkast...',
                  },
                );
              },
            );
          };
        }
      } catch (err) {
        this.isEditorOpen = false;
        console.error("Error opening editor:", err);
        const errorMsg = err.message || JSON.stringify(err);
        this.showToast(
          `Kunne ikke åpne elementet.Feilmelding: ${errorMsg}. Sjekk at Editor.js scriptet er lastet.`,
          "error",
          7000,
        );
      }
    },
  };
}
