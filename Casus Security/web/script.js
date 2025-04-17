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

    // Store known IPs in localStorage to persist across page refreshes
    let knownNetstatIPs = new Set(JSON.parse(localStorage.getItem('knownNetstatIPs') || '[]'));
    let knownFirewallIPs = new Set(JSON.parse(localStorage.getItem('knownFirewallIPs') || '[]'));
    let knownSSHIPs = new Set(JSON.parse(localStorage.getItem('knownSSHIPs') || '[]'));

    // Track currently active IP addresses for comparison
    let currentNetstatIPs = new Set();
    let currentFirewallIPs = new Set();
    let currentSSHIPs = new Set();

    // Track active animation lines to avoid duplicates
    let animatedLines = {};

    // Track if this is first load after page refresh
    let isInitialLoad = true;

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
        html: `<div class="marker-core"></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -15]
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
                    currentNetstatIPs.clear();

                    netstatMarkers.forEach(marker => netstatMap.removeLayer(marker));
                    netstatMarkers = [];

                    ipList.forEach(ipObj => {
                        if (ipObj.State === "ESTABLISHED" && ipObj.Latitude && ipObj.Longitude) {
                            const ip = ipObj.ForeignAddress;

                            currentNetstatIPs.add(ip);

                            const isNew = !knownNetstatIPs.has(ip) && !isInitialLoad;

                            let icon;
                            if (ipObj.IsMalicious) {
                                icon = redDotIcon;
                            } else {
                                icon = isNew ? yellowDotIcon : greenDotIcon;
                            }

                            const marker = L.marker([ipObj.Latitude, ipObj.Longitude], {
                                icon: icon
                            }).addTo(netstatMap);

                            checkIfKnownApplication(ipObj).then(knownApp => {
                                if (knownApp) {
                                    marker.bindPopup(`IP: ${ipObj.ForeignAddress} - Protocol: ${ipObj.Protocol} - Applicatie: ${ipObj.ApplicationName}`);
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

                            if (isNew && !animatedLines[ip]) {
                                animateLineToIP(ip, [ipObj.Latitude, ipObj.Longitude], netstatMap);
                            }
                        }
                    });

                    currentNetstatIPs.forEach(ip => knownNetstatIPs.add(ip));

                    isInitialLoad = false;

                    localStorage.setItem('knownNetstatIPs', JSON.stringify([...knownNetstatIPs]));

                    updateNetstatIpList(ipList);

                    cleanupAnimations(currentNetstatIPs);

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
                    currentFirewallIPs.clear();

                    firewallMarkers.forEach(marker => firewallMap.removeLayer(marker));
                    firewallMarkers = [];

                    firewallIpList.forEach(ipObj => {
                        if (ipObj.State === "ALLOW" && ipObj.Latitude && ipObj.Longitude) {
                            const ip = ipObj.ForeignAddress;

                            currentFirewallIPs.add(ip);

                            const isNew = !knownFirewallIPs.has(ip) && !isInitialLoad;

                            let icon;
                            if (ipObj.IsMalicious) {
                                icon = redDotIcon;
                            } else {
                                icon = isNew ? yellowDotIcon : greenDotIcon;
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

                            if (isNew && !animatedLines[ip]) {
                                animateLineToIP(ip, [ipObj.Latitude, ipObj.Longitude], firewallMap);
                            }
                        }
                    });

                    currentFirewallIPs.forEach(ip => knownFirewallIPs.add(ip));

                    localStorage.setItem('knownFirewallIPs', JSON.stringify([...knownFirewallIPs]));

                    updateFirewallIpList(firewallIpList);

                    cleanupAnimations(currentFirewallIPs);

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
                    currentSSHIPs.clear();

                    sshmapMarkers.forEach(marker => sshMap.removeLayer(marker));
                    sshmapMarkers = [];

                    attempts.forEach(attempt => {
                        const ipObj = attempt.Ip;
                        if (ipObj && ipObj.Latitude && ipObj.Longitude && ipObj.ForeignAddress) {
                            const ip = ipObj.ForeignAddress;

                            currentSSHIPs.add(ip);

                            const isNew = !knownSSHIPs.has(ip) && !isInitialLoad;

                            let icon = attempt.Status === "Failed" ? redDotIcon : (isNew ? yellowDotIcon : greenDotIcon);

                            const marker = L.marker([ipObj.Latitude, ipObj.Longitude], {
                                icon: icon
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

                            if (isNew && !animatedLines[ip]) {
                                animateLineToIP(ip, [ipObj.Latitude, ipObj.Longitude], sshMap);
                            }
                        }
                    });

                    // Update the known IPs set with all current IPs
                    currentSSHIPs.forEach(ip => knownSSHIPs.add(ip));

                    // Save to localStorage for persistence across page refreshes
                    localStorage.setItem('knownSSHIPs', JSON.stringify([...knownSSHIPs]));

                    cleanupAnimations(currentSSHIPs);

                } else {
                    console.error('Expected array of LoginAttempt objects, got:', attempts);
                }
            })
            .catch(error => console.error('Error fetching SSH login attempts:', error));
    }

    function updateNetstatIpList(ipList) {
        const ipListContainer = document.getElementById("ipList");
        ipListContainer.innerHTML = '';

        window.fullNetstatIpList = ipList;

        setTimeout(() => {
            if (Array.isArray(ipList)) {
                ipList.forEach(ipObj => {
                    if (ipObj && ipObj.ForeignAddress && ipObj.State && ipObj.Protocol) {
                        const li = document.createElement('li');
                        li.textContent = `IP: ${ipObj.ForeignAddress}   ---   Protocol: ${ipObj.Protocol} --- Applicatie: ${ipObj.ApplicationName}`;
                        li.dataset.ip = ipObj.ForeignAddress;
                        li.dataset.protocol = ipObj.Protocol;
                        li.dataset.application = ipObj.ApplicationName || '';

                        if (!knownNetstatIPs.has(ipObj.ForeignAddress) && !isInitialLoad) {
                            li.classList.add('new-ip');
                        }

                        ipListContainer.appendChild(li);
                    }
                });

                applyNetstatFilters();
            } else {
                console.error('Expected an array for Netstat IP list but got:', ipList);
            }
        }, 100); // 100ms delay before updating
    }

    function updateFirewallIpList(firewallIpList) {
        const ipListContainer = document.getElementById("ipListFirewall");
        ipListContainer.innerHTML = '';

        window.fullFirewallIpList = firewallIpList;

        setTimeout(() => {
            if (Array.isArray(firewallIpList)) {
                firewallIpList.forEach(ipObj => {
                    if (ipObj && ipObj.ForeignAddress && ipObj.State && ipObj.Protocol) {
                        const li = document.createElement('li');
                        li.textContent = `IP: ${ipObj.ForeignAddress}   --- Protocol: ${ipObj.Protocol}  --- Hits: ${ipObj.HitCount}`;
                        li.dataset.ip = ipObj.ForeignAddress;
                        li.dataset.protocol = ipObj.Protocol;

                        if (!knownFirewallIPs.has(ipObj.ForeignAddress) && !isInitialLoad) {
                            li.classList.add('new-ip');
                        }

                        ipListContainer.appendChild(li);
                    }
                });

                applyFirewallFilters();
            } else {
                console.error('Expected an array for Firewall IP list but got:', firewallIpList);
            }
        }, 100); // 100ms delay before updating
    }

    function animateLineToIP(ipAddress, destination, map) {
        if (animatedLines[ipAddress]) {
            return;
        }

        // Get the user's current position
        navigator.geolocation.getCurrentPosition(function (position) {
            const myLat = position.coords.latitude;
            const myLon = position.coords.longitude;
            const start = [myLat, myLon];

            const line = L.polyline([start], {
                color: 'red',
                weight: 3,
                opacity: 0.5,
                dashArray: '5, 10',
            }).addTo(map);

            animatedLines[ipAddress] = {
                line: line,
                map: map,
                timeout: null
            };

            const steps = 30;
            let i = 1;
            const latStep = (destination[0] - start[0]) / steps;
            const lngStep = (destination[1] - start[1]) / steps;

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

            const timeout = setTimeout(() => {
                if (animatedLines[ipAddress]) {
                    map.removeLayer(line);
                    delete animatedLines[ipAddress];
                }
            }, 8000);

            if (animatedLines[ipAddress]) {
                animatedLines[ipAddress].timeout = timeout;
            }
        }, function (error) {
            console.error("Geolocation error:", error);
        });
    }

    function cleanupAnimations(currentIPs) {
        // Clean up animations for IPs that are no longer present
        for (let ip in animatedLines) {
            if (!currentIPs.has(ip)) {
                if (animatedLines[ip].line) {
                    animatedLines[ip].map.removeLayer(animatedLines[ip].line);
                }
                if (animatedLines[ip].timeout) {
                    clearTimeout(animatedLines[ip].timeout);
                }
                delete animatedLines[ip];
            }
        }
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

            const netstatMarker = L.marker([lat, lon], {
                icon: blueDotIcon
            }).addTo(netstatMap);

            netstatMarker.bindTooltip("📍 Je bent hier", {
                direction: "top",
                offset: [0, -10],
                opacity: 0.9
            });

            netstatMarker.on("mouseover", () => netstatMarker.openTooltip());
            netstatMarker.on("mouseout", () => netstatMarker.closeTooltip());

            const firewallMarker = L.marker([lat, lon], {
                icon: blueDotIcon
            }).addTo(firewallMap);

            firewallMarker.bindTooltip("📍 Je bent hier", {
                direction: "top",
                offset: [0, -10],
                opacity: 0.9
            });

            firewallMarker.on("mouseover", () => firewallMarker.openTooltip());
            firewallMarker.on("mouseout", () => firewallMarker.closeTooltip());

            const sshMarker = L.marker([lat, lon], {
                icon: blueDotIcon
            }).addTo(sshMap);

            sshMarker.bindTooltip("📍 Je bent hier", {
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

    function isSectionVisible(section) {
        return section.style.display === 'block';
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

    function addFilterFunctionality() {
        const ipListSection = document.getElementById("ipListSection");
        const netstatFilterContainer = document.createElement("div");
        netstatFilterContainer.className = "filter-container";
        netstatFilterContainer.innerHTML = `
            <div class="filter-controls">
                <label for="netstatProtocolFilter">Filter op Protocol: </label>
                <select id="netstatProtocolFilter">
                    <option value="all">Alle Protocollen</option>
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                </select>
                <input type="text" id="netstatIpFilter" placeholder="Filter op IP-adres...">
                <input type="text" id="netstatAppFilter" placeholder="Filter op applicatie...">
                <button id="netstatClearFilters">Verwijder Filters</button>
            </div>
        `;
        ipListSection.insertBefore(netstatFilterContainer, ipListSection.querySelector("ul"));

        const firewallIpListSection = document.getElementById("firewallIpListSection");
        const firewallFilterContainer = document.createElement("div");
        firewallFilterContainer.className = "filter-container";
        firewallFilterContainer.innerHTML = `
            <div class="filter-controls">
                <label for="firewallProtocolFilter">Filter op Protocol: </label>
                <select id="firewallProtocolFilter">
                    <option value="all">Alle Protocollen</option>
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                </select>
                <input type="text" id="firewallIpFilter" placeholder="Filter op IP-adres...">
                <button id="firewallClearFilters">Verwijder Filters</button>
            </div>
        `;
        firewallIpListSection.insertBefore(firewallFilterContainer, firewallIpListSection.querySelector("ul"));

        document.getElementById("netstatProtocolFilter").addEventListener("change", applyNetstatFilters);
        document.getElementById("netstatIpFilter").addEventListener("input", applyNetstatFilters);
        document.getElementById("netstatAppFilter").addEventListener("input", applyNetstatFilters);
        document.getElementById("netstatClearFilters").addEventListener("click", clearNetstatFilters);

        document.getElementById("firewallProtocolFilter").addEventListener("change", applyFirewallFilters);
        document.getElementById("firewallIpFilter").addEventListener("input", applyFirewallFilters);
        document.getElementById("firewallClearFilters").addEventListener("click", clearFirewallFilters);
    }

    function applyNetstatFilters() {
        const protocolFilter = document.getElementById("netstatProtocolFilter").value;
        const ipFilter = document.getElementById("netstatIpFilter").value.toLowerCase();
        const appFilter = document.getElementById("netstatAppFilter").value.toLowerCase();

        const items = document.querySelectorAll("#ipList li");

        items.forEach(item => {
            const matchesProtocol = protocolFilter === "all" || item.dataset.protocol === protocolFilter;
            const matchesIp = !ipFilter || item.dataset.ip.toLowerCase().includes(ipFilter);
            const matchesApp = !appFilter || (item.dataset.application && item.dataset.application.toLowerCase().includes(appFilter));

            if (matchesProtocol && matchesIp && matchesApp) {
                item.style.display = "";
            } else {
                item.style.display = "none";
            }
        });
    }

    function applyNetstatFilters() {
        const protocolFilter = document.getElementById("netstatProtocolFilter").value;
        const ipFilter = document.getElementById("netstatIpFilter").value.toLowerCase();
        const appFilter = document.getElementById("netstatAppFilter").value.toLowerCase();

        const items = document.querySelectorAll("#ipList li");

        items.forEach(item => {
            const matchesProtocol = protocolFilter === "all" || item.dataset.protocol === protocolFilter;
            const matchesIp = !ipFilter || item.dataset.ip.toLowerCase().includes(ipFilter);
            const matchesApp = !appFilter || (item.dataset.application && item.dataset.application.toLowerCase().includes(appFilter));

            if (matchesProtocol && matchesIp && matchesApp) {
                item.style.display = "";
            } else {
                item.style.display = "none";
            }
        });
    }

    function applyFirewallFilters() {
        const protocolFilter = document.getElementById("firewallProtocolFilter").value;
        const ipFilter = document.getElementById("firewallIpFilter").value.toLowerCase();

        const items = document.querySelectorAll("#ipListFirewall li");

        items.forEach(item => {
            const matchesProtocol = protocolFilter === "all" || item.dataset.protocol === protocolFilter;
            const matchesIp = !ipFilter || item.dataset.ip.toLowerCase().includes(ipFilter);

            if (matchesProtocol && matchesIp) {
                item.style.display = "";
            } else {
                item.style.display = "none";
            }
        });
    }

    function clearNetstatFilters() {
        document.getElementById("netstatProtocolFilter").value = "all";
        document.getElementById("netstatIpFilter").value = "";
        document.getElementById("netstatAppFilter").value = "";
        applyNetstatFilters();
    }

    function clearFirewallFilters() {
        document.getElementById("firewallProtocolFilter").value = "all";
        document.getElementById("firewallIpFilter").value = "";
        applyFirewallFilters();
    }

    window.addEventListener('storage', function (e) {
        if (e.key === 'knownNetstatIPs') {
            knownNetstatIPs = new Set(JSON.parse(e.newValue || '[]'));
        } else if (e.key === 'knownFirewallIPs') {
            knownFirewallIPs = new Set(JSON.parse(e.newValue || '[]'));
        } else if (e.key === 'knownSSHIPs') {
            knownSSHIPs = new Set(JSON.parse(e.newValue || '[]'));
        }
    });

    netstatMap = initializeMap('netstatmap');
    firewallMap = initializeMap('firewallmap');
    sshMap = initializeMap('sshmap');

    const style = document.createElement('style');
    style.textContent = `
        .new-ip {
            background-color: #ffff99;
            animation: fadeBg 8s forwards;
        }
        @keyframes fadeBg {
            from { background-color: #ffff99; }
            to { background-color: transparent; }
        }
    `;
    document.head.appendChild(style);

    renderBlacklistedIpList();
    addFilterFunctionality();
    addOwnLocationToMap();

    updateNetstatMapMarkers();
    updateFirewallMapMarkers();
    updateSSHMapMarkers();

    setInterval(() => {
        updateNetstatMapMarkers();
        updateFirewallMapMarkers();
        updateSSHMapMarkers();
    }, 8000);
});