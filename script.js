// Ebbinghaus forgetting curve intervals (in days)
const REPETITION_INTERVALS = [1, 3, 7, 14, 30];

let tasks = JSON.parse(localStorage.getItem('spacedTasks')) || [];
const CONFETTI_KEY = 'mindSnapConfettiDay';

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

function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseLocalDateString(dateString) {
    if (!dateString) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return null;

    return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
}

function getTodayTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = getLocalDateString(today);

    return tasks.filter(task => {
        if (!task.isStudyTask || !task.isReviewInstance) return false;
        if (!task.dueDate) return false;

        const dueDate = parseLocalDateString(task.dueDate);
        if (!dueDate) return false;

        const dueDateKey = getLocalDateString(dueDate);
        return dueDateKey <= todayKey;
    });
}

function getMainTasksForToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter(task => {
        if (task.isReviewInstance) return false;

        if (!task.completed) return true;

        if (task.completedAt) {
            const completedDate = new Date(task.completedAt);
            completedDate.setHours(0, 0, 0, 0);
            return completedDate.getTime() === today.getTime();
        }

        return false;
    });
}

function getStudyTaskStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasksScheduledToday = tasks.filter(task => {
        if (!task.isStudyTask || !task.isReviewInstance || !task.dueDate) return false;

        const dueDate = parseLocalDateString(task.dueDate);
        if (!dueDate) return false;

        const dueDateKey = getLocalDateString(dueDate);
        const todayKey = getLocalDateString(today);

        return dueDateKey <= todayKey;
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

    const buildStatusText = (task) => {
        const dueDate = parseLocalDateString(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;

        if (task.completed) {
            return `✓ ${getRepetitionLabel(task.repetitionIndex)} complete`;
        }

        if (diffDays === 0) {
            return `${getRepetitionLabel(task.repetitionIndex)} due today`;
        }

        if (diffDays > 0) {
            return diffDays === 1
                ? `${getRepetitionLabel(task.repetitionIndex)} 1 day overdue`
                : `${getRepetitionLabel(task.repetitionIndex)} ${diffDays} days overdue`;
        }

        return `${getRepetitionLabel(task.repetitionIndex)} due ${formatDate(task.dueDate)}`;
    };

    if (incompleteTasks.length === 0 && todayTasks.length > 0) {
        todayTasksList.innerHTML = todayTasks.map(task => {
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
                                    ${buildStatusText(task)}
                                </div>
                            </div>
                        </div>
                    `;
        }).join('');
        return;
    }

    todayTasksList.innerHTML = todayTasks.map(task => {
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
                                ${buildStatusText(task)}
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

    const task = {
        id: Date.now(),
        text: taskText,
        isStudyTask: isStudyTask,
        completed: false,
        createdAt: new Date().toISOString(),
        repetitionIndex: 0,
        dueDate: getLocalDateString(new Date()),
        isReviewInstance: false
    };

    tasks.unshift(task);
    saveTasks();
    renderTasks();

    // Clear inputs
    input.value = '';
    document.getElementById('studyTaskCheck').checked = false;
    input.focus();

    if (isStudyTask) {
        console.log(`📚 Created study task "${taskText}" - 1st Review due today`);
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
            console.log(`✓ "${task.text}" marked as complete`);

            // If this is a study task and not yet mastered, schedule the next review
            if (task.isStudyTask && task.repetitionIndex < REPETITION_INTERVALS.length) {
                const isReviewInstance = task.isReviewInstance;
                const nextIndex = isReviewInstance ? task.repetitionIndex + 1 : task.repetitionIndex;
                const daysToAdd = REPETITION_INTERVALS[nextIndex];

                const nextReviewDate = new Date();
                nextReviewDate.setHours(0, 0, 0, 0);
                nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

                // Create the next review instance
                const nextReview = {
                    id: Date.now() + Math.random(),
                    text: task.text,
                    isStudyTask: true,
                    completed: false,
                    createdAt: new Date().toISOString(),
                    repetitionIndex: nextIndex,
                    dueDate: getLocalDateString(nextReviewDate),
                    isReviewInstance: true,
                    parentTaskId: task.id
                };

                tasks.push(nextReview);
                console.log(`📅 Next review (${getRepetitionLabel(nextIndex)}) scheduled for ${formatDate(nextReviewDate.toISOString())}`);
            } else if (task.isStudyTask && task.repetitionIndex >= REPETITION_INTERVALS.length) {
                console.log(`🎉 "${task.text}" mastered! All reviews completed.`);
            }
        } else {
            delete task.completedAt;
            console.log(`↩️ "${task.text}" marked as incomplete`);

            // If unchecking a completed study task, remove any future reviews that were created
            if (task.isStudyTask && wasCompleted) {
                const relatedNextReview = tasks.find(t =>
                    t.text === task.text &&
                    t.parentTaskId === task.id &&
                    !t.completed
                );

                if (relatedNextReview) {
                    tasks = tasks.filter(t => t.id !== relatedNextReview.id);
                    console.log(`🗑️ Removed scheduled ${getRepetitionLabel(relatedNextReview.repetitionIndex)}`);
                }
            }
        }

        saveTasks();
        renderTasks();
    }
}

function deleteTask(id) {
    const task = tasks.find(t => t.id === id);

    if (task && task.isStudyTask) {
        // Find all review instances of this task (same text, not completed)
        const allReviews = tasks.filter(t =>
            t.text === task.text &&
            t.isStudyTask &&
            !t.completed
        );

        if (allReviews.length > 1) {
            // Ask if they want to delete all future reviews too
            if (confirm(`Delete all ${allReviews.length} review instances (including future) of "${task.text}"?`)) {
                // Delete all reviews with this text
                tasks = tasks.filter(t => !(t.text === task.text && t.isStudyTask && !t.completed));
                console.log(`🗑️ Deleted all reviews for "${task.text}"`);
            } else {
                // Just delete this one
                tasks = tasks.filter(t => t.id !== id);
                console.log(`🗑️ Deleted one review instance`);
            }
        } else {
            // Only one instance, just delete it
            tasks = tasks.filter(t => t.id !== id);
        }
    } else {
        // Regular task, just delete
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visibleTasks = getMainTasksForToday();

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

    // Sort: incomplete first, then by due date/creation date
    const sortedTasks = [...visibleTasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;

        // Sort by due date for review instances, creation date for regular tasks
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date(a.createdAt);
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date(b.createdAt);
        return dateA - dateB; // Earlier dates first
    });

    tasksList.innerHTML = sortedTasks.map(task => {
        const isEditing = editingTaskId === task.id;

        // Determine what date to show
        let displayDate = task.createdAt;
        let dateLabel = '';

        if (task.dueDate) {
            const dueDate = parseLocalDateString(task.dueDate);
            const diffDays = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;

            if (diffDays === 0) {
                dateLabel = 'Due today';
            } else if (diffDays > 0) {
                dateLabel = diffDays === 1 ? '1 day overdue' : `${diffDays} days overdue`;
            } else {
                dateLabel = formatDate(task.dueDate);
            }
        } else {
            dateLabel = formatDate(task.createdAt);
        }

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
                                <span class="task-date">${dateLabel}</span>
                                ${task.isStudyTask && !task.completed ?
                `<span class="repetition-info">${getRepetitionLabel(task.repetitionIndex)}</span>`
                : ''}
                                ${task.isStudyTask && task.completed ?
                `<span class="repetition-info">✓ Completed</span>`
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

    maybeCelebrateDayCompletion();

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

function maybeCelebrateDayCompletion() {
    const today = new Date().toISOString().slice(0, 10);
    const lastCelebration = localStorage.getItem(CONFETTI_KEY);

    if (lastCelebration === today) return;

    const dailyTasks = getMainTasksForToday();
    const reviewTasks = getTodayTasks();
    const totalTasksForDay = dailyTasks.length + reviewTasks.length;

    if (totalTasksForDay === 0) return;

    const allDone = dailyTasks.every(task => task.completed) && reviewTasks.every(task => task.completed);
    if (!allDone) return;

    localStorage.setItem(CONFETTI_KEY, today);
    showConfetti();
}

function showConfetti() {
    const overlay = document.createElement('div');
    overlay.className = 'confetti-overlay';

    const colors = ['#ffd787', '#6ad8ff', '#ff6f91', '#8b5cf6', '#34d399'];

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = `${Math.random() * 0.7}s`;
        piece.style.animationDuration = `${1.2 + Math.random() * 1.4}s`;
        piece.style.transform = `translateY(-20px) rotate(${Math.random() * 360}deg)`;
        overlay.appendChild(piece);
    }

    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.remove();
    }, 3200);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}