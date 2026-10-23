import { createMethods1 } from "./features/users-and-access-1.js";
import { createMethods2 } from "./features/users-and-access-2.js";
import { createMethods3 } from "./features/core-interaction.js";
import { createMethods4 } from "./features/integrations.js";
import { createMethods5 } from "./features/media-library-1.js";
import { createMethods6 } from "./features/media-library-2.js";
import { createMethods7 } from "./features/dashboard-1.js";
import { createMethods8 } from "./features/dashboard-2.js";
import { createMethods9 } from "./features/content-editor-1.js";
import { createMethods10 } from "./features/content-editor-2.js";
import { createMethods11 } from "./features/content-editor-3.js";
import { createMethods12 } from "./features/content-editor-4.js";
import { createMethods13 } from "./features/translation.js";
import { createMethods14 } from "./features/school-and-giving-1.js";
import { createMethods15 } from "./features/school-and-giving-2.js";
import { createMethods16 } from "./features/school-and-giving-3.js";
import { createMethods17 } from "./features/events-and-calendar.js";
import { createMethods18 } from "./features/communications-1.js";
import { createMethods19 } from "./features/communications-2.js";
import { createMethods20 } from "./features/collections.js";
import { createMethods21 } from "./features/podcast.js";
import { createMethods22 } from "./features/search-and-previews.js";
import { createMethods23 } from "./features/workspace.js";
import { createMethods24 } from "./features/site-design.js";
import { createMethods25 } from "./features/shop-records.js";
import { createMethods26 } from "./features/donor-records.js";
import { createMethods27 } from "./features/giving-causes.js";
import { createMethods28 } from "./features/bank-import.js";
import { createMethods29 } from "./features/shop-manager.js";
import { createMethods30 } from "./features/teaching-and-reading.js";
import { createMethods31 } from "./features/rich-text.js";
import { createMethods32 } from "./features/site-settings.js";
import { createMethods33 } from "./features/automation.js";
import { createMethods34 } from "./features/address-search.js";

// [DEBUG] File re-parsed to check for hidden syntax/encoding issues
// ===================================
// Admin Dashboard - His Kingdom Ministry (Global version)
// Core Logic & Firebase Integration
// ===================================

// --- Global Error Handling ---
window.onerror = function (msg, url, lineNo, columnNo, error) {
  const rawMessage = msg ? msg.toString() : "";

  // Ignore benign ResizeObserver error
  if (
    rawMessage.includes(
      "ResizeObserver loop completed with undelivered notifications",
    )
  ) {
    return false;
  }

  // Ignore opaque cross-origin/extension errors with no actionable stack.
  if (
    rawMessage.trim() === "Script error." ||
    rawMessage.trim() === "Script error"
  ) {
    console.warn("Ignored opaque script error from browser context:", {
      url,
      lineNo,
      columnNo,
    });
    return false;
  }

  console.error("Global Error Caught:", msg, url, lineNo, columnNo, error);
  showErrorUI("En uventet feil oppstod: " + rawMessage);
  return false;
};

window.onunhandledrejection = function (event) {
  const reason = event.reason ? event.reason.toString() : "";
  // Ignore benign ResizeObserver error in promises too
  if (
    reason.includes(
      "ResizeObserver loop completed with undelivered notifications",
    )
  ) {
    return false;
  }

  if (reason.trim() === "Script error." || reason.trim() === "Script error") {
    console.warn("Ignored opaque unhandled rejection from browser context.");
    return false;
  }

  console.error("Unhandled Promise Rejection:", event.reason);
  showErrorUI(
    "En asynkron feil oppstod: " +
      (event.reason ? event.reason.message : "Ukjent feil"),
  );
};

function showErrorUI(message) {
  const errorContainer = document.getElementById("global-error-container");
  if (errorContainer) {
    const errorMsg = document.getElementById("global-error-message");
    if (errorMsg) errorMsg.textContent = message;
    errorContainer.style.display = "flex";
    document.body.classList.remove("cloak");
  } else {
    showToast(message); // Fallback if UI not ready
  }
}

const firebaseService = window.firebaseService;
const adminUtils = window.HKMAdminUtils || {};

class AdminManager {
  constructor() {
    this.currentSection = "overview";
    this.unreadMessageCount = 0;
    this.messagesUnsub = null;
    this._collectionRealtimeUnsubs = {};
    this._siteContentRealtimeUnsubs = {};
    this._overviewRealtimeInitialized = false;
    this._overviewRefreshTimer = null;
    this._pendingWriteLocks = new Set();
    this._pendingAuthRedirectTimer = null;
    this._collectionItemsCache = {};
    this._collectionLoadRequestIds = {};
    this._initialOverviewRenderComplete = false;
    this._activityLogItems = [];
    this._editorRestoreStateKey = "hkm_admin_open_editor_state";
    this._restoringEditorState = false;
    this._activeEditorInstance = null;
    this.isEditorOpen = false;
    this.analyticsRangeDays = this._getSavedAnalyticsRangeDays();
    // User Detail View State
    this.currentUserDetailId = null;
    this.userEditMode = false;

    // Media Library State
    this.currentMediaPath = "editor/";
    this.mediaSortOrder = "date-desc";

    // Wix Shop Orders Sorting State
    this.wixSortField = "date";
    this.wixSortDir = "desc";

    // Physical Donations Sorting State
    this.inkindSortField = "date";
    this.inkindSortDir = "desc";

    // Donations Sorting State
    this.donationSortField = "date";
    this.donationSortDir = "desc";

    this.widgetLibrary = {
      visitors: {
        id: "visitors",
        label: "Sidevisninger",
        icon: "visibility",
        color: "purple",
        default: true,
      },
      status: {
        id: "status",
        label: "Systemstatus",
        icon: "check_circle",
        color: "green",
        default: true,
      },
      users: {
        id: "users",
        label: "Brukere",
        icon: "group",
        color: "mint",
        default: true,
      },
      blog: {
        id: "blog",
        label: "Blogginnlegg",
        icon: "edit_note",
        color: "blue",
        default: true,
      },
      teaching: {
        id: "teaching",
        label: "Undervisning",
        icon: "school",
        color: "mint",
        default: true,
      },
      donations: {
        id: "donations",
        label: "Donasjoner (Siste 30 dager)",
        icon: "volunteer_activism",
        color: "donation",
        default: true,
      },
      "donation-amount": {
        id: "donation-amount",
        label: "Gaver i beløp (Siste 30 dager)",
        icon: "payments",
        color: "donation",
        default: true,
      },
      youtube: {
        id: "youtube",
        label: "YouTube Abonnenter",
        icon: "video_library",
        color: "youtube",
        default: true,
      },
      podcast: {
        id: "podcast",
        label: "Podcast Episoder",
        icon: "podcasts",
        color: "podcast",
        default: false,
      },
      campaigns: {
        id: "campaigns",
        label: "Innsamlinger",
        icon: "campaign",
        color: "megaphone",
        default: false,
      },
      events: {
        id: "events",
        label: "Arrangementer",
        icon: "event",
        color: "blue",
        default: false,
      },
      "next-events": {
        id: "next-events",
        label: "Neste Arrangementer",
        icon: "event_upcoming",
        color: "purple",
        default: false,
        type: "list",
      },
      "analytics-engagement": {
        id: "analytics-engagement",
        label: "Engasjement",
        icon: "speed",
        color: "mint",
        default: true,
      },
      "analytics-devices": {
        id: "analytics-devices",
        label: "Enheter",
        icon: "devices",
        color: "blue",
        default: true,
      },
      "analytics-cities": {
        id: "analytics-cities",
        label: "Topp Byer",
        icon: "location_city",
        color: "purple",
        default: false,
        type: "list",
      },
    };

    try {
      this.init();
    } catch (e) {
      console.error("Critical: Failed to initialize AdminManager", e);
      showErrorUI("Klarte ikke å starte admin-panelet: " + e.message);
    }
  }
  get googleAccessToken() {
    try {
      const stored = localStorage.getItem("hkm_google_access_token");
      const expiresAt = localStorage.getItem(
        "hkm_google_access_token_expires_at",
      );
      if (stored && expiresAt) {
        if (Date.now() < parseInt(expiresAt, 10)) {
          return stored;
        } else {
          localStorage.removeItem("hkm_google_access_token");
          localStorage.removeItem("hkm_google_access_token_expires_at");
        }
      }
    } catch (e) {
      console.error("Failed to get googleAccessToken from localStorage:", e);
    }
    return this._inMemoryGoogleAccessToken || null;
  }
  set googleAccessToken(val) {
    this._inMemoryGoogleAccessToken = val;
    try {
      if (val) {
        localStorage.setItem("hkm_google_access_token", val);
        localStorage.setItem(
          "hkm_google_access_token_expires_at",
          (Date.now() + 3500 * 1000).toString(),
        );
      } else {
        localStorage.removeItem("hkm_google_access_token");
        localStorage.removeItem("hkm_google_access_token_expires_at");
      }
    } catch (e) {
      console.error("Failed to set googleAccessToken in localStorage:", e);
    }
  }
}

const dependencies = { firebaseService, adminUtils, showErrorUI };
for (const methods of [
  createMethods1(dependencies),
  createMethods2(dependencies),
  createMethods3(dependencies),
  createMethods4(dependencies),
  createMethods5(dependencies),
  createMethods6(dependencies),
  createMethods7(dependencies),
  createMethods8(dependencies),
  createMethods9(dependencies),
  createMethods10(dependencies),
  createMethods11(dependencies),
  createMethods12(dependencies),
  createMethods13(dependencies),
  createMethods14(dependencies),
  createMethods15(dependencies),
  createMethods16(dependencies),
  createMethods17(dependencies),
  createMethods18(dependencies),
  createMethods19(dependencies),
  createMethods20(dependencies),
  createMethods21(dependencies),
  createMethods22(dependencies),
  createMethods23(dependencies),
  createMethods24(dependencies),
  createMethods25(dependencies),
  createMethods26(dependencies),
  createMethods27(dependencies),
  createMethods28(dependencies),
  createMethods29(dependencies),
  createMethods30(dependencies),
  createMethods31(dependencies),
  createMethods32(dependencies),
  createMethods33(dependencies),
  createMethods34(dependencies),
]) {
  const descriptors = Object.getOwnPropertyDescriptors(methods);
  for (const descriptor of Object.values(descriptors))
    descriptor.enumerable = false;
  Object.defineProperties(AdminManager.prototype, descriptors);
}

// Start the manager
window.adminManager = new AdminManager();
