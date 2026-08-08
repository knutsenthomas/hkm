
        // Diagnostic Logger
        (function() {
            const logs = [];
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            
            function saveLog(type, args) {
                const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
                logs.push({ type, msg, ts: new Date().toISOString() });
                
                // Write to Firestore if firebase is initialized
                if (window.firebase && firebase.apps.length > 0) {
                    firebase.firestore().collection('system_logs').doc('admin_analytics_diagnostic').set({
                        logs: logs,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(() => {});
                }
            }
            
            console.log = function(...args) {
                originalLog.apply(console, args);
                saveLog('log', args);
            };
            console.error = function(...args) {
                originalError.apply(console, args);
                saveLog('error', args);
            };
            console.warn = function(...args) {
                originalWarn.apply(console, args);
                saveLog('warn', args);
            };
            
            window.addEventListener('error', (event) => {
                saveLog('uncaught_error', [event.message, event.error?.stack]);
            });
            window.addEventListener('unhandledrejection', (event) => {
                saveLog('unhandled_rejection', [event.reason?.message || event.reason]);
            });
        })();

        function showDashboardError(message, type = 'error') {
            const banner = document.getElementById('analytics-error-banner');
            const textEl = document.getElementById('analytics-error-text');
            if (banner && textEl) {
                textEl.textContent = message;
                banner.style.display = 'flex';
                const iconEl = banner.querySelector('.material-symbols-outlined');
                if (type === 'warning') {
                    banner.style.backgroundColor = '#fffbeb';
                    banner.style.borderColor = '#fde047';
                    banner.style.color = '#854d0e';
                    if (iconEl) {
                        iconEl.style.color = '#eab308';
                        iconEl.textContent = 'warning';
                    }
                } else {
                    banner.style.backgroundColor = '#fef2f2';
                    banner.style.borderColor = '#fca5a5';
                    banner.style.color = '#991b1b';
                    if (iconEl) {
                        iconEl.style.color = '#ef4444';
                        iconEl.textContent = 'error';
                    }
                }
            }
        }

        // Register global error listeners immediately to catch any crashes
        window.addEventListener('error', (event) => {
            const err = event.error;
            const msg = err?.message || event.message || "Ukjent feil";
            const stack = err?.stack ? " | Stack: " + err.stack.substring(0, 180) : "";
            showDashboardError("Det oppstod en nettleser-feil: " + msg + stack);
        });
        window.addEventListener('unhandledrejection', (event) => {
            const err = event.reason;
            const msg = err?.message || String(err || "Ukjent feil");
            const stack = err?.stack ? " | Stack: " + err.stack.substring(0, 180) : "";
            showDashboardError("Det oppstod en uventet feil i en bakgrunnsprosess: " + msg + stack);
        });

        document.addEventListener('DOMContentLoaded', async () => {
            if (typeof firebase === 'undefined') {
                showDashboardError("Firebase SDK ble ikke lastet inn. Dette kan skyldes en nettverksfeil eller at en annonseblokkerer (AdBlocker) hindrer Google-tjenester i å kjøre.");
                return;
            }

            // Declare all state and chart variables at the top to avoid Temporal Dead Zone (TDZ) reference errors
            let trafficChart = null;
            let sourcesChart = null;
            let gscChart = null;
            let gscIndexingChart = null;
            let activeDays = 7;
            let lastLoadedCities = null;
            let chartsLoaded = false;
            let lastDrawnCitiesJSON = null;
            let lastWidth = 0;
            let lastHeight = 0;
            // Wait for Firebase to load and fetch actual real-time counts from collections
            setTimeout(async () => {
                try {
                    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                        const db = firebase.firestore();
                        
                        // 1. Fetch live Podcast count from firestore
                        const podcastSnap = await db.collection('podcast_transcripts').get();
                        const podcastCount = podcastSnap.size || 0;
                        document.getElementById('real-podcast-count').textContent = podcastCount;

                        // 2. Fetch live Blog post count from site_content pageContent
                        const blogData = await window.firebaseService.getPageContent('collection_blog');
                        const blogList = blogData?.items || [];
                        const blogCount = blogList.length || 0;
                        document.getElementById('real-blog-count').textContent = blogCount;
                        // 3. Fetch real monthly donation sum from Firestore
                        const now = new Date();
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const donationsSnap = await db.collection('donations')
                            .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(startOfMonth))
                            .get();
                        
                        let monthlyTotal = 0;
                        donationsSnap.forEach(doc => {
                            const data = doc.data();
                            const isCompleted = ['completed', 'succeeded', 'captured'].includes(String(data.status || '').toLowerCase());
                            if (isCompleted) {
                                const amt = parseFloat(data.amountNok || data.amount || 0);
                                monthlyTotal += amt;
                            }
                        });
                        
                        const donationsValEl = document.getElementById('real-donations-value');
                        if (donationsValEl) {
                            donationsValEl.textContent = monthlyTotal.toLocaleString('no-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 });
                        }
                    }
                } catch (e) {
                    console.warn('Kunne ikke laste dynamiske Firebase counts til Analytics:', e);
                }
            }, 3000);

            // clear dashboard values to loading/empty state initially

            function clearAnalyticsToEmpty() {
                document.getElementById('live-user-count').textContent = '--';
                document.getElementById('pageviews-value').textContent = '--';
                document.getElementById('engagement-value').textContent = '--';
                
                // Clear Traffic Chart
                if (trafficChart) {
                    trafficChart.data.labels = [];
                    trafficChart.data.datasets[0].data = [];
                    if (trafficChart.data.datasets[1]) {
                        trafficChart.data.datasets[1].data = [];
                        trafficChart.data.datasets[1].label = '';
                    }
                    trafficChart.update();
                }

                // Clear Top Pages
                const topPagesList = document.querySelector('.top-pages-list');
                if (topPagesList) {
                    topPagesList.innerHTML = '<li style="font-size: 13px; color: #64748b; text-align: center; padding: 20px 0;">Laster sider...</li>';
                }

                // Clear Modal Table
                const modalTableBody = document.querySelector('.modal-body-premium tbody');
                if (modalTableBody) {
                    modalTableBody.innerHTML = '<tr><td colspan="3" style="padding:20px 8px; text-align:center; color: #64748b;">Laster sider...</td></tr>';
                }

                // Clear City List
                const citiesListContainer = document.querySelector('.analytics-grid > div:last-child > div');
                if (citiesListContainer) {
                    citiesListContainer.innerHTML = '<div style="font-size: 13px; color: #64748b; text-align: center; padding: 20px 0;">Laster geografisk statistikk...</div>';
                }

                // Clear GeoChart
                if (chartsLoaded && typeof google !== 'undefined' && google.visualization) {
                    drawRegionsMapReal([]);
                }

                // Clear Sources Chart
                if (sourcesChart) {
                    sourcesChart.data.datasets[0].data = [0, 0, 0];
                    sourcesChart.update();
                }
                document.querySelector('.donut-center-val').textContent = '--';
                const centerTextEl = document.querySelector('.donut-center-text');
                if (centerTextEl) centerTextEl.textContent = 'laster...';
                const legendPcts = document.querySelectorAll('.legend-pct');
                if (legendPcts[0]) legendPcts[0].textContent = '--';
                if (legendPcts[1]) legendPcts[1].textContent = '--';
                if (legendPcts[2]) legendPcts[2].textContent = '--';

                // Clear GSC
                const gscNotConnectedNotice = document.getElementById('gsc-not-connected-notice');
                const gscMetricsRow = document.getElementById('gsc-metrics-row');
                const gscChartContainer = document.getElementById('gsc-chart-container');
                if (gscNotConnectedNotice) gscNotConnectedNotice.style.display = 'block';
                if (gscMetricsRow) gscMetricsRow.style.display = 'none';
                if (gscChartContainer) gscChartContainer.style.display = 'none';

                document.getElementById('gsc-clicks-val').textContent = '--';
                document.getElementById('gsc-impressions-val').textContent = '--';
                document.getElementById('gsc-ctr-val').textContent = '--';
                document.getElementById('gsc-position-val').textContent = '--';

                if (gscChart) {
                    gscChart.data.labels = [];
                    gscChart.data.datasets[0].data = [];
                    gscChart.data.datasets[1].data = [];
                    gscChart.update();
                }

                // Clear Gen AI
                document.getElementById('crawl-chatgpt').textContent = '--';
                document.getElementById('crawl-gemini').textContent = '--';
                document.getElementById('crawl-claude').textContent = '--';
                document.getElementById('crawl-perplexity').textContent = '--';

                document.getElementById('ai-queries-home').textContent = '--';
                document.getElementById('ai-queries-teaching').textContent = '--';
                document.getElementById('ai-queries-giver').textContent = '--';

                const homeBar = document.getElementById('ai-queries-home-bar');
                const teachingBar = document.getElementById('ai-queries-teaching-bar');
                const giverBar = document.getElementById('ai-queries-giver-bar');
                if (homeBar) homeBar.style.width = '0%';
                if (teachingBar) teachingBar.style.width = '0%';
                if (giverBar) giverBar.style.width = '0%';

                const aiAlertBox = document.querySelector('.ai-alert-box');
                if (aiAlertBox) {
                    const aiAlertTitle = aiAlertBox.querySelector('h5');
                    const aiAlertText = aiAlertBox.querySelector('p');
                    if (aiAlertTitle) aiAlertTitle.textContent = 'AI-trafikkandel: --';
                    if (aiAlertText) aiAlertText.textContent = 'Venter på data...';
                }

                // Clear GSC Indexation
                const indexingCard = document.getElementById('gsc-indexing-card');
                if (indexingCard) indexingCard.style.display = 'none';
                
                const indexedVal = document.getElementById('gsc-indexed-val');
                const nonIndexedVal = document.getElementById('gsc-nonindexed-val');
                const totalVal = document.getElementById('gsc-total-pages-val');
                const rateVal = document.getElementById('gsc-index-rate-val');
                const dateBadge = document.getElementById('gsc-indexing-date');
                const reasonsBody = document.getElementById('gsc-indexing-reasons-body');

                if (indexedVal) indexedVal.textContent = '--';
                if (nonIndexedVal) nonIndexedVal.textContent = '--';
                if (totalVal) totalVal.textContent = '--';
                if (rateVal) rateVal.textContent = '--';
                if (dateBadge) dateBadge.textContent = 'Siste: --';
                if (reasonsBody) reasonsBody.innerHTML = '<tr><td colspan="4" style="padding: 12px 4px; color: #64748b; text-align: center;">Laster årsaker...</td></tr>';

                if (gscIndexingChart) {
                    gscIndexingChart.data.labels = [];
                    gscIndexingChart.data.datasets[0].data = [];
                    gscIndexingChart.data.datasets[1].data = [];
                    gscIndexingChart.update();
                }
            }

            // 2. Setup Chart.js Charts
            const ctxTraffic = document.getElementById('traffic-line-chart').getContext('2d');
            const ctxSources = document.getElementById('sources-donut-chart').getContext('2d');

            // Colors
            const colorBrandOrange = '#d17d39';
            const colorAccentRed = '#bd4f2a';

            // Generate last 7 days of dates dynamically for the demo/placeholder view
            // Setup empty Chart.js Charts (no mockup or fictional data)

            // Gradients for line charts
            const gradientPrimary = ctxTraffic.createLinearGradient(0, 0, 0, 300);
            gradientPrimary.addColorStop(0, 'rgba(209, 125, 57, 0.3)');
            gradientPrimary.addColorStop(1, 'rgba(209, 125, 57, 0.0)');

            const gradientSecondary = ctxTraffic.createLinearGradient(0, 0, 0, 300);
            gradientSecondary.addColorStop(0, 'rgba(189, 79, 42, 0.2)');
            gradientSecondary.addColorStop(1, 'rgba(189, 79, 42, 0.0)');

            // 2a. Traffic Line Chart initialization
            trafficChart = new Chart(ctxTraffic, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Brukersesjoner',
                            data: [],
                            borderColor: colorBrandOrange,
                            backgroundColor: gradientPrimary,
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: colorBrandOrange,
                            pointBorderColor: '#fff',
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: colorBrandOrange,
                            pointHoverBorderColor: '#fff'
                        },
                        {
                            label: 'Unike besøkende',
                            data: [],
                            borderColor: colorAccentRed,
                            backgroundColor: gradientSecondary,
                            borderWidth: 2,
                            borderDash: [5, 5],
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: colorAccentRed,
                            pointBorderColor: '#fff',
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: colorAccentRed,
                            pointHoverBorderColor: '#fff'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                boxWidth: 16,
                                font: {
                                    family: 'Inter',
                                    weight: 600,
                                    size: 12
                                },
                                color: '#475569'
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: '#0f172a',
                            titleFont: { family: 'Inter', weight: 700, size: 12 },
                            bodyFont: { family: 'Inter', size: 12 },
                            padding: 12,
                            cornerRadius: 8,
                            boxPadding: 6
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    family: 'Inter',
                                    size: 11
                                },
                                color: '#64748b'
                            }
                        },
                        y: {
                            grid: {
                                color: '#f1f5f9'
                            },
                            ticks: {
                                font: {
                                    family: 'Inter',
                                    size: 11
                                },
                                color: '#64748b'
                            }
                        }
                    }
                }
            });

            // 2b. Sources Donut Chart initialization
            sourcesChart = new Chart(ctxSources, {
                type: 'doughnut',
                data: {
                    labels: ['Direkte trafikk', 'Organisk søk', 'Sosiale medier'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: [
                            colorAccentRed,
                            colorBrandOrange,
                            '#cbd5e1'
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '80%',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: '#0f172a',
                            titleFont: { family: 'Inter', weight: 700, size: 12 },
                            bodyFont: { family: 'Inter', size: 12 },
                            padding: 12,
                            cornerRadius: 8
                        }
                    }
                }
            });

            // 2c. GSC Line Chart initialization
            const ctxGsc = document.getElementById('gsc-line-chart').getContext('2d');
            gscChart = new Chart(ctxGsc, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Klikk',
                            data: [],
                            borderColor: '#d17d39', // Brand orange
                            backgroundColor: 'rgba(209, 125, 57, 0.05)',
                            borderWidth: 2,
                            pointRadius: 3,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Visninger',
                            data: [],
                            borderColor: '#bd4f2a', // Brand dark red/orange
                            backgroundColor: 'transparent',
                            borderWidth: 1.5,
                            borderDash: [4, 4],
                            pointRadius: 0,
                            yAxisID: 'y1',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' }
                        },
                        y: {
                            grid: { color: '#f1f5f9' },
                            ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' }
                        },
                        y1: {
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' }
                        }
                    }
                }
            });

            // 2d. GSC Indexing Chart initialization
            const ctxIndexing = document.getElementById('gsc-indexing-chart').getContext('2d');
            gscIndexingChart = new Chart(ctxIndexing, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Indeksert',
                            data: [],
                            borderColor: '#16a34a', // Green
                            backgroundColor: 'rgba(22, 163, 74, 0.05)',
                            borderWidth: 2,
                            pointRadius: 2,
                            fill: true,
                            tension: 0.2
                        },
                        {
                            label: 'Ikke indeksert',
                            data: [],
                            borderColor: '#dc2626', // Red
                            backgroundColor: 'rgba(220, 38, 38, 0.03)',
                            borderWidth: 2,
                            pointRadius: 2,
                            fill: true,
                            tension: 0.2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: true,
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: { family: 'Inter', size: 10 }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' }
                        },
                        y: {
                            grid: { color: '#f1f5f9' },
                            ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' }
                        }
                    }
                }
            });

            // No initial static/fictional data is populated on load.
            clearAnalyticsToEmpty();

            function updateChartColors(theme) {
                const isDark = theme === 'dark';
                const gridColor = isDark ? '#334155' : '#f1f5f9';
                const tickColor = isDark ? '#94a3b8' : '#64748b';
                const legendColor = isDark ? '#94a3b8' : '#475569';

                if (trafficChart) {
                    trafficChart.options.scales.x.ticks.color = tickColor;
                    trafficChart.options.scales.y.ticks.color = tickColor;
                    trafficChart.options.scales.y.grid.color = gridColor;
                    trafficChart.options.plugins.legend.labels.color = legendColor;
                    trafficChart.update();
                }
                if (gscChart) {
                    gscChart.options.scales.x.ticks.color = tickColor;
                    gscChart.options.scales.y.ticks.color = tickColor;
                    gscChart.options.scales.y.grid.color = gridColor;
                    if (gscChart.options.scales.y1) {
                        gscChart.options.scales.y1.ticks.color = tickColor;
                    }
                    gscChart.update();
                }
                if (gscIndexingChart) {
                    gscIndexingChart.options.scales.x.ticks.color = tickColor;
                    gscIndexingChart.options.scales.y.ticks.color = tickColor;
                    gscIndexingChart.options.scales.y.grid.color = gridColor;
                    if (gscIndexingChart.options.plugins.legend.labels) {
                        gscIndexingChart.options.plugins.legend.labels.color = tickColor;
                    }
                    gscIndexingChart.update();
                }
            }

            // Sync charts with current theme on load
            const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';
            updateChartColors(initialTheme);

            // Listen for theme change events to dynamically update chart colors
            window.addEventListener('hkmThemeChanged', (e) => {
                const nextTheme = e.detail.theme;
                updateChartColors(nextTheme);
                
                // Redraw Google GeoChart if it exists
                if (typeof drawRegionsMapReal === 'function') {
                    lastDrawnCitiesJSON = null;
                    drawRegionsMapReal(lastLoadedCities || []);
                }
            });

            // 3. Reell GA4 Datainnhenting og API-integrasjon

            async function loadGscIndexation(days) {
                try {
                    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                        const db = firebase.firestore();
                        const idxSnap = await db.collection('content').doc('gsc_indexation_status').get();
                        if (idxSnap.exists) {
                            const idxData = idxSnap.data();
                            const summary = idxData.summary || {};
                            const history = idxData.history || [];

                            // Vis kortet
                            const card = document.getElementById('gsc-indexing-card');
                            if (card) card.style.display = 'block';

                            // Sett tallverdier
                            const indexedValEl = document.getElementById('gsc-indexed-val');
                            const nonIndexedValEl = document.getElementById('gsc-nonindexed-val');
                            const totalValEl = document.getElementById('gsc-total-pages-val');
                            const rateValEl = document.getElementById('gsc-index-rate-val');
                            const dateBadgeEl = document.getElementById('gsc-indexing-date');

                            if (indexedValEl) indexedValEl.textContent = (summary.indexed || 0).toLocaleString('no-NO');
                            if (nonIndexedValEl) nonIndexedValEl.textContent = (summary.nonIndexed || 0).toLocaleString('no-NO');
                            if (totalValEl) totalValEl.textContent = (summary.total || 0).toLocaleString('no-NO');
                            if (rateValEl) rateValEl.textContent = `${summary.indexingRate || 0}%`;

                            const latestDate = summary.latestDate || "";
                            if (latestDate && dateBadgeEl) {
                                const parts = latestDate.split('-');
                                if (parts.length === 3) {
                                    const day = parseInt(parts[2], 10);
                                    const monthNum = parseInt(parts[1], 10);
                                    const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
                                    dateBadgeEl.textContent = `Siste: ${day}. ${months[monthNum - 1]}`;
                                } else {
                                    dateBadgeEl.textContent = `Siste: ${latestDate}`;
                                }
                            }

                            // Oppdater grafen
                            if (history.length > 0 && gscIndexingChart) {
                                // Filtrer historikk basert på valgte dager
                                const cutDate = new Date();
                                cutDate.setDate(cutDate.getDate() - days);
                                const filteredHistory = history.filter(h => {
                                    const hDate = new Date(h.date);
                                    return hDate >= cutDate;
                                });

                                // Sikkerhetsnett: vis de siste 30 målingene dersom filteret gir for få punkter
                                const chartData = (filteredHistory.length >= 3) ? filteredHistory : history.slice(-Math.min(30, history.length));

                                const labels = chartData.map(h => {
                                    const parts = h.date.split('-');
                                    if (parts.length === 3) {
                                        const day = parseInt(parts[2], 10);
                                        const monthNum = parseInt(parts[1], 10);
                                        const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
                                        return `${day}. ${months[monthNum - 1] || ''}`;
                                    }
                                    return h.date;
                                });

                                const indexedSeries = chartData.map(h => h.indexed);
                                const nonIndexedSeries = chartData.map(h => h.nonIndexed);

                                gscIndexingChart.data.labels = labels;
                                gscIndexingChart.data.datasets[0].data = indexedSeries;
                                gscIndexingChart.data.datasets[1].data = nonIndexedSeries;
                                gscIndexingChart.update();
                            }

                            // Populer årsaker (reasons) tabell
                            const reasonsBody = document.getElementById('gsc-indexing-reasons-body');
                            if (reasonsBody) {
                                const reasonsList = idxData.reasons || [];
                                reasonsBody.innerHTML = '';
                                
                                if (reasonsList.length === 0) {
                                    reasonsBody.innerHTML = '<tr><td colspan="4" style="padding: 12px 4px; color: #64748b; text-align: center;">Ingen registrerte feil eller årsaker</td></tr>';
                                } else {
                                    const totalNonIndexed = summary.nonIndexed || 1;
                                    reasonsList.forEach(r => {
                                        const tr = document.createElement('tr');
                                        tr.style.borderBottom = '1px solid #f1f5f9';
                                        
                                        const pct = totalNonIndexed > 0 ? ((r.count / totalNonIndexed) * 100).toFixed(1) : 0;
                                        
                                        const isGoogle = r.source === 'Google-systemer';
                                        const sourceBadge = `<span class="badge" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 500; background: ${isGoogle ? 'rgba(27, 73, 101, 0.05)' : 'rgba(209, 125, 57, 0.05)'}; color: ${isGoogle ? '#1b4965' : '#d17d39'};">${r.source}</span>`;
                                        
                                        // Highlight 404 with red and others with regular color
                                        const barColor = r.reason.toLowerCase().includes('404') ? '#dc2626' : '#1b4965';
                                        
                                        tr.innerHTML = `
                                            <td style="padding: 10px 4px; font-weight: 600; color: #334155; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.reason}">${r.reason}</td>
                                            <td style="padding: 10px 4px;">${sourceBadge}</td>
                                            <td style="padding: 10px 4px; text-align: right; font-weight: 700; color: #1e293b; font-family: 'Fira Code', monospace;">${r.count.toLocaleString('no-NO')}</td>
                                            <td style="padding: 10px 4px; text-align: right;">
                                                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                                                    <span style="font-size: 11px; font-weight: 600; color: #64748b; font-family: 'Fira Code', monospace; min-width: 36px; text-align: right;">${pct}%</span>
                                                    <div style="width: 60px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                                                        <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 3px;"></div>
                                                    </div>
                                                </div>
                                            </td>
                                        `;
                                        reasonsBody.appendChild(tr);
                                    });
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn("[Analytics] Feil ved lasting av indekseringsstatus fra Firestore:", err);
                }
            }

            async function loadRealAnalytics(days) {
                activeDays = days;
                const pageviewsValEl = document.getElementById('pageviews-value');
                const engagementValEl = document.getElementById('engagement-value');
                const pageviewsMetaEl = document.getElementById('pageviews-meta');
 
                // Hent GSC-indeksering uavhengig av GA4 API-tilkobling
                try {
                    await loadGscIndexation(days);
                } catch (gscErr) {
                    console.warn("[Analytics] Feil ved lasting av GSC-indeksering:", gscErr.message);
                }

                pageviewsValEl.textContent = 'Laster...';
                engagementValEl.textContent = 'Laster...';
                
                const centerTextEl = document.querySelector('.donut-center-text');
                if (centerTextEl) centerTextEl.textContent = 'laster...';

                try {
                    let user = (typeof firebase !== 'undefined' && firebase.apps.length > 0 && firebase.auth && firebase.auth().currentUser) || (window.firebaseService && window.firebaseService.auth && window.firebaseService.auth.currentUser);
                    let idToken = '';
                    if (user && typeof user.getIdToken === 'function') {
                        try { idToken = await user.getIdToken(); } catch (e) {}
                    }
                    if (!idToken) {
                        for (let i = 0; i < 6; i++) {
                            await new Promise(r => setTimeout(r, 200));
                            const u = (typeof firebase !== 'undefined' && firebase.apps.length > 0 && firebase.auth && firebase.auth().currentUser) || (window.firebaseService && window.firebaseService.auth && window.firebaseService.auth.currentUser);
                            if (u && typeof u.getIdToken === 'function') {
                                try { idToken = await u.getIdToken(); break; } catch (e) {}
                            }
                        }
                    }

                    if (!idToken) {
                        console.warn("[Analytics] Ingen gyldig innloggingstoken tilgjengelig.");
                        showDashboardError("Venter på at brukerinnlogging skal fullføres. Vennligst vent et øyeblikk eller oppdater siden.", 'warning');
                        pageviewsValEl.textContent = '--';
                        engagementValEl.textContent = '--';
                        return;
                    }

                    const response = await fetch(`https://getanalyticsoverview-42bhgdjkcq-uc.a.run.app?days=${days}`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`
                        }
                    });

                    if (!response.ok) throw new Error(`GA4 API returnerte status ${response.status}`);
                    const result = await response.json();

                    if (result.status === 'success' && result.data) {
                        const data = result.data;

                        // 3a. Live Brukere (med tilfeldig mikrosvingning for dynamisk effekt)
                        const liveCounterEl = document.getElementById('live-user-count');
                        const baseUsers = parseInt(data.activeUsers) || 0;
                        liveCounterEl.textContent = baseUsers;

                        if (window.liveOscillateInterval) clearInterval(window.liveOscillateInterval);
                        window.liveOscillateInterval = setInterval(() => {
                            const current = parseInt(liveCounterEl.textContent) || baseUsers;
                            const shift = Math.random() > 0.5 ? 1 : -1;
                            let next = current + shift;
                            if (next < Math.max(0, baseUsers - 3)) next = Math.max(0, baseUsers - 3);
                            if (next > baseUsers + 3) next = baseUsers + 3;
                            liveCounterEl.textContent = next;

                            // Beveg sparkline-søylene til venstre
                            const bars = document.getElementById('live-sparkline').children;
                            for (let i = 0; i < bars.length - 1; i++) {
                                bars[i].style.height = bars[i + 1].style.height;
                            }
                            const newHeight = Math.floor(Math.random() * 60) + 30;
                            bars[bars.length - 1].style.height = newHeight + '%';
                        }, 4000);

                        // 3b. Oversiktskort
                        pageviewsValEl.textContent = parseInt(data.screenPageViews || 0).toLocaleString('no-NO');
                        
                        const mins = Math.floor((parseInt(data.avgDuration) || 0) / 60);
                        const secs = Math.round((parseInt(data.avgDuration) || 0) % 60);
                        engagementValEl.textContent = `${mins}m ${secs}s`;
                        
                        pageviewsMetaEl.textContent = days === 1 ? 'Siste 24 timer' : `Siste ${days} dager`;

                        // 3c. Line Chart (Trafikkovervåking)
                        const daily = data.dailyTraffic || [];
                        const chartLabels = daily.map((d, i) => {
                            const rawDate = d.date || '';
                            if (/^\d{8}$/.test(rawDate)) {
                                const day = parseInt(rawDate.substring(6, 8), 10);
                                const monthNum = parseInt(rawDate.substring(4, 6), 10);
                                const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
                                return `${day}. ${months[monthNum - 1] || ''}`;
                            }
                            return rawDate || `Pkt ${i+1}`;
                        });
                        const chartValues = daily.map(d => parseInt(d.users) || 0);

                        trafficChart.data.labels = chartLabels;
                        trafficChart.data.datasets[0].data = chartValues;
                        trafficChart.data.datasets[0].label = 'Aktive brukere';
                        if (trafficChart.data.datasets[1]) {
                            trafficChart.data.datasets[1].data = []; // Skjul det sekundære mock-datasettet
                            trafficChart.data.datasets[1].label = '';
                        }
                        trafficChart.update();

                        // 3d. Topp Sider
                        const topPages = data.topPages || [];
                        const topPagesList = document.querySelector('.top-pages-list');
                        const totalViews = topPages.reduce((acc, curr) => acc + (parseInt(curr.views) || 0), 0) || 1;

                        let topPagesHtml = '';
                        topPages.slice(0, 5).forEach((page, index) => {
                            const viewsVal = parseInt(page.views) || 0;
                            const pct = Math.round((viewsVal / totalViews) * 100);
                            topPagesHtml += `
                                <li class="top-page-item">
                                    <div class="top-page-meta">
                                        <span class="top-page-name">${page.title || 'Ukjent side'}</span>
                                        <span class="top-page-count">${viewsVal.toLocaleString('no-NO')} (${pct}%)</span>
                                    </div>
                                    <div class="top-page-bar-wrapper">
                                        <div class="top-page-bar ${index === 0 ? 'accent' : ''}" style="width: ${pct}%;"></div>
                                    </div>
                                </li>
                            `;
                        });
                        if (topPagesList) topPagesList.innerHTML = topPagesHtml || '<li>Ingen data registrert</li>';

                        // Populer Modal-tabellen for alle sideresultater
                        const modalTableBody = document.querySelector('.modal-body-premium tbody');
                        if (modalTableBody) {
                            let modalHtml = '';
                            topPages.forEach(page => {
                                const viewsVal = parseInt(page.views) || 0;
                                const pct = Math.round((viewsVal / totalViews) * 100);
                                modalHtml += `
                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                        <td style="padding: 12px 8px; font-weight: 600; color: #334155;">${page.title || '/'}</td>
                                        <td style="padding: 12px 8px; text-align: right; font-family: 'Fira Code', monospace;">${viewsVal.toLocaleString('no-NO')}</td>
                                        <td style="padding: 12px 8px; text-align: right; font-family: 'Fira Code', monospace; color: #bd4f2a; font-weight: 700;">${pct}%</td>
                                    </tr>
                                `;
                            });
                            modalTableBody.innerHTML = modalHtml || '<tr><td colspan="3" style="padding:12px; text-align:center;">Ingen data</td></tr>';
                        }

                        // 3e. Geografisk oversikt (Topp byer i Norge)
                        const topCities = data.topCities || [];
                        const citiesListContainer = document.querySelector('.analytics-grid > div:last-child > div');
                        if (citiesListContainer) {
                            const totalCityUsers = topCities.reduce((acc, curr) => acc + (parseInt(curr.users) || 0), 0) || 1;
                            let citiesHtml = '';
                            topCities.slice(0, 4).forEach(cityData => {
                                const cityUsers = parseInt(cityData.users) || 0;
                                const pct = Math.round((cityUsers / totalCityUsers) * 100);
                                const rawCityName = cityData.city || 'Ukjent';
                                const cleanCityName = rawCityName.replace(/\s+municipality/i, '').trim();
                                citiesHtml += `
                                    <div>
                                        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                                            <span style="font-weight: 600; color: #334155;">${cleanCityName}</span>
                                            <span style="font-family: 'Fira Code', monospace; font-weight: 700; color: #d17d39;">${pct}%</span>
                                        </div>
                                        <div class="top-page-bar-wrapper">
                                            <div class="top-page-bar" style="width: ${pct}%; background: linear-gradient(to right, #bd4f2a, #d17d39);"></div>
                                        </div>
                                    </div>
                                `;
                            });
                            citiesListContainer.innerHTML = citiesHtml || '<p>Ingen bydata tilgjengelig</p>';
                        }

                        // Oppdater Google GeoChart med virkelige byer
                        lastLoadedCities = topCities;
                        if (chartsLoaded && typeof google !== 'undefined' && google.visualization && google.visualization.arrayToDataTable) {
                            drawRegionsMapReal(topCities);
                        }

                        // 3f. Trafikkilder
                        const sources = data.trafficSources || [];
                        const totalSessions = sources.reduce((acc, curr) => acc + (parseInt(curr.sessions) || 0), 0) || 1;
                        
                        let directVal = 0, searchVal = 0, socialVal = 0;
                        sources.forEach(s => {
                            const name = String(s.source || '').toLowerCase();
                            const val = parseInt(s.sessions) || 0;
                            if (name.includes('direct') || name.includes('(none)')) directVal += val;
                            else if (name.includes('search') || name.includes('google') || name.includes('bing') || name.includes('yahoo')) searchVal += val;
                            else if (name.includes('social') || name.includes('facebook') || name.includes('instagram') || name.includes('t.co')) socialVal += val;
                            else directVal += val;
                        });

                        const directPct = Math.round((directVal / totalSessions) * 100) || 0;
                        const searchPct = Math.round((searchVal / totalSessions) * 100) || 0;
                        const socialPct = Math.round((socialVal / totalSessions) * 100) || 0;

                        sourcesChart.data.datasets[0].data = [directPct, searchPct, socialPct];
                        sourcesChart.update();

                        document.querySelector('.donut-center-val').textContent = `${directPct}%`;
                        const centerTextEl = document.querySelector('.donut-center-text');
                        if (centerTextEl) centerTextEl.textContent = 'direkte';
                        const legendPcts = document.querySelectorAll('.legend-pct');
                        if (legendPcts[0]) legendPcts[0].textContent = `${directPct}%`;
                        if (legendPcts[1]) legendPcts[1].textContent = `${searchPct}%`;
                        if (legendPcts[2]) legendPcts[2].textContent = `${socialPct}%`;

                        // 3g. Google Search Console & Gen AI Visibility updates (100% Real Data)
                        const gscNotConnectedNotice = document.getElementById('gsc-not-connected-notice');
                        const gscMetricsRow = document.getElementById('gsc-metrics-row');
                        const gscChartContainer = document.getElementById('gsc-chart-container');

                        if (data.gscSummary) {
                            const gscNoDataNotice = document.getElementById('gsc-no-data-notice');
                            if (gscNotConnectedNotice) gscNotConnectedNotice.style.display = 'none';
                            
                            if (data.gscSummary.noData) {
                                // Connected but no data in this period
                                if (gscMetricsRow) gscMetricsRow.style.display = 'grid';
                                if (gscChartContainer) gscChartContainer.style.display = 'none';
                                if (gscNoDataNotice) {
                                    gscNoDataNotice.style.display = 'flex';
                                }
                            } else {
                                // Connected and has data
                                if (gscMetricsRow) gscMetricsRow.style.display = 'grid';
                                if (gscChartContainer) gscChartContainer.style.display = 'block';
                                if (gscNoDataNotice) gscNoDataNotice.style.display = 'none';
                            }

                            // Populate real summary values
                            const clicksVal = parseInt(data.gscSummary.clicks) || 0;
                            const impressionsVal = parseInt(data.gscSummary.impressions) || 0;
                            document.getElementById('gsc-clicks-val').textContent = clicksVal.toLocaleString('no-NO');
                            document.getElementById('gsc-impressions-val').textContent = impressionsVal.toLocaleString('no-NO');
                            document.getElementById('gsc-ctr-val').textContent = data.gscSummary.ctr || '0.0%';
                            document.getElementById('gsc-position-val').textContent = data.gscSummary.position || '0.0';

                            // Populate real daily values to chart
                            if (data.gscDaily && data.gscDaily.length > 0 && !data.gscSummary.noData) {
                                const gscChartLabels = data.gscDaily.map((d, i) => {
                                    const rawDate = d.date || '';
                                    if (/^\d{8}$/.test(rawDate)) {
                                        const day = parseInt(rawDate.substring(6, 8), 10);
                                        const monthNum = parseInt(rawDate.substring(4, 6), 10);
                                        const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
                                        return `${day}. ${months[monthNum - 1] || ''}`;
                                    }
                                    return rawDate || `Pkt ${i+1}`;
                                });
                                const gscClicksDaily = data.gscDaily.map(d => parseInt(d.clicks) || 0);
                                const gscImpressionsDaily = data.gscDaily.map(d => parseInt(d.impressions) || 0);

                                gscChart.data.labels = gscChartLabels;
                                gscChart.data.datasets[0].data = gscClicksDaily;
                                gscChart.data.datasets[1].data = gscImpressionsDaily;
                                gscChart.update();
                            } else {
                                // Default/clear chart if no daily rows or no data
                                gscChart.data.labels = chartLabels;
                                gscChart.data.datasets[0].data = chartLabels.map(() => 0);
                                gscChart.data.datasets[1].data = chartLabels.map(() => 0);
                                gscChart.update();
                            }
                        } else {
                            // Show warning notice, hide data
                            const gscNoDataNotice = document.getElementById('gsc-no-data-notice');
                            if (gscNotConnectedNotice) gscNotConnectedNotice.style.display = 'block';
                            if (gscMetricsRow) gscMetricsRow.style.display = 'none';
                            if (gscChartContainer) gscChartContainer.style.display = 'none';
                            if (gscNoDataNotice) gscNoDataNotice.style.display = 'none';
                        }

                        // Gen AI real traffic updates
                        const crawlChatgptEl = document.getElementById('crawl-chatgpt');
                        const crawlGeminiEl = document.getElementById('crawl-gemini');
                        const crawlClaudeEl = document.getElementById('crawl-claude');
                        const crawlPerplexityEl = document.getElementById('crawl-perplexity');

                        // Update sub-section header text to clarify it is real traffic
                        const aiCrawlerTitleEl = document.getElementById('ai-crawler-title');
                        if (aiCrawlerTitleEl) {
                            aiCrawlerTitleEl.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; color: #d17d39;">hub</span> Referansetrafikk fra AI-søk (Besøk)`;
                        }

                        let gptSessions = 0;
                        let geminiSessions = 0;
                        let claudeSessions = 0;
                        let perplexitySessions = 0;

                        const sourcesList = data.aiSources || [];
                        sourcesList.forEach(s => {
                            const src = String(s.source || '').toLowerCase();
                            const sess = parseInt(s.sessions) || 0;
                            if (src.includes('chatgpt') || src.includes('openai')) {
                                gptSessions += sess;
                            } else if (src.includes('gemini')) {
                                geminiSessions += sess;
                            } else if (src.includes('claude') || src.includes('anthropic')) {
                                claudeSessions += sess;
                            } else if (src.includes('perplexity')) {
                                perplexitySessions += sess;
                            }
                        });

                        const formatSess = (val) => val > 0 ? `${val} besøk` : 'Ingen besøk';
                        const setStyleForSess = (el, val) => {
                            if (!el) return;
                            el.textContent = formatSess(val);
                            if (val > 0) {
                                el.style.color = '#10b981'; // Green accent
                                el.style.fontWeight = '700';
                            } else {
                                el.style.color = '#64748b'; // Slate gray
                                el.style.fontWeight = 'normal';
                            }
                        };

                        setStyleForSess(crawlChatgptEl, gptSessions);
                        setStyleForSess(crawlGeminiEl, geminiSessions);
                        setStyleForSess(crawlClaudeEl, claudeSessions);
                        setStyleForSess(crawlPerplexityEl, perplexitySessions);

                        // AI interest/top pages mapping (100% Real pageviews of key pages)
                        const aiQueriesTitleEl = document.getElementById('ai-queries-title');
                        if (aiQueriesTitleEl) {
                            aiQueriesTitleEl.innerHTML = `<span class="material-symbols-outlined" style="font-size: 14px; color: #d17d39;">bar_chart</span> Reell trafikk på nøkkelsider`;
                        }

                        // Let's find the views for '/', '/undervisning', '/bli-fast-giver' in the real topPages report
                        let homeViews = 0;
                        let teachingViews = 0;
                        let giverViews = 0;

                        topPages.forEach(p => {
                            const title = String(p.title || '').toLowerCase().trim();
                            const v = parseInt(p.views) || 0;
                            
                            const isHome = title === 'his kingdom ministry' || 
                                           title === '/' || 
                                           title.startsWith('forside') || 
                                           title.startsWith('home') || 
                                           title.startsWith('inicio');
                                           
                            if (isHome) {
                                homeViews += v;
                            } else if (title.includes('undervisning')) {
                                teachingViews += v;
                            } else if (title.includes('giver') || title.includes('donasjon') || title.includes('fast-giver')) {
                                giverViews += v;
                            }
                        });

                        const totalPageviewsSum = topPages.reduce((acc, curr) => acc + (parseInt(curr.views) || 0), 0) || 1;

                        const homePct = Math.round((homeViews / totalPageviewsSum) * 100);
                        const teachingPct = Math.round((teachingViews / totalPageviewsSum) * 100);
                        const giverPct = Math.round((giverViews / totalPageviewsSum) * 100);

                        // Populate real views count
                        const aiQueriesHome = document.getElementById('ai-queries-home');
                        const aiQueriesTeaching = document.getElementById('ai-queries-teaching');
                        const aiQueriesGiver = document.getElementById('ai-queries-giver');

                        if (aiQueriesHome) aiQueriesHome.textContent = `${homeViews.toLocaleString('no-NO')} visninger`;
                        if (aiQueriesTeaching) aiQueriesTeaching.textContent = `${teachingViews.toLocaleString('no-NO')} visninger`;
                        if (aiQueriesGiver) aiQueriesGiver.textContent = `${giverViews.toLocaleString('no-NO')} visninger`;

                        // Populate actual share text instead of fake trend changes
                        const aiQueriesHomeChange = document.getElementById('ai-queries-home-change');
                        const aiQueriesTeachingChange = document.getElementById('ai-queries-teaching-change');
                        const aiQueriesGiverChange = document.getElementById('ai-queries-giver-change');

                        if (aiQueriesHomeChange) {
                            aiQueriesHomeChange.textContent = `${homePct}% andel`;
                            aiQueriesHomeChange.style.color = '#64748b';
                        }
                        if (aiQueriesTeachingChange) {
                            aiQueriesTeachingChange.textContent = `${teachingPct}% andel`;
                            aiQueriesTeachingChange.style.color = '#64748b';
                        }
                        if (aiQueriesGiverChange) {
                            aiQueriesGiverChange.textContent = `${giverPct}% andel`;
                            aiQueriesGiverChange.style.color = '#64748b';
                        }

                        // Adjust progress bars based on actual share
                        const homeBar = document.getElementById('ai-queries-home-bar');
                        const teachingBar = document.getElementById('ai-queries-teaching-bar');
                        const giverBar = document.getElementById('ai-queries-giver-bar');

                        if (homeBar) homeBar.style.width = `${homePct}%`;
                        if (teachingBar) teachingBar.style.width = `${teachingPct}%`;
                        if (giverBar) giverBar.style.width = `${giverPct}%`;

                        // Update ChatGPT-synlighetsresultat Alert Box to be 100% Real AI Share of Traffic
                        const totalAiVisits = gptSessions + geminiSessions + claudeSessions + perplexitySessions;
                        const aiAlertBox = document.querySelector('.ai-alert-box');
                        if (aiAlertBox) {
                            const aiAlertTitle = aiAlertBox.querySelector('h5');
                            const aiAlertText = aiAlertBox.querySelector('p');

                            if (totalAiVisits > 0) {
                                const totalOverallSessions = data.trafficSources ? data.trafficSources.reduce((acc, curr) => acc + (parseInt(curr.sessions) || 0), 0) : 1;
                                const aiSharePct = ((totalAiVisits / (totalOverallSessions || 1)) * 100).toFixed(2);
                                if (aiAlertTitle) aiAlertTitle.textContent = `AI-trafikkandel: ${aiSharePct}%`;
                                if (aiAlertText) aiAlertText.textContent = `Nettstedet har registrert ${totalAiVisits} reelle besøk fra AI-tjenester i denne perioden (totalt ${totalOverallSessions} sesjoner).`;
                            } else {
                                if (aiAlertTitle) aiAlertTitle.textContent = `Ingen AI-trafikk registrert`;
                                if (aiAlertText) aiAlertText.textContent = `Det er ikke registrert noen henvisninger fra ChatGPT, Gemini, Claude eller Perplexity i denne perioden (0 av ${data.trafficSources ? data.trafficSources.reduce((acc, curr) => acc + (parseInt(curr.sessions) || 0), 0) : 0} sesjoner).`;
                            }
                        }
                    } else {
                        throw new Error(result.message || `Uventet API-status: ${result.status}`);
                    }
                } catch (error) {
                    console.error("[Analytics] Feil under lasting av reell statistikk:", error);
                    pageviewsValEl.textContent = 'Feil';
                    engagementValEl.textContent = 'Feil';
                    
                    if (error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('permission')) {
                        showDashboardError("Rettighetsfeil (403): Brukerkontoen din har ikke tilgang til å hente Google Analytics-data. Vennligst kontakt superadmin.");
                    } else if (error.message.includes('unconfigured') || error.message.includes('mangler')) {
                        showDashboardError("Google Analytics er ikke ferdig konfigurert i integrasjonsinnstillingene: " + error.message, 'warning');
                    } else {
                        showDashboardError("Kunne ikke laste statistikk: " + error.message);
                    }
                }
            }

            // Lytter på Auth-endringer for å hente ekte data så snart bruker er klar
            const initAuthListener = async () => {
                let service = window.firebaseService;
                for (let i = 0; i < 20; i++) {
                    if (service && service.isInitialized) break;
                    await new Promise(r => setTimeout(r, 100));
                    service = window.firebaseService;
                }

                if (service && service.isInitialized) {
                    service.onAuthChange((user) => {
                        if (user) {
                            const banner = document.getElementById('analytics-error-banner');
                            if (banner) banner.style.display = 'none';
                            loadRealAnalytics(7); // Hent siste 7 dager som standard
                        } else {
                            clearAnalyticsToEmpty();
                            setTimeout(() => {
                                if (window.firebaseService && !window.firebaseService.auth.currentUser) {
                                    showDashboardError("Du er ikke logget inn i Firebase. Vennligst logg inn på nytt for å se statistikk.", 'warning');
                                }
                            }, 2000);
                        }
                    });
                } else if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    // Fallback to legacy auth listener
                    firebase.auth().onAuthStateChanged((user) => {
                        if (user) {
                            const banner = document.getElementById('analytics-error-banner');
                            if (banner) banner.style.display = 'none';
                            loadRealAnalytics(7);
                        } else {
                            clearAnalyticsToEmpty();
                            setTimeout(() => {
                                if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && !firebase.auth().currentUser) {
                                    showDashboardError("Du er ikke logget inn i Firebase. Vennligst logg inn på nytt for å se statistikk.", 'warning');
                                }
                            }, 2000);
                        }
                    });
                }
            };
            initAuthListener();

            // 4. Period velger klikk-lyttere
            const periodButtons = document.querySelectorAll('.period-btn');
            periodButtons.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    periodButtons.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');

                    const period = e.target.dataset.period;
                    let days = 7;
                    if (period === '1') days = 1;
                    else if (period === '30') days = 30;
                    else if (period === 'year') days = 365;

                    if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && firebase.auth().currentUser) {
                        await loadRealAnalytics(days);
                    } else {
                        clearAnalyticsToEmpty();
                    }
                });
            });

            // 5. Modal event-lyttere
            const modalEl = document.getElementById('pages-results-modal');
            const openModalBtn = document.getElementById('open-all-pages-btn');
            const closeBtn1 = document.getElementById('close-pages-modal-btn');
            const closeBtn2 = document.getElementById('close-pages-modal-btn-2');

            openModalBtn.addEventListener('click', () => {
                modalEl.style.display = 'flex';
            });

            [closeBtn1, closeBtn2].forEach(btn => {
                btn.addEventListener('click', () => {
                    modalEl.style.display = 'none';
                });
            });

            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) {
                    modalEl.style.display = 'none';
                }
            });

            // 6. Google GeoChart-initialisering
            google.charts.load('current', {
                'packages':['geochart'],
            });
            google.charts.setOnLoadCallback(() => {
                chartsLoaded = true;
                if (lastLoadedCities) {
                    drawRegionsMapReal(lastLoadedCities);
                } else {
                    // Initialiser tomt eller med standardverdier
                    drawRegionsMapReal([]);
                }
            });

            function drawRegionsMapReal(cities = []) {
                const citiesJSON = JSON.stringify(cities);
                if (citiesJSON === lastDrawnCitiesJSON) {
                    return; // Unngå duplikat tegning av nøyaktig samme data
                }

                const containerEl = document.getElementById('regions_div');
                if (!containerEl) return;

                // Ikke tegn hvis containeren er skjult eller har 0 bredde/høyde
                if (containerEl.offsetWidth === 0 || containerEl.offsetHeight === 0) {
                    return;
                }

                const cityCoords = {
                    'oslo': { lat: 59.9139, lon: 10.7522 },
                    'bergen': { lat: 60.3913, lon: 5.3221 },
                    'trondheim': { lat: 63.4305, lon: 10.3951 },
                    'stavanger': { lat: 58.9700, lon: 5.7331 },
                    'kristiansand': { lat: 58.1467, lon: 7.9949 },
                    'fredrikstad': { lat: 59.2205, lon: 10.9347 },
                    'sandnes': { lat: 58.8524, lon: 5.7352 },
                    'tromsø': { lat: 69.6492, lon: 18.9553 },
                    'tromso': { lat: 69.6492, lon: 18.9553 },
                    'drammen': { lat: 59.7440, lon: 10.2045 },
                    'sarpsborg': { lat: 59.2839, lon: 11.1096 },
                    'skien': { lat: 59.2096, lon: 9.6090 },
                    'porsgrunn': { lat: 59.1395, lon: 9.6568 },
                    'bodø': { lat: 67.2804, lon: 14.4049 },
                    'bodo': { lat: 67.2804, lon: 14.4049 },
                    'ålesund': { lat: 62.4722, lon: 6.1549 },
                    'alesund': { lat: 62.4722, lon: 6.1549 },
                    'arendal': { lat: 58.4618, lon: 8.7663 },
                    'sandefjord': { lat: 59.1312, lon: 10.2168 },
                    'larvik': { lat: 59.0533, lon: 10.0270 },
                    'tønsberg': { lat: 59.2676, lon: 10.4076 },
                    'tonsberg': { lat: 59.2676, lon: 10.4076 },
                    'horten': { lat: 59.4136, lon: 10.4862 },
                    'moss': { lat: 59.4340, lon: 10.6577 },
                    'hamar': { lat: 60.7945, lon: 11.0680 },
                    'halden': { lat: 59.1200, lon: 11.3800 },
                    'harstad': { lat: 68.7986, lon: 16.5414 },
                    'molde': { lat: 62.7375, lon: 7.1610 },
                    'kristiansund': { lat: 63.1115, lon: 7.7320 },
                    'gjøvik': { lat: 60.7957, lon: 10.6915 },
                    'gjovik': { lat: 60.7957, lon: 10.6915 },
                    'asker': { lat: 59.8351, lon: 10.4392 },
                    'bærum': { lat: 59.8973, lon: 10.5222 },
                    'baerum': { lat: 59.8973, lon: 10.5222 },
                    'lillestrøm': { lat: 59.9560, lon: 11.0492 },
                    'lillestrom': { lat: 59.9560, lon: 11.0492 },
                    'steinkjer': { lat: 64.0150, lon: 11.4950 },
                    'alta': { lat: 69.9689, lon: 23.2716 },
                    'elverum': { lat: 60.8816, lon: 11.5623 },
                    'mandal': { lat: 58.0294, lon: 7.4534 },
                    'grimstad': { lat: 58.3405, lon: 8.5936 },
                    'lillehammer': { lat: 61.1153, lon: 10.4662 },
                    // International cities
                    'helsinki': { lat: 60.1699, lon: 24.9384 },
                    'stockholm': { lat: 59.3293, lon: 18.0686 },
                    'copenhagen': { lat: 55.6761, lon: 12.5683 },
                    'københavn': { lat: 55.6761, lon: 12.5683 },
                    'gothenburg': { lat: 57.7089, lon: 11.9746 },
                    'göteborg': { lat: 57.7089, lon: 11.9746 },
                    'malmö': { lat: 55.6050, lon: 13.0038 },
                    'malmo': { lat: 55.6050, lon: 13.0038 },
                    'london': { lat: 51.5074, lon: -0.1278 },
                    'paris': { lat: 48.8566, lon: 2.3522 },
                    'berlin': { lat: 52.5200, lon: 13.4050 },
                    'new york': { lat: 40.7128, lon: -74.0060 },
                    'washington': { lat: 38.9072, lon: -77.0369 },
                    'chicago': { lat: 41.8781, lon: -87.6298 },
                    'los angeles': { lat: 34.0522, lon: -118.2437 },
                    'reykjavik': { lat: 64.1466, lon: -21.9426 },
                    'reykjavík': { lat: 64.1466, lon: -21.9426 }
                };

                let hasForeignVisitors = false;
                cities.forEach(c => {
                    const country = c.country || '';
                    if (country && country.toLowerCase() !== 'norway' && country.toLowerCase() !== 'no') {
                        hasForeignVisitors = true;
                    }
                });

                var chartData = [];
                var hasCoordsData = false;

                cities.forEach(c => {
                    let cityName = c.city || '';
                    if (cityName && cityName !== 'Ukjent' && cityName !== '(not set)' && cityName.toLowerCase() !== 'unknown') {
                        cityName = cityName.replace(/\s+municipality/i, '').trim();
                        const key = cityName.toLowerCase();
                        if (cityCoords[key]) {
                            const countryName = c.country || 'Norway';
                            chartData.push([cityCoords[key].lat, cityCoords[key].lon, cityName + ', ' + countryName, parseInt(c.users) || 0]);
                            hasCoordsData = true;
                        }
                    }
                });

                if (hasCoordsData) {
                    chartData.unshift(['Lat', 'Long', 'By', 'Besøkende']);
                } else {
                    chartData = [['By', 'Besøkende']];
                    cities.forEach(c => {
                        let cityName = c.city || '';
                        if (cityName && cityName !== 'Ukjent' && cityName !== '(not set)' && cityName.toLowerCase() !== 'unknown') {
                            cityName = cityName.replace(/\s+municipality/i, '').trim();
                            const countryName = c.country || 'Norway';
                            chartData.push([cityName + ', ' + countryName, parseInt(c.users) || 0]);
                        }
                    });
                    if (chartData.length === 1) {
                        chartData.push(['Mandal, Norway', 0]);
                    }
                }

                var dataTable = google.visualization.arrayToDataTable(chartData);
                const isDarkGeo = document.documentElement.getAttribute('data-theme') === 'dark';
                var options = {
                    region: hasForeignVisitors ? 'world' : 'NO', // Zoom inn på Norge hvis kun Norge, ellers hele verden
                    displayMode: 'markers', // Vis byer som sirkler/markører
                    colorAxis: {colors: [isDarkGeo ? '#334155' : '#e2e8f0', '#d17d39']}, 
                    backgroundColor: isDarkGeo ? '#1e293b' : '#f8fafc',
                    datalessRegionColor: isDarkGeo ? '#0f172a' : '#f1f5f9',
                    defaultColor: isDarkGeo ? '#1e293b' : '#f8fafc',
                    legend: 'none',
                    tooltip: { textStyle: { fontName: 'Inter', fontSize: 13 } }
                };

                var chart = new google.visualization.GeoChart(containerEl);
                chart.draw(dataTable, options);

                window.activeGeoChart = chart;
                window.activeGeoChartDataTable = dataTable;
                window.activeGeoChartOptions = options;
                
                lastDrawnCitiesJSON = citiesJSON;
                lastWidth = containerEl.offsetWidth;
                lastHeight = containerEl.offsetHeight;

                if (!window.geoChartResizeListenerAdded) {
                    let resizeTimeout = null;
                    window.addEventListener('resize', function() {
                        const currentContainer = document.getElementById('regions_div');
                        if (!currentContainer) return;

                        const newWidth = currentContainer.offsetWidth;
                        const newHeight = currentContainer.offsetHeight;

                        // Bare tegn på nytt hvis bredde eller høyde faktisk har endret seg
                        if (newWidth !== lastWidth || newHeight !== lastHeight) {
                            lastWidth = newWidth;
                            lastHeight = newHeight;

                            clearTimeout(resizeTimeout);
                            resizeTimeout = setTimeout(() => {
                                if (window.activeGeoChart && window.activeGeoChartDataTable && window.activeGeoChartOptions) {
                                    if (newWidth > 0 && newHeight > 0) {
                                        window.activeGeoChart.draw(window.activeGeoChartDataTable, window.activeGeoChartOptions);
                                    }
                                }
                            }, 250); // Debounce på 250ms
                        }
                    });
                    window.geoChartResizeListenerAdded = true;
                }
            }
        });
    
