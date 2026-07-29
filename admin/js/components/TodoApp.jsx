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
        <div className="todo-app-container">
            
            {/* Left Sidebar Navigation */}
            <div className="todo-sidebar">
                
                {/* Add Task Button */}
                <button 
                    onClick={() => setShowAddTaskModal(true)} 
                    className="todo-add-btn"
                >
                    <span className="material-symbols-outlined">add</span>
                    Ny oppgave
                </button>

                {/* Sidebar Navigation Options */}
                <div className="todo-sidebar-card">
                    <span className="todo-sidebar-section-title">Hurtigvalg</span>
                    
                    <button 
                        onClick={() => {
                            setViewMode('active');
                            setFilterAssignee('all');
                            setFilterPriority('all');
                        }}
                        className={`todo-nav-btn ${isAllActive ? 'active' : ''}`}
                    >
                        <span className="material-symbols-outlined">playlist_add_check</span>
                        <span className="flex-1 truncate">Alle gjøremål</span>
                        <span className="todo-count-badge">{counts.all}</span>
                    </button>

                    <button 
                        onClick={() => {
                            setViewMode('active');
                            setFilterAssignee('me');
                            setFilterPriority('all');
                        }}
                        className={`todo-nav-btn ${isMeActive ? 'active' : ''}`}
                    >
                        <span className="material-symbols-outlined">account_circle</span>
                        <span className="flex-1 truncate">Tildelt meg</span>
                        <span className="todo-count-badge">{counts.me}</span>
                    </button>

                    <button 
                        onClick={() => {
                            setViewMode('active');
                            setFilterAssignee('global');
                            setFilterPriority('all');
                        }}
                        className={`todo-nav-btn ${isGlobalActive ? 'active' : ''}`}
                    >
                        <span className="material-symbols-outlined">group</span>
                        <span className="flex-1 truncate">Globale oppgaver</span>
                        <span className="todo-count-badge">{counts.global}</span>
                    </button>

                    <button 
                        onClick={() => {
                            setViewMode('active');
                            setFilterAssignee('all');
                            setFilterPriority('high');
                        }}
                        className={`todo-nav-btn ${isStarredActive ? 'active' : ''}`}
                    >
                        <span className="material-symbols-outlined">star</span>
                        <span className="flex-1 truncate">Viktige oppgaver</span>
                        <span className="todo-count-badge">{counts.starred}</span>
                    </button>

                    <button 
                        onClick={() => {
                            setViewMode('completed');
                            setFilterAssignee('all');
                            setFilterPriority('all');
                        }}
                        className={`todo-nav-btn ${isCompletedViewActive ? 'active' : ''}`}
                    >
                        <span className="material-symbols-outlined">check_circle</span>
                        <span className="flex-1 truncate">Fullførte oppgaver</span>
                        <span className="todo-count-badge">{counts.completed}</span>
                    </button>

                    {/* Lists sub-header */}
                    <span className="todo-sidebar-section-title" style={{ marginTop: '12px' }}>Lister</span>

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
                                className={`todo-nav-btn ${isUserActive ? 'active' : ''}`}
                            >
                                <span className="material-symbols-outlined">assignment</span>
                                <span className="flex-1 truncate">{u.displayName}'s liste</span>
                                <span className="todo-count-badge">{userActiveCount}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right Main Content Panel */}
            <div className="todo-workspace todo-main-card">
                
                {/* Header view title and Search Bar */}
                <div className="todo-workspace-header">
                    <div>
                        <div className="todo-header-title-group">
                            <h3 className="todo-header-title">{activeViewTitle}</h3>
                            <span className="todo-badge todo-badge-assignee">
                                {viewMode === 'completed' 
                                    ? `${completedTasks.length} ${completedTasks.length === 1 ? 'fullført' : 'fullførte'}` 
                                    : `${activeTasks.length} ${activeTasks.length === 1 ? 'oppgave' : 'oppgaver'}`
                                }
                            </span>
                        </div>
                        <p className="todo-header-subtitle">Administrer og deleger oppgavene dine effektivt.</p>
                    </div>

                    {/* Integrated Search Box */}
                    <div className="todo-search-box">
                        <span className="material-symbols-outlined">search</span>
                        <input 
                            type="text" 
                            value={filterSearch} 
                            onChange={e => setFilterSearch(e.target.value)} 
                            placeholder="Søk i oppgaver..." 
                            className="todo-search-input" 
                        />
                    </div>
                </div>

                {viewMode === 'completed' ? (
                    /* Completed Tasks View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {completedTasks.length === 0 ? (
                            <div className="todo-empty-container">
                                <div className="todo-empty-icon-wrap">
                                    <span className="material-symbols-outlined">task_alt</span>
                                </div>
                                <h4 className="todo-empty-title">Ingen fullførte gjøremål</h4>
                                <p className="todo-empty-desc">Du har ikke fullført noen oppgaver i denne listen ennå. Start med å fullføre en oppgave!</p>
                            </div>
                        ) : (
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
                                    <div key={t.id} className="todo-task-card completed">
                                        <button 
                                            onClick={() => handleToggleTask(t)} 
                                            className="todo-checkbox-btn"
                                            title="Marker som ugjort"
                                        >
                                            <span className="material-symbols-outlined">check</span>
                                        </button>

                                        <div className="todo-task-body">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                <h4 className="todo-task-title">{t.title}</h4>
                                                <button 
                                                    onClick={() => handleDeleteTask(t.id)} 
                                                    className="todo-icon-btn delete" 
                                                    title="Slett oppgave"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>

                                            {t.description && (
                                                <p className="todo-task-desc">{t.description}</p>
                                            )}

                                            <div className="todo-task-tags">
                                                <span className={`todo-badge ${
                                                    t.priority === 'high' ? 'todo-badge-priority-high' : t.priority === 'medium' ? 'todo-badge-priority-medium' : 'todo-badge-priority-low'
                                                }`}>
                                                    {{ low: 'Lav', medium: 'Medium', high: 'Høy' }[t.priority || 'medium']} prioritet
                                                </span>

                                                {completedDateStr && (
                                                    <span className="todo-badge todo-badge-date">
                                                        Fullført: {completedDateStr}
                                                    </span>
                                                )}

                                                {assigneeName && (
                                                    <span className="todo-badge todo-badge-assignee">
                                                        <span className="todo-user-avatar">{initials}</span>
                                                        {assigneeName}
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
                        {/* Quick-Add Box */}
                        <form 
                            onSubmit={handleInlineQuickAdd} 
                            className="todo-quick-add-card"
                            onClick={() => {
                                if (!isQuickAddExpanded) setIsQuickAddExpanded(true);
                            }}
                        >
                            <div className="todo-quick-add-input-row">
                                <span className="material-symbols-outlined todo-quick-add-icon">add_task</span>
                                <input 
                                    type="text" 
                                    value={inlineTitle} 
                                    onChange={e => setInlineTitle(e.target.value)} 
                                    placeholder="Legg til et nytt gjøremål her..." 
                                    className="todo-quick-add-input" 
                                />
                                {!isQuickAddExpanded && inlineTitle.trim() && (
                                    <button 
                                        type="submit" 
                                        className="todo-quick-submit-btn"
                                        title="Lagre oppgave"
                                    >
                                        Lagre
                                    </button>
                                )}
                            </div>

                            {isQuickAddExpanded && (
                                <div className="todo-quick-add-meta-row">
                                    <textarea 
                                        value={inlineDesc}
                                        onChange={e => setInlineDesc(e.target.value)}
                                        placeholder="Legg til en beskrivelse (valgfritt)..."
                                        rows={2}
                                        className="todo-quick-add-input"
                                        style={{ width: '100%', marginBottom: '8px' }}
                                    />

                                    <select 
                                        value={inlinePriority} 
                                        onChange={e => setInlinePriority(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        className="todo-quick-select"
                                    >
                                        <option value="low">Lav prioritet</option>
                                        <option value="medium">Medium prioritet</option>
                                        <option value="high">Høy prioritet</option>
                                    </select>

                                    <input 
                                        type="date" 
                                        value={inlineDueDate} 
                                        onChange={e => setInlineDueDate(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        className="todo-quick-date-input" 
                                    />

                                    <select 
                                        value={inlineAssignee} 
                                        onChange={e => setInlineAssignee(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        className="todo-quick-select"
                                    >
                                        <option value="">Felles (Ingen)</option>
                                        {users.map(u => (
                                            <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                        ))}
                                    </select>

                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                        <button 
                                            type="button" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setInlineTitle('');
                                                setInlineDesc('');
                                                setInlineDueDate('');
                                                setIsQuickAddExpanded(false);
                                            }}
                                            className="todo-icon-btn"
                                            style={{ fontSize: '13px', width: 'auto', padding: '0 12px' }}
                                        >
                                            Avbryt
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={!inlineTitle.trim()}
                                            onClick={(e) => e.stopPropagation()}
                                            className="todo-quick-submit-btn"
                                        >
                                            Lagre
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Active Tasks List Area */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {activeTasks.length === 0 ? (
                                <div className="todo-empty-container">
                                    <div className="todo-empty-icon-wrap">
                                        <span className="material-symbols-outlined">task_alt</span>
                                    </div>
                                    <h4 className="todo-empty-title">Alle gjøremålene er fullført</h4>
                                    <p className="todo-empty-desc">Fantastisk jobb! Det er ingenting utestående på denne oppgavelisten.</p>
                                </div>
                            ) : (
                                activeTasks.map(t => {
                                    const prioLabel = { low: 'Lav', medium: 'Medium', high: 'Høy' }[t.priority] || 'Medium';
                                    const isOverdue = t.dueDate ? new Date(t.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) : false;

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
                                        <div key={t.id} className="todo-task-card">
                                            <button 
                                                onClick={() => handleToggleTask(t)} 
                                                className="todo-checkbox-btn"
                                                title="Fullfør oppgave"
                                            >
                                                <span className="material-symbols-outlined" style={{ display: 'none' }}>check</span>
                                            </button>

                                            <div className="todo-task-body">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                    <h4 className="todo-task-title">{t.title}</h4>
                                                    <button 
                                                        onClick={() => handleDeleteTask(t.id)} 
                                                        className="todo-icon-btn delete" 
                                                        title="Slett oppgave"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>

                                                {t.description && (
                                                    <p className="todo-task-desc">{t.description}</p>
                                                )}

                                                <div className="todo-task-tags">
                                                    <span className={`todo-badge ${
                                                        t.priority === 'high' ? 'todo-badge-priority-high' : t.priority === 'medium' ? 'todo-badge-priority-medium' : 'todo-badge-priority-low'
                                                    }`}>
                                                        {prioLabel} prioritet
                                                    </span>

                                                    {t.dueDate && (
                                                        <span className={`todo-badge todo-badge-date ${isOverdue ? 'overdue' : ''}`}>
                                                            {isOverdue ? 'Forfalt: ' : 'Forfaller: '}
                                                            {new Date(t.dueDate).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    )}

                                                    {assigneeName ? (
                                                        <span className="todo-badge todo-badge-assignee">
                                                            <span className="todo-user-avatar">{initials}</span>
                                                            {assigneeName}
                                                        </span>
                                                    ) : (
                                                        <span className="todo-badge todo-badge-date">
                                                            Felles
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
                            <div style={{ marginTop: '16px' }}>
                                <div 
                                    onClick={() => setShowCompleted(!showCompleted)} 
                                    className={`todo-accordion-header ${showCompleted ? 'open' : ''}`}
                                >
                                    <span className="material-symbols-outlined">chevron_right</span>
                                    <span>Fullførte gjøremål ({completedTasks.length})</span>
                                </div>
                                
                                {showCompleted && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                                        {completedTasks.map(t => (
                                            <div key={t.id} className="todo-task-card completed">
                                                <button 
                                                    onClick={() => handleToggleTask(t)} 
                                                    className="todo-checkbox-btn"
                                                    title="Marker som ugjort"
                                                >
                                                    <span className="material-symbols-outlined">check</span>
                                                </button>

                                                <div className="todo-task-body">
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                        <h4 className="todo-task-title">{t.title}</h4>
                                                        <button 
                                                            onClick={() => handleDeleteTask(t.id)} 
                                                            className="todo-icon-btn delete" 
                                                            title="Slett oppgave"
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
                                                        </button>
                                                    </div>

                                                    {t.description && (
                                                        <p className="todo-task-desc">{t.description}</p>
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
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '16px' }}>
                    <div 
                        style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}
                        onClick={() => {
                            setFormError('');
                            setShowAddTaskModal(false);
                        }}
                    />
                    
                    <div style={{ position: 'relative', width: '100%', maxWidth: '500px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', overflow: 'hidden', margin: 'auto', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff7ed', color: '#d17d39', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-symbols-outlined">playlist_add</span>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1B4965' }}>Ny oppgave</h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Opprett en ny oppgave i listen din</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setFormError('');
                                    setShowAddTaskModal(false);
                                }} 
                                className="todo-icon-btn"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            {formError && (
                                <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-symbols-outlined">error</span>
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tittel *</label>
                                    <input 
                                        type="text" 
                                        value={newTitle} 
                                        onChange={e => setNewTitle(e.target.value)} 
                                        placeholder="Hva må gjøres?" 
                                        required 
                                        className="todo-search-input"
                                        style={{ paddingLeft: '14px !important' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Beskrivelse</label>
                                    <textarea 
                                        value={newDesc} 
                                        onChange={e => setNewDesc(e.target.value)} 
                                        placeholder="Detaljer om oppgaven..." 
                                        rows={3} 
                                        className="todo-search-input"
                                        style={{ paddingLeft: '14px !important', height: 'auto', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prioritet</label>
                                        <select 
                                            value={newPriority} 
                                            onChange={e => setNewPriority(e.target.value)} 
                                            className="todo-quick-select"
                                            style={{ width: '100%', height: '42px' }}
                                        >
                                            <option value="low">Lav</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">Høy</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forfallsdato</label>
                                        <input 
                                            type="date" 
                                            value={newDueDate} 
                                            onChange={e => setNewDueDate(e.target.value)} 
                                            className="todo-quick-date-input"
                                            style={{ width: '100%', height: '42px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tildel til (Valgfritt)</label>
                                    <select 
                                        value={newAssignee} 
                                        onChange={e => setNewAssignee(e.target.value)} 
                                        className="todo-quick-select"
                                        style={{ width: '100%', height: '42px' }}
                                    >
                                        <option value="">Alle administratorer (Global)</option>
                                        {users.map(u => (
                                            <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setFormError('');
                                            setShowAddTaskModal(false);
                                        }}
                                        className="todo-icon-btn"
                                        style={{ flex: 1, height: '44px', width: 'auto', background: '#f1f5f9', fontWeight: 700 }}
                                    >
                                        Avbryt
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="todo-add-btn"
                                        style={{ flex: 1, padding: '0 20px', height: '44px' }}
                                    >
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
