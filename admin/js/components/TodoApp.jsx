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
    const [showCompleted, setShowCompleted] = useState(true);

    // Sidebar view mode: 'active' or 'completed'
    const [viewMode, setViewMode] = useState('active');

    // Inline quick-add states
    const [inlineTitle, setInlineTitle] = useState('');
    const [inlineDesc, setInlineDesc] = useState('');
    const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);
    const [inlinePriority, setInlinePriority] = useState('medium');
    const [inlineDueDate, setInlineDueDate] = useState('');
    const [inlineAssignee, setInlineAssignee] = useState('');

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

    // Sync inline quick-add default fields with active filters
    useEffect(() => {
        if (!currentUser) return;
        setInlinePriority(filterPriority === 'high' ? 'high' : 'medium');
        setInlineAssignee(
            filterAssignee === 'me' 
                ? currentUser.uid 
                : (filterAssignee !== 'all' && filterAssignee !== 'global' ? filterAssignee : '')
        );
    }, [filterPriority, filterAssignee, currentUser]);

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
                description: inlineDesc.trim(),
                priority: inlinePriority,
                status: 'gjeldende',
                dueDate: inlineDueDate,
                opprettet_av: currentUser.uid,
                tildelt_til: inlineAssignee ? [inlineAssignee] : [],
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('tasks').add(payload);
            
            // Reset and collapse
            setInlineTitle('');
            setInlineDesc('');
            setInlineDueDate('');
            setIsQuickAddExpanded(false);

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
            completed: 0,
            userLists: {}
        };

        if (!currentUser) return result;

        tasks.forEach(t => {
            if (t.status === 'fullført') {
                result.completed++;
                return;
            }
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
        if (viewMode === 'completed') return 'Fullførte oppgaver';
        if (filterAssignee === 'me') return 'Tildelt meg';
        if (filterAssignee === 'global') return 'Globale oppgaver';
        if (filterPriority === 'high') return 'Viktige oppgaver';
        if (filterAssignee !== 'all') {
            const user = users.find(u => u.uid === filterAssignee);
            return user ? `${user.displayName} sin liste` : 'Oppgaveliste';
        }
        return 'Alle gjøremål';
    }, [filterAssignee, filterPriority, users, viewMode]);

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
    const isAllActive = filterAssignee === 'all' && filterPriority !== 'high' && viewMode === 'active';
    const isMeActive = filterAssignee === 'me' && viewMode === 'active';
    const isGlobalActive = filterAssignee === 'global' && viewMode === 'active';
    const isStarredActive = filterPriority === 'high' && filterAssignee === 'all' && viewMode === 'active';
    const isCompletedViewActive = viewMode === 'completed';

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
                            setViewMode('active');
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
                            setViewMode('active');
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
                            setViewMode('active');
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
                            setViewMode('active');
                            setFilterAssignee('all');
                            setFilterPriority('high');
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-semibold text-xs border-none cursor-pointer transition-all duration-300 text-left ${isStarredActive ? 'bg-[#1B4965]/5 text-[#1B4965]' : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <span className={`material-symbols-outlined text-base ${isStarredActive ? 'text-[#1B4965]' : 'text-slate-400'}`}>star</span>
                        <span className="flex-1 truncate">Viktige oppgaver</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isStarredActive ? 'bg-[#1B4965]/10 text-[#1B4965]' : 'bg-slate-100 text-slate-500'}`}>{counts.starred}</span>
                    </button>

                    <button 
                        onClick={() => {
                            setViewMode('completed');
                            setFilterAssignee('all');
                            setFilterPriority('all');
                        }}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl font-semibold text-xs border-none cursor-pointer transition-all duration-300 text-left ${isCompletedViewActive ? 'bg-[#1B4965]/5 text-[#1B4965]' : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <span className={`material-symbols-outlined text-base ${isCompletedViewActive ? 'text-[#1B4965]' : 'text-slate-400'}`}>task_alt</span>
                        <span className="flex-1 truncate">Fullførte oppgaver</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCompletedViewActive ? 'bg-[#1B4965]/10 text-[#1B4965]' : 'bg-slate-100 text-slate-500'}`}>{counts.completed}</span>
                    </button>

                    {/* Lists sub-header */}
                    <span className="px-3 py-2 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Lister</span>

                    {users.map(u => {
                        const isUserActive = filterAssignee === u.uid && viewMode === 'active';
                        const userActiveCount = counts.userLists[u.uid] || 0;

                        return (
                            <button 
                                key={u.uid}
                                onClick={() => {
                                    setViewMode('active');
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
            <div className="flex-grow bg-[#f8fafc]/50 rounded-3xl p-6 lg:p-8 border border-slate-200/80 shadow-sm flex flex-col gap-6 w-full">
                
                {/* Style tag for butter-smooth CSS animations */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes taskAppear {
                        from { opacity: 0; transform: translateY(12px) scale(0.98); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .animate-task-appear {
                        animation: taskAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .hkm-checkbox-round {
                        width: 20px !important;
                        height: 20px !important;
                        min-width: 20px !important;
                        min-height: 20px !important;
                        max-width: 20px !important;
                        max-height: 20px !important;
                        border-radius: 9999px !important;
                        aspect-ratio: 1 / 1 !important;
                        overflow: hidden !important;
                    }
                    .hkm-checkbox-completed .hkm-close-icon {
                        display: none !important;
                    }
                    .hkm-checkbox-completed .hkm-check-icon {
                        display: block !important;
                    }
                    .hkm-checkbox-completed:hover .hkm-close-icon {
                        display: block !important;
                    }
                    .hkm-checkbox-completed:hover .hkm-check-icon {
                        display: none !important;
                    }
                `}} />

                {/* Header view title and Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                    <div className="flex-shrink-0">
                        <div className="flex items-center gap-3 flex-nowrap">
                            <h3 className="m-0 font-bold text-2xl text-[#1B4965] tracking-tight whitespace-nowrap">{activeViewTitle}</h3>
                            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#1B4965]/10 text-[#1B4965] shadow-sm whitespace-nowrap flex-shrink-0">
                                {viewMode === 'completed' 
                                    ? `${completedTasks.length} ${completedTasks.length === 1 ? 'fullført' : 'fullførte'}` 
                                    : `${activeTasks.length} ${activeTasks.length === 1 ? 'oppgave' : 'oppgaver'}`
                                }
                            </span>
                        </div>
                        <p className="m-0 text-xs text-slate-400 font-medium mt-2">Administrer og deleger oppgavene dine effektivt.</p>
                    </div>

                    {/* Integrated Search Box */}
                    <div className="relative w-full sm:w-72 todo-search-wrapper">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg select-none" style={{ zIndex: 2 }}>search</span>
                        <input 
                            type="text" 
                            value={filterSearch} 
                            onChange={e => setFilterSearch(e.target.value)} 
                            placeholder="Søk i oppgaver..." 
                            className="w-full pr-4 py-2.5 rounded-2xl border border-slate-200 focus:border-[#d17d39] focus:ring-4 focus:ring-[#d17d39]/10 outline-none font-semibold text-slate-700 text-xs box-sizing-border-box transition-all duration-250 bg-white shadow-sm todo-search-input" 
                            style={{ paddingLeft: '48px' }}
                        />
                    </div>
                </div>

                {viewMode === 'completed' ? (
                    /* Completed Tasks View (Primary display) */
                    <div className="flex flex-col gap-4">
                        {completedTasks.length === 0 ? (
                            /* Premium completed empty state vector illustration */
                            <div className="bg-white rounded-3xl border border-slate-200/60 p-16 text-center w-full shadow-sm flex flex-col items-center justify-center">
                                <div className="w-28 h-28 mb-6 relative flex items-center justify-center bg-slate-50 rounded-full border border-slate-100">
                                    <svg viewBox="0 0 120 120" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="60" cy="60" r="50" fill="url(#completedEmptyGrad)" fillOpacity="0.06" />
                                        <circle cx="60" cy="60" r="50" stroke="url(#completedEmptyGrad)" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4" />
                                        <path d="M40 60L53 73L80 46" stroke="#d17d39" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                                        <path d="M48 68 L60 56 L72 68 M60 56 L60 80" stroke="#1B4965" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="95" cy="38" r="4" fill="#d17d39" fillOpacity="0.6" />
                                        <circle cx="25" cy="80" r="3" fill="#1B4965" fillOpacity="0.4" />
                                        <defs>
                                            <linearGradient id="completedEmptyGrad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
                                                <stop stopColor="#d17d39" />
                                                <stop offset="1" stopColor="#1B4965" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                                <h4 className="font-bold text-base text-slate-800 tracking-tight">Ingen fullførte gjøremål</h4>
                                <p className="text-xs text-slate-400 mt-2 font-medium max-w-[280px] leading-relaxed">Du har ikke fullført noen oppgaver i denne listen ennå. Start med å fullføre en oppgave!</p>
                            </div>
                        ) : (
                            /* Completed Task Row Cards (Primary Style) */
                            completedTasks.map(t => {
                                const assigneeName = t.tildelt_til && t.tildelt_til.length > 0 ? getAssigneeName(t.tildelt_til[0]) : '';
                                const getInitials = (name) => {
                                    if (!name) return '';
                                    const parts = name.split(' ');
                                    if (parts.length >= 2) {
                                        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                                    }
                                    return name.substring(0, 2).toUpperCase();
                                };
                                const initials = getInitials(assigneeName);
                                const completedDateStr = t.completed_at 
                                    ? new Date(t.completed_at.seconds ? t.completed_at.seconds * 1000 : t.completed_at).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' }) 
                                    : null;

                                return (
                                    <div 
                                        key={t.id} 
                                        className="flex gap-4 items-start bg-white border border-slate-100 hover:border-emerald-200/80 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 group w-full relative animate-task-appear"
                                    >
                                        {/* Checked status checkbox */}
                                        <div 
                                            onClick={() => handleToggleTask(t)} 
                                            className="hkm-checkbox-completed hkm-checkbox-round w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5 transition-all duration-300 select-none shadow-sm shadow-emerald-500/10 hover:scale-105"
                                            title="Marker som ugjort"
                                        >
                                            <span className="material-symbols-outlined text-[10px] text-white font-bold select-none hkm-check-icon">check</span>
                                            <span className="material-symbols-outlined text-[10px] text-white font-bold select-none hkm-close-icon">close</span>
                                        </div>

                                        {/* Content body */}
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-start gap-3">
                                                <h4 className="m-0 font-bold text-xs text-slate-400 line-through leading-snug break-words">{t.title}</h4>
                                                
                                                {/* Slett oppgave icon */}
                                                <button 
                                                    onClick={() => handleDeleteTask(t.id)} 
                                                    className="border-none bg-transparent p-1 cursor-pointer text-slate-300 hover:text-red-500 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 flex-shrink-0" 
                                                    title="Slett oppgave"
                                                >
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>

                                            {t.description && (
                                                <p className="m-0 text-[11px] text-slate-400 line-through mt-2 leading-relaxed break-words font-medium">{t.description}</p>
                                            )}

                                            {/* Minimal SaaS Tags line */}
                                            <div className="flex flex-wrap items-center gap-2.5 mt-3.5 text-[10px] font-bold text-slate-400">
                                                
                                                {/* Priority badge */}
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-50 text-slate-500 border-slate-200/60">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        t.priority === 'high' ? 'bg-red-400/60' : t.priority === 'medium' ? 'bg-orange-400/60' : 'bg-green-400/60'
                                                    }`}></span>
                                                    {{ low: 'Lav', medium: 'Medium', high: 'Høy' }[t.priority || 'medium']} prioritet
                                                </span>

                                                {/* Completed date badge */}
                                                {completedDateStr && (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-emerald-500/[0.04] text-emerald-700 border-emerald-500/10">
                                                        <span className="material-symbols-outlined text-[13px]">done_all</span>
                                                        <span>Fullført: {completedDateStr}</span>
                                                    </span>
                                                )}

                                                {/* Assignee badge */}
                                                {t.tildelt_til && t.tildelt_til.length > 0 ? (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200/60" title={`Tildelt: ${assigneeName}`}>
                                                        <span className="w-4.5 h-4.5 rounded-full bg-slate-400 text-white font-bold text-[8px] flex items-center justify-center select-none shadow-sm">
                                                            {initials}
                                                        </span>
                                                        <span>{assigneeName}</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-50 text-slate-500 border-slate-200/60">
                                                        <span className="material-symbols-outlined text-[13px]">group</span>
                                                        <span>Felles</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    /* Active Tasks View */
                    <>
                        {/* Premium Standalone Inline Quick-Add Card */}
                        <form 
                            onSubmit={handleInlineQuickAdd} 
                            className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col shadow-sm ${
                                isQuickAddExpanded 
                                    ? 'p-6 ring-2 ring-[#d17d39]/15 border-[#d17d39]/40 gap-4' 
                                    : 'py-3 px-4 hover:border-slate-300/80 hover:shadow-md cursor-pointer'
                            }`}
                            onClick={() => {
                                if (!isQuickAddExpanded) setIsQuickAddExpanded(true);
                            }}
                        >
                            <div className="flex items-center gap-3.5">
                                <span className="material-symbols-outlined text-slate-400 select-none text-xl">playlist_add</span>
                                <input 
                                    type="text" 
                                    value={inlineTitle} 
                                    onChange={e => setInlineTitle(e.target.value)} 
                                    placeholder="Legg til et nytt gjøremål her..." 
                                    className="w-full border-none outline-none bg-transparent font-bold text-slate-700 text-xs placeholder-slate-400" 
                                />
                                {!isQuickAddExpanded && inlineTitle.trim() && (
                                    <button 
                                        type="submit" 
                                        className="flex items-center justify-center w-7 h-7 rounded-full bg-[#1B4965] hover:bg-[#25638c] text-white cursor-pointer border-none scale-100 hover:scale-105 active:scale-95 transition-all duration-200 flex-shrink-0"
                                        title="Lagre oppgave"
                                    >
                                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                                    </button>
                                )}
                            </div>

                            {isQuickAddExpanded && (
                                <div className="flex flex-col gap-4 mt-2 border-t border-slate-100 pt-4 animate-in fade-in duration-200">
                                    {/* Optional Description Input */}
                                    <textarea 
                                        value={inlineDesc}
                                        onChange={e => setInlineDesc(e.target.value)}
                                        placeholder="Legg til en beskrivelse (valgfritt)..."
                                        rows={2}
                                        className="w-full border-none outline-none text-xs text-slate-600 placeholder-slate-400 bg-transparent resize-none leading-relaxed"
                                    />

                                    {/* Metadata Selectors & Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 mt-2 w-full">
                                        {/* Priority dropdown */}
                                        <div className="relative flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer select-none">
                                            <span className={`w-2 h-2 rounded-full ${
                                                inlinePriority === 'high' ? 'bg-red-500' : inlinePriority === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                                            }`}></span>
                                            <span>{inlinePriority === 'high' ? 'Høy prioritet' : inlinePriority === 'medium' ? 'Medium prioritet' : 'Lav prioritet'}</span>
                                            <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
                                            <select 
                                                value={inlinePriority} 
                                                onChange={e => setInlinePriority(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            >
                                                <option value="low">Lav prioritet</option>
                                                <option value="medium">Medium prioritet</option>
                                                <option value="high">Høy prioritet</option>
                                            </select>
                                        </div>

                                        {/* Due Date selector */}
                                        <div className="relative flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer select-none">
                                            <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_today</span>
                                            <span>
                                                {inlineDueDate 
                                                    ? new Date(inlineDueDate).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' }) 
                                                    : 'Sett forfallsdato'}
                                            </span>
                                            <input 
                                                type="date" 
                                                value={inlineDueDate} 
                                                onChange={e => setInlineDueDate(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                            />
                                            {inlineDueDate && (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setInlineDueDate(''); }}
                                                    className="p-0 border-none bg-transparent hover:text-red-500 text-slate-400 flex items-center justify-center cursor-pointer ml-1"
                                                    title="Fjern dato"
                                                >
                                                    <span className="material-symbols-outlined text-[13px]">close</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Assignee selector */}
                                        <div className="relative flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer select-none">
                                            <span className="material-symbols-outlined text-[15px] text-slate-400">account_circle</span>
                                            <span className="max-w-[120px] truncate">
                                                {inlineAssignee ? getAssigneeName(inlineAssignee) : 'Deleger (Felles)'}
                                            </span>
                                            <span className="material-symbols-outlined text-[14px] text-slate-400">expand_more</span>
                                            <select 
                                                value={inlineAssignee} 
                                                onChange={e => setInlineAssignee(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            >
                                                <option value="">Felles (Ingen)</option>
                                                {users.map(u => (
                                                    <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="ml-auto flex items-center gap-2">
                                            <button 
                                                type="button" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setInlineTitle('');
                                                    setInlineDesc('');
                                                    setInlineDueDate('');
                                                    setIsQuickAddExpanded(false);
                                                }}
                                                className="px-4 py-2 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 active:scale-[0.97] transition-all duration-200 border-none cursor-pointer text-xs"
                                            >
                                                Avbryt
                                            </button>
                                            <button 
                                                type="submit" 
                                                disabled={!inlineTitle.trim()}
                                                onClick={(e) => e.stopPropagation()}
                                                className="px-4 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-[#d17d39] to-[#bd4f2a] hover:from-[#e28e4a] hover:to-[#ce5d37] hover:shadow-md hover:shadow-orange-500/10 active:scale-[0.97] transition-all duration-200 border-none cursor-pointer text-xs disabled:opacity-80 disabled:cursor-not-allowed"
                                            >
                                                Lagre
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Active Tasks List Area */}
                        <div className="flex flex-col gap-4">
                            {activeTasks.length === 0 ? (
                                /* Premium empty state vector drawing illustration */
                                <div className="bg-white rounded-3xl border border-slate-200/60 p-16 text-center w-full shadow-sm flex flex-col items-center justify-center">
                                    <div className="w-28 h-28 mb-6 relative flex items-center justify-center bg-slate-50 rounded-full border border-slate-100">
                                        <svg viewBox="0 0 120 120" className="w-16 h-16" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                                        <div className="absolute top-2 right-4 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-[9px] text-white font-bold">check</span>
                                        </div>
                                        <div className="absolute bottom-4 left-4 w-4.5 h-4.5 bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-[10px] text-white font-bold">star</span>
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-base text-slate-800 tracking-tight">Alle gjøremålene er fullført</h4>
                                    <p className="text-xs text-slate-400 mt-2 font-medium max-w-[280px] leading-relaxed">Fantastisk jobb! Det er ingenting utestående på denne oppgavelisten.</p>
                                </div>
                            ) : (
                                /* Task Row Cards */
                                activeTasks.map(t => {
                                    const prioLabel = { low: 'Lav', medium: 'Medium', high: 'Høy' }[t.priority] || 'Medium';
                                    const prioDotColor = {
                                        high: 'bg-red-500',
                                        medium: 'bg-orange-500',
                                        low: 'bg-green-500'
                                    }[t.priority || 'medium'];

                                    // Check if task is overdue
                                    const isOverdue = t.dueDate ? new Date(t.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) : false;

                                    // Calculate initials for tildelt user avatar
                                    const assigneeName = t.tildelt_til && t.tildelt_til.length > 0 ? getAssigneeName(t.tildelt_til[0]) : '';
                                    const getInitials = (name) => {
                                        if (!name) return '';
                                        const parts = name.split(' ');
                                        if (parts.length >= 2) {
                                            return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                                        }
                                        return name.substring(0, 2).toUpperCase();
                                    };
                                    const initials = getInitials(assigneeName);

                                    return (
                                        <div 
                                            key={t.id} 
                                            className="flex gap-4 items-start bg-white border border-slate-100 hover:border-slate-200/80 rounded-2xl p-5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 group w-full relative animate-task-appear"
                                        >
                                            {/* Styled circular Checkbox */}
                                            <div 
                                                onClick={() => handleToggleTask(t)} 
                                                className="hkm-checkbox-round w-5 h-5 rounded-full border-2 border-slate-300 hover:border-[#d17d39] hover:bg-orange-500/5 flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5 transition-all duration-300 bg-white shadow-sm hover:scale-105 group/checkbox"
                                                title="Fullfør oppgave"
                                            >
                                                <span className="material-symbols-outlined text-[10px] text-transparent group-hover/checkbox:text-slate-400 select-none">check</span>
                                            </div>

                                            {/* Content body */}
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start gap-3">
                                                    <h4 className="m-0 font-bold text-xs text-slate-800 leading-snug break-words">{t.title}</h4>
                                                    
                                                    {/* Slett oppgave icon */}
                                                    <button 
                                                        onClick={() => handleDeleteTask(t.id)} 
                                                        className="border-none bg-transparent p-1 cursor-pointer text-slate-300 hover:text-red-500 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 flex-shrink-0" 
                                                        title="Slett oppgave"
                                                    >
                                                        <span className="material-symbols-outlined text-base">delete</span>
                                                    </button>
                                                </div>

                                                {t.description && (
                                                    <p className="m-0 text-[11px] text-slate-500 mt-2 leading-relaxed break-words font-medium">{t.description}</p>
                                                )}

                                                {/* Minimal SaaS Tags line */}
                                                <div className="flex flex-wrap items-center gap-2.5 mt-3.5 text-[10px] font-bold text-slate-500">
                                                    
                                                    {/* Priority badge with translucent pastel styling */}
                                                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                                                        t.priority === 'high' 
                                                            ? 'bg-red-500/[0.06] text-red-700 border-red-500/10' 
                                                            : t.priority === 'medium'
                                                            ? 'bg-amber-500/[0.06] text-amber-700 border-amber-500/10'
                                                            : 'bg-emerald-500/[0.06] text-emerald-700 border-emerald-500/10'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${prioDotColor}`}></span>
                                                        {prioLabel} prioritet
                                                    </span>

                                                    {/* Due date badge */}
                                                    {t.dueDate && (
                                                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                                                            isOverdue 
                                                                ? 'bg-rose-500/[0.06] text-rose-700 border-rose-500/10 font-bold animate-pulse' 
                                                                : 'bg-[#1B4965]/[0.06] text-[#1B4965] border-[#1B4965]/10'
                                                        }`}>
                                                            <span className="material-symbols-outlined text-[13px]">{isOverdue ? 'error' : 'calendar_today'}</span>
                                                            <span>{isOverdue ? 'Forfalt: ' : 'Forfaller: '}</span>
                                                            <span>{new Date(t.dueDate).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })}</span>
                                                        </span>
                                                    )}

                                                    {/* Assignee badge with actual circular initials avatar */}
                                                    {t.tildelt_til && t.tildelt_til.length > 0 ? (
                                                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-indigo-500/[0.06] text-indigo-700 border-indigo-500/10" title={`Tildelt: ${assigneeName}`}>
                                                            <span className="w-4.5 h-4.5 rounded-full bg-[#1B4965] text-white font-bold text-[8px] flex items-center justify-center select-none shadow-sm shadow-indigo-600/10">
                                                                {initials}
                                                            </span>
                                                            <span>{assigneeName}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-500/[0.06] text-slate-600 border-slate-500/10">
                                                            <span className="material-symbols-outlined text-[13px]">group</span>
                                                            <span>Felles</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Collapsible Completed Tasks List Accordion */}
                        {completedTasks.length > 0 && (
                            <div className="mt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowCompleted(!showCompleted)} 
                                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs bg-white hover:bg-slate-50 border border-slate-200/60 hover:border-slate-300 cursor-pointer px-4 py-2.5 rounded-xl transition-all duration-300 select-none outline-none transform active:scale-95 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-base transform transition-transform duration-300" style={{ transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        expand_more
                                    </span>
                                    <span>Fullførte gjøremål ({completedTasks.length})</span>
                                </button>
                                
                                {showCompleted && (
                                    <div className="flex flex-col gap-3 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        {completedTasks.map(t => (
                                            <div 
                                                key={t.id} 
                                                className="flex gap-4 items-start bg-slate-50/40 border border-slate-100 hover:border-slate-200/80 rounded-2xl p-4 opacity-60 hover:opacity-85 transition-all duration-200 group w-full relative"
                                            >
                                                {/* Checked status checkbox */}
                                                <div 
                                                    onClick={() => handleToggleTask(t)} 
                                                    className="hkm-checkbox-completed hkm-checkbox-round w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-500 flex items-center justify-center cursor-pointer flex-shrink-0 mt-0.5 transition-all duration-300 select-none shadow-sm shadow-emerald-500/10 hover:scale-105"
                                                    title="Marker som ugjort"
                                                >
                                                    <span className="material-symbols-outlined text-[10px] text-white font-bold select-none hkm-check-icon">check</span>
                                                    <span className="material-symbols-outlined text-[10px] text-white font-bold select-none hkm-close-icon">close</span>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <h4 className="m-0 font-bold text-xs text-slate-400 line-through leading-snug break-words">{t.title}</h4>
                                                        <button 
                                                            onClick={() => handleDeleteTask(t.id)} 
                                                            className="border-none bg-transparent p-1 cursor-pointer text-slate-300 hover:text-red-500 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 flex-shrink-0" 
                                                            title="Slett oppgave"
                                                        >
                                                            <span className="material-symbols-outlined text-base">delete</span>
                                                        </button>
                                                    </div>

                                                    {t.description && (
                                                        <p className="m-0 text-[11px] text-slate-400 line-through mt-1.5 leading-relaxed break-words font-medium">{t.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
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
