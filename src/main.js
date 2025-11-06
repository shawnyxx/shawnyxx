// Entry for Vite (ES module)
import './tailwind.css';

// Option: dynamically load legacy non-module script if you prefer to keep it as-is
// This will keep existing behavior without converting script.js to modules.
// Load legacy non-module script (now located in src) by importing it so it runs
import './script.js';

// Import Firebase module (it will read config from import.meta.env)
// Import Firebase module from src (it will read config from import.meta.env)
import './scripts/Firebase.js';

// Import the ServiceWorker registration helper which registers the actual
// runtime service worker at /sw.js. We import it so Vite bundles the
// registration code into the app bundle instead of trying to register the
// registration script itself as a worker (which caused the browser to fetch
// an HTML fallback and produce the MIME type error).
// import './scripts/ServiceWorker.js';
