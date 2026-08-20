/* =====================================================
   ICARUS OLYMPUS MAP
   ===================================================== */


/* =====================================================
   SOCKET.IO
   ===================================================== */

let socket = null;

if (typeof io !== "undefined") {
    socket = io();
}


/* =====================================================
   ELEMENTE
   ===================================================== */

const mapContainer = document.getElementById("map-container");
const mapLayer = document.getElementById("map-layer");
const markersContainer = document.getElementById("markers");

const map = document.getElementById("map");

const searchInput = document.getElementById("search");

const markerInfo = document.getElementById("marker-info");

const markerName = document.getElementById("marker-name");
const resourceSelect = document.getElementById("resource");
const noteInput = document.getElementById("note");

const selectedInfo = document.getElementById("selected-info");

const markerCount = document.getElementById("marker-count");

const addMarkerButton =
    document.getElementById("add-marker-button");

const saveButton =
    document.getElementById("save-button");

const deleteButton =
    document.getElementById("delete-button");


/* =====================================================
   VARIABLEN
   ===================================================== */

let markers = [];

let selectedMarker = null;

let addingMarker = false;


/*
    Kartenposition
*/

let mapX = 0;
let mapY = 0;

let zoom = 1;


/*
    Bewegung
*/

let dragging = false;

let dragStartX = 0;
let dragStartY = 0;

let dragStartMapX = 0;
let dragStartMapY = 0;


/*
    Verhindert, dass ein normales
    Klicken nach dem Ziehen
    als Marker-Klick erkannt wird.
*/

let movedMouse = false;


/* =====================================================
   RESSOURCENNAMEN
   ===================================================== */

function getResourceName(type) {

    const names = {

        unknown: "❓ Unbekannt",

        iron: "Eisen",

        copper: "Kupfer",

        aluminium: "Aluminium",

        gold: "Gold",

        titanium: "Titan",

        platinum: "Platin",

        exotic: "Exotics",

        deep: "⛏ Tiefenerz",

        cave: "🕳 Cave",

        other: "Sonstiges"

    };

    return names[type] || type;
}


/* =====================================================
   MARKER RESSOURCEN
   ===================================================== */

function getResources(marker) {

    /*
        Neue Marker benutzen resources[].
    */

    if (Array.isArray(marker.resources)) {

        return marker.resources;

    }


    /*
        Alte Marker können noch type benutzen.
    */

    if (marker.type) {

        return [marker.type];

    }


    return ["unknown"];
}


/* =====================================================
   MARKER SYMBOL
   ===================================================== */

function getMarkerSymbol(marker) {

    const resources = getResources(marker);


    if (resources.includes("cave")) {

        return "🕳";

    }


    if (resources.includes("deep")) {

        return "⛏";

    }


    if (resources.includes("unknown")) {

        return "?";

    }


    return "◆";
}


/* =====================================================
   MARKER KLASSE
   ===================================================== */

function getMarkerClass(marker) {

    const resources = getResources(marker);


    if (resources.includes("cave")) {

        return "cave";

    }


    if (resources.includes("deep")) {

        return "deep";

    }


    if (resources.includes("unknown")) {

        return "unknown";

    }


    return "resource";
}


/* =====================================================
   MARKER ANZEIGEN
   ===================================================== */

function updateMarkers() {

    markersContainer.innerHTML = "";


    /*
        Anzahl anzeigen
    */

    markerCount.innerText = markers.length;


    /*
        Suche
    */

    let search = "";

    if (searchInput) {

        search =
            searchInput.value
                .trim()
                .toLowerCase();

    }


    /*
        Alle Marker durchgehen
    */

    markers.forEach(marker => {


        const resources =
            getResources(marker);


        /* ---------------------------------------------
           SUCHE
        --------------------------------------------- */

        if (search !== "") {

            let text = "";

            text += marker.name || "";
            text += " ";
            text += marker.note || "";
            text += " ";

            resources.forEach(resource => {

                text += resource + " ";
                text += getResourceName(resource) + " ";

            });


            text = text.toLowerCase();


            if (!text.includes(search)) {

                return;

            }

        }


        /* ---------------------------------------------
           FILTER
        --------------------------------------------- */

        let visible = false;


        /*
            Unbekannt
        */

        if (
            resources.includes("unknown") &&
            document.getElementById("filterUnknown").checked
        ) {

            visible = true;

        }


        /*
            Tiefenerz
        */

        if (
            resources.includes("deep") &&
            document.getElementById("filterDeep").checked
        ) {

            visible = true;

        }


        /*
            Cave
        */

        if (
            resources.includes("cave") &&
            document.getElementById("filterCaves").checked
        ) {

            visible = true;

        }


        /*
            Normale Ressourcen
        */

        const normalResources =
            resources.filter(resource => {

                return (
                    resource !== "unknown" &&
                    resource !== "deep" &&
                    resource !== "cave"
                );

            });


        if (
            normalResources.length > 0 &&
            document.getElementById("filterResources").checked
        ) {

            visible = true;

        }


        if (!visible) {

            return;

        }


        /* ---------------------------------------------
           MARKER ELEMENT
        --------------------------------------------- */

        const element =
            document.createElement("div");


        element.classList.add("marker");


        element.classList.add(
            getMarkerClass(marker)
        );


        element.innerText =
            getMarkerSymbol(marker);


        /*
            Position
        */

        element.style.left =
            marker.x + "%";

        element.style.top =
            marker.y + "%";


        /*
            Auswahl
        */

        if (
            selectedMarker === marker.id
        ) {

            element.classList.add("selected");

        }


        /* ---------------------------------------------
           MARKER MOUSEDOWN
        --------------------------------------------- */

        element.addEventListener(
            "mousedown",
            function(event) {

                /*
                    Verhindert, dass die Karte
                    gleichzeitig bewegt wird.
                */

                event.stopPropagation();

            }
        );


        /* ---------------------------------------------
           MARKER CLICK
        --------------------------------------------- */

        element.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();


                /*
                    Wenn gerade gezogen wurde,
                    keinen Marker auswählen.
                */

                if (movedMouse) {

                    return;

                }


                selectMarker(marker.id);

            }
        );


        /* ---------------------------------------------
           HOVER
        --------------------------------------------- */

        element.addEventListener(
            "mouseenter",
            function() {

                showMarkerInfo(
                    marker,
                    element
                );

            }
        );


        element.addEventListener(
            "mouseleave",
            function() {

                hideMarkerInfo();

            }
        );


        markersContainer.appendChild(element);

    });

}


/* =====================================================
   MARKER AUSWÄHLEN
   ===================================================== */

function selectMarker(id) {

    selectedMarker = id;

    addingMarker = false;


    const marker =
        markers.find(
            item => item.id === id
        );


    if (!marker) {

        return;

    }


    /*
        Name
    */

    markerName.value =
        marker.name || "";


    /*
        Notiz
    */

    noteInput.value =
        marker.note || "";


    /*
        Ressourcen
    */

    const resources =
        getResources(marker);


    Array.from(
        resourceSelect.options
    ).forEach(option => {

        option.selected =
            resources.includes(
                option.value
            );

    });


    /*
        Info
    */

    selectedInfo.innerHTML = `

        <strong>
            ${marker.name || "Unbenannter Fundort"}
        </strong>

        <br>

        Position:
        ${marker.x.toFixed(2)}%
        /
        ${marker.y.toFixed(2)}%

    `;


    mapContainer.style.cursor = "grab";


    updateMarkers();

}


/* =====================================================
   NEUEN MARKER STARTEN
   ===================================================== */

function startNewMarker(event) {

    if (event) {

        event.preventDefault();

        event.stopPropagation();

    }


    addingMarker = true;

    selectedMarker = null;


    /*
        Eingaben zurücksetzen
    */

    markerName.value = "";

    noteInput.value = "";


    /*
        Ressourcen zurücksetzen
    */

    Array.from(
        resourceSelect.options
    ).forEach(option => {

        option.selected = false;

    });


    /*
        Info
    */

    selectedInfo.innerHTML = `

        <strong>
            Neuer Marker
        </strong>

        <br>

        Klicke jetzt auf die gewünschte
        Stelle der Karte.

    `;


    mapContainer.style.cursor =
        "crosshair";

}


/* =====================================================
   MARKER AUF KARTE SETZEN
   ===================================================== */

mapContainer.addEventListener(
    "click",
    function(event) {

        // Nur wenn wir gerade einen Marker setzen
        if (!addingMarker) {
            return;
        }

        // Button ignorieren
        if (
            event.target.closest("#add-marker-button")
        ) {
            return;
        }

        // Wenn vorher gezogen wurde
        if (movedMouse) {
            movedMouse = false;
            return;
        }


        /*
            Die tatsächliche sichtbare Position
            des Bildes ermitteln.
        */

        const mapRect =
            map.getBoundingClientRect();


        /*
            Mausposition relativ zum Bild
        */

        const mouseX =
            event.clientX - mapRect.left;

        const mouseY =
            event.clientY - mapRect.top;


        /*
            Prozentposition innerhalb
            des tatsächlichen Bildes
        */

        const x =
            (mouseX / mapRect.width) * 100;

        const y =
            (mouseY / mapRect.height) * 100;


        /*
            Prüfen, ob innerhalb des Bildes
        */

        if (
            x < 0 ||
            x > 100 ||
            y < 0 ||
            y > 100
        ) {
            return;
        }


        /*
            NEUER MARKER
        */

        const newMarker = {

            id: Date.now(),

            x: x,

            y: y,

            resources: [
                "unknown"
            ],

            name:
                "Neuer Fundort",

            note:
                ""

        };


        /*
            Marker hinzufügen
        */

        markers.push(
            newMarker
        );


        selectedMarker =
            newMarker.id;


        addingMarker = false;


        mapContainer.style.cursor =
            "grab";


        /*
            Speichern
        */

        saveMarkers();


        /*
            Marker auswählen
        */

        selectMarker(
            newMarker.id
        );

    }
);


/* =====================================================
   MARKER SPEICHERN
   ===================================================== */

function saveMarker() {


    if (
        selectedMarker === null
    ) {

        alert(
            "Bitte zuerst einen Marker auswählen."
        );

        return;

    }


    const marker =
        markers.find(
            item =>
                item.id ===
                selectedMarker
        );


    if (!marker) {

        return;

    }


    /*
        Ressourcen speichern
    */

    marker.resources =
        Array.from(
            resourceSelect.selectedOptions
        ).map(
            option =>
                option.value
        );


    /*
        Keine Ressource ausgewählt
    */

    if (
        marker.resources.length === 0
    ) {

        marker.resources = [
            "unknown"
        ];

    }


    /*
        Name speichern
    */

    marker.name =
        markerName.value.trim();


    if (
        marker.name === ""
    ) {

        marker.name =
            "Unbenannter Fundort";

    }


    /*
        Notiz speichern
    */

    marker.note =
        noteInput.value;


    /*
        Speichern
    */

    saveMarkers();


    /*
        Anzeige aktualisieren
    */

    selectMarker(
        marker.id
    );

}


/* =====================================================
   ALLE MARKER SPEICHERN
   ===================================================== */

function saveMarkers() {


    /*
        IMMER lokal speichern
    */

    try {

        localStorage.setItem(
            "icarusMarkers",
            JSON.stringify(markers)
        );

    }
    catch (error) {

        console.error(
            "LocalStorage Fehler:",
            error
        );

    }


    /*
        Wenn Flask/Socket.IO
        verfügbar ist:
        auch Server speichern.
    */

    if (socket) {

        socket.emit(
            "save_markers",
            markers
        );

    }

}


/* =====================================================
   MARKER LÖSCHEN
   ===================================================== */

function deleteMarker() {


    if (
        selectedMarker === null
    ) {

        alert(
            "Bitte zuerst einen Marker auswählen."
        );

        return;

    }


    if (
        !confirm(
            "Diesen Marker wirklich löschen?"
        )
    ) {

        return;

    }


    /*
        Marker entfernen
    */

    markers =
        markers.filter(
            marker =>
                marker.id !==
                selectedMarker
        );


    selectedMarker = null;


    /*
        Eingaben leeren
    */

    markerName.value = "";

    noteInput.value = "";


    /*
        Info zurücksetzen
    */

    selectedInfo.innerHTML = `

        <div class="empty-marker">

            <div class="empty-icon">
                +
            </div>

            Kein Marker ausgewählt.

            <small>
                Klicke auf einen Marker
                oder erstelle einen neuen.
            </small>

        </div>

    `;


    /*
        Speichern
    */

    saveMarkers();


    updateMarkers();

}


/* =====================================================
   HOVER INFORMATION
   ===================================================== */

function showMarkerInfo(
    marker,
    element
) {

    if (!markerInfo) {

        return;

    }


    const resources =
        getResources(marker);


    let resourceHTML = "";


    resources.forEach(resource => {

        resourceHTML += `

            <div>
                ${getResourceName(resource)}
            </div>

        `;

    });


    markerInfo.innerHTML = `

        <strong>
            ${marker.name || "Unbenannter Fundort"}
        </strong>

        <b>
            Ressourcen
        </b>

        ${resourceHTML}

        <br>

        <b>
            Notiz
        </b>

        <div>
            ${
                marker.note ||
                "Keine Notiz"
            }
        </div>

    `;


    const rect =
        element.getBoundingClientRect();


    let left =
        rect.right + 10;


    let top =
        rect.top;


    /*
        Rechts kein Platz
    */

    if (
        left + 255 >
        window.innerWidth
    ) {

        left =
            rect.left - 265;

    }


    /*
        Unten kein Platz
    */

    if (
        top + 250 >
        window.innerHeight
    ) {

        top =
            window.innerHeight - 260;

    }


    markerInfo.style.left =
        left + "px";


    markerInfo.style.top =
        top + "px";


    markerInfo.style.display =
        "block";

}


/* =====================================================
   HOVER AUSBLENDEN
   ===================================================== */

function hideMarkerInfo() {

    if (markerInfo) {

        markerInfo.style.display =
            "none";

    }

}


/* =====================================================
   KARTE AKTUALISIEREN
   ===================================================== */

function updateMap() {

    mapLayer.style.transform =
        "translate(" +
        mapX +
        "px, " +
        mapY +
        "px) scale(" +
        zoom +
        ")";

}


/* =====================================================
   KARTE BEWEGEN
   ===================================================== */

mapContainer.addEventListener(
    "mousedown",
    function(event) {


        /*
            Im Marker-Modus
            nicht bewegen
        */

        if (addingMarker) {

            return;

        }


        /*
            Button ignorieren
        */

        if (
            event.target.closest(
                "#add-marker-button"
            )
        ) {

            return;

        }


        /*
            Marker ignorieren
        */

        if (
            event.target.closest(
                ".marker"
            )
        ) {

            return;

        }


        /*
            Bewegung starten
        */

        dragging = true;

        movedMouse = false;


        dragStartX =
            event.clientX;


        dragStartY =
            event.clientY;


        dragStartMapX =
            mapX;


        dragStartMapY =
            mapY;


        mapContainer.style.cursor =
            "grabbing";


        event.preventDefault();

    }
);


/* =====================================================
   MOUSEMOVE
   ===================================================== */

window.addEventListener(
    "mousemove",
    function(event) {


        if (!dragging) {

            return;

        }


        const dx =
            event.clientX -
            dragStartX;


        const dy =
            event.clientY -
            dragStartY;


        /*
            Prüfen, ob wirklich
            gezogen wurde
        */

        if (
            Math.abs(dx) > 3 ||
            Math.abs(dy) > 3
        ) {

            movedMouse = true;

        }


        /*
            Neue Kartenposition
        */

        mapX =
            dragStartMapX +
            dx;


        mapY =
            dragStartMapY +
            dy;


        /*
            Karte aktualisieren
        */

        updateMap();

    }
);


/* =====================================================
   MOUSEUP
   ===================================================== */

window.addEventListener(
    "mouseup",
    function() {

        dragging = false;


        mapContainer.style.cursor =
            addingMarker
                ? "crosshair"
                : "grab";

    }
);


/* =====================================================
   ZOOM
   ===================================================== */

function zoomIn() {

    zoom += 0.2;


    if (
        zoom > 3
    ) {

        zoom = 3;

    }


    updateMap();

}


function zoomOut() {

    zoom -= 0.2;


    if (
        zoom < 0.5
    ) {

        zoom = 0.5;

    }


    updateMap();

}


function resetMap() {

    zoom = 1;

    mapX = 0;

    mapY = 0;

    updateMap();

}


/* =====================================================
   MAUSRAD
   ===================================================== */

mapContainer.addEventListener(
    "wheel",
    function(event) {

        event.preventDefault();


        if (
            event.deltaY < 0
        ) {

            zoomIn();

        }
        else {

            zoomOut();

        }

    },
    {
        passive: false
    }
);


/* =====================================================
   SUCHE
   ===================================================== */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function() {

            updateMarkers();

        }
    );

}


/* =====================================================
   FILTER
   ===================================================== */

const filterIds = [

    "filterUnknown",

    "filterDeep",

    "filterCaves",

    "filterResources"

];


filterIds.forEach(id => {

    const checkbox =
        document.getElementById(id);


    if (checkbox) {

        checkbox.addEventListener(
            "change",
            function() {

                updateMarkers();

            }
        );

    }

});


/* =====================================================
   BUTTONS
   ===================================================== */

if (addMarkerButton) {

    addMarkerButton.addEventListener(
        "click",
        startNewMarker
    );

}


if (saveButton) {

    saveButton.addEventListener(
        "click",
        saveMarker
    );

}


if (deleteButton) {

    deleteButton.addEventListener(
        "click",
        deleteMarker
    );


}


const zoomInButton =
    document.getElementById(
        "zoom-in"
    );


const zoomOutButton =
    document.getElementById(
        "zoom-out"
    );


const resetButton =
    document.getElementById(
        "reset-map"
    );


if (zoomInButton) {

    zoomInButton.addEventListener(
        "click",
        zoomIn
    );

}


if (zoomOutButton) {

    zoomOutButton.addEventListener(
        "click",
        zoomOut
    );

}


if (resetButton) {

    resetButton.addEventListener(
        "click",
        resetMap
    );

}


/* =====================================================
   SOCKET.IO
   ===================================================== */

if (socket) {


    socket.on(
        "connect",
        function() {

            console.log(
                "Mit Server verbunden."
            );


            const statusText =
                document.getElementById(
                    "status-text"
                );


            const statusDot =
                document.getElementById(
                    "status-dot"
                );


            const indicator =
                document.getElementById(
                    "server-indicator"
                );


            if (statusText) {

                statusText.innerText =
                    "ONLINE";

            }


            if (statusDot) {

                statusDot.classList.add(
                    "online"
                );

            }


            if (indicator) {

                indicator.classList.add(
                    "online"
                );

            }


            /*
                Marker vom Server holen
            */

            socket.emit(
                "get_markers"
            );

        }
    );


    socket.on(
        "disconnect",
        function() {

            console.log(
                "Server getrennt."
            );


            const statusText =
                document.getElementById(
                    "status-text"
                );


            const statusDot =
                document.getElementById(
                    "status-dot"
                );


            const indicator =
                document.getElementById(
                    "server-indicator"
                );


            if (statusText) {

                statusText.innerText =
                    "OFFLINE";

            }


            if (statusDot) {

                statusDot.classList.remove(
                    "online"
                );

            }


            if (indicator) {

                indicator.classList.remove(
                    "online"
                );

            }

        }
    );


    /*
        Marker vom Server
    */

    socket.on(
        "markers_loaded",
        function(serverMarkers) {

            markers =
                serverMarkers || [];


            localStorage.setItem(
                "icarusMarkers",
                JSON.stringify(
                    markers
                )
            );


            updateMarkers();

        }
    );


    /*
        Änderungen eines anderen
        Benutzers
    */

    socket.on(
        "markers_updated",
        function(serverMarkers) {

            markers =
                serverMarkers || [];


            localStorage.setItem(
                "icarusMarkers",
                JSON.stringify(
                    markers
                )
            );


            updateMarkers();

        }
    );

}


/* =====================================================
   LOKALE MARKER LADEN
   ===================================================== */

try {

    const savedMarkers =
        localStorage.getItem(
            "icarusMarkers"
        );


    if (
        savedMarkers &&
        markers.length === 0
    ) {

        markers =
            JSON.parse(
                savedMarkers
            );

    }

}
catch (error) {

    console.error(
        "Fehler beim Laden der Marker:",
        error
    );

}


/* =====================================================
   START
   ===================================================== */

updateMarkers();

updateMap();

console.log(
    "ICARUS Map gestartet."
);