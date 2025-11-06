class CityServices {
    static modal = CityServices.modal = new Modal({
        title: "City Services",
        content: /*html*/`
            <div id="cityServicesModal" class="modal-body w-full h-fit text-white">
                <div class="services-grid">
                    <div class="service-card" onclick="SharedNotes.Open(); CityServices.Close();">
                        <span class="service-icon">📝</span>
                        <h3 class="service-title">Shared Notes</h3>
                        <p class="service-description">Keep track of important information and share notes with your team</p>
                    </div>
                    <div class="service-card" onclick="Tasks.Open(); CityServices.Close();">
                        <span class="service-icon">📋</span>
                        <h3 class="service-title">Team Tasks</h3>
                        <p class="service-description">Organize and manage tasks for your Minecraft projects</p>
                    </div>
                    <div class="service-card" onclick="Pinboard.Open(); CityServices.Close();">
                        <span class="service-icon">📌</span>
                        <h3 class="service-title">Village Pinboard</h3>
                        <p class="service-description">Post announcements and messages for your community</p>
                    </div>
                    <div class="service-card" onclick="Diddle.Open(); CityServices.Close();">
                        <span class="service-icon">📖</span>
                        <h3 class="service-title">The Diddle</h3>
                        <p class="service-description">A community book where everyone can write and share stories</p>
                    </div>
                    <div class="service-card" onclick="Recaps.Open(); CityServices.Close();">
                        <span class="service-icon">📸</span>
                        <h3 class="service-title">Recaps</h3>
                        <p class="service-description">Create dedicated pages to share posts, stories, and events with your community</p>
                    </div>
                </div>
            </div>
        `
    });

    static Open() {
        CityServices.modal.open();
    }

    static Close() {
        CityServices.modal.close();
    }
}