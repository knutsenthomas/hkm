// automation methods for AdminManager.
export function createAutomationMethods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async renderAutomationSection() {
      const section = document.getElementById("automation-section");
      if (!section) return;

      console.log("Rendering Automation Section...");
      this.initAutomationTabs();
      await Promise.all([this.loadEmailTemplates(), this.loadEmailLogs()]);

      section.setAttribute("data-rendered", "true");
    },

    initAutomationTabs() {
      const tabs = document.querySelectorAll(".automation-tab[data-tab]");
      const panes = document.querySelectorAll(".automation-pane");

      tabs.forEach((tab) => {
        if (tab.dataset.bound) return;
        tab.dataset.bound = "true";
        tab.addEventListener("click", () => {
          const target = tab.dataset.tab;

          tabs.forEach((t) => t.classList.toggle("active", t === tab));
          panes.forEach((p) =>
            p.classList.toggle("active", p.id === `automation-${target}`),
          );
        });
      });
    },

    async createAdminNotification(notifData) {
      try {
        await firebaseService.db.collection("admin_notifications").add({
          ...notifData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
        console.log("Admin notification created:", notifData);
      } catch (err) {
        console.warn("Failed to create admin notification:", err);
      }
    },
  };
}
