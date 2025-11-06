
class Data {
    static defaultData = { events: {}, notes: [], tasks: [], pinboard: [], diddle: [], recapsPages: [] };

    static ensureClient() {
        if (!Data._client) {
            if (typeof Appwrite === 'undefined') {
                console.error('Appwrite SDK not found. Include the Appwrite JS SDK before Data.js');
                return null;
            }
            const { Client, Databases } = Appwrite;
            Data._client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
            Data.databases = new Databases(Data._client);
        }
        return Data._client;
    }

    // Load all collections (or one section) and return unified shape
    static async loadData(section = null) {
        Data.ensureClient();
        const keys = section ? [section] : Object.keys(Data.defaultData);
        const result = { ...Data.defaultData };

        // Show section loader if provided
        if (section) {
            const loadingIndicator = document.getElementById(`${section}LoadingIndicator`);
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
        }

        const { Permission, Role } = Appwrite;
        for (const key of keys) {
            const collectionId = APPWRITE_COLLECTION_IDS[key];
            if (!collectionId) { console.warn(`Missing collection ID for key ${key}`); continue; }
            try {
                const doc = await Data.databases.getDocument(APPWRITE_DATABASE_ID, collectionId, key); // doc id == key
                // Expect data stored in field 'value' OR directly fields (support both)
                if (doc.value !== undefined) {
                    result[key] = doc.value;
                } else {
                    // Fallback: remove Appwrite system fields
                    const cloned = { ...doc };
                    delete cloned.$id; delete cloned.$createdAt; delete cloned.$updatedAt; delete cloned.$databaseId; delete cloned.$collectionId; delete cloned.$permissions;
                    result[key] = cloned[key] !== undefined ? cloned[key] : cloned; // try field or entire object
                }
            } catch (err) {
                if (err?.code === 404) {
                    // create empty document for this key
                    const initial = result[key];
                    try {
                        await Data.databases.createDocument(
                            APPWRITE_DATABASE_ID,
                            collectionId,
                            key,
                            { value: initial },
                            [
                                Permission.create(Role.any()),
                                Permission.read(Role.any()),
                                Permission.update(Role.any()),
                                Permission.delete(Role.any())
                            ]
                        );
                    } catch (createErr) {
                        console.error(`Failed to create initial document for ${key}`, createErr);
                    }
                } else {
                    console.error(`Error fetching ${key}`, err);
                }
            }
        }

        if (section) {
            const loadingIndicator = document.getElementById(`${section}LoadingIndicator`);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }

        localStorage.setItem('calendarData', JSON.stringify(result));
        return result;
    }

    static async saveData(data, section = null) {
        return Data.saveDataWithRetry(data, section);
    }

    static async saveDataWithRetry(data, section = null, retryCount = 0, maxRetries = 5) {
        Data.ensureClient();
        if (retryCount === 0) {
            showToast('Publishing your content...', 'info');
        }
        const { Permission, Role } = Appwrite;
        const keys = section ? [section] : Object.keys(Data.defaultData);

        try {
            for (const key of keys) {
                const collectionId = APPWRITE_COLLECTION_IDS[key];
                if (!collectionId) continue;
                const payloadValue = data[key];
                try {
                    await Data.databases.updateDocument(
                        APPWRITE_DATABASE_ID,
                        collectionId,
                        key,
                        { value: payloadValue }
                    );
                } catch (updateErr) {
                    if (updateErr?.code === 404) {
                        await Data.databases.createDocument(
                            APPWRITE_DATABASE_ID,
                            collectionId,
                            key,
                            { value: payloadValue },
                            [
                                Permission.create(Role.any()),
                                Permission.read(Role.any()),
                                Permission.update(Role.any()),
                                Permission.delete(Role.any())
                            ]
                        );
                    } else {
                        throw updateErr;
                    }
                }
            }
            localStorage.setItem('calendarData', JSON.stringify(data));
            showToast('Your content has been published successfully!', 'success');
            return true;
        } catch (error) {
            const status = error?.code || error?.response?.status;
            if ((status === 429 || (status >= 500 && status < 600) || !status) && retryCount < maxRetries) {
                console.warn(`Save transient error (status ${status || 'network'}). Retrying in 3s... (Attempt ${retryCount + 1}/${maxRetries})`);
                showToast(`Publishing retry ${retryCount + 1}/${maxRetries}... Please wait.`, 'warning');
                await new Promise(r => setTimeout(r, 3000));
                return Data.saveDataWithRetry(data, section, retryCount + 1, maxRetries);
            }
            console.error('Failed to save data to Appwrite:', error);
            localStorage.setItem('calendarData', JSON.stringify(data));
            showToast('Failed to save to server. Your changes are saved locally.', 'error');
            return false;
        }
    }
}

// (Optional) Existing Database helper removed / folded into Data class for simplicity.