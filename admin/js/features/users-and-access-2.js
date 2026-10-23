// users and access methods for AdminManager.
export function createUsersAndAccess2Methods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    async saveUser(userId, data) {
      // Remove undefined/null fields to prevent Firestore errors and clean up data
      const cleanData = {};
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          cleanData[key] = data[key];
        }
      });

      try {
        if (userId) {
          // Update
          await firebaseService.db
            .collection("users")
            .doc(userId)
            .set(
              {
                ...cleanData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          this.showToast("Bruker oppdatert.", "success");
        } else {
          // Create (Placeholder for Firestore metadata - User still needs Auth account)
          const newDoc = await firebaseService.db.collection("users").add({
            ...cleanData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });

          // Admin Notification
          await this.createAdminNotification({
            type: "NEW_USER",
            userId: newDoc.id,
            userEmail: cleanData.email,
            userName: cleanData.displayName,
            message: `Ny bruker registrert: ${cleanData.displayName || cleanData.email}`,
          });

          this.showToast(
            "Brukerrettigheter opprettet og admin varslet.",
            "success",
          );
        }
        await this.loadUsersList();
      } catch (error) {
        console.error("Error saving user:", error);
        this.showToast("Kunne ikke lagre bruker: " + error.message, "error");
      }
    },

    async handleUserPhotoUpload(userId, file) {
      const progressBar = document.getElementById("upload-progress-bar");
      const progressContainer = document.getElementById(
        "upload-progress-container",
      );
      const avatar = document.querySelector(".user-avatar-lg");

      if (progressContainer) progressContainer.style.display = "block";

      try {
        const path = `profiles/${userId}/avatar_${Date.now()}.jpg`;
        const url = await firebaseService.uploadImage(
          file,
          path,
          (progress) => {
            if (progressBar) progressBar.style.value = progress;
          },
        );

        // Update local state and UI immediately
        if (avatar) {
          avatar.style.backgroundImage = `url('${url}')`;
          avatar.style.backgroundColor = "transparent";
          avatar.innerHTML = `
                                                                            <div id="change-photo-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; border-radius: inherit; cursor: pointer; color: white;">
                                                                                <span class="material-symbols-outlined">photo_camera</span>
                                                                            </div>
                                                                            <input type="file" id="user-photo-input" style="display: none;" accept="image/*">
                                                                                `;
          // Re-bind listeners as internalHTML was reset
          const overlay = document.getElementById("change-photo-overlay");
          const fileInput = document.getElementById("user-photo-input");
          if (overlay && fileInput) {
            overlay.onclick = () => fileInput.click();
            fileInput.onchange = (e) =>
              this.handleUserPhotoUpload(userId, e.target.files[0]);
          }
        }

        // Update in Firestore
        await firebaseService.db.collection("users").doc(userId).update({
          photoURL: url,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        this.showToast("Profilbilde er oppdatert.", "success");
      } catch (error) {
        console.error("Error uploading photo:", error);
        this.showToast("Kunne ikke laste opp bilde: " + error.message, "error");
      } finally {
        if (progressContainer) progressContainer.style.display = "none";
      }
    },

    async deleteUser(userId) {
      try {
        await firebaseService.db.collection("users").doc(userId).delete();
        this.showToast("Bruker fjernet fra oversikten.", "success");
        await this.loadUsersList();
      } catch (error) {
        console.error("Error deleting user:", error);
        this.showToast("Kunne ikke slette bruker: " + error.message, "error");
      }
    },
  };
}
