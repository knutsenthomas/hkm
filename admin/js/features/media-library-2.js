// media library methods for AdminManager.
export function createMethods6({ firebaseService, adminUtils, showErrorUI }) {
  return {
    /**
     * Opens a modal to select an image from the media library
     */
    async openMediaLibraryModal(callback) {
      const modal = document.createElement("div");
      modal.className = "admin-modal hkm-media-modal-wrapper";
      modal.style.zIndex = "10000";
      modal.innerHTML = `
            <div class="admin-modal-content" style="max-width: 960px; height: 85vh; display: flex; flex-direction: column; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);">
                <div class="admin-modal-header" style="flex-shrink: 0; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: #ffffff; display: flex; justify-content: space-between; align-items: center;">
                    <div class="header-left" style="display: flex; align-items: center; gap: 12px; color: #1B4965;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(209, 125, 57, 0.1); color: #d17d39; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined" style="font-size: 24px;">photo_library</span>
                        </div>
                        <div>
                            <h2 style="font-size: 20px; font-weight: 800; margin: 0; color: #0f172a;">Bilde- og medievelger</h2>
                            <p style="margin: 0; font-size: 13px; color: #64748b;">Velg fra biblioteket, last opp fra enhet eller sett inn via URL</p>
                        </div>
                    </div>
                    <button class="close-modal-btn" style="background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s ease;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
                    </button>
                </div>

                <!-- Multi-source Navigation Tabs -->
                <div class="modal-tabs-header" style="display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; flex-shrink: 0; padding: 0 20px; gap: 8px; overflow-x: auto;">
                    <button class="modal-tab-btn active" data-tab="library" style="padding: 14px 18px; font-weight: 700; font-size: 14px; border: none; background: none; border-bottom: 3px solid #d17d39; color: #d17d39; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s ease; white-space: nowrap;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">perm_media</span> Mediebibliotek
                    </button>
                    <button class="modal-tab-btn" data-tab="upload" style="padding: 14px 18px; font-weight: 700; font-size: 14px; border: none; background: none; border-bottom: 3px solid transparent; color: #64748b; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s ease; white-space: nowrap;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">upload_file</span> Last opp fra enhet
                    </button>
                    <button class="modal-tab-btn" data-tab="url" style="padding: 14px 18px; font-weight: 700; font-size: 14px; border: none; background: none; border-bottom: 3px solid transparent; color: #64748b; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s ease; white-space: nowrap;">
                        <span class="material-symbols-outlined" style="font-size: 20px;">link</span> Sett inn fra nett
                    </button>
                </div>

                <!-- Body Pane Container -->
                <div class="admin-modal-body" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; padding: 0; background: #ffffff;">
                    
                    <!-- TAB 1: LIBRARY -->
                    <div id="media-tab-library" class="media-tab-pane" style="display: flex; flex-direction: column; height: 100%;">
                        <div id="modal-media-controls" style="padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; flex-wrap: wrap; gap: 12px;">
                            <div id="modal-media-breadcrumbs" style="display: flex; gap: 8px; align-items: center; font-size: 14px; color: #64748b; flex: 1; min-width: 200px;">
                                <!-- Breadcrumbs -->
                            </div>
                            <div class="media-actions" style="display: flex; gap: 8px; align-items: center;">
                                <select id="modal-media-sort" class="admin-input" style="width: auto; padding: 6px 42px 6px 12px; font-size: 13px; height: 38px; border-radius: 10px; border: 1px solid #cbd5e1; background-color: #ffffff;">
                                    <option value="date_desc">Nyeste først</option>
                                    <option value="date_asc">Eldste først</option>
                                    <option value="name_asc">Navn A-Å</option>
                                    <option value="size_desc">Størst først</option>
                                </select>
                                <button id="modal-new-folder" class="btn-ghost" style="height: 38px; padding: 0 14px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: #475569;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">create_new_folder</span> Ny mappe
                                </button>
                                <button id="modal-quick-upload-btn" class="btn-primary" style="height: 38px; padding: 0 16px; font-size: 13px; border-radius: 10px; background: linear-gradient(135deg, #d17d39, #bd4f2a); color: white; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">upload</span> Last opp
                                </button>
                                <input type="file" id="modal-file-input" style="display:none;" accept="image/*,video/*" multiple>
                            </div>
                        </div>
                        <div id="modal-media-grid" class="media-grid" style="flex: 1; overflow-y: auto; padding: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr)); gap: 16px;">
                            <div class="admin-loading" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                                <div class="spinner"></div>
                                <p style="margin-top: 12px; color: #64748b; font-size: 14px;">Henter filer...</p>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: UPLOAD FROM DEVICE (PC / PHONE) -->
                    <div id="media-tab-upload" class="media-tab-pane" style="display: none; padding: 32px 24px; flex-direction: column; gap: 24px;">
                        <div id="modal-device-dropzone" style="border: 2px dashed rgba(209, 125, 57, 0.4); border-radius: 16px; background: #f8fafc; padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.25s ease;">
                            <div style="width: 60px; height: 60px; border-radius: 16px; background: rgba(209, 125, 57, 0.1); color: #d17d39; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                                <span class="material-symbols-outlined" style="font-size: 32px;">cloud_upload</span>
                            </div>
                            <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 8px;">Dra og slipp filer her</h3>
                            <p style="font-size: 14px; color: #64748b; margin: 0 0 24px; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.5;">
                                Velg et bilde eller en videofil fra din datamaskin, mobiltelefon eller foto-bibliotek.
                            </p>
                            <button type="button" id="btn-trigger-device-picker" style="height: 44px; padding: 0 28px; border-radius: 12px; font-size: 14px; font-weight: 700; background: linear-gradient(135deg, #d17d39, #bd4f2a); color: white; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; box-shadow: 0 4px 14px rgba(209, 125, 57, 0.25); transition: transform 0.2s ease;">
                                <span class="material-symbols-outlined" style="font-size: 20px;">photo_camera</span>
                                Velg fra enhet / kamerarull
                            </button>
                            <input type="file" id="modal-tab-file-input" accept="image/*,video/*" multiple style="display: none;">
                        </div>

                        <div id="modal-tab-upload-progress" style="display: none; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);">
                            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                                <span id="modal-tab-upload-status">Laster opp filer...</span>
                                <span id="modal-tab-upload-percent">0%</span>
                            </div>
                            <div style="height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                                <div id="modal-tab-upload-bar" style="height: 100%; width: 0%; background: linear-gradient(135deg, #d17d39, #bd4f2a); border-radius: 4px; transition: width 0.2s;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 3: PASTE WEB URL -->
                    <div id="media-tab-url" class="media-tab-pane" style="display: none; padding: 32px 24px; flex-direction: column; gap: 24px;">
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                            <div>
                                <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 6px; display: flex; align-items: center; gap: 8px;">
                                    <span class="material-symbols-outlined" style="color: #d17d39;">link</span>
                                    Sett inn bilde eller media fra nett
                                </h3>
                                <p style="font-size: 13px; color: #64748b; margin: 0;">Lim inn en bilde-URL (f.eks. .jpg, .png, .webp) eller videolenke fra internett.</p>
                            </div>
                            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                <input type="url" id="modal-web-url-input" placeholder="https://eksempel.no/bilde.jpg" style="flex: 1; min-width: 260px; height: 44px; border-radius: 12px; border: 1px solid #cbd5e1; padding: 0 16px; font-size: 14px; outline: none; background: #ffffff;">
                                <button type="button" id="modal-web-url-submit" style="height: 44px; padding: 0 24px; border-radius: 12px; font-weight: 700; font-size: 14px; background: linear-gradient(135deg, #d17d39, #bd4f2a); color: white; border: none; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;">
                                    <span class="material-symbols-outlined" style="font-size: 20px;">add_link</span>
                                    Sett inn media
                                </button>
                            </div>
                            <div id="modal-web-url-preview-container" style="display: none; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; background: #000000; min-height: 180px; max-height: 320px; align-items: center; justify-content: center; position: relative;">
                                <!-- Live Preview inserted dynamically -->
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;

      document.body.appendChild(modal);
      requestAnimationFrame(() => modal.classList.add("is-active"));

      const closeBtn = modal.querySelector(".close-modal-btn");
      const grid = modal.querySelector("#modal-media-grid");
      const breadcrumbsContainer = modal.querySelector(
        "#modal-media-breadcrumbs",
      );
      const sortSelect = modal.querySelector("#modal-media-sort");
      const newFolderBtn = modal.querySelector("#modal-new-folder");
      const quickUploadBtn = modal.querySelector("#modal-quick-upload-btn");
      const fileInput = modal.querySelector("#modal-file-input");

      // Tab elements
      const tabBtns = modal.querySelectorAll(".modal-tab-btn");
      const tabPanes = {
        library: modal.querySelector("#media-tab-library"),
        upload: modal.querySelector("#media-tab-upload"),
        url: modal.querySelector("#media-tab-url"),
      };

      const switchTab = (tabName) => {
        tabBtns.forEach((btn) => {
          const isActive = btn.getAttribute("data-tab") === tabName;
          btn.classList.toggle("active", isActive);
          btn.style.color = isActive ? "#d17d39" : "#64748b";
          btn.style.borderBottomColor = isActive ? "#d17d39" : "transparent";
        });
        Object.keys(tabPanes).forEach((key) => {
          if (tabPanes[key])
            tabPanes[key].style.display = key === tabName ? "flex" : "none";
        });
      };

      tabBtns.forEach((btn) => {
        btn.onclick = () => switchTab(btn.getAttribute("data-tab"));
      });

      // Device Upload tab handlers
      const deviceDropzone = modal.querySelector("#modal-device-dropzone");
      const triggerDevicePicker = modal.querySelector(
        "#btn-trigger-device-picker",
      );
      const tabFileInput = modal.querySelector("#modal-tab-file-input");
      const tabProgressWrap = modal.querySelector("#modal-tab-upload-progress");
      const tabStatusEl = modal.querySelector("#modal-tab-upload-status");
      const tabPercentEl = modal.querySelector("#modal-tab-upload-percent");
      const tabProgressBar = modal.querySelector("#modal-tab-upload-bar");

      if (triggerDevicePicker && tabFileInput) {
        triggerDevicePicker.onclick = (e) => {
          e.stopPropagation();
          tabFileInput.click();
        };
      }
      if (deviceDropzone && tabFileInput) {
        deviceDropzone.onclick = () => tabFileInput.click();
        deviceDropzone.ondragover = (e) => {
          e.preventDefault();
          deviceDropzone.style.borderColor = "#d17d39";
          deviceDropzone.style.background = "#fff7ed";
        };
        deviceDropzone.ondragleave = () => {
          deviceDropzone.style.borderColor = "rgba(209, 125, 57, 0.4)";
          deviceDropzone.style.background = "#f8fafc";
        };
        deviceDropzone.ondrop = (e) => {
          e.preventDefault();
          deviceDropzone.style.borderColor = "rgba(209, 125, 57, 0.4)";
          deviceDropzone.style.background = "#f8fafc";
          if (e.dataTransfer.files && e.dataTransfer.files.length) {
            handleTabFilesUpload(Array.from(e.dataTransfer.files));
          }
        };
      }

      if (tabFileInput) {
        tabFileInput.onchange = (e) => {
          const files = Array.from(e.target.files);
          if (files.length) handleTabFilesUpload(files);
        };
      }

      const handleTabFilesUpload = async (files) => {
        if (!files || !files.length) return;
        try {
          if (tabProgressWrap) tabProgressWrap.style.display = "block";
          let doneCount = 0;
          for (const file of files) {
            let fileToUpload = file;
            if (
              file.type.startsWith("image/") &&
              typeof imageCompression !== "undefined"
            ) {
              try {
                const options = {
                  maxSizeMB: 1,
                  maxWidthOrHeight: 1920,
                  useWebWorker: true,
                };
                fileToUpload = await imageCompression(file, options);
              } catch (compErr) {
                console.error("Compression failed:", compErr);
              }
            }
            let uploadPath = currentPath || "editor/";
            if (!uploadPath.endsWith("/")) uploadPath += "/";
            const path =
              `${uploadPath}${file.name.replace(/\s+/g, "_")}`.replace(
                /\/+/g,
                "/",
              );

            const downloadUrl = await firebaseService.uploadFile(
              fileToUpload,
              path,
            );
            doneCount++;
            const pct = Math.round((doneCount / files.length) * 100);
            if (tabPercentEl) tabPercentEl.textContent = `${pct}%`;
            if (tabProgressBar) tabProgressBar.style.width = `${pct}%`;
            if (tabStatusEl)
              tabStatusEl.textContent = `Laster opp (${doneCount}/${files.length})...`;

            // If single file selected and callback supplied, close modal & return file
            if (files.length === 1 && typeof callback === "function") {
              showToast("Fil lastet opp!", "success");
              closeModal();
              callback({
                url: downloadUrl,
                name: file.name,
                size: file.size,
                timeCreated: Date.now(),
              });
              return;
            }
          }
          showToast("Opplasting ferdig!", "success");
          switchTab("library");
          loadModalMedia();
        } catch (err) {
          console.error("Upload error:", err);
          showToast("Opplasting feilet: " + err.message, "error");
        } finally {
          if (tabProgressWrap) tabProgressWrap.style.display = "none";
        }
      };

      // Web URL tab handlers
      const webUrlInput = modal.querySelector("#modal-web-url-input");
      const webUrlSubmit = modal.querySelector("#modal-web-url-submit");
      const webUrlPreview = modal.querySelector(
        "#modal-web-url-preview-container",
      );

      if (webUrlInput && webUrlPreview) {
        webUrlInput.oninput = () => {
          const url = webUrlInput.value.trim();
          if (!url) {
            webUrlPreview.style.display = "none";
            webUrlPreview.innerHTML = "";
            return;
          }
          webUrlPreview.style.display = "flex";
          if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
            webUrlPreview.innerHTML = `<video src="${url}" controls style="max-width:100%; max-height:300px; border-radius:10px;"></video>`;
          } else {
            webUrlPreview.innerHTML = `<img src="${url}" alt="Preview" style="max-width:100%; max-height:300px; object-fit:contain;" onerror="this.parentNode.style.display='none';">`;
          }
        };
      }

      if (webUrlSubmit && webUrlInput) {
        webUrlSubmit.onclick = () => {
          const url = webUrlInput.value.trim();
          if (!url) {
            showToast("Vennligst oppgi en gyldig nettadresse", "error");
            return;
          }
          if (typeof callback === "function") {
            closeModal();
            callback({ url: url, name: url.split("/").pop() || "Nettmedie" });
          }
        };
      }

      // Always start at root 'editor/' as per user request
      let currentPath = "editor/";
      currentPath = currentPath.replace(/\/+$/, "") + "/";
      currentPath = currentPath.replace(/\/+/g, "/");

      let currentSort = "date_desc";

      const closeModal = () => {
        modal.classList.remove("is-active");
        setTimeout(() => modal.remove(), 300);
      };

      closeBtn.onclick = closeModal;
      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };

      const loadModalMedia = async () => {
        grid.innerHTML =
          '<div class="admin-loading" style="grid-column: 1/-1; text-align: center; padding: 40px;"><div class="spinner"></div><p style="margin-top: 12px; color: #64748b; font-size: 14px;">Henter filer...</p></div>';

        // Render Breadcrumbs
        breadcrumbsContainer.innerHTML = "";
        const parts = currentPath.split("/").filter(Boolean);
        let pathAcc = "";

        const rootItem = document.createElement("span");
        rootItem.className = "breadcrumb-item";
        rootItem.style.cursor = "pointer";
        rootItem.style.color = "#d17d39";
        rootItem.style.fontWeight = "700";
        rootItem.innerHTML = "Hjem";
        rootItem.onclick = () => {
          currentPath = "editor/";
          loadModalMedia();
        };
        breadcrumbsContainer.appendChild(rootItem);

        parts.forEach((part, i) => {
          if (part === "editor") return;

          breadcrumbsContainer.appendChild(document.createTextNode(" / "));
          pathAcc += part + "/";
          const item = document.createElement("span");
          item.className = "breadcrumb-item";
          item.style.cursor = "pointer";
          item.style.fontWeight = i === parts.length - 1 ? "700" : "500";
          item.style.color = i === parts.length - 1 ? "#0f172a" : "#d17d39";
          item.innerText = part;
          const currentAcc = (parts[0] === "editor" ? "" : "editor/") + pathAcc;
          item.onclick = () => {
            currentPath = currentAcc;
            loadModalMedia();
          };
          breadcrumbsContainer.appendChild(item);
        });

        try {
          const result = await firebaseService.listMediaFiles(currentPath);
          let files = this._mergeMediaFiles(
            result.files,
            await this._getLegacyMediaFilesForPath(currentPath),
          );
          const folders = result.folders;

          // Sort files
          files.sort((a, b) => {
            if (currentSort === "date_desc")
              return b.timeCreated - a.timeCreated;
            if (currentSort === "date_asc")
              return a.timeCreated - b.timeCreated;
            if (currentSort === "name_asc") return a.name.localeCompare(b.name);
            if (currentSort === "size_desc") return b.size - a.size;
            return 0;
          });

          grid.innerHTML = "";

          if (folders.length === 0 && files.length === 0) {
            grid.innerHTML =
              '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">Mappen er tom.</div>';
            return;
          }

          // Render Folders
          folders.forEach((folder) => {
            const item = document.createElement("div");
            item.className = "media-item folder-item";
            item.style.cursor = "pointer";
            item.style.position = "relative";
            item.innerHTML = `
                        <div class="media-preview folder-preview" style="background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; height: 120px; transition: transform 0.2s ease;">
                            <span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8;">folder</span>
                        </div>
                        <div class="media-info" style="padding: 8px; text-align: center;">
                            <div class="media-name" style="font-size: 13px; font-weight: 600; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${folder.name}</div>
                        </div>
                        <button class="btn-delete-folder" data-path="${folder.fullPath}" title="Slett mappe" style="position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 6px; background: rgba(239, 68, 68, 0.9); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    `;

            const deleteBtn = item.querySelector(".btn-delete-folder");
            item.onmouseenter = () => {
              if (deleteBtn) deleteBtn.style.opacity = "1";
            };
            item.onmouseleave = () => {
              if (deleteBtn) deleteBtn.style.opacity = "0";
            };

            if (deleteBtn) {
              deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (
                  confirm(
                    "Er du sikker på at du vil slette denne mappen og ALT innholdet i den?",
                  )
                ) {
                  try {
                    await firebaseService.deleteFolder(folder.fullPath);
                    showToast("Mappe slettet", "success");
                    loadModalMedia();
                  } catch (err) {
                    showToast("Kunne ikke slette mappe", "error");
                  }
                }
              };
            }

            item.onclick = (e) => {
              if (e.target.closest(".btn-delete-folder")) return;
              currentPath =
                folder.fullPath + (folder.fullPath.endsWith("/") ? "" : "/");
              loadModalMedia();
            };
            grid.appendChild(item);
          });

          // Render Files
          files.forEach((file) => {
            if (file.name === ".keep") return;

            const isVideo =
              file.name.match(/\.(mp4|webm|ogg|mov)$/i) ||
              (file.contentType && file.contentType.startsWith("video/"));

            const item = document.createElement("div");
            item.className = "media-item";
            item.style.cursor = "pointer";
            item.style.position = "relative";
            item.innerHTML = `
                        <div class="media-preview" style="height: 120px; border-radius: 12px; overflow: hidden; background: #0f172a; border: 1px solid #e2e8f0; position: relative;">
                            ${
                              isVideo
                                ? `
                                <video src="${file.url}" style="width: 100%; height: 100%; object-fit: cover;"></video>
                                <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 36px; color: #ffffff;">play_circle</span>
                                </div>
                            `
                                : `
                                <img src="${file.url}" alt="${file.name}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                            `
                            }
                        </div>
                        <div class="media-info" style="padding: 8px;">
                            <div class="media-name" style="font-size: 12px; font-weight: 600; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</div>
                            <div class="media-meta" style="font-size: 11px; color: #94a3b8;">${(file.size / 1024).toFixed(0)} KB</div>
                        </div>
                        <button class="btn-delete-file" data-path="${file.fullPath}" title="Slett fil" style="position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 6px; background: rgba(239, 68, 68, 0.9); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>
                    `;

            const deleteBtn = item.querySelector(".btn-delete-file");
            item.onmouseenter = () => {
              if (deleteBtn) deleteBtn.style.opacity = "1";
            };
            item.onmouseleave = () => {
              if (deleteBtn) deleteBtn.style.opacity = "0";
            };

            if (deleteBtn) {
              deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (
                  confirm(
                    "Er du sikker på at du vil slette denne filen permanent?",
                  )
                ) {
                  try {
                    await firebaseService.deleteFile(file.fullPath);
                    showToast("Fil slettet", "success");
                    loadModalMedia();
                  } catch (err) {
                    showToast("Kunne ikke slette fil", "error");
                  }
                }
              };
            }

            item.onclick = (e) => {
              if (e.target.closest(".btn-delete-file")) return;
              callback(file);
              closeModal();
            };
            grid.appendChild(item);
          });
        } catch (err) {
          console.error("Modal media load error:", err);
          grid.innerHTML =
            '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">Kunne ikke hente media.</div>';
        }
      };

      newFolderBtn.onclick = async () => {
        const folderName = prompt("Navn på ny mappe:");
        if (folderName && folderName.trim()) {
          const path = `${currentPath}${folderName.trim()}/.keep`;
          try {
            const dummyFile = new Blob([""], { type: "text/plain" });
            await firebaseService.uploadFile(dummyFile, path);
            showToast("Mappe opprettet", "success");
            loadModalMedia();
          } catch (err) {
            showToast("Kunne ikke opprette mappe", "error");
          }
        }
      };

      if (quickUploadBtn && fileInput) {
        quickUploadBtn.onclick = () => fileInput.click();
      }

      if (fileInput) {
        fileInput.onchange = async (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) return;

          try {
            grid.innerHTML =
              '<div class="admin-loading" style="grid-column: 1/-1; text-align: center; padding: 40px;"><div class="spinner"></div><p style="margin-top: 12px; color: #64748b; font-size: 14px;">Laster opp filer...</p></div>';
            for (const file of files) {
              let fileToUpload = file;
              if (
                file.type.startsWith("image/") &&
                typeof imageCompression !== "undefined"
              ) {
                try {
                  const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                  };
                  fileToUpload = await imageCompression(file, options);
                } catch (compErr) {
                  console.error("Compression failed:", compErr);
                }
              }
              let uploadPath = currentPath;
              if (!uploadPath.endsWith("/")) uploadPath += "/";
              const path =
                `${uploadPath}${file.name.replace(/\s+/g, "_")}`.replace(
                  /\/+/g,
                  "/",
                );

              await firebaseService.uploadFile(fileToUpload, path);
            }
            showToast("Opplasting ferdig!", "success");
            loadModalMedia();
          } catch (err) {
            console.error("Upload error:", err);
            showToast("Opplasting feilet", "error");
            loadModalMedia();
          }
        };
      }

      sortSelect.onchange = (e) => {
        currentSort = e.target.value;
        loadModalMedia();
      };

      loadModalMedia();
    },

    async loadMediaSettings() {
      try {
        const settings = await firebaseService.getPageContent("settings_media");
        if (settings) {
          const ytChannel = document.getElementById("yt-channel-id");
          const ytApiKey = document.getElementById("yt-api-key");
          const ytPlaylists = document.getElementById("yt-playlists");

          if (settings.youtubeChannelId && ytChannel)
            ytChannel.value = settings.youtubeChannelId;
          if (settings.youtubeApiKey && ytApiKey)
            ytApiKey.value = settings.youtubeApiKey;
          if (settings.youtubePlaylists && ytPlaylists)
            ytPlaylists.value = settings.youtubePlaylists;
        }
      } catch (e) {
        console.error("Load media settings error:", e);
      }
    },

    async saveMediaSettings(buttonId = "save-media-settings") {
      const btn =
        document.getElementById(buttonId) ||
        document.getElementById("save-media-settings");
      const ytChannelInput = document.getElementById("yt-channel-id");
      const ytApiKeyInput = document.getElementById("yt-api-key");
      const ytPlaylistsInput = document.getElementById("yt-playlists");

      const originalText = btn?.textContent || "Lagre";
      if (btn) {
        btn.textContent = "Lagrer...";
        btn.disabled = true;
      }

      try {
        const currentSettings =
          (await firebaseService.getPageContent("settings_media")) || {};
        const nextSettings = {
          ...currentSettings,
          updatedAt: new Date().toISOString(),
        };

        if (ytChannelInput)
          nextSettings.youtubeChannelId = ytChannelInput.value.trim();
        if (ytApiKeyInput)
          nextSettings.youtubeApiKey = ytApiKeyInput.value.trim();
        if (ytPlaylistsInput)
          nextSettings.youtubePlaylists = ytPlaylistsInput.value.trim();

        await firebaseService.savePageContent("settings_media", nextSettings);
        this.showToast("Innstillingene er lagret!", "success", 5000);
      } catch (err) {
        console.error("Save media settings error:", err);
        this.showToast("Feil ved lagring: " + err.message, "error", 5000);
      } finally {
        if (btn) {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      }
    },

    updateCauseImagePreview() {
      const preview = document.getElementById("cause-image-preview");
      const value = document.getElementById("cause-image").value.trim();
      preview.hidden = !/^https?:\/\//i.test(value);
      if (!preview.hidden) preview.src = value;
    },

    async uploadCauseImage(file) {
      if (!file) return;
      const status = document.getElementById("cause-upload-status");
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        ) ||
        file.size > 20 * 1024 * 1024
      ) {
        status.textContent =
          "Velg et JPG-, PNG-, WebP- eller GIF-bilde på inntil 20 MB.";
        return;
      }
      const buttons = [
        "save-cause-btn",
        "save-cause-draft-btn",
        "cause-upload-btn",
      ].map((id) => document.getElementById(id));
      buttons.forEach((button) => (button.disabled = true));
      status.textContent = "Laster opp bilde …";
      try {
        const url = await firebaseService.uploadImage(
          file,
          `mediebibliotek/causes/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`,
        );
        document.getElementById("cause-image").value = url;
        this.updateCauseImagePreview();
        status.textContent =
          "Bildet er lastet opp. Lagre aksjonen for å beholde valget.";
      } catch {
        status.textContent = "Kunne ikke laste opp bildet. Prøv igjen.";
      } finally {
        buttons.forEach((button) => (button.disabled = false));
      }
    },

    /**
     * Handles image upload with compression and toast feedback.
     */
    async handleImageUpload(file, folder = "editor/blog") {
      if (!file) return null;
      try {
        const compressed = await this.compressImage(file, 1400, 0.85);

        // Normalize folder path
        let folderPath = folder || "editor/blog";
        if (!folderPath.endsWith("/")) folderPath += "/";
        folderPath = folderPath.replace(/\/+/g, "/");

        const fileName = `${folderPath}${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        return await firebaseService.uploadFile(compressed, fileName);
      } catch (err) {
        console.error("[AdminManager] Upload failed:", err);
        throw err;
      }
    },

    _formatPhotonAddress(properties = {}) {
      const street = [properties.street, properties.housenumber]
        .filter(Boolean)
        .join(" ")
        .trim();
      const primary =
        properties.name && !street
          ? properties.name
          : street || properties.name || "";
      const locality =
        properties.city ||
        properties.locality ||
        properties.district ||
        properties.county ||
        properties.state ||
        "";
      const regionLine = [properties.postcode, locality]
        .filter(Boolean)
        .join(" ")
        .trim();
      const country = properties.country || "";
      const label = [primary, regionLine, country].filter(Boolean).join(", ");

      return {
        address: primary || label,
        zip: properties.postcode || "",
        city: locality,
        country,
        countryCode: properties.countrycode || "",
        label,
      };
    },
  };
}
