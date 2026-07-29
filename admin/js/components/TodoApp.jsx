import React, { useState, useEffect, useMemo } from 'react';

/**
 * TodoApp Component - HKM Studio Task Manager
 * Aligned 100% with the HKM Dashboard Overview design tokens and card rules:
 * - Section Header (Icon box: #fff7ed background, #d17d39 icon, #ffedd5 border)
 * - Title (#1e293b font-weight 800) & Subtitle (#64748b font-weight 500)
 * - Warm Accent Banner (#fff7ed background, #ffedd5 border, 14px radius)
 * - Row Cards (recent-signup-item style: 1.5px solid #f1f5f9, 14px radius, 12px 16px padding)
 * - Avatar Circles (linear-gradient #fff7ed to #ffedd5, #d17d39 text, #ffedd5 border)
 * - Status Pills (#dcfce7 / #15803d for completed, #fff7ed / #c26d28 for active)
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
            <div className="bento-card" style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#fff7ed', color: '#d17d39', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ffedd5', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>task_alt</span>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-main, #1e293b)' }}>Huskeliste</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Dine personlige oppgaver og sjekklistepunkter</p>
                        </div>
                    </div>
                </div>

                {/* Warm Accent Banner (Matching "Se alle påmeldinger" Banner) */}
                <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '14px', padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                            Framgang: <span style={{ color: '#d17d39' }}>{completedCount} av {totalCount} fullført ({progressPct}%)</span>
                        </span>
                    </div>
                    <div className="hkm-tasks-filters" style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className={`task-filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                            style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: '1px solid #ffedd5', cursor: 'pointer', background: filter === 'all' ? '#d17d39' : '#ffffff', color: filter === 'all' ? '#ffffff' : '#d17d39', transition: 'all 0.2s ease' }}
                        >
                            Alle ({totalCount})
                        </button>
                        <button 
                            className={`task-filter-btn ${filter === 'active' ? 'active' : ''}`}
                            onClick={() => setFilter('active')}
                            style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: '1px solid #ffedd5', cursor: 'pointer', background: filter === 'active' ? '#d17d39' : '#ffffff', color: filter === 'active' ? '#ffffff' : '#d17d39', transition: 'all 0.2s ease' }}
                        >
                            Aktive ({activeTasks.length})
                        </button>
                        <button 
                            className={`task-filter-btn ${filter === 'completed' ? 'active' : ''}`}
                            onClick={() => setFilter('completed')}
                            style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: '1px solid #ffedd5', cursor: 'pointer', background: filter === 'completed' ? '#d17d39' : '#ffffff', color: filter === 'completed' ? '#ffffff' : '#d17d39', transition: 'all 0.2s ease' }}
                        >
                            Fullførte ({completedTasks.length})
                        </button>
                    </div>
                </div>

                {/* Quick Add Form Row */}
                <form onSubmit={handleAddTask} style={{ background: 'var(--bg-main, #f8fafc)', border: '1.5px solid #f1f5f9', borderRadius: '14px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                        <input 
                            type="text" 
                            placeholder="Legg til et nytt gjøremål her..." 
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'var(--bg-card, #ffffff)', fontSize: '14px', color: 'var(--text-main, #1e293b)', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <select 
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'var(--bg-card, #ffffff)', fontSize: '13px', color: 'var(--text-main, #1e293b)', cursor: 'pointer', outline: 'none' }}
                    >
                        <option value="medium">Medium prio</option>
                        <option value="high">Høy prio</option>
                        <option value="low">Lav prio</option>
                    </select>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="btn-primary" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', border: 'none', background: '#d17d39', color: '#ffffff', transition: 'transform 0.15s, background-color 0.2s' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                        Legg til
                    </button>
                </form>

                {/* Task Rows List (Exact match to course signups items design) */}
                <div className="hkm-tasks-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 24px', background: 'var(--bg-main, #f8fafc)', borderRadius: '14px', border: '1.5px dashed #e2e8f0' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#fff7ed', color: '#d17d39', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', border: '1px solid #ffedd5' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>check_circle</span>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main, #1e293b)' }}>Ingen oppgaver i oppgavelisten</h4>
                            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>Når du legger til nye oppgaver, vil de vises her i sanntid.</p>
                        </div>
                    ) : (
                        filteredTasks.map(task => {
                            const prioColors = {
                                high: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Høy prio' },
                                medium: { bg: '#fff7ed', text: '#d97706', border: '#ffedd5', label: 'Medium prio' },
                                low: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', label: 'Lav prio' }
                            };
                            const prio = prioColors[task.priority] || prioColors.medium;
                            const comp = isCompleted(task);
                            const timeStr = getTimeAgo(task);

                            return (
                                <div key={task.id} className={`recent-signup-item ${comp ? 'completed' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-card, #ffffff)', border: '1.5px solid #f1f5f9', borderRadius: '14px', transition: 'all 0.2s ease', opacity: comp ? 0.65 : 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                                        {/* Avatar / Initial Circle for task check */}
                                        <label className="hkm-custom-cb" style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', color: '#d17d39', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #ffedd5', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={comp} 
                                                onChange={() => handleToggleComplete(task)}
                                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#d17d39' }} 
                                            />
                                        </label>

                                        <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main, #1e293b)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textDecoration: comp ? 'line-through' : 'none', color: comp ? 'var(--text-muted)' : 'var(--text-main)' }}>
                                                {task.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                Opprettet {timeStr || 'nylig'} • <span style={{ color: prio.text, fontWeight: 600 }}>{prio.label}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '12px' }}>
                                        {comp ? (
                                            <span className="status-pill status-completed" style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }}></span>
                                                FULLFØRT
                                            </span>
                                        ) : (
                                            <span className="status-pill status-active" style={{ background: '#fff7ed', color: '#c26d28', border: '1px solid #ffedd5', padding: '4px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d17d39' }}></span>
                                                AKTIV
                                            </span>
                                        )}
                                        <button 
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="delete-task-btn" 
                                            title="Slett oppgave" 
                                            style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', color: '#94a3b8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
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
