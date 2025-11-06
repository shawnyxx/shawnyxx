function getUserIdentifier() {
    // Simple implementation - in a real app you'd use a more robust fingerprinting
    const nav = window.navigator;
    const screen = window.screen;
    const fingerprint =
        nav.userAgent +
        nav.language +
        screen.colorDepth +
        screen.width +
        screen.height +
        screen.availWidth +
        screen.availHeight;

    // Generate a hash of the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return 'user_' + Math.abs(hash).toString(16);
}

document.addEventListener('DOMContentLoaded', function () {
    // Handle input animations
    const recapsInputs = document.querySelectorAll('.recaps-modal input, .recaps-modal textarea, .recaps-modal select');

    recapsInputs.forEach(input => {
        // Initial check for pre-filled inputs
        if (input.value.trim() !== '') {
            input.classList.add('has-value');
        }

        // Add focus and blur event listeners
        input.addEventListener('focus', function () {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function () {
            this.parentElement.classList.remove('focused');
            if (this.value.trim() !== '') {
                this.classList.add('has-value');
            } else {
                this.classList.remove('has-value');
            }
        });

        // Handle input changes
        input.addEventListener('input', function () {
            if (this.value.trim() !== '') {
                this.classList.add('has-value');
            } else {
                this.classList.remove('has-value');
            }
        });
    });

    // Enhance the image preview functionality
    function setupImagePreviewEffects() {
        const imagePreviewContainers = document.querySelectorAll('.image-preview');

        imagePreviewContainers.forEach(container => {
            if (container.querySelector('img')) {
                container.style.display = 'block';

                // Add a remove button to the preview
                if (!container.querySelector('.remove-image')) {
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-image';
                    removeBtn.innerHTML = '×';
                    removeBtn.title = 'Remove image';

                    removeBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const previewId = container.id;
                        const inputId = previewId.replace('Preview', '');
                        document.getElementById(inputId).value = '';
                        container.innerHTML = '';
                        container.style.display = 'none';
                    });

                    container.appendChild(removeBtn);
                }
            }
        });
    }

    // Override the existing Image.previewImage function
    window.Image.previewImage = function (inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);

        if (input.files && input.files[0]) {
            const reader = new FileReader();

            reader.onload = function (e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.style.display = 'block';
                setupImagePreviewEffects();
            };

            reader.readAsDataURL(input.files[0]);
        }
    };

    // Call once on load to handle any existing previews
    setupImagePreviewEffects();

    // Apply preferred author name to all inputs
    applyPreferredAuthorName();

    // Set up event listeners for all modal openings to apply author name
    document.querySelectorAll('.service-card, .city-services-btn').forEach(element => {
        element.addEventListener('click', function () {
            // Small delay to ensure the modal is rendered
            setTimeout(applyPreferredAuthorName, 100);
        });
    });

    // Setup the event listeners on all author inputs to save names
    document.querySelectorAll('input[id$="Author"]').forEach(input => {
        input.addEventListener('change', function () {
            if (this.value.trim()) {
                saveAuthorName(this.value.trim());
            }
        });
    });
});