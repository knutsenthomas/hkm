/**
 * HKM Studio - Universal Todo Drawer Module
 * Premium real-time sliding drawer for quick task management.
 * Adheres strictly to the 8px grid, Jitter Guard, and Defensiveness rules.
 */

import '../css/todo-drawer.css';

(function () {
    if (window.__HKMTodoDrawerInitialized) return;
    window.__HKMTodoDrawerInitialized = true;

    console.log("[todo-drawer] Initializing Todo Drawer...");

    // Inject drawer HTML structure into body

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
                <!-- Quick Add Form -->
                <div class="todo-drawer-quick-add">
                    <input type="text" id="todo-quick-title" placeholder="Hva må gjøres?..." required autocomplete="off">
                    <div class="todo-quick-add-row">
                        <select id="todo-quick-priority">
                            <option value="low">Lav prioritet</option>
                            <option value="medium" selected>Medium prioritet</option>
                            <option value="high">Høy prioritet</option>
                        </select>
                        <input type="date" id="todo-quick-duedate" title="Forfallsdato">
                    </div>
                    <button id="todo-quick-add-btn">
                        <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
                        Legg til oppgave
                    </button>
                </div>

                <!-- Active Tasks -->
                <div>
                    <h4 class="todo-drawer-list-title">Gjeldende oppgaver</h4>
                    <div id="todo-active-list" class="todo-drawer-list" style="margin-top: 12px;">
                        <!-- Injected dynamically -->
                    </div>
                </div>

                <!-- Completed Tasks -->
                <div>
                    <h4 class="todo-drawer-list-title">Fullførte oppgaver</h4>
                    <div id="todo-completed-list" class="todo-drawer-list" style="margin-top: 12px;">
                        <!-- Injected dynamically -->
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

    // Firebase Wait helper
    const waitForFirebase = async (timeoutMs = 10000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (window.firebaseService && window.firebaseService.isInitialized) {
                return window.firebaseService;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return window.firebaseService || null;
    };

    // Setup Firestore listeners
    const setupFirestoreSync = async () => {
        const service = await waitForFirebase();
        if (!service) {
            console.warn("[todo-drawer] Firebase was not loaded. Realtime tasks disabled.");
            return;
        }

        service.onAuthChange(user => {
            if (!user) {
                // Not authenticated, hide dot
                updateBadgeDot(0);
                return;
            }

            const db = firebase.firestore();
            
            // Listen to tasks collection in real-time
            // Filtering in-memory to prevent missing Firestore index warnings
            db.collection('tasks').onSnapshot(snapshot => {
                const tasks = [];
                snapshot.forEach(doc => {
                    tasks.push({ id: doc.id, ...doc.data() });
                });

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
            badge.style.display = 'block';
            badge.textContent = uncompletedCount;
            badge.style.cssText = `
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: #d17d39 !important;
                color: white !important;
                font-size: 10px !important;
                font-weight: 700 !important;
                width: 16px !important;
                height: 16px !important;
                border-radius: 50% !important;
                position: absolute !important;
                top: -4px !important;
                right: -4px !important;
                border: 2px solid white !important;
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
                // Sort by priority (high > medium > low), then by duedate
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
                </div>
            `;
        } else {
            activeList.innerHTML = activeTasks.map(t => createTaskHtml(t, false)).join('');
        }

        // Render Completed List
        if (completedTasks.length === 0) {
            completedList.innerHTML = `
                <div class="todo-drawer-empty" style="padding: 24px 12px;">
                    <p style="font-size: 13px;">Ingen fullførte oppgaver ennå</p>
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
        const priorityLabels = { low: 'Lav', medium: 'Med', high: 'Høy' };
        const priorityClass = `priority-${t.priority || 'medium'}`;
        const formattedDate = t.dueDate ? formatDate(t.dueDate) : '';

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
                                <span class="material-symbols-outlined" style="font-size: 14px;">calendar_today</span>
                                ${formattedDate}
                            </span>
                        ` : ''}
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
        const addBtn = document.getElementById('todo-quick-add-btn');

        if (!titleInput || !titleInput.value.trim()) return;

        const title = titleInput.value.trim();
        const priority = prioritySelect ? prioritySelect.value : 'medium';
        const dueDate = duedateInput ? duedateInput.value : '';

        // Disable button during execution
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" style="font-size: 18px;">sync</span> Legger til...';
        }

        try {
            const service = window.firebaseService;
            const currentUser = service?.auth?.currentUser;
            if (!currentUser) throw new Error("Du må være innlogget");

            const db = firebase.firestore();
            const newTask = {
                title,
                description: '',
                priority,
                status: 'gjeldende',
                dueDate,
                opprettet_av: currentUser.uid,
                tildelt_til: [], // Global to all admins
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('tasks').add(newTask);
            
            // Reset input values
            titleInput.value = '';
            if (duedateInput) duedateInput.value = '';
            
            console.log("[todo-drawer] Task added successfully");
        } catch (error) {
            console.error("[todo-drawer] Error adding task:", error);
            alert("Kunne ikke opprette oppgaven: " + error.message);
        } finally {
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">add</span> Legg til oppgave';
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

        // Bind global shortcut toggle listeners (delegate to document to handle dynamically loaded triggers)
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
        setupFirestoreSync().catch(err => {
            console.error("[todo-drawer] Firestore init failed:", err);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
