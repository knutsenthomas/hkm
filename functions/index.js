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
const stripeWebhookSecretParam = defineSecret('STRIPE_WEBHOOK_SECRET');
const paypalClientIdParam = defineSecret('PAYPAL_CLIENT_ID');
const paypalClientSecretParam = defineSecret('PAYPAL_CLIENT_SECRET');

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
const textToSpeech = require('@google-cloud/text-to-speech');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;
const cors = require("cors")({ origin: true });

async function resolveDonationUserId(customerDetails = {}) {
  const donorEmail = typeof customerDetails.email === "string" ?
    customerDetails.email.trim().toLowerCase() : "";

  if (donorEmail) {
    try {
      const userSnap = await db.collection("users")
        .where("email", "==", donorEmail)
        .limit(1)
        .get();
      if (!userSnap.empty) return userSnap.docs[0].id;
    } catch (error) {
      console.warn("Could not resolve donation user by email:", error);
    }
  }

  return customerDetails.userId || null;
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function publicMemberResult(doc) {
  const data = doc.data() || {};
  return {
    uid: doc.id,
    name: data.displayName || data.name || data.email || "Uten navn",
    email: data.email || "",
    photoURL: data.photoURL || "",
    role: data.familyRole || data.memberType || "",
  };
}

exports.searchFamilyMembers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Du må være logget inn for å søke.");
  }

  const query = normalizeSearchText(request.data?.query);
  if (query.length < 2) {
    return { members: [] };
  }

  const currentUid = request.auth.uid;
  const matches = [];

  try {
    const snap = await db.collection("users").limit(1000).get();

    snap.forEach(doc => {
      if (doc.id === currentUid || matches.length >= 10) return;

      const data = doc.data() || {};
      const haystack = normalizeSearchText([
        data.displayName,
        data.name,
        data.email,
        data.phone,
      ].filter(Boolean).join(" "));

      if (haystack.includes(query)) {
        matches.push(publicMemberResult(doc));
      }
    });

    return { members: matches };
  } catch (error) {
    console.error("searchFamilyMembers failed:", error);
    throw new HttpsError("internal", "Kunne ikke søke etter familiemedlemmer.");
  }
});

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
 * Helper to get Google Chat webhook URL
 */
function getGoogleChatWebhookUrl() {
  return getSecretOrEnv(googleChatWebhookUrlParam, ["GOOGLE_CHAT_WEBHOOK_URL"]);
}

/**
 * Helper to get Google Chat bridge token
 */
function getGoogleChatBridgeToken() {
  return getSecretOrEnv(googleChatBridgeTokenParam, ["GOOGLE_CHAT_BRIDGE_TOKEN"]);
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

    // --- AUTOMATISK OPPSUMMERING ---
    let autoData = null;
    try {
      console.log(`Genererer automatisk oppsummering for episode ${episodeId}...`);
      autoData = await generatePodcastSummaryWithGemini({
        episodeTitle: episodeTitle || '',
        transcriptText: transcriptHtml
      });
      console.log(`Automatisk oppsummering generert.`);
    } catch (summaryError) {
      console.error(`Automatisk oppsummering feilet (men transkripsjonen fortsetter):`, summaryError);
    }

    const docPayload = {
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
    };

    if (autoData) {
      if (autoData.no?.summary) {
        docPayload.summary = autoData.no.summary;
        docPayload.description = autoData.no.summary;
      } else {
        docPayload.summary = FieldValue.delete();
        docPayload.description = FieldValue.delete();
      }
      if (Array.isArray(autoData.no?.keyVerses) && autoData.no.keyVerses.length > 0) {
        docPayload.keyVerses = autoData.no.keyVerses;
      } else {
        docPayload.keyVerses = FieldValue.delete();
      }
      if (Array.isArray(autoData.no?.discussionQuestions) && autoData.no.discussionQuestions.length > 0) {
        docPayload.discussionQuestions = autoData.no.discussionQuestions;
      } else {
        docPayload.discussionQuestions = FieldValue.delete();
      }

      const translations = {};
      if (autoData.en?.summary || autoData.en?.keyVerses?.length || autoData.en?.discussionQuestions?.length) {
        translations.en = {
          summary: autoData.en.summary || '',
          description: autoData.en.summary || '',
          keyVerses: autoData.en.keyVerses || [],
          discussionQuestions: autoData.en.discussionQuestions || []
        };
      }
      if (autoData.es?.summary || autoData.es?.keyVerses?.length || autoData.es?.discussionQuestions?.length) {
        translations.es = {
          summary: autoData.es.summary || '',
          description: autoData.es.summary || '',
          keyVerses: autoData.es.keyVerses || [],
          discussionQuestions: autoData.es.discussionQuestions || []
        };
      }
      if (Object.keys(translations).length > 0) {
        docPayload.translations = translations;
      }
    } else {
      docPayload.summary = FieldValue.delete();
      docPayload.description = FieldValue.delete();
      docPayload.keyVerses = FieldValue.delete();
      docPayload.discussionQuestions = FieldValue.delete();
    }

    await transcriptRef.set(docPayload, { merge: true });

    console.log(`Transkripsjon og oppsummering lagret vellykket i Firestore.`);
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
    await verifyAdmin(req, res, async () => {
      try {
      let propertyId = gaPropertyIdParam.value();
      let clientEmail = gaServiceAccountEmailParam.value();
      let privateKeyRaw = gaServiceAccountPrivateKeyParam.value();

      // Fallback to Firestore if secrets are missing
      if (!propertyId || !clientEmail || !privateKeyRaw) {
        console.log("[Analytics] Secrets missing, checking Firestore fallback...");
        const settingsDoc = await admin.firestore().collection('content').doc('settings_integrations').get();
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
      const allowedDays = [1, 7, 14, 30, 60, 90, 180, 365];
      const rangeDays = allowedDays.includes(requestedDays) ? requestedDays : 30;
      const rangeStartDate = `${rangeDays}daysAgo`;
      const accessToken = await getGaAccessToken({ clientEmail, privateKey });

      const [
        summaryReport,
        pagesReport,
        sourcesReport,
        realtimeReport,
        devicesReport,
        geoReport,
        dailyReport,
        gscSummaryReport,
        gscDailyReport,
        aiSourcesReport
      ] = await Promise.all([
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
            dimensions: [{ name: "city" }, { name: "country" }],
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
        // 8. Google Search Console Summary
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            metrics: [
              { name: "organicGoogleSearchClicks" },
              { name: "organicGoogleSearchImpressions" },
              { name: "organicGoogleSearchAveragePosition" },
              { name: "organicGoogleSearchClickThroughRate" }
            ],
            limit: 1,
          },
        }).catch((err) => {
          console.warn("[Analytics] GSC summary report failed:", err.message);
          return null;
        }),
        // 9. Google Search Console Daily
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            dimensions: [{ name: "date" }],
            metrics: [
              { name: "organicGoogleSearchClicks" },
              { name: "organicGoogleSearchImpressions" }
            ],
            orderBys: [{ dimension: { dimensionName: "date" }, desc: false }]
          },
        }).catch((err) => {
          console.warn("[Analytics] GSC daily report failed:", err.message);
          return null;
        }),
        // 10. AI Referral sources
        googleGaPost({
          path: `/properties/${propertyId}:runReport`,
          accessToken,
          body: {
            dateRanges: [{ startDate: rangeStartDate, endDate: "today" }],
            dimensions: [{ name: "sessionSource" }],
            metrics: [{ name: "sessions" }],
            limit: 100,
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }]
          },
        }).catch((err) => {
          console.warn("[Analytics] AI referral sources report failed:", err.message);
          return null;
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
        country: row.dimensionValues[1] ? row.dimensionValues[1].value : '',
        users: row.metricValues[0].value
      }));

      const activeUsersNow = realtimeReport ? gaMetricValue(realtimeReport, 0, 0) : 0;
      const activeRangeUsers = summaryReport.rows?.[0]?.metricValues?.[0]?.value || "0";
      const screenPageViews = summaryReport.rows?.[0]?.metricValues?.[1]?.value || "0";
      const avgDuration = summaryReport.rows?.[0]?.metricValues?.[2]?.value || "0";
      const bounceRate = summaryReport.rows?.[0]?.metricValues?.[3]?.value || "0";

      // Google Search Console parsing
      let gscSummary = null;
      if (gscSummaryReport && gscSummaryReport.rows && gscSummaryReport.rows[0]) {
        const row = gscSummaryReport.rows[0];
        gscSummary = {
          clicks: row.metricValues[0].value,
          impressions: row.metricValues[1].value,
          position: parseFloat(row.metricValues[2].value).toFixed(1),
          ctr: (parseFloat(row.metricValues[3].value) * 100).toFixed(1) + "%"
        };
      }

      const gscDaily = (gscDailyReport && gscDailyReport.rows || []).map(row => ({
        date: row.dimensionValues[0].value,
        clicks: row.metricValues[0].value,
        impressions: row.metricValues[1].value
      }));

      // AI referrals parsing
      const aiSources = (aiSourcesReport && aiSourcesReport.rows || []).map(row => ({
        source: row.dimensionValues[0].value,
        sessions: row.metricValues[0].value
      })).filter(s => {
        const srcName = String(s.source || '').toLowerCase();
        return srcName.includes('chatgpt') || 
               srcName.includes('openai') || 
               srcName.includes('gemini') || 
               srcName.includes('claude') || 
               srcName.includes('perplexity') ||
               srcName.includes('anthropic') ||
               srcName.includes('cohere');
      });

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
          dailyTraffic,
          gscSummary,
          gscDaily,
          aiSources
        }
      });


    } catch (error) {
      console.error("Analytics Error:", error);
      res.status(500).json({ error: error.message });
    }
    });
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

const VISITOR_CHAT_RETENTION_DAYS = 7;

function cleanGoogleChatCommandText(rawText) {
  if (typeof rawText !== "string") return "";
  return rawText
      .replace(/<users\/[^>]+>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
}

function parseGoogleChatReplyCommand(rawText) {
  const text = cleanGoogleChatCommandText(rawText);
  if (!text) return null;

  const match = text.match(/^(reply|svar)\s+([A-Za-z0-9_-]{6,})\s+([\s\S]+)$/i);
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

function makeGoogleChatMappingId(spaceName, threadName) {
  return crypto
      .createHash("sha256")
      .update(`${spaceName}_${threadName}`)
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

  const fallbackId = crypto
      .createHash("sha256")
      .update(spaceName)
      .digest("hex");

  await db.collection("googleChatSpaceFallback").doc(fallbackId).set({
    spaceName,
    chatId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function inferChatIdFromGooglePayload(payload) {
  const payloadMessage = payload && payload.message ? payload.message : {};
  const spaceName = (
    (payload && payload.space && payload.space.name) ||
    (payloadMessage.space && payloadMessage.space.name) ||
    ""
  ).trim();
  const threadName = (
    (payloadMessage.thread && payloadMessage.thread.name) ||
    ""
  ).trim();

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
    // Fallback below
  }

  try {
    const form = new URLSearchParams(rawText);
    const embedded = (form.get("payload") || "").trim();
    if (embedded) {
      const parsed = JSON.parse(embedded);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (error) {
    // Ignore
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
    spaceName,
    threadName,
    threadKey,
    appCommandId,
    appCommandType,
    normalizedPayload,
    payloadKeys: payload && typeof payload === "object" ? Object.keys(payload).slice(0, 12) : [],
    chatKeys: chat && typeof chat === "object" ? Object.keys(chat).slice(0, 12) : [],
    msgPayloadKeys: msgPayload && typeof msgPayload === "object" ? Object.keys(msgPayload).slice(0, 12) : [],
  };
}

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
      `${baseUrl}/ecomm/v2/payments/${encodeURIComponent(reference)}/details`,
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

  // Normalize eCom v2 response to match expected state structure
  const history = paymentPayload.transactionLogHistory || [];
  let state = "INITIATED";
  const successOps = history.filter(h => h.operationSuccess);
  if (successOps.length > 0) {
    const latestOp = successOps[successOps.length - 1].operation;
    if (latestOp === "CAPTURE") state = "CAPTURED";
    else if (latestOp === "RESERVE") state = "AUTHORIZED";
    else if (latestOp === "CANCEL" || latestOp === "VOID") state = "CANCELLED";
    else if (latestOp === "REFUND") state = "REFUNDED";
  }

  let amountVal = 0;
  if (history.length > 0) {
    amountVal = history[0].amount;
  }

  return {
    ...paymentPayload,
    state,
    amount: {
      value: amountVal,
      currency: "NOK"
    }
  };
}

async function captureVippsPayment(config, baseUrl, accessToken, reference, amount) {
  const idempotencyKey = crypto.randomUUID ?
    crypto.randomUUID() :
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const captureResponse = await fetch(
      `${baseUrl}/ecomm/v2/payments/${encodeURIComponent(reference)}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": config.subscriptionKey,
          "Merchant-Serial-Number": config.merchantSerialNumber,
          "X-Request-Id": idempotencyKey,
          ...getVippsSystemHeaders(config),
        },
        body: JSON.stringify({
          merchantInfo: {
            merchantSerialNumber: config.merchantSerialNumber,
          },
          transaction: {
            amount: amount && Number.isFinite(amount.value) ? amount.value : 0,
            transactionText: "Capture donasjon",
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

    const resolvedUserId = await resolveDonationUserId(customerDetails);
    const amountOre = Math.round(parsedAmount * 100);

    // Initialize Stripe lazily
    const stripeKey = stripeSecretKeyParam.value();
    if (!stripeKey) {
      console.error("Stripe Secret Key is missing!");
      res.status(500).send({ error: "Server configuration error: Missing Stripe Key." });
      return;
    }
    const stripe = require('stripe')(stripeKey, { apiVersion: '2023-10-16' });

    const paymentIntentPayload = {
      amount: amountOre, // Stripe bruker ore (cents)
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
        user_id: resolvedUserId || "",
        fund: customerDetails.fund || "general",
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

    // Lagre en "pending" donasjon i databasen slik at Webhooken vet hvem donasjonen tilhører
    await db.collection('donations').doc(paymentIntent.id).set({
      transactionId: paymentIntent.id,
      amount: parsedAmount,
      amountNok: parsedAmount,
      amountOre,
      currency: normalizedCurrency,
      method: "stripe",
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: resolvedUserId,
      donorName: customerDetails.name || "Ukjent",
      donorEmail: customerDetails.email || "Ukjent",
      message: customerDetails.message || "",
      type: "Gave",
      fund: customerDetails.fund || "general"
    });

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

// ==========================================
// PayPal Integration (Donations / Engangsgaver)
// ==========================================

function getPayPalConfig() {
  const clientId = paypalClientIdParam.value();
  const clientSecret = paypalClientSecretParam.value();
  const isSandbox = !clientId || clientId.startsWith('sb-') || clientId.includes('sandbox') || process.env.FUNCTIONS_EMULATOR === 'true';
  const apiBase = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  
  return {
    clientId,
    clientSecret,
    apiBase,
    isSandbox
  };
}

async function getPayPalAccessToken(config) {
  const { clientId, clientSecret, apiBase } = config;
  
  if (!clientId || !clientSecret) {
    throw new Error("Missing PayPal API credentials");
  }
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayPal Auth Failed: ${response.status} - ${errText}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

exports.createPayPalOrder = onRequest({
  cors: true,
  invoker: "public",
  secrets: [paypalClientIdParam, paypalClientSecretParam],
}, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { amount, currency = "NOK", customerDetails = {} } = req.body;
    const parsedAmount = Number(amount);
    
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).send({ error: "Missing or invalid amount" });
      return;
    }

    const config = getPayPalConfig();
    const accessToken = await getPayPalAccessToken(config);
    const resolvedUserId = await resolveDonationUserId(customerDetails);

    // Create PayPal Checkout Order
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: parsedAmount.toFixed(2)
        },
        description: `Donasjon til His Kingdom Ministry fra ${customerDetails.name || "Ukjent"}`,
        shipping: customerDetails.name && customerDetails.address ? {
          name: {
            full_name: customerDetails.name
          },
          address: {
            address_line_1: customerDetails.address,
            admin_area_2: customerDetails.city,
            postal_code: customerDetails.zip,
            country_code: "NO"
          }
        } : undefined
      }],
      application_context: {
        shipping_preference: customerDetails.address ? "SET_PROVIDED_ADDRESS" : "NO_SHIPPING",
        user_action: "PAY_NOW"
      }
    };

    const response = await fetch(`${config.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PayPal Order Creation Failed: ${response.status} - ${errText}`);
    }

    const order = await response.json();

    // Save pending donation record
    await db.collection('donations').doc(order.id).set({
      transactionId: order.id,
      amount: parsedAmount,
      amountNok: parsedAmount,
      currency: currency.toUpperCase(),
      method: "paypal",
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: resolvedUserId,
      donorName: customerDetails.name || "Ukjent",
      donorEmail: customerDetails.email || "Ukjent",
      donorPhone: customerDetails.phone || "",
      donorAddress: customerDetails.address || "",
      donorZip: customerDetails.zip || "",
      donorCity: customerDetails.city || "",
      message: customerDetails.message || "",
      type: "Gave",
      fund: customerDetails.fund || "general"
    });

    res.status(200).send({ orderId: order.id });

  } catch (error) {
    console.error("PayPal create order error:", error);
    res.status(500).send({ error: error && error.message ? error.message : "Unknown PayPal error" });
  }
});

exports.capturePayPalOrder = onRequest({
  cors: true,
  invoker: "public",
  secrets: [paypalClientIdParam, paypalClientSecretParam],
}, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      res.status(400).send({ error: "Missing orderId" });
      return;
    }

    const config = getPayPalConfig();
    const accessToken = await getPayPalAccessToken(config);

    // Capture PayPal Checkout Order
    const response = await fetch(`${config.apiBase}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PayPal Capture Failed: ${response.status} - ${errText}`);
    }

    const captureData = await response.json();

    if (captureData.status === "COMPLETED") {
      // Update pending donation to completed status
      const donationRef = db.collection('donations').doc(orderId);
      await donationRef.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        paypalCaptureId: captureData.purchase_units[0].payments.captures[0].id
      });

      res.status(200).send({ status: "success", orderId });
    } else {
      throw new Error(`PayPal Order not completed. Status: ${captureData.status}`);
    }

  } catch (error) {
    console.error("PayPal capture order error:", error);
    res.status(500).send({ error: error && error.message ? error.message : "Unknown PayPal error" });
  }
});

async function getOrCreatePayPalProduct(accessToken, config) {
  const configDocRef = db.collection('settings').doc('paypal_config');
  const configDoc = await configDocRef.get();
  
  if (configDoc.exists && configDoc.data().productId) {
    return configDoc.data().productId;
  }
  
  // Create product in PayPal
  const response = await fetch(`${config.apiBase}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      name: "His Kingdom Ministry Fast Giver",
      description: "Månedlige donasjoner til His Kingdom Ministry",
      type: "SERVICE",
      category: "CHARITY",
      home_url: "https://www.hiskingdomministry.no"
    })
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayPal Product Creation Failed: ${response.status} - ${errText}`);
  }
  
  const product = await response.json();
  await configDocRef.set({ productId: product.id }, { merge: true });
  return product.id;
}

exports.createPayPalSubscriptionPlan = onRequest({
  cors: true,
  invoker: "public",
  secrets: [paypalClientIdParam, paypalClientSecretParam],
}, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { amount } = req.body;
    const parsedAmount = Number(amount);
    
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).send({ error: "Missing or invalid amount" });
      return;
    }

    const config = getPayPalConfig();
    const accessToken = await getPayPalAccessToken(config);
    
    // Get or create PayPal Product ID
    const productId = await getOrCreatePayPalProduct(accessToken, config);

    // Create a plan for the specific monthly amount
    const planPayload = {
      product_id: productId,
      name: `Månedlig gave - ${parsedAmount} kr`,
      description: `Månedlig gave på ${parsedAmount} kr til His Kingdom Ministry`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: parsedAmount.toFixed(2),
              currency_code: "NOK"
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3
      }
    };

    const response = await fetch(`${config.apiBase}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(planPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PayPal Plan Creation Failed: ${response.status} - ${errText}`);
    }

    const plan = await response.json();
    res.status(200).send({ planId: plan.id });

  } catch (error) {
    console.error("PayPal create plan error:", error);
    res.status(500).send({ error: error && error.message ? error.message : "Unknown PayPal error" });
  }
});

exports.activatePayPalSubscription = onRequest({
  cors: true,
  invoker: "public",
  secrets: [paypalClientIdParam, paypalClientSecretParam],
}, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { subscriptionId, customerDetails = {}, amount } = req.body;
    const parsedAmount = Number(amount);
    
    if (!subscriptionId) {
      res.status(400).send({ error: "Missing subscriptionId" });
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).send({ error: "Missing or invalid amount" });
      return;
    }

    const config = getPayPalConfig();
    const accessToken = await getPayPalAccessToken(config);

    // Get Subscription Details from PayPal to verify status
    const response = await fetch(`${config.apiBase}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`PayPal Subscription Retrieval Failed: ${response.status} - ${errText}`);
    }

    const subscription = await response.json();

    if (subscription.status === "ACTIVE" || subscription.status === "APPROVED") {
      const resolvedUserId = await resolveDonationUserId(customerDetails);

      // Save recurring donation/agreement record in Firestore donations collection
      await db.collection('donations').doc(subscriptionId).set({
        transactionId: subscriptionId,
        subscriptionId: subscriptionId,
        amount: parsedAmount,
        amountNok: parsedAmount,
        currency: "NOK",
        method: "paypal_subscription",
        status: "completed",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: resolvedUserId,
        donorName: customerDetails.name || "Ukjent",
        donorEmail: customerDetails.email || "Ukjent",
        donorPhone: customerDetails.phone || "",
        donorAddress: customerDetails.address || "",
        donorZip: customerDetails.zip || "",
        donorCity: customerDetails.city || "",
        message: customerDetails.message || "",
        type: "Fast giver",
        fund: customerDetails.fund || "general"
      });

      res.status(200).send({ status: "success", subscriptionId });
    } else {
      throw new Error(`PayPal Subscription is not active. Status: ${subscription.status}`);
    }

  } catch (error) {
    console.error("PayPal activate subscription error:", error);
    res.status(500).send({ error: error && error.message ? error.message : "Unknown PayPal error" });
  }
});

exports.createStripeSubscription = onRequest({
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
    } = req.body;

    const parsedAmount = Number(amount);
    const normalizedCurrency = typeof currency === "string" ?
      currency.toLowerCase() : "nok";

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).send({ error: "Missing or invalid amount" });
      return;
    }

    if (!customerDetails.email) {
      res.status(400).send({ error: "Missing customer email address" });
      return;
    }

    const resolvedUserId = await resolveDonationUserId(customerDetails);
    const amountOre = Math.round(parsedAmount * 100);

    // Initialize Stripe lazily
    const stripeKey = stripeSecretKeyParam.value();
    if (!stripeKey) {
      console.error("Stripe Secret Key is missing!");
      res.status(500).send({ error: "Server configuration error: Missing Stripe Key." });
      return;
    }
    const stripe = require('stripe')(stripeKey, { apiVersion: '2023-10-16' });

    // 1. Finn eller opprett kunde i Stripe
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: customerDetails.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerDetails.email,
        name: customerDetails.name || undefined,
        phone: customerDetails.phone || undefined,
      });
    }

    // 2. Opprett et dynamisk pris-objekt (Recurring Price) for beløpet
    const price = await stripe.prices.create({
      unit_amount: amountOre,
      currency: normalizedCurrency,
      recurring: { interval: 'month' },
      product_data: {
        name: 'Fast givertjeneste - His Kingdom Ministry',
      },
    });

    // 3. Opprett abonnement (Subscription)
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        customer_name: customerDetails.name || "",
        customer_email: customerDetails.email || "",
        customer_phone: customerDetails.phone || "",
        message: customerDetails.message || "",
        user_id: resolvedUserId || "",
        fund: customerDetails.fund || "general",
      },
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;

    if (!paymentIntent) {
      throw new Error("Kunne ikke hente PaymentIntent for abonnementets første faktura.");
    }

    // 4. Lagre abonnementet i databasen som pending
    await db.collection('donations').doc(paymentIntent.id).set({
      transactionId: paymentIntent.id,
      subscriptionId: subscription.id,
      amount: parsedAmount,
      amountNok: parsedAmount,
      amountOre,
      currency: normalizedCurrency,
      method: "stripe_subscription",
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: resolvedUserId,
      donorName: customerDetails.name || "Ukjent",
      donorEmail: customerDetails.email || "Ukjent",
      message: customerDetails.message || "",
      type: "Fast giver",
      fund: customerDetails.fund || "general"
    });

    // Returner clientSecret til frontend
    res.status(200).send({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    });

  } catch (error) {
    console.error("Stripe Subscription error:", error);
    const stripeMessage = (error && error.message) ? error.message : "Unknown Stripe error";
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

    const resolvedUserId = await resolveDonationUserId(customerDetails);
    const amountOre = Math.round(parsedAmount * 100);

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
      merchantInfo: {
        merchantSerialNumber: config.merchantSerialNumber,
        callbackPrefix: "https://us-central1-his-kingdom-ministry.cloudfunctions.net/vippsWebhook", // adjust if needed
        fallBack: paymentReturnUrl,
        isApp: false
      },
      customerInfo: {},
      transaction: {
        amount: amountOre,
        orderId: reference,
        transactionText: "Donasjon til His Kingdom Ministry"
      }
    };

    if (phoneNumber) {
      paymentRequest.customerInfo.mobileNumber = phoneNumber;
    }

    // Lagre en "pending" donasjon i databasen før vi i det hele tatt spør Vipps
    // Dette gjør at Webhooken enkelt kan finne referansen og sette status til "completed"
    await db.collection('donations').doc(reference).set({
      transactionId: reference,
      amount: parsedAmount,
      amountNok: parsedAmount,
      amountOre,
      currency: "NOK",
      method: "vipps",
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: resolvedUserId,
      donorName: customerDetails.name || "Ukjent",
      donorEmail: customerDetails.email || "Ukjent",
      message: customerDetails.message || "",
      type: "Gave",
      fund: customerDetails.fund || "general"
    });

    const paymentResponse = await fetch(`${baseUrl}/ecomm/v2/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
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

    if (!paymentPayload.url) {
      throw new Error("Vipps did not return url");
    }

    res.status(200).send({
      redirectUrl: paymentPayload.url,
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

exports.createVippsAgreement = onRequest({
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
      res.status(400).send({ error: "Vipps støtter kun NOK for denne avtalen." });
      return;
    }

    const resolvedUserId = await resolveDonationUserId(customerDetails);
    const amountOre = Math.round(parsedAmount * 100);

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
    const agreementReturnUrl = buildVippsReturnUrl(returnUrl, reference);
    const phoneNumber = normalizeVippsPhoneNumber(customerDetails.phone);

    const agreementRequest = {
      pricing: {
        type: "LEGACY",
        amount: amountOre,
        currency: "NOK"
      },
      productName: "Fast givertjeneste - His Kingdom Ministry",
      merchantRedirectUrl: agreementReturnUrl,
      merchantAgreementUrl: "https://www.hiskingdomministry.no/betingelser.html",
      interval: {
        unit: "MONTH",
        count: 1
      },
      initialCharge: {
        amount: amountOre,
        currency: "NOK",
        description: "Første donasjon",
        transactionType: "DIRECT_CAPTURE",
        orderId: reference
      }
    };

    if (phoneNumber) {
      agreementRequest.phoneNumber = phoneNumber;
    }

    // Lagre avtalen i databasen som pending
    await db.collection('vipps_agreements').doc(reference).set({
      agreementExternalId: reference,
      agreementId: null,
      amount: parsedAmount,
      amountOre,
      currency: "NOK",
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: resolvedUserId || null,
      donorName: customerDetails.name || "Ukjent",
      donorEmail: customerDetails.email || "Ukjent",
      donorPhone: customerDetails.phone || "Ukjent",
      donorAddress: customerDetails.address || "",
      donorZip: customerDetails.zip || "",
      donorCity: customerDetails.city || "",
      donorMessage: customerDetails.message || "",
      fund: customerDetails.fund || "general",
      type: "fast_giver"
    });

    // Lagre en pending donasjon for den første betalingen
    await db.collection('donations').doc(reference).set({
      transactionId: reference,
      amount: parsedAmount,
      amountNok: parsedAmount,
      amountOre,
      currency: "NOK",
      method: "vipps",
      status: "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId: resolvedUserId || null,
      donorName: customerDetails.name || "Ukjent",
      donorEmail: customerDetails.email || "Ukjent",
      message: customerDetails.message || "Første donasjon (Vipps Fast avtale)",
      type: "Gave",
      fund: customerDetails.fund || "general",
      isRecurringInit: true
    });

    const response = await fetch(`${baseUrl}/recurring/v3/agreements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Merchant-Serial-Number": config.merchantSerialNumber,
        "Idempotency-Key": reference,
        ...getVippsSystemHeaders(config),
      },
      body: JSON.stringify(agreementRequest),
    });

    const payload = await parseJsonResponse(response);
    if (!response.ok) {
      console.error("Vipps create agreement error payload:", JSON.stringify(payload));
      const errorDetail = resolveVippsErrorDetail(
          payload,
          `Create agreement failed (${response.status})`,
      );
      throw new Error(`Vipps create agreement error: ${errorDetail}`);
    }

    if (!payload.vippsConfirmationUrl) {
      throw new Error("Vipps did not return confirmation url");
    }

    await db.collection('vipps_agreements').doc(reference).update({
      agreementId: payload.agreementId
    });

    res.status(200).send({
      redirectUrl: payload.vippsConfirmationUrl,
      agreementId: payload.agreementId,
      reference,
    });
  } catch (error) {
    console.error("Vipps create agreement failed:", error);
    res.status(500).send({ error: error && error.message ? error.message : "Unknown Vipps error" });
  }
});

exports.finalizeVippsAgreement = onRequest({
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

    if (!normalizedReference) {
      res.status(400).send({ error: "Missing reference" });
      return;
    }

    const agreementDoc = await db.collection('vipps_agreements').doc(normalizedReference).get();
    if (!agreementDoc.exists) {
      res.status(404).send({ error: "Agreement not found" });
      return;
    }

    const agreementData = agreementDoc.data();
    const agreementId = agreementData.agreementId;

    if (!agreementId) {
      res.status(400).send({ error: "Agreement does not have an agreement ID from Vipps yet." });
      return;
    }

    const config = getVippsConfig();
    const vippsAuth = await getVippsAccessToken(config);
    const { accessToken, baseUrl } = vippsAuth;

    const vippsResponse = await fetch(`${baseUrl}/recurring/v3/agreements/${encodeURIComponent(agreementId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Merchant-Serial-Number": config.merchantSerialNumber,
        ...getVippsSystemHeaders(config),
      }
    });

    const vippsAgreement = await parseJsonResponse(vippsResponse);
    if (!vippsResponse.ok) {
      const errorDetail = resolveVippsErrorDetail(
          vippsAgreement,
          `Get agreement details failed (${vippsResponse.status})`,
      );
      throw new Error(`Vipps get agreement error: ${errorDetail}`);
    }

    const agreementStatus = String(vippsAgreement.status || '').toUpperCase();
    console.log(`[FinalizeVippsAgreement] Status for ${agreementId}: ${agreementStatus}`);

    if (agreementStatus === "ACTIVE") {
      await agreementDoc.ref.set({
        status: "active",
        activatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await db.collection('donations').doc(normalizedReference).set({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        vippsAgreementId: agreementId
      }, { merge: true });
    } else {
      await agreementDoc.ref.set({
        status: agreementStatus.toLowerCase()
      }, { merge: true });

      await db.collection('donations').doc(normalizedReference).set({
        status: "failed"
      }, { merge: true });
    }

    res.status(200).send({
      reference: normalizedReference,
      agreementId,
      status: vippsAgreement.status,
    });
  } catch (error) {
    console.error("Vipps finalize agreement failed:", error);
    res.status(500).send({ error: error && error.message ? error.message : "Unknown Vipps error" });
  }
});

/**
 * STRIPE WEBHOOK: Lytter etter fullførte Stripe-betalinger og oppdaterer databasen
 */
exports.stripeWebhook = onRequest({
  cors: true,
  invoker: "public",
  secrets: [stripeSecretKeyParam, stripeWebhookSecretParam],
}, async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = stripeWebhookSecretParam.value();
  let event;
  
  try {
    const stripeKey = stripeSecretKeyParam.value();
    const stripe = require('stripe')(stripeKey, { apiVersion: '2023-10-16' });
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error(`Stripe Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Vi bryr oss bare om betalinger som faktisk går igjennom
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const metadata = paymentIntent.metadata || {};
    const amount = paymentIntent.amount ? (paymentIntent.amount / 100) : 0;
    
    try {
      await db.collection('donations').doc(paymentIntent.id).set({
        transactionId: paymentIntent.id,
        amount: amount,
        amountNok: amount,
        amountOre: paymentIntent.amount || 0,
        currency: paymentIntent.currency || "nok",
        method: "stripe",
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: metadata.user_id || null,
        donorName: metadata.customer_name || "Ukjent",
        donorEmail: metadata.customer_email || paymentIntent.receipt_email || "Ukjent",
        message: metadata.message || "",
        type: "Gave",
        fund: metadata.fund || "general"
      }, { merge: true });
      
      console.log("Stripe donasjon godkjent og oppdatert i db:", paymentIntent.id);
    } catch (dbError) {
      console.error("Feil ved lagring av Stripe-donasjon til db:", dbError);
    }
  }

  res.status(200).send({received: true});
});

/**
 * VIPPS WEBHOOK: Lytter etter fullførte Vipps-betalinger og oppdaterer databasen
 * Merk: Vipps eCom Webhook sender en forenklet payload med orderId/reference
 */
exports.vippsWebhook = onRequest({
  cors: true,
  invoker: "public",
}, async (req, res) => {
  try {
    const payload = req.body;
    
    // Identifiser event type og ID-er
    const eventType = payload.eventType || payload.name || payload.status;
    const agreementId = payload.agreementId;
    const externalId = payload.agreementExternalId || payload.chargeExternalId || payload.reference || payload.orderId;

    console.log(`[VippsWebhook] Event received: ${eventType}, agreementId: ${agreementId}, externalId: ${externalId}`);

    // Håndter recurring events
    if (eventType && typeof eventType === 'string' && eventType.startsWith('recurring.')) {
      if (eventType === 'recurring.agreement-activated.v1') {
        if (agreementId) {
          const qSnap = await db.collection('vipps_agreements').where('agreementId', '==', agreementId).get();
          if (!qSnap.empty) {
            const batch = db.batch();
            qSnap.docs.forEach(doc => {
              batch.update(doc.ref, {
                status: 'active',
                activatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            });
            await batch.commit();
            console.log(`[VippsWebhook] Agreement ${agreementId} activated in Firestore.`);
          }
        }
      } else if (eventType === 'recurring.agreement-stopped.v1' || eventType === 'recurring.agreement-expired.v1' || eventType === 'recurring.agreement-rejected.v1') {
        if (agreementId) {
          const qSnap = await db.collection('vipps_agreements').where('agreementId', '==', agreementId).get();
          if (!qSnap.empty) {
            const batch = db.batch();
            qSnap.docs.forEach(doc => {
              batch.update(doc.ref, {
                status: eventType === 'recurring.agreement-stopped.v1' ? 'stopped' : eventType === 'recurring.agreement-rejected.v1' ? 'rejected' : 'expired',
                stoppedAt: admin.firestore.FieldValue.serverTimestamp(),
                stoppedActor: payload.actor || null
              });
            });
            await batch.commit();
            console.log(`[VippsWebhook] Agreement ${agreementId} marked as inactive (${eventType}) in Firestore.`);
          }
        }
      } else if (eventType === 'recurring.charge-captured.v1') {
        const chargeId = payload.chargeId;
        const chargeExternalId = payload.chargeExternalId;
        const amount = payload.amount; // i øre
        const currency = payload.currency || 'NOK';

        if (agreementId && chargeId) {
          // 1. Sjekk om denne betalingen allerede finnes i databasen (for initial charge)
          let donationRef = null;
          if (chargeExternalId) {
            const extDoc = await db.collection('donations').doc(chargeExternalId).get();
            if (extDoc.exists) {
              donationRef = extDoc.ref;
            }
          }

          if (!donationRef) {
            const idDoc = await db.collection('donations').doc(chargeId).get();
            if (idDoc.exists) {
              donationRef = idDoc.ref;
            }
          }

          // 2. Hent avtaleinformasjon for å hente giverens opplysninger
          let agreementData = null;
          const qSnap = await db.collection('vipps_agreements').where('agreementId', '==', agreementId).get();
          if (!qSnap.empty) {
            agreementData = qSnap.docs[0].data();
          }

          const parsedAmount = amount ? (amount / 100) : (agreementData ? agreementData.amount : 0);

          if (donationRef) {
            // Oppdater eksisterende pending donasjon
            await donationRef.set({
              status: 'completed',
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              vippsChargeId: chargeId,
              vippsAgreementId: agreementId
            }, { merge: true });
            console.log(`[VippsWebhook] Existing pending donation updated to completed: ${donationRef.id}`);
          } else {
            // Opprett en ny donasjon i historikken for løpende månedlig trekk
            const docId = chargeId;
            await db.collection('donations').doc(docId).set({
              transactionId: docId,
              vippsChargeId: chargeId,
              vippsAgreementId: agreementId,
              amount: parsedAmount,
              amountNok: parsedAmount,
              amountOre: amount || (parsedAmount * 100),
              currency: currency,
              method: 'vipps',
              status: 'completed',
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              userId: agreementData ? (agreementData.userId || null) : null,
              donorName: agreementData ? (agreementData.donorName || 'Ukjent') : 'Ukjent',
              donorEmail: agreementData ? (agreementData.donorEmail || 'Ukjent') : 'Ukjent',
              message: payload.chargeType === 'INITIAL' ? 'Første donasjon (Vipps Fast avtale)' : 'Fast månedlig gave via Vipps',
              type: 'Gave',
              fund: agreementData ? (agreementData.fund || 'general') : 'general'
            });
            console.log(`[VippsWebhook] Recorded subsequent recurring payment: ${docId}`);
          }
        }
      }
      
      res.status(200).send("OK");
      return;
    }

    // Fallback til standard ePayment/eCom webhook
    if (!externalId) {
      res.status(400).send("Missing reference");
      return;
    }

    if (
      eventType === 'payment.captured' ||
      eventType === 'payment.authorized' ||
      eventType === 'RESERVE' ||
      eventType === 'CAPTURE' ||
      !eventType
    ) {
      await db.collection('donations').doc(externalId).set({
         status: 'completed',
         completedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log("Vipps standard donasjon godkjent og oppdatert i db:", externalId);
    }
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("Vipps Webhook Error:", error);
    res.status(500).send("Internal Server Error");
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

  const emailLower = email.toLowerCase().trim();
  const userId = event.params.userId;

  try {
    // 1. Duplicates check and auto-merging (CRM vs Auth profiles)
    const usersSnap = await db.collection('users').where('email', '==', emailLower).get();
    
    if (usersSnap.size > 1) {
      console.log(`[onUserCreate] Found duplicate profiles for email: ${emailLower}`);
      
      // Separate Auth user (ID length 28) and CRM user (ID length 20)
      const authDoc = usersSnap.docs.find(d => d.id.length === 28);
      const crmDocs = usersSnap.docs.filter(d => d.id.length === 20);
      
      if (authDoc && crmDocs.length > 0) {
        const primaryRef = authDoc.ref;
        const primaryData = authDoc.data();
        
        for (const crmDoc of crmDocs) {
          const crmData = crmDoc.data();
          const crmId = crmDoc.id;
          
          console.log(`[onUserCreate] Merging CRM profile ${crmId} into Auth profile ${authDoc.id}`);
          
          // Merge missing CRM fields to Auth profile (address, zip, city, country, phone, syncedFromCrm)
          const mergedUpdates = {};
          const fieldsToMerge = ['address', 'zip', 'city', 'country', 'phone', 'displayName', 'fullName', 'syncedFromCrm'];
          fieldsToMerge.forEach(field => {
            if (!primaryData[field] && crmData[field]) {
              mergedUpdates[field] = crmData[field];
            }
          });
          
          if (Object.keys(mergedUpdates).length > 0) {
            await primaryRef.update({
              ...mergedUpdates,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          
          // Re-link donations linked to the old CRM document ID to the Auth profile UID
          const donationsSnap = await db.collection('donations').where('userId', '==', crmId).get();
          if (!donationsSnap.empty) {
            console.log(`[onUserCreate] Updating ${donationsSnap.size} donations to new userId ${authDoc.id}`);
            const batch = db.batch();
            donationsSnap.docs.forEach(dDoc => {
              batch.update(dDoc.ref, { userId: authDoc.id });
            });
            await batch.commit();
          }
          
          // Delete duplicate CRM document
          await crmDoc.ref.delete();
          console.log(`[onUserCreate] Deleted duplicate CRM profile: ${crmId}`);
          
          // Create admin notification about the merge
          try {
            await db.collection('admin_notifications').add({
              type: 'NEW_USER_REGISTRATION',
              userId: authDoc.id,
              userEmail: emailLower,
              userName: primaryData.displayName || primaryData.fullName || emailLower,
              message: `Brukerprofil '${crmId}' ble automatisk flettet inn i Auth-ID '${authDoc.id}' ved registrering.`,
              read: false,
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
          } catch (err) {
            console.warn('Kunne ikke opprette admin-varsel for fletting:', err);
          }
        }
      }
    }
  } catch (error) {
    console.error("[onUserCreate] Feil under duplikat-sjekk og fletting:", error);
  }

  // 2. Auto-link any donations matching this user's email that are currently unlinked
  if (userId.length === 28) {
    try {
      const emailDonations1 = await db.collection('donations').where('donorEmail', '==', emailLower).get();
      const emailDonations2 = await db.collection('donations').where('email', '==', emailLower).get();
      
      const toLink = [];
      const addDocs = (snap) => {
        snap.forEach(dDoc => {
          if (!dDoc.data().userId) {
            toLink.push(dDoc);
          }
        });
      };
      addDocs(emailDonations1);
      addDocs(emailDonations2);
      
      if (toLink.length > 0) {
        console.log(`[onUserCreate] Auto-linking ${toLink.length} unmatched email donations to userId ${userId}`);
        const batch = db.batch();
        toLink.forEach(dDoc => {
          batch.update(dDoc.ref, { userId: userId, matchMethod: 'auto_email_registration' });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn('[onUserCreate] Feil ved automatisk e-post-gavekobling:', err);
    }
  }

  // 3. Send welcome email (only for the Auth user profile)
  if (userId.length === 28) {
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
      const { to, subject, message, fromName, html: rawHtml } = req.body;

      if (!to || !subject || (!message && !rawHtml)) {
        res.status(400).send({ error: "Mangler mottaker, emne eller melding." });
        return;
      }

      let html = "";
      if (rawHtml) {
        html = rawHtml;
      } else {
        html = `
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
      }

      const success = await sendEmail({ to, subject, html, text: message || "", fromName });

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
async function verifyAdmin(req, res, next) {
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
}

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
      const emailPromises = emails.map(async (email) => {
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
        try {
          await sendEmail({ to: email, subject, html, text: message, fromName });
          return { email, success: true };
        } catch (err) {
          console.error(`Kunne ikke sende e-post til ${email}:`, err);
          return { email, success: false, error: err.message };
        }
      });

      const results = await Promise.all(emailPromises);
      const successfulCount = results.filter(r => r.success).length;
      const failedCount = results.length - successfulCount;

      res.status(200).send({
        success: true,
        message: `E-post-utsendelse fullført. ${successfulCount} vellykket, ${failedCount} feilet.`,
        results: results.map(r => ({ email: r.email, success: r.success }))
      });

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
      const { targetRole, title, body, icon, click_action, selectedUserIds, category } = req.body;

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

      // Filter out users who have globally disabled push OR opted out of this specific category
      users = users.filter(user => {
        if (user.pushEnabled === false) return false;
        if (category === 'teaching' && user.pushTeachings === false) return false;
        if (category === 'podcast' && user.pushPodcasts === false) return false;
        if (category === 'blog' && user.pushBlogs === false) return false;
        return true;
      });

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
        tokens: tokens,
        notification: {
          title,
          body,
          imageUrl: icon || '/img/logo-hkm.png',
        },
        webpush: {
          fcm_options: {
            link: click_action || 'https://his-kingdom-ministry.web.app/'
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      let failureCount = response.failureCount || 0;
      let successCount = response.successCount || 0;

      const tokensToClean = [];

      response.responses.forEach((resItem, index) => {
        const error = resItem.error;
        if (error) {
          console.error('Failure sending notification to', tokens[index], error);
          // Cleanup the tokens that are not registered anymore.
          if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
            const token = tokens[index];
            tokensToClean.push(token);
          }
        }
      });

      if (tokensToClean.length > 0) {
        console.log(`Cleaning ${tokensToClean.length} invalid tokens.`);
        
        // Group tokens by userId to prevent concurrent write contention
        const userTokensMap = new Map();
        tokensToClean.forEach(token => {
          const userId = tokenUserMap.get(token);
          if (userId) {
            if (!userTokensMap.has(userId)) {
              userTokensMap.set(userId, []);
            }
            userTokensMap.get(userId).push(token);
          }
        });

        try {
          const cleanupPromises = Array.from(userTokensMap.entries()).map(async ([userId, userTokens]) => {
            try {
              const userRef = db.collection('users').doc(userId);
              await userRef.update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(...userTokens)
              });
            } catch (err) {
              console.warn(`Kunne ikke fjerne utgåtte tokens for bruker ${userId}:`, err);
            }
          });
          await Promise.all(cleanupPromises);
          console.log("Token cleanup complete.");
        } catch (cleanupErr) {
          console.error("Feil under fjerning av utgåtte tokens:", cleanupErr);
        }
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
    const { type, message, severity = "INFO", userId = null, additionalData = {}, level, source, url, userAgent } = req.body;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    let finalLevel = level || severity.toLowerCase();
    if (finalLevel === 'warning') finalLevel = 'warn';
    if (finalLevel === 'critical') finalLevel = 'error';

    await db.collection("system_logs").add({
      type,
      message,
      severity,
      level: finalLevel,
      source: source || "Nettside",
      url: url || null,
      userAgent: userAgent || null,
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
    "knutsenthomas@gmail.com",
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
 * Cache helpers for podcast and youtube to keep chatbot response times low
 */
async function getOrUpdatePodcastCache() {
  const cacheRef = db.collection("content").doc("cache_podcast");
  try {
    const snap = await cacheRef.get();
    if (snap.exists) {
      const data = snap.data();
      const ageMs = Date.now() - (data.updatedAt?.toDate().getTime() || 0);
      if (ageMs < 4 * 60 * 60 * 1000 && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch (err) {
    console.warn("[Cache] Kunne ikke lese podcast-cache:", err);
  }

  try {
    console.log("[Cache] Henter podcast RSS fra nettverket...");
    const response = await fetch("https://anchor.fm/s/f7a13dec/podcast/rss", {
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      const pText = await response.text();
      const pData = await parseStringPromise(pText);
      const channel = Array.isArray(pData?.rss?.channel) ? pData.rss.channel[0] : pData?.rss?.channel;
      const pItems = (channel.item || []).slice(0, 5).map(it => ({
        title: it.title ? it.title[0] : "Ukjent episode",
        link: it.link ? it.link[0] : "https://anchor.fm/s/f7a13dec/podcast/rss",
        description: it.description ? it.description[0].replace(/<[^>]*>/g, '').substring(0, 200) : "",
        imageUrl: it['itunes:image'] ? it['itunes:image'][0].$.href : (channel.image ? channel.image[0].url[0] : "")
      }));

      await cacheRef.set({
        items: pItems,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return pItems;
    }
  } catch (err) {
    console.error("[Cache] Feil under oppdatering av podcast-cache:", err);
  }

  // Fallback to stale cache
  try {
    const snap = await cacheRef.get();
    if (snap.exists && Array.isArray(snap.data().items)) {
      return snap.data().items;
    }
  } catch (err) {}
  return [];
}

async function getOrUpdateYoutubeCache() {
  const cacheRef = db.collection("content").doc("cache_youtube");
  try {
    const snap = await cacheRef.get();
    if (snap.exists) {
      const data = snap.data();
      const ageMs = Date.now() - (data.updatedAt?.toDate().getTime() || 0);
      if (ageMs < 4 * 60 * 60 * 1000 && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch (err) {
    console.warn("[Cache] Kunne ikke lese youtube-cache:", err);
  }

  try {
    console.log("[Cache] Henter youtube RSS fra nettverket...");
    const url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent("https://www.youtube.com/feeds/videos.xml?channel_id=UCFbX-Mf7NqDm2a07hk6hveg");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      const ytData = await response.json();
      const items = ytData.items || [];
      const ytItems = items.slice(0, 10).map(v => ({
        title: v.title || "",
        link: v.link || "",
        thumbnail: v.thumbnail || ""
      }));

      await cacheRef.set({
        items: ytItems,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return ytItems;
    }
  } catch (err) {
    console.error("[Cache] Feil under oppdatering av youtube-cache:", err);
  }

  // Fallback to stale cache
  try {
    const snap = await cacheRef.get();
    if (snap.exists && Array.isArray(snap.data().items)) {
      return snap.data().items;
    }
  } catch (err) {}
  return [];
}

/**
 * AI-drevet chatbot for His Kingdom Ministry.
 * Svarer automatisk på nye meldinger fra besøkende ved bruk av Gemini.
 */
exports.onVisitorChatMessageAI = onDocumentCreated({
  document: "visitorChats/{chatId}/messages/{messageId}",
  secrets: [geminiApiKeyParam, openaiApiKeyParam],
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

    // Only fetch podcast/YouTube when the message is relevant — these are slow external calls.
    const msgText = (msgData.text || "").toLowerCase();
    const needsMedia = /podcast|episode|youtube|video|kanal|media/.test(msgText);

    // 1. Hent kontekst om nettstedet, butikk, arrangementer og innhold in parallel
    const firestoreReads = [
      db.collection("siteContent").doc("settings_seo").get(),
      db.collection("content").doc("ekstern_products").get(),
      db.collection("content").doc("collection_events").get(),
      db.collection("content").doc("collection_blog").get(),
      db.collection("content").doc("collection_teaching").get(),
    ];
    const mediaReads = needsMedia ? [
      getOrUpdatePodcastCache(),
      getOrUpdateYoutubeCache(),
    ] : [Promise.resolve([]), Promise.resolve([])];

    const [settingsSnap, productsSnap, eventsSnap, blogSnap, teachingSnap, podcastItems, youtubeItems] = await Promise.all([
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
    if (podcastItems && podcastItems.length > 0) {
      podcastContext = "\nPODCAST (Siste episoder):\n" + 
        podcastItems.map(it => `- Episode: ${it.title}\n  Om: ${it.description || ''}\n  Link: ${it.link}\n  Bilde: ${it.imageUrl || ''}`).join("\n");
    }

    // Forbered youtube-info
    let youtubeContext = "";
    if (youtubeItems && youtubeItems.length > 0) {
      youtubeContext = "\nYOUTUBE-VIDEOER (Siste fra kanalen):\n" + 
        youtubeItems.map(v => `- Tittel: ${v.title}\n  URL: ${v.link}\n  Bilde: ${v.thumbnail}`).join("\n");
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

    // Hent samtalehistorikk for å gi chatbot-en kontekstuell hukommelse
    let historyContext = "";
    try {
      const messagesSnap = await db.collection("visitorChats")
        .doc(chatId)
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(8)
        .get();
      
      const msgs = [];
      messagesSnap.forEach(doc => {
        if (doc.id !== messageId) {
          msgs.push(doc.data());
        }
      });
      // Sorter kronologisk (eldste først)
      msgs.reverse();

      if (msgs.length > 0) {
        historyContext = "\nSAMTALEHISTORIKK (Hukommelse over hva dere snakket om tidligere):\n" + 
          msgs.map(m => {
            const role = m.sender === "visitor" ? "Besøkende" : "HKM Assistent";
            return `${role}: ${m.text || ""}`;
          }).join("\n");
      }
    } catch (err) {
      console.warn("[ChatAI] Kunne ikke hente samtalehistorikk:", err.message);
    }

    const finalSystemPrompt = `${systemPrompt}\n${historyContext}\n\nNy melding fra Besøkende: ${userMessage}`;

    // --- AI Generation Logic with Robust Fallback ---
    let aiText = "";
    let lastError = null;

    // 1. Prøv Gemini (Primary & Fallback models)
    try {
      const genAI = new GoogleGenerativeAI(cleanKey);
      const modelsToTry = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
      
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

  const promptString = [
    'Du er en redaktør for kristent innhold som oversetter innhold til norsk (no), engelsk (en) og spansk (es).',
    'Analyser transkripsjonen av podcast-episoden under og returner et strukturert JSON-objekt med oppsummering, nøkkelvers og diskusjonsspørsmål oversatt til norsk bokmål ("no"), engelsk ("en") og spansk ("es").',
    '',
    'Krav til JSON-struktur:',
    '{',
    '  "no": {',
    '    "summary": "En kort, varm og tydelig oppsummering på 2-3 setninger, maks 320 tegn, uten punktlister, emojis eller markdown-formatering.",',
    '    "keyVerses": [',
    '      {',
    '        "reference": "Skriftsted-referanse (f.eks: APG 1,8 eller JOH 4,7). Bruk store bokstaver og kortform.",',
    '        "text": "Selve teksten til bibelverset slik det lyder på norsk bokmål. Finn gjerne det sanne, offisielle sitatet hvis det siteres delvis i talen."',
    '      }',
    '    ],',
    '    "discussionQuestions": [',
    '      "3-4 relevante diskusjonsspørsmål til refleksjon (som kulepunkter/spørsmål)."',
    '    ]',
    '  },',
    '  "en": {',
    '    "summary": "En tilsvarende oppsummering skrevet på engelsk (maks 320 tegn).",',
    '    "keyVerses": [',
    '      {',
    '        "reference": "Tilsvarende skriftsted-referanse på engelsk (f.eks: Acts 1:8 or John 4:7).",',
    '        "text": "Selve teksten til bibelverset på engelsk (søk opp offisiell oversettelse som f.eks. ESV eller NIV)."',
    '      }',
    '    ],',
    '    "discussionQuestions": [',
    '      "De samme diskusjonsspørsmålene oversatt til engelsk."',
    '    ]',
    '  },',
    '  "es": {',
    '    "summary": "En tilsvarende oppsummering skrevet på spansk (maks 320 tegn).",',
    '    "keyVerses": [',
    '      {',
    '        "reference": "Tilsvarende skriftsted-referanse på spansk (f.eks: Hechos 1:8 or Juan 4:7).",',
    '        "text": "Selve teksten til bibelverset på spansk (søk opp offisiell oversettelse som f.eks. RVR1960)."',
    '      }',
    '    ],',
    '    "discussionQuestions": [',
    '      "De samme diskusjonsspørsmålene oversatt til spansk."',
    '    ]',
    '  }',
    '}',
    '',
    'Viktig:',
    '- "keyVerses" skal inneholde faktiske bibelvers som siteres, refereres til eller er høyst relevante for innholdet i talen. Hvis det ikke er noen bibelvers overhodet, la listen være tom ([]) for alle språk.',
    '- Svar KUN med rå JSON. Ikke legg til ```json ... ``` eller markdown-blokker.',
    '',
    `Tittel: ${String(episodeTitle || '').trim() || 'Uten tittel'}`,
    'Transkripsjon:',
    cleanTranscript,
  ].join('\n');

  let resultText = null;
  let lastModelError = null;

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const modelCandidates = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const modelName of modelCandidates) {
      const model = genAI.getGenerativeModel({ model: modelName });
      try {
        const result = await model.generateContent(promptString);
        resultText = result.response.text();
        if (resultText) break;
      } catch (error) {
        lastModelError = error;
        console.error(`Oppsummering feilet med Gemini ${modelName}:`, error);
        if (isGeminiRateLimitError(error)) break;
      }
    }
  } catch (err) {
    console.error("Gemini SDK init feilet:", err);
  }

  // Fallback to OpenAI
  if (!resultText) {
    try {
      const openaiKey = openaiApiKeyParam.value();
      if (openaiKey) {
        console.log("Prøver OpenAI (ChatGPT) fallback for podcast-oppsummering...");
        const openai = new OpenAI({ apiKey: openaiKey });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Du er en redaktør for kristent innhold som oversetter til norsk, engelsk og spansk og alltid svarer i rå JSON." },
            { role: "user", content: promptString }
          ]
        });
        resultText = completion.choices[0].message.content;
        console.log("Suksess med OpenAI for podcast-oppsummering!");
      }
    } catch (err) {
      console.error("OpenAI fallback feilet for podcast-oppsummering:", err);
      lastModelError = err;
    }
  }

  if (!resultText) {
    throw lastModelError || new Error('Ingen AI-modell kunne lage oppsummering.');
  }

  // Parse structured JSON
  try {
    const cleanedText = resultText.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    let noObj = parsed.no || {};
    let enObj = parsed.en || {};
    let esObj = parsed.es || {};

    if (!parsed.no && parsed.summary) {
      noObj = parsed;
    }

    return {
      no: {
        summary: normalizePodcastSummaryText(noObj.summary || ''),
        keyVerses: Array.isArray(noObj.keyVerses) ? noObj.keyVerses : [],
        discussionQuestions: Array.isArray(noObj.discussionQuestions) ? noObj.discussionQuestions : []
      },
      en: {
        summary: normalizePodcastSummaryText(enObj.summary || ''),
        keyVerses: Array.isArray(enObj.keyVerses) ? enObj.keyVerses : [],
        discussionQuestions: Array.isArray(enObj.discussionQuestions) ? enObj.discussionQuestions : []
      },
      es: {
        summary: normalizePodcastSummaryText(esObj.summary || ''),
        keyVerses: Array.isArray(esObj.keyVerses) ? esObj.keyVerses : [],
        discussionQuestions: Array.isArray(esObj.discussionQuestions) ? esObj.discussionQuestions : []
      }
    };
  } catch (parseError) {
    console.warn("Klarte ikke å parse JSON fra AI-oppsummering, bruker fallback-struktur:", parseError);
  }

  // Fallback if parsing fails
  const cleanFallbackText = normalizePodcastSummaryText(resultText);
  return {
    no: { summary: cleanFallbackText, keyVerses: [], discussionQuestions: [] },
    en: { summary: cleanFallbackText, keyVerses: [], discussionQuestions: [] },
    es: { summary: cleanFallbackText, keyVerses: [], discussionQuestions: [] }
  };
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
  secrets: [geminiApiKeyParam, openaiApiKeyParam],
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
    const aiData = await generatePodcastSummaryWithGemini({
      episodeTitle,
      transcriptText
    });

    return {
      summary: aiData.no?.summary,
      keyVerses: aiData.no?.keyVerses,
      discussionQuestions: aiData.no?.discussionQuestions
    };
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
  secrets: [geminiApiKeyParam, openaiApiKeyParam]
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
      const needsSummary = !transcriptData.summary && !transcriptData.description;
      const needsQuestions = !transcriptData.discussionQuestions || transcriptData.discussionQuestions.length === 0;

      if (needsSummary || needsQuestions) {
        try {
          console.log(`Auto-genererer manglende oppsummering/spørsmål for episode ${episode.episodeId}`);
          const autoData = await generatePodcastSummaryWithGemini({
            episodeTitle: episode.title || transcriptData.title || '',
            transcriptText: transcriptData.text
          });

          const updatePayload = {};
          if (autoData.no?.summary) {
            updatePayload.summary = autoData.no.summary;
            updatePayload.description = autoData.no.summary;
          }
          if (Array.isArray(autoData.no?.keyVerses) && autoData.no.keyVerses.length > 0) {
            updatePayload.keyVerses = autoData.no.keyVerses;
          }
          if (Array.isArray(autoData.no?.discussionQuestions) && autoData.no.discussionQuestions.length > 0) {
            updatePayload.discussionQuestions = autoData.no.discussionQuestions;
          }

          const translations = transcriptData.translations || {};
          if (autoData.en?.summary || autoData.en?.keyVerses?.length || autoData.en?.discussionQuestions?.length) {
            translations.en = {
              ...(translations.en || {}),
              summary: autoData.en.summary || '',
              description: autoData.en.summary || '',
              keyVerses: autoData.en.keyVerses || [],
              discussionQuestions: autoData.en.discussionQuestions || []
            };
          }
          if (autoData.es?.summary || autoData.es?.keyVerses?.length || autoData.es?.discussionQuestions?.length) {
            translations.es = {
              ...(translations.es || {}),
              summary: autoData.es.summary || '',
              description: autoData.es.summary || '',
              keyVerses: autoData.es.keyVerses || [],
              discussionQuestions: autoData.es.discussionQuestions || []
            };
          }
          if (Object.keys(translations).length > 0) {
            updatePayload.translations = translations;
          }

          if (Object.keys(updatePayload).length > 0) {
            await transcriptRef.update(updatePayload);
            console.log(`Vellykket auto-generering av oppsummering/spørsmål for ${episode.episodeId}`);
            processedCount += 1;
          }
        } catch (summaryError) {
          console.error(`Auto-generering feilet for ${episode.episodeId}:`, summaryError);
          if (isGeminiRateLimitError(summaryError)) {
            break;
          }
        }
      }
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

exports.backfillPodcastSummaries = onRequest({
  cors: true,
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: [geminiApiKeyParam, openaiApiKeyParam]
}, async (req, res) => {
  try {
    let limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    if (req.query.limit === 'all' || req.query.limit === '0') {
      limit = Number.MAX_SAFE_INTEGER;
    }

    const episodes = await fetchPodcastEpisodesFromRss(Number.MAX_SAFE_INTEGER);
    let processed = [];
    let failed = [];

    for (const episode of episodes) {
      const transcriptRef = db.collection("podcast_transcripts").doc(episode.episodeId);
      const transcriptSnap = await transcriptRef.get();
      
      if (!transcriptSnap.exists) {
        continue;
      }
      
      const transcriptData = transcriptSnap.data();
      if (!transcriptData.text) {
        continue;
      }

      const needsSummary = !transcriptData.summary && !transcriptData.description;
      const needsQuestions = !transcriptData.discussionQuestions || transcriptData.discussionQuestions.length === 0;
      const force = req.query.force === 'true';

      if (needsSummary || needsQuestions || force) {
        if (processed.length >= limit) {
          break;
        }

        if (processed.length > 0) {
          console.log("Sleeping 4 seconds to respect Gemini Free Tier rate limits...");
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }

        try {
          console.log(`Backfilling episode ${episode.episodeId}`);
          const autoData = await generatePodcastSummaryWithGemini({
            episodeTitle: episode.title || transcriptData.title || '',
            transcriptText: transcriptData.text
          });

          const updatePayload = {};
          if (autoData.no?.summary) {
            updatePayload.summary = autoData.no.summary;
            updatePayload.description = autoData.no.summary;
          }
          if (Array.isArray(autoData.no?.keyVerses) && autoData.no.keyVerses.length > 0) {
            updatePayload.keyVerses = autoData.no.keyVerses;
          }
          if (Array.isArray(autoData.no?.discussionQuestions) && autoData.no.discussionQuestions.length > 0) {
            updatePayload.discussionQuestions = autoData.no.discussionQuestions;
          }

          const translations = transcriptData.translations || {};
          if (autoData.en?.summary || autoData.en?.keyVerses?.length || autoData.en?.discussionQuestions?.length) {
            translations.en = {
              ...(translations.en || {}),
              summary: autoData.en.summary || '',
              description: autoData.en.summary || '',
              keyVerses: autoData.en.keyVerses || [],
              discussionQuestions: autoData.en.discussionQuestions || []
            };
          }
          if (autoData.es?.summary || autoData.es?.keyVerses?.length || autoData.es?.discussionQuestions?.length) {
            translations.es = {
              ...(translations.es || {}),
              summary: autoData.es.summary || '',
              description: autoData.es.summary || '',
              keyVerses: autoData.es.keyVerses || [],
              discussionQuestions: autoData.es.discussionQuestions || []
            };
          }
          if (Object.keys(translations).length > 0) {
            updatePayload.translations = translations;
          }

          if (Object.keys(updatePayload).length > 0) {
            await transcriptRef.update(updatePayload);
            processed.push(episode.episodeId);
          }
        } catch (e) {
          console.error(`Failed to backfill ${episode.episodeId}:`, e);
          failed.push({ id: episode.episodeId, error: e.message });
          if (isGeminiRateLimitError(e)) {
            console.log("Gemini rate limit exceeded. Stopping backfill.");
            break;
          }
        }
      }
    }

    res.status(200).send({
      message: "Backfill completed",
      processedCount: processed.length,
      processed,
      failedCount: failed.length,
      failed
    });
  } catch (error) {
    console.error("Backfill failed:", error);
    res.status(500).send({ error: error.message });
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

/**
 * Ukentlig automatisk AI-ideegenerering for HKM Studio
 * Kjører hver mandag morgen kl 06:00
 */
exports.scheduledAiSuggestions = onSchedule({
  schedule: "0 6 * * 1",
  timeoutSeconds: 300,
  memory: "512MiB",
  secrets: [geminiApiKeyParam, emailUserParam, emailPassParam],
}, async (event) => {
  console.log("⏰ Starter ukentlig automatisk AI-ideegenerering...");

  try {
    const geminiKey = getGeminiApiKey();
    if (!geminiKey) {
      console.error("❌ Mangler Gemini API-nøkkel.");
      return;
    }

    const today = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString('no-NO', dateOptions);

    const prompt = [
      "Du er en inspirerende og strategisk innholdsrådgiver og",
      "teolog for His Kingdom Ministry (HKM).",
      "Generer tre konkrete, dype og inspirerende ideer/utkast for",
      `den kommende uken basert på dagens dato (${dateString}):`,
      "- Aktuelle kristne nyheter og happenings i Norge og globalt",
      "(f.eks. misjonsarbeid, kirkevekst, konferanser, kristent",
      "samfunnsansvar).",
      "- HKMs podcast-profil, bibelstudier og ønske om å fremme",
      "Guds rike.",
      "- Sesongen og tiden på året (f.eks. merkedager, høytider, sommer/høst/vinter/vår og kristent samfunnsliv basert på dagens dato).",
      "",
      "Du må levere nøyaktig 3 ideer:",
      "1. Ett Nyhetsbrev (newsletter) til abonnenter.",
      "2. Ett Blogginnlegg (blog) til nettsiden.",
      "3. Ett Undervisningstema (teaching) til bibelstudier/kurs.",
      "",
      "Krav til Nyhetsbrev (newsletter):",
      "- 'title': En fengende emnelinje.",
      "- 'rationale': Hvorfor dette er svært aktuelt akkurat nå",
      "(knyttet til nyheter/sosiale medier).",
      "- 'summary': En kort beskrivelse av e-postens formål.",
      "- 'blocks': Array av nyhetsbrev-blokker. Hver blokk må ha:",
      "  - 'type': Enten 'title', 'text', 'spacer', 'button' eller 'image'.",
      "  - 'content': { 'text': '...' } for title/text, { 'text': '...',",
      "'url': '...' } for button, { 'url': '...' } for image.",
      "For 'image' kan du bruke en kristen naturmotiv-URL fra Unsplash.",
      "",
      "Krav til Blogginnlegg (blog):",
      "- 'title': En engasjerende, nysgjerrigskapende tittel.",
      "- 'rationale': Begrunnelse knyttet til aktuelle samfunnstrender",
      "eller kristne nyheter.",
      "- 'verses': Relevante bibelvers (f.eks. 'Matteus 28:19').",
      "- 'outline': En array med 3-4 kulepunkter som viser seksjonene.",
      "- 'promptText': Tema-prompten vi skal sende til blogg-generatoren.",
      "",
      "Krav til Undervisning (teaching):",
      "- 'title': En dyp, bibelsk og lærerik tittel.",
      "- 'rationale': Hvorfor dette temaet trengs akkurat nå.",
      "- 'verses': Viktige skriftsteder.",
      "- 'outline': Array med 3-4 kulepunkter/leksjoner.",
      "- 'promptText': Tema-prompten vi skal sende til undervisnings-generatoren.",
      "",
      "Format: Returner KUN gyldig JSON på dette formatet:",
      "{",
      "  \"newsletter\": {",
      "    \"title\": \"...\", \"rationale\": \"...\", \"summary\": \"...\",",
      "    \"blocks\": [ ... ]",
      "  },",
      "  \"blog\": {",
      "    \"title\": \"...\", \"rationale\": \"...\", \"verses\": \"...\",",
      "    \"outline\": [ \"...\" ], \"promptText\": \"...\"",
      "  },",
      "  \"teaching\": {",
      "    \"title\": \"...\", \"rationale\": \"...\", \"verses\": \"...\",",
      "    \"outline\": [ \"...\" ], \"promptText\": \"...\"",
      "  }",
      "}",
      "Svar kun med rå JSON.",
    ].join("\n");

    const genAI = new GoogleGenerativeAI(geminiKey.trim());
    const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});
    const result = await model.generateContent(prompt);
    const textResult = (await result.response).text().trim();

    let data = null;
    const jsonMatch = textResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      data = JSON.parse(textResult);
    }

    if (data) {
      data.generatedAt = new Date().toISOString();
      if (data.newsletter) {
        data.newsletter.used = false;
      }
      if (data.blog) {
        data.blog.used = false;
      }
      if (data.teaching) {
        data.teaching.used = false;
      }

      await db.collection("ai_suggestions").doc("latest").set(data);
      console.log("✅ Ukentlige automatiske AI-ideer generert og lagret!");

      // Send automatisk påminnelse og forslag til admin-brukerne på e-post
      try {
        const emailTitle = data.newsletter?.title || "Ukens Andakt: Lær å vokse i tro og modenhet";
        const blogTitle = data.blog?.title || "Nye blogginnlegg for uken";
        const teachingTitle = data.teaching?.title || "Nytt undervisningstema";

        const htmlContent = `
<div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px 16px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
  <!-- Studio Badge -->
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; font-size: 11px; font-weight: 800; padding: 6px 16px; border-radius: 9999px; letter-spacing: 0.08em; text-transform: uppercase; display: inline-block; box-shadow: 0 4px 6px rgba(209, 125, 57, 0.15);">
      HKM Studio Assistent
    </span>
  </div>

  <!-- Headline & Subtitle -->
  <h1 style="font-size: 28px; font-weight: 850; color: #1B4965; text-align: center; margin: 0 0 16px 0; line-height: 1.2; letter-spacing: -0.03em;">
    Nye ukentlige innholdskampanjer er klare til vurdering
  </h1>
  
  <p style="font-size: 15px; line-height: 1.6; color: #475569; text-align: center; margin: 0 0 32px 0; font-weight: 500; padding: 0 16px;">
    Hei! AI-assistenten har gjort klart ukens forslag til nyhetsbrev, blogg og undervisning for deg. Gå til HKM Studio for å vurdere og godkjenne dem for sending.
  </p>

  <!-- Premium CTA Button -->
  <div style="text-align: center; margin-bottom: 40px;">
    <a href="https://hkm-dusky.vercel.app/admin/index.html#newsletter" style="display: inline-block; background-color: #1B4965; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 16px 36px; border-radius: 9999px; box-shadow: 0 10px 20px rgba(27, 73, 101, 0.22); text-transform: uppercase; letter-spacing: 0.05em;">
      Vurder og godkjenn i HKM Studio
    </a>
  </div>

  <!-- Devotional Preview Card -->
  <div style="background-color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 12px 24px rgba(15, 23, 42, 0.03); margin-bottom: 32px;">
    <img src="https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=800&h=450&q=80" width="600" alt="Åpen bibel" style="width: 100%; height: auto; max-height: 250px; object-fit: cover; display: block; border-bottom: 1px solid #e2e8f0;">
    
    <div style="padding: 24px;">
      <!-- Date Badge -->
      <div style="font-size: 11px; font-weight: 700; color: #d17d39; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.08em; line-height: 1.2;">
        <span style="color: #d17d39; font-size: 12px; vertical-align: middle; margin-right: 6px; line-height: 1;">&#9679;</span>Planlagt forslag til utsendelse
      </div>
      
      <!-- Card Title -->
      <h3 style="font-size: 18px; font-weight: 800; color: #1B4965; margin: 0 0 12px 0; line-height: 1.3; letter-spacing: -0.01em;">
        ${emailTitle}
      </h3>
      
      <!-- Suggestions Summary List -->
      <div style="margin-bottom: 20px; font-size: 13.5px; line-height: 1.6; color: #475569;">
        <p style="margin: 0 0 8px 0;"><strong>Ukens innholdsforslag:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;"><strong>Nyhetsbrev:</strong> ${emailTitle}</li>
          <li style="margin-bottom: 6px;"><strong>Blogginnlegg:</strong> ${blogTitle}</li>
          <li style="margin-bottom: 6px;"><strong>Undervisning:</strong> ${teachingTitle}</li>
        </ul>
      </div>

      <p style="font-size: 13.5px; line-height: 1.5; color: #64748b; margin: 0 0 20px 0; font-weight: 500;">
        Du kan åpne disse forslagene direkte i HKM Studio for å redigere innholdet og sende det ut til dine abonnenter.
      </p>
      
      <!-- Card CTA Link -->
      <div>
        <a href="https://hkm-dusky.vercel.app/admin/index.html#newsletter" style="text-decoration: none; display: inline-block; font-size: 13.5px; font-weight: 700; color: #d17d39;">
          Åpne i HKM Studio &rarr;
        </a>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
    <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">
      Sendt automatisk av HKM Studio Assistent
    </p>
  </div>
</div>
        `;

        await sendEmail({
          to: "post@hiskingdomministry.no, thomas@hiskingdomministry.no, knutsenthomas@gmail.com",
          subject: `[HKM Studio Assistent] 💡 Ukens innholdsforslag er klare: ${emailTitle}`,
          html: htmlContent,
          text: `Hei! AI-assistenten har gjort klart ukens forslag til nyhetsbrev: "${emailTitle}". Gå til HKM Studio for å vurdere og godkjenne dem.`,
          fromName: "HKM Studio Assistent",
          type: "automated"
        });
        console.log("✅ Automatisk e-postpåminnelse sendt til admin-brukere!");
      } catch (emailErr) {
        console.error("❌ Feil ved sending av automatisk admin-påminnelse på e-post:", emailErr);
      }
    } else {
      throw new Error("Feil i JSON-strukturen fra AI.");
    }
  } catch (error) {
    console.error("❌ Feil under planlagt AI-ideegenerering:", error);
  }
});


// =========================================================================
// GOOGLE TASKS OAUTH & SYNC CLOUD FUNCTIONS (V2 ONREQUEST WITH CORS)
// =========================================================================

exports.googleTasksAuth = onRequest({ cors: true }, async (req, res) => {
  const uid = req.query.uid;
  if (!uid) {
    return res.status(400).send("Manglende uid parameter");
  }

  try {
    const configSnap = await db.collection('settings').doc('google_tasks_config').get();
    const config = configSnap.exists ? configSnap.data() : {};
    
    const clientId = config.clientId || "842416397346-6p9b4o15t5c65f9o76191c9447e1n21g.apps.googleusercontent.com";
    
    const host = req.get('host') || "";
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('5001');
    const redirectUri = isLocal 
      ? "http://127.0.0.1:5001/his-kingdom-ministry/us-central1/googleTasksCallback"
      : "https://us-central1-his-kingdom-ministry.cloudfunctions.net/googleTasksCallback";

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("https://www.googleapis.com/auth/tasks")}` +
      `&state=${encodeURIComponent(uid)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    return res.redirect(authUrl);
  } catch (error) {
    console.error("Error in googleTasksAuth:", error);
    return res.status(500).send("Kunne ikke starte Google Tasks autorisering: " + error.message);
  }
});

exports.googleTasksCallback = onRequest({ cors: true }, async (req, res) => {
  const { code, state: uid } = req.query;
  if (!code || !uid) {
    return res.status(400).send("Manglende code eller state parameter");
  }

  try {
    const configSnap = await db.collection('settings').doc('google_tasks_config').get();
    const config = configSnap.exists ? configSnap.data() : {};
    
    const clientId = config.clientId || "842416397346-6p9b4o15t5c65f9o76191c9447e1n21g.apps.googleusercontent.com";
    const clientSecret = config.clientSecret || "GOCSPX-dummysecret";
    
    const host = req.get('host') || "";
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('5001');
    const redirectUri = isLocal 
      ? "http://127.0.0.1:5001/his-kingdom-ministry/us-central1/googleTasksCallback"
      : "https://us-central1-his-kingdom-ministry.cloudfunctions.net/googleTasksCallback";

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errText}`);
    }

    const tokens = await tokenResponse.json();

    await db.collection("user_google_credentials").doc(uid).set({
      tokens,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return res.redirect("https://hkm-dusky.vercel.app/admin/index.html#todo");
  } catch (error) {
    console.error("Error in googleTasksCallback:", error);
    return res.status(500).send("Kunne ikke fullføre Google Tasks tilkobling: " + error.message);
  }
});

exports.syncGoogleTasks = onRequest({ cors: true }, async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return res.status(204).send("");
  }

  const { uid } = req.body || req.query || {};
  if (!uid) {
    return res.status(400).send("Manglende uid parameter i forespørsel");
  }

  try {
    const credSnap = await db.collection("user_google_credentials").doc(uid).get();
    if (!credSnap.exists) {
      return res.status(401).send("Brukeren er ikke koblet til Google Tasks");
    }

    const credentials = credSnap.data();
    let tokens = credentials.tokens;

    const configSnap = await db.collection('settings').doc('google_tasks_config').get();
    const config = configSnap.exists ? configSnap.data() : {};
    
    const clientId = config.clientId || "842416397346-6p9b4o15t5c65f9o76191c9447e1n21g.apps.googleusercontent.com";
    const clientSecret = config.clientSecret || "GOCSPX-dummysecret";

    const refreshAccessToken = async (refreshToken) => {
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token"
        })
      });

      if (!refreshResponse.ok) {
        throw new Error("Kunne ikke fornye tilgangstoken med Google");
      }

      const refreshed = await refreshResponse.json();
      const updatedTokens = {
        ...tokens,
        access_token: refreshed.access_token,
        expiry_date: Date.now() + (refreshed.expires_in * 1000)
      };

      await db.collection("user_google_credentials").doc(uid).update({
        tokens: updatedTokens,
        updatedAt: FieldValue.serverTimestamp()
      });

      return refreshed.access_token;
    };

    let accessToken = tokens.access_token;
    const isExpired = tokens.expiry_date ? Date.now() >= tokens.expiry_date - 60000 : true;

    if (isExpired && tokens.refresh_token) {
      console.log("[GoogleTasks] Access token expired, refreshing...");
      accessToken = await refreshAccessToken(tokens.refresh_token);
    }

    const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!listsRes.ok) {
      throw new Error(`Klarte ikke å hente oppgavelister: ${await listsRes.text()}`);
    }

    const listsData = await listsRes.json();
    const defaultList = listsData.items && listsData.items[0];
    if (!defaultList) {
      throw new Error("Fant ingen standard oppgaveliste i Google Tasks");
    }

    const listId = defaultList.id;

    const googleTasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true&showHidden=true`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!googleTasksRes.ok) {
      throw new Error(`Klarte ikke å hente oppgaver fra Google: ${await googleTasksRes.text()}`);
    }

    const googleTasksData = await googleTasksRes.json();
    const googleTasks = googleTasksData.items || [];

    const firestoreTasksSnap = await db.collection("tasks").where("status", "!=", "arkivert").get();
    const firestoreTasks = [];
    firestoreTasksSnap.forEach(doc => {
      firestoreTasks.push({ id: doc.id, ...doc.data() });
    });

    const googleTaskMap = new Map(googleTasks.map(t => [t.id, t]));
    const firestoreTaskMap = new Map(firestoreTasks.map(t => [t.googleTaskId || t.id, t]));

    for (const fTask of firestoreTasks) {
      const gTask = fTask.googleTaskId ? googleTaskMap.get(fTask.googleTaskId) : null;

      if (!gTask) {
        const priorityTag = `[${fTask.priority.toUpperCase()}] `;
        const newGTaskRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: fTask.title,
            notes: priorityTag + (fTask.description || ""),
            status: fTask.status === "fullført" ? "completed" : "needsAction",
            due: fTask.dueDate ? new Date(fTask.dueDate).toISOString() : undefined
          })
        });

        if (newGTaskRes.ok) {
          const newGTask = await newGTaskRes.json();
          await db.collection("tasks").doc(fTask.id).update({
            googleTaskId: newGTask.id,
            googleListId: listId,
            updated_at: FieldValue.serverTimestamp()
          });
          console.log(`[GoogleTasks] Created task "${fTask.title}" in Google Tasks.`);
        }
      } else {
        const gCompleted = gTask.status === "completed";
        const fCompleted = fTask.status === "fullført";

        if (gCompleted !== fCompleted) {
          const fUpdated = fTask.updated_at 
            ? (typeof fTask.updated_at.toDate === 'function' ? fTask.updated_at.toDate().getTime() : new Date(fTask.updated_at).getTime()) 
            : 0;
          const gUpdated = gTask.updated ? Date.parse(gTask.updated) : 0;

          if (fUpdated >= gUpdated) {
            // Firestore is newer: update Google Tasks to match Firestore
            const patchRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${gTask.id}`, {
              method: "PATCH",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                status: fCompleted ? "completed" : "needsAction"
              })
            });

            if (patchRes.ok) {
              console.log(`[GoogleTasks] Synced Firestore status "${fTask.status}" to Google Task "${fTask.title}".`);
            } else {
              console.warn(`[GoogleTasks] Failed to sync status to Google Task: ${await patchRes.text()}`);
            }
          } else {
            // Google Tasks is newer: update Firestore to match Google Tasks
            if (gCompleted) {
              await db.collection("tasks").doc(fTask.id).update({
                status: "fullført",
                completed_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
              });
              console.log(`[GoogleTasks] Completed Firestore task "${fTask.title}" based on Google.`);
            } else {
              await db.collection("tasks").doc(fTask.id).update({
                status: "gjeldende",
                completed_at: null,
                updated_at: FieldValue.serverTimestamp()
              });
              console.log(`[GoogleTasks] Uncompleted Firestore task "${fTask.title}" based on Google.`);
            }
          }
        }
      }
    }

    for (const gTask of googleTasks) {
      if (gTask.deleted || gTask.hidden) continue;

      const fTask = firestoreTaskMap.get(gTask.id);
      if (!fTask) {
        let priority = "medium";
        let title = gTask.title || "Uten tittel";
        let description = gTask.notes || "";

        if (description.startsWith("[HIGH]")) {
          priority = "high";
          description = description.replace("[HIGH]", "").trim();
        } else if (description.startsWith("[MEDIUM]")) {
          priority = "medium";
          description = description.replace("[MEDIUM]", "").trim();
        } else if (description.startsWith("[LOW]")) {
          priority = "low";
          description = description.replace("[LOW]", "").trim();
        }

        const dueDate = gTask.due ? gTask.due.split("T")[0] : "";
        const status = gTask.status === "completed" ? "fullført" : "gjeldende";

        await db.collection("tasks").add({
          title,
          description,
          priority,
          status,
          dueDate,
          opprettet_av: uid,
          tildelt_til: [],
          googleTaskId: gTask.id,
          googleListId: listId,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
          completed_at: status === "fullført" ? FieldValue.serverTimestamp() : null
        });

        console.log(`[GoogleTasks] Created Firestore task "${title}" based on Google Tasks.`);
      }
    }

    return res.status(200).json({ success: true, message: "Synkronisering fullført" });
  } catch (error) {
    console.error("Error in syncGoogleTasks:", error);
    return res.status(500).send("Kunne ikke synkronisere oppgaver: " + error.message);
  }
});

exports.getBibleChapterAudio = onCall({
  cors: true,
  secrets: [openaiApiKeyParam],
  timeoutSeconds: 300,
  memory: "512MiB"
}, async (request) => {
  const { bookId, chapterNum, lang, text, voice } = request.data || {};

  if (!bookId || !chapterNum || !lang || !text) {
    throw new HttpsError("invalid-argument", "Mangler nødvendige parametere (bookId, chapterNum, lang, text).");
  }

  const cleanLang = String(lang).toLowerCase();
  const cleanBookId = String(bookId).toLowerCase();
  const cleanChapterNum = String(chapterNum);
  const cleanText = String(text).trim();
  let cleanVoice = String(voice || 'onyx').toLowerCase();
  if (!['onyx', 'nova', 'alloy', 'echo', 'shimmer', 'fable'].includes(cleanVoice)) {
    cleanVoice = 'onyx';
  }

  if (cleanText.length < 5) {
    throw new HttpsError("invalid-argument", "Teksten er for kort til å generere lyd.");
  }

  const bucket = admin.storage().bucket();
  const filePath = `bible_audio/${cleanLang}/${cleanBookId}_${cleanChapterNum}_${cleanVoice}.mp3`;
  const file = bucket.file(filePath);

  try {
    // 1. Sjekk om filen allerede er cachet i Storage
    const [exists] = await file.exists();
    if (exists) {
      console.log(`Lydfil allerede cachet i Storage: ${filePath}`);
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      return { success: true, audioUrl: publicUrl };
    }

    // 2. Bakoverkompatibilitet: Sjekk om gammel fil uten suffix finnes (kun for default 'onyx' stemme)
    if (cleanVoice === 'onyx') {
      const oldFilePath = `bible_audio/${cleanLang}/${cleanBookId}_${cleanChapterNum}.mp3`;
      const oldFile = bucket.file(oldFilePath);
      const [oldExists] = await oldFile.exists();
      if (oldExists) {
        console.log(`Gammel lydfil uten suffix finnes for onyx. Kopierer til ny sti: ${filePath}`);
        await oldFile.copy(file);
        try {
          await file.makePublic();
        } catch (copyMakePublicError) {
          console.warn("Kunne ikke gjøre kopiert fil offentlig:", copyMakePublicError);
        }
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        return { success: true, audioUrl: publicUrl };
      }
    }
  } catch (storageError) {
    console.error("Feil ved sjekk av storage-eksistens, fortsetter med generering:", storageError);
  }

  try {
    console.log(`Genererer lyd for ${cleanBookId} kapittel ${cleanChapterNum} (${cleanText.length} tegn) med stemme ${cleanVoice}...`);

  // Del opp teksten i deler på maks 3800 tegn (både OpenAI og GCTS har grenser)
  const chunks = [];
  let currentText = cleanText;

  while (currentText.length > 0) {
    if (currentText.length <= 3800) {
      chunks.push(currentText);
      break;
    }

    // Finn siste avsnitts- eller setningsgrense innenfor de første 3800 tegnene
    let splitIndex = currentText.lastIndexOf('\n', 3800);
    if (splitIndex === -1 || splitIndex < 1000) {
      splitIndex = currentText.lastIndexOf('. ', 3800);
    }
    if (splitIndex === -1 || splitIndex < 1000) {
      splitIndex = 3800; // Hard deling hvis ingen god grense finnes
    } else {
      splitIndex += 1; // Inkluder punktum eller linjeskift
    }

    chunks.push(currentText.substring(0, splitIndex).trim());
    currentText = currentText.substring(splitIndex).trim();
  }

  console.log(`Delt opp kapittelteksten i ${chunks.length} deler for TTS-generering.`);

  let buffers = [];
  let success = false;

  // 1. Forsøk OpenAI TTS først for naturlig og levende opplesning (Onyx/Nova stemmene)
  try {
    const openaiKey = openaiApiKeyParam.value();
    if (!openaiKey) {
      throw new Error("OpenAI API-nøkkel mangler, hopper til Google Cloud TTS.");
    }

    console.log(`Forsøker OpenAI TTS med stemme ${cleanVoice} (naturlig stemme)...`);
    const openai = new OpenAI({ apiKey: openaiKey });

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Genererer OpenAI del ${i + 1}/${chunks.length}...`);
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: cleanVoice,
        input: chunks[i],
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      buffers.push(buffer);
    }
    success = true;
    console.log("Lydfil vellykket generert med OpenAI TTS!");
  } catch (openaiError) {
    console.warn("OpenAI TTS feilet, faller tilbake til Google Cloud TTS:", openaiError.message || openaiError);
    buffers = []; // Nullstill bufferne for fallback
  }

  // 2. Fallback til Google Cloud Text-to-Speech (GCTS)
  if (!success) {
    try {
      const isFemale = cleanVoice === 'nova';
      let primaryConfig;
      let fallbackConfig;

      if (cleanLang.startsWith('en')) {
        primaryConfig = {
          languageCode: 'en-US',
          name: isFemale ? 'en-US-Neural2-F' : 'en-US-Neural2-J',
          ssmlGender: isFemale ? 'FEMALE' : 'MALE'
        };
        fallbackConfig = {
          languageCode: 'en-US',
          name: isFemale ? 'en-US-Wavenet-F' : 'en-US-Wavenet-D',
          ssmlGender: isFemale ? 'FEMALE' : 'MALE'
        };
      } else if (cleanLang.startsWith('es')) {
        primaryConfig = {
          languageCode: 'es-ES',
          name: isFemale ? 'es-ES-Neural2-F' : 'es-ES-Neural2-B',
          ssmlGender: isFemale ? 'FEMALE' : 'MALE'
        };
        fallbackConfig = {
          languageCode: 'es-ES',
          name: isFemale ? 'es-ES-Wavenet-C' : 'es-ES-Wavenet-B',
          ssmlGender: isFemale ? 'FEMALE' : 'MALE'
        };
      } else {
        // Standard: Norsk (no)
        primaryConfig = {
          languageCode: 'nb-NO',
          name: isFemale ? 'nb-NO-Neural2-F' : 'nb-NO-Neural2-B',
          ssmlGender: isFemale ? 'FEMALE' : 'MALE'
        };
        fallbackConfig = {
          languageCode: 'nb-NO',
          name: isFemale ? 'nb-NO-Wavenet-A' : 'nb-NO-Wavenet-B',
          ssmlGender: isFemale ? 'FEMALE' : 'MALE'
        };
      }

      console.log(`Prøver Google Cloud TTS fallback (Neural2: ${primaryConfig.name})...`);
      const ttsClient = new textToSpeech.TextToSpeechClient();

      for (let i = 0; i < chunks.length; i++) {
        console.log(`Genererer GCTS fallback del ${i + 1}/${chunks.length}...`);
        let response;
        try {
          [response] = await ttsClient.synthesizeSpeech({
            input: { text: chunks[i] },
            voice: primaryConfig,
            audioConfig: { audioEncoding: 'MP3' },
          });
        } catch (neuralError) {
          console.warn(`GCTS Neural2 fallback feilet, prøver WaveNet fallback (${fallbackConfig.name}):`, neuralError);
          [response] = await ttsClient.synthesizeSpeech({
            input: { text: chunks[i] },
            voice: fallbackConfig,
            audioConfig: { audioEncoding: 'MP3' },
          });
        }

        if (!response || !response.audioContent) {
          throw new Error("Mottok ikke lydinnhold fra Google Cloud TTS.");
        }

        const buffer = Buffer.from(response.audioContent, 'base64');
        buffers.push(buffer);
      }

      success = true;
      console.log("Lydfil vellykket generert med Google Cloud TTS fallback!");
    } catch (gctsError) {
      console.error("Google Cloud TTS fallback feilet også:", gctsError);
      throw new HttpsError("internal", "Kunne ikke generere lyd med noen av TTS-motorene: " + gctsError.message);
    }
  }

  // Sett sammen MP3-bufferne til én fil
  const combinedBuffer = Buffer.concat(buffers);

    // Lagre til Firebase Storage
    await file.save(combinedBuffer, {
      contentType: "audio/mpeg",
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=31536000"
      }
    });

    try {
      await file.makePublic();
    } catch (makePublicError) {
      console.warn("Kunne ikke gjøre filen offentlig tilgjengelig:", makePublicError);
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    console.log(`Lydfil vellykket generert og lagret: ${publicUrl}`);
    return { success: true, audioUrl: publicUrl };

  } catch (error) {
    console.error("Feil ved generering av bibellyd:", error);
    throw new HttpsError("internal", `Kunne ikke generere lyd for kapittelet: ${error.message}`);
  }
});

/**
 * Daglig planlagt jobb for å sende leseplanpåminnelser (både push-varsel og e-post).
 * Kjører hver dag klokken 07:00.
 */
exports.scheduledReadingNotifications = onSchedule("0 * * * *", async (event) => {
  const osloHour = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Oslo" })).getHours();
  console.log(`⏰ Starter kjøring av leseplanvarslinger for time ${osloHour}:00 (Oslo-tid)...`);

  try {
    // 1. Hent alle brukere
    const usersSnap = await db.collection("users").get();
    console.log(`Fant ${usersSnap.size} brukere i databasen.`);

    for (const userDoc of usersSnap.docs) {
      try {
        const userData = userDoc.data();
      const userId = userDoc.id;

      // Sjekk om denne timen matcher brukerens foretrukne time (standard er 7)
      const prefHour = userData.readingPlanNotificationHour !== undefined ? Number(userData.readingPlanNotificationHour) : 7;
      if (prefHour !== osloHour) {
        continue;
      }

      // Sjekk om brukeren har aktivert e-post eller push for leseplaner
      const wantPush = userData.pushEnabled !== false && userData.pushReadingPlans !== false;
      const wantEmail = userData.emailConsent !== false && userData.emailReadingPlans !== false && userData.email;

      if (!wantPush && !wantEmail) {
        continue;
      }

      // 2. Hent aktive (ikke fullførte) leseplaner for denne brukeren
      const activePlansSnap = await db.collection("users")
        .doc(userId)
        .collection("reading_plans")
        .where("completed", "==", false)
        .get();

      if (activePlansSnap.empty) {
        continue;
      }

      // Send varsling for hver aktive plan
      for (const activePlanDoc of activePlansSnap.docs) {
        const activePlanData = activePlanDoc.data();
        const planId = activePlanData.planId;
        const currentDayNum = activePlanData.currentDay || 1;

        // Hent global leseplan-informasjon
        const globalPlanSnap = await db.collection("reading_plans").doc(planId).get();
        if (!globalPlanSnap.exists) {
          console.warn(`Leseplan ${planId} finnes ikke i den globale samlingen.`);
          continue;
        }

        const globalPlanData = globalPlanSnap.data();
        const planTitle = globalPlanData.title;

        // Finn konfigurasjonen for gjeldende dag
        const currentDayConfig = (globalPlanData.days || []).find(d => d.dayNumber === currentDayNum);
        if (!currentDayConfig) {
          console.warn(`Fant ikke dag ${currentDayNum} i leseplan ${planId}.`);
          continue;
        }

        const verses = currentDayConfig.verses || "";
        const prayerFocus = currentDayConfig.prayerFocus || "Be over ordene du har lest i dag.";

        // Bygg HTML-kortet for dagens lesing
        const readingContentHtml = `
          <div class="hkm-reading-card" style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; text-align: left;">
            <span style="display: block; font-size: 11px; font-weight: 800; color: #d17d39; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; line-height: 1;">Dagens lesing</span>
            <h3 class="hkm-reading-title" style="margin: 0 0 4px 0; color: #1B4965; font-size: 20px; font-weight: 800; line-height: 1.2; word-break: normal; overflow-wrap: break-word;">Dag \${currentDayNum} - \${planTitle}</h3>
            <p style="margin: 0 0 16px 0; color: #475569; font-weight: 600; font-size: 15px; word-break: normal; overflow-wrap: break-word;">Bibeltekst: \${verses}</p>

            <!-- Devotional Box -->
            <div class="hkm-devotional-box" style="background-color: #f8fafc; border-left: 5px solid #d17d39; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 32px; text-align: left;">
              <strong style="color: #d17d39; display: block; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; line-height: 1.2; word-break: normal; overflow-wrap: break-word;">Dagens Andakt & Bønn</strong>
              <p style="margin: 0; color: #334155; font-size: 15.5px; line-height: 1.65; font-weight: 500; word-break: normal; overflow-wrap: break-word;">\${prayerFocus}</p>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="https://www.hiskingdomministry.no/bibel.html?plan=\${planId}&day=\${currentDayNum}" style="background-color: #c8682a; color: #ffffff; padding: 12px 28px; border-radius: 9999px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(200, 104, 42, 0.2);">
                Fortsett lesingen i nettleser
              </a>
            </div>
          </div>
        `;

        // A. Send Push-varsel hvis aktivert
        if (wantPush && userData.fcmTokens && userData.fcmTokens.length > 0) {
          const pushTitle = `📖 Dagens bibellesing: Dag ${currentDayNum}`;
          const pushBody = `Dagens tekst er ${verses} fra leseplanen "${planTitle}". Klikk her for å åpne.`;

          console.log(`Sender push-varsel til bruker ${userId} for plan ${planId}...`);
          for (const token of userData.fcmTokens) {
            try {
              const message = {
                token: token,
                notification: {
                  title: pushTitle,
                  body: pushBody
                },
                data: {
                  click_action: `https://www.hiskingdomministry.no/bibel.html?plan=${planId}&day=${currentDayNum}`,
                  planId: planId,
                  dayNumber: String(currentDayNum)
                }
              };
              await admin.messaging().send(message);
              console.log(`Push-varsel sendt til token for bruker ${userId}`);
            } catch (pushErr) {
              console.warn(`Kunne ikke sende push til token for bruker ${userId}:`, pushErr.message);
            }
          }
        }

        // B. Send E-post hvis aktivert
        if (wantEmail) {
          console.log(`Sender daglig leseplan-epost til bruker ${userId} (${userData.email})...`);

          const defaultFallbackBody = `<style>
  @media only screen and (max-width: 600px) {
    .hkm-email-container {
      padding: 0 !important;
    }
    .hkm-email-card {
      border-radius: 0 !important;
      border-left: none !important;
      border-right: none !important;
      box-shadow: none !important;
    }
    .hkm-email-header {
      padding: 24px 16px 16px 16px !important;
    }
    .hkm-email-body {
      padding: 20px 12px !important;
    }
    .hkm-reading-card {
      padding: 12px !important;
      margin: 12px 0 !important;
      border-radius: 8px !important;
    }
    .hkm-devotional-box {
      padding: 12px !important;
      margin-bottom: 20px !important;
      border-radius: 0 8px 8px 0 !important;
    }
    .hkm-email-footer {
      padding: 24px 16px !important;
    }
    .hkm-reading-title {
      font-size: 18px !important;
    }
  }
</style>
<div class="hkm-email-container" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; text-align: center; margin: 0 auto; max-width: 600px;">
  <div class="hkm-email-card" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: left;">
    
    <!-- Header -->
    <div class="hkm-email-header" style="background-color: #ffffff; padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
      <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 50px; width: auto; margin-bottom: 12px; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #1B4965; letter-spacing: -0.02em;">His Kingdom Ministry</h1>
    </div>

    <!-- Body -->
    <div class="hkm-email-body" style="padding: 32px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
      <h2>Hei {{name}}!</h2>
      <p>Her er dagens oppdatering for din aktive leseplan. Vi ber om at dagens ord må være til velsignelse og styrke for deg.</p>

      <!-- Dagens lesekort -->
      <div class="hkm-reading-card" style="background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; text-align: left;">
        <span style="display: block; font-size: 11px; font-weight: 800; color: #d17d39; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; line-height: 1;">Dagens lesing</span>
        <h3 class="hkm-reading-title" style="margin: 0 0 4px 0; color: #1B4965; font-size: 20px; font-weight: 800; line-height: 1.2; word-break: normal; overflow-wrap: break-word;">Dag {{day}} - {{title}}</h3>
        <p style="margin: 0 0 16px 0; color: #475569; font-weight: 600; font-size: 15px; word-break: normal; overflow-wrap: break-word;">Bibeltekst: {{passage}}</p>

        <!-- Devotional Box -->
        <div class="hkm-devotional-box" style="background-color: #f8fafc; border-left: 5px solid #d17d39; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 32px; text-align: left;">
          <strong style="color: #d17d39; display: block; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; line-height: 1.2; word-break: normal; overflow-wrap: break-word;">Dagens Andakt & Bønn</strong>
          <p style="margin: 0; color: #334155; font-size: 15.5px; line-height: 1.65; font-weight: 500; word-break: normal; overflow-wrap: break-word;">{{devotional}}</p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://www.hiskingdomministry.no/leseplan-detaljer?id={{planId}}&day={{day}}" style="background-color: #c8682a; color: #ffffff; padding: 12px 28px; border-radius: 9999px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(200, 104, 42, 0.2);">
            Fortsett lesingen i nettleser
          </a>
        </div>
      </div>

      <p>Ha en velsignet dag!</p>
      <p>Vennlig hilsen,<br><strong>His Kingdom Ministry</strong></p>
    </div>

    <!-- Footer -->
    <div class="hkm-email-footer" style="background-color: #f8fafc; padding: 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5;">
      <p style="margin: 0 0 8px 0; font-weight: 500;">© 2026 His Kingdom Ministry. Alle rettigheter reservert.</p>
      <p style="margin: 0;"><a href="https://www.hiskingdomministry.no/minside" style="color: #1B4965; text-decoration: underline; font-weight: 600;">Endre dine varslingsinnstillinger</a></p>
    </div>
  </div>
</div>`;

          const defaultFallback = {
            subject: "Dagens bibellesing: Dag {{day}} - {{title}}",
            body: defaultFallbackBody
          };
          const template = await getEmailTemplate("daily_bible_reading", defaultFallback);

          const name = userData.displayName || "bibelleser";
          const emailSubject = template.subject
            .replace(/\{\{day\}\}/g, String(currentDayNum))
            .replace(/\{\{title\}\}/g, planTitle);

          let html = template.body;
          if (html.includes("{{reading_content}}")) {
            // Backward compatibility with simplified template
            html = html.replace(/\{\{reading_content\}\}/g, readingContentHtml);
            html = `
              <style>
                @media only screen and (max-width: 600px) {
                  .hkm-email-container {
                    padding: 0 !important;
                  }
                  .hkm-email-card {
                    border-radius: 0 !important;
                    border-left: none !important;
                    border-right: none !important;
                    box-shadow: none !important;
                  }
                  .hkm-email-header {
                    padding: 24px 16px 16px 16px !important;
                  }
                  .hkm-email-body {
                    padding: 20px 12px !important;
                  }
                  .hkm-reading-card {
                    padding: 12px !important;
                    margin: 12px 0 !important;
                    border-radius: 8px !important;
                  }
                  .hkm-devotional-box {
                    padding: 12px !important;
                    margin-bottom: 20px !important;
                    border-radius: 0 8px 8px 0 !important;
                  }
                  .hkm-email-footer {
                    padding: 24px 16px !important;
                  }
                  .hkm-reading-title {
                    font-size: 18px !important;
                  }
                }
              </style>
              <div class="hkm-email-container" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; text-align: center; margin: 0 auto; max-width: 600px;">
                <div class="hkm-email-card" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; text-align: left;">
                  <!-- Header -->
                  <div class="hkm-email-header" style="background-color: #ffffff; padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                    <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" style="height: 50px; width: auto; margin-bottom: 12px; display: inline-block; vertical-align: middle;" alt="His Kingdom Ministry Logo">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #1B4965; letter-spacing: -0.02em;">His Kingdom Ministry</h1>
                  </div>

                  <!-- Body -->
                  <div class="hkm-email-body" style="padding: 32px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
                    ${html}
                  </div>

                  <!-- Footer -->
                  <div class="hkm-email-footer" style="background-color: #f8fafc; padding: 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5;">
                    <p style="margin: 0 0 8px 0; font-weight: 500;">© 2026 His Kingdom Ministry. Alle rettigheter reservert.</p>
                    <p style="margin: 0;"><a href="https://www.hiskingdomministry.no/minside" style="color: #1B4965; text-decoration: underline; font-weight: 600;">Endre dine varslingsinnstillinger</a></p>
                  </div>
                </div>
              </div>
            `;
          } else {
            // Full HTML template, replace fields directly
            html = html
              .replace(/\{\{name\}\}/g, name)
              .replace(/\{\{day\}\}/g, String(currentDayNum))
              .replace(/\{\{title\}\}/g, planTitle)
              .replace(/\{\{passage\}\}/g, verses)
              .replace(/\{\{devotional\}\}/g, prayerFocus)
              .replace(/\{\{planId\}\}/g, planId);
          }

          try {
            await sendEmail({
              to: userData.email,
              subject: emailSubject,
              html: html,
              text: `Dagens bibellesing: Dag ${currentDayNum} - ${verses}.`
            });
            console.log(`Leseplan-epost vellykket sendt til ${userData.email}`);
          } catch (emailErr) {
            console.error(`Kunne ikke sende leseplan-epost til ${userData.email}:`, emailErr);
          }
        }
      }
    } catch (userErr) {
      console.error(`Feil under behandling av varsling for bruker ${userDoc.id}:`, userErr);
    }
  }
    console.log("Daglig kjøring av leseplanvarslinger fullført.");
  } catch (err) {
    console.error("Feil under kjøring av leseplanvarslinger:", err);
  }
});

/**
 * Trigger som sender push og e-post når et nytt varsel opprettes i 'user_notifications'.
 */
exports.onNotificationCreated = onDocumentCreated({
  document: "user_notifications/{id}",
  secrets: [emailUserParam, emailPassParam],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const notifData = snapshot.data();
  const userId = notifData.userId;
  const title = notifData.title || "Nytt varsel";
  const message = notifData.message || "";
  const type = notifData.type || "";

  if (!userId) return;

  try {
    // 1. Hent brukerens profil
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.log(`Bruker ${userId} finnes ikke.`);
      return;
    }
    const userData = userDoc.data();
    const email = userData.email;
    const name = userData.displayName || userData.fullName || "venn";

    // 2. Sjekk samtykke / preferanser
    const wantPush = userData.pushEnabled !== false;
    const wantEmail = userData.emailConsent !== false && email;

    // 3. Send Push-varsel hvis aktivert og har tokens
    if (wantPush && userData.fcmTokens && userData.fcmTokens.length > 0) {
      console.log(`Sender push-varsel til bruker ${userId}...`);
      for (const token of userData.fcmTokens) {
        try {
          const pushMessage = {
            token: token,
            notification: {
              title: title,
              body: message
            },
            data: {
              click_action: `https://www.hiskingdomministry.no/minside/`,
              type: type
            }
          };
          await admin.messaging().send(pushMessage);
          console.log(`Push-varsel sendt til token for bruker ${userId}`);
        } catch (pushErr) {
          console.warn(`Kunne ikke sende push til token for bruker ${userId}:`, pushErr.message);
        }
      }
    }

    // 4. Send e-post hvis aktivert
    if (wantEmail) {
      console.log(`Sender varsel e-post til bruker ${userId} (${email})...`);
      
      const subject = `Nytt varsel: ${title}`;
      
      // En kjempefin HTML-mal i stil med HKM
      const html = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px 12px; margin: 0 auto; max-width: 600px; border-radius: 12px; border: 1px solid #e2e8f0; box-sizing: border-box;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="https://www.hiskingdomministry.no/img/logo-hkm.png" alt="His Kingdom Ministry" style="height: 60px; width: auto;">
          </div>
          
          <div style="background-color: #ffffff; padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); margin-bottom: 24px;">
            <h2 style="color: #1B4965; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">
              ${title}
            </h2>
            
            <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
              Hei ${name},
            </p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #d17d39; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <p style="margin: 0; color: #334155; font-size: 15.5px; line-height: 1.6; font-weight: 500;">
                ${message}
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://www.hiskingdomministry.no/minside/" style="background: linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%); color: #ffffff; padding: 12px 28px; border-radius: 9999px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(200, 104, 42, 0.2);">
                Gå til Min Side
              </a>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; padding: 0 16px;">
            <p style="margin: 0 0 8px 0;">Dette er et automatisk varsel sendt til deg fra His Kingdom Ministry.</p>
            <p style="margin: 0;">Du kan endre dine varslingsinnstillinger under Profil på Min Side.</p>
          </div>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: subject,
        html: html,
        fromName: "His Kingdom Ministry"
      });
      console.log(`Varsel e-post sendt til ${email}`);
    }

  } catch (err) {
    console.error("Feil under behandling av varsling:", err);
  }
});
