document.addEventListener("DOMContentLoaded", function () {
    const mapSection = document.getElementById("mapSection");
    const ipListSection = document.getElementById("ipListSection");
    const optionsSection = document.getElementById("optionsSection");

    const mapBtn = document.getElementById("mapBtn");
    const ipListBtn = document.getElementById("ipListBtn");
    const optionsBtn = document.getElementById("optionsBtn");

    const hamburger = document.getElementById("hamburger");
    const flyoutMenu = document.getElementById("flyoutMenu");
    const content = document.querySelector(".content");

    function showSection(sectionToShow) {
        mapSection.style.display = 'none';
        ipListSection.style.display = 'none';
        optionsSection.style.display = 'none';
        sectionToShow.style.display = 'block';
    }

    showSection(mapSection);

    mapBtn.addEventListener("click", function () {
        showSection(mapSection);
        hideFlyoutMenu();
    });
    ipListBtn.addEventListener("click", function () {
        showSection(ipListSection);
        hideFlyoutMenu();
    });
    optionsBtn.addEventListener("click", function () {
        showSection(optionsSection);
        hideFlyoutMenu();
    });

    hamburger.addEventListener("click", function () {
        flyoutMenu.classList.toggle("open");
        content.classList.toggle("open");
        hamburger.classList.toggle("open");
        if (hamburger.classList.contains("open")) {
            hamburger.classList.remove("closed");
            hamburger.classList.add("open");
        } else {
            hamburger.classList.remove("open");
            hamburger.classList.add("closed");
        }
    });

    function hideFlyoutMenu() {
        flyoutMenu.classList.remove("open");
        content.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.classList.add("closed");
    }

    const map = L.map('map').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const coolIcon = L.divIcon({
        className: 'cool-marker',
        html: '<div class="marker-circle"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });

    const marker = L.marker([51.5, -0.09], { icon: coolIcon }).addTo(map);

    marker.on('mouseover', function () {
        marker.bindPopup('192.168.1.1').openPopup();
    });

    marker.on('mouseout', function () {
        marker.closePopup();
    });

    const zoomLevelInput = document.getElementById('zoomLevel');
    zoomLevelInput.addEventListener('input', function () {
        map.setZoom(parseInt(zoomLevelInput.value, 10));
    });
});
