const {get} = require('axios')
const moment = require('moment')

const delays = (datetime = moment()) => !process.env.TOKEN ? Promise.resolve({stopPoints:{}, savedNumbers:{}}) :
    get(`https://api.sncf.com/v1/coverage/sncf/disruptions/?since=${datetime.format('YYYY-MM-DDTHHmmss')}&count=1000`,
        {headers:{Authorization: process.env.TOKEN }})
        .then(({data:{disruptions}}) => ({stopPoints: disruptions.filter(disruption => disruption.status !== 'past')
            .map(disruption => disruption.impacted_objects.map(impactedObject =>
                (impactedObject.impacted_stops||[]).map(impactedStop =>
                ({data: disruption, timetableChange: impactedStop,
                    stopId: impactedStop.stop_point.id, savedNumber: parseInt(impactedObject.pt_object.trip.name)}))))
            .reduce((acc, value) => acc.concat(value), []).reduce((acc, value) => acc.concat(value), [])
            .reduce((acc, value) => Object.assign(acc, {[`${value.stopId}-${value.savedNumber}`] : value}), {}),
        savedNumbers: disruptions.filter(disruption => disruption.status !== 'past')
            .map(disruption => disruption.impacted_objects.map(impactedObject =>
                    ({data: disruption, savedNumber: parseInt(impactedObject.pt_object.trip.name)})))
            .reduce((acc, value) => acc.concat(value), []).reduce((acc, value) => acc.concat(value), [])
            .reduce((acc, value) => Object.assign(acc, {[value.savedNumber] : acc[value.savedNumber]||value}), {})}))

module.exports = {delays}