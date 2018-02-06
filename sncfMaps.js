const {get} = require('axios')
const moment = require('moment')

const sncfMapsPrefix = `http://sncf-maps.hafas.de/carto/livemaps?service=journeygeopos&rect=-6870482,42935610,13168580,51453391&i=35000&is=10000&prod=27&date=`
const geolocationUrl = 'http://www.sncf.com/fr/geolocalisation'
const defaultHeaders = {headers:{Referer: geolocationUrl}}

const read = (jnyL, prodL, remL, locL) => jnyL
    .map(train => Object.assign(train, prodL[train.prodX], {remarks:Array.from(new Set(train.remL)).map(rem => Object.assign(rem, remL[rem.remX])),
        lines:train.ani && Array.from(new Set(train.ani.fLocX)).map(loc => locL[loc])}))
    .map(train => Object.assign(train, {names:train.remarks.filter(r => r.code = 'FD').map(r => r.txtN)}))
    .map(train => Object.assign(train, {number:(train.names.map(name => name.match(/\s*[0-9]+$/) && parseInt(name.match(/\s*([0-9]+)$/)[1])) || [])[0]}))
    .map(train => Object.assign(train, {coords:{lat:train.pos.y / 1E6, long:train.pos.x / 1E6}}))

const realTimeTrains = () => get(`${sncfMapsPrefix}${moment().format('YYYYMMDD')}&time=${moment().format('HHmm00')}&tpm=REPORT_ONLY&its=CT|INTERNATIONAL,CT|TGV,CT|INTERCITE,CT|TER,CT|TRANSILIEN&un=true&livemapCallback=`, defaultHeaders)
    .then(({data:{svcResL:[{res:{common:{prodL,remL,locL},jnyL}}]}}) => read(jnyL, prodL, remL, locL))

const realTimeRER = () => get(`${sncfMapsPrefix}${moment().format('YYYYMMDD')}&time=${moment().format('HHmm00')}&livemapCallback=`, defaultHeaders)
    .then(({data:{svcResL:[{res:{common:{prodL,remL,locL},jnyL}}]}}) => read(jnyL, prodL, remL, locL))

const sncfMapsUpdate = () => Promise.all([realTimeTrains(), realTimeRER()])
    .then(([trains, rer]) => trains.concat(rer))
    .then(trains => trains.reduce((acc, train) => Object.assign(acc, {[train.number]:train.coords}), {}))

module.exports = {sncfMapsUpdate}
