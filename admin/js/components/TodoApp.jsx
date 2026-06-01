import React, { useState, useEffect, useMemo } from 'react';

/**
 * TodoApp Component - HKM Studio Premium Task Manager Dashboard
 * Overhauled to closely match the official Google Tasks interface.
 * Adapted to Mandal Regnskapskontor's premium brand system.
 * Complies strictly with the 8px Grid Rule, Brand Aesthetics, and Chrome Jitter Fix.
 */
export default function TodoApp() {
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [googleConnected, setGoogleConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Accordion state for completed tasks
    const [showCompleted, setShowCompleted] = useState(false);

    // Inline quick-add state
    const [inlineTitle, setInlineTitle] = useState('');

    // Google Tasks config and modal states
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);

    // Form fields for full task addition
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPriority, setNewPriority] = useState('medium');
    const [newDueDate, setNewDueDate] = useState('');
    const [newAssignee, setNewAssignee] = useState('');

    // Filters matching Google Tasks Navigation
    const [filterSearch, setFilterSearch] = useState('');
    const [filterPriority, setFilterPriority] = useState('all'); // 'all', 'high'
    const [filterAssignee, setFilterAssignee] = useState('all'); // 'all', 'me', 'global', or specific UID

    // Form errors
    const [formError, setFormError] = useState('');

    useEffect(() => {
        const checkAuth = async () => {
            if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function' || firebase.apps.length === 0) {
                setTimeout(checkAuth, 100);
                return;
            }
            
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    setCurrentUser(user);
                    const db = firebase.firestore();

                    // Realtime tasks listener
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

                    // Check Google Tasks credentials state
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

    // Trigger silent sync in background on mutation
    const triggerSilentSync = () => {
        if (!currentUser || !googleConnected) return;
        const hostname = window.location.hostname;
        const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
        const functionsBase = isLocalDev 
            ? 'http://127.0.0.1:5001/his-kingdom-ministry/us-central1'
            : 'https://us-central1-his-kingdom-ministry.cloudfunctions.net';

        fetch(`${functionsBase}/syncGoogleTasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uid: currentUser.uid })
        }).catch(err => {
            console.warn("[TodoApp] Silent sync warning:", err);
        });
    };

    // Full Form task submission
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
                tildelt_til: newAssignee ? [newAssignee] : [],
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('tasks').add(payload);

            // Reset Form Fields
            setNewTitle('');
            setNewDesc('');
            setNewPriority('medium');
            setNewDueDate('');
            setNewAssignee('');
            setShowAddTaskModal(false);

            // Trigger background sync
            triggerSilentSync();
        } catch (err) {
            console.error('[TodoApp] Error adding task:', err);
            setFormError('Kunne ikke legge til oppgave: ' + err.message);
        }
    };

    // Intelligent Inline Quick-Add Submission
    const handleInlineQuickAdd = async (e) => {
        e.preventDefault();
        if (!inlineTitle.trim()) return;

        try {
            const db = firebase.firestore();
            const payload = {
                title: inlineTitle.trim(),
                description: '',
                priority: filterPriority === 'high' ? 'high' : 'medium',
                status: 'gjeldende',
                dueDate: '',
                opprettet_av: currentUser.uid,
                tildelt_til: filterAssignee === 'me' 
                    ? [currentUser.uid] 
                    : (filterAssignee !== 'all' && filterAssignee !== 'global' ? [filterAssignee] : []),
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('tasks').add(payload);
            setInlineTitle('');

            // Trigger silent background sync
            triggerSilentSync();
        } catch (err) {
            console.error('[TodoApp] Inline quick-add error:', err);
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

            // Trigger background sync
            triggerSilentSync();
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

            // Trigger background sync
            triggerSilentSync();
        } catch (err) {
            console.error('[TodoApp] Delete task error:', err);
        }
    };

    // Separate active tasks matching currently selected filters
    const activeTasks = useMemo(() => {
        if (!currentUser) return [];

        return tasks.filter(t => {
            if (t.status !== 'gjeldende') return false;

            // Search
            if (filterSearch) {
                const searchLower = filterSearch.toLowerCase();
                const titleMatch = (t.title || '').toLowerCase().includes(searchLower);
                const descMatch = (t.description || '').toLowerCase().includes(searchLower);
                if (!titleMatch && !descMatch) return false;
            }

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
            const prioWeight = { high: 3, medium: 2, low: 1 };
            const aPrio = prioWeight[a.priority] || 2;
            const bPrio = prioWeight[b.priority] || 2;
            if (bPrio !== aPrio) return bPrio - aPrio;
            
            const aDate = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
            const bDate = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
            return aDate - bDate;
        });
    }, [tasks, filterSearch, filterPriority, filterAssignee, currentUser]);

    // Separate completed tasks matching currently selected filters
    const completedTasks = useMemo(() => {
        if (!currentUser) return [];

        return tasks.filter(t => {
            if (t.status !== 'fullført') return false;

            // Search
            if (filterSearch) {
                const searchLower = filterSearch.toLowerCase();
                const titleMatch = (t.title || '').toLowerCase().includes(searchLower);
                const descMatch = (t.description || '').toLowerCase().includes(searchLower);
                if (!titleMatch && !descMatch) return false;
            }

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
            const aTime = a.completed_at ? a.completed_at.seconds || new Date(a.completed_at).getTime() : 0;
            const bTime = b.completed_at ? b.completed_at.seconds || new Date(b.completed_at).getTime() : 0;
            return bTime - aTime;
        });
    }, [tasks, filterSearch, filterPriority, filterAssignee, currentUser]);

    // Live counts for Sidebar indicators
    const counts = useMemo(() => {
        const result = {
            all: 0,
            me: 0,
            global: 0,
            starred: 0,
            userLists: {}
        };

        if (!currentUser) return result;

        tasks.forEach(t => {
            if (t.status !== 'gjeldende') return;

            result.all++;

            // Check if assigned to current user
            const assignees = Array.isArray(t.tildelt_til) ? t.tildelt_til : [t.tildelt_til].filter(Boolean);
            if (assignees.includes(currentUser.uid)) {
                result.me++;
            }

            // Check if global
            if (assignees.length === 0) {
                result.global++;
            }

            // Check if high priority (starred)
            if (t.priority === 'high') {
                result.starred++;
            }

            // Count per user lists
            assignees.forEach(uid => {
                result.userLists[uid] = (result.userLists[uid] || 0) + 1;
            });
        });

        return result;
    }, [tasks, currentUser]);

    // Helpers
    const getAssigneeName = (uid) => {
        const u = users.find(user => user.uid === uid);
        return u ? u.displayName : 'Ukjent bruker';
    };

    const activeViewTitle = useMemo(() => {
        if (filterAssignee === 'me') return 'Tildelt meg';
        if (filterAssignee === 'global') return 'Globale oppgaver';
        if (filterPriority === 'high') return 'Viktige oppgaver';
        if (filterAssignee !== 'all') {
            const user = users.find(u => u.uid === filterAssignee);
            return user ? `${user.displayName} sin liste` : 'Oppgaveliste';
        }
        return 'Alle gjøremål';
    }, [filterAssignee, filterPriority, users]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
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

    // Set Active State Highlights in Sidebar
    const isAllActive = filterAssignee === 'all' && filterPriority !== 'high';
    const isMeActive = filterAssignee === 'me';
    const isGlobalActive = filterAssignee === 'global';
    const isStarredActive = filterPriority === 'high' && filterAssignee === 'all';

    return (
        <div className="flex flex-col lg:flex-row gap-8 w-full items-start transform translate-z-0 backface-hidden">
            
            {/* Left Sidebar Navigation */}
            <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6">
                
                {/* floating brand-styled Add Button */}
                <button 
                    onClick={() => setShowAddTaskModal(true)} 
                    className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#d17d39] to-[#bd4f2a] hover:from-[#e28e4a] hover:to-[#ce5d37] hover:shadow-lg hover:shadow-orange-500/20 text-white font-bold transition-all duration-300 transform active:scale-[0.98] border-none text-sm cursor-pointer"
                >
                    <span className="material-symbols-outlined text-xl">add</span>
                    Ny oppgave
                </button>

                {/* Sidebar Navigation Options */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col gap-1">
                    <span className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Hurtigvalg</span>
                    
                    <button 
                        onClick={() => {
                            setFilterAssignee('all');
                            setFilterPriority('all');
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-semibold text-xs border-none cursor-pointer transition-all duration-300 text-left ${isAllActive ? 'bg-[#1B4965]/5 text-[#1B4965]' : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <span className={`material-symbols-outlined text-base ${isAllActive ? 'text-[#1B4965]' : 'text-slate-400'}`}>playlist_add_check</span>
                        <span className="flex-1 truncate">Alle gjøremål</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAllActive ? 'bg-[#1B4965]/10 text-[#1B4965]' : 'bg-slate-100 text-slate-500'}`}>{counts.all}</span>
                    </button>

                    <button 
                        onClick={() => {
                            setFilterAssignee('me');
                            setFilterPriority('all');
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-semibold text-xs border-none cursor-pointer transition-all duration-300 text-left ${isMeActive ? 'bg-[#1B4965]/5 text-[#1B4965]' : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <span className={`material-symbols-outlined text-base ${isMeActive ? 'text-[#1B4965]' : 'text-slate-400'}`}>account_circle</span>
                        <span className="flex-1 truncate">Tildelt meg</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isMeActive ? 'bg-[#1B4965]/10 text-[#1B4965]' : 'bg-slate-100 text-slate-500'}`}>{counts.me}</span>
                    </button>

                    <button 
                        onClick={() => {
                            setFilterAssignee('global');
                            setFilterPriority('all');
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-semibold text-xs border-none cursor-pointer transition-all duration-300 text-left ${isGlobalActive ? 'bg-[#1B4965]/5 text-[#1B4965]' : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <span className={`material-symbols-outlined text-base ${isGlobalActive ? 'text-[#1B4965]' : 'text-slate-400'}`}>group</span>
                        <span className="flex-1 truncate">Globale oppgaver</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isGlobalActive ? 'bg-[#1B4965]/10 text-[#1B4965]' : 'bg-slate-100 text-slate-500'}`}>{counts.global}</span>
                    </button>

                    <button 
                        onClick={() => {
                            setFilterAssignee('all');
                            setFilterPriority('high');
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-semibold text-xs border-none cursor-pointer transition-all duration-300 text-left ${isStarredActive ? 'bg-[#1B4965]/5 text-[#1B4965]' : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <span className={`material-symbols-outlined text-base ${isStarredActive ? 'text-[#1B4965]' : 'text-slate-400'}`}>star</span>
                        <span className="flex-1 truncate">Viktige oppgaver</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isStarredActive ? 'bg-[#1B4965]/10 text-[#1B4965]' : 'bg-slate-100 text-slate-500'}`}>{counts.starred}</span>
                    </button>

                    {/* Lists sub-header */}
                    <span className="px-3 py-2 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Lister</span>

                    {users.map(u => {
                        const isUserActive = filterAssignee === u.uid;
                        const userActiveCount = counts.userLists[u.uid] || 0;

                        return (
                            <button 
                                key={u.uid}
                                onClick={() => {
                                    setFilterAssignee(u.uid);
                                    setFilterPriority('all');
                                }}
                                className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-semibold text-xs border-none cursor-pointer transition-all duration-300 text-left ${isUserActive ? 'bg-[#1B4965]/5 text-[#1B4965]' : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <span className={`material-symbols-outlined text-base ${isUserActive ? 'text-[#1B4965]' : 'text-slate-400'}`}>assignment</span>
                                <span className="flex-1 truncate">{u.displayName}'s liste</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isUserActive ? 'bg-[#1B4965]/10 text-[#1B4965]' : 'bg-slate-100 text-slate-500'}`}>{userActiveCount}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right Main Content Panel */}
            <div className="flex-grow bg-white rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6 w-full">
                
                {/* Header view title and Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <h3 className="m-0 font-bold text-xl text-[#1B4965] tracking-tight">{activeViewTitle}</h3>
                        <p className="m-0 text-xs text-slate-400 font-semibold mt-1">
                            {activeTasks.length} {activeTasks.length === 1 ? 'gjøremål' : 'gjøremål'} gjenværende
                        </p>
                    </div>

                    {/* Integrated Search Box */}
                    <div className="relative w-full sm:w-64 todo-search-wrapper">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg select-none" style={{ zIndex: 2 }}>search</span>
                        <input 
                            type="text" 
                            value={filterSearch} 
                            onChange={e => setFilterSearch(e.target.value)} 
                            placeholder="Søk i oppgaver..." 
                            className="w-full pr-4 py-2 rounded-xl border border-slate-200 focus:border-[#d17d39] outline-none font-medium text-slate-700 text-xs box-sizing-border-box transition-colors duration-250 bg-slate-50/50 todo-search-input" 
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                </div>

                {/* Inline Quick-Add Task Box */}
                <form onSubmit={handleInlineQuickAdd} className="relative border border-slate-200/80 hover:border-slate-300 focus-within:border-[#d17d39] rounded-2xl px-5 py-3.5 transition-all duration-300 flex items-center gap-3 bg-slate-50/30">
                    <span className="material-symbols-outlined text-slate-400 select-none text-xl">playlist_add</span>
                    <input 
                        type="text" 
                        value={inlineTitle} 
                        onChange={e => setInlineTitle(e.target.value)} 
                        placeholder="Legg til et gjøremål..." 
                        className="w-full border-none outline-none bg-transparent font-semibold text-slate-700 text-sm placeholder-slate-400" 
                    />
                    {inlineTitle.trim() && (
                        <button 
                            type="submit" 
                            className="flex items-center justify-center w-7 h-7 rounded-full bg-[#1B4965] hover:bg-[#25638c] text-white cursor-pointer border-none scale-100 hover:scale-105 active:scale-95 transition-all duration-200 flex-shrink-0"
                            title="Lagre oppgave"
                        >
                            <span className="material-symbols-outlined text-sm font-bold">check</span>
                        </button>
                    )}
                </form>

                {/* Active Tasks List Area */}
                <div className="flex flex-col gap-3 min-h-[120px]">
                    {activeTasks.length === 0 ? (
                        
                        /* Premium empty state vector drawing illustration */
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center max-w-sm mx-auto">
                            <div className="w-36 h-36 mb-6 relative flex items-center justify-center bg-slate-50 rounded-full border border-slate-100">
                                <svg viewBox="0 0 120 120" className="w-24 h-24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="60" cy="60" r="50" fill="url(#circleGrad)" fillOpacity="0.06" />
                                    <circle cx="60" cy="60" r="50" stroke="url(#circleGrad)" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4" />
                                    <path d="M40 60L53 73L80 46" stroke="#d17d39" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M28 35C28 35 30 40 33 40C36 40 38 35 38 35C38 35 36 30 33 30C30 30 28 35 28 35Z" fill="#1B4965" fillOpacity="0.3" />
                                    <path d="M82 85C82 85 84 90 87 90C90 90 92 85 92 85C92 85 90 80 87 80C84 80 82 85 82 85Z" fill="#1B4965" fillOpacity="0.3" />
                                    <circle cx="95" cy="38" r="4" fill="#d17d39" fillOpacity="0.6" />
                                    <circle cx="25" cy="80" r="3" fill="#1B4965" fillOpacity="0.4" />
                                    <defs>
                                        <linearGradient id="circleGrad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#d17d39" />
                                            <stop offset="1" stopColor="#1B4965" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute top-4 right-6 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-[8px] text-white font-bold">check</span>
                                </div>
                                <div className="absolute bottom-6 left-6 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-[9px] text-white font-bold">star</span>
                                </div>
                            </div>
                            <h4 className="font-bold text-base text-slate-800 tracking-tight">Alle gjøremålene er fullført</h4>
                            <p className="text-xs text-slate-400 mt-2 font-medium">Bra jobbet! Alt på denne listen er unnagjort.</p>
                        </div>
                    ) : (
                        
                        /* Task cards list */
                        activeTasks.map(t => {
                            const prioLabel = { low: 'Lav prioritet', medium: 'Medium', high: 'Høy' }[t.priority] || 'Medium';
                            const prioStyles = {
                                high: 'bg-red-50 text-red-600',
                                medium: 'bg-orange-50 text-orange-600',
                                low: 'bg-green-50 text-green-600'
                            }[t.priority || 'medium'];

                            return (
                                <div 
                                    key={t.id} 
                                    className="flex gap-4 items-start bg-white border border-slate-100 hover:border-slate-200/80 rounded-2xl p-4 shadow-sm shadow-slate-100/10 hover:shadow-md hover:shadow-slate-100/40 transform hover:-translate-y-0.5 transition-all duration-300 group"
                                >
                                    {/* M3 styled circular Checkbox */}
                                    <div 
                                        onClick={() => handleToggleTask(t)} 
                                        className="w-5.5 h-5.5 rounded-full border-2 border-slate-300 hover:border-[#d17d39] hover:bg-[#d17d39]/5 flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5 transition-all duration-300 select-none bg-white"
                                        title="Fullfør oppgave"
                                    >
                                        <span className="material-symbols-outlined text-[12px] text-transparent group-hover:text-slate-300">check</span>
                                    </div>

                                    {/* Content columns */}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start gap-3">
                                            <h4 className="m-0 font-bold text-sm text-slate-800 leading-snug break-words">{t.title}</h4>
                                            
                                            {/* Slett oppgave icon */}
                                            <button 
                                                onClick={() => handleDeleteTask(t.id)} 
                                                className="border-none bg-transparent p-1 cursor-pointer text-slate-300 hover:text-red-500 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100" 
                                                title="Slett oppgave"
                                            >
                                                <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                        </div>

                                        {t.description && (
                                            <p className="m-0 text-xs text-slate-500 mt-1 leading-relaxed break-words font-medium">{t.description}</p>
                                        )}

                                        {/* Tags line */}
                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-xl flex items-center gap-1 ${prioStyles}`}>
                                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                                {prioLabel}
                                            </span>

                                            {t.dueDate && (
                                                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-xl flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                    Forfaller: {new Date(t.dueDate).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}

                                            {t.tildelt_til && t.tildelt_til.length > 0 ? (
                                                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-xl flex items-center gap-1" title={`Tildelt: ${getAssigneeName(t.tildelt_til[0])}`}>
                                                    <span className="material-symbols-outlined text-[12px]">account_circle</span>
                                                    {getAssigneeName(t.tildelt_til[0])}
                                                </span>
                                            ) : (
                                                <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-xl flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">group</span>
                                                    Global
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Collapsible Completed Tasks List */}
                {completedTasks.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-6">
                        <button 
                            type="button"
                            onClick={() => setShowCompleted(!showCompleted)} 
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs bg-slate-50 hover:bg-slate-100 border-none cursor-pointer px-4 py-2.5 rounded-xl transition-all duration-300 select-none outline-none transform active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg transform transition-transform duration-300" style={{ transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                expand_more
                            </span>
                            Fullført ({completedTasks.length})
                        </button>
                        
                        {showCompleted && (
                            <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                {completedTasks.map(t => (
                                    <div 
                                        key={t.id} 
                                        className="flex gap-4 items-start bg-slate-50/50 border border-slate-100 rounded-2xl p-4 opacity-60 group"
                                    >
                                        {/* checked status checkbox */}
                                        <div 
                                            onClick={() => handleToggleTask(t)} 
                                            className="w-5.5 h-5.5 rounded-full bg-[#1B4965] border-2 border-[#1B4965] flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5 transition-all duration-300 select-none shadow-sm shadow-[#1B4965]/10"
                                            title="Marker som ugjort"
                                        >
                                            <span className="material-symbols-outlined text-[11px] text-white font-bold">check</span>
                                        </div>

                                        {/* content */}
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-start gap-3">
                                                <h4 className="m-0 font-bold text-sm text-slate-400 line-through leading-snug break-words">{t.title}</h4>
                                                <button 
                                                    onClick={() => handleDeleteTask(t.id)} 
                                                    className="border-none bg-transparent p-1 cursor-pointer text-slate-300 hover:text-red-500 transition-colors duration-200 flex items-center justify-center group-hover:opacity-100" 
                                                    title="Slett oppgave"
                                                >
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>

                                            {t.description && (
                                                <p className="m-0 text-xs text-slate-400 line-through mt-1 leading-relaxed break-words font-medium">{t.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Popup Modal for adding a new task */}
            {showAddTaskModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop with elegant blur */}
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => {
                            setFormError('');
                            setShowAddTaskModal(false);
                        }}
                    />
                    
                    {/* Modal Content container */}
                    <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#d17d39] flex items-center justify-center">
                                    <span className="material-symbols-outlined">playlist_add</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#1B4965]">Ny oppgave</h3>
                                    <p className="text-xs text-slate-400 font-medium">Opprett en ny oppgave i listen din</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setFormError('');
                                    setShowAddTaskModal(false);
                                }} 
                                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all duration-200 border-none cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        {/* Form Body with scrollable content */}
                        <div className="p-8 overflow-y-auto flex-1">
                            {formError && (
                                <div className="bg-red-50 text-red-500 px-4 py-3 rounded-2xl text-xs font-semibold mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">error</span>
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleAddTask} className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 select-none">Tittel *</label>
                                    <input 
                                        type="text" 
                                        value={newTitle} 
                                        onChange={e => setNewTitle(e.target.value)} 
                                        placeholder="Hva må gjøres?" 
                                        required 
                                        className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] focus:ring-4 focus:ring-[#d17d39]/10 transition-all duration-300 outline-none font-medium text-slate-800 text-sm box-sizing-border-box" 
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 select-none">Beskrivelse</label>
                                    <textarea 
                                        value={newDesc} 
                                        onChange={e => setNewDesc(e.target.value)} 
                                        placeholder="Detaljer om oppgaven..." 
                                        rows={3} 
                                        className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] focus:ring-4 focus:ring-[#d17d39]/10 transition-all duration-300 outline-none font-medium text-slate-800 text-sm resize-none fontFamily-inherit box-sizing-border-box" 
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 select-none">Prioritet</label>
                                        <select 
                                            value={newPriority} 
                                            onChange={e => setNewPriority(e.target.value)} 
                                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] outline-none font-semibold text-slate-700 bg-white text-sm cursor-pointer transition-colors duration-250"
                                        >
                                            <option value="low">Lav</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">Høy</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 select-none">Forfallsdato</label>
                                        <input 
                                            type="date" 
                                            value={newDueDate} 
                                            onChange={e => setNewDueDate(e.target.value)} 
                                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] outline-none font-semibold text-slate-700 text-sm transition-colors duration-250" 
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 select-none">Tildel til (Valgfritt)</label>
                                    <select 
                                        value={newAssignee} 
                                        onChange={e => setNewAssignee(e.target.value)} 
                                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#d17d39] outline-none font-semibold text-slate-700 bg-white text-sm cursor-pointer transition-colors duration-250"
                                    >
                                        <option value="">Alle administratorer (Global)</option>
                                        {users.map(u => (
                                            <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setFormError('');
                                            setShowAddTaskModal(false);
                                        }}
                                        className="flex-1 px-6 py-4 rounded-full font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all duration-300 cursor-pointer border-none text-base"
                                    >
                                        Avbryt
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#d17d39] to-[#bd4f2a] hover:from-[#e28e4a] hover:to-[#ce5d37] hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 shadow-md shadow-orange-500/15 hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-300 cursor-pointer border-none text-base"
                                    >
                                        <span className="material-symbols-outlined text-lg">save</span>
                                        Lagre oppgave
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
