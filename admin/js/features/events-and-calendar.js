// events and calendar methods for AdminManager.
export function createMethods17({ firebaseService, adminUtils, showErrorUI }) {
  return {
    /**
     * Clear the public site's event cache in localStorage.
     * This ensures visitors see changes immediately after an admin saves them.
     */
    clearPublicEventCache() {
      try {
        // Public site uses 'hkm_events_{startIso}_{endIso}' cache keys
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("hkm_events_")) {
            localStorage.removeItem(key);
            console.log(`[AdminManager] Cleared cache key: ${key}`);
          }
        });
      } catch (e) {
        console.warn("[AdminManager] Failed to clear public cache", e);
      }
    },

    /**
     * Helper to update or delete an event in Google Calendar via API.
     * @param {object} eventItem - The event data
     * @param {'PATCH' | 'DELETE'} method
     */
    /**
     * Helper to create, update or delete an event in Google Calendar via API.
     * @param {object} eventItem - The event data
     * @param {'POST' | 'PATCH' | 'DELETE'} method
     */
    async updateGoogleCalendarEvent(eventItem, method = "PATCH") {
      if (!this.googleAccessToken) {
        console.log(
          "[AdminManager] Google Access Token missing. Skipping GCal sync.",
        );
        return null;
      }

      const isDelete = method === "DELETE";
      const isPost = method === "POST" || (!eventItem.gcalId && !isDelete);

      if (!isPost && !eventItem.gcalId) {
        console.log(
          "[AdminManager] Item has no gcalId for update/delete. Skipping GCal sync.",
        );
        return null;
      }

      // Get the current calendar ID from settings
      const settings =
        (await firebaseService.getPageContent("settings_integrations")) || {};
      const calendarId = settings.googleCalendar?.calendarId;

      if (!calendarId) {
        this.showToast(
          "Kalender-ID mangler i innstillinger. Kan ikke synkronisere.",
          "error",
        );
        return null;
      }

      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      if (!isPost && eventItem.gcalId) {
        url += `/${encodeURIComponent(eventItem.gcalId)}`;
      }

      const httpMethod = isPost ? "POST" : isDelete ? "DELETE" : "PATCH";

      let fetchOptions = {
        method: httpMethod,
        headers: {
          Authorization: `Bearer ${this.googleAccessToken}`,
          "Content-Type": "application/json",
        },
      };

      if (!isDelete) {
        const description =
          typeof eventItem.content === "object" && eventItem.content?.blocks
            ? this.blocksToHtml(eventItem.content)
            : eventItem.description ||
              eventItem.excerpt ||
              eventItem.content ||
              "";

        let startIso =
          eventItem.start || eventItem.date || new Date().toISOString();
        if (startIso.length === 16) startIso += ":00+02:00";
        let startDateObj = new Date(startIso);
        let endIso =
          eventItem.end ||
          new Date(startDateObj.getTime() + 90 * 60 * 1000).toISOString();

        fetchOptions.body = JSON.stringify({
          summary: eventItem.title || "Uten navn",
          description: description,
          location: eventItem.location || "His Kingdom Ministry / Online",
          start: { dateTime: startIso },
          end: { dateTime: endIso },
        });
      }

      try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 404 && !isPost) {
            console.warn(
              "[AdminManager] GCal event not found in Google Calendar.",
            );
            return null;
          }
          throw new Error(
            errorData.error?.message || `API Status ${response.status}`,
          );
        }

        let resultData = null;
        if (!isDelete) {
          resultData = await response.json();
          if (resultData && resultData.id) {
            eventItem.gcalId = resultData.id;
          }
        }

        console.log(`[AdminManager] GCal sync (${httpMethod}) successful.`);
        this.showToast(
          `Google Calendar: ${isDelete ? "Slettet" : isPost ? "Opprettet i Google Kalender" : "Oppdatert"}`,
          "success",
          3000,
        );
        return resultData;
      } catch (error) {
        console.error("[AdminManager] Google Calendar sync failed:", error);
        if (
          error.message?.includes("401") ||
          error.message?.includes("token") ||
          error.message?.includes("expired")
        ) {
          this.googleAccessToken = null;
          this.showToast(
            "Google-tilkoblingen er utløpt. Vennligst koble til på nytt i Admin.",
            "error",
          );
        } else {
          this.showToast("GCal Sync feilet: " + error.message, "error");
        }
        return null;
      }
    },

    /**
     * Push all course lessons and CMS events into His Kingdom Ministry's Google Calendar.
     */
    async syncAllToGoogleCalendar() {
      if (!this.googleAccessToken) {
        try {
          this.showToast(
            "Åpner Google-innlogging for å gi tilgang til å opprette avtaler i Google Kalender...",
            "info",
            4000,
          );
          const result = await firebaseService.connectToGoogle();
          if (result && result.accessToken) {
            this.googleAccessToken = result.accessToken;
          } else {
            return;
          }
        } catch (err) {
          this.showToast(
            "Kunne ikke koble til Google: " + (err.message || err),
            "error",
          );
          return;
        }
      }

      const settings =
        (await firebaseService.getPageContent("settings_integrations")) || {};
      const calendarId = settings.googleCalendar?.calendarId;
      if (!calendarId) {
        this.showToast(
          "Fant ingen Google Kalender-ID i innstillinger.",
          "error",
        );
        return;
      }

      this.showToast(
        "Starter synkronisering av kurs og arrangementer til Google Kalender...",
        "info",
        3000,
      );

      let pushedCount = 0;

      // 1. Sync manual events from collection_events
      try {
        const eventDoc =
          (await firebaseService.getPageContent("collection_events")) || {};
        const items = Array.isArray(eventDoc) ? eventDoc : eventDoc.items || [];
        let eventsChanged = false;
        for (const item of items) {
          if (item.start || item.date) {
            const res = await this.updateGoogleCalendarEvent(
              item,
              item.gcalId ? "PATCH" : "POST",
            );
            if (res && res.id) {
              item.gcalId = res.id;
              eventsChanged = true;
              pushedCount++;
            }
          }
        }
        if (eventsChanged) {
          await firebaseService.savePageContent("collection_events", { items });
        }
      } catch (e) {
        console.warn("[Admin] Sync events to GCal error:", e);
      }

      // 2. Sync courses and lessons from collection_courses
      try {
        const courseDoc =
          (await firebaseService.getPageContent("collection_courses")) || {};
        const courseItems = Array.isArray(courseDoc)
          ? courseDoc
          : courseDoc.items || [];
        let courseChanged = false;
        for (const course of courseItems) {
          if (Array.isArray(course.lessons)) {
            for (let idx = 0; idx < course.lessons.length; idx++) {
              const lesson = course.lessons[idx];
              if (lesson.date) {
                const lessonTitle = lesson.title || `Leksjon ${idx + 1}`;
                const fullTitle = course.title
                  ? `${course.title} – ${lessonTitle}`
                  : lessonTitle;
                const evtPayload = {
                  gcalId: lesson.gcalId || null,
                  title: fullTitle,
                  description: lesson.description || course.description || "",
                  location: "HKM Online / Kurs",
                  start: lesson.date,
                  end: lesson.endDate || null,
                };
                const res = await this.updateGoogleCalendarEvent(
                  evtPayload,
                  lesson.gcalId ? "PATCH" : "POST",
                );
                if (res && res.id && lesson.gcalId !== res.id) {
                  lesson.gcalId = res.id;
                  courseChanged = true;
                  pushedCount++;
                }
              }
            }
          }
        }
        if (courseChanged) {
          await firebaseService.savePageContent("collection_courses", {
            items: courseItems,
          });
        }
      } catch (e) {
        console.warn("[Admin] Sync courses to GCal error:", e);
      }

      this.showToast(
        `Synkronisering fullført! ${pushedCount} hendelser/leksjoner er nå synkronisert til Google Kalender.`,
        "success",
        5000,
      );
    },

    async _mergeEventsWithGoogleCalendarNonBlocking(baseItems, requestId) {
      const collectionId = "events";
      const isCurrentRequest = () =>
        this._collectionLoadRequestIds[collectionId] === requestId;

      try {
        const settingsRes = await this._promiseWithTimeout(
          firebaseService.getPageContent("settings_integrations"),
          2000,
        );
        if (!isCurrentRequest()) return;
        if (settingsRes.timedOut) return;

        const integrations = settingsRes.value || {};
        const gcal = integrations?.googleCalendar || {};
        const apiKey = gcal.apiKey;
        const calendarId = gcal.calendarId;
        if (!apiKey || !calendarId) return;

        const now = new Date();
        const end = new Date();
        end.setMonth(now.getMonth() + 3);
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${now.toISOString()}&timeMax=${end.toISOString()}&orderBy=startTime&singleEvents=true`;

        let response;
        if (typeof AbortController !== "undefined") {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          try {
            response = await fetch(url, { signal: controller.signal });
          } finally {
            clearTimeout(timeoutId);
          }
        } else {
          response = await fetch(url);
        }

        if (!isCurrentRequest()) return;
        if (!response || !response.ok) return;

        const gData = await response.json();
        if (!isCurrentRequest()) return;
        if (!Array.isArray(gData?.items)) return;

        const merged = (baseItems || []).map((item) => ({ ...item }));
        const gItems = gData.items
          .map((gi) => ({
            title: gi.summary,
            date: gi.start?.dateTime || gi.start?.date,
            description: gi.description || "",
            location: gi.location || "",
            isSynced: true,
            id: gi.id,
            gcalId: gi.id,
            updated: gi.updated,
          }))
          .filter((item) => item.title || item.date);

        gItems.forEach((gi) => {
          const existing = merged.find(
            (fi) =>
              (fi.gcalId && fi.gcalId === gi.id) ||
              (fi.title === gi.title &&
                fi.date?.split("T")[0] === gi.date?.split("T")[0]),
          );

          if (!existing) {
            merged.push(gi);
            return;
          }

          existing.isSynced = true;
          if (!existing.gcalId) existing.gcalId = gi.id;

          // Merge GCal details: for synced events, GCal is the source of truth for description and location,
          // UNLESS the item has been edited in the admin dashboard (dashboardEdited = true).
          if (gi.description) {
            const existingDescHtml =
              typeof existing.content === "object" && existing.content.blocks
                ? this.blocksToHtml(existing.content)
                : existing.description || existing.content || "";

            const cleanHtml = (html) =>
              String(html || "")
                .replace(/\s+/g, " ")
                .trim();

            // Only let GCal overwrite if it has NOT been edited in the dashboard, or if GCal is actually newer
            const shouldSyncFromGcal =
              !existing.dashboardEdited ||
              (gi.updated &&
                existing.dashboardEditedAt &&
                new Date(gi.updated).getTime() >
                  new Date(existing.dashboardEditedAt).getTime());

            if (
              shouldSyncFromGcal &&
              cleanHtml(existingDescHtml) !== cleanHtml(gi.description)
            ) {
              console.log(
                `[AdminManager] GCal description updated for event ${gi.title}. Syncing to editor blocks.`,
              );
              existing.description = gi.description;
              existing.content = this.htmlToEditorJsBlocks(gi.description);
            } else if (!existing.description) {
              existing.description = gi.description;
            }
          }

          if (gi.location && !existing.location) {
            existing.location = gi.location;
          }
        });

        if (!isCurrentRequest()) return;
        this._collectionItemsCache[collectionId] = merged;
        this.currentItems = merged;
        this.renderItems(collectionId, merged);
      } catch (gErr) {
        if (gErr?.name !== "AbortError") {
          console.error("GCal fetch failed in admin:", gErr);
        }
        // Keep Firestore-only items visible; no spinner, no hard failure.
      }
    },
  };
}
