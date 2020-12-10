# `woodwork-interceptor-error`

## Table of Contents
- [Install](#install)
- [Example](#example)
- [API](#api)

## Install

```
npm install woodwork-interceptor-error
```

## Example

```js
const woodwork = require('woodwork-logger');
const woodworkInterceptorError = require('woodwork-interceptor-error');

const logger = woodwork.create('service-a', {
  interceptors: [
    woodworkInterceptorError(/* options */),
  ],
  request: (events) => { /* ... code */ },
});
```

## API

### `woodworkInterceptorError(options: Object): Function`

#### `options.getOwnproperties: Boolean` (default: `true`)
This is helpful to include any custom created properties on a custom Error object in the event.

#### `options.whitelist: Array` (default: `['message', 'name', 'stack']`)
Which properties should be included from the original Error object, which are non-enumerable and wouldn't otherwise be included.
