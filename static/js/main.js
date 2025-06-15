// Task management
let tasks = [];
let currentView = 'list';

// Load tasks from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        try {
            tasks = JSON.parse(savedTasks);
            renderTasks();
        } catch (e) {
            console.error('Error loading tasks:', e);
            tasks = [];
        }
    }
    
    // Add event listener for timing preference radio buttons
    const timingRadios = document.querySelectorAll('input[name="timingPreference"]');
    timingRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const customTimeInputs = document.getElementById('customTimeInputs');
            if (customTimeInputs) {
                customTimeInputs.style.display = radio.value === 'custom' ? 'flex' : 'none';
            }
        });
    });

    // Add event listener for view toggle button
    const viewToggleBtn = document.querySelector('.view-toggle-btn');
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', toggleView);
    }
});

// Save tasks to localStorage whenever they change
function saveTasks() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (e) {
        console.error('Error saving tasks:', e);
    }
}

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTask');
const taskList = document.getElementById('taskList');
const taskListItems = document.getElementById('taskListItems');
const categoryFilter = document.getElementById('categoryFilter');

// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// Event Listeners
if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);
if (taskInput) taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});
if (categoryFilter) categoryFilter.addEventListener('change', renderTasks);

// Toggle between list and matrix views
async function toggleView() {
    console.log('Toggle view clicked');
    const taskList = document.getElementById('taskList');
    const priorityMatrix = document.getElementById('priorityMatrix');
    const viewToggleBtn = document.querySelector('.view-toggle-btn .current-view');
    
    if (!taskList || !priorityMatrix || !viewToggleBtn) {
        console.error('Required elements not found');
        return;
    }

    if (currentView === 'list') {
        console.log('Switching to matrix view');
        taskList.style.display = 'none';
        priorityMatrix.style.display = 'block';
        viewToggleBtn.textContent = 'List View';
        await renderMatrixView(); // Ensure matrix view is updated
    } else {
        console.log('Switching to list view');
        taskList.style.display = 'block';
        priorityMatrix.style.display = 'none';
        viewToggleBtn.textContent = 'Matrix View';
    }
    
    currentView = currentView === 'list' ? 'matrix' : 'list';
}

// Helper to ensure all tasks have an id
function ensureTaskIds(tasks) {
    return tasks.map(task => {
        if (!task.id) {
            return { ...task, id: Date.now() + Math.floor(Math.random() * 10000) };
        }
        return task;
    });
}

// Update matrix rendering debug logging
async function renderMatrixView() {
    // Ensure all tasks have an id
    const tasksWithIds = ensureTaskIds(tasks);
    console.log('Rendering matrix view with tasks:', tasksWithIds);
    
    if (tasksWithIds.length === 0) {
        showPopup('No tasks to display in matrix view', 'info');
        return;
    }

    try {
        // Get AI analysis for all tasks
        const response = await fetch('/analyze_priorities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tasks: tasksWithIds })
        });

        if (!response.ok) {
            console.error('Matrix view: /analyze_priorities response not ok', response.status, response.statusText);
            throw new Error('Failed to analyze task priorities');
        }

        const analyzedTasks = await response.json();
        console.log('Received analyzed tasks from /analyze_priorities:', analyzedTasks);
        
        // Clear existing tasks in matrix
        ['highHighTasks', 'highLowTasks', 'lowHighTasks', 'lowLowTasks'].forEach(id => {
            const cell = document.getElementById(id);
            if (cell) {
                cell.innerHTML = '';
            }
        });

        // Sort tasks into matrix cells
        analyzedTasks.forEach(task => {
            console.log('Processing task for matrix:', task);
            const cellId = getMatrixCellId(task.importance, task.urgency);
            console.log('Task', task.text, '-> cell', cellId);
            const cell = document.getElementById(cellId);
            if (cell) {
                const taskElement = createMatrixTaskElement(task);
                cell.appendChild(taskElement);
            } else {
                console.error('Matrix cell not found:', cellId, 'for task', task.text);
            }
        });

    } catch (error) {
        console.error('Error rendering matrix view:', error);
        showPopup('Failed to analyze task priorities. Please try again.', 'error');
    }
}

// Create task element for matrix view
function createMatrixTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'matrix-task';
    
    // Get time information from analysis
    const startTime = task.analysis?.start_time || 'No start time';
    const endTime = task.analysis?.end_time || 'No end time';
    
    div.innerHTML = `
        <div class="task-title">${task.text}</div>
        <div class="task-time">${startTime} - ${endTime}</div>
        <div class="task-priority">
            <span class="importance">Importance: ${task.importance}</span>
            <span class="urgency">Urgency: ${task.urgency}</span>
        </div>
        <div class="task-actions">
            <button onclick="toggleTask(${task.id})" class="btn btn-sm ${task.completed ? 'btn-success' : 'btn-outline-success'}">
                ${task.completed ? '✓' : '○'}
            </button>
            <button onclick="deleteTask(${task.id})" class="btn btn-sm btn-danger">×</button>
        </div>
    `;
    return div;
}

// Get matrix cell ID based on importance and urgency
function getMatrixCellId(importance, urgency) {
    const importanceLevel = importance === 'high' ? 'high' : 'low';
    const urgencyLevel = urgency === 'high' ? 'High' : 'Low'; // Capitalize first letter
    return `${importanceLevel}${urgencyLevel}Tasks`;
}

// Functions
// Create and show popup message
function showPopup(message, type = 'error') {
    // Remove existing popup if any
    const existingPopup = document.querySelector('.popup-message');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup element
    const popup = document.createElement('div');
    popup.className = `popup-message ${type}`;
    popup.innerHTML = `
        <div class="popup-content">
            <span class="popup-icon">${type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <p>${message}</p>
        </div>
    `;

    // Add to document
    document.body.appendChild(popup);

    // Show popup with animation
    setTimeout(() => popup.classList.add('show'), 10);

    // Remove popup after 3 seconds
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
    }, 3000);
}

// Add a new task
async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    
    if (!taskText) {
        showPopup('Please enter a task', 'error');
        return;
    }

    try {
        // Create initial task object
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            analysis: {
                category: 'Analyzing...',
                deadline: 'Analyzing...',
                priority: 'Analyzing...',
                type: 'Analyzing...',
                rationale: 'Analyzing...',
                start_time: 'Analyzing...',
                end_time: 'Analyzing...'
            }
        };

        // Add task to list
        tasks.push(task);
        saveTasks();
        renderTasks();
        taskInput.value = '';

        // Analyze task for both list and matrix views
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task: taskText })
        });

        if (!response.ok) {
            throw new Error('Failed to analyze task');
        }

        const analysis = await response.json();
        console.log('Received analysis:', analysis);

        // Update task with analysis
        task.analysis = analysis;
        saveTasks();
        // Update both views
        renderTasks();
        await renderMatrixView(); // Ensure matrix view is updated

        // Show success message
        showPopup('Task added successfully!', 'success');

    } catch (error) {
        console.error('Error adding task:', error);
        showPopup('Failed to add task. Please try again.', 'error');
    }
}

// Delete a task
async function deleteTask(taskId) {
    tasks = tasks.filter(task => task.id !== taskId);
    saveTasks();
    renderTasks();
    if (currentView === 'matrix') {
        await renderMatrixView(); // Ensure matrix view is updated
    }
    // If no tasks remain, refresh the window
    if (tasks.length === 0) {
        window.location.reload();
    }
}

// Toggle task completion
async function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        if (currentView === 'matrix') {
            await renderMatrixView(); // Ensure matrix view is updated
        }
    }
}

function renderTasks() {
    if (!taskListItems) return;
    taskListItems.innerHTML = '';

    tasks.forEach((task) => {
        const li = document.createElement('li');
        li.className = 'task' + (task.completed ? ' completed' : '');

        li.innerHTML = `
            <div class="task-content">
                <div class="task-header">
                    <span class="task-title">${task.text}</span>
                    <div class="task-actions">
                        <button class="complete-btn">${task.completed ? '↩️' : '✓'}</button>
                        <button class="delete-btn">🗑️</button>
                    </div>
                </div>
                <div class="task-details">
                    <span class="task-category">${task.analysis?.category || ''}</span>
                    <span class="task-priority">${task.analysis?.priority || ''}</span>
                    <span class="task-type">${task.analysis?.type || ''}</span>
                </div>
                <div class="task-time">${task.analysis?.start_time || ''} - ${task.analysis?.end_time || ''}</div>
                <div class="task-rationale">${task.analysis?.rationale || ''}</div>
            </div>
        `;

        // Add event listeners for complete and delete
        li.querySelector('.complete-btn').addEventListener('click', () => {
            toggleTask(task.id);
        });
        li.querySelector('.delete-btn').addEventListener('click', () => {
            deleteTask(task.id);
        });

        taskListItems.appendChild(li);
    });
}

// Remove context menu code if present
const oldMenu = document.getElementById('task-context-menu');
if (oldMenu) oldMenu.remove();

// Initial render
renderTasks(); 