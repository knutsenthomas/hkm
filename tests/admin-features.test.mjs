import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

async function manager() {
  const methods = {};
  const directory = new URL('../admin/js/features/', import.meta.url);
  for (const file of (await readdir(directory)).filter(name => name.endsWith('.js'))) {
    const factory = Object.values(await import(new URL(file, directory)))[0];
    const feature = factory({ firebaseService: {}, adminUtils: {}, showErrorUI() {} });
    for (const name of Object.keys(feature)) {
      assert.equal(name in methods, false, `Duplicate administrator method: ${name}`);
      methods[name] = feature[name];
    }
  }
  return methods;
}

test('administrator features compose without replacing each other', async () => {
  const admin = await manager();
  for (const name of ['initAuth', 'renderOverviewLoadingState', 'savePageContent', 'saveUser', '_saveCourse']) assert.equal(typeof admin[name], 'function');
});

test('translation preserves tokens and stable source hashes', async () => {
  const admin = await manager();
  assert.equal(admin._isLikelyNonTranslatableToken('https://example.com'), true);
  assert.equal(admin._isLikelyNonTranslatableToken('test@example.com'), true);
  assert.equal(admin._isLikelyNonTranslatableToken('Velkommen til samlingen'), false);
  assert.deepEqual(admin._splitTextForTranslation('Kort tekst'), ['Kort tekst']);
  const post = { title: 'Undervisning', text: 'Innhold', content: { time: 1 } };
  assert.equal(admin._buildBlogTranslationSourceHash(post), admin._buildBlogTranslationSourceHash({ ...post, content: { time: 99 } }));
});

test('page content flattening preserves nested editor keys', async () => {
  const admin = await manager();
  assert.deepEqual(admin.flatten({ hero: { title: 'Velkommen' }, visible: true }), { 'hero.title': 'Velkommen', visible: true });
});
