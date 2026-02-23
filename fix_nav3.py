import os
import re

admin_dir = "/Users/thomasknutsen/Documents/Nettside - HKM/admin"
html_files = [f for f in os.listdir(admin_dir) if f.endswith(".html")]

search_modal_html = """        <!-- Global Search Modal -->
        <div id="search-modal" class="profile-modal"
            style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:2500; align-items:flex-start; justify-content:center; padding-top:10vh; box-sizing:border-box;">
            <div class="profile-modal-content"
                style="background:#fff; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.2); width:100%; max-width:600px; position:relative; padding:24px;">
                <button id="close-search-modal"
                    style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:24px; cursor:pointer; color:#64748b;">&times;</button>
                <div style="font-size: 20px; font-weight: 700; color: var(--text-main); margin-bottom: 16px;">Søk i systemet</div>
                <div class="header-search" style="border: 2px solid var(--accent-color); border-radius: 8px; width: 100%; margin-bottom: 16px; position:relative;">
                    <span class="material-symbols-outlined" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); color:#64748b;">search</span>
                    <input type="text" id="global-modal-search-input" placeholder="Hva leter du etter? Skriv og trykk Enter..."
                        style="width: 100%; padding: 14px 14px 14px 48px; border: none; border-radius: 8px; font-size: 16px; outline: none; background: transparent;" aria-label="Søk">
                </div>
                <div style="color: #94a3b8; font-size: 13px; text-align: center;">Trykk 'Enter' for å hente frem søkeresultatene.</div>
            </div>
        </div>
"""

for html_file in html_files:
    if html_file == 'index.html': continue

    file_path = os.path.join(admin_dir, html_file)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Also make sure the other pages have a search button if they had an old header right
    content = re.sub(
        r'<button class="notification-btn">',
        r'<button id="global-search-opener" class="notification-btn" aria-label="Søk" title="Søk på siden">\n                        <span class="material-symbols-outlined">search</span>\n                    </button>\n                    <button class="notification-btn">',
        content,
        count=1
    )

    if 'id="search-modal"' not in content:
        content = content.replace('<!-- App Scripts -->', search_modal_html + '\n    <!-- App Scripts -->')

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Search modal and buttons applied to all admin pages.")
