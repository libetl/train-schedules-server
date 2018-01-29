const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
    entry: './trainSchedulesServer.js',
    target: 'node',
    output: {
      filename: 'bin/trainSchedulesServer.js'
    },
    plugins: [
      new UglifyJsPlugin()
  ]
}
