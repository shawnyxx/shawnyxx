// App Creator Main Script

import FirestoreHandler from '../../scripts/FirestoreHandler.js';

let monacoEditor;
let currentApp = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeEditor();
    loadCreatedApps();
    setupEventListeners();
    setupModalListeners();
    hideAppNav(); // Start with only Home visible
    showWelcomeModalIfNeeded();
    updateBanNotificationBadge(); // Initialize ban notification badge
});

// Navigation between sections
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            switchSection(section);
        });
    });
}

function switchSection(sectionName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Update content
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(`${sectionName}-section`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    // Load content for specific sections
    if (sectionName === 'assets') {
        loadAssets();
    }
    if (sectionName === 'code') {
        setupMenuListeners();
    }
    if (sectionName === 'app-bans') {
        loadBannedApps();
    }
    if (sectionName === 'published-apps') {
        loadPublishedApps();
    }
}

// Initialize Monaco Editor
function initializeEditor() {
    // Load Monaco Editor
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function() {
        monacoEditor = monaco.editor.create(document.getElementById('monaco-editor-container'), {
            value: getDefaultHTML(),
            language: 'html',
            theme: 'vs-dark',
            fontSize: 14,
            minimap: { enabled: true },
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            bracketMatching: 'always',
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on'
        });

        // Editor is ready
    });
}

// Default HTML template
function getDefaultHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #f0f0f0;
            color: #333;
            padding: 20px;
        }
        h1 {
            color: #0066cc;
        }
    </style>
</head>
<body>
    <h1>Hello World!</h1>
    <p>This is my custom app.</p>
</body>
</html>`;
}

// Preview app
function previewApp() {
    if (!monacoEditor) {
        alert('Editor not ready yet. Please wait a moment and try again.');
        return;
    }
    let html = monacoEditor.getValue();
    if (currentApp && currentApp.assets) {
        Object.entries(currentApp.assets).forEach(([id, data]) => {
            html = html.replace(new RegExp(`src="${id}"`, 'g'), `src="${data}"`);
        });
    }
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(html);
    previewWindow.document.close();
}

// Paste image from clipboard
async function pasteImage() {
    if (!monacoEditor) {
        alert('Editor not ready yet. Please wait a moment and try again.');
        return;
    }
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getType(type);
                    const dataUrl = await blobToDataUrl(blob);
                    insertImage(dataUrl);
                    return;
                }
            }
        }
        // If no image, try to read text and see if it's a URL
        const text = await navigator.clipboard.readText();
        if (isImageUrl(text)) {
            insertImage(text);
        } else {
            alert('No image found in clipboard');
        }
    } catch (err) {
        console.error('Failed to read clipboard:', err);
        alert('Failed to access clipboard. Make sure you have permission.');
    }
}

function blobToDataUrl(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

function isImageUrl(url) {
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url) || url.startsWith('data:image/');
}

function insertImage(src) {
    const id = 'asset-' + Date.now();
    if (!currentApp.assets) currentApp.assets = {};
    currentApp.assets[id] = src;
    const imgTag = `<img src="${id}" alt="Asset ${id}">\n`;
    const position = monacoEditor.getPosition();
    monacoEditor.executeEdits('', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: imgTag
    }]);
    monacoEditor.focus();
}

// Paste icon from clipboard
async function pasteIcon() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getType(type);
                    const dataUrl = await blobToDataUrl(blob);
                    setIconPreview(dataUrl);
                    return;
                }
            }
        }
        // If no image, try to read text and see if it's a URL
        const text = await navigator.clipboard.readText();
        if (isImageUrl(text)) {
            setIconPreview(text);
        } else {
            alert('No image found in clipboard');
        }
    } catch (err) {
        console.error('Failed to read clipboard:', err);
        alert('Failed to access clipboard. Make sure you have permission.');
    }
}

function setIconPreview(src) {
    document.getElementById('icon-preview').innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
}

// Setup event listeners
function setupEventListeners() {
    // Create new app
    const createNewAppBtn = document.getElementById('create-new-app');
    if (createNewAppBtn) createNewAppBtn.addEventListener('click', function() {
        showNewAppModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (currentApp) saveApp();
        }
    });

    // Import XML
    const importXmlBtn = document.getElementById('import-app-xml');
    if (importXmlBtn) importXmlBtn.addEventListener('click', function() {
        document.getElementById('xml-file-input').click();
    });

    const xmlFileInput = document.getElementById('xml-file-input');
    if (xmlFileInput) xmlFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const xmlContent = e.target.result;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
                    loadAppFromXML(xmlDoc);
                    showAppNav(currentApp.name);
                    switchSection('properties');
                } catch (error) {
                    alert('Invalid XML file');
                }
            };
            reader.readAsText(file);
        }
    });

    // Icon upload
    const uploadIconBtn = document.getElementById('upload-icon-btn');
    if (uploadIconBtn) uploadIconBtn.addEventListener('click', function() {
        document.getElementById('icon-file-input').click();
    });

    const iconFileInput = document.getElementById('icon-file-input');
    if (iconFileInput) iconFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('icon-preview').innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Paste icon
    const pasteIconBtn = document.getElementById('paste-icon-btn');
    if (pasteIconBtn) pasteIconBtn.addEventListener('click', pasteIcon);

    // Save app
    const saveAppBtn = document.getElementById('save-app-btn');
    if (saveAppBtn) saveAppBtn.addEventListener('click', saveApp);

    // Export app
    const exportAppBtn = document.getElementById('export-app-btn');
    if (exportAppBtn) exportAppBtn.addEventListener('click', exportApp);

    // Publish app
    const publishAppBtn = document.getElementById('publish-app-btn');
    if (publishAppBtn) publishAppBtn.addEventListener('click', async () => {
        if (!currentApp) {
            alert('Please select an app first');
            return;
        }
        
        // Check if app is banned
        const isBanned = await isAppBanned(currentApp.id);
        if (isBanned) {
            alert('This app has been banned and cannot be published. Please contact support if you believe this is an error.');
            return;
        }
        
        // Check if app is already published
        const isPublished = await isAppPublished(currentApp.id);
        if (isPublished) {
            // Show version update modal directly for updates
            const author = document.getElementById('publish-author').value.trim() || 'Anonymous';
            const version = document.getElementById('publish-version').value.trim() || '1.0.0';
            const tags = document.getElementById('publish-tags').value.trim().split(',').map(t => t.trim()).filter(t => t);
            const assets = currentApp.assets || {};
            
            showVersionUpdateModal(currentApp, author, version, tags, assets);
        } else {
            // Show full publish modal for new apps
            showPublishModal();
        }
    });

    // Alternative publish button
    const alternativePublishBtn = document.getElementById('alternative-publish-btn');
    if (alternativePublishBtn) alternativePublishBtn.addEventListener('click', function() {
        showPublishModal();
        setTimeout(() => {
            showCommunityPublishFields();
        }, 100);
    });

    // Preview app
    const previewAppBtn = document.getElementById('preview-app-btn');
    if (previewAppBtn) previewAppBtn.addEventListener('click', previewApp);

    // Paste image
    const pasteImageBtn = document.getElementById('paste-image-btn');
    if (pasteImageBtn) pasteImageBtn.addEventListener('click', pasteImage);

    // Upload asset
    const uploadAssetBtn = document.getElementById('upload-asset-btn');
    if (uploadAssetBtn) uploadAssetBtn.addEventListener('click', function() {
        document.getElementById('asset-file-input').click();
    });

    const assetFileInput = document.getElementById('asset-file-input');
    if (assetFileInput) assetFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const id = 'asset-' + Date.now();
                if (!currentApp.assets) currentApp.assets = {};
                currentApp.assets[id] = event.target.result;
                loadAssets();
            };
            reader.readAsDataURL(file);
        }
    });

    // Menu buttons
    // Moved to setupMenuListeners, called when switching to code section
}

// Setup menu listeners for code section
function setupMenuListeners() {
    const saveMenuBtn = document.getElementById('save-menu-btn');
    if (saveMenuBtn) saveMenuBtn.addEventListener('click', saveApp);

    const exitMenuBtn = document.getElementById('exit-menu-btn');
    if (exitMenuBtn) exitMenuBtn.addEventListener('click', function() {
        hideAppNav();
        switchSection('home');
    });

    const pasteImageMenuBtn = document.getElementById('paste-image-menu-btn');
    if (pasteImageMenuBtn) pasteImageMenuBtn.addEventListener('click', pasteImage);

    const previewMenuBtn = document.getElementById('preview-menu-btn');
    if (previewMenuBtn) previewMenuBtn.addEventListener('click', previewApp);
}

// Clear form
function clearForm() {
    document.getElementById('app-name-input').value = '';
    document.getElementById('app-description-input').value = '';
    document.getElementById('icon-preview').innerHTML = '<span class="material-symbols-outlined">apps</span>';
    document.getElementById('app-lightmode-toggle').checked = false;
    document.getElementById('app-opensource-toggle').checked = false;
    document.getElementById('app-generic-style-toggle').checked = true;
    if (monacoEditor) {
        monacoEditor.setValue(getDefaultHTML());
    } else {
        document.getElementById('fallback-editor').value = getDefaultHTML();
    }
}

// Load app from XML
function loadAppFromXML(xmlDoc) {
    const appElement = xmlDoc.querySelector('app');
    if (appElement) {
        document.getElementById('app-name-input').value = appElement.getAttribute('name') || '';
        document.getElementById('app-description-input').value = appElement.querySelector('description')?.textContent || '';
        const icon = appElement.querySelector('icon')?.textContent;
        if (icon) {
            document.getElementById('icon-preview').innerHTML = `<img src="${icon}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
        }
        document.getElementById('app-lightmode-toggle').checked = appElement.getAttribute('lightmode') === 'true';
        document.getElementById('app-opensource-toggle').checked = appElement.getAttribute('opensource') === 'true';
        document.getElementById('app-generic-style-toggle').checked = appElement.getAttribute('genericstyle') === 'true';
        const html = appElement.querySelector('html')?.textContent || getDefaultHTML();
        if (monacoEditor) {
            monacoEditor.setValue(html);
        } else {
            document.getElementById('fallback-editor').value = html;
        }
    }
}

// Save app
function saveApp() {
    if (!monacoEditor) {
        alert('Editor not ready yet. Please wait a moment and try again.');
        return;
    }
    const name = document.getElementById('app-name-input').value.trim();
    if (!name) {
        alert('Please enter an app name');
        return;
    }

    const app = {
        id: currentApp ? currentApp.id : Date.now().toString(),
        name: name,
        description: document.getElementById('app-description-input').value,
        icon: document.getElementById('icon-preview').querySelector('img')?.src || '',
        lightmode: document.getElementById('app-lightmode-toggle').checked,
        opensource: document.getElementById('app-opensource-toggle').checked,
        genericstyle: document.getElementById('app-generic-style-toggle').checked,
        html: monacoEditor.getValue(),
        assets: currentApp ? currentApp.assets || {} : {},
        created: currentApp ? currentApp.created : new Date().toISOString()
    };

    const apps = JSON.parse(localStorage.getItem('createdApps') || '[]');
    const existingIndex = apps.findIndex(a => a.id === app.id);
    if (existingIndex >= 0) {
        apps[existingIndex] = app;
    } else {
        apps.push(app);
    }
    localStorage.setItem('createdApps', JSON.stringify(apps));

    currentApp = app;
    showAppNav(app.name);
    loadCreatedApps();
    alert('App saved successfully!');
}

// Export app as XML
function exportApp() {
    if (!currentApp) {
        alert('Please select an app first');
        return;
    }

    const xmlContent = generateXML(currentApp);
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentApp.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Generate XML from app data
function generateXML(app) {
    const htmlContent = escapeXml(app.html);
    return `<?xml version="1.0" encoding="UTF-8"?>
<app name="${escapeXml(app.name)}" lightmode="${app.lightmode}" opensource="${app.opensource}" genericstyle="${app.genericstyle}">
    <description>${escapeXml(app.description || '')}</description>
    <icon>${escapeXml(app.icon || '')}</icon>
    <html>${htmlContent}</html>
</app>`;
}

// Escape XML characters
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&#39;';
            case '"': return '&quot;';
        }
    });
}

// Setup modal event listeners
function setupModalListeners() {
    // New app modal
    const closeNewAppModal = document.getElementById('close-new-app-modal');
    if (closeNewAppModal) closeNewAppModal.addEventListener('click', hideNewAppModal);
    
    const createAppCancel = document.getElementById('create-app-cancel');
    if (createAppCancel) createAppCancel.addEventListener('click', hideNewAppModal);
    
    const createAppConfirm = document.getElementById('create-app-confirm');
    if (createAppConfirm) createAppConfirm.addEventListener('click', createNewApp);

    // Publish modal
    const closePublishModal = document.getElementById('close-publish-modal');
    if (closePublishModal) closePublishModal.addEventListener('click', hidePublishModal);
    
    const openMailtoBtn = document.getElementById('open-mailto-btn');
    if (openMailtoBtn) openMailtoBtn.addEventListener('click', openMailto);
    
    const publishCommunityBtn = document.getElementById('publish-community-btn');
    if (publishCommunityBtn) publishCommunityBtn.addEventListener('click', showCommunityPublishFields);
    
    const confirmCommunityPublishBtn = document.getElementById('confirm-community-publish');
    if (confirmCommunityPublishBtn) confirmCommunityPublishBtn.addEventListener('click', () => publishToCommunity(currentApp));
    
    const cancelCommunityPublishBtn = document.getElementById('cancel-community-publish');
    if (cancelCommunityPublishBtn) cancelCommunityPublishBtn.addEventListener('click', hideCommunityPublishFields);
    
    const showManualInstructionsBtn = document.getElementById('show-manual-instructions-btn');
    if (showManualInstructionsBtn) showManualInstructionsBtn.addEventListener('click', () => {
        // Placeholder for manual instructions
        alert('Manual publishing instructions will be shown here.');
    });

    // Manual instructions modal
    const closeManualInstructions = document.getElementById('close-manual-instructions');
    if (closeManualInstructions) closeManualInstructions.addEventListener('click', hideManualInstructions);

    // Welcome modal
    const closeWelcomeModal = document.getElementById('close-welcome-modal');
    if (closeWelcomeModal) closeWelcomeModal.addEventListener('click', hideWelcomeModal);
    
    const welcomeContinue = document.getElementById('welcome-continue');
    if (welcomeContinue) welcomeContinue.addEventListener('click', hideWelcomeModal);

    // Deletion request
    const submitDeletionRequestBtn = document.getElementById('submit-deletion-request');
    if (submitDeletionRequestBtn) submitDeletionRequestBtn.addEventListener('click', showDeletionRequestModal);

    const closeDeletionRequestModal = document.getElementById('close-deletion-request-modal');
    if (closeDeletionRequestModal) closeDeletionRequestModal.addEventListener('click', hideDeletionRequestModal);

    const cancelDeletionRequest = document.getElementById('cancel-deletion-request');
    if (cancelDeletionRequest) cancelDeletionRequest.addEventListener('click', hideDeletionRequestModal);

    const submitDeletionTicketBtn = document.getElementById('submit-deletion-ticket');
    if (submitDeletionTicketBtn) submitDeletionTicketBtn.addEventListener('click', submitDeletionTicket);

    // Ban review request
    const submitBanReviewRequestBtn = document.getElementById('submit-ban-review-request');
    if (submitBanReviewRequestBtn) submitBanReviewRequestBtn.addEventListener('click', showBanReviewRequestModal);
}

// Modal functions
function showNewAppModal() {
    document.getElementById('new-app-modal').style.display = 'block';
    document.getElementById('new-app-name').focus();
}

function hideNewAppModal() {
    document.getElementById('new-app-modal').style.display = 'none';
    document.getElementById('new-app-name').value = '';
}

function showPublishModal() {
    if (!currentApp) {
        alert('Please select an app first');
        return;
    }
    document.getElementById('publish-modal').style.display = 'block';
}

function hidePublishModal() {
    document.getElementById('publish-modal').style.display = 'none';
    hideCommunityPublishFields();
}

function showCommunityPublishFields() {
    document.getElementById('community-publish-fields').style.display = 'block';
    document.getElementById('publish-author').focus();
}

function hideCommunityPublishFields() {
    document.getElementById('community-publish-fields').style.display = 'none';
}

function hideManualInstructions() {
    document.getElementById('manual-instructions-modal').style.display = 'none';
}

function showWelcomeModalIfNeeded() {
    const hasSeenWelcome = localStorage.getItem('app-creator-welcome-seen');
    if (!hasSeenWelcome) {
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            welcomeModal.style.display = 'block';
        }
    }
}

function hideWelcomeModal() {
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
        welcomeModal.style.display = 'none';
        localStorage.setItem('app-creator-welcome-seen', 'true');
    }
}

function showDeletionRequestModal() {
    document.getElementById('deletion-request-modal').style.display = 'block';
}

function hideDeletionRequestModal() {
    document.getElementById('deletion-request-modal').style.display = 'none';
    // Clear form
    document.getElementById('deletion-author').value = '';
    document.getElementById('deletion-app-id').value = '';
    document.getElementById('deletion-email').value = '';
    document.getElementById('deletion-description').value = '';
    document.getElementById('deletion-consent').checked = false;
}

async function submitDeletionTicket() {
    const author = document.getElementById('deletion-author').value.trim();
    const appId = document.getElementById('deletion-app-id').value.trim();
    const email = document.getElementById('deletion-email').value.trim();
    const description = document.getElementById('deletion-description').value.trim();
    const consent = document.getElementById('deletion-consent').checked;

    if (!author || !description || !email || !consent) {
        alert('Please fill in all required fields and check the consent box.');
        return;
    }

    if (!appId && !email.includes('@')) {
        alert('Please provide either an App ID or a valid email address.');
        return;
    }

    try {
        const ticketId = Date.now().toString();
        const ticket = {
            author: author,
            app_id: appId,
            email: email,
            type: "app_deletion_request",
            description: description,
            consent: consent,
            status: 'pending'
        };

        // Get current tickets
        const currentTickets = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'tickets' }) || {};

        // Add new ticket
        currentTickets[ticketId] = ticket;

        // Save back
        await FirestoreHandler({ Method: 'set', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'tickets', Data: currentTickets });

        alert('Deletion request submitted successfully! We will review it and process accordingly.');
        hideDeletionRequestModal();
    } catch (error) {
        console.error('Error submitting deletion request:', error);
        alert('Failed to submit deletion request. Please try again.');
    }
}

function showBanReviewRequestModal() {
    // Since ban review is a section, not a modal, just show a confirmation
    if (confirm('This will submit a ban review request for your banned app. Are you sure you want to proceed?')) {
        submitBanReviewTicket();
    }
}

async function submitBanReviewForApp(appId) {
    if (!confirm('This will submit a ban review request for your banned app. Are you sure you want to proceed?')) return;

    try {
        const ticketId = Date.now().toString();
        const ticket = {
            author: 'App Creator User', // Could be enhanced to get actual user info
            app_id: appId,
            type: "app_ban_review_request",
            description: `Request to review and potentially lift ban on app with ID: ${appId}`,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        // Get current tickets
        const currentTickets = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'tickets' }) || {};

        // Add new ticket
        currentTickets[ticketId] = ticket;

        // Save back
        await FirestoreHandler({ Method: 'set', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'tickets', Data: currentTickets });

        alert('Ban review request submitted successfully! We will review your request.');
        // Refresh the banned apps view
        loadBannedApps();
    } catch (error) {
        console.error('Error submitting ban review request:', error);
        alert('Failed to submit ban review request. Please try again.');
    }
}

// Make function global for onclick
window.submitBanReviewForApp = submitBanReviewForApp;

function openMailto() {
    if (!currentApp) return;
    
    const subject = `App Submission: ${currentApp.name}`;
    const body = `Hi Shawnyxx,%0A%0AI would like to submit my app for publishing on your portfolio.%0A%0AApp Name: ${currentApp.name}%0ADescription: ${currentApp.description || 'N/A'}%0AOpen Source: ${currentApp.opensource ? 'Yes' : 'No'}%0A%0APlease find the attached XML file.%0A%0ABest regards,%0A[Your Name]`;
    
    window.open(`mailto:shawnyxx@ecxogames.ca?subject=${encodeURIComponent(subject)}&body=${body}`);
    hidePublishModal();
}

// Publish app to community
async function publishToCommunity(app) {
    if (!app) {
        alert('Please select an app first');
        return;
    }

    const author = document.getElementById('publish-author').value.trim() || 'Anonymous';
    const version = document.getElementById('publish-version').value.trim() || '1.0.0';
    const tagsInput = document.getElementById('publish-tags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Validate assets
    const assets = app.assets || {};
    const assetEntries = Object.entries(assets);
    let totalSize = 0;
    const maxTotalSize = 5 * 1024 * 1024; // 5MB
    const maxAssetSize = 0.25 * 1024 * 1024; // 0.25MB

    for (const [id, data] of assetEntries) {
        if (!data.startsWith('data:')) {
            alert(`Asset "${id}" is not a valid base64 data URL. Please re-upload or re-paste the asset.`);
            return;
        }
        // Calculate size from base64 (approximate: base64 is ~4/3 of binary)
        const base64Data = data.split(',')[1];
        const size = (base64Data.length * 3) / 4;
        if (size > maxAssetSize) {
            alert(`Asset "${id}" is too large (${(size / 1024 / 1024).toFixed(2)}MB). Maximum allowed is 0.25MB per asset.`);
            return;
        }
        totalSize += size;
    }

    if (totalSize > maxTotalSize) {
        alert(`Total assets size is ${(totalSize / 1024 / 1024).toFixed(2)}MB. Maximum allowed is 5MB.`);
        return;
    }

    // Check if app already exists
    const currentData = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' }) || { community: [] };
    const existingApp = currentData.community?.find(a => a.id === app.id);

    if (existingApp) {
        // Show update/delete modal
        showUpdateOrDeleteModal(app, author, version, tags, assets);
        return;
    }

    // Proceed with publishing
    await performPublish(app, author, version, tags, assets);
}

async function isAppPublished(appId) {
    if (!appId) return false;
    try {
        const currentData = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' }) || { community: [] };
        return currentData.community?.some(a => a.id === appId) || false;
    } catch (error) {
        console.error('Error checking if app is published:', error);
        return false;
    }
}

async function isAppBanned(appId) {
    try {
        const currentData = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' }) || { community: [], removed: [] };
        
        // If app is in community, it's not banned
        if (currentData.community?.some(a => a.id === appId)) {
            return false;
        }
        
        // Otherwise, check if it's in removed with isBanned: true
        return currentData.removed?.some(a => a.id === appId && a.isBanned) || false;
    } catch (error) {
        console.error('Error checking if app is banned:', error);
        return false;
    }
}

function updatePublishButton(isPublished, isBanned = false) {
    const publishBtn = document.getElementById('publish-app-btn');
    const alternativeContainer = document.getElementById('alternative-publish-container');
    const alternativeBtn = document.getElementById('alternative-publish-btn');

    if (isBanned) {
        publishBtn.innerHTML = '<span class="material-symbols-outlined">block</span> App Banned';
        publishBtn.title = 'This app has been banned and cannot be published';
        publishBtn.disabled = false;
        publishBtn.style.opacity = '1';
        publishBtn.style.cursor = 'pointer';
        alternativeContainer.style.display = 'none';
    } else if (isPublished) {
        publishBtn.innerHTML = '<span class="material-symbols-outlined">update</span> Update App';
        publishBtn.title = 'Update your app in the community store';
        publishBtn.disabled = false;
        publishBtn.style.opacity = '1';
        publishBtn.style.cursor = 'pointer';
        alternativeContainer.style.display = 'block';
        alternativeBtn.onclick = () => {
            // Show community publish fields for new publishing
            showPublishModal();
            setTimeout(() => {
                showCommunityPublishFields();
            }, 100);
        };
    } else {
        publishBtn.innerHTML = '<span class="material-symbols-outlined">publish</span> Publish App';
        publishBtn.title = 'Publish your app';
        publishBtn.disabled = false;
        publishBtn.style.opacity = '1';
        publishBtn.style.cursor = 'pointer';
        alternativeContainer.style.display = 'none';
    }
}

// Perform the actual publishing
async function performPublish(app, author, version, tags, assets) {
    const confirmBtn = document.getElementById('confirm-community-publish');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Publishing...';
    confirmBtn.disabled = true;

    try {
        const appData = {
            id: app.id,
            name: app.name,
            description: app.description,
            icon: app.icon,
            author: author,
            htmlContent: btoa(app.html),
            assets: assets, // Include the base64 assets
            lightmode: app.lightmode,
            opensource: app.opensource,
            genericstyle: app.genericstyle,
            created: app.created,
            published: new Date().toISOString(),
            version: version,
            downloads: 0,
            rating: 0,
            ratings: [],
            tags: tags,
            featured: false
        };

        console.log('Publishing app data:', appData);

        // Get current apps data
        const currentData = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' }) || { community: [] };
        
        console.log('Current data:', currentData);
        
        // Add new app to community array
        currentData.community = currentData.community || [];
        currentData.community.push(appData);
        
        console.log('Updated data:', currentData);
        
        // Save back
        const result = await FirestoreHandler({ Method: 'set', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps', Data: currentData });
        
        console.log('Save result:', result);
        
        alert('App published to community successfully!');
        hidePublishModal();
        hideCommunityPublishFields();
        
        // Store author for published apps filtering
        localStorage.setItem('appCreatorAuthor', author);
        
        // Update publish button and ban notification badge
        updatePublishButton(true, false);
        updateBanNotificationBadge();
    } catch (error) {
        console.error('Error publishing to community:', error);
        alert('Failed to publish app to community. Please try again.');
    } finally {
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
}

// Show update or delete modal
function showUpdateOrDeleteModal(app, author, version, tags, assets) {
    const modal = document.createElement('div');
    modal.id = 'update-delete-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>App Already Exists</h2>
                <button class="modal-close" id="close-update-delete-modal">&times;</button>
            </div>
            <div class="modal-body">
                <p>An app with ID "${app.id}" already exists in the community store.</p>
                <p>What would you like to do?</p>
                <div class="modal-actions">
                    <button id="update-existing-app" class="btn btn-primary">Update App</button>
                    <button id="delete-existing-app" class="btn btn-secondary">Delete Existing App</button>
                </div>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    <button id="actually-delete-app" style="background: none; border: none; color: #888; text-decoration: underline; cursor: pointer; font-size: 12px;">
                        Actually, I want to delete this app from the app store
                    </button>
                </p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Event listeners
    document.getElementById('close-update-delete-modal').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('update-existing-app').addEventListener('click', async () => {
        modal.remove();
        showVersionUpdateModal(app, author, version, tags, assets);
    });

    document.getElementById('delete-existing-app').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete the existing app from the store?')) {
            modal.remove();
            await performDelete(app.id);
        }
    });

    document.getElementById('actually-delete-app').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this app from the app store?')) {
            modal.remove();
            await performDelete(app.id);
        }
    });
}

// Show version update modal
function showVersionUpdateModal(app, author, currentVersion, tags, assets) {
    const modal = document.createElement('div');
    modal.id = 'version-update-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Update App Version</h2>
                <button class="modal-close" id="close-version-update-modal">&times;</button>
            </div>
            <div class="modal-body">
                <p>Current version: <strong>${currentVersion}</strong></p>
                <div class="form-group">
                    <label for="update-version">New Version:</label>
                    <input type="text" id="update-version" placeholder="e.g., 1.1.0" value="" required>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        Version must be higher than current version (${currentVersion})
                    </small>
                </div>
                <div class="modal-actions">
                    <button id="confirm-version-update" class="btn btn-primary">Update Version</button>
                    <button id="cancel-version-update" class="btn btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';

    // Focus on version input
    document.getElementById('update-version').focus();

    // Event listeners
    document.getElementById('close-version-update-modal').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('cancel-version-update').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('confirm-version-update').addEventListener('click', async () => {
        const newVersion = document.getElementById('update-version').value.trim();

        if (!newVersion) {
            alert('Please enter a version number.');
            return;
        }

        if (!isValidVersion(newVersion)) {
            alert('Please enter a valid version number (e.g., 1.2.3).');
            return;
        }

        if (!isVersionHigher(newVersion, currentVersion)) {
            alert(`New version (${newVersion}) must be higher than current version (${currentVersion}).`);
            return;
        }

        modal.remove();
        await performUpdate(app, author, newVersion, tags, assets);
    });

    // Allow Enter key to submit
    document.getElementById('update-version').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirm-version-update').click();
        }
    });
}

// Version validation helpers
function isValidVersion(version) {
    // Basic semver validation (x.y.z format)
    const semverRegex = /^\d+\.\d+\.\d+$/;
    return semverRegex.test(version);
}

function isVersionHigher(newVersion, currentVersion) {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
        const newPart = newParts[i] || 0;
        const currentPart = currentParts[i] || 0;

        if (newPart > currentPart) {
            return true;
        } else if (newPart < currentPart) {
            return false;
        }
    }

    return false; // Versions are equal
}

// Perform update of existing app
async function performUpdate(app, author, version, tags, assets) {
    try {
        const currentData = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' }) || { community: [] };
        
        const appIndex = currentData.community?.findIndex(a => a.id === app.id);
        if (appIndex !== -1) {
            currentData.community[appIndex] = {
                ...currentData.community[appIndex],
                name: app.name,
                description: app.description,
                icon: app.icon,
                author: author,
                htmlContent: btoa(app.html),
                assets: assets,
                lightmode: app.lightmode,
                opensource: app.opensource,
                genericstyle: app.genericstyle,
                published: new Date().toISOString(),
                version: version,
                tags: tags
            };

            await FirestoreHandler({ Method: 'set', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps', Data: currentData });
            
            alert('App updated successfully!');
            hidePublishModal();
            hideCommunityPublishFields();
        }
    } catch (error) {
        console.error('Error updating app:', error);
        alert('Failed to update app. Please try again.');
    }
}

// Perform delete of existing app
async function performDelete(appId) {
    try {
        const currentData = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' }) || { community: [] };
        
        currentData.community = currentData.community?.filter(a => a.id !== appId) || [];
        
        await FirestoreHandler({ Method: 'set', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps', Data: currentData });
        
        alert('App deleted from store successfully!');
        hidePublishModal();
        hideCommunityPublishFields();
    } catch (error) {
        console.error('Error deleting app:', error);
        alert('Failed to delete app. Please try again.');
    }
}

// Create new app
function createNewApp() {
    const name = document.getElementById('new-app-name').value.trim();
    if (!name) {
        alert('Please enter an app name');
        return;
    }

    generateUniqueAppId().then(uniqueId => {
        currentApp = {
            id: uniqueId,
            name: name,
            description: '',
            icon: '',
            lightmode: false,
            opensource: false,
            genericstyle: true,
            html: getDefaultHTML(),
            assets: {},
            created: new Date().toISOString()
        };

        // Save the new app to localStorage
        const apps = JSON.parse(localStorage.getItem('createdApps') || '[]');
        apps.push(currentApp);
        localStorage.setItem('createdApps', JSON.stringify(apps));

        hideNewAppModal();
        clearForm();
        loadAppForEditing(currentApp);
        updatePublishButton(false); // Reset to "Publish App" for new apps
        showAppNav(name);
        switchSection('properties');
        loadCreatedApps(); // Refresh the app list
    }).catch(error => {
        console.error('Error generating unique ID:', error);
        alert('Failed to create app. Please try again.');
    });
}

// Generate a unique app ID not existing in community store
async function generateUniqueAppId() {
    try {
        const currentData = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' }) || { community: [] };
        const existingIds = new Set(currentData.community?.map(app => app.id) || []);

        let id;
        do {
            id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        } while (existingIds.has(id));

        return id;
    } catch (error) {
        console.error('Error checking existing IDs:', error);
        // Fallback to timestamp-based ID
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}

// Show app navigation
function showAppNav(appName) {
    document.getElementById('app-nav-title').textContent = appName;
    document.getElementById('app-nav-section').classList.add('active');
}

function hideAppNav() {
    document.getElementById('app-nav-section').classList.remove('active');
    currentApp = null;
}

// Load created apps
function loadCreatedApps() {
    const apps = JSON.parse(localStorage.getItem('createdApps') || '[]');
    const container = document.getElementById('created-apps-list');
    container.innerHTML = '';

    if (apps.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; padding:40px;">No apps created yet. Click "Create New App" to get started.</p>';
        return;
    }

    apps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <div class="app-card-icon">
                ${app.icon ? `<img src="${app.icon}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">` : '<span class="material-symbols-outlined">apps</span>'}
            </div>
            <div class="app-card-title">${app.name}</div>
            <div class="app-card-description">${app.description || 'No description'}</div>
        `;
        card.addEventListener('click', function() {
            loadAppForEditing(app);
            switchSection('properties');
        });
        container.appendChild(card);
    });
}

// Load banned apps from database (only user's own banned apps)
async function loadBannedApps() {
    const container = document.getElementById('banned-apps-list');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading banned apps...</div>';

    try {
        // Get user's created apps to find their IDs
        const userApps = JSON.parse(localStorage.getItem('createdApps') || '[]');
        const userAppIds = userApps.map(app => app.id);

        const appsData = await FirestoreHandler({
            Method: 'get',
            CollectionName: 'data',
            Document: 'programs_data',
            SubCollection: 'shawnyxx',
            SubDocument: 'apps'
        }) || { removed: [] };

        // Filter banned apps to only show those that belong to the current user and are actually banned (not in community)
        const bannedApps = appsData.removed?.filter(app => app.isBanned && userAppIds.includes(app.id) && !appsData.community?.some(c => c.id === app.id)) || [];

        container.innerHTML = '';

        if (bannedApps.length === 0) {
            container.innerHTML = '<p style="color:#666; text-align:center; padding:40px;">No banned apps found for your published applications.</p>';
            return;
        }

        // Mark these bans as read
        const readBans = JSON.parse(localStorage.getItem('readBans') || '[]');
        const banIds = bannedApps.map(app => app.id);
        const newReadBans = [...new Set([...readBans, ...banIds])];
        localStorage.setItem('readBans', JSON.stringify(newReadBans));

        // Update notification badge
        updateBanNotificationBadge();

        bannedApps.forEach(app => {
            const isLifted = appsData.community?.some(c => c.id === app.id);
            const isPermanent = app.isPermanentBan;
            const card = document.createElement('div');
            card.className = 'banned-app-card' + (isLifted ? ' lifted' : '');
            card.innerHTML = `
                <div class="banned-app-header">
                    <div class="banned-app-info">
                        <h3>${app.name}</h3>
                        <p>ID: ${app.id}</p>
                        <p>${isLifted ? 'Ban Lifted' : isPermanent ? 'Permanently Banned' : 'Banned: ' + new Date(app.removedAt).toLocaleDateString()}</p>
                    </div>
                    ${isLifted ? '<span class="lifted-mark">Lifted</span>' : isPermanent ? '<span class="permanent-mark">Permanent</span>' : `<button class="review-claim-btn" onclick="submitBanReviewForApp('${app.id}')">
                        <span class="material-symbols-outlined">gavel</span>
                        Review Claim
                    </button>`}
                </div>
                <p style="color:#666; margin-top:15px;">${app.adminMessage}</p>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading banned apps:', error);
        container.innerHTML = '<p style="color:#c82333; text-align:center; padding:40px;">Failed to load banned apps.</p>';
    }
}

// Update ban notification badge
async function updateBanNotificationBadge() {
    try {
        // Get user's created apps to find their IDs
        const userApps = JSON.parse(localStorage.getItem('createdApps') || '[]');
        const userAppIds = userApps.map(app => app.id);

        if (userAppIds.length === 0) {
            // No user apps, remove any existing badge
            const existingBadge = document.querySelector('.nav-item[data-section="app-bans"] .notification-badge');
            if (existingBadge) existingBadge.remove();
            return;
        }

        const appsData = await FirestoreHandler({
            Method: 'get',
            CollectionName: 'data',
            Document: 'programs_data',
            SubCollection: 'shawnyxx',
            SubDocument: 'apps'
        }) || { removed: [] };

        // Filter banned apps to only show those that belong to the current user and are still banned
        const bannedApps = appsData.removed?.filter(app => app.isBanned && userAppIds.includes(app.id) && !appsData.community?.some(c => c.id === app.id)) || [];

        // Get read bans
        const readBans = JSON.parse(localStorage.getItem('readBans') || '[]');

        // Count unread bans
        const unreadCount = bannedApps.filter(app => !readBans.includes(app.id)).length;

        // Update or create badge
        const navItem = document.querySelector('.nav-item[data-section="app-bans"]');
        if (!navItem) return;

        let badge = navItem.querySelector('.notification-badge');
        if (unreadCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                navItem.appendChild(badge);
            }
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
            if (badge) badge.remove();
        }
    } catch (error) {
        console.error('Error updating ban notification badge:', error);
    }
}

// Load published apps
async function loadPublishedApps() {
    const container = document.getElementById('published-apps-list');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Loading published apps...
        </div>
    `;

    try {
        const result = await FirestoreHandler({ Method: 'get', CollectionName: 'data', Document: 'programs_data', SubCollection: 'shawnyxx', SubDocument: 'apps' });
        const appsData = result || { community: [] };
        const communityApps = appsData.community || [];
        
        // Get user's created apps to find their IDs
        const userApps = JSON.parse(localStorage.getItem('createdApps') || '[]');
        const userAppIds = userApps.map(app => app.id);
        
        const publishedApps = communityApps.filter(app => userAppIds.includes(app.id));

        renderPublishedApps(publishedApps);
    } catch (error) {
        console.error('Error loading published apps:', error);
        container.innerHTML = `
            <div class="error-message">
                Failed to load published apps. Please try again.
            </div>
        `;
    }
}

function renderPublishedApps(apps) {
    const container = document.getElementById('published-apps-list');

    if (!apps || apps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">publish</span>
                <p>No published apps found.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    apps.forEach(app => {
        const appCard = document.createElement('div');
        appCard.className = 'app-card';

        const iconHtml = app.icon ? `<img src="${app.icon}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">` : '<span class="material-symbols-outlined">apps</span>';

        appCard.innerHTML = `
            <div class="app-card-icon">
                ${iconHtml}
            </div>
            <div class="app-card-title">${app.name || 'Unnamed App'}</div>
            <div class="app-card-description">ID: ${app.id}</div>
            <div style="margin-top: 15px;">
                <button class="btn btn-danger btn-sm" onclick="unpublishApp('${app.id}')">
                    <span class="material-symbols-outlined">unpublished</span>
                    Unpublish
                </button>
            </div>
        `;

        container.appendChild(appCard);
    });
}

async function unpublishApp(appId) {
    if (!confirm('Are you sure you want to unpublish this app? It will be removed from the community store.')) return;

    try {
        const currentData = await FirestoreHandler({
            Method: 'get',
            CollectionName: 'data',
            Document: 'programs_data',
            SubCollection: 'shawnyxx',
            SubDocument: 'apps'
        }) || { community: [] };

        const appIndex = currentData.community?.findIndex(a => a.id === appId);
        if (appIndex === -1) {
            alert('App not found.');
            return;
        }

        currentData.community.splice(appIndex, 1);

        await FirestoreHandler({
            Method: 'set',
            CollectionName: 'data',
            Document: 'programs_data',
            SubCollection: 'shawnyxx',
            SubDocument: 'apps',
            Data: currentData
        });

        loadPublishedApps(); // Refresh
        alert('App unpublished successfully!');
    } catch (error) {
        console.error('Error unpublishing app:', error);
        alert('Failed to unpublish app. Please try again.');
    }
}

// Make function global
window.unpublishApp = unpublishApp;

// Load app for editing
async function loadAppForEditing(app) {
    currentApp = app;
    document.getElementById('app-name-input').value = app.name;
    document.getElementById('app-description-input').value = app.description;
    if (app.icon) {
        document.getElementById('icon-preview').innerHTML = `<img src="${app.icon}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;">`;
    } else {
        document.getElementById('icon-preview').innerHTML = '<span class="material-symbols-outlined">apps</span>';
    }
    document.getElementById('app-lightmode-toggle').checked = app.lightmode;
    document.getElementById('app-opensource-toggle').checked = app.opensource;
    document.getElementById('app-generic-style-toggle').checked = app.genericstyle;
    if (monacoEditor) {
        monacoEditor.setValue(app.html);
    } else {
        document.getElementById('fallback-editor').value = app.html;
    }
    currentApp.assets = app.assets || {};
    showAppNav(app.name);

    // Check if app is published and update UI
    const isPublished = await isAppPublished(app.id);
    const isBanned = await isAppBanned(app.id);
    updatePublishButton(isPublished, isBanned);
}

// Load assets
function loadAssets() {
    const container = document.getElementById('assets-list');
    container.innerHTML = '';
    if (!currentApp || !currentApp.assets || Object.keys(currentApp.assets).length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; padding:40px;">No assets added yet.</p>';
        return;
    }
    Object.entries(currentApp.assets).forEach(([id, data]) => {
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <img src="${data}" alt="${id}">
            <div>${id}</div>
            <button onclick="viewAsset('${id}')">View</button>
            <button onclick="deleteAsset('${id}')">Delete</button>
            <input type="file" accept="image/*" onchange="replaceAsset('${id}', this)">
        `;
        container.appendChild(card);
    });
}

// Asset management functions
window.viewAsset = function(id) {
    const data = currentApp.assets[id];
    if (data) window.open(data);
};

window.deleteAsset = function(id) {
    if (confirm('Delete this asset?')) {
        delete currentApp.assets[id];
        saveApp();
        loadAssets();
    }
};

window.replaceAsset = function(id, input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentApp.assets[id] = e.target.result;
            saveApp();
            loadAssets();
        };
        reader.readAsDataURL(file);
    }
};