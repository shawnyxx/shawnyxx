// Default settings
const DEFAULT_SETTINGS = {
    wallpaper: '/assets/files/wallpapers/black-river.png',
    theme: 'dark',
    appOrder: [] // Store custom app order
};

// Site version for cache management
const SITE_VERSION = '1.0.1'; // Increment this when you make changes

// Silence console output on the site (replace console methods with no-ops)
(function(){
    const NOOP = function(){};
    try {
        if (window.console) {
            ['log','warn','error','info','debug','trace','group','groupCollapsed','groupEnd'].forEach(fn => {
                try { window.console[fn] = NOOP; } catch(e) {}
            });
        }
    } catch(e) {}

    // Also attempt to silence console in any same-origin iframes when they load
    function silenceIframeConsole(iframe) {
        try {
            // Don't silence console for app-store iframe to allow debugging
            if (iframe.src && iframe.src.includes('app-store')) {
                return;
            }
            const cw = iframe.contentWindow;
            if (cw && cw.console) {
                ['log','warn','error','info','debug','trace','group','groupCollapsed','groupEnd'].forEach(fn => {
                    try { cw.console[fn] = NOOP; } catch(e) {}
                });
            }
        } catch(e) { /* cross-origin or not available */ }
    }

    // Silence existing iframes
    document.querySelectorAll('iframe').forEach(silenceIframeConsole);

    // Watch for newly added iframes
    const mo = new MutationObserver((records) => {
        records.forEach(r => {
            r.addedNodes.forEach(n => {
                if (n.tagName === 'IFRAME') {
                    n.addEventListener('load', () => silenceIframeConsole(n));
                    // Try immediate silence if already loaded
                    silenceIframeConsole(n);
                }
            });
        });
    });
    try { mo.observe(document.documentElement || document.body, { childList: true, subtree: true }); } catch(e) {}
})();

// Available wallpapers directory
const WALLPAPERS_PATH = '/assets/files/wallpapers/';

// State management
let apps = [];
let betaApps = [];
let userApps = [];
let preinstalledApps = [];
let settings = { ...DEFAULT_SETTINGS };
let createdApps = [];
let currentEditingApp = null;
let selectedWallpaper = null;
let monacoEditor = null;
let monacoLoaded = false;
let draggedElement = null;
let draggedIndex = null;
let currentPage = 0;
const APPS_PER_PAGE = window.innerWidth > 768 ? 24 : 20; // 6x4 on desktop, 4x5 on mobile
let hasUnsavedChanges = false;
let initialAppState = null;
let hasUnsavedSettings = false;
let initialSettingsState = null;
let socials = {};
let releases = [];
let currentRelease = {
    title: '',
    subtitle: '',
    version: '',
    body: [],
    footer: []
};
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionRect = null;
let hasUnsavedRelease = false;
let releaseInitialState = null;

// Initialize the application
async function init() {
    // Set the current site version in localStorage
    localStorage.setItem('site-version', SITE_VERSION);
    
    // Clear cache if online (to get latest updates)
    if (navigator.onLine && 'serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            if (registration.active) {
                // Create a message channel for response
                const messageChannel = new MessageChannel();
                
                // Send clear cache message
                registration.active.postMessage(
                    { type: 'CLEAR_CACHE' },
                    [messageChannel.port2]
                );
                
            }
        } catch (error) {
        }
    }
    
    // Load settings from localStorage or defaults
    loadSettings();
    
    // Load created apps
    loadCreatedApps();
    
    // Apply theme
    applyTheme();
    
    // Load default settings from settings.json
    await loadDefaultSettings();
    
    // Load apps from apps.json
    await loadApps();
    
    // Load socials
    await loadSocials();
    
    // Load releases
    await loadReleases();
    
    // Render apps
    renderApps();
    
    // Set wallpaper
    setWallpaper(settings.wallpaper);
    
    // Update clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize Monaco Editor
    initMonacoEditor();
    
    // Setup selection rectangle
    setupSelectionRectangle();
    
    // Setup home context menu
    setupHomeContextMenu();
    
    // Initialize media player widget
    initMediaWidget();
    
    // Hide loading screen after everything is loaded
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
        
        // Remove loading screen from DOM after transition
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 1500);
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('webhub-settings');
    if (savedSettings) {
        try {
            settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        } catch (e) {
            console.error('Error loading settings:', e);
            settings = { ...DEFAULT_SETTINGS };
        }
    }
}

// Save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem('webhub-settings', JSON.stringify(settings));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            // If quota exceeded, try to save without wallpaper if it's a data URL
            if (settings.wallpaper && settings.wallpaper.startsWith('data:image/')) {
                showNotification('Wallpaper too large to save. Using default wallpaper instead.');
                settings.wallpaper = DEFAULT_SETTINGS.wallpaper;
                try {
                    localStorage.setItem('webhub-settings', JSON.stringify(settings));
                } catch (e2) {
                    console.error('Failed to save settings:', e2);
                    showNotification('Failed to save settings');
                }
            } else {
                console.error('Storage quota exceeded:', e);
                showNotification('Storage quota exceeded. Please clear some data.');
            }
        } else {
            console.error('Error saving settings:', e);
            showNotification('Failed to save settings');
        }
    }
}

// Load created apps from localStorage
function loadCreatedApps() {
    const savedApps = localStorage.getItem('webhub-created-apps');
    if (savedApps) {
        try {
            createdApps = JSON.parse(savedApps);
        } catch (e) {
            console.error('Error loading created apps:', e);
            createdApps = [];
        }
    }
}

// Save created apps to localStorage
function saveCreatedApps() {
    localStorage.setItem('webhub-created-apps', JSON.stringify(createdApps));
}

// Load default settings from settings.json
async function loadDefaultSettings() {
    try {
        const response = await fetch('/assets/json/settings.json');
        const defaultSettings = await response.json();
        
        if (!localStorage.getItem('webhub-settings')) {
            settings = { ...DEFAULT_SETTINGS, ...defaultSettings };
            saveSettings();
        }
    } catch (error) {
        console.error('Error loading default settings:', error);
    }
}

// Apply theme
function applyTheme() {
    if (settings.theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

// Set wallpaper
function setWallpaper(wallpaperPath) {
    const homeScreen = document.getElementById('home-screen');
    
    if (wallpaperPath && wallpaperPath.startsWith('data:image/')) {
        homeScreen.style.backgroundImage = `url(${wallpaperPath})`;
    } else if (wallpaperPath && wallpaperPath.trim() !== '') {
        const img = new Image();
        img.onload = () => {
            homeScreen.style.backgroundImage = `url(${wallpaperPath})`;
        };
        img.onerror = () => {
            homeScreen.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        };
        img.src = wallpaperPath;
    } else {
        homeScreen.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Invert wallpaper colors
function invertWallpaper(wallpaperPath) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Limit canvas size to reduce file size
            const maxDimension = 1920;
            let width = img.width;
            let height = img.height;
            
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = (height / width) * maxDimension;
                    width = maxDimension;
                } else {
                    width = (width / height) * maxDimension;
                    height = maxDimension;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx.drawImage(img, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];         // Red
                data[i + 1] = 255 - data[i + 1]; // Green
                data[i + 2] = 255 - data[i + 2]; // Blue
            }
            
            ctx.putImageData(imageData, 0, 0);
            // Use JPEG with quality 0.8 for better compression
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        
        img.onerror = reject;
        img.src = wallpaperPath;
    });
}

// Parse XML app data into app object
function parseXMLApp(xmlDoc, appId = null) {
    try {
        const appElement = xmlDoc.querySelector('app');
        if (!appElement) {
            console.error('No app element found in XML');
            return null;
        }
        
        // Get HTML content
        let htmlContent = appElement.querySelector('htmlContent')?.textContent || '';
        
        // Check if content is Base64 encoded
        const encoding = appElement.querySelector('metadata > encoding')?.textContent;
        if (encoding === 'base64' && htmlContent) {
            try {
                // Decode Base64 content
                htmlContent = decodeURIComponent(escape(atob(htmlContent)));
            } catch (error) {
                console.error('Error decoding Base64 content:', error);
                // If decoding fails, keep the original content
            }
        }
        
        return {
            id: appElement.querySelector('id')?.textContent || appId || 'unknown',
            name: appElement.querySelector('name')?.textContent || 'Unknown App',
            author: appElement.querySelector('author')?.textContent || 'Unknown',
            description: appElement.querySelector('description')?.textContent || '',
            version: appElement.querySelector('version')?.textContent || '1.0.0',
            icon: appElement.querySelector('icon')?.textContent || '',
            htmlContent: htmlContent,
            tags: Array.from(appElement.querySelectorAll('tags > tag')).map(tag => tag.textContent),
            lightmode: appElement.querySelector('lightmode')?.textContent === 'true',
            opensource: appElement.querySelector('opensource')?.textContent === 'true'
        };
    } catch (error) {
        console.error('Error parsing XML app:', error);
        return null;
    }
}

// Fetch full app data including HTML content from XML file
async function fetchAppFromXML(appPath) {
    try {
        const response = await fetch(appPath);
        if (!response.ok) return null;
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const appData = parseXMLApp(xmlDoc);
        if (appData) {
            appData.path = appPath; // Preserve the original path
        }
        return appData;
    } catch (error) {
        console.error('Error fetching app from XML:', error);
        return null;
    }
}

// Load apps from apps.json
async function loadApps() {
    try {
        const response = await fetch('/assets/json/apps.json');
        const appsData = await response.json();
        
        // Store categories separately
        preinstalledApps = appsData.apps || [];
        betaApps = appsData.beta || [];
        userApps = appsData.user || [];
        
        // Load built-in apps
        try {
            preinstalledApps.push({
                id: 'app-store',
                name: 'App Store',
                description: 'Browse and install apps from the community',
                author: 'Shawnyxx',
                version: '1.0.0',
                icon: '/assets/files/icons/app-store-icon.png',
                path: '/src/apps/app-store/index.html',
                lightmode: false,
                opensource: false,
                genericStyle: false,
                tags: ['utility', 'store'],
                status: '',
                opensource: false
            });
        } catch (error) {
            console.error('Error loading built-in app store:', error);
        }

        // Load Admin app only on localhost
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            try {
                preinstalledApps.push({
                    id: 'admin',
                    name: 'Admin',
                    description: 'Administrative panel for managing app deletion requests',
                    author: 'Shawnyxx',
                    version: '1.0.0',
                    icon: 'privacy_tip',
                    path: '/src/apps/admin/index.html',
                    lightmode: false,
                    opensource: false,
                    genericStyle: false,
                    isSystem: true,
                    tags: ['admin', 'system', 'management'],
                    status: '',
                    opensource: false
                });
            } catch (error) {
                console.error('Error loading admin app:', error);
            }
        }
        
        // Load user apps from manifest.json
        try {
            const manifestResponse = await fetch('/assets/apps/featured-apps/manifest.json');
            if (manifestResponse.ok) {
                const manifest = await manifestResponse.json();
                
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
                                
                                userApps.push(app);
                            }
                        }
                    } catch (error) {
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user apps manifest:', error);
        }
        
        // Combine all app categories into one array (for compatibility)
        apps = [
            ...preinstalledApps,
            ...betaApps,
            ...userApps
        ];
    } catch (error) {
        console.error('Error loading apps:', error);
        apps = [];
        preinstalledApps = [];
        betaApps = [];
        userApps = [];
    }
}

// Load socials from socials.json
async function loadSocials() {
    try {
        const response = await fetch('/assets/json/socials.json');
        socials = await response.json();
    } catch (error) {
        console.error('Error loading socials:', error);
        socials = {};
    }
}

// Load releases from manifest.json
async function loadReleases() {
    try {
        const response = await fetch('/assets/release-notes/manifest.json');
        const manifest = await response.json();
        releases = manifest.releases || [];
    } catch (error) {
        console.error('Error loading releases:', error);
        releases = [];
    }
}

// Render apps to the grid
function renderApps() {
    const appGrid = document.getElementById('app-grid');
    appGrid.innerHTML = '';
    
    // Collect all apps
    const allApps = [];
    
    // Add preinstalled apps (includes Settings from apps.json)
    preinstalledApps.forEach(app => {
        // Check if this app has been saved to createdApps (has HTML content cached)
        const savedApp = createdApps.find(a => a.id === app.id && a.addedToHome);
        if (savedApp) {
            // Use the saved version with HTML content
            allApps.push({ ...savedApp, isSystem: false });
        } else {
            allApps.push({ ...app, isSystem: false });
        }
    });
    
    // Add user apps from manifest.json ONLY if they're installed (saved to createdApps)
    // This makes apps like Flappy Bird, Music, etc. installable/uninstallable
    userApps.forEach(app => {
        const savedApp = createdApps.find(a => a.id === app.id && a.addedToHome && a.installedFromStore);
        if (savedApp) {
            // Only show if explicitly installed
            allApps.push({ ...savedApp, isSystem: false });
        }
    });
    
    // Add user-created apps from App Creator AND installed apps from App Store (including community apps)
    createdApps.forEach(app => {
        if (app.addedToHome) {
            // Check if this app was already added from userApps
            const alreadyAdded = allApps.some(a => a.id === app.id);
            if (!alreadyAdded) {
                // This includes both App Creator apps and Community/Featured apps from App Store
                allApps.push({ ...app, isSystem: false });
            }
        }
    });
    
    // Apply custom order if exists
    const orderedApps = applyCustomOrder(allApps);
    
    // Calculate pages
    const totalPages = Math.ceil(orderedApps.length / APPS_PER_PAGE);
    
    // Create pages
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const page = document.createElement('div');
        page.className = 'app-page';
        page.dataset.page = pageIndex;
        
        const startIndex = pageIndex * APPS_PER_PAGE;
        const endIndex = Math.min(startIndex + APPS_PER_PAGE, orderedApps.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const app = orderedApps[i];
            const appItem = createAppElementFromData(app, i);
            page.appendChild(appItem);
        }
        
        appGrid.appendChild(page);
    }
    
    // Update page indicators
    updatePageIndicators(totalPages);
    
    // Setup scroll listener for page indicators
    setupPageScrollListener();
}

// Apply custom app order from settings
function applyCustomOrder(apps) {
    if (!settings.appOrder || settings.appOrder.length === 0) {
        return apps;
    }
    
    const ordered = [];
    const appsMap = new Map(apps.map(app => [app.id || app.name, app]));
    
    // Add apps in custom order
    settings.appOrder.forEach(id => {
        if (appsMap.has(id)) {
            ordered.push(appsMap.get(id));
            appsMap.delete(id);
        }
    });
    
    // Add any new apps that aren't in the custom order yet
    appsMap.forEach(app => ordered.push(app));
    
    return ordered;
}

// Save app order to settings
function saveAppOrder() {
    const allApps = document.querySelectorAll('.app-item');
    const order = Array.from(allApps).map(item => item.dataset.appId);
    settings.appOrder = order;
    saveSettings();
}

// Update page indicators
function updatePageIndicators(totalPages) {
    const indicatorsContainer = document.getElementById('page-indicators');
    indicatorsContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = 'page-dot';
        if (i === 0) dot.classList.add('active');
        indicatorsContainer.appendChild(dot);
    }
}

// Setup page scroll listener
function setupPageScrollListener() {
    const appGrid = document.getElementById('app-grid');
    
    appGrid.addEventListener('scroll', () => {
        const pageWidth = appGrid.offsetWidth;
        const scrollLeft = appGrid.scrollLeft;
        const pageIndex = Math.round(scrollLeft / pageWidth);
        
        // Update page indicators
        const dots = document.querySelectorAll('.page-dot');
        dots.forEach((dot, index) => {
            if (index === pageIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    });
}

// Create app element from data
function createAppElementFromData(app, index) {
    const appItem = document.createElement('div');
    appItem.className = 'app-item';
    appItem.draggable = true;
    appItem.dataset.appId = app.id || app.name;
    appItem.dataset.index = index;
    
    const appIcon = document.createElement('div');
    appIcon.className = 'app-icon';
    
    // Handle system apps (App Creator) and Settings app with material icons
    if (app.isSystem || app.id === 'settings' || app.id === 'app-creator' || app.id === 'admin') {
        const iconName = app.id === 'settings' ? 'settings' : (app.id === 'app-creator' ? 'code' : (app.id === 'admin' ? 'privacy_tip' : (app.icon || '').toString().trim()));
        appIcon.innerHTML = `<span class="material-symbols-outlined settings-icon">${iconName}</span>`;
    } else if (app.icon && typeof app.icon === 'string' && app.icon.trim() !== '') {
        const iconImg = document.createElement('img');
        iconImg.src = app.icon.toString().trim();
        iconImg.alt = app.name;
        iconImg.onerror = function() {
            this.src = '/assets/files/icons/no-image-icon.ico';
        };
        appIcon.appendChild(iconImg);
    } else {
        const iconImg = document.createElement('img');
        iconImg.src = '/assets/files/icons/no-image-icon.ico';
        iconImg.alt = app.name;
        appIcon.appendChild(iconImg);
    }
    
    const appName = document.createElement('div');
    appName.className = 'app-name';
    appName.textContent = app.name;
    
    // Click handler
    if (app.isSystem && app.handler) {
        appItem.addEventListener('click', app.handler);
    } else if (app.id === 'settings') {
        // Special handler for settings app
        appItem.addEventListener('click', () => openSettings());
    } else if (app.id === 'admin') {
        // Special handler for admin app
        appItem.addEventListener('click', () => openApp(app));
    } else {
        appItem.addEventListener('click', () => openApp(app));
    }
    
    // Add context menu support (for installed apps from App Creator, user apps from manifest, and beta/preinstalled apps - but not Settings or App Creator)
    if (app.id !== 'settings' && app.id !== 'app-creator' && app.id !== 'admin' && !app.isSystem) {
        appItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, app);
        });
    }
    
    // Drag and drop event listeners
    appItem.addEventListener('dragstart', handleDragStart);
    appItem.addEventListener('dragover', handleDragOver);
    appItem.addEventListener('drop', handleDrop);
    appItem.addEventListener('dragend', handleDragEnd);
    appItem.addEventListener('dragenter', handleDragEnter);
    appItem.addEventListener('dragleave', handleDragLeave);
    
    appItem.appendChild(appIcon);
    appItem.appendChild(appName);
    return appItem;
}

// Drag and drop handlers
function handleDragStart(e) {
    draggedElement = this;
    draggedIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    e.preventDefault();
    
    if (draggedElement !== this) {
        // Get all app items across all pages
        const allAppItems = Array.from(document.querySelectorAll('.app-item'));
        const draggedIdx = allAppItems.indexOf(draggedElement);
        const targetIdx = allAppItems.indexOf(this);
        
        // Reorder the apps
        if (draggedIdx < targetIdx) {
            this.parentNode.insertBefore(draggedElement, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggedElement, this);
        }
        
        // Save the new order
        saveAppOrder();
    }
    
    this.classList.remove('drag-over');
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove all drag-over classes
    document.querySelectorAll('.app-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    draggedElement = null;
    draggedIndex = null;
}

// Open app in iframe
function openApp(app) {
    const appFrame = document.getElementById('app-frame');
    const appTitle = document.getElementById('app-title');
    const appIframe = document.getElementById('app-iframe');
    
    // If music app was hidden, show it again
    if (app.id === 'music' && musicPlayerIframe && musicPlayerIframe.style.display === 'none') {
        appIframe.style.display = '';
        appFrame.appendChild(musicPlayerIframe);
        appFrame.classList.add('active');
        return;
    }
    
    appTitle.textContent = app.name;
    
    // Check if this is a user app or preinstalled app that needs HTML content fetched
    const needsHtmlFetch = !app.htmlContent && app.path && app.path.endsWith('.xml');
    
    if (needsHtmlFetch) {
        // Fetch HTML content from XML and save to localStorage for offline use
        fetchAppFromXML(app.path).then(fullAppData => {
            if (fullAppData && fullAppData.htmlContent) {
                // Check if this app is already in createdApps
                const existingIndex = createdApps.findIndex(a => a.id === app.id || a.name === app.name);
                
                if (existingIndex === -1) {
                    // Save this app to createdApps for offline use
                    const savedApp = {
                        ...fullAppData,
                        addedToHome: true,
                        installedFromStore: true, // Mark as installed from store
                        createdAt: new Date().toISOString()
                    };
                    createdApps.push(savedApp);
                    saveCreatedApps();
                } else {
                    // Update existing app with latest HTML content
                    createdApps[existingIndex] = {
                        ...createdApps[existingIndex],
                        ...fullAppData,
                        addedToHome: true,
                        installedFromStore: true
                    };
                    saveCreatedApps();
                }
                
                // Now open the app with the fetched content
                openAppWithContent(fullAppData);
            } else {
                // Fallback to path if HTML fetch failed
                appIframe.src = app.path;
                appFrame.classList.add('active');
            }
        }).catch(error => {
            console.error('Error loading app:', error);
            // Fallback to path
            appIframe.src = app.path;
            appFrame.classList.add('active');
        });
        return;
    }
    
    // For apps with HTML content already available
    openAppWithContent(app);
}

// Helper function to open app with HTML content
function openAppWithContent(app) {
    const appFrame = document.getElementById('app-frame');
    const appIframe = document.getElementById('app-iframe');
    
    // For created apps with HTML content
    if (app.htmlContent) {
        let htmlContent = app.htmlContent;
        
        // Decode if it's base64 (from community apps)
        if (htmlContent && !htmlContent.includes('<')) {
            try {
                htmlContent = atob(htmlContent);
            } catch (e) {
                // Not base64, use as is
            }
        }
        
        // Replace asset IDs with base64 data
        if (app.assets) {
            Object.entries(app.assets).forEach(([id, data]) => {
                htmlContent = htmlContent.replace(new RegExp(`src="${id}"`, 'g'), `src="${data}"`);
            });
        }
        
        // Inject light mode styles if app supports it and theme is light
        if (app.lightmode === true && settings.theme === 'light') {
            htmlContent = injectLightMode(htmlContent);
        }
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        appIframe.src = url;
    } else {
        // For apps with path, we'll send a message to apply light mode after load
        appIframe.src = app.path;
        
        // Apply light mode to iframe content after it loads (if supported)
        if (app.lightmode === true && settings.theme === 'light') {
            appIframe.onload = () => {
                try {
                    const iframeDoc = appIframe.contentDocument || appIframe.contentWindow.document;
                    const lightModeStyleElement = iframeDoc.createElement('style');
                    lightModeStyleElement.id = 'portfolio-lightmode';
                    lightModeStyleElement.textContent = `
                        /* Light Mode Styles */
                        body {
                            background: #f5f5f5 !important;
                            color: #1a1a1a !important;
                        }
                        
                        * {
                            color: #1a1a1a;
                        }
                        
                        .container, .content, .main, div[class*="container"], div[class*="wrapper"] {
                            background: #ffffff !important;
                            color: #1a1a1a !important;
                        }
                        
                        input, textarea, select, button {
                            background: #ffffff !important;
                            color: #1a1a1a !important;
                            border-color: #ddd !important;
                        }
                        
                        input::placeholder, textarea::placeholder {
                            color: #999 !important;
                        }
                        
                        h1, h2, h3, h4, h5, h6 {
                            color: #1a1a1a !important;
                        }
                        
                        p, span, div, label {
                            color: #1a1a1a !important;
                        }
                        
                        a {
                            color: #667eea !important;
                        }
                        
                        /* Shadows and borders */
                        .card, .box, [class*="card"], [class*="box"] {
                            background: #ffffff !important;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                            border-color: #e0e0e0 !important;
                        }
                    `;
                    iframeDoc.head.appendChild(lightModeStyleElement);
                } catch (e) {
                    // Cross-origin restriction - can't inject styles
                    console.warn('Cannot inject light mode styles due to cross-origin restrictions');
                }
            };
        }
    }
    
    appFrame.classList.add('active');
    
    // Track music player iframe
    if (app.id === 'music') {
        setTimeout(() => {
            musicPlayerIframe = appIframe;
            // Request current state
            if (musicPlayerIframe) {
                musicPlayerIframe.contentWindow.postMessage({
                    type: 'MUSIC_CONTROL',
                    action: 'GET_STATE'
                }, '*');
            }
        }, 500);
    }
}

// Inject light mode CSS into app HTML
function injectLightMode(htmlContent) {
    const lightModeStyles = `
    <style id="portfolio-lightmode">
        /* Light Mode Styles */
        body {
            background: #f5f5f5 !important;
            color: #1a1a1a !important;
        }
        
        * {
            color: #1a1a1a;
        }
        
        .container, .content, .main, div[class*="container"], div[class*="wrapper"] {
            background: #ffffff !important;
            color: #1a1a1a !important;
        }
        
        input, textarea, select, button {
            background: #ffffff !important;
            color: #1a1a1a !important;
            border-color: #ddd !important;
        }
        
        input::placeholder, textarea::placeholder {
            color: #999 !important;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #1a1a1a !important;
        }
        
        p, span, div, label {
            color: #1a1a1a !important;
        }
        
        a {
            color: #667eea !important;
        }
        
        /* Shadows and borders */
        .card, .box, [class*="card"], [class*="box"] {
            background: #ffffff !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
            border-color: #e0e0e0 !important;
        }
    </style>
    `;
    
    // Try to inject before </head>, otherwise before </body>, otherwise at the end
    if (htmlContent.includes('</head>')) {
        return htmlContent.replace('</head>', lightModeStyles + '\n</head>');
    } else if (htmlContent.includes('</body>')) {
        return htmlContent.replace('</body>', lightModeStyles + '\n</body>');
    } else {
        return htmlContent + lightModeStyles;
    }
}

// Close app
function closeApp() {
    const appFrame = document.getElementById('app-frame');
    const appIframe = document.getElementById('app-iframe');
    
    // Check if music app is open (check by musicPlayerIframe reference)
    if (musicPlayerIframe && appIframe === musicPlayerIframe) {
        // Hide the app frame but keep music playing
        appFrame.classList.remove('active');
        
        // Move iframe to body (hidden) to keep music playing
        musicPlayerIframe.style.display = 'none';
        document.body.appendChild(musicPlayerIframe);
        
        return;
    }
    
    appFrame.classList.remove('active');
    
    setTimeout(() => {
        appIframe.src = '';
    }, 300);
}

/* ==================== CONTEXT MENU ==================== */

let currentContextApp = null;

// Setup context menu
function setupContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    
    // Hide context menu on click outside
    document.addEventListener('click', () => {
        hideContextMenu();
    });
    
    // Prevent context menu from closing when clicking inside it
    contextMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Show context menu
async function showContextMenu(event, app) {
    const contextMenu = document.getElementById('context-menu');
    currentContextApp = app;
    
    // Clear existing menu items
    contextMenu.innerHTML = '';
    
    // Check if app is user-created (from App Creator, not from App Store)
    const createdApp = createdApps.find(a => a.id === app.id || a.name === app.name);
    const isUserCreated = createdApp && createdApp.addedToHome && !createdApp.installedFromStore;
    
    // Check if app is open source from app data or createdApp
    let isOpenSource = app.opensource === true || (createdApp && createdApp.opensource === true);
    
    // If not found, try to get it from the original source app
    if (!isOpenSource) {
        // Check in userApps (apps loaded from manifest)
        const sourceApp = userApps.find(a => a.id === app.id);
        if (sourceApp && sourceApp.opensource === true) {
            isOpenSource = true;
        }
    }
    
    // Check if app is from store
    const storeApp = await getStoreApp(app.id);
    const isFromStore = storeApp !== null;
    
    // Check if app has an update available
    const updateAvailable = await hasUpdateAvailable(app);
    
    // Add Fork option for open source apps
    if (isOpenSource) {
        const forkItem = document.createElement('div');
        forkItem.className = 'context-menu-item';
        forkItem.innerHTML = `
            <span class="material-symbols-outlined">content_copy</span>
            <span>Fork App</span>
        `;
        forkItem.addEventListener('click', () => {
            // Use the source app if available, otherwise use the app/createdApp
            const appToFork = userApps.find(a => a.id === app.id) || createdApp || app;
            forkApp(appToFork);
            hideContextMenu();
        });
        contextMenu.appendChild(forkItem);
    }
    
    // Add Edit option for user-created apps not in store
    if (isUserCreated && !isFromStore) {
        const editItem = document.createElement('div');
        editItem.className = 'context-menu-item';
        editItem.innerHTML = `
            <span class="material-symbols-outlined">edit</span>
            <span>Edit App</span>
        `;
        editItem.addEventListener('click', () => {
            editAppFromHome(createdApp);
            hideContextMenu();
        });
        contextMenu.appendChild(editItem);
    }
    
    // Add Update option if update is available
    if (updateAvailable) {
        const updateItem = document.createElement('div');
        updateItem.className = 'context-menu-item';
        updateItem.innerHTML = `
            <span class="material-symbols-outlined">system_update</span>
            <span>Update to v${storeApp ? storeApp.version : 'latest'}</span>
        `;
        updateItem.addEventListener('click', () => {
            updateApp(currentContextApp);
            hideContextMenu();
        });
        contextMenu.appendChild(updateItem);
    }
    
    // Add Submit App option for user-created apps
    if (isUserCreated) {
        const submitItem = document.createElement('div');
        submitItem.className = 'context-menu-item';
        submitItem.innerHTML = `
            <span class="material-symbols-outlined">upload</span>
            <span>Submit for Publishing</span>
        `;
        submitItem.addEventListener('click', () => {
            openSubmitAppMailto();
            hideContextMenu();
        });
        contextMenu.appendChild(submitItem);
    }
    
    // Add Uninstall option
    const uninstallItem = document.createElement('div');
    uninstallItem.className = 'context-menu-item';
    uninstallItem.innerHTML = `
        <span class="material-symbols-outlined">delete</span>
        <span>Uninstall</span>
    `;
    uninstallItem.addEventListener('click', () => {
        if (currentContextApp) {
            uninstallApp(currentContextApp);
        }
        hideContextMenu();
    });
    contextMenu.appendChild(uninstallItem);
    
    // Position the context menu
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.classList.add('show');
    
    // Adjust position if menu goes off-screen
    setTimeout(() => {
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    }, 0);
}

// Hide context menu
function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    contextMenu.classList.remove('show');
    currentContextApp = null;
}

// Uninstall app
function uninstallApp(app) {
    showConfirmDialog(
        'Uninstall App?',
        `Are you sure you want to uninstall "${app.name}"?`,
        (confirmed) => {
            if (confirmed) {
                // Find and remove the app from createdApps
                const index = createdApps.findIndex(a => a.id === app.id);
                if (index !== -1) {
                    createdApps.splice(index, 1);
                    saveCreatedApps();
                    renderApps();
                    
                    // Reset to first page after uninstall
                    const appGrid = document.getElementById('app-grid');
                    if (appGrid) {
                        appGrid.scrollTo({ left: 0, behavior: 'smooth' });
                    }
                    
                    showNotification(`${app.name} has been uninstalled`);
                }
            }
        }
    );
}

// Fork an open source app
async function forkApp(app) {
    // If the app doesn't have htmlContent, we need to fetch it from the XML file
    let htmlContent = app.htmlContent;
    
    if (!htmlContent && app.path && app.path.endsWith('.xml')) {
        try {
            const response = await fetch(app.path);
            if (response.ok) {
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                const htmlContentElement = xmlDoc.querySelector('htmlContent');
                htmlContent = htmlContentElement ? htmlContentElement.textContent : '';
            }
        } catch (error) {
            console.error('Error fetching app HTML content:', error);
            showNotification('Failed to load app content');
            return;
        }
    }
    
    if (!htmlContent) {
        showNotification('Cannot fork this app - no content available');
        return;
    }
    
    // Create XML from the app
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<app>
    <id>${app.id || app.name.toLowerCase().replace(/\s+/g, '-')}</id>
    <name>${app.name}</name>
    <author>${app.author || 'Unknown'}</author>
    <description>${app.description || ''}</description>
    <version>${app.version || '1.0.0'}</version>
    <icon>${app.icon || ''}</icon>
    <lightmode>${app.lightmode || false}</lightmode>
    <opensource>false</opensource>
    <tags>
        ${(app.tags || []).map(tag => `<tag>${tag}</tag>`).join('\n        ')}
    </tags>
    <metadata>
        <createdAt>${app.createdAt || new Date().toISOString()}</createdAt>
    </metadata>
    <htmlContent><![CDATA[${htmlContent}]]></htmlContent>
</app>`;
    
    // Import as forked app (cannot export)
    processXMLImport(xmlContent, { isForking: true, canExport: false });
    
    // Open app creator modal
    openModal('app-creator-modal');
}

// Edit app from home screen (for apps not in store)
function editAppFromHome(app) {
    // Create XML from the app
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<app>
    <id>${app.id || app.name.toLowerCase().replace(/\s+/g, '-')}</id>
    <name>${app.name}</name>
    <author>${app.author || 'Unknown'}</author>
    <description>${app.description || ''}</description>
    <version>${app.version || '1.0.0'}</version>
    <icon>${app.icon || ''}</icon>
    <lightmode>${app.lightmode || false}</lightmode>
    <opensource>${app.opensource || false}</opensource>
    <tags>
        ${(app.tags || []).map(tag => `<tag>${tag}</tag>`).join('\n        ')}
    </tags>
    <metadata>
        <createdAt>${app.createdAt || new Date().toISOString()}</createdAt>
    </metadata>
    <htmlContent><![CDATA[${app.htmlContent}]]></htmlContent>
</app>`;
    
    // Import for editing (can export)
    processXMLImport(xmlContent, { isEditing: true, canExport: true });
    
    // Open app creator modal
    openModal('app-creator-modal');
}

/* ==================== APP UPDATE FUNCTIONS ==================== */

// Compare two version strings (e.g., "1.0.0" vs "1.1.0")
function compareVersions(version1, version2) {
    if (!version1 || !version2) return 0;
    
    const v1parts = version1.toString().split('.').map(Number);
    const v2parts = version2.toString().split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
        const v1part = v1parts[i] || 0;
        const v2part = v2parts[i] || 0;
        
        if (v1part > v2part) return 1;
        if (v1part < v2part) return -1;
    }
    
    return 0;
}

// Check if an app has an update available
// Check if an app has an update available
async function hasUpdateAvailable(installedApp) {
    try {
        // First check userApps and betaApps arrays
        let storeApp = userApps.find(app => app.id === installedApp.id);
        if (!storeApp) {
            storeApp = betaApps.find(app => app.id === installedApp.id);
        }
        
        // If found in arrays, compare versions
        if (storeApp) {
            const comparison = compareVersions(storeApp.version, installedApp.version);
            return comparison > 0; // Store version is higher
        }
        
        // If not found in arrays, check the featured-apps manifest
        const manifestResponse = await fetch('/assets/apps/featured-apps/manifest.json');
        if (!manifestResponse.ok) return false;
        
        const manifest = await manifestResponse.json();
        const appFilename = manifest.apps.find(filename => filename.includes(installedApp.id));
        
        if (!appFilename) return false;
        
        // Load the XML file to get the version
        const xmlResponse = await fetch('/assets/apps/featured-apps/' + appFilename);
        if (!xmlResponse.ok) return false;
        
        const xmlText = await xmlResponse.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const storeVersion = xmlDoc.querySelector('version')?.textContent || '1.0.0';
        
        // Compare versions
        const comparison = compareVersions(storeVersion, installedApp.version);
        return comparison > 0; // Store version is higher
    } catch (error) {
        console.error('Error checking for updates:', error);
        return false;
    }
}

// Get the store version of an app
async function getStoreApp(appId) {
    // First check in userApps and betaApps arrays
    let storeApp = userApps.find(app => app.id === appId);
    if (!storeApp) {
        storeApp = betaApps.find(app => app.id === appId);
    }
    
    if (storeApp) return storeApp;
    
    // If not found, try to load from featured-apps manifest
    try {
        const manifestResponse = await fetch('/assets/apps/featured-apps/manifest.json');
        if (!manifestResponse.ok) return null;
        
        const manifest = await manifestResponse.json();
        const appFilename = manifest.apps.find(filename => filename.includes(appId));
        
        if (!appFilename) return null;
        
        // Load the XML file
        const xmlResponse = await fetch('/assets/apps/featured-apps/' + appFilename);
        if (!xmlResponse.ok) return null;
        
        const xmlText = await xmlResponse.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Parse XML to app object
        return {
            id: xmlDoc.querySelector('id')?.textContent || appId,
            name: xmlDoc.querySelector('name')?.textContent || '',
            author: xmlDoc.querySelector('author')?.textContent || '',
            description: xmlDoc.querySelector('description')?.textContent || '',
            version: xmlDoc.querySelector('version')?.textContent || '1.0.0',
            icon: xmlDoc.querySelector('icon')?.textContent || '',
            htmlContent: xmlDoc.querySelector('htmlContent')?.textContent || '',
            tags: Array.from(xmlDoc.querySelectorAll('tag')).map(tag => tag.textContent),
            lightmode: xmlDoc.querySelector('lightmode')?.textContent === 'true'
        };
    } catch (error) {
        console.error('Error getting store app:', error);
        return null;
    }
}

// Update an app to the latest version
async function updateApp(installedApp) {
    const storeApp = await getStoreApp(installedApp.id);
    
    if (!storeApp) {
        showNotification('Update not available');
        return;
    }
    
    showConfirmDialog(
        'Update App?',
        `Update "${installedApp.name}" from v${installedApp.version} to v${storeApp.version}?`,
        async (confirmed) => {
            if (confirmed) {
                try {
                    // Check if storeApp has htmlContent (from XML) or needs to be loaded
                    let updatedApp;
                    
                    if (storeApp.htmlContent) {
                        // Already loaded from XML
                        updatedApp = storeApp;
                    } else if (storeApp.path && storeApp.path.endsWith('.xml')) {
                        // Load from path
                        const response = await fetch(storeApp.path);
                        const xmlText = await response.text();
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                        updatedApp = parseXMLApp(xmlDoc);
                    } else {
                        // Use storeApp as is
                        updatedApp = storeApp;
                    }
                    
                    if (updatedApp) {
                        // Find and update the installed app
                        const index = createdApps.findIndex(a => a.id === installedApp.id);
                        if (index !== -1) {
                            // Preserve installation metadata
                            updatedApp.addedToHome = true;
                            updatedApp.installedFromStore = installedApp.installedFromStore;
                            updatedApp.createdAt = installedApp.createdAt;
                            updatedApp.updatedAt = new Date().toISOString();
                            
                            createdApps[index] = updatedApp;
                            saveCreatedApps();
                            renderApps();
                            
                            showNotification(`${updatedApp.name} updated to v${updatedApp.version}`);
                        }
                    } else {
                        showNotification('Unable to update app');
                    }
                } catch (error) {
                    console.error('Error updating app:', error);
                    showNotification('Failed to update app');
                }
            }
        }
    );
}

/* ==================== SELECTION RECTANGLE ==================== */

function setupSelectionRectangle() {
    const homeScreen = document.getElementById('home-screen');
    selectionRect = document.getElementById('selection-rectangle');
    
    homeScreen.addEventListener('mousedown', (e) => {
        // Only start selection if clicking on the home screen itself, not on apps or status bar
        const appGrid = document.getElementById('app-grid');
        const isOnBackground = e.target === homeScreen || 
                               e.target === appGrid || 
                               e.target.classList.contains('app-page');
        
        if (isOnBackground) {
            isSelecting = true;
            selectionStart = { x: e.clientX, y: e.clientY };
            
            selectionRect.style.left = `${e.clientX}px`;
            selectionRect.style.top = `${e.clientY}px`;
            selectionRect.style.width = '0px';
            selectionRect.style.height = '0px';
            selectionRect.classList.add('active');
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        const width = Math.abs(currentX - selectionStart.x);
        const height = Math.abs(currentY - selectionStart.y);
        const left = Math.min(currentX, selectionStart.x);
        const top = Math.min(currentY, selectionStart.y);
        
        selectionRect.style.left = `${left}px`;
        selectionRect.style.top = `${top}px`;
        selectionRect.style.width = `${width}px`;
        selectionRect.style.height = `${height}px`;
    });
    
    document.addEventListener('mouseup', () => {
        if (isSelecting) {
            isSelecting = false;
            selectionRect.classList.remove('active');
        }
    });
}

/* ==================== HOME CONTEXT MENU ==================== */

function setupHomeContextMenu() {
    const homeScreen = document.getElementById('home-screen');
    const appGrid = document.getElementById('app-grid');
    const homeContextMenu = document.getElementById('home-context-menu');
    
    // Build context menu from socials
    homeContextMenu.innerHTML = '';
    
    // Add social links
    Object.entries(socials).forEach(([name, url]) => {
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.innerHTML = `
            <span class="material-symbols-outlined">open_in_new</span>
            <span>${name}</span>
        `;
        item.addEventListener('click', () => {
            window.open(url, '_blank');
            hideHomeContextMenu();
        });
        homeContextMenu.appendChild(item);
    });
    
    // Add Release Notes option
    const releaseNotesItem = document.createElement('div');
    releaseNotesItem.className = 'context-menu-item';
    releaseNotesItem.innerHTML = `
        <span class="material-symbols-outlined">article</span>
        <span>Release Notes</span>
    `;
    releaseNotesItem.addEventListener('click', () => {
        openReleaseNotes();
        hideHomeContextMenu();
    });
    homeContextMenu.appendChild(releaseNotesItem);
    
    // Add Submit App option
    const submitAppItem = document.createElement('div');
    submitAppItem.className = 'context-menu-item';
    submitAppItem.innerHTML = `
        <span class="material-symbols-outlined">upload</span>
        <span>Submit Your App</span>
    `;
    submitAppItem.addEventListener('click', () => {
        openSubmitAppMailto();
        hideHomeContextMenu();
    });
    homeContextMenu.appendChild(submitAppItem);
    
    // Show context menu on right-click in void areas
    const showHomeContext = (e) => {
        // Check if clicked on home screen, app grid, or app pages (void areas)
        const isOnBackground = e.target === homeScreen || 
                               e.target === appGrid || 
                               e.target.classList.contains('app-page');
        
        if (isOnBackground) {
            e.preventDefault();
            showHomeContextMenu(e);
        }
    };
    
    homeScreen.addEventListener('contextmenu', showHomeContext);
    appGrid.addEventListener('contextmenu', showHomeContext);
    
    // Hide on click anywhere
    document.addEventListener('click', hideHomeContextMenu);
    
    // Prevent context menu from closing when clicking inside it
    homeContextMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function showHomeContextMenu(event) {
    const homeContextMenu = document.getElementById('home-context-menu');
    
    // Position the context menu
    homeContextMenu.style.left = `${event.clientX}px`;
    homeContextMenu.style.top = `${event.clientY}px`;
    homeContextMenu.classList.add('show');
    
    // Adjust position if menu goes off-screen
    setTimeout(() => {
        const rect = homeContextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            homeContextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            homeContextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    }, 0);
}

function hideHomeContextMenu() {
    const homeContextMenu = document.getElementById('home-context-menu');
    homeContextMenu.classList.remove('show');
}


/* ==================== CLOCK & BATTERY ==================== */

// Update clock in status bar
function updateClock() {
    const clockElement = document.getElementById('current-time');
    const batteryElement = document.getElementById('battery-level');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    clockElement.textContent = `${hours}:${minutes}`;
    
    if (navigator.getBattery) {
        navigator.getBattery().then(function(battery) {
            const level = Math.floor(battery.level * 100);
            batteryElement.textContent = `${level}%`;
        });
    } else {
        batteryElement.textContent = '100%';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Settings Modal
    document.getElementById('close-settings').addEventListener('click', closeSettingsModal);
    document.getElementById('header-save-settings').addEventListener('click', saveSettingsHandler);
    document.getElementById('reset-settings').addEventListener('click', resetSettings);
    document.getElementById('delete-all-data').addEventListener('click', deleteAllData);
    document.getElementById('upload-wallpaper').addEventListener('click', () => {
        document.getElementById('wallpaper-file-input').click();
    });
    document.getElementById('paste-wallpaper').addEventListener('click', pasteWallpaperFromClipboard);
    document.getElementById('wallpaper-file-input').addEventListener('change', handleWallpaperUpload);
    document.getElementById('theme-select').addEventListener('change', handleThemeChange);
    
    // App Creator Modal
    document.getElementById('close-app-creator').addEventListener('click', closeAppCreator);
    document.getElementById('submit-app-help-btn').addEventListener('click', openSubmitAppMailto);
    document.getElementById('create-new-app').addEventListener('click', showEditorView);
    document.getElementById('import-app-xml').addEventListener('click', () => {
        document.getElementById('xml-file-input').click();
    });
    document.getElementById('xml-file-input').addEventListener('change', handleXMLImport);
    document.getElementById('header-save-app').addEventListener('click', saveCreatedApp);
    document.getElementById('upload-app-icon').addEventListener('click', () => {
        document.getElementById('app-icon-file-input').click();
    });
    document.getElementById('paste-app-icon').addEventListener('click', pasteAppIconFromClipboard);
    document.getElementById('app-icon-file-input').addEventListener('change', handleAppIconUpload);
    
    // Add change listeners for unsaved changes detection
    document.getElementById('app-name-input').addEventListener('input', markAsUnsaved);
    document.getElementById('app-description-input').addEventListener('input', markAsUnsaved);
    document.getElementById('app-lightmode-toggle').addEventListener('change', markAsUnsaved);
    document.getElementById('app-opensource-toggle').addEventListener('change', markAsUnsaved);
    
    // Add generic style template toggle listener
    document.getElementById('app-generic-style-toggle').addEventListener('change', handleGenericStyleToggle);
    
    // Setup drag and drop for App Creator modal (with delay to ensure DOM is ready)
    setTimeout(() => {
        setupAppCreatorDragAndDrop();
    }, 100);
    
    // App Frame
    document.getElementById('close-app').addEventListener('click', closeApp);
    
    // Release Notes Modal
    document.getElementById('close-release-notes').addEventListener('click', closeReleaseNotes);
    document.getElementById('add-release-btn').addEventListener('click', () => {
        openCheatCodePrompt();
    });
    
    // Release Creator Modal
    document.getElementById('close-release-creator').addEventListener('click', closeReleaseCreator);
    document.getElementById('export-release-btn').addEventListener('click', exportRelease);
    document.getElementById('save-draft-btn').addEventListener('click', saveReleaseDraft);
    document.getElementById('load-draft-btn').addEventListener('click', loadReleaseDraftManually);
    document.getElementById('preview-release-btn').addEventListener('click', previewRelease);
    
    // Submit App Modals
    document.getElementById('close-submit-app').addEventListener('click', closeSubmitAppModal);
    document.getElementById('open-mailto-btn').addEventListener('click', openMailtoLink);
    document.getElementById('show-manual-instructions-btn').addEventListener('click', showManualInstructions);
    document.getElementById('close-manual-instructions').addEventListener('click', closeManualInstructionsModal);
    
    // Copy buttons in manual instructions
    document.addEventListener('click', (e) => {
        if (e.target.closest('.copy-btn')) {
            const btn = e.target.closest('.copy-btn');
            const textToCopy = btn.getAttribute('data-copy');
            if (textToCopy) {
                copyToClipboard(textToCopy);
            }
        }
    });
    
    // Track changes in release creator
    document.getElementById('release-title').addEventListener('input', markReleaseAsUnsaved);
    document.getElementById('release-subtitle').addEventListener('input', markReleaseAsUnsaved);
    document.getElementById('release-version').addEventListener('input', markReleaseAsUnsaved);
    
    // Body element buttons
    document.getElementById('add-paragraph-btn').addEventListener('click', () => addElement('body', 'paragraph'));
    document.getElementById('add-image-btn').addEventListener('click', () => addElement('body', 'image'));
    document.getElementById('add-link-btn').addEventListener('click', () => addElement('body', 'link'));
    document.getElementById('add-video-btn').addEventListener('click', () => addElement('body', 'video'));
    
    // Footer element buttons
    document.getElementById('add-footer-paragraph-btn').addEventListener('click', () => addElement('footer', 'paragraph'));
    document.getElementById('add-footer-image-btn').addEventListener('click', () => addElement('footer', 'image'));
    document.getElementById('add-footer-link-btn').addEventListener('click', () => addElement('footer', 'link'));
    document.getElementById('add-footer-video-btn').addEventListener('click', () => addElement('footer', 'video'));
    
    // Close modals when clicking outside
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') closeSettingsModal();
    });
    document.getElementById('app-creator-modal').addEventListener('click', (e) => {
        if (e.target.id === 'app-creator-modal') closeAppCreator();
    });
    document.getElementById('release-notes-modal').addEventListener('click', (e) => {
        if (e.target.id === 'release-notes-modal') closeReleaseNotes();
    });
    document.getElementById('release-creator-modal').addEventListener('click', (e) => {
        if (e.target.id === 'release-creator-modal') closeReleaseCreator();
    });
    
    // Cheat code system
    setupCheatCodeListener();
    
    // Context menu
    setupContextMenu();
}

/* ==================== MONACO EDITOR INITIALIZATION ==================== */

// Initialize Monaco Editor
function initMonacoEditor() {
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    
    require(['vs/editor/editor.main'], function() {
        monacoLoaded = true;
        
        // Define the theme to match our dark UI
        monaco.editor.defineTheme('webhub-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'tag', foreground: '4EC9B0' },
                { token: 'attribute.name', foreground: '9CDCFE' },
                { token: 'attribute.value', foreground: 'CE9178' }
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#D4D4D4',
                'editorLineNumber.foreground': '#858585',
                'editor.selectionBackground': '#264F78',
                'editor.inactiveSelectionBackground': '#3A3D41',
                'editorCursor.foreground': '#AEAFAD',
                'editor.lineHighlightBackground': '#2A2A2A'
            }
        });
        
        // Create the editor instance
        monacoEditor = monaco.editor.create(document.getElementById('monaco-editor-container'), {
            value: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My App</title>\n    <style>\n        body {\n            margin: 0;\n            padding: 20px;\n            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif;\n            background: #f5f5f5;\n        }\n        .container {\n            max-width: 800px;\n            margin: 0 auto;\n            background: white;\n            padding: 30px;\n            border-radius: 12px;\n            box-shadow: 0 2px 10px rgba(0,0,0,0.1);\n        }\n        h1 {\n            color: #333;\n            margin-top: 0;\n        }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <h1>My Custom App</h1>\n        <p>Welcome to your custom app!</p>\n    </div>\n</body>\n</html>',
            language: 'html',
            theme: 'webhub-dark',
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            folding: true,
            formatOnPaste: true,
            formatOnType: true,
            autoIndent: 'full',
            tabSize: 4,
            insertSpaces: true,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: {
                bracketPairs: true,
                indentation: true
            },
            suggest: {
                enabled: false
            }
        });
        
        // Add keyboard shortcuts
        monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() {
            saveCreatedApp();
        });
        
        // Add change listener for unsaved changes
        monacoEditor.onDidChangeModelContent(function() {
            markAsUnsaved();
        });
    });
}

// Get Monaco Editor content
function getMonacoContent() {
    if (monacoEditor) {
        return monacoEditor.getValue();
    }
    return document.getElementById('app-html-input').value;
}

// Set Monaco Editor content
function setMonacoContent(content) {
    if (monacoEditor) {
        monacoEditor.setValue(content || '');
    } else {
        document.getElementById('app-html-input').value = content || '';
    }
}

/* ==================== UPDATE CHECKING ==================== */

/* ==================== SETTINGS FUNCTIONS ==================== */

// Open settings app
async function openSettings() {
    // Find the settings app from preinstalled apps
    const settingsApp = preinstalledApps.find(app => app.id === 'settings');
    
    if (settingsApp && settingsApp.path && settingsApp.path.endsWith('.xml')) {
        // Load XML file
        try {
            const response = await fetch(settingsApp.path);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Parse XML to app object
            const app = {
                id: xmlDoc.querySelector('id')?.textContent || 'settings',
                name: xmlDoc.querySelector('name')?.textContent || 'Settings',
                author: xmlDoc.querySelector('author')?.textContent || '',
                description: xmlDoc.querySelector('description')?.textContent || '',
                version: xmlDoc.querySelector('version')?.textContent || '2.0',
                icon: xmlDoc.querySelector('icon')?.textContent || '',
                htmlContent: xmlDoc.querySelector('htmlContent')?.textContent || '',
                lightmode: xmlDoc.querySelector('lightmode')?.textContent === 'true',
                tags: Array.from(xmlDoc.querySelectorAll('tag')).map(tag => tag.textContent)
            };
            
            openApp(app);
        } catch (error) {
            console.error('Error loading settings app:', error);
            alert('Failed to open settings app');
        }
    } else if (settingsApp) {
        // Regular app with path
        openApp(settingsApp);
        
        // Check for updates after settings loads
        setTimeout(() => {
            checkForUpdates();
        }, 500);
    } else {
        console.error('Settings app not found');
        alert('Settings app not available');
    }
}

// Legacy close settings modal function (kept for backward compatibility)
function closeSettingsModal() {
    // This function is now deprecated as settings is a fullscreen app
    document.getElementById('settings-modal')?.classList.remove('active');
}

// Load wallpapers from directory
async function loadWallpapers() {
    const wallpaperGrid = document.getElementById('wallpaper-grid');
    wallpaperGrid.innerHTML = '';
    
    let wallpapers = [];
    
    // Load wallpapers list from JSON file
    try {
        const response = await fetch('/assets/json/wallpapers.json');
        wallpapers = await response.json();
    } catch (error) {
        console.error('Error loading wallpapers list:', error);
        // Fallback to default list if JSON fails to load
        wallpapers = [
            'black-river.png',
            'black-mountains.jpg'
        ];
    }
    
    wallpapers.forEach(filename => {
        const wallpaperPath = WALLPAPERS_PATH + filename;
        const wallpaperItem = document.createElement('div');
        wallpaperItem.className = 'wallpaper-item';
        wallpaperItem.style.backgroundImage = `url(${wallpaperPath})`;
        
        if (settings.wallpaper === wallpaperPath) {
            wallpaperItem.classList.add('selected');
            selectedWallpaper = wallpaperPath;
        }
        
        wallpaperItem.addEventListener('click', () => {
            document.querySelectorAll('.wallpaper-item').forEach(item => {
                item.classList.remove('selected');
            });
            wallpaperItem.classList.add('selected');
            selectedWallpaper = wallpaperPath;
            markSettingsAsUnsaved();
        });
        
        // Check if image exists
        const img = new Image();
        img.onload = () => {
            wallpaperGrid.appendChild(wallpaperItem);
        };
        img.onerror = () => {
            // Don't add if image doesn't exist
        };
        img.src = wallpaperPath;
    });
}

// Capture initial settings state
function captureInitialSettingsState() {
    initialSettingsState = {
        wallpaper: selectedWallpaper || settings.wallpaper,
        theme: document.getElementById('theme-select').value
    };
}

// Mark settings as unsaved
function markSettingsAsUnsaved() {
    if (!initialSettingsState) {
        captureInitialSettingsState();
        // After capturing initial state, check again if there are changes
        // (in case this was called during initialization with pre-existing changes)
    }
    
    const currentSettingsState = {
        wallpaper: selectedWallpaper || settings.wallpaper,
        theme: document.getElementById('theme-select').value
    };
    
    const hasChanges = JSON.stringify(currentSettingsState) !== JSON.stringify(initialSettingsState);
    
    if (hasChanges !== hasUnsavedSettings) {
        hasUnsavedSettings = hasChanges;
        updateSettingsSaveButton();
    }
}

// Update settings save button state
function updateSettingsSaveButton() {
    const saveBtn = document.getElementById('header-save-settings');
    
    if (hasUnsavedSettings) {
        saveBtn.classList.remove('disabled');
        saveBtn.disabled = false;
    } else {
        saveBtn.classList.add('disabled');
        saveBtn.disabled = true;
    }
}

// Handle theme change
function handleThemeChange(event) {
    const newTheme = event.target.value;
    const oldTheme = settings.theme;
    
    markSettingsAsUnsaved();
    
    if (newTheme !== oldTheme && settings.wallpaper && !settings.wallpaper.startsWith('data:image/')) {
        showConfirmDialog(
            'Update Wallpaper?',
            'Would you like to invert your wallpaper colors to match the new theme?',
            async (confirmed) => {
                if (confirmed) {
                    try {
                        const invertedWallpaper = await invertWallpaper(settings.wallpaper);
                        selectedWallpaper = invertedWallpaper;
                        markSettingsAsUnsaved();
                        showNotification('Wallpaper inverted successfully!');
                    } catch (error) {
                        console.error('Error inverting wallpaper:', error);
                        showNotification('Could not invert wallpaper');
                    }
                }
            }
        );
    }
}

// Save settings handler
function saveSettingsHandler() {
    const themeSelect = document.getElementById('theme-select');
    
    if (selectedWallpaper) {
        settings.wallpaper = selectedWallpaper;
    }
    settings.theme = themeSelect.value;
    
    saveSettings();
    applyTheme();
    setWallpaper(settings.wallpaper);
    
    hasUnsavedSettings = false;
    captureInitialSettingsState();
    updateSettingsSaveButton();
    
    showNotification('Settings saved successfully!');
}

// Reset settings to default
async function resetSettings() {
    showConfirmDialog(
        'Reset Settings?',
        'Are you sure you want to reset all settings to default? This action cannot be undone.',
        async (confirmed) => {
            if (!confirmed) return;
            
            try {
                const response = await fetch('/assets/json/settings.json');
                const defaultSettings = await response.json();
                
                settings = { ...DEFAULT_SETTINGS, ...defaultSettings };
                saveSettings();
                applyTheme();
                setWallpaper(settings.wallpaper);
                
                document.getElementById('theme-select').value = settings.theme;
                selectedWallpaper = settings.wallpaper;
                await loadWallpapers();
                
                hasUnsavedSettings = false;
                captureInitialSettingsState();
                updateSettingsSaveButton();
                
                showNotification('Settings reset to default!');
            } catch (error) {
                console.error('Error resetting settings:', error);
                settings = { ...DEFAULT_SETTINGS };
                saveSettings();
                applyTheme();
                setWallpaper(settings.wallpaper);
                
                document.getElementById('theme-select').value = settings.theme;
                selectedWallpaper = settings.wallpaper;
                await loadWallpapers();
                
                hasUnsavedSettings = false;
                captureInitialSettingsState();
                updateSettingsSaveButton();
                
                showNotification('Settings reset to system default!');
            }
        }
    );
}

// Delete all user data
function deleteAllData() {
    showConfirmDialog(
        'Delete All Data?',
        'This will permanently delete ALL your data including settings, created apps, and any stored information. This action cannot be undone. Are you absolutely sure?',
        (confirmed) => {
            if (!confirmed) return;
            
            // Show a second confirmation for extra safety
            showConfirmDialog(
                'Final Confirmation',
                'This is your last chance. All your data will be permanently deleted. Continue?',
                async (finalConfirmed) => {
                    if (!finalConfirmed) return;
                    
                    try {
                        // Clear all localStorage
                        localStorage.clear();
                        
                        // Clear all caches if available
                        if ('caches' in window) {
                            const cacheNames = await caches.keys();
                            await Promise.all(
                                cacheNames.map(cacheName => caches.delete(cacheName))
                            );
                        }
                        
                        showNotification('All data deleted. Page will reload in 2 seconds...');
                        
                        // Reload the page after a short delay
                        setTimeout(() => {
                            window.location.reload(true);
                        }, 2000);
                    } catch (error) {
                        console.error('Error deleting data:', error);
                        showNotification('Error deleting some data. Please try again or clear your browser cache manually.');
                    }
                }
            );
        }
    );
}

// Paste wallpaper from clipboard
async function pasteWallpaperFromClipboard() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        
        for (const clipboardItem of clipboardItems) {
            for (const type of clipboardItem.types) {
                if (type.startsWith('image/')) {
                    const blob = await clipboardItem.getType(type);
                    
                    // Check blob size
                    if (blob.size > 5 * 1024 * 1024) {
                        showNotification('Image too large. Please use an image under 5MB');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        selectedWallpaper = e.target.result;
                        markSettingsAsUnsaved();
                        showNotification('Wallpaper pasted from clipboard! Click "Save" to apply');
                    };
                    
                    reader.readAsDataURL(blob);
                    return;
                }
            }
        }
        
        showNotification('No image found in clipboard. Copy an image first.');
    } catch (error) {
        console.error('Error reading clipboard:', error);
        
        // Fallback: Try to paste from clipboard as text (base64)
        try {
            const text = await navigator.clipboard.readText();
            if (text.startsWith('data:image/')) {
                selectedWallpaper = text;
                markSettingsAsUnsaved();
                showNotification('Wallpaper pasted from clipboard! Click "Save" to apply');
            } else {
                showNotification('Please copy an image to your clipboard first');
            }
        } catch (textError) {
            showNotification('Could not access clipboard. Please use Upload instead.');
        }
    }
}

// Handle wallpaper upload
function handleWallpaperUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification('Image too large. Please choose an image under 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        selectedWallpaper = e.target.result;
        markSettingsAsUnsaved();
        showNotification('Wallpaper uploaded! Click "Save" to apply');
    };
    
    reader.onerror = function() {
        showNotification('Error reading file');
    };
    
    reader.readAsDataURL(file);
}

/* ==================== APP CREATOR FUNCTIONS ==================== */

// Generic function to open any modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        
        // If it's the app creator modal, setup additional functionality
        if (modalId === 'app-creator-modal') {
            showHomeView();
            renderCreatedAppsList();
        }
    }
}

// Open App Creator
function openAppCreator() {
    openModal('app-creator-modal');
}

// Close App Creator
function closeAppCreator() {
    const editorView = document.getElementById('creator-editor-view');
    const isInEditorView = editorView.classList.contains('active');
    
    if (isInEditorView && hasUnsavedChanges) {
        showConfirmDialog(
            'Unsaved Changes',
            'You have unsaved changes. Are you sure you want to close without saving?',
            (confirmed) => {
                if (confirmed) {
                    document.getElementById('app-creator-modal').classList.remove('active');
                    resetEditorForm();
                    hasUnsavedChanges = false;
                    updateSaveButton();
                }
            }
        );
    } else {
        document.getElementById('app-creator-modal').classList.remove('active');
        resetEditorForm();
        hasUnsavedChanges = false;
        updateSaveButton();
    }
}

// Setup drag and drop for App Creator modal
function setupAppCreatorDragAndDrop() {
    const modal = document.getElementById('app-creator-modal');
    if (!modal) {
        console.error('App creator modal not found');
        return;
    }
    
    const modalContent = modal.querySelector('.modal-content');
    const modalBody = modal.querySelector('.modal-body');
    
    if (!modalContent || !modalBody) {
        console.error('Modal content or body not found');
        return;
    }
    
    // Prevent default drag behaviors on the entire modal
    const elementsToListen = [modal, modalContent, modalBody];
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        elementsToListen.forEach(element => {
            element.addEventListener(eventName, preventDefaults, false);
        });
        // Also prevent on document to be extra sure
        document.addEventListener(eventName, (e) => {
            if (modal.classList.contains('active')) {
                preventDefaults(e);
            }
        }, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop zone when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
        elementsToListen.forEach(element => {
            element.addEventListener(eventName, (e) => {
                if (modal.classList.contains('active')) {
                    modalBody.classList.add('drag-over');
                }
            }, false);
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        elementsToListen.forEach(element => {
            element.addEventListener(eventName, () => {
                modalBody.classList.remove('drag-over');
            }, false);
        });
    });
    
    // Handle dropped files
    const handleDrop = (e) => {
        if (!modal.classList.contains('active')) return;
        
        modalBody.classList.remove('drag-over');
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            
            // Check if it's an XML file
            if (file.name.endsWith('.xml')) {
                handleXMLImportFromFile(file);
            } else {
                showNotification('Please drop an XML file');
            }
        }
    };
    
    elementsToListen.forEach(element => {
        element.addEventListener('drop', handleDrop, false);
    });
}

// Show home view
function showHomeView() {
    if (hasUnsavedChanges) {
        showConfirmDialog(
            'Unsaved Changes',
            'You have unsaved changes. Are you sure you want to go back without saving?',
            (confirmed) => {
                if (confirmed) {
                    document.getElementById('creator-home-view').classList.add('active');
                    document.getElementById('creator-editor-view').classList.remove('active');
                    document.getElementById('app-creator-title').textContent = 'App Creator';
                    renderCreatedAppsList();
                    hasUnsavedChanges = false;
                    updateSaveButton();
                }
            }
        );
    } else {
        document.getElementById('creator-home-view').classList.add('active');
        document.getElementById('creator-editor-view').classList.remove('active');
        document.getElementById('app-creator-title').textContent = 'App Creator';
        renderCreatedAppsList();
        hasUnsavedChanges = false;
        updateSaveButton();
    }
}

// Show editor view
function showEditorView() {
    document.getElementById('creator-home-view').classList.remove('active');
    document.getElementById('creator-editor-view').classList.add('active');
    document.getElementById('app-creator-title').textContent = 'Create New App';
    resetEditorForm();
    hasUnsavedChanges = false;
    captureInitialState();
    updateSaveButton();
}

// Reset editor form
function resetEditorForm() {
    document.getElementById('app-name-input').value = '';
    document.getElementById('app-description-input').value = '';
    document.getElementById('app-lightmode-toggle').checked = false;
    document.getElementById('app-opensource-toggle').checked = false;
    document.getElementById('app-generic-style-toggle').checked = false;
    
    // Re-enable opensource toggle
    const opensourceToggle = document.getElementById('app-opensource-toggle');
    opensourceToggle.disabled = false;
    opensourceToggle.parentElement.title = '';
    
    setMonacoContent('<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My App</title>\n    <style>\n        body {\n            margin: 0;\n            padding: 20px;\n            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif;\n            background: #f5f5f5;\n        }\n        .container {\n            max-width: 800px;\n            margin: 0 auto;\n            background: white;\n            padding: 30px;\n            border-radius: 12px;\n            box-shadow: 0 2px 10px rgba(0,0,0,0.1);\n        }\n        h1 {\n            color: #333;\n            margin-top: 0;\n        }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <h1>My Custom App</h1>\n        <p>Welcome to your custom app!</p>\n    </div>\n</body>\n</html>');
    document.getElementById('icon-preview').innerHTML = '';
    document.getElementById('icon-preview').classList.remove('has-icon');
    currentEditingApp = null;
    hasUnsavedChanges = false;
    updateSaveButton();
}

// Handle generic style template toggle
async function handleGenericStyleToggle(e) {
    if (e.target.checked) {
        // Load the generic template
        try {
            const response = await fetch('/src/styles/generic-stylesheet-demo.html');
            const templateHTML = await response.text();
            setMonacoContent(templateHTML);
            markAsUnsaved();
        } catch (error) {
            console.error('Error loading generic template:', error);
            alert('Failed to load generic template');
            e.target.checked = false;
        }
    } else {
        // Reset to default template
        setMonacoContent('<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My App</title>\n    <style>\n        body {\n            margin: 0;\n            padding: 20px;\n            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif;\n            background: #f5f5f5;\n        }\n        .container {\n            max-width: 800px;\n            margin: 0 auto;\n            background: white;\n            padding: 30px;\n            border-radius: 12px;\n            box-shadow: 0 2px 10px rgba(0,0,0,0.1);\n        }\n        h1 {\n            color: #333;\n            margin-top: 0;\n        }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <h1>My Custom App</h1>\n        <p>Welcome to your custom app!</p>\n    </div>\n</body>\n</html>');
        markAsUnsaved();
    }
}

// Capture initial state for change detection
function captureInitialState() {
    initialAppState = {
        name: document.getElementById('app-name-input').value,
        description: document.getElementById('app-description-input').value,
        htmlContent: getMonacoContent(),
        // Capture icon: prefer <img> src, otherwise capture innerHTML (handles inline SVG or material symbol span)
        icon: (function() {
            const ip = document.getElementById('icon-preview');
            if (!ip.classList.contains('has-icon')) return '';
            const img = ip.querySelector('img');
            if (img) return img.src;
            return ip.innerHTML.trim();
        })()
    };
}

// Mark as unsaved
function markAsUnsaved() {
    if (!initialAppState) {
        captureInitialState();
        return;
    }
    
    const currentState = {
        name: document.getElementById('app-name-input').value,
        description: document.getElementById('app-description-input').value,
        htmlContent: getMonacoContent(),
        icon: (function() {
            const ip = document.getElementById('icon-preview');
            if (!ip.classList.contains('has-icon')) return '';
            const img = ip.querySelector('img');
            if (img) return img.src;
            return ip.innerHTML.trim();
        })()
    };
    
    const hasChanges = JSON.stringify(currentState) !== JSON.stringify(initialAppState);
    
    if (hasChanges !== hasUnsavedChanges) {
        hasUnsavedChanges = hasChanges;
        updateSaveButton();
    }
}

// Update save button state
function updateSaveButton() {
    const saveBtn = document.getElementById('header-save-app');
    const editorView = document.getElementById('creator-editor-view');
    const isInEditorView = editorView.classList.contains('active');
    
    if (isInEditorView && hasUnsavedChanges) {
        saveBtn.classList.remove('disabled');
        saveBtn.disabled = false;
    } else {
        saveBtn.classList.add('disabled');
        saveBtn.disabled = true;
    }
}

// Render created apps list
function renderCreatedAppsList() {
    const listContainer = document.getElementById('created-apps-list');
    listContainer.innerHTML = '';
    
    // Filter out apps installed from the App Store (only show user-created apps)
    const userCreatedApps = createdApps.filter(app => !app.installedFromStore);
    
    if (userCreatedApps.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">apps</span>
                <h3>No apps created yet</h3>
                <p>Click "Create New App" to get started</p>
            </div>
        `;
        return;
    }
    
    userCreatedApps.forEach((app, index) => {
        // Find the original index in createdApps array
        const originalIndex = createdApps.findIndex(a => a.id === app.id);
        
        const card = document.createElement('div');
        card.className = 'created-app-card';
        
        // Determine if export button should be shown
        const canExport = app.canExport !== false;
        const exportButton = canExport ? `
            <button class="app-card-btn" onclick="exportForPublishing(${originalIndex})">
                <span class="material-symbols-outlined">publish</span>
                Export for Publishing
            </button>
        ` : `
            <button class="app-card-btn" disabled title="Forked apps cannot be exported for publishing">
                <span class="material-symbols-outlined">block</span>
                Export Disabled
            </button>
        `;
        
        const _icon = (app.icon || '').toString().trim();
        card.innerHTML = `
            <div class="app-card-header">
                    <div class="app-card-icon">
                    ${(_icon.startsWith('<'))
                        ? _icon
                        : ((_icon && (_icon.startsWith('data:') || _icon.startsWith('http') || _icon.startsWith('/')))
                            ? `<img src="${_icon}" alt="${app.name}">`
                            : (_icon ? `<span class="material-symbols-outlined">${_icon}</span>` : '<span class="material-symbols-outlined">code</span>'))}
                </div>
                <div class="app-card-info">
                    <h3>${app.name}${app.isForked ? ' <span style="font-size: 0.8em; color: #888;">(Forked)</span>' : ''}</h3>
                    <p>${app.description || 'No description'}</p>
                </div>
            </div>
            <div class="app-card-actions">
                <button class="app-card-btn primary" onclick="previewCreatedApp(${originalIndex})">
                    <span class="material-symbols-outlined">visibility</span>
                    Preview
                </button>
                <button class="app-card-btn ${app.addedToHome ? '' : 'primary'}" onclick="toggleHomeScreen(${originalIndex})">
                    <span class="material-symbols-outlined">${app.addedToHome ? 'remove' : 'add'}</span>
                    ${app.addedToHome ? 'Remove from Home' : 'Add to Home'}
                </button>
                <button class="app-card-btn" onclick="editCreatedApp(${originalIndex})">
                    <span class="material-symbols-outlined">edit</span>
                    Edit
                </button>
                ${exportButton}
                <button class="app-card-btn danger" onclick="deleteCreatedApp(${originalIndex})">
                    <span class="material-symbols-outlined">delete</span>
                    Delete
                </button>
            </div>
        `;
        
        listContainer.appendChild(card);
    });
}

// Handle app icon upload
function handleAppIconUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Icon too large. Please choose an icon under 2MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const iconPreview = document.getElementById('icon-preview');
        iconPreview.innerHTML = `<img src="${e.target.result}" alt="Icon">`;
        iconPreview.classList.add('has-icon');
        markAsUnsaved();
    };
    
    reader.readAsDataURL(file);
}

// Paste app icon from clipboard
async function pasteAppIconFromClipboard() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        
        for (const clipboardItem of clipboardItems) {
            for (const type of clipboardItem.types) {
                if (type.startsWith('image/')) {
                    const blob = await clipboardItem.getType(type);
                    
                    // Check blob size
                    if (blob.size > 2 * 1024 * 1024) {
                        showNotification('Icon too large. Please use an image under 2MB');
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const iconPreview = document.getElementById('icon-preview');
                        iconPreview.innerHTML = `<img src="${e.target.result}" alt="Icon">`;
                        iconPreview.classList.add('has-icon');
                        showNotification('Icon pasted from clipboard!');
                        markAsUnsaved();
                    };
                    
                    reader.readAsDataURL(blob);
                    return;
                }
            }
        }
        
        showNotification('No image found in clipboard. Copy an image first.');
    } catch (error) {
        console.error('Error reading clipboard:', error);
        
        // Fallback: Try to paste from clipboard as text (base64)
        try {
            const text = await navigator.clipboard.readText();
            if (text.startsWith('data:image/')) {
                const iconPreview = document.getElementById('icon-preview');
                iconPreview.innerHTML = `<img src="${text}" alt="Icon">`;
                iconPreview.classList.add('has-icon');
                showNotification('Icon pasted from clipboard!');
                markAsUnsaved();
            } else {
                showNotification('Please copy an image to your clipboard first');
            }
        } catch (textError) {
            showNotification('Could not access clipboard. Please use Upload Icon instead.');
        }
    }
}

// Save created app
function saveCreatedApp() {
    const name = document.getElementById('app-name-input').value.trim();
    const description = document.getElementById('app-description-input').value.trim();
    const htmlContent = getMonacoContent().trim();
    const iconPreview = document.getElementById('icon-preview');
    const lightmodeToggle = document.getElementById('app-lightmode-toggle');
    const opensourceToggle = document.getElementById('app-opensource-toggle');
    
    if (!name) {
        showNotification('Please enter an app name');
        return;
    }
    
    if (!htmlContent) {
        showNotification('Please enter HTML code');
        return;
    }
    
    // Determine icon value: prefer <img> src, otherwise store innerHTML (inline SVG or material symbol span)
    let iconValue = '';
    if (iconPreview.classList.contains('has-icon')) {
        const img = iconPreview.querySelector('img');
        if (img) iconValue = img.src;
        else iconValue = iconPreview.innerHTML.trim();
    }

    const app = {
        name,
        description,
        htmlContent,
        icon: iconValue,
        lightmode: lightmodeToggle.checked,
        opensource: opensourceToggle.checked,
        addedToHome: false,
        createdAt: new Date().toISOString()
    };
    
    // Check if this is a forked app - if so, preserve canExport and isForked
    if (currentEditingApp !== null) {
        const existingApp = createdApps[currentEditingApp];
        createdApps[currentEditingApp] = { 
            ...existingApp, 
            ...app,
            canExport: existingApp.canExport !== undefined ? existingApp.canExport : true,
            isForked: existingApp.isForked || false
        };
        showNotification('App updated successfully!');
    } else {
        app.canExport = true;
        app.isForked = false;
        createdApps.push(app);
        showNotification('App created successfully!');
    }
    
    saveCreatedApps();
    hasUnsavedChanges = false;
    captureInitialState(); // Update initial state after save
    updateSaveButton();
    renderApps();
}

// Preview created app
function previewCreatedApp(index) {
    const app = createdApps[index];
    openApp(app);
}

// Toggle home screen
function toggleHomeScreen(index) {
    createdApps[index].addedToHome = !createdApps[index].addedToHome;
    saveCreatedApps();
    renderCreatedAppsList();
    renderApps();
    showNotification(createdApps[index].addedToHome ? 'App added to home screen' : 'App removed from home screen');
}

// Edit created app
function editCreatedApp(index) {
    const app = createdApps[index];
    currentEditingApp = index;
    
    document.getElementById('app-name-input').value = app.name;
    document.getElementById('app-description-input').value = app.description || '';
    document.getElementById('app-lightmode-toggle').checked = app.lightmode === true;
    document.getElementById('app-opensource-toggle').checked = app.opensource === true;
    
    // Disable opensource toggle for forked apps
    const opensourceToggle = document.getElementById('app-opensource-toggle');
    if (app.isForked) {
        opensourceToggle.disabled = true;
        opensourceToggle.parentElement.title = 'Forked apps cannot be marked as open source';
    } else {
        opensourceToggle.disabled = false;
        opensourceToggle.parentElement.title = '';
    }
    
    setMonacoContent(app.htmlContent);
    
    const iconPreview = document.getElementById('icon-preview');
    const _iconVal = (app.icon || '').toString().trim();
    if (_iconVal) {
        if (_iconVal.startsWith('<')) {
            iconPreview.innerHTML = _iconVal;
        } else if (_iconVal.startsWith('data:') || _iconVal.startsWith('http') || _iconVal.startsWith('/')) {
            iconPreview.innerHTML = `<img src="${_iconVal}" alt="Icon">`;
        } else {
            iconPreview.innerHTML = `<span class="material-symbols-outlined">${_iconVal}</span>`;
        }
        iconPreview.classList.add('has-icon');
    }
    
    document.getElementById('creator-home-view').classList.remove('active');
    document.getElementById('creator-editor-view').classList.add('active');
    document.getElementById('app-creator-title').textContent = 'Edit App';
    
    hasUnsavedChanges = false;
    captureInitialState();
    updateSaveButton();
}

// Export created app
function exportCreatedApp(index) {
    const app = createdApps[index];
    
    // Check if app can be exported
    if (app.canExport === false) {
        showNotification('This forked app cannot be exported for publishing');
        return;
    }
    
    // Encode HTML content as Base64 to reduce file size
    const base64HtmlContent = btoa(unescape(encodeURIComponent(app.htmlContent)));
    
    // Build tags array - always include 'user-created', add 'open-source' if app is opensource
    const tags = ['user-created'];
    if (app.opensource === true) {
        tags.push('open-source');
    }
    
    // Create XML export with Base64 encoded content
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<app>
    <id>${app.name.toLowerCase().replace(/\s+/g, '-')}</id>
    <name>${app.name}</name>
    <author>${app.author || 'User Created'}</author>
    <description>${app.description || 'User created application'}</description>
    <version>${app.version || '1.0.0'}</version>
    <icon>${app.icon || ''}</icon>
    <lightmode>${app.lightmode || false}</lightmode>
    <opensource>${app.opensource || false}</opensource>
    <tags>
${tags.map(tag => `        <tag>${tag}</tag>`).join('\n')}
    </tags>
    <metadata>
        <createdAt>${app.createdAt || new Date().toISOString()}</createdAt>
        <encoding>base64</encoding>
    </metadata>
    <htmlContent>${base64HtmlContent}</htmlContent>
</app>`;
    
    // Download XML file
    downloadFile(xmlContent, `${app.name.replace(/\s+/g, '-')}.xml`, 'application/xml');
    
    showNotification('App exported successfully!');
}

// Delete created app
function deleteCreatedApp(index) {
    showConfirmDialog(
        'Delete App?',
        `Are you sure you want to delete "${createdApps[index].name}"? This action cannot be undone.`,
        (confirmed) => {
            if (confirmed) {
                createdApps.splice(index, 1);
                saveCreatedApps();
                renderCreatedAppsList();
                renderApps();
                showNotification('App deleted successfully');
            }
        }
    );
}

// Export for publishing (.xml format)
function exportForPublishing(index) {
    const app = createdApps[index];
    
    // Show modal to choose between Featured and Community publishing
    showPublishingTypeModal(app, index);
}

// Show publishing type selection modal
function showPublishingTypeModal(app, index) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 600px;
        width: 90%;
        animation: slideIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px;">Choose Publishing Type</h2>
        <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 25px;">
            Select how you want to publish "${app.name}"
        </p>
        
        <div style="display: flex; gap: 15px; flex-direction: column; margin-bottom: 25px;">
            <div class="publish-option" data-type="community" style="
                padding: 20px;
                background: rgba(59, 130, 246, 0.1);
                border: 2px solid rgba(59, 130, 246, 0.3);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            ">
                <h3 style="margin: 0 0 10px 0; color: #3b82f6; font-size: 18px;">
                    <span style="vertical-align: middle; margin-right: 8px;">👥</span>
                    Publish to Community
                </h3>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">
                    Your app will be published instantly to the community tab. No approval needed!
                </p>
            </div>
            
            <div class="publish-option" data-type="featured" style="
                padding: 20px;
                background: rgba(251, 191, 36, 0.1);
                border: 2px solid rgba(251, 191, 36, 0.3);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            ">
                <h3 style="margin: 0 0 10px 0; color: #fbbf24; font-size: 18px;">
                    <span style="vertical-align: middle; margin-right: 8px;">⭐</span>
                    Submit for Featured
                </h3>
                <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 14px;">
                    Submit your app for review to be featured. Requires manual approval.
                </p>
            </div>
        </div>
        
        <div style="display: flex; gap: 10px;">
            <button id="publish-type-cancel" style="
                flex: 1;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                cursor: pointer;
                font-size: 14px;
            ">Cancel</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const cleanup = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };
    
    // Add hover effects
    const options = modal.querySelectorAll('.publish-option');
    options.forEach(option => {
        option.addEventListener('mouseenter', () => {
            option.style.transform = 'translateY(-2px)';
            option.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
        });
        option.addEventListener('mouseleave', () => {
            option.style.transform = 'translateY(0)';
            option.style.boxShadow = 'none';
        });
        option.addEventListener('click', () => {
            const type = option.getAttribute('data-type');
            cleanup();
            if (type === 'community') {
                showCommunityPublishingModal(app, index);
            } else {
                showFeaturedPublishingModal(app, index);
            }
        });
    });
    
    document.getElementById('publish-type-cancel').addEventListener('click', cleanup);
}

// Show featured publishing info modal (original functionality)
function showFeaturedPublishingModal(app, index) {
    showPublishingInfoModal(app, index);
}

// Show publishing info modal
function showPublishingInfoModal(app, index) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 500px;
        width: 90%;
        animation: slideIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px;">Publishing Information</h2>
        <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 20px;">
            Please provide additional information for publishing your app.
        </p>
        
        <div style="margin-bottom: 15px;">
            <label style="display: block; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-size: 14px;">
                Author Name
            </label>
            <input type="text" id="publish-author" value="${app.author || ''}" placeholder="Your name" style="
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                font-size: 14px;
                outline: none;
            ">
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-size: 14px;">
                Version
            </label>
            <input type="text" id="publish-version" value="${app.version || '1.0.0'}" placeholder="1.0.0" style="
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                font-size: 14px;
                outline: none;
            ">
        </div>
        
        <div style="display: flex; gap: 10px;">
            <button id="publish-cancel" style="
                flex: 1;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                cursor: pointer;
                font-size: 14px;
            ">Cancel</button>
            <button id="publish-confirm" style="
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
            ">Export for Publishing</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const cleanup = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };
    
    document.getElementById('publish-cancel').addEventListener('click', cleanup);
    
    document.getElementById('publish-confirm').addEventListener('click', () => {
        const author = document.getElementById('publish-author').value.trim();
        const version = document.getElementById('publish-version').value.trim();
        
        if (!author || !version) {
            showNotification('Please fill in all fields');
            return;
        }
        
        // Update app with new information
        createdApps[index].author = author;
        createdApps[index].version = version;
        saveCreatedApps();
        
        // Generate XML
        generatePublishingXML(createdApps[index]);
        
        cleanup();
    });
}

// Show community publishing modal
async function showCommunityPublishingModal(app, index) {
    // Generate a default ID
    const defaultId = app.id || app.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
        overflow-y: auto;
        padding: 20px;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 600px;
        width: 100%;
        animation: slideIn 0.3s ease;
        max-height: 90vh;
        overflow-y: auto;
        margin: auto;
    `;
    
    // Calculate HTML content size
    const htmlContent = app.htmlContent || '';
    const base64Content = btoa(unescape(encodeURIComponent(htmlContent)));
    const contentSize = base64Content.length;
    const sizeInKB = (contentSize / 1024).toFixed(2);
    const maxSize = 1024 * 1024; // 1MB
    const isTooLarge = contentSize > maxSize;
    
    modal.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px;">Publish to Community</h2>
        <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 20px;">
            Your app will be published instantly to the community. Please provide the required information.
        </p>
        
        <div style="margin-bottom: 15px;">
            <label style="display: block; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-size: 14px;">
                Author Name *
            </label>
            <input type="text" id="community-author" value="${app.author || ''}" placeholder="Your name" style="
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                font-size: 14px;
                outline: none;
            ">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="display: block; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-size: 14px;">
                Version *
            </label>
            <input type="text" id="community-version" value="${app.version || '1.0.0'}" placeholder="1.0.0" style="
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                font-size: 14px;
                outline: none;
            ">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="display: block; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-size: 14px;">
                App ID * <span style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">(use same ID to publish updates)</span>
            </label>
            <input type="text" id="community-id" value="${defaultId}" placeholder="my-app-id" style="
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                font-size: 14px;
                outline: none;
            ">
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="display: block; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-size: 14px;">
                Tags * <span style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">(comma-separated, e.g., game, utility, fun)</span>
            </label>
            <input type="text" id="community-tags" value="${(app.tags || []).join(', ')}" placeholder="game, utility, fun" style="
                width: 100%;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                font-size: 14px;
                outline: none;
            ">
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: ${isTooLarge ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}; border: 1px solid ${isTooLarge ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}; border-radius: 10px;">
            <div style="color: ${isTooLarge ? '#ef4444' : '#22c55e'}; font-size: 13px; margin-bottom: 5px;">
                App Size: <strong>${sizeInKB} KB</strong> ${isTooLarge ? '(TOO LARGE!)' : ''}
            </div>
            <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px;">
                Maximum allowed: 1024 KB (1 MB)
            </div>
        </div>
        
        <div style="margin-bottom: 15px;">
            <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="community-guidelines" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255, 255, 255, 0.8); font-size: 14px;">
                    I have read and agree to the <a href="/guidelines.html" target="_blank" style="color: #3b82f6; text-decoration: none;">Publishing Guidelines</a> *
                </span>
            </label>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" id="community-original" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                <span style="color: rgba(255, 255, 255, 0.8); font-size: 14px;">
                    This app is my original work and not stolen code *
                </span>
            </label>
        </div>
        
        <div style="display: flex; gap: 10px;">
            <button id="community-cancel" style="
                flex: 1;
                padding: 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                cursor: pointer;
                font-size: 14px;
            ">Cancel</button>
            <button id="community-publish" ${isTooLarge ? 'disabled' : ''} style="
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 10px;
                background: ${isTooLarge ? 'rgba(128, 128, 128, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'};
                color: #ffffff;
                cursor: ${isTooLarge ? 'not-allowed' : 'pointer'};
                font-size: 14px;
                font-weight: 600;
            ">Publish to Community</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const cleanup = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };
    
    document.getElementById('community-cancel').addEventListener('click', cleanup);
    
    document.getElementById('community-publish').addEventListener('click', async () => {
        if (isTooLarge) {
            showNotification('App is too large! Please optimize your code.');
            return;
        }
        
        const author = document.getElementById('community-author').value.trim();
        const version = document.getElementById('community-version').value.trim();
        const appId = document.getElementById('community-id').value.trim();
        const tagsInput = document.getElementById('community-tags').value.trim();
        const guidelinesAccepted = document.getElementById('community-guidelines').checked;
        const originalWork = document.getElementById('community-original').checked;
        
        // Validation
        if (!author || !version || !appId || !tagsInput) {
            showNotification('Please fill in all required fields');
            return;
        }
        
        if (!guidelinesAccepted) {
            showNotification('You must agree to the publishing guidelines');
            return;
        }
        
        if (!originalWork) {
            showNotification('You must confirm this is your original work');
            return;
        }
        
        // Parse tags
        const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        if (tags.length === 0) {
            showNotification('Please add at least one tag');
            return;
        }
        
        // Show loading
        const publishBtn = document.getElementById('community-publish');
        const originalText = publishBtn.textContent;
        publishBtn.disabled = true;
        publishBtn.textContent = 'Publishing...';
        
        try {
            // Update app data
            createdApps[index].author = author;
            createdApps[index].version = version;
            createdApps[index].id = appId;
            createdApps[index].tags = tags;
            saveCreatedApps();
            
            // Publish to Firestore
            await publishToCommunity({
                ...app,
                id: appId,
                author,
                version,
                tags,
                htmlContent
            });
            
            showNotification('App published to community successfully!');
            cleanup();
        } catch (error) {
            console.error('Error publishing to community:', error);
            showNotification('Failed to publish app. Please try again.');
            publishBtn.disabled = false;
            publishBtn.textContent = originalText;
        }
    });
}

// Publish app to Community (Firestore)
async function publishToCommunity(app) {
    // Import Firestore handler
    const { default: Firestore } = await import('/src/scripts/FirestoreHandler.js');
    
    // Encode HTML content as Base64
    const base64Content = btoa(unescape(encodeURIComponent(app.htmlContent || '')));
    const maxChunkSize = 900000; // ~900KB per chunk to stay under Firestore limits
    
    // Split content if needed
    let htmlContentParts = [];
    let htmlContentField = null;
    
    if (base64Content.length > maxChunkSize) {
        // Split into chunks
        for (let i = 0; i < base64Content.length; i += maxChunkSize) {
            htmlContentParts.push(base64Content.substring(i, i + maxChunkSize));
        }
    } else {
        htmlContentField = base64Content;
    }
    
    // Build app object
    const communityApp = {
        id: app.id,
        name: app.name,
        author: app.author,
        description: app.description || 'No description',
        version: app.version,
        icon: app.icon || '',
        lightmode: app.lightmode === true,
        opensource: app.opensource === true,
        tags: app.tags || ['community'],
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Add HTML content (either as single field or parts)
    if (htmlContentParts.length > 0) {
        communityApp.htmlContentParts = htmlContentParts;
    } else {
        communityApp.htmlContent = htmlContentField;
    }
    
    // Get current community apps
    const appsDoc = await Firestore({
        Method: "get",
        CollectionName: "data",
        Document: "programs_data",
        SubCollection: "shawnyxx"
    });
    
    let communityApps = [];
    if (appsDoc && appsDoc.apps && appsDoc.apps.community) {
        communityApps = appsDoc.apps.community;
    }
    
    // Check if app with this ID already exists
    const existingIndex = communityApps.findIndex(a => a.id === app.id);
    if (existingIndex !== -1) {
        // Update existing app
        communityApps[existingIndex] = communityApp;
    } else {
        // Add new app
        communityApps.push(communityApp);
    }
    
    // Update Firestore
    await Firestore({
        Method: "update",
        CollectionName: "data",
        Document: "programs_data",
        SubCollection: "shawnyxx",
        SubDocument: "apps",
        Data: {
            community: communityApps
        }
    });
}

// Generate publishing XML
function generatePublishingXML(app) {
    const appId = app.id || app.name.toLowerCase().replace(/\s+/g, '-');
    
    // Encode HTML content as Base64 to reduce file size
    const base64HtmlContent = btoa(unescape(encodeURIComponent(app.htmlContent || '')));
    
    // Build tags array - always include 'user-created', add 'open-source' if app is opensource
    const tags = app.tags || ['user-created'];
    if (!tags.includes('user-created')) {
        tags.unshift('user-created');
    }
    if (app.opensource === true && !tags.includes('open-source')) {
        tags.push('open-source');
    }
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<app>
    <id>${escapeXML(appId)}</id>
    <name>${escapeXML(app.name)}</name>
    <author>${escapeXML(app.author || 'Unknown')}</author>
    <description>${escapeXML(app.description || 'No description')}</description>
    <version>${escapeXML(app.version || '1.0.0')}</version>
    <lightmode>${app.lightmode === true ? 'true' : 'false'}</lightmode>
    <opensource>${app.opensource === true ? 'true' : 'false'}</opensource>
    <tags>
${tags.map(tag => `        <tag>${escapeXML(tag)}</tag>`).join('\n')}
    </tags>
    <icon>${escapeXML(app.icon || '')}</icon>
    <htmlContent>${base64HtmlContent}</htmlContent>
    <metadata>
        <createdAt>${app.createdAt || new Date().toISOString()}</createdAt>
        <exportedAt>${new Date().toISOString()}</exportedAt>
        <encoding>base64</encoding>
    </metadata>
</app>`;
    
    // Download XML file
    downloadFile(xml, `${appId}.xml`, 'application/xml');
    
    showNotification('App exported for publishing! Send this .xml file to the developer.');
}

// Escape XML special characters
function escapeXML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Import app from XML file (from file input)
function handleXMLImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset file input
    event.target.value = '';
    
    handleXMLImportFromFile(file);
}

// Import app from XML file (shared function)
function handleXMLImportFromFile(file, options = {}) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const xmlContent = e.target.result;
            processXMLImport(xmlContent, options);
        } catch (error) {
            console.error('Error importing XML:', error);
            showNotification('Failed to import XML file');
        }
    };
    
    reader.onerror = () => {
        showNotification('Failed to read file');
    };
    
    reader.readAsText(file);
}

// Process XML import (shared function)
function processXMLImport(xmlContent, options = {}) {
    const { isForking = false, isEditing = false, canExport = true } = options;
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        showNotification('Invalid XML file format');
        return;
    }
    
    // Extract app data
    const appElement = xmlDoc.querySelector('app');
    if (!appElement) {
        showNotification('Invalid app XML structure');
        return;
    }
    
    const id = appElement.querySelector('id')?.textContent || '';
    const name = appElement.querySelector('name')?.textContent || 'Imported App';
    const author = appElement.querySelector('author')?.textContent || '';
    const description = appElement.querySelector('description')?.textContent || '';
    const version = appElement.querySelector('version')?.textContent || '1.0.0';
    const icon = appElement.querySelector('icon')?.textContent || '';
    let htmlContent = appElement.querySelector('htmlContent')?.textContent || '';
    const lightmode = appElement.querySelector('lightmode')?.textContent === 'true';
    const opensource = appElement.querySelector('opensource')?.textContent === 'true';
    
    // Check if content is Base64 encoded
    const encoding = appElement.querySelector('metadata > encoding')?.textContent;
    if (encoding === 'base64') {
        try {
            // Decode Base64 content
            htmlContent = decodeURIComponent(escape(atob(htmlContent)));
        } catch (error) {
            console.error('Error decoding Base64 content:', error);
            showNotification('Failed to decode app content');
            return;
        }
    }
    
    // Extract tags
    const tagsElements = appElement.querySelectorAll('tags > tag');
    const tags = Array.from(tagsElements).map(tag => tag.textContent);
    
    // Extract metadata
    const createdAt = appElement.querySelector('metadata > createdAt')?.textContent || new Date().toISOString();
    
    // Modify name if forking
    let finalName = name;
    if (isForking) {
        finalName = `${name} (Forked)`;
    } else if (isEditing) {
        finalName = name;
    }
    
    // Check if app with same name already exists
    const existingIndex = createdApps.findIndex(app => app.name === finalName);
    if (existingIndex !== -1 && !isEditing) {
        showConfirmDialog(
            'App Already Exists',
            `An app named "${finalName}" already exists. Do you want to replace it?`,
            (confirmed) => {
                if (confirmed) {
                    // Replace existing app
                    createdApps[existingIndex] = {
                        id: id || finalName.toLowerCase().replace(/\s+/g, '-'),
                        name: finalName,
                        author: author,
                        description: description,
                        version: version,
                        icon: icon,
                        htmlContent: htmlContent,
                        tags: tags,
                        createdAt: createdAt,
                        lightmode: lightmode,
                        opensource: isForking ? false : opensource, // Forked apps can't be marked as opensource initially
                        addedToHome: createdApps[existingIndex].addedToHome || false,
                        canExport: canExport,
                        isForked: isForking
                    };
                    saveCreatedApps();
                    renderCreatedAppsList();
                    showNotification(`App "${finalName}" updated successfully!`);
                }
            }
        );
    } else {
        // Create new app
        const newApp = {
            id: id || finalName.toLowerCase().replace(/\s+/g, '-'),
            name: finalName,
            author: author,
            description: description,
            version: version,
            icon: icon,
            htmlContent: htmlContent,
            tags: tags,
            createdAt: createdAt,
            lightmode: lightmode,
            opensource: isForking ? false : opensource, // Forked apps can't be marked as opensource initially
            addedToHome: false,
            canExport: canExport,
            isForked: isForking
        };
        
        createdApps.push(newApp);
        saveCreatedApps();
        renderCreatedAppsList();
        
        if (isForking) {
            showNotification(`App "${name}" forked successfully!`);
        } else if (isEditing) {
            showNotification(`App "${finalName}" added to creator for editing!`);
        } else {
            showNotification(`App "${finalName}" imported successfully!`);
        }
    }
}

/* ==================== UTILITY FUNCTIONS ==================== */

// Download file helper
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Show confirmation dialog
function showConfirmDialog(title, message, callback, timeout = null) {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-dialog-buttons">
            <button class="confirm-btn-yes">Yes</button>
            <button class="confirm-btn-no">No</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    let timeoutId = null;
    
    const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    };
    
    // Auto-dismiss after timeout if specified
    if (timeout) {
        timeoutId = setTimeout(() => {
            cleanup();
            callback(false);
        }, timeout);
    }
    
    dialog.querySelector('.confirm-btn-yes').addEventListener('click', () => {
        cleanup();
        callback(true);
    });
    
    dialog.querySelector('.confirm-btn-no').addEventListener('click', () => {
        cleanup();
        callback(false);
    });
    
    overlay.addEventListener('click', () => {
        cleanup();
        callback(false);
    });
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 14px 28px;
        border-radius: 12px;
        z-index: 10000;
        animation: slideDown 0.3s ease;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-weight: 500;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Open submit app confirmation modal
function openSubmitAppMailto() {
    const modal = document.getElementById('submit-app-modal');
    modal.classList.add('active');
}

// Actually open the mailto link
function openMailtoLink() {
    const email = 'shawnyxx@ecxogames.ca';
    const subject = 'Shawnyxx Portfolio App Submission';
    const body = `-- Please make sure you include your Author name, and the version of your app --

-- Also include your publishing-ready xml file --

For instructions on how to export your app as an XML file, please see the attached GIF or visit:
${window.location.origin}/assets/files/gifs/how-to-export-ready-for-publishing.gif`;
    
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    
    // Close the modal
    closeSubmitAppModal();
}

// Show manual instructions modal
function showManualInstructions() {
    // Close submit modal first
    closeSubmitAppModal();
    
    // Open manual instructions modal
    const modal = document.getElementById('manual-instructions-modal');
    modal.classList.add('active');
}

// Close submit app modal
function closeSubmitAppModal() {
    const modal = document.getElementById('submit-app-modal');
    modal.classList.remove('active');
}

// Close manual instructions modal
function closeManualInstructionsModal() {
    const modal = document.getElementById('manual-instructions-modal');
    modal.classList.remove('active');
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy to clipboard');
    });
}

/* ==================== CHEAT CODE SYSTEM ==================== */

let cheatCodeInput = '';
let cheatCodeTimer = null;

// Setup cheat code listener
function setupCheatCodeListener() {
    document.addEventListener('keydown', (e) => {
        // Don't listen if any modal is open or input field is focused
        const modalOpen = document.querySelector('.modal.active') || document.querySelector('input:focus') || document.querySelector('textarea:focus');
        if (modalOpen) {
            return;
        }
        
        // Listen for Ctrl+Shift+C
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            openCheatCodePrompt();
            return;
        }
        
        // Reset timer on each keypress
        clearTimeout(cheatCodeTimer);
        
        // Add character to input (only letters)
        if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
            cheatCodeInput += e.key.toLowerCase();
            
            // Check for cheat codes
            checkCheatCode();
            
            // Reset after 2 seconds of inactivity
            cheatCodeTimer = setTimeout(() => {
                cheatCodeInput = '';
            }, 2000);
        }
    });
}

// Open cheat code prompt
function openCheatCodePrompt() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 400px;
        width: 90%;
        animation: slideIn 0.3s ease;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 20px 0; color: #ffffff; font-size: 24px;">Enter Cheat Code</h3>
        <input type="text" id="cheat-code-input" placeholder="Type cheat code..." style="
            width: 100%;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            font-size: 16px;
            outline: none;
            margin-bottom: 20px;
        ">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cheat-cancel" style="
                padding: 10px 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                cursor: pointer;
                font-size: 14px;
            ">Cancel</button>
            <button id="cheat-submit" style="
                padding: 10px 20px;
                border: none;
                border-radius: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
            ">Submit</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const input = document.getElementById('cheat-code-input');
    input.focus();
    
    const cleanup = () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    };
    
    document.getElementById('cheat-submit').addEventListener('click', () => {
        const code = input.value.trim().toLowerCase();
        if (code) {
            executeCheatCode(code);
        }
        cleanup();
    });
    
    document.getElementById('cheat-cancel').addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup();
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const code = input.value.trim().toLowerCase();
            if (code) {
                executeCheatCode(code);
            }
            cleanup();
        } else if (e.key === 'Escape') {
            cleanup();
        }
    });
}

// Check cheat code
function checkCheatCode() {
    executeCheatCode(cheatCodeInput);
}

// Execute cheat code
function executeCheatCode(code) {
    switch(code) {
        case 'publisher':
            openPublisherModal();
            cheatCodeInput = '';
            break;
        case 'release':
            openReleaseCreator();
            cheatCodeInput = '';
            break;
        // Add more cheat codes here
    }
}

// Open publisher modal
function openPublisherModal() {
    showNotification('Publisher mode activated!');
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 30px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 28px; display: flex; align-items: center; gap: 10px;">
            <span class="material-symbols-outlined" style="font-size: 32px;">publish</span>
            Publisher Tools
        </h2>
        <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 20px;">
            Import user-submitted apps and prepare them for publishing.
        </p>
        
        <div style="
            background: rgba(255, 255, 255, 0.05);
            border: 2px dashed rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            margin-bottom: 20px;
            cursor: pointer;
        " id="publisher-drop-zone">
            <span class="material-symbols-outlined" style="font-size: 64px; color: rgba(255, 255, 255, 0.4); display: block; margin-bottom: 15px;">
                cloud_upload
            </span>
            <p style="color: rgba(255, 255, 255, 0.7); margin: 0 0 10px 0; font-size: 16px;">
                Drop .xml file here or click to browse
            </p>
            <input type="file" id="publisher-file-input" accept=".xml" style="display: none;">
        </div>
        
        <div id="publisher-result" style="display: none;">
            <h3 style="color: #ffffff; margin-bottom: 15px;">App Data Preview</h3>
            <pre id="publisher-preview" style="
                background: rgba(0, 0, 0, 0.3);
                padding: 15px;
                border-radius: 10px;
                color: #22c55e;
                font-size: 12px;
                overflow-x: auto;
                max-height: 300px;
            "></pre>
            <button id="download-publisher-data" style="
                margin-top: 15px;
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #ffffff;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                width: 100%;
            ">Download App Package</button>
        </div>
        
        <button id="close-publisher" style="
            margin-top: 20px;
            padding: 10px 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
        ">Close</button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(modal);
    
    const cleanup = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    };
    
    document.getElementById('close-publisher').addEventListener('click', cleanup);
    
    const dropZone = document.getElementById('publisher-drop-zone');
    const fileInput = document.getElementById('publisher-file-input');
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handlePublisherFile(file);
        }
    });
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(102, 126, 234, 0.6)';
        dropZone.style.background = 'rgba(102, 126, 234, 0.1)';
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        dropZone.style.background = 'rgba(255, 255, 255, 0.05)';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        dropZone.style.background = 'rgba(255, 255, 255, 0.05)';
        
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.xml')) {
            handlePublisherFile(file);
        } else {
            showNotification('Please upload a valid .xml file');
        }
    });
}

// Handle publisher file upload
function handlePublisherFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const xmlText = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Extract app data from XML
            const appData = {
                id: xmlDoc.querySelector('id')?.textContent || '',
                name: xmlDoc.querySelector('name')?.textContent || '',
                author: xmlDoc.querySelector('author')?.textContent || '',
                description: xmlDoc.querySelector('description')?.textContent || '',
                version: xmlDoc.querySelector('version')?.textContent || '',
                tags: Array.from(xmlDoc.querySelectorAll('tag')).map(t => t.textContent),
                icon: xmlDoc.querySelector('icon')?.textContent || '',
                htmlContent: xmlDoc.querySelector('htmlContent')?.textContent || ''
            };
            
            // Show preview
            document.getElementById('publisher-result').style.display = 'block';
            document.getElementById('publisher-preview').textContent = JSON.stringify(appData, null, 2);
            
            // Setup download button
            document.getElementById('download-publisher-data').onclick = () => {
                downloadPublisherPackage(appData);
            };
            
        } catch (error) {
            console.error('Error parsing XML:', error);
            showNotification('Error parsing XML file');
        }
    };
    
    reader.readAsText(file);
}

// Download publisher package
function downloadPublisherPackage(appData) {
    const packageData = {
        appJson: {
            id: appData.id,
            name: appData.name,
            author: appData.author,
            description: appData.description,
            path: `/assets/apps/featured-apps/${appData.id}/index.html`,
            icon: appData.icon,
            tags: appData.tags,
            version: appData.version,
            status: ""
        },
        htmlContent: appData.htmlContent,
        folderStructure: {
            path: `/assets/apps/featured-apps/${appData.id}/`,
            files: ['index.html']
        },
        instructions: `
1. Create folder: /assets/apps/featured-apps/${appData.id}/
2. Create file: /assets/apps/featured-apps/${appData.id}/index.html
3. Copy the HTML content from htmlContent field into index.html
4. Add the following entry to apps.json under "user" array:

${JSON.stringify({
    id: appData.id,
    name: appData.name,
    author: appData.author,
    description: appData.description,
    path: `/assets/apps/featured-apps/${appData.id}/index.html`,
    icon: appData.icon,
    tags: appData.tags,
    version: appData.version,
    status: ""
}, null, 2)}

5. If the app has a custom icon (base64), save it as icon.png in the app folder
6. Update the icon path in apps.json if needed
        `.trim()
    };
    
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appData.id}_package.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Package downloaded successfully!');
}

/* ==================== RELEASE NOTES SYSTEM ==================== */

// Open release notes modal
function openReleaseNotes() {
    const modal = document.getElementById('release-notes-modal');
    const listContainer = document.getElementById('release-notes-list');
    
    listContainer.innerHTML = '';
    
    if (releases.length === 0) {
        listContainer.innerHTML = `
            <div class="no-releases">
                <span class="material-symbols-outlined">description</span>
                <p>No release notes available</p>
            </div>
        `;
    } else {
        releases.forEach(releaseFile => {
            loadAndDisplayRelease(releaseFile, listContainer);
        });
    }
    
    modal.classList.add('active');
}

// Load and display a release
async function loadAndDisplayRelease(releaseFile, container) {
    try {
        const response = await fetch(`/assets/release-notes/${releaseFile}`);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const title = xmlDoc.querySelector('title')?.textContent || 'Untitled';
        const subtitle = xmlDoc.querySelector('subtitle')?.textContent || '';
        const version = xmlDoc.querySelector('version')?.textContent || '0.0.0';
        
        const releaseItem = document.createElement('div');
        releaseItem.className = 'release-note-item';
        releaseItem.innerHTML = `
            <div class="release-note-header">
                <div>
                    <h3 class="release-note-title">${title}</h3>
                    <p class="release-note-subtitle">${subtitle}</p>
                </div>
                <span class="release-note-version">v${version}</span>
            </div>
        `;
        
        releaseItem.addEventListener('click', () => {
            showReleaseDetail(xmlDoc);
        });
        
        container.appendChild(releaseItem);
    } catch (error) {
        console.error('Error loading release:', error);
    }
}

// Show release detail
function showReleaseDetail(xmlDoc) {
    const title = xmlDoc.querySelector('title')?.textContent || 'Untitled';
    const subtitle = xmlDoc.querySelector('subtitle')?.textContent || '';
    const version = xmlDoc.querySelector('version')?.textContent || '0.0.0';
    
    let bodyHTML = '';
    const bodyElements = xmlDoc.querySelectorAll('body > *');
    bodyElements.forEach(element => {
        bodyHTML += parseReleaseElement(element);
    });
    
    let footerHTML = '';
    const footerElements = xmlDoc.querySelectorAll('footer > *');
    if (footerElements.length > 0) {
        footerHTML = '<div class="release-detail-footer">';
        footerElements.forEach(element => {
            footerHTML += parseReleaseElement(element);
        });
        footerHTML += '</div>';
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'modal active release-detail-modal';
    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Release Details</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="release-detail-content">
                    <h1>${title}</h1>
                    <h2>${subtitle}</h2>
                    <span class="version-badge">Version ${version}</span>
                    ${bodyHTML}
                    ${footerHTML}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// Parse release XML element to HTML
function parseReleaseElement(element) {
    switch (element.tagName.toLowerCase()) {
        case 'paragraph':
            return `<p>${element.textContent}</p>`;
        case 'image':
            const imgSrc = element.getAttribute('src') || '';
            const imgAlt = element.getAttribute('alt') || '';
            return `<img src="${imgSrc}" alt="${imgAlt}">`;
        case 'link':
            const linkHref = element.getAttribute('href') || '#';
            const linkText = element.textContent;
            return `<a href="${linkHref}" target="_blank">${linkText}</a>`;
        case 'video':
            const videoSrc = element.getAttribute('src') || '';
            return `<video controls src="${videoSrc}"></video>`;
        default:
            return '';
    }
}

// Close release notes modal
function closeReleaseNotes() {
    document.getElementById('release-notes-modal').classList.remove('active');
}

// Open release creator
function openReleaseCreator() {
    // Check if there's a saved draft
    const savedDraft = localStorage.getItem('release-draft');
    
    if (savedDraft) {
        showConfirmDialog(
            'Load Draft?',
            'You have a saved draft. Would you like to continue editing it?',
            (confirmed) => {
                if (confirmed) {
                    loadReleaseDraft();
                } else {
                    startNewRelease();
                }
                document.getElementById('release-creator-modal').classList.add('active');
            }
        );
    } else {
        startNewRelease();
        document.getElementById('release-creator-modal').classList.add('active');
    }
    
    updateLoadDraftButton();
    showNotification('Release creator opened!');
}

// Update load draft button state
function updateLoadDraftButton() {
    const loadDraftBtn = document.getElementById('load-draft-btn');
    const hasDraft = localStorage.getItem('release-draft') !== null;
    
    if (hasDraft) {
        loadDraftBtn.classList.remove('disabled');
        loadDraftBtn.disabled = false;
        loadDraftBtn.style.opacity = '1';
    } else {
        loadDraftBtn.classList.add('disabled');
        loadDraftBtn.disabled = true;
        loadDraftBtn.style.opacity = '0.5';
    }
}

// Start a new release
function startNewRelease() {
    // Reset current release
    currentRelease = {
        title: '',
        subtitle: '',
        version: '',
        body: [],
        footer: []
    };
    
    // Clear form
    document.getElementById('release-title').value = '';
    document.getElementById('release-subtitle').value = '';
    document.getElementById('release-version').value = '';
    document.getElementById('body-elements').innerHTML = '';
    document.getElementById('footer-elements').innerHTML = '';
    
    hasUnsavedRelease = false;
    captureReleaseInitialState();
}

// Load release draft from localStorage
function loadReleaseDraft() {
    try {
        const draft = JSON.parse(localStorage.getItem('release-draft'));
        
        document.getElementById('release-title').value = draft.title || '';
        document.getElementById('release-subtitle').value = draft.subtitle || '';
        document.getElementById('release-version').value = draft.version || '';
        
        // Clear existing elements
        document.getElementById('body-elements').innerHTML = '';
        document.getElementById('footer-elements').innerHTML = '';
        
        // Load body elements
        if (draft.body && draft.body.length > 0) {
            draft.body.forEach(element => {
                recreateElement('body', element);
            });
        }
        
        // Load footer elements
        if (draft.footer && draft.footer.length > 0) {
            draft.footer.forEach(element => {
                recreateElement('footer', element);
            });
        }
        
        hasUnsavedRelease = false;
        captureReleaseInitialState();
        showNotification('Draft loaded successfully!');
    } catch (error) {
        console.error('Error loading draft:', error);
        showNotification('Error loading draft');
        startNewRelease();
    }
}

// Recreate an element from saved data
function recreateElement(section, elementData) {
    const container = document.getElementById(section === 'body' ? 'body-elements' : 'footer-elements');
    const element = document.createElement('div');
    element.className = 'element-item';
    element.dataset.id = Date.now() + Math.random();
    element.dataset.type = elementData.type;
    element.draggable = true;
    
    let inputHTML = '';
    
    switch (elementData.type) {
        case 'paragraph':
            inputHTML = `
                <textarea class="element-textarea" placeholder="Enter paragraph text...">${elementData.text || ''}</textarea>
            `;
            break;
        case 'image':
            inputHTML = `
                <input type="text" class="element-input" placeholder="Title (optional)" data-field="title" value="${elementData.title || ''}">
                <div class="media-preview-container">
                    <div class="paste-input-container">
                        <input type="text" class="element-input" placeholder="Image URL" data-field="src" value="${elementData.src || ''}">
                        <button class="paste-btn" onclick="pasteMediaIntoInput(this, 'image')">
                            <span class="material-symbols-outlined">content_paste</span>
                        </button>
                    </div>
                    <div class="media-preview">
                        ${elementData.src ? `<img src="${elementData.src}" alt="Preview">` : '<span class="placeholder">No preview</span>'}
                    </div>
                </div>
                <input type="text" class="element-input" placeholder="Alt text" data-field="alt" value="${elementData.alt || ''}">
            `;
            break;
        case 'link':
            inputHTML = `
                <input type="text" class="element-input" placeholder="Link URL" data-field="href" value="${elementData.href || ''}">
                <input type="text" class="element-input" placeholder="Link text" data-field="text" value="${elementData.text || ''}">
            `;
            break;
        case 'video':
            const isGif = elementData.isGif === 'true' || elementData.isGif === true;
            inputHTML = `
                <input type="text" class="element-input" placeholder="Title (optional)" data-field="title" value="${elementData.title || ''}">
                <div class="media-preview-container">
                    <div class="paste-input-container">
                        <button class="gif-toggle-btn ${isGif ? 'active' : ''}" onclick="toggleGifMode(this)" title="Toggle GIF mode">
                            ${isGif ? 'GIF' : 'VIDEO'}
                        </button>
                        <input type="text" class="element-input" placeholder="Video URL" data-field="src" value="${elementData.src || ''}" data-is-gif="${isGif}">
                        <button class="paste-btn" onclick="pasteMediaIntoInput(this, 'video')">
                            <span class="material-symbols-outlined">content_paste</span>
                        </button>
                    </div>
                    <div class="media-preview">
                        ${elementData.src ? (isGif ? `<img src="${elementData.src}" alt="GIF Preview">` : `<video src="${elementData.src}" muted loop autoplay></video>`) : '<span class="placeholder">No preview</span>'}
                    </div>
                </div>
            `;
            break;
    }
    
    element.innerHTML = `
        <div class="element-header">
            <div class="element-header-left">
                <span class="drag-handle">
                    <span class="material-symbols-outlined">drag_indicator</span>
                </span>
                <span class="element-type">${elementData.type}</span>
            </div>
            <button class="element-remove" onclick="removeElement(this)">
                <span class="material-symbols-outlined" style="font-size: 14px;">delete</span>
                Remove
            </button>
        </div>
        ${inputHTML}
    `;
    
    container.appendChild(element);
    
    // Add input listeners for this element
    element.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', markReleaseAsUnsaved);
        
        // Add preview update for image/video src
        if (input.dataset.field === 'src') {
            input.addEventListener('input', () => updateMediaPreview(element));
        }
    });
    
    // Setup drag and drop
    setupDragAndDrop(element);
}

// Capture initial release state
function captureReleaseInitialState() {
    releaseInitialState = JSON.stringify(getCurrentReleaseState());
}

// Get current release state
function getCurrentReleaseState() {
    return {
        title: document.getElementById('release-title').value,
        subtitle: document.getElementById('release-subtitle').value,
        version: document.getElementById('release-version').value,
        body: Array.from(document.querySelectorAll('#body-elements .element-item')).map(el => extractElementData(el)),
        footer: Array.from(document.querySelectorAll('#footer-elements .element-item')).map(el => extractElementData(el))
    };
}

// Extract element data
function extractElementData(element) {
    const type = element.dataset.type;
    const data = { type };
    
    switch (type) {
        case 'paragraph':
            data.text = element.querySelector('.element-textarea')?.value || '';
            break;
        case 'image':
            data.title = element.querySelector('[data-field="title"]')?.value || '';
            data.src = element.querySelector('[data-field="src"]')?.value || '';
            data.alt = element.querySelector('[data-field="alt"]')?.value || '';
            break;
        case 'link':
            data.href = element.querySelector('[data-field="href"]')?.value || '';
            data.text = element.querySelector('[data-field="text"]')?.value || '';
            break;
        case 'video':
            data.title = element.querySelector('[data-field="title"]')?.value || '';
            data.src = element.querySelector('[data-field="src"]')?.value || '';
            data.isGif = element.querySelector('[data-field="src"]')?.dataset.isGif || 'false';
            break;
    }
    
    return data;
}

// Mark release as unsaved
function markReleaseAsUnsaved() {
    if (!releaseInitialState) {
        captureReleaseInitialState();
        return;
    }
    
    const currentState = JSON.stringify(getCurrentReleaseState());
    hasUnsavedRelease = currentState !== releaseInitialState;
}

// Save release draft
function saveReleaseDraft() {
    const releaseData = getCurrentReleaseState();
    localStorage.setItem('release-draft', JSON.stringify(releaseData));
    hasUnsavedRelease = false;
    captureReleaseInitialState();
    updateLoadDraftButton();
    showNotification('Draft saved successfully!');
}

// Load release draft manually
function loadReleaseDraftManually() {
    const savedDraft = localStorage.getItem('release-draft');
    
    if (!savedDraft) {
        showNotification('No draft found');
        return;
    }
    
    // Check if there are unsaved changes
    if (hasUnsavedRelease) {
        showConfirmDialog(
            'Unsaved Changes',
            'You have unsaved changes. Loading a draft will discard them. Continue?',
            (confirmed) => {
                if (confirmed) {
                    loadReleaseDraft();
                }
            }
        );
    } else {
        // Check if form is empty or has content
        const currentState = getCurrentReleaseState();
        const isEmpty = !currentState.title && !currentState.subtitle && !currentState.version && 
                        currentState.body.length === 0 && currentState.footer.length === 0;
        
        if (isEmpty) {
            loadReleaseDraft();
        } else {
            showConfirmDialog(
                'Load Draft?',
                'Loading a draft will replace the current content. Continue?',
                (confirmed) => {
                    if (confirmed) {
                        loadReleaseDraft();
                    }
                }
            );
        }
    }
}

// Close release creator
function closeReleaseCreator() {
    if (hasUnsavedRelease) {
        showConfirmDialog(
            'Unsaved Changes',
            'You have unsaved changes. Would you like to save them as a draft?',
            (confirmed) => {
                if (confirmed) {
                    saveReleaseDraft();
                }
                document.getElementById('release-creator-modal').classList.remove('active');
                hasUnsavedRelease = false;
            }
        );
    } else {
        document.getElementById('release-creator-modal').classList.remove('active');
    }
}

// Add element to release
function addElement(section, type) {
    const container = document.getElementById(section === 'body' ? 'body-elements' : 'footer-elements');
    const elementId = Date.now() + Math.random();
    
    const element = document.createElement('div');
    element.className = 'element-item';
    element.dataset.id = elementId;
    element.dataset.type = type;
    element.draggable = true;
    
    let inputHTML = '';
    
    switch (type) {
        case 'paragraph':
            inputHTML = `
                <textarea class="element-textarea" placeholder="Enter paragraph text...">${''}</textarea>
            `;
            break;
        case 'image':
            inputHTML = `
                <input type="text" class="element-input" placeholder="Title (optional)" data-field="title">
                <div class="media-preview-container">
                    <div class="paste-input-container">
                        <input type="text" class="element-input" placeholder="Image URL" data-field="src">
                        <button class="paste-btn" onclick="pasteMediaIntoInput(this, 'image')">
                            <span class="material-symbols-outlined">content_paste</span>
                        </button>
                    </div>
                    <div class="media-preview">
                        <span class="placeholder">No preview</span>
                    </div>
                </div>
                <input type="text" class="element-input" placeholder="Alt text" data-field="alt">
            `;
            break;
        case 'link':
            inputHTML = `
                <input type="text" class="element-input" placeholder="Link URL" data-field="href">
                <input type="text" class="element-input" placeholder="Link text" data-field="text">
            `;
            break;
        case 'video':
            inputHTML = `
                <input type="text" class="element-input" placeholder="Title (optional)" data-field="title">
                <div class="media-preview-container">
                    <div class="paste-input-container">
                        <button class="gif-toggle-btn" onclick="toggleGifMode(this)" title="Toggle GIF mode">
                            VIDEO
                        </button>
                        <input type="text" class="element-input" placeholder="Video URL" data-field="src" data-is-gif="false">
                        <button class="paste-btn" onclick="pasteMediaIntoInput(this, 'video')">
                            <span class="material-symbols-outlined">content_paste</span>
                        </button>
                    </div>
                    <div class="media-preview">
                        <span class="placeholder">No preview</span>
                    </div>
                </div>
            `;
            break;
    }
    
    element.innerHTML = `
        <div class="element-header">
            <div class="element-header-left">
                <span class="drag-handle">
                    <span class="material-symbols-outlined">drag_indicator</span>
                </span>
                <span class="element-type">${type}</span>
            </div>
            <button class="element-remove" onclick="removeElement(this)">
                <span class="material-symbols-outlined" style="font-size: 14px;">delete</span>
                Remove
            </button>
        </div>
        ${inputHTML}
    `;
    
    container.appendChild(element);
    
    // Add input listeners for change tracking
    element.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', markReleaseAsUnsaved);
        
        // Add preview update for image/video src
        if (input.dataset.field === 'src') {
            input.addEventListener('input', () => updateMediaPreview(element));
        }
    });
    
    // Setup drag and drop
    setupDragAndDrop(element);
    
    // Mark as unsaved since we added an element
    markReleaseAsUnsaved();
}

// Remove element (global function for onclick)
window.removeElement = function(button) {
    button.closest('.element-item').remove();
    markReleaseAsUnsaved();
};

// Paste into input field (global function for onclick)
window.pasteMediaIntoInput = async function(button, mediaType) {
    try {
        const container = button.closest('.paste-input-container');
        const input = container.querySelector('input[data-field="src"]');
        const element = button.closest('.element-item');
        
        // Try to read from clipboard
        const clipboardItems = await navigator.clipboard.read();
        
        for (const item of clipboardItems) {
            // Check for image
            if (item.types.includes('image/png') || item.types.includes('image/jpeg') || item.types.includes('image/gif')) {
                const blob = await item.getType(item.types.find(type => type.startsWith('image/')));
                
                // Compress image
                const compressedDataUrl = await compressImage(blob);
                input.value = compressedDataUrl;
                markReleaseAsUnsaved();
                updateMediaPreview(element);
                showNotification('Image pasted and compressed!');
                return;
            }
            
            // Check for video
            if (item.types.some(type => type.startsWith('video/'))) {
                const blob = await item.getType(item.types.find(type => type.startsWith('video/')));
                
                // Ask if user wants to convert to GIF
                if (mediaType === 'video') {
                    showConfirmDialog(
                        'Convert to GIF?',
                        'Would you like to convert this video to a GIF to save space?',
                        async (confirmed) => {
                            if (confirmed) {
                                const gifDataUrl = await convertVideoToGif(blob);
                                input.value = gifDataUrl;
                                input.dataset.isGif = 'true';
                                updateGifToggleButton(element, true);
                                markReleaseAsUnsaved();
                                updateMediaPreview(element);
                                showNotification('Video converted to GIF!');
                            } else {
                                const compressedVideo = await compressVideo(blob);
                                input.value = compressedVideo;
                                input.dataset.isGif = 'false';
                                updateGifToggleButton(element, false);
                                markReleaseAsUnsaved();
                                updateMediaPreview(element);
                                showNotification('Video pasted and compressed!');
                            }
                        },
                        10000 // 10 second timeout
                    );
                    return;
                }
            }
            
            // Check for text (URL)
            if (item.types.includes('text/plain')) {
                const blob = await item.getType('text/plain');
                const text = await blob.text();
                input.value = text.trim();
                markReleaseAsUnsaved();
                updateMediaPreview(element);
                showNotification('Text pasted successfully!');
                return;
            }
        }
        
        // Fallback to text clipboard
        const text = await navigator.clipboard.readText();
        if (text) {
            input.value = text.trim();
            markReleaseAsUnsaved();
            updateMediaPreview(element);
            showNotification('Pasted from clipboard!');
        }
    } catch (error) {
        console.error('Error pasting:', error);
        showNotification('Failed to paste from clipboard');
    }
};

// Compress image
async function compressImage(blob) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Limit size
            const maxDimension = 1200;
            let width = img.width;
            let height = img.height;
            
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = (height / width) * maxDimension;
                    width = maxDimension;
                } else {
                    width = (width / height) * maxDimension;
                    height = maxDimension;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        
        reader.readAsDataURL(blob);
    });
}

// Compress video
async function compressVideo(blob) {
    // For simplicity, just convert to data URL with size limit
    // In a real app, you'd use a library like ffmpeg.wasm
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.readAsDataURL(blob);
    });
}

// Convert video to GIF (simplified)
async function convertVideoToGif(blob) {
    // This is a placeholder - real GIF conversion requires libraries like gifshot or ffmpeg.wasm
    // For now, we'll just return the video as data URL
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.readAsDataURL(blob);
    });
}

// Update media preview
function updateMediaPreview(element) {
    const preview = element.querySelector('.media-preview');
    if (!preview) return;
    
    const srcInput = element.querySelector('[data-field="src"]');
    const src = srcInput?.value;
    
    if (!src) {
        preview.innerHTML = '<span class="placeholder">No preview</span>';
        return;
    }
    
    const type = element.dataset.type;
    const isGif = srcInput?.dataset.isGif === 'true';
    
    if (type === 'image' || isGif) {
        preview.innerHTML = `<img src="${src}" alt="Preview">`;
    } else if (type === 'video') {
        preview.innerHTML = `<video src="${src}" muted loop autoplay></video>`;
    }
}

// Toggle GIF mode
window.toggleGifMode = function(button) {
    const input = button.parentElement.querySelector('input[data-field="src"]');
    const element = button.closest('.element-item');
    const isGif = input.dataset.isGif === 'true';
    
    input.dataset.isGif = (!isGif).toString();
    updateGifToggleButton(element, !isGif);
    updateMediaPreview(element);
    markReleaseAsUnsaved();
};

// Update GIF toggle button
function updateGifToggleButton(element, isGif) {
    const button = element.querySelector('.gif-toggle-btn');
    if (!button) return;
    
    if (isGif) {
        button.textContent = 'GIF';
        button.classList.add('active');
    } else {
        button.textContent = 'VIDEO';
        button.classList.remove('active');
    }
}

// Setup drag and drop for element
function setupDragAndDrop(element) {
    element.addEventListener('dragstart', (e) => {
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', element.innerHTML);
    });
    
    element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
        document.querySelectorAll('.element-item').forEach(el => {
            el.classList.remove('drag-over');
        });
    });
    
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const dragging = document.querySelector('.dragging');
        if (dragging && dragging !== element) {
            element.classList.add('drag-over');
        }
    });
    
    element.addEventListener('dragleave', () => {
        element.classList.remove('drag-over');
    });
    
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        
        const dragging = document.querySelector('.dragging');
        if (dragging && dragging !== element) {
            const container = element.parentElement;
            const allElements = [...container.querySelectorAll('.element-item')];
            const dragIndex = allElements.indexOf(dragging);
            const dropIndex = allElements.indexOf(element);
            
            if (dragIndex < dropIndex) {
                element.after(dragging);
            } else {
                element.before(dragging);
            }
            
            markReleaseAsUnsaved();
        }
    });
}

// Preview release
function previewRelease() {
    const title = document.getElementById('release-title').value.trim();
    const subtitle = document.getElementById('release-subtitle').value.trim();
    const version = document.getElementById('release-version').value.trim();
    
    if (!title) {
        showNotification('Please add a title to preview');
        return;
    }
    
    let bodyHTML = '';
    const bodyElements = document.querySelectorAll('#body-elements .element-item');
    bodyElements.forEach(element => {
        bodyHTML += buildPreviewHTML(element);
    });
    
    let footerHTML = '';
    const footerElements = document.querySelectorAll('#footer-elements .element-item');
    if (footerElements.length > 0) {
        footerHTML = '<div class="release-detail-footer">';
        footerElements.forEach(element => {
            footerHTML += buildPreviewHTML(element);
        });
        footerHTML += '</div>';
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'modal active release-detail-modal';
    overlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Release Preview</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="release-detail-content">
                    <h1>${title || 'Untitled'}</h1>
                    <h2>${subtitle || ''}</h2>
                    ${version ? `<span class="version-badge">Version ${version}</span>` : ''}
                    ${bodyHTML}
                    ${footerHTML}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// Build preview HTML from element
function buildPreviewHTML(element) {
    const type = element.dataset.type;
    let html = '';
    
    switch (type) {
        case 'paragraph':
            const text = element.querySelector('.element-textarea')?.value || '';
            html = `<p>${escapeHTML(text)}</p>`;
            break;
        case 'image':
            const imgTitle = element.querySelector('[data-field="title"]')?.value || '';
            const imgSrc = element.querySelector('[data-field="src"]')?.value || '';
            const imgAlt = element.querySelector('[data-field="alt"]')?.value || '';
            if (imgSrc) {
                html = `${imgTitle ? `<h3>${escapeHTML(imgTitle)}</h3>` : ''}<img src="${imgSrc}" alt="${escapeHTML(imgAlt)}">`;
            }
            break;
        case 'link':
            const linkHref = element.querySelector('[data-field="href"]')?.value || '#';
            const linkText = element.querySelector('[data-field="text"]')?.value || '';
            html = `<a href="${linkHref}" target="_blank">${escapeHTML(linkText)}</a>`;
            break;
        case 'video':
            const videoTitle = element.querySelector('[data-field="title"]')?.value || '';
            const videoSrc = element.querySelector('[data-field="src"]')?.value || '';
            const isGif = element.querySelector('[data-field="src"]')?.dataset.isGif === 'true';
            if (videoSrc) {
                if (isGif) {
                    html = `${videoTitle ? `<h3>${escapeHTML(videoTitle)}</h3>` : ''}<img src="${videoSrc}" alt="GIF">`;
                } else {
                    html = `${videoTitle ? `<h3>${escapeHTML(videoTitle)}</h3>` : ''}<video controls src="${videoSrc}"></video>`;
                }
            }
            break;
    }
    
    return html;
}

// Escape HTML
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Export release as XML
function exportRelease() {
    const title = document.getElementById('release-title').value.trim();
    const subtitle = document.getElementById('release-subtitle').value.trim();
    const version = document.getElementById('release-version').value.trim();
    
    if (!title || !version) {
        showNotification('Please fill in title and version');
        return;
    }
    
    // Build XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<release>\n';
    xml += `  <title>${escapeXML(title)}</title>\n`;
    xml += `  <subtitle>${escapeXML(subtitle)}</subtitle>\n`;
    xml += `  <version>${escapeXML(version)}</version>\n`;
    
    // Body elements
    xml += '  <body>\n';
    const bodyElements = document.querySelectorAll('#body-elements .element-item');
    bodyElements.forEach(element => {
        xml += buildElementXML(element, 4);
    });
    xml += '  </body>\n';
    
    // Footer elements
    xml += '  <footer>\n';
    const footerElements = document.querySelectorAll('#footer-elements .element-item');
    footerElements.forEach(element => {
        xml += buildElementXML(element, 4);
    });
    xml += '  </footer>\n';
    
    xml += '</release>';
    
    // Download XML file
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `release-${version.replace(/\./g, '-')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Release exported successfully!');
    
    // Ask if user wants to clear the draft
    setTimeout(() => {
        showConfirmDialog(
            'Clear Draft?',
            'Release exported successfully! Would you like to clear the saved draft?',
            (confirmed) => {
                if (confirmed) {
                    localStorage.removeItem('release-draft');
                    hasUnsavedRelease = false;
                    updateLoadDraftButton();
                    showNotification('Draft cleared!');
                }
            }
        );
    }, 500);
}

// Build element XML
function buildElementXML(element, indent) {
    const type = element.dataset.type;
    const indentStr = ' '.repeat(indent);
    let xml = '';
    
    switch (type) {
        case 'paragraph':
            const text = element.querySelector('.element-textarea')?.value || '';
            xml = `${indentStr}<paragraph>${escapeXML(text)}</paragraph>\n`;
            break;
        case 'image':
            const imgTitle = element.querySelector('[data-field="title"]')?.value || '';
            const imgSrc = element.querySelector('[data-field="src"]')?.value || '';
            const imgAlt = element.querySelector('[data-field="alt"]')?.value || '';
            xml = `${indentStr}<image src="${escapeXML(imgSrc)}" alt="${escapeXML(imgAlt)}"${imgTitle ? ` title="${escapeXML(imgTitle)}"` : ''} />\n`;
            break;
        case 'link':
            const linkHref = element.querySelector('[data-field="href"]')?.value || '';
            const linkText = element.querySelector('[data-field="text"]')?.value || '';
            xml = `${indentStr}<link href="${escapeXML(linkHref)}">${escapeXML(linkText)}</link>\n`;
            break;
        case 'video':
            const videoTitle = element.querySelector('[data-field="title"]')?.value || '';
            const videoSrc = element.querySelector('[data-field="src"]')?.value || '';
            const isGif = element.querySelector('[data-field="src"]')?.dataset.isGif === 'true';
            xml = `${indentStr}<video src="${escapeXML(videoSrc)}"${videoTitle ? ` title="${escapeXML(videoTitle)}"` : ''}${isGif ? ' isGif="true"' : ''} />\n`;
            break;
    }
    
    return xml;
}

// (escapeXML already declared earlier) reuse the existing implementation above

// ===========================
// Media Widget Functions
// ===========================

let musicPlayerIframe = null;
let currentMusicState = {
    isPlaying: false,
    currentTrack: null
};

function initMediaWidget() {
    const widgetPlayPause = document.getElementById('widget-play-pause');
    const widgetPrev = document.getElementById('widget-prev');
    const widgetNext = document.getElementById('widget-next');
    
    // Listen for play/pause
    widgetPlayPause?.addEventListener('click', () => {
        sendMusicCommand('PLAY_PAUSE');
    });
    
    // Listen for previous
    widgetPrev?.addEventListener('click', () => {
        sendMusicCommand('PREV');
    });
    
    // Listen for next
    widgetNext?.addEventListener('click', () => {
        sendMusicCommand('NEXT');
    });
    
    // Listen for messages from music player and settings app
    window.addEventListener('message', (e) => {
        if (e.data.type === 'MUSIC_STATE') {
            updateMediaWidget(e.data);
        } else if (e.data.type === 'SETTINGS_UPDATED') {
            // Reload settings and apply changes
            loadSettings();
            applyTheme();
            setWallpaper(settings.wallpaper);
        } else if (e.data.type === 'UPDATE_APP') {
            // Handle app update request from settings
            const app = createdApps.find(a => a.id === e.data.appId);
            if (app) {
                updateApp(app);
                // Refresh settings to show updated info
                setTimeout(() => {
                    const settingsIframe = document.querySelector('#app-iframe');
                    if (settingsIframe && settingsIframe.src.includes('settings.xml')) {
                        settingsIframe.contentWindow.location.reload();
                    }
                }, 500);
            }
        } else if (e.data.type === 'UNINSTALL_APP') {
            // Handle app uninstall request from settings
            const app = createdApps.find(a => a.id === e.data.appId);
            if (app) {
                uninstallApp(app);
                // Close settings and refresh
                setTimeout(() => {
                    closeApp();
                }, 500);
            }
        } else if (e.data.type === 'DELETE_ALL_DATA') {
            // Handle delete all data request from settings
            deleteAllData();
        }
    });
}

// deleteAllData is implemented earlier with confirmation dialogs; do not redeclare here.

function sendMusicCommand(action) {
    if (musicPlayerIframe) {
        musicPlayerIframe.contentWindow.postMessage({
            type: 'MUSIC_CONTROL',
            action: action
        }, '*');
    }
}

function updateMediaWidget(state) {
    const widget = document.getElementById('media-control-widget');
    const playPauseBtn = document.getElementById('widget-play-pause');
    const trackInfo = document.getElementById('widget-track-info');
    
    currentMusicState = state;
    
    if (state.isPlaying || state.currentTrack) {
        widget.style.display = 'flex';
        
        // Update play/pause button
        const icon = playPauseBtn.querySelector('span');
        icon.textContent = state.isPlaying ? 'pause' : 'play_arrow';
        
        // Update track info
        if (state.currentTrack) {
            trackInfo.textContent = `${state.currentTrack.title} - ${state.currentTrack.artist}`;
        } else {
            trackInfo.textContent = 'No track playing';
        }
    } else {
        widget.style.display = 'none';
    }
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    const submitModal = document.getElementById('submit-app-modal');
    const manualModal = document.getElementById('manual-instructions-modal');
    
    if (e.target === submitModal) {
        closeSubmitAppModal();
    }
    if (e.target === manualModal) {
        closeManualInstructionsModal();
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
