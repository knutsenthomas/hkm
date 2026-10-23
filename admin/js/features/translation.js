// translation methods for AdminManager.
export function createTranslationMethods({ firebaseService, adminUtils, showErrorUI }) {
  return {
    _buildBlogTranslationSourceHash(post) {
      if (!post || typeof post !== "object") return this._hashString("");
      // Only hash stable text fields — content is an EditorJS object whose `time`
      // field changes on every open, which would make the hash unstable.
      const keyVersesStr = (Array.isArray(post.keyVerses) ? post.keyVerses : [])
        .map((kv) => `${kv?.reference || ""}:${kv?.text || ""}`)
        .join(",");
      const questionsStr = (
        Array.isArray(post.discussionQuestions) ? post.discussionQuestions : []
      ).join(",");
      const payload = [
        post.title || "",
        post.category || "",
        post.seoTitle || "",
        post.seoDescription || "",
        post.text || "",
        post.summary || "",
        post.description || "",
        keyVersesStr,
        questionsStr,
        (Array.isArray(post.tags) ? post.tags : []).join(","),
      ].join("|");
      return this._hashString(payload);
    },

    _isLikelyNonTranslatableToken(value) {
      const str = String(value || "").trim();
      if (!str) return true;
      if (/^(https?:\/\/|www\.)/i.test(str)) return true;
      if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(str)) return true;
      if (/^[\d\s.,:/-]+$/.test(str)) return true;
      if (/^[a-f0-9-]{16,}$/i.test(str)) return true;
      return false;
    },

    _splitTextForTranslation(value, maxChunkLength = 450) {
      const raw = String(value || "");
      if (!raw.trim()) return [];
      if (raw.length <= maxChunkLength) return [raw];

      const chunks = [];
      const paragraphs = raw.split("\n");
      paragraphs.forEach((paragraph) => {
        if (!paragraph) {
          chunks.push("\n");
          return;
        }

        if (paragraph.length <= maxChunkLength) {
          chunks.push(paragraph);
          return;
        }

        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        let current = "";
        sentences.forEach((sentence) => {
          if (!sentence) return;
          const candidate = current ? `${current} ${sentence}` : sentence;
          if (candidate.length > maxChunkLength) {
            if (current) chunks.push(current);
            if (sentence.length <= maxChunkLength) {
              current = sentence;
            } else {
              const words = sentence.split(/\s+/);
              let longCurrent = "";
              words.forEach((word) => {
                const longCandidate = longCurrent
                  ? `${longCurrent} ${word}`
                  : word;
                if (longCandidate.length > maxChunkLength) {
                  if (longCurrent) chunks.push(longCurrent);
                  longCurrent = word;
                } else {
                  longCurrent = longCandidate;
                }
              });
              if (longCurrent) chunks.push(longCurrent);
              current = "";
            }
          } else {
            current = candidate;
          }
        });
        if (current) chunks.push(current);
      });

      return chunks;
    },

    async _getTranslationSettings(forceReload = false) {
      const now = Date.now();
      if (
        !forceReload &&
        this._translationSettingsCache &&
        now - this._translationSettingsCacheLoadedAt < 5 * 60 * 1000
      ) {
        return this._translationSettingsCache;
      }

      let settings = {};
      try {
        settings =
          (await firebaseService.getPageContent("settings_integrations")) || {};
      } catch (error) {
        console.warn(
          "[AdminManager] Could not load translation settings, using defaults.",
          error,
        );
      }

      const translation =
        settings.translation && typeof settings.translation === "object"
          ? settings.translation
          : {};
      const fallbackGeminiKey = String(
        translation.geminiApiKey ||
          settings.googleAI?.apiKey ||
          settings.googleAi?.apiKey ||
          "",
      ).trim();

      const provider =
        String(translation.provider || "google").toLowerCase() === "gemini"
          ? "gemini"
          : "google";

      this._translationSettingsCache = {
        provider,
        geminiApiKey: fallbackGeminiKey,
        geminiModel:
          String(translation.geminiModel || "gemini-1.5-flash").trim() ||
          "gemini-1.5-flash",
      };
      this._translationSettingsCacheLoadedAt = now;

      return this._translationSettingsCache;
    },

    _extractGeminiText(responseJson) {
      const candidates = Array.isArray(responseJson?.candidates)
        ? responseJson.candidates
        : [];
      for (const candidate of candidates) {
        const parts = Array.isArray(candidate?.content?.parts)
          ? candidate.content.parts
          : [];
        const text = parts
          .map((part) => (typeof part?.text === "string" ? part.text : ""))
          .join("")
          .trim();
        if (text) return text;
      }
      return "";
    },

    _sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    _isTranslationQuotaExceededMessage(value) {
      const text = String(value || "").toLowerCase();
      return (
        text.includes("used all available free translations for today") ||
        text.includes("next available in")
      );
    },

    _buildMyMemoryQuotaErrorMessage(details) {
      const raw = String(details || "");
      const nextMatch = raw.match(/NEXT AVAILABLE IN\s+(.+?)\s+VISIT/i);
      const nextWindow = nextMatch && nextMatch[1] ? nextMatch[1].trim() : null;

      if (nextWindow) {
        return `MyMemory dagskvote er brukt opp. Neste tilgjengelige vindu er om ca. ${nextWindow}.`;
      }

      return "MyMemory dagskvote er brukt opp. Prøv igjen senere eller bytt til Gemini i integrasjonsinnstillinger.";
    },

    _getCallableErrorMessage(error, fallbackMessage = "Ukjent feil.") {
      const detailMessage =
        typeof error?.details === "string" ? error.details.trim() : "";
      const rawMessage =
        typeof error?.message === "string" ? error.message.trim() : "";
      const code = typeof error?.code === "string" ? error.code.trim() : "";

      const cleanedRawMessage = rawMessage
        .replace(/^(functions\/)?[a-z-]+:\s*/i, "")
        .trim();

      if (detailMessage) return detailMessage;
      if (cleanedRawMessage && !/^internal$/i.test(cleanedRawMessage))
        return cleanedRawMessage;

      if (code === "resource-exhausted") {
        return "Gemini API-kvoten er brukt opp akkurat nå. Vent litt og prøv igjen.";
      }

      if (code === "unauthenticated") {
        return "Du må være logget inn for å bruke denne funksjonen.";
      }

      if (code === "invalid-argument") {
        return "Det mangler nødvendig data for å kjøre AI-genereringen.";
      }

      return fallbackMessage;
    },

    async testTranslation() {
      const button = document.getElementById("test-translation");
      const output = document.getElementById("translation-test-result");
      button.disabled = true;
      output.textContent = "Tester oversettelse …";
      try {
        const results = [];
        for (const lang of ["en", "es"]) {
          const translated = await this._translateTextChunk(
            "Gud er god",
            lang,
            "no",
            true,
          );
          if (!this._isMeaningfullyTranslatedField("Gud er god", translated)) {
            throw new Error(
              "Oversettelsestjenesten returnerte originalteksten.",
            );
          }
          results.push(`${lang}: ${translated}`);
        }
        output.textContent = results.join(" · ");
      } catch (error) {
        output.textContent = `Oversettelse utilgjengelig: ${error.message}`;
      } finally {
        button.disabled = false;
      }
    },

    async _diagnoseTranslationProviders() {
      const settings = await this._getTranslationSettings();
      const out = {
        hasGeminiKey: !!settings.geminiApiKey,
        gemini: "not-tested",
        myMemory: "disabled",
        google: "unknown",
      };
      try {
        const result = await this._translateTextChunkWithGoogleTranslate(
          "Gud er god",
          "en",
          "no",
        );
        out.google = this._isMeaningfullyTranslatedField("Gud er god", result)
          ? "ok"
          : "no-op";
      } catch (error) {
        out.google = "error:" + error.message;
      }
      return out;
    },

    async _fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        Math.max(1000, Number(timeoutMs) || 30000),
      );
      try {
        return await fetch(url, {
          ...options,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    },

    async _throttleMyMemory(minIntervalMs = 800) {
      const now = Date.now();
      const last = Number(this._myMemoryLastRequestAt || 0);
      const waitMs = Math.max(0, minIntervalMs - (now - last));
      if (waitMs > 0) {
        await this._sleep(waitMs);
      }
      this._myMemoryLastRequestAt = Date.now();
    },

    async _translateTextChunkWithMyMemory(raw, targetLang, sourceLang = "no") {
      const blockedUntil = Number(this._myMemoryBlockedUntil || 0);
      if (blockedUntil > Date.now()) {
        throw new Error(
          "MyMemory er midlertidig rate-limitet. Prøv igjen om et par minutter.",
        );
      }

      const mapMyMemoryLang = (lang) => {
        const normalized = String(lang || "")
          .trim()
          .toLowerCase();
        if (normalized === "no") return "nb";
        return normalized;
      };

      const mmSourceLang = mapMyMemoryLang(sourceLang) || "nb";
      const mmTargetLang = mapMyMemoryLang(targetLang) || "en";

      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(raw)}&langpair=${encodeURIComponent(mmSourceLang)}|${encodeURIComponent(mmTargetLang)}`;
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await this._throttleMyMemory();

        try {
          const res = await this._fetchWithTimeout(url, {}, 25000);
          if (res.status === 429) {
            this._myMemoryConsecutive429 =
              Number(this._myMemoryConsecutive429 || 0) + 1;
            if (this._myMemoryConsecutive429 >= 2) {
              this._myMemoryBlockedUntil = Date.now() + 3 * 60 * 1000;
              throw new Error("MyMemory er rate-limitet akkurat nå.");
            }

            const backoffMs = Math.min(6000, 800 * Math.pow(2, attempt - 1));
            console.warn(
              `[AdminManager] MyMemory rate-limited (429). Waiting ${backoffMs}ms before retry ${attempt}/${maxAttempts}.`,
            );
            await this._sleep(backoffMs);
            continue;
          }

          this._myMemoryConsecutive429 = 0;

          if (!res.ok) {
            throw new Error(`MyMemory request failed (${res.status})`);
          }

          const data = await res.json();
          const warningText = String(
            data?.responseDetails || data?.responseData?.translatedText || "",
          );
          if (this._isTranslationQuotaExceededMessage(warningText)) {
            this._myMemoryBlockedUntil = Date.now() + 60 * 60 * 1000;
            throw new Error(this._buildMyMemoryQuotaErrorMessage(warningText));
          }

          const translated = data?.responseData?.translatedText;
          return typeof translated === "string" && translated.trim()
            ? translated
            : raw;
        } catch (error) {
          if (
            Number(this._myMemoryBlockedUntil || 0) > Date.now() ||
            attempt >= maxAttempts
          ) {
            throw error;
          }
          const retryDelay = Math.min(10000, 800 * attempt);
          await this._sleep(retryDelay);
        }
      }

      return raw;
    },

    async _translateTextChunkWithGemini(text, targetLang, sourceLang = "no") {
      const settings = await this._getTranslationSettings();
      if (this._geminiRejectedKey === settings.geminiApiKey) {
        throw new Error(
          "Gemini-tilgangen er avvist. Kontroller API-nøkkelen i integrasjonsinnstillinger.",
        );
      }
      if (!settings.geminiApiKey) {
        throw new Error("Gemini API key mangler i integrasjonsinnstillinger.");
      }

      const languageMap = {
        no: "Norwegian Bokmal",
        en: "English",
        es: "Spanish",
      };

      const sourceName = languageMap[sourceLang] || sourceLang;
      const targetName = languageMap[targetLang] || targetLang;

      const model = encodeURIComponent(
        settings.geminiModel || "gemini-1.5-flash",
      );
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(settings.geminiApiKey)}`;

      const prompt = `Translate the following text from ${sourceName} to ${targetName}.\n\nRules:\n- Preserve meaning and tone.\n- Keep HTML tags unchanged.\n- Return only translated text, no explanation.\n\nText:\n${text}`;

      const res = await this._fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 1024,
            },
          }),
        },
        45000,
      );

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        if ([401, 403].includes(res.status))
          this._geminiRejectedKey = settings.geminiApiKey;
        throw new Error(
          `Gemini request failed (${res.status}): ${errorBody || "Unknown error"}`,
        );
      }

      const data = await res.json();
      const translated = this._extractGeminiText(data);
      if (!translated) {
        throw new Error("Gemini svarte uten oversatt tekst.");
      }

      return translated;
    },

    async _translateTextChunkWithGoogleTranslate(
      raw,
      targetLang,
      sourceLang = "no",
    ) {
      const mapLang = (lang) => {
        const normalized = String(lang || "")
          .trim()
          .toLowerCase();
        if (normalized === "no") return "no";
        return normalized;
      };

      const sl = mapLang(sourceLang) || "no";
      const tl = mapLang(targetLang) || "en";
      const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(raw)}`;

      const res = await this._fetchWithTimeout(endpoint, {}, 25000);
      if (!res.ok) {
        throw new Error(`Google Translate request failed (${res.status})`);
      }

      const data = await res.json();
      const sentences = Array.isArray(data?.[0]) ? data[0] : [];
      const translated = sentences
        .map((entry) => (Array.isArray(entry) ? String(entry[0] || "") : ""))
        .join("")
        .trim();

      if (!translated) {
        throw new Error("Google Translate svarte uten oversatt tekst.");
      }

      return translated;
    },

    async _translateTextChunk(
      text,
      targetLang,
      sourceLang = "no",
      strict = false,
    ) {
      const raw = String(text || "");
      if (!raw.trim() || this._isLikelyNonTranslatableToken(raw)) return raw;
      const settings = await this._getTranslationSettings();
      const cacheKey = `${settings.provider}:${sourceLang}:${targetLang}:${raw}`;
      this._translationCache = this._translationCache || new Map();
      if (this._translationCache.has(cacheKey))
        return this._translationCache.get(cacheKey);
      let translated;
      if (settings.provider === "gemini" && settings.geminiApiKey) {
        try {
          translated = await this._translateTextChunkWithGemini(
            raw,
            targetLang,
            sourceLang,
          );
        } catch (error) {
          console.warn(
            "[AdminManager] Gemini unavailable; using Google Translate.",
          );
        }
      }
      if (
        !translated ||
        !this._isMeaningfullyTranslatedField(raw, translated)
      ) {
        translated = await this._translateTextChunkWithGoogleTranslate(
          raw,
          targetLang,
          sourceLang,
        );
      }
      if (typeof translated !== "string" || !translated.trim()) {
        throw new Error("Google Oversettelse svarte uten oversatt tekst.");
      }
      this._translationCache.set(cacheKey, translated);
      return translated;
    },

    async _translateRichText(value, targetLang, sourceLang = "no") {
      const raw = String(value || "");
      if (!raw.trim()) return raw;

      // Preserve HTML tags by translating text segments only.
      const segments = raw.split(/(<[^>]+>)/g);
      const translatedParts = [];
      for (const segment of segments) {
        if (!segment) continue;
        if (segment.startsWith("<") && segment.endsWith(">")) {
          translatedParts.push(segment);
          continue;
        }

        const chunks = this._splitTextForTranslation(segment);
        if (!chunks.length) {
          translatedParts.push(segment);
          continue;
        }

        const translatedChunks = [];
        for (const chunk of chunks) {
          if (chunk === "\n") {
            translatedChunks.push("\n");
            continue;
          }
          const translated = await this._translateTextChunk(
            chunk,
            targetLang,
            sourceLang,
          );
          translatedChunks.push(translated);
        }
        translatedParts.push(translatedChunks.join(""));
      }
      return translatedParts.join("");
    },

    async _translateEditorBlock(block, targetLang, sourceLang = "no") {
      if (!block || typeof block !== "object") return block;
      const cloned = JSON.parse(JSON.stringify(block));
      const data = cloned.data || {};

      const translateField = async (field) => {
        if (typeof data[field] === "string") {
          data[field] = await this._translateRichText(
            data[field],
            targetLang,
            sourceLang,
          );
        }
      };

      switch (cloned.type) {
        case "header":
        case "paragraph":
        case "quote":
        case "embed":
        case "video":
        case "youtubeVideo":
          await translateField("text");
          await translateField("caption");
          break;
        case "list":
          if (Array.isArray(data.items)) {
            const translatedItems = [];
            for (const item of data.items) {
              translatedItems.push(
                await this._translateRichText(item, targetLang, sourceLang),
              );
            }
            data.items = translatedItems;
          }
          break;
        case "image":
          await translateField("caption");
          break;
        default:
          // Fallback: translate common text fields if present
          await translateField("text");
          await translateField("caption");
          await translateField("title");
          break;
      }

      cloned.data = data;
      return cloned;
    },

    async _translateBlogContent(content, targetLang, sourceLang = "no") {
      if (!content) return content;

      if (typeof content === "string") {
        return this._translateRichText(content, targetLang, sourceLang);
      }

      if (typeof content === "object" && Array.isArray(content.blocks)) {
        const translated = {
          ...content,
          blocks: [],
        };
        for (const block of content.blocks) {
          translated.blocks.push(
            await this._translateEditorBlock(block, targetLang, sourceLang),
          );
        }
        return translated;
      }

      return content;
    },

    async _buildBlogTranslation(post, targetLang) {
      const translation = {};
      if (typeof post.title === "string") {
        translation.title = await this._translateRichText(
          post.title,
          targetLang,
          "no",
        );
      }
      if (typeof post.category === "string") {
        translation.category = await this._translateRichText(
          post.category,
          targetLang,
          "no",
        );
      }
      if (typeof post.seoTitle === "string") {
        translation.seoTitle = await this._translateRichText(
          post.seoTitle,
          targetLang,
          "no",
        );
      }
      if (typeof post.seoDescription === "string") {
        translation.seoDescription = await this._translateRichText(
          post.seoDescription,
          targetLang,
          "no",
        );
      }
      if (Array.isArray(post.tags)) {
        const translatedTags = [];
        for (const tag of post.tags) {
          translatedTags.push(
            await this._translateRichText(tag, targetLang, "no"),
          );
        }
        translation.tags = translatedTags;
      }
      if (typeof post.content !== "undefined") {
        translation.content = await this._translateBlogContent(
          post.content,
          targetLang,
          "no",
        );
      }
      if (typeof post.text === "string") {
        translation.text = await this._translateRichText(
          post.text,
          targetLang,
          "no",
        );
      }
      if (typeof post.summary === "string") {
        translation.summary = await this._translateRichText(
          post.summary,
          targetLang,
          "no",
        );
      }
      if (typeof post.description === "string") {
        translation.description = await this._translateRichText(
          post.description,
          targetLang,
          "no",
        );
      }
      if (Array.isArray(post.keyVerses)) {
        const translatedKeyVerses = [];
        for (const kv of post.keyVerses) {
          if (kv && typeof kv === "object") {
            const reference =
              typeof kv.reference === "string"
                ? await this._translateRichText(kv.reference, targetLang, "no")
                : kv.reference || "";
            const text =
              typeof kv.text === "string"
                ? await this._translateRichText(kv.text, targetLang, "no")
                : kv.text || "";
            translatedKeyVerses.push({ reference, text });
          }
        }
        translation.keyVerses = translatedKeyVerses;
      }
      if (Array.isArray(post.discussionQuestions)) {
        const translatedQuestions = [];
        for (const q of post.discussionQuestions) {
          if (typeof q === "string") {
            translatedQuestions.push(
              await this._translateRichText(q, targetLang, "no"),
            );
          } else {
            translatedQuestions.push(q);
          }
        }
        translation.discussionQuestions = translatedQuestions;
      }
      return translation;
    },

    _isTranslatableKey(key) {
      const k = String(key || "").toLowerCase();
      return (
        !k.includes("image") &&
        !k.includes("url") &&
        !k.includes("link") &&
        !k.includes("bg") &&
        !k.includes("icon") &&
        !k.includes("email") &&
        !k.includes("phone") &&
        !k.includes("vipps") &&
        !k.includes("account") &&
        !k.includes("instagram") &&
        !k.includes("facebook") &&
        !k.includes("youtube") &&
        !k.includes("tiktok")
      );
    },

    async _buildPageContentTranslation(
      obj,
      targetLang,
      sourceLang = "no",
      existingTranslation = null,
      existingSource = null,
    ) {
      if (Array.isArray(obj)) {
        const result = [];
        for (let i = 0; i < obj.length; i++) {
          const item = obj[i];
          const existingVal =
            Array.isArray(existingSource) && existingSource.length > i
              ? existingSource[i]
              : null;
          const existingTransVal =
            Array.isArray(existingTranslation) && existingTranslation.length > i
              ? existingTranslation[i]
              : null;

          if (typeof item === "string") {
            if (
              existingVal === item &&
              existingTransVal !== undefined &&
              existingTransVal !== null
            ) {
              result.push(existingTransVal);
            } else if (this._isLikelyNonTranslatableToken(item)) {
              result.push(item);
            } else {
              result.push(
                await this._translateRichText(item, targetLang, sourceLang),
              );
            }
          } else if (typeof item === "object" && item !== null) {
            result.push(
              await this._buildPageContentTranslation(
                item,
                targetLang,
                sourceLang,
                existingTransVal,
                existingVal,
              ),
            );
          } else {
            result.push(item);
          }
        }
        return result;
      }

      if (typeof obj === "object" && obj !== null) {
        const result = {};
        for (const key of Object.keys(obj)) {
          const value = obj[key];
          if (key === "translations") {
            continue;
          }
          const existingVal = existingSource ? existingSource[key] : null;
          const existingTransVal = existingTranslation
            ? existingTranslation[key]
            : null;

          if (typeof value === "string") {
            if (
              existingVal === value &&
              existingTransVal !== undefined &&
              existingTransVal !== null
            ) {
              result[key] = existingTransVal;
            } else if (
              this._isTranslatableKey(key) &&
              !this._isLikelyNonTranslatableToken(value)
            ) {
              result[key] = await this._translateRichText(
                value,
                targetLang,
                sourceLang,
              );
            } else {
              result[key] = value;
            }
          } else if (typeof value === "object" && value !== null) {
            result[key] = await this._buildPageContentTranslation(
              value,
              targetLang,
              sourceLang,
              existingTransVal,
              existingVal,
            );
          } else {
            result[key] = value;
          }
        }
        return result;
      }

      return obj;
    },

    _normalizeTranslationCompareText(value) {
      let rawText = "";
      if (typeof value === "string") {
        rawText = value;
      } else if (typeof value === "number" || typeof value === "boolean") {
        rawText = String(value);
      } else if (value && typeof value === "object") {
        try {
          rawText = JSON.stringify(value);
        } catch (error) {
          rawText = String(value);
        }
      } else {
        rawText = String(value || "");
      }

      return rawText
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    },

    _isMeaningfullyTranslatedField(sourceValue, translatedValue) {
      const source = this._normalizeTranslationCompareText(sourceValue);
      const translated = this._normalizeTranslationCompareText(translatedValue);
      if (!source || !translated) return false;
      return source !== translated;
    },

    _hasMeaningfulBlogTranslation(sourcePost, translatedPost) {
      if (!translatedPost || typeof translatedPost !== "object") return false;

      const titleTranslated = this._isMeaningfullyTranslatedField(
        sourcePost?.title,
        translatedPost?.title,
      );
      const contentTranslated = this._isMeaningfullyTranslatedField(
        sourcePost?.content,
        translatedPost?.content,
      );
      const textTranslated = this._isMeaningfullyTranslatedField(
        sourcePost?.text,
        translatedPost?.text,
      );
      const seoTitleTranslated = this._isMeaningfullyTranslatedField(
        sourcePost?.seoTitle,
        translatedPost?.seoTitle,
      );
      const seoDescriptionTranslated = this._isMeaningfullyTranslatedField(
        sourcePost?.seoDescription,
        translatedPost?.seoDescription,
      );

      // Title and content/text are the most important fields for blog and podcast output.
      // Allow SEO-only posts as a weak fallback if both SEO fields changed.
      return (
        titleTranslated ||
        contentTranslated ||
        textTranslated ||
        (seoTitleTranslated && seoDescriptionTranslated)
      );
    },

    async ensureBlogPostTranslations(post, { force = false } = {}) {
      if (!post || typeof post !== "object") return post;

      const updatedPost = { ...post };
      const sourceHash = this._buildBlogTranslationSourceHash(updatedPost);
      const existingTranslations =
        updatedPost.translations && typeof updatedPost.translations === "object"
          ? { ...updatedPost.translations }
          : {};

      const targetLanguages = this._getBlogTranslationTargetLanguages();
      for (const lang of targetLanguages) {
        const existing =
          existingTranslations[lang] &&
          typeof existingTranslations[lang] === "object"
            ? existingTranslations[lang]
            : null;
        const isUpToDate =
          !!existing &&
          !existing._translationFailed &&
          existing._sourceHash === sourceHash &&
          existing.title &&
          (existing.content || existing.text);
        if (!force && isUpToDate) continue;

        const translated = await this._buildBlogTranslation(updatedPost, lang);
        const hasMeaningfulTranslation = this._hasMeaningfulBlogTranslation(
          updatedPost,
          translated,
        );

        if (!hasMeaningfulTranslation) {
          existingTranslations[lang] = {
            ...(existing || {}),
            ...translated,
            _translationFailed: true,
            _updatedAt: new Date().toISOString(),
          };
          delete existingTranslations[lang]._sourceHash;
          continue;
        }

        existingTranslations[lang] = {
          ...(existing || {}),
          ...translated,
          _sourceHash: sourceHash,
          _translationFailed: false,
          _updatedAt: new Date().toISOString(),
        };
      }

      updatedPost.translations = existingTranslations;
      updatedPost.translationSourceHash = sourceHash;
      updatedPost.sourceLanguage = "no";
      return updatedPost;
    },

    _getBlogTranslationTargetLanguages() {
      const fromI18n = Array.isArray(window?.i18n?.languages)
        ? window.i18n.languages
        : [];

      const fromDefaults = Object.keys(
        this.getPageContentEditorDefaults("settings_global")?.header
          ?.languages || {},
      );

      const candidates = (fromI18n.length ? fromI18n : fromDefaults)
        .map((lang) =>
          String(lang || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);

      const targets = Array.from(new Set(candidates)).filter(
        (lang) => lang !== "no",
      );
      return targets.length ? targets : ["en", "es"];
    },

    _getBlogTranslationStatus(post) {
      const targetLanguages = this._getBlogTranslationTargetLanguages();
      const sourceHash = this._buildBlogTranslationSourceHash(post || {});
      const translations =
        post?.translations && typeof post.translations === "object"
          ? post.translations
          : {};

      let upToDate = 0;
      let failed = 0;
      let stale = 0;
      let missing = 0;

      targetLanguages.forEach((lang) => {
        const tr = translations?.[lang];
        if (!tr || typeof tr !== "object") {
          missing += 1;
          return;
        }

        if (tr._translationFailed) {
          failed += 1;
          return;
        }

        const isFresh =
          tr._sourceHash === sourceHash &&
          !!tr.title &&
          (!!tr.content || !!tr.text);
        if (isFresh) {
          upToDate += 1;
        } else {
          stale += 1;
        }
      });

      const total = targetLanguages.length;
      let level = "none";

      if (upToDate === total && total > 0) {
        level = "ok";
      } else if (upToDate > 0) {
        level = "partial";
      } else if (stale > 0 && missing === 0) {
        level = "stale";
      } else if (missing > 0 || stale > 0) {
        level = "none";
      }

      return { total, upToDate, failed, stale, missing, level };
    },

    _renderBlogTranslationStatusBadge(post) {
      const badge = document.getElementById("blog-translation-status");
      if (!badge) return;

      const stats = this._getBlogTranslationStatus(post);
      badge.style.display = "inline-flex";
      badge.style.alignItems = "center";
      badge.style.gap = "6px";
      badge.style.padding = "6px 10px";
      badge.style.borderRadius = "999px";
      badge.style.fontSize = "12px";
      badge.style.fontWeight = "700";

      if (stats.level === "ok") {
        badge.style.background = "#dcfce7";
        badge.style.color = "#166534";
        badge.textContent = `Oversatt (${stats.upToDate}/${stats.total})`;
        return;
      }

      if (stats.level === "partial") {
        badge.style.background = "#fef3c7";
        badge.style.color = "#92400e";
        badge.textContent = `Delvis oversatt (${stats.upToDate}/${stats.total})`;
        return;
      }

      badge.style.background = "#fee2e2";
      badge.style.color = "#991b1b";
      badge.textContent = `Ikke oppdatert (${stats.upToDate}/${stats.total})`;
    },

    async translateAllExistingBlogPosts({
      force = false,
      silent = false,
    } = {}) {
      if (this._blogTranslationBackfillRunning) return;
      this._blogTranslationBackfillRunning = true;
      try {
        const blogData =
          await firebaseService.getPageContent("collection_blog");
        const items = this._getCollectionItems(blogData);
        if (!items.length) {
          return;
        }

        const translatedItems = [];
        let changed = false;
        for (let i = 0; i < items.length; i++) {
          const post = items[i];
          const translatedPost = await this.ensureBlogPostTranslations(post, {
            force,
          });
          translatedItems.push(translatedPost);
          if (JSON.stringify(translatedPost) !== JSON.stringify(post)) {
            changed = true;
          }
        }

        if (changed) {
          await firebaseService.savePageContent("collection_blog", {
            items: translatedItems,
          });
          await this.loadCollection("blog");
          if (!silent) {
            this.showToast(
              "Blogginnlegg er oversatt til tilgjengelige språk.",
              "success",
              5000,
            );
          }
        } else if (!silent) {
          this.showToast(
            "Blogginnlegg er allerede oppdatert på tilgjengelige språk.",
            "success",
            3500,
          );
        }
      } catch (error) {
        console.error(
          "[AdminManager] Failed to translate existing blog posts",
          error,
        );
        if (!silent) {
          this.showToast(
            "Kunne ikke oversette alle blogginnlegg nå.",
            "error",
            5000,
          );
        }
      } finally {
        this._blogTranslationBackfillRunning = false;
      }
    },

    async _translateSlide(slide) {
      const translated = {
        en: { ...slide.translations?.en },
        es: { ...slide.translations?.es },
      };

      const langs = ["en", "es"];
      for (const targetLang of langs) {
        translated[targetLang] = translated[targetLang] || {};

        // Translate Title if empty
        if (!translated[targetLang].title && slide.title) {
          try {
            translated[targetLang].title = await this._translateTextChunk(
              slide.title,
              targetLang,
              "no",
            );
          } catch (e) {
            console.warn(
              `[AdminManager] Slide title translation to ${targetLang} failed`,
              e,
            );
          }
        }

        // Translate Subtitle if empty
        if (!translated[targetLang].subtitle && slide.subtitle) {
          try {
            translated[targetLang].subtitle = await this._translateTextChunk(
              slide.subtitle,
              targetLang,
              "no",
            );
          } catch (e) {
            console.warn(
              `[AdminManager] Slide subtitle translation to ${targetLang} failed`,
              e,
            );
          }
        }

        // Translate Button Text if empty
        if (!translated[targetLang].btnText && slide.btnText) {
          try {
            translated[targetLang].btnText = await this._translateTextChunk(
              slide.btnText,
              targetLang,
              "no",
            );
          } catch (e) {
            console.warn(
              `[AdminManager] Slide btnText translation to ${targetLang} failed`,
              e,
            );
          }
        }
      }

      return translated;
    },
  };
}
