
class Notification {
    // Simple toast notification function
    static showToast(message, type = 'info') {
        // Create toast element if it doesn't exist
        let toast = document.getElementById('toastNotification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toastNotification';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }

        // Set type class
        toast.className = 'toast';
        toast.classList.add(`toast-${type}`);

        // Set message
        toast.textContent = message;

        // If it's a publishing notification, add a spinner
        if (message.includes('Publishing')) {
            const spinnerDiv = document.createElement('div');
            spinnerDiv.className = 'toast-spinner';
            toast.prepend(spinnerDiv);
        }

        // Show toast
        toast.classList.add('show');

        // Hide after 3 seconds for success/error, keep visible for info/warning during publishing
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        } else {
            // For publishing notifications, keep them visible longer
            setTimeout(() => {
                if (!toast.textContent.includes('retry')) {
                    toast.classList.remove('show');
                }
            }, 5000);
        }
    }
}