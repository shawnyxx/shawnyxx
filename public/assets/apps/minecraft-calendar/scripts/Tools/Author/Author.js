
function saveAuthorName(name) {
    if (!name.trim()) return;

    // Get existing names from localStorage
    const authorStats = JSON.parse(localStorage.getItem('authorStats') || '{}');

    // Increment count for this name
    authorStats[name] = (authorStats[name] || 0) + 1;

    // Save back to localStorage
    localStorage.setItem('authorStats', JSON.stringify(authorStats));
}

function getTopAuthorName() {
    const authorStats = JSON.parse(localStorage.getItem('authorStats') || '{}');

    // Find the name with the highest count
    let topName = '';
    let topCount = 0;

    for (const [name, count] of Object.entries(authorStats)) {
        if (count > topCount) {
            topName = name;
            topCount = count;
        }
    }

    return topName;
}

function applyPreferredAuthorName() {
    const authorInputs = document.querySelectorAll('input[id$="Author"]');
    const preferredName = getTopAuthorName();

    if (preferredName) {
        authorInputs.forEach(input => {
            if (!input.value) {
                input.value = preferredName;
                // Add a subtle highlight effect to show it's auto-filled
                input.style.animation = 'highlight 1s ease-in-out';
                setTimeout(() => {
                    input.style.animation = '';
                }, 1000);
            }
        });
    }
}