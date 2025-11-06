
class Diddle {
    static modal = new Modal({
        title: "Diddle",
        content: /*html*/`
            <div>
                <div class="book-container">
                    <div class="book">
                        <div class="book-spine"></div>
                            <div class="book-pages">
                            <!-- Reading Page -->
                            <div class="book-page active" id="readingPage">
                                <div class="page-header">
                                <h3>📚 Community Stories</h3>
                                </div>
                                <div id="diddleEntries"></div>
                                <div class="page-number">Page 1</div>
                            </div>

                            <!-- Writing Page -->
                            <div class="book-page" id="writingPage">
                                <div class="page-header">
                                    <h3>✒️ Write Your Story</h3>
                                </div>
                                <div class="writing-tools">
                                    <h3>📝 Writing Tools</h3>
                                    <div class="toolbar">
                                        <button class="tool-btn" onclick="formatText('bold')" title="Bold"><strong>B</strong></button>
                                        <button class="tool-btn" onclick="formatText('italic')" title="Italic"><em>I</em></button>
                                        <button class="tool-btn" onclick="formatText('header')" title="Header">H1</button>
                                        <button class="tool-btn" onclick="formatText('subheader')" title="Subheader">H2</button>
                                        <button class="tool-btn" onclick="formatText('quote')" title="Quote">❝❞</button>
                                        <button class="tool-btn" onclick="formatText('list')" title="List">• List</button>
                                    </div>
                                    <div class="entry-form">
                                        <input type="text" id="diddleTitle" placeholder="Title of your story or entry...">
                                        <textarea id="diddleContent"
                                        placeholder="Write your story, poem, or message here... Use the tools above to format your text with markdown!"></textarea>
                                        <input type="text" id="diddleAuthor" placeholder="Your name or pen name">
                                        <button onclick="saveDiddleEntry()" class="btn-success">📖 Add to The Diddle</button>
                                    </div>
                                </div>
                                <div class="page-number">Page 2</div>
                            </div>
                        </div>
                        <div class="page-navigation">
                            <button class="page-nav-btn" id="prevPageBtn" onclick="previousPage()" disabled>← Previous</button>
                            <button class="page-nav-btn" id="nextPageBtn" onclick="nextPage()">Next →</button>
                        </div>
                    </div>
                </div>
            </div>
        `
    });

    static Open() {
        Diddle.modal.open();
    }

    static Close() {
        Diddle.modal.close();
    }
}

// Diddle Related Functions
async function saveDiddleEntry() {
    const title = document.getElementById("diddleTitle").value.trim();
    const content = document.getElementById("diddleContent").value.trim();
    const author = document.getElementById("diddleAuthor").value.trim();

    if (!title || !content || !author) {
        alert("Please fill in all fields!");
        return;
    }

    const data = await Data.loadData();

    if (!data.diddle) {
        data.diddle = [];
    }

    const entryData = {
        title: title,
        content: content,
        author: author,
        date: new Date().toISOString()
    };

    if (editingDiddleIndex >= 0) {
        // Update existing entry
        data.diddle[editingDiddleIndex] = entryData;
        editingDiddleIndex = -1;

        // Reset the submit button
        const submitBtn = document.querySelector('#diddleModal .btn-success');
        submitBtn.textContent = '📖 Add to The Diddle';
        submitBtn.onclick = saveDiddleEntry;
    } else {
        data.diddle.push(entryData);
    }

    await Data.saveData(data);

    // Clear form
    document.getElementById("diddleTitle").value = "";
    document.getElementById("diddleContent").value = "";
    document.getElementById("diddleAuthor").value = "";

    // Switch back to reading page and refresh entries
    currentPage = 0;
    const pages = document.querySelectorAll('.book-page');
    pages.forEach(page => page.classList.remove('active'));
    pages[0].classList.add('active');
    updatePageNavigation();

    await displayDiddleEntries();

    alert("Your entry has been added to The Diddle!");
}

async function openDiddleModal() {
    document.getElementById("diddleModal").style.display = "block";
    await displayDiddleEntries();
}

function closeDiddleModal() {
    document.getElementById("diddleModal").style.display = "none";
    currentPage = 0;
    updatePageNavigation();
}

function nextPage() {
    const pages = document.querySelectorAll('.book-page');
    if (currentPage < pages.length - 1) {
        pages[currentPage].classList.remove('active');
        currentPage++;
        pages[currentPage].classList.add('active');
        updatePageNavigation();
    }
}

function previousPage() {
    const pages = document.querySelectorAll('.book-page');
    if (currentPage > 0) {
        pages[currentPage].classList.remove('active');
        currentPage--;
        pages[currentPage].classList.add('active');
        updatePageNavigation();
    }
}

function updatePageNavigation() {
    const pages = document.querySelectorAll('.book-page');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === pages.length - 1;

    // Update page numbers
    const pageNumbers = document.querySelectorAll('.page-number');
    pageNumbers.forEach((pageNum, index) => {
        pageNum.textContent = `Page ${index + 1}`;
    });
}

async function displayDiddleEntries() {
    const data = await Data.loadData();
    const entriesContainer = document.getElementById("diddleEntries");

    entriesContainer.innerHTML = '';

    if (!data.diddle || data.diddle.length === 0) {
        entriesContainer.innerHTML = `
          <div class="diddle-entry">
            <div class="entry-title">Welcome to The Diddle!</div>
            <div class="entry-content">Le livre religieux du dieu Diddy</div>
            <div class="entry-author">- Pape Diddy</div>
          </div>
        `;
        return;
    }

    data.diddle.forEach((entry, index) => {
        const entryElement = document.createElement("div");
        entryElement.className = "diddle-entry";

        entryElement.innerHTML = `
          <div class="entry-title">${entry.title}</div>
          <div class="entry-content">${parseMarkdown(entry.content)}</div>
          <div class="entry-author">Written by ${entry.author} on ${new Date(entry.date).toLocaleDateString()}</div>
          <button class="diddle-entry-btn diddle-edit-btn" onclick="editDiddleEntry(${index})" title="Edit entry">✏️</button>
          <button class="diddle-entry-btn diddle-delete-btn" onclick="deleteDiddleEntry(${index})" title="Delete entry">×</button>
        `;

        entriesContainer.appendChild(entryElement);
    });
}

function formatText(type) {
    const textarea = document.getElementById('diddleContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let formattedText = '';

    switch (type) {
        case 'bold':
            formattedText = `**${selectedText || 'bold text'}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText || 'italic text'}*`;
            break;
        case 'header':
            formattedText = `# ${selectedText || 'Header'}`;
            break;
        case 'subheader':
            formattedText = `## ${selectedText || 'Subheader'}`;
            break;
        case 'quote':
            formattedText = `> ${selectedText || 'quoted text'}`;
            break;
        case 'list':
            formattedText = `- ${selectedText || 'list item'}`;
            break;
    }

    textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
}

function parseMarkdown(content) {
    return content
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/\n/g, '<br>');
}

async function deleteDiddleEntry(index) {
    if (confirm("Are you sure you want to remove this entry from The Diddle?")) {
        const data = await Data.loadData();
        data.diddle.splice(index, 1);
        await Data.saveData(data);
        await displayDiddleEntries();
    }
}

async function editDiddleEntry(index) {
    const data = await Data.loadData();
    const entry = data.diddle[index];

    editingDiddleIndex = index;

    // Fill the form with existing data
    document.getElementById("diddleTitle").value = entry.title;
    document.getElementById("diddleContent").value = entry.content;
    document.getElementById("diddleAuthor").value = entry.author;

    // Switch to writing page
    const pages = document.querySelectorAll('.book-page');
    pages.forEach(page => page.classList.remove('active'));
    currentPage = 1;
    pages[currentPage].classList.add('active');
    updatePageNavigation();

    // Change the submit button text
    const submitBtn = document.querySelector('#diddleModal .btn-success');
    submitBtn.textContent = '📝 Update Entry';
    submitBtn.onclick = saveDiddleEntry;
}
