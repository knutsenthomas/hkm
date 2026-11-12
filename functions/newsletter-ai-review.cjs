const { createHash } = require('node:crypto');

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

function selectNewsletterAudience(records, group) {
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
    if (collection !== 'newsletter_subscriptions' || email.length > 254 || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(email)) continue;
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
  return [...recipients.values()].sort((a, b) => a.email.localeCompare(b.email, 'en'));
}

async function loadNewsletterAudience(db, group) {
  const snapshots = await Promise.all(subscriberCollections.map(collection =>
    db.collection(collection).select(
      'email', 'emailLower', 'newsletterUnsubscribed', 'newsletterStatus', 'status',
      ...(collection === 'newsletter_subscriptions' ? ['tags', 'labels', 'segments', 'segment', 'source', 'firstName', 'name', 'displayName'] : [])
    ).get()
  ));
  return selectNewsletterAudience(snapshots.flatMap((snapshot, index) => snapshot.docs.map(doc => ({
    collection: subscriberCollections[index], data: doc.data()
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

module.exports = { selectNewsletterAudience, loadNewsletterAudience, audienceSummary, audienceFingerprint };
