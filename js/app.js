const map = L.map("map").setView([33.372, -111.9279], 12);

const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);
const usgs = L.tileLayer.wms(
  "https://basemap.nationalmap.gov/arcgis/services/" +
    "USGSTopo/MapServer/WMSServer",
  {
    layers: "0",
    format: "image/png",
    attribution: "USGS The National Map",
  },
);
const basemaps = { OpenStreetMap: osm, "USGS Topo": usgs };
L.control.layers(basemaps, null, { position: "topleft" }).addTo(map);

L.control.scale({ imperial: true, metric: false }).addTo(map);

map.on("click", (e) =>
  console.log(e.latlng.lat.toFixed(5), e.latlng.lng.toFixed(5)),
);
map.on("moveend", () => console.log("zoom", map.getZoom()));

const blocks = L.geoJSON(null, {
  style: cityStyle,
});

function getColor(pop) {
  if (pop == null) return "#cccccc";
  if (pop > 2000) return "#b30000";
  if (pop > 1500) return "#d43d1b";
  if (pop > 1000) return "#fc8d59";
  if (pop > 500) return "#fdcc8a";
  return "#fef0d9";
}
function cityStyle(f) {
  return {
    fillColor: getColor(f.properties.TotalPop),
    color: "#555",
    weight: 1,
    fillOpacity: 0.6,
  };
}

const transit = L.geoJSON(null, {
  pointToLayer: (f, latlng) =>
    L.circleMarker(latlng, {
      radius: 5,
      color: "#333",
      weight: 1,
      fillColor: "#ffffff",
      fillOpacity: 1,
    }),
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindTooltip(p.name);
    layer.bindPopup(`${p.name}<br>${p.service}<br>${p.city}`);
  },
});

map.createPane("parksPane").style.zIndex = 350;
const parks = L.geoJSON(null, {
  pane: "parksPane",
  style: {
    color: "#2e7d32",
    weight: 1,
    fillColor: "#66bb6a",
    fillOpacity: 0.45,
  },
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindTooltip(p.ParkName);
    layer.bindPopup(
      `${p.ParkName}<br>${p.ParkClass}<br>${p.ParkAddress}<br>Hours: ${p.Hours ?? "not listed"}`,
    );
  },
});

const healthcare = L.geoJSON(null, {
  pointToLayer: (f, latlng) =>
    L.circleMarker(latlng, {
      radius: 6,
      color: "white",
      weight: 1,
      fillColor: "#d7301f",
      fillOpacity: 0.9,
    }),
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindTooltip(p.FACILITY_NAME);
    layer.bindPopup(
      `${p.FACILITY_NAME}<br>${p.SUBTYPE}<br>${p.ADDRESS}, ${p.CITY}<br>${p.Telephone ?? ""}`,
    );
  },
});

// The schools file is statewide, so keep only open schools (not closed ones or district offices)
const schools = L.geoJSON(null, {
  filter: (f) =>
    f.properties.Status == "Open" && f.properties.EntityType == "School",
  pointToLayer: (f, latlng) =>
    L.circleMarker(latlng, {
      radius: 5,
      color: "white",
      weight: 1,
      fillColor: "#2b8cbe",
      fillOpacity: 0.9,
    }),
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindTooltip(p.SchoolName);
    layer.bindPopup(
      `${p.SchoolName}<br>Grades: ${p.GradesServed}<br>${p.SchoolClass}<br>${p.PAddress}, ${p.PCity}`,
    );
  },
});
const clustered = L.markerClusterGroup();

const grocery = L.geoJSON(null, {
  pointToLayer: (f, latlng) =>
    L.circleMarker(latlng, {
      radius: 5,
      color: "white",
      weight: 1,
      fillColor: "#50b65f",
      fillOpacity: 0.9,
    }),
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindTooltip(p.EmpName);
    layer.bindPopup(
      `${p.EmpName}<br>Number of Employees: ${p.Employees}<br>${p.Jurisdiction}`,
    );
  },
});
const groceryCluster = L.markerClusterGroup();

const layers = { blocks, transit, parks, healthcare, schools, grocery };
layers.schools = clustered;
layers.grocery = groceryCluster;

const CountControl = L.Control.extend({
  onAdd: function () {
    this.box = L.DomUtil.create("div", "count-box");
    this.box.textContent = "...";
    return this.box;
  },
  update: function (n) {
    this.box.textContent = `${n} places in view`;
  },
});
const countControl = new CountControl({ position: "bottomleft" }).addTo(map);

function countInView() {
  const bounds = map.getBounds();
  let n = 0;
  for (const [group, shown] of [
    [transit, map.hasLayer(transit)],
    [healthcare, map.hasLayer(healthcare)],
    [schools, map.hasLayer(clustered)],
  ]) {
    if (!shown) continue;
    group.eachLayer((l) => {
      if (bounds.contains(l.getLatLng())) n += 1;
    });
  }
  countControl.update(n);
}
map.on("moveend", countInView);

for (const box of document.querySelectorAll("[data-layer]")) {
  box.addEventListener("change", () => {
    const layer = layers[box.dataset.layer];
    if (!layer) return; // primarily because groceries has no data yet
    if (box.checked) layer.addTo(map);
    else map.removeLayer(layer);
    countInView();
  });
}

async function start() {
  const blockGroups = await (
    await fetch("data/Tempe_Block_Groups.geojson")
  ).json();
  blocks.addData(blockGroups);
  blocks.addTo(map);

  const transitData = await (await fetch("data/rail_stations.geojson")).json();
  transit.addData(transitData);
  transit.addTo(map);

  const parksData = await (await fetch("data/parks.geojson")).json();
  parks.addData(parksData);

  const healthcareData = await (await fetch("data/Hospitals.geojson")).json();
  healthcare.addData(healthcareData);

  const schoolsData = await (await fetch("data/schools.geojson")).json();
  schools.addData(schoolsData);
  clustered.addLayer(schools);
  clustered.addTo(map);

  const groceryData = await (await fetch("data/grocery_stores.geojson")).json();
  grocery.addData(groceryData);
  groceryCluster.addLayer(grocery);
  groceryCluster.addTo(map);

  countInView();
  document.querySelector("#map-status").textContent =
    "Explore Tempe. Use the checkboxes to show or hide amenities.";
}
start();

//I am adding sample values for age distribution chart, please update them with real values from data

const sampleAgeGroups = {
  under18: 25,
  age18to39: 25,
  age40to64: 25,
  age65plus: 25,
};

function updateAgeDistribution(ages) {
  // this will update the widths of the colord segments in chart
  document.querySelector("#age-bar-under18").style.width = `${ages.under18}%`;
  document.querySelector("#age-bar-18-39").style.width = `${ages.age18to39}%`;
  document.querySelector("#age-bar-40-64").style.width = `${ages.age40to64}%`;
  document.querySelector("#age-bar-65plus").style.width = `${ages.age65plus}%`;

  // this will update the percentages displayed beside the age-group labels
  document.querySelector("#selected-age-under18").textContent =
    `${ages.under18}%`;
  document.querySelector("#selected-age-18-39").textContent =
    `${ages.age18to39}%`;
  document.querySelector("#selected-age-40-64").textContent =
    `${ages.age40to64}%`;
  document.querySelector("#selected-age-65plus").textContent =
    `${ages.age65plus}%`;

  // this will describe the age-group chart for screen-reader users
  document
    .querySelector(".age-bar")
    .setAttribute(
      "aria-label",
      `Age Distribution: Under 18, ${ages.under18}%; ` +
        `18-39, ${ages.age18to39}%; ` +
        `40-64, ${ages.age40to64}%; ` +
        `65 and older, ${ages.age65plus}%.`,
    );
}
updateAgeDistribution(sampleAgeGroups);

const amountInputs = document.querySelectorAll(
  "#rent-min, #rent-max, #value-min, #value-max",
);

function formatAmountInput(input) {
  const rawValue = input.value.replaceAll(",", "").trim();

  if (rawValue === "") return;

  const number = Number(rawValue);
  if (Number.isFinite(number) && number >= 0) {
    input.value = number.toLocaleString("en-US");
  }
}

for (const input of amountInputs) {
  //Format the initial value
  formatAmountInput(input);

  //Remove commas while the user edits
  input.addEventListener("focus", () => {
    input.value = input.value.replaceAll(",", "");
  });

  //Restore commas when the user leaves the field
  input.addEventListener("blur", () => {
    formatAmountInput(input);
  });
}

const filterForm = document.querySelector("#housing-filters");

filterForm.addEventListener("reset", () => {
  //Format the defaults after the browser restores them
  requestAnimationFrame(() => {
    amountInputs.forEach(formatAmountInput);
  });
});

filterForm.addEventListener("submit", (event) => {
  //Prevent a page reload, preserving the entered values
  event.preventDefault();

  //This section of code filters the map
});

const aboutDialog = document.querySelector("#about-dialog");
document.querySelector("#open-about").addEventListener("click", () => {
  aboutDialog.showModal();
});
document.querySelector("#close-about").addEventListener("click", () => {
  aboutDialog.close();
});

const dataDialog = document.querySelector("#data-dialog");
document.querySelector("#open-data").addEventListener("click", () => {
  dataDialog.showModal();
});
document.querySelector("#close-data").addEventListener("click", () => {
  dataDialog.close();
});

const contactDialog = document.querySelector("#contact-dialog");
document.querySelector("#open-contact").addEventListener("click", () => {
  contactDialog.showModal();
});
document.querySelector("#close-contact").addEventListener("click", () => {
  contactDialog.close();
});
