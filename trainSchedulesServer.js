const readDumps = require('./readDumps')
const haversine = require('./haversine')
const {nearestTo, timetable, asDeparturesData} = require('./timetable')
const moment = require('moment')
const express = require('express')
const fs = require('fs')
const bfj = require('bfj')

const sources = [
    'https://ressources.data.sncf.com/explore/dataset/sncf-ter-gtfs/files/24e02fa969496e2caa5863a365c66ec2/download/',
    'https://ressources.data.sncf.com/explore/dataset/sncf-intercites-gtfs/files/ed829c967a0da1252f02baaf684db32c/download/',
    'https://ressources.data.sncf.com/explore/dataset/sncf-transilien-gtfs/files/023d3733775238ae2e431e3613812bae/download/']

const gtfs = {}
const app = express()

const update = () => readDumps(sources)
    .then(updatedGtfs => Object.assign(gtfs, updatedGtfs, {freshness: moment().format('YYYY-MM-DDTHH:mm:ss')}) &&
        bfj.write('./savedGtfs.dump.inprogress', gtfs))
    .then(() => new Promise(resolve => fs.rename('./savedGtfs.dump.inprogress', './savedGtfs.dump', resolve)))

const wakeUpDumpIfNecessary = gtfs => gtfs.agency ? Promise.resolve({}) : new Promise(resolve =>
    fs.stat('./savedGtfs.dump', (err => err ? resolve({}) :
        fs.readFile('./savedGtfs.dump', 'utf8', (err, data) => resolve(Object.assign(gtfs, JSON.parse(data)))))))


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

app.get('/update', (options, res) => readDumps(sources).then(updatedGtfs => {
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

update().then(() => console.log('I am all set') && setInterval(update, 1500000))

