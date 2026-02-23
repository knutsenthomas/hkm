import os
import re

admin_dir = "/Users/thomasknutsen/Documents/Nettside - HKM/admin"
html_files = [f for f in os.listdir(admin_dir) if f.endswith(".html")]

for html_file in html_files:
    file_path = os.path.join(admin_dir, html_file)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace simple nav-category-header with an interactive one
    content = content.replace('<li class="nav-category-header">Nettsted</li>', 
                              '<li class="nav-category-header" data-target-category="nettsted"><span>Nettsted</span><span class="material-symbols-outlined expand-icon">expand_more</span></li>')
    content = content.replace('<li class="nav-category-header">Kommunikasjon</li>', 
                              '<li class="nav-category-header" data-target-category="kommunikasjon"><span>Kommunikasjon</span><span class="material-symbols-outlined expand-icon">expand_more</span></li>')
    content = content.replace('<li class="nav-category-header">Administrasjon</li>', 
                              '<li class="nav-category-header" data-target-category="administrasjon"><span>Administrasjon</span><span class="material-symbols-outlined expand-icon">expand_more</span></li>')

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Navbar interactive headers applied.")
