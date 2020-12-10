const defaultOptions = require('./default-options');

const getOwnPropertyNames = (obj) => {
  const newObj = JSON.parse(JSON.stringify(obj, Object.getOwnPropertyNames(obj)));

  Object.getOwnPropertyNames(newObj).forEach((key) => {
    if (newObj[key] instanceof Object) {
      newObj[key] = getOwnPropertyNames(obj[key]);
    }
  });

  return newObj;
};

const expose = (error, opts) => {
  if (error.toJSON) {
    return error.toJSON();
  }

  return Object.assign(
    {},
    (opts.getOwnProperties && getOwnPropertyNames(error)),
    JSON.parse(JSON.stringify(error, opts.whitelist),
  ));
};

module.exports = (opts) => (event) => {
  const options = Object.assign(defaultOptions, opts);

  if (event.level !== 'error') {
    return event;
  }

  if (event.data instanceof Error) {
    event.data = expose(event.data, options);
    return event;
  }

  if (event.data instanceof Object) {
    Object.keys(event.data).forEach((key) => {
      if (event.data[key] instanceof Error) {
        event.data[key] = expose(event.data[key], options);
      }
    });
  }

  return event;
};
