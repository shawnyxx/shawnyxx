import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Include additional HTML entry so Vite builds the App Store page and resolves /src imports
  build: {
    rollupOptions: {
      input: {
        // keep default index.html implicitly, add an entry for the app-store HTML placed in src
        'assets/apps/app-store/index.html': resolve(__dirname, 'src/pages/assets/apps/app-store/index.html'),
        'src/apps/app-creator/index.html': resolve(__dirname, 'src/apps/app-creator/index.html')
      }
    }
  }
});
