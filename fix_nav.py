import os
import re

admin_dir = "/Users/thomasknutsen/Documents/Nettside - HKM/admin"
html_files = [f for f in os.listdir(admin_dir) if f.endswith(".html")]

for html_file in html_files:
    file_path = os.path.join(admin_dir, html_file)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Remove the sub-nav-tabs completely
    content = re.sub(r'<div class="sub-nav-tabs">.*?</div>', '', content, flags=re.DOTALL)
    
    # 2. Remove top-nav-tabs completely
    content = re.sub(r'<div class="top-nav-tabs">.*?</div>', '', content, flags=re.DOTALL)
    
    # 3. If there is an empty tabs-container or content-header that only contains empty space now, we might want to keep the search or clean it up. We will leave the search.

    # 4. Insert section headers in the sidebar, matching the first li of each category
    # Find nettsted first instance
    match_nett = re.search(r'<li class="nav-item[^>]*" data-nav-category="nettsted">', content)
    if match_nett and '<li class="nav-category-header">Nettsted</li>' not in content:
        content = content[:match_nett.start()] + '<li class="nav-category-header">Nettsted</li>\n                        ' + content[match_nett.start():]

    match_komm = re.search(r'<li class="nav-item[^>]*" data-nav-category="kommunikasjon">', content)
    if match_komm and '<li class="nav-category-header">Kommunikasjon</li>' not in content:
        content = content[:match_komm.start()] + '<li class="nav-category-header">Kommunikasjon</li>\n                        ' + content[match_komm.start():]

    match_admin = re.search(r'<li class="nav-item[^>]*" data-nav-category="administrasjon">', content)
    if match_admin and '<li class="nav-category-header">Administrasjon</li>' not in content:
        content = content[:match_admin.start()] + '<li class="nav-category-header">Administrasjon</li>\n                        ' + content[match_admin.start():]

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Navbar cleanup script completed.")
