import { EventEmitter } from 'events';
import { ServerConnector } from './server-connector';
import logger from './logger';

const eventEmitter = new EventEmitter();

export class Watchdog {
  private timer?: Timer;
  private interval: number;
  private serverConnector: ServerConnector;

  constructor(serverConnector: ServerConnector, interval: number = 3000) {
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
    try {
      const isValidTime = await this.serverConnector.getCurrentTime();
      if (isValidTime) {
        eventEmitter.emit('connected');
      }
    } catch (error) {
      eventEmitter.emit('disconnected');
    }
  }
}