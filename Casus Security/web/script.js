document.addEventListener("DOMContentLoaded", function () {
    const netstatMapSection = document.getElementById("netstatMapSection");
    const firewallMapSection = document.getElementById("firewallMapSection");
    const ipListSection = document.getElementById("ipListSection");
    const firewallIpListSection = document.getElementById("firewallIpListSection");

    const netstatMapBtn = document.getElementById("netstatMapBtn");
    const firewallMapBtn = document.getElementById("firewallMapBtn");
    const ipListBtn = document.getElementById("ipListBtn");
    const firewallIpListBtn = document.getElementById("firewallIpListBtn");

    const hamburger = document.getElementById("hamburger");
    const flyoutMenu = document.getElementById("flyoutMenu");
    const content = document.querySelector(".content");

    let netstatMap, firewallMap;
    let netstatMarkers = [];
    let firewallMarkers = [];

    let previousNetstatIPs = new Set();
    let previousFirewallIPs = new Set();
    let firstLoad = true;

    let firstNetstatLoad = true;
    let firstFirewallLoad = true;

    function isSectionVisible(section) {
        return section.style.display !== 'none';
    }

    showSection(netstatMapSection);

    const greenDotIcon = L.divIcon({
        className: 'green-dot',
        html: '<div class="marker-circle" style="background-color: lightgreen; width: 10px; height: 10px; border-radius: 50%;"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -12]
    });

    const yellowDotIcon = L.divIcon({
        className: 'yellow-dot',
        html: '<div class="marker-circle" style="background-color: yellow; width: 10px; height: 10px; border-radius: 50%;"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -12]
    });

    function showSection(sectionToShow) {
        netstatMapSection.style.display = 'none';
        firewallMapSection.style.display = 'none';
        ipListSection.style.display = 'none';
        firewallIpListSection.style.display = 'none';
        sectionToShow.style.display = 'block';
    }

    function initializeMap(mapId) {
        const map = L.map(mapId).setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        return map;
    }

    function toggleModal() {
        const modal = document.getElementById("myModal");
        modal.style.display = modal.style.display === "block" ? "none" : "block";
    }

    function updateModalContent(ipObj, knownApp) {

        const modal = document.getElementById("myModal");

        if (knownApp) {
            const modalContent = document.getElementById("modalContent");
            modalContent.innerHTML = `
            <img class="modal-img" src="known_applications/images/${knownApp.Path}">
            <span class="close">&times;</span>
            ${knownApp ? `<h1><strong>${knownApp.Name} </strong></h1>` : ''}
            <h2><strong>Dit is een bekende applicatie</strong></h2>
            <p><strong>IP-adres:</strong> ${ipObj.ForeignAddress}</p>
            <p><strong>Protocol:</strong> ${ipObj.Protocol}</p>
            <p><strong>Applicatie:</strong> ${ipObj.ApplicationName}</p>
        `;
        } else {
            const modalContent = document.getElementById("modalContent");
            modalContent.innerHTML = `
            <h1><strong>Dit is een onbekende applicatie</strong></h1>
            <span class="close">&times;</span>
            <p><strong>IP-adres:</strong> ${ipObj.ForeignAddress}</p>
            <p><strong>Protocol:</strong> ${ipObj.Protocol}</p>
            <p><strong>Applicatie:</strong> ${ipObj.ApplicationName}</p>
        `;
        }


        // Get the <span> element that closes the modal
        var span = document.getElementsByClassName("close")[0];

        // When the user clicks on <span> (x), close the modal
        span.onclick = function () {
            modal.style.display = "none";
        }

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function (event) {
            if (event.target != modalContent) {
                modal.style.display = "none";
            }
        }
    }

    // Check if the application is known
    async function checkIfKnownApplication(ipObj) {
        try {
            const response = await fetch('known_applications/known_applications.json');
            const knownApplications = await response.json();
            if (Array.isArray(knownApplications)) {
                return knownApplications.find(app => app.NameRaw === ipObj.ApplicationName) || null;
            } else {
                console.error('Expected an array for known applications but got:', knownApplications);
                return null;
            }
        } catch (error) {
            console.error('Error fetching known applications:', error);
            return null;
        }
    }


    function updateNetstatMapMarkers() {
        fetch('iplist.json')
            .then(response => response.json())
            .then(ipList => {
                if (Array.isArray(ipList)) {
                    let currentNetstatIPs = new Set();

                    netstatMarkers.forEach(marker => netstatMap.removeLayer(marker));
                    netstatMarkers = [];

                    setTimeout(() => {
                        ipList.forEach(ipObj => {
                            if (ipObj.State === "ESTABLISHED" && ipObj.Latitude && ipObj.Longitude) {
                                const isKnown = previousNetstatIPs.has(ipObj.ForeignAddress) || firstLoad;
                                const marker = L.marker([ipObj.Latitude, ipObj.Longitude], {
                                    icon: isKnown ? greenDotIcon : yellowDotIcon
                                }).addTo(netstatMap);

                                // Check if the application is known
                                checkIfKnownApplication(ipObj).then(knownApp => {
                                    if (knownApp) {
                                        marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol} - Application: ${ipObj.ApplicationName} - Name: ${knownApp.Name} - Path: ${knownApp.Path}`);
                                    } else {
                                        marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol} - Application: ${ipObj.ApplicationName}`);
                                    }
                                }).catch(error => {
                                    console.error('Error checking known application:', error);
                                    marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol} - Application: ${ipObj.ApplicationName}`);
                                });

                                marker.on('mouseover', () => marker.openPopup());
                                marker.on('mouseout', () => marker.closePopup());
                                marker.on('click', () => {
                                    checkIfKnownApplication(ipObj).then(knownApp => {
                                        updateModalContent(ipObj, knownApp);
                                        toggleModal();
                                    }).catch(error => {
                                        console.error('Error checking known application:', error);
                                        updateModalContent(ipObj, null);
                                        toggleModal();
                                    });
                                });

                                netstatMarkers.push(marker);
                                currentNetstatIPs.add(ipObj.ForeignAddress);
                            }
                        });

                        if (ipList.length === 0 && firstNetstatLoad && isSectionVisible(netstatMapSection)) {
                            alert('No Netstat data was found.');
                        }

                        firstNetstatLoad = false;

                        previousNetstatIPs = currentNetstatIPs;
                        firstLoad = false; // After first load, new IPs will be tracked
                        updateNetstatIpList(ipList);

                    }, 100);
                } else {
                    console.error('Expected an array for Netstat IP list but got:', ipList);
                }
            })
            .catch(error => console.error('Error fetching Netstat IP list:', error));
    }

    function updateFirewallMapMarkers() {
        fetch('iplistfirewall.json')
            .then(response => response.json())
            .then(firewallIpList => {
                if (Array.isArray(firewallIpList)) {
                    let currentFirewallIPs = new Set();

                    firewallMarkers.forEach(marker => firewallMap.removeLayer(marker));
                    firewallMarkers = [];

                    setTimeout(() => {
                        firewallIpList.forEach(ipObj => {
                            if (ipObj.State === "ALLOW" && ipObj.Latitude && ipObj.Longitude) {
                                const isKnown = previousFirewallIPs.has(ipObj.ForeignAddress) || firstLoad;
                                const marker = L.marker([ipObj.Latitude, ipObj.Longitude], {
                                    icon: isKnown ? greenDotIcon : yellowDotIcon
                                }).addTo(firewallMap);

                                marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol} - Application: ${ipObj.ApplicationName}`);
                                marker.on('mouseover', () => marker.openPopup());
                                marker.on('mouseout', () => marker.closePopup());

                                firewallMarkers.push(marker);
                                currentFirewallIPs.add(ipObj.ForeignAddress);
                            }
                        });

                        if (firewallIpList.length === 0 && firstFirewallLoad && isSectionVisible(firewallMapSection)) {
                            alert('No Firewall data was found.');
                        }

                        firstFirewallLoad = false;

                        previousFirewallIPs = currentFirewallIPs;
                        firstLoad = false;
                        updateFirewallIpList(firewallIpList);

                    }, 100);
                } else {
                    console.error('Expected an array for Firewall IP list but got:', firewallIpList);
                }
            })
            .catch(error => console.error('Error fetching Firewall IP list:', error));
    }

    function updateNetstatIpList(ipList) {
        const ipListContainer = document.getElementById("ipList");
        ipListContainer.innerHTML = ''; // Clear the list first

        setTimeout(() => {
            if (Array.isArray(ipList)) {
                ipList.forEach(ipObj => {
                    if (ipObj && ipObj.ForeignAddress && ipObj.State && ipObj.Protocol) {
                        const li = document.createElement('li');
                        li.textContent = `IP: ${ipObj.ForeignAddress}   ---   Protocol: ${ipObj.Protocol} - Application: ${ipObj.ApplicationName}`;
                        ipListContainer.appendChild(li);
                    }
                });
            } else {
                console.error('Expected an array for Netstat IP list but got:', ipList);
            }
        }, 100); // 100ms delay before updating
    }

    function updateFirewallIpList(firewallIpList) {
        const ipListContainer = document.getElementById("ipListFirewall");
        ipListContainer.innerHTML = ''; // Clear the list first

        setTimeout(() => {
            if (Array.isArray(firewallIpList)) {
                firewallIpList.forEach(ipObj => {
                    if (ipObj && ipObj.ForeignAddress && ipObj.State && ipObj.Protocol) {
                        const li = document.createElement('li');
                        li.textContent = `IP: ${ipObj.ForeignAddress}   --- Protocol: ${ipObj.Protocol} - Application: ${ipObj.ApplicationName}`;
                        ipListContainer.appendChild(li);
                    }
                });
            } else {
                console.error('Expected an array for Firewall IP list but got:', firewallIpList);
            }
        }, 100); // 100ms delay before updating
    }


    // Handle button clicks
    netstatMapBtn.addEventListener("click", function () {
        showSection(netstatMapSection);
        hideFlyoutMenu();

        if (!netstatMap) {
            netstatMap = initializeMap('netstatmap');
            updateNetstatMapMarkers();
        } else {
            netstatMap.invalidateSize();
        }
    });

    firewallMapBtn.addEventListener("click", function () {
        showSection(firewallMapSection);
        hideFlyoutMenu();

        if (!firewallMap) {
            firewallMap = initializeMap('firewallmap');
            updateFirewallMapMarkers();
        } else {
            firewallMap.invalidateSize();
        }
    });

    ipListBtn.addEventListener("click", function () {
        showSection(ipListSection);
        hideFlyoutMenu();
    });

    firewallIpListBtn.addEventListener("click", function () {
        showSection(firewallIpListSection);
        hideFlyoutMenu();
    });

    // Flyout menu functionality
    hamburger.addEventListener("click", function () {
        flyoutMenu.classList.toggle("open");
        content.classList.toggle("open");
        hamburger.classList.toggle("open");
        hamburger.classList.toggle("closed");
    });

    function hideFlyoutMenu() {
        flyoutMenu.classList.remove("open");
        content.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.classList.add("closed");
    }

    netstatMap = initializeMap('netstatmap');
    firewallMap = initializeMap('firewallmap');

    updateNetstatMapMarkers();
    updateFirewallMapMarkers();

    setInterval(() => {
        updateNetstatMapMarkers();
        updateFirewallMapMarkers();
    }, 8000);
});
