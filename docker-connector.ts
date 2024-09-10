import Docker from 'dockerode';
import { EventEmitter } from 'events';
import logger from './logger';

const eventEmitter = new EventEmitter();

export async function readContainerLog(containerId: string) {
  logger.info(`Starting reading log from the container ${containerId}`);

  const docker = new Docker();
  const container = docker.getContainer(containerId);

  let reconnectInterval = 3000; // Initial reconnect interval in milliseconds
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  const connect = async () => {
    try {
      const logsStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 0,
        since: Math.floor(Date.now() / 1000),
      });

      logsStream.on('data', (chunk: any) => {
        const logLine = chunk.toString();
        processLogLine(logLine);
      });

      logsStream.on('end', () => {
        console.log('Log stream ended');
        reconnect();
      });

      logsStream.on('error', (err: any) => {
        logger.error('Error reading log stream:', err);
        reconnect();
      });

      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    } catch (error) {
      console.error('Error connecting to container:', error);
      reconnect();
    }
  };

  const reconnect = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      const reconnectDelay = reconnectInterval * Math.pow(2, reconnectAttempts);
      console.log(`Reconnecting in ${reconnectDelay} milliseconds...`);
      setTimeout(connect, reconnectDelay);
    } else {
      console.error('Max reconnect attempts reached. Giving up.');
    }
  };

  connect();
}

const processLogLine = (logLine: string) => {
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

export { eventEmitter };