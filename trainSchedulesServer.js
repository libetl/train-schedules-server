const moment = require('moment')
const express = require('express')
const haversine = require('./haversine')
const {nearestTo, timetable, asDeparturesData, withGeolocation} = require('./timetable')
const {updateWithoutWrite} = require('./dumpReadAndWrite')
const {sncfMapsUpdate} = require('./sncfMaps')

const gtfs = {}
const sncfMaps = {}
const app = express()

const workWith = ({res, gtfs, coords, date, time}) => {
    const coordinates = {lat: parseFloat(coords.split(',')[0]), long: parseFloat(coords.split(',')[1])}
    const stopPoints = nearestTo(coordinates, gtfs)
    const stationCoords = stopPoints.length &&
        {lat: parseFloat(stopPoints[0].stop_lat), long: parseFloat(stopPoints[0].stop_lon)}
    const distanceKilometers = stopPoints.length && haversine(coordinates, stationCoords)
    res.set('Content-Type', 'application/json')
    res.send({departures:
            withGeolocation(stationCoords, asDeparturesData(timetable({gtfs, stopPoints, date, time})), sncfMaps),
        stationName: (stopPoints[0] || {}).stop_name || 'no station nearby', date, time, distanceKilometers})}

app.get('/coords/:coords', ({params:{coords}}, res) => workWith(
    {res, gtfs, coords, date: moment().format('YYYYMMDD'), time: moment().format('HH:mm:ss')}))

app.get('/coords/:coords/date/:date', ({params:{coords, date}}, res) => workWith(
    {res, gtfs, coords, date, time: '00:00:00'}))

app.get('/coords/:coords/date/:date/time/:time', ({params:{coords, date, time}}, res) => workWith(
    {res, gtfs, coords, date, time}))

app.get('/update', (options, res) => new Promise(resolve => {
    const freshness = moment().format('YYYY-MM-DDTHH:mm:ss')
    res.set('Content-Type', 'application/json')
    res.send({status: 'inprogress', newFreshness: freshness})
    resolve()}).then(freshness =>
        updateWithoutWrite(gtfs)
            .then(updatedGtfs => Object.assign(gtfs, updatedGtfs, {freshness}))))

app.get('/freshness', (options, res) => res.set('Content-Type', 'application/json') &&
    res.send({freshness: gtfs.freshness || 'no data read yet',
        links:{update: '/update'}}))

app.get('/updateGeoloc', (options, res) => res.set('Content-Type', 'application/json') &&
    sncfMapsUpdate().then(newMap => Object.assign(sncfMaps, newMap)).then(() => res.send({status:'ok'})))

app.get('/', (options, res) => res.set('Content-Type', 'application/json') &&
    res.send({links:{update: '/update',
            freshness: '/freshness',
            nextDeparturesAndArrivals : '/coords/{lat},{long}',
            schedulesByDayAtStation : '/coords/{lat},{long}/date/{YYYYMMDD}',
            schedulesBetweenDateTimeAndMidnightAtStation :
                '/coords/{lat},{long}/date/{YYYYMMDD}/time/{HH}:{mm}:{ss}',
            updateGeoloc :
                '/updateGeoloc'}}))

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'), () => console.log(`Train schedule server on port ${app.get('port')}`))

updateWithoutWrite(gtfs)
    .then(updatedGtfs => Object.assign(gtfs, updatedGtfs, {freshness: moment().format('YYYY-MM-DDTHH:mm:ss')}))
    .then(() => sncfMapsUpdate()).then(newMap => Object.assign(sncfMaps, newMap))
    .then(() => console.log('I am all set'))

setInterval(() => sncfMapsUpdate().then(newMap => Object.assign(sncfMaps, newMap)), 60000)

