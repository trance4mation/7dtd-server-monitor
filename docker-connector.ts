import Docker from 'dockerode';
import { EventEmitter } from 'events';
import logger from './logger';
import { sendDiscordNotification } from './discord-connector';

const eventEmitter = new EventEmitter();
const maxReconnectAttempts = 5;

export class DockerConnector {
  private docker: Docker;
  private container: Docker.Container;
  private containerId: string;
  private reconnectInterval = 5000; // Initial reconnect interval in milliseconds
  private reconnectAttempts = 0;
  private logsStream?: NodeJS.ReadableStream;

  constructor(containerId: string) {
    this.docker = new Docker();
    this.containerId = containerId;
    this.container = this.docker.getContainer(this.containerId);
  }

  private connect = async () => {
    try {
      this.logsStream = await this.container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 0,
        since: Math.floor(Date.now() / 1000),
      });

      this.logsStream.on('data', (chunk: any) => {
        const logLine = chunk.toString();
        DockerConnector.processLogLine(logLine);
      });

      this.logsStream.on('end', () => {
        logger.info('DockerConnector> Log stream ended');
        this.reconnect();
      });

      this.logsStream.on('error', (err: any) => {
        logger.error('DockerConnector> Error reading log stream:', err);
        this.reconnect();
      });

      logger.info('DockerConnector> Connected to the container');

    } catch (error) {
      console.error('DockerConnector> Error connecting to container:', error);
      this.reconnect();
    }
  }

  private reconnect = async (): Promise<void> => {
    if (this.reconnectAttempts < maxReconnectAttempts) {
      this.reconnectAttempts++;
      const reconnectDelay = this.reconnectInterval * this.reconnectAttempts;
      logger.info(`DockerConnector> Reconnecting in ${reconnectDelay} milliseconds...`);
      setTimeout(this.connect, reconnectDelay);
    } else {
      logger.error('DockerConnector> Max reconnect attempts reached. Giving up.');
      await sendDiscordNotification('🛑 7DTD Server Monitor stopped with an error');
      throw new Error(`DockerConnector> Cannot connect to the container ${this.containerId}`);
    }
  };

  async readLog() {
    await this.connect();
  }

  private static processLogLine = (logLine: string) => {
    const playerJoinedRegex = /Player '(.+)' joined the game/;
    const playerLeftRegex = /Player '(.+)' left the game/;

    const playerJoinedMatch = logLine.match(playerJoinedRegex);
    if (playerJoinedMatch) {
      const playerName = playerJoinedMatch[1];
      eventEmitter.emit('playerJoin', playerName);
    }

    const playerLeftMatch = logLine.match(playerLeftRegex);
    if (playerLeftMatch) {
      const playerName = playerLeftMatch[1];
      eventEmitter.emit('playerLeave', playerName);
    }
  };

  async stop() {
    if (this.logsStream) {
      if (this.logsStream instanceof ReadableStream) {
        await this.logsStream.cancel();
      }
      this.logsStream = undefined;
    }
    this.reconnectAttempts = 0;
    logger.info('DockerConnector> Disconnected from the container');
  }
}

export { eventEmitter };