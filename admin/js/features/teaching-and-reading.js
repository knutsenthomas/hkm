// teaching and reading methods for AdminManager.
export function createMethods30({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async renderTeachingManager() {
      this.renderCollectionEditor("teaching", "Undervisning");
    },

    async renderReadingPlansManager() {
      const section = document.getElementById("reading-plans-section");
      if (section) {
        section.setAttribute("data-rendered", "true");
      }
    },
  };
}
