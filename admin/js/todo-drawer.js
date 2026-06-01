/**
 * HKM Studio - Universal Todo Drawer Module
 * Premium real-time sliding drawer for quick task management.
 * Adheres strictly to the 8px grid, Jitter Guard, and Defensiveness rules.
 * Material 3 and brand-aligned design.
 */

import '../css/todo-drawer.css';

(function () {
    if (window.__HKMTodoDrawerInitialized) return;
    window.__HKMTodoDrawerInitialized = true;

    console.log("[todo-drawer] Initializing Todo Drawer with Material 3 & Delegation...");

    // Module-scoped state for users and current tasks
    let systemAdmins = [];
    let currentTasksList = [];

    // Inject drawer HTML structure into body
    const injectDrawerHtml = () => {
        if (document.getElementById('todo-drawer-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'todo-drawer-overlay';
        overlay.className = 'todo-drawer-overlay';
        document.body.appendChild(overlay);

        const drawer = document.createElement('div');
        drawer.id = 'hkm-todo-drawer';
        drawer.className = 'hkm-todo-drawer';
        drawer.style.transform = 'translateX(100%) translateZ(0)';
        drawer.style.backfaceVisibility = 'hidden';
        
        drawer.innerHTML = `
            <div class="todo-drawer-header">
                <h3>
                    <span class="material-symbols-outlined">playlist_add_check</span>
                    Huskeliste
                </h3>
                <button id="todo-drawer-close-btn" class="todo-drawer-close" title="Lukk meny">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="todo-drawer-body">
                <!-- Quick Add Form - Vertically Stacked to Prevent Chrome Jitter -->
                <div class="todo-drawer-quick-add" style="transform: translateZ(0); backface-visibility: hidden;">
                    <div style="display: block !important; width: 100% !important;">
                        <label class="todo-quick-label" for="todo-quick-title">Ny oppgave *</label>
                        <input type="text" id="todo-quick-title" placeholder="Hva må gjøres?..." required autocomplete="off">
                    </div>
                    
                    <div style="display: block !important; width: 100% !important;">
                        <label class="todo-quick-label" for="todo-quick-priority">Prioritet</label>
                        <select id="todo-quick-priority">
                            <option value="low">Lav prioritet</option>
                            <option value="medium" selected>Medium prioritet</option>
                            <option value="high">Høy prioritet</option>
                        </select>
                    </div>

                    <div style="display: block !important; width: 100% !important;">
                        <label class="todo-quick-label" for="todo-quick-duedate">Forfallsdato</label>
                        <input type="date" id="todo-quick-duedate" title="Forfallsdato">
                    </div>

                    <div style="display: block !important; width: 100% !important;">
                        <label class="todo-quick-label" for="todo-quick-assignee">Tildel til</label>
                        <select id="todo-quick-assignee">
                            <option value="">Alle (Global oppgave)</option>
                            <!-- Populated dynamically with administrators -->
                        </select>
                    </div>

                    <button id="todo-quick-add-btn">
                        <span class="material-symbols-outlined">add</span>
                        Legg til oppgave
                    </button>
                </div>

                <!-- Active Tasks -->
                <div>
                    <h4 class="todo-drawer-list-title">Gjeldende oppgaver</h4>
                    <div id="todo-active-list" class="todo-drawer-list">
                        <div class="todo-drawer-empty">
                            <span class="material-symbols-outlined icon">sync</span>
                            <p>Henter oppgaver...</p>
                        </div>
                    </div>
                </div>

                <!-- Completed Tasks -->
                <div>
                    <h4 class="todo-drawer-list-title">Fullførte oppgaver</h4>
                    <div id="todo-completed-list" class="todo-drawer-list">
                        <div class="todo-drawer-empty" style="background: transparent; border: 1px dashed rgba(27, 73, 101, 0.08); box-shadow: none;">
                            <p style="font-size: 13px; color: #94a3b8;">Ingen fullførte oppgaver</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(drawer);
    };

    // Global toggle drawer helper
    const toggleDrawer = (force) => {
        const overlay = document.getElementById('todo-drawer-overlay');
        const drawer = document.getElementById('hkm-todo-drawer');
        if (!overlay || !drawer) return;

        const isActive = force !== undefined ? force : !drawer.classList.contains('active');
        drawer.classList.toggle('active', isActive);
        overlay.classList.toggle('active', isActive);

        if (isActive) {
            // Focus quick-title for seamless user flow
            setTimeout(() => {
                const titleInput = document.getElementById('todo-quick-title');
                if (titleInput) titleInput.focus();
            }, 200);
        }
    };

    // Setup Firestore listeners directly using global firebase
    const setupFirestoreSync = () => {
        if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function' || typeof firebase.firestore !== 'function') {
            console.warn("[todo-drawer] Firebase, Auth or Firestore was not loaded yet. Retrying in 100ms...");
            setTimeout(setupFirestoreSync, 100);
            return;
        }

        // Defensive: Check if Firebase default app has been initialized
        if (firebase.apps.length === 0) {
            console.warn("[todo-drawer] Firebase default app is not initialized yet. Retrying in 100ms...");
            setTimeout(setupFirestoreSync, 100);
            return;
        }

        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                // Not authenticated, hide dot
                updateBadgeDot(0);
                return;
            }

            console.log("[todo-drawer] User authenticated. Listening to tasks...");
            const db = firebase.firestore();

            // Fetch user directory for task delegation in real-time
            db.collection('users').get().then(snapshot => {
                systemAdmins = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.role === 'admin' || data.role === 'superadmin' || data.isAdmin) {
                        systemAdmins.push({
                            uid: doc.id,
                            displayName: data.displayName || data.email || 'Admin User'
                        });
                    }
                });

                // Populate the Assignee select element
                const assigneeSelect = document.getElementById('todo-quick-assignee');
                if (assigneeSelect) {
                    assigneeSelect.innerHTML = '<option value="">Alle (Global oppgave)</option>';
                    systemAdmins.forEach(admin => {
                        const option = document.createElement('option');
                        option.value = admin.uid;
                        option.textContent = admin.displayName;
                        assigneeSelect.appendChild(option);
                    });
                }

                // If tasks are already loaded, trigger re-render to map assignee names
                if (currentTasksList && currentTasksList.length > 0) {
                    renderTasks(currentTasksList, user.uid);
                }
            }).catch(err => {
                console.warn("[todo-drawer] Could not load users for delegation:", err);
            });
            
            // Listen to tasks collection in real-time
            db.collection('tasks').onSnapshot(snapshot => {
                const tasks = [];
                snapshot.forEach(doc => {
                    tasks.push({ id: doc.id, ...doc.data() });
                });

                currentTasksList = tasks;
                renderTasks(tasks, user.uid);
            }, error => {
                console.error("[todo-drawer] Firestore fetch error:", error);
            });
        });
    };

    // Update the notification badge next to the checklist icon
    const updateBadgeDot = (uncompletedCount) => {
        const badge = document.getElementById('todo-badge-dot');
        if (!badge) return;

        if (uncompletedCount > 0) {
            badge.textContent = uncompletedCount;
            badge.style.cssText = `
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: #d17d39 !important;
                color: white !important;
                font-size: 10px !important;
                font-weight: 700 !important;
                width: 18px !important;
                height: 18px !important;
                border-radius: 50% !important;
                position: absolute !important;
                top: -6px !important;
                right: -6px !important;
                border: 2px solid white !important;
                box-shadow: 0 2px 6px rgba(209, 125, 57, 0.3) !important;
                box-sizing: border-box !important;
                line-height: 1 !important;
                padding: 0 !important;
                text-align: center !important;
            `;
        } else {
            badge.style.display = 'none';
        }
    };

    // Render task items in active/completed sections
    const renderTasks = (tasks, userId) => {
        const activeList = document.getElementById('todo-active-list');
        const completedList = document.getElementById('todo-completed-list');
        if (!activeList || !completedList) return;

        // In-memory sorting and filtering
        // Show only tasks that are NOT archived, and belong to or are shared with this user
        const visibleTasks = tasks.filter(t => {
            if (t.status === 'arkivert') return false;
            
            // If task has specific assignment, only show to creator or assignee
            if (t.tildelt_til && t.tildelt_til.length > 0) {
                const assignees = Array.isArray(t.tildelt_til) ? t.tildelt_til : [t.tildelt_til];
                return assignees.includes(userId) || t.opprettet_av === userId;
            }
            return true; // Global tasks are visible to all admins
        });

        const activeTasks = visibleTasks
            .filter(t => t.status === 'gjeldende')
            .sort((a, b) => {
                const prioWeight = { high: 3, medium: 2, low: 1 };
                const aPrio = prioWeight[a.priority] || 2;
                const bPrio = prioWeight[b.priority] || 2;
                if (bPrio !== aPrio) return bPrio - aPrio;
                
                const aDate = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
                const bDate = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
                return aDate - bDate;
            });

        const completedTasks = visibleTasks
            .filter(t => t.status === 'fullført')
            .sort((a, b) => {
                const aTime = a.completed_at ? a.completed_at.seconds || new Date(a.completed_at).getTime() : 0;
                const bTime = b.completed_at ? b.completed_at.seconds || new Date(b.completed_at).getTime() : 0;
                return bTime - aTime; // Newest completed first
            });

        // Update badge count
        updateBadgeDot(activeTasks.length);

        // Render Active List
        if (activeTasks.length === 0) {
            activeList.innerHTML = `
                <div class="todo-drawer-empty">
                    <span class="material-symbols-outlined icon">verified</span>
                    <p>Ingen gjeldende oppgaver</p>
                    <span style="font-size: 12px; color: #94a3b8; display: block; margin-top: 4px;">Alt er unnagjort! Godt jobbet.</span>
                </div>
            `;
        } else {
            activeList.innerHTML = activeTasks.map(t => createTaskHtml(t, false)).join('');
        }

        // Render Completed List
        if (completedTasks.length === 0) {
            completedList.innerHTML = `
                <div class="todo-drawer-empty" style="background: transparent; border: 1px dashed rgba(27, 73, 101, 0.08); box-shadow: none; padding: 24px 16px;">
                    <span class="material-symbols-outlined icon" style="font-size: 32px; color: rgba(27, 73, 101, 0.15);">playlist_add_check</span>
                    <p style="font-size: 13px; color: #94a3b8;">Ingen fullførte oppgaver</p>
                </div>
            `;
        } else {
            completedList.innerHTML = completedTasks.map(t => createTaskHtml(t, true)).join('');
        }

        // Bind click events for toggle checkbox
        document.querySelectorAll('.todo-drawer-checkbox[data-task-id]').forEach(checkbox => {
            checkbox.onclick = async (e) => {
                e.stopPropagation();
                const taskId = checkbox.getAttribute('data-task-id');
                const isChecked = checkbox.classList.contains('checked');
                await toggleTaskStatus(taskId, isChecked);
            };
        });
    };

    // Generate HTML string for single task card
    const createTaskHtml = (t, isCompleted) => {
        const priorityLabels = { low: 'Lav prioritet', medium: 'Medium', high: 'Høy prioritet' };
        const priorityClass = `priority-${t.priority || 'medium'}`;
        const formattedDate = t.dueDate ? formatDate(t.dueDate) : '';

        // Assignee element mapping
        let assigneeHtml = '';
        if (t.tildelt_til && t.tildelt_til.length > 0) {
            const assigneeId = t.tildelt_til[0];
            const admin = systemAdmins.find(a => a.uid === assigneeId);
            const displayName = admin ? admin.displayName : 'Laster...';
            assigneeHtml = `
                <span class="todo-drawer-badge assignee" title="Tildelt: ${escapeHtml(displayName)}">
                    <span class="material-symbols-outlined" style="font-size: 13px;">account_circle</span>
                    ${escapeHtml(displayName)}
                </span>
            `;
        } else {
            assigneeHtml = `
                <span class="todo-drawer-badge assignee" style="background: #f1f5f9; color: #475569;" title="Global oppgave">
                    <span class="material-symbols-outlined" style="font-size: 13px;">group</span>
                    Alle (Global)
                </span>
            `;
        }

        return `
            <div class="todo-drawer-item ${isCompleted ? 'completed' : ''}" id="drawer-task-${t.id}">
                <div class="todo-drawer-checkbox ${isCompleted ? 'checked' : ''}" data-task-id="${t.id}" title="${isCompleted ? 'Marker som ugjort' : 'Fullfør oppgave'}">
                    ${isCompleted ? '<span class="material-symbols-outlined">check</span>' : ''}
                </div>
                <div class="todo-drawer-item-content">
                    <div class="todo-drawer-item-title">${escapeHtml(t.title || 'Uten tittel')}</div>
                    ${t.description ? `<div class="todo-drawer-item-desc">${escapeHtml(t.description)}</div>` : ''}
                    <div class="todo-drawer-item-meta">
                        <span class="todo-drawer-badge ${priorityClass}">
                            ${priorityLabels[t.priority] || 'Medium'}
                        </span>
                        ${formattedDate ? `
                            <span class="todo-drawer-badge due-date">
                                <span class="material-symbols-outlined" style="font-size: 13px;">calendar_today</span>
                                ${formattedDate}
                            </span>
                        ` : ''}
                        ${assigneeHtml}
                    </div>
                </div>
            </div>
        `;
    };

    // Toggle status in Firestore
    const toggleTaskStatus = async (taskId, currentCompleted) => {
        try {
            const db = firebase.firestore();
            const newStatus = currentCompleted ? 'gjeldende' : 'fullført';
            const updatePayload = {
                status: newStatus,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!currentCompleted) {
                updatePayload.completed_at = firebase.firestore.FieldValue.serverTimestamp();
            } else {
                updatePayload.completed_at = null;
            }

            await db.collection('tasks').doc(taskId).update(updatePayload);
            console.log(`[todo-drawer] Task ${taskId} status updated to ${newStatus}`);
        } catch (error) {
            console.error("[todo-drawer] Error toggling status:", error);
        }
    };

    // Quick add task action
    const handleQuickAdd = async () => {
        const titleInput = document.getElementById('todo-quick-title');
        const prioritySelect = document.getElementById('todo-quick-priority');
        const duedateInput = document.getElementById('todo-quick-duedate');
        const assigneeSelect = document.getElementById('todo-quick-assignee');
        const addBtn = document.getElementById('todo-quick-add-btn');

        if (!titleInput || !titleInput.value.trim()) return;

        const title = titleInput.value.trim();
        const priority = prioritySelect ? prioritySelect.value : 'medium';
        const dueDate = duedateInput ? duedateInput.value : '';
        const assignee = assigneeSelect ? assigneeSelect.value : '';

        // Disable button during execution
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 18px;">sync</span> Legger til...';
        }

        try {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) throw new Error("Du må være innlogget");

            const db = firebase.firestore();
            const newTask = {
                title,
                description: '',
                priority,
                status: 'gjeldende',
                dueDate,
                opprettet_av: currentUser.uid,
                tildelt_til: assignee ? [assignee] : [], // Array storage for sync consistency
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('tasks').add(newTask);
            
            // Reset input values
            titleInput.value = '';
            if (duedateInput) duedateInput.value = '';
            if (assigneeSelect) assigneeSelect.value = '';
            
            console.log("[todo-drawer] Task added successfully");
        } catch (error) {
            console.error("[todo-drawer] Error adding task:", error);
            alert("Kunne ikke opprette oppgaven: " + error.message);
        } finally {
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.innerHTML = '<span class="material-symbols-outlined">add</span> Legg til oppgave';
            }
        }
    };

    // HTML escape utility
    const escapeHtml = (str) => {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Date formatting helper
    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
        } catch (e) {
            return dateStr;
        }
    };

    // Event listener setup for buttons
    const bindUiEvents = () => {
        const overlay = document.getElementById('todo-drawer-overlay');
        const closeBtn = document.getElementById('todo-drawer-close-btn');
        const quickAddBtn = document.getElementById('todo-quick-add-btn');
        const quickTitleInput = document.getElementById('todo-quick-title');

        if (overlay) overlay.onclick = () => toggleDrawer(false);
        if (closeBtn) closeBtn.onclick = () => toggleDrawer(false);

        if (quickAddBtn) {
            quickAddBtn.onclick = handleQuickAdd;
        }

        if (quickTitleInput) {
            quickTitleInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    handleQuickAdd();
                }
            };
        }

        // Bind global shortcut toggle listeners
        document.addEventListener('click', (e) => {
            const shortcutBtn = e.target.closest('#todo-shortcut-btn');
            if (shortcutBtn) {
                e.preventDefault();
                e.stopPropagation();
                toggleDrawer();
            }
        });
    };

    // Initialize module
    const init = () => {
        injectDrawerHtml();
        bindUiEvents();
        setupFirestoreSync();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
