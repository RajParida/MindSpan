// Ebbinghaus forgetting curve intervals (in days)
        const REPETITION_INTERVALS = [1, 3, 7, 14, 30];

        let tasks = JSON.parse(localStorage.getItem('spacedTasks')) || [];

        // Initialize on load
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Loading tasks:', tasks.length);
            updateTodayDate();
            cleanupOldTasks(); // Clean up old completed tasks
            
            // Render everything
            renderTasks();
            renderTodayPanel();
            
            // Log today's tasks for debugging
            const todayTasks = getTodayTasks();
            console.log('Tasks due today:', todayTasks.length);
            todayTasks.forEach(task => {
                console.log('- ', task.text, '(Review:', getRepetitionLabel(task.repetitionIndex), ', due:', new Date(task.dueDate).toLocaleDateString() + ')');
            });
            
            // Clean up old tasks once per day (every 24 hours)
            setInterval(cleanupOldTasks, 86400000);
        });

        function updateTodayDate() {
            const todayDateElement = document.getElementById('todayDate');
            const today = new Date();
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            todayDateElement.textContent = today.toLocaleDateString('en-US', options);
        }

        function isSameDay(date1, date2) {
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        }

        function getTodayTasks() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            return tasks.filter(task => {
                // Only show study task review instances
                if (!task.isReviewInstance) return false;
                
                if (!task.dueDate) return false;
                
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                // Show if due today or earlier (overdue)
                return dueDate <= today;
            });
        }

        function getStudyTaskStats() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get all tasks scheduled for review today (due or overdue)
            const tasksScheduledToday = tasks.filter(task => {
                if (!task.isStudyTask || !task.nextReview) return false;
                
                const reviewDate = new Date(task.nextReview);
                reviewDate.setHours(0, 0, 0, 0);
                
                // Include tasks due today or overdue
                return reviewDate <= today;
            });
            
            // Count how many of today's scheduled tasks are completed
            const completedToday = tasksScheduledToday.filter(task => task.completed).length;
            
            return {
                total: tasksScheduledToday.length,
                completed: completedToday
            };
        }

        function renderTodayPanel() {
            const todayTasksList = document.getElementById('todayTasksList');
            const totalStudyTasksEl = document.getElementById('totalStudyTasks');
            const completedReviewsEl = document.getElementById('completedReviews');
            const progressSection = document.getElementById('progressSection');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            const todayTasks = getTodayTasks();
            const stats = getStudyTaskStats();
            
            // Update stats
            totalStudyTasksEl.textContent = stats.total;
            completedReviewsEl.textContent = stats.completed;
            
            // Update progress bar
            if (stats.total > 0) {
                const percentage = Math.round((stats.completed / stats.total) * 100);
                progressSection.style.display = 'block';
                progressFill.style.width = percentage + '%';
                progressText.textContent = `${percentage}% complete`;
                
                if (percentage === 100) {
                    progressText.textContent = '🎉 All reviews complete!';
                }
            } else {
                progressSection.style.display = 'none';
            }
            
            console.log('📅 Today\'s reviews:', todayTasks.length, 'total (', stats.completed, 'completed,', (stats.total - stats.completed), 'remaining)');
            
            const incompleteTasks = todayTasks.filter(t => !t.completed);
            
            if (todayTasks.length === 0) {
                todayTasksList.innerHTML = `
                    <div class="empty-today">
                        <div class="empty-today-icon">✨</div>
                        <p class="empty-today-text">No reviews scheduled for today.<br>Keep up the great work!</p>
                    </div>
                `;
                return;
            }
            
            if (incompleteTasks.length === 0 && todayTasks.length > 0) {
                // All tasks are completed
                todayTasksList.innerHTML = todayTasks.map(task => {
                    const reviewDate = new Date(task.nextReview);
                    reviewDate.setHours(0, 0, 0, 0);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysOverdue = Math.floor((today - reviewDate) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysOverdue > 0;
                    
                    let statusText = '✓ Due today';
                    if (isOverdue) {
                        statusText = daysOverdue === 1 ? '⚠️ 1 day overdue' : `⚠️ ${daysOverdue} days overdue`;
                    }
                    
                    return `
                        <div class="today-task-item ${task.completed ? 'completed' : ''}">
                            <label class="today-task-checkbox">
                                <input 
                                    type="checkbox" 
                                    ${task.completed ? 'checked="checked"' : ''}
                                    onchange="toggleTask(${task.id})"
                                    onclick="event.stopPropagation()"
                                >
                                <span class="today-checkmark"></span>
                            </label>
                            <div class="today-task-content" onclick="scrollToTask(${task.id})">
                                <div class="today-task-header">
                                    <div class="today-task-text">${escapeHtml(task.text)}</div>
                                    <span class="today-task-badge">${getRepetitionLabel(task.repetitionIndex)}</span>
                                </div>
                                <div class="today-task-time">
                                    ${statusText}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                return;
            }

            todayTasksList.innerHTML = todayTasks.map(task => {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                const isOverdue = daysOverdue > 0;
                
                let statusText = '✓ Due today';
                if (isOverdue) {
                    statusText = daysOverdue === 1 ? '⚠️ 1 day overdue' : `⚠️ ${daysOverdue} days overdue`;
                }
                
                return `
                    <div class="today-task-item ${task.completed ? 'completed' : ''}">
                        <label class="today-task-checkbox">
                            <input 
                                type="checkbox" 
                                ${task.completed ? 'checked="checked"' : ''}
                                onchange="toggleTask(${task.id})"
                                onclick="event.stopPropagation()"
                            >
                            <span class="today-checkmark"></span>
                        </label>
                        <div class="today-task-content" onclick="scrollToTask(${task.id})">
                            <div class="today-task-header">
                                <div class="today-task-text">${escapeHtml(task.text)}</div>
                                <span class="today-task-badge">${getRepetitionLabel(task.repetitionIndex)}</span>
                            </div>
                            <div class="today-task-time">
                                ${statusText}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function scrollToTask(taskId) {
            const taskElements = document.querySelectorAll('.task-item');
            taskElements.forEach(el => {
                const checkbox = el.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.onchange) {
                    const onchangeStr = checkbox.getAttribute('onchange');
                    if (onchangeStr && onchangeStr.includes(taskId.toString())) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.style.animation = 'none';
                        setTimeout(() => {
                            el.style.animation = '';
                            el.style.boxShadow = '0 0 0 3px rgba(193, 125, 58, 0.3)';
                            setTimeout(() => {
                                el.style.boxShadow = '';
                            }, 2000);
                        }, 10);
                    }
                }
            });
        }

        function manualRefresh() {
            console.log('Manual refresh triggered');
            const btn = document.querySelector('.refresh-btn');
            btn.classList.add('spinning');
            
            renderTasks();
            renderTodayPanel();
            
            setTimeout(() => {
                btn.classList.remove('spinning');
            }, 500);
        }

        // Helper function to reset all tasks (for debugging)
        function resetAllTasks() {
            if (confirm('This will uncheck all completed tasks. Continue?')) {
                tasks.forEach(task => task.completed = false);
                saveTasks();
                renderTasks();
            }
        }

        // Add task on Enter key
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        function addTask() {
            const input = document.getElementById('taskInput');
            const isStudyTask = document.getElementById('studyTaskCheck').checked;
            const taskText = input.value.trim();

            if (!taskText) return;

            // If it's a study task, create all review instances upfront
            if (isStudyTask) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                let accumulatedDays = 0;
                
                // Create review tasks for each interval
                REPETITION_INTERVALS.forEach((days, index) => {
                    accumulatedDays += days;
                    const dueDate = new Date(now);
                    dueDate.setDate(dueDate.getDate() + accumulatedDays);
                    
                    const reviewTask = {
                        id: Date.now() + Math.random(),
                        text: taskText,
                        isStudyTask: true,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        repetitionIndex: index,
                        dueDate: dueDate.toISOString(),
                        isReviewInstance: true
                    };
                    
                    tasks.push(reviewTask);
                });
                
                console.log(`📚 Created study task "${taskText}" with ${REPETITION_INTERVALS.length} review instances`);
            } else {
                // Regular task - just add it
                const task = {
                    id: Date.now(),
                    text: taskText,
                    isStudyTask: false,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    isReviewInstance: false
                };
                tasks.unshift(task);
            }

            saveTasks();
            renderTasks();

            // Clear inputs
            input.value = '';
            document.getElementById('studyTaskCheck').checked = false;
            input.focus();
        }

        function cleanupOldTasks() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Remove completed tasks that were completed before yesterday
            const initialLength = tasks.length;
            tasks = tasks.filter(task => {
                if (!task.completed) return true; // Keep all incomplete tasks
                
                const completedDate = new Date(task.completedAt || task.createdAt);
                completedDate.setHours(0, 0, 0, 0);
                
                // Keep if completed today or yesterday, remove older completed tasks
                return completedDate >= yesterday;
            });
            
            if (tasks.length !== initialLength) {
                console.log(`Cleaned up ${initialLength - tasks.length} old completed tasks`);
                saveTasks();
            }
        }

        function toggleTask(id) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                
                if (task.completed) {
                    task.completedAt = new Date().toISOString();
                    console.log(`✓ "${task.text}" marked as complete`);
                } else {
                    delete task.completedAt;
                    console.log(`↩️ "${task.text}" marked as incomplete`);
                }
                
                saveTasks();
                renderTasks();
            }
        }

        function deleteTask(id) {
            // If deleting a review instance, ask if they want to delete all related reviews
            const task = tasks.find(t => t.id === id);
            if (task && task.isReviewInstance) {
                const relatedTasks = tasks.filter(t => t.text === task.text && t.isReviewInstance);
                if (relatedTasks.length > 1) {
                    if (confirm(`Delete all ${relatedTasks.length} review instances of "${task.text}"?`)) {
                        tasks = tasks.filter(t => !(t.text === task.text && t.isReviewInstance));
                    } else {
                        tasks = tasks.filter(t => t.id !== id);
                    }
                } else {
                    tasks = tasks.filter(t => t.id !== id);
                }
            } else {
                tasks = tasks.filter(t => t.id !== id);
            }
            saveTasks();
            renderTasks();
        }

        let editingTaskId = null;

        function editTask(id) {
            if (editingTaskId !== null) {
                cancelEdit();
            }
            editingTaskId = id;
            renderTasks();
        }

        function saveEdit(id, newText) {
            const task = tasks.find(t => t.id === id);
            if (task && newText.trim()) {
                task.text = newText.trim();
                saveTasks();
            }
            editingTaskId = null;
            renderTasks();
        }

        function cancelEdit() {
            editingTaskId = null;
            renderTasks();
        }

        function clearAll() {
            if (tasks.length === 0) return;
            if (confirm('Are you sure you want to clear all tasks?')) {
                tasks = [];
                saveTasks();
                renderTasks();
            }
        }

        function saveTasks() {
            localStorage.setItem('spacedTasks', JSON.stringify(tasks));
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = date - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays === -1) return 'Yesterday';
            if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
            if (diffDays > 0) return `in ${diffDays} days`;

            return date.toLocaleDateString();
        }

        function getRepetitionLabel(index) {
            const labels = ['1st Review', '2nd Review', '3rd Review', '4th Review', '5th Review', 'Mastered'];
            return labels[index] || 'Review';
        }

        function renderTasks() {
            const tasksList = document.getElementById('tasksList');
            const taskCount = document.getElementById('taskCount');

            if (tasks.length === 0) {
                tasksList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✦</div>
                        <p class="empty-state-text">Your tasks will appear here</p>
                    </div>
                `;
                taskCount.textContent = '0 tasks';
                return;
            }

            // Filter tasks to show
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const visibleTasks = tasks.filter(task => {
                // Regular tasks (not review instances) - always show if incomplete
                if (!task.isReviewInstance) {
                    if (!task.completed) return true;
                    
                    // Show completed regular tasks only if completed today
                    if (task.completedAt) {
                        const completedDate = new Date(task.completedAt);
                        completedDate.setHours(0, 0, 0, 0);
                        return completedDate.getTime() === today.getTime();
                    }
                    return false;
                }
                
                // Review instances - only show if due today or overdue
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    
                    // Show if due today or earlier (overdue)
                    if (dueDate <= today) {
                        // If completed, only show if completed today
                        if (task.completed && task.completedAt) {
                            const completedDate = new Date(task.completedAt);
                            completedDate.setHours(0, 0, 0, 0);
                            return completedDate.getTime() === today.getTime();
                        }
                        return true;
                    }
                }
                
                return false;
            });

            if (visibleTasks.length === 0) {
                tasksList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✨</div>
                        <p class="empty-state-text">No tasks for today.<br>Start fresh with a clean slate!</p>
                    </div>
                `;
                taskCount.textContent = '0 tasks';
                return;
            }

            // Sort: incomplete first, then by date
            const sortedTasks = [...visibleTasks].sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                
                // Sort by due date for review instances, creation date for regular tasks
                const dateA = a.dueDate ? new Date(a.dueDate) : new Date(a.createdAt);
                const dateB = b.dueDate ? new Date(b.dueDate) : new Date(b.createdAt);
                return dateB - dateA;
            });

            tasksList.innerHTML = sortedTasks.map(task => {
                const isEditing = editingTaskId === task.id;
                
                return `
                <div class="task-item ${task.isStudyTask ? 'study-task' : ''} ${task.completed === true ? 'completed' : ''} ${isEditing ? 'editing' : ''}" 
                     style="animation-delay: ${visibleTasks.indexOf(task) * 0.05}s">
                    <label class="custom-checkbox task-checkbox">
                        <input 
                            type="checkbox" 
                            ${task.completed === true ? 'checked="checked"' : ''}
                            onchange="toggleTask(${task.id})"
                            ${isEditing ? 'disabled' : ''}
                        >
                        <span class="checkmark"></span>
                    </label>
                    <div class="task-content">
                        ${isEditing ? `
                            <input 
                                type="text" 
                                class="task-edit-input" 
                                value="${escapeHtml(task.text)}"
                                id="edit-input-${task.id}"
                                onkeypress="if(event.key === 'Enter') saveEdit(${task.id}, this.value)"
                                onkeydown="if(event.key === 'Escape') cancelEdit()"
                                autofocus
                            >
                            <div class="task-edit-actions">
                                <button class="btn-small btn-save" onclick="saveEdit(${task.id}, document.getElementById('edit-input-${task.id}').value)">
                                    Save
                                </button>
                                <button class="btn-small btn-cancel" onclick="cancelEdit()">
                                    Cancel
                                </button>
                            </div>
                        ` : `
                            <div class="task-text">${escapeHtml(task.text)}</div>
                            <div class="task-meta">
                                <span class="task-date">${task.dueDate ? formatDate(task.dueDate) : formatDate(task.createdAt)}</span>
                                ${task.isStudyTask && !task.completed ? 
                                    `<span class="repetition-info">${getRepetitionLabel(task.repetitionIndex)}</span>` 
                                    : ''}
                                ${task.isStudyTask && task.completed ? 
                                    `<span class="repetition-info">Completed</span>` 
                                    : ''}
                            </div>
                        `}
                    </div>
                    ${!isEditing ? `
                        <div class="task-actions">
                            <button class="icon-btn edit" onclick="editTask(${task.id})" title="Edit task">
                                ✎
                            </button>
                            <button class="icon-btn delete" onclick="deleteTask(${task.id})" title="Delete task">
                                ✕
                            </button>
                        </div>
                    ` : ''}
                </div>
            `}).join('');

            const activeCount = visibleTasks.filter(t => !t.completed).length;
            const completedCount = visibleTasks.filter(t => t.completed).length;
            taskCount.textContent = `${activeCount} active${completedCount ? `, ${completedCount} completed today` : ''}`;

            // Auto-focus edit input if in edit mode
            if (editingTaskId !== null) {
                setTimeout(() => {
                    const editInput = document.getElementById(`edit-input-${editingTaskId}`);
                    if (editInput) {
                        editInput.focus();
                        editInput.select();
                    }
                }, 50);
            }

            // Update today panel
            renderTodayPanel();
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
