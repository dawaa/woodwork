const { expect } = require('earljs');
const sinon = require('sinon');

const woodworkInterceptorError = require('../lib/woodwork-interceptor-error');

const createEvent = (level, event, data = {}) => ({
  data,
  event,
  level,
});

describe('woodwork-interceptor-error', () => {
  let spy;
  beforeEach(() => {
    spy = sinon.spy(JSON, 'stringify');
  });

  afterEach(() => {
    JSON.stringify.restore();
  });

  it('does nothing if level is not "error"', () => {
    const error = new Error('boom');
    const event = createEvent('info', 'A user did something', {
      error,
      userId: 1,
    });

    const interceptor = woodworkInterceptorError();

    expect(interceptor(event)).toEqual({
      data: {
        error,
        userId: 1,
      },
      event: 'A user did something',
      level: 'info',
    });
    expect(spy.called).toEqual(false);
  });

  it('exposes error properties', () => {
    const error = new Error('boom');
    const event = createEvent('error', 'User experienced a crash', error);

    const interceptor = woodworkInterceptorError();

    expect(interceptor(event)).toEqual({
      data: {
        message: 'boom',
        name: 'Error',
        stack: expect.stringMatching(/^Error: boom[\s\S]*at/),
      },
      event: 'User experienced a crash',
      level: 'error',
    });
    expect(spy.called).toEqual(true);
  });

  it('exposes error properties amongst other properties', () => {
    const error = new Error('boom');
    const event = createEvent('error', 'User experienced a crash', {
      error,
      userId: 1,
    });

    const interceptor = woodworkInterceptorError();

    expect(interceptor(event)).toEqual({
      data: {
        error: {
          message: 'boom',
          name: 'Error',
          stack: expect.stringMatching(/^Error: boom[\s\S]*at/),
        },
        userId: 1,
      },
      event: 'User experienced a crash',
      level: 'error',
    });
    expect(spy.called).toEqual(true);
  });

  it('exposes custom error', () => {
    class CustomError extends Error {
      constructor(...args) {
        super(...args);
        this.name = this.constructor.name;
        this.customData = 'custom data';
        this.nestedData = {
          isNested: true,
        };
      }
    };
    const error = new CustomError('custom boom')
    const event = createEvent('error', 'User experienced a crash', { error });

    const interceptor = woodworkInterceptorError();

    expect(interceptor(event)).toEqual({
      data: {
        error: {
          customData: 'custom data',
          message: 'custom boom',
          name: 'CustomError',
          nestedData: {
            isNested: true,
          },
          stack: expect.stringMatching(/^CustomError: custom boom[\s\S]*at/),
        },
      },
      event: 'User experienced a crash',
      level: 'error',
    });
    expect(spy.called).toEqual(true);
  });

  it('exposes custom error with .toJSON() method', () => {
    let toJSONspy = sinon.spy();
    class CustomError extends Error {
      constructor(...args) {
        super(...args);
        this.name = this.constructor.name;
        this.customData = 'custom data';
      }

      toJSON() {
        toJSONspy();
        return {
          name: this.name,
          overrides: true,
        };
      }
    };
    const error = new CustomError('custom boom')
    const event = createEvent('error', 'User experienced a crash', { error });

    const interceptor = woodworkInterceptorError();

    expect(interceptor(event)).toEqual({
      data: {
        error: {
          name: 'CustomError',
          overrides: true,
        },
      },
      event: 'User experienced a crash',
      level: 'error',
    });
    expect(spy.called).toEqual(false);
    expect(toJSONspy.called).toEqual(true);
  });

  it('exposes custom error without custom properties', () => {
    class CustomError extends Error {
      constructor(...args) {
        super(...args);
        this.name = this.constructor.name;
        this.customData = 'custom data';
      }
    };
    const error = new CustomError('custom boom')
    const event = createEvent('error', 'User experienced a crash', { error });

    const interceptor = woodworkInterceptorError({
      getOwnProperties: false,
    });

    expect(interceptor(event)).toEqual({
      data: {
        error: {
          message: 'custom boom',
          name: 'CustomError',
          stack: expect.stringMatching(/^CustomError: custom boom[\s\S]*at/),
        },
      },
      event: 'User experienced a crash',
      level: 'error',
    });
    expect(spy.called).toEqual(true);
  });

  it('overrides default whitelisting of error properties', () => {
    const error = new Error('boom')
    const event = createEvent('error', 'User experienced a crash', { error });

    const interceptor = woodworkInterceptorError({
      whitelist: ['name'],
    });

    expect(interceptor(event)).toEqual({
      data: {
        error: {
          name: 'Error',
        },
      },
      event: 'User experienced a crash',
      level: 'error',
    });
    expect(spy.called).toEqual(true);
  });
});
