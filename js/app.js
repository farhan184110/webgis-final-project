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

map.createPane("blocksPane").style.zIndex = 300;
let current = null; // the block group that's selected right now
const selectedStyle = { color: "#8c1d40", weight: 4 };

const blocks = L.geoJSON(null, {
  pane: "blocksPane",
  style: cityStyle,
  onEachFeature: (f, layer) => {
    layer.on("click", (e) => {
      if (current) blocks.resetStyle(current);
      current = layer;
      layer.setStyle(selectedStyle);
      showDetails(f.properties);
      L.DomEvent.stopPropagation(e);
    });
  },
});

// Point icons
const busIcon = L.icon({
    iconUrl: "images/busStop.png",
    iconSize: [20, 20],
    popupAnchor: [0, -5],
    tooltipAnchor: [5, 0]
});
const railIcon = L.icon({
    iconUrl: "images/lightRail.png",
    iconSize: [20, 20],
    popupAnchor: [0, -5],
    tooltipAnchor: [5, 0]
});
const schoolIcon = L.icon({
    iconUrl: "images/school.png",
    iconSize: [25, 25],
    popupAnchor: [0, -10],
    tooltipAnchor: [10, 0]
});
const groceryIcon = L.icon({
    iconUrl: "images/grocery.png",
    iconSize: [25, 25],
    popupAnchor: [0, -10],
    tooltipAnchor: [10, 0]
});
const hospitalIcon = L.icon({
    iconUrl: "images/hospital.png",
    iconSize: [25, 25],
    popupAnchor: [0, -10],
    tooltipAnchor: [10, 0]
});

let filters = null; // stays null until Apply Filters is pressed
function cityStyle(f) {
  return { fillColor: "#999", color: "#555", weight: 1, fillOpacity: 0.6 };
}

const transit = L.geoJSON(null, {
  pointToLayer: (f, latlng) =>
    L.marker(latlng, { icon: railIcon }),
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindTooltip(p.name);
    layer.bindPopup(`${p.name}<br>${p.service}<br>${p.city}`);
  },
});
const bus = L.geoJSON(null, {
  pointToLayer: (f, latlng) => L.marker(latlng, { icon: busIcon }),
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindTooltip(p.stop_name);
    layer.bindPopup(`${p.stop_name}<br>Routes: ${p.Routes}<br>Shelter: ${p.Shelter ?? "not reported"}`);
  },
});
const busCluster = L.markerClusterGroup();

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
      `${p.ParkName}<br>${p.ParkClass}<br>${p.ParkAddress ?? ""}<br>Hours: ${p.Hours ?? "not listed"}`,
    );
  },
});

const healthcare = L.geoJSON(null, {
  pointToLayer: (f, latlng) =>
    L.marker(latlng, { icon: hospitalIcon }),
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindTooltip(p.FACILITY_NAME);
    layer.bindPopup(
      `${p.FACILITY_NAME}<br>${p.SUBTYPE}<br>${p.ADDRESS}, ${p.CITY}<br>${p.Telephone ?? ""}`,
    );
  },
});

const schools = L.geoJSON(null, {
  pointToLayer: (f, latlng) =>
    L.marker(latlng, { icon: schoolIcon }),
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
    L.marker(latlng, { icon: groceryIcon }),
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
layers.transit = L.layerGroup([transit, busCluster]);

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
    [grocery, map.hasLayer(groceryCluster)],
    [bus, map.hasLayer(busCluster)]
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
    await fetch("working_data/Tempe_Block_Groups.geojson")
  ).json();
  blocks.addData(blockGroups);
  blocks.addTo(map);

  const transitData = await (await fetch("working_data/rail_stations.geojson")).json();
  transit.addData(transitData);

  const busData = await (await fetch("working_data/bus_stops.geojson")).json();
  bus.addData(busData);
  busCluster.addLayer(bus);

  layers.transit.addTo(map);

  const parksData = await (await fetch("working_data/parks.geojson")).json();
  parks.addData(parksData);

  const healthcareData = await (await fetch("working_data/Hospitals.geojson")).json();
  healthcare.addData(healthcareData);

  const schoolsData = await (await fetch("working_data/schools.geojson")).json();
  schools.addData(schoolsData);
  clustered.addLayer(schools);
  clustered.addTo(map);

  const groceryData = await (await fetch("working_data/grocery_stores.geojson")).json();
  grocery.addData(groceryData);
  groceryCluster.addLayer(grocery);
  groceryCluster.addTo(map);

  countInView();
  document.querySelector("#map-status").textContent =
    "Explore Tempe. Use the checkboxes to show or hide amenities.";
}
start();

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

function money(n) {
  return n == null ? "No data" : `$${n.toLocaleString("en-US")}`;
}
function percent(n) {
  return n == null ? "-" : `${Math.round(n * 100)}%`;
}

function showDetails(p) {
  document.querySelector("#selection-status").textContent = p.NAME;
  document.querySelector("#selected-geoid").textContent = `GEOID: ${p.GEOID}`;

  document.querySelector("#selected-rent").textContent = money(p.MedMonthlyRent);
  document.querySelector("#selected-value").textContent = money(p.MedHomeValue);
  document.querySelector("#selected-income").textContent = money(p.MedHHIncome);

  document.querySelector("#selected-population").textContent = p.TotalPop.toLocaleString("en-US");
  document.querySelector("#selected-age").textContent = p.MedianAge ?? "No data";
  document.querySelector("#selected-renters").textContent =
    `${p.TotHomeRenters.toLocaleString("en-US")} (${percent(p.PctHomeRenters)})`;
  document.querySelector("#selected-owners").textContent =
    `${p.TotHomeOwners.toLocaleString("en-US")} (${percent(p.PctHomeOwners)})`;

  // The Pct fields are fractions (0.43), so multiply by 100 for the bar
  updateAgeDistribution({
    under18: Math.round((p.PctUnder18 ?? 0) * 100),
    age18to39: Math.round((p.Pct18to39 ?? 0) * 100),
    age40to64: Math.round((p.Pct40to64 ?? 0) * 100),
    age65plus: Math.round((p.Pct65Plus ?? 0) * 100),
  });

  document.querySelector("#nearby-transit").textContent =
    `${p.NearTransit} (${p.NearRail} rail, ${p.NearBus} bus)`;
  document.querySelector("#nearby-schools").textContent = p.NearSchools;
  document.querySelector("#nearby-groceries").textContent = p.NearGroceries;
  document.querySelector("#nearby-healthcare").textContent = p.NearHealthcare;
  document.querySelector("#nearby-parks").textContent = p.NearParks;
}

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

// Reads a rent or value box; an empty box means "no limit"
function readAmount(selector, fallback) {
  const raw = document.querySelector(selector).value.replaceAll(",", "").trim();
  return raw === "" ? fallback : Number(raw);
}

function inRange(value, min, max) {
  if (value == null) return false; // no Census estimate, so it can't match this filter
  return value >= min && value <= max;
}

// A filter that's turned off lets every block group through
function matchesFilters(p) {
  const rentOk = !filters.useRent || inRange(p.MedMonthlyRent, filters.rentMin, filters.rentMax);
  const valueOk = !filters.useValue || inRange(p.MedHomeValue, filters.valueMin, filters.valueMax);
  return rentOk && valueOk;
}

const useRent = document.querySelector("#use-rent");
const useValue = document.querySelector("#use-value");

// Disable the boxes for whichever filter is turned off
function syncToggles() {
  document.querySelector("#rent-min").disabled = !useRent.checked;
  document.querySelector("#rent-max").disabled = !useRent.checked;
  document.querySelector("#value-min").disabled = !useValue.checked;
  document.querySelector("#value-max").disabled = !useValue.checked;
}
useRent.addEventListener("change", syncToggles);
useValue.addEventListener("change", syncToggles);
syncToggles();

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

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = document.querySelector("#filter-status");

  if (!useRent.checked && !useValue.checked) {
    filters = null;
    status.textContent = "Turn on rent, home value, or both to filter.";
  } else {
    filters = {
      useRent: useRent.checked,
      useValue: useValue.checked,
      rentMin: readAmount("#rent-min", 0),
      rentMax: readAmount("#rent-max", Infinity),
      valueMin: readAmount("#value-min", 0),
      valueMax: readAmount("#value-max", Infinity),
    };
  }

  blocks.setStyle(cityStyle);
  if (current) current.setStyle(selectedStyle);
  if (!filters) return;

  let n = 0;
  blocks.eachLayer((l) => {
    if (matchesFilters(l.feature.properties)) n += 1;
  });
  status.textContent = `${n} of ${blocks.getLayers().length} block groups match.`;
});

filterForm.addEventListener("reset", () => {
  // Reset puts the checkboxes back without firing "change", so resync the boxes too
  requestAnimationFrame(() => {
    amountInputs.forEach(formatAmountInput);
    syncToggles();
  });

  filters = null;
  blocks.setStyle(cityStyle);
  if (current) current.setStyle(selectedStyle);
  document.querySelector("#filter-status").textContent = "";
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