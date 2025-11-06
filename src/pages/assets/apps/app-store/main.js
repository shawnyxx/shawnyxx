// App Store main module (extracted from inline script)
import Firestore from '../../../../scripts/FirestoreHandler.js';

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
                    : `<span class="material-symbols-outlined">apps</span>`
                }
            </div>
            <div class="app-card-info">
                <div class="app-card-name">
                    ${app.name}
                    ${app.version ? `<span class="app-card-version">v${app.version}</span>` : ''}
                </div>
                <div class="app-card-author">by ${app.author || 'Unknown'}</div>
            </div>
        </div>
        <div class="app-card-description">${app.description || 'No description available.'}</div>
        <div class="app-card-tags">
            ${(app.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <div class="app-card-footer">
            <button class="${buttonClass}" data-app-id="${app.id}">
                ${buttonContent}
            </button>
        </div>
    `;

    // Add button event listener
    const installBtn = card.querySelector('.install-btn');
    if (updateAvailable) {
        installBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateApp(app);
        });
    } else if (isInstalled) {
        installBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uninstallApp(app);
        });
    } else {
        installBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            installApp(app);
        });
    }

    return card;
}

// Filter apps by search query
function filterApps(query) {
    const searchApps = getSearchApps();
    
    if (!query || query.trim() === '') {
        return searchApps;
    }

    const lowerQuery = query.toLowerCase();
    return searchApps.filter(app => {
        const nameMatch = app.name.toLowerCase().includes(lowerQuery);
        const tagsMatch = (app.tags || []).some(tag => tag.toLowerCase().includes(lowerQuery));
        const authorMatch = (app.author || '').toLowerCase().includes(lowerQuery);
        return nameMatch || tagsMatch || authorMatch;
    });
}

// Render search apps
function renderSearchApps(apps) {
    const grid = document.getElementById('search-apps-grid');
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

// Render explore apps (user submitted apps)
function renderFeaturedApps() {
    const grid = document.getElementById('featured-apps-grid');
    grid.innerHTML = '';

    if (userApps.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">inbox</span>
                <h3>No featured apps available</h3>
                <p>Check back later for curated apps</p>
            </div>
        `;
        return;
    }

    userApps.forEach(app => {
        grid.appendChild(createAppCard(app));
    });
}

// Render community apps
function renderCommunityApps() {
    const grid = document.getElementById('community-apps-grid');
    grid.innerHTML = '';

    if (communityApps.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">group</span>
                <h3>No community apps yet</h3>
                <p>Be the first to publish an app to the community!</p>
            </div>
        `;
        return;
    }

    communityApps.forEach(app => {
        grid.appendChild(createAppCard(app));
    });
}

// Render beta apps
function renderBetaApps() {
    const grid = document.getElementById('beta-apps-grid');
    grid.innerHTML = '';

    if (betaApps.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">science</span>
                <h3>No beta apps available</h3>
                <p>Check back later for experimental apps</p>
            </div>
        `;
        return;
    }

    betaApps.forEach(app => {
        grid.appendChild(createAppCard(app));
    });
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const filteredApps = filterApps(e.target.value);
        renderSearchApps(filteredApps);
        
        // Auto-switch to search tab when typing
        if (e.target.value.trim() !== '') {
            const searchTab = document.querySelector('.tab[data-tab="search"]');
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            searchTab.classList.add('active');
            document.getElementById('search-tab').classList.add('active');
        }
    });
}

// Start the app
init();
