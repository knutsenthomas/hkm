// Contacts (read + careful writes) and read-only giving, shop and school data for the HKM Claude connector.
// National ID numbers are never read out or written.
const { z } = require('zod');

const CONTACT_STATUSES = ['IKKE_MEDLEM', 'MEDLEM', 'BLOKKERT'];
const SAFE_CONTACT_FIELDS = ['firstName', 'lastName', 'displayName', 'email', 'phone', 'address', 'zip', 'city', 'country', 'status'];

function iso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function createAdminAiTools({ db, HttpsError }) {
  const contactLabels = c => {
    const set = new Set([...(Array.isArray(c.labels) ? c.labels : []), ...(Array.isArray(c.tags) ? c.tags : []), ...(c.label ? [c.label] : [])]);
    return [...set].filter(l => typeof l === 'string' && l.trim());
  };
  const safeContact = (id, c) => ({
    id, ...Object.fromEntries(SAFE_CONTACT_FIELDS.filter(f => c[f]).map(f => [f, c[f]])),
    name: c.displayName || [c.firstName, c.lastName].filter(Boolean).join(' '),
    labels: contactLabels(c), createdAt: iso(c.createdAt), updatedAt: iso(c.updatedAt), lastLogin: iso(c.lastLogin)
  });
  const normalizeEmail = email => String(email || '').trim().toLowerCase();

  async function searchContacts(account, { query, label, status, limit = 25 }) {
    const snapshot = await db.collection('contacts').get();
    const needle = query?.trim().toLowerCase();
    const wantedLabel = label?.trim().toLowerCase();
    const found = snapshot.docs.map(doc => safeContact(doc.id, doc.data()))
      .filter(c => !needle || [c.name, c.email, c.phone, c.city].filter(Boolean).join(' ').toLowerCase().includes(needle))
      .filter(c => !wantedLabel || c.labels.some(l => l.toLowerCase() === wantedLabel))
      .filter(c => !status || c.status === status)
      .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    return { total: found.length, contacts: found.slice(0, limit) };
  }

  async function contactLabelsOverview() {
    const snapshot = await db.collection('contacts').get();
    const counts = {};
    snapshot.docs.forEach(doc => contactLabels(doc.data()).forEach(l => { counts[l] = (counts[l] || 0) + 1; }));
    return { totalContacts: snapshot.size, labels: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count })) };
  }

  async function getContact(account, { id }) {
    const snapshot = await db.collection('contacts').doc(id).get();
    if (!snapshot.exists) throw new HttpsError('not-found', 'Fant ikke kontakten.');
    return safeContact(id, snapshot.data());
  }

  async function createContact(account, input) {
    const email = normalizeEmail(input.email);
    const all = await db.collection('contacts').get();
    const match = all.docs.find(doc => normalizeEmail(doc.data().email) === email);
    if (match) {
      return { duplicate: true, contact: safeContact(match.id, match.data()), note: 'Kontakten finnes allerede. Bruk update_contact for å endre den.' };
    }
    const labels = input.labels?.length ? input.labels : ['Ny'];
    const now = new Date().toISOString();
    const data = {
      firstName: input.firstName, lastName: input.lastName, displayName: `${input.firstName} ${input.lastName}`.trim(), email,
      phone: input.phone || '', address: input.address || '', zip: input.zip || '', city: input.city || '', country: input.country || 'Norge',
      label: labels[0], labels, status: input.status || 'IKKE_MEDLEM',
      createdAt: now, updatedAt: now, createdBy: 'claude', updatedBy: 'claude', createdByUid: account.uid
    };
    const ref = db.collection('contacts').doc();
    await ref.set(data);
    return { created: true, contact: safeContact(ref.id, data) };
  }

  async function updateContact(account, input) {
    const ref = db.collection('contacts').doc(input.id);
    const contact = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new HttpsError('not-found', 'Fant ikke kontakten.');
      const current = snapshot.data();
      const patch = { updatedAt: new Date().toISOString(), updatedBy: 'claude' };
      for (const field of ['firstName', 'lastName', 'phone', 'address', 'zip', 'city', 'country', 'status']) {
        if (input[field] !== undefined) patch[field] = input[field];
      }
      if (input.email !== undefined) patch.email = normalizeEmail(input.email);
      if (input.firstName !== undefined || input.lastName !== undefined) {
        patch.displayName = `${patch.firstName ?? current.firstName ?? ''} ${patch.lastName ?? current.lastName ?? ''}`.trim();
      }
      if (input.addLabels || input.removeLabels) {
        const remove = new Set((input.removeLabels || []).map(l => l.toLowerCase()));
        const labels = [...new Set([...contactLabels(current), ...(input.addLabels || [])])].filter(l => !remove.has(l.toLowerCase()));
        patch.labels = labels;
        patch.label = labels[0] || '';
        if (Array.isArray(current.tags)) patch.tags = current.tags.filter(t => !remove.has(String(t).toLowerCase()));
      }
      transaction.set(ref, patch, { merge: true });
      return { ...current, ...patch };
    });
    return safeContact(input.id, contact);
  }

  async function listTransactions(account, { kind = 'all', from, to, query, limit = 50 }) {
    let ref = db.collection('donations').orderBy('timestamp', 'desc');
    if (from) ref = ref.where('timestamp', '>=', new Date(`${from}T00:00:00Z`));
    if (to) ref = ref.where('timestamp', '<=', new Date(`${to}T23:59:59Z`));
    const snapshot = await ref.limit(from || to ? 5000 : 1000).get();
    const needle = query?.trim().toLowerCase();
    const rows = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id, date: iso(d.timestamp || d.completedAt || d.paidAt), name: d.donorName || d.name || '',
        amount: d.amountNok ?? d.amount ?? null, currency: d.currency || 'NOK',
        kind: d.type === 'butikk' || d.source === 'wix_store' ? 'order' : 'gift',
        type: d.type || '', method: d.method || '', fund: d.fund || null, status: d.status || '',
        ...(d.productName ? { products: d.productName } : {}), ...(d.isInKind ? { inKind: true } : {})
      };
    })
      .filter(r => kind === 'all' || r.kind === kind)
      .filter(r => !needle || `${r.name} ${r.products || ''} ${r.fund || ''}`.toLowerCase().includes(needle));
    const completed = rows.filter(r => r.status === 'completed' && r.currency === 'NOK' && typeof r.amount === 'number');
    const sum = list => Math.round(list.reduce((n, r) => n + r.amount, 0) * 100) / 100;
    return {
      count: rows.length,
      totalsNok: { gifts: sum(completed.filter(r => r.kind === 'gift')), orders: sum(completed.filter(r => r.kind === 'order')) },
      note: 'Summene teller bare fullførte transaksjoner i NOK.',
      transactions: rows.slice(0, limit)
    };
  }

  async function listEnrollments(account, { course, status, limit = 50 }) {
    const snapshot = await db.collection('courseEnrollments').orderBy('enrolledAt', 'desc').limit(2000).get();
    const needle = course?.trim().toLowerCase();
    const rows = snapshot.docs.map(doc => {
      const e = doc.data();
      return {
        id: doc.id, name: e.name || '', email: e.email || '', phone: e.phone || '', course: e.courseTitle || '',
        amount: e.amount ?? null, method: e.paymentMethod || e.method || '', status: e.status || '', enrolledAt: iso(e.enrolledAt)
      };
    })
      .filter(r => !needle || r.course.toLowerCase().includes(needle))
      .filter(r => !status || r.status === status);
    const byStatus = rows.reduce((acc, r) => ({ ...acc, [r.status || 'ukjent']: (acc[r.status || 'ukjent'] || 0) + 1 }), {});
    return { count: rows.length, byStatus, enrollments: rows.slice(0, limit) };
  }

  const messageSummary = (id, m) => ({
    id, name: m.name || '', email: m.email || '', phone: m.phone || '', subject: m.subject || '',
    status: m.status || 'ny', createdAt: iso(m.createdAt),
    preview: String(m.message || '').replace(/\s+/g, ' ').slice(0, 160), replyCount: Array.isArray(m.replies) ? m.replies.length : 0
  });

  async function listMessages(account, { status = 'all', query, limit = 25 }) {
    const snapshot = await db.collection('contactMessages').orderBy('createdAt', 'desc').limit(1000).get();
    const needle = query?.trim().toLowerCase();
    const rows = snapshot.docs.map(doc => messageSummary(doc.id, doc.data()))
      .filter(m => status === 'all' || m.status === status)
      .filter(m => !needle || `${m.name} ${m.email} ${m.subject} ${m.preview}`.toLowerCase().includes(needle));
    const unread = snapshot.docs.filter(doc => (doc.data().status || 'ny') === 'ny').length;
    return { count: rows.length, unread, messages: rows.slice(0, limit) };
  }

  async function getMessage(account, { id }) {
    const snapshot = await db.collection('contactMessages').doc(id).get();
    if (!snapshot.exists) throw new HttpsError('not-found', 'Fant ikke meldingen.');
    const m = snapshot.data();
    return {
      ...messageSummary(id, m), message: String(m.message || ''),
      replies: (Array.isArray(m.replies) ? m.replies : []).map(r => ({
        at: iso(r.sentAt || r.at || r.createdAt), by: r.by || r.from || r.sentBy || '', subject: r.subject || '',
        text: String(r.text || r.message || r.body || '').slice(0, 4000)
      }))
    };
  }

  async function markMessageRead(account, { id }) {
    const ref = db.collection('contactMessages').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new HttpsError('not-found', 'Fant ikke meldingen.');
    if ((snapshot.data().status || 'ny') === 'ny') await ref.set({ status: 'lest', readAt: new Date(), readBy: 'claude' }, { merge: true });
    return messageSummary(id, { ...snapshot.data(), status: (snapshot.data().status || 'ny') === 'ny' ? 'lest' : snapshot.data().status });
  }

  const shortText = max => z.string().trim().min(1).max(max).regex(/^[^\r\n]+$/);
  const optText = max => z.string().trim().max(max).regex(/^[^\r\n]*$/).optional();
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  const contactFields = {
    phone: optText(40), address: optText(200), zip: optText(20), city: optText(100), country: optText(80),
    status: z.enum(CONTACT_STATUSES).optional().describe('Medlemsstatus. Nettstedsmedlem settes i admin.')
  };

  return {
    search_contacts: {
      description: 'Søk i kontaktene i HKM-admin på navn, e-post, telefon eller sted, og filtrer på etikett eller status. Personnummer vises aldri.',
      schema: z.object({ query: z.string().max(200).optional(), label: z.string().max(100).optional(), status: z.enum([...CONTACT_STATUSES, 'NETTSTEDSMEDLEM']).optional(), limit: z.number().int().min(1).max(200).optional() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: searchContacts
    },
    contact_labels: {
      description: 'Vis alle etiketter som brukes på kontaktene, med antall.',
      schema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: contactLabelsOverview
    },
    get_contact: {
      description: 'Hent én kontakt.',
      schema: z.object({ id: z.string().min(1).max(200) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: getContact
    },
    create_contact: {
      description: 'Legg til en ny kontakt. Hvis e-posten finnes fra før, returneres den eksisterende kontakten uten endring.',
      schema: z.object({ firstName: shortText(100), lastName: shortText(100), email: z.string().email().max(254), labels: z.array(shortText(60)).max(20).optional(), ...contactFields }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      handler: createContact
    },
    update_contact: {
      description: 'Endre en kontakt eller legg til og fjern etiketter. Bare feltene du sender endres. Etiketter kan styre hvem som får nyhetsbrev, så bekreft med brukeren før du fjerner noen.',
      schema: z.object({
        id: z.string().min(1).max(200), firstName: shortText(100).optional(), lastName: shortText(100).optional(), email: z.string().email().max(254).optional(),
        addLabels: z.array(shortText(60)).max(20).optional(), removeLabels: z.array(shortText(60)).max(20).optional(), ...contactFields
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      handler: updateContact
    },
    list_transactions: {
      description: 'Les gaver og butikkordre (kun lesing), nyeste først, med sum for perioden. kind: gift, order eller all. Datoer som ÅÅÅÅ-MM-DD.',
      schema: z.object({ kind: z.enum(['all', 'gift', 'order']).optional(), from: date.optional(), to: date.optional(), query: z.string().max(200).optional(), limit: z.number().int().min(1).max(500).optional() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: listTransactions
    },
    list_messages: {
      description: 'Les innboksen fra kontaktskjemaet på hiskingdomministry.no, nyeste først. status: ny (ulest), lest, besvart eller all. Svar sendes fra admin HKM; Claude kan skrive forslag til svar.',
      schema: z.object({ status: z.enum(['all', 'ny', 'lest', 'besvart']).optional(), query: z.string().max(200).optional(), limit: z.number().int().min(1).max(200).optional() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: listMessages
    },
    get_message: {
      description: 'Hent hele meldingen fra kontaktskjemaet, med svarene som er sendt.',
      schema: z.object({ id: z.string().min(1).max(200) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: getMessage
    },
    mark_message_read: {
      description: 'Merk en ny melding fra kontaktskjemaet som lest.',
      schema: z.object({ id: z.string().min(1).max(200) }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      handler: markMessageRead
    },
    list_course_enrollments: {
      description: 'Les påmeldinger og betalingsstatus i HKM-skolen (kun lesing). Kan filtrere på kurs og status.',
      schema: z.object({ course: z.string().max(200).optional(), status: z.string().max(40).optional(), limit: z.number().int().min(1).max(500).optional() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: listEnrollments
    }
  };
}

module.exports = { createAdminAiTools };
