import React, { useState, useEffect, useMemo } from 'react';

/**
 * TodoApp Component - HKM Studio Premium Task Manager
 * Implemented inside Vite hybrid React environment.
 * Complies strictly with the 8px Grid Rule, Brand Aesthetics, and Chrome Jitter Fix.
 */
export default function TodoApp() {
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [googleConnected, setGoogleConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form fields
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPriority, setNewPriority] = useState('medium');
    const [newDueDate, setNewDueDate] = useState('');
    const [newAssignee, setNewAssignee] = useState(''); // UID or empty for Global

    // Filters
    const [filterSearch, setFilterSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('gjeldende'); // 'gjeldende', 'fullført', 'all'
    const [filterPriority, setFilterPriority] = useState('all'); // 'all', 'high', 'medium', 'low'
    const [filterAssignee, setFilterAssignee] = useState('all'); // 'all', 'me', 'global', or specific UID

    // Form errors
    const [formError, setFormError] = useState('');

    useEffect(() => {
        // Wait for Firebase auth state
        const checkAuth = async () => {
            if (typeof firebase === 'undefined') return;
            
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    setCurrentUser(user);
                    
                    // Setup listeners
                    const db = firebase.firestore();

                    // Realtime tasks listener (Filtered in-memory for index-less resilience)
                    const unsubscribeTasks = db.collection('tasks').onSnapshot(snapshot => {
                        const taskList = [];
                        snapshot.forEach(doc => {
                            taskList.push({ id: doc.id, ...doc.data() });
                        });
                        setTasks(taskList);
                        setLoading(false);
                    }, error => {
                        console.error("[TodoApp] Firestore tasks error:", error);
                        setLoading(false);
                    });

                    // Fetch user directory for task delegation
                    db.collection('users').get().then(snapshot => {
                        const userList = [];
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.role === 'admin' || data.role === 'superadmin' || data.isAdmin) {
                                userList.push({ uid: doc.id, displayName: data.displayName || data.email || 'Admin User' });
                            }
                        });
                        setUsers(userList);
                    }).catch(err => {
                        console.warn("[TodoApp] Could not load users for delegation:", err);
                    });

                    // Check Google Tasks integration state
                    db.collection('user_google_credentials').doc(user.uid).onSnapshot(doc => {
                        if (doc.exists) {
                            const data = doc.data();
                            setGoogleConnected(!!data.tokens);
                        } else {
                            setGoogleConnected(false);
                        }
                    }, err => {
                        console.warn("[TodoApp] Google Credentials fetch ignored:", err);
                    });

                    return () => {
                        unsubscribeTasks();
                    };
                } else {
                    setCurrentUser(null);
                    setLoading(false);
                }
            });
        };

        checkAuth();
    }, []);

    // Sync to Google Tasks handler
    const handleGoogleTasksAuth = () => {
        if (!currentUser) return;
        
        // Redirect to cloud function trigger for OAuth2 flow
        // In local environments redirect to firebase emulator, in production to the Vercel hosted function
        const hostname = window.location.hostname;
        const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
        const functionsBase = isLocalDev 
            ? 'http://127.0.0.1:5001/his-kingdom-ministry/us-central1'
            : 'https://us-central1-his-kingdom-ministry.cloudfunctions.net';
            
        window.location.href = `${functionsBase}/googleTasksAuth?uid=${currentUser.uid}`;
    };

    // Manual sync execution
    const handleManualSync = async () => {
        if (!currentUser || syncing) return;
        setSyncing(true);
        try {
            const hostname = window.location.hostname;
            const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
            const functionsBase = isLocalDev 
                ? 'http://127.0.0.1:5001/his-kingdom-ministry/us-central1'
                : 'https://us-central1-his-kingdom-ministry.cloudfunctions.net';

            const response = await fetch(`${functionsBase}/syncGoogleTasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ uid: currentUser.uid })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Synkronisering feilet');
            }

            alert('Synkronisering med Google Tasks fullført!');
        } catch (err) {
            console.error('[TodoApp] Manual sync error:', err);
            alert('Kunne ikke synkronisere: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    // Form submission
    const handleAddTask = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!newTitle.trim()) {
            setFormError('Du må oppgi en tittel på oppgaven.');
            return;
        }

        try {
            const db = firebase.firestore();
            const payload = {
                title: newTitle.trim(),
                description: newDesc.trim(),
                priority: newPriority,
                status: 'gjeldende',
                dueDate: newDueDate,
                opprettet_av: currentUser.uid,
                tildelt_til: newAssignee ? [newAssignee] : [], // Empty array signifies "global" to all admins
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('tasks').add(payload);

            // Reset
            setNewTitle('');
            setNewDesc('');
            setNewPriority('medium');
            setNewDueDate('');
            setNewAssignee('');
        } catch (err) {
            console.error('[TodoApp] Error adding task:', err);
            setFormError('Kunne ikke legge til oppgave: ' + err.message);
        }
    };

    // Toggle single task completion
    const handleToggleTask = async (task) => {
        try {
            const db = firebase.firestore();
            const isCompleted = task.status === 'fullført';
            const newStatus = isCompleted ? 'gjeldende' : 'fullført';
            
            const updatePayload = {
                status: newStatus,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!isCompleted) {
                updatePayload.completed_at = firebase.firestore.FieldValue.serverTimestamp();
            } else {
                updatePayload.completed_at = null;
            }

            await db.collection('tasks').doc(task.id).update(updatePayload);
        } catch (err) {
            console.error('[TodoApp] Toggle status error:', err);
        }
    };

    // Delete task (change status to archived)
    const handleDeleteTask = async (taskId) => {
        if (!confirm('Er du sikker på at du vil slette denne oppgaven?')) return;
        try {
            const db = firebase.firestore();
            await db.collection('tasks').doc(taskId).update({
                status: 'arkivert',
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.error('[TodoApp] Delete task error:', err);
        }
    };

    // Filtered tasks computation
    const filteredTasks = useMemo(() => {
        if (!currentUser) return [];

        return tasks.filter(t => {
            // Archived are hidden completely from dashboard
            if (t.status === 'arkivert') return false;

            // Search
            if (filterSearch) {
                const searchLower = filterSearch.toLowerCase();
                const titleMatch = (t.title || '').toLowerCase().includes(searchLower);
                const descMatch = (t.description || '').toLowerCase().includes(searchLower);
                if (!titleMatch && !descMatch) return false;
            }

            // Status Filter
            if (filterStatus !== 'all' && t.status !== filterStatus) return false;

            // Priority Filter
            if (filterPriority !== 'all' && t.priority !== filterPriority) return false;

            // Assignee Filter
            if (filterAssignee !== 'all') {
                if (filterAssignee === 'me') {
                    const assignees = Array.isArray(t.tildelt_til) ? t.tildelt_til : [t.tildelt_til].filter(Boolean);
                    return assignees.includes(currentUser.uid);
                } else if (filterAssignee === 'global') {
                    return !t.tildelt_til || t.tildelt_til.length === 0;
                } else {
                    const assignees = Array.isArray(t.tildelt_til) ? t.tildelt_til : [t.tildelt_til].filter(Boolean);
                    return assignees.includes(filterAssignee);
                }
            }

            return true;
        }).sort((a, b) => {
            // Sort by priority (high > medium > low), then by duedate
            const prioWeight = { high: 3, medium: 2, low: 1 };
            const aPrio = prioWeight[a.priority] || 2;
            const bPrio = prioWeight[b.priority] || 2;
            if (bPrio !== aPrio) return bPrio - aPrio;
            
            const aDate = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
            const bDate = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
            return aDate - bDate;
        });
    }, [tasks, filterSearch, filterStatus, filterPriority, filterAssignee, currentUser]);

    // Helpers
    const getAssigneeName = (uid) => {
        const u = users.find(user => user.uid === uid);
        return u ? u.displayName : 'Ukjent';
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
                <div className="loader"></div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                Vennligst logg inn for å få tilgang til huskelisten.
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
            
            {/* Upper control board with Google sync & statistics */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid rgba(27, 73, 101, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: googleConnected ? '#e6f4ea' : '#f1f5f9', color: googleConnected ? '#137333' : '#5f6368', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>sync_alt</span>
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1B4965' }}>Google Tasks Synkronisering</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                            {googleConnected 
                                ? 'Status: Koblet til Google-kontoen din og synkroniserer.' 
                                : 'Status: Ikke tilkoblet. Klikk for å synkronisere oppgavene dine.'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {googleConnected ? (
                        <>
                            <button onClick={handleManualSync} disabled={syncing} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', border: '1.5px solid #cbd5e1', background: 'white', fontSize: '14px' }}>
                                <span className={`material-symbols-outlined ${syncing ? 'animate-spin' : ''}`} style={{ fontSize: '20px' }}>sync</span>
                                {syncing ? 'Synkroniserer...' : 'Synkroniser nå'}
                            </button>
                            <button onClick={handleGoogleTasksAuth} className="btn-text" style={{ fontSize: '13px', color: '#94a3b8', border: 'none', background: 'none', cursor: 'pointer' }}>
                                Koble fra
                            </button>
                        </>
                    ) : (
                        <button onClick={handleGoogleTasksAuth} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #d17d39, #bd4f2a)', color: 'white', fontSize: '14px', boxShadow: '0 4px 10px rgba(209, 125, 57, 0.2)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>link</span>
                            Koble til Google Tasks
                        </button>
                    )}
                </div>
            </div>

            {/* Split layout: Form (Left/Top) & Tasks Board (Right/Bottom) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px' }}>
                
                {/* Form to create new task */}
                <div className="card modern" style={{ height: 'fit-content', background: 'white', borderRadius: '20px', padding: '32px', border: '1px solid rgba(27, 73, 101, 0.08)', boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.04)' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#1B4965', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>Ny oppgave</h3>
                    
                    {formError && (
                        <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '500', marginBottom: '20px' }}>
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Tittel *</label>
                            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Hva må gjøres?" required style={{ display: 'block', width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Beskrivelse</label>
                            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Detaljer om oppgaven..." rows={3} style={{ display: 'block', width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'none' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Prioritet</label>
                                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', background: 'white' }}>
                                    <option value="low">Lav</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">Høy</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Forfallsdato</label>
                                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} style={{ padding: '11px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Tildel til (Valgfritt)</label>
                            <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', background: 'white' }}>
                                <option value="">Alle administratorer (Global)</option>
                                {users.map(u => (
                                    <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="btn-primary" style={{ marginTop: '8px', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #1B4965, #14354b)', color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer', transition: 'all 0.25s ease' }}>
                            Lagre oppgave
                        </button>
                    </form>
                </div>

                {/* Tasks board with interactive lists */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Controls & Filter panel */}
                    <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid rgba(27, 73, 101, 0.08)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Search Bar */}
                        <div style={{ position: 'relative' }}>
                            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '20px' }}>search</span>
                            <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Søk i oppgaver..." style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: '12px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                        </div>

                        {/* Filters Row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                            
                            {/* Status Filter buttons */}
                            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', gap: '4px' }}>
                                <button onClick={() => setFilterStatus('gjeldende')} style={{ border: 'none', background: filterStatus === 'gjeldende' ? 'white' : 'transparent', color: filterStatus === 'gjeldende' ? '#1B4965' : '#64748b', fontWeight: '600', fontSize: '13px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>Gjeldende</button>
                                <button onClick={() => setFilterStatus('fullført')} style={{ border: 'none', background: filterStatus === 'fullført' ? 'white' : 'transparent', color: filterStatus === 'fullført' ? '#1B4965' : '#64748b', fontWeight: '600', fontSize: '13px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>Fullførte</button>
                                <button onClick={() => setFilterStatus('all')} style={{ border: 'none', background: filterStatus === 'all' ? 'white' : 'transparent', color: filterStatus === 'all' ? '#1B4965' : '#64748b', fontWeight: '600', fontSize: '13px', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>Alle</button>
                            </div>

                            {/* Priority select filter */}
                            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#475569', background: 'white' }}>
                                <option value="all">Alle prioriteter</option>
                                <option value="high">Høy prioritet</option>
                                <option value="medium">Medium prioritet</option>
                                <option value="low">Lav prioritet</option>
                            </select>

                            {/* Assignee select filter */}
                            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#475569', background: 'white' }}>
                                <option value="all">Alle tildelinger</option>
                                <option value="me">Tildelt meg</option>
                                <option value="global">Globale oppgaver</option>
                                {users.map(u => (
                                    <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                ))}
                            </select>

                        </div>
                    </div>

                    {/* Task Grid items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {filteredTasks.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: '20px', padding: '64px 32px', textAlign: 'center', border: '1px solid rgba(27, 73, 101, 0.08)', color: '#94a3b8' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '12px', display: 'block' }}>playlist_add_check</span>
                                <p style={{ margin: 0, fontWeight: '500', fontSize: '15px' }}>Ingen oppgaver matcher valgte filtre.</p>
                            </div>
                        ) : (
                            filteredTasks.map(t => {
                                const isCompleted = t.status === 'fullført';
                                const prioLabel = { low: 'Lav', medium: 'Med', high: 'Høy' }[t.priority] || 'Medium';
                                const prioClass = `todo-drawer-badge priority-${t.priority || 'medium'}`;

                                return (
                                    <div key={t.id} className="todo-drawer-item" style={{ background: 'white', border: '1px solid rgba(27, 73, 101, 0.06)', borderRadius: '16px', padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start', boxShadow: '0 4px 15px -4px rgba(15, 23, 42, 0.03)', opacity: isCompleted ? 0.65 : 1 }}>
                                        {/* Checked checkbox */}
                                        <div onClick={() => handleToggleTask(t)} className={`todo-drawer-checkbox ${isCompleted ? 'checked' : ''}`} style={{ marginTop: '2px', border: '2px solid rgba(27, 73, 101, 0.3)', width: '22px', height: '22px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                                            {isCompleted && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white', fontWeight: 'bold' }}>check</span>}
                                        </div>

                                        {/* Card content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b', textDecoration: isCompleted ? 'line-through' : 'none', wordBreak: 'break-word', lineHeight: 1.4 }}>{t.title}</h4>
                                                <button onClick={() => handleDeleteTask(t.id)} style={{ border: 'none', background: 'none', padding: '4px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }} title="Slett oppgave">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                                </button>
                                            </div>

                                            {t.description && (
                                                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5, wordBreak: 'break-word' }}>{t.description}</p>
                                            )}

                                            {/* Metadata tags */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                                                <span className={prioClass} style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px' }}>
                                                    {prioLabel}
                                                </span>

                                                {t.dueDate && (
                                                    <span className="todo-drawer-badge due-date" style={{ fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_today</span>
                                                        Forfaller: {new Date(t.dueDate).toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}

                                                {t.tildelt_til && t.tildelt_til.length > 0 ? (
                                                    <span className="todo-drawer-badge" style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>account_circle</span>
                                                        Tildelt: {getAssigneeName(t.tildelt_til[0])}
                                                    </span>
                                                ) : (
                                                    <span className="todo-drawer-badge" style={{ background: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>group</span>
                                                        Global oppgave
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}
