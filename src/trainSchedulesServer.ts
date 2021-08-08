import { IncomingMessage, createServer, ServerResponse } from "http";

import { haversine } from "./haversine";
import {
  nearestTo,
  timetable,
  asDeparturesData,
  withGeolocation,
} from "./timetable";
import { updateWithoutWrite } from "./dumpReadAndWrite";
import { sncfMapsUpdate } from "./sncfMaps";
import { delays } from "./navitiaDelays";
import { getDate, getTime } from "./dateShortcuts";

const gtfs = {};
const geoloc = { sncfMaps: {} };
const sncfApiDelays = { savedNumbers: {}, stopPoints: {} };
const coordsUrlPrefix = /\/coords\/[0-9]{1,3}(?:\.[0-9]+)?,[0-9]{1,3}(?:\.[0-9]+)?/;
const dateSuffix = /\/date\/[0-9]{8}/;
const timeSuffix = /\/time\/[0-9]{2}:[0-9]{2}:[0-9]{2}/;
const port = process.env.PORT || 5000;

updateWithoutWrite(gtfs)
  .then((updatedGtfs) =>
    Object.assign(gtfs, updatedGtfs, { freshness: new Date().toISOString() })
  )
  .then(() => sncfMapsUpdate())
  .then((newMap) => Object.assign(geoloc, { sncfMaps: newMap }))
  .then(() => console.log("I am all set"));

setInterval(
  () =>
    sncfMapsUpdate().then((newMap) =>
      Object.assign(geoloc, { sncfMaps: newMap })
    ),
  60000
);
setInterval(
  () =>
    delays().then((foundDelays) => Object.assign(sncfApiDelays, foundDelays)),
  120000
);

createServer((req: IncomingMessage, res: ServerResponse) => {
  const date = req.url.match(dateSuffix)?.[1] ?? getDate();
  const time = req.url.match(timeSuffix)?.[1] ?? getTime();

  if (req.url?.match(coordsUrlPrefix)) {
    const coords = req.url!.substring(req.url.indexOf("/coords/") + 8);
    const coordinates = {
      lat: parseFloat(coords.split(",")[0]),
      long: parseFloat(coords.split(",")[1]),
    };
    const stopPoints = nearestTo(coordinates, gtfs);
    const stationCoords = stopPoints.length && {
      lat: parseFloat(stopPoints[0].stop_lat),
      long: parseFloat(stopPoints[0].stop_lon),
    };
    const distanceKilometers =
      stopPoints.length && haversine(coordinates, stationCoords);
    res.writeHead(200, "OK", {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(
      JSON.stringify({
        departures: withGeolocation(
          stationCoords,
          asDeparturesData(
            timetable({ delays: sncfApiDelays, gtfs, stopPoints, date, time })
          ),
          geoloc.sncfMaps
        ),
        stationName: (stopPoints[0] || {}).stop_name || "no station nearby",
        date,
        time,
        distanceKilometers,
      })
    );
    res.end();
    return;
  }
  res.writeHead(200, "OK", {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });

  if (req.url.match(/\/update\/?$/)) {
    const freshness = new Date().toISOString();
    res.write(
      JSON.stringify({ status: "inprogress", newFreshness: freshness })
    );
    res.end();
    setImmediate(() =>
      updateWithoutWrite(gtfs).then((updatedGtfs) =>
        Object.assign(gtfs, updatedGtfs, { freshness })
      )
    );
    return;
  }

  if (req.url.match(/\/freshness\/?$/)) {
    res.write(
      JSON.stringify({
        freshness: (gtfs as any).freshness || "no data read yet",
        links: { update: "/update" },
      })
    );
    res.end();
    return;
  }

  if (req.url.match(/\/updateGeoloc\/?$/)) {
    sncfMapsUpdate()
      .then((newMap) => Object.assign(geoloc, { sncfMaps: newMap }))
      .then(() => res.write(JSON.stringify({ status: "ok" })))
      .then(() => res.end())
    return;
  }

  if (req.url.match(/\/updateDelays\/?$/)) {
    res.write(JSON.stringify({ status: "inprogress" }));
    res.end();
    setImmediate(() =>
      delays().then((foundDelays) => Object.assign(sncfApiDelays, foundDelays))
    );
    return;
  }

  if (req.url.match(/\/delays\/?$/)) {
    res.write(
      JSON.stringify({ sncfApiDelays, links: { update: "/updateDelays" } })
    );
    res.end();
    return;
  }

  if (req.url.match(/\/geoloc\/?$/)) {
    res.write(
      JSON.stringify({
        sncfMaps: geoloc.sncfMaps,
        links: { update: "/updateGeoloc" },
      })
    );
    res.end();
    return;
  }

  res.write(
    JSON.stringify({
      links: {
        nextDeparturesAndArrivals: "/coords/{lat},{long}",
        schedulesByDayAtStation: "/coords/{lat},{long}/date/{YYYYMMDD}",
        schedulesBetweenDateTimeAndMidnightAtStation:
          "/coords/{lat},{long}/date/{YYYYMMDD}/time/{HH}:{mm}:{ss}",
        update: '/update',
        freshness: '/freshness',
        delays: '/delays',
        updateDelays:
          '/updateDelays',
        geoloc: '/geoloc',
        updateGeoloc:
          '/updateGeoloc'
      },
    })
  );
  res.end();
}).listen(port, () => console.log(`Train schedule server on port ${port}`));
