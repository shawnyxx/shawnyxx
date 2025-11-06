
class Animation {
    constructor(method) {
        if (typeof this.method === 'function') {
            this.method();
        }
    }

    Shake() {
        const shakeStyle = document.createElement('style');
        shakeStyle.textContent = /*css*/`
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(shakeStyle);
    }

    Highlight() {
        const highlightStyle = document.createElement('style');
        highlightStyle.textContent = /*css*/`
            @keyframes highlight {
                0%, 100% { background-color: transparent; }
                50% { background-color: rgba(214, 158, 46, 0.2); }
            }
        `;
        document.head.appendChild(highlightStyle);
    }
}