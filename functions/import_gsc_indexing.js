const admin = require('firebase-admin');
const serviceAccount = require('/Users/thomasknutsen/Downloads/his-kingdom-ministry-6bc0dc1f619d.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const rawData = `2026-04-19			70
2026-04-20	805	907	56
2026-04-21	807	897	55
2026-04-22	807	897	64
2026-04-23	807	897	70
2026-04-24	807	897	64
2026-04-25	825	882	49
2026-04-26	825	882	71
2026-04-27	825	882	66
2026-04-28	838	866	58
2026-04-29	838	866	56
2026-04-30	838	866	85
2026-05-01	838	866	76
2026-05-02	841	867	70
2026-05-03	841	867	88
2026-05-04	841	867	73
2026-05-05	850	864	94
2026-05-06	850	864	73
2026-05-07	850	864	87
2026-05-08	850	864	88
2026-05-09	848	875	80
2026-05-10	848	875	73
2026-05-11	848	875	67
2026-05-12	841	893	98
2026-05-13	841	893	81
2026-05-14	841	893	103
2026-05-15	841	893	91
2026-05-16	834	898	82
2026-05-17	834	898	53
2026-05-18	834	898	92
2026-05-19	812	908	92
2026-05-20	812	908	99
2026-05-21	812	908	97
2026-05-22	812	908	76
2026-05-23	794	913	92
2026-05-24	794	913	108
2026-05-25	794	913	97
2026-05-26	785	901	86
2026-05-27	785	901	87
2026-05-28	785	901	75
2026-05-29	785	901	84
2026-05-30	790	883	74
2026-05-31	790	883	81
2026-06-01	790	883	72
2026-06-02	815	852	77
2026-06-03	815	852	86
2026-06-04	815	852	94
2026-06-05	815	852	89
2026-06-06	489	885	68
2026-06-07	489	885	81
2026-06-08	489	885	60
2026-06-09	495	851	80
2026-06-10	495	851	93
2026-06-11	495	851	92
2026-06-12	495	851	65
2026-06-13	792	524	70
2026-06-14	792	524	61
2026-06-15	792	524	55
2026-06-16	792	524	58
2026-06-17	792	524	40
2026-06-18	792	524	63
2026-06-19	792	524	46
2026-06-20	792	524	47
2026-06-21	792	524	43
2026-06-22	792	524	34
2026-06-23	792	524	44
2026-06-24	792	524	27
2026-06-25	792	524	21
2026-06-26	792	524	29
2026-06-27	792	524	22
2026-06-28	792	524	38
2026-06-29	792	524	39
2026-06-30	792	524	28
2026-07-01	868	480	27
2026-07-02	868	480	31
2026-07-03	868	480	18
2026-07-04	868	480	23
2026-07-05	868	480	30
2026-07-06	868	480	57
2026-07-07	868	480	25
2026-07-08	868	480	23
2026-07-09	868	480	20
2026-07-10	868	480	25`;

function parseData() {
  const lines = rawData.trim().split('\n');
  const history = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 2) continue;

    const date = parts[0].trim();
    // Handle empty values (e.g. for first row 2026-04-19 where there is no non-indexed or indexed value, only views)
    const nonIndexedVal = parts[1] ? parts[1].trim() : "";
    const indexedVal = parts[2] ? parts[2].trim() : "";
    const viewsVal = parts[3] ? parts[3].trim() : "";

    const nonIndexed = nonIndexedVal ? parseInt(nonIndexedVal, 10) : null;
    const indexed = indexedVal ? parseInt(indexedVal, 10) : null;
    const views = viewsVal ? parseInt(viewsVal, 10) : 0;

    history.push({
      date,
      nonIndexed,
      indexed,
      views
    });
  }

  return history;
}

async function saveToFirestore() {
  const history = parseData();
  console.log(`Parsed ${history.length} GSC indexation records.`);

  // Find the latest values to save as current status summaries
  let latestIndexed = 0;
  let latestNonIndexed = 0;
  let latestDate = "";

  // Loop backwards to find the latest non-null indexed / non-indexed row
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].indexed !== null && history[i].nonIndexed !== null) {
      latestIndexed = history[i].indexed;
      latestNonIndexed = history[i].nonIndexed;
      latestDate = history[i].date;
      break;
    }
  }

  const reasons = [
    { reason: "Ikke funnet (404)", source: "Nettsted", validation: "Ikke startet", count: 545 },
    { reason: "Gjennomsøkt – ikke indeksert for øyeblikket", source: "Google-systemer", validation: "Ikke startet", count: 251 },
    { reason: "Side med viderekobling", source: "Nettsted", validation: "Ikke startet", count: 32 },
    { reason: "Ekskludert med en «noindex»-tag", source: "Nettsted", validation: "Ikke startet", count: 21 },
    { reason: "Alternativ side med gyldig kanonisk tag", source: "Nettsted", validation: "Ikke startet", count: 6 },
    { reason: "Oppdaget – ikke indeksert for øyeblikket", source: "Google-systemer", validation: "Ikke startet", count: 5 },
    { reason: "Blokkert av robots.txt", source: "Nettsted", validation: "Ikke startet", count: 4 },
    { reason: "Blokkert på grunn av «tilgang forbudt» (403)", source: "Nettsted", validation: "Ikke startet", count: 3 },
    { reason: "Blokkert på grunn av et annet 4xx-problem", source: "Nettsted", validation: "Ikke startet", count: 1 }
  ];

  const docData = {
    history,
    reasons,
    summary: {
      latestDate,
      indexed: latestIndexed,
      nonIndexed: latestNonIndexed,
      total: latestIndexed + latestNonIndexed,
      indexingRate: latestIndexed + latestNonIndexed > 0 ? parseFloat(((latestIndexed / (latestIndexed + latestNonIndexed)) * 100).toFixed(1)) : 0
    },
    updatedAt: new Date().toISOString()
  };

  console.log("Latest summary data:", docData.summary);

  await db.collection('content').doc('gsc_indexation_status').set(docData);
  console.log("✅ Firestore document content/gsc_indexation_status updated successfully!");
  process.exit(0);
}

saveToFirestore().catch(err => {
  console.error("Feil ved lagring til Firestore:", err);
  process.exit(1);
});
