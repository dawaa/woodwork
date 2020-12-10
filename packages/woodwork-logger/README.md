# `woodwork-logger`

## Table of Contents
- [Install](#install)
- [Example](#example)
    - [Basic](#basic)
    - [Recommended](#recommended)
- [API](#api)

## Install

```
npm install woodwork-logger
```

## Example

### Basic
```js
const woodwork = require('woodwork-logger');

const logger = woodwork.create('service-a', {
  // This is where you make use of whatever client you
  // have as a dependency to make requests.
  //
  // The following code below is just an example when using e.g. Axios.
  // It's also wise to make use of `navigator.sendBeacon` if available
  // to ensure the request is sent before e.g. redirecting a user
  request: (events) => {
    if (typeof navigator.sendBeacon !== 'undefined') {
      navigator.sendBeacon(`http://backend-service`, JSON.stringify({ events }));
    } else {
      axios.post('http://backend-service', { events });
    }
  },
});

// > Request will be sent every 10th second IF there are events and along with all gathered events during that period
logger.info('Logger initialized');

// > Request is sent immediately along with any events gathered so far
const error = new Error('big bang')
logger.error('Something terrible happened', { error });

// Example payload to service
{
  events: [
    {
      clientId: 'xei3zzhaf', // Random id created by woodwork-logger on initialization
      data: {
        error: {
          message: 'big bang',
          name: 'Error',
          stack: 'Error: big bang ...',
        },
      },
      event: 'Something terrible happened',
      level: 'error',
      service: 'service-a',
    },
  ],
}
```

### Recommended

Create a separate file where you import the logger, create and exports the instance to be used throughout the project.

> Import the logger as early as possible in your frontend project, no need to assign it, but we want it initialized.

```js
// logger.js
const woodwork = require('woodwork-logger');

const logger = woodwork.create('service-a', {
  request: (events) => {
    if (typeof navigator.sendBeacon !== 'undefined') {
      navigator.sendBeacon(`http://backend-service`, JSON.stringify({ events }));
    } else {
      // any client of your choice
    }
  },
});

module.exports = logger;
```

In any other file

```js
// some-component.js
const logger = require('./path/to/logger.js');

logger.info('aw yiss');
```

## API

### `woodwork`

#### `woodwork.create(name: String, options: Object): WoodworkLogger instance`
Creates a new instance of `woodwork-logger`.

##### `name`
The name of the frontend service which you are creating the logger for.

##### `options.clientId: String`
By default the logger will create a unique anonymous `id` for the current client, but in the case where you have retrieved the already created id from example a cookie then you can avoid generating a new one and instead keep using the old id for the user by passing it.

##### `options.interceptors: Array`
An array of "interceptors" that will be run per event logged, from left-to-right or top-to-bottom.

This is for when you need to transform your events before they are passed dispatched to the backend server, one example is [`woodwork-interceptor-error`](../woodwork-interceptor-error/) which looks for an `Error` object and exposes non-enumerable props to be sent to the backend that would otherwise not be sent.

##### `options.request: Function(events: Array)`
It's up to you how you wish to send your logs to the backend. This function is called when dispatching logs and it's here where you make the request with the client of your choice. In the [examples above](#example) `axios` was used.

#### `woodwork.get(name: String): WoodworkLogger instance`
Retrieves an already created instance of `woodwork-logger`.

#### `woodwork.flush(): void`
Is called every 10th second. If an `error`-log is dispatched it will call this function automatically along with any other events that has gathered since the last dispatch.
