class Recaps {
    static modal = new Modal({
        title: "📸 Recaps",
        content: /*html*/`
            <div class="modal-body">
                <!-- Pages List View -->
                <div id="recapsPagesView">
                <div class="recaps-header">
                    <h3>📚 Your Community Pages</h3>
                    <button onclick="showCreatePageForm()" class="btn-success">➕ Create New Page</button>
                </div>

                <!-- Loading -->
                <div id="pagesLoadingIndicator" class="loading-indicator" style="display:none;">
                    <div class="loading-spinner"></div>
                    <p>Loading pages... Please wait.</p>
                    <p class="retry-message">We're experiencing some delays. Retrying in <span id="pagesRetryCountdown">2</span>
                    seconds...</p>
                </div>

                <div id="recapsPagesContainer" class="recaps-pages-container">
                    <!-- Pages will be dynamically added here -->
                </div>
                </div>

                <!-- Create Page Form -->
                <div id="createPageForm" class="recaps-form" style="display:none;">
                <h3>🌟 Create New Page</h3>
                <div class="form-group">
                    <label for="pageTitle">📋 Page Title</label>
                    <input type="text" id="pageTitle" placeholder="Enter a title for your new page...">

                    <label for="pageDescription">📝 Page Description</label>
                    <textarea id="pageDescription" placeholder="Describe what this page is about..."></textarea>

                    <label for="pageCategory">🏷️ Page Category</label>
                    <select id="pageCategory">
                    <option value="community">👪 Community - For village or town content</option>
                    <option value="project">🏗️ Project - For build or redstone projects</option>
                    <option value="guild">🛡️ Guild - For team organizations</option>
                    <option value="business">💰 Business - For in-game shops and services</option>
                    <option value="misc">🎲 Miscellaneous - For everything else</option>
                    </select>

                    <label for="pageCreator">👤 Your Name</label>
                    <input type="text" id="pageCreator" placeholder="Enter your name or username">

                    <div class="btn-group">
                    <button onclick="createNewPage()" class="btn-success">✅ Create Page</button>
                    <button onclick="cancelCreatePage()" class="btn-danger">❌ Cancel</button>
                    </div>
                </div>
                </div>

                <!-- Single Page View -->
                <div id="singlePageView" style="display:none;">
                <div class="single-page-header">
                    <button onclick="backToPagesList()" class="btn-small">← Back to Pages</button>
                    <h3 id="singlePageTitle">Page Title</h3>
                    <p id="singlePageDescription" class="page-description">Page description will appear here.</p>
                    <div class="page-meta">
                    <span id="singlePageCategory" class="page-category">Category</span>
                    <span id="singlePageCreator" class="page-creator">Created by Username</span>
                    </div>
                </div>

                <div class="page-tabs">
                    <button class="page-tab active" data-tab="posts" onclick="switchTab('posts')">📸 Posts</button>
                    <button class="page-tab" data-tab="story" onclick="switchTab('story')">📖 Story</button>
                    <button class="page-tab" data-tab="events" onclick="switchTab('events')">🎉 Events</button>
                </div>

                <!-- Posts Tab Content -->
                <div id="postsTab" class="tab-content active">
                    <div class="new-post-form">
                    <h4>📝 Create New Post</h4>
                    <textarea id="postContent" placeholder="Share an update, image, or announcement..."></textarea>
                    <div class="post-form-footer">
                        <div class="image-upload">
                        <label for="postImage">🖼️ Add Image</label>
                        <input type="file" id="postImage" accept="image/*"
                            onchange="previewImage('postImage', 'postImagePreview')">
                        </div>
                        <div id="postImagePreview" class="image-preview"></div>
                        <input type="text" id="postAuthor" placeholder="Your name">
                        <button onclick="createPost()" class="btn-success">📤 Post</button>
                    </div>
                    </div>

                    <!-- Loading -->
                    <div id="postsLoadingIndicator" class="loading-indicator" style="display:none;">
                    <div class="loading-spinner"></div>
                    <p>Loading posts... Please wait.</p>
                    <p class="retry-message">We're experiencing some delays. Retrying in <span
                        id="postsRetryCountdown">2</span> seconds...</p>
                    </div>

                    <div id="postsContainer" class="posts-container">
                    <!-- Posts will be dynamically added here -->
                    </div>
                </div>

                <!-- Story Tab Content -->
                <div id="storyTab" class="tab-content">
                    <!-- Loading -->
                    <div id="storyLoadingIndicator" class="loading-indicator" style="display:none;">
                    <div class="loading-spinner"></div>
                    <p>Loading story... Please wait.</p>
                    <p class="retry-message">We're experiencing some delays. Retrying in <span
                        id="storyRetryCountdown">2</span> seconds...</p>
                    </div>

                    <div id="storyContent" class="story-content">
                    <!-- Story will be displayed here -->
                    </div>
                    <div class="story-editor">
                    <h4>✏️ Edit Story</h4>
                    <textarea id="storyText" placeholder="Write or update this page's story..."></textarea>
                    <div class="form-footer">
                        <input type="text" id="storyAuthor" placeholder="Your name">
                        <button onclick="updateStory()" class="btn-success">💾 Save Story</button>
                    </div>
                    </div>
                </div>

                <!-- Events Tab Content -->
                <div id="eventsTab" class="tab-content">
                    <div class="new-event-form">
                    <h4>🎭 Create New Event</h4>
                    <input type="text" id="eventTitle" placeholder="Event title">
                    <textarea id="eventDescription" placeholder="Describe your event..."></textarea>
                    <input type="text" id="eventLocation" placeholder="Event location">
                    <input type="datetime-local" id="eventDateTime">
                    <div class="event-form-footer">
                        <div class="image-upload">
                        <label for="eventImage">🖼️ Add Image</label>
                        <input type="file" id="eventImage" accept="image/*"
                            onchange="previewImage('eventImage', 'eventImagePreview')">
                        </div>
                        <div id="eventImagePreview" class="image-preview"></div>
                        <input type="text" id="eventAuthor" placeholder="Your name">
                        <button onclick="createEvent()" class="btn-success">📅 Create Event</button>
                    </div>
                    </div>

                    <!-- Loading -->
                    <div id="eventsLoadingIndicator" class="loading-indicator" style="display:none;">
                    <div class="loading-spinner"></div>
                    <p>Loading events... Please wait.</p>
                    <p class="retry-message">We're experiencing some delays. Retrying in <span
                        id="eventsRetryCountdown">2</span> seconds...</p>
                    </div>

                    <div id="eventsContainer" class="events-container">
                    <!-- Events will be dynamically added here -->
                    </div>
                </div>

                <!-- Comment Modal for Posts and Events -->
                <div id="commentModal" class="comment-modal">
                    <div class="comment-modal-content">
                    <h4 id="commentModalTitle">Comments</h4>
                    <div id="commentsContainer" class="comments-container">
                        <!-- Comments will be dynamically added here -->
                    </div>
                    <div class="comment-form">
                        <textarea id="commentText" placeholder="Write a comment..."></textarea>
                        <div class="comment-form-footer">
                        <input type="text" id="commentAuthor" placeholder="Your name">
                        <button onclick="addComment()" class="btn-success">💬 Comment</button>
                        </div>
                    </div>
                    <button onclick="closeCommentModal()" class="close-comment-btn">Close</button>
                    </div>
                </div>
                </div>
            </div>
        `
    });

    static Open() {
        Recaps.modal.open();
    }

    static Close() {
        Recaps.modal.close();
    }
}

// Recaps Related Functions

function showCreatePageForm() {
    document.getElementById('recapsPagesView').style.display = 'none';
    document.getElementById('createPageForm').style.display = 'block';
}

function cancelCreatePage() {
    document.getElementById('createPageForm').style.display = 'none';
    document.getElementById('recapsPagesView').style.display = 'block';

    // Clear form
    document.getElementById('pageTitle').value = '';
    document.getElementById('pageDescription').value = '';
    document.getElementById('pageCreator').value = '';
    document.getElementById('pageCategory').value = 'community';
}

async function createNewPage() {
    const title = document.getElementById('pageTitle').value.trim();
    const description = document.getElementById('pageDescription').value.trim();
    const creator = document.getElementById('pageCreator').value.trim();
    const category = document.getElementById('pageCategory').value;

    if (!title || !description || !creator) {
        alert('Please fill in all required fields');
        return;
    }

    const data = await Data.loadData();

    if (!data.recapsPages) {
        data.recapsPages = [];
    }

    const newPage = {
        id: Date.now().toString(),
        title,
        description,
        creator,
        category,
        createdAt: new Date().toISOString(),
        posts: [],
        story: {
            content: '',
            history: []
        },
        events: []
    };

    data.recapsPages.push(newPage);
    await Data.saveData(data);

    // Reset form and go back to pages list
    cancelCreatePage();
    await loadRecapsPages();
}

async function loadRecapsPages() {
    const data = await Data.loadData('pages');
    const pagesContainer = document.getElementById('recapsPagesContainer');

    if (!data.recapsPages || data.recapsPages.length === 0) {
        pagesContainer.innerHTML = `
          <div class="empty-state">
            <h3>No Pages Yet</h3>
            <p>Create your first page to get started!</p>
          </div>
        `;
        return;
    }

    pagesContainer.innerHTML = '';

    data.recapsPages.forEach(page => {
        const pageCard = document.createElement('div');
        pageCard.className = 'page-card';
        pageCard.onclick = () => openPage(page.id);

        const categoryEmoji = getCategoryEmoji(page.category);

        pageCard.innerHTML = `
          <h4>${page.title}</h4>
          <div class="page-description">${page.description}</div>
          <div class="page-meta">
            <span class="page-category">${categoryEmoji} ${page.category.charAt(0).toUpperCase() + page.category.slice(1)}</span>
            <span class="page-creator">By ${page.creator}</span>
          </div>
        `;

        pagesContainer.appendChild(pageCard);
    });
}

function getCategoryEmoji(category) {
    switch (category) {
        case 'community': return '👪';
        case 'project': return '🏗️';
        case 'guild': return '🛡️';
        case 'business': return '💰';
        case 'misc':
        default: return '🎲';
    }
}

async function openPage(pageId) {
    currentPageId = pageId;

    const data = await Data.loadData();
    const page = data.recapsPages.find(p => p.id === pageId);

    if (!page) {
        alert('Page not found');
        return;
    }

    document.getElementById('recapsPagesView').style.display = 'none';
    document.getElementById('singlePageView').style.display = 'block';

    // Set page details
    document.getElementById('singlePageTitle').textContent = page.title;
    document.getElementById('singlePageDescription').textContent = page.description;
    document.getElementById('singlePageCategory').textContent = `${getCategoryEmoji(page.category)} ${page.category.charAt(0).toUpperCase() + page.category.slice(1)}`;
    document.getElementById('singlePageCreator').textContent = `Created by ${page.creator}`;

    // Set default active tab
    switchTab('posts');
}

function backToPagesList() {
    document.getElementById('singlePageView').style.display = 'none';
    document.getElementById('createPageForm').style.display = 'none';
    document.getElementById('recapsPagesView').style.display = 'block';
    currentPageId = null;
}

function switchTab(tabName) {
    console.log(`Switching to tab: ${tabName}`);

    // Update tab buttons
    const tabs = document.querySelectorAll('.page-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        }
    });

    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });

    const activeTab = document.getElementById(`${tabName}Tab`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.display = 'block';

        // Load tab specific content
        if (tabName === 'posts') {
            loadPosts();
        } else if (tabName === 'story') {
            loadStory();
        } else if (tabName === 'events') {
            loadEvents();
        }
    } else {
        console.error(`Tab content element not found: ${tabName}Tab`);
    }
}

function isPostOwner(authorName, postAuthor) {
    return authorName.trim().toLowerCase() === postAuthor.trim().toLowerCase();
}

function showOwnershipError() {
    // Create and show a custom modal or use the toast system
    showToast('You can only delete posts you created', 'error');
}

async function deletePost(pageId, postId) {
    try {
        // First get the current user's preferred name
        const currentUser = getTopAuthorName();

        // Get the data to check ownership
        const data = await Data.loadData();
        const page = data.recapsPages.find(p => p.id === pageId);

        if (!page) return;

        const post = page.posts.find(p => p.id === postId);

        if (!post) return;

        // Check ownership
        if (!isPostOwner(currentUser, post.author)) {
            showOwnershipError();
            return;
        }

        // Proceed with deletion after confirmation
        if (confirm("Are you sure you want to delete this post?")) {
            const pageIndex = data.recapsPages.findIndex(p => p.id === pageId);
            const postIndex = data.recapsPages[pageIndex].posts.findIndex(p => p.id === postId);

            // Remove the post
            data.recapsPages[pageIndex].posts.splice(postIndex, 1);
            await Data.saveData(data);

            // Refresh the posts display
            await loadPosts();
            showToast('Post deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        showToast('Error deleting post', 'error');
    }
}

async function loadPosts() {
    try {
        document.getElementById('postsLoadingIndicator').style.display = 'flex';
        const data = await Data.loadData('posts');
        document.getElementById('postsLoadingIndicator').style.display = 'none';

        const page = data.recapsPages?.find(p => p.id === currentPageId);
        const postsContainer = document.getElementById('postsContainer');

        if (!postsContainer) {
            console.error('Posts container element not found');
            return;
        }

        if (!page || !page.posts || page.posts.length === 0) {
            postsContainer.innerHTML = `
        <div class="empty-state">
          <p>No posts yet. Be the first to post!</p>
        </div>
      `;
            return;
        }

        console.log(`Found ${page.posts.length} posts to display`);
        postsContainer.innerHTML = '';

        // Sort posts by date, newest first
        const sortedPosts = [...page.posts].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Get current user for ownership checks
        const currentUser = getTopAuthorName();

        sortedPosts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'post-card';

            const createdDate = new Date(post.createdAt).toLocaleString();
            const isLiked = post.likedBy?.includes(getUserIdentifier());
            const likeClass = isLiked ? 'liked' : '';

            // Check if current user is the post owner
            const isOwner = isPostOwner(currentUser, post.author);
            const deleteButton = isOwner ?
                `<button class="action-btn delete-btn" onclick="deletePost('${currentPageId}', '${post.id}')">
          🗑️ Delete
        </button>` : '';

            let imageHtml = '';
            if (post.image) {
                imageHtml = `<img src="${post.image}" alt="Post image" class="post-image">`;
            }

            postCard.innerHTML = `
        <div class="post-header">
          <span>Posted by ${post.author}</span>
          <span>${createdDate}</span>
        </div>
        <div class="post-content">${post.content}</div>
        ${imageHtml}
        <div class="post-actions">
          <button class="action-btn ${likeClass}" onclick="likePost('${post.id}')">
            ❤️ ${post.likes || 0} Likes
          </button>
          <button class="action-btn" onclick="openComments('post', '${post.id}')">
            💬 ${post.comments?.length || 0} Comments
          </button>
          ${deleteButton}
        </div>
      `;

            postsContainer.appendChild(postCard);
        });
    } catch (error) {
        console.error('Error in loadPosts:', error);
        document.getElementById('postsLoadingIndicator').style.display = 'none';
        const postsContainer = document.getElementById('postsContainer');
        if (postsContainer) {
            postsContainer.innerHTML = `
        <div class="error-state">
          <p>Error loading posts. Please try again later.</p>
        </div>
      `;
        }
    }
}

async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    const author = document.getElementById('postAuthor').value.trim();
    const imageInput = document.getElementById('postImage');

    if (!content || !author) {
        alert('Please enter both content and your name');
        return;
    }

    // Save the author name
    saveAuthorName(author);

    // Show loading indicator
    const postsContainer = document.getElementById('postsContainer');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.id = 'postPublishingIndicator';
    loadingIndicator.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Processing and publishing your post... Please wait.</p>
    <p>This may take a moment. We'll keep trying until it's published.</p>
  `;
    postsContainer.prepend(loadingIndicator);

    // Disable the post button to prevent duplicate submissions
    const postButton = document.querySelector('.new-post-form .btn-success');
    postButton.disabled = true;
    postButton.textContent = '📤 Publishing...';

    try {
        let imageData = null;
        if (imageInput.files && imageInput.files[0]) {
            const reader = new FileReader();

            // Convert to Promise to handle the async file reading
            const originalImageData = await new Promise((resolve) => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(imageInput.files[0]);
            });

            // Compress image to ensure it's under 1MB
            imageData = await Image.compressImage(originalImageData, 1);
        }

        const data = await Data.loadData();
        const pageIndex = data.recapsPages.findIndex(p => p.id === currentPageId);

        if (pageIndex === -1) {
            alert('Page not found');
            removeLoadingAndResetButton();
            return;
        }

        const newPost = {
            id: Date.now().toString(),
            content,
            author,
            createdAt: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: [],
            image: imageData
        };

        if (!data.recapsPages[pageIndex].posts) {
            data.recapsPages[pageIndex].posts = [];
        }

        data.recapsPages[pageIndex].posts.push(newPost);

        // Try to save with retry mechanism
        await saveDataWithRetry(data);

        // Clear form
        document.getElementById('postContent').value = '';
        document.getElementById('postImage').value = '';
        document.getElementById('postImagePreview').style.display = 'none';

        // Reload posts
        await loadPosts();
    } catch (error) {
        console.error('Error creating post:', error);
        showToast('Error creating post. Please try again.', 'error');
    } finally {
        // Always remove loading indicator and re-enable button
        removeLoadingAndResetButton();
    }

    function removeLoadingAndResetButton() {
        const loadingIndicator = document.getElementById('postPublishingIndicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        const postButton = document.querySelector('.new-post-form .btn-success');
        postButton.disabled = false;
        postButton.textContent = '📤 Post';
    }
}

async function likePost(postId) {
    const data = await Data.loadData();
    const pageIndex = data.recapsPages.findIndex(p => p.id === currentPageId);

    if (pageIndex === -1) return;

    const postIndex = data.recapsPages[pageIndex].posts.findIndex(p => p.id === postId);

    if (postIndex === -1) return;

    const post = data.recapsPages[pageIndex].posts[postIndex];
    const userId = getUserIdentifier();

    if (!post.likedBy) {
        post.likedBy = [];
    }

    const alreadyLiked = post.likedBy.includes(userId);

    if (alreadyLiked) {
        // Unlike
        post.likedBy = post.likedBy.filter(id => id !== userId);
        post.likes = (post.likes || 1) - 1;
    } else {
        // Like
        post.likedBy.push(userId);
        post.likes = (post.likes || 0) + 1;
    }

    await Data.saveData(data);
    await loadPosts();
}

async function loadStory() {
    const data = await Data.loadData('story');
    const page = data.recapsPages.find(p => p.id === currentPageId);
    const storyContent = document.getElementById('storyContent');

    if (!page || !page.story || !page.story.content) {
        storyContent.innerHTML = `
          <div class="story-empty">
            <p>No story has been written for this page yet. Be the first to contribute!</p>
          </div>
        `;
    } else {
        storyContent.innerHTML = `
          <div class="story-text">${page.story.content}</div>
          <div class="story-history">
            ${page.story.history.map(entry => `
              <div class="history-entry">
                Edited by ${entry.author} on ${new Date(entry.timestamp).toLocaleString()}
              </div>
            `).join('')}
          </div>
        `;
    }
}

async function updateStory() {
    const content = document.getElementById('storyText').value.trim();
    const author = document.getElementById('storyAuthor').value.trim();

    if (!content || !author) {
        alert('Please enter both story content and your name');
        return;
    }

    const data = await Data.loadData();
    const pageIndex = data.recapsPages.findIndex(p => p.id === currentPageId);

    if (pageIndex === -1) {
        alert('Page not found');
        return;
    }

    if (!data.recapsPages[pageIndex].story) {
        data.recapsPages[pageIndex].story = {
            content: '',
            history: []
        };
    }

    // Add edit to history
    const historyEntry = {
        author,
        timestamp: new Date().toISOString()
    };

    data.recapsPages[pageIndex].story.content = content;
    data.recapsPages[pageIndex].story.history.push(historyEntry);

    await Data.saveData(data);

    // Clear form
    document.getElementById('storyText').value = '';
    document.getElementById('storyAuthor').value = '';

    // Reload story
    await loadStory();
}

async function loadEvents() {
    const data = await Data.loadData('events');
    const page = data.recapsPages.find(p => p.id === currentPageId);
    const eventsContainer = document.getElementById('eventsContainer');

    if (!page || !page.events || page.events.length === 0) {
        eventsContainer.innerHTML = `
          <div class="empty-state">
            <p>No events scheduled yet. Create the first event!</p>
          </div>
        `;
        return;
    }

    eventsContainer.innerHTML = '';

    // Sort events by date, upcoming first
    const sortedEvents = [...page.events].sort((a, b) => {
        return new Date(a.dateTime) - new Date(b.dateTime);
    });

    sortedEvents.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';

        const eventDate = new Date(event.dateTime).toLocaleString();
        const isLiked = event.likedBy?.includes(getUserIdentifier());
        const likeClass = isLiked ? 'liked' : '';

        let imageHtml = '';
        if (event.image) {
            imageHtml = `<img src="${event.image}" alt="Event image" class="event-image">`;
        }

        eventCard.innerHTML = `
          <div class="event-header">
            <span>Created by ${event.author}</span>
          </div>
          <h4>${event.title}</h4>
          <div class="event-datetime">📅 ${eventDate}</div>
          <div class="event-location">📍 ${event.location}</div>
          ${imageHtml}
          <div class="event-content">${event.description}</div>
          <div class="event-actions">
            <button class="action-btn ${likeClass}" onclick="likeEvent('${event.id}')">
              ❤️ ${event.likes || 0} Interested
            </button>
            <button class="action-btn" onclick="openComments('event', '${event.id}')">
              💬 ${event.comments?.length || 0} Comments
            </button>
          </div>
        `;

        eventsContainer.appendChild(eventCard);
    });
}

async function createEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const location = document.getElementById('eventLocation').value.trim();
    const dateTime = document.getElementById('eventDateTime').value;
    const author = document.getElementById('eventAuthor').value.trim();
    const imageInput = document.getElementById('eventImage');

    if (!title || !description || !location || !dateTime || !author) {
        alert('Please fill in all required fields');
        return;
    }

    // Show loading indicator
    const eventsContainer = document.getElementById('eventsContainer');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.id = 'eventPublishingIndicator';
    loadingIndicator.innerHTML = `
    <div class="loading-spinner"></div>
    <p>Processing and publishing your event... Please wait.</p>
    <p>This may take a moment. We'll keep trying until it's published.</p>
  `;
    eventsContainer.prepend(loadingIndicator);

    // Disable the create button
    const eventButton = document.querySelector('.new-event-form .btn-success');
    eventButton.disabled = true;
    eventButton.textContent = '📤 Publishing...';

    try {
        let imageData = null;
        if (imageInput.files && imageInput.files[0]) {
            const reader = new FileReader();

            // Convert to Promise to handle the async file reading
            const originalImageData = await new Promise((resolve) => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(imageInput.files[0]);
            });

            // Compress image to ensure it's under 1MB
            imageData = await Image.compressImage(originalImageData, 1);
        }

        const data = await Data.loadData();
        const pageIndex = data.recapsPages.findIndex(p => p.id === currentPageId);

        if (pageIndex === -1) {
            alert('Page not found');
            removeLoadingAndResetButton();
            return;
        }

        const newEvent = {
            id: Date.now().toString(),
            title,
            description,
            location,
            dateTime,
            author,
            createdAt: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: [],
            image: imageData
        };

        if (!data.recapsPages[pageIndex].events) {
            data.recapsPages[pageIndex].events = [];
        }

        data.recapsPages[pageIndex].events.push(newEvent);
        await saveDataWithRetry(data);

        // Clear form
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventDescription').value = '';
        document.getElementById('eventLocation').value = '';
        document.getElementById('eventDateTime').value = '';
        document.getElementById('eventImage').value = '';
        document.getElementById('eventImagePreview').style.display = 'none';

        // Reload events
        await loadEvents();
    } catch (error) {
        console.error('Error creating event:', error);
        showToast('Error creating event. Please try again.', 'error');
    } finally {
        // Always remove loading indicator and re-enable button
        removeLoadingAndResetButton();
    }

    function removeLoadingAndResetButton() {
        const loadingIndicator = document.getElementById('eventPublishingIndicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        const eventButton = document.querySelector('.new-event-form .btn-success');
        eventButton.disabled = false;
        eventButton.textContent = '📅 Create Event';
    }
}

async function likeEvent(eventId) {
    const data = await Data.loadData();
    const pageIndex = data.recapsPages.findIndex(p => p.id === currentPageId);

    if (pageIndex === -1) return;

    const eventIndex = data.recapsPages[pageIndex].events.findIndex(e => e.id === eventId);

    if (eventIndex === -1) return;

    const event = data.recapsPages[pageIndex].events[eventIndex];
    const userId = getUserIdentifier();

    if (!event.likedBy) {
        event.likedBy = [];
    }

    const alreadyLiked = event.likedBy.includes(userId);

    if (alreadyLiked) {
        // Unlike
        event.likedBy = event.likedBy.filter(id => id !== userId);
        event.likes = (event.likes || 1) - 1;
    } else {
        // Like
        event.likedBy.push(userId);
        event.likes = (event.likes || 0) + 1;
    }

    await Data.saveData(data);
    await loadEvents();
}

function openComments(type, id) {
    currentCommentType = type;
    currentCommentId = id;

    const commentModal = document.getElementById('commentModal');
    commentModal.style.display = 'flex';

    loadComments();
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
    currentCommentType = null;
    currentCommentId = null;
}

async function loadComments() {
    const data = await Data.loadData('comments');
    const page = data.recapsPages.find(p => p.id === currentPageId);
    const commentsContainer = document.getElementById('commentsContainer');

    if (!page) return;

    let item;
    if (currentCommentType === 'post') {
        document.getElementById('commentModalTitle').textContent = 'Post Comments';
        item = page.posts.find(p => p.id === currentCommentId);
    } else if (currentCommentType === 'event') {
        document.getElementById('commentModalTitle').textContent = 'Event Comments';
        item = page.events.find(e => e.id === currentCommentId);
    }

    if (!item || !item.comments || item.comments.length === 0) {
        commentsContainer.innerHTML = `
          <div class="empty-state">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        `;
        return;
    }

    commentsContainer.innerHTML = '';

    // Sort comments by date, newest first
    const sortedComments = [...item.comments].sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    sortedComments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';

        const createdDate = new Date(comment.createdAt).toLocaleString();
        const isLiked = comment.likedBy?.includes(getUserIdentifier());
        const likeClass = isLiked ? 'liked' : '';

        commentItem.innerHTML = `
          <div class="comment-header">
            <span>${comment.author}</span>
            <span>${createdDate}</span>
          </div>
          <div class="comment-content">${comment.text}</div>
          <div class="comment-actions">
            <button class="action-btn ${likeClass}" onclick="likeComment('${comment.id}')">
              ❤️ ${comment.likes || 0}
            </button>
          </div>
        `;

        commentsContainer.appendChild(commentItem);
    });
}

async function addComment() {
    const text = document.getElementById('commentText').value.trim();
    const author = document.getElementById('commentAuthor').value.trim();

    if (!text || !author) {
        alert('Please enter both comment and your name');
        return;
    }

    const data = await Data.loadData();
    const pageIndex = data.recapsPages.findIndex(p => p.id === currentPageId);

    if (pageIndex === -1) return;

    let itemArray, itemIndex;

    if (currentCommentType === 'post') {
        itemArray = data.recapsPages[pageIndex].posts;
        itemIndex = itemArray.findIndex(p => p.id === currentCommentId);
    } else if (currentCommentType === 'event') {
        itemArray = data.recapsPages[pageIndex].events;
        itemIndex = itemArray.findIndex(e => e.id === currentCommentId);
    }

    if (itemIndex === -1) return;

    const newComment = {
        id: Date.now().toString(),
        text,
        author,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedBy: []
    };

    if (!itemArray[itemIndex].comments) {
        itemArray[itemIndex].comments = [];
    }

    itemArray[itemIndex].comments.push(newComment);
    await Data.saveData(data);

    // Clear form
    document.getElementById('commentText').value = '';

    // Reload comments
    await loadComments();

    // Also refresh the main view to update comment counts
    if (currentCommentType === 'post') {
        await loadPosts();
    } else if (currentCommentType === 'event') {
        await loadEvents();
    }
}

async function likeComment(commentId) {
    const data = await Data.loadData();
    const pageIndex = data.recapsPages.findIndex(p => p.id === currentPageId);

    if (pageIndex === -1) return;

    let itemArray, itemIndex, commentIndex;

    if (currentCommentType === 'post') {
        itemArray = data.recapsPages[pageIndex].posts;
        itemIndex = itemArray.findIndex(p => p.id === currentCommentId);
    } else if (currentCommentType === 'event') {
        itemArray = data.recapsPages[pageIndex].events;
        itemIndex = itemArray.findIndex(e => e.id === currentCommentId);
    }

    if (itemIndex === -1) return;

    const comments = itemArray[itemIndex].comments;
    commentIndex = comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) return;

    const comment = comments[commentIndex];
    const userId = getUserIdentifier();

    if (!comment.likedBy) {
        comment.likedBy = [];
    }

    const alreadyLiked = comment.likedBy.includes(userId);

    if (alreadyLiked) {
        // Unlike
        comment.likedBy = comment.likedBy.filter(id => id !== userId);
        comment.likes = (comment.likes || 1) - 1;
    } else {
        // Like
        comment.likedBy.push(userId);
        comment.likes = (comment.likes || 0) + 1;
    }

    await Data.saveData(data);
    await loadComments();
}