// App Store main module (extracted from inline script)
import Firestore from '../../scripts/FirestoreHandler.js';

// Update app to latest version
async function updateApp(app) {
    const installedApp = getInstalledApp(app.id);
    if (!installedApp) return;

    if (confirm(`Update "${app.name}" from v${installedApp.version} to v${app.version}?`)) {
        try {
            // If it's an XML app, load the latest version
            if (app.path && app.path.endsWith('.xml')) {
                const response = await fetch(app.path);
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                const updatedApp = parseXMLApp(xmlDoc);
                if (updatedApp) {
                    updatedApp.path = app.path; // Set the path from the store app
                    // Find and update the installed app
                    const index = installedApps.findIndex(a => a.id === app.id);
                    if (index !== -1) {
                        // Preserve installation metadata
                        updatedApp.addedToHome = true;
                        updatedApp.installedFromStore = installedApp.installedFromStore;
                        updatedApp.createdAt = installedApp.createdAt;
                        updatedApp.updatedAt = new Date().toISOString();
                        
                        installedApps[index] = updatedApp;
                        localStorage.setItem('webhub-created-apps', JSON.stringify(installedApps));
                        
                        alert(`${updatedApp.name} updated to v${updatedApp.version}. The page will now reload.`);
                        window.top.location.reload();
                    }
                }
            } else {
                // For non-XML apps, just update the metadata
                const index = installedApps.findIndex(a => a.id === app.id);
                if (index !== -1) {
                    installedApps[index] = {
                        ...app,
                        addedToHome: true,
                        installedFromStore: installedApp.installedFromStore,
                        createdAt: installedApp.createdAt,
                        updatedAt: new Date().toISOString()
                    };
                    localStorage.setItem('webhub-created-apps', JSON.stringify(installedApps));
                    
                    alert(`${app.name} updated to v${app.version}. The page will now reload.`);
                    window.top.location.reload();
                }
            }
        } catch (error) {
            console.error('Error updating app:', error);
            alert('Failed to update app');
        }
    }
}

// Create app card
function createAppCard(app) {
    const card = document.createElement('div');
    card.className = 'app-card';
    
    // Add status class if app has a status
    if (app.status && app.status.trim() !== '') {
        const statusClass = app.status.toLowerCase().replace(/\s+/g, '-');
        card.classList.add(`status-${statusClass}`);
    }

    const isInstalled = isAppInstalled(app.id);
    const updateAvailable = hasUpdateAvailable(app);
    
    let buttonContent = '';
    let buttonClass = 'install-btn';
    
    if (updateAvailable) {
        buttonClass = 'install-btn update';
        buttonContent = `
            <span class="material-symbols-outlined">system_update</span>
            Update to v${app.version}
        `;
    } else if (isInstalled) {
        buttonClass = 'install-btn installed';
        buttonContent = `
            <span class="material-symbols-outlined">delete</span>
            Uninstall
        `;
    } else {
        buttonContent = `
            <span class="material-symbols-outlined">download</span>
            Install
        `;
    }

    card.innerHTML = `
        <div class="app-card-header">
            <div class="app-card-icon">
                ${app.icon && app.icon.trim() !== '' 
                    ? `<img src="${app.icon.trim()}" alt="${app.name}" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>apps</span>'">` 
                    : '<span class="material-symbols-outlined">apps</span>'}
            </div>
            <div class="app-card-info">
                <div class="app-card-title">${app.name}</div>
                <div class="app-card-author">by ${app.author || 'Unknown'}</div>
            </div>
        </div>
        <div class="app-card-description">${app.description || 'No description available'}</div>
        ${app.tags && app.tags.length > 0 ? `
            <div class="app-card-tags">
                ${app.tags.map(tag => `<span class="app-card-tag">${tag}</span>`).join('')}
            </div>
        ` : ''}
        <div class="app-card-footer">
            <div class="app-card-stats">
                ${app.downloads ? `<div class="app-card-stat"><span class="material-symbols-outlined">download</span>${app.downloads}</div>` : ''}
                ${app.rating ? `<div class="app-card-stat"><span class="material-symbols-outlined">star</span>${app.rating.toFixed(1)}</div>` : ''}
                ${app.version ? `<div class="app-card-stat"><span class="material-symbols-outlined">tag</span>v${app.version}</div>` : ''}
            </div>
            <button class="${buttonClass}" data-app-id="${app.id}">
                ${buttonContent}
            </button>
        </div>
    `;

    // Add status badge if app has a status
    if (app.status && app.status.trim() !== '') {
        const statusBadge = document.createElement('div');
        statusBadge.className = `status-badge ${app.status.toLowerCase().replace(/\s+/g, '-')}`;
        statusBadge.textContent = app.status;
        card.appendChild(statusBadge);
    }

    // Add event listeners
    const installBtn = card.querySelector('.install-btn');
    installBtn.tabIndex = -1; // Prevent button from getting focus
    installBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleInstallClick(app);
    });

    card.addEventListener('click', () => {
        showAppDetails(app);
    });

    return card;
}

// Handle install button click
async function handleInstallClick(app) {
    const isInstalled = isAppInstalled(app.id);
    const updateAvailable = hasUpdateAvailable(app);

    if (updateAvailable) {
        await updateApp(app);
    } else if (isInstalled) {
        uninstallApp(app.id);
    } else {
        await installApp(app);
    }
}

// Show app details modal
function showAppDetails(app) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'app-details-modal';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <div class="modal-header">
                <div class="app-header">
                    <div class="app-icon">
                        ${app.icon && app.icon.trim() !== '' 
                            ? `<img src="${app.icon.trim()}" alt="${app.name}" onerror="this.parentElement.innerHTML='<span class=\\'material-symbols-outlined\\'>apps</span>'">` 
                            : '<span class="material-symbols-outlined">apps</span>'}
                    </div>
                    <div class="app-info">
                        <h2>${app.name}</h2>
                        <p>by ${app.author || 'Unknown'}</p>
                        ${app.version ? `<span class="version">v${app.version}</span>` : ''}
                    </div>
                </div>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="description">
                    <h3>Description</h3>
                    <p>${app.description || 'No description available'}</p>
                </div>
                ${app.htmlContent ? `
                <div class="rating-section">
                    <h3>Rate this app</h3>
                    <div class="star-rating" data-app-id="${app.id}">
                        <span class="star" data-rating="1">★</span>
                        <span class="star" data-rating="2">★</span>
                        <span class="star" data-rating="3">★</span>
                        <span class="star" data-rating="4">★</span>
                        <span class="star" data-rating="5">★</span>
                    </div>
                    <div class="rating-message" id="rating-message-${app.id}"></div>
                </div>
                ` : ''}
                ${app.tags && app.tags.length > 0 ? `
                    <div class="tags">
                        <h3>Tags</h3>
                        <div class="tag-list">
                            ${app.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${app.screenshots && app.screenshots.length > 0 ? `
                    <div class="screenshots">
                        <h3>Screenshots</h3>
                        <div class="screenshot-grid">
                            ${app.screenshots.map(screenshot => `<img src="${screenshot}" alt="Screenshot" onerror="this.style.display='none'">`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <div class="app-stats">
                    ${app.downloads ? `<span><span class="material-symbols-outlined">download</span>${app.downloads} downloads</span>` : ''}
                    ${app.rating ? `<span><span class="material-symbols-outlined">star</span>${app.rating}</span>` : ''}
                </div>
                <div class="actions">
                    ${isAppInstalled(app.id) ? 
                        (hasUpdateAvailable(app) ? 
                            `<button class="update-btn" data-app-id="${app.id}"><span class="material-symbols-outlined">system_update</span>Update</button>` :
                            `<button class="uninstall-btn" data-app-id="${app.id}"><span class="material-symbols-outlined">delete</span>Uninstall</button>`
                        ) :
                        `<button class="install-btn" data-app-id="${app.id}"><span class="material-symbols-outlined">download</span>Install</button>`
                    }
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .app-details-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
        }
        .modal-content {
            position: relative;
            background: #121218;
            border: 1px solid #1f1f28;
            border-radius: 16px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            width: 90%;
            margin: 20px;
        }
        .modal-header {
            padding: 24px;
            border-bottom: 1px solid #1f1f28;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .app-header {
            display: flex;
            gap: 16px;
            align-items: center;
        }
        .app-icon {
            width: 64px;
            height: 64px;
            border-radius: 16px;
            background: #1a1a24;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: #71717a;
        }
        .app-icon img {
            width: 100%;
            height: 100%;
            border-radius: 16px;
            object-fit: cover;
        }
        .app-info h2 {
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 4px;
        }
        .app-info p {
            color: #71717a;
            font-size: 14px;
        }
        .version {
            background: #1a1a24;
            color: #a1a1aa;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 8px;
        }
        .close-btn {
            background: none;
            border: none;
            color: #71717a;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        .close-btn:hover {
            background: #1a1a24;
            color: #e4e4e7;
        }
        .modal-body {
            padding: 24px;
        }
        .description h3, .tags h3, .screenshots h3, .rating-section h3 {
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 12px;
        }
        .description p {
            color: #a1a1aa;
            line-height: 1.6;
        }
        .tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .tag {
            background: #1a1a24;
            color: #a1a1aa;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 14px;
        }
        .screenshot-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        .screenshot-grid img {
            width: 100%;
            border-radius: 8px;
            border: 1px solid #1f1f28;
        }
        .rating-section {
            margin-bottom: 24px;
        }
        .star-rating {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
        }
        .star {
            font-size: 24px;
            color: #52525b;
            cursor: pointer;
            transition: color 0.2s ease;
        }
        .star:hover, .star.active {
            color: #fbbf24;
        }
        .rating-message {
            font-size: 14px;
            color: #a1a1aa;
            min-height: 20px;
        }
        .rating-message.success {
            color: #10b981;
        }
        .rating-message.error {
            color: #ef4444;
        }
        .modal-footer {
            padding: 24px;
            border-top: 1px solid #1f1f28;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .app-stats {
            display: flex;
            gap: 16px;
            color: #71717a;
            font-size: 14px;
        }
        .app-stats span {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .actions {
            display: flex;
            gap: 12px;
        }
        .install-btn, .update-btn, .uninstall-btn {
            background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
            color: #fff;
            border: 1px solid #444;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 300;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.3s ease;
        }
        .install-btn:hover, .update-btn:hover {
            border-color: rgba(100, 150, 255, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(100, 150, 255, 0.2);
        }
        .uninstall-btn {
            background: #10b981;
        }
        .uninstall-btn:hover {
            background: #059669;
        }
        .update-btn {
            background: #f59e0b;
        }
        .update-btn:hover {
            background: #d97706;
        }
    `;
    document.head.appendChild(style);

    // Add event listeners
    modal.querySelector('.close-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
    });

    modal.querySelector('.modal-backdrop').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
    });

    const installBtn = modal.querySelector('.install-btn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            await installApp(app);
            document.body.removeChild(modal);
            document.head.removeChild(style);
        });
    }

    const updateBtn = modal.querySelector('.update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            await updateApp(app);
            document.body.removeChild(modal);
            document.head.removeChild(style);
        });
    }

    const uninstallBtn = modal.querySelector('.uninstall-btn');
    if (uninstallBtn) {
        uninstallBtn.addEventListener('click', () => {
            uninstallApp(app.id);
            document.body.removeChild(modal);
            document.head.removeChild(style);
        });
    }

    // Setup star rating (only for community apps)
    if (app.htmlContent) {
        setupStarRating(app.id);
    }
}

// Setup star rating functionality
function setupStarRating(appId) {
    const starRating = document.querySelector(`.star-rating[data-app-id="${appId}"]`);
    const stars = starRating.querySelectorAll('.star');
    const messageElement = document.getElementById(`rating-message-${appId}`);
    
    // Check if user has already rated today
    const ratingKey = `app_rating_${appId}`;
    const lastRatedKey = `app_last_rated_${appId}`;
    const today = new Date().toDateString();
    const lastRated = localStorage.getItem(lastRatedKey);
    
    if (lastRated === today) {
        const savedRating = localStorage.getItem(ratingKey);
        if (savedRating) {
            // Show saved rating and disable interaction
            updateStarsDisplay(stars, parseInt(savedRating));
            messageElement.textContent = `You rated this app ${savedRating} star${savedRating > 1 ? 's' : ''} today`;
            messageElement.className = 'rating-message success';
            stars.forEach(star => {
                star.style.cursor = 'default';
                star.style.pointerEvents = 'none';
            });
            return;
        }
    }
    
    // Setup hover effects
    stars.forEach((star, index) => {
        star.addEventListener('mouseover', () => {
            updateStarsDisplay(stars, index + 1);
        });
        
        star.addEventListener('mouseout', () => {
            updateStarsDisplay(stars, 0);
        });
        
        star.addEventListener('click', async () => {
            const rating = index + 1;
            await submitRating(appId, rating, stars, messageElement);
        });
    });
}

// Update star display
function updateStarsDisplay(stars, rating) {
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Submit rating
async function submitRating(appId, rating, stars, messageElement) {
    try {
        messageElement.textContent = 'Submitting rating...';
        messageElement.className = 'rating-message';
        
        // Save to Firestore
        const result = await Firestore({
            Method: 'get',
            CollectionName: 'data',
            Document: 'programs_data',
            SubCollection: 'shawnyxx',
            SubDocument: 'apps'
        });
        
        if (!result || !result.community) {
            throw new Error('Failed to load apps data');
        }
        
        const appIndex = result.community.findIndex(app => app.id === appId);
        if (appIndex === -1) {
            // App not found - this might happen for newly published apps or data sync issues
            messageElement.textContent = 'Unable to save rating. The app may not be available yet. Please try again later.';
            messageElement.className = 'rating-message error';
            return;
        }
        
        const app = result.community[appIndex];
        
        // Initialize ratings array if it doesn't exist
        if (!app.ratings) {
            app.ratings = [];
        }
        
        // Add new rating
        app.ratings.push({
            rating: rating,
            timestamp: new Date().toISOString(),
            userId: 'anonymous' // Could be enhanced with user identification
        });
        
        // Calculate new average rating
        const totalRating = app.ratings.reduce((sum, r) => sum + r.rating, 0);
        app.rating = totalRating / app.ratings.length;
        
        // Save back to Firestore
        await Firestore({
            Method: 'set',
            CollectionName: 'data',
            Document: 'programs_data',
            SubCollection: 'shawnyxx',
            SubDocument: 'apps',
            Data: result
        });
        
        // Save to localStorage to prevent re-rating
        const ratingKey = `app_rating_${appId}`;
        const lastRatedKey = `app_last_rated_${appId}`;
        localStorage.setItem(ratingKey, rating.toString());
        localStorage.setItem(lastRatedKey, new Date().toDateString());
        
        // Update UI
        updateStarsDisplay(stars, rating);
        messageElement.textContent = `Thank you! You rated this app ${rating} star${rating > 1 ? 's' : ''}`;
        messageElement.className = 'rating-message success';
        
        // Disable further interaction
        stars.forEach(star => {
            star.style.cursor = 'default';
            star.style.pointerEvents = 'none';
        });
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        messageElement.textContent = 'Failed to submit rating. Please try again.';
        messageElement.className = 'rating-message error';
    }
}

// Install app
async function installApp(app) {
    try {
        // Increment download count for community apps
        if (app.htmlContent) {
            try {
                const result = await Firestore({
                    Method: 'get',
                    CollectionName: 'data',
                    Document: 'programs_data',
                    SubCollection: 'shawnyxx',
                    SubDocument: 'apps'
                });
                
                if (result && result.community) {
                    const appIndex = result.community.findIndex(communityApp => communityApp.id === app.id);
                    if (appIndex !== -1) {
                        const communityApp = result.community[appIndex];
                        
                        // Initialize downloads if it doesn't exist
                        if (!communityApp.downloads) {
                            communityApp.downloads = 0;
                        }
                        
                        // Increment download count
                        communityApp.downloads += 1;
                        
                        // Save back to database
                        await Firestore({
                            Method: 'set',
                            CollectionName: 'data',
                            Document: 'programs_data',
                            SubCollection: 'shawnyxx',
                            SubDocument: 'apps',
                            Data: result
                        });
                    }
                }
            } catch (error) {
                console.error('Error updating download count:', error);
                // Continue with installation even if download count update fails
            }
        }

        // If it's an XML app, load and parse it
        if (app.path && app.path.endsWith('.xml')) {
            const response = await fetch(app.path);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const parsedApp = parseXMLApp(xmlDoc);
            if (parsedApp) {
                parsedApp.path = app.path; // Set the path from the store app
                parsedApp.addedToHome = true;
                parsedApp.installedFromStore = true;
                parsedApp.createdAt = new Date().toISOString();
                parsedApp.updatedAt = new Date().toISOString();
                
                installedApps.push(parsedApp);
                localStorage.setItem('webhub-created-apps', JSON.stringify(installedApps));
                
                alert(`${parsedApp.name} installed successfully!`);
                window.top.location.reload();
            }
        } else {
            // For non-XML apps, just add the metadata
            const appToInstall = {
                ...app,
                addedToHome: true,
                installedFromStore: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            installedApps.push(appToInstall);
            localStorage.setItem('webhub-created-apps', JSON.stringify(installedApps));
            
            alert(`${app.name} installed successfully!`);
            window.top.location.reload();
        }
    } catch (error) {
        console.error('Error installing app:', error);
        alert('Failed to install app');
    }
}

// Uninstall app
function uninstallApp(appId) {
    const index = installedApps.findIndex(app => app.id === appId);
    if (index !== -1) {
        const app = installedApps[index];
        if (confirm(`Uninstall "${app.name}"?`)) {
            installedApps.splice(index, 1);
            localStorage.setItem('webhub-created-apps', JSON.stringify(installedApps));
            alert(`${app.name} uninstalled successfully!`);
            window.top.location.reload();
        }
    }
}

// Check if app is installed
function isAppInstalled(appId) {
    return installedApps.some(app => app.id === appId);
}

// Check if update is available
function hasUpdateAvailable(app) {
    const installedApp = getInstalledApp(app.id);
    if (!installedApp) return false;
    
    // Simple version comparison (assuming semantic versioning)
    const installedVersion = installedApp.version || '0.0.0';
    const storeVersion = app.version || '0.0.0';
    
    return storeVersion !== installedVersion;
}

// Get installed app
function getInstalledApp(appId) {
    return installedApps.find(app => app.id === appId);
}

// Parse XML app
function parseXMLApp(xmlDoc) {
    try {
        const appElement = xmlDoc.querySelector('app');
        if (!appElement) return null;

        const app = {
            id: appElement.getAttribute('id') || generateId(),
            name: appElement.querySelector('name')?.textContent || 'Unnamed App',
            description: appElement.querySelector('description')?.textContent || '',
            author: appElement.querySelector('author')?.textContent || 'Unknown',
            version: appElement.querySelector('version')?.textContent || '1.0.0',
            icon: appElement.querySelector('icon')?.textContent || '',
            html: appElement.querySelector('html')?.textContent || '',
            lightMode: appElement.querySelector('lightMode')?.textContent === 'true',
            openSource: appElement.querySelector('openSource')?.textContent === 'true',
            genericStyle: appElement.querySelector('genericStyle')?.textContent === 'true',
            tags: Array.from(appElement.querySelectorAll('tag')).map(tag => tag.textContent),
            status: appElement.querySelector('status')?.textContent || '',
            downloads: parseInt(appElement.querySelector('downloads')?.textContent) || 0,
            rating: parseFloat(appElement.querySelector('rating')?.textContent) || 0,
            screenshots: Array.from(appElement.querySelectorAll('screenshot')).map(screenshot => screenshot.textContent)
        };

        return app;
    } catch (error) {
        console.error('Error parsing XML app:', error);
        return null;
    }
}

// Generate unique ID
function generateId() {
    return 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Load apps from different sources
let featuredApps = [];
let userApps = [];
let betaApps = [];
let installedApps = [];

// Load featured apps (from manifest.json and XML files)
async function loadFeaturedApps() {
    try {
        const manifestResponse = await fetch('/assets/apps/featured-apps/manifest.json');
        if (!manifestResponse.ok) {
            console.error('Failed to load manifest.json');
            return;
        }
        const manifest = await manifestResponse.json();
        
        featuredApps = [];
        
        // Load each XML app from the manifest
        for (const filename of manifest.apps) {
            try {
                const xmlResponse = await fetch('/assets/apps/featured-apps/' + filename);
                if (xmlResponse.ok) {
                    const xmlText = await xmlResponse.text();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                    
                    const appElement = xmlDoc.querySelector('app');
                    if (appElement) {
                        const app = {
                            id: appElement.querySelector('id')?.textContent || filename.replace('.xml', ''),
                            name: appElement.querySelector('name')?.textContent || 'Unknown App',
                            author: appElement.querySelector('author')?.textContent || 'Unknown',
                            description: appElement.querySelector('description')?.textContent || '',
                            version: appElement.querySelector('version')?.textContent || '1.0.0',
                            icon: appElement.querySelector('icon')?.textContent || '',
                            path: '/assets/apps/featured-apps/' + filename,
                            tags: Array.from(appElement.querySelectorAll('tags > tag')).map(tag => tag.textContent),
                            status: '',
                            opensource: appElement.querySelector('opensource')?.textContent === 'true'
                        };
                        
                        featuredApps.push(app);
                    }
                } else {
                    console.error('Failed to load XML:', filename);
                }
            } catch (error) {
                console.error('Error loading XML app:', filename, error);
            }
        }
        
        renderFeaturedApps();
    } catch (error) {
        console.error('Error loading featured apps:', error);
    }
}

// Load user submitted apps (from Firestore)
async function loadUserApps() {
    try {
        const data = await Firestore({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' });
        userApps = data && data.community ? data.community.map(app => ({
            ...app,
            htmlContent: app.htmlContent ? atob(app.htmlContent) : app.htmlContent,
            icon: app.icon // already data url
        })) : [];
        renderCommunityApps();
    } catch (error) {
    }
}

// Load beta apps (from apps.json)
async function loadBetaApps() {
    try {
        const response = await fetch('/assets/json/apps.json');
        const appsData = await response.json();
        
        betaApps = appsData.beta || [];
        renderBetaApps();
    } catch (error) {
        console.error('Error loading beta apps:', error);
    }
}

// Load installed apps
function loadInstalledApps() {
    try {
        const stored = localStorage.getItem('webhub-created-apps');
        installedApps = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading installed apps:', error);
        installedApps = [];
    }
}

// Render featured apps
function renderFeaturedApps() {
    const grid = document.getElementById('featured-apps-grid');
    grid.style.display = 'grid';
    grid.innerHTML = '';

    const allFeatured = [...featuredApps, ...userApps];

    if (allFeatured.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">star</span>
                <h3>No featured apps available</h3>
                <p>Check back later for curated apps</p>
            </div>
        `;
        return;
    }

    allFeatured.forEach(app => {
        grid.appendChild(createAppCard(app));
    });
}

// Render beta apps
function renderBetaApps() {
    const grid = document.getElementById('beta-apps-grid');
    grid.style.display = 'grid';
    grid.innerHTML = '';

    if (betaApps.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">science</span>
                <h3>No advanced apps available</h3>
                <p>Check back later for experimental apps</p>
            </div>
        `;
        return;
    }

    betaApps.forEach(app => {
        grid.appendChild(createAppCard(app));
    });
}

// Render community apps
function renderCommunityApps() {
    const grid = document.getElementById('community-apps-grid');
    const loadingMessage = grid.previousElementSibling;
    
    if (userApps.length === 0) {
        loadingMessage.style.display = 'none';
        grid.style.display = 'block';
        grid.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">group</span>
                <h3>No community apps available</h3>
                <p>Check back later for user-submitted apps</p>
            </div>
        `;
        return;
    }

    loadingMessage.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = '';

    userApps.forEach(app => {
        grid.appendChild(createAppCard(app));
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            performSearch(query);
        } else {
            // Clear search, show all apps in current section
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection) {
                const sectionId = activeSection.id.replace('-section', '');
                if (sectionId === 'featured') renderFeaturedApps();
                else if (sectionId === 'community') renderCommunityApps();
                else if (sectionId === 'beta') renderBetaApps();
            }
        }
    });
}

// Perform search
function performSearch(query) {
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return;

    const sectionId = activeSection.id.replace('-section', '');
    let apps = [];
    if (sectionId === 'featured') apps = featuredApps;
    else if (sectionId === 'community') apps = userApps;
    else if (sectionId === 'beta') apps = betaApps;

    const filteredApps = filterApps(apps, query);
    renderSearchApps(filteredApps, sectionId);
}

// Filter apps based on search query
function filterApps(apps, query) {
    if (!query) return apps;

    const lowerQuery = query.toLowerCase();
    return apps.filter(app => {
        const nameMatch = app.name.toLowerCase().includes(lowerQuery);
        const tagsMatch = (app.tags || []).some(tag => tag.toLowerCase().includes(lowerQuery));
        const authorMatch = (app.author || '').toLowerCase().includes(lowerQuery);
        return nameMatch || tagsMatch || authorMatch;
    });
}

// Render search apps
function renderSearchApps(apps, sectionId) {
    const grid = document.getElementById(sectionId + '-apps-grid');
    grid.innerHTML = '';

    if (apps.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">search_off</span>
                <h3>No apps found</h3>
                <p>Try a different search term</p>
            </div>
        `;
        return;
    }

    apps.forEach(app => {
        grid.appendChild(createAppCard(app));
    });
}

// Tab switching
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

// Switch tab
function switchTab(tabName) {
    // Update tab active states
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    // Update content active states
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// Initialize app
async function init() {
    loadInstalledApps();
    
    // Load apps from different sources
    await Promise.all([
        loadFeaturedApps(),
        loadUserApps(),
        loadBetaApps()
    ]);
    
    setupSearch();
    setupTabs();
}

// Start the app
init();