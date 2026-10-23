// media library methods for AdminManager.
export function createMethods5({ firebaseService, adminUtils, showErrorUI }) {
  return {
    /**
     * Komprimerer bilde før opplasting
     */
    async compressImage(file, maxWidth = 1920, quality = 0.8) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = (maxWidth / width) * height;
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error("Klarte ikke å komprimere bildet."));
                  return;
                }
                resolve(
                  new File([blob], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  }),
                );
              },
              "image/jpeg",
              quality,
            );
          };
          img.onerror = () =>
            reject(new Error("Kunne ikke laste bilde for komprimering."));
        };
        reader.onerror = () => reject(new Error("Kunne ikke lese filen."));
      });
    },

    _initImageReplaceBehavior(editor, containerId, collectionId) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const injectDeleteButton = (wrapper) => {
        if (!wrapper || wrapper.querySelector(".btn-remove-block-image"))
          return;
        const btn = document.createElement("button");
        btn.className = "btn-remove-block-image";
        btn.type = "button";
        // Use inline SVG for maximum reliability (no font dependency)
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        btn.title = "Fjern bilde";
        wrapper.appendChild(btn);
      };

      // Scan existing images
      container
        .querySelectorAll(".image-tool__image, .block-image")
        .forEach(injectDeleteButton);

      // Observe for new images
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              if (
                node.classList.contains("image-tool__image") ||
                node.classList.contains("block-image")
              ) {
                injectDeleteButton(node);
              } else {
                node
                  .querySelectorAll(".image-tool__image, .block-image")
                  .forEach(injectDeleteButton);
              }
            }
          });
        });
      });

      observer.observe(container, { childList: true, subtree: true });

      // Delegate click handler on the editor container
      container.addEventListener("click", async (e) => {
        // Handle Delete Button Click
        const deleteBtn = e.target.closest(".btn-remove-block-image");
        if (deleteBtn) {
          e.stopPropagation();
          if (!confirm("Vil du fjerne dette bildet fra innholdet?")) return;

          const imageWrapper = deleteBtn.closest(
            ".image-tool__image, .block-image",
          );

          // Case 1: Standard EditorJS Block
          const ceBlock = imageWrapper.closest(".ce-block");
          const blockId = ceBlock?.dataset?.id;

          if (
            blockId &&
            editor?.blocks &&
            typeof editor.blocks.delete === "function"
          ) {
            try {
              const index = editor.blocks.getIndex(blockId);
              editor.blocks.delete(index);
              this.showToast("Bilde fjernet", "success");
              return;
            } catch (err) {
              console.warn("Could not delete via editor.blocks API:", err);
            }
          }

          // Case 2: Docs-like Editor or Fallback
          imageWrapper.remove();
          this.showToast("Bilde fjernet", "success");
          return;
        }

        const imageWrapper = e.target.closest(
          ".image-tool__image, .block-image",
        );
        if (!imageWrapper) return;

        // Don't interfere if the click is on a native file input already
        if (e.target.tagName === "INPUT") return;

        // Find the .ce-block ancestor to get the block ID
        const ceBlock = imageWrapper.closest(".ce-block");
        const blockId = ceBlock?.dataset?.id;

        const img =
          imageWrapper.querySelector("img") ||
          imageWrapper.querySelector(".image-tool__image-picture") ||
          imageWrapper;
        this.activateImageResizer(
          img,
          () => {
            if (
              blockId &&
              editor?.blocks &&
              typeof editor.save === "function"
            ) {
              editor
                .save()
                .then((savedOutput) => {
                  const allBlockEls = container.querySelectorAll(".ce-block");
                  const blockIndex = Array.from(allBlockEls).indexOf(ceBlock);
                  if (
                    blockIndex >= 0 &&
                    savedOutput.blocks[blockIndex]?.type === "image"
                  ) {
                    editor.blocks.update(blockId, {
                      ...savedOutput.blocks[blockIndex].data,
                      width: img.style.width,
                      height: img.style.height,
                      objectFit: img.style.objectFit,
                      objectPosition: img.style.objectPosition,
                      borderRadius: img.style.borderRadius,
                      margin: img.style.margin,
                    });
                  }
                })
                .catch(() => {});
            }
          },
          () => {
            this.showGlobalImageOptions(
              imageWrapper,
              container,
              editor,
              blockId,
              ceBlock,
              collectionId,
            );
          },
        );
      });
    },

    activateImageResizer(img, onComplete, onOpenSettings, onDelete) {
      const existing = document.getElementById("hkm-img-resizer");
      if (existing) existing.remove();

      if (!img || !img.parentElement) return;

      const overlay = document.createElement("div");
      overlay.id = "hkm-img-resizer";
      overlay.style.cssText = `
            position: absolute;
            box-sizing: border-box;
            border: 2px solid #d17d39;
            border-radius: ${getComputedStyle(img).borderRadius || "8px"};
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 0 0 1px rgba(255,255,255,0.8), 0 4px 15px rgba(209, 125, 57, 0.3);
        `;

      const updateOverlayPos = () => {
        const rect = img.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        overlay.style.top = rect.top + scrollY + "px";
        overlay.style.left = rect.left + scrollX + "px";
        overlay.style.width = rect.width + "px";
        overlay.style.height = rect.height + "px";
      };

      const toolbar = document.createElement("div");
      toolbar.style.cssText = `
            position: absolute;
            top: -42px;
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.3);
            white-space: nowrap;
            pointer-events: auto;
            z-index: 10001;
            font-family: system-ui, -apple-system, sans-serif;
        `;

      const sizeText = document.createElement("span");
      sizeText.id = "hkm-resizer-size-badge";
      const curW = img.style.width || `${img.clientWidth}px`;
      const curH = img.style.height || "auto";
      sizeText.textContent = `${curW} × ${curH} (${img.clientWidth}x${img.clientHeight}px)`;

      const settingsBtn = document.createElement("button");
      settingsBtn.type = "button";
      settingsBtn.style.cssText =
        "background:none; border:none; color:#fb923c; cursor:pointer; font-size:11px; font-weight:700; display:flex; align-items:center; gap:3px; padding:0; font-family:inherit;";
      settingsBtn.innerHTML =
        '<span class="material-symbols-outlined" style="font-size:14px;">tune</span> Innstillinger';
      settingsBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        overlay.remove();
        if (onOpenSettings) onOpenSettings(img);
        else if (typeof this.showGlobalImageOptions === "function")
          this.showGlobalImageOptions(
            img.closest(".image-tool__image, .block-image") || img,
          );
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.style.cssText =
        "background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; font-weight:700; display:flex; align-items:center; gap:3px; padding:0; font-family:inherit;";
      deleteBtn.innerHTML =
        '<span class="material-symbols-outlined" style="font-size:14px;">delete</span> Slett';
      deleteBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        overlay.remove();
        if (onDelete) {
          onDelete(img);
        } else if (confirm("Slette dette bildet?")) {
          const wrapper =
            img.closest(".image-tool__image, .block-image") || img;
          wrapper.remove();
        }
      };

      toolbar.appendChild(sizeText);
      toolbar.appendChild(document.createTextNode(" • "));
      toolbar.appendChild(settingsBtn);
      toolbar.appendChild(document.createTextNode(" • "));
      toolbar.appendChild(deleteBtn);
      overlay.appendChild(toolbar);

      const handles = [
        {
          name: "se",
          cursor: "nwse-resize",
          style: "bottom: -7px; right: -7px;",
        },
        {
          name: "sw",
          cursor: "nesw-resize",
          style: "bottom: -7px; left: -7px;",
        },
        { name: "ne", cursor: "nesw-resize", style: "top: -7px; right: -7px;" },
        { name: "nw", cursor: "nwse-resize", style: "top: -7px; left: -7px;" },
        {
          name: "e",
          cursor: "ew-resize",
          style: "top: 50%; right: -7px; transform: translateY(-50%);",
        },
        {
          name: "s",
          cursor: "ns-resize",
          style: "bottom: -7px; left: 50%; transform: translateX(-50%);",
        },
      ];

      handles.forEach((h) => {
        const handleEl = document.createElement("div");
        handleEl.style.cssText = `
                position: absolute;
                width: 13px;
                height: 13px;
                background: white;
                border: 2px solid #d17d39;
                border-radius: 50%;
                cursor: ${h.cursor};
                pointer-events: auto;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                z-index: 10002;
                ${h.style}
            `;

        handleEl.addEventListener("mousedown", (evt) => {
          evt.preventDefault();
          evt.stopPropagation();

          const startX = evt.clientX;
          const startY = evt.clientY;
          const startW = img.clientWidth;
          const startH = img.clientHeight;
          const parentW = img.parentElement
            ? img.parentElement.clientWidth || document.body.clientWidth
            : document.body.clientWidth;

          const onMouseMove = (moveEvt) => {
            const deltaX = moveEvt.clientX - startX;
            const deltaY = moveEvt.clientY - startY;

            let newW = startW;
            let newH = startH;

            if (h.name.includes("e")) newW = startW + deltaX;
            if (h.name.includes("w")) newW = startW - deltaX;
            if (h.name.includes("s")) newH = startH + deltaY;
            if (h.name.includes("n")) newH = startH - deltaY;

            newW = Math.max(30, newW);
            newH = Math.max(30, newH);

            const widthPercent = Math.min(
              100,
              Math.max(5, Math.round((newW / parentW) * 100)),
            );
            img.style.width = widthPercent + "%";
            img.style.height = Math.round(newH) + "px";
            img.style.objectFit = "cover";
            img.style.display = "block";

            sizeText.textContent = `${widthPercent}% (${Math.round(newW)}px × ${Math.round(newH)}px)`;
            updateOverlayPos();
          };

          const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            if (onComplete) onComplete(img);
          };

          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
        });

        overlay.appendChild(handleEl);
      });

      document.body.appendChild(overlay);
      updateOverlayPos();

      const scrollResizeHandler = () => updateOverlayPos();
      window.addEventListener("resize", scrollResizeHandler);
      window.addEventListener("scroll", scrollResizeHandler, true);

      const outsideClickListener = (evt) => {
        if (!overlay.contains(evt.target) && evt.target !== img) {
          overlay.remove();
          window.removeEventListener("resize", scrollResizeHandler);
          window.removeEventListener("scroll", scrollResizeHandler, true);
          document.removeEventListener("mousedown", outsideClickListener);
        }
      };
      setTimeout(
        () => document.addEventListener("mousedown", outsideClickListener),
        50,
      );
    },

    showGlobalImageOptions(
      imageWrapper,
      container,
      editor,
      blockId,
      ceBlock,
      collectionId,
    ) {
      let overlay = document.getElementById("global-image-options-modal");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "global-image-options-modal";
        overlay.className = "profile-modal";
        overlay.style.cssText = `
                display: none;
                z-index: 12000;
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.6);
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(8px);
            `;
        document.body.appendChild(overlay);
      }

      const imgElement =
        imageWrapper.querySelector("img") ||
        imageWrapper.querySelector(".image-tool__image-picture") ||
        imageWrapper;

      // Parse current styles
      const curWidth = imgElement.style.width || "100%";
      const curHeight = imgElement.style.height || "auto";
      const curRadius = imgElement.style.borderRadius || "8px";
      const curMargin = imgElement.style.margin || "";

      const curPosition = imgElement.style.objectPosition || "50% 50%";
      let curPosY = 50;
      const posParts = curPosition.split(" ");
      if (posParts.length > 1) {
        curPosY = parseInt(posParts[1]);
        if (isNaN(curPosY)) curPosY = 50;
      } else if (posParts.length === 1 && posParts[0].endsWith("%")) {
        curPosY = parseInt(posParts[0]);
        if (isNaN(curPosY)) curPosY = 50;
      }

      let curAlign = "center";
      if (
        curMargin.includes("auto 16px 0") ||
        curMargin.includes("auto 0") ||
        curMargin.endsWith(" 0")
      ) {
        curAlign = "left";
      } else if (
        curMargin.includes("0 16px auto") ||
        curMargin.includes("0 auto")
      ) {
        curAlign = "right";
      }

      overlay.innerHTML = `
            <div class="profile-modal-content card modern" style="max-width: 480px; width: 92%; border-radius: 20px; background: white; padding: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="color: #d17d39; font-size: 22px;">photo_size_select_large</span>
                        <span>Bildeinnstillinger & Størrelse</span>
                    </h3>
                    <button id="g-img-opt-close" style="background: #f1f5f9; border: none; color: #64748b; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
                    </button>
                </div>

                <!-- STØRRELSE & FORM -->
                <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 14px; border: 1px solid #e2e8f0;">
                    <!-- Bredde (Width) -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Bredde (Størrelse)</label>
                            <span id="g-img-val-width" style="font-size: 12px; font-weight: 600; color: #d17d39;">${curWidth}</span>
                        </div>
                        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                            <button class="g-img-preset-btn" data-type="width" data-val="25%" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">25%</button>
                            <button class="g-img-preset-btn" data-type="width" data-val="50%" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">50%</button>
                            <button class="g-img-preset-btn" data-type="width" data-val="75%" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">75%</button>
                            <button class="g-img-preset-btn" data-type="width" data-val="100%" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">100%</button>
                        </div>
                        <input type="range" id="g-img-slider-width" min="10" max="100" value="${parseInt(curWidth) || 100}" style="width: 100%; accent-color: #d17d39; cursor: pointer;">
                    </div>

                    <!-- Høyde (Height) -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Høyde</label>
                            <span id="g-img-val-height" style="font-size: 12px; font-weight: 600; color: #d17d39;">${curHeight}</span>
                        </div>
                        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                            <button class="g-img-preset-btn" data-type="height" data-val="auto" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Auto</button>
                            <button class="g-img-preset-btn" data-type="height" data-val="150px" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">150px</button>
                            <button class="g-img-preset-btn" data-type="height" data-val="250px" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">250px</button>
                            <button class="g-img-preset-btn" data-type="height" data-val="400px" style="flex: 1; padding: 6px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">400px</button>
                        </div>
                    </div>

                    <!-- Bilde-fokus / Manuell beskjæring (Object-Position) -->
                    <div style="background: white; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <label style="font-size: 13px; font-weight: 700; color: #334155;">Bilde-fokus (Vertikal beskjæring)</label>
                            <span id="g-img-val-focus" style="font-size: 12px; font-weight: 600; color: #d17d39;">${curPosY}%</span>
                        </div>
                        <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                            <button type="button" class="g-img-focus-btn" data-val="0%" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Topp (0%)</button>
                            <button type="button" class="g-img-focus-btn" data-val="50%" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Senter (50%)</button>
                            <button type="button" class="g-img-focus-btn" data-val="100%" style="flex: 1; padding: 6px; font-size: 11px; font-weight: 600; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer;">Bunn (100%)</button>
                        </div>
                        <input type="range" id="g-img-slider-focus" min="0" max="100" value="${curPosY}" style="width: 100%; accent-color: #d17d39; cursor: pointer;">
                    </div>

                    <!-- Justering (Alignment) & Hjørner -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">Plassering</label>
                            <div style="display: flex; gap: 4px;">
                                <button class="g-img-preset-btn ${curAlign === "left" ? "active" : ""}" data-type="align" data-val="left" title="Venstre" style="flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">format_align_left</span>
                                </button>
                                <button class="g-img-preset-btn ${curAlign === "center" ? "active" : ""}" data-type="align" data-val="center" title="Senter" style="flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">format_align_center</span>
                                </button>
                                <button class="g-img-preset-btn ${curAlign === "right" ? "active" : ""}" data-type="align" data-val="right" title="Høyre" style="flex: 1; padding: 8px; font-size: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                    <span class="material-symbols-outlined" style="font-size: 18px;">format_align_right</span>
                                </button>
                            </div>
                        </div>
                        <div>
                            <label style="font-size: 13px; font-weight: 700; color: #334155; display: block; margin-bottom: 6px;">Hjørner</label>
                            <select id="g-img-select-radius" style="width: 100%; padding: 8px 42px 8px 10px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13px; font-weight: 600; background-color: white;">
                                <option value="0px" ${curRadius === "0px" ? "selected" : ""}>Skarpe (0px)</option>
                                <option value="8px" ${curRadius === "8px" || curRadius === "" ? "selected" : ""}>Runde (8px)</option>
                                <option value="16px" ${curRadius === "16px" ? "selected" : ""}>Myke (16px)</option>
                                <option value="24px" ${curRadius === "24px" ? "selected" : ""}>Ekstra myke (24px)</option>
                                <option value="50%" ${curRadius === "50%" ? "selected" : ""}>Sirkel (50%)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- BILDEKILDE ACTIONS -->
                <div style="font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Bytt kilde eller slett</div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button id="g-img-opt-upload" class="prompt-btn primary" style="background: #1B4965 !important; border: none; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 13px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">upload_file</span>
                            <span>Last opp</span>
                        </button>
                        <button id="g-img-opt-unsplash" class="prompt-btn primary" style="background: #d17d39 !important; border: none; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 13px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">image_search</span>
                            <span>Unsplash</span>
                        </button>
                    </div>
                    <button id="g-img-opt-crop" class="prompt-btn primary" style="background: #0284c7 !important; border: none; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; color: white; font-weight: 600; font-size: 13px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">crop</span>
                        <span>Beskjær bilde</span>
                    </button>
                    <button id="g-img-opt-delete" class="prompt-btn secondary" style="background: #ef4444 !important; border: none; color: white !important; padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                        <span>Slett bilde</span>
                    </button>
                </div>
            </div>
        `;

      overlay.style.display = "flex";

      const closeOverlay = () => {
        overlay.style.display = "none";
      };

      overlay.onclick = (e) => {
        if (e.target === overlay) closeOverlay();
      };

      const closeBtn = document.getElementById("g-img-opt-close");
      if (closeBtn) closeBtn.onclick = closeOverlay;

      // Helper to update styles
      const updateStyle = (prop, val) => {
        if (prop === "width") {
          imgElement.style.width = val;
          imageWrapper.style.width = val;
          document.getElementById("g-img-val-width").textContent = val;
        } else if (prop === "height") {
          imgElement.style.height = val;
          if (val !== "auto") {
            imgElement.style.objectFit = "cover";
            if (!imgElement.style.objectPosition) {
              imgElement.style.objectPosition = "50% 50%";
            }
          } else {
            imgElement.style.objectFit = "";
          }
          document.getElementById("g-img-val-height").textContent = val;
        } else if (prop === "align") {
          imgElement.style.display = "block";
          imageWrapper.style.display = "block";
          if (val === "left") {
            imgElement.style.margin = "16px auto 16px 0";
            imageWrapper.style.margin = "16px auto 16px 0";
          } else if (val === "right") {
            imgElement.style.margin = "16px 0 16px auto";
            imageWrapper.style.margin = "16px 0 16px auto";
          } else {
            imgElement.style.margin = "16px auto";
            imageWrapper.style.margin = "16px auto";
          }
        } else if (prop === "radius") {
          imgElement.style.borderRadius = val;
        } else if (prop === "focus") {
          imgElement.style.objectPosition = `50% ${val}%`;
          imgElement.style.objectFit = "cover";
          const focusValEl = document.getElementById("g-img-val-focus");
          if (focusValEl) focusValEl.textContent = `${val}%`;
        }

        // Save styles to EditorJS block data!
        if (blockId && editor?.blocks && typeof editor.save === "function") {
          try {
            editor.save().then((savedOutput) => {
              const allBlockEls = container.querySelectorAll(".ce-block");
              const blockIndex = Array.from(allBlockEls).indexOf(ceBlock);
              if (
                blockIndex >= 0 &&
                savedOutput.blocks[blockIndex]?.type === "image"
              ) {
                const updatedData = {
                  ...savedOutput.blocks[blockIndex].data,
                  width: imgElement.style.width,
                  height: imgElement.style.height,
                  objectFit: imgElement.style.objectFit,
                  objectPosition: imgElement.style.objectPosition,
                  borderRadius: imgElement.style.borderRadius,
                  margin: imgElement.style.margin,
                };
                editor.blocks.update(blockId, updatedData);
              }
            });
          } catch (e) {}
        }
      };

      // Event listeners for width slider
      const widthSlider = document.getElementById("g-img-slider-width");
      if (widthSlider) {
        widthSlider.oninput = (e) => {
          imgElement.style.width = `${e.target.value}%`;
          imageWrapper.style.width = `${e.target.value}%`;
          const valEl = document.getElementById("g-img-val-width");
          if (valEl) valEl.textContent = `${e.target.value}%`;
        };
        widthSlider.onchange = (e) => {
          updateStyle("width", `${e.target.value}%`);
        };
      }

      // Event listeners for focus slider
      const focusSlider = document.getElementById("g-img-slider-focus");
      if (focusSlider) {
        focusSlider.oninput = (e) => {
          imgElement.style.objectPosition = `50% ${e.target.value}%`;
          imgElement.style.objectFit = "cover";
          const focusValEl = document.getElementById("g-img-val-focus");
          if (focusValEl) focusValEl.textContent = `${e.target.value}%`;
        };
        focusSlider.onchange = (e) => {
          updateStyle("focus", e.target.value);
        };
      }

      overlay.querySelectorAll(".g-img-focus-btn").forEach((btn) => {
        btn.onclick = () => {
          const val = btn.dataset.val;
          const numeric = parseInt(val) || 0;
          if (focusSlider) focusSlider.value = numeric;
          updateStyle("focus", numeric);
        };
      });

      // Event listeners for presets
      overlay.querySelectorAll(".g-img-preset-btn").forEach((btn) => {
        btn.onclick = () => {
          const type = btn.dataset.type;
          const val = btn.dataset.val;
          if (type === "width") {
            if (widthSlider) widthSlider.value = parseInt(val) || 100;
            updateStyle("width", val);
          } else if (type === "height") {
            updateStyle("height", val);
          } else if (type === "align") {
            overlay
              .querySelectorAll('.g-img-preset-btn[data-type="align"]')
              .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            updateStyle("align", val);
          }
        };
      });

      // Border radius select
      const radiusSelect = document.getElementById("g-img-select-radius");
      if (radiusSelect) {
        radiusSelect.onchange = (e) => {
          updateStyle("radius", e.target.value);
        };
      }

      // Upload from device
      document.getElementById("g-img-opt-upload").onclick = () => {
        closeOverlay();
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        fileInput.onchange = async (evt) => {
          const file = evt.target.files[0];
          fileInput.remove();
          if (!file) return;

          const picture = imageWrapper.querySelector(
            ".image-tool__image-picture",
          );
          const preloader = imageWrapper.querySelector(
            ".image-tool__image-preloader",
          );
          if (picture) {
            picture.style.opacity = "0.35";
            picture.style.transition = "opacity 0.2s";
          }
          if (preloader) preloader.style.display = "block";

          try {
            const path = `editor/${collectionId}/${Date.now()}_${file.name}`;
            const url = await firebaseService.uploadImage(file, path);

            imgElement.src = url;
            imgElement.setAttribute("src", url);
            if (picture) picture.style.opacity = "1";
            if (preloader) preloader.style.display = "none";

            const currentStyles = {
              width: imgElement.style.width,
              height: imgElement.style.height,
              objectFit: imgElement.style.objectFit,
              objectPosition: imgElement.style.objectPosition,
              borderRadius: imgElement.style.borderRadius,
              margin: imgElement.style.margin,
              display: imgElement.style.display,
            };

            if (blockId && editor?.blocks) {
              try {
                const savedOutput = await editor.save();
                const allBlockEls = container.querySelectorAll(".ce-block");
                const blockIndex = Array.from(allBlockEls).indexOf(ceBlock);

                if (
                  blockIndex >= 0 &&
                  savedOutput.blocks[blockIndex]?.type === "image"
                ) {
                  const updatedData = {
                    ...savedOutput.blocks[blockIndex].data,
                    ...currentStyles,
                    file: { url },
                  };
                  await editor.blocks.update(blockId, updatedData);
                  setTimeout(() => {
                    const newBlock = container.querySelector(
                      `.ce-block[data-id="${blockId}"]`,
                    );
                    if (newBlock) {
                      const newImg =
                        newBlock.querySelector("img") ||
                        newBlock.querySelector(".image-tool__image-picture");
                      if (newImg) {
                        newImg.src = url;
                        newImg.setAttribute("src", url);
                        Object.assign(newImg.style, currentStyles);
                      }
                    }
                  }, 50);
                }
              } catch (err) {
                console.warn(
                  "[ImageReplace] Could not call blocks.update():",
                  err,
                );
              }
            }

            this.showToast("Bilde oppdatert!", "success");
          } catch (err) {
            console.error("[ImageReplace] Upload failed:", err);
            if (picture) picture.style.opacity = "1";
            if (preloader) preloader.style.display = "none";
            this.showToast("Kunne ikke laste opp bilde.", "error");
          }
        };

        fileInput.click();
      };

      // Unsplash
      document.getElementById("g-img-opt-unsplash").onclick = () => {
        closeOverlay();
        if (window.unsplashManager) {
          window.unsplashManager.open((selection) => {
            if (selection && selection.url) {
              const url = selection.url;
              imgElement.src = url;
              imgElement.setAttribute("src", url);

              const currentStyles = {
                width: imgElement.style.width,
                height: imgElement.style.height,
                objectFit: imgElement.style.objectFit,
                objectPosition: imgElement.style.objectPosition,
                borderRadius: imgElement.style.borderRadius,
                margin: imgElement.style.margin,
                display: imgElement.style.display,
              };

              if (blockId && editor?.blocks) {
                try {
                  editor.save().then(async (savedOutput) => {
                    const allBlockEls = container.querySelectorAll(".ce-block");
                    const blockIndex = Array.from(allBlockEls).indexOf(ceBlock);
                    if (
                      blockIndex >= 0 &&
                      savedOutput.blocks[blockIndex]?.type === "image"
                    ) {
                      await editor.blocks.update(blockId, {
                        ...savedOutput.blocks[blockIndex].data,
                        ...currentStyles,
                        file: { url },
                      });
                      setTimeout(() => {
                        const newBlock = container.querySelector(
                          `.ce-block[data-id="${blockId}"]`,
                        );
                        if (newBlock) {
                          const newImg =
                            newBlock.querySelector("img") ||
                            newBlock.querySelector(
                              ".image-tool__image-picture",
                            );
                          if (newImg) {
                            newImg.src = url;
                            newImg.setAttribute("src", url);
                            Object.assign(newImg.style, currentStyles);
                          }
                        }
                      }, 50);
                    }
                  });
                } catch (e) {}
              }
              this.showToast("Bilde erstattet fra Unsplash!", "success");
            }
          });
        } else {
          this.showToast("Unsplash er ikke tilgjengelig.", "warning");
        }
      };

      // Crop
      document.getElementById("g-img-opt-crop").onclick = () => {
        closeOverlay();
        this.openImageCropper(
          imgElement.src,
          (newUrl) => {
            imgElement.src = newUrl;
            imgElement.setAttribute("src", newUrl);

            const currentStyles = {
              width: imgElement.style.width,
              height: imgElement.style.height,
              objectFit: imgElement.style.objectFit,
              objectPosition: imgElement.style.objectPosition,
              borderRadius: imgElement.style.borderRadius,
              margin: imgElement.style.margin,
              display: imgElement.style.display,
            };

            if (blockId && editor?.blocks) {
              try {
                editor.save().then(async (savedOutput) => {
                  const allBlockEls = container.querySelectorAll(".ce-block");
                  const blockIndex = Array.from(allBlockEls).indexOf(ceBlock);
                  if (
                    blockIndex >= 0 &&
                    savedOutput.blocks[blockIndex]?.type === "image"
                  ) {
                    await editor.blocks.update(blockId, {
                      ...savedOutput.blocks[blockIndex].data,
                      ...currentStyles,
                      file: { url: newUrl },
                    });
                    setTimeout(() => {
                      const newBlock = container.querySelector(
                        `.ce-block[data-id="${blockId}"]`,
                      );
                      if (newBlock) {
                        const newImg =
                          newBlock.querySelector("img") ||
                          newBlock.querySelector(".image-tool__image-picture");
                        if (newImg) {
                          newImg.src = newUrl;
                          newImg.setAttribute("src", newUrl);
                          Object.assign(newImg.style, currentStyles);
                        }
                      }
                    }, 50);
                  }
                });
              } catch (e) {}
            }
            this.showToast("Bilde beskjært!", "success");
          },
          "editor/" + (collectionId || "pages"),
        );
      };

      // Delete image
      document.getElementById("g-img-opt-delete").onclick = () => {
        closeOverlay();
        if (!confirm("Vil du fjerne dette bildet fra innholdet?")) return;
        if (
          blockId &&
          editor?.blocks &&
          typeof editor.blocks.delete === "function"
        ) {
          try {
            const index = editor.blocks.getIndex(blockId);
            editor.blocks.delete(index);
            this.showToast("Bilde fjernet", "success");
            return;
          } catch (err) {}
        }
      };
    },

    openImageCropper(imageSrc, onCropped, folderPath = "cropped") {
      const loadCropper = (cb) => {
        if (window.Cropper) {
          cb();
          return;
        }
        if (!document.querySelector('link[href*="cropper.min.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href =
            "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css";
          document.head.appendChild(link);
        }
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js";
        script.onload = cb;
        document.body.appendChild(script);
      };

      loadCropper(() => {
        let cropModal = document.getElementById("hkm-crop-modal");
        if (cropModal) cropModal.remove();

        cropModal = document.createElement("div");
        cropModal.id = "hkm-crop-modal";
        cropModal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.95);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                backdrop-filter: blur(10px);
            `;

        cropModal.innerHTML = `
                <div style="background: #1e293b; border-radius: 20px; width: 100%; max-width: 800px; display: flex; flex-direction: column; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); overflow: hidden; max-height: 90vh;">
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #334155; background: #0f172a;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="color: #d17d39;">crop</span>
                            <span>Beskjær / Roter bilde</span>
                        </h3>
                        <button id="hkm-crop-close" style="background: #334155; border: none; color: #94a3b8; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
                        </button>
                    </div>

                    <div style="flex: 1; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; min-height: 350px; position: relative;">
                        <div style="max-height: 50vh; width: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden; border-radius: 8px;">
                            <img id="hkm-crop-target" src="${imageSrc}" style="max-width: 100%; max-height: 45vh; display: block;" crossOrigin="anonymous">
                        </div>
                    </div>

                    <div style="padding: 16px 24px; background: #0f172a; border-top: 1px solid #334155; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;" class="hkm-crop-ratios">
                            <button data-ratio="NaN" class="crop-ratio-btn active" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">Fri</button>
                            <button data-ratio="1" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">1:1</button>
                            <button data-ratio="1.7777777777777777" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">16:9</button>
                            <button data-ratio="1.3333333333333333" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">4:3</button>
                            <button data-ratio="1.5" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">3:2</button>
                            <button data-ratio="0.6666666666666666" class="crop-ratio-btn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer;">2:3</button>
                        </div>

                        <div style="display: flex; gap: 8px; align-items: center;">
                            <button id="hkm-crop-rotate-l" style="padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer; display: flex; align-items: center;" title="Roter venstre">
                                <span class="material-symbols-outlined" style="font-size: 18px;">rotate_left</span>
                            </button>
                            <button id="hkm-crop-rotate-r" style="padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer; display: flex; align-items: center;" title="Roter høyre">
                                <span class="material-symbols-outlined" style="font-size: 18px;">rotate_right</span>
                            </button>
                            <button id="hkm-crop-zoom-in" style="padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer; display: flex; align-items: center;" title="Zoom inn">
                                <span class="material-symbols-outlined" style="font-size: 18px;">zoom_in</span>
                            </button>
                            <button id="hkm-crop-zoom-out" style="padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: white; cursor: pointer; display: flex; align-items: center;" title="Zoom ut">
                                <span class="material-symbols-outlined" style="font-size: 18px;">zoom_out</span>
                            </button>
                        </div>
                    </div>

                    <div style="padding: 16px 24px; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 12px; background: #0f172a;">
                        <button id="hkm-crop-cancel" style="padding: 10px 18px; border-radius: 10px; border: 1px solid #334155; background: transparent; color: #94a3b8; cursor: pointer; font-weight: 600; font-size: 14px;">Avbryt</button>
                        <button id="hkm-crop-save" style="padding: 10px 18px; border-radius: 10px; border: none; background: #1B4965; color: white; cursor: pointer; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">check</span>
                            <span>Lagre beskjæring</span>
                        </button>
                    </div>
                </div>
            `;

        if (!document.getElementById("hkm-crop-styles")) {
          const style = document.createElement("style");
          style.id = "hkm-crop-styles";
          style.textContent = `
                    .crop-ratio-btn { transition: all 0.2s ease; }
                    .crop-ratio-btn:hover { background: #334155 !important; }
                    .crop-ratio-btn.active { background: #d17d39 !important; border-color: #d17d39 !important; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `;
          document.head.appendChild(style);
        }

        document.body.appendChild(cropModal);

        const targetImg = document.getElementById("hkm-crop-target");
        let cropper = null;

        targetImg.onload = () => {
          cropper = new window.Cropper(targetImg, {
            viewMode: 1,
            dragMode: "move",
            background: false,
            responsive: true,
            checkOrientation: false,
          });
        };

        targetImg.onerror = () => {
          targetImg.removeAttribute("crossOrigin");
          cropper = new window.Cropper(targetImg, {
            viewMode: 1,
            dragMode: "move",
            background: false,
            responsive: true,
          });
        };

        cropModal.querySelectorAll(".crop-ratio-btn").forEach((btn) => {
          btn.onclick = () => {
            cropModal
              .querySelectorAll(".crop-ratio-btn")
              .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const ratio = parseFloat(btn.dataset.ratio);
            if (cropper) {
              cropper.setAspectRatio(isNaN(ratio) ? NaN : ratio);
            }
          };
        });

        document.getElementById("hkm-crop-rotate-l").onclick = () =>
          cropper && cropper.rotate(-90);
        document.getElementById("hkm-crop-rotate-r").onclick = () =>
          cropper && cropper.rotate(90);
        document.getElementById("hkm-crop-zoom-in").onclick = () =>
          cropper && cropper.zoom(0.1);
        document.getElementById("hkm-crop-zoom-out").onclick = () =>
          cropper && cropper.zoom(-0.1);

        const closeCrop = () => cropModal.remove();
        document.getElementById("hkm-crop-close").onclick = closeCrop;
        document.getElementById("hkm-crop-cancel").onclick = closeCrop;

        document.getElementById("hkm-crop-save").onclick = async () => {
          if (!cropper) return;
          const saveBtn = document.getElementById("hkm-crop-save");
          saveBtn.disabled = true;
          saveBtn.innerHTML =
            '<span class="material-symbols-outlined spinner" style="font-size: 18px; animation: spin 1s linear infinite;">sync</span><span>Lagrer...</span>';

          try {
            const canvas = cropper.getCroppedCanvas({
              imageSmoothingEnabled: true,
              imageSmoothingQuality: "high",
            });

            canvas.toBlob(
              async (blob) => {
                if (!blob) {
                  alert("Kunne ikke generere beskåret bilde.");
                  saveBtn.disabled = false;
                  saveBtn.innerHTML =
                    '<span class="material-symbols-outlined" style="font-size: 18px;">check</span><span>Lagre beskjæring</span>';
                  return;
                }

                const filename = `cropped_${Date.now()}.jpg`;
                const file = new File([blob], filename, { type: "image/jpeg" });
                const path = `${folderPath}/${Date.now()}_${filename}`;

                const service =
                  typeof firebaseService !== "undefined"
                    ? firebaseService
                    : window.firebaseService;
                const url = await service.uploadImage(file, path);

                onCropped(url);
                closeCrop();
              },
              "image/jpeg",
              0.92,
            );
          } catch (err) {
            console.error("Cropping failed:", err);
            alert("En feil oppstod under beskjæring: " + err.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML =
              '<span class="material-symbols-outlined" style="font-size: 18px;">check</span><span>Lagre beskjæring</span>';
          }
        };
      });
    },

    async renderMediaLibrarySection() {
      const section = document.getElementById("media-section");
      if (!section) return;

      section.innerHTML = `
            <div class="media-library-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 20px; margin-bottom: 32px;">
                <div class="stat-card" style="padding: 20px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(209, 125, 57, 0.1); color: #d17d39; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined">image</span>
                    </div>
                    <div>
                        <p style="font-size: 13px; color: #64748b; margin: 0;">Totalt antall filer</p>
                        <h4 id="media-count" style="font-size: 20px; font-weight: 700; margin: 0; color: #1e293b;">0</h4>
                    </div>
                </div>
                <div class="stat-card" style="padding: 20px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined">folder</span>
                    </div>
                    <div>
                        <p style="font-size: 13px; color: #64748b; margin: 0;">Mapper</p>
                        <h4 id="media-folder-count" style="font-size: 18px; font-weight: 700; margin: 0; color: #1e293b;">-</h4>
                    </div>
                </div>
            </div>

            <div class="media-controls-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 16px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; gap: 16px; flex-wrap: wrap;">
                <div class="media-breadcrumbs" id="media-breadcrumbs" style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: #64748b;">
                </div>

                <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748b; margin: 0;">
                        Område:
                        <select id="media-location-select" style="height: 36px; padding: 0 42px 0 12px; border-radius: 8px; border: 1px solid #e2e8f0; background-color: white; color: #1e293b; font-size: 13px; font-weight: 600; cursor: pointer; outline: none; min-width: 150px; box-sizing: border-box;">
                            ${this._getMediaLocationOptionsHtml()}
                        </select>
                    </label>
                    <button id="btn-new-folder" class="btn-secondary" style="height: 36px; padding: 0 14px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; color: #d17d39; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-sizing: border-box; margin: 0;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">create_new_folder</span>
                        Ny mappe
                    </button>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13px; color: #64748b;">Sorter:</span>
                        <select id="media-sort-select" style="height: 36px; padding: 0 42px 0 12px; border-radius: 8px; border: 1px solid #e2e8f0; background-color: white; color: #1e293b; font-size: 13px; font-weight: 500; cursor: pointer; outline: none; box-sizing: border-box;">
                            <option value="date-desc">Nyeste først</option>
                            <option value="date-asc">Eldste først</option>
                            <option value="name-asc">Navn (A-Å)</option>
                            <option value="name-desc">Navn (Å-A)</option>
                            <option value="size-desc">Størst først</option>
                            <option value="size-asc">Minst først</option>
                        </select>
                    </div>
                </div>
            </div>

            <div id="media-dropzone" class="media-dropzone" style="border: 2px dashed #cbd5e1; border-radius: 20px; padding: 40px; text-align: center; background: #f8fafc; margin-bottom: 32px; transition: all 0.3s ease; cursor: pointer;">
                <span class="material-symbols-outlined" style="font-size: 48px; color: #94a3b8; margin-bottom: 12px;">cloud_upload</span>
                <h3 style="margin: 0; font-size: 18px; color: #334155;">Dra bilder hit eller klikk for å laste opp</h3>
                <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Bilder lastes opp til: <strong id="current-upload-path" style="color: #d17d39;">Mediebibliotek</strong></p>
                <input type="file" id="media-file-input" style="display: none;" accept="image/*" multiple>
            </div>

            <div id="media-grid" class="media-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 24px;">
                <div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
                    <div class="loader" style="margin: 0 auto;"></div>
                    <p style="margin-top: 16px; color: #64748b;">Henter mediebibliotek...</p>
                </div>
            </div>
        `;

      section.setAttribute("data-rendered", "true");
      this.loadMediaLibrary();
      this._setupMediaLibraryListeners();
    },

    _getLegacyMediaPrefixForPath(path = "") {
      const normalized = String(path || "")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
      const parts = normalized.split("/").filter(Boolean);
      if (parts.length !== 2 || parts[0] !== "editor") return "";
      return parts[1];
    },

    _getMediaLocations() {
      return [
        { label: "Mediebibliotek", path: "editor/" },
        { label: "Blogg", path: "editor/blog/" },
        { label: "Undervisning", path: "editor/teaching/" },
        { label: "Arrangementer", path: "editor/events/" },

        { label: "Kurs", path: "editor/courses/" },
        { label: "Forside / hero", path: "hero/" },
        { label: "SEO / deling", path: "seo/" },
        { label: "Nyhetsbrev", path: "newsletter/images/" },
      ];
    },

    _getMediaLocationOptionsHtml() {
      const options = this._getMediaLocations()
        .map(
          (location) =>
            `<option value="${this.escapeHtml(location.path)}">${this.escapeHtml(location.label)}</option>`,
        )
        .join("");
      return `${options}<option value="__custom__">Ny mappe...</option>`;
    },

    _normalizeMediaPath(path = "") {
      const normalized = String(path || "editor/")
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/")
        .replace(/\s+/g, "_");
      return normalized.endsWith("/") ? normalized : `${normalized}/`;
    },

    _getMediaLocationValueForPath(path = "") {
      const normalized = this._normalizeMediaPath(path);
      return this._getMediaLocations().some(
        (location) => location.path === normalized,
      )
        ? normalized
        : "__custom__";
    },

    _promptForMediaPath() {
      const raw = prompt("Navn på mappe/område:", "");
      if (!raw || !raw.trim()) return null;

      const clean = raw
        .trim()
        .replace(/^\/+|\/+$/g, "")
        .replace(/^editor\/?/i, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_/-]/g, "");

      if (!clean) {
        alert("Ugyldig mappenavn");
        return null;
      }

      return this._normalizeMediaPath(`editor/${clean}`);
    },

    _getMediaPathDisplayName(path = "") {
      const normalized = String(path || "")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
      const parts = normalized
        .split("/")
        .filter(Boolean)
        .filter((part) => part !== "editor");
      if (!parts.length) return "Mediebibliotek";

      const labels = {
        blog: "Blogg",
        teaching: "Undervisning",
        podcast_transcripts: "Podkast",
        events: "Arrangementer",
        courses: "Kurs",
      };

      return parts
        .map(
          (part) =>
            labels[part] ||
            part
              .replace(/[-_]+/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase()),
        )
        .join(" / ");
    },

    async _getLegacyMediaFilesForPath(path = "") {
      const legacyPrefix = this._getLegacyMediaPrefixForPath(path);
      if (!legacyPrefix || !firebaseService?.listMediaFiles) return [];

      try {
        const rootMedia = await firebaseService.listMediaFiles(
          "editor/",
          false,
        );
        return (rootMedia.files || []).filter((file) => {
          const fullPath = String(file?.fullPath || "");
          const fileName = String(file?.name || "");
          return (
            fullPath.startsWith(`editor/${legacyPrefix}`) &&
            !fullPath.startsWith(`editor/${legacyPrefix}/`) &&
            fileName !== `${legacyPrefix}.keep` &&
            !fileName.endsWith(".keep")
          );
        });
      } catch (error) {
        console.warn(
          "[AdminManager] Could not load legacy media files:",
          error,
        );
        return [];
      }
    },

    _mergeMediaFiles(files = [], legacyFiles = []) {
      const seen = new Set();
      return [...files, ...legacyFiles].filter((file) => {
        const key = file?.fullPath || file?.url || file?.name;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },

    /**
     * Load and render the media library grid with folder support
     */
    async loadMediaLibrary() {
      const grid = document.getElementById("media-grid");
      const countEl = document.getElementById("media-count");
      const folderCountEl = document.getElementById("media-folder-count");
      const breadcrumbsEl = document.getElementById("media-breadcrumbs");
      const uploadPathEl = document.getElementById("current-upload-path");
      const sortSelect = document.getElementById("media-sort-select");
      const locationSelect = document.getElementById("media-location-select");

      if (!grid) return;
      if (sortSelect) this.mediaSortOrder = sortSelect.value;
      if (locationSelect)
        locationSelect.value = this._getMediaLocationValueForPath(
          this.currentMediaPath,
        );

      // Update upload path display
      if (uploadPathEl) {
        uploadPathEl.innerText = this._getMediaPathDisplayName(
          this.currentMediaPath,
        );
      }

      // Update breadcrumbs
      if (breadcrumbsEl) {
        const parts = this.currentMediaPath
          .replace("editor/", "")
          .split("/")
          .filter(Boolean);
        let html = `<span class="breadcrumb-item" data-path="editor/" style="cursor: pointer; color: #d17d39; hover: underline;">Hjem</span>`;

        let accumulatedPath = "editor/";
        parts.forEach((part, index) => {
          accumulatedPath += part + "/";
          html += ` <span style="color: #cbd5e1;">/</span> <span class="breadcrumb-item" data-path="${accumulatedPath}" style="cursor: pointer; color: ${index === parts.length - 1 ? "#64748b" : "#d17d39"};">${part}</span>`;
        });
        breadcrumbsEl.innerHTML = html;

        // Add breadcrumb listeners
        breadcrumbsEl.querySelectorAll(".breadcrumb-item").forEach((item) => {
          item.onclick = (e) => {
            this.currentMediaPath = e.target.getAttribute("data-path");
            this.loadMediaLibrary();
          };
        });
      }

      try {
        const { files: rawFiles, folders } =
          await firebaseService.listMediaFiles(this.currentMediaPath, false);
        const files = this._mergeMediaFiles(
          rawFiles,
          await this._getLegacyMediaFilesForPath(this.currentMediaPath),
        );

        if (countEl) countEl.innerText = files.length;
        if (folderCountEl) folderCountEl.innerText = folders.length;

        if (files.length === 0 && folders.length === 0) {
          grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: #f8fafc; border-radius: 16px;">
                        <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px;">folder_open</span>
                        <p style="color: #64748b;">Denne mappen er tom.</p>
                    </div>
                `;
          return;
        }

        const sortedFiles = [...files]
          .filter((f) => !f.name.endsWith(".keep"))
          .sort((a, b) => {
            switch (this.mediaSortOrder) {
              case "date-asc":
                return (
                  new Date(a.updated || a.timeCreated) -
                  new Date(b.updated || b.timeCreated)
                );
              case "name-asc":
                return a.name.localeCompare(b.name);
              case "name-desc":
                return b.name.localeCompare(a.name);
              case "size-desc":
                return (b.size || 0) - (a.size || 0);
              case "size-asc":
                return (a.size || 0) - (b.size || 0);
              default:
                return (
                  new Date(b.updated || b.timeCreated) -
                  new Date(a.updated || a.timeCreated)
                );
            }
          });

        const folderHtml = folders
          .map(
            (folder) => `
                <div class="media-card media-folder" data-path="${folder.fullPath}/" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s ease; position: relative;">
                    <div style="height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 48px; color: #d17d39;">folder</span>
                        <span style="font-size: 14px; font-weight: 600; color: #1e293b;">${folder.name}</span>
                    </div>
                    <div class="media-actions" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;">
                        <button class="btn-delete-folder" data-path="${folder.fullPath}" title="Slett mappe" style="width: 32px; height: 32px; border-radius: 8px; background: rgba(239, 68, 68, 0.9); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                        </button>
                    </div>
                </div>
            `,
          )
          .join("");

        const fileHtml = sortedFiles
          .map(
            (file) => `
                <div class="media-card" style="background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; transition: all 0.2s ease;">
                    <div class="media-preview" style="height: 140px; background: #f1f5f9; position: relative; overflow: hidden;">
                        <img src="${file.url}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                        <div class="media-actions" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;">
                            <button class="btn-delete-file" data-path="${file.fullPath}" title="Slett" style="width: 32px; height: 32px; border-radius: 8px; background: rgba(239, 68, 68, 0.9); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
                            </button>
                        </div>
                    </div>
                    <div style="padding: 12px;">
                        <p style="font-size: 12px; font-weight: 600; color: #1e293b; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${file.name}">${file.name}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                            <span style="font-size: 10px; color: #64748b;">${file.size ? (file.size / 1024).toFixed(1) + " KB" : ""}</span>
                            <button class="btn-copy-url" data-url="${file.url}" style="font-size: 11px; font-weight: 700; color: #d17d39; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;">Kopier URL</button>
                        </div>
                    </div>
                </div>
            `,
          )
          .join("");

        grid.innerHTML = folderHtml + fileHtml;

        // Add folder click listeners
        grid.querySelectorAll(".media-folder").forEach((folder) => {
          folder.onclick = () => {
            this.currentMediaPath = folder.getAttribute("data-path");
            this.loadMediaLibrary();
          };
        });

        // Add hover effect for actions
        if (!document.getElementById("media-hover-styles")) {
          const style = document.createElement("style");
          style.id = "media-hover-styles";
          style.innerHTML = `
                    .media-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #cbd5e1 !important; }
                    .media-card:hover .media-actions { opacity: 1 !important; }
                    .btn-copy-url:hover { background: rgba(209, 125, 57, 0.05); }
                    .media-folder:hover { background: #fff7ed !important; border-color: #d17d39 !important; }
                `;
          document.head.appendChild(style);
        }
      } catch (error) {
        console.error("Error loading media library:", error);
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 20px;">Feil ved lasting av bibliotek: ${error.message}</p>`;
      }
    },

    /**
     * Setup event listeners for media library (upload, delete, copy, sort, folders)
     */
    _setupMediaLibraryListeners() {
      const dropzone = document.getElementById("media-dropzone");
      const fileInput = document.getElementById("media-file-input");
      const grid = document.getElementById("media-grid");
      const sortSelect = document.getElementById("media-sort-select");
      const locationSelect = document.getElementById("media-location-select");
      const btnNewFolder = document.getElementById("btn-new-folder");

      if (!dropzone || !fileInput || !grid) return;

      // Sorting
      if (sortSelect) {
        sortSelect.onchange = () => this.loadMediaLibrary();
      }

      if (locationSelect) {
        locationSelect.onchange = () => {
          const nextPath =
            locationSelect.value === "__custom__"
              ? this._promptForMediaPath()
              : locationSelect.value;

          if (!nextPath) {
            locationSelect.value = this._getMediaLocationValueForPath(
              this.currentMediaPath,
            );
            return;
          }

          this.currentMediaPath = this._normalizeMediaPath(nextPath);
          this.loadMediaLibrary();
        };
      }

      // Create Folder
      if (btnNewFolder) {
        btnNewFolder.onclick = async () => {
          const folderName = prompt("Navn på ny mappe:");
          if (folderName && folderName.trim()) {
            const cleanName = folderName
              .trim()
              .replace(/\s+/g, "_")
              .replace(/[^a-zA-Z0-9_-]/g, "");
            if (!cleanName) return alert("Ugyldig mappenavn");

            // Firebase Storage doesn't have empty folders.
            // We create a dummy .keep file to "create" the path.
            const dummyFile = new Blob([""], { type: "text/plain" });
            const path = `${this.currentMediaPath}${cleanName}/.keep`;

            try {
              await firebaseService.uploadFile(dummyFile, path);
              showToast("Mappe opprettet", "success");
              await this.loadMediaLibrary();
            } catch (err) {
              showToast("Kunne ikke opprette mappe", "error");
            }
          }
        };
      }

      // Click to upload
      dropzone.onclick = () => fileInput.click();

      // File input change
      fileInput.onchange = async (e) => {
        if (e.target.files.length > 0) {
          await this.handleMediaFileUpload(Array.from(e.target.files));
          fileInput.value = ""; // Reset
        }
      };

      // Drag & Drop
      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "#d17d39";
        dropzone.style.background = "#fff7ed";
      };

      dropzone.ondragleave = () => {
        dropzone.style.borderColor = "#cbd5e1";
        dropzone.style.background = "#f8fafc";
      };

      dropzone.ondrop = async (e) => {
        e.preventDefault();
        dropzone.style.borderColor = "#cbd5e1";
        dropzone.style.background = "#f8fafc";

        const files = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length > 0) {
          await this.handleMediaFileUpload(files);
        }
      };

      // Delegate grid actions (Copy URL, Delete)
      grid.onclick = async (e) => {
        const copyBtn = e.target.closest(".btn-copy-url");
        const deleteBtn = e.target.closest(".btn-delete-file");
        const deleteFolderBtn = e.target.closest(".btn-delete-folder");

        if (copyBtn) {
          const url = copyBtn.getAttribute("data-url");
          try {
            await navigator.clipboard.writeText(url);
            const originalText = copyBtn.innerText;
            copyBtn.innerText = "Kopiert!";
            copyBtn.style.color = "#10b981";
            setTimeout(() => {
              copyBtn.innerText = originalText;
              copyBtn.style.color = "#d17d39";
            }, 2000);
          } catch (err) {
            alert("Kunne ikke kopiere URL");
          }
        }

        if (deleteBtn) {
          const path = deleteBtn.getAttribute("data-path");
          if (
            confirm("Er du sikker på at du vil slette dette bildet permanent?")
          ) {
            await this.deleteMediaFile(path);
          }
        }

        if (deleteFolderBtn) {
          const path = deleteFolderBtn.getAttribute("data-path");
          if (
            confirm(
              "Er du sikker på at du vil slette denne mappen og ALT innholdet i den? Dette kan ikke angres.",
            )
          ) {
            await this.deleteMediaFolder(path);
          }
        }
      };
    },

    /**
     * Handle file upload with compression
     */
    async handleMediaFileUpload(files) {
      const grid = document.getElementById("media-grid");
      const dropzone = document.getElementById("media-dropzone");

      // Show loading state in dropzone
      const originalContent = dropzone.innerHTML;
      dropzone.innerHTML = `
            <div class="loader-sm" style="margin-bottom: 12px;"></div>
            <h3 style="margin: 0; font-size: 18px; color: #334155;">Laster opp ${files.length} bilde(r)...</h3>
            <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">Vennligst vent mens bildene komprimeres og lagres</p>
        `;
      dropzone.style.pointerEvents = "none";

      try {
        for (const file of files) {
          let fileToUpload = file;

          // Compress image if it's an image and browser-image-compression is available
          if (
            file.type.startsWith("image/") &&
            typeof imageCompression !== "undefined"
          ) {
            try {
              const options = {
                maxSizeMB: 1.5,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
              };
              fileToUpload = await imageCompression(file, options);
              // Maintain original extension but ensure it's a file object
              fileToUpload = new File([fileToUpload], file.name, {
                type: file.type,
              });
            } catch (error) {
              console.warn("Compression failed, uploading original:", error);
            }
          }

          const path = `${this.currentMediaPath}${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
          await firebaseService.uploadFile(fileToUpload, path);
        }

        showToast(`${files.length} bilde(r) ble lastet opp`, "success");
        await this.loadMediaLibrary();
      } catch (error) {
        console.error("Upload error:", error);
        showToast("Opplasting feilet: " + error.message, "error");
      } finally {
        dropzone.innerHTML = originalContent;
        dropzone.style.pointerEvents = "auto";
      }
    },

    /**
     * Delete a media file
     */
    async deleteMediaFile(path) {
      if (!confirm("Er du sikker på at du vil slette dette bildet permanent?"))
        return;
      try {
        await firebaseService.deleteFile(path);
        showToast("Bilde slettet", "success");
        await this.loadMediaLibrary();
      } catch (error) {
        console.error("Delete media error:", error);
        showToast("Kunne ikke slette bilde: " + error.message, "error");
      }
    },

    async deleteMediaFolder(path) {
      try {
        await firebaseService.deleteFolder(path);
        showToast("Mappe slettet", "success");
        await this.loadMediaLibrary();
      } catch (error) {
        console.error("Delete folder error:", error);
        showToast("Kunne ikke slette mappe: " + error.message, "error");
      }
    },
  };
}
