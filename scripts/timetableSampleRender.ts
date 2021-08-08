import gtfs from "../savedGtfs.dump.json";
import { sncfMapsUpdate } from "../src/sncfMaps";
import { delays } from "../src/navitiaDelays";
import {
  timetable,
  withGeolocation,
  asDeparturesData,
  nearestTo,
} from "../src/timetable";
import { getDate } from "../src/dateShortcuts";

const coords = {
  lat: parseFloat(process.argv[2]),
  long: parseFloat(process.argv[3]),
};
const withMapsUpdate = process.argv[4];
const withDelays = process.argv[5];
const stopPoints = nearestTo(coords, gtfs);
const stationCoords = {
  lat: parseFloat(stopPoints[0].stop_lat),
  long: parseFloat(stopPoints[0].stop_lon),
};
const date = process.argv[6] || getDate();
const time = "00:00:00";

Promise.all([
  withMapsUpdate ? sncfMapsUpdate() : Promise.resolve({}),
  withDelays ? delays() : Promise.resolve({ stopPoints: {}, savedNumbers: {} }),
]).then(([sncfMaps, delays]) =>
  console.log(
    JSON.stringify(
      withGeolocation(
        stationCoords,
        asDeparturesData(timetable({ gtfs, stopPoints, date, time, delays })),
        sncfMaps
      ),
      null,
      2
    )
  )
);
