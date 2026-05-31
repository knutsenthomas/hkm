const fs = require('fs');
const targetFilePath = '/Users/thomasknutsen/Documents/Nettside - HKM/admin/js/admin.js';
let content = fs.readFileSync(targetFilePath, 'utf8');

const startTag = '<header class="editor-header-v2">';
const endTag = '</header>';

const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
    console.error('ERROR: <header class="editor-header-v2"> not found!');
    process.exit(1);
}

const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
    console.error('ERROR: </header> not found after the header tag!');
    process.exit(1);
}

// Keep the tags, replace what is between them
const before = content.substring(0, startIdx + startTag.length);
const after = content.substring(endIdx);

const replacementInner = `
                        <div class="editor-header-left">
                             <button class="btn-ghost" id="close-col-modal" style="flex-shrink: 0; white-space: nowrap;">
                                <span class="material-symbols-outlined">arrow_back</span> Tilbake
                             </button>
                             <span style="color: #94a3b8; margin: 0 8px; flex-shrink: 0;">|</span>
                             <span style="font-weight: 600; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; flex-shrink: 0;">
                                \${collectionId === 'blog' ? 'Blogginnlegg' : (collectionId === 'events' ? 'Arrangement' : (collectionId === 'teaching' ? 'Undervisning' : (collectionId === 'podcast_transcripts' ? 'Podcast Transkripsjon' : 'Rediger innhold')))}
                             </span>
                             \${(collectionId === 'blog' || collectionId === 'teaching') ? \`
                             <!-- Premium Autolagring statusindikator -->
                             <div id="editor-autosave-status" style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #64748b; margin-left: 8px; transition: opacity 0.3s ease; opacity: 0.8; white-space: nowrap; flex-shrink: 0;">
                                 <span class="material-symbols-outlined" style="font-size: 18px; color: #10b981;">cloud_done</span>
                                 <span id="editor-autosave-text">Lagret i skyen</span>
                             </div>
                             \` : ''}
                             \${(collectionId === 'blog' || collectionId === 'teaching' || collectionId === 'podcast_transcripts') ? \`
                             <span id="blog-translation-status" title="Status for oversettelser" style="display:none; white-space: nowrap; flex-shrink: 0; margin-left: 8px;"></span>
                             \` : ''}
                        </div>
                        <div class="editor-header-right">
                                      \${(collectionId === 'blog' || collectionId === 'teaching' || collectionId === 'podcast_transcripts') ? \`
                                      <button class="btn-ghost" id="translate-col-item" title="Oversett til tilgjengelige språk" style="display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; flex-shrink:0;">
                                          <span class="material-symbols-outlined">g_translate</span>
                                          <span class="hidden xl:inline">Oversett til tilgjengelige språk</span>
                                      </button>
                                      \` : ''}
                             <button class="btn-ghost" id="print-col-item" title="Skriv ut" style="display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; flex-shrink:0;">
                                <span class="material-symbols-outlined">print</span>
                                <span class="hidden lg:inline">Skriv ut</span>
                             </button>
                             \${(collectionId === 'blog' || collectionId === 'teaching') ? \`
                              <button class="btn-ghost" id="toggle-split-preview" title="Forhåndsvis" style="display:flex; align-items:center; justify-content:center; gap:6px; margin-right: 8px; white-space:nowrap; flex-shrink:0;">
                                 <span class="material-symbols-outlined">visibility</span>
                                 <span class="hidden lg:inline">Forhåndsvis</span>
                              </button>
                              \` : ''}
                             \${(collectionId === 'blog' || collectionId === 'teaching') ? \`
                              <button class="btn-outline" id="save-col-item-draft" style="background: #ffffff !important; color: #1B4965 !important; border: 1px solid #cbd5e1 !important; box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important; margin-right: 8px; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; transition: all 0.2s ease; white-space:nowrap; flex-shrink:0;" onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='#ffffff'; this.style.borderColor='#cbd5e1';">
                                 <span class="material-symbols-outlined" style="color: #1B4965 !important;">draft</span>
                                 <span class="hidden md:inline">Lagre som utkast</span>
                              </button>
                              \` : ''}
                             <button class="btn-primary" id="save-col-item" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space:nowrap; flex-shrink:0;">
                                <span class="material-symbols-outlined">publish</span>
                                <span class="hidden sm:inline">Lagre og publiser</span>
                             </button>
                        </div>
`;

fs.writeFileSync(targetFilePath, before + replacementInner + after, 'utf8');
console.log('SUCCESS: Safely replaced editor header inner content in admin.js!');
