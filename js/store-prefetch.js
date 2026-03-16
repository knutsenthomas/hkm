/**
 * HIS KINGDOM DESIGNS - Store Background Prefetch
 * Preloads the product catalog into sessionStorage when the user lands on the homepage.
 * This makes the "Butikk" page feel instant when the user eventually navigates there.
 */
(function () {
    const PREFETCH_KEY = 'hkm_store_catalog_cache';
    const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes cache duration
    const PROXY_BASE_URL = 'https://us-central1-his-kingdom-ministry.cloudfunctions.net/wixProducts';
    const MAX_PREFETCH_ITEMS = 5000;
    const BATCH_SIZE = 100;

    // 1. Check if we already have a valid cache in this session
    try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage) {
            const cached = sessionStorage.getItem(PREFETCH_KEY);
            if (cached) {
                const { timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_EXPIRY) {
                    console.log('[HKM STORE] Background cache is still valid. Skipping prefetch.');
                    return;
                }
            }
        }
    } catch (e) {
        // Silently skip if storage fails
    }

    // 2. Fetch the catalog data
    const prefetchData = async () => {
        try {
            console.log('[HKM STORE] Pre-fetching product catalog in background...');
            const startTime = Date.now();

            let allItems = [];
            let offset = 0;
            let total = null;
            let currentData = null;

            // Loop to fetch all batches
            while (allItems.length < MAX_PREFETCH_ITEMS) {
                const url = `${PROXY_BASE_URL}?limit=${BATCH_SIZE}&offset=${offset}`;
                const response = await fetch(url, { mode: 'cors' });
                if (!response.ok) break;

                const data = await response.json();
                currentData = data; // Keep last payload to store structure

                const batch = data.items || data.products || [];
                if (!Array.isArray(batch) || batch.length === 0) break;

                allItems = allItems.concat(batch);
                total = data.metadata?.total || data.total || null;

                console.log(`[HKM STORE] Prefetching batch: ${allItems.length}/${total || '???'}`);

                if (batch.length < BATCH_SIZE) break;
                if (total && allItems.length >= total) break;
                offset += batch.length;

                // Small sleep to avoid hammer
                await new Promise(r => setTimeout(r, 100));
            }

            if (allItems.length > 0) {
                try {
                    if (typeof sessionStorage !== 'undefined' && sessionStorage) {
                        // We store the full list in the "items" key of a fake payload
                        const fullPayload = { ...currentData, items: allItems };
                        const cacheData = {
                            timestamp: Date.now(),
                            payload: fullPayload
                        };
                        sessionStorage.setItem(PREFETCH_KEY, JSON.stringify(cacheData));
                    }
                } catch (e) {
                    // Ignore storage errors during prefetch
                }
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.log(`[HKM STORE] Background catalog completed: ${allItems.length} items in ${duration}s.`);
            }
        } catch (error) {
            console.warn('[HKM STORE] Background fetch failed:', error);
        }
    };

    // 3. Execution strategy: Wait for idle or a safe delay to not impact LCP/FID
    if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
            // Wait an additional 3s after idle to be extra safe
            setTimeout(prefetchData, 3000);
        }, { timeout: 15000 });
    } else {
        // Fallback for Safari/Legacy: 6s delay
        setTimeout(prefetchData, 6000);
    }
})();
