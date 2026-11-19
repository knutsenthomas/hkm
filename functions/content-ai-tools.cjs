// Blog and teaching tools for the HKM Claude connector (served from newsletterMcp).
// Claude writes drafts; publishing is a separate, explicit step.
const { createHash } = require('node:crypto');
const { z } = require('zod');

const SITE = 'https://www.hiskingdomministry.no';
const ADMIN_URL = `${SITE}/admin/`;
const TYPES = {
  blog: { docId: 'collection_blog', label: 'Blogginnlegg', category: 'Blogg' },
  teaching: { docId: 'collection_teaching', label: 'Undervisning', category: 'Bibelstudie' },
  events: { docId: 'collection_events', label: 'Arrangement', category: '', page: 'arrangement-detaljer.html' }
};
const EVENT_FIELDS = ['location', 'eventLink', 'eventLinkText', 'eventRecurring', 'eventAdditionalDates', 'eventSchedule'];
const TEACHING_TYPES = ['Bibelstudie', 'Seminarer', 'Undervisningsserier'];

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Markdown inline -> the small HTML subset the site's block renderer prints as-is.
function inline(text) {
  let html = escapeHtml(text.trim());
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => `<a href="${url}">${label}</a>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
  html = html.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/(^|\W)_([^_\s][^_]*)_(?=\W|$)/g, '$1<i>$2</i>');
  return html;
}

function markdownToBlocks(markdown) {
  const blocks = [];
  let paragraph = [];
  let list = null;
  let quote = [];
  const id = () => Math.random().toString(36).slice(2, 12);
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ id: id(), type: 'paragraph', data: { text: paragraph.map(inline).join('<br>') } });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ id: id(), type: 'list', data: { style: list.style, items: list.items.map(inline) } });
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) {
      const caption = quote.length > 1 && /^[—–-]\s*/.test(quote[quote.length - 1]) ? quote.pop().replace(/^[—–-]\s*/, '') : '';
      blocks.push({ id: id(), type: 'quote', data: { text: quote.map(inline).join('<br>'), caption: caption ? inline(caption) : '', alignment: 'left' } });
    }
    quote = [];
  };
  const flushAll = () => { flushParagraph(); flushList(); flushQuote(); };

  for (const raw of String(markdown).replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    let match;
    if (!line.trim()) { flushAll(); continue; }
    if ((match = line.match(/^\s*>\s?(.*)$/))) { flushParagraph(); flushList(); quote.push(match[1]); continue; }
    flushQuote();
    if ((match = line.match(/^(#{1,4})\s+(.+)$/))) {
      flushAll();
      blocks.push({ id: id(), type: 'header', data: { text: inline(match[2]), level: Math.max(2, match[1].length) } });
    } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushAll();
      blocks.push({ id: id(), type: 'delimiter', data: {} });
    } else if ((match = line.match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)\s*$/))) {
      flushAll();
      blocks.push({ id: id(), type: 'image', data: { file: { url: match[2] }, caption: escapeHtml(match[1]), withBorder: false, stretched: false, withBackground: false } });
    } else if ((match = line.match(/^\s*(https:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s]*v=|youtu\.be\/)[\w-]{11}[^\s]*)\s*$/))) {
      flushAll();
      blocks.push({ id: id(), type: 'youtubeVideo', data: { url: match[1] } });
    } else if ((match = line.match(/^\s*[-*•]\s+(.+)$/)) || (match = line.match(/^\s*\d+[.)]\s+(.+)$/))) {
      flushParagraph();
      const style = /^\s*\d/.test(line) ? 'ordered' : 'unordered';
      if (list && list.style !== style) flushList();
      if (!list) list = { style, items: [] };
      list.items.push(match[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushAll();
  if (!blocks.length) throw new Error('empty');
  return { time: Date.now(), blocks, version: '2.28.0' };
}

function htmlToMarkdown(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(b|strong)>(.*?)<\/\1>/gi, '**$2**')
    .replace(/<(i|em)>(.*?)<\/\1>/gi, '*$2*')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

function blocksToMarkdown(content) {
  if (typeof content === 'string') return htmlToMarkdown(content.replace(/<\/(p|h\d|li|blockquote)>/gi, '\n\n'));
  if (!content || !Array.isArray(content.blocks)) return '';
  return content.blocks.map(({ type, data = {} }) => {
    switch (String(type).toLowerCase()) {
      case 'header': return `${'#'.repeat(Math.min(Math.max(Number(data.level) || 2, 2), 4))} ${htmlToMarkdown(data.text)}`;
      case 'paragraph': return htmlToMarkdown(data.text);
      case 'list': return (data.items || []).map((item, i) => {
        const text = typeof item === 'string' ? item : (item?.content || item?.text || '');
        return `${data.style === 'ordered' ? `${i + 1}.` : '-'} ${htmlToMarkdown(text)}`;
      }).join('\n');
      case 'quote': return htmlToMarkdown(data.text).split('\n').map(l => `> ${l}`).join('\n') + (data.caption ? `\n> — ${htmlToMarkdown(data.caption)}` : '');
      case 'delimiter': return '---';
      case 'image': return `![${htmlToMarkdown(data.caption || '')}](${data?.file?.url || data.url || ''})`;
      case 'youtubevideo': case 'video': return data.url || data.embed || '';
      default: return '';
    }
  }).filter(Boolean).join('\n\n');
}

function plainText(markdown, max = 160) {
  const text = markdown.replace(/^#+\s.*$/gm, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#-]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text;
}

function versionDocId(collection, docId) {
  return Buffer.from(`site:${collection}:${docId}`, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function createContentAiTools({ db, Timestamp, HttpsError }) {
  const typeOf = type => {
    const config = TYPES[type];
    if (!config) throw new HttpsError('invalid-argument', 'Velg blog, teaching eller events.');
    return config;
  };
  const items = data => (Array.isArray(data?.items) ? data.items : []);
  const publicUrl = (item, type) => `${SITE}/${TYPES[type]?.page || 'blogg-post.html'}?id=${encodeURIComponent(item.id)}`;
  const summary = (item, type) => ({
    id: item.id, title: item.title || '(uten tittel)', date: item.date || null,
    status: item.published === false ? 'draft' : 'published',
    category: item.category || null, author: item.author || null,
    hasEnglish: Boolean(item.translations?.en?.title), url: publicUrl(item, type),
    ...(type === 'events' && item.location ? { location: item.location } : {})
  });
  const toBlocks = markdown => {
    try { return markdownToBlocks(markdown); } catch { throw new HttpsError('invalid-argument', 'Innholdet er tomt.'); }
  };

  async function recordVersion(docId, label, account, reason, collection = 'content') {
    try {
      const snapshot = (await db.collection(collection).doc(docId).get()).data();
      if (!snapshot) return;
      const ref = db.collection('version_history').doc(versionDocId(collection, docId));
      const versionRef = ref.collection('versions').doc();
      const nowIso = new Date().toISOString();
      const batch = db.batch();
      batch.set(ref, {
        scope: 'site', resourceCollection: collection, resourceId: docId, resourceLabel: label,
        latestVersionId: versionRef.id, updatedAt: Timestamp.now(), updatedAtIso: nowIso
      }, { merge: true });
      batch.set(versionRef, {
        scope: 'site', resourceCollection: collection, resourceId: docId, resourceLabel: label, snapshot,
        checksum: createHash('sha256').update(stableSerialize(snapshot)).digest('hex'),
        reason, source: 'claude', createdAt: Timestamp.now(), createdAtIso: nowIso,
        createdByUid: account.uid, createdByEmail: account.email || null
      });
      await batch.commit();
    } catch (error) {
      console.warn('[content-ai] Versjonshistorikk ble ikke lagret:', error?.message);
    }
  }

  // Read-modify-write of the whole items array, inside a transaction so a save in admin is never lost.
  async function mutate(type, account, reason, change) {
    const config = typeOf(type);
    const ref = db.collection('content').doc(config.docId);
    const result = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const list = items(snapshot.data()).slice();
      const outcome = change(list);
      if (snapshot.exists && list.length < items(snapshot.data()).length) {
        throw new HttpsError('internal', 'Lagringen ville fjernet innlegg og ble stoppet.');
      }
      transaction.set(ref, { items: list }, { merge: true });
      return outcome;
    });
    await recordVersion(config.docId, `${config.label} (Claude)`, account, reason);
    return result;
  }

  function findIndex(list, id) {
    const index = list.findIndex(item => item && (item.id === id || item.slug === id));
    if (index < 0) throw new HttpsError('not-found', 'Fant ikke innlegget. Bruk list_content for å finne riktig ID.');
    return index;
  }

  function applyFields(item, input, type) {
    if (input.title !== undefined) item.title = input.title;
    if (input.markdown !== undefined) {
      item.content = toBlocks(input.markdown);
      if (input.description === undefined && !item.description) item.description = plainText(input.markdown);
    }
    if (input.description !== undefined) item.description = input.description;
    if (input.date !== undefined) item.date = input.date;
    if (input.imageUrl !== undefined) item.imageUrl = input.imageUrl;
    if (input.author !== undefined) item.author = input.author;
    if (input.tags !== undefined) item.tags = input.tags;
    if (input.seoTitle !== undefined) item.seoTitle = input.seoTitle;
    if (input.seoDescription !== undefined) item.seoDescription = input.seoDescription;
    if (type === 'teaching') {
      if (input.teachingType !== undefined) { item.teachingType = input.teachingType; item.category = input.teachingType; }
    } else if (input.category !== undefined) {
      item.category = input.category;
    }
    if (type === 'events') {
      for (const field of EVENT_FIELDS) if (input[field] !== undefined) item[field] = input[field];
    }
    if (input.english) {
      const en = { ...(item.translations?.en || {}) };
      const e = input.english;
      if (e.title !== undefined) en.title = e.title;
      if (e.markdown !== undefined) en.content = toBlocks(e.markdown);
      if (e.description !== undefined) en.description = e.description;
      if (e.seoTitle !== undefined) en.seoTitle = e.seoTitle;
      if (e.seoDescription !== undefined) en.seoDescription = e.seoDescription;
      item.translations = { ...(item.translations || {}), en };
    }
    item.dashboardEdited = true;
    item.dashboardEditedAt = new Date().toISOString();
    item.lastEditedBy = 'claude';
  }

  async function listContent(account, { type, query, status = 'all', limit = 20 }) {
    const config = typeOf(type);
    const snapshot = await db.collection('content').doc(config.docId).get();
    const needle = query?.trim().toLowerCase();
    const found = items(snapshot.data()).filter(item => item?.id)
      .filter(item => status === 'all' || (status === 'draft') === (item.published === false))
      .filter(item => !needle || `${item.title || ''} ${(item.tags || []).join(' ')} ${item.category || ''}`.toLowerCase().includes(needle))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    return { type, total: found.length, items: found.slice(0, limit).map(item => summary(item, type)) };
  }

  async function getContent(account, { type, id }) {
    const config = typeOf(type);
    const list = items((await db.collection('content').doc(config.docId).get()).data());
    const item = list[findIndex(list, id)];
    const en = item.translations?.en;
    return {
      ...summary(item, type), description: item.description || '', imageUrl: item.imageUrl || '', tags: item.tags || [],
      seoTitle: item.seoTitle || '', seoDescription: item.seoDescription || '',
      ...(type === 'teaching' ? { teachingType: item.teachingType || item.category || null } : {}),
      ...(type === 'events' ? Object.fromEntries(EVENT_FIELDS.map(field => [field, item[field] || ''])) : {}),
      markdown: blocksToMarkdown(item.content),
      ...(en ? { english: { title: en.title || '', markdown: blocksToMarkdown(en.content), seoTitle: en.seoTitle || '', seoDescription: en.seoDescription || '' } } : {})
    };
  }

  async function createDraft(account, input) {
    const { type } = input;
    const config = typeOf(type);
    const item = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      title: input.title, date: new Date().toISOString().split('T')[0], content: null,
      published: false, author: account.displayName || account.email || 'His Kingdom Ministry', authorPhoto: account.photoURL || '',
      category: config.category, imageUrl: '', tags: [], createdBy: 'claude'
    };
    if (type === 'teaching') item.teachingType = config.category;
    applyFields(item, input, type);
    await mutate(type, account, `Utkast opprettet fra Claude: ${input.title}`, list => list.unshift(item));
    return { ...summary(item, type), adminUrl: ADMIN_URL, note: 'Lagret som utkast. Ikke synlig på nettsiden før det publiseres.' };
  }

  async function updateContent(account, input) {
    const { type, id } = input;
    const updated = await mutate(type, account, 'Endret fra Claude', list => {
      const index = findIndex(list, id);
      const item = { ...list[index] };
      if (item.published !== false && !input.confirmLiveEdit) {
        throw new HttpsError('failed-precondition', 'Innlegget er publisert. Spør brukeren, og send confirmLiveEdit: true for å endre det som ligger ute.');
      }
      applyFields(item, input, type);
      list[index] = item;
      return item;
    });
    return { ...summary(updated, type), adminUrl: ADMIN_URL };
  }

  async function setPublished(account, { type, id, publish }) {
    const item = await mutate(type, account, publish ? 'Publisert fra Claude' : 'Avpublisert fra Claude', list => {
      const index = findIndex(list, id);
      if (publish && !list[index].content) throw new HttpsError('failed-precondition', 'Innlegget har ikke noe innhold ennå.');
      list[index] = { ...list[index], published: publish, dashboardEdited: true, dashboardEditedAt: new Date().toISOString() };
      return list[index];
    });
    return summary(item, type);
  }

  const type = z.enum(['blog', 'teaching', 'events']).describe('blog = blogginnlegg, teaching = undervisning, events = arrangementer');
  const itemId = z.string().trim().min(1).max(200);
  const shortText = max => z.string().trim().min(1).max(max).regex(/^[^\r\n]+$/);
  const markdown = z.string().min(1).max(200_000).describe('Innholdet i Markdown: ## overskrifter, avsnitt, **fet**, *kursiv*, [lenke](https://…), lister, > sitat (siste linje «— kilde» blir kilde), --- skille, ![bildetekst](https://bilde-url) og YouTube-lenker på egen linje.');
  const english = z.object({
    title: shortText(300).optional(), markdown: markdown.optional(), description: z.string().max(500).optional(),
    seoTitle: shortText(120).optional(), seoDescription: z.string().max(320).optional()
  }).describe('Engelsk versjon for den engelske nettsiden.');
  const fields = {
    description: z.string().max(500).optional().describe('Kort ingress. Lages automatisk fra teksten hvis den mangler.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/).optional().describe('Dato (ÅÅÅÅ-MM-DD). For arrangementer med klokkeslett: ÅÅÅÅ-MM-DDTHH:MM.'),
    imageUrl: z.string().url().startsWith('https://').max(2000).optional().describe('Forsidebilde (https-lenke).'),
    author: shortText(120).optional(),
    category: shortText(80).optional().describe('Kategori for blogginnlegg.'),
    teachingType: z.enum(TEACHING_TYPES).optional().describe('Kun for undervisning.'),
    tags: z.array(shortText(60)).max(20).optional(),
    seoTitle: shortText(120).optional(),
    seoDescription: z.string().max(320).optional(),
    location: z.string().max(300).optional().describe('Kun arrangement: sted.'),
    eventLink: z.string().url().startsWith('https://').max(2000).or(z.literal('')).optional().describe('Kun arrangement: påmeldings- eller infolenke.'),
    eventLinkText: z.string().max(80).optional().describe('Kun arrangement: tekst på knappen.'),
    eventRecurring: z.string().max(200).optional().describe('Kun arrangement: gjentakelse, f.eks. «Hver tirsdag kl. 19:00».'),
    eventAdditionalDates: z.string().max(2000).optional().describe('Kun arrangement: flere datoer, én per linje.'),
    eventSchedule: z.string().max(2000).optional().describe('Kun arrangement: program, én linje per tidspunkt.'),
    english: english.optional()
  };

  // ---- Kurs (siteContent/collection_courses). Pris og leksjoner endres kun i admin.
  const coursesRef = () => db.collection('siteContent').doc('collection_courses');
  const courseList = data => (Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
  const courseSummary = course => ({
    id: course.id, title: course.title || '', category: course.category || null, description: course.description || '',
    imageUrl: course.imageUrl || '', pricingModel: course.pricingModel || null, price: course.price ?? null,
    priceSuffix: course.priceSuffix || '', lessonCount: Array.isArray(course.lessons) ? course.lessons.length : 0
  });

  async function listCourses() {
    const list = courseList((await coursesRef().get()).data());
    return { total: list.length, courses: list.filter(Boolean).map(courseSummary) };
  }

  async function updateCourse(account, { id, title, description, imageUrl, confirmLiveEdit }) {
    if (!confirmLiveEdit) throw new HttpsError('failed-precondition', 'Kurs ligger ute med en gang. Spør brukeren, og send confirmLiveEdit: true.');
    const ref = coursesRef();
    const course = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const list = courseList(snapshot.data()).slice();
      const index = list.findIndex(c => c?.id === id);
      if (index < 0) throw new HttpsError('not-found', 'Fant ikke kurset. Bruk list_courses.');
      const next = { ...list[index], updatedAt: new Date().toISOString() };
      if (title !== undefined) next.title = title;
      if (description !== undefined) next.description = description;
      if (imageUrl !== undefined) next.imageUrl = imageUrl;
      list[index] = next;
      transaction.set(ref, { items: list, updatedAt: new Date().toISOString() }, { merge: true });
      return next;
    });
    await recordVersion('collection_courses', 'Kurs (Claude)', account, `Kurs endret fra Claude: ${course.title}`, 'siteContent');
    return courseSummary(course);
  }

  // ---- Sidetekster (content/{side}). Nøkkelen er data-content-key i HTML-en.
  const pageIdPattern = /^[a-z0-9][a-z0-9-]{0,60}$/;
  const keyPattern = /^[A-Za-z][\w-]*(\.[\w-]+){0,6}$/;
  const pageRef = pageId => {
    if (!pageIdPattern.test(pageId) || /^(collection|settings)[_-]/.test(pageId)) throw new HttpsError('invalid-argument', 'Ugyldig side.');
    return db.collection('content').doc(pageId);
  };
  function flatten(value, prefix = '', out = {}) {
    if (typeof value === 'string') { out[prefix] = value; return out; }
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.toDate !== 'function') {
      for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }

  async function listPages() {
    const refs = await db.collection('content').listDocuments();
    const pages = refs.map(ref => ref.id).filter(id => pageIdPattern.test(id) && !/^(collection|settings)[_-]/.test(id)).sort();
    return { pages, note: 'Sidenavnet er filnavnet uten .html, f.eks. index, om-oss, kontakt.' };
  }

  async function getPageTexts(account, { pageId, language = 'no', query }) {
    const data = (await pageRef(pageId).get()).data() || {};
    const source = language === 'no' ? (({ translations, ...rest }) => rest)(data) : data.translations?.[language] || {};
    const needle = query?.trim().toLowerCase();
    const texts = Object.entries(flatten(source))
      .filter(([key, value]) => !needle || key.toLowerCase().includes(needle) || value.toLowerCase().includes(needle))
      .slice(0, 400);
    return {
      pageId, language, url: `${SITE}/${pageId === 'index' ? '' : `${pageId}.html`}`, texts: Object.fromEntries(texts),
      note: 'Tekster som aldri er endret i admin ligger bare i HTML-en og vises ikke her, men kan settes med samme nøkkel.'
    };
  }

  async function updatePageText(account, { pageId, language = 'no', key, value, confirmLiveEdit }) {
    if (!confirmLiveEdit) throw new HttpsError('failed-precondition', 'Sidetekster går live med en gang. Spør brukeren, og send confirmLiveEdit: true.');
    if (!keyPattern.test(key) || key.startsWith('translations')) throw new HttpsError('invalid-argument', 'Ugyldig nøkkel.');
    if (/[<>]/.test(value)) throw new HttpsError('invalid-argument', 'Sidetekster kan ikke inneholde HTML.');
    const ref = pageRef(pageId);
    const path = language === 'no' ? key : `translations.${language}.${key}`;
    const nested = path.split('.').reduceRight((child, part) => ({ [part]: child }), value);
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const existing = flatten(snapshot.data() || {});
      const conflict = Object.keys(existing).some(k => path.startsWith(`${k}.`));
      if (conflict) throw new HttpsError('invalid-argument', 'Nøkkelen kolliderer med en eksisterende tekst.');
      transaction.set(ref, nested, { merge: true });
    });
    await recordVersion(pageId, `Side ${pageId} (Claude)`, account, `Tekst ${path} endret fra Claude`);
    return { pageId, language, key, value, url: `${SITE}/${pageId === 'index' ? '' : `${pageId}.html`}` };
  }

  // ---- Leseplaner (reading_plans/{id}). published: false = utkast, skjult i lister på nettsiden.
  const planUrl = id => `${SITE}/leseplan-detaljer?id=${encodeURIComponent(id)}`;
  const planSummary = (id, plan) => ({
    id, title: plan.title || '', subtitle: plan.subtitle || '', durationDays: plan.durationDays || (plan.days || []).length,
    status: plan.published === false ? 'draft' : 'published', hasEnglish: Boolean(plan.translations?.en?.title),
    url: planUrl(id)
  });
  const planDoc = id => {
    if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) throw new HttpsError('invalid-argument', 'Ugyldig leseplan-ID.');
    return db.collection('reading_plans').doc(id);
  };
  const toDays = days => days.map((day, index) => ({
    dayNumber: index + 1, verses: day.verses, prayerFocus: day.prayerFocus || '',
    resources: (day.resources || []).map(res => ({ type: res.type || 'article', source: 'external', title: res.title, url: res.url, internalResourceId: '' }))
  }));

  function applyPlanFields(plan, input) {
    for (const field of ['title', 'subtitle', 'description', 'imageUrl']) if (input[field] !== undefined) plan[field] = input[field];
    if (input.days !== undefined) { plan.days = toDays(input.days); plan.durationDays = plan.days.length; }
    if (input.introduction !== undefined) plan.introduction = input.introduction;
    if (input.english) {
      const e = input.english;
      const en = { ...(plan.translations?.en || {}) };
      for (const field of ['title', 'subtitle', 'description']) if (e[field] !== undefined) en[field] = e[field];
      if (e.introduction !== undefined) en.introduction = e.introduction;
      if (e.days !== undefined) en.days = e.days.map((day, index) => ({ dayNumber: index + 1, prayerFocus: day.prayerFocus || '', resources: (day.resourceTitles || []).map(title => ({ title })) }));
      plan.translations = { ...(plan.translations || {}), en };
    }
    plan.updatedAt = Timestamp.now();
    plan.lastEditedBy = 'claude';
  }

  async function listPlans(account, { status = 'all' }) {
    const snapshot = await db.collection('reading_plans').get();
    const plans = snapshot.docs.map(doc => planSummary(doc.id, doc.data()))
      .filter(plan => status === 'all' || plan.status === status);
    return { total: plans.length, plans };
  }

  async function getPlan(account, { id }) {
    const snapshot = await planDoc(id).get();
    if (!snapshot.exists) throw new HttpsError('not-found', 'Fant ikke leseplanen.');
    const plan = snapshot.data();
    return {
      ...planSummary(id, plan), description: plan.description || '', imageUrl: plan.imageUrl || '',
      introduction: plan.introduction || null,
      days: (plan.days || []).map(day => ({ dayNumber: day.dayNumber, verses: day.verses || '', prayerFocus: day.prayerFocus || '', resources: (day.resources || []).map(r => ({ type: r.type, title: r.title, url: r.url })) })),
      ...(plan.translations?.en ? { english: plan.translations.en } : {})
    };
  }

  async function createPlan(account, input) {
    const plan = { published: false, createdAt: Timestamp.now(), createdBy: 'claude', subtitle: '', description: '', imageUrl: '' };
    applyPlanFields(plan, input);
    const ref = db.collection('reading_plans').doc();
    await ref.set(plan);
    await recordVersion(ref.id, `Leseplan: ${plan.title} (Claude)`, account, 'Utkast opprettet fra Claude', 'reading_plans');
    return { ...planSummary(ref.id, plan), adminUrl: ADMIN_URL, note: 'Lagret som utkast. Lenken fungerer som forhåndsvisning, men planen vises ikke i oversikten før den publiseres.' };
  }

  async function updatePlan(account, input) {
    const ref = planDoc(input.id);
    const plan = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new HttpsError('not-found', 'Fant ikke leseplanen.');
      const next = { ...snapshot.data() };
      if (next.published !== false && !input.confirmLiveEdit) {
        throw new HttpsError('failed-precondition', 'Leseplanen er publisert. Spør brukeren, og send confirmLiveEdit: true for å endre den.');
      }
      if (input.days !== undefined && (next.days || []).length > input.days.length && !input.confirmShorten) {
        throw new HttpsError('failed-precondition', `Planen har ${(next.days || []).length} dager. Folk som følger den kan miste fremdrift hvis den kortes ned. Send confirmShorten: true hvis brukeren vil det.`);
      }
      applyPlanFields(next, input);
      transaction.set(ref, next);
      return next;
    });
    await recordVersion(input.id, `Leseplan: ${plan.title} (Claude)`, account, 'Endret fra Claude', 'reading_plans');
    return { ...planSummary(input.id, plan), adminUrl: ADMIN_URL };
  }

  async function setPlanPublished(account, { id, publish }) {
    const ref = planDoc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new HttpsError('not-found', 'Fant ikke leseplanen.');
    await ref.set({ published: publish, updatedAt: Timestamp.now() }, { merge: true });
    return planSummary(id, { ...snapshot.data(), published: publish });
  }

  const introSchema = z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(3000),
    themes: z.array(z.object({ title: z.string().max(120), description: z.string().max(600) })).max(10).optional(),
    structure: z.array(z.object({ range: z.string().max(60).describe('F.eks. «Dag 1–7»'), title: z.string().max(120), description: z.string().max(600).optional() })).max(15).optional()
  }).describe('Introduksjon som vises øverst på leseplanen.');
  const daySchema = z.object({
    verses: z.string().trim().min(1).max(300).describe('Bibelavsnitt på norsk, f.eks. «Johannes 1» eller «1. Mosebok 1-3». Flere avsnitt skilles med komma eller semikolon.'),
    prayerFocus: z.string().max(1500).optional().describe('Refleksjon eller bønnefokus for dagen.'),
    resources: z.array(z.object({ type: z.enum(['article', 'video', 'podcast', 'link']).optional(), title: shortText(200), url: z.string().url().startsWith('https://').max(2000) })).max(5).optional()
  });
  const planEnglish = z.object({
    title: shortText(200).optional(), subtitle: z.string().max(300).optional(), description: z.string().max(2000).optional(),
    introduction: introSchema.optional(),
    days: z.array(z.object({ prayerFocus: z.string().max(1500).optional(), resourceTitles: z.array(z.string().max(200)).max(5).optional() })).max(400).optional()
  }).describe('Engelsk versjon. days følger samme rekkefølge som de norske dagene.');
  const planFields = {
    subtitle: z.string().max(300).optional(), description: z.string().max(2000).optional(),
    imageUrl: z.string().url().startsWith('https://').max(2000).optional(),
    introduction: introSchema.optional(), english: planEnglish.optional()
  };
  const pageId = z.string().regex(pageIdPattern).describe('Sidenavn, f.eks. index, om-oss, kontakt, for-menigheter.');
  const language = z.enum(['no', 'en', 'es']).optional().describe('Språk. Standard er norsk.');

  const moreTools = {
    list_courses: {
      description: 'List kursene i HKM-skolen med tittel, beskrivelse, pris og antall leksjoner.',
      schema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: listCourses
    },
    update_course: {
      description: 'Endre tittel, beskrivelse eller bilde på et kurs. Går live med en gang, så send confirmLiveEdit: true kun når brukeren har bedt om endringen. Pris og leksjoner endres i admin.',
      schema: z.object({ id: z.string().min(1).max(200), title: shortText(300).optional(), description: z.string().max(5000).optional(), imageUrl: z.string().url().startsWith('https://').max(2000).optional(), confirmLiveEdit: z.boolean().optional() }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
      handler: updateCourse
    },
    list_pages: {
      description: 'List sidene på hiskingdomministry.no som har redigerbare tekster lagret i admin.',
      schema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: listPages
    },
    get_page_texts: {
      description: 'Hent tekstene som er lagret for en side (nøkkel → tekst), på norsk, engelsk eller spansk. Kan filtrere med query.',
      schema: z.object({ pageId, language, query: z.string().max(200).optional() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: getPageTexts
    },
    update_page_text: {
      description: 'Endre én tekst på en side, f.eks. en overskrift eller knappetekst. Nøkkelen er den samme som i get_page_texts. Ren tekst, ingen HTML. Går live med en gang: send confirmLiveEdit: true kun når brukeren har godkjent den nye teksten.',
      schema: z.object({ pageId, language, key: z.string().regex(keyPattern), value: z.string().max(5000), confirmLiveEdit: z.boolean().optional() }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
      handler: updatePageText
    },
    list_reading_plans: {
      description: 'List leseplanene med ID, tittel, antall dager og om de er utkast eller publisert.',
      schema: z.object({ status: z.enum(['all', 'draft', 'published']).optional() }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: listPlans
    },
    get_reading_plan: {
      description: 'Hent en leseplan med introduksjon og alle dager (bibelavsnitt, refleksjon og ressurser).',
      schema: z.object({ id: z.string().min(1).max(128) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: getPlan
    },
    create_reading_plan_draft: {
      description: 'Lag en ny leseplan som utkast. Én oppføring i days per dag. Utkastet vises ikke i oversikten på nettsiden før det publiseres; lenken kan brukes som forhåndsvisning.',
      schema: z.object({ title: shortText(200), days: z.array(daySchema).min(1).max(400), ...planFields }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      handler: createPlan
    },
    update_reading_plan: {
      description: 'Endre en leseplan. Bare feltene du sender endres; days erstatter alle dagene. Publiserte planer krever confirmLiveEdit: true, og å korte ned antall dager krever confirmShorten: true. Send disse kun når brukeren har bedt om det.',
      schema: z.object({ id: z.string().min(1).max(128), title: shortText(200).optional(), days: z.array(daySchema).min(1).max(400).optional(), ...planFields, confirmLiveEdit: z.boolean().optional(), confirmShorten: z.boolean().optional() }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      handler: updatePlan
    },
    set_reading_plan_published: {
      description: 'Publiser (publish: true) eller gjør en leseplan til utkast (publish: false). Bruk kun når brukeren eksplisitt ber om det.',
      schema: z.object({ id: z.string().min(1).max(128), publish: z.boolean() }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
      handler: setPlanPublished
    }
  };

  return {
    ...moreTools,
    list_content: {
      description: 'List blogginnlegg, undervisning eller arrangementer på hiskingdomministry.no, nyeste først, med ID, tittel, dato og om det er utkast eller publisert. Kan søke i tittel, kategori og tagger.',
      schema: z.object({
        type, query: z.string().max(200).optional(),
        status: z.enum(['all', 'draft', 'published']).optional(),
        limit: z.number().int().min(1).max(100).optional()
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: listContent
    },
    get_content: {
      description: 'Hent ett blogginnlegg, én undervisning eller ett arrangement med hele teksten som Markdown, slik at den kan leses eller redigeres.',
      schema: z.object({ type, id: itemId }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      handler: getContent
    },
    create_content_draft: {
      description: 'Lagre et nytt blogginnlegg, en ny undervisning eller et nytt arrangement som utkast i admin HKM. Utkastet vises ikke på nettsiden. Skriv teksten i Markdown. Vis brukeren tittel og lenken til admin etterpå.',
      schema: z.object({ type, title: shortText(300), markdown, ...fields }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      handler: createDraft
    },
    update_content: {
      description: 'Endre et eksisterende blogginnlegg, en undervisning eller et arrangement. Bare feltene du sender endres; markdown erstatter hele teksten. Publiserte innlegg krever confirmLiveEdit: true, som kun skal sendes når brukeren har bedt om å endre det som ligger ute.',
      schema: z.object({ type, id: itemId, title: shortText(300).optional(), markdown: markdown.optional(), ...fields, confirmLiveEdit: z.boolean().optional() }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      handler: updateContent
    },
    set_content_published: {
      description: 'Publiser (publish: true) eller avpubliser (publish: false) et blogginnlegg, en undervisning eller et arrangement på hiskingdomministry.no. Bruk kun når brukeren eksplisitt ber om det.',
      schema: z.object({ type, id: itemId, publish: z.boolean() }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
      handler: setPublished
    }
  };
}

module.exports = { createContentAiTools, markdownToBlocks, blocksToMarkdown };
