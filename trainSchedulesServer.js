const moment = require('moment')
const express = require('express')
const haversine = require('./haversine')
const {nearestTo, timetable, asDeparturesData} = require('./timetable')
const {update, updateWithoutWrite, wakeUpDumpIfNecessary} = require('./dumpReadAndWrite')

const gtfs = {}
const app = express()

const workWith = ({res, gtfs, coords, date, time}) => wakeUpDumpIfNecessary(gtfs).then(() => {
    const coordinates = {lat: parseFloat(coords.split(',')[0]), long: parseFloat(coords.split(',')[1])}
    const stopPoints = nearestTo(coordinates, gtfs)
    const distanceKilometers = stopPoints[0] && haversine(coordinates,
        {lat: parseFloat(stopPoints[0].stop_lat), long: parseFloat(stopPoints[0].stop_lon)})
    res.set('Content-Type', 'application/json')
    res.send({departures: asDeparturesData(timetable({gtfs, stopPoints,date, time})),
        stationName: (stopPoints[0] || {}).stop_name || 'no station nearby', date, time, distanceKilometers})})

app.get('/coords/:coords', ({params:{coords}}, res) => workWith(
    {res, gtfs, coords, date: moment().format('YYYYMMDD'), time: moment().format('HH:mm:ss')}))

app.get('/coords/:coords/date/:date', ({params:{coords, date}}, res) => workWith(
    {res, gtfs, coords, date, time: '00:00:00'}))

app.get('/coords/:coords/date/:date/time/:time', ({params:{coords, date, time}}, res) => workWith(
    {res, gtfs, coords, date, time}))

app.get('/update', (options, res) => updateWithoutWrite(gtfs).then(updatedGtfs => {
    const freshness = moment().format('YYYY-MM-DDTHH:mm:ss')
    Object.assign(gtfs, updatedGtfs, {freshness})
    res.set('Content-Type', 'application/json')
    res.send({status: 'done', newFreshness: freshness})}))

app.get('/freshness', (options, res) => res.set('Content-Type', 'application/json') &&
    res.send({freshness: gtfs.freshness || 'no data read yet',
        links:{update: '/update'}}))

app.get('/', (options, res) => res.set('Content-Type', 'application/json') &&
    res.send({links:{update: '/update',
            freshness: '/freshness',
            nextDeparturesAndArrivals : '/coords/{lat},{long}',
            schedulesByDayAtStation : '/coords/{lat},{long}/date/{YYYYMMDD}',
            schedulesBetweenDateTimeAndMidnightAtStation :
                '/coords/{lat},{long}/date/{YYYYMMDD}/time/{HH}:{mm}:{ss}'}}))

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'), () => console.log(`Train schedule server on port ${app.get('port')}`))

update(gtfs).then(() => console.log('I am all set') &&
    setInterval(() =>
        get('https://train-schedules-server.herokuapp.com').then(() => update(gtfs)), 1500000))

