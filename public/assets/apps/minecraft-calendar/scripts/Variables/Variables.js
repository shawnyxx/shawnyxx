
// Calendar variables
let currentDateKey = '';
let currentEventIndex = -1;
let isEditingEvent = false;
let currentMonth = null;
let currentYear = null;
let originalDaysPlayed = null;

// Backend (Appwrite) configuration
// Make sure to inject secure / production values via environment or a build step.
// These defaults are placeholders; replace with your real IDs.
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '68a3af19002137ed04b4';
const APPWRITE_DATABASE_ID = '68a3b0e200000fe5a9ae';
// Collection IDs (replace with real IDs from your Appwrite project)
const APPWRITE_COLLECTION_IDS = {
	events: '68a3b124002236c9beaa',
	notes: '68a3b13600227c65faa0',
	tasks: '68a3b13f000998cd5b51', // user listed 'task'
	pinboard: '68a3b15a0024a40337ad',
	diddle: '68a3b168002609cfb740',
	recapsPages: '68a3b17c001d38641b36' // user listed 'recaps'
};

// Each collection stores a single document whose ID matches the key (events, notes, tasks, etc.).
let editingPinboardIndex = -1;

// Recaps variables
let currentPageId = null;
let currentCommentType = null; // 'post' or 'event'
let currentCommentId = null;

// Notes variables
let editingNoteIndex = -1;
let editingTaskIndex = -1;

// Diddle variables
let currentPage = 0;
let editingDiddleIndex = -1;