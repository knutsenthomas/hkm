import { GoogleGenAI, Type } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Global caching of the GoogleGenAI instance to optimize serverless cold starts
let globalAi = null;
function getGenAI() {
  if (!globalAi) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      globalAi = new GoogleGenAI({ apiKey: key });
    }
  }
  return globalAi;
}

// Translation map of Norwegian/Spanish book names and abbreviations to English canonical names
const bookTranslationMap = {
  // Norwegian to English
  "1. mosebok": "Genesis", "1 mosebok": "Genesis", "genesis": "Genesis",
  "2. mosebok": "Exodus", "2 mosebok": "Exodus", "exodus": "Exodus",
  "3. mosebok": "Leviticus", "3 mosebok": "Leviticus", "leviticus": "Leviticus",
  "4. mosebok": "Numbers", "4 mosebok": "Numbers", "numbers": "Numbers",
  "5. mosebok": "Deuteronomy", "5 mosebok": "Deuteronomy", "deuteronomy": "Deuteronomy",
  "josva": "Joshua", "joshua": "Joshua",
  "dommerne": "Judges", "judges": "Judges",
  "rut": "Ruth", "ruth": "Ruth",
  "1. samuelsbok": "1 Samuel", "1 samuelsbok": "1 Samuel", "1 samuel": "1 Samuel",
  "2. samuelsbok": "2 Samuel", "2 samuelsbok": "2 Samuel", "2 samuel": "2 Samuel",
  "1. kongebok": "1 Kings", "1 kongebok": "1 Kings", "1 kings": "1 Kings",
  "2. kongebok": "2 Kings", "2 kongebok": "2 Kings", "2 kings": "2 Kings",
  "1. krønikebok": "1 Chronicles", "1 krønikebok": "1 Chronicles", "1 chronicles": "1 Chronicles",
  "2. krønikebok": "2 Chronicles", "2 krønikebok": "2 Chronicles", "2 chronicles": "2 Chronicles",
  "esra": "Ezra", "ezra": "Ezra",
  "nehemja": "Nehemiah", "nehemia": "Nehemiah", "nehemiah": "Nehemiah",
  "ester": "Esther", "esther": "Esther",
  "job": "Job",
  "salmene": "Psalms", "salme": "Psalms", "psalms": "Psalms",
  "ordspråkene": "Proverbs", "ordspråk": "Proverbs", "proverbs": "Proverbs",
  "forkynneren": "Ecclesiastes", "ecclesiastes": "Ecclesiastes",
  "høysangen": "Song of Solomon", "song of solomon": "Song of Solomon",
  "jesaja": "Isaiah", "isaiah": "Isaiah",
  "jeremia": "Jeremiah", "jeremiah": "Jeremiah",
  "klagesangene": "Lamentations", "lamentations": "Lamentations",
  "esekiel": "Ezekiel", "ezekiel": "Ezekiel",
  "daniel": "Daniel",
  "hosea": "Hosea",
  "joel": "Joel",
  "amos": "Amos",
  "obadja": "Obadiah", "obadja": "Obadiah",
  "jona": "Jonah", "jonah": "Jonah",
  "mika": "Micah", "micah": "Micah",
  "nahum": "Nahum",
  "habakkuk": "Habakkuk",
  "sefanja": "Zephaniah", "zephaniah": "Zephaniah",
  "haggai": "Haggai",
  "sakarja": "Zechariah", "zechariah": "Zechariah",
  "malaki": "Malachi", "malachi": "Malachi",
  
  "matteus": "Matthew", "matthew": "Matthew",
  "markus": "Mark", "mark": "Mark",
  "lukas": "Luke", "luke": "Luke",
  "johannes": "John", "john": "John",
  "apostlenes gjerninger": "Acts", "acts": "Acts",
  "romerne": "Romans", "romans": "Romans",
  "1. korinterne": "1 Corinthians", "1 korinterne": "1 Corinthians", "1 corinthians": "1 Corinthians",
  "2. korinterne": "2 Corinthians", "2 korinterne": "2 Corinthians", "2 corinthians": "2 Corinthians",
  "galaterne": "Galatians", "galatians": "Galatians",
  "efeserne": "Ephesians", "ephesians": "Ephesians",
  "filipperne": "Philippians", "philippians": "Philippians",
  "kolosserne": "Colossians", "colossians": "Colossians",
  "1. tessalonikerne": "1 Thessalonians", "1 tessalonikerne": "1 Thessalonians", "1 thessalonians": "1 Thessalonians",
  "2. tessalonikerne": "2 Thessalonians", "2 tessalonikerne": "2 Thessalonians", "2 thessalonians": "2 Thessalonians",
  "1. timoteus": "1 Timothy", "1 timoteus": "1 Timothy", "1 timothy": "1 Timothy",
  "2. timoteus": "2 Timothy", "2 timoteus": "2 Timothy", "2 timothy": "2 Timothy",
  "titus": "Titus",
  "filemon": "Philemon", "philemon": "Philemon",
  "hebreerne": "Hebrews", "hebrews": "Hebrews",
  "jakob": "James", "james": "James",
  "1. peter": "1 Peter", "1 peter": "1 Peter",
  "2. peter": "2 Peter", "2 peter": "2 Peter",
  "1. johannes": "1 John", "1 johannes": "1 John", "1 john": "1 John",
  "2. johannes": "2 John", "2 johannes": "2 John", "2 john": "2 John",
  "3. johannes": "3 John", "3 johannes": "3 John", "3 john": "3 John",
  "judas": "Jude", "jude": "Jude",
  "åpenbaringen": "Revelation", "revelation": "Revelation",

  // Spanish to English
  "génesis": "Genesis", "éxodo": "Exodus", "levítico": "Leviticus", "números": "Numbers", "deuteronomio": "Deuteronomy",
  "josué": "Joshua", "jueces": "Judges", "rut": "Ruth", "1 samuel": "1 Samuel", "2 samuel": "2 Samuel",
  "1 reyes": "1 Kings", "2 reyes": "2 Kings", "1 crónicas": "1 Chronicles", "2 crónicas": "2 Chronicles",
  "esdras": "Esdras", "nehemías": "Nehemiah", "ester": "Esther", "job": "Job", "salmos": "Psalms",
  "proverbios": "Proverbs", "eclesiastés": "Ecclesiastes", "cantar de los cantares": "Song of Solomon",
  "isaías": "Isaiah", "jeremías": "Jeremiah", "lamentaciones": "Lamentations", "ezequiel": "Ezekiel",
  "daniel": "Daniel", "oseas": "Hosea", "joel": "Joel", "amós": "Amos", "abdías": "Obadiah",
  "jonás": "Jonah", "miqueas": "Micah", "nahúm": "Nahum", "habacuc": "Habakkuk", "sofonías": "Zephaniah",
  "hageo": "Haggai", "zacarías": "Zechariah", "malaquías": "Malachi",
  
  "mateo": "Matthew", "marcos": "Mark", "lucas": "Luke", "juan": "John", "hechos": "Acts",
  "romanos": "Romans", "1 corintios": "1 Corinthians", "2 corintios": "2 Corinthians",
  "gálatas": "Galatians", "efesios": "Ephesians", "filipenses": "Philippians", "colosenses": "Colossians",
  "1 tesalonicenses": "1 Thessalonians", "2 tesalonicenses": "2 Thessalonians",
  "1 timoteo": "1 Timothy", "2 timoteo": "2 Timothy", "tito": "Titus", "filemón": "Philemon",
  "hebreos": "Hebrews", "santiago": "James", "1 pedro": "1 Peter", "2 pedro": "2 Peter",
  "1 juan": "1 John", "2 juan": "2 John", "3 juan": "3 John", "judas": "Jude", "apocalipsis": "Revelation",

  // Abbreviations
  "matt": "Matthew", "mat": "Matthew", "mr": "Mark", "mk": "Mark", "lu": "Luke", "lk": "Luke",
  "joh": "John", "jn": "John", "act": "Acts", "ac": "Acts", "rom": "Romans", "ro": "Romans",
  "1 kor": "1 Corinthians", "2 kor": "2 Corinthians", "gal": "Galatians", "ef": "Ephesians",
  "fil": "Philippians", "kol": "Colossians", "1 tes": "1 Thessalonians", "2 tes": "2 Thessalonians",
  "1 tim": "1 Timothy", "2 tim": "2 Timothy", "tit": "Titus", "ti": "Titus", "filem": "Philemon",
  "heb": "Hebrews", "jak": "James", "jas": "James", "1 pet": "1 Peter", "2 pet": "2 Peter",
  "1 joh": "1 John", "2 joh": "2 John", "3 joh": "3 John", "jud": "Jude", "åp": "Revelation", "rev": "Revelation",
  "1. kor": "1 Corinthians", "2. kor": "2 Corinthians", "1. tes": "1 Thessalonians", "2. tes": "2 Thessalonians",
  "1. tim": "1 Timothy", "2. tim": "2 Timothy", "1. pet": "1 Peter", "2. pet": "2 Peter",
  "1. joh": "1 John", "2. joh": "2 John", "3. joh": "3 John",
  
  "1. mos": "Genesis", "2. mos": "Exodus", "3. mos": "Leviticus", "4. mos": "Numbers", "5. mos": "Deuteronomy",
  "1 mos": "Genesis", "2 mos": "Exodus", "3 mos": "Leviticus", "4 mos": "Numbers", "5 mos": "Deuteronomy",
  "gen": "Genesis", "ex": "Exodus", "lev": "Leviticus", "num": "Numbers", "deu": "Deuteronomy",
  "jos": "Joshua", "josh": "Joshua", "dom": "Judges", "judg": "Judges",
  "1. sam": "1 Samuel", "2. sam": "2 Samuel", "1 sam": "1 Samuel", "2 sam": "2 Samuel",
  "1. kon": "1 Kings", "2. kon": "2 Kings", "1 kon": "1 Kings", "2 kon": "2 Kings",
  "1. krø": "1 Chronicles", "2. krø": "2 Chronicles", "1 krø": "1 Chronicles", "2 krø": "2 Chronicles",
  "esr": "Ezra", "neh": "Nehemiah", "est": "Esther", "ps": "Psalms", "sal": "Psalms", "salm": "Psalms",
  "ord": "Proverbs", "prov": "Proverbs", "for": "Ecclesiastes", "ecc": "Ecclesiastes",
  "høy": "Song of Solomon", "jes": "Isaiah", "isa": "Isaiah", "jer": "Jeremiah", "kla": "Lamentations",
  "lam": "Lamentations", "ese": "Ezekiel", "ezk": "Ezekiel", "dan": "Daniel", "hos": "Hosea",
  "joe": "Joel", "am": "Amos", "ob": "Obadiah", "jon": "Jonah", "mik": "Micah", "mic": "Micah",
  "nah": "Nahum", "hab": "Habakkuk", "sef": "Zephaniah", "zep": "Zephaniah", "hag": "Haggai",
  "sak": "Zechariah", "zec": "Zechariah", "mal": "Malachi"
};

function parseReference(refStr) {
  if (!refStr) return null;
  const regex = /^([\d\.\s]*[^\d\s\:]+)\s+(\d+)[\:_](\d+)(?:-(\d+))?$/;
  const match = refStr.trim().match(regex);
  if (!match) return null;
  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    startVerse: parseInt(match[3], 10),
    endVerse: match[4] ? parseInt(match[4], 10) : parseInt(match[3], 10)
  };
}

function parseCommentaryToml(tomlText) {
  const commentaries = [];
  const sections = tomlText.split(/\[\[commentary\]\]/i);
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    
    let quote = '';
    const quoteMatch = section.match(/quote\s*=\s*(['"]{3})([\s\S]*?)\1/);
    if (quoteMatch) {
      quote = quoteMatch[2].trim();
    } else {
      const singleQuoteMatch = section.match(/quote\s*=\s*['"]([\s\S]*?)['"]/);
      if (singleQuoteMatch) {
        quote = singleQuoteMatch[1].trim();
      }
    }
    
    let sourceTitle = '';
    const sourceTitleMatch = section.match(/source_title\s*=\s*['"]([\s\S]*?)['"]/);
    if (sourceTitleMatch) {
      sourceTitle = sourceTitleMatch[1].trim();
    }
    
    let sourceUrl = '';
    const sourceUrlMatch = section.match(/source_url\s*=\s*['"]([\s\S]*?)['"]/);
    if (sourceUrlMatch) {
      sourceUrl = sourceUrlMatch[1].trim();
    }

    let appendAuthor = '';
    const appendAuthorMatch = section.match(/append_to_author_name\s*=\s*['"]([\s\S]*?)['"]/);
    if (appendAuthorMatch) {
      appendAuthor = appendAuthorMatch[1].trim();
    }
    
    if (quote) {
      commentaries.push({
        quote,
        sourceTitle,
        sourceUrl,
        appendAuthor
      });
    }
  }
  
  return commentaries;
}

async function getHistoricalCommentaries(refStr) {
  const parsedRef = parseReference(refStr);
  if (!parsedRef) return [];
  
  const canonicalBook = bookTranslationMap[parsedRef.book.toLowerCase()];
  if (!canonicalBook) return [];
  
  const safeBookName = canonicalBook.replace(/ /g, "_");
  const indexPath = path.join(process.cwd(), 'api', 'commentaries-index', `${safeBookName}.json`);
  if (!fs.existsSync(indexPath)) return [];
  
  try {
    const bookIndexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const chapterEntries = bookIndexData[String(parsedRef.chapter)] || [];
    
    const matchingEntries = chapterEntries.filter(entry => {
      if (entry.sc === entry.ec) {
        return entry.sc === parsedRef.chapter && parsedRef.startVerse >= entry.sv && parsedRef.startVerse <= entry.ev;
      } else {
        const qch = parsedRef.chapter;
        const qv = parsedRef.startVerse;
        return (qch === entry.sc && qv >= entry.sv) ||
               (qch === entry.ec && qv <= entry.ev) ||
               (qch > entry.sc && qch < entry.ec);
      }
    });
    
    if (matchingEntries.length === 0) return [];
    
    const entriesToFetch = matchingEntries.slice(0, 3);
    const fetchedCommentaries = await Promise.all(
      entriesToFetch.map(async (entry) => {
        try {
          const url = `https://raw.githubusercontent.com/HistoricalChristianFaith/Commentaries-Database/master/${encodeURIComponent(entry.p)}`;
          const response = await fetch(url);
          if (!response.ok) return [];
          const tomlText = await response.text();
          const parsed = parseCommentaryToml(tomlText);
          return parsed.map(c => ({
            author: entry.a + (c.appendAuthor || ''),
            quote: c.quote,
            sourceTitle: c.sourceTitle || 'Historical Commentary',
            sourceUrl: c.sourceUrl || ''
          }));
        } catch (fetchErr) {
          console.warn(`Failed to fetch/parse commentary for ${entry.p}:`, fetchErr.message);
          return [];
        }
      })
    );
    
    return fetchedCommentaries.flat();
  } catch (err) {
    console.error(`Error reading commentaries index for ${safeBookName}:`, err);
    return [];
  }
}

const OPENBIBLE_NB_FOLDERS = [
  "01.1 Mosebok",
  "02.2 Mosebok",
  "03.3 Mosebok",
  "04.4 Mosebok",
  "05.5 Mosebok",
  "06.Josva",
  "07.Dommerne",
  "08.Rut",
  "09.1 Samuelsbok",
  "10.2 Samuelsbok",
  "11.1 Kongebok",
  "12.2 Kongebok",
  "13.1 Krønikebok",
  "14.2 Krønikebok",
  "15.Esra",
  "16.Nehemja",
  "17.Ester",
  "18.Job",
  "19.Salmene",
  "20.Ordspråkene",
  "21.Forkynneren",
  "22.Høysangen",
  "23.Jesaja",
  "24.Jeremia",
  "25.Klagesangene",
  "26.Esekiel",
  "27.Daniel",
  "28.Hosea",
  "29.Joel",
  "30.Amos",
  "31.Obadja",
  "32.Jona",
  "33.Mika",
  "34.Nahum",
  "35.Habakkuk",
  "36.Sefanja",
  "37.Haggai",
  "38.Sakarja",
  "39.Malaki",
  "40.Matteus",
  "41.Markus",
  "42.Lukas",
  "43.Johannes",
  "44.Apostlenes gjerninger",
  "45.Romerne",
  "46.1 Korinterne",
  "47.2 Korinterne",
  "48.Galaterne",
  "49.Efeserne",
  "50.Filipperne",
  "51.Kolosserne",
  "52.1 Tessalonikerne",
  "53.2 Tessalonikerne",
  "54.1 Timoteus",
  "55.2 Timoteus",
  "56.Titus",
  "57.Filemon",
  "58.Hebreerne",
  "59.Jakob",
  "60.1 Peter",
  "61.2 Peter",
  "62.1 Johannes",
  "63.2 Johannes",
  "64.3 Johannes",
  "65.Judas",
  "66.Åpenbaringen"
];

function getJsonPrefix(folderName) {
  const dotIndex = folderName.indexOf(".");
  if (dotIndex === -1) return folderName.toLowerCase().replace(/\s+/g, "-");
  const displayName = folderName.substring(dotIndex + 1);
  return displayName.toLowerCase().replace(/\s+/g, "-");
}

const bibleServerCache = {};
const SERVER_CACHE_TTL = 72 * 60 * 60 * 1000; // 72 hours

async function fetchWithServerCache(key, url) {
  const cached = bibleServerCache[key];
  const now = Date.now();
  if (cached && (now - cached.timestamp < SERVER_CACHE_TTL)) {
    return cached.data;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from remote server: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  bibleServerCache[key] = { data, timestamp: now };
  return data;
}

const PROJECT_ID = 'his-kingdom-ministry';
const API_KEY = process.env.FIREBASE_API_KEY;
if (!API_KEY) {
  console.warn("Warning: FIREBASE_API_KEY is not defined in the environment variables.");
}
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('mapValue' in value) {
    const fields = (value.mapValue && value.mapValue.fields) || {};
    const out = {};
    for (const key of Object.keys(fields)) {
      out[key] = decodeFirestoreValue(fields[key]);
    }
    return out;
  }
  if ('arrayValue' in value) {
    const values = (value.arrayValue && value.arrayValue.values) || [];
    return values.map(v => decodeFirestoreValue(v));
  }
  return value;
}

function decodeFirestoreFields(fields = {}) {
  const out = {};
  for (const key of Object.keys(fields)) {
    out[key] = decodeFirestoreValue(fields[key]);
  }
  return out;
}

function encodeFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(item => encodeFirestoreValue(item))
      }
    };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const key of Object.keys(val)) {
      fields[key] = encodeFirestoreValue(val[key]);
    }
    return {
      mapValue: { fields }
    };
  }
  return { stringValue: String(val) };
}

function encodeFirestoreFields(obj) {
  const fields = {};
  for (const key of Object.keys(obj)) {
    fields[key] = encodeFirestoreValue(obj[key]);
  }
  return fields;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function getCachedDefinition(lang, cleanWord) {
  if (!API_KEY || !BASE_URL) {
    return null;
  }
  const docId = `${lang}_${encodeURIComponent(cleanWord).replace(/%/g, '_')}`;
  const url = `${BASE_URL}/bible_dictionary_cache/${docId}?key=${API_KEY}`;
  try {
    const response = await fetchWithTimeout(url, {}, 3000);
    if (response.ok) {
      const payload = await response.json();
      if (payload && payload.fields) {
        return decodeFirestoreFields(payload.fields);
      }
    }
  } catch (err) {
    console.error("Error reading from Firestore cache:", err.message);
  }
  return null;
}

async function setCachedDefinition(lang, cleanWord, data) {
  if (!API_KEY || !BASE_URL) {
    return;
  }
  const docId = `${lang}_${encodeURIComponent(cleanWord).replace(/%/g, '_')}`;
  const url = `${BASE_URL}/bible_dictionary_cache/${docId}?key=${API_KEY}`;
  try {
    const encodedFields = encodeFirestoreFields(data);
    const response = await fetchWithTimeout(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: encodedFields })
    }, 3000);
    if (!response.ok) {
      console.warn("Failed to write to Firestore cache:", response.status, await response.text());
    }
  } catch (err) {
    console.error("Error writing to Firestore cache:", err.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  try {
    // 1. GET /api/bible/bibles
    if (pathname === '/api/bible/bibles') {
      return res.status(200).json({
        data: [
          {
            id: "OPENBIBLE_NB",
            name: "Open Translation Bible (Norsk Bokmål)",
            abbreviation: "OTB-NB",
            language: { id: "nor", name: "Norsk (Bokmål)" }
          },
          {
            id: "DNB",
            name: "Norsk Bokmål (1930)",
            abbreviation: "Bokmål 1930",
            language: { id: "nor", name: "Norsk (Bokmål)" }
          },
          {
            id: "NOR1921",
            name: "Norsk Nynorsk (1921)",
            abbreviation: "Nynorsk 1921",
            language: { id: "nor", name: "Norsk (Nynorsk)" }
          },
          {
            id: "WEB",
            name: "World English Bible (WEB)",
            abbreviation: "WEB",
            language: { id: "eng", name: "English" }
          },
          {
            id: "KJV",
            name: "King James Version (KJV)",
            abbreviation: "KJV",
            language: { id: "eng", name: "English" }
          },
          {
            id: "RV1960",
            name: "Reina Valera 1960",
            abbreviation: "RVR1960",
            language: { id: "spa", name: "Español" }
          },
          {
            id: "NVI",
            name: "Nueva Versión Internacional",
            abbreviation: "NVI",
            language: { id: "spa", name: "Español" }
          }
        ]
      });
    }

    // 2. GET /api/bible/dictionary
    if (pathname === '/api/bible/dictionary') {
      const word = urlObj.searchParams.get('word');
      const context = urlObj.searchParams.get('context') || '';
      const scriptureRef = urlObj.searchParams.get('scriptureRef') || '';
      const lang = urlObj.searchParams.get('lang') || 'no';
      const extended = urlObj.searchParams.get('extended') === 'true';

      if (!word) {
        return res.status(400).json({ error: "Word query parameter is required" });
      }

      const cleanWord = word.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, "");
      const cacheKey = extended ? `${cleanWord}_extended` : cleanWord;

      // Check Firestore Cache first
      try {
        const cached = await getCachedDefinition(lang, cacheKey);
        if (cached) {
          const isScripture = !!parseReference(word);
          if (!isScripture || (cached.historicalCommentaries && cached.historicalCommentaries.length > 0)) {
            return res.status(200).json(cached);
          }
        }
      } catch (cacheErr) {
        console.error("Cache read failed:", cacheErr);
      }

      let responseData = null;

      // Bypass slow Gemini definition lookup if it is a scripture reference
      const isScripture = !!parseReference(word);
      if (isScripture) {
        const labelDef = lang === 'en' ? `Scripture reference and commentaries for ${word}.` : (lang === 'es' ? `Referencia bíblica y comentarios para ${word}.` : `Bibelreferanse og kommentarer for ${word}.`);
        const labelCat = lang === 'en' ? "Scripture Reference" : (lang === 'es' ? "Referencia Bíblica" : "Bibelreferanse");
        
        responseData = {
          word: word,
          definition: labelDef,
          category: labelCat,
          contextualNote: "",
          crossReferences: [],
          originalWords: [],
          extendedAnalysis: ""
        };
      }

      // Quick check of hardcoded local fallback dict for basic Norwegian terms (only when not requesting extended analysis)
      const fallbackDict = {
        "nåde": {
          definition: "Guds totale og ufortjente barmhjertighet, kjærlighet og tilgivelse overfor mennesker. Det handler om å få fullstendig tilgivelse og velsignelse helt uavhengig av egne gjerninger eller prestasjoner.",
          category: "Teologisk hovedbegrep",
          contextualNote: "Særlig sentralt i Det nye testamentet gjennom Paulus' brev, som understreker at frelsen er en ren gave.",
          crossReferences: [
            { ref: "Johannes 3:16", text: "Et sentralt vers om Guds nåde og kjærlighet." },
            { ref: "Romerne 3:24", text: "Rettferdiggjort ufortjent av hans nåde." }
          ]
        },
        "fariseer": {
          definition: "Et medlem av et strengt jødisk religiøst og politisk parti på Jesu tid. De var kjent for sin ekstremt detaljerte og nøyaktige tolkning og overholdelse av Moseboken og de muntlige tradisjonene.",
          category: "Historisk gruppe",
          contextualNote: "I evangeliene oppstår det ofte opphetede diskusjoner mellom Jesus og fariseerne knyttet til hjerteinnstilling kontra ytre regler.",
          crossReferences: [
            { ref: "Matteus 23:23", text: "Jesus taler mot fariseernes ytre renhet og manglende rettferdighet." }
          ]
        },
        "sabbat": {
          definition: "Den jødiske hviledagen, feiret fra fredag kveld til lørdag kveld til minne om at Gud hvilte på den syvende skaperdagen, samt friheten fra slaveriet i Egypt.",
          category: "Religiøs praksis",
          contextualNote: "Sabbaten var ment som en dyrebar gave til hvile og fellesskap, men ble på Jesu tid gjenstand for en rekke menneskeskapte restriksjoner.",
          crossReferences: [
            { ref: "Markus 2:27", text: "Sabbaten ble til for menneskets skyld, ikke mennesket for sabbatens skyld." }
          ]
        },
        "samaritan": {
          definition: "En innbygger av landskapet Samaria. De hadde sin egen versjon av Moseboken og holdt sitt alter på fjellet Garisim fremfor Jerusalem.",
          category: "Kulturell/etnisk gruppe",
          contextualNote: "Det var dype historiske og religiøse motsetninger mellom jøder og samaritanere, noe som gjør lignelsen om den barmhjertige samaritan spesielt radikal.",
          crossReferences: [
            { ref: "Lukas 10:33", text: "Lignelsen om den barmhjertige samaritan." }
          ]
        },
        "samaritaner": {
          definition: "En innbygger av landskapet Samaria. De hadde sin egen versjon av Moseboken og holdt sitt alter på fjellet Garisim fremfor Jerusalem.",
          category: "Kulturell/etnisk gruppe",
          contextualNote: "Det var dype historiske og religiøse motsetninger mellom jøder og samaritanere, noe som gjør lignelsen om den barmhjertige samaritan spesielt radikal.",
          crossReferences: [
            { ref: "Lukas 10:33", text: "Lignelsen om den barmhjertige samaritan." }
          ]
        },
        "apostel": {
          definition: "Fra gresk 'apostolos', som betyr 'en som sendes ut med fullmakt'. Betegner særlig de tolv disiplene som Jesus spesielt utvalgte og sendte ut for å være vitner om hans oppstandelse.",
          category: "Embete / Rolle",
          contextualNote: "I videre forstand brukes det også om andre tidlige misjonsledere, som Paulus eller Barnabas.",
          crossReferences: [
            { ref: "Matteus 10:2", text: "Navnene på de tolv apostlene." }
          ]
        },
        "evangelium": {
          definition: "Betyr opprinnelig 'et godt budskap' eller 'gledesbudskap'. I bibelsk sammenheng er det det glade budskapet om Jesus Kristus, frelsen og Guds riks komme.",
          category: "Akkreditert sjanger",
          contextualNote: "Også brukt om de fire første bøkerekkene i NT: Matteus, Markus, Lukas og Johannes.",
          crossReferences: [
            { ref: "Romerne 1:16", text: "Evangeliet er en Guds kraft til frelse." }
          ]
        },
        "manna": {
          definition: "Betyr bokstavelig talt 'hva er dette?'. Det var den mirakuløse brødlignende føden som Gud ga israelittene fra himmelen hver morgen under ørkenvandringen etter flukten fra Egypt.",
          category: "Mirakel / Symbol",
          contextualNote: "I Johannesevangeliet 6 omtaler Jesus seg selv som 'det sanne brødet fra himmelen' som gir evig liv, som en motsetning til mannaen.",
          crossReferences: [
            { ref: "2. Mosebok 16:15", text: "Israelittene så det og sa til hverandre: Hva er dette? For de visste ikke hva det var." }
          ]
        },
        "pakt": {
          definition: "En høytidelig, bindende og hellig avtale eller forbund, vanligvis mellom to parter. I Bibelen beskriver det rammene for fellesskapet mellom Gud og mennesker.",
          category: "Teologisk kjernebegrep",
          contextualNote: "Gud oppretter pakter med Noah, Abraham, Moses og David. Den gamle pakt avløses av Den nye pakt beseglet med Jesu blod.",
          crossReferences: [
            { ref: "Lukas 22:20", text: "Kalken er den nye pakt i mitt blod." }
          ]
        },
        "profet": {
          definition: "En person som taler på vegne av Gud. En profet fungerer som Guds talsmann, formidler guddommelige åpenbaringer, kaller folket tilbake til pakten og peker frem mot Guds frelsesplan.",
          category: "Rolle / Tjeneste",
          contextualNote: "De gammeltestamentlige profetene forutså ofte messianske hendelser som ble oppfylt i Jesus Kristus.",
          crossReferences: [
            { ref: "Hebreerne 1:1", text: "Gud talte i fordums tid mange ganger og på mange måter til fedrene ved profetene." }
          ]
        },
        "forløsning": {
          definition: "Å kjøpe noen fri fra slaveri, fangenskap eller dødsstraff ved å betale en løsepenge. Teologisk betyr det at Jesus kjøpte menneskeheten fri fra syndens og mørkets herredømme.",
          category: "Soteriologi (Frelseslære)",
          contextualNote: "Ordet har en dyp forankring i de antikke slavetorgene, og illustrerer prisen Jesus betalte på korset.",
          crossReferences: [
            { ref: "Efeserne 1:7", text: "I ham har vi forløsningen som ble vunnet ved hans blod, tilgivelse for syndene." }
          ]
        },
        "hellig": {
          definition: "Noe som er fullstendig rent, opphøyd og adskilt fra det verdslige – satt helt til side til Guds ære. Særlig uttrykk for Guds innerste uforfalskete vesen.",
          category: "Gudsatt attributt",
          contextualNote: "Gud kaller også sine troende til å være hellige, det vil si å leve liv preget av kjærlighet og moralsk renhet.",
          crossReferences: [
            { ref: "3. Mosebok 19:2", text: "Dere skal være hellige, for jeg, Herren deres Gud, er hellig." }
          ]
        },
        "prest": {
          definition: "En person som er innviet til å tjene som et bindeledd og en mellommann mellom Gud og mennesker, særlig ved å bære frem ofringer, be for folket og velsigne dem.",
          category: "Embede",
          contextualNote: "I Det gamle testamentet var prestene av Levis stamme. I Det nye testamentet beskrives Jesus som vår evige yppersteprest, og alle troende sies å være et 'kongelig presteskap'.",
          crossReferences: [
            { ref: "Hebreerne 4:14", text: "Da vi nå har en stor yppersteprest som har gått inn igjennom himlene, Jesus, Guds Sønn..." }
          ]
        },
        "hedning": {
          definition: "Historisk sett et bibelsk begrep som ble brukt om alle folkeslag og nasjoner som ikke tilhørte det jødiske folk (israelittene) og dermed var utenfor mosepakten.",
          category: "Historisk klassifisering",
          contextualNote: "Evangeliet starter hos jødene, men åpnes fullstendig opp for hedningene (oss andre) gjennom misjonsbefalingen og Paulus' virke.",
          crossReferences: [
            { ref: "Apostlenes gjerninger 13:47", text: "Jeg har satt deg til et lys for hedningene, for at du skal bringe frelse til jordens ender." }
          ]
        }
      };

      if (lang === 'no' && !extended) {
        const fallbackEntry = fallbackDict[cleanWord];
        if (fallbackEntry) {
          responseData = {
            word: word,
            definition: fallbackEntry.definition,
            category: fallbackEntry.category,
            contextualNote: fallbackEntry.contextualNote,
            originalWords: [],
            crossReferences: fallbackEntry.crossReferences || [],
            extendedAnalysis: ""
          };
        }
      }

      if (!responseData) {
          // Set up languages instructions
          let responseLangInstruction = "Du må svare på flytende, vakkert og varmt norsk. Alle tekster og forklaringer må være på norsk.";
          let rejectCategory = "Ikke bibelrelatert";
          let rejectDefinition = "Søket fraviker fra bibelrelaterte emner. Denne AI-ordboken er reservert for bibelstudie og tillater kun søk etter konsepter eller ord relatert til Bibelen, kristen teologi, tro, kirkehistorie eller bibelsk geografi/historie.";
          let rejectNote = "Søk avvist pga. manglende teologisk eller bibelsk relevans.";

          if (lang === 'en') {
            responseLangInstruction = "You must respond in fluent, beautiful, and warm English. All definitions, category, contextualNote, cross-references explanations, and the meaning of original words MUST be in English. The rejection message must also be in English.";
            rejectCategory = "Not Bible-related";
            rejectDefinition = "The search deviates from Bible-related topics. This AI dictionary is reserved for Bible study and only allows searches for concepts or words related to the Bible, Christian theology, faith, church history, or biblical geography/history.";
          } else if (lang === 'es') {
            responseLangInstruction = "Debes responder en un español fluido, hermoso y cálido. Todas las definiciones, categorías, notas contextuales, referencias cruzadas y explicaciones DEBEN estar en español.";
            rejectCategory = "No relacionado con la Biblia";
            rejectDefinition = "La búsqueda se desvía de los temas relacionados con la Biblia. Este diccionario de IA está reservado para el estudio de la Biblia y solo permite búsquedas de conceptos o palabras relacionadas con la Biblia, la teología cristiana, la fe, la historia de la iglesia o la geografía/historia bíblica.";
            rejectNote = "Búsqueda rechazada debido a la falta de relevancia teológica o bíblica.";
          }

          const geminiApiKey = process.env.GEMINI_API_KEY;

          if (geminiApiKey) {
            try {
              const ai = getGenAI();

              const prompt = `Du er en ekspert på teologi, bibelhistorie og bibelske språk (hebraisk, arameisk og gresk). 
${responseLangInstruction}

Vurder først ekstremt nøye om søkeordet eller emnet "${word}" har relevans til Bibelen, kristen teologi, kristendom, kirkehistorie, bibelhistorie, religiøse retninger, bønner eller jødisk-kristne bibelske kontekster/historier.

Dersom emnet/ordet "${word}" overhode ikke har noen relevans eller tilknytning til Bibelen, kristendom, teologi, kirkehistorie, jødisk-kristen tro eller bibelske emner (for eksempel hvis brukeren søker etter sekulære, dagligdagse ting eller ting som 'iPhone', 'fotball', 'pizza', 'programmering', 'hvordan fjerne snø', 'katt' etc.), skal du nekte å definere eller belyse begrepet, og i stedet gi følgende faste avvisningssvar:
- Sett 'category' til: "${rejectCategory}"
- Sett 'definition' til: "${rejectDefinition}"
- Sett 'contextualNote' til: "${rejectNote}"
- Sett 'extendedAnalysis' til: ""

Dersom ordet ER relevant for Bibelen eller teologi, skal du tilpasse svaret og lengden til hva brukeren søker etter på en fyldig, inspirerende og lærerik måte. Ta utgangspunkt i og integrer definisjoner, navnebetydninger og forklaringer fra anerkjente verk som Easton's Bible Dictionary, Smith's Bible Dictionary, International Standard Bible Encyclopedia (ISBE) og Hitchcock's Bible Names Dictionary:
1. Hvis brukeren søker etter bibelvers om noe (f.eks. "bibelvers om Jesus", "vers om håp", "skrifter om kjærlighet"), skal du liste opp flere (gjerne 4 til 8 eller flere) svært relevante bibelvers med tydelige kapittel- og versangivelser (f.eks. 'Johannes 3:16') og sitere teksten, samt gjerne legge til korte, inspirerende teologiske kommentarer til hvert vers eller samlet.
2. Hvis brukeren søker etter handlinger eller historier om en bibelsk skikkelse (f.eks. "hva gjorde Josef", "fortellingen om Moses", "historien om Maria"), skal du skrive en levende, spennende og fyldig fortellende beretning (en slags dyp fortelling) om hva personen gjorde, deres reise, utfordringer, rolle i Guds frelsesplan og den evige teologiske betydningen av deres liv.
3. For ordinære begreper (f.eks. "nåde", "sabbat", "frelse"), lag en forklaring som er nøyaktig, klar, lærerik, dyp og historisk presis, tilpasset bibelstudium. Del teksten inn i flere avsnitt med linjeskift (\n\n) for bedre lesbarhet, og bruk markdown-underoverskrifter (bruk ### for underoverskrifter, f.eks. '### Teologisk betydning' eller '### Kontekst') og lister der det passer for å organisere innholdet. VIKTIG: Du må ALDRI inkludere søkeordet som en hovedoverskrift (f.eks. ikke ha '# Tro' eller lignende) øverst i definisjonen, da ordet allerede vises i app-grensesnittets header.
4. Grunntekst (originalspråk): Dersom søkeordet eller emnet har et tilsvarende ord på gresk eller hebraisk/arameisk (f.eks. for ord som "nåde", "kjærlighet", "begynnelse"), eller hvis det søkes etter et gresk eller hebraisk begrep, skal du ALLTID populere listen "originalWords". Du skal ALDRI henvise til, navngi eller inkludere Strong-numre eller Strong's Concordance (f.eks. skal du ALDRI skrive "Strong's G5485" eller lignende). I stedet skal du kun oppgi det opprinnelige ordet med greske eller hebraiske tegn, dets forenklede translitterasjon til latinske bokstaver, en klar uttaleveiledning (f.eks. "uttales: ..."), språket det tilhører (gresk eller hebraisk), og ordets direkte betydning på det valgte språket (norsk/engelsk/spansk).
5. Kapittelforklaring: Dersom brukeren søker etter et spesifikt kapittel (f.eks. "Johannes 1", "Salmene 23", "Første Mosebok 1"), skal du skrive en grundig, lærerik og teologisk forklaring av dette kapittelet. Beskriv kapittelets hovedtemaer, historiske og litterære kontekst, de viktigste versene (som du gjerne kan sitere og kommentere), og dets overordnede betydning for bibelhistorien.
6. "extendedAnalysis": ${extended ? `Siden brukeren ba om en utvidet analyse (extended=true), må du skrive en grundig og dyptgående teologisk og bibelhistorisk analyse/essay om ordet på 300-600 ord. Bruk markdown for formatering (overskrifter som '### Historisk kontekst' eller '### Teologisk betydning', fet skrift, lister). VIKTIG: Du må sette inn tydelige og ekte linjeskift (\n\n) før og etter hver overskrift og mellom hvert avsnitt, slik at teksten ikke blir presset sammen på én enkelt linje. Utforsk ordets opprinnelse, bruk i hele Bibelen og praktisk betydning i dag.` : `Siden brukeren IKKE ba om utvidet analyse, må du sette dette feltet to nøyaktig en tom streng "".`}

${scriptureRef ? `Ordet ble markert av brukeren i bibelteksten referert som: ${scriptureRef}.` : ""}
${context ? `Her er verskonteksten ordet står i: "${context}".` : ""}

Returner nøyaktig JSON i henhold til dette skjemaet:
{
  "word": "${word}",
  "definition": "Hoveddefinisjon...",
  "category": "Kategori...",
  "contextualNote": "Kontekstnote...",
  "extendedAnalysis": "Utvidet analyse...",
  "originalWords": [
    {
      "word": "originalspråklig ord i greske eller hebraiske tegn",
      "transliteration": "translitterasjon...",
      "pronunciation": "uttale...",
      "language": "gresk eller hebraisk",
      "meaning": "nåde, gunst, trofast kjærlighet"
    }
  ],
  "crossReferences": [
    {
      "ref": "Standard bibelreferanse (f.eks. Johannes 3:16)",
      "text": "Vers-tekst eller en kort forklaring på sammenhengen..."
    }
  ]
}`;

              const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING },
                      definition: { type: Type.STRING },
                      category: { type: Type.STRING },
                      contextualNote: { type: Type.STRING },
                      extendedAnalysis: { type: Type.STRING },
                      originalWords: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            word: { type: Type.STRING },
                            transliteration: { type: Type.STRING },
                            pronunciation: { type: Type.STRING },
                            language: { type: Type.STRING },
                            meaning: { type: Type.STRING }
                          },
                          required: ["word", "transliteration", "pronunciation", "language", "meaning"]
                        }
                      },
                      crossReferences: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            ref: { type: Type.STRING },
                            text: { type: Type.STRING }
                          },
                          required: ["ref", "text"]
                        }
                      }
                    },
                    required: ["word", "definition", "category", "contextualNote", "extendedAnalysis", "crossReferences", "originalWords"]
                  }
                }
              });

              if (response.text) {
                responseData = JSON.parse(response.text);
                await setCachedDefinition(lang, cacheKey, responseData);
              }
            } catch (aiErr) {
              console.error("Gemini/Firestore integration failed:", aiErr);
            }
          }
        }

      if (!responseData) {
        // No API key or AI lookup failed. Let's do a fallback direct English matching.
        let directEntry = null;
        const letter = cleanWord.charAt(0).toLowerCase();
        if (letter >= 'a' && letter <= 'z') {
          try {
            const langFolder = lang === 'es' ? 'es' : (lang === 'no' ? 'no' : '');
            let dataPath = langFolder
              ? path.join(process.cwd(), 'api', 'bible-dictionary-data', langFolder, `${letter}.json`)
              : path.join(process.cwd(), 'api', 'bible-dictionary-data', `${letter}.json`);

            if (langFolder && !fs.existsSync(dataPath)) {
              dataPath = path.join(process.cwd(), 'api', 'bible-dictionary-data', `${letter}.json`);
            }

            if (fs.existsSync(dataPath)) {
              const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
              const upperWord = cleanWord.toUpperCase();
              directEntry = fileData[upperWord];
              if (!directEntry) {
                const foundKey = Object.keys(fileData).find(k => k.toLowerCase() === cleanWord || fileData[k].slug === cleanWord);
                if (foundKey) {
                  directEntry = fileData[foundKey];
                }
              }
            }
          } catch (err) {
            console.error("Error loading offline direct dictionary file:", err);
          }
        }

        if (directEntry) {
          let definitionText = directEntry.definitions.map(d => `[${d.source}] ${d.text}`).join('\n\n');
          const geminiApiKey = process.env.GEMINI_API_KEY;
          
          if (lang !== 'en' && geminiApiKey) {
            try {
              const ai = getGenAI();
              const targetLangName = lang === 'es' ? 'spansk' : 'norsk';
              const prompt = `Du er en teologisk oversetter. Oversett følgende bibelordbok-definisjon til ${targetLangName}. 
Behold referanser og kildeangivelser (som [Easton] eller [Smith]) intakt. Oversettelsen skal være flytende, forståelig og presis.

Tekst som skal oversettes:
${definitionText}`;

              const translationResp = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt
              });

              if (translationResp.text) {
                definitionText = translationResp.text.trim();
              }
            } catch (transErr) {
              console.warn("Failed to translate offline dictionary entry:", transErr.message);
            }
          }

          responseData = {
            word: directEntry.name,
            definition: definitionText,
            category: lang === 'en' ? "Easton/Smith Dictionary" : (lang === 'es' ? "Diccionario Easton/Smith" : "Easton/Smith bibelordbok"),
            contextualNote: `Source: ${directEntry.sources.join(', ')}`,
            originalWords: [],
            crossReferences: directEntry.scripture_refs ? directEntry.scripture_refs.map(r => ({ ref: r.reference, text: lang === 'en' ? "Scripture reference from dictionary." : (lang === 'es' ? "Referencia bíblica del diccionario." : "Bibelreferanse fra ordboken.") })) : [],
            extendedAnalysis: ""
          };
        } else {
          responseData = {
            word,
            definition: `Ingen forhåndsdefinert forklaring funnet for "${word}". Legg til en Gemini API-nøkkel på serveren for å aktivere full AI-ordbok.`,
            category: "Ordbok",
            contextualNote: "Søk uten treff.",
            crossReferences: [],
            originalWords: [],
            extendedAnalysis: ""
          };
        }
      }

      // NOW: if it's a verse lookup, enrich it with historical commentaries!
      const finalRef = scriptureRef || (parseReference(word) ? word : '');
      if (finalRef) {
        try {
          let historicalCommentaries = await getHistoricalCommentaries(finalRef);
          
          // Translate if language is not English and Gemini API key is available
          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (historicalCommentaries && historicalCommentaries.length > 0 && lang !== 'en' && geminiApiKey) {
            try {
              const ai = getGenAI();
              const targetLangName = lang === 'es' ? 'spansk' : 'norsk';
              
              const quotesToTranslate = historicalCommentaries.map(c => c.quote);
              const prompt = `Du er en bibeloversetter og teolog. Oversett følgende historiske sitater/kommentarer til ${targetLangName}. 
Oversettelsen må være flytende, teologisk nøyaktig, og passe til sitatets høytidelige/historiske stil.

Returner kun en gyldig JSON-liste med strenger (de oversatte sitatene i nøyaktig samme rekkefølge):
${JSON.stringify(quotesToTranslate)}`;

              const translationResp = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              });

              if (translationResp.text) {
                const translatedQuotes = JSON.parse(translationResp.text);
                if (Array.isArray(translatedQuotes) && translatedQuotes.length === historicalCommentaries.length) {
                  historicalCommentaries = historicalCommentaries.map((c, i) => ({
                    ...c,
                    quote: translatedQuotes[i]
                  }));
                }
              }
            } catch (transErr) {
              console.warn("Failed to translate historical commentaries:", transErr);
            }
          }
          
          responseData.historicalCommentaries = historicalCommentaries;
        } catch (commErr) {
          console.error("Error retrieving historical commentaries:", commErr);
        }
      }

      // Save response to cache so subsequent lookups (both words and verses) are instant
      try {
        await setCachedDefinition(lang, cacheKey, responseData);
      } catch (cacheWriteErr) {
        console.error("Cache write failed:", cacheWriteErr);
      }

      return res.status(200).json(responseData);
    }

    // 2b. GET /api/bible/cross-references
    if (pathname === '/api/bible/cross-references') {
      const chapterName = urlObj.searchParams.get('chapterName');
      if (!chapterName) {
        return res.status(400).json({ error: "chapterName query parameter is required" });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        try {
          const ai = getGenAI();
          const prompt = `Du er en ekspert på bibelstudier og teologi.
Finn 4 til 6 svært relevante kryssreferanser (andre bibelvers eller kapitler i Bibelen) som handler om det samme, utfyller eller har en klar sammenheng med kapittelet eller skriftstedet "${chapterName}".
For hver kryssreferanse skal du oppgi:
1. Bibelreferansen (f.eks. "Johannes 3:16" eller "Salmene 23:1") i et 'ref'-felt.
2. En kort, lærerik forklaring på norsk om hvorfor dette verset/kapittelet har sammenheng med "${chapterName}" i et 'explanation'-felt.

Sørg for at referansen skrives på et standard format som kan tolkes av en søkemotor (f.eks. "Johannes 3:16", "1. Mosebok 1:1", "Salmene 23:3", "Romerne 8:28").

Returner nøyaktig JSON i henhold til dette skjemaet:
[
  {
    "ref": "Referanse (f.eks. Salmene 23:1)",
    "explanation": "Kort teologisk begrunnelse for hvorfor det henger sammen..."
  }
]`;

          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    ref: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["ref", "explanation"]
                }
              }
            }
          });

          if (response.text) {
            return res.status(200).json(JSON.parse(response.text));
          }
        } catch (aiErr) {
          console.error("Gemini cross-references lookup failed:", aiErr);
        }
      }

      // Fallback static cross-references
      return res.status(200).json([
        { ref: "Johannes 3:16", explanation: "Guds kjærlighet og frelsesplan for menneskeheten." },
        { ref: "Salmene 23:1", explanation: "Herren som vår hyrde og beskytter i alle livets faser." },
        { ref: "Romerne 8:28", explanation: "Guds overordnede plan der alt samvirker til det gode." }
      ]);
    }

    // 3. GET /api/bible/bibles/:bibleId/books
    let match = pathname.match(/^\/api\/bible\/bibles\/([^\/]+)\/books$/);
    if (match) {
      const bibleId = match[1];
      let targetBible = bibleId;
      if (bibleId === "NOR1921" || bibleId === "OPENBIBLE_NB") {
        targetBible = "DNB";
      } else if (bibleId.startsWith("OPENBIBLE_")) {
        targetBible = "WEB";
      } else if (bibleId === "RVR1960") {
        targetBible = "RV1960";
      }

      const bollsData = await fetchWithServerCache(
        `books_${targetBible}`,
        `https://bolls.life/get-books/${targetBible}/`
      );

      const books = bollsData.map(b => ({
        id: String(b.bookid),
        name: b.name,
        nameLong: b.name
      }));

      return res.status(200).json({ data: books });
    }

    // 4. GET /api/bible/bibles/:bibleId/books/:bookId/chapters
    match = pathname.match(/^\/api\/bible\/bibles\/([^\/]+)\/books\/([^\/]+)\/chapters$/);
    if (match) {
      const bibleId = match[1];
      const bookId = match[2];
      let targetBible = bibleId;
      if (bibleId === "NOR1921" || bibleId === "OPENBIBLE_NB") {
        targetBible = "DNB";
      } else if (bibleId.startsWith("OPENBIBLE_")) {
        targetBible = "WEB";
      } else if (bibleId === "RVR1960") {
        targetBible = "RV1960";
      }

      const bollsData = await fetchWithServerCache(
        `books_${targetBible}`,
        `https://bolls.life/get-books/${targetBible}/`
      );

      const book = bollsData.find(b => String(b.bookid) === String(bookId));
      const totalChapters = book ? book.chapters : 0;

      const chapters = [];
      for (let i = 1; i <= totalChapters; i++) {
        chapters.push({
          id: `${bookId}_${i}`,
          number: String(i),
          reference: `${book ? book.name : "Bok"} ${i}`
        });
      }

      return res.status(200).json({ data: chapters });
    }

    // 5. GET /api/bible/bibles/:bibleId/chapters/:chapterId
    match = pathname.match(/^\/api\/bible\/bibles\/([^\/]+)\/chapters\/([^\/]+)$/);
    if (match) {
      const bibleId = match[1];
      const chapterId = match[2];
      let targetBible = bibleId;
      if (bibleId === "NOR1921" || bibleId === "OPENBIBLE_NB") {
        targetBible = "DNB";
      } else if (bibleId.startsWith("OPENBIBLE_")) {
        targetBible = "WEB";
      } else if (bibleId === "RVR1960") {
        targetBible = "RV1960";
      }

      const [bookId, chapterNum] = chapterId.includes("_") ? chapterId.split("_") : [null, null];
      if (!bookId || !chapterNum) {
        return res.status(400).json({ error: "Invalid chapterId format. Expected BOOKID_CHAPTERNUM" });
      }

      const bollsBooks = await fetchWithServerCache(
        `books_${targetBible}`,
        `https://bolls.life/get-books/${targetBible}/`
      );

      let bookName = "Bok";
      const book = bollsBooks.find(b => String(b.bookid) === String(bookId));
      if (book) {
        bookName = book.name;
      }

      // Fetch from GitHub for OpenBible Bokmål
      if (bibleId === "OPENBIBLE_NB") {
        const bookIndex = parseInt(bookId, 10);
        const folderName = OPENBIBLE_NB_FOLDERS[bookIndex - 1];
        if (folderName) {
          const jsonPrefix = getJsonPrefix(folderName);
          const padLength = bookIndex === 19 ? 3 : 2;
          const chapterNumPadded = String(chapterNum).padStart(padLength, "0");
          const githubUrl = `https://raw.githubusercontent.com/OpentranslationBible/open-bible/main/lang/nb-NO/${encodeURIComponent(folderName)}/json/${jsonPrefix}-${chapterNumPadded}.json`;

          try {
            const openBibleData = await fetchWithServerCache(
              `openbible_nb_chapter_${bookId}_${chapterNum}`,
              githubUrl
            );

            const mappedVerses = [];
            for (const item of openBibleData.verses) {
              if (item.verse === undefined || item.verse === null) continue;
              const rawLines = Array.isArray(item.text) ? item.text : [String(item.text || "")];
              const cleanedLines = rawLines
                .map((line) => line.trim().replace(/^>\s*/, ""))
                .filter(line => line !== "---" && line.length > 0);

              if (cleanedLines.length === 0) continue;

              mappedVerses.push({
                verse: Number(item.verse),
                text: cleanedLines.join(" ")
              });
            }

            const htmlContent = mappedVerses.map(v => {
              return `<p><sup class="v">${v.verse}</sup>${v.text}</p>`;
            }).join("\n");

            return res.status(200).json({
              data: {
                content: htmlContent,
                verses: mappedVerses,
                reference: `${bookName} ${chapterNum}`
              }
            });
          } catch (fetchErr) {
            console.warn(`OpenBible NB live fetch failed for ${bookId}:${chapterNum}, falling back to DNB:`, fetchErr.message);
          }
        }
      }

      // Standard fallback / Bolls.life proxy
      const verses = await fetchWithServerCache(
        `chapter_${targetBible}_${bookId}_${chapterNum}`,
        `https://bolls.life/get-chapter/${targetBible}/${bookId}/${chapterNum}/`
      );

      const htmlContent = verses.map(v => {
        let cleanText = v.text.replace(/<S>\d+<\/S>/g, "");
        return `<p><sup class="v">${v.verse}</sup>${cleanText}</p>`;
      }).join("\n");

      return res.status(200).json({
        data: {
          content: htmlContent,
          verses: verses.map(v => ({ verse: Number(v.verse), text: v.text.replace(/<S>\d+<\/S>/g, "") })),
          reference: `${bookName} ${chapterNum}`
        }
      });
    }

    return res.status(404).json({ error: "Route not found" });
  } catch (error) {
    console.error("Bible API handler error:", error);
    return res.status(500).json({ error: error.message });
  }
}
