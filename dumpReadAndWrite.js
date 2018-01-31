const fs = require('fs')
const bfj = require('bfj')
const moment = require('moment')
const sources = require('./sources')
const readDumps = require('./readDumps')

const updateWithoutWrite = gtfs => readDumps(sources)
    .then(updatedGtfs => Object.assign(gtfs, updatedGtfs, {freshness: moment().format('YYYY-MM-DDTHH:mm:ss')}))

const update = gtfs => updateWithoutWrite(gtfs)
    .then(() => bfj.write('./savedGtfs.dump.inprogress', gtfs))
    .then(() => new Promise(resolve => fs.rename('./savedGtfs.dump.inprogress', './savedGtfs.dump', resolve)))

const wakeUpDumpIfNecessary = dump => dump.agency ? Promise.resolve({}) : new Promise(resolve =>
    fs.stat('./savedGtfs.dump', (err => console.log(err) && err ? resolve({}) :
        fs.readFile('./savedGtfs.dump', 'utf8', (err, data) => resolve(Object.assign(dump, JSON.parse(data)))))))

module.exports = {updateWithoutWrite, update, wakeUpDumpIfNecessary}
