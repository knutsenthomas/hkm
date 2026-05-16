try {
  require('dotenv').config({ path: './functions/.env' });
} catch (_) {
  // dotenv is optional for this script
}

let admin;
try {
  admin = require('firebase-admin');
} catch (_) {
  admin = require('../functions/node_modules/firebase-admin');
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isIgnorableParagraph(block) {
  if (!block || block.type !== 'paragraph') return false;
  const html = String(block?.data?.text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return html.length === 0;
}

function hasMeaningfulText(block) {
  if (!block) return false;
  const type = String(block.type || '').toLowerCase();
  const data = block.data || {};

  if (type === 'header' || type === 'paragraph' || type === 'quote') {
    return stripHtml(data.text).length > 0;
  }

  if (type === 'list') {
    const items = Array.isArray(data.items) ? data.items : [];
    return items.some((item) => {
      const txt = typeof item === 'string' ? item : (item?.content || item?.text || '');
      return stripHtml(txt).length > 0;
    });
  }

  return false;
}

function cleanupLeadingGhostImages(content) {
  if (!content || typeof content !== 'object' || !Array.isArray(content.blocks)) {
    return { changed: false, content };
  }

  const rawBlocks = content.blocks;

  let startIndex = 0;
  while (startIndex < rawBlocks.length && (rawBlocks[startIndex]?.type === 'image' || isIgnorableParagraph(rawBlocks[startIndex]))) {
    startIndex += 1;
  }

  const leadingSlice = rawBlocks.slice(0, startIndex);
  const leadingImages = leadingSlice.filter((b) => b?.type === 'image');
  const leadingHasOnlyImagesAndBlankParas = leadingSlice.every((b) => b?.type === 'image' || isIgnorableParagraph(b));
  const leadingImagesHaveNoCaption = leadingImages.every((img) => String(img?.data?.caption || '').trim().length === 0);
  const hasTextAfterLeading = rawBlocks.slice(startIndex).some((b) => hasMeaningfulText(b));

  const shouldDropLeadingGhostCluster =
    leadingHasOnlyImagesAndBlankParas &&
    leadingImages.length >= 2 &&
    leadingImagesHaveNoCaption &&
    hasTextAfterLeading;

  if (!shouldDropLeadingGhostCluster) {
    return { changed: false, content };
  }

  return {
    changed: true,
    removedLeadingImages: leadingImages.length,
    content: {
      ...content,
      blocks: rawBlocks.slice(startIndex)
    }
  };
}

(async () => {
  try {
    const snap = await db.collection('content').doc('collection_blog').get();
    if (!snap.exists) {
      console.error('ERROR: content/collection_blog not found.');
      process.exit(1);
    }

    const data = snap.data() || {};
    const items = Array.isArray(data.items) ? data.items : [];

    const changedPosts = [];
    const nextItems = items.map((item, idx) => {
      const result = cleanupLeadingGhostImages(item?.content);
      if (!result.changed) return item;

      changedPosts.push({
        index: idx,
        id: item?.id || item?._id || '(no id)',
        title: item?.title || '(untitled)',
        removedLeadingImages: result.removedLeadingImages || 0
      });

      return {
        ...item,
        content: result.content
      };
    });

    if (!changedPosts.length) {
      console.log('No posts matched ghost-leading-image cleanup criteria.');
      process.exit(0);
    }

    console.log(`Matched ${changedPosts.length} post(s):`);
    changedPosts.forEach((p) => {
      console.log(`- [${p.index}] ${p.title} | id=${p.id} | removedLeadingImages=${p.removedLeadingImages}`);
    });

    if (!apply) {
      console.log('\nDry run only. No writes performed. Run with --apply to persist changes.');
      process.exit(0);
    }

    await db.collection('content').doc('collection_blog').update({
      items: nextItems,
      cleanupGhostLeadingImagesAt: admin.firestore.FieldValue.serverTimestamp(),
      cleanupGhostLeadingImagesCount: changedPosts.length
    });

    console.log(`\nApplied cleanup to ${changedPosts.length} post(s).`);
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error?.message || error);
    process.exit(1);
  }
})();
