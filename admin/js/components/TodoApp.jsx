import React, { useState, useEffect, useMemo } from 'react';

/**
 * TodoApp Component - HKM Studio Task Manager
 * Exact match to HKM Admin Dashboard card & list row design template:
 * - Section Header (Icon box + Title + Subtitle)
 * - Warm Accent Banner Box (Framgang & Filter tabs)
 * - Horizontal Task Row Cards (Circle Avatar/Checkbox, Title, Metadata, Status Pill, Delete Button)
 */
export default function TodoApp() {
    const [tasks, setTasks] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

    // Form inputs
    const [taskTitle, setTaskTitle] = useState('');
    const [taskPriority, setTaskPriority] = useState('medium');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

                    // Realtime tasks listener from Firestore
                    const unsubscribe = db.collection('tasks').onSnapshot(snapshot => {
                        const taskList = [];
                        snapshot.forEach(doc => {
                            taskList.push({ id: doc.id, ...doc.data() });
                        });
                        // Sort by createdAt descending
                        taskList.sort((a, b) => {
                            const ta = a.createdAt?.toDate ? a.createdAt.toDate() : (a.created_at?.toDate ? a.created_at.toDate() : new Date(0));
                            const tb = b.createdAt?.toDate ? b.createdAt.toDate() : (b.created_at?.toDate ? b.created_at.toDate() : new Date(0));
                            return tb - ta;
                        });
                        setTasks(taskList);
                        setLoading(false);
                    }, error => {
                        console.error("[TodoApp] Firestore tasks error:", error);
                        setLoading(false);
                    });

                    return () => unsubscribe();
                } else {
                    setCurrentUser(null);
                    setLoading(false);
                }
            });
        };

        checkAuth();
    }, []);

    // Filter calculations
    const isCompleted = (t) => t.completed === true || t.status === 'fullført';

    const activeTasks = useMemo(() => tasks.filter(t => !isCompleted(t)), [tasks]);
    const completedTasks = useMemo(() => tasks.filter(t => isCompleted(t)), [tasks]);
    const totalCount = tasks.length;
    const completedCount = completedTasks.length;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const filteredTasks = useMemo(() => {
        if (filter === 'active') return activeTasks;
        if (filter === 'completed') return completedTasks;
        return tasks;
    }, [tasks, filter, activeTasks, completedTasks]);

    // Actions
    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!taskTitle.trim() || !currentUser || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const db = firebase.firestore();
            await db.collection('tasks').add({
                title: taskTitle.trim(),
                priority: taskPriority || 'medium',
                completed: false,
                status: 'ikke_startet',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                userId: currentUser.uid,
                createdBy: currentUser.displayName || currentUser.email || 'Admin'
            });
            setTaskTitle('');
            setTaskPriority('medium');
        } catch (err) {
            console.error('[TodoApp] Error adding task:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleComplete = async (task) => {
        try {
            const comp = isCompleted(task);
            const nextState = !comp;
            const db = firebase.firestore();
            await db.collection('tasks').doc(task.id).update({
                completed: nextState,
                status: nextState ? 'fullført' : 'ikke_startet',
                completedAt: nextState ? firebase.firestore.FieldValue.serverTimestamp() : null,
                completed_at: nextState ? firebase.firestore.FieldValue.serverTimestamp() : null
            });
        } catch (err) {
            console.error('[TodoApp] Toggle complete error:', err);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            const db = firebase.firestore();
            await db.collection('tasks').doc(taskId).delete();
        } catch (err) {
            console.error('[TodoApp] Delete task error:', err);
        }
    };

    const getTimeAgo = (task) => {
        const ts = task.createdAt || task.created_at;
        if (!ts) return '';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        if (isNaN(date.getTime())) return '';
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'nettopp';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m siden`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}t siden`;
        const days = Math.floor(hours / 24);
        return `${days}d siden`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="loader w-10 h-10 border-4 border-[#d17d39] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="bento-card" style={{ padding: '32px', textAlign: 'center', maxWidth: '400px', margin: '40px auto', borderRadius: '20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#94a3b8', marginBottom: '16px' }}>lock</span>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Vennligst logg inn for å få tilgang til huskelisten.</p>
            </div>
        );
    }

    return (
        <div className="hkm-tasks-container" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', paddingBottom: '40px' }}>
            {/* Main Bento Section Card */}
            <div className="bento-card" style={{ padding: '32px', background: 'var(--bg-card, #ffffff)', borderRadius: '20px', border: '1px solid var(--border-color, rgba(0,0,0,0.06))', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(209, 125, 57, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ color: '#d17d39', fontSize: '24px' }}>task_alt</span>
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>Huskeliste</h2>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>Administrer og utfør dine gjøremål</p>
                        </div>
                    </div>
                </div>

                {/* Warm Accent Banner Box */}
                <div style={{ background: 'rgba(209, 125, 57, 0.06)', border: '1px solid rgba(209, 125, 57, 0.15)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                            Framgang: <strong style={{ color: '#d17d39' }}>{completedCount} av {totalCount} fullført ({progressPct}%)</strong>
                        </span>
                    </div>
                    <div className="hkm-tasks-filters" style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className={`task-filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                            style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === 'all' ? '#d17d39' : 'rgba(0,0,0,0.06)', color: filter === 'all' ? '#fff' : 'var(--text-main)', transition: 'all 0.2s' }}
                        >
                            Alle ({totalCount})
                        </button>
                        <button 
                            className={`task-filter-btn ${filter === 'active' ? 'active' : ''}`}
                            onClick={() => setFilter('active')}
                            style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === 'active' ? '#d17d39' : 'rgba(0,0,0,0.06)', color: filter === 'active' ? '#fff' : 'var(--text-main)', transition: 'all 0.2s' }}
                        >
                            Aktive ({activeTasks.length})
                        </button>
                        <button 
                            className={`task-filter-btn ${filter === 'completed' ? 'active' : ''}`}
                            onClick={() => setFilter('completed')}
                            style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === 'completed' ? '#d17d39' : 'rgba(0,0,0,0.06)', color: filter === 'completed' ? '#fff' : 'var(--text-main)', transition: 'all 0.2s' }}
                        >
                            Fullførte ({completedTasks.length})
                        </button>
                    </div>
                </div>

                {/* Quick Add Form Row */}
                <form onSubmit={handleAddTask} style={{ background: 'var(--bg-main, #f8fafc)', border: '1px solid var(--border-color, rgba(0,0,0,0.06))', borderRadius: '14px', padding: '14px 20px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                        <input 
                            type="text" 
                            placeholder="Legg til ny oppgave i huskelisten..." 
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card, #ffffff)', fontSize: '14px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <select 
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border-color, #e2e8f0)', background: 'var(--bg-card, #ffffff)', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer', outline: 'none' }}
                    >
                        <option value="medium">Medium prio</option>
                        <option value="high">Høy prio</option>
                        <option value="low">Lav prio</option>
                    </select>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="btn-primary" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', border: 'none', background: '#d17d39', color: '#ffffff', transition: 'transform 0.15s' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        Legg til
                    </button>
                </form>

                {/* Task Rows List (Exact match to screenshot row style) */}
                <div className="hkm-tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredTasks.length === 0 ? (
                        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-main, #f8fafc)', borderRadius: '14px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '44px', color: '#94a3b8', marginBottom: '10px' }}>check_circle_outline</span>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>Ingen oppgaver i listen</h3>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>Legg til en ny oppgave ovenfor for å holde oversikten!</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => {
                            const prioColors = {
                                high: { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', label: 'Høy prio' },
                                medium: { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706', label: 'Medium prio' },
                                low: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', label: 'Lav prio' }
                            };
                            const prio = prioColors[task.priority] || prioColors.medium;
                            const comp = isCompleted(task);
                            const timeStr = getTimeAgo(task);

                            return (
                                <div key={task.id} className={`hkm-task-row ${comp ? 'completed' : ''}`} style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, rgba(0,0,0,0.06))', borderRadius: '16px', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', opacity: comp ? 0.65 : 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                                        <label className="hkm-custom-cb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '50%', background: comp ? 'rgba(34, 197, 94, 0.12)' : 'rgba(209, 125, 57, 0.1)', color: comp ? '#16a34a' : '#d17d39', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={comp} 
                                                onChange={() => handleToggleComplete(task)}
                                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#d17d39' }} 
                                            />
                                        </label>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <span className="task-title" style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.4, textDecoration: comp ? 'line-through' : 'none', color: comp ? 'var(--text-muted)' : 'var(--text-main)', wordBreak: 'break-word' }}>
                                                {task.title}
                                            </span>
                                            <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                                                <span style={{ color: '#d17d39', fontWeight: 500 }}>Opprettet {timeStr || 'nylig'}</span>
                                                {task.priority && ` • Prioritet: ${prio.label}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: comp ? 'rgba(34, 197, 94, 0.15)' : 'rgba(209, 125, 57, 0.15)', color: comp ? '#16a34a' : '#d17d39', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: comp ? '#22c55e' : '#d17d39', display: 'inline-block' }}></span>
                                            {comp ? 'FULLFØRT' : 'AKTIV'}
                                        </span>
                                        <button 
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="delete-task-btn" 
                                            title="Slett oppgave" 
                                            style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', color: '#94a3b8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
