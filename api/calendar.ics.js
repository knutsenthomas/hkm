export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="hkm-kurs.ics"');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Standard HKM Courses / Events list
    const events = [
      {
        id: 'hkm-kurs-1',
        title: 'HKM Møte & Undervisning',
        description: 'Ukentlig samling med lovsang, undervisning og bønnefellesskap.',
        location: 'His Kingdom Ministry, Norge',
        startDate: '20260901T170000Z',
        endDate: '20260901T190000Z'
      },
      {
        id: 'hkm-kurs-2',
        title: 'Bønn & Lovsangkveld',
        description: 'Kveld avsatt til intimitetsbønn og tilbedelse.',
        location: 'His Kingdom Ministry, Norge',
        startDate: '20260915T180000Z',
        endDate: '20260915T200000Z'
      }
    ];

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//His Kingdom Ministry//HKM Kurs Kalender//NO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:HKM Kurs & Arrangementer',
      'X-WR-TIMEZONE:Europe/Oslo'
    ];

    events.forEach(ev => {
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${ev.id}@hiskingdomministry.no`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${ev.startDate}`,
        `DTEND:${ev.endDate}`,
        `SUMMARY:${ev.title}`,
        `DESCRIPTION:${ev.description}`,
        `LOCATION:${ev.location}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    return res.status(200).send(icsContent.join('\r\n'));
  } catch (err) {
    console.error('ICS Calendar Error:', err);
    return res.status(500).send('Error generating calendar feed');
  }
}
