const { defineSecret } = require('firebase-functions/params');
const geminiApiKeyParam = defineSecret('GEMINI_API_KEY');
const openaiApiKeyParam = defineSecret('OPENAI_API_KEY');
const gaPropertyIdParam = defineSecret('GA_PROPERTY_ID');
const gaServiceAccountEmailParam = defineSecret('GA_SERVICE_ACCOUNT_EMAIL');
const gaServiceAccountPrivateKeyParam = defineSecret('GA_SERVICE_ACCOUNT_PRIVATE_KEY');
const emailUserParam = defineSecret('EMAIL_USER');
const emailPassParam = defineSecret('EMAIL_PASS');
const vippsClientIdParam = defineSecret('VIPPS_CLIENT_ID');
const vippsClientSecretParam = defineSecret('VIPPS_CLIENT_SECRET');
const vippsSubscriptionKeyParam = defineSecret('VIPPS_SUBSCRIPTION_KEY');
const vippsMsnParam = defineSecret('VIPPS_MSN');
const googleChatWebhookUrlParam = defineSecret('GOOGLE_CHAT_WEBHOOK_URL');
const googleChatBridgeTokenParam = defineSecret('GOOGLE_CHAT_BRIDGE_TOKEN');
const stripeSecretKeyParam = defineSecret('STRIPE_SECRET_KEY');

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseStringPromise } = require('xml2js');
const OpenAI = require('openai');
const crypto = require('crypto');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;
const cors = require("cors")({ origin: true });

// Constants for podcast transcription
const PODCAST_TRANSCRIPT_MAX_AUTO_EPISODES_PER_RUN = 3;
const PODCAST_TRANSCRIPT_RETRY_MS = 1000 * 60 * 60 * 24; // 24 hours
const PODCAST_AUTO_TRANSCRIPTION_ENABLED = true;

/**
 * Helper to get Gemini API key
 */
function getGeminiApiKey() {
  return geminiApiKeyParam.value();
}

/**
 * Helper to get secret or environment variable
 */
function getSecretOrEnv(param, envKeys = []) {
  try {
    return param.value();
  } catch (e) {
    for (const key of envKeys) {
      if (process.env[key]) return process.env[key];
    }
    return "";
  }
}

/**
 * Helper to fetch podcast episodes from RSS feed
 */
async function fetchPodcastEpisodesFromRss(limit = 10) {
  const rssUrl = "https://anchor.fm/s/f7a13dec/podcast/rss";
  try {
    const resp = await fetch(rssUrl);
    if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.statusText}`);
    const xml = await resp.text();
    const data = await parseStringPromise(xml);
    const channel = data.rss.channel[0];
    const items = (channel.item || []).slice(0, limit).map(it => {
      const audioUrl = it.enclosure ? it.enclosure[0].$.url : "";
      const title = it.title ? it.title[0] : "";
      const guid = it.guid ? (typeof it.guid[0] === 'object' ? it.guid[0]._ : it.guid[0]) : "";
      const episodeId = guid.split('/').pop() || guid;
      
      return {
        episodeId,
        title,
        audioUrl,
        pubDate: it.pubDate ? it.pubDate[0] : ""
      };
    });
    return items;
  } catch (error) {
    console.error("Error fetching podcast RSS:", error);
    return [];
  }
}

/**
 * AI endpoint: Suggest SEO tags, meta title, and meta description for podcast episodes using Gemini.
 */
/**
 * AI endpoint: Suggest SEO tags, meta title, and meta description for podcast episodes using Gemini.
 */
/**
 * Universal AI Engine: Handles text generation, newsletters, and DALL-E 3 image generation.
 */
exports.aiProcess = onCall({ secrets: [geminiApiKeyParam, openaiApiKeyParam] }, async (request) => {
  try {
    const { task, prompt, options } = request.data || {};
    const geminiKey = getGeminiApiKey();
    const openaiKey = openaiApiKeyParam.value();

    if (!prompt) throw new HttpsError('invalid-argument', 'Missing prompt.');

    // --- CASE 1: Bildegenerering (DALL-E 3) ---
    if (task === 'generate_newsletter_structure') {
      const structurePrompt = `
        Du er en ekspert på nyhetsbrev for His Kingdom Ministry.
        Brukeren ønsker: ${prompt}
        Lag en struktur for nyhetsbrevet bestående av 3-5 blokker.
        Tilgjengelige blokktyper: 'title', 'text', 'image', 'button', 'spacer'.
        For 'image', bruk denne placeholder-URLen: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80'.
        Svar KUN med gyldig JSON på dette formatet:
        { "blocks": [ { "type": "title", "content": { "text": "..." } }, { "type": "text", "content": { "text": "..." } } ] }
        Ikke bruk markdown-blokker som f.eks. kodelister med json, svar kun med rå tekst.
      `.trim();
      
      try {
        const geminiKey = getGeminiApiKey();
        let textResult = "";
        // Try Gemini first
        if (geminiKey) {
          try {
            const genAI = new GoogleGenerativeAI(geminiKey.trim());
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(structurePrompt);
            textResult = (await result.response).text();
          } catch (geminiErr) {
            console.error("Gemini failed for newsletter, trying OpenAI fallback:", geminiErr);
          }
        }
        
        // Fallback to OpenAI if Gemini failed or returned empty
        if (!textResult && openaiApiKeyParam.value()) {
          try {
            const openai = new OpenAI({ apiKey: openaiApiKeyParam.value() });
            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: structurePrompt }]
            });
            textResult = completion.choices[0].message.content;
          } catch (openaiErr) {
            console.error("OpenAI also failed for newsletter:", openaiErr);
          }
        }
        
        if (textResult) {
          const jsonMatch = textResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              return JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.error("Newsletter JSON parse error:", e, textResult);
            }
          }
          textResult = textResult.replace(/```json|```/g, "").trim();
          return JSON.parse(textResult);
        }
        throw new HttpsError('internal', 'AI returnerte ingen tekst.');
      } catch (err) {
        console.error("Newsletter structure generation failed:", err);
      }
    }

    if (task === 'generate_blog_draft') {
      const draftPrompt = `
        Du er en inspirerende og dyktig Senior Skribent for His Kingdom Ministry.
        TEMA (Bruk dette kun som inspirasjon): ${prompt}
        
        OPPGAVE: Lag et OMFATTENDE, profesjonelt og bibelsk forankret blogginnlegg i EditorJS-format. 
        Målet er å gi leseren dyp innsikt og praktisk inspirasjon.
        
        STRUKTUR-REGLER:
        - START: Begynn direkte med en engasjerende introduksjon (paragraph).
        - DYBDE: Bruk 4-5 hovedseksjoner med 'header' (level 3) og fyldige 'paragraph'-blokker.
        - BIBELVERS: Inkluder minst 2-3 relevante bibelvers i 'quote'-blokker.
        - LISTER: Bruk 'list' for praktiske steg eller prinsipper.
        - AVSLUTNING: Avslutt alltid med en ny seksjon: "Spørsmål til ettertanke" (header level 3).
        - REFLEKSJON: Lag en 'list' med 3-4 dype spørsmål som hjelper leseren å anvende budskapet.
        
        KVALITETSKRAV:
        - Skriv varmt, moderne og reflekterende norsk.
        - Hvert avsnitt skal være fyldig og meningsbærende (4-6 setninger).
        - Skap LUFT ved å dele opp i mange blokker.
        
        JSON FORMAT (Svar KUN med dette):
        { 
          "blocks": [ 
            { "type": "paragraph", "data": { "text": "Introduksjon..." } },
            { "type": "header", "data": { "text": "Hovedpoeng 1", "level": 3 } },
            { "type": "paragraph", "data": { "text": "Utfyllende tekst..." } },
            { "type": "quote", "data": { "text": "Bibelvers", "caption": "Referanse" } },
            { "type": "header", "data": { "text": "Spørsmål til ettertanke", "level": 3 } },
            { "type": "list", "data": { "style": "unordered", "items": ["Spørsmål 1", "Spørsmål 2", "Spørsmål 3"] } }
          ] 
        }
        Svar kun med rå JSON.
      `.trim();

      try {
        const geminiKey = getGeminiApiKey();
        let textResult = "";
        
        // Try Gemini first
        if (geminiKey) {
          try {
            const genAI = new GoogleGenerativeAI(geminiKey.trim());
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(draftPrompt);
            textResult = (await result.response).text();
          } catch (geminiErr) {
            console.error("Gemini failed for blog draft, trying OpenAI fallback:", geminiErr);
          }
        }

        // Fallback to OpenAI if Gemini failed or returned empty
        if (!textResult && openaiApiKeyParam.value()) {
          try {
            const openai = new OpenAI({ apiKey: openaiApiKeyParam.value() });
            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: draftPrompt }]
            });
            textResult = completion.choices[0].message.content;
          } catch (openaiErr) {
            console.error("OpenAI also failed for blog draft:", openaiErr);
          }
        }

        if (textResult) {
          // Robust JSON extraction
          const jsonMatch = textResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              return JSON.parse(jsonMatch[0]);
            } catch (e) {
              console.error("JSON parse error from AI result:", e, textResult);
            }
          }
          // Fallback if no JSON found or parse failed
          textResult = textResult.replace(/```json|```/g, "").trim();
          return JSON.parse(textResult);
        }
        throw new HttpsError('internal', 'AI returnerte ingen tekst.');
      } catch (err) {
        console.error("Blog draft generation failed:", err);
        throw new HttpsError('internal', err.message || 'Kunne ikke generere utkast.');
      }
    }

    if (task === 'generate_image') {
      if (!openaiKey) throw new HttpsError('unavailable', 'OpenAI-nøkkel mangler for bildegenerering.');
      
      console.log("Genererer bilde med DALL-E 3...");
      const openai = new OpenAI({ apiKey: openaiKey });
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd"
      });

      return { imageUrl: response.data[0].url };
    }

    // --- CASE 2: Tekstgenerering (Nyhetsbrev, Blogg, Chat) ---
    let textResult = "";
    let lastError = null;

    // Prøv Gemini først (billigst/raskest)
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey.trim());
      const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
      for (const m of models) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent(prompt);
          textResult = (await result.response).text();
          if (textResult) break;
        } catch (err) { lastError = err; }
      }
    }

    // Fallback til OpenAI (ChatGPT)
    if (!textResult && openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey });
        const completion = await openai.chat.completions.create({
          model: options?.model || "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }]
        });
        textResult = completion.choices[0].message.content;
      } catch (err) { lastError = err; }
    }

    if (!textResult) throw new HttpsError('unavailable', `AI feilet: ${lastError?.message}`);
    return { text: textResult };

  } catch (error) {
    console.error('AI Process failed:', error);
    throw new HttpsError('internal', error.message);
  }
});

exports.seoSuggest = onCall({ secrets: [geminiApiKeyParam, openaiApiKeyParam] }, async (request) => {
  try {
    const geminiKey = getGeminiApiKey();
    const openaiKey = openaiApiKeyParam.value();
    
    const { title, description, categories, transcript, type } = request.data || {};
    if (!title) {
      throw new HttpsError('invalid-argument', 'Vennligst skriv en tittel først.');
    }

    const typeLabel = type === 'blog' ? 'blogginnlegg' : (type === 'teaching' ? 'undervisning' : 'podcast');
    const prompt = [
      `Du er en SEO-ekspert for et kristent ${typeLabel}.`,
      `Lag forslag til:`,
      `- 5-10 relevante tagger (kommaseparert, små bokstaver, ingen #)`,
      `- En god meta-tittel (maks 60 tegn)`,
      `- En god meta-beskrivelse (maks 155 tegn, oppsummerende, inviterende, inkluderer relevante søkeord)`,
      `\n      Tittel: ${title}\n      Beskrivelse: ${description}\n      Kategorier: ${(categories || []).join(', ')}\n      ${transcript ? `Innhold/Transkripsjon (utdrag): ${transcript.substring(0, 1000)}` : ''}\n      `,
      `Svar KUN i JSON-format slik: { "tags": "tag1, tag2, ...", "metaTitle": "...", "metaDescription": "..." }`
    ].join('\n');

    let textResult = "";
    let lastError = null;

    // 1. Prøv Google Gemini (2.0 Flash og Lite)
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey.trim());
      const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`Prøver Gemini-modell: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          textResult = response.text();
          if (textResult) break;
        } catch (err) {
          console.warn(`Gemini ${modelName} feilet:`, err.message);
          lastError = err;
        }
      }
    }

    // 2. Fallback til OpenAI (ChatGPT) hvis Gemini feilet
    if (!textResult && openaiKey) {
      try {
        console.log("Prøver OpenAI (ChatGPT) fallback med gpt-4o-mini...");
        const openai = new OpenAI({ apiKey: openaiKey });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        textResult = completion.choices[0].message.content;
        console.log("Suksess med OpenAI!");
      } catch (err) {
        console.error("OpenAI feilet også:", err.message);
        lastError = err;
      }
    }

    if (!textResult) {
      throw new HttpsError('unavailable', `Alle AI-tjenester feilet: ${lastError?.message || 'Prøv igjen om et minutt.'}`);
    }

    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Ugyldig AI-respons (ikke JSON):', textResult);
      throw new HttpsError('internal', 'AI returnerte ikke gyldig JSON-format.');
    }

    const resultData = JSON.parse(jsonMatch[0]);
    return resultData;

  } catch (error) {
    console.error('AI Suggest failed:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Unknown AI error.');
  }
});

/**
 * Helper function to transcribe a podcast episode using Gemini
 */
async function transcribePodcastEpisode({ audioUrl, episodeId, episodeTitle, initiatedBy }) {
  const geminiKey = getGeminiApiKey();
  const transcriptRef = db.collection("podcast_transcripts").doc(episodeId);
  const transcriptSource = initiatedBy === 'scheduled' ? 'gemini_auto' : 'gemini_manual';
  
  // Set initial status
  await transcriptRef.set({
    episodeId,
    title: episodeTitle || null,
    audioUrl,
    source: transcriptSource,
    status: "processing",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const tmpDir = os.tmpdir();
  const tmpFilePath = path.join(tmpDir, `podcast_${episodeId}.mp3`);
  let uploadedFileName = null;

  try {
    // 1. Last ned lydfilen
    console.log(`Laster ned lydfil fra ${audioUrl}...`);
    const resp = await fetch(audioUrl);
    if (!resp.ok) throw new Error(`Kunne ikke laste ned lydfil: ${resp.statusText}`);
    const buffer = await resp.arrayBuffer();
    fs.writeFileSync(tmpFilePath, Buffer.from(buffer));

    const fileManager = new GoogleAIFileManager(geminiKey);
    const uploadResult = await fileManager.uploadFile(tmpFilePath, {
      mimeType: "audio/mpeg",
      displayName: `Podcast ${episodeId}`,
    });
    uploadedFileName = uploadResult.file.name;
    console.log(`Opplasting fullført. File URI: ${uploadResult.file.uri}`);

    let fileState = uploadResult.file.state;
    while (fileState === "PROCESSING") {
      console.log("Venter på prosessering av lydfilen...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const getFile = await fileManager.getFile(uploadResult.file.name);
      fileState = getFile.state;
      if (fileState === "FAILED") {
        throw new Error("Gemini prosessering av lydfilen feilet.");
      }
    }

    console.log(`Genererer transkripsjon...`);
    const genAI = new GoogleGenerativeAI(geminiKey);
    const transcriptionModelCandidates = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ];
    const transcriptionPrompt = [
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri
        }
      },
      { text: "Vennligst lag en nøyaktig og ordrett transkripsjon (skriftlig versjon) av denne norske podcast-episoden. Sett inn avsnitt der det er naturlig for å gjøre teksten lett å lese. Bruk riktig tegnsetting og stor forbokstav. Formater teksten med HTML: bruk <p> for avsnitt, og <br> for linjeskift. Ikke inkluder noen overskrift eller markdown-blokker (som ```html), kun den rene HTML-teksten." }
    ];

    let result = null;
    let lastModelError = null;
    for (const modelName of transcriptionModelCandidates) {
      const model = genAI.getGenerativeModel({ model: modelName });
      const maxAttemptsPerModel = 2;

      for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt += 1) {
        try {
          console.log(`Prøver Gemini-modell for transkripsjon: ${modelName} (forsøk ${attempt}/${maxAttemptsPerModel})`);
          result = await model.generateContent(transcriptionPrompt);
          console.log(`Transkripsjon generert med ${modelName}.`);
          break;
        } catch (modelError) {
          lastModelError = modelError;
          console.error(`Transkripsjon feilet med ${modelName}:`, modelError);

          if (!isGeminiRateLimitError(modelError)) {
            break;
          }

          if (isGeminiZeroLimitError(modelError)) {
            console.log(`Gemini-modell ${modelName} har ingen tilgjengelig kvote for denne nøkkelen. Prøver neste modell.`);
            break;
          }

          const retryDelayMs = getGeminiRetryDelayMs(modelError);
          const boundedDelayMs = Math.min(Math.max(retryDelayMs, 0), 65000);
          if (attempt >= maxAttemptsPerModel || boundedDelayMs <= 0) {
            break;
          }

          console.log(`Gemini rate limit. Venter ${boundedDelayMs} ms før nytt forsøk.`);
          await new Promise((resolve) => setTimeout(resolve, boundedDelayMs));
        }
      }

      if (result) break;
    }

    if (!result) {
      throw lastModelError || new Error("Ingen Gemini-modell kunne transkribere lydfilen.");
    }

    const transcriptHtml = result.response.text();
    console.log(`Transkripsjon generert (${transcriptHtml.length} tegn).`);

    await transcriptRef.set({
      text: transcriptHtml,
      episodeId,
      title: episodeTitle || null,
      audioUrl,
      source: transcriptSource,
      status: "completed",
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
      lastError: FieldValue.delete(),
      nextRetryAt: FieldValue.delete(),
    }, { merge: true });

    console.log(`Transkripsjon lagret vellykket i Firestore.`);
    return { success: true, message: "Transkribering fullført" };
  } catch (error) {
    const retryAt = Timestamp.fromMillis(Date.now() + PODCAST_TRANSCRIPT_RETRY_MS);
    await transcriptRef.set({
      episodeId,
      title: episodeTitle || null,
      audioUrl,
      source: transcriptSource,
      status: isGeminiRateLimitError(error) ? "deferred" : "failed",
      lastError: getTranscriptionErrorMessage(error),
      nextRetryAt: retryAt,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    throw error;
  } finally {
    if (uploadedFileName) {
      try {
        const fileManager = new GoogleAIFileManager(geminiKey);
        await fileManager.deleteFile(uploadedFileName);
      } catch (cleanupError) {
        console.warn("Kunne ikke slette fil fra Gemini:", cleanupError);
      }
    }

    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
  }
}

exports.getAnalyticsOverview = onRequest({
  secrets: [gaPropertyIdParam, gaServiceAccountEmailParam, gaServiceAccountPrivateKeyParam]
}, async (req, res) => {
  return cors(req, res, async () => {
    try {
      let propertyId = gaPropertyIdParam.value();
      let clientEmail = gaServiceAccountEmailParam.value();
      let privateKeyRaw = gaServiceAccountPrivateKeyParam.value();

      // Fallback to Firestore if secrets are missing
      if (!propertyId || !clientEmail || !privateKeyRaw) {
        console.log("[Analytics] Secrets missing, checking Firestore fallback...");
        const settingsDoc = await admin.firestore().collection('pages_content').doc('settings_integrations').get();
        if (settingsDoc.exists) {
            const ga = settingsDoc.data().googleAnalytics || {};
            if (!propertyId) propertyId = ga.propertyId;
            if (!clientEmail) clientEmail = ga.serviceEmail;
            if (!privateKeyRaw) privateKeyRaw = ga.privateKey;
        }
      }

      const privateKey = (privateKeyRaw || "")
        .replace(/\\n/g, "\n")
        .replace(/\n\n/g, "\n")
        .trim();

      if (!propertyId || !clientEmail || !privateKey) {
        return res.status(503).json({
          status: "unconfigured",
          message: `Konfigurasjon mangler: ${!propertyId ? 'Property ID ' : ''}${!clientEmail ? 'Email ' : ''}${!privateKey ? 'Key' : ''}`
        });
      }

      const requestedDays = Number.parseInt(req.query.days, 10);
      const allowedDays = [7, 14, 30, 60, 90, 180, 365];
      const rangeDays = allowedDays.includes(requestedDays) ? requestedDays : 30;
      const rangeStartDate = `${rangeDays}daysAgo`;
      const accessToken = await getGaAccessToken({ clientEmail, privateKey });

      const [summaryReport, pagesReport, sourcesReport, realtimeReport, devicesReport, geoReport, dailyReport] = await Promise.all([
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "averageSessionDuration" }, { name: "bounceRate" }],
            limit: 1,
          },
        }),
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            dimensions: [{ name: "pageTitle" }],
            metrics: [{ name: "screenPageViews" }],
            limit: 10,
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }]
          },
        }),
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }],
            limit: 6,
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }]
          },
        }),
        googleGaPost({
          path: `/properties/${propertyId}:runRealtimeReport`,
          accessToken,
          body: {
            metrics: [{ name: "activeUsers" }],
            minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
            limit: 1,
          },
        }).catch((err) => {
          console.warn("[Analytics] Real-time report failed:", err.message);
          return null;
        }),
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            dimensions: [{ name: "deviceCategory" }],
            metrics: [{ name: "activeUsers" }],
            limit: 5,
          },
        }),
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            dimensions: [{ name: "city" }],
            metrics: [{ name: "activeUsers" }],
            limit: 8,
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }]
          },
        }),
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            dimensions: [{ name: "date" }],
            metrics: [{ name: "activeUsers" }],
            orderBys: [{ dimension: { dimensionName: "date" }, desc: false }]
          },
        }),
      ]);

      const dailyTraffic = (dailyReport.rows || []).map(row => ({
        date: row.dimensionValues[0].value,
        users: row.metricValues[0].value
      }));

      const topPages = (pagesReport.rows || []).map(row => ({
        title: row.dimensionValues[0].value,
        views: row.metricValues[0].value
      }));

      const trafficSources = (sourcesReport.rows || []).map(row => ({
        source: row.dimensionValues[0].value,
        sessions: row.metricValues[0].value
      }));

      const devices = (devicesReport.rows || []).map(row => ({
        category: row.dimensionValues[0].value,
        users: row.metricValues[0].value
      }));

      const topCities = (geoReport.rows || []).map(row => ({
        city: row.dimensionValues[0].value,
        users: row.metricValues[0].value
      }));

      const activeUsersNow = realtimeReport ? gaMetricValue(realtimeReport, 0, 0) : 0;
      const activeRangeUsers = summaryReport.rows?.[0]?.metricValues?.[0]?.value || "0";
      const screenPageViews = summaryReport.rows?.[0]?.metricValues?.[1]?.value || "0";
      const avgDuration = summaryReport.rows?.[0]?.metricValues?.[2]?.value || "0";
      const bounceRate = summaryReport.rows?.[0]?.metricValues?.[3]?.value || "0";

      res.json({
        status: "success",
        data: {
          rangeDays,
          activeUsers: activeUsersNow,
          activeRangeUsers,
          active30dUsers: activeRangeUsers,
          screenPageViews,
          avgDuration: Math.round(parseFloat(avgDuration)),
          bounceRate: (parseFloat(bounceRate) * 100).toFixed(1) + "%",
          topPages,
          trafficSources,
          devices,
          topCities,
          dailyTraffic
        }
      });


    } catch (error) {
      console.error("Analytics Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Hjelpefunksjoner for Google Analytics (GA4) API
 */
async function getGaAccessToken({ clientEmail, privateKey }) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(privateKey, 'base64url');
  const jwt = `${signatureInput}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  if (data.error) throw new Error(`GA Auth Error: ${data.error_description || data.error}`);
  return data.access_token;
}

async function googleGaPost({ path, accessToken, body }) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

function gaMetricValue(report, rowIndex, metricIndex) {
  return report?.rows?.[rowIndex]?.metricValues?.[metricIndex]?.value || "0";
}



/**
 * Henter produkter fra Ekstern Stores via Ekstern SDK og returnerer et frontend-vennlig JSON-format.
 * Frontend (`js/ekstern-store.js`) leser `items` direkte.
 */

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

/**
 * Saves large JSON data to Google Cloud Storage as a cache file.
 */
async function saveToStorageCache(path, data) {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(path);
    await file.save(JSON.stringify(data), {
      contentType: "application/json",
      resumable: false,
    });
    console.log(`Saved cache to Storage: ${path}`);
    return true;
  } catch (error) {
    console.error(`Error saving to Storage cache (${path}):`, error);
    return false;
  }
}

/**
 * Loads JSON data from Google Cloud Storage cache.
 */
async function loadFromStorageCache(path) {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [content] = await file.download();
    return JSON.parse(content.toString());
  } catch (error) {
    console.error(`Error loading from Storage cache (${path}):`, error);
    return null;
  }
}




function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function readXmlText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = readXmlText(item);
      if (text) return text;
    }
    return "";
  }
  if (typeof value === "object") {
    if (typeof value._ === "string") return value._.trim();
    if (typeof value.__cdata === "string") return value.__cdata.trim();
  }
  return "";
}

function stripHtmlTags(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function escapeHtml(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainTextToHtml(value) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text) return "";

  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function clampHeadingLevel(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 2;
  return Math.min(6, Math.max(1, Math.round(parsed)));
}

function renderInlineLink(href, innerHtml) {
  if (!innerHtml) return "";
  const safeHref = typeof href === "string" ? href.trim() : "";
  if (!safeHref) return innerHtml;
  return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${innerHtml}</a>`;
}

function applyTextDecorations(html, decorations) {
  if (!html || !Array.isArray(decorations) || !decorations.length) return html;

  return decorations.reduce((acc, decoration) => {
    if (!decoration || typeof decoration !== "object") return acc;

    const type = typeof decoration.type === "string" ? decoration.type.toUpperCase() : "";
    if (type === "BOLD") return `<strong>${acc}</strong>`;
    if (type === "ITALIC") return `<em>${acc}</em>`;
    if (type === "UNDERLINE") return `<u>${acc}</u>`;
    if (type === "STRIKETHROUGH") return `<s>${acc}</s>`;

    if (type === "LINK") {
      const linkData = decoration.linkData && typeof decoration.linkData === "object" ? decoration.linkData : {};
      const linkObj = linkData.link && typeof linkData.link === "object" ? linkData.link : {};
      const href = pickFirstString(linkObj.url, linkObj.href, linkData.url, "");
      return renderInlineLink(href, acc);
    }

    return acc;
  }, html);
}

function renderRichInlineNodes(nodes) {
  if (!Array.isArray(nodes)) return "";

  return nodes.map((node) => {
    if (!node || typeof node !== "object") return "";

    const type = typeof node.type === "string" ? node.type.toUpperCase() : "";
    const childNodes = Array.isArray(node.nodes) ? node.nodes : [];

    if (type === "TEXT") {
      const textData = node.textData && typeof node.textData === "object" ? node.textData : {};
      const text = typeof textData.text === "string" ? textData.text : "";
      const base = escapeHtml(text).replace(/\n/g, "<br>");
      const decorations = Array.isArray(textData.decorations) ? textData.decorations : [];
      return applyTextDecorations(base, decorations);
    }

    if (type === "LINE_BREAK") {
      return "<br>";
    }

    if (type === "LINK") {
      const linkData = node.linkData && typeof node.linkData === "object" ? node.linkData : {};
      const linkObj = linkData.link && typeof linkData.link === "object" ? linkData.link : {};
      const href = pickFirstString(linkObj.url, linkObj.href, linkData.url, "");
      const inner = renderRichInlineNodes(childNodes);
      return renderInlineLink(href, inner);
    }

    return renderRichInlineNodes(childNodes);
  }).join("");
}

function stripOuterParagraphTag(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const match = trimmed.match(/^<p>([\s\S]*)<\/p>$/i);
  return match ? match[1].trim() : trimmed;
}

function pickRichMediaUrl(media) {
  if (!media || typeof media !== "object") return "";
  const source = media.src && typeof media.src === "object" ? media.src : {};

  return pickFirstString(
    media.url,
    source.url,
    media.fileUrl,
    media.imageUrl,
  );
}

function renderMediaAnchor(url, label) {
  if (!url) return "";
  return `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label || "Åpne media")}</a></p>`;
}

function renderImageFigure(src, alt = "", caption = "") {
  if (!src) return "";
  const safeAlt = escapeHtml(alt || "");
  const safeCaption = typeof caption === "string" && caption.trim() ? `<figcaption>${escapeHtml(caption.trim())}</figcaption>` : "";
  return `<figure><img src="${escapeHtml(src)}" alt="${safeAlt}">${safeCaption}</figure>`;
}

function extractVideoLikeUrl(videoData) {
  if (!videoData || typeof videoData !== "object") return "";

  const primary = pickRichMediaUrl(videoData.video || {});
  if (primary) return primary;

  return pickFirstString(
    videoData.url,
    pickRichMediaUrl(videoData.thumbnail || {}),
  );
}

function renderRichContentNodes(nodes, options = {}) {
  if (!Array.isArray(nodes)) return "";
  const { inListItem = false } = options;

  return nodes.map((node) => {
    if (!node || typeof node !== "object") return "";

    const type = typeof node.type === "string" ? node.type.toUpperCase() : "";
    const childNodes = Array.isArray(node.nodes) ? node.nodes : [];

    if (type === "TEXT") {
      const text = node.textData && typeof node.textData.text === "string" ? node.textData.text : "";
      return escapeHtml(text).replace(/\n/g, "<br>");
    }

    if (type === "PARAGRAPH") {
      const inner = renderRichInlineNodes(childNodes) || renderRichContentNodes(childNodes, { inListItem: true });
      if (!inner.trim()) return "";
      return inListItem ? inner : `<p>${inner}</p>`;
    }

    if (type === "HEADING") {
      const level = clampHeadingLevel(
        node.headingData && (node.headingData.renderedLevel || node.headingData.level),
      );
      const inner = renderRichInlineNodes(childNodes) || renderRichContentNodes(childNodes, { inListItem: true });
      if (!inner.trim()) return "";
      return `<h${level}>${inner}</h${level}>`;
    }

    if (type === "BULLETED_LIST" || type === "ORDERED_LIST" || type === "NUMBERED_LIST") {
      const tag = type === "BULLETED_LIST" ? "ul" : "ol";
      const items = childNodes.map((itemNode) => {
        const itemHtml = renderRichContentNodes([itemNode], { inListItem: true });
        const cleaned = stripOuterParagraphTag(itemHtml);
        return cleaned ? `<li>${cleaned}</li>` : "";
      }).join("");
      return items ? `<${tag}>${items}</${tag}>` : "";
    }

    if (type === "LIST_ITEM") {
      return renderRichContentNodes(childNodes, { inListItem: true });
    }

    if (type === "BLOCKQUOTE") {
      const inner = renderRichInlineNodes(childNodes) || renderRichContentNodes(childNodes, { inListItem: true });
      return inner ? `<blockquote>${inner}</blockquote>` : "";
    }

    if (type === "IMAGE") {
      const imageData = node.imageData && typeof node.imageData === "object" ? node.imageData : {};
      const image = imageData.image && typeof imageData.image === "object" ? imageData.image : {};
      const src = pickRichMediaUrl(image);
      if (!src) return "";

      const alt = pickFirstString(imageData.altText, "");
      const caption = pickFirstString(imageData.caption, "");
      return renderImageFigure(src, alt, caption);
    }

    if (type === "GALLERY") {
      const galleryData = node.galleryData && typeof node.galleryData === "object" ? node.galleryData : {};
      const items = Array.isArray(galleryData.items) ? galleryData.items : [];
      const renderedItems = items.map((item) => {
        if (!item || typeof item !== "object") return "";

        const imageData = item.image && typeof item.image === "object" ? item.image : {};
        const imageMedia = imageData.media && typeof imageData.media === "object" ? imageData.media : {};
        const imageUrl = pickRichMediaUrl(imageMedia);
        if (imageUrl) {
          const alt = pickFirstString(item.altText, item.title, "");
          return renderImageFigure(imageUrl, alt, item.title || "");
        }

        const videoData = item.video && typeof item.video === "object" ? item.video : {};
        const videoMedia = videoData.media && typeof videoData.media === "object" ? videoData.media : {};
        const videoUrl = pickRichMediaUrl(videoMedia);
        if (videoUrl) {
          if (/\.mp4($|\?)/i.test(videoUrl)) {
            return `<figure><video controls preload="metadata" src="${escapeHtml(videoUrl)}"></video></figure>`;
          }
          return renderMediaAnchor(videoUrl, item.title || "Se video");
        }

        return "";
      }).filter(Boolean).join("");

      return renderedItems ? `<div class="rich-content-gallery">${renderedItems}</div>` : "";
    }

    if (type === "VIDEO") {
      const videoData = node.videoData && typeof node.videoData === "object" ? node.videoData : {};
      const videoUrl = extractVideoLikeUrl(videoData);
      if (!videoUrl) return "";

      if (/\.mp4($|\?)/i.test(videoUrl)) {
        return `<figure><video controls preload="metadata" src="${escapeHtml(videoUrl)}"></video></figure>`;
      }

      return renderMediaAnchor(videoUrl, "Se video");
    }

    if (type === "AUDIO") {
      const audioData = node.audioData && typeof node.audioData === "object" ? node.audioData : {};
      const audio = audioData.audio && typeof audioData.audio === "object" ? audioData.audio : {};
      const audioUrl = pickRichMediaUrl(audio);
      if (!audioUrl) return "";

      return `<figure><audio controls preload="none" src="${escapeHtml(audioUrl)}"></audio></figure>`;
    }

    if (type === "FILE") {
      const fileData = node.fileData && typeof node.fileData === "object" ? node.fileData : {};
      const src = fileData.src && typeof fileData.src === "object" ? fileData.src : {};
      const fileUrl = pickRichMediaUrl(src);
      const label = pickFirstString(fileData.name, fileData.type, "Last ned fil");
      return renderMediaAnchor(fileUrl, label);
    }

    if (type === "GIF") {
      const gifData = node.gifData && typeof node.gifData === "object" ? node.gifData : {};
      const gifUrl = pickFirstString(gifData.gif, gifData.mp4, gifData.still);
      if (!gifUrl) return "";

      if (/\.mp4($|\?)/i.test(gifUrl)) {
        return `<figure><video autoplay loop muted playsinline preload="metadata" src="${escapeHtml(gifUrl)}"></video></figure>`;
      }

      return renderImageFigure(gifUrl, "GIF");
    }

    if (type === "EMBED") {
      const embedData = node.embedData && typeof node.embedData === "object" ? node.embedData : {};
      const oembed = embedData.oembed && typeof embedData.oembed === "object" ? embedData.oembed : {};
      const embedUrl = pickFirstString(oembed.url, oembed.videoUrl, embedData.src);
      if (!embedUrl) return "";
      return renderMediaAnchor(embedUrl, "Åpne innhold");
    }

    if (type === "LINK_PREVIEW") {
      const linkPreviewData = node.linkPreviewData && typeof node.linkPreviewData === "object" ? node.linkPreviewData : {};
      const link = linkPreviewData.link && typeof linkPreviewData.link === "object" ? linkPreviewData.link : {};
      const url = pickFirstString(link.url, "");
      const title = pickFirstString(linkPreviewData.title, "Lenke");
      const description = typeof linkPreviewData.description === "string" ? linkPreviewData.description.trim() : "";
      const thumbnail = pickFirstString(linkPreviewData.thumbnailUrl, "");
      if (!url && !thumbnail) return "";

      const imagePart = thumbnail ? renderImageFigure(thumbnail, title) : "";
      const textPart = `${renderMediaAnchor(url, title)}${description ? `<p>${escapeHtml(description)}</p>` : ""}`;
      return `<div class="rich-content-link-preview">${imagePart}${textPart}</div>`;
    }

    if (type === "APP_EMBED") {
      const appEmbedData = node.appEmbedData && typeof node.appEmbedData === "object" ? node.appEmbedData : {};
      const url = pickFirstString(appEmbedData.url, "");
      const name = pickFirstString(appEmbedData.name, "Åpne innhold");
      const image = appEmbedData.image && typeof appEmbedData.image === "object" ? appEmbedData.image : {};
      const imageUrl = pickRichMediaUrl(image);

      const imagePart = imageUrl ? renderImageFigure(imageUrl, name) : "";
      const linkPart = renderMediaAnchor(url, name);
      return `${imagePart}${linkPart}`;
    }

    if (type === "HTML") {
      const htmlData = node.htmlData && typeof node.htmlData === "object" ? node.htmlData : {};
      const embedUrl = pickFirstString(htmlData.url, "");
      if (!embedUrl) return "";
      return renderMediaAnchor(embedUrl, "Åpne innebygd innhold");
    }

    if (type === "DIVIDER") {
      return "<hr>";
    }

    return renderRichContentNodes(childNodes, { inListItem });
  }).join("");
}

function renderRichContentToHtml(richContent) {
  if (!richContent || typeof richContent !== "object") return "";
  const nodes = Array.isArray(richContent.nodes) ? richContent.nodes : [];
  return renderRichContentNodes(nodes).trim();
}

function isNoiseTextFragment(value) {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (/^rgba?\s*\([^)]*\)$/i.test(trimmed)) return true;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) return true;
  if (/^\d+(\.\d+)?(px|em|rem|%)$/i.test(trimmed)) return true;

  return false;
}

function extractTextFromRichContent(richContent) {
  if (!richContent || typeof richContent !== "object") return "";

  const preferredTextKeys = new Set(["text", "title", "content", "plainText", "label"]);
  const skipKeys = new Set(["id", "url", "href", "link", "slug", "src", "type"]);
  const fragments = [];

  function walk(value, key = "", depth = 0) {
    if (depth > 10 || value == null) return;

    if (typeof value === "string") {
      const normalized = decodeHtmlEntities(stripHtmlTags(value));
      if (!normalized || normalized.length < 2 || isNoiseTextFragment(normalized)) return;

      if (preferredTextKeys.has(key)) {
        fragments.push(normalized);
        return;
      }

      // Capture likely prose strings and skip obvious metadata/URLs.
      const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(normalized);
      const hasSentenceChars = /[a-zA-Z\u00C0-\u017F]/.test(normalized);
      if (!looksLikeUrl && hasSentenceChars && normalized.split(/\s+/).length >= 3) {
        fragments.push(normalized);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, key, depth + 1));
      return;
    }

    if (typeof value === "object") {
      Object.entries(value).forEach(([childKey, childValue]) => {
        if (skipKeys.has(childKey)) return;
        walk(childValue, childKey, depth + 1);
      });
    }
  }

  walk(richContent);

  const seen = new Set();
  const deduped = [];
  for (const fragment of fragments) {
    const key = fragment.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(fragment);
  }

  return deduped.join("\n\n").trim();
}

function extractFirstImageFromRichContent(richContent) {
  if (!richContent || typeof richContent !== "object" || !Array.isArray(richContent.nodes)) return "";

  const queue = [...richContent.nodes];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;

    const type = typeof node.type === "string" ? node.type.toUpperCase() : "";
    if (type === "IMAGE" && node.imageData && typeof node.imageData === "object") {
      const image = node.imageData.image && typeof node.imageData.image === "object" ? node.imageData.image : {};
      const src = pickRichMediaUrl(image);
      if (src) return src;
    }

    if (type === "GALLERY" && node.galleryData && typeof node.galleryData === "object") {
      const items = Array.isArray(node.galleryData.items) ? node.galleryData.items : [];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const imageData = item.image && typeof item.image === "object" ? item.image : {};
        const imageMedia = imageData.media && typeof imageData.media === "object" ? imageData.media : {};
        const imageUrl = pickRichMediaUrl(imageMedia);
        if (imageUrl) return imageUrl;
      }
    }

    if (type === "LINK_PREVIEW" && node.linkPreviewData && typeof node.linkPreviewData === "object") {
      const thumb = pickFirstString(node.linkPreviewData.thumbnailUrl, "");
      if (thumb) return thumb;
    }

    if (type === "GIF" && node.gifData && typeof node.gifData === "object") {
      const gifImage = pickFirstString(node.gifData.still, node.gifData.gif, "");
      if (gifImage) return gifImage;
    }

    if (type === "APP_EMBED" && node.appEmbedData && typeof node.appEmbedData === "object") {
      const appImage = pickRichMediaUrl(node.appEmbedData.image || {});
      if (appImage) return appImage;
    }

    if (Array.isArray(node.nodes) && node.nodes.length) {
      queue.push(...node.nodes);
    }
  }

  return "";
}

function extractFirstImageFromHtml(value) {
  if (typeof value !== "string") return "";
  const match = value.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match && match[1] ? match[1].trim() : "";
}

function parseDateIso(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function buildBlogItemStableId(item, fallback = "") {
  if (!item || typeof item !== "object") {
    return fallback;
  }

  const candidates = [
    item.__stableId,
    item.id,
    item.externalGuid,
    item.wixGuid,
    item.slug,
    item.url,
    item.link,
    item.title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallback;
}

function normalizeKeyFragment(value) {
  if (typeof value !== "string") return "";
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/[^a-z0-9\u00C0-\u017F\-\/_ ]/g, "")
    .trim();
}

function normalizeUrlPath(value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
    const url = new URL(withProtocol);
    return url.pathname.replace(/\/+$/, "").toLowerCase();
  } catch (error) {
    return raw
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}

function buildBlogItemDedupKey(item, index = 0) {
  if (!item || typeof item !== "object") return `fallback-${index}`;

  const source = typeof item.source === "string" ? item.source.toLowerCase() : "";
  const stable = normalizeKeyFragment(buildBlogItemStableId(item, ""));
  const externalGuid = normalizeKeyFragment(item.externalGuid || item.wixGuid || item.id || "");
  const slug = normalizeKeyFragment(item.slug || "");
  const urlPath = normalizeUrlPath(item.url || item.link || "");
  const title = normalizeKeyFragment(item.title || "");
  const dateIso = parseDateIso(item.date || "");
  const dateKey = dateIso ? dateIso.slice(0, 10) : "";

  if (source === "ekstern") {
    if (externalGuid) return `ekstern-guid:${externalGuid}`;
    if (urlPath) return `ekstern-url:${urlPath}`;
    if (slug) return `ekstern-slug:${slug}`;
    if (stable) return `ekstern-stable:${stable}`;
    return `ekstern-fallback:${index}`;
  }

  if (stable) return `stable:${stable}`;
  if (urlPath) return `url:${urlPath}`;
  if (slug) return `slug:${slug}`;
  if (title && dateKey) return `title-date:${title}:${dateKey}`;
  if (title) return `title:${title}`;

  return `fallback-${index}`;
}

function buildBlogItemLookupKeys(item, index = 0) {
  const keys = new Set();

  const addKey = (value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    keys.add(trimmed.toLowerCase());
    keys.add(trimmed.replace(/\//g, "_").toLowerCase());
  };

  const stableId = buildBlogItemStableId(item, "");
  const externalGuid = typeof item.externalGuid === "string" ? item.externalGuid : (typeof item.wixGuid === "string" ? item.wixGuid : "");
  const slug = typeof item.slug === "string" ? item.slug : "";
  const urlPath = normalizeUrlPath(item.url || item.link || "");
  const dedupKey = buildBlogItemDedupKey(item, index);

  addKey(stableId);
  addKey(externalGuid);
  addKey(slug);
  addKey(urlPath);
  addKey(dedupKey);

  return keys;
}


function getBlogItemQualityScore(item) {
  if (!item || typeof item !== "object") return 0;
  const contentLen = typeof item.content === "string" ? item.content.trim().length : 0;
  const excerptLen = typeof item.excerpt === "string" ? item.excerpt.trim().length : 0;
  const imageBonus = pickFirstString(item.imageUrl, item.image, item.dashboardImage) ? 120 : 0;
  const dateBonus = parseDateIso(item.date || "") ? 40 : 0;
  const sourceBonus = String(item.source || "").toLowerCase() === "ekstern" ? 220 : 0;
  const structureBonus = typeof item.content === "string" && hasStructuralHtmlMarkup(item.content) ? 120 : 0;
  const languageBonus = detectBlogItemLanguage(item) === "no" ? 25 : 0;
  return contentLen + Math.min(excerptLen, 300) + imageBonus + dateBonus + sourceBonus + structureBonus + languageBonus;
}

function detectBlogItemLanguage(item) {
  if (!item || typeof item !== "object") return "no";

  const explicit = typeof item.language === "string" ? item.language.trim().toLowerCase() : "";
  if (explicit === "no" || explicit === "nb" || explicit === "nn") return "no";
  if (explicit === "en" || explicit === "es") return explicit;

  const path = normalizeUrlPath(item.url || item.link || "");
  if (/^\/en\//i.test(path)) return "en";
  if (/^\/es\//i.test(path)) return "es";
  return "no";
}

function buildBlogTitleDateKey(item, index = 0) {
  if (!item || typeof item !== "object") return `fallback-${index}`;
  const source = typeof item.source === "string" ? item.source.toLowerCase() : "";
  if (source === "ekstern") {
    return buildBlogItemDedupKey(item, index);
  }
  const title = normalizeKeyFragment(item.title || "");
  const dateIso = parseDateIso(item.date || "");
  const dateKey = dateIso ? dateIso.slice(0, 10) : "";
  if (title && dateKey) return `title-date:${title}:${dateKey}`;
  return buildBlogItemDedupKey(item, index);
}

function extractTranslationPayload(item) {
  if (!item || typeof item !== "object") return {};

  const payload = {};
  const assignString = (key) => {
    if (typeof item[key] === "string" && item[key].trim()) {
      payload[key] = item[key];
    }
  };

  assignString("title");
  assignString("content");
  assignString("category");
  assignString("excerpt");
  assignString("seoTitle");
  assignString("seoDescription");

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    payload.tags = item.tags.slice();
  }

  return payload;
}

function mergeBlogTranslationMaps(baseItem, variantItem, baseLanguage, variantLanguage) {
  const merged = {};

  const copyTranslationsFrom = (item) => {
    if (!item || typeof item !== "object" || !item.translations || typeof item.translations !== "object") return;
    Object.entries(item.translations).forEach(([lang, value]) => {
      if (!lang || !value || typeof value !== "object") return;
      merged[lang] = { ...(merged[lang] || {}), ...value };
    });
  };

  copyTranslationsFrom(baseItem);
  copyTranslationsFrom(variantItem);

  if (baseLanguage !== "no") {
    merged[baseLanguage] = {
      ...(merged[baseLanguage] || {}),
      ...extractTranslationPayload(baseItem),
    };
  }

  if (variantLanguage !== "no") {
    merged[variantLanguage] = {
      ...(merged[variantLanguage] || {}),
      ...extractTranslationPayload(variantItem),
    };
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeCanonicalBlogItems(existingItem, nextItem) {
  if (!existingItem) return nextItem;
  if (!nextItem) return existingItem;

  const existingLanguage = detectBlogItemLanguage(existingItem);
  const nextLanguage = detectBlogItemLanguage(nextItem);

  if (existingLanguage !== nextLanguage) {
    const existingScore = getBlogItemQualityScore(existingItem);
    const nextScore = getBlogItemQualityScore(nextItem);
    const chooseExisting =
      (existingLanguage === "no" && nextLanguage !== "no") ||
      (existingLanguage === nextLanguage ? existingScore >= nextScore : (existingLanguage === "no" ? true : (nextLanguage === "no" ? false : existingScore >= nextScore)));

    const base = chooseExisting ? existingItem : nextItem;
    const variant = base === existingItem ? nextItem : existingItem;
    const baseLanguageResolved = detectBlogItemLanguage(base);
    const variantLanguageResolved = detectBlogItemLanguage(variant);

    const mergedTranslations = mergeBlogTranslationMaps(base, variant, baseLanguageResolved, variantLanguageResolved);
    const merged = {
      ...variant,
      ...base,
      content: typeof base.content === "string" && base.content.trim() ? base.content : (variant.content || ""),
      excerpt: typeof base.excerpt === "string" && base.excerpt.trim() ? base.excerpt : (variant.excerpt || ""),
      imageUrl: pickFirstString(base.imageUrl, variant.imageUrl, base.image, variant.image),
      translations: mergedTranslations,
    };

    if (baseLanguageResolved === "no") {
      merged.language = "no";
    }

    return merged;
  }

  const merged = mergeBlogItemsPreferred(existingItem, nextItem);
  const mergedTranslations = mergeBlogTranslationMaps(existingItem, nextItem, existingLanguage, nextLanguage);
  if (mergedTranslations) {
    merged.translations = mergedTranslations;
  }
  return merged;
}

function consolidateDuplicateBlogItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const merged = new Map();
  items.forEach((item, index) => {
    const key = buildBlogTitleDateKey(item, index);
    const existing = merged.get(key);
    merged.set(key, mergeCanonicalBlogItems(existing, item));
  });

  return Array.from(merged.values());
}

function mergeBlogItemsPreferred(existingItem, nextItem) {
  if (!existingItem) return nextItem;
  if (!nextItem) return existingItem;

  const existingScore = getBlogItemQualityScore(existingItem);
  const nextScore = getBlogItemQualityScore(nextItem);
  const winner = nextScore >= existingScore ? nextItem : existingItem;
  const loser = winner === nextItem ? existingItem : nextItem;

  const contentA = typeof winner.content === "string" ? winner.content.trim() : "";
  const contentB = typeof loser.content === "string" ? loser.content.trim() : "";
  const excerptA = typeof winner.excerpt === "string" ? winner.excerpt.trim() : "";
  const excerptB = typeof loser.excerpt === "string" ? loser.excerpt.trim() : "";

  return {
    ...loser,
    ...winner,
    content: contentA.length >= contentB.length ? contentA : contentB,
    excerpt: excerptA.length >= excerptB.length ? excerptA : excerptB,
    imageUrl: pickFirstString(winner.imageUrl, loser.imageUrl, winner.image, loser.image),
  };
}


function hasStructuralHtmlMarkup(html) {
  if (typeof html !== "string" || !html.trim()) return false;
  return /<(h[1-6]|ul|ol|li|blockquote|figure|img|video|audio|iframe|hr)\b/i.test(html);
}

function sanitizeBlogHtmlForDisplay(html) {
  if (typeof html !== "string") return "";

  let output = html.trim();
  if (!output) return "";

  output = output
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\r\n?/g, "\n");

  // Remove common newsletter artifacts scraped from Ekstern post footers.
  output = output.replace(
    /<p>\s*(?:Ja,\s*jeg\s*ønsker\s*å\s*abonnere\s*på\s*deres\s*nyhetsbrev\s*\*?|Meld\s*deg\s*på\s*nyhetsbrev[^<]*)\s*<\/p>/gi,
    ""
  );

  output = output
    .replace(/<p>\s*(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .trim();

  return output;
}

function normalizeBlogItemForDisplay(item) {
  if (!item || typeof item !== "object") return item;

  const content = typeof item.content === "string" ? item.content : "";
  const normalizedContent = sanitizeBlogHtmlForDisplay(content);
  if (!normalizedContent) return item;

  const normalizedText = stripHtmlTags(normalizedContent);
  const minutesToRead = Math.max(1, Math.ceil((normalizedText.split(/\s+/).filter(Boolean).length || 0) / 225));

  return {
    ...item,
    content: normalizedContent,
    excerpt: clampText(decodeHtmlEntities(normalizedText), 360),
    minutesToRead: Math.max(Number(item.minutesToRead) || 1, minutesToRead),
  };
}








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
async function sendEmail({ to, subject, html, text, fromName = "His Kingdom Ministry", type = "automated", cc = "", bcc = "", replyTo = "", attachments = [] }) {
  const user = getSecretOrEnv(emailUserParam, ["EMAIL_USER"]);
  const pass = getSecretOrEnv(emailPassParam, ["EMAIL_PASS"]);

  if (!user || !pass) {
    console.warn("E-postlegitimasjon mangler (EMAIL_USER / EMAIL_PASS). Kan ikke sende e-post.");
    return false;
  }

  // Default to Gmail SMTP, but allow overriding via env (non-secret).
  // For Google Workspace you can also use smtp-relay.gmail.com, depending on your setup.
  const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const smtpSecure = (process.env.SMTP_SECURE || "true").trim().toLowerCase() !== "false";

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number.isFinite(smtpPort) ? smtpPort : 465,
    secure: smtpSecure,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      replyTo: replyTo || undefined,
      subject,
      text,
      html,
      attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined,
    });

    // Logg utsendelsen
    await db.collection("email_logs").add({
      to,
      subject,
      type,
      cc: cc || null,
      bcc: bcc || null,
      replyTo: replyTo || null,
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

function normalizeEmailList(value, maxCount = 20) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, maxCount)
      .join(",");
  }

  return String(value || "")
    .split(/[,\s;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxCount)
    .join(",");
}

function isValidEmailList(value) {
  if (!value) return true;
  return String(value)
    .split(",")
    .filter(Boolean)
    .every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function sanitizeInboxEmailHtml(html) {
  if (typeof html !== "string" || !html.trim()) return "";

  let output = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\sstyle\s*=\s*(["']).*?\1/gi, "");

  output = output.replace(/<(?!\/?(?:strong|b|em|i|u|s|br|a|p|div|span|ul|ol|li|blockquote)\b)[^>]*>/gi, "");
  output = output.replace(/<a\b([^>]*)>/gi, (_match, attrs) => {
    const hrefMatch = String(attrs || "").match(/href\s*=\s*(["'])(.*?)\1/i);
    const href = hrefMatch && hrefMatch[2] ? hrefMatch[2].trim() : "";
    if (!href || !/^(https?:|mailto:|tel:)/i.test(href)) return "";
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`;
  });

  return output.trim();
}

function buildInboxEmailAttachmentLinks(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return "";

  const links = attachments
    .slice(0, 12)
    .map((attachment) => {
      const url = typeof attachment.url === "string" ? attachment.url.trim() : "";
      if (!/^https?:\/\//i.test(url)) return "";
      const name = escapeHtml(String(attachment.name || "Vedlegg"));
      return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${name}</a></li>`;
    })
    .filter(Boolean)
    .join("");

  return links ? `<hr><p><strong>Vedlegg:</strong></p><ul>${links}</ul>` : "";
}

/**
 * Trigger som sender velkomst-e-post til nye brukere.
 */
exports.onUserCreate = onDocumentCreated({
  document: "users/{userId}",
  secrets: [emailUserParam, emailPassParam],
}, async (event) => {
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
    const ok = await sendEmail({
      to: email,
      subject,
      html,
      text: `Velkommen til oss, ${name}!`
    });
    if (ok) {
      console.log(`Velkomst-e-post sendt til ${email}`);
    } else {
      console.warn(`[onUserCreate] Kunne ikke sende velkomst-e-post til ${email}.`);
    }
  } catch (error) {
    console.error("Feil ved sending av velkomst-e-post:", error);
  }
});


/**
 * Trigger som sender bekreftelse ved påmelding til nyhetsbrev.
 */
exports.onNewsletterSubscribe = onDocumentCreated({
  document: "newsletter_subscriptions/{id}",
  secrets: [emailUserParam, emailPassParam],
}, async (event) => {
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
    const ok = await sendEmail({
      to: email,
      subject,
      html,
      text: `Takk for at du meldte deg på nyhetsbrevet vårt!`
    });
    if (ok) {
      console.log(`Nyhetsbrev-bekreftelse sendt til ${email}`);
    } else {
      console.warn(`[onNewsletterSubscribe] Kunne ikke sende bekreftelse til ${email}.`);
    }
  } catch (error) {
    console.error("Feil ved sending av nyhetsbrev-bekreftelse:", error);
  }
});

/**
 * Manuel utsendelse av e-post fra admin-panelet.
 */
exports.sendManualEmail = onRequest({ cors: true, secrets: [emailUserParam, emailPassParam] }, async (req, res) => {
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
 * Sender svar fra CRM-innboksen med rik tekst, cc/bcc, reply-to og vedleggslenker.
 */
exports.sendInboxEmail = onRequest({ cors: true, secrets: [emailUserParam, emailPassParam] }, async (req, res) => {
  await verifyAdmin(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send({ error: "Method not allowed." });
      return;
    }

    try {
      const adminEmail = req.user && req.user.email ? String(req.user.email).trim() : "";
      const userDoc = req.user && req.user.uid ? await db.collection("users").doc(req.user.uid).get() : null;
      const userData = userDoc && userDoc.exists ? (userDoc.data() || {}) : {};

      const to = normalizeEmailList(req.body.to, 10);
      const cc = normalizeEmailList(req.body.cc, 10);
      const bcc = normalizeEmailList(req.body.bcc, 10);
      const subject = clampText(req.body.subject || "", 200);
      const text = clampText(req.body.text || "", 12000);
      const htmlBody = sanitizeInboxEmailHtml(req.body.html || "");
      const fromMode = req.body.fromMode === "admin" ? "admin" : "post";
      const fromName = clampText(
        req.body.fromName || (fromMode === "admin" ? (userData.displayName || adminEmail || "HKM Team") : "His Kingdom Ministry"),
        120
      );
      const replyTo = fromMode === "admin" && adminEmail ? adminEmail : "post@hiskingdomministry.no";
      const attachments = Array.isArray(req.body.attachments) ? req.body.attachments.slice(0, 12) : [];
      const messageId = clampText(req.body.messageId || "", 160);

      if (!to || !subject || (!text && !htmlBody && attachments.length === 0)) {
        res.status(400).send({ error: "Mangler mottaker, emne eller melding." });
        return;
      }

      if (![to, cc, bcc, replyTo].every(isValidEmailList)) {
        res.status(400).send({ error: "Ugyldig e-postadresse." });
        return;
      }

      const attachmentLinks = buildInboxEmailAttachmentLinks(attachments);
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#111827;line-height:1.55;">
          <div>${htmlBody || escapeHtml(text).replace(/\n/g, "<br>")}</div>
          ${attachmentLinks}
          <div style="margin-top:32px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
            Vennlig hilsen,<br>${escapeHtml(fromName)}
          </div>
        </div>
      `;

      const success = await sendEmail({
        to,
        cc,
        bcc,
        subject,
        html,
        text,
        fromName,
        replyTo,
        type: "inbox_reply",
      });

      if (!success) {
        res.status(500).send({ error: "E-postkonfigurasjon mangler på serveren." });
        return;
      }

      const logEntry = {
        to,
        cc: cc || null,
        bcc: bcc || null,
        subject,
        text,
        html: htmlBody,
        attachments,
        fromMode,
        fromName,
        replyTo,
        sentByUid: req.user.uid,
        sentByEmail: adminEmail || null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (messageId) {
        await db.collection("contactMessages").doc(messageId).set({
          status: "besvart",
          lastReplyAt: admin.firestore.FieldValue.serverTimestamp(),
          lastReplyBy: adminEmail || req.user.uid,
          replies: admin.firestore.FieldValue.arrayUnion(logEntry),
        }, { merge: true });
      }

      res.status(200).send({ success: true });
    } catch (error) {
      console.error("Feil ved sending fra CRM-innboks:", error);
      res.status(500).send({ error: error.message || "Kunne ikke sende e-post." });
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
exports.sendBulkEmail = onRequest({ cors: true, secrets: [emailUserParam, emailPassParam] }, async (req, res) => {
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
exports.logSystemError = onRequest({ cors: true, invoker: "public", secrets: [emailUserParam, emailPassParam] }, async (req, res) => {
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
      const adminEmail = (process.env.ADMIN_EMAIL || getSecretOrEnv(emailUserParam, ["EMAIL_USER"])).trim();

      const html = `
        <h2>🚨 Kritisk Systemfeil</h2>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Melding:</strong> ${message}</p>
        <p><strong>Bruker:</strong> ${userId || "Ukjent"}</p>
        <p><strong>Tidspunkt:</strong> ${new Date().toLocaleString()}</p>
        <br>
        <p><a href="https://his-kingdom-ministry.web.app/admin">Gå til Dashboard</a></p>
      `;

      const ok = await sendEmail({
        to: adminEmail,
        subject: `🚨 KRITISK FEIL: ${type}`,
        html,
        text: `En kritisk feil har oppstått: ${message}`,
        fromName: "System Alert"
      });
      if (ok) {
        console.log("Kritisk varsel sendt på e-post.");
      } else {
        console.warn("[logSystemError] Kunne ikke sende kritisk varsel på e-post.");
      }
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
exports.onContactFormSubmit = onDocumentCreated({
  document: "contactMessages/{id}",
  secrets: [emailUserParam, emailPassParam],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  console.log(`[ContactForm] Ny melding mottatt: ${event.params.id}`);
  const msgData = snapshot.data();
  const email = msgData.email;
  const name = msgData.name || "venn";
  const phone = clampText(msgData.phone || "", 40);
  const source = clampText(msgData.source || "", 80);
  const pagePath = clampText(msgData.pagePath || "", 300);

  if (!email) return;

  const defaultAdminEmails = [
    "post@hiskingdomministry.no",
    "thomas@hiskingdomministry.no",
  ];
  const backupAdminEmail = (
    process.env.CHAT_ALERT_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.EMAIL_USER ||
    ""
  ).trim();

  if (defaultAdminEmails.length > 0) {
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
      const recipients = [...defaultAdminEmails, backupAdminEmail]
        .map((e) => (typeof e === "string" ? e.trim() : ""))
        .filter((e, i, a) => e && a.indexOf(e) === i)
        .join(", ");
      console.log(`[ContactForm] Sender varsel til: ${recipients}`);
      const ok = await sendEmail({
        to: recipients,
        subject: internalSubject,
        html: internalHtml,
        text: internalText,
        fromName: "HKM Nettside",
        type: "contact_alert",
      });
      if (!ok) {
        console.warn("[ContactForm] Varsel-e-post ble ikke sendt (mangler legitimasjon eller SMTP-feil).");
      }
    } catch (error) {
      console.error("Feil ved sending av intern kontaktmelding:", error);
    }
  }

  const fallback = {
    subject: "Vi har mottatt meldingen din: {{subject}}",
    body: `
      <div style="margin: 0 0 14px 0;">
        <p style="margin:0; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color:#9a3412;">
          His Kingdom Ministry
        </p>
      </div>

      <h2 style="margin: 0 0 10px 0; font-size: 26px; line-height: 1.2;">
        Takk for at du tok kontakt, {{name}}!
      </h2>

      <p style="margin: 0 0 10px 0; color:#334155;">
        Vi har mottatt meldingen din om <strong style="color:#0f172a;">"{{subject}}"</strong>.
      </p>

      <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 14px; border-radius: 10px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 700; color:#9a3412;">Hva skjer nå?</p>
        <ul style="margin: 0; padding-left: 18px; color:#334155;">
          <li>Vi leser gjennom henvendelsen og svarer deg så snart vi kan.</li>
          <li>Hvis det haster, skriv gjerne en ny melding og merk den med "HASTER".</li>
        </ul>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 10px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 700; color:#0f172a;">Din melding</p>
        <div style="white-space: pre-wrap; color:#0f172a;">
          ${msgData.message ? msgData.message.replace(/\n/g, "<br>") : ""}
        </div>
      </div>

      <div style="margin-top: 18px;">
        <p style="margin: 0 0 8px 0; font-weight: 700; color:#0f172a;">Mens du venter</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="https://hiskingdomministry.no/kalender" style="display:inline-block; padding:10px 12px; border-radius: 10px; background:#d17d39; color:#fff; text-decoration:none; font-weight:700;">
            Se kalender
          </a>
          <a href="https://hiskingdomministry.no/undervisning" style="display:inline-block; padding:10px 12px; border-radius: 10px; background:#0f172a; color:#fff; text-decoration:none; font-weight:700;">
            Undervisning
          </a>
          <a href="https://hiskingdomministry.no/gi-gave" style="display:inline-block; padding:10px 12px; border-radius: 10px; background:#fff; color:#0f172a; text-decoration:none; font-weight:700; border:1px solid #e2e8f0;">
            Gi en gave
          </a>
        </div>
      </div>
    `
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
    const ok = await sendEmail({
      to: email,
      subject,
      html,
      text: `Takk for at du tok kontakt! Vi har mottatt din melding.`
    });
    if (ok) {
      console.log(`Kontakt-bekreftelse sendt til ${email}`);
    } else {
      console.warn(`[ContactForm] Kunne ikke sende kontakt-bekreftelse til ${email}.`);
    }
  } catch (error) {
    console.error("Feil ved sending av kontakt-bekreftelse:", error);
  }
});

/**
 * Sender nye besøksmeldinger til en Google Chat-kanal via incoming webhook.
 */
exports.onVisitorChatMessageCreated = onDocumentCreated({
  document: "visitorChats/{chatId}/messages/{messageId}",
  secrets: [googleChatWebhookUrlParam, emailUserParam, emailPassParam],
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
      
      // Building Card V2 for a professional customer support experience
      const googleChatCard = {
        cardsV2: [{
          cardId: `visitor_msg_${Date.now()}`,
          card: {
            header: {
              title: visitorName,
              subtitle: visitorEmail || "Ingen e-post oppgitt",
              imageUrl: "https://hiskingdomministry.no/img/logo-hkm.png",
              imageType: "CIRCLE"
            },
            sections: [
              {
                header: "Ny melding",
                widgets: [
                  {
                    textParagraph: {
                      text: text
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: "Side",
                      text: sourcePage || "Ukjent side",
                      startIcon: { knownIcon: "DESCRIPTION" }
                    }
                  }
                ]
              },
              {
                widgets: [
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: "Svar nå",
                          onClick: {
                            action: {
                              functionName: "open_reply_dialog",
                              parameters: [
                                { key: "chatId", value: chatId }
                              ]
                            }
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          }
        }],
        thread: {
          threadKey: `visitor_${chatId}`,
        }
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(googleChatCard),
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

      console.log("[GoogleChatSync] Mapping updated with Card V2", JSON.stringify({
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

  // Handle Card Clicked (Interactive buttons and dialogs)
  if (eventType === "CARD_CLICKED") {
    const action = payload.action && payload.action.actionMethodName;
    const params = payload.action && payload.action.parameters ? payload.action.parameters : [];
    const chatIdParam = params.find(p => p.key === "chatId")?.value;

    if (action === "open_reply_dialog") {
      return res.status(200).json({
        action_response: {
          type: "DIALOG",
          dialog_action: {
            dialog: {
              body: {
                sections: [
                  {
                    widgets: [
                      {
                        textInput: {
                          name: "reply_text",
                          label: "Skriv ditt svar til den besøkende",
                          type: "MULTIPLE_LINE"
                        }
                      }
                    ]
                  }
                ],
                fixedFooter: {
                  buttons: [
                    {
                      text: "Send svar",
                      onClick: {
                        action: {
                          functionName: "submit_reply",
                          parameters: [{ key: "chatId", value: chatIdParam }]
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      });
    }

    if (action === "submit_reply") {
      const formValues = payload.common && payload.common.formValues ? payload.common.formValues : {};
      const replyText = formValues.reply_text?.stringInputs?.value?.[0] || "";
      const chatId = chatIdParam;

      if (!replyText || !chatId) {
        return res.status(200).json({
          action_response: {
            type: "DIALOG",
            dialog_action: {
              action_status: { statusCode: "INVALID_ARGUMENT", userFacingMessage: "Du må skrive en melding." }
            }
          }
        });
      }

      const chatRef = db.collection("visitorChats").doc(chatId);
      const chatSnap = await chatRef.get();
      if (!chatSnap.exists) {
        return res.status(200).json({
          action_response: {
            type: "DIALOG",
            dialog_action: {
              action_status: { statusCode: "NOT_FOUND", userFacingMessage: "Fant ikke chatten." }
            }
          }
        });
      }

      const fromName = clampText(extracted.userDisplayName || "HKM Team", 120);

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
        lastTargetMode: "google_chat", // Switch to human mode
        requestHuman: true
      }, { merge: true });

      return res.status(200).json({
        action_response: {
          type: "DIALOG",
          dialog_action: {
            action_status: { statusCode: "OK", userFacingMessage: "Svar sendt!" }
          }
        }
      });
    }
  }

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
    lastTargetMode: "google_chat", // Switch to human mode
    requestHuman: true
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

    // Use cached model resolution to avoid a listModels roundtrip on every message.
    const selectedModel = await resolveGeminiModel(cleanKey);
    if (!selectedModel) {
      console.error("Fant ingen Gemini-modell med generateContent-stotte.");
      return;
    }

    const url = `${apiBase}/${selectedModel}:generateContent?key=${cleanKey}`;

    // Only fetch podcast/YouTube when the message is relevant — these are slow external calls.
    const msgText = (msgData.text || "").toLowerCase();
    const needsMedia = /podcast|episode|youtube|video|kanal|media/.test(msgText);

    // 1. Hent kontekst om nettstedet, butikk, arrangementer og innhold
    const firestoreReads = [
      db.collection("siteContent").doc("settings_seo").get(),
      db.collection("content").doc("ekstern_products").get(),
      db.collection("content").doc("collection_events").get(),
      db.collection("content").doc("collection_blog").get(),
      db.collection("content").doc("collection_teaching").get(),
    ];
    const mediaReads = needsMedia ? [
      fetch("https://anchor.fm/s/f7a13dec/podcast/rss").catch(() => null),
      fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent("https://www.youtube.com/feeds/videos.xml?channel_id=UCFbX-Mf7NqDm2a07hk6hveg")).catch(() => null),
    ] : [Promise.resolve(null), Promise.resolve(null)];

    const [settingsSnap, productsSnap, eventsSnap, blogSnap, teachingSnap, podcastRes, youtubeRes] = await Promise.all([
      ...firestoreReads,
      ...mediaReads,
    ]);

    const siteTitle = settingsSnap.exists ? (settingsSnap.data().siteTitle || "His Kingdom Ministry") : "His Kingdom Ministry";
    
    // Forbered produkt-info
    let productsContext = "";
    if (productsSnap.exists) {
      const pData = productsSnap.data();
      const items = pData.items || [];
      if (items.length > 0) {
        productsContext = "\nBUTIKK-PRODUKTER:\n" + 
          items.slice(0, 40).map(p => `- ${p.name}: ${p.formattedPrice || p.price || ''}\n  URL: ${p.productUrl || ''}\n  Bilde: ${p.imageUrl || ''}`).join("\n");
      }
    }

    // Forbered arrangement-info
    let eventsContext = "";
    if (eventsSnap.exists) {
      const eData = eventsSnap.data();
      const items = eData.items || [];
      if (items.length > 0) {
        eventsContext = "\nKOMMENDE ARRANGEMENTER:\n" + 
          items.slice(0, 10).map(e => `- ${e.title} (${e.date || ''}): ${e.location || ''}\n  URL: https://www.hiskingdomministry.no/arrangement-detaljer.html?id=${encodeURIComponent(e.id || e.title)}\n  Bilde: ${e.imageUrl || ''}`).join("\n");
      }
    }

    // Forbered blogg-info
    let blogContext = "";
    if (blogSnap.exists) {
      const bItems = blogSnap.data().items || [];
      if (bItems.length > 0) {
        blogContext = "\nBLOGGINNLEGG (Bruk dette for å svare på spørsmål om bloggen eller oppsummere innhold):\n" + 
          bItems.slice(0, 8).map(b => `- Tittel: ${b.title}\n  Sammendrag: ${b.description || b.seoDescription || (b.content ? String(b.content).substring(0, 300) : '')}\n  URL: https://www.hiskingdomministry.no/blogg-post.html?id=${encodeURIComponent(b.id || b.title)}\n  Bilde: ${b.imageUrl || ''}`).join("\n");
      }
    }

    // Forbered undervisning-info
    let teachingContext = "";
    if (teachingSnap.exists) {
      const tItems = teachingSnap.data().items || [];
      if (tItems.length > 0) {
        teachingContext = "\nUNDERVISNING (Bruk dette for å svare på spørsmål om undervisning, kurs eller bibelstudier):\n" + 
          tItems.slice(0, 8).map(t => `- Tittel: ${t.title}\n  Sammendrag: ${t.description || t.seoDescription || (t.content ? String(t.content).substring(0, 300) : '')}\n  URL: https://www.hiskingdomministry.no/blogg-post.html?id=${encodeURIComponent(t.id || t.title)}\n  Bilde: ${t.imageUrl || ''}`).join("\n");
      }
    }

    // Forbered podcast-info
    let podcastContext = "";
    if (podcastRes && podcastRes.ok) {
      try {
        const pText = await podcastRes.text();
        const pData = await parseStringPromise(pText);
        const channel = Array.isArray(pData?.rss?.channel) ? pData.rss.channel[0] : pData?.rss?.channel;
        const pItems = (channel.item || []).slice(0, 5).map(it => ({
          title: it.title ? it.title[0] : "Ukjent episode",
          link: it.link ? it.link[0] : "https://anchor.fm/s/f7a13dec/podcast/rss",
          description: it.description ? it.description[0].replace(/<[^>]*>/g, '').substring(0, 200) : "",
          imageUrl: it['itunes:image'] ? it['itunes:image'][0].$.href : (channel.image ? channel.image[0].url[0] : "")
        }));
        podcastContext = "\nPODCAST (Siste episoder):\n" + 
          pItems.map(it => `- Episode: ${it.title}\n  Om: ${it.description}\n  Link: ${it.link}\n  Bilde: ${it.imageUrl}`).join("\n");
      } catch (err) {
        console.warn("Feil ved parsing av podcast RSS:", err);
      }
    }

    // Forbered youtube-info
    let youtubeContext = "";
    if (youtubeRes && youtubeRes.ok) {
      try {
        const ytData = await youtubeRes.json();
        const items = ytData.items || [];
        if (items.length > 0) {
          youtubeContext = "\nYOUTUBE-VIDEOER (Siste fra kanalen):\n" + 
            items.slice(0, 10).map(v => `- Tittel: ${v.title}\n  URL: ${v.link}\n  Bilde: ${v.thumbnail}`).join("\n");
        }
      } catch (e) {
        console.error("Feil ved parsing av YouTube RSS:", e);
      }
    }

    const systemPrompt = `
      Du er en hjelpsom AI-assistent for ${siteTitle} (HKM). 
      
      DIN HOVEDOPPGAVE: Hjelp besøkende med å finne innhold fra His Kingdom Ministry (HKM). Du har tilgang til blogginnlegg, undervisning, podcast-episoder, arrangementer og produkter nedenfor.
      
      KILDE BIBELEN: Bibelen er din absolutte hovedkilde for alle åndelige spørsmål.
      
      KONTEKST-INFORMASJON (Dette er innholdet du har tilgang til - bruk det for å svare og oppsummere):
      ${eventsContext}
      ${blogContext}
      ${teachingContext}
      ${podcastContext}
      ${productsContext}
      ${youtubeContext}

      REGLER FOR SVAR:
      1. Svar alltid på norsk. 
      2. Vær varm, oppmuntrende og spirituelt veiledende.
      3. Når du anbefaler eller nevner noe, skal du ALLTID inkludere:
         - En kort oppsummering/beskrivelse basert på informasjonen over.
         - En direkte lenke (URL).
         - Et bilde ved å bruke Markdown-formatet: ![Beskrivelse](Bilde-URL) hvis bilde-URL er tilgjengelig.
      4. Bruk dobbel linjeskift mellom avsnitt for god lesbarhet. Bruk **fet skrift** for titler.
      5. Linker til YouTube-videoer kan gå direkte til YouTube, eller du kan henvise til vår samleside: https://www.hiskingdomministry.no/youtube.html
      6. YouTube-kanalen vår finner du her: https://www.youtube.com/@hiskingdomministry
      7. Hvis en bruker spør om bloggen eller undervisning, bruk informasjonen over for å gi dem et godt svar. Ikke si at du ikke har tilgang hvis informasjonen står i listen.
      6. For kundeservice-spørsmål du ikke kan svare på, be kunden vente på svar fra teamet.
      7. Aldri nevn tekniske detaljer om systemet.
      8. ISRAEL-PRODUKTER: Fortell gjerne besøkende at vi har flotte, autentiske produkter fra Israel i butikken vår. Vi er stolte av å støtte Israel og tilby disse varene. Du kan henvise dem til: https://www.hiskingdomministry.no/category/israel for å se utvalget.`;

    const userMessage = msgData.text || "";
    if (!userMessage) return;

    const finalSystemPrompt = `${systemPrompt}\n\nBesøkende: ${userMessage}`;

    // --- AI Generation Logic with Robust Fallback ---
    let aiText = "";
    let lastError = null;

    // 1. Prøv Gemini (Primary & Fallback models)
    try {
      const genAI = new GoogleGenerativeAI(cleanKey);
      const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`[ChatAI] Prøver Gemini: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(finalSystemPrompt);
          aiText = (await result.response).text();
          if (aiText) {
            console.log(`[ChatAI] Suksess med Gemini (${modelName})`);
            break;
          }
        } catch (err) {
          console.warn(`[ChatAI] Gemini ${modelName} feilet:`, err.message);
          lastError = err;
        }
      }
    } catch (err) {
      console.error("[ChatAI] Gemini SDK init feilet:", err);
    }

    // 2. Ultimate Fallback: OpenAI (ChatGPT)
    const openaiKey = openaiApiKeyParam.value();
    if (!aiText && openaiKey) {
      try {
        console.log("[ChatAI] Prøver OpenAI fallback...");
        const openai = new OpenAI({ apiKey: openaiKey });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Du er en hjelpsom assistent for His Kingdom Ministry. Bruk informasjonen gitt i prompten for å svare." },
            { role: "user", content: finalSystemPrompt }
          ]
        });
        aiText = completion.choices[0].message.content;
        console.log("[ChatAI] Suksess med OpenAI!");
      } catch (err) {
        console.error("[ChatAI] OpenAI feilet også:", err.message);
        lastError = err;
      }
    }

    if (!aiText) {
      aiText = "AI-assistenten er midlertidig opptatt. Prøv igjen om et lite øyeblikk, eller bruk e-post-fanen så følger vi deg opp.";
      console.error("[ChatAI] Alle AI-modeller feilet.");
    }

    // 4. Lagre AI-svaret i Firestore
    const chatRef = db.collection("visitorChats").doc(chatId);
    await chatRef.collection("messages").add({
      sender: "agent",
      source: "ai_gemini", // Behold for frontend-kompatibilitet
      fromName: "HKM Assistent",
      text: aiText.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await chatRef.set({
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAgentMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastTargetMode: "ai",
    }, { merge: true });

    console.log(`[ChatAI] AI-svar lagret for chatId=${chatId}`);
  } catch (error) {
    console.error("Feil i chatbot-AI logikk (SDK):", error);
  }
});

// Cleanup function: remove duplicate blog posts by ID
exports.cleanupBlogDuplicates = onRequest(async (req, res) => {
  try {
    // Require auth token for safety
    const token = req.query.token || req.body?.token;
    const expectedToken = process.env.CLEANUP_TOKEN || 'cleanup-me';
    if (token !== expectedToken) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const postIdToCleanup = req.query.postId || req.body?.postId;
    if (!postIdToCleanup) {
      return res.status(400).json({ error: 'postId required' });
    }

    const snap = await db.collection('content').doc('collection_blog').get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'collection_blog not found' });
    }

    const data = snap.data();
    const items = Array.isArray(data.items) ? data.items : [];
    
    // Find all items with matching ID
    const matches = items.filter(item => item._id === postIdToCleanup || item.id === postIdToCleanup);
    
    if (matches.length < 2) {
      return res.json({
        message: 'No duplicates found',
        found: matches.length,
        items: matches.map(m => ({ _id: m._id, title: m.title, source: m.source }))
      });
    }

    // Keep the one from Ekstern if available, otherwise keep the most complete one
    let toKeep = matches[0];
    for (const item of matches) {
      const itemSource = String(item.source || '').toLowerCase();
      const keepSource = String(toKeep.source || '').toLowerCase();
      
      if (itemSource === 'ekstern' && keepSource !== 'ekstern') {
        toKeep = item;
      } else if (itemSource === keepSource && itemSource !== 'ekstern') {
        // Both non-Ekstern: keep the one with more fields
        const itemFieldCount = Object.keys(item).length;
        const keepFieldCount = Object.keys(toKeep).length;
        if (itemFieldCount > keepFieldCount) {
          toKeep = item;
        }
      }
    }

    // Remove all except the one to keep
    const filtered = items.filter(item => !(item._id === postIdToCleanup || item.id === postIdToCleanup) || item === toKeep);
    
    // Update Firestore
    await db.collection('content').doc('collection_blog').update({
      items: filtered,
      cleanupAt: admin.firestore.FieldValue.serverTimestamp(),
      cleanupPostId: postIdToCleanup,
      cleanupRemoved: matches.length - 1
    });

    res.json({
      success: true,
      postId: postIdToCleanup,
      totalMatches: matches.length,
      removed: matches.length - 1,
      kept: {
        title: toKeep.title,
        source: toKeep.source,
        _id: toKeep._id
      },
      removed_items: matches.filter(m => m !== toKeep).map(m => ({ title: m.title, source: m.source, _id: m._id }))
    });
  } catch (error) {
    console.error("Cleanup Error:", error);
    res.status(500).json({ error: error.message });
  }
});







function isGeminiRateLimitError(error) {
  if (!error) return false;

  const message = typeof error?.message === 'string' ? error.message : '';
  const status = error?.status || error?.code || error?.cause?.status;

  return status === 429
    || status === 'RESOURCE_EXHAUSTED'
    || /429/.test(message)
    || /too many requests/i.test(message)
    || /resource exhausted/i.test(message)
    || /quota/i.test(message);
}

function getTranscriptionErrorMessage(error) {
  if (isGeminiRateLimitError(error)) {
    return 'Gemini API-kvoten er brukt opp akkurat nå. Vent litt og prøv transkribering igjen senere.';
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return 'En feil oppstod under transkribering.';
}

function getGeminiRetryDelayMs(error) {
  const details = Array.isArray(error?.errorDetails) ? error.errorDetails : [];
  const retryInfo = details.find((entry) => entry && entry['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
  const retryDelay = typeof retryInfo?.retryDelay === 'string' ? retryInfo.retryDelay : '';
  const match = retryDelay.match(/(\d+)(?:\.(\d+))?s/);
  if (!match) return 0;

  const seconds = Number(match[1] || '0');
  const fraction = Number(`0.${match[2] || '0'}`);
  const totalMs = Math.round((seconds + fraction) * 1000);
  return Number.isFinite(totalMs) ? totalMs : 0;
}

function isGeminiZeroLimitError(error) {
  if (!error) return false;

  const message = typeof error?.message === 'string' ? error.message : '';
  return /free[_ -]?tier/i.test(message) && /limit:\s*0/i.test(message);
}

function normalizePodcastSummaryText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^['"`]+|['"`]+$/g, '')
    .trim();
}

async function generatePodcastSummaryWithGemini({ episodeTitle = '', transcriptText = '' }) {
  const geminiKey = getGeminiApiKey();
  if (!geminiKey) {
    throw new Error('Gemini API-nøkkel mangler på serveren.');
  }

  const cleanTranscript = normalizePodcastSummaryText(transcriptText);
  if (!cleanTranscript || cleanTranscript.length < 120) {
    throw new Error('Transkripsjonen er for kort til å lage en god oppsummering.');
  }

  const prompt = [
    {
      text: [
        'Du er en norsk redaktør for kristent innhold.',
        'Lag en kort, varm og tydelig oppsummering av podcast-episoden under.',
        'Krav:',
        '- Skriv på norsk bokmål.',
        '- 2-3 setninger, maks 320 tegn.',
        '- Ingen punktliste, ingen emojis, ingen markdown.',
        '- Ikke finn opp detaljer som ikke finnes i teksten.',
        '- Avslutt med en naturlig setning, ikke call-to-action.',
        '',
        `Tittel: ${String(episodeTitle || '').trim() || 'Uten tittel'}`,
        'Transkripsjon:',
        cleanTranscript,
      ].join('\n')
    }
  ];

  const genAI = new GoogleGenerativeAI(geminiKey);
  const modelCandidates = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
  ];

  let result = null;
  let lastModelError = null;

  for (const modelName of modelCandidates) {
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
      result = await model.generateContent(prompt);
      if (result) break;
    } catch (error) {
      lastModelError = error;
      console.error(`Oppsummering feilet med ${modelName}:`, error);
      if (!isGeminiRateLimitError(error)) break;
    }
  }

  if (!result) {
    throw lastModelError || new Error('Ingen Gemini-modell kunne lage oppsummering.');
  }

  const summary = normalizePodcastSummaryText(result.response.text());
  if (!summary) {
    throw new Error('AI returnerte tom oppsummering.');
  }

  return summary;
}

exports.transcribePodcast = onCall({
  cors: true,
  secrets: [geminiApiKeyParam],
  timeoutSeconds: 540,
  memory: "1GiB"
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Må være innlogget for å transkribere.');
  }

  const { audioUrl, episodeId } = request.data;
  if (!audioUrl || !episodeId) {
    throw new HttpsError('invalid-argument', 'Mangler audioUrl eller episodeId');
  }

  try {
    return await transcribePodcastEpisode({
      audioUrl,
      episodeId,
      episodeTitle: typeof request.data?.episodeTitle === 'string' ? request.data.episodeTitle : '',
      initiatedBy: 'manual'
    });

  } catch (error) {
    console.error("Feil under transkribering:", error);
    throw new HttpsError(
      isGeminiRateLimitError(error) ? 'resource-exhausted' : 'internal',
      getTranscriptionErrorMessage(error)
    );
  }
});

exports.generatePodcastSummary = onCall({
  cors: true,
  secrets: [geminiApiKeyParam],
  timeoutSeconds: 120,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Må være innlogget for å bruke AI-oppsummering.');
  }

  const transcriptText = typeof request.data?.transcriptText === 'string' ? request.data.transcriptText : '';
  const episodeTitle = typeof request.data?.episodeTitle === 'string' ? request.data.episodeTitle : '';

  if (!transcriptText || transcriptText.trim().length < 120) {
    throw new HttpsError('invalid-argument', 'Transkripsjonen er for kort til å oppsummere.');
  }

  try {
    const summary = await generatePodcastSummaryWithGemini({
      episodeTitle,
      transcriptText
    });

    return { summary };
  } catch (error) {
    console.error('Feil under generering av podcast-oppsummering:', error);
    throw new HttpsError(
      isGeminiRateLimitError(error) ? 'resource-exhausted' : 'internal',
      isGeminiRateLimitError(error)
        ? 'Gemini API-kvoten er brukt opp akkurat nå. Prøv igjen senere.'
        : (error?.message || 'Kunne ikke generere oppsummering.')
    );
  }
});

exports.scheduledPodcastTranscription = onSchedule({
  schedule: "*/5 * * * *",
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: [geminiApiKeyParam]
}, async () => {
  if (!PODCAST_AUTO_TRANSCRIPTION_ENABLED) {
    console.log("Automatisk podcast-transkribering er deaktivert. Bruk manuell generering i admin.");
    return;
  }

  const episodes = await fetchPodcastEpisodesFromRss(Number.MAX_SAFE_INTEGER);
  const nowMs = Date.now();
  let processedCount = 0;

  for (const episode of episodes) {
    if (processedCount >= PODCAST_TRANSCRIPT_MAX_AUTO_EPISODES_PER_RUN) {
      break;
    }

    const transcriptRef = db.collection("podcast_transcripts").doc(episode.episodeId);
    const transcriptSnap = await transcriptRef.get();
    const transcriptData = transcriptSnap.exists ? transcriptSnap.data() : {};
    const nextRetryAtMs = transcriptData?.nextRetryAt && typeof transcriptData.nextRetryAt.toMillis === "function"
      ? transcriptData.nextRetryAt.toMillis()
      : 0;
  if (transcriptData?.text) {
      continue;
    }

    if (transcriptData?.status === "processing") {
      continue;
    }

    if (nextRetryAtMs && nextRetryAtMs > nowMs) {
      continue;
    }

    try {
      console.log(`Starter automatisk transkribering for episode ${episode.episodeId}`);
      await transcribePodcastEpisode({
        audioUrl: episode.audioUrl,
        episodeId: episode.episodeId,
        episodeTitle: episode.title,
        initiatedBy: 'scheduled'
      });
      processedCount += 1;
    } catch (error) {
      console.error(`Automatisk transkribering feilet for ${episode.episodeId}:`, error);
      if (isGeminiRateLimitError(error)) {
        break;
      }
    }
  }
});

/**
 * Endpoint to fetch and proxy the podcast RSS feed as JSON
 */
exports.getPodcast = onRequest({ cors: true }, async (req, res) => {
  const rssUrl = "https://anchor.fm/s/f7a13dec/podcast/rss";

  try {
    const response = await fetch(rssUrl);
    const xmlData = await response.text();

    // Translate XML to JSON
    const jsonData = await parseStringPromise(xmlData, { explicitArray: false });

    res.status(200).send(jsonData);
  } catch (error) {
    console.error("Podcast Fetch Error:", error);
    res.status(500).send({ error: "Kunne ikke hente eller oversette feeden" });
  }
});

/**
 * Endpoint to sync Google Calendar events
 */
exports.scheduledSync = onSchedule("every 15 minutes", async (event) => {
  console.log("⏰ Starter planlagt synkronisering...");

  try {
    const settingsSnap = await db.collection("content").doc("settings_integrations").get();
    if (!settingsSnap.exists) {
      console.log("❌ Ingen integrasjonsinnstillinger funnet.");
      return;
    }

    const gcal = settingsSnap.data().googleCalendar;
    if (!gcal || !gcal.apiKey || !gcal.calendarId) {
      console.log("❌ Google Calendar er ikke konfigurert.");
      return;
    }

    const now = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(gcal.calendarId)}/events?key=${gcal.apiKey}&timeMin=${now}&orderBy=startTime&singleEvents=true&maxResults=20`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`GCal API Error: ${data.error.message}`);
    }

    const events = (data.items || []).map(item => ({
      id: item.id,
      title: item.summary || 'Uten navn',
      description: item.description || '',
      location: item.location || '',
      start: item.start.dateTime || item.start.date,
      end: item.end.dateTime || item.end.date,
      link: item.htmlLink,
      source: 'google_calendar',
      syncedAt: admin.firestore.FieldValue.serverTimestamp()
    }));

    await db.collection("content").doc("collection_events").set({
      items: events,
      lastSync: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Synkronisering fullført. ${events.length} arrangementer lagret.`);
  } catch (error) {
    console.error("❌ Feil under synkronisering:", error);
  }
});
