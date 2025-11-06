window.addEventListener('load', function () {
    setTimeout(hideLoadingScreen, 5000);
});

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContainer = document.getElementById('mainContainer');

    loadingScreen.style.animation = 'slideOutUp 0.5s ease-out forwards';

    setTimeout(() => {
        loadingScreen.style.display = 'none';
        mainContainer.style.display = 'block';
    }, 500);
}