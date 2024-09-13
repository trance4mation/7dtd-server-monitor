import { ServerConnector } from './server-connector';
import logger from './logger';
import eventEmitter from './eventEmitter';

export class Watchdog {
  private timer?: Timer;
  private interval: number;
  private serverConnector: ServerConnector;

  constructor(serverConnector: ServerConnector, interval: number = 5000) {
    this.serverConnector = serverConnector;
    this.interval = interval;
  }

  start() {
    logger.debug('Watchdog> Starting watchdog');
    this.timer = setInterval(this.checkServerConnection, this.interval);
  }

  stop() {
    logger.debug('Watchdog> Stopping watchdog');
    clearInterval(this.timer);
  }

  private checkServerConnection = async () => {
    logger.debug('Watchdog> Checking server connection...');
    try {
      const isValidTime = await this.serverConnector.getCurrentTime();
      if (isValidTime) {
        logger.debug('Watchdog> Server connection is valid');
        eventEmitter.emit('connected');
      }
    } catch (error) {
      logger.error('Watchdog> Server connection is invalid');
      eventEmitter.emit('disconnected');
    }
  }
}