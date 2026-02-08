// Ebbinghaus forgetting curve intervals (in days)
        const REPETITION_INTERVALS = [1, 3, 7, 14, 30];

        let tasks = JSON.parse(localStorage.getItem('spacedTasks')) || [];

        // Initialize on load
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Loading tasks:', tasks.length);
            updateTodayDate();
            cleanupOldTasks(); // Clean up old completed tasks
            
            // Force check for scheduled tasks on page load
            checkScheduledTasks();
            
            // Render everything
            renderTasks();
            renderTodayPanel();
            
            // Log today's tasks for debugging
            const todayTasks = getTodayTasks();
            console.log('Tasks due today:', todayTasks.length);
            todayTasks.forEach(task => {
                console.log('- ', task.text, '(Review #' + task.repetitionIndex + ', due:', new Date(task.nextReview).toLocaleDateString() + ')');
            });
            
            // Check for scheduled tasks every hour
            setInterval(() => {
                console.log('Hourly check for scheduled tasks...');
                checkScheduledTasks();
            }, 3600000);
            
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
                // Only show study tasks
                if (!task.isStudyTask) return false;
                
                // For incomplete tasks: show if nextReview is today or earlier
                if (!task.completed) {
                    if (!task.nextReview) return false;
                    
                    const reviewDate = new Date(task.nextReview);
                    reviewDate.setHours(0, 0, 0, 0);
                    
                    return reviewDate <= today;
                }
                
                // For completed tasks: check if they were due today (using lastReviewDue)
                if (task.completed && task.completedAt) {
                    const completedDate = new Date(task.completedAt);
                    completedDate.setHours(0, 0, 0, 0);
                    
                    // Only show if completed today
                    if (completedDate.getTime() !== today.getTime()) {
                        return false;
                    }
                    
                    // Check if it was due today using lastReviewDue
                    if (task.lastReviewDue) {
                        const dueDateWas = new Date(task.lastReviewDue);
                        dueDateWas.setHours(0, 0, 0, 0);
                        return dueDateWas <= today;
                    }
                    
                    // Fallback: if no lastReviewDue, assume it was due today if completed today
                    return true;
                }
                
                return false;
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
                // For completed tasks, use lastReviewDue to show when they were originally due
                const dueDateToShow = (task.completed && task.lastReviewDue) ? task.lastReviewDue : task.nextReview;
                
                const reviewDate = new Date(dueDateToShow);
                reviewDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysOverdue = Math.floor((today - reviewDate) / (1000 * 60 * 60 * 24));
                const isOverdue = daysOverdue > 0;
                
                let statusText = '✓ Due today';
                if (isOverdue) {
                    statusText = daysOverdue === 1 ? '⚠️ 1 day overdue' : `⚠️ ${daysOverdue} days overdue`;
                }
                
                // Show which review this was (use repetitionIndex-1 for completed to show what they just finished)
                const reviewLabel = task.completed && task.repetitionIndex > 0 
                    ? getRepetitionLabel(task.repetitionIndex - 1) 
                    : getRepetitionLabel(task.repetitionIndex);
                
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
                                <span class="today-task-badge">${reviewLabel}</span>
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
            
            checkScheduledTasks();
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

            const task = {
                id: Date.now(),
                text: taskText,
                isStudyTask: isStudyTask,
                completed: false,
                createdAt: new Date().toISOString(),
                repetitionIndex: 0,
                nextReview: isStudyTask ? calculateNextReview(0) : null,
                history: []
            };

            tasks.unshift(task);
            saveTasks();
            renderTasks();

            // Clear inputs
            input.value = '';
            document.getElementById('studyTaskCheck').checked = false;
            input.focus();
        }

        function calculateNextReview(repetitionIndex) {
            if (repetitionIndex >= REPETITION_INTERVALS.length) return null;
            
            const days = REPETITION_INTERVALS[repetitionIndex];
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + days);
            return nextDate.toISOString();
        }

        function checkScheduledTasks() {
            // This function just triggers a re-render to show due tasks
            // We don't create new task instances anymore - the side panel
            // will show the original tasks that are due for review
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let dueTasks = 0;
            tasks.forEach(task => {
                if (task.isStudyTask && task.nextReview && !task.completed) {
                    const reviewDate = new Date(task.nextReview);
                    reviewDate.setHours(0, 0, 0, 0);
                    
                    if (reviewDate <= today) {
                        dueTasks++;
                    }
                }
            });
            
            if (dueTasks > 0) {
                console.log(`Found ${dueTasks} task(s) due for review today`);
                renderTasks();
                renderTodayPanel();
            }
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
                const wasCompleted = task.completed;
                task.completed = !task.completed;
                
                if (task.completed) {
                    task.completedAt = new Date().toISOString();
                    
                    // If this is a study task, schedule the next review
                    if (task.isStudyTask) {
                        // Store the original due date before rescheduling
                        task.lastReviewDue = task.nextReview;
                        
                        if (task.repetitionIndex < REPETITION_INTERVALS.length) {
                            task.repetitionIndex++;
                            task.nextReview = calculateNextReview(task.repetitionIndex);
                            console.log(`✓ "${task.text}" completed. Next review (${getRepetitionLabel(task.repetitionIndex)}) scheduled for ${formatDate(task.nextReview)}`);
                        } else {
                            console.log(`🎉 "${task.text}" mastered! All reviews completed.`);
                            task.nextReview = null; // No more reviews needed
                        }
                    }
                } else {
                    // Task unchecked
                    delete task.completedAt;
                    
                    // If it's a study task, revert to previous review state
                    if (task.isStudyTask && wasCompleted) {
                        if (task.repetitionIndex > 0) {
                            task.repetitionIndex--;
                            // Restore the previous due date if available
                            if (task.lastReviewDue) {
                                task.nextReview = task.lastReviewDue;
                                delete task.lastReviewDue;
                            } else {
                                task.nextReview = calculateNextReview(task.repetitionIndex);
                            }
                            console.log(`↩️ "${task.text}" unchecked. Review reverted to ${getRepetitionLabel(task.repetitionIndex)}`);
                        }
                    }
                }
                
                saveTasks();
                renderTasks();
            }
        }

        function deleteTask(id) {
            tasks = tasks.filter(t => t.id !== id);
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

            // Filter tasks to show only active and today's completed tasks
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const visibleTasks = tasks.filter(task => {
                // Always show incomplete tasks
                if (!task.completed) return true;
                
                // For completed tasks, only show if completed today
                const completedDate = new Date(task.completedAt || task.createdAt);
                completedDate.setHours(0, 0, 0, 0);
                
                return completedDate.getTime() === today.getTime();
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
                return new Date(b.createdAt) - new Date(a.createdAt);
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
                                <span class="task-date">${formatDate(task.createdAt)}</span>
                                ${task.isStudyTask && task.nextReview && !task.completed ? 
                                    `<span class="repetition-info">${getRepetitionLabel(task.repetitionIndex)} · ${formatDate(task.nextReview)}</span>` 
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
