const fs = require('fs')
const bfj = require('bfj')
const moment = require('moment')
const sources = require('./sources')
const readDumps = require('./readDumps')

const updateWithoutWrite = (gtfs, sourcesOverride = sources) => readDumps(sourcesOverride)
    .then(updatedGtfs => Object.assign(gtfs, updatedGtfs, {freshness: moment().format('YYYY-MM-DDTHH:mm:ss')}))

const update = (gtfs, sourcesOverride) => updateWithoutWrite(gtfs, sourcesOverride)
    .then(() => bfj.write('./savedGtfs.dump.inprogress', gtfs))
    .then(() => new Promise(resolve => fs.rename('./savedGtfs.dump.inprogress', './savedGtfs.dump.json', resolve)))

const wakeUpDumpIfNecessary = dump => dump.agency ? Promise.resolve({}) : new Promise(resolve =>
    fs.stat('./savedGtfs.dump.json', (err => console.log(err) && err ? resolve({}) :
        bfj.read('./savedGtfs.dump.json').then(data => resolve(Object.assign(dump, data))))))

module.exports = {updateWithoutWrite, update, wakeUpDumpIfNecessary}
