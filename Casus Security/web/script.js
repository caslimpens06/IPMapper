document.addEventListener("DOMContentLoaded", function () {
    const netstatMapSection = document.getElementById("netstatMapSection");
    const firewallMapSection = document.getElementById("firewallMapSection");
    const ipListSection = document.getElementById("ipListSection");
    const firewallIpListSection = document.getElementById("firewallIpListSection");
    const sshMapSection = document.getElementById("sshMapSection");
   
    const netstatMapBtn = document.getElementById("netstatMapBtn");
    const firewallMapBtn = document.getElementById("firewallMapBtn");
    const ipListBtn = document.getElementById("ipListBtn");
    const firewallIpListBtn = document.getElementById("firewallIpListBtn");
    const sshMapBtn = document.getElementById("sshMapBtn");

    const hamburger = document.getElementById("hamburger");
    const flyoutMenu = document.getElementById("flyoutMenu");
    const content = document.querySelector(".content");

    let netstatMap, firewallMap, sshMap
    let netstatMarkers = [];
    let firewallMarkers = [];
    let sshmapMarkers = [];
    let blacklistedMarkers = [];

    let previousNetstatIPs = new Set();
    let previousFirewallIPs = new Set();
    let firstLoad = true;

    let firstNetstatLoad = true;
    let firstFirewallLoad = true;

    let animatedLines = {};

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

    const redDotIcon = L.divIcon({
        className: 'red-dot flashing',
        html: `<div class="beam-flash"></div><div class="marker-core"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -12]
    });

    function showSection(sectionToShow) {
        netstatMapSection.style.display = 'none';
        firewallMapSection.style.display = 'none';
        ipListSection.style.display = 'none';
        firewallIpListSection.style.display = 'none';
        sshMapSection.style.display = 'none';
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
        const modalContent = document.getElementById("modalContent");

        if (knownApp) {
            modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h1><strong>${knownApp.Name}</strong></h1>
            <h2><strong>Dit is een bekende applicatie</strong></h2>
            <p><strong>IP-adres:</strong> ${ipObj.ForeignAddress}</p>
            <p><strong>Protocol:</strong> ${ipObj.Protocol}</p>
            <p><strong>Applicatie:</strong> ${ipObj.ApplicationName}</p>
        `;
        } else if (knownApp === null) {
            modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h1><strong></strong>Dit is een onbekende applicatie</h1>
            <p><strong>IP-adres:</strong> ${ipObj.ForeignAddress}</p>
            <p><strong>Protocol:</strong> ${ipObj.Protocol}</p>
        `;
        } else {
            modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h1><strong>Dit IP-adres komt uit de firewall</strong></h1>
            <p><strong>IP-adres:</strong> ${ipObj.ForeignAddress}</p>
            <p><strong>Protocol:</strong> ${ipObj.Protocol}</p>
            <p><strong>Hits:</strong> ${ipObj.HitCount}</p>
        `;
        }

        var span = document.getElementsByClassName("close")[0];
        span.onclick = function () {
            modal.style.display = "none";
        };

        window.onclick = function (event) {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        };
    }

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

                    
                        ipList.forEach(ipObj => {
                            if (ipObj.State === "ESTABLISHED" && ipObj.Latitude && ipObj.Longitude) {
                                const isNewYellow = !previousNetstatIPs.has(ipObj.ForeignAddress) && !ipObj.IsMalicious && !firstLoad;
                                let icon;
                                if (ipObj.IsMalicious) {
                                    icon = redDotIcon;
                                } else {  
                                    const isKnown = previousNetstatIPs.has(ipObj.ForeignAddress) || firstLoad;
                                    icon = isKnown ? greenDotIcon : yellowDotIcon;
                                }
                                const marker = L.marker([ipObj.Latitude, ipObj.Longitude], {
                                    icon: icon
                                }).addTo(netstatMap);

                                checkIfKnownApplication(ipObj).then(knownApp => {
                                    if (knownApp) {
                                        marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol} - Application: ${ipObj.ApplicationName}`);
                                    } else {
                                        marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol}`);
                                    }
                                }).catch(error => {
                                    console.error('Error checking known application:', error);
                                    marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol}`);
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
                                if (isNewYellow) {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(function (position) {
                                            const myLat = position.coords.latitude;
                                            const myLon = position.coords.longitude;

                                            const line = animateLine([myLat, myLon], [ipObj.Latitude, ipObj.Longitude], netstatMap);
                                            animatedLines[ipObj.ForeignAddress] = line;
                                        });
                                    }
                                } else {
                                    if (animatedLines[ipObj.ForeignAddress]) {
                                        netstatMap.removeLayer(animatedLines[ipObj.ForeignAddress]);
                                        delete animatedLines[ipObj.ForeignAddress];
                                    }
                                }

                                currentNetstatIPs.add(ipObj.ForeignAddress);
                            }
                        });

                        firstNetstatLoad = false;

                        previousNetstatIPs = currentNetstatIPs;
                        firstLoad = false;
                        updateNetstatIpList(ipList);

                        for (let ip in animatedLines) {
                            if (previousNetstatIPs.has(ip)) {
                                netstatMap.removeLayer(animatedLines[ip]);
                                delete animatedLines[ip];
                            }
                        }

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

                    {
                        firewallIpList.forEach(ipObj => {
                            if (ipObj.State === "ALLOW" && ipObj.Latitude && ipObj.Longitude) {
                                let icon;
                                let isNewYellow = false;

                                const isKnown = previousFirewallIPs.has(ipObj.ForeignAddress) || firstLoad;
                                if (!isKnown && !ipObj.IsMalicious) {
                                    icon = yellowDotIcon;
                                    isNewYellow = true;
                                }
                                else if (ipObj.IsMalicious) {
                                    icon = redDotIcon;
                                }
                                else {
                                    icon = isKnown ? greenDotIcon : redDotIcon;
                                }

                                const marker = L.marker([ipObj.Latitude, ipObj.Longitude], {
                                    icon: icon
                                }).addTo(firewallMap);

                                marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol}`);
                                marker.on('mouseover', () => marker.openPopup());
                                marker.on('mouseout', () => marker.closePopup());
                                marker.on('click', () => {
                                    updateModalContent(ipObj, false);
                                    toggleModal();
                                });

                                firewallMarkers.push(marker);
                                currentFirewallIPs.add(ipObj.ForeignAddress);

                                if (isNewYellow && navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition(function (position) {
                                        const myLat = position.coords.latitude;
                                        const myLon = position.coords.longitude;

                                        const line = animateLine([myLat, myLon], [ipObj.Latitude, ipObj.Longitude], firewallMap);
                                        animatedLines[ipObj.ForeignAddress] = line;
                                    });
                                }
                            }
                        });

                        if (firewallIpList.length === 0 && firstFirewallLoad && isSectionVisible(firewallMapSection)) {
                            alert('No Firewall data was found.');
                        }

                        firstFirewallLoad = false;

                        previousFirewallIPs = currentFirewallIPs;
                        firstLoad = false;
                        updateFirewallIpList(firewallIpList);

                    }
                } else {
                    console.error('Expected an array for Firewall IP list but got:', firewallIpList);
                }
            })
            .catch(error => console.error('Error fetching Firewall IP list:', error));
    }

    function renderBlacklistedIpList() {
        fetch('ioc_blacklist/iocblacklist.json')
            .then(response => response.json())
            .then(blacklist => {
                if (!Array.isArray(blacklist)) {
                    console.error('Expected array from iocblacklist.json');
                    return;
                }

                blacklist.forEach(ipObj => {
                    if (ipObj.Latitude && ipObj.Longitude) {
                        console.log("Adding blacklist marker for", ipObj.ForeignAddress);

                        const markerNetstat = L.marker([ipObj.Latitude, ipObj.Longitude], {
                            icon: redDotIcon
                        }).addTo(netstatMap);

                        markerNetstat.bindPopup(`BLACKLISTED IP<br>IP: ${ipObj.ForeignAddress}`);
                        markerNetstat.on('mouseover', () => markerNetstat.openPopup());
                        markerNetstat.on('mouseout', () => markerNetstat.closePopup());

                        const markerFirewall = L.marker([ipObj.Latitude, ipObj.Longitude], {
                            icon: redDotIcon
                        }).addTo(firewallMap);

                        markerFirewall.bindPopup(`BLACKLISTED IP<br>IP: ${ipObj.ForeignAddress}`);
                        markerFirewall.on('mouseover', () => markerFirewall.openPopup());
                        markerFirewall.on('mouseout', () => markerFirewall.closePopup());

                        blacklistedMarkers.push(markerNetstat, markerFirewall);
                    } else {
                        console.warn("Blacklist IP missing location:", ipObj.ForeignAddress);
                    }
                });
            })
            .catch(error => console.error('Error loading iocblacklist.json:', error));
    }

    function updateSSHMapMarkers() {
        fetch('iplistlinuxauth.json')
            .then(response => response.json())
            .then(attempts => {
                if (Array.isArray(attempts)) {
                    let currentSSHIPs = new Set();

                    sshmapMarkers.forEach(marker => sshMap.removeLayer(marker));
                    sshmapMarkers = [];

                    attempts.forEach(attempt => {
                        const ipObj = attempt.Ip;
                        if (ipObj && ipObj.Latitude && ipObj.Longitude && ipObj.ForeignAddress) {

                            const marker = L.marker([ipObj.Latitude, ipObj.Longitude], {
                                icon: greenDotIcon
                            }).addTo(sshMap);

                            marker.bindPopup(`
                            <strong>IP:</strong> ${ipObj.ForeignAddress}<br>
                            <strong>User:</strong> ${attempt.UserName}<br>
                            <strong>Status:</strong> ${attempt.Status}<br>
                            <strong>Time:</strong> ${attempt.Timestamp}
                        `);

                            marker.on('mouseover', () => marker.openPopup());
                            marker.on('mouseout', () => marker.closePopup());

                            sshmapMarkers.push(marker);

                            if (isNewYellow) {
                                if (navigator.geolocation) {
                                    navigator.geolocation.getCurrentPosition(function (position) {
                                        const myLat = position.coords.latitude;
                                        const myLon = position.coords.longitude;

                                        const line = animateLine(
                                            [myLat, myLon],
                                            [ipObj.Latitude, ipObj.Longitude],
                                            sshMap
                                        );
                                        animatedLines[ipObj.ForeignAddress] = line;
                                    });
                                }
                            } else if (animatedLines[ipObj.ForeignAddress]) {
                                sshMap.removeLayer(animatedLines[ipObj.ForeignAddress]);
                                delete animatedLines[ipObj.ForeignAddress];
                            }

                            currentSSHIPs.add(ipObj.ForeignAddress);
                        }
                    });

                    previousNetstatIPs = currentSSHIPs;
                    firstLoad = false;
                } else {
                    console.error('Expected array of LoginAttempt objects, got:', attempts);
                }
            })
            .catch(error => console.error('Error fetching SSH login attempts:', error));
    }


    function updateNetstatIpList(ipList) {
        const ipListContainer = document.getElementById("ipList");
        ipListContainer.innerHTML = '';

        setTimeout(() => {
            if (Array.isArray(ipList)) {
                ipList.forEach(ipObj => {
                    if (ipObj && ipObj.ForeignAddress && ipObj.State && ipObj.Protocol) {
                        const li = document.createElement('li');
                        li.textContent = `IP: ${ipObj.ForeignAddress}   ---   Protocol: ${ipObj.Protocol} --- Application: ${ipObj.ApplicationName}`;
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
        ipListContainer.innerHTML = '';

        setTimeout(() => {
            if (Array.isArray(firewallIpList)) {
                firewallIpList.forEach(ipObj => {
                    if (ipObj && ipObj.ForeignAddress && ipObj.State && ipObj.Protocol) {
                        const li = document.createElement('li');
                        li.textContent = `IP: ${ipObj.ForeignAddress}   --- Protocol: ${ipObj.Protocol}  --- Hitcount: ${ipObj.HitCount}`;
                        ipListContainer.appendChild(li);
                    }
                });
            } else {
                console.error('Expected an array for Firewall IP list but got:', firewallIpList);
            }
        }, 100); // 100ms delay before updating
    }

    function animateLine(start, end, map) {
        setTimeout(2000);

        const line = L.polyline([start], {
            color: 'red',
            weight: 3,
            opacity: 0.5,
            dashArray: '5, 10',
        }).addTo(map);

        const steps = 30;
        let i = 1;

        const latStep = (end[0] - start[0]) / steps;
        const lngStep = (end[1] - start[1]) / steps;

        const interval = setInterval(() => {
            if (i > steps) {
                clearInterval(interval);
                return;
            }

            const lat = start[0] + latStep * i;
            const lng = start[1] + lngStep * i;
            line.setLatLngs([start, [lat, lng]]);

            i++;
        }, 40);

        setTimeout(() => {
            map.removeLayer(line);
        }, 8000);

        return line;
    }


    function addOwnLocationToMap() {
        if (!navigator.geolocation) {
            console.error("Geolocation wordt niet ondersteund door deze browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            const blueDotIcon = L.divIcon({
                className: 'blue-dot',
                html: '<div class="marker-circle" style="background-color: dodgerblue; width: 10px; height: 10px; border-radius: 50%;"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6],
                popupAnchor: [0, -12]
            });

            // Marker voor Netstat map
            const netstatMarker = L.marker([lat, lon], {
                icon: blueDotIcon
            }).addTo(netstatMap);

            netstatMarker.bindTooltip("📍 You are here", {
                direction: "top",
                offset: [0, -10],
                opacity: 0.9
            });

            netstatMarker.on("mouseover", () => netstatMarker.openTooltip());
            netstatMarker.on("mouseout", () => netstatMarker.closeTooltip());

            // Marker voor Firewall map
            const firewallMarker = L.marker([lat, lon], {
                icon: blueDotIcon
            }).addTo(firewallMap);

            firewallMarker.bindTooltip("📍 You are here", {
                direction: "top",
                offset: [0, -10],
                opacity: 0.9
            });

            firewallMarker.on("mouseover", () => firewallMarker.openTooltip());
            firewallMarker.on("mouseout", () => firewallMarker.closeTooltip());


            // Marker voor SSH map
            const sshMarker = L.marker([lat, lon], {
                icon: blueDotIcon
            }).addTo(sshMap);

            sshMarker.bindTooltip("📍 You are here", {
                direction: "top",
                offset: [0, -10],
                opacity: 0.9
            });

            sshMarker.on("mouseover", () => sshMarker.openTooltip());
            sshMarker.on("mouseout", () => sshMarker.closeTooltip());

        }, function (error) {
            console.error("Geolocation error:", error);
            alert("Locatie kon niet worden opgehaald. Mogelijk heb je toegang geweigerd.");
        });
    }


    netstatMapBtn.addEventListener("click", function () {
        showSection(netstatMapSection);
        hideFlyoutMenu();

        if (!netstatMap) {
            netstatMap = initializeMap('netstatmap');
            addOwnLocationToMap();
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
            addOwnLocationToMap();
            updateFirewallMapMarkers();
        } else {
            firewallMap.invalidateSize();
        }
    });

    sshMapBtn.addEventListener("click", function () {
        showSection(sshMapSection);
        hideFlyoutMenu();

        const sshMapContainer = document.getElementById('sshmap');
        if (!sshMapContainer) {
            console.error("SSH Map container not found.");
            return;
        }

        if (!sshMap) {
            sshMap = initializeMap('sshmap');
            addOwnLocationToMap(sshMap);
            updateSSHMapMarkers();
        } else {
            sshMap.invalidateSize();
            updateSSHMapMarkers();
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

    hamburger.addEventListener("click", function () {
        const isOpen = flyoutMenu.classList.toggle("open");
        content.classList.toggle("open");
        hamburger.classList.toggle("open");
        hamburger.classList.toggle("closed");

        toggleNavButtons(isOpen);
    });

    function hideFlyoutMenu() {
        flyoutMenu.classList.remove("open");
        content.classList.remove("open");
        hamburger.classList.remove("open");
        hamburger.classList.add("closed");
    }

    function toggleNavButtons(enable) {
        const buttons = document.querySelectorAll(".nav-btn");
        buttons.forEach(btn => {
            btn.disabled = !enable;
        });
    }

    netstatMap = initializeMap('netstatmap');

    renderBlacklistedIpList();

    setTimeout(2000);
    updateNetstatMapMarkers();
    updateFirewallMapMarkers();
    updateSSHMapMarkers();

    setInterval(() => {
        updateNetstatMapMarkers();
        updateFirewallMapMarkers();
        updateSSHMapMarkers();
    }, 8000);

    addOwnLocationToMap();
});
