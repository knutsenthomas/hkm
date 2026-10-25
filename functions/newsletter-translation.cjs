// Translate text only. The browser reinserts it into the original DOM, preserving layout and links.
async function translateNewsletter({ texts, provider = 'auto', openai, googleTranslate }) {
  if (!Array.isArray(texts) || !texts.length || texts.some(text => typeof text !== 'string') || texts.join('').length > 100000) {
    throw new Error('Nyhetsbrevet er tomt eller for stort til å oversettes.');
  }
  const validate = result => {
    if (!Array.isArray(result) || result.length !== texts.length || result.some(text => typeof text !== 'string' || !text.trim())) {
      throw new Error('Oversettelsen var ufullstendig. Prøv igjen.');
    }
    return result;
  };
  if (provider !== 'google' && openai) {
    try { return { texts: validate(await openai(texts)), provider: 'openai' }; }
    catch (error) { if (!googleTranslate) throw error; }
  }
  if (!googleTranslate) throw new Error('Oversettelsestjenesten er ikke tilgjengelig.');
  return { texts: validate(await googleTranslate(texts)), provider: 'google' };
}
module.exports = { translateNewsletter };
