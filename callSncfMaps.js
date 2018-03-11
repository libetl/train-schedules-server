const {sncfMapsUpdate} = require('./sncfMaps')

sncfMapsUpdate()
    .then(data => console.log(Object.entries(data).length))