const gtfs = require('./savedGtfs.dump.json')
const moment = require('moment')
const {sncfMapsUpdate} = require('./sncfMaps')
const {delays} = require('./navitiaDelays')
const {timetable, withGeolocation, asDeparturesData, nearestTo} = require('./timetable')

const coords = {lat: parseFloat(process.argv[2]), long: parseFloat(process.argv[3])}
const withMapsUpdate = process.argv[4]
const withDelays = process.argv[5]
const stopPoints = nearestTo(coords, gtfs)
const stationCoords = {lat: parseFloat(stopPoints[0].stop_lat), long: parseFloat(stopPoints[0].stop_lon)}
const datetime = moment()
const date = datetime.format('YYYYMMDD')
const time = '00:00:00'

Promise.all([
    withMapsUpdate ? sncfMapsUpdate() : Promise.resolve({}),
    withDelays ? delays() : Promise.resolve({stopPoints:{}, savedNumbers:{}})
    ]).then(([sncfMaps, delays]) =>
        console.log(JSON.stringify(
            withGeolocation(stationCoords,
                asDeparturesData(timetable({gtfs, stopPoints, date, time, delays})), sncfMaps), null, 2)))
