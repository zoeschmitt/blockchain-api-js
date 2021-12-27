const slsw = require("serverless-webpack");
const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: slsw.lib.entries,
  target: "node",
  mode: "none",
//   externals: ["fs", "bindings", "any-promise"],
};
