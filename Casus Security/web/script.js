document.addEventListener("DOMContentLoaded", function () {
    const mapSection = document.getElementById("mapSection");
    const ipListSection = document.getElementById("ipListSection");

    const mapBtn = document.getElementById("mapBtn");
    const ipListBtn = document.getElementById("ipListBtn");

    const hamburger = document.getElementById("hamburger");
    const flyoutMenu = document.getElementById("flyoutMenu");
    const content = document.querySelector(".content");

    function showSection(sectionToShow) {
        mapSection.style.display = 'none';
        ipListSection.style.display = 'none';
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

    const lightGreenIcon = L.divIcon({
        className: 'lightgreen-marker',
        html: '<div class="marker-circle" style="background-color: lightgreen;"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });

    let allMarkers = [];
    let currentIps = [];

    function updateMarkers() {
        fetch('iplist.json')
            .then(response => response.json())
            .then(ipList => {
                currentIps = ipList;
                updateIpList(ipList);

                allMarkers.forEach(marker => map.removeLayer(marker));
                allMarkers = [];

                ipList.forEach(ipObj => {
                    if (ipObj.State === "ESTABLISHED") {
                        const ipAddress = ipObj.ForeignAddress;

                        let marker = L.marker([ipObj.Latitude, ipObj.Longitude], { icon: lightGreenIcon }).addTo(map);

                        marker.bindPopup(`IP: ${ipObj.ForeignAddress}`);

                        marker.on('mouseover', function () {
                            marker.openPopup();
                        });

                        marker.on('mouseout', function () {
                            marker.closePopup();
                        });

                        allMarkers.push(marker);
                    }
                });
            })
            .catch(error => console.error('Error loading IPs:', error));
    }

    function updateIpList(ipList) {
        const ipListContainer = document.getElementById("ipList");

        ipListContainer.innerHTML = '';

        ipList.forEach(ipObj => {
            const li = document.createElement('li');
            li.textContent = `IP: ${ipObj.ForeignAddress} - State: ${ipObj.State} - Protocol: ${ipObj.Protocol}`;
            ipListContainer.appendChild(li);
        });
    }

    setInterval(updateMarkers, 2000);

    updateMarkers();
});
