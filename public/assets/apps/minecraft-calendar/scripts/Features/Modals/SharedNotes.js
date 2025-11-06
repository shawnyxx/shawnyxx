
class SharedNotes {
    static modal = new Modal({
        title: "📝 Shared Notes",
        content: /*html*/`
            <div class="form-group">
                <label for="noteTitle">📋 Note Title</label>
                <input type="text" id="noteTitle" placeholder="Enter a descriptive title for your note...">

                <label for="noteContent">📝 Note Content</label>
                <textarea id="noteContent"
                    placeholder="Write your detailed note here... Share ideas, reminders, or important information with your team!"></textarea>

                <label for="noteAuthor">👤 Your Name</label>
                <input type="text" id="noteAuthor" placeholder="Enter your name or username">

                <button onclick="saveNote()" class="btn-success">💾 Save Note</button>
            </div>
            <div id="notesList"></div>
        `
    });

    static Open() {
        this.modal.open();
    }

    static Close() {
        this.modal.close();
    }
}

// Notes Related Functions

async function editNote(index) {
    const data = await Data.loadData();
    const note = data.notes[index];

    editingNoteIndex = index;

    // Fill the form with existing data
    document.getElementById("noteTitle").value = note.title;
    document.getElementById("noteContent").value = note.content;
    document.getElementById("noteAuthor").value = note.author;

    // Change the submit button text
    const submitBtn = document.querySelector('#notesModal .btn-success');
    submitBtn.textContent = 'Update Note';
    submitBtn.onclick = saveEditedNote;
}

async function saveEditedNote() {
    const title = document.getElementById("noteTitle").value;
    const content = document.getElementById("noteContent").value;
    const author = document.getElementById("noteAuthor").value;

    if (!title || !content || !author) {
        alert("Please fill in all fields");
        return;
    }

    const data = await Data.loadData();
    data.notes[editingNoteIndex] = { title, content, author };

    await Data.saveData(data);

    // Reset form and button
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    document.getElementById("noteAuthor").value = "";

    const submitBtn = document.querySelector('#notesModal .btn-success');
    submitBtn.textContent = 'Add Note';
    submitBtn.onclick = addNote;

    editingNoteIndex = -1;

    await displayNotes();
}

async function displayNotes() {
    const data = await Data.loadData();
    const notesList = document.getElementById("notesList");

    notesList.innerHTML = data.notes.map((note, index) => `
        <div class="note-item">
          <h4>${note.title}</h4>
          <div class="note-meta">By: ${note.author}</div>
          <div class="note-content">${note.content}</div>
          <div class="btn-group">
            <button onclick="editNote(${index})" class="btn-warning btn-small">Edit</button>
            <button onclick="deleteNote(${index})" class="btn-danger btn-small">Delete</button>
          </div>
        </div>
      `).join('');
}

async function saveNote() {
    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();
    const author = document.getElementById("noteAuthor").value.trim();

    if (!title || !content || !author) {
        alert("Please fill in all fields");
        return;
    }

    const data = await Data.loadData();
    data.notes.push({ title, content, author });

    await Data.saveData(data);

    // Clear form
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    document.getElementById("noteAuthor").value = "";

    await displayNotes();
}

async function deleteNote(index) {
    if (confirm("Are you sure you want to delete this note?")) {
        const data = await Data.loadData();
        data.notes.splice(index, 1);
        await Data.saveData(data);
        await displayNotes();
    }
}

function cancelEditNote() {
    // Reset form and button
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    document.getElementById("noteAuthor").value = "";

    const submitBtn = document.querySelector('#notesModal .btn-success');
    submitBtn.textContent = 'Add Note';
    submitBtn.onclick = addNote;

    editingNoteIndex = -1;
}

function cancelEditTask() {
    // Reset form and button
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskDescription").value = "";
    document.getElementById("taskAuthor").value = "";
    document.getElementById("taskPriority").value = "low";

    const submitBtn = document.querySelector('#tasksModal .btn-success');
    submitBtn.textContent = 'Add Task';
    submitBtn.onclick = addTask;
    editingTaskIndex = -1;
}