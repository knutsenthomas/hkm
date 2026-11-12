const { createHash } = require('node:crypto');

const HKD_SUBSCRIBERS = 'hkd_newsletter_subscriptions';
const subscriberCollections = ['newsletter_subscriptions', 'contacts', 'users'];
const unsubscribedStatuses = new Set(['unsubscribed', 'avmeldt']);
const englishTags = new Set(['english', 'engelsk', 'en']);
const normalize = value => String(value || '').trim().toLowerCase();

function list(value) {
  return (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
}

function isHkdNewsletterGroup(group) {
  return normalize(group) === 'hkd nyhetsbrev';
}

function selectNewsletterAudience(records, group) {
  const hkd = isHkdNewsletterGroup(group);
  const eligibleCollection = hkd ? HKD_SUBSCRIBERS : 'newsletter_subscriptions';
  const crmLanguages = new Map();
  if (hkd) {
    for (const { collection, data } of records) {
      if (collection !== 'contacts') continue;
      const email = normalize(data.email);
      const taggedEnglish = [...list(data.tags), ...list(data.labels), ...list(data.segments)]
        .some(value => englishTags.has(normalize(value)));
      crmLanguages.set(email, taggedEnglish || crmLanguages.get(email) === true);
    }
  }
  const suppressed = new Set();
  const recipients = new Map();
  for (const { collection, data } of records) {
    const email = normalize(data.email);
    if (data.newsletterUnsubscribed === true || [data.newsletterStatus, data.status].some(status => unsubscribedStatuses.has(normalize(status)))) {
      suppressed.add(email);
      suppressed.add(normalize(data.emailLower));
      continue;
    }
    // A newsletter subscription is the eligibility record. CRM and user records
    // participate in suppression even when they are not newsletter subscribers.
    if (collection !== eligibleCollection || email.length > 254 || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email)) continue;
    const tags = [...new Set([...list(data.tags), ...list(data.labels)])];
    const segments = [...new Set([...list(data.segments), ...list(data.segment), ...list(data.source)])];
    if (![...tags, ...segments].some(value => normalize(value) === normalize(group))) continue;
    const firstName = String(data.firstName || data.name || data.displayName || '').trim().split(/\s+/)[0].slice(0, 120);
    const previous = recipients.get(email);
    recipients.set(email, {
      email,
      firstName: previous?.firstName || firstName,
      tags: [...new Set([...(previous?.tags || []), ...tags])].sort(),
      segments: [...new Set([...(previous?.segments || []), ...segments])].sort()
    });
  }
  for (const email of suppressed) recipients.delete(email);
  for (const [email, recipient] of recipients) {
    if (!crmLanguages.has(email)) continue;
    recipient.tags = recipient.tags.filter(value => !englishTags.has(normalize(value)));
    recipient.segments = recipient.segments.filter(value => !englishTags.has(normalize(value)));
    if (crmLanguages.get(email)) recipient.tags.push('engelsk');
  }
  return [...recipients.values()].sort((a, b) => a.email.localeCompare(b.email, 'en'));
}

async function loadNewsletterAudience(db, group) {
  const collections = isHkdNewsletterGroup(group) ? [HKD_SUBSCRIBERS, ...subscriberCollections] : subscriberCollections;
  const snapshots = await Promise.all(collections.map(collection =>
    db.collection(collection).select(
      'email', 'emailLower', 'newsletterUnsubscribed', 'newsletterStatus', 'status',
      ...(['newsletter_subscriptions', HKD_SUBSCRIBERS].includes(collection) ? ['tags', 'labels', 'segments', 'segment', 'source', 'firstName', 'name', 'displayName'] : []),
      ...(collection === 'contacts' && isHkdNewsletterGroup(group) ? ['tags', 'labels', 'segments'] : [])
    ).get()
  ));
  return selectNewsletterAudience(snapshots.flatMap((snapshot, index) => snapshot.docs.map(doc => ({
    collection: collections[index], data: doc.data()
  }))), group);
}

function audienceSummary(recipients) {
  const englishCount = recipients.filter(recipient =>
    [...recipient.tags, ...recipient.segments].some(value => englishTags.has(normalize(value)))
  ).length;
  return { count: recipients.length, englishCount, norwegianCount: recipients.length - englishCount };
}

function audienceFingerprint(recipients) {
  return createHash('sha256').update(JSON.stringify(recipients)).digest('hex');
}

module.exports = { HKD_SUBSCRIBERS, isHkdNewsletterGroup, selectNewsletterAudience, loadNewsletterAudience, audienceSummary, audienceFingerprint };
