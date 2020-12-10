const { expect } = require('earljs');
const sinon = require('sinon');
const decache = require('decache');
const superagent = require('superagent');
const errorInterceptor = require('woodwork-interceptor-error');

const LEVELS = require('../lib/constants');

const sandbox = sinon.createSandbox();
let woodwork;
let clientIdUtils;
describe('woodwork', () => {
  beforeEach(() => {
    clientIdUtils = require('../lib/client-id');
    woodwork = require('../lib/woodwork-logger');

    sandbox.stub(clientIdUtils, 'getClientId').callsFake(() => 'client-id-mocked');
  });

  afterEach(() => {
    sandbox.restore();

    decache('../lib/woodwork-logger');
    decache('../lib/client-id');
  });

  it('creates instance of woodwork', () => {
    const logger = woodwork.create('service-a');
    expect(logger).toEqual(expect.a(woodwork));
    expect(logger.name).toEqual('service-a');
    expect(logger.opts).toEqual({ clientId: 'client-id-mocked' });
    expect(logger.debug).toEqual(expect.a(Function));
    expect(logger.info).toEqual(expect.a(Function));
    expect(logger.warn).toEqual(expect.a(Function));
    expect(logger.error).toEqual(expect.a(Function));
  });

  it('creates two separate instances', () => {
    const loggerA = woodwork.create('service-a');
    const loggerB = woodwork.create('service-b');
    expect(loggerA).not.toEqual(loggerB);
  });

  it('calls each log-function with respective level', () => {
    const logger = woodwork.create('service-a');
    logger.log = sinon.spy();
    logger.debug('A debug message', { debug: true });
    logger.info('An info message', { info: true });
    logger.warn('A warning message', { warn: true });
    logger.error('An error happened!', { freakout: true });

    expect(logger.log.callCount).toEqual(4);
    expect(logger.log.getCall(0).args).toEqual([
      'debug',
      'A debug message',
      { debug: true },
    ]);
    expect(logger.log.getCall(1).args).toEqual([
      'info',
      'An info message',
      { info: true },
    ]);
    expect(logger.log.getCall(2).args).toEqual([
      'warn',
      'A warning message',
      { warn: true },
    ]);
    expect(logger.log.getCall(3).args).toEqual([
      'error',
      'An error happened!',
      { freakout: true },
    ]);
  });

  it('retrieves an instance', () => {
    const logger = woodwork.create('service-a');
    expect(logger).toEqual(woodwork.get('service-a'))
  });

  it('throws retrieving non-existent instance', () => {
    expect(() => woodwork.get('certainly-does-not-exist')).toThrow();
  });

  it('creates instance with client id', () => {
    const clientId = 'client-id-from-cookie';
    const logger = woodwork.create('service-a', { clientId });
    expect(logger.opts).toEqual({ clientId })
  });

  describe('logging events', () => {
    let httpStub;
    let logger;

    beforeEach(() => {
      httpStub = sandbox.stub();
      sandbox.stub(superagent, 'post').callsFake(() => ({
        send: httpStub,
      }));

      logger = woodwork.create('service-a', {
        request: (events) => {
          superagent
            .post('http://backend-service')
            .send({ events });
        },
      });
    });

    it('logs info-log without dispatching', () => {
      const message = 'Just casual information about what the user is doing';
      logger.info(message);

      expect(logger.events.length).toEqual(1);
      expect(httpStub.callCount).toEqual(0);
    });

    it('logs info-log and manually dispatch', () => {
      const message = 'Just casual information about what the user is doing';
      logger.info(message);
      logger.flush();

      expect(httpStub.callCount).toEqual(1);
      expect(httpStub.firstCall.args[0]).toEqual({
        events: [
          {
            clientId: 'client-id-mocked',
            data: {},
            event: message,
            level: 'info',
            service: 'service-a',
          },
        ],
      })
      expect(logger.events.length).toEqual(0);
    });

    it('logs error-log and trigger dispatch automatically', () => {
      const message = 'Terrible things happened!';
      logger.error(message);

      expect(httpStub.callCount).toEqual(1);
      expect(httpStub.firstCall.args[0]).toEqual({
        events: [
          {
            clientId: 'client-id-mocked',
            data: {},
            event: message,
            level: 'error',
            service: 'service-a',
          },
        ],
      })
    });
  });

  describe('interceptors', () => {
    it('adds timestamp', () => {
      const now = Date.now();
      const logger = woodwork.create('service-a', {
        interceptors: [
          (event) => ({
            ...event,
            timestamp: now,
          })
        ],
      });

      const message = 'User logged in!';
      logger.info(message);

      expect(logger.events).toEqual([
        {
          clientId: 'client-id-mocked',
          data: {},
          event: message,
          level: 'info',
          service: 'service-a',
          timestamp: now,
        },
      ]);
    });

    it('adds timestamp and path', () => {
      const now = Date.now();
      const logger = woodwork.create('service-a', {
        interceptors: [
          (event) => ({
            ...event,
            timestamp: now,
          }),
          (event) => ({
            ...event,
            path: '/random-path',
          }),
        ],
      });

      const message = 'User logged in!';
      logger.info(message);

      expect(logger.events).toEqual([
        {
          clientId: 'client-id-mocked',
          data: {},
          event: message,
          level: 'info',
          path: '/random-path',
          service: 'service-a',
          timestamp: now,
        },
      ]);
    });

    it('adds interceptor to deal with errors', async () => {
      const logger = woodwork.create('service-a', {
        interceptors: [
          (event) => {
            const { data } = event;

            Object.keys(data).forEach((key) => {
              if (data[key] instanceof Error) {
                data[key] = JSON.parse(JSON.stringify(data[key], ['message', 'name', 'stack']));
              }
            });

            return event;
          },
        ],
      });

      let error;
      const message = 'Failed to do something important';
      const funcThatCausesAnError = () => {
        error = new Error('BIG BANG');
        throw error;
      };

      await Promise.resolve()
        .then(funcThatCausesAnError)
        .catch((err) => {
          logger.info(message, {
            error: err,
          });
        });

      expect(logger.events).toEqual([
        {
          clientId: 'client-id-mocked',
          data: {
            error: {
              message: 'BIG BANG',
              name: 'Error',
              stack: expect.stringMatching(/^Error: BIG BANG[\s\S]*at funcThatCausesAnError/),
            },
          },
          event: message,
          level: 'info',
          service: 'service-a',
        },
      ]);
    });

    it('adds woodwork-interceptor-error interceptor', () => {
      const logger = woodwork.create('service-a', {
        interceptors: [
          errorInterceptor(),
        ],
      });
      sandbox.stub(logger, 'flush');
      const message = 'Something blew up!';
      const error = new Error('BIG BANG');

      logger.error(message, { error });

      expect(logger.events).toEqual([
        {
          clientId: 'client-id-mocked',
          data: {
            error: {
              message: 'BIG BANG',
              name: 'Error',
              stack: expect.stringMatching(/^Error: BIG BANG[\s\S]*at/),
            },
          },
          event: message,
          level: 'error',
          service: 'service-a',
        },
      ]);
    });
  });
});

