import { createUsersAndAccess1Methods } from "./features/users-and-access-1.js";
import { createUsersAndAccess2Methods } from "./features/users-and-access-2.js";
import { createCoreInteractionMethods } from "./features/core-interaction.js";
import { createIntegrationsMethods } from "./features/integrations.js";
import { createMediaLibrary1Methods } from "./features/media-library-1.js";
import { createMediaLibrary2Methods } from "./features/media-library-2.js";
import { createDashboard1Methods } from "./features/dashboard-1.js";
import { createDashboard2Methods } from "./features/dashboard-2.js";
import { createContentEditor1Methods } from "./features/content-editor-1.js";
import { createContentEditor2Methods } from "./features/content-editor-2.js";
import { createContentEditor3Methods } from "./features/content-editor-3.js";
import { createContentEditor4Methods } from "./features/content-editor-4.js";
import { createTranslationMethods } from "./features/translation.js";
import { createSchoolAndGiving1Methods } from "./features/school-and-giving-1.js";
import { createSchoolAndGiving2Methods } from "./features/school-and-giving-2.js";
import { createSchoolAndGiving3Methods } from "./features/school-and-giving-3.js";
import { createEventsAndCalendarMethods } from "./features/events-and-calendar.js";
import { createCommunications1Methods } from "./features/communications-1.js";
import { createCommunications2Methods } from "./features/communications-2.js";
import { createCollectionsMethods } from "./features/collections.js";
import { createPodcastMethods } from "./features/podcast.js";
import { createSearchAndPreviewsMethods } from "./features/search-and-previews.js";
import { createWorkspaceMethods } from "./features/workspace.js";
import { createSiteDesignMethods } from "./features/site-design.js";
import { createShopRecordsMethods } from "./features/shop-records.js";
import { createDonorRecordsMethods } from "./features/donor-records.js";
import { createGivingCausesMethods } from "./features/giving-causes.js";
import { createBankImportMethods } from "./features/bank-import.js";
import { createShopManagerMethods } from "./features/shop-manager.js";
import { createTeachingAndReadingMethods } from "./features/teaching-and-reading.js";
import { createRichTextMethods } from "./features/rich-text.js";
import { createSiteSettingsMethods } from "./features/site-settings.js";
import { createAutomationMethods } from "./features/automation.js";
import { createAddressSearchMethods } from "./features/address-search.js";

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
  createUsersAndAccess1Methods(dependencies),
  createUsersAndAccess2Methods(dependencies),
  createCoreInteractionMethods(dependencies),
  createIntegrationsMethods(dependencies),
  createMediaLibrary1Methods(dependencies),
  createMediaLibrary2Methods(dependencies),
  createDashboard1Methods(dependencies),
  createDashboard2Methods(dependencies),
  createContentEditor1Methods(dependencies),
  createContentEditor2Methods(dependencies),
  createContentEditor3Methods(dependencies),
  createContentEditor4Methods(dependencies),
  createTranslationMethods(dependencies),
  createSchoolAndGiving1Methods(dependencies),
  createSchoolAndGiving2Methods(dependencies),
  createSchoolAndGiving3Methods(dependencies),
  createEventsAndCalendarMethods(dependencies),
  createCommunications1Methods(dependencies),
  createCommunications2Methods(dependencies),
  createCollectionsMethods(dependencies),
  createPodcastMethods(dependencies),
  createSearchAndPreviewsMethods(dependencies),
  createWorkspaceMethods(dependencies),
  createSiteDesignMethods(dependencies),
  createShopRecordsMethods(dependencies),
  createDonorRecordsMethods(dependencies),
  createGivingCausesMethods(dependencies),
  createBankImportMethods(dependencies),
  createShopManagerMethods(dependencies),
  createTeachingAndReadingMethods(dependencies),
  createRichTextMethods(dependencies),
  createSiteSettingsMethods(dependencies),
  createAutomationMethods(dependencies),
  createAddressSearchMethods(dependencies),
]) {
  const descriptors = Object.getOwnPropertyDescriptors(methods);
  for (const descriptor of Object.values(descriptors))
    descriptor.enumerable = false;
  Object.defineProperties(AdminManager.prototype, descriptors);
}

// Start the manager
window.adminManager = new AdminManager();
