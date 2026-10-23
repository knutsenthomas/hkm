// school and giving methods for AdminManager.
export function createSchoolAndGiving3Methods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    _renderEnrollmentsList() {
      const list = document.getElementById("enrollments-list");
      if (!list) return;

      const searchQuery = (
        document.getElementById("enrollment-search")?.value || ""
      )
        .trim()
        .toLowerCase();
      const courseFilter =
        document.getElementById("enrollment-course-filter")?.value || "";
      const statusFilter =
        document.getElementById("enrollment-status-filter")?.value || "";

      const filtered = (this.enrollmentItems || []).filter((item) => {
        const name = (item.name || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const phone = (item.phone || "").toLowerCase();
        const textMatch =
          !searchQuery ||
          name.includes(searchQuery) ||
          email.includes(searchQuery) ||
          phone.includes(searchQuery);
        const courseMatch =
          !courseFilter ||
          item.courseTitle === courseFilter ||
          item.courseId === courseFilter;
        const statusMatch = !statusFilter || item.status === statusFilter;
        return textMatch && courseMatch && statusMatch;
      });

      if (filtered.length === 0) {
        list.innerHTML = `
                <div style="text-align:center;padding:40px;color:#64748b;">
                    <span class="material-symbols-outlined" style="font-size:40px;color:#94a3b8;display:block;margin-bottom:8px;">search_off</span>
                    Ingen påmeldinger matcher søkekriteriene.
                </div>
            `;
        return;
      }

      const rows = filtered
        .map((item, index) => {
          const name = this.escapeHtml(item.name || "Ukjent");
          const email = this.escapeHtml(item.email || "Ingen e-post");
          const phone = this.escapeHtml(item.phone || "Ingen telefon");
          const courseTitle = this.escapeHtml(
            item.courseTitle || "Ukjent kurs",
          );
          const amount = Number(item.amount || 0);
          const method = this.escapeHtml(
            item.paymentMethod || item.method || "Forespørsel",
          );
          const status = item.status || "pending";

          let dateStr = "—";
          if (item.enrolledAt) {
            const dateObj = item.enrolledAt.toDate
              ? item.enrolledAt.toDate()
              : new Date(item.enrolledAt);
            dateStr = dateObj.toLocaleDateString("no-NO", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          }

          let badgeClass = "status-pending";
          let badgeText = "Venter";
          if (status === "paid" || status === "success") {
            badgeClass = "status-active";
            badgeText = "Godkjent";
          } else if (status === "refunded") {
            badgeClass = "status-stopped";
            badgeText = "Refundert";
          } else if (status === "pending_stripe") {
            badgeClass = "status-pending";
            badgeText = "Venter (Stripe)";
          } else if (status === "pending_vipps") {
            badgeClass = "status-pending";
            badgeText = "Venter (Vipps)";
          }

          const isApproved = status === "paid" || status === "success";
          const approveBtn = !isApproved
            ? `
                <button class="btn-primary" onclick="window.adminManager._approveEnrollment('${item.id}')" style="padding:6px 10px;border-radius:6px;font-size:12px;background:#16a34a;border:none;color:white;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                    <span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> Godkjenn
                </button>
            `
            : "";

          const refundBtn =
            status !== "refunded"
              ? `
                <button class="btn-secondary" onclick="window.adminManager._markEnrollmentRefunded('${item.id}')" style="padding:6px 10px;border-radius:6px;font-size:12px;color:#ef4444;border-color:#fee2e2;background:white;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                    <span class="material-symbols-outlined" style="font-size:14px;">keyboard_return</span> Refundert
                </button>
            `
              : "";

          const paidLessonsCount = Array.isArray(item.paidLessons)
            ? item.paidLessons.length
            : 0;
          const courseObj = (this.coursesItems || []).find(
            (c) => c.id === item.courseId || c.title === item.courseTitle,
          );
          const totalLessons =
            courseObj && Array.isArray(courseObj.lessons)
              ? courseObj.lessons.length
              : 0;

          let accessIcon = "lock";
          let accessColor = "#ef4444";
          let accessText = "Ingen tilgang (Venter)";

          if (isApproved) {
            accessIcon = "lock_open";
            accessColor = "#16a34a";
            accessText =
              paidLessonsCount > 0 && paidLessonsCount < totalLessons
                ? `${paidLessonsCount}/${totalLessons} deler`
                : "Full tilgang";
          } else if (paidLessonsCount > 0) {
            accessIcon = "lock_open";
            accessColor = "#d17d39";
            accessText = `${paidLessonsCount}/${totalLessons} deler godkjent`;
          }

          return `
                <tr>
                    <td style="min-width: 180px;">
                        <div style="font-weight: 600; color: #1e293b;">${name}</div>
                        <div style="font-size: 0.85rem; color: #64748b; word-break: break-all;">${email}</div>
                        <div style="font-size: 0.85rem; color: #64748b;">${phone}</div>
                    </td>
                    <td style="min-width: 160px;">
                        <div style="font-weight: 600; color: #1e293b;">${courseTitle}</div>
                        <div style="font-size: 0.85rem; color: ${accessColor}; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 14px;">${accessIcon}</span> ${accessText}
                        </div>
                    </td>
                    <td style="min-width: 110px;">
                        <div style="font-weight: 600; color: #1e293b;">kr ${amount.toLocaleString("no-NO")}</div>
                        <div style="font-size: 0.85rem; color: #64748b;">${method}</div>
                    </td>
                    <td style="font-size: 0.9rem; color: #475569; min-width: 110px;">${dateStr}</td>
                    <td style="min-width: 100px;"><span class="badge ${badgeClass}">${badgeText}</span></td>
                    <td class="col-actions" style="text-align:right;white-space:nowrap; min-width: 150px;">
                        <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center;">
                            ${approveBtn}
                            <button class="btn-secondary" onclick="window.adminManager._openLessonAccessModal('${item.id}')" style="padding:6px 10px;border-radius:6px;font-size:12px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-weight:600;">
                                <span class="material-symbols-outlined" style="font-size:14px;">rule</span> Leksjoner
                            </button>
                            ${refundBtn}
                            <button class="btn-secondary" onclick="window.adminManager._deleteEnrollment('${item.id}')" style="padding:6px 10px;border-radius:6px;font-size:12px;color:#ef4444;background:#fef2f2;border:none;cursor:pointer;" title="Slett påmelding">
                                <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");

      list.innerHTML = `
            <div class="table-container full-bleed" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%;">
                <table class="crm-table" style="min-width: 700px; width: 100%;">
                    <thead>
                        <tr>
                            <th style="min-width: 180px;">Deltaker</th>
                            <th style="min-width: 160px;">Kurs & Tilgang</th>
                            <th style="min-width: 110px;">Beløp / Metode</th>
                            <th style="min-width: 110px;">Dato registrert</th>
                            <th style="min-width: 100px;">Status</th>
                            <th style="text-align:right; min-width: 150px;">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    },

    async _approveEnrollment(id) {
      const confirmed = await this.showConfirm(
        "Godkjenn tilgang",
        "Vil du godkjenne denne påmeldingen? Brukeren vil få tilgang umiddelbart og en e-postbekreftelse vil bli sendt ut.",
        "Godkjenn",
      );
      if (!confirmed) return;

      try {
        const db = window.firebaseService?.db || firebase.firestore();
        await db.collection("courseEnrollments").doc(id).update({
          status: "paid",
          approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        this.showToast(
          "Tilgang godkjent og bekreftelses-e-post sendt!",
          "success",
        );
        await this._loadEnrollmentsList();
      } catch (err) {
        console.error("Approve enrollment error:", err);
        this.showToast("Kunne ikke godkjenne tilgang: " + err.message, "error");
      }
    },

    async _markEnrollmentRefunded(id) {
      const confirmed = await this.showConfirm(
        "Marker som refundert",
        "Vil du markere denne påmeldingen som refundert? Dette vil stoppe brukerens tilgang til kurset. Penger må refunderes manuelt i Stripe eller Vipps.",
        "Marker refundert",
      );
      if (!confirmed) return;

      try {
        const db = window.firebaseService?.db || firebase.firestore();
        await db.collection("courseEnrollments").doc(id).update({
          status: "refunded",
          refundedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        this.showToast(
          "Status oppdatert til refundert. Tilgang stoppet.",
          "success",
        );
        await this._loadEnrollmentsList();
      } catch (err) {
        console.error("Refund enrollment error:", err);
        this.showToast("Kunne ikke oppdatere status: " + err.message, "error");
      }
    },

    async _deleteEnrollment(id) {
      const confirmed = await this.showConfirm(
        "Slett påmelding",
        "Er du sikker på at du vil slette denne påmeldingsposten permanent? Denne handlingen kan ikke angres.",
        "Slett permanent",
      );
      if (!confirmed) return;

      try {
        const db = window.firebaseService?.db || firebase.firestore();
        await db.collection("courseEnrollments").doc(id).delete();
        this.showToast("Påmelding slettet.", "success");
        await this._loadEnrollmentsList();
      } catch (err) {
        console.error("Delete enrollment error:", err);
        this.showToast("Kunne ikke slette påmelding: " + err.message, "error");
      }
    },

    async _openLessonAccessModal(enrollmentId) {
      const modal = document.getElementById("lesson-access-modal");
      const container = document.getElementById("lesson-checkboxes-container");
      const enrollmentIdInput = document.getElementById("access-enrollment-id");
      const cancelBtn = document.getElementById("cancel-lesson-access");
      const closeBtn = document.getElementById("close-lesson-access-modal");
      const form = document.getElementById("lesson-access-form");

      if (!modal || !container || !enrollmentIdInput || !form) return;

      const enrollment = (this.enrollmentItems || []).find(
        (e) => e.id === enrollmentId,
      );
      if (!enrollment) return;

      const course = (this.coursesItems || []).find(
        (c) =>
          c.id === enrollment.courseId || c.title === enrollment.courseTitle,
      );
      if (
        !course ||
        !Array.isArray(course.lessons) ||
        course.lessons.length === 0
      ) {
        this.showToast(
          "Fant ingen leksjoner registrert for dette kurset.",
          "error",
        );
        return;
      }

      enrollmentIdInput.value = enrollmentId;
      container.innerHTML = "";

      const restrictedLessons = Array.isArray(enrollment.paidLessons)
        ? enrollment.paidLessons
        : [];
      const isFullAccess = restrictedLessons.length === 0;

      course.lessons.forEach((lesson) => {
        const isChecked = isFullAccess || restrictedLessons.includes(lesson.id);
        container.innerHTML += `
                <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;background:#f8fafc;transition:background 0.2s;">
                    <input type="checkbox" name="lesson-checkbox" value="${this.escapeHtml(lesson.id)}" ${isChecked ? "checked" : ""} style="width:18px;height:18px;accent-color:#1B4965;">
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:14px;color:#1e293b;">${this.escapeHtml(lesson.title || "Uten tittel")}</div>
                    </div>
                </label>
            `;
      });

      modal.style.display = "block";

      const closeModal = () => {
        modal.style.display = "none";
      };

      cancelBtn.onclick = closeModal;
      closeBtn.onclick = closeModal;

      form.onsubmit = async (e) => {
        e.preventDefault();
        const checkedBoxes = container.querySelectorAll(
          'input[name="lesson-checkbox"]:checked',
        );
        const totalCheckboxes = container.querySelectorAll(
          'input[name="lesson-checkbox"]',
        );

        let paidLessons = [];
        if (checkedBoxes.length < totalCheckboxes.length) {
          checkedBoxes.forEach((cb) => {
            paidLessons.push(cb.value);
          });
        }

        try {
          const db = window.firebaseService?.db || firebase.firestore();
          await db.collection("courseEnrollments").doc(enrollmentId).update({
            paidLessons: paidLessons,
          });
          this.showToast("Leksjonstilgang oppdatert!", "success");
          closeModal();
          await this._loadEnrollmentsList();
        } catch (err) {
          console.error("Save lesson access error:", err);
          this.showToast(
            "Kunne ikke oppdatere leksjonstilgang: " + err.message,
            "error",
          );
        }
      };
    },

    async _loadFinanceData() {
      const breakdownContainer = document.getElementById(
        "finance-courses-breakdown",
      );
      if (!breakdownContainer) return;

      try {
        const db = window.firebaseService?.db || firebase.firestore();

        // Fetch courses
        const fService = window.firebaseService;
        const coursesData =
          typeof fService?.getSiteContent === "function"
            ? await fService.getSiteContent("collection_courses")
            : null;
        const courses = Array.isArray(coursesData)
          ? coursesData
          : coursesData?.items || [];
        this.coursesItems = courses;

        // Fetch enrollments
        const enrollmentsSnapshot = await db
          .collection("courseEnrollments")
          .get();
        const enrollments = [];
        enrollmentsSnapshot.forEach((doc) => {
          enrollments.push({ id: doc.id, ...doc.data() });
        });
        this.enrollmentItems = enrollments;

        // Compute statistics
        let totalRevenue = 0;
        let pendingRevenue = 0;
        let refundedRevenue = 0;
        let paidCount = 0;

        enrollments.forEach((item) => {
          const amount = Number(item.amount || 0);
          const status = item.status || "pending";

          if (status === "paid" || status === "success") {
            totalRevenue += amount;
            paidCount++;
          } else if (status.startsWith("pending")) {
            pendingRevenue += amount;
          } else if (status === "refunded") {
            refundedRevenue += amount;
          }
        });

        // Update stats cards in UI
        const totalRevenueEl = document.getElementById("finance-total-revenue");
        const pendingRevenueEl = document.getElementById(
          "finance-pending-revenue",
        );
        const refundedRevenueEl = document.getElementById(
          "finance-refunded-revenue",
        );
        const paidCountEl = document.getElementById("finance-paid-count");

        if (totalRevenueEl)
          totalRevenueEl.innerText = `kr ${totalRevenue.toLocaleString("no-NO")}`;
        if (pendingRevenueEl)
          pendingRevenueEl.innerText = `kr ${pendingRevenue.toLocaleString("no-NO")}`;
        if (refundedRevenueEl)
          refundedRevenueEl.innerText = `kr ${refundedRevenue.toLocaleString("no-NO")}`;
        if (paidCountEl) paidCountEl.innerText = paidCount.toString();

        // Compute breakdown per course
        const courseStats = {};

        // Initialize with all courses
        courses.forEach((c) => {
          courseStats[c.id] = {
            title: c.title || "Uten tittel",
            totalStudents: 0,
            paidStudents: 0,
            revenue: 0,
            refunded: 0,
          };
        });

        // Group enrollments
        enrollments.forEach((item) => {
          const courseId = item.courseId;
          const courseTitle = item.courseTitle || "Ukjent kurs";
          const amount = Number(item.amount || 0);
          const status = item.status || "pending";

          // Find key by courseId, fallback to finding by title or creating a new entry
          let key = courseId;
          if (!key || !courseStats[key]) {
            const found = courses.find((c) => c.title === courseTitle);
            key = found ? found.id : courseId || courseTitle;
          }

          if (!courseStats[key]) {
            courseStats[key] = {
              title: courseTitle,
              totalStudents: 0,
              paidStudents: 0,
              revenue: 0,
              refunded: 0,
            };
          }

          courseStats[key].totalStudents++;
          if (status === "paid" || status === "success") {
            courseStats[key].paidStudents++;
            courseStats[key].revenue += amount;
          } else if (status === "refunded") {
            courseStats[key].refunded += amount;
          }
        });

        // Render breakdown table
        const statsList = Object.values(courseStats);
        if (statsList.length === 0) {
          breakdownContainer.innerHTML = `<p style="color:#64748b;text-align:center;padding:20px;">Ingen kurs er opprettet ennå.</p>`;
          return;
        }

        const rows = statsList
          .map((stat) => {
            const title = this.escapeHtml(stat.title);
            const total = stat.totalStudents;
            const paid = stat.paidStudents;
            const rev = stat.revenue;
            const ref = stat.refunded;

            return `
                    <tr>
                        <td style="font-weight: 600; color: #1e293b;">${title}</td>
                        <td style="text-align: center; color: #475569;">${total}</td>
                        <td style="text-align: center; color: #16a34a; font-weight: 600;">${paid}</td>
                        <td style="font-weight: 600; color: #1B4965;">kr ${rev.toLocaleString("no-NO")}</td>
                        <td style="color: #ef4444; font-weight: 500;">kr ${ref.toLocaleString("no-NO")}</td>
                    </tr>
                `;
          })
          .join("");

        breakdownContainer.innerHTML = `
                <div class="table-container full-bleed">
                    <table class="crm-table">
                        <thead>
                            <tr>
                                <th>Kursnavn</th>
                                <th style="text-align: center;">Meldt på totalt</th>
                                <th style="text-align: center;">Betalte deltakere</th>
                                <th>Omsetning</th>
                                <th>Refundert</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `;
      } catch (err) {
        console.error("Finance load error:", err);
        breakdownContainer.innerHTML = `<p style="color:#ef4444;text-align:center;padding:20px;">Kunne ikke laste økonomidata: ${err.message}</p>`;
      }
    },
  };
}
