import sys
import re

def add_module_type_to_script_tags(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Find all script tags with a src attribute but no type attribute
    script_tags = re.findall(r'<script\s+src="[^"]*"\s*(?!type)', content)

    # Add type="module" to each script tag
    for tag in script_tags:
        new_tag = tag.replace('<script', '<script type="module"')
        content = content.replace(tag, new_tag)

    with open(file_path, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    for file_path in sys.argv[1:]:
        add_module_type_to_script_tags(file_path)
