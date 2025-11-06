
class Image {
    static compressImage(base64String, maxSizeInMB = 1) {
        return new Promise((resolve) => {
            const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
            // Calculate current size of the base64 string
            const currentSizeInBytes = Math.ceil((base64String.length * 3) / 4);

            // If already under the limit, return the original image
            if (currentSizeInBytes <= maxSizeInBytes) {
                resolve(base64String);
                return;
            }

            // Create an image element to draw to canvas
            const img = new Image();
            img.onload = function () {
                // Calculate compression ratio needed
                const compressionRatio = Math.sqrt(maxSizeInBytes / currentSizeInBytes);

                // Calculate new dimensions while maintaining aspect ratio
                let newWidth = img.width * compressionRatio;
                let newHeight = img.height * compressionRatio;

                // Ensure minimum dimensions
                if (newWidth < 200) {
                    const scale = 200 / newWidth;
                    newWidth = 200;
                    newHeight *= scale;
                }
                if (newHeight < 200) {
                    const scale = 200 / newHeight;
                    newHeight = 200;
                    newWidth *= scale;
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;
                const ctx = canvas.getContext('2d');

                // Use better quality image rendering
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw image and get compressed data URL
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Start with high quality and decrease if needed
                let quality = 0.9;
                let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                let compressedSize = Math.ceil((compressedBase64.length * 3) / 4);

                // If still too big, reduce quality until it fits
                while (compressedSize > maxSizeInBytes && quality > 0.1) {
                    quality -= 0.1;
                    compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    compressedSize = Math.ceil((compressedBase64.length * 3) / 4);
                }

                console.log(`Image compressed from ${(currentSizeInBytes / 1024 / 1024).toFixed(2)}MB to ${(compressedSize / 1024 / 1024).toFixed(2)}MB with quality ${quality.toFixed(1)}`);

                // Return compressed image
                resolve(compressedBase64);
            };

            // Handle error case
            img.onerror = function () {
                console.error('Error loading image for compression');
                resolve(base64String); // Return original if compression fails
            };

            // Set source and trigger loading
            img.src = base64String;
        });
    }

    static previewImage(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);

        if (input.files && input.files[0]) {
            const reader = new FileReader();

            reader.onload = function (e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.style.display = 'block';
            };

            reader.readAsDataURL(input.files[0]);
        }
    }
}