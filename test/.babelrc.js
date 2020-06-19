const presets = [
  [
    "@babel/env",
    {
      "targets": {
        "ie": "11",
        "edge": "17",
        "firefox": "61",
        "chrome": "49",
        "safari": "11.2"
      },
      "useBuiltIns": "entry",
      "corejs": 3,
      "modules": false // for rollup.js
    }
  ]
];

const plugins = ['@babel/plugin-transform-runtime'];

module.exports = { presets, plugins };
