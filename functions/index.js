const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const fetch = require("node-fetch");
const { parseStringPromise } = require("xml2js");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
require("dotenv").config({ path: path.join(__dirname, ".env.local"), override: true, quiet: true });
const { createClient, OAuthStrategy, ApiKeyStrategy } = require("@wix/sdk");
const { products } = require("@wix/stores");

admin.initializeApp();
const db = admin.firestore();

// Stripe is initialized inside the function to avoid build-time errors
const stripeInit = require("stripe");
const stripeSecretKeyParam = defineSecret("STRIPE_SECRET_KEY");
const vippsClientIdParam = defineSecret("VIPPS_CLIENT_ID");
const vippsClientSecretParam = defineSecret("VIPPS_CLIENT_SECRET");
const vippsSubscriptionKeyParam = defineSecret("VIPPS_SUBSCRIPTION_KEY");
const vippsMsnParam = defineSecret("VIPPS_MSN");
const googleChatWebhookUrlParam = defineSecret("GOOGLE_CHAT_WEBHOOK_URL");
const googleChatBridgeTokenParam = defineSecret("GOOGLE_CHAT_BRIDGE_TOKEN");
const geminiApiKeyParam = defineSecret("GEMINI_API_KEY");

function getSecretOrEnv(secretParam, envKeys = []) {
  const candidates = [];

  try {
    candidates.push(secretParam.value());
  } catch (error) {
    // Secret may be unavailable in local/emulator contexts.
  }

  envKeys.forEach((key) => {
    if (typeof key === "string" && key) {
      candidates.push(process.env[key]);
    }
  });

  return candidates.find((value) => typeof value === "string" && value.trim()) || "";
}

function getStripeSecretKey() {
  return getSecretOrEnv(
      stripeSecretKeyParam,
      [
        "STRIPE_SECRET_KEY",
        "STRIPE_KEY",
        "STRIPE_API_KEY",
      ],
  );
}

function getGoogleChatWebhookUrl() {
  return getSecretOrEnv(
      googleChatWebhookUrlParam,
      [
        "GOOGLE_CHAT_WEBHOOK_URL",
      ],
  );
}

function getGoogleChatBridgeToken() {
  return getSecretOrEnv(
      googleChatBridgeTokenParam,
      [
        "GOOGLE_CHAT_BRIDGE_TOKEN",
      ],
  );
}

function getGeminiApiKey() {
  return getSecretOrEnv(
      geminiApiKeyParam,
      [
        "GEMINI_API_KEY",
      ],
  );
}

function parseWixApiKeyMetadata(apiKey) {
  if (!apiKey || typeof apiKey !== "string") return {};

  try {
    const parts = apiKey.split(".");
    if (parts.length < 2) return {};
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    const rawData = typeof payload.data === "string" ? payload.data : null;
    if (!rawData) return {};
    const data = JSON.parse(rawData);
    return {
      accountId: data && data.tenant && data.tenant.type === "account" ? data.tenant.id : undefined,
      apiKeyId: data && data.id ? data.id : undefined,
      appId: data && data.identity ? data.identity.id : undefined,
    };
  } catch (error) {
    return {};
  }
}

const VISITOR_CHAT_RETENTION_DAYS = 7;

async function deleteQuerySnapshotDocs(querySnapshot) {
  if (!querySnapshot || querySnapshot.empty) return 0;

  let deletedCount = 0;
  let batch = db.batch();
  let ops = 0;
  const commits = [];

  querySnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
    ops += 1;
    deletedCount += 1;

    if (ops === 450) {
      commits.push(batch.commit());
      batch = db.batch();
      ops = 0;
    }
  });

  if (ops > 0) {
    commits.push(batch.commit());
  }

  await Promise.all(commits);

  return deletedCount;
}

async function deleteVisitorChatById(chatId) {
  if (!chatId) return { messagesDeleted: 0, mappingsDeleted: 0 };

  let messagesDeleted = 0;
  let lastDoc = null;

  do {
    let query = db.collection("visitorChats")
        .doc(chatId)
        .collection("messages")
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(400);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    messagesDeleted += await deleteQuerySnapshotDocs(snapshot);
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  } while (lastDoc);

  const threadMappingsSnap = await db.collection("googleChatThreadMappings")
      .where("chatId", "==", chatId)
      .get();
  const mappingsDeleted = await deleteQuerySnapshotDocs(threadMappingsSnap);

  await db.collection("visitorChats").doc(chatId).delete();

  return {
    messagesDeleted,
    mappingsDeleted,
  };
}

function getWixClient() {
  const clientId = process.env.WIX_CLIENT_ID;
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;
  const parsedApiKeyMeta = parseWixApiKeyMetadata(apiKey);
  const accountId = process.env.WIX_ACCOUNT_ID || parsedApiKeyMeta.accountId;

  if (apiKey && (siteId || accountId)) {
    return createClient({
      modules: { products },
      auth: siteId ?
        ApiKeyStrategy({
          apiKey,
          siteId,
          ...(accountId ? { accountId } : {}),
        }) :
        ApiKeyStrategy({
          apiKey,
          accountId,
        }),
    });
  }

  if (!clientId) throw new Error("Missing WIX_CLIENT_ID.");

  return createClient({
    modules: { products },
    auth: OAuthStrategy({ clientId }),
  });
}

function wixPickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function wixPickFirstNumber(...values) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function formatWixPrice(amount, currency = "NOK", locale = "no-NO") {
  if (amount == null) return "Se pris på Wix";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `${amount} ${currency}`;
  }
}

function clampText(value, maxLen = 800) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxLen ? `${normalized.slice(0, maxLen - 1)}…` : normalized;
}

function cleanGoogleChatCommandText(rawText) {
  if (typeof rawText !== "string") return "";
  return rawText
      .replace(/<users\/[^>]+>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
}

function parseGoogleChatEventPayload(req) {
  if (req && req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    return req.body;
  }

  let rawText = "";
  if (req && typeof req.rawBody === "string") {
    rawText = req.rawBody;
  } else if (req && Buffer.isBuffer(req.rawBody)) {
    rawText = req.rawBody.toString("utf8");
  } else if (req && typeof req.body === "string") {
    rawText = req.body;
  }
  rawText = (rawText || "").trim();
  if (!rawText) return {};

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === "object") return parsed;
  } catch (error) {
    // Fallback below handles payload=<json>.
  }

  try {
    const form = new URLSearchParams(rawText);
    const embedded = (form.get("payload") || "").trim();
    if (embedded) {
      const parsed = JSON.parse(embedded);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (error) {
    // Ignore and return empty payload.
  }

  return {};
}

function pickFirstNonEmptyString(values = []) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function extractGoogleChatEventFields(payload) {
  const chat = payload && typeof payload.chat === "object" ? payload.chat : {};
  const msgPayload = chat && typeof chat.messagePayload === "object" ? chat.messagePayload : {};
  const msgInPayload = msgPayload && typeof msgPayload.message === "object" ? msgPayload.message : {};
  const topMessage = payload && typeof payload.message === "object" ? payload.message : {};
  const chatMessage = chat && typeof chat.message === "object" ? chat.message : {};
  const appCommandPayload = chat && typeof chat.appCommandPayload === "object" ? chat.appCommandPayload : {};
  const appCommandMessage = appCommandPayload && typeof appCommandPayload.message === "object" ?
    appCommandPayload.message :
    {};
  const appCommandSpace = appCommandPayload && typeof appCommandPayload.space === "object" ?
    appCommandPayload.space :
    {};
  const appCommandThread = appCommandPayload && typeof appCommandPayload.thread === "object" ?
    appCommandPayload.thread :
    {};
  const appCommandMetadata = appCommandPayload && typeof appCommandPayload.appCommandMetadata === "object" ?
    appCommandPayload.appCommandMetadata :
    {};

  const rawText = pickFirstNonEmptyString([
    topMessage.argumentText,
    topMessage.text,
    payload && payload.text,
    chatMessage.argumentText,
    chatMessage.text,
    msgInPayload.argumentText,
    msgInPayload.text,
    msgPayload.argumentText,
    msgPayload.text,
    appCommandMessage.argumentText,
    appCommandMessage.text,
  ]);

  const eventType = pickFirstNonEmptyString([
    payload && payload.type,
    payload && payload.eventType,
    chat && chat.type,
    chat && chat.eventType,
    msgPayload && msgPayload.type,
  ]);

  const userType = pickFirstNonEmptyString([
    payload && payload.user && payload.user.type,
    chat && chat.user && chat.user.type,
    msgInPayload && msgInPayload.sender && msgInPayload.sender.type,
  ]);

  const userDisplayName = pickFirstNonEmptyString([
    payload && payload.user && payload.user.displayName,
    chat && chat.user && chat.user.displayName,
    msgInPayload && msgInPayload.sender && msgInPayload.sender.displayName,
  ]);

  const spaceName = pickFirstNonEmptyString([
    payload && payload.space && payload.space.name,
    payload && payload.message && payload.message.space && payload.message.space.name,
    chat && chat.space && chat.space.name,
    chatMessage && chatMessage.space && chatMessage.space.name,
    msgInPayload && msgInPayload.space && msgInPayload.space.name,
    appCommandMessage && appCommandMessage.space && appCommandMessage.space.name,
    appCommandSpace && appCommandSpace.name,
  ]);

  const threadName = pickFirstNonEmptyString([
    payload && payload.message && payload.message.thread && payload.message.thread.name,
    chatMessage && chatMessage.thread && chatMessage.thread.name,
    msgInPayload && msgInPayload.thread && msgInPayload.thread.name,
    appCommandMessage && appCommandMessage.thread && appCommandMessage.thread.name,
    appCommandThread && appCommandThread.name,
  ]);

  const threadKey = pickFirstNonEmptyString([
    payload && payload.message && payload.message.thread && payload.message.thread.threadKey,
    chatMessage && chatMessage.thread && chatMessage.thread.threadKey,
    msgInPayload && msgInPayload.thread && msgInPayload.thread.threadKey,
    appCommandPayload && appCommandPayload.thread && appCommandPayload.thread.threadKey,
    appCommandMessage && appCommandMessage.thread && appCommandMessage.thread.threadKey,
    appCommandThread && appCommandThread.threadKey,
  ]);

  const appCommandId = pickFirstNonEmptyString([
    appCommandMetadata && appCommandMetadata.appCommandId,
  ]);

  const appCommandType = pickFirstNonEmptyString([
    appCommandMetadata && appCommandMetadata.appCommandType,
  ]);

  const normalizedPayload = {
    type: eventType,
    user: { type: userType, displayName: userDisplayName },
    space: { name: spaceName },
    message: {
      argumentText: rawText,
      text: rawText,
      thread: {
        name: threadName,
        threadKey,
      },
    },
  };

  return {
    eventType,
    userType,
    userDisplayName,
    rawText,
    rawTextPreview: clampText(rawText, 200),
    spaceName,
    threadName,
    threadKey,
    appCommandId,
    appCommandType,
    normalizedPayload,
    payloadKeys: payload && typeof payload === "object" ? Object.keys(payload).slice(0, 12) : [],
    chatKeys: chat && typeof chat === "object" ? Object.keys(chat).slice(0, 12) : [],
    msgPayloadKeys: msgPayload && typeof msgPayload === "object" ? Object.keys(msgPayload).slice(0, 12) : [],
    appCommandKeys: appCommandPayload && typeof appCommandPayload === "object" ?
      Object.keys(appCommandPayload).slice(0, 12) :
      [],
  };
}

function makeGoogleChatResponse(message, isWorkspaceAddon = false) {
  if (!isWorkspaceAddon) return message;
  return {
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message,
        },
      },
    },
  };
}

function parseGoogleChatReplyCommand(rawText) {
  const text = cleanGoogleChatCommandText(rawText);
  if (!text) return null;

  const match = text.match(/^\/?(reply|svar)\s+([A-Za-z0-9_-]{6,})\s+([\s\S]+)$/i);
  if (!match) return null;

  return {
    chatId: match[2],
    replyText: clampText(match[3], 4000),
  };
}

function parseGoogleChatReplyArgs(rawText) {
  const text = cleanGoogleChatCommandText(rawText);
  if (!text) return null;

  const match = text.match(/^([A-Za-z0-9_-]{6,})\s+([\s\S]+)$/);
  if (!match) return null;

  return {
    chatId: match[1],
    replyText: clampText(match[2], 4000),
  };
}

function stripGoogleChatReplyPrefix(rawText, knownChatId = "") {
  const text = cleanGoogleChatCommandText(rawText);
  if (!text) return "";

  let stripped = text.replace(/^\/?(reply|svar)\s+/i, "").trim();
  if (knownChatId) {
    const escapedChatId = knownChatId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    stripped = stripped.replace(new RegExp(`^${escapedChatId}\\s+`), "").trim();
  }
  return clampText(stripped, 4000);
}

function makeGoogleChatMappingId(spaceName, threadName) {
  return crypto
      .createHash("sha256")
      .update(`${spaceName}|${threadName}`)
      .digest("hex");
}

function extractGoogleChatSpaceNameFromWebhookUrl(webhookUrl) {
  if (typeof webhookUrl !== "string" || !webhookUrl.trim()) return "";
  try {
    const parsed = new URL(webhookUrl.trim());
    const match = parsed.pathname.match(/\/v1\/spaces\/([^/]+)\/messages$/);
    if (match && match[1]) return `spaces/${match[1]}`;
  } catch (error) {
    return "";
  }
  return "";
}

async function saveGoogleChatThreadMapping({ spaceName, threadName, chatId }) {
  if (!spaceName || !threadName || !chatId) return;

  const mappingId = makeGoogleChatMappingId(spaceName, threadName);
  await db.collection("googleChatThreadMappings").doc(mappingId).set({
    spaceName,
    threadName,
    chatId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function saveGoogleChatSpaceFallback({ spaceName, chatId }) {
  if (!spaceName || !chatId) return;

  const mappingId = crypto
      .createHash("sha256")
      .update(spaceName)
      .digest("hex");

  await db.collection("googleChatSpaceFallback").doc(mappingId).set({
    spaceName,
    chatId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function inferChatIdFromGooglePayload(payload) {
  const payloadMessage = payload && payload.message ? payload.message : {};
  const threadKey = (
    (payloadMessage.thread && payloadMessage.thread.threadKey) ||
    ""
  ).trim();
  const spaceName = (
    (payload && payload.space && payload.space.name) ||
    (payloadMessage.space && payloadMessage.space.name) ||
    ""
  ).trim();
  const threadName = (
    (payloadMessage.thread && payloadMessage.thread.name) ||
    ""
  ).trim();

  // Fast path: if Google Chat returns our original threadKey (visitor_<chatId>),
  // we can resolve without extra lookups.
  const keyMatch = threadKey.match(/^visitor_([A-Za-z0-9_-]{6,})$/);
  if (keyMatch && keyMatch[1]) {
    return keyMatch[1];
  }

  if (spaceName && threadName) {
    const mappingId = makeGoogleChatMappingId(spaceName, threadName);
    const mappingSnap = await db.collection("googleChatThreadMappings").doc(mappingId).get();
    if (mappingSnap.exists) {
      const data = mappingSnap.data() || {};
      if (data.chatId) return String(data.chatId);
    }
  }

  if (spaceName) {
    const fallbackId = crypto
        .createHash("sha256")
        .update(spaceName)
        .digest("hex");
    const fallbackSnap = await db.collection("googleChatSpaceFallback").doc(fallbackId).get();
    if (fallbackSnap.exists) {
      const data = fallbackSnap.data() || {};
      if (data.chatId) return String(data.chatId);
    }
  }

  return "";
}

function chooseGeminiModel(modelNames = []) {
  const preferred = [
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash",
    "models/gemini-1.5-flash",
    "models/gemini-pro",
  ];

  for (const target of preferred) {
    const exact = modelNames.find((name) => name === target);
    if (exact) return exact;
  }

  // Fallback: pick the first generateContent-capable model.
  return modelNames[0] || "";
}

/**
 * Konverterer Wix' interne bildeformat (wix:image://v1/...) til en offentlig URL.
 */
function getWixImageUrl(wixUrl) {
  if (!wixUrl || typeof wixUrl !== "string") return "";
  if (wixUrl.startsWith("http")) return wixUrl;

  // Format: wix:image://v1/c9f56a_...~mv2.jpg/filename.jpg#originWidth=100&originHeight=100
  if (wixUrl.startsWith("wix:image://v1/")) {
    const parts = wixUrl.replace("wix:image://v1/", "").split("/");
    if (parts.length > 0) {
      const imageId = parts[0];
      return `https://static.wixstatic.com/media/${imageId}`;
    }
  }

  // Format: wix:image://v1/c9f56a_...~mv2.jpg#originWidth=100&originHeight=100
  if (wixUrl.includes("wix:image")) {
    const match = wixUrl.match(/wix:image:\/\/v1\/([^\/#\?]+)/);
    if (match && match[1]) {
      return `https://static.wixstatic.com/media/${match[1]}`;
    }
  }

  return wixUrl;
}

function normalizeWixProduct(item, req) {
  const locale = req.query.locale || "no-NO";
  const fallbackBaseUrl = req.query.storeBaseUrl || "https://www.hiskingdomministry.no";
  const fallbackStoreUrl = req.query.externalStoreBaseUrl || "https://www.hiskingdomministry.no/butikk";
  const productPathPrefix = String(req.query.productPathPrefix || "/product-page/").replace(/^\/+|\/+$/g, "");

  const slug = wixPickFirstString(
    item.slug,
    item.handle,
    item.seoData && item.seoData.slug,
  );

  const directUrl = wixPickFirstString(
    item.productUrl,
    item.url,
    item.productPageUrl,
    item.onlineStoreUrl,
    item.link,
    item.seoData && item.seoData.canonicalUrl,
    item.seoData && item.seoData.url,
  );

  let productUrl = fallbackStoreUrl;
  if (directUrl) {
    productUrl = /^https?:\/\//i.test(directUrl) ?
      directUrl :
      `${fallbackBaseUrl.replace(/\/+$/, "")}/${String(directUrl).replace(/^\/+/, "")}`;
  } else if (slug) {
    productUrl = `${fallbackBaseUrl.replace(/\/+$/, "")}/${productPathPrefix}/${encodeURIComponent(slug)}`;
  }

  const rawImageUrl = wixPickFirstString(
    item.imageUrl,
    item.image && item.image.url,
    item.mainImage,
    item.mainImage && item.mainImage.url,
    item.mainMedia && item.mainMedia.url,
    item.mainMedia && item.mainMedia.image && item.mainMedia.image.url,
    item.mainMedia && item.mainMedia.image && item.mainMedia.image.imageUrl,
    item.media && item.media.mainMedia && item.media.mainMedia.image && item.media.mainMedia.image.url,
    item.mediaItems && item.mediaItems[0] && item.mediaItems[0].url,
    item.mediaItems && item.mediaItems[0] && item.mediaItems[0].image && item.mediaItems[0].image.url,
    item.images && item.images[0] && item.images[0].url,
  );

  const imageUrl = getWixImageUrl(rawImageUrl);

  const priceValue = wixPickFirstNumber(
    item.priceValue,
    item.price,
    item.price && item.price.amount,
    item.price && item.price.value,
    item.price && item.price.price,
    item.priceData && item.priceData.price,
    item.priceData && item.priceData.amount,
    item.discountedPrice && item.discountedPrice.amount,
  );

  const currency = wixPickFirstString(
    item.currency,
    item.currencyCode,
    item.price && item.price.currency,
    item.price && item.price.currencyCode,
    item.priceData && item.priceData.currency,
    "NOK",
  ) || "NOK";

  const formattedPrice = wixPickFirstString(
    item.formattedPrice,
    item.priceFormatted,
    item.price && item.price.formatted,
    item.price && item.price.formattedPrice,
    item.priceData && item.priceData.formatted,
  ) || formatWixPrice(priceValue, currency, locale);

  return {
    id: wixPickFirstString(item.id, item._id, item.productId),
    name: wixPickFirstString(item.name, item.title, item.productName),
    slug,
    productUrl,
    imageUrl,
    priceValue,
    currency,
    formattedPrice,
    // Keep common Wix fields so the frontend normalizer can still work if needed.
    priceData: item.priceData,
    mainMedia: item.mainMedia,
    collectionIds: item.collectionIds || [],
    productOptions: item.productOptions || [],
    variants: item.variants || [],
    description: item.description || "",
  };
}

exports.getPodcast = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  const rssUrl = "https://anchor.fm/s/f7a13dec/podcast/rss";

  try {
    const response = await fetch(rssUrl);
    const text = await response.text();
    const data = await parseStringPromise(text);
    res.json(data);
  } catch (error) {
    console.error("Error fetching podcast:", error);
    res.status(500).send("Error fetching podcast");
  }
});

/**
 * Henter produkter fra Wix Stores via Wix SDK og returnerer et frontend-vennlig JSON-format.
 * Frontend (`js/wix-store.js`) leser `items` direkte.
 */
const cors = require("cors")({ origin: true });
const DEFAULT_FACEBOOK_PAGE_ID = "hiskingdomministry777";
const DEFAULT_FACEBOOK_PAGE_URL = "https://www.facebook.com/hiskingdomministry777?locale=nb_NO";

function getFacebookPageConfig(overrides = {}) {
  const overridePageId = typeof overrides.pageId === "string" ? overrides.pageId.trim() : "";
  const overridePageUrl = typeof overrides.pageUrl === "string" ? overrides.pageUrl.trim() : "";

  return {
    graphVersion: process.env.META_FACEBOOK_GRAPH_VERSION || "v25.0",
    pageId: overridePageId ||
      process.env.META_FACEBOOK_PAGE_ID ||
      process.env.FACEBOOK_PAGE_ID ||
      "",
    pageUrl: overridePageUrl ||
      process.env.META_FACEBOOK_PAGE_URL ||
      DEFAULT_FACEBOOK_PAGE_URL,
    accessToken: process.env.META_FACEBOOK_PAGE_ACCESS_TOKEN ||
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
      "",
  };
}

function trimText(value, maxLength = 180) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatFacebookPostDate(dateValue) {
  if (!dateValue) return "";
  try {
    return new Date(dateValue).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (error) {
    return "";
  }
}

function resolveFacebookPostImage(post) {
  const pickFirstString = (...values) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  };

  const walkAttachment = (attachment) => {
    if (!attachment || typeof attachment !== "object") return "";

    const directImage = pickFirstString(
      attachment.media && attachment.media.image && attachment.media.image.src,
      attachment.media && attachment.media.source,
      attachment.media && attachment.media.src,
      attachment.url,
    );
    if (directImage) return directImage;

    const subattachments = Array.isArray(attachment.subattachments && attachment.subattachments.data) ?
      attachment.subattachments.data :
      [];

    for (const item of subattachments) {
      const nested = walkAttachment(item);
      if (nested) return nested;
    }

    return "";
  };

  const attachments = Array.isArray(post && post.attachments && post.attachments.data) ?
    post.attachments.data :
    [];

  return pickFirstString(
    post && post.full_picture,
    ...attachments.map((attachment) => walkAttachment(attachment)),
  );
}

function extractFacebookPageIdentifier(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^@+/, "").trim();
  }

  try {
    const parsed = new URL(trimmed);
    const queryId = parsed.searchParams.get("id");
    if (queryId && queryId.trim()) {
      return queryId.trim();
    }

    const ignoredSegments = new Set([
      "pages",
      "pg",
      "profile.php",
      "posts",
      "events",
      "watch",
      "photos",
      "videos",
      "reel",
      "share",
    ]);
    const segments = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

    for (const segment of segments) {
      if (!ignoredSegments.has(segment.toLowerCase())) {
        return segment;
      }
    }
  } catch (error) {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/^facebook\.com\//i, "")
      .split(/[/?#]/)[0]
      .replace(/^@+/, "")
      .trim();
  }

  return "";
}

function buildFacebookPageCandidates(config = {}) {
  const seen = new Set();
  const candidates = [];

  const pushCandidate = (value) => {
    const normalized = extractFacebookPageIdentifier(value);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    candidates.push(normalized);
  };

  const pageIdCandidate = extractFacebookPageIdentifier(config.pageId);
  const pageUrlCandidate = extractFacebookPageIdentifier(config.pageUrl);

  if (pageUrlCandidate && pageUrlCandidate !== DEFAULT_FACEBOOK_PAGE_ID) {
    pushCandidate(pageUrlCandidate);
  }

  pushCandidate(pageIdCandidate);

  if (pageUrlCandidate && pageUrlCandidate === DEFAULT_FACEBOOK_PAGE_ID) {
    pushCandidate(pageUrlCandidate);
  }

  pushCandidate(process.env.META_FACEBOOK_PAGE_ID || process.env.FACEBOOK_PAGE_ID || "");
  pushCandidate(process.env.META_FACEBOOK_PAGE_URL || "");
  pushCandidate(DEFAULT_FACEBOOK_PAGE_ID);

  return candidates;
}

function buildCanonicalFacebookPageUrl(pageId, fallbackUrl = "") {
  if (typeof fallbackUrl === "string" && fallbackUrl.trim()) {
    return fallbackUrl.trim();
  }
  if (typeof pageId === "string" && pageId.trim()) {
    return `https://www.facebook.com/${pageId.trim()}`;
  }
  return DEFAULT_FACEBOOK_PAGE_URL;
}

async function fetchFacebookGraphJson(graphVersion, pathName, accessToken, params = {}) {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${pathName}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json();

  return { response, payload };
}

function normalizeFacebookPost(post, index, fallbackPageUrl) {
  const message = typeof post.message === "string" ? post.message.trim() : "";
  const lines = message.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const rawTitle = lines[0] || message || "Nytt innlegg fra Facebook";
  const title = trimText(rawTitle, 78);
  const excerptSource = lines.length > 1 ? lines.slice(1).join(" ") : message;
  const excerpt = trimText(
    excerptSource || "Se siste oppdatering, bilder og meldinger fra Facebook-siden vår.",
    180,
  );

  return {
    id: post.id || `facebook-${index}`,
    title,
    excerpt,
    date: formatFacebookPostDate(post.created_time),
    cta: "Les på Facebook",
    link: (typeof post.permalink_url === "string" && post.permalink_url.trim()) ?
      post.permalink_url.trim() :
      fallbackPageUrl,
    image: resolveFacebookPostImage(post),
  };
}

exports.facebookFeed = onRequest({ invoker: "public" }, (req, res) => {
  return cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed. Use GET." });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 3, 1), 6);
    const queryPageId = typeof req.query.pageId === "string" ? req.query.pageId : "";
    const queryPageUrl = typeof req.query.pageUrl === "string" ? req.query.pageUrl : "";
    const config = getFacebookPageConfig({
      pageId: queryPageId,
      pageUrl: queryPageUrl,
    });

    if (!config.accessToken) {
      return res.status(503).json({
        ok: false,
        error: "Facebook feed is not configured. Missing META_FACEBOOK_PAGE_ACCESS_TOKEN.",
        pageUrl: config.pageUrl,
        items: [],
      });
    }

    try {
      const fields = [
        "message",
        "permalink_url",
        "created_time",
        "full_picture",
        "attachments{media,media_type,subattachments,url}",
      ].join(",");
      const pageCandidates = buildFacebookPageCandidates(config);
      let lastError = "";

      for (const pageCandidate of pageCandidates) {
        let resolvedTargets = [{
          id: pageCandidate,
          pageUrl: buildCanonicalFacebookPageUrl(pageCandidate, config.pageUrl),
        }];

        try {
          const pageLookup = await fetchFacebookGraphJson(
            config.graphVersion,
            encodeURIComponent(pageCandidate),
            config.accessToken,
            { fields: "id,link" },
          );
          const lookupMessage = pageLookup.payload && pageLookup.payload.error && pageLookup.payload.error.message ?
            pageLookup.payload.error.message :
            "";

          if (pageLookup.response.ok && pageLookup.payload && !pageLookup.payload.error) {
            const resolvedId = typeof pageLookup.payload.id === "string" ? pageLookup.payload.id.trim() : "";
            const resolvedLink = typeof pageLookup.payload.link === "string" ? pageLookup.payload.link.trim() : "";

            if (resolvedId && resolvedId !== pageCandidate) {
              resolvedTargets = [{
                id: resolvedId,
                pageUrl: buildCanonicalFacebookPageUrl(resolvedId, resolvedLink || config.pageUrl),
              }, {
                id: pageCandidate,
                pageUrl: buildCanonicalFacebookPageUrl(pageCandidate, config.pageUrl),
              }];
            } else if (resolvedLink) {
              resolvedTargets[0].pageUrl = buildCanonicalFacebookPageUrl(pageCandidate, resolvedLink);
            }
          } else if (lookupMessage) {
            console.warn(`Meta Facebook page lookup error for "${pageCandidate}":`, lookupMessage);
          }
        } catch (lookupError) {
          console.warn(`Meta Facebook page lookup failed for "${pageCandidate}":`, lookupError && lookupError.message ? lookupError.message : lookupError);
        }

        for (const target of resolvedTargets) {
          for (const edge of ["published_posts", "posts"]) {
            const { response, payload } = await fetchFacebookGraphJson(
              config.graphVersion,
              `${encodeURIComponent(target.id)}/${edge}`,
              config.accessToken,
              {
                fields,
                limit,
              },
            );

            if (!response.ok || payload.error) {
              lastError = payload && payload.error && payload.error.message ?
                payload.error.message :
                `Meta API responded with ${response.status}`;
              console.warn(`Meta Facebook feed error for "${target.id}" (${edge}):`, lastError);
              continue;
            }

            const rawItems = Array.isArray(payload.data) ? payload.data : [];
            if (!rawItems.length) {
              continue;
            }

            const items = rawItems
              .map((post, index) => normalizeFacebookPost(post, index, target.pageUrl))
              .filter((item) => item && (item.link || item.title || item.excerpt));

            if (!items.length) {
              continue;
            }

            return res.status(200).json({
              ok: true,
              pageUrl: target.pageUrl,
              resolvedPageId: target.id,
              sourceEdge: edge,
              count: items.length,
              items,
            });
          }
        }
      }

      return res.status(502).json({
        ok: false,
        error: lastError || "Could not resolve a working Facebook page identifier for the feed.",
        pageUrl: config.pageUrl,
        items: [],
      });
    } catch (error) {
      console.error("Error fetching Facebook feed:", error);
      return res.status(500).json({
        ok: false,
        error: error && error.message ? error.message : String(error),
        pageUrl: config.pageUrl,
        items: [],
      });
    }
  });
});

async function fetchAndCacheWixProducts(req = { query: {} }) {
  const wixClient = getWixClient();
  let authMode = (process.env.WIX_API_KEY && process.env.WIX_SITE_ID) ? "api-key" : "oauth";

  if (authMode === "oauth" && wixClient.auth && typeof wixClient.auth.generateVisitorTokens === "function") {
    try {
      await wixClient.auth.generateVisitorTokens();
    } catch (authError) {
      console.warn("Wix visitor token generation failed:", authError && authError.message ? authError.message : authError);
    }
  }

  let allItems = [];
  let skip = 0;
  const limit = 100;
  let totalCount = 0;

  while (true) {
    const result = await wixClient.products.queryProducts()
      .limit(limit)
      .skip(skip)
      .descending("_createdDate")
      .find();

    const rawItems = Array.isArray(result.items) ? result.items : [];
    const items = rawItems.map((item) => normalizeWixProduct(item, req)).filter((item) => item.name);
    allItems.push(...items);
    totalCount = typeof result.totalCount === "number" ? result.totalCount : allItems.length;

    if (rawItems.length < limit) break;
    skip += limit;
  }

  const cacheData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    count: allItems.length,
    total: totalCount,
    items: allItems,
    authMode,
    source: "wix-sdk-cached"
  };

  await db.collection("content").doc("wix_products").set(cacheData);
  return cacheData;
}


exports.wixProducts = onRequest({ cors: true, invoker: "public" }, (req, res) => {
  return cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use GET or POST." });
    }

    try {
      // Allow manual sync via POST or ?force=true
      if (req.method === "POST" || req.query.force === "true") {
        console.log("Manual Wix sync triggered.");
        const cacheData = await fetchAndCacheWixProducts(req);
        return res.status(200).json({ ok: true, ...cacheData, manuallySynced: true });
      }

      // Serve from cache
      const doc = await db.collection("content").doc("wix_products").get();
      if (doc.exists && doc.data().items && doc.data().items.length > 0) {
        const data = doc.data();
        return res.status(200).json({
          ok: true,
          source: "firestore-cache",
          count: data.count,
          total: data.total,
          items: data.items,
          updatedAt: data.updatedAt
        });
      }

      // If cache doesn't exist, fetch and build it
      console.log("Cache missing, fetching from Wix...");
      const cacheData = await fetchAndCacheWixProducts(req);
      return res.status(200).json({ ok: true, ...cacheData, newlyCached: true });

    } catch (error) {
      console.error("Error fetching Wix products:", error);
      return res.status(500).json({
        ok: false,
        error: "Could not load products from Wix.",
        details: error && error.message ? error.message : String(error),
        fallbackUrl: "https://www.hiskingdomministry.no/butikk",
      });
    }
  });
});

/**
 * Automatisert synkronisering av Wix-produkter.
 * Kjører hver 5. time for å holde butikken oppdatert.
 */
exports.scheduledWixSync = onSchedule("0 */5 * * *", async (event) => {
  console.log("Starting scheduled Wix product synchronization...");
  try {
    const cacheData = await fetchAndCacheWixProducts({ query: {} });
    console.log(`Successfully synced ${cacheData.count} products via scheduler.`);
  } catch (error) {
    console.error("Scheduled Wix sync failed:", error);
  }
});

/**
 * Sletter gamle visitor chats for å begrense lagringstid av samtaler.
 * Kjører hver natt og rydder chatter som har vært inaktive i 7 dager.
 */
exports.cleanupVisitorChats = onSchedule("15 3 * * *", async () => {
  const cutoffDate = new Date(Date.now() - (VISITOR_CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000));
  console.log(`[VisitorChatCleanup] Looking for chats older than ${cutoffDate.toISOString()}`);

  let chatsDeleted = 0;
  let messagesDeleted = 0;
  let mappingsDeleted = 0;
  let rounds = 0;

  while (true) {
    const staleChatsSnap = await db.collection("visitorChats")
        .where("updatedAt", "<", cutoffDate)
        .limit(100)
        .get();

    if (staleChatsSnap.empty) break;

    rounds += 1;
    for (const chatDoc of staleChatsSnap.docs) {
      const cleanup = await deleteVisitorChatById(chatDoc.id);
      chatsDeleted += 1;
      messagesDeleted += cleanup.messagesDeleted;
      mappingsDeleted += cleanup.mappingsDeleted;
    }
  }

  if (!chatsDeleted) {
    console.log("[VisitorChatCleanup] No stale chats found.");
    return;
  }

  console.log("[VisitorChatCleanup] Cleanup complete", JSON.stringify({
    retentionDays: VISITOR_CHAT_RETENTION_DAYS,
    rounds,
    chatsDeleted,
    messagesDeleted,
    mappingsDeleted,
  }));
});

function getVippsConfig() {
  const normalizedEnvironment = typeof process.env.VIPPS_ENV === "string" ?
    process.env.VIPPS_ENV.toLowerCase().trim() : "auto";
  const isTestEnvironment = normalizedEnvironment === "test" || normalizedEnvironment === "sandbox";
  const isProductionEnvironment = normalizedEnvironment === "production" ||
    normalizedEnvironment === "prod" ||
    normalizedEnvironment === "live";
  const baseUrls = isTestEnvironment ?
    ["https://apitest.vipps.no"] :
    isProductionEnvironment ?
      ["https://api.vipps.no"] :
      ["https://api.vipps.no", "https://apitest.vipps.no"];

  const config = {
    environment: normalizedEnvironment,
    baseUrls,
    clientId: getSecretOrEnv(vippsClientIdParam, ["VIPPS_CLIENT_ID"]),
    clientSecret: getSecretOrEnv(vippsClientSecretParam, ["VIPPS_CLIENT_SECRET"]),
    subscriptionKey: getSecretOrEnv(
        vippsSubscriptionKeyParam,
        ["VIPPS_SUBSCRIPTION_KEY", "VIPPS_OCP_APIM_SUBSCRIPTION_KEY"],
    ),
    merchantSerialNumber: getSecretOrEnv(
        vippsMsnParam,
        ["VIPPS_MSN", "VIPPS_MERCHANT_SERIAL_NUMBER"],
    ),
    systemName: process.env.VIPPS_SYSTEM_NAME || "hiskingdomministry",
    systemVersion: process.env.VIPPS_SYSTEM_VERSION || "1.0.0",
    systemPluginName: process.env.VIPPS_SYSTEM_PLUGIN_NAME || "hkm-website",
    systemPluginVersion: process.env.VIPPS_SYSTEM_PLUGIN_VERSION || "1.0.0",
  };

  const missing = [];
  if (!config.clientId) missing.push("VIPPS_CLIENT_ID");
  if (!config.clientSecret) missing.push("VIPPS_CLIENT_SECRET");
  if (!config.subscriptionKey) missing.push("VIPPS_SUBSCRIPTION_KEY");
  if (!config.merchantSerialNumber) missing.push("VIPPS_MSN");

  return {
    ...config,
    isValid: missing.length === 0,
    missing,
  };
}

function normalizeVippsPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return "";

  let digitsOnly = phone.replace(/\D/g, "");
  if (!digitsOnly) return "";

  if (digitsOnly.startsWith("00")) {
    digitsOnly = digitsOnly.slice(2);
  }

  if (digitsOnly.length === 8) {
    digitsOnly = `47${digitsOnly}`;
  }

  if (/^47\d{8}$/.test(digitsOnly)) return digitsOnly;
  if (/^\d{8,15}$/.test(digitsOnly)) return digitsOnly;

  return "";
}

function buildVippsReference() {
  const timestampPart = Date.now().toString(36);
  const randomPart = crypto.randomBytes(5).toString("hex");
  return `hkm-${timestampPart}-${randomPart}`;
}

function buildVippsReturnUrl(returnUrl, reference) {
  const defaultUrl = "https://www.hiskingdomministry.no/donasjoner.html";
  let parsedUrl;

  try {
    parsedUrl = new URL(returnUrl || defaultUrl);
  } catch (error) {
    parsedUrl = new URL(defaultUrl);
  }

  if (!/^https?:$/.test(parsedUrl.protocol)) {
    parsedUrl = new URL(defaultUrl);
  }

  parsedUrl.searchParams.set("vipps_reference", reference);
  parsedUrl.searchParams.set("vipps_return", "1");
  return parsedUrl.toString();
}

async function parseJsonResponse(response) {
  const bodyText = await response.text();
  if (!bodyText) return {};

  try {
    return JSON.parse(bodyText);
  } catch (error) {
    return { raw: bodyText };
  }
}

function resolveVippsErrorDetail(payload, fallback) {
  if (!payload || typeof payload !== "object") return fallback;

  const preferred = payload.detail ||
    payload.message ||
    payload.error_description ||
    payload.error;

  if (preferred) return preferred;

  try {
    const serialized = JSON.stringify(payload);
    if (serialized && serialized !== "{}") return serialized;
  } catch (error) {
    // Ignore serialization issues and use fallback.
  }

  return fallback;
}

function shouldRetryVippsTokenOnAlternateEnvironment(errorDetail) {
  const normalized = typeof errorDetail === "string" ? errorDetail.toLowerCase() : "";
  if (!normalized) return false;

  return normalized.includes("aadsts700016") ||
    normalized.includes("application with identifier") ||
    normalized.includes("not found in the directory") ||
    normalized.includes("wrong tenant");
}

async function getVippsAccessToken(config) {
  const attempts = [];

  for (let index = 0; index < config.baseUrls.length; index += 1) {
    const baseUrl = config.baseUrls[index];
    const tokenResponse = await fetch(`${baseUrl}/accesstoken/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client_id": config.clientId,
        "client_secret": config.clientSecret,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Merchant-Serial-Number": config.merchantSerialNumber,
      },
      body: "",
    });

    const tokenPayload = await parseJsonResponse(tokenResponse);

    if (tokenResponse.ok && tokenPayload.access_token) {
      return {
        accessToken: tokenPayload.access_token,
        baseUrl,
      };
    }

    const errorDetail = resolveVippsErrorDetail(
        tokenPayload,
        `Token request failed (${tokenResponse.status})`,
    );

    attempts.push({
      baseUrl,
      status: tokenResponse.status,
      errorDetail,
    });

    const hasFallback = index < config.baseUrls.length - 1;
    const shouldTryFallback = hasFallback &&
      shouldRetryVippsTokenOnAlternateEnvironment(errorDetail);

    if (!shouldTryFallback) {
      break;
    }
  }

  const summary = attempts
    .map((attempt) => `${attempt.baseUrl}: ${attempt.errorDetail}`)
    .join(" | ");

  throw new Error(
      "Vipps token error: " +
      `${summary}. ` +
      "Sjekk at Vipps-nøklene tilhører samme miljø. " +
      "Hvis du bruker testnøkler, sett VIPPS_ENV=test.",
  );
}

function getVippsSystemHeaders(config) {
  return {
    "Vipps-System-Name": config.systemName,
    "Vipps-System-Version": config.systemVersion,
    "Vipps-System-Plugin-Name": config.systemPluginName,
    "Vipps-System-Plugin-Version": config.systemPluginVersion,
  };
}

async function getVippsPayment(config, baseUrl, accessToken, reference) {
  const paymentResponse = await fetch(
      `${baseUrl}/epayment/v1/payments/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": config.subscriptionKey,
          "Merchant-Serial-Number": config.merchantSerialNumber,
          ...getVippsSystemHeaders(config),
        },
      },
  );

  const paymentPayload = await parseJsonResponse(paymentResponse);
  if (!paymentResponse.ok) {
    const errorDetail = resolveVippsErrorDetail(
        paymentPayload,
        `Get payment failed (${paymentResponse.status})`,
    );
    throw new Error(`Vipps get payment error: ${errorDetail}`);
  }

  return paymentPayload;
}

async function captureVippsPayment(config, baseUrl, accessToken, reference, amount) {
  const idempotencyKey = crypto.randomUUID ?
    crypto.randomUUID() :
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const captureResponse = await fetch(
      `${baseUrl}/epayment/v1/payments/${encodeURIComponent(reference)}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": config.subscriptionKey,
          "Merchant-Serial-Number": config.merchantSerialNumber,
          "Idempotency-Key": idempotencyKey,
          ...getVippsSystemHeaders(config),
        },
        body: JSON.stringify({
          modificationAmount: {
            currency: amount && amount.currency ? amount.currency : "NOK",
            value: amount && Number.isFinite(amount.value) ? amount.value : 0,
          },
        }),
      },
  );

  const capturePayload = await parseJsonResponse(captureResponse);
  if (!captureResponse.ok) {
    const errorDetail = resolveVippsErrorDetail(
        capturePayload,
        `Capture failed (${captureResponse.status})`,
    );
    throw new Error(`Vipps capture error: ${errorDetail}`);
  }

  return capturePayload;
}

/**
 * Oppretter en PaymentIntent for Stripe.
 * Tar imot: amount (NOK), currency (optional, default NOK).
 */
exports.createPaymentIntent = onRequest({
  cors: true,
  invoker: "public",
  secrets: [stripeSecretKeyParam],
}, async (req, res) => {
  // Håndter preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const {
      amount,
      currency = "nok",
      customerDetails = {},
      paymentMethodPreference = "auto",
    } = req.body;

    const parsedAmount = Number(amount);
    const normalizedCurrency = typeof currency === "string" ?
      currency.toLowerCase() : "nok";
    const normalizedPaymentPreference = typeof paymentMethodPreference === "string" ?
      paymentMethodPreference.toLowerCase().trim() : "auto";

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).send({ error: "Missing or invalid amount" });
      return;
    }

    // Initialize Stripe lazily
    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      console.error("Stripe Secret Key is missing!");
      res.status(500).send({ error: "Server configuration error: Missing Stripe Key." });
      return;
    }
    const stripe = stripeInit(stripeKey);

    const paymentIntentPayload = {
      amount: Math.round(parsedAmount * 100), // Stripe bruker ore (cents)
      currency: normalizedCurrency,
      receipt_email: customerDetails.email || undefined,
      description: `Donasjon fra ${customerDetails.name || "Ukjent"}`,
      metadata: {
        customer_name: customerDetails.name,
        customer_email: customerDetails.email,
        customer_phone: customerDetails.phone,
        customer_address: customerDetails.address,
        customer_zip: customerDetails.zip,
        customer_city: customerDetails.city,
        message: customerDetails.message,
      },
      shipping: customerDetails.name && customerDetails.address ? {
        name: customerDetails.name,
        address: {
          line1: customerDetails.address,
          city: customerDetails.city,
          postal_code: customerDetails.zip,
          country: "NO", // Default to Norway
        },
      } : undefined,
    };

    // Let donor choose method preference from the form.
    if (normalizedPaymentPreference === "vipps") {
      paymentIntentPayload.payment_method_types = ["vipps", "card"];
    } else if (normalizedPaymentPreference === "card") {
      paymentIntentPayload.payment_method_types = ["card"];
    } else {
      paymentIntentPayload.automatic_payment_methods = { enabled: true };
    }

    // Opprett PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentPayload);

    // Returner clientSecret til frontend
    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("Stripe error:", error);
    const stripeMessage = (error && error.message) ? error.message : "Unknown Stripe error";

    if (stripeMessage.toLowerCase().includes("vipps")) {
      res.status(400).send({
        error: "Vipps er ikke aktivert eller tilgjengelig i Stripe-oppsettet. " +
          "Aktiver Vipps i Stripe Dashboard under Payment methods.",
      });
      return;
    }

    res.status(500).send({ error: stripeMessage });
  }
});

exports.createVippsPayment = onRequest({
  cors: true,
  invoker: "public",
  secrets: [
    vippsClientIdParam,
    vippsClientSecretParam,
    vippsSubscriptionKeyParam,
    vippsMsnParam,
  ],
}, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send({ error: "Method not allowed" });
    return;
  }

  try {
    const {
      amount,
      currency = "NOK",
      customerDetails = {},
      returnUrl = "",
    } = req.body || {};

    const parsedAmount = Number(amount);
    const normalizedCurrency = typeof currency === "string" ? currency.toUpperCase() : "NOK";

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).send({ error: "Missing or invalid amount" });
      return;
    }

    if (normalizedCurrency !== "NOK") {
      res.status(400).send({ error: "Vipps støtter kun NOK for denne betalingen." });
      return;
    }

    const config = getVippsConfig();
    if (!config.isValid) {
      console.error("Vipps configuration missing:", config.missing);
      res.status(500).send({
        error: "Server configuration error: Missing Vipps credentials.",
        missing: config.missing,
      });
      return;
    }

    const vippsAuth = await getVippsAccessToken(config);
    const { accessToken, baseUrl } = vippsAuth;
    const reference = buildVippsReference();
    const paymentReturnUrl = buildVippsReturnUrl(returnUrl, reference);
    const phoneNumber = normalizeVippsPhoneNumber(customerDetails.phone);

    const paymentRequest = {
      amount: {
        currency: "NOK",
        value: Math.round(parsedAmount * 100),
      },
      paymentMethod: {
        type: "WALLET",
      },
      reference,
      returnUrl: paymentReturnUrl,
      userFlow: "WEB_REDIRECT",
      paymentDescription: "Donasjon til His Kingdom Ministry",
      metadata: {
        donorName: customerDetails.name || "",
        donorEmail: customerDetails.email || "",
        donorMessage: customerDetails.message || "",
      },
    };

    if (phoneNumber) {
      paymentRequest.customer = { phoneNumber };
    }

    const idempotencyKey = crypto.randomUUID ?
      crypto.randomUUID() :
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const paymentResponse = await fetch(`${baseUrl}/epayment/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Idempotency-Key": idempotencyKey,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Merchant-Serial-Number": config.merchantSerialNumber,
        ...getVippsSystemHeaders(config),
      },
      body: JSON.stringify(paymentRequest),
    });

    const paymentPayload = await parseJsonResponse(paymentResponse);
    if (!paymentResponse.ok) {
      const errorDetail = resolveVippsErrorDetail(
          paymentPayload,
          `Create payment failed (${paymentResponse.status})`,
      );
      throw new Error(`Vipps create payment error: ${errorDetail}`);
    }

    if (!paymentPayload.redirectUrl) {
      throw new Error("Vipps did not return redirectUrl");
    }

    res.status(200).send({
      redirectUrl: paymentPayload.redirectUrl,
      reference,
      state: paymentPayload.state || null,
    });
  } catch (error) {
    console.error("Vipps create payment failed:", error);
    res.status(500).send({ error: error && error.message ? error.message : "Unknown Vipps error" });
  }
});

exports.finalizeVippsPayment = onRequest({
  cors: true,
  invoker: "public",
  secrets: [
    vippsClientIdParam,
    vippsClientSecretParam,
    vippsSubscriptionKeyParam,
    vippsMsnParam,
  ],
}, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send({ error: "Method not allowed" });
    return;
  }

  try {
    const { reference } = req.body || {};
    const normalizedReference = typeof reference === "string" ? reference.trim() : "";

    if (!/^[a-zA-Z0-9-]{8,64}$/.test(normalizedReference)) {
      res.status(400).send({ error: "Missing or invalid reference" });
      return;
    }

    const config = getVippsConfig();
    if (!config.isValid) {
      console.error("Vipps configuration missing:", config.missing);
      res.status(500).send({
        error: "Server configuration error: Missing Vipps credentials.",
        missing: config.missing,
      });
      return;
    }

    const vippsAuth = await getVippsAccessToken(config);
    const { accessToken, baseUrl } = vippsAuth;
    let payment = await getVippsPayment(config, baseUrl, accessToken, normalizedReference);

    if (payment.state === "AUTHORIZED") {
      try {
        await captureVippsPayment(config, baseUrl, accessToken, normalizedReference, payment.amount);
      } catch (captureError) {
        console.warn("Vipps capture attempt failed, re-checking status:", captureError.message);
      }

      payment = await getVippsPayment(config, baseUrl, accessToken, normalizedReference);
    }

    res.status(200).send({
      reference: normalizedReference,
      state: payment.state || null,
      amount: payment.amount || null,
      pspReference: payment.pspReference || null,
    });
  } catch (error) {
    console.error("Vipps finalize payment failed:", error);
    res.status(500).send({ error: error && error.message ? error.message : "Unknown Vipps error" });
  }
});

/**
 * Henter en e-postmal fra Firestore eller returnerer standardverdier.
 */
async function getEmailTemplate(templateId, fallback) {
  try {
    const doc = await db.collection("email_templates").doc(templateId).get();
    if (doc.exists) {
      return { ...fallback, ...doc.data() };
    }
  } catch (error) {
    console.warn(`Kunne ikke hente mal ${templateId}:`, error);
  }
  return fallback;
}

/**
 * Helper-funksjon for å sende e-post.
 */
async function sendEmail({ to, subject, html, text, fromName = "His Kingdom Ministry", type = "automated" }) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn("E-postlegitimasjon mangler (EMAIL_USER / EMAIL_PASS). Kan ikke sende e-post.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      subject,
      text,
      html,
    });

    // Logg utsendelsen
    await db.collection("email_logs").add({
      to,
      subject,
      type,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      sentAt: new Date().toISOString(),
      status: "sent"
    });

    return true;
  } catch (error) {
    console.error("Feil ved sending av e-post via NodeMailer:", error);

    // Logg feilen
    await db.collection("email_logs").add({
      to,
      subject,
      type,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      sentAt: new Date().toISOString(),
      status: "failed",
      error: error.message
    });

    return false;
  }
}

/**
 * Trigger som sender velkomst-e-post til nye brukere.
 */
exports.onUserCreate = onDocumentCreated("users/{userId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }
  const userData = snapshot.data();
  const email = userData.email;
  const name = userData.displayName || userData.fullName || "venn";

  if (!email) return;

  const fallback = {
    subject: "Velkommen til His Kingdom Ministry!",
    body: `<h2>Velkommen til oss, {{name}}!</h2>
      <p>Vi er så glade for at du har registrert deg i vårt system.</p>
      <p>Her er litt informasjon om hva du kan gjøre:</p>
      <ul>
        <li><strong>Min Side:</strong> Se din profil og historikk.</li>
        <li><strong>Ressurser:</strong> Tilgang til eksklusivt innhold.</li>
      </ul>`
  };

  const template = await getEmailTemplate("welcome_email", fallback);
  const subject = template.subject.replace("{{name}}", name);
  const htmlBody = template.body.replace("{{name}}", name);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      ${htmlBody}
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
        Dette er en automatisk utsendt e-post fra His Kingdom Ministry.
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html,
      text: `Velkommen til oss, ${name}!`
    });
    console.log(`Velkomst-e-post sendt til ${email}`);
  } catch (error) {
    console.error("Feil ved sending av velkomst-e-post:", error);
  }
});


/**
 * Trigger som sender bekreftelse ved påmelding til nyhetsbrev.
 */
exports.onNewsletterSubscribe = onDocumentCreated("newsletter_subscriptions/{id}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const subData = snapshot.data();
  const email = subData.email;

  if (!email) return;

  const fallback = {
    subject: "Bekreftelse: Du er påmeldt nyhetsbrevet vårt!",
    body: `<h2>Takk for at du følger oss!</h2>
      <p>Vi har nå registrert din e-postadresse <strong>{{email}}</strong> for vårt nyhetsbrev.</p>
      <p>Du vil fremover motta oppdateringer om arrangementer og undervisning.</p>`
  };

  const template = await getEmailTemplate("newsletter_confirmation", fallback);
  const subject = template.subject.replace("{{email}}", email);
  const htmlBody = template.body.replace("{{email}}", email);

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      ${htmlBody}
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
        Du kan melde deg av når som helst ved å svare på denne e-posten.
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html,
      text: `Takk for at du meldte deg på nyhetsbrevet vårt!`
    });
    console.log(`Nyhetsbrev-bekreftelse sendt til ${email}`);
  } catch (error) {
    console.error("Feil ved sending av nyhetsbrev-bekreftelse:", error);
  }
});

/**
 * Manuel utsendelse av e-post fra admin-panelet.
 */
exports.sendManualEmail = onRequest({ cors: true }, async (req, res) => {
  await verifyAdmin(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { to, subject, message, fromName } = req.body;

      if (!to || !subject || !message) {
        res.status(400).send({ error: "Mangler mottaker, emne eller melding." });
        return;
      }

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="margin-bottom: 20px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
            Vennlig hilsen,<br>
            His Kingdom Ministry
          </div>
        </div>
      `;

      const success = await sendEmail({ to, subject, html, text: message, fromName });

      if (success) {
        res.status(200).send({ success: true });
      } else {
        res.status(500).send({ error: "E-postkonfigurasjon mangler på serveren." });
      }

    } catch (error) {
      console.error("Feil ved manuell e-postsending:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

/**
 * Paginert henting av alle brukere fra Firestore.
 * @param {string} [role] - Filtrer brukere etter rolle.
 */
async function getAllUsers(role) {
  const users = [];
  let usersQuery = db.collection('users');

  if (role && role !== 'all') {
    usersQuery = usersQuery.where('role', '==', role);
  }

  const querySnapshot = await usersQuery.get();
  querySnapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });

  return users;
}

/**
 * Verifies that the user is an admin.
 * Express-style middleware for use in onRequest functions.
 */
const verifyAdmin = async (req, res, next) => {
  const idToken = req.headers.authorization?.split('Bearer ')[1];

  if (!idToken) {
    res.status(401).send({ error: 'Unauthorized: Missing authorization token.' });
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (userDoc.exists) {
      const userRole = userDoc.data().role;
      // Allow 'admin' or 'superadmin'
      if (userRole === 'admin' || userRole === 'superadmin') {
        req.user = decodedToken; // Pass user info to the handler
        return next();
      }
    }

    res.status(403).send({ error: 'Forbidden: You do not have permission to perform this action.' });
  } catch (error) {
    console.error('Error verifying admin token:', error);
    res.status(401).send({ error: 'Unauthorized: Invalid token.' });
  }
};

/**
 * Utsendelse av e-post til en gruppe brukere.
 * Krever admin-autentisering.
 */
exports.sendBulkEmail = onRequest({ cors: true }, async (req, res) => {
  // Wrap the core logic in the verifyAdmin middleware
  await verifyAdmin(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { targetRole, subject, message, fromName, selectedUserIds } = req.body;

      if ((!targetRole && !selectedUserIds) || !subject || !message) {
        res.status(400).send({ error: "Mangler målgruppe, emne eller melding." });
        return;
      }

      let users = [];
      if (targetRole === 'selected' && selectedUserIds && selectedUserIds.length > 0) {
        console.log(`Henter ${selectedUserIds.length} utvalgte brukere.`);
        const userPromises = selectedUserIds.map(uid => db.collection('users').doc(uid).get());
        const userDocs = await Promise.all(userPromises);
        users = userDocs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        console.log(`Starter masseutsendelse for rolle: ${targetRole}`);
        users = await getAllUsers(targetRole);
      }

      if (users.length === 0) {
        res.status(404).send({ error: "Ingen brukere funnet for den valgte målgruppen." });
        return;
      }

      const emails = users.map(u => u.email).filter(Boolean);
      console.log(`Fant ${emails.length} e-postadresser å sende til.`);

      // For now, lets send in parallel. If there are many users, a batching queue would be better.
      const emailPromises = emails.map(email => {
        const html = `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <div style="margin-bottom: 20px;">
                      ${message.replace(/\n/g, '<br>')}
                    </div>
                    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                      Vennlig hilsen,<br>
                      His Kingdom Ministry
                    </div>
                  </div>
                `;
        return sendEmail({ to: email, subject, html, text: message, fromName });
      });

      await Promise.all(emailPromises);

      res.status(200).send({ success: true, message: `E-poster er sendt til ${emails.length} brukere.` });

    } catch (error) {
      console.error("Feil ved masseutsendelse av e-post:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

/**
 * Utsendelse av push-varslinger til en gruppe brukere.
 * Krever admin-autentisering.
 */
exports.sendPushNotification = onRequest({ cors: true }, async (req, res) => {
  await verifyAdmin(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    try {
      const { targetRole, title, body, icon, click_action, selectedUserIds } = req.body;

      if ((!targetRole && !selectedUserIds) || !title || !body) {
        res.status(400).send({ error: "Mangler målgruppe, tittel eller melding." });
        return;
      }

      let users = [];
      if (targetRole === 'selected' && selectedUserIds && selectedUserIds.length > 0) {
        console.log(`Henter ${selectedUserIds.length} utvalgte brukere for push-varsling.`);
        const userPromises = selectedUserIds.map(uid => db.collection('users').doc(uid).get());
        const userDocs = await Promise.all(userPromises);
        users = userDocs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        console.log(`Starter utsendelse av push-varsling for rolle: ${targetRole}`);
        users = await getAllUsers(targetRole);
      }

      if (users.length === 0) {
        res.status(404).send({ error: "Ingen brukere funnet for den valgte målgruppen." });
        return;
      }

      // Create a map of token to user ID
      const tokenUserMap = new Map();
      users.forEach(user => {
        if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
          user.fcmTokens.forEach(token => {
            tokenUserMap.set(token, user.id);
          });
        }
      });

      const tokens = Array.from(tokenUserMap.keys());

      if (tokens.length === 0) {
        res.status(404).send({ error: "Ingen brukere med varslingstokens funnet." });
        return;
      }

      console.log(`Fant ${tokens.length} tokens å sende til.`);

      const message = {
        notification: {
          title,
          body,
          icon: icon || '/img/logo-hkm.png',
        },
        webpush: {
          fcm_options: {
            link: click_action || 'https://his-kingdom-ministry.web.app/'
          }
        }
      };

      const response = await admin.messaging().sendToDevice(tokens, message);
      let failureCount = 0;
      let successCount = 0;

      const tokensToClean = [];

      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          failureCount++;
          console.error('Failure sending notification to', tokens[index], error);
          // Cleanup the tokens that are not registered anymore.
          if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
            const token = tokens[index];
            tokensToClean.push(token);
          }
        } else {
          successCount++;
        }
      });

      if (tokensToClean.length > 0) {
        console.log(`Cleaning ${tokensToClean.length} invalid tokens.`);
        const cleanupPromises = tokensToClean.map(async (token) => {
          const userId = tokenUserMap.get(token);
          if (userId) {
            const userRef = db.collection('users').doc(userId);
            return userRef.update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
            });
          }
        });
        await Promise.all(cleanupPromises);
        console.log("Token cleanup complete.");
      }

      console.log(`Successfully sent message to ${successCount} devices. Failed for ${failureCount} devices.`);
      res.status(200).send({ success: true, message: `Varsling sendt til ${successCount} enheter. ${failureCount} feilet.` });

    } catch (error) {
      console.error("Feil ved utsendelse av push-varsling:", error);
      res.status(500).send({ error: error.message });
    }
  });
});

/**
 * Logger systemfeil til Firestore og sender e-post ved kritiske feil.
 */
exports.logSystemError = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { type, message, severity = "INFO", userId = null, additionalData = {} } = req.body;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    await db.collection("system_logs").add({
      type,
      message,
      severity,
      userId,
      additionalData,
      timestamp,
      createdAt: new Date().toISOString(),
      read: false
    });

    if (severity === "CRITICAL") {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

      const html = `
        <h2>🚨 Kritisk Systemfeil</h2>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Melding:</strong> ${message}</p>
        <p><strong>Bruker:</strong> ${userId || "Ukjent"}</p>
        <p><strong>Tidspunkt:</strong> ${new Date().toLocaleString()}</p>
        <br>
        <p><a href="https://his-kingdom-ministry.web.app/admin">Gå til Dashboard</a></p>
      `;

      await sendEmail({
        to: adminEmail,
        subject: `🚨 KRITISK FEIL: ${type}`,
        html,
        text: `En kritisk feil har oppstått: ${message}`,
        fromName: "System Alert"
      });
      console.log("Kritisk varsel sendt på e-post.");
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Feil ved logging:", error);
    res.status(500).send({ error: "Kunne ikke logge feil." });
  }
});

/**
 * Trigger som sender bekreftelse ved innsending av kontaktskjema.
 */
exports.onContactFormSubmit = onDocumentCreated("contactMessages/{id}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const msgData = snapshot.data();
  const email = msgData.email;
  const name = msgData.name || "venn";
  const phone = clampText(msgData.phone || "", 40);
  const source = clampText(msgData.source || "", 80);
  const pagePath = clampText(msgData.pagePath || "", 300);

  if (!email) return;

  const adminEmail = (
    process.env.CHAT_ALERT_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.EMAIL_USER ||
    ""
  ).trim();

  if (adminEmail) {
    const internalSubject = source === "chat_widget_email" ?
      `Ny e-post fra chatwidget (${name})` :
      `Ny kontaktmelding fra ${name}`;
    const internalText = [
      `Navn: ${name}`,
      `E-post: ${email}`,
      phone ? `Telefon: ${phone}` : "",
      pagePath ? `Side: ${pagePath}` : "",
      source ? `Kilde: ${source}` : "",
      "",
      "Melding:",
      msgData.message || "",
    ].filter(Boolean).join("\n");

    const internalHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 680px;">
        <h2>${internalSubject}</h2>
        <p><strong>Navn:</strong> ${name}</p>
        <p><strong>E-post:</strong> ${email}</p>
        ${phone ? `<p><strong>Telefon:</strong> ${phone}</p>` : ""}
        ${pagePath ? `<p><strong>Side:</strong> ${pagePath}</p>` : ""}
        ${source ? `<p><strong>Kilde:</strong> ${source}</p>` : ""}
        <p><strong>Melding:</strong></p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;white-space:pre-wrap;">${msgData.message ? msgData.message.replace(/\n/g, "<br>") : ""}</div>
      </div>
    `;

    try {
      await sendEmail({
        to: adminEmail,
        subject: internalSubject,
        html: internalHtml,
        text: internalText,
        fromName: "HKM Nettside",
        type: "contact_alert",
      });
    } catch (error) {
      console.error("Feil ved sending av intern kontaktmelding:", error);
    }
  }

  const fallback = {
    subject: "Takk for din melding: {{subject}}",
    body: `<h2>Takk for at du tok kontakt, {{name}}!</h2>
      <p>Vi har mottatt din melding med emnet "{{subject}}".</p>
      <p>Vi vil gå gjennom din henvendelse og svare deg så snart som mulig.</p>
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Din melding:</strong><br>
        ${msgData.message ? msgData.message.replace(/\n/g, '<br>') : ''}
      </div>`
  };

  const template = await getEmailTemplate("contact_form_confirmation", fallback);
  const subject = template.subject.replace("{{name}}", name).replace("{{subject}}", msgData.subject || "Kontakt");
  const htmlBody = template.body.replace("{{name}}", name).replace("{{subject}}", msgData.subject || "Kontakt");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      ${htmlBody}
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
        Dette er en automatisk bekreftelse. Du trenger ikke svare på denne e-posten.
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject,
      html,
      text: `Takk for at du tok kontakt! Vi har mottatt din melding.`
    });
    console.log(`Kontakt-bekreftelse sendt til ${email}`);
  } catch (error) {
    console.error("Feil ved sending av kontakt-bekreftelse:", error);
  }
});

/**
 * Sender nye besøksmeldinger til en Google Chat-kanal via incoming webhook.
 */
exports.onVisitorChatMessageCreated = onDocumentCreated({
  document: "visitorChats/{chatId}/messages/{messageId}",
  secrets: [googleChatWebhookUrlParam],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const msgData = snapshot.data() || {};
  if (msgData.sender !== "visitor") return;
  const targetMode = typeof msgData.targetMode === "string" ?
    msgData.targetMode.trim().toLowerCase() :
    "";
  const normalizedTargetMode = ["ai", "google_chat", "email"].includes(targetMode) ?
    targetMode :
    "";
  if (normalizedTargetMode === "ai") return;

  const text = clampText(msgData.text || "", 1200);
  if (!text) return;

  const chatId = event.params && event.params.chatId ? event.params.chatId : "ukjent";
  const chatRef = db.collection("visitorChats").doc(chatId);
  const chatDoc = await chatRef.get();
  const chatData = chatDoc.exists ? (chatDoc.data() || {}) : {};

  const visitorName = clampText(chatData.visitorName || "Anonym besokende", 120);
  const visitorEmail = clampText(chatData.visitorEmail || "", 254);
  const sourcePage = clampText(chatData.lastPagePath || chatData.sourcePage || msgData.pagePath || "", 220);

  const shortText = text.length > 700 ? `${text.slice(0, 700)}...` : text;
  const googleChatText = [
    "*Ny melding fra nettside-chat*",
    `Chat-ID: ${chatId}`,
    `Fra: ${visitorName}${visitorEmail ? ` (${visitorEmail})` : ""}`,
    sourcePage ? `Side: ${sourcePage}` : "",
    "",
    "*Sporsmal:*",
    shortText,
    "",
    "Svar i denne traden for a sende melding direkte til besokende.",
    "(Reservekommando: reply <chatId> <melding>)",
  ].filter(Boolean).join("\n");

  const shouldSendGoogleChat = normalizedTargetMode === "google_chat" || !normalizedTargetMode;
  const shouldSendEmail = normalizedTargetMode === "email" || !normalizedTargetMode;

  // 1) Send til Google Chat (hvis valgt og webhook er konfigurert)
  const webhookUrl = getGoogleChatWebhookUrl();
  console.log(`[GoogleChatSync] targetMode=${normalizedTargetMode || "legacy_default"}, webhook=${webhookUrl ? "ja" : "nei"}`);
  if (shouldSendGoogleChat && webhookUrl) {
    try {
      const fallbackSpaceName = extractGoogleChatSpaceNameFromWebhookUrl(webhookUrl);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          text: googleChatText,
          thread: {
            threadKey: `visitor_${chatId}`,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Google Chat webhook feilet (${response.status}): ${errText}`);
      }

      const webhookPayload = await response.json().catch(() => ({}));
      const responseSpaceName = clampText(
          (webhookPayload && webhookPayload.space && webhookPayload.space.name) || "",
          255,
      );
      const responseThreadName = clampText(
          (webhookPayload && webhookPayload.thread && webhookPayload.thread.name) || "",
          255,
      );
      const resolvedSpaceName = responseSpaceName || fallbackSpaceName;

      await saveGoogleChatSpaceFallback({
        spaceName: resolvedSpaceName,
        chatId,
      });

      if (resolvedSpaceName && responseThreadName) {
        await saveGoogleChatThreadMapping({
          spaceName: resolvedSpaceName,
          threadName: responseThreadName,
          chatId,
        });
      }

      console.log("[GoogleChatSync] Mapping updated", JSON.stringify({
        chatId,
        resolvedSpaceName,
        responseThreadName,
      }));
    } catch (error) {
      console.error("Kunne ikke sende visitor chat til Google Chat:", error);
    }
  } else if (shouldSendGoogleChat) {
    console.warn("GOOGLE_CHAT_WEBHOOK_URL mangler i secrets eller env.");
  }

  // 2) Send intern e-postvarsling (kun i e-postmodus eller legacy default)
  if (!shouldSendEmail) {
    return;
  }

  const emailAlertRecipient = (
    process.env.CHAT_ALERT_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.EMAIL_USER ||
    ""
  ).trim();

  if (!emailAlertRecipient) {
    console.warn("Ingen e-postmottaker satt for chatvarsler (CHAT_ALERT_EMAIL/ADMIN_EMAIL/EMAIL_USER).");
    return;
  }

  const emailSubject = `Ny nettside-chat (${chatId})`;
  const emailText = [
    "Ny chatmelding fra nettsiden",
    `Chat-ID: ${chatId}`,
    `Fra: ${visitorName}${visitorEmail ? ` (${visitorEmail})` : ""}`,
    sourcePage ? `Side: ${sourcePage}` : "",
    `Sporsmal: ${text}`,
    shouldSendGoogleChat ? "" : "Mottatt i e-postmodus (ikke sendt til Google Chat).",
    shouldSendGoogleChat ? "Svar i Google Chat med:" : "",
    shouldSendGoogleChat ? `reply ${chatId} Hei!` : "",
  ].filter(Boolean).join("\n");

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 680px;">
      <h2 style="margin-bottom: 10px;">Ny chatmelding fra nettsiden</h2>
      <p><strong>Chat-ID:</strong> ${chatId}</p>
      <p><strong>Fra:</strong> ${visitorName}${visitorEmail ? ` (${visitorEmail})` : ""}</p>
      ${sourcePage ? `<p><strong>Side:</strong> ${sourcePage}</p>` : ""}
      <p><strong>Sporsmal:</strong></p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;white-space:pre-wrap;">${text}</div>
      ${shouldSendGoogleChat ? `<p style="margin-top:14px;"><strong>Svar i Google Chat med:</strong><br><code>reply ${chatId} Hei!</code></p>` : `<p style="margin-top:14px;"><strong>Modus:</strong> E-post (ikke sendt til Google Chat).</p>`}
    </div>
  `;

  try {
    await sendEmail({
      to: emailAlertRecipient,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      fromName: "HKM Chatbot",
      type: "chat_alert",
    });
  } catch (error) {
    console.error("Kunne ikke sende chat-varsel pa e-post:", error);
  }
});

/**
 * Inbound endpoint for Google Chat app.
 * Usage in Google Chat space: "reply <chatId> <svartekst>"
 */
exports.googleChatBridge = onRequest({
  cors: true,
  secrets: [googleChatBridgeTokenParam],
}, async (req, res) => {
  const isWorkspaceAddon = Boolean(req.body && typeof req.body === "object" && req.body.chat);

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const payload = parseGoogleChatEventPayload(req);
  const extracted = extractGoogleChatEventFields(payload);
  const eventType = extracted.eventType;
  const isCommandEvent = Boolean(extracted.appCommandId);
  if (eventType && eventType !== "MESSAGE" && !isCommandEvent) {
    return res.status(200).json(makeGoogleChatResponse({ text: "OK" }, isWorkspaceAddon));
  }

  const expectedToken = getGoogleChatBridgeToken();
  if (expectedToken) {
    const providedToken = (
      (typeof req.query.token === "string" && req.query.token) ||
      req.get("x-hkm-chat-token") ||
      ""
    ).trim();

    if (!providedToken || providedToken !== expectedToken) {
      return res.status(401).json({ text: "Unauthorized." });
    }
  }

  const userType = extracted.userType || "";
  if (userType === "BOT") {
    return res.status(200).json(makeGoogleChatResponse({ text: "OK" }, isWorkspaceAddon));
  }

  const rawText = extracted.rawText || "";

  console.log("[GoogleChatBridge] Incoming message", JSON.stringify({
    contentType: req.get("content-type") || "",
    rawBodyBytes: req.rawBody && req.rawBody.length ? req.rawBody.length : 0,
    payloadKeys: extracted.payloadKeys,
    chatKeys: extracted.chatKeys,
    msgPayloadKeys: extracted.msgPayloadKeys,
    appCommandKeys: extracted.appCommandKeys,
    type: extracted.eventType,
    userType: extracted.userType,
    appCommandId: extracted.appCommandId,
    appCommandType: extracted.appCommandType,
    hasRawText: Boolean(rawText),
    rawTextPreview: extracted.rawTextPreview,
    spaceName: extracted.spaceName,
    threadName: extracted.threadName,
    threadKey: extracted.threadKey,
  }));

  let parsedCommand = parseGoogleChatReplyCommand(rawText);
  const inferredChatId = await inferChatIdFromGooglePayload(extracted.normalizedPayload);
  if (!parsedCommand && (extracted.appCommandId || extracted.appCommandType === "SLASH_COMMAND") && !inferredChatId) {
    parsedCommand = parseGoogleChatReplyArgs(rawText);
  }
  const naturalText = clampText(cleanGoogleChatCommandText(rawText), 4000);

  let chatId = "";
  let replyText = "";

  if (parsedCommand) {
    chatId = parsedCommand.chatId;
    replyText = parsedCommand.replyText;
  } else {
    chatId = inferredChatId;
    replyText = extracted.appCommandType === "SLASH_COMMAND" ?
      (stripGoogleChatReplyPrefix(rawText, chatId) || naturalText) :
      naturalText;
  }

  console.log("[GoogleChatBridge] Parsed routing", JSON.stringify({
    parsedCommand: Boolean(parsedCommand),
    resolvedChatId: chatId || "",
    replyLen: replyText ? replyText.length : 0,
  }));

  if (!replyText) {
    return res.status(200).json(makeGoogleChatResponse({
      text: "Tom melding. Skriv svaret ditt i traden.",
    }, isWorkspaceAddon));
  }

  if (!chatId) {
    return res.status(200).json(makeGoogleChatResponse({
      text: "Fant ikke hvilken nettside-chat dette gjelder. Bruk: reply <chatId> <svartekst>",
    }, isWorkspaceAddon));
  }

  const chatRef = db.collection("visitorChats").doc(chatId);
  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) {
    return res.status(200).json(makeGoogleChatResponse({
      text: `Fant ikke chat med ID ${chatId}.`,
    }, isWorkspaceAddon));
  }

  const fromName = clampText(
      extracted.userDisplayName || "HKM Team",
      120,
  );

  await chatRef.collection("messages").add({
    sender: "agent",
    source: "google_chat",
    fromName,
    text: replyText,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await chatRef.set({
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastAgentMessageAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`[GoogleChatBridge] Reply stored for chatId=${chatId}`);

  return res.status(200).json(makeGoogleChatResponse({
    text: `Svar sendt til besøkschat ${chatId}.`,
  }, isWorkspaceAddon));
});

/**
 * AI-drevet chatbot for His Kingdom Ministry.
 * Svarer automatisk på nye meldinger fra besøkende ved bruk av Gemini.
 */
exports.onVisitorChatMessageAI = onDocumentCreated({
  document: "visitorChats/{chatId}/messages/{messageId}",
  secrets: [geminiApiKeyParam],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const msgData = snapshot.data() || {};
  // Svarer kun på meldinger fra besøkende (for å unngå loop)
  if (msgData.sender !== "visitor") return;
  const targetMode = typeof msgData.targetMode === "string" ?
    msgData.targetMode.trim().toLowerCase() :
    "";
  if (targetMode && targetMode !== "ai") return;

  const chatId = event.params.chatId;
  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    console.warn("GEMINI_API_KEY mangler. AI-svar deaktivert.");
    return;
  }

  try {
    const cleanKey = geminiKey.trim();
    const apiBase = "https://generativelanguage.googleapis.com/v1beta";

    // Finn en modell som faktisk er tilgjengelig for dette prosjektet/API-nokkelen.
    const modelsResponse = await fetch(`${apiBase}/models?key=${cleanKey}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    const modelsPayload = await modelsResponse.json().catch(() => ({}));
    if (!modelsResponse.ok) {
      console.error("Gemini listModels-feil:", JSON.stringify(modelsPayload));
      return;
    }

    const modelNames = Array.isArray(modelsPayload.models) ?
      modelsPayload.models
          .filter((model) =>
            model &&
            typeof model.name === "string" &&
            Array.isArray(model.supportedGenerationMethods) &&
            model.supportedGenerationMethods.includes("generateContent"))
          .map((model) => model.name) :
      [];

    const selectedModel = chooseGeminiModel(modelNames);
    if (!selectedModel) {
      console.error("Fant ingen Gemini-modell med generateContent-stotte.");
      return;
    }

    const url = `${apiBase}/${selectedModel}:generateContent?key=${cleanKey}`;

    // 1. Hent litt kontekst om nettstedet
    const settingsSnap = await db.collection("siteContent").doc("settings_seo").get();
    const siteTitle = settingsSnap.exists ? (settingsSnap.data().siteTitle || "His Kingdom Ministry") : "His Kingdom Ministry";
    
    const systemPrompt = `
      Du er en hjelpsom AI-assistent for ${siteTitle} (HKM). 
      Ditt mål er å svare på spørsmål om kirken, tjenestene deres og kristen tro på en varm og spirituelt oppløftende måte.
      Regler: Svar på norsk. Vær kortfattet. Hvis du ikke vet svaret, si at teamet vil svare snart. Nevn aldri TK-design.
    `.trim();

    const userMessage = msgData.text || "";
    if (!userMessage) return;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nBesøkende: ${userMessage}` }]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini REST API feil:", JSON.stringify(data));
      return;
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (aiText) {
      // 4. Lagre AI-svaret i Firestore
      const chatRef = db.collection("visitorChats").doc(chatId);
      await chatRef.collection("messages").add({
        sender: "agent",
        source: "ai_gemini",
        fromName: "HKM Assistent",
        text: aiText.trim(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Oppdater sist aktiv tid
      await chatRef.set({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

  } catch (error) {
    console.error("Feil i chatbot-AI logikk (SDK):", error);
  }
});
