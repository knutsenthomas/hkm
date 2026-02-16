
import os
import re

# Configuration
SOURCE_FILE = 'index.html'
ROOT_DIR = '.'
EXCLUDE_DIRS = ['.git', '.gemini', 'node_modules', '.agent']
# We'll use a regex to capture the header. 
# We assume the header starts with <header and ends with </header>
# We also want to capture the Mega Menu if possible, or at least the header.
# The user specifically requested the Header synchronization. 
# Ideally, we should sync the Mega Menu too because the "Hamburger" button in the header controls it.

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def get_source_content():
    content = read_file(SOURCE_FILE)
    
    # Extract Header
    header_match = re.search(r'(<header.*?id="header".*?>.*?</header>)', content, re.DOTALL)
    if not header_match:
        print("Error: Could not find header in source file.")
        return None, None
    header_content = header_match.group(1)

    # Extract Mega Menu (Assuming it follows the header or is identified by id="mega-menu")
    # In index.html step 7776, it looks like: <div class="fixed inset-0 ... mega-menu" id="mega-menu"> ... </div>
    # It might end with a closing div that matches the indentation or we can rely on specific markers.
    # To be safe, let's just sync the HEADER first as requested. 
    # BUT, if the other pages have an OLD mega menu, the new header toggle might not work with it.
    # Let's try to find the Mega Menu too.
    
    mega_menu_match = re.search(r'(<div[^>]*id="mega-menu"[^>]*>.*?</div>\s*</div>)', content, re.DOTALL) 
    # The regex for nested divs is hard. 
    # Alternative: Look for the specific comment blocks if they exist.
    # In index.html: <!-- Full-screen Mega Menu Overlay --> starts around line 88.
    
    # Let's try to extract based on specific known structure in index.html or just stick to Header for now
    # and warn if Mega Menu is missing.
    # User's request: "Jeg vil at du skal synkronisere denne nøyaktig ... header-koden ..." 
    # "Lim inn denne strukturen i alle HTML-filene" -> Referring to Header structure.
    
    
    # Extract Tailwind Script
    tailwind_match = re.search(r'(<!-- Tailwind CSS Play CDN -->.*?<script>.*?</script>)', content, re.DOTALL)
    tailwind_content = tailwind_match.group(1) if tailwind_match else None

    return header_content, tailwind_content

def main():
    new_header, tailwind_code = get_source_content()
    if not new_header:
        return

    print(f"Loaded Source Header ({len(new_header)} chars).")
    if tailwind_code:
        print(f"Loaded Tailwind Code ({len(tailwind_code)} chars).")

    count_header = 0
    count_tailwind = 0

    for root, dirs, files in os.walk(ROOT_DIR):
        # Filter directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file.endswith('.html') and file != SOURCE_FILE:
                path = os.path.join(root, file)
                content = read_file(path)
                original_content = content
                
                # 1. Sync Header
                if '<header' in content:
                    content = re.sub(r'<header.*?id="header".*?>.*?</header>', new_header, content, flags=re.DOTALL)
                
                # 2. Inject Tailwind if missing
                if tailwind_code and 'cdn.tailwindcss.com' not in content:
                    # Inject before </head>
                    if '</head>' in content:
                        content = content.replace('</head>', f'{tailwind_code}\n</head>')
                        count_tailwind += 1
                    else:
                        print(f"Skipped Tailwind injection (No </head>): {path}")

                if content != original_content:
                    write_file(path, content)
                    print(f"Updated: {path} (Header change: {menu_updated(original_content, content)}, Tailwind added: {'cdn.tailwindcss.com' not in original_content})")
                    count_header += 1
                else:
                    print(f"Skipped (No change): {path}")

    print(f"Total files updated: {count_header}")
    print(f"Files with Tailwind added: {count_tailwind}")

def menu_updated(old, new):
    return old != new


if __name__ == "__main__":
    main()
