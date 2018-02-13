const gtfs = require('./savedGtfs.dump.json')
const moment = require('moment')
const {sncfMapsUpdate} = require('./sncfMaps')
const {timetable, withGeolocation, asDeparturesData, nearestTo} = require('./timetable')

const coords = {lat: parseFloat(process.argv[2]), long: parseFloat(process.argv[3])}
const withMapsUpdate = process.argv[4]
const stopPoints = nearestTo(coords, gtfs)
const stationCoords = {lat: parseFloat(stopPoints[0].stop_lat), long: parseFloat(stopPoints[0].stop_lon)}
const date = moment().add(4, 'days').format('YYYYMMDD')
const time = '00:00:00'

;(withMapsUpdate ? sncfMapsUpdate() : Promise.resolve({})).then(sncfMaps =>
    console.log(JSON.stringify(
        withGeolocation(stationCoords,
            asDeparturesData(timetable({gtfs, stopPoints, date, time})), sncfMaps), null, 2)))
