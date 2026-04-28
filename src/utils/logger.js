/**
 * 日志工具
 */

const { DEBUG } = require('./config');

function log(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

function error(...args) {
  console.error(...args);
}

module.exports = {
  log,
  error,
  DEBUG,
};
