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
                                    icon: ipObj.isKnown ? greenDotIcon : yellowDotIcon
                                }).addTo(netstatMap);

                                marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol}`);
                                marker.on('mouseover', () => marker.openPopup());
                                marker.on('mouseout', () => marker.closePopup());

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
                                    icon: ipObj.isKnown ? greenDotIcon : yellowDotIcon
                                }).addTo(firewallMap);

                                marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol}`);
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
                        li.textContent = `IP: ${ipObj.ForeignAddress}   ---   Protocol: ${ipObj.Protocol}`;
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
                        li.textContent = `IP: ${ipObj.ForeignAddress}   ---   Protocol: ${ipObj.Protocol} --- Data Size: ${ipObj.DataSize} bytes`;
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
