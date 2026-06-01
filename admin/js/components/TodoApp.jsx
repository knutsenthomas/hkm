import React, { useState, useEffect, useMemo } from 'react';

/**
 * TodoApp Component - HKM Studio Premium Task Manager Dashboard
 * Implemented inside Vite hybrid React environment.
 * Complies strictly with the 8px Grid Rule, Brand Aesthetics, and Chrome Jitter Fix.
 * Overhauled to a premium Material 3 design utilizing Tailwind CSS.
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
            if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function' || firebase.apps.length === 0) {
                setTimeout(checkAuth, 100);
                return;
            }
            
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
        return u ? u.displayName : 'Ukjent bruker';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-16">
                <div className="loader w-10 h-10 border-4 border-[#1B4965] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-slate-500 max-w-md mx-auto my-8">
                <span className="material-symbols-outlined text-4xl mb-3 text-slate-400">lock</span>
                <p className="font-semibold">Vennligst logg inn for å få tilgang til huskelisten.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-8 w-full transform translate-z-0 backface-hidden">
            
            {/* Upper control board with Google sync & statistics */}
            <div className="flex justify-between items-center flex-wrap gap-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm shadow-slate-100/50">
                <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl flex items-center justify-center transition-colors duration-300 ${googleConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        <span className="material-symbols-outlined text-3xl">sync_alt</span>
                    </div>
                    <div>
                        <h4 className="margin-0 text-base font-bold text-[#1B4965]">Google Tasks Synkronisering</h4>
                        <p className="margin-0 text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                            {googleConnected 
                                ? 'Status: Koblet til Google-kontoen din og synkroniserer automatisk.' 
                                : 'Status: Ikke tilkoblet. Koble til for å synkronisere oppgavene dine med Google.'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {googleConnected ? (
                        <>
                            <button onClick={handleManualSync} disabled={syncing} className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold border-2 border-slate-200 hover:border-[#1B4965] hover:text-[#1B4965] bg-white text-slate-600 text-sm transition-all duration-300 cursor-pointer disabled:opacity-50">
                                <span className={`material-symbols-outlined text-lg ${syncing ? 'animate-spin' : ''}`}>sync</span>
                                {syncing ? 'Synkroniserer...' : 'Synkroniser nå'}
                            </button>
                            <button onClick={handleGoogleTasksAuth} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors duration-200 border-none bg-none cursor-pointer px-2 py-1">
                                Koble fra
                            </button>
                        </>
                    ) : (
                        <button onClick={handleGoogleTasksAuth} className="flex items-center gap-2 px-6 py-3 rounded-full font-bold bg-gradient-to-r from-[#d17d39] to-[#bd4f2a] hover:from-[#e28e4a] hover:to-[#ce5d37] text-white text-sm hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 shadow-md shadow-orange-500/15 transition-all duration-300 cursor-pointer">
                            <span className="material-symbols-outlined text-lg">link</span>
                            Koble til Google Tasks
                        </button>
                    )}
                </div>
            </div>

            {/* Split layout: Form (Left/Top) & Tasks Board (Right/Bottom) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Form to create new task (Span 5 on large screens) */}
                <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm shadow-slate-100/50">
                    <h3 className="text-lg font-bold text-[#1B4965] border-b border-slate-100 pb-4 mb-6">Ny oppgave</h3>
                    
                    {formError && (
                        <div className="bg-red-50 text-red-500 px-4 py-3 rounded-2xl text-xs font-semibold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleAddTask} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Tittel *</label>
                            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Hva må gjøres?" required className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] focus:ring-4 focus:ring-[#d17d39]/10 transition-all duration-300 outline-none font-medium text-slate-800 text-sm box-sizing-border-box" />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Beskrivelse</label>
                            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Detaljer om oppgaven..." rows={3} className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] focus:ring-4 focus:ring-[#d17d39]/10 transition-all duration-300 outline-none font-medium text-slate-800 text-sm resize-none fontFamily-inherit box-sizing-border-box" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Prioritet</label>
                                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] outline-none font-semibold text-slate-700 bg-white text-sm cursor-pointer transition-colors duration-250">
                                    <option value="low">Lav</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">Høy</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Forfallsdato</label>
                                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] outline-none font-semibold text-slate-700 text-sm transition-colors duration-250" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Tildel til (Valgfritt)</label>
                            <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] outline-none font-semibold text-slate-700 bg-white text-sm cursor-pointer transition-colors duration-250">
                                <option value="">Alle administratorer (Global)</option>
                                {users.map(u => (
                                    <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="w-full flex items-center justify-center gap-2 mt-4 px-6 py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#1B4965] to-[#14354b] hover:from-[#25668d] hover:to-[#1b4965] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 shadow-md shadow-[#1B4965]/10 hover:shadow-lg hover:shadow-[#1B4965]/20 transition-all duration-300 cursor-pointer border-none text-base">
                            <span className="material-symbols-outlined text-lg">save</span>
                            Lagre oppgave
                        </button>
                    </form>
                </div>

                {/* Tasks board with interactive lists (Span 7 on large screens) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    
                    {/* Controls & Filter panel */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm shadow-slate-100/50 flex flex-col gap-5">
                        
                        {/* Search Bar */}
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                            <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Søk i oppgaver..." className="w-full pl-12 pr-6 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] focus:ring-4 focus:ring-[#d17d39]/10 transition-all duration-300 outline-none font-medium text-slate-800 text-sm box-sizing-border-box" />
                        </div>

                        {/* Filters Row */}
                        <div className="flex flex-wrap gap-4 items-center">
                            
                            {/* Status Filter buttons */}
                            <div className="flex bg-slate-100 rounded-2xl p-1 gap-1 border border-slate-200/20">
                                <button onClick={() => setFilterStatus('gjeldende')} className={`border-none px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all duration-300 ${filterStatus === 'gjeldende' ? 'bg-white text-[#1B4965] shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}>Gjeldende</button>
                                <button onClick={() => setFilterStatus('fullført')} className={`border-none px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all duration-300 ${filterStatus === 'fullført' ? 'bg-white text-[#1B4965] shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}>Fullførte</button>
                                <button onClick={() => setFilterStatus('all')} className={`border-none px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all duration-300 ${filterStatus === 'all' ? 'bg-white text-[#1B4965] shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'}`}>Alle</button>
                            </div>

                            {/* Priority select filter */}
                            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-4 py-2.5 rounded-2xl border-2 border-slate-200 bg-white font-bold text-xs text-slate-600 outline-none focus:border-[#d17d39] cursor-pointer transition-colors duration-200">
                                <option value="all">Alle prioriteter</option>
                                <option value="high">Høy prioritet</option>
                                <option value="medium">Medium prioritet</option>
                                <option value="low">Lav prioritet</option>
                            </select>

                            {/* Assignee select filter */}
                            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="px-4 py-2.5 rounded-2xl border-2 border-slate-200 bg-white font-bold text-xs text-slate-600 outline-none focus:border-[#d17d39] cursor-pointer transition-colors duration-200">
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
                    <div className="flex flex-col gap-4">
                        {filteredTasks.length === 0 ? (
                            <div className="bg-white rounded-3xl py-16 px-8 text-center border border-dashed border-slate-200/80 shadow-sm flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">playlist_add_check</span>
                                <p className="font-bold text-base text-slate-500">Ingen oppgaver matcher valgte filtre.</p>
                                <span className="text-xs text-slate-400 mt-2 font-medium">Opprett en ny oppgave til venstre eller juster filterinnstillingene.</span>
                            </div>
                        ) : (
                            filteredTasks.map(t => {
                                const isCompleted = t.status === 'fullført';
                                const prioLabel = { low: 'Lav prioritet', medium: 'Medium', high: 'Høy prioritet' }[t.priority] || 'Medium';
                                
                                // Priority styling configuration
                                const prioStyles = {
                                    high: 'bg-red-50 text-red-500',
                                    medium: 'bg-orange-50 text-orange-500',
                                    low: 'bg-green-50 text-green-500'
                                }[t.priority || 'medium'];

                                return (
                                    <div key={t.id} className={`flex gap-5 items-start bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm shadow-slate-100/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-100/80 hover:border-slate-200 active:scale-[0.99] transition-all duration-300 ${isCompleted ? 'opacity-60 bg-slate-50/50 shadow-none border-slate-100' : ''}`}>
                                        
                                        {/* Circular M3 Checkbox */}
                                        <div onClick={() => handleToggleTask(t)} className={`w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center cursor-pointer transition-all duration-300 select-none flex-shrink-0 mt-0.5 hover:border-[#d17d39] hover:bg-[#d17d39]/5 ${isCompleted ? 'bg-[#d17d39] border-[#d17d39]' : 'bg-white'}`}>
                                            {isCompleted && <span className="material-symbols-outlined text-[15px] text-white font-bold">check</span>}
                                        </div>

                                        {/* Card content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-4">
                                                <h4 className={`margin-0 font-bold text-base text-slate-800 leading-snug break-words ${isCompleted ? 'line-through text-slate-400' : ''}`}>{t.title}</h4>
                                                <button onClick={() => handleDeleteTask(t.id)} className="border-none bg-transparent p-1 cursor-pointer text-slate-300 hover:text-red-500 transition-colors duration-250 flex items-center justify-center" title="Slett oppgave">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>

                                            {t.description && (
                                                <p className="margin-0 text-sm text-slate-500 mt-2 leading-relaxed break-words font-medium">{t.description}</p>
                                            )}

                                            {/* Metadata tags */}
                                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${prioStyles}`}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                    {prioLabel}
                                                </span>

                                                {t.dueDate && (
                                                    <span className="bg-blue-50 text-blue-600 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                        Forfaller: {new Date(t.dueDate).toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}

                                                {t.tildelt_til && t.tildelt_til.length > 0 ? (
                                                    <span className="bg-indigo-50 text-indigo-600 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">account_circle</span>
                                                        Tildelt: {getAssigneeName(t.tildelt_til[0])}
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-50 text-slate-500 text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">group</span>
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
