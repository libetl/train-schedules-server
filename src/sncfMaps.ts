import { getDate, getTime } from "./dateShortcuts";
import { fetch } from "./quickFetch";

const sncfMapsPrefix = `http://sncf-maps.hafas.de/carto/livemaps?service=journeygeopos&rect=-6870482,42935610,13168580,51453391&i=350000&is=10000&prod=27&date=`;
const geolocationUrl = "http://www.sncf.com/fr/geolocalisation";
const defaultHeaders = { headers: { Referer: geolocationUrl } };

const read = (jnyL: any, prodL: any, remL: any, locL: any) =>
  jnyL
    .map((train: any) =>
      Object.assign(train, prodL[train.prodX as number], {
        remarks: Array.from(new Set(train.remL)).map((rem: any) =>
          Object.assign(rem, remL[rem.remX])
        ),
        lines:
          train.ani &&
          Array.from(new Set(train.ani.fLocX)).map((loc: any) => locL[loc]),
      })
    )
    .map((train) =>
      Object.assign(train, {
        names: train.remarks.filter((r) => (r.code = "FD")).map((r) => r.txtN),
      })
    )
    .map((train) =>
      Object.assign(train, {
        number: (train.names.map(
          (name) =>
            name.match(/\s*[0-9]+$/) && parseInt(name.match(/\s*([0-9]+)$/)[1])
        ) || [])[0],
      })
    )
    .map((train) =>
      Object.assign(train, {
        coords: { lat: train.pos.y / 1e6, long: train.pos.x / 1e6 },
      })
    );

const realTimeTrains = () =>
  (fetch(
    `${sncfMapsPrefix}${getDate()}&time=${getTime().replace(
      /[0-9]{2}$/,
      "00"
    )}&tpm=REPORT_ONLY&its=CT|INTERNATIONAL,CT|TGV,CT|INTERCITE,CT|TER,CT|TRANSILIEN&un=true&livemapCallback=`,
    defaultHeaders
  ) as Promise<any>).then(
    ({
      data: {
        svcResL: [
          {
            res: {
              common: { prodL, remL, locL },
              jnyL,
            },
          },
        ],
      },
    }) => read(jnyL, prodL, remL, locL)
  );

const realTimeRER = () =>
  (fetch(
    `${sncfMapsPrefix}${getDate()}&time=${getTime().replace(
      /[0-9]{2}$/,
      "00"
    )}&livemapCallback=`,
    defaultHeaders
  ) as Promise<any>).then(
    ({
      data: {
        svcResL: [
          {
            res: {
              common: { prodL, remL, locL },
              jnyL,
            },
          },
        ],
      },
    }) => read(jnyL, prodL, remL, locL)
  );

export const sncfMapsUpdate = () =>
  Promise.all([realTimeTrains(), realTimeRER()])
    .then(([trains, rer]) => trains.concat(rer))
    .then((trains) =>
      trains.reduce(
        (acc, train) => Object.assign(acc, { [train.number]: train.coords }),
        {}
      )
    );
