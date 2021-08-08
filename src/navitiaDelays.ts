import { fetch } from "./quickFetch";

export const delays = (datetime = new Date()) =>
  !process.env.TOKEN
    ? Promise.resolve({ stopPoints: {}, savedNumbers: {} })
    : fetch(
        `https://api.sncf.com/v1/coverage/sncf/disruptions/?since=${datetime.toISOString()}&count=1000`,
        { headers: { Authorization: process.env.TOKEN } }
      ).then(({ data: { disruptions } }) => ({
        stopPoints: (disruptions as any[])
          .filter((disruption) => disruption.status !== "past")
          .map((disruption) =>
            (disruption.impacted_objects as any[]).map((impactedObject) =>
              ((impactedObject.impacted_stops as any[]) || []).map(
                (impactedStop) => ({
                  data: disruption,
                  timetableChange: impactedStop,
                  stopId: (impactedStop.stop_point as any).id,
                  savedNumber: parseInt(
                    ((impactedObject.pt_object as any).trip as any)
                      .name as string
                  ),
                })
              )
            )
          )
          .reduce((acc, value) => acc.concat(value), [])
          .reduce((acc, value) => acc.concat(value), [])
          .reduce(
            (acc, value) =>
              Object.assign(acc, {
                [`${value.stopId}-${value.savedNumber}`]: value,
              }),
            {}
          ),
        savedNumbers: (disruptions as any[])
          .filter((disruption) => disruption.status !== "past")
          .map((disruption) =>
            (disruption.impacted_objects as any[]).map((impactedObject) => ({
              data: disruption,
              savedNumber: parseInt(
                ((impactedObject.pt_object as any).trip as any).name as string
              ),
            }))
          )
          .reduce((acc, value) => acc.concat(value), [])
          .reduce((acc, value) => acc.concat(value), [])
          .reduce(
            (acc, value) =>
              Object.assign(acc, {
                [value.savedNumber]: acc[value.savedNumber] || value,
              }),
            {}
          ),
      }));
