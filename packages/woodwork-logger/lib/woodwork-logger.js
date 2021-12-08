const {
  AUTO_FLUSH_LEVEL,
  FLUSH_INTERVAL,
  LEVELS,
} = require('./constants');
const clientIdUtils = require('./client-id');
const merge = require('./merge');
const safeInterval = require('./safe-interval');

const instances = {};
function WoodworkLogger(name, opts) {
  this.name = name;
  this.opts = opts;
  this.events = [];
  this.interceptors = this.opts.interceptors || [];
}

const proto = WoodworkLogger.prototype;

WoodworkLogger.create = function create(name, opts) {
  if (instances[name]) {
    return instances[name];
  }

  const logger = new WoodworkLogger(name, merge({ clientId: clientIdUtils.getClientId() }, opts));
  instances[name] = logger;

  typeof window !== 'undefined'
    && safeInterval(logger.flush.bind(logger), FLUSH_INTERVAL);

  return logger;
}

WoodworkLogger.get = function get(name) {
  if (!instances[name]) {
    throw new Error(`No instance found: ${name}`);
  }

  return instances[name];
}

proto.flush = function flush() {
  if (!this.events) {
    return;
  }

  if (this.opts.request) {
    this.opts.request(this.events);
  }

  this.events = [];
}

proto.log = function log(level, event, data) {
  const payload = this.interceptors.reduce((seq, fn) => (
    fn(seq)
  ), {
    level,
    event,
    service: this.name,
    clientId: this.opts.clientId,
    data,
  });

  this.events.push(payload);

  if (AUTO_FLUSH_LEVEL.indexOf(level) !== -1) {
    this.flush();
  }
}

for (let level of LEVELS) {
  proto[level] = function(event, data) {
    this.log(level, event, data || {});
  };
}

module.exports = WoodworkLogger;
