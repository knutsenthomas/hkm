// rich text methods for AdminManager.
export function createMethods31({ firebaseService, adminUtils, showErrorUI }) {
  return {
    _updatePricingModelUI(model = null) {
      const courseRadio = document.getElementById("pricing-model-course");
      const lessonRadio = document.getElementById("pricing-model-lesson");
      const currentModel =
        model || (lessonRadio?.checked ? "per_lesson" : "course");

      const courseLabel = document.getElementById("pricing-model-course-label");
      const lessonLabel = document.getElementById("pricing-model-lesson-label");
      const priceLabel = document.getElementById("course-price-label");
      const priceSuffixInput = document.getElementById("course-price-suffix");
      const quickChips = document.getElementById("suffix-quick-chips");

      if (currentModel === "per_lesson") {
        if (lessonRadio) lessonRadio.checked = true;
        if (courseLabel) {
          courseLabel.style.borderColor = "#e2e8f0";
          courseLabel.style.background = "white";
        }
        if (lessonLabel) {
          lessonLabel.style.borderColor = "#d17d39";
          lessonLabel.style.background = "#fffbf7";
        }
        if (priceLabel) {
          priceLabel.textContent = "Pris pr. leksjon (NOK) – 0 = gratis";
        }
        if (priceSuffixInput) {
          priceSuffixInput.placeholder = "Eks: pr. leksjon";
          if (
            !priceSuffixInput.value ||
            priceSuffixInput.value === "totalt" ||
            priceSuffixInput.value === "for hele kurset"
          ) {
            priceSuffixInput.value = "pr. leksjon";
          }
        }
        if (quickChips) {
          quickChips.innerHTML = `
                    <button type="button" class="btn-suffix-chip" data-val="pr. leksjon" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">+ "pr. leksjon"</button>
                    <button type="button" class="btn-suffix-chip" data-val="pr. kveld" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">+ "pr. kveld"</button>
                    <button type="button" class="btn-suffix-chip" data-val="" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">Tøm</button>
                `;
          quickChips.querySelectorAll(".btn-suffix-chip").forEach((btn) => {
            btn.onclick = () => {
              if (priceSuffixInput) priceSuffixInput.value = btn.dataset.val;
            };
          });
        }
        document
          .querySelectorAll("#lessons-container .lesson-row-item")
          .forEach((row) => {
            const input = row.querySelector(".lesson-price");
            const badge = row.querySelector(".lesson-price-included-badge");
            if (input) input.style.display = "block";
            if (badge) badge.style.display = "none";
          });
      } else {
        if (courseRadio) courseRadio.checked = true;
        if (courseLabel) {
          courseLabel.style.borderColor = "#d17d39";
          courseLabel.style.background = "#fffbf7";
        }
        if (lessonLabel) {
          lessonLabel.style.borderColor = "#e2e8f0";
          lessonLabel.style.background = "white";
        }
        if (priceLabel) {
          priceLabel.textContent = "Pris for hele kurset (NOK) – 0 = gratis";
        }
        if (priceSuffixInput) {
          priceSuffixInput.placeholder =
            "Eks: totalt (eller la stå tomt for kun kr)";
          if (
            priceSuffixInput.value === "pr. leksjon" ||
            priceSuffixInput.value === "pr. kveld"
          ) {
            priceSuffixInput.value = "totalt";
          }
        }
        if (quickChips) {
          quickChips.innerHTML = `
                    <button type="button" class="btn-suffix-chip" data-val="totalt" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">+ "totalt"</button>
                    <button type="button" class="btn-suffix-chip" data-val="for hele kurset" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">+ "for hele kurset"</button>
                    <button type="button" class="btn-suffix-chip" data-val="" style="font-size:0.75rem;padding:3px 8px;border-radius:6px;border:1px solid #cbd5e1;background:#f8fafc;cursor:pointer;color:#475569;">Bare "kr" (tom)</button>
                `;
          quickChips.querySelectorAll(".btn-suffix-chip").forEach((btn) => {
            btn.onclick = () => {
              if (priceSuffixInput) priceSuffixInput.value = btn.dataset.val;
            };
          });
        }
        document
          .querySelectorAll("#lessons-container .lesson-row-item")
          .forEach((row) => {
            const input = row.querySelector(".lesson-price");
            const badge = row.querySelector(".lesson-price-included-badge");
            if (input) input.style.display = "none";
            if (badge) badge.style.display = "flex";
          });
      }
    },

    _wireRteToolbar(toolbarId, editorId) {
      const toolbar = document.getElementById(toolbarId);
      const editor = document.getElementById(editorId);
      if (!toolbar || !editor) return;

      // Execute formatting commands
      toolbar.querySelectorAll(".rte-btn").forEach((btn) => {
        btn.addEventListener("mousedown", (e) => {
          e.preventDefault(); // keep focus in editor
          const cmd = btn.dataset.cmd;
          const val = btn.dataset.val || null;
          document.execCommand(cmd, false, val);
          editor.focus();
          this._updateRteActiveStates(toolbar);
        });
      });

      // Update active states on selection change
      editor.addEventListener("keyup", () =>
        this._updateRteActiveStates(toolbar),
      );
      editor.addEventListener("mouseup", () =>
        this._updateRteActiveStates(toolbar),
      );
      editor.addEventListener("focus", () =>
        toolbar?.classList.add("rte-focused"),
      );
      editor.addEventListener("blur", () =>
        toolbar?.classList.remove("rte-focused"),
      );
    },

    _updateRteActiveStates(toolbar) {
      const cmds = [
        "bold",
        "italic",
        "underline",
        "insertUnorderedList",
        "insertOrderedList",
      ];
      cmds.forEach((cmd) => {
        const btn = toolbar?.querySelector(`[data-cmd="${cmd}"]`);
        if (btn)
          btn.classList.toggle("active", document.queryCommandState(cmd));
      });
    },
  };
}
