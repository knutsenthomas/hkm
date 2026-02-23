import os
import re

admin_dir = "/Users/thomasknutsen/Documents/Nettside - HKM/admin"
html_files = [f for f in os.listdir(admin_dir) if f.endswith(".html")]

for html_file in html_files:
    file_path = os.path.join(admin_dir, html_file)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replacing href="../minside/index.html" with href="#" for admin-profile-trigger
    # It might be in different formats, but just changing all instances of user-profile-link id="admin-profile-trigger" href
    # Since we know the Exact string: <a href="../minside/index.html" class="user-profile-link" id="admin-profile-trigger">
    content = content.replace('<a href="../minside/index.html" class="user-profile-link" id="admin-profile-trigger">', '<a href="#" class="user-profile-link" id="admin-profile-trigger">')
    content = content.replace('<a href="../minside/index.html" id="admin-profile-trigger">', '<a href="#" id="admin-profile-trigger">')
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Profile links fixed.")
