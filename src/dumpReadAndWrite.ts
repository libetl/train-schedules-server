import { writeFile, rename, stat, readFile } from "fs";
import { list as sources } from "./sources";
import { readDumps } from "./readDumps";

export const updateWithoutWrite = (gtfs, sourcesOverride = []) =>
  readDumps(
    sourcesOverride?.length ? sourcesOverride : sources
  ).then((updatedGtfs) =>
    Object.assign(gtfs, updatedGtfs, { freshness: new Date().toISOString() })
  );

export const update = (gtfs, sourcesOverride) =>
  updateWithoutWrite(gtfs, sourcesOverride)
    .then(
      () =>
        new Promise((resolve) =>
          writeFile(
            "./savedGtfs.dump.inprogress",
            JSON.stringify(gtfs),
            resolve
          )
        )
    )
    .then(
      () =>
        new Promise((resolve) =>
          rename(
            "./savedGtfs.dump.inprogress",
            "./savedGtfs.dump.json",
            resolve
          )
        )
    );

export const wakeUpDumpIfNecessary = (dump) =>
  dump.agency
    ? Promise.resolve({})
    : new Promise((resolve) =>
        stat("./savedGtfs.dump.json", (err) => {
          if (err) {
            console.log(err);
            resolve({});
          }
          return readFile("./savedGtfs.dump.json", (_, data) =>
            resolve(Object.assign(dump, JSON.stringify(data)))
          );
        })
      );
