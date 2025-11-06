
class Pinboard {
    static modal = new Modal({
        title: "📌 Village Pinboard",
        content: /*html*/`
            <div class="flex flex-col w-full h-full overflow-y-auto">
                <div class="pinboard-background">
                    <div class="wood-grain"></div>
                    <div class="pinboard-posts" id="pinboardPosts"></div>
                </div>

                <div class="pinboard-form">
                    <h3>📜 Post New Message</h3>
                    <div class="form-group">
                        <label for="pinboardTitle">📋 Message Title</label>
                        <input type="text" id="pinboardTitle" placeholder="Enter an eye-catching title for your message...">

                        <label for="pinboardContent">📝 Message Content</label>
                        <textarea id="pinboardContent" placeholder="Share your message, announcement, or trade offer with the village..."></textarea>

                        <label for="pinboardAuthor">👤 Your Name</label>
                        <input type="text" id="pinboardAuthor" placeholder="Enter your name or username">

                        <label for="pinboardType">🏷️ Message Type</label>
                        <select id="pinboardType">
                            <option value="announcement">🔔 Announcement - Important news for everyone</option>
                            <option value="advertisement">💰 Advertisement - Promote your services</option>
                            <option value="message">📝 Message - General communication</option>
                            <option value="event">🎉 Event - Organize activities and gatherings</option>
                            <option value="trade">⚔️ Trade Offer - Buy, sell, or exchange items</option>
                        </select>

                        <button onclick="savePinboardPost()" class="btn-success">📌 Pin to Board</button>
                    </div>
                </div>
            </div>
        `
    });

    static Open() {
        Pinboard.modal.open();
    }

    static Close() {
        Pinboard.modal.close();
    }
}

// Pinboard Related Functions


async function displayPinboard() {
    const data = await Data.loadData();
    const pinboardPosts = document.getElementById("pinboardPosts");

    pinboardPosts.innerHTML = '';

    data.pinboard.forEach((post, index) => {
        const postElement = document.createElement("div");
        postElement.className = `pinboard-post type-${post.type}`;

        // Random positioning and rotation for authentic pinboard look
        const randomX = Math.random() * 70; // 0-70% from left
        const randomY = Math.random() * 70; // 0-70% from top
        const randomRotation = (Math.random() - 0.5) * 20; // -10 to +10 degrees

        postElement.style.left = `${randomX}%`;
        postElement.style.top = `${randomY}%`;
        postElement.style.setProperty('--rotation', `${randomRotation}deg`);

        postElement.innerHTML = `
          <button class="post-delete-btn" onclick="deletePinboardPost(${index})">×</button>
          <div class="post-title">${post.title}</div>
          <div class="post-content">${post.content}</div>
          <div class="post-author">- ${post.author}</div>
        `;

        pinboardPosts.appendChild(postElement);
    });
}

async function savePinboardPost() {
    const title = document.getElementById("pinboardTitle").value.trim();
    const content = document.getElementById("pinboardContent").value.trim();
    const author = document.getElementById("pinboardAuthor").value.trim();
    const type = document.getElementById("pinboardType").value;

    if (!title || !content || !author) {
        alert("Please fill in all fields");
        return;
    }

    const data = await Data.loadData();

    const postData = { title, content, author, type, timestamp: new Date().toISOString() };

    if (editingPinboardIndex >= 0) {
        data.pinboard[editingPinboardIndex] = postData;
        editingPinboardIndex = -1;

        // Reset button text
        const submitBtn = document.querySelector('#pinboardModal .btn-success');
        submitBtn.textContent = '📌 Pin to Board';
        submitBtn.onclick = savePinboardPost;
    } else {
        data.pinboard.push(postData);
    }

    await Data.saveData(data);

    // Clear form
    document.getElementById("pinboardTitle").value = "";
    document.getElementById("pinboardContent").value = "";
    document.getElementById("pinboardAuthor").value = "";
    document.getElementById("pinboardType").value = "announcement";

    await displayPinboard();
}

async function deletePinboardPost(index) {
    if (confirm("Are you sure you want to remove this post from the pinboard?")) {
        const data = await Data.loadData();
        data.pinboard.splice(index, 1);
        await Data.saveData(data);
        await displayPinboard();
    }
}

async function editPinboardPost(index) {
    const data = await Data.loadData();
    const post = data.pinboard[index];

    editingPinboardIndex = index;

    // Fill the form with existing data
    document.getElementById("pinboardTitle").value = post.title;
    document.getElementById("pinboardContent").value = post.content;
    document.getElementById("pinboardAuthor").value = post.author;
    document.getElementById("pinboardType").value = post.type;

    // Change the submit button text
    const submitBtn = document.querySelector('#pinboardModal .btn-success');
    submitBtn.textContent = 'Update Post';
    submitBtn.onclick = savePinboardPost;
}