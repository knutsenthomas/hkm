const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const fetch = require("node-fetch");
const { parseStringPromise } = require("xml2js");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
require("dotenv").config({ path: path.join(__dirname, ".env.local"), override: true, quiet: true });
const { createClient, OAuthStrategy, ApiKeyStrategy } = require("@wix/sdk");
const { products } = require("@wix/stores");

admin.initializeApp();
const db = admin.firestore();

// Stripe is initialized inside the function to avoid build-time errors
const stripeInit = require("stripe");

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

exports.wixProducts = onRequest({ cors: true, invoker: "public" }, (req, res) => {
  return cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed. Use GET." });
    }

    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 100);
      const skip = Math.max(Number(req.query.offset || req.query.skip) || 0, 0);

      const wixClient = getWixClient();
      let authMode = (process.env.WIX_API_KEY && process.env.WIX_SITE_ID) ? "api-key" : "oauth";

      if (authMode === "oauth" && wixClient.auth && typeof wixClient.auth.generateVisitorTokens === "function") {
        try {
          await wixClient.auth.generateVisitorTokens();
        } catch (authError) {
          console.warn("Wix visitor token generation failed:", authError && authError.message ? authError.message : authError);
        }
      }

      const result = await wixClient.products.queryProducts()
        .limit(limit)
        .skip(skip)
        .descending("_createdDate")
        .find();

      const rawItems = Array.isArray(result.items) ? result.items : [];
      const items = rawItems.map((item) => normalizeWixProduct(item, req)).filter((item) => item.name);

      return res.status(200).json({
        ok: true,
        source: "wix-sdk",
        authMode,
        total: typeof result.totalCount === "number" ? result.totalCount : items.length,
        count: items.length,
        items,
      });
    } catch (error) {
      console.error("Error fetching Wix products:", error);
      return res.status(500).json({
        ok: false,
        error: "Could not load products from Wix.",
        details: error && error.message ? error.message : String(error),
        fallbackUrl: "https://www.hiskingdomministry.no/butikk",
        hint: "Set WIX_CLIENT_ID (OAuth) or preferably WIX_API_KEY + (WIX_SITE_ID or WIX_ACCOUNT_ID) in Firebase Functions env. Some Wix stores need site-scoped auth.",
      });
    }
  });
});

/**
 * Oppretter en PaymentIntent for Stripe.
 * Tar imot: amount (NOK), currency (optional, default NOK).
 */
exports.createPaymentIntent = onRequest({ cors: true, invoker: "public" }, async (req, res) => {
  // Håndter preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { amount, currency = "nok", customerDetails = {} } = req.body;

    if (!amount) {
      res.status(400).send({ error: "Missing amount" });
      return;
    }

    // Initialize Stripe lazily
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("Stripe Secret Key is missing!");
      res.status(500).send({ error: "Server configuration error: Missing Stripe Key." });
      return;
    }
    const stripe = stripeInit(stripeKey);

    // Opprett PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe bruker øre (cents)
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerDetails.email || undefined,
      description: `Donasjon fra ${customerDetails.name || 'Ukjent'}`,
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
          country: 'NO', // Default to Norway
        },
      } : undefined,
    });

    // Returner clientSecret til frontend
    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).send({ error: error.message });
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

  if (!email) return;

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
