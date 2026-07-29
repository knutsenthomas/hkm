import React, { useState, useEffect, useMemo } from 'react';

/**
 * TodoApp Component - HKM Studio Premium Task Manager Dashboard
 * Strictly complies with HKM Design Rules:
 * - 8px Grid System (spacing: 8px, 16px, 24px, 32px, 48px)
 * - 20px Card Radius, 12px Button Radius, 24px Pill Badges
 * - Semi-transparent borders, diffuse layered shadows, smooth 0.2s transitions
 * - Responsive 2-Column Widescreen Layout
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
        <div className="hkm-tasks-container">
            <div className="hkm-tasks-layout">
                {/* Left Sidebar / Control Panel */}
                <div className="hkm-tasks-sidebar">
                    {/* Stats & Progress Card */}
                    <div className="bento-card" style={{ padding: '24px', background: 'var(--bg-card, #ffffff)', borderRadius: '20px', border: '1px solid var(--border-color, rgba(0,0,0,0.06))', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(209, 125, 57, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ color: '#d17d39', fontSize: '26px' }}>task_alt</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>Huskeliste</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)', lineHeight: 1.4 }}>Dine gjøremål og sjekklistepunkter</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                                <span>Framgang</span>
                                <span>{completedCount} av {totalCount} fullført ({progressPct}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '10px', background: 'rgba(209, 125, 57, 0.12)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #d17d39 0%, #bd4f2a 100%)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: '99px' }}></div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color, rgba(0,0,0,0.06))' }}>
                            <div style={{ background: 'var(--bg-main, #f8fafc)', padding: '16px', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color, rgba(0,0,0,0.04))' }}>
                                <span style={{ display: 'block', fontSize: '22px', fontWeight: 700, color: '#d17d39', lineHeight: 1.2 }}>{activeTasks.length}</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Aktive</span>
                            </div>
                            <div style={{ background: 'var(--bg-main, #f8fafc)', padding: '16px', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-color, rgba(0,0,0,0.04))' }}>
                                <span style={{ display: 'block', fontSize: '22px', fontWeight: 700, color: '#10b981', lineHeight: 1.2 }}>{completedCount}</span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fullførte</span>
                            </div>
                        </div>
                    </div>

                    {/* Add Task Form Card */}
                    <div className="bento-card" style={{ padding: '24px', background: 'var(--bg-card, #ffffff)', borderRadius: '20px', border: '1px solid var(--border-color, rgba(0,0,0,0.06))', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#d17d39' }}>add_circle</span>
                            Ny oppgave
                        </h3>
                        <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Beskrivelse</label>
                                <input 
                                    type="text" 
                                    placeholder="Hva må gjøres?..." 
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--border-color, #e2e8f0)', background: 'var(--bg-main, #f8fafc)', fontSize: '14px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prioritet</label>
                                <select 
                                    value={taskPriority}
                                    onChange={(e) => setTaskPriority(e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--border-color, #e2e8f0)', background: 'var(--bg-main, #f8fafc)', fontSize: '14px', color: 'var(--text-main)', cursor: 'pointer', outline: 'none', boxSizing: 'border-box' }}
                                >
                                    <option value="medium">Medium prioritet</option>
                                    <option value="high">Høy prioritet</option>
                                    <option value="low">Lav prioritet</option>
                                </select>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="btn-primary" 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 24px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #d17d39 0%, #bd4f2a 100%)', color: '#ffffff', marginTop: '8px', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 14px rgba(209, 125, 57, 0.3)' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_task</span>
                                Legg til i huskelisten
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Main Content Panel */}
                <div className="hkm-tasks-main">
                    {/* Top Filter Bar Card */}
                    <div className="bento-card" style={{ padding: '16px 24px', background: 'var(--bg-card, #ffffff)', borderRadius: '20px', border: '1px solid var(--border-color, rgba(0,0,0,0.06))', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div className="hkm-tasks-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                                className={`task-filter-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                                style={{ padding: '8px 20px', borderRadius: '24px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === 'all' ? '#d17d39' : 'rgba(0,0,0,0.05)', color: filter === 'all' ? '#fff' : 'var(--text-main)', transition: 'all 0.2s' }}
                            >
                                Alle oppgaver ({totalCount})
                            </button>
                            <button 
                                className={`task-filter-btn ${filter === 'active' ? 'active' : ''}`}
                                onClick={() => setFilter('active')}
                                style={{ padding: '8px 20px', borderRadius: '24px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === 'active' ? '#d17d39' : 'rgba(0,0,0,0.05)', color: filter === 'active' ? '#fff' : 'var(--text-main)', transition: 'all 0.2s' }}
                            >
                                Aktive ({activeTasks.length})
                            </button>
                            <button 
                                className={`task-filter-btn ${filter === 'completed' ? 'active' : ''}`}
                                onClick={() => setFilter('completed')}
                                style={{ padding: '8px 20px', borderRadius: '24px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', background: filter === 'completed' ? '#d17d39' : 'rgba(0,0,0,0.05)', color: filter === 'completed' ? '#fff' : 'var(--text-main)', transition: 'all 0.2s' }}
                            >
                                Fullførte ({completedTasks.length})
                            </button>
                        </div>
                    </div>

                    {/* Widescreen Task Grid */}
                    <div className="hkm-tasks-grid">
                        {filteredTasks.length === 0 ? (
                            <div className="bento-card" style={{ gridColumn: '1 / -1', padding: '64px 24px', textAlign: 'center', background: 'var(--bg-card, #ffffff)', borderRadius: '20px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(209, 125, 57, 0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#d17d39' }}>task_alt</span>
                                </div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>Ingen oppgaver funnet</h3>
                                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted, #64748b)' }}>Legg til en ny oppgave i skjemaet til venstre for å komme i gang!</p>
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
                                    <div key={task.id} className={`hkm-task-card ${comp ? 'completed' : ''}`}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <label className="hkm-custom-cb" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={comp} 
                                                    onChange={() => handleToggleComplete(task)}
                                                    style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#d17d39' }} 
                                                />
                                            </label>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <span className="task-title" style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.5, textDecoration: comp ? 'line-through' : 'none', color: comp ? 'var(--text-muted)' : 'var(--text-main)', wordBreak: 'break-word' }}>
                                                    {task.title}
                                                </span>
                                                {timeStr && (
                                                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginTop: '6px' }}>
                                                        Opprettet {timeStr}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid var(--border-color, rgba(0,0,0,0.05))', paddingTop: '12px', marginTop: '8px' }}>
                                            <span style={{ padding: '4px 12px', borderRadius: '24px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: prio.bg, color: prio.text }}>
                                                {prio.label}
                                            </span>
                                            <button 
                                                onClick={() => handleDeleteTask(task.id)}
                                                className="delete-task-btn" 
                                                title="Slett oppgave"
                                                style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', color: '#94a3b8', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
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
        </div>
    );
}
