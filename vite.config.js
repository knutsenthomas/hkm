import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import react from '@vitejs/plugin-react';

function shouldUseSharedSiteShell(pathname, html) {
    const normalizedPath = (pathname || '').replace(/\\/g, '/');
    const filename = normalizedPath.split('/').pop() || '';
    const excludedDirectory = /\/(?:admin|minside|public)\//.test(normalizedPath);
    const excludedUtilityPage = /^(?:seed|test|verify|restore)[-_]/.test(filename);
    const optedOut = /data-site-shell=(?:"off"|'off')/.test(html);

    return !excludedDirectory && !excludedUtilityPage && !optedOut;
}

const sharedSiteShellPlugin = {
    name: 'hkm-shared-site-shell',
    transformIndexHtml: {
        order: 'pre',
        handler(html, context) {
            if (!shouldUseSharedSiteShell(context.path, html)) return html;

            const tags = [{
                tag: 'script',
                attrs: {
                    type: 'module',
                    src: '/js/site-shell.js'
                },
                injectTo: 'head-prepend'
            }];

            if (!/href=(?:"[^"]*styles\.css(?:\?[^"]*)?"|'[^']*styles\.css(?:\?[^']*)?')/.test(html)) {
                tags.push({
                    tag: 'link',
                    attrs: {
                        rel: 'stylesheet',
                        href: '/styles.css'
                    },
                    injectTo: 'head-prepend'
                });
            }

            if (!html.includes('font-awesome')) {
                tags.push({
                    tag: 'link',
                    attrs: {
                        rel: 'stylesheet',
                        href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
                    },
                    injectTo: 'head-prepend'
                });
            }

            if (!html.includes('Material+Symbols+Outlined')) {
                tags.push({
                    tag: 'link',
                    attrs: {
                        rel: 'stylesheet',
                        href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block'
                    },
                    injectTo: 'head-prepend'
                });
            }

            return tags;
        }
    }
};

function getHtmlEntries(dir, entries = {}) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = resolve(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            if (!['node_modules', '.git', '.vercel', 'public', 'dist', 'functions', 'hkm-wordpress-theme', 'wishon', 'stitch'].includes(file)) {
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

const vercelAnalyticsPlugin = {
    name: 'hkm-vercel-analytics',
    transformIndexHtml: {
        order: 'post',
        handler(html) {
            if (html.includes('/_vercel/insights/script.js')) return [];

            return [
                {
                    tag: 'script',
                    children: 'window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };',
                    injectTo: 'head'
                },
                {
                    tag: 'script',
                    attrs: {
                        defer: true,
                        src: '/_vercel/insights/script.js'
                    },
                    injectTo: 'head'
                },
                {
                    tag: 'script',
                    children: 'window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };',
                    injectTo: 'head'
                },
                {
                    tag: 'script',
                    attrs: {
                        defer: true,
                        src: '/_vercel/speed-insights/script.js'
                    },
                    injectTo: 'head'
                }
            ];
        }
    }
};

export default defineConfig({
    plugins: [sharedSiteShellPlugin, vercelAnalyticsPlugin, react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'admin/js')
        }
    },
    server: {
        proxy: {
            '/api/facebook-feed': {
                target: 'http://127.0.0.1:5001/his-kingdom-ministry/us-central1/facebookFeed',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/facebook-feed/, '')
            }
        }
    },
    build: {
        rollupOptions: {
            input: getHtmlEntries(__dirname),
            output: {
                manualChunks(id) {
                    if (id.includes('js/cookie-consent.js')) {
                        return 'cookie-consent-only';
                    }
                    if (id.includes('node_modules')) {
                        if (id.includes('firebase')) {
                            return 'vendor-firebase';
                        }
                        if (id.includes('react') || id.includes('scheduler')) {
                            return 'vendor-react';
                        }
                        return 'vendor-common';
                    }
                }
            }
        }
    }
});
