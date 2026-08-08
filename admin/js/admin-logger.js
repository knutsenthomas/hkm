
        document.addEventListener('DOMContentLoaded', async () => {
            const logsBody = document.getElementById('logs-body');
            const logCount = document.getElementById('log-count');

            let logSortField = 'timestamp';
            let logSortDir = 'desc';

            // Fetch logs from Firestore
            let logs = [];

            const fetchLogs = async () => {
                try {
                    if (typeof firebase === 'undefined') {
                        throw new Error('Firebase not loaded');
                    }
                    
                    const snapshot = await firebase.firestore()
                        .collection('system_logs')
                        .orderBy('timestamp', 'desc')
                        .limit(100)
                        .get();
                    
                    logs = snapshot.docs.map(doc => {
                        const data = doc.data();
                        
                        let level = data.level || (data.severity ? data.severity.toLowerCase() : 'info');
                        if (level === 'warning') level = 'warn';
                        if (level === 'critical') level = 'error';
                        
                        let source = data.source || 'Nettside';
                        
                        return {
                            ...data,
                            level,
                            source,
                            // Convert Firestore timestamp to ISO string if it exists
                            timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
                        };
                    });
                } catch (e) {
                    console.error('Firestore fetch failed:', e);
                    // Minimal fallback
                    logs = [{
                        timestamp: new Date().toISOString(),
                        level: 'error',
                        message: 'Kunne ikke hente logg fra databasen: ' + e.message,
                        source: 'System'
                    }];
                }
            };

            const renderLogs = (filter = 'all') => {
                let filtered = logs.filter(log => filter === 'all' || log.level === filter);

                if (logSortField) {
                    filtered.sort((a, b) => {
                        let comp = 0;
                        if (logSortField === 'timestamp') {
                            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                            comp = timeA - timeB;
                        } else if (logSortField === 'level') {
                            comp = (a.level || '').localeCompare(b.level || '', 'no');
                        } else if (logSortField === 'message') {
                            comp = (a.message || '').localeCompare(b.message || '', 'no');
                        } else if (logSortField === 'source') {
                            comp = (a.source || '').localeCompare(b.source || '', 'no');
                        }
                        return logSortDir === 'desc' ? -comp : comp;
                    });
                }

                logCount.textContent = filtered.length;

                if (filtered.length === 0) {
                    logsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px; color:#64748b;">Ingen logger funnet i databasen.</td></tr>`;
                    return;
                }

                logsBody.innerHTML = filtered.map(log => `
                    <tr>
                        <td class="log-time">${new Date(log.timestamp).toLocaleString('no-NO')}</td>
                        <td><span class="log-level ${log.level}">${log.level}</span></td>
                        <td class="log-msg">${log.message}</td>
                        <td style="font-size: 13px; color: #64748b;">${log.source}</td>
                    </tr>
                `).join('');

                // Update Sorting UI indicators and event listeners on the headers
                const table = logsBody.closest('table');
                if (table) {
                    const headers = table.querySelectorAll('thead th');
                    const fields = ['timestamp', 'level', 'message', 'source'];
                    headers.forEach((header, index) => {
                        const field = fields[index];
                        if (field) {
                            header.style.cursor = 'pointer';
                            header.style.userSelect = 'none';
                            header.style.position = 'relative';

                            if (!header.dataset.sortBound) {
                                header.dataset.sortBound = 'true';
                                header.addEventListener('mouseover', () => {
                                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                    header.style.backgroundColor = isDark ? '#334155' : '#e2e8f0';
                                    header.style.color = isDark ? '#f8fafc' : '#1b4965';
                                });
                                header.addEventListener('mouseout', () => {
                                    header.style.backgroundColor = '';
                                    header.style.color = '';
                                });
                                header.addEventListener('click', () => {
                                    if (logSortField === field) {
                                        logSortDir = logSortDir === 'asc' ? 'desc' : 'asc';
                                    } else {
                                        logSortField = field;
                                        logSortDir = (field === 'timestamp') ? 'desc' : 'asc';
                                    }
                                    const currentFilter = document.querySelector('.log-filter-btn.active')?.dataset.filter || 'all';
                                    renderLogs(currentFilter);
                                });
                            }

                            // Add/update sort indicator
                            let wrapper = header.querySelector('.sort-header-wrapper');
                            if (!wrapper) {
                                wrapper = document.createElement('div');
                                wrapper.className = 'sort-header-wrapper';
                                wrapper.style.display = 'inline-flex';
                                wrapper.style.alignItems = 'center';
                                wrapper.style.gap = '6px';
                                wrapper.style.verticalAlign = 'middle';
                                if (header.style.textAlign === 'right' || header.classList.contains('text-right')) {
                                    wrapper.style.width = '100%';
                                    wrapper.style.justifyContent = 'flex-end';
                                }
                                while (header.firstChild) {
                                    wrapper.appendChild(header.firstChild);
                                }
                                header.appendChild(wrapper);
                            }

                            let icon = wrapper.querySelector('.sort-icon');
                            if (!icon) {
                                icon = document.createElement('span');
                                icon.className = 'material-symbols-outlined sort-icon';
                                icon.style.fontSize = '14px';
                                icon.style.lineHeight = '1';
                                icon.style.flexShrink = '0';
                                icon.style.display = 'inline-flex';
                                icon.style.alignItems = 'center';
                                icon.style.position = 'relative';
                                icon.style.top = '-1px';
                                wrapper.appendChild(icon);
                            }

                            if (field === logSortField) {
                                icon.style.display = 'inline-flex';
                                icon.textContent = logSortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
                                icon.style.color = '#d17d39';
                            } else {
                                icon.style.display = 'none';
                            }
                        }
                    });
                }
            };

            // Initial load
            await fetchLogs();
            renderLogs();

            // Filter Click Handlers
            document.querySelectorAll('.log-filter-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Refresh logs on filter change to get latest
                    await fetchLogs();
                    renderLogs(e.target.dataset.filter);
                });
            });
        });
    
