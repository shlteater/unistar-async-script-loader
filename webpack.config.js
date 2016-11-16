'use strict';

var webpack = require('webpack')

var env = process.env.NODE_ENV
var config = {
  entry: {
      index: './src/index.ts'
  },
  module: {
    loaders: [
      { test: /\.ts$/, loaders: ['ts-loader'], exclude: /node_modules/ }
    ]
  },
  output: {
    path: 'dist',
    filename: '[name].js'
  },
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env)
    })
  ]
};

// if (env === 'production') {
//   config.plugins.push(
//     new webpack.optimize.UglifyJsPlugin({
//       compressor: {
//         pure_getters: false,
//         unsafe: false,
//         unsafe_comps: false,
//         warnings: false
//       }
//     })
//   )

//   config.output.filename = '[name].min.js';
// }

module.exports = config
