"use strict";

window.browser = window.browser || window.chrome;
import commonHelper from './common.js'

const targets = /^https?:\/{2}(((www|maps)\.)?(google\.).*(\/maps)|maps\.(google\.).*)/;
let redirects = {
  'osm': {
    "normal": [
      "https://openstreetmap.org"
    ]
  },
  'facil': {
    "normal": [
      "https://facilmap.org"
    ]
  }
};
const mapCentreRegex = /@(-?\d[0-9.]*),(-?\d[0-9.]*),(\d{1,2})[.z]/;
const dataLatLngRegex = /(!3d|!4d)(-?[0-9]{1,10}.[0-9]{1,10})/g;
const placeRegex = /\/place\/(.*)\//;
const travelModes = {
  driving: "fossgis_osrm_car",
  walking: "fossgis_osrm_foot",
  bicycling: "fossgis_osrm_bike",
  transit: "fossgis_osrm_car", // not implemented on OSM, default to car.
};
const osmLayers = {
  none: "S",
  transit: "T",
  traffic: "S", // not implemented on OSM, default to standard.
  bicycling: "C",
};

function addressToLatLng(address, callback) {
  const xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = () => {
    if (xmlhttp.readyState === XMLHttpRequest.DONE) {
      if (xmlhttp.status === 200) {
        const json = JSON.parse(xmlhttp.responseText)[0];
        if (json) callback(
          `${json.lat},${json.lon}`,
          `${json.boundingbox[2]},${json.boundingbox[1]},${json.boundingbox[3]},${json.boundingbox[0]}`
        );
      } else
        console.info("Error: Status is " + xmlhttp.status);
    }
  };
  xmlhttp.open(
    "GET",
    `https://nominatim.openstreetmap.org/search/${address}?format=json&limit=1`,
    false
  );
  xmlhttp.send();
}

let disable;
const getDisable = () => disable;
function setDisable(val) {
  disable = val;
  browser.storage.local.set({ disableMaps: disable })
  console.log("disableMaps: ", disable)
}

let frontend;
const getFrontend = () => frontend;
function setFrontend(val) {
  frontend = val;
  browser.storage.local.set({ mapsFrontend: frontend })
  console.log("mapsFrontend: ", frontend)
};

function redirect(url, initiator) {

  if (disable) return;
  if (initiator && initiator.host === "earth.google.com") return;
  if (!url.href.match(targets)) return;

  let randomInstance;
  if (frontend == 'osm') randomInstance = commonHelper.getRandomInstance(redirects.osm.normal);
  if (frontend == 'facil') randomInstance = commonHelper.getRandomInstance(redirects.facil.normal);

  let mapCentre = "#";
  let prefs = {};

  // Set map centre if present
  if (url.pathname.match(mapCentreRegex)) {
    var [, lat, lon, zoom] = url.pathname.match(mapCentreRegex);
  } else if (url.searchParams.has("center")) {
    var [lat, lon] = url.searchParams.get("center").split(",");
    var zoom = url.searchParams.get("zoom") ?? "17";
  }

  if (lat && lon && zoom) {
    if (frontend == 'osm') mapCentre = `#map=${zoom}/${lat}/${lon}`;
    if (frontend == 'facil') mapCentre = `#${zoom}/${lat}/${lon}`;

    console.log("lat", lat) // vertical
    console.log("lon", lon) // horizontal
    console.log("zoom", zoom);
  }

  if (url.searchParams.get("layer")) prefs.layers = osmLayers[url.searchParams.get("layer")];

  // Handle Google Maps Embed API
  if (url.pathname.includes("/embed")) {
    let query = "";
    if (url.searchParams.has("q")) query = url.searchParams.get("q");
    else if (url.searchParams.has("query")) query = url.searchParams.has("query");

    else if (url.searchParams.has("pb"))
      try { query = url.searchParams.get("pb").split(/!2s(.*?)!/)[1]; }
      catch (error) { console.error(error); } // Unable to find map marker in URL.

    addressToLatLng(
      query,
      (coords, boundingbox) => {
        prefs.bbox = boundingbox;
        prefs.marker = coords;
      }
    );
    prefs.layer = "mapnik";

    let prefsEncoded = new URLSearchParams(prefs).toString();
    if (frontend == 'osm') return `${randomInstance}/export/embed.html?${prefsEncoded}`;

  } else if (url.pathname.includes("/dir")) {   // Handle Google Maps Directions
    if (url.searchParams.has("travelmode")) prefs.engine = travelModes[url.searchParams.get("travelmode")];

    let origin; addressToLatLng(url.searchParams.get("origin"), a => origin = a);
    let destination; addressToLatLng(url.searchParams.get("destination"), a => destination = a);
    prefs.route = `${origin};${destination}`;

    let prefsEncoded = new URLSearchParams(prefs).toString();
    if (frontend == 'osm') return `${randomInstance}/directions?${prefsEncoded}${mapCentre}`;
  } else if (url.pathname.includes("data=") && url.pathname.match(dataLatLngRegex)) {  // Get marker from data attribute
    console.log("data life");

    const [mlat, mlon] = url.pathname.match(dataLatLngRegex);
    prefs.mlat = mlat.replace("!3d", "");
    prefs.mlon = mlon.replace("!4d", "");

    // Get marker from ll param
  } else if (url.searchParams.has("ll")) {
    console.log("ll life");

    const [mlat, mlon] = url.searchParams.get("ll").split(",");
    prefs.mlat = mlat;
    prefs.mlon = mlon;

    // Get marker from viewpoint param.
  } else if (url.searchParams.has("viewpoint")) {
    console.log("viewpoint life");

    const [mlat, mlon] = url.searchParams.get("viewpoint").split(",");
    prefs.mlat = mlat;
    prefs.mlon = mlon;

    // Use query as search if present.
  } else {
    console.log("normal life");

    let query;
    if (url.searchParams.has("q")) query = url.searchParams.get("q");
    else if (url.searchParams.has("query")) query = url.searchParams.get("query");
    else if (url.pathname.match(placeRegex)) query = url.pathname.match(placeRegex)[1];

    let prefsEncoded = new URLSearchParams(prefs).toString();
    if (query) {
      if (frontend == 'osm') return `${randomInstance}/search?query="${query}${mapCentre}&${prefsEncoded}`;
      if (frontend == 'facil') return `${randomInstance}/${mapCentre}/Mpnk/${query}`
    }
  }

  let prefsEncoded = new URLSearchParams(prefs).toString();
  console.log("prefs", prefs);
  console.log("prefsEncoded", prefsEncoded)
  if (frontend == 'osm') return `${randomInstance}/${mapCentre}&${prefsEncoded}`
  if (frontend == 'facil') return `${randomInstance}/${mapCentre}/Mpnk`
}

async function init() {
  return new Promise(
    resolve => {
      browser.storage.local.get(
        [
          "disableMaps",
          "mapsFrontend"
        ],
        r => {
          disable = r.disableMaps ?? false
          frontend = r.mapsFrontend ?? 'osm'
          resolve();
        }
      );
    });
}

export default {
  getDisable,
  setDisable,

  getFrontend,
  setFrontend,

  redirect,
  init,
};
