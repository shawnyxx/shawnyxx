
class Modal {
    constructor(options = {}) {
        this.title = options.title || 'Modal';
        this.content = options.content || '';
        this.id = options.id || this.generateId();
        this.className = options.className || '';
        this.onClose = options.onClose || null;
        this.closeOnOverlayClick = options.closeOnOverlayClick !== false; // default true
        
        this.modalElement = null;
        this.isVisible = false;
        
        this.create();
        this.setupEventListeners();
    }
    
    generateId() {
        return 'modal-' + Math.random().toString(36).substr(2, 9);
    }
    
    create() {
        // Create the modal wrapper
        this.modalElement = document.createElement('div');
        this.modalElement.id = this.id;
        this.modalElement.className = `big-modal ${this.className}`;
        this.modalElement.style.display = 'none';
        
        // Create the modal content structure
        this.modalElement.innerHTML = `
            <div class="big-modal-content">
                <div class="modal-header">
                    <h2>${this.title}</h2>
                    <button class="close-btn" type="button">&times;</button>
                </div>
                <div class="modal-body" style="min-height: max(300px, 75vh); display: flex;">
                    ${this.content}
                </div>
            </div>
        `;
        
        // Append to body
        document.body.appendChild(this.modalElement);
    }
    
    setupEventListeners() {
        // Close button click
        const closeBtn = this.modalElement.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.close());
        
        // Overlay click (if enabled)
        if (this.closeOnOverlayClick) {
            this.modalElement.addEventListener('click', (e) => {
                if (e.target === this.modalElement) {
                    this.close();
                }
            });
        }
        
        // ESC key press
        this.escKeyHandler = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.escKeyHandler);
    }
    
    open() {
        if (this.isVisible) return;
        
        this.modalElement.style.display = 'block';
        this.isVisible = true;
        
        // Add animation class if needed
        requestAnimationFrame(() => {
            this.modalElement.style.opacity = '1';
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        return this;
    }
    
    close() {
        if (!this.isVisible) return;
        
        this.modalElement.style.display = 'none';
        this.isVisible = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Call onClose callback if provided
        if (this.onClose && typeof this.onClose === 'function') {
            this.onClose();
        }
        
        return this;
    }
    
    toggle() {
        return this.isVisible ? this.close() : this.open();
    }
    
    updateContent(newContent) {
        const modalBody = this.modalElement.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = newContent;
        }
        return this;
    }
    
    updateTitle(newTitle) {
        const titleElement = this.modalElement.querySelector('.modal-header h2');
        if (titleElement) {
            titleElement.textContent = newTitle;
        }
        return this;
    }
    
    destroy() {
        if (this.modalElement && this.modalElement.parentNode) {
            // Remove event listeners
            document.removeEventListener('keydown', this.escKeyHandler);
            
            // Restore body scroll if modal was visible
            if (this.isVisible) {
                document.body.style.overflow = '';
            }
            
            // Remove from DOM
            this.modalElement.parentNode.removeChild(this.modalElement);
            this.modalElement = null;
            this.isVisible = false;
        }
        return this;
    }
    
    // Utility methods for common operations
    find(selector) {
        return this.modalElement ? this.modalElement.querySelector(selector) : null;
    }
    
    findAll(selector) {
        return this.modalElement ? this.modalElement.querySelectorAll(selector) : [];
    }
    
    // Static method to close all modals
    static closeAll() {
        const modals = document.querySelectorAll('.big-modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    }
}