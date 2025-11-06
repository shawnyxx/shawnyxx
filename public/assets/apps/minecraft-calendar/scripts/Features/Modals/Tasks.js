class Tasks {
    static modal = new Modal({
        title: "📋 Team Tasks",
        content: /*html*/`
            <div class="form-group">
                <label for="taskTitle">🎯 Task Title</label>
                <input type="text" id="taskTitle" placeholder="Enter a clear and specific task title...">

                <label for="taskDescription">📄 Task Description</label>
                <textarea id="taskDescription" placeholder="Provide detailed instructions, requirements, or context for this task..."></textarea>

                <label for="taskAuthor">👤 Your Name</label>
                <input type="text" id="taskAuthor" placeholder="Enter your name or username">

                <label for="taskPriority">⚡ Priority Level</label>
                <select id="taskPriority">
                    <option value="low">🟢 Low Priority - Can be done when time allows</option>
                    <option value="medium">🟡 Medium Priority - Should be completed soon</option>
                    <option value="high">🔴 High Priority - Urgent! Needs immediate attention</option>
                </select>

                <button onclick="saveTask()" class="btn-success">✅ Save Task</button>
            </div>
            <div id="tasksList"></div>
        `
    });

    static Open() {
        Tasks.modal.open();
    }

    static Close() {
        Tasks.modal.close();
    }
}

// Tasks Related Functions

async function openTasksModal() {
    document.getElementById("tasksModal").style.display = "block";
    await displayTasks();
}

function closeTasksModal() {
    document.getElementById("tasksModal").style.display = "none";
}

async function displayTasks() {
    const data = await Data.loadData();
    const tasksList = document.getElementById("tasksList");

    // Sort tasks by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedTasks = [...data.tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    tasksList.innerHTML = sortedTasks.map((task, index) => `
        <div class="task-item priority-${task.priority}">
          <div class="task-header">
            <span class="task-title">${task.title}</span>
            <span class="task-priority priority-${task.priority}">${task.priority.toUpperCase()}</span>
          </div>
          <div class="task-meta">By: ${task.author}</div>
          <div class="task-description">${task.description}</div>
          <div class="btn-group">
            <button onclick="editTask(${data.tasks.indexOf(task)})" class="btn-warning btn-small">Edit</button>
            <button onclick="deleteTask(${data.tasks.indexOf(task)})" class="btn-danger btn-small">Delete</button>
          </div>
        </div>
      `).join('');
}

async function saveTask() {
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDescription").value.trim();
    const author = document.getElementById("taskAuthor").value.trim();
    const priority = document.getElementById("taskPriority").value;

    if (!title || !description || !author) {
        alert("Please fill in all fields");
        return;
    }

    const data = await Data.loadData();
    data.tasks.push({ title, description, author, priority });

    await Data.saveData(data);

    // Clear form
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskDescription").value = "";
    document.getElementById("taskAuthor").value = "";
    document.getElementById("taskPriority").value = "low";

    await displayTasks();
}

async function deleteTask(index) {
    if (confirm("Are you sure you want to delete this task?")) {
        const data = await Data.loadData();
        data.tasks.splice(index, 1);
        await Data.saveData(data);
        await displayTasks();
    }
}

async function editTask(index) {
    const data = await Data.loadData();
    const task = data.tasks[index];

    editingTaskIndex = index;

    // Fill the form with existing data
    document.getElementById("taskTitle").value = task.title;
    document.getElementById("taskDescription").value = task.description;
    document.getElementById("taskAuthor").value = task.author;
    document.getElementById("taskPriority").value = task.priority;

    // Change the submit button text
    const submitBtn = document.querySelector('#tasksModal .btn-success');
    submitBtn.textContent = 'Update Task';
    submitBtn.onclick = saveEditedTask;
}

async function saveEditedTask() {
    const title = document.getElementById("taskTitle").value;
    const description = document.getElementById("taskDescription").value;
    const author = document.getElementById("taskAuthor").value;
    const priority = document.getElementById("taskPriority").value;

    if (!title || !description || !author) {
        alert("Please fill in all fields");
        return;
    }

    const data = await Data.loadData();
    data.tasks[editingTaskIndex] = { title, description, author, priority };

    await Data.saveData(data);

    // Reset form and button
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskDescription").value = "";
    document.getElementById("taskAuthor").value = "";
    document.getElementById("taskPriority").value = "low";

    const submitBtn = document.querySelector('#tasksModal .btn-success');
    submitBtn.textContent = 'Add Task';
    submitBtn.onclick = addTask;

    editingTaskIndex = -1;

    await displayTasks();
}