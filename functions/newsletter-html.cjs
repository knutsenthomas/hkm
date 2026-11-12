const sanitizeHtml = require('sanitize-html');
const { parseDocument } = require('htmlparser2');
const serialize = require('dom-serializer').default;
const postcss = require('postcss');
const { convert } = require('html-to-text');

const MAX_HTML_BYTES = 400_000;
const UNSUBSCRIBE = '{{avmeldingslenke}}';
const WEB_VERSION = '{{nettleserlenke}}';
const FIRST_NAME = '{{fornavn}}';
const LINK_FIELDS = new Set([UNSUBSCRIBE, WEB_VERSION]);
const CSP = "default-src 'none'; img-src https: http:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
const tags = [
  ...sanitizeHtml.defaults.allowedTags, 'html', 'head', 'body', 'title', 'style',
  'center', 'font', 'img', 's', 'u', 'strike'
];
const blockedTags = ['script', 'iframe', 'form', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'textarea', 'xmp'];

function walk(node, visit) {
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    visit(current);
    if (current.children) {
      for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]);
    }
  }
}

function cleanCss(source, warnings, inline = false) {
  // Raw-text style elements require special care around HTML delimiters.
  if (/[<\\]/.test(source)) return '';
  try {
    const css = postcss.parse(inline ? `x{${source}}` : source);
    if (inline && (css.nodes.length !== 1 || css.first.type !== 'rule' || css.first.selector !== 'x')) return '';
    css.walkComments(comment => comment.remove());
    css.walkAtRules(rule => {
      if (rule.name.toLowerCase() === 'import') warnings.add('externalCss');
      if (!['media', 'supports'].includes(rule.name.toLowerCase())) rule.remove();
    });
    css.walkDecls(declaration => {
      const { prop, value } = declaration;
      if (/flex/i.test(prop) || (/^display$/i.test(prop) && /flex/i.test(value))) warnings.add('flex');
      if (/grid/i.test(prop) || (/^display$/i.test(prop) && /grid/i.test(value))) warnings.add('grid');
      if (/^(-moz-binding|behavior)$/i.test(prop) || /(?:url|expression|image-set|image|src)\s*\(/i.test(value)) {
        declaration.remove();
      }
    });
    return inline ? css.first.nodes.filter(node => node.type === 'decl').map(node => node.toString()).join(';') : css.toString();
  } catch {
    return '';
  }
}

function absoluteWebUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim())) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function sanitizeImportedNewsletter(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Lim inn HTML eller velg en HTML-fil.');
  const size = Buffer.byteLength(source, 'utf8');
  if (size > MAX_HTML_BYTES) throw new Error('HTML-koden kan være maksimalt 400 kB.');
  const warnings = new Set();
  const parsed = parseDocument(source);
  walk(parsed, node => {
    if (!node.attribs) return;
    if (node.name === 'link' && /(?:^|\s)stylesheet(?:\s|$)/i.test(node.attribs.rel || '')) warnings.add('externalCss');
    if (node.name === 'img' && node.attribs.src && !absoluteWebUrl(node.attribs.src)) warnings.add('imageUrl');
    if (node.attribs.style) node.attribs.style = cleanCss(node.attribs.style, warnings, true);
    if (node.name === 'style') {
      node.children.forEach(child => {
        if (child.type === 'text') child.data = cleanCss(child.data, warnings);
      });
    }
  });

  const html = sanitizeHtml(serialize(parsed, { encodeEntities: 'utf8' }), {
    allowedTags: tags,
    allowedAttributes: {
      '*': ['id', 'class', 'style', 'lang', 'dir', 'title', 'align', 'valign', 'width', 'height', 'bgcolor', 'role'],
      a: ['href'], img: ['src', 'alt'], table: ['border', 'cellpadding', 'cellspacing'],
      td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan', 'scope'], font: ['face', 'color', 'size']
    },
    nonTextTags: blockedTags,
    // Style text and attributes were parsed and filtered above.
    allowVulnerableTags: true,
    parseStyleAttributes: false,
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowProtocolRelative: false,
    nestingLimit: 64,
    transformTags: {
      a(tagName, attribs) {
        const href = (attribs.href || '').trim();
        if (!LINK_FIELDS.has(href) && !absoluteWebUrl(href) && !/^(mailto:|tel:|#)/i.test(href)) delete attribs.href;
        else attribs.href = href;
        return { tagName, attribs };
      },
      img(tagName, attribs) {
        if (!absoluteWebUrl(attribs.src)) delete attribs.src;
        return { tagName, attribs };
      }
    }
  }).trim();
  const document = parseDocument(html);
  let unsubscribe = false;
  let webVersion = false;
  let image = false;
  walk(document, node => {
    if (node.name === 'a' && node.attribs.href === UNSUBSCRIBE) unsubscribe = true;
    if (node.name === 'a' && node.attribs.href === WEB_VERSION) webVersion = true;
    if (node.type === 'text' && !['style', 'title'].includes(node.parent?.name) && node.data.includes(WEB_VERSION)) webVersion = true;
    if (node.name === 'img' && node.attribs.src) image = true;
  });
  if (!image && !plainNewsletterText(html).trim()) throw new Error('HTML-koden må inneholde tekst eller et bilde med en gyldig URL.');
  if (!unsubscribe) warnings.add('unsubscribe');
  if (Math.max(size, Buffer.byteLength(html)) >= 100_000) warnings.add('size');
  return { html, warnings: [...warnings], unsubscribe, webVersion };
}

function renderImportedNewsletter(template, { firstName = '', unsubscribeUrl, browserUrl, preview = false, language = 'no' }) {
  const document = parseDocument(template.html);
  let body = document;
  walk(document, node => {
    if (node.name === 'body') body = node;
    if (node.type === 'text' && !['style', 'title'].includes(node.parent?.name)) {
      node.data = node.data.replace(/\{\{(?:fornavn|avmeldingslenke|nettleserlenke)\}\}/g, field => ({
        [FIRST_NAME]: firstName, [UNSUBSCRIBE]: unsubscribeUrl, [WEB_VERSION]: browserUrl
      })[field]);
    }
    if (node.name === 'a') {
      if (preview) delete node.attribs.href;
      else if (node.attribs.href === UNSUBSCRIBE) node.attribs.href = unsubscribeUrl;
      else if (node.attribs.href === WEB_VERSION) node.attribs.href = browserUrl;
    }
  });

  if (!template.unsubscribe) {
    const link = preview ? '' : ` href="${escapeAttribute(unsubscribeUrl)}"`;
    const unsubscribeLabel = language === 'en' ? 'Unsubscribe from the newsletter' : 'Meld deg av nyhetsbrevet';
    const footer = parseDocument(`<p style="margin:24px 0;text-align:center;font:12px Arial,sans-serif"><a${link}>${unsubscribeLabel}</a></p>`);
    body.children.push(...footer.children);
  }
  const rendered = serialize(document, { encodeEntities: 'utf8' });
  return '<!doctype html>' + rendered;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function plainNewsletterText(html) {
  return convert(html, {
    wordwrap: 80,
    selectors: [
      { selector: 'head', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'title', format: 'skip' },
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true, noAnchorUrl: true } }
    ]
  });
}

module.exports = { CSP, sanitizeImportedNewsletter, renderImportedNewsletter, plainNewsletterText };
