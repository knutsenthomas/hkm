import { GoogleGenAI, Type } from "@google/genai";

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
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
          }
        ]
      });
    }

    // 2. GET /api/bible/dictionary
    if (pathname === '/api/bible/dictionary') {
      const word = urlObj.searchParams.get('word');
      const context = urlObj.searchParams.get('context') || '';
      const scriptureRef = urlObj.searchParams.get('scriptureRef') || '';

      if (!word) {
        return res.status(400).json({ error: "Word query parameter is required" });
      }

      const cleanWord = word.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, "");

      const fallbackDict = {
        "nåde": {
          definition: "Guds totale og ufortjente barmhjertighet, kjærlighet og tilgivelse overfor mennesker. Det handler om å få fullstendig tilgivelse og velsignelse helt uavhengig av egne gjerninger eller prestasjoner.",
          category: "Teologisk hovedbegrep",
          contextualNote: "Særlig sentralt i Det nye testamentet gjennom Paulus' brev, som understreker at frelsen er en ren gave."
        },
        "fariseer": {
          definition: "Et medlem av et strengt jødisk religiøst og politisk parti på Jesu tid. De var kjent for sin ekstremt detaljerte og nøyaktige tolkning og overholdelse av Moseboken og de muntlige tradisjonene.",
          category: "Historisk gruppe",
          contextualNote: "I evangeliene oppstår det ofte opphetede diskusjoner mellom Jesus og fariseerne knyttet til hjerteinnstilling kontra ytre regler."
        },
        "sabbat": {
          definition: "Den jødiske hviledagen, feiret fra fredag kveld til lørdag kveld til minne om at Gud hvilte på den syvende skaperdagen, samt friheten fra slaveriet i Egypt.",
          category: "Religiøs praksis",
          contextualNote: "Sabbaten var ment som en dyrebar gave til hvile og fellesskap, men ble på Jesu tid gjenstand for en rekke menneskeskapte restriksjoner."
        },
        "samaritan": {
          definition: "En innbygger av landskapet Samaria. De hadde sin egen versjon av Moseboken og holdt sitt alter på fjellet Garisim fremfor Jerusalem.",
          category: "Kulturell/etnisk gruppe",
          contextualNote: "Det var dype historiske og religiøse motsetninger mellom jøder og samaritanere, noe som gjør lignelsen om den barmhjertige samaritan spesielt radikal."
        },
        "apostel": {
          definition: "Fra gresk 'apostolos', som betyr 'en som sendes ut med fullmakt'. Betegner særlig de tolv disiplene som Jesus spesielt utvalgte og sendte ut for å være vitner om hans oppstandelse.",
          category: "Embete / Rolle",
          contextualNote: "I videre forstand brukes det også om andre tidlige misjonsledere, som Paulus eller Barnabas."
        },
        "evangelium": {
          definition: "Betyr opprinnelig 'et godt budskap' eller 'gledesbudskap'. I bibelsk sammenheng er det det glade budskapet om Jesus Kristus, frelsen og Guds riks komme.",
          category: "Akkreditert sjanger",
          contextualNote: "Også brukt om de fire første bøkerekkene i NT: Matteus, Markus, Lukas og Johannes."
        },
        "manna": {
          definition: "Betyr bokstavelig talt 'hva er dette?'. Det var den mirakuløse brødlignende føden som Gud ga israelittene fra himmelen hver morgen under ørkenvandringen etter flukten fra Egypt.",
          category: "Mirakel / Symbol",
          contextualNote: "I Johannesevangeliet 6 omtaler Jesus seg selv som 'det sanne brødet fra himmelen' som gir evig liv, som en motsetning til mannaen."
        },
        "pakt": {
          definition: "En høytidelig, bindende og hellig avtale eller forbund, vanligvis mellom to parter. I Bibelen beskriver det rammene for fellesskapet mellom Gud og mennesker.",
          category: "Teologisk kjernebegrep",
          contextualNote: "Gud oppretter pakter med Noah, Abraham, Moses og David. Den gamle pakt avløses av Den nye pakt beseglet med Jesu blod."
        },
        "profet": {
          definition: "En person som taler på vegne av Gud. En profet fungerer som Guds talsmann, formidler guddommelige åpenbaringer, kaller folket tilbake til pakten og peker frem mot Guds frelsesplan.",
          category: "Rolle / Tjeneste",
          contextualNote: "De gammeltestamentlige profetene forutså ofte messianske hendelser som ble oppfylt i Jesus Kristus."
        },
        "forløsning": {
          definition: "Å kjøpe noen fri fra slaveri, fangenskap eller dødsstraff ved å betale en løsepenge. Teologisk betyr det at Jesus kjøpte menneskeheten fri fra syndens og mørkets herredømme.",
          category: "Soteriologi (Frelseslære)",
          contextualNote: "Ordet har en dyp forankring i de antikke slavetorgene, og illustrerer prisen Jesus betalte på korset."
        },
        "hellig": {
          definition: "Noe som er fullstendig rent, opphøyd og adskilt fra det verdslige – satt helt til side til Guds ære. Særlig uttrykk for Guds innerste uforfalskete vesen.",
          category: "Gudsatt attributt",
          contextualNote: "Gud kaller også sine troende til å være hellige, det vil si å leve liv preget av kjærlighet og moralsk renhet."
        },
        "prest": {
          definition: "En person som er innviet to å tjene som et bindeledd og en mellommann mellom Gud og mennesker, særlig ved å bære frem ofringer, be for folket og velsigne dem.",
          category: "Embede",
          contextualNote: "I Det gamle testamentet var prestene av Levis stamme. I Det nye testamentet beskrives Jesus som vår evige yppersteprest, og alle troende sies å være et 'kongelig presteskap'."
        },
        "hedning": {
          definition: "Historisk sett et bibelsk begrep som ble brukt om alle folkeslag og nasjoner som ikke tilhørte det jødiske folk (israelittene) og dermed var utenfor mosepakten.",
          category: "Historisk klassifisering",
          contextualNote: "Evangeliet starter hos jødene, men åpnes fullstendig opp for hedningene (oss andre) gjennom misjonsbefalingen og Paulus' virke."
        }
      };

      let entry = fallbackDict[cleanWord];
      if (!entry) {
        const foundKey = Object.keys(fallbackDict).find(k => cleanWord.includes(k) || k.includes(cleanWord));
        if (foundKey) {
          entry = fallbackDict[foundKey];
        }
      }

      // Vercel serverless function environment key
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const prompt = `Du er en ekspert på teologi og bibelhistorie. 
Vurder først ekstremt nøye om søkeordet eller emnet "${word}" har relevans til Bibelen, kristen teologi, kristendom, kirkehistorie, bibelhistorie, religiøse retninger, bønner eller jødisk-kristne bibelske kontekster/historier.

Dersom emnet/ordet "${word}" overhode ikke har noen relevans eller tilknytning til Bibelen, kristendom, teologi, kirkehistorie, jødisk-kristen tro eller bibelske emner (for eksempel hvis brukeren søker etter sekulære, dagligdagse ting eller ting som 'iPhone', 'fotball', 'pizza', 'programmering', 'hvordan fjerne snø', 'katt' etc.), skal du nekte å definere eller belyse begrepet, og i stedet gi følgende faste avvisningssvar:
- Sett 'category' til: "Ikke bibelrelatert"
- Sett 'definition' til: "Søket fraviker fra bibelrelaterte emner. Denne AI-ordboken er reservert for bibelstudie og tillater kun søk etter konsepter eller ord relatert til Bibelen, kristen teologi, tro, kirkehistorie eller bibelsk geografi/historie."
- Sett 'contextualNote' til: "Søk avvist pga. manglende teologisk eller bibelsk relevans."

Dersom ordet ER relevant for Bibelen eller teologi, skal du tilpasse svaret og lengden til hva brukeren søker etter på en fyldig, inspirerende og lærerik måte:
1. Hvis brukeren søker etter bibelvers om noe (f.eks. "bibelvers om Jesus", "vers om håp", "skrifter om kjærlighet"), skal du liste opp flere (gjerne 4 til 8 eller flere) svært relevante bibelvers med tydelige kapittel- og versangivelser (f.eks. 'Johannes 3:16') og sitere teksten, samt gjerne legge til korte, inspirerende teologiske kommentarer til hvert vers eller samlet.
2. Hvis brukeren søker etter handlinger eller historier om en bibelsk skikkelse (f.eks. "hva gjorde Josef", "fortellingen om Moses", "historien om Maria"), skal du skrive en levende, spennende og fyldig fortellende beretning (en slags dyp fortelling) om hva personen gjorde, deres reise, utfordringer, rolle i Guds frelsesplan og den evige teologiske betydningen av deres liv.
3. For ordinære begreper (f.eks. "nåde", "sabbat", "frelse"), lag en forklaring som er nøyaktig, klar, lærerik, dyp og historisk presis på flytende og varmt norsk, tilpasset bibelstudium.

${scriptureRef ? `Ordet ble markert av brukeren i bibelteksten referert som: ${scriptureRef}.` : ""}
${context ? `Her er verskonteksten ordet står i: "${context}".` : ""}

Returner nøyaktig JSON i henhold til dette skjemaet:
{
  "word": "${word}",
  "definition": "En definisjon eller forklaring her...",
  "category": "Kategori her...",
  "contextualNote": "Kort oppsummering...",
  "crossReferences": [
    {
      "ref": "Standard bibelreferanse (f.eks. Johannes 3:16)",
      "text": "Vers-tekst eller en kort forklaring på sammenhengen..."
    }
  ]
}`;

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
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
                required: ["word", "definition", "category", "contextualNote", "crossReferences"]
              }
            }
          });

          if (response.text) {
            return res.status(200).json(JSON.parse(response.text));
          }
        } catch (aiErr) {
          console.error("Gemini lookup failed, falling back to static:", aiErr);
        }
      }

      if (entry) {
        return res.status(200).json({
          word,
          definition: entry.definition,
          category: entry.category,
          contextualNote: entry.contextualNote,
          crossReferences: [
            { ref: "Johannes 3:16", text: "Et sentralt vers om Guds nåde og kjærlighet." },
            { ref: "Romerne 3:24", text: "Rettferdiggjort ufortjent av hans nåde." }
          ]
        });
      }

      return res.status(200).json({
        word,
        definition: `Ingen forhåndsdefinert forklaring funnet for "${word}". Legg til en Gemini API-nøkkel på serveren for å aktivere full AI-ordbok.`,
        category: "Ordbok",
        contextualNote: "Søk uten treff.",
        crossReferences: []
      });
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
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
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
            model: "gemini-2.5-flash",
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
