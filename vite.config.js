import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

function getHtmlEntries(dir, entries = {}) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = resolve(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            if (!['node_modules', '.git', 'public', 'dist', 'functions', 'hkm-wordpress-theme'].includes(file)) {
                getHtmlEntries(filePath, entries);
            }
        } else if (file.endsWith('.html')) {
            const relPath = filePath.replace(resolve(__dirname), '').replace(/^\//, '');
            const name = relPath.replace(/\.html$/, '').replace(/\//g, '_');
            entries[name] = resolve(__dirname, relPath);
        }
    });
    return entries;
}

export default defineConfig({
    build: {
        rollupOptions: {
            input: getHtmlEntries(__dirname)
        }
    }
});
