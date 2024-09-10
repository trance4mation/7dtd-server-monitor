import { sendDiscordNotification } from './discord-connector';
import { readContainerLog, eventEmitter } from './docker-connector';
import { ServerConnector } from './server-connector';
import logger from './logger';

const containerId = '7dtdserver';
const serverHost = process.env.GAME_SERVER_HOST;
const serverPort = parseInt(process.env.GAME_SERVER_PORT || '8080');
const apiTokenName = process.env.GAME_SERVER_API_TOKEN_NAME;
const apiSecret = process.env.GAME_SERVER_API_SECRET;

const serverConnector = new ServerConnector({
  host: serverHost,
  port: serverPort,
  apiTokenName,
  apiSecret
});

sendDiscordNotification('7DTD Server Monitor started 🚀');

eventEmitter.on('playerJoin', async (playerName: string) => {
  logger.info(`${playerName} has joined the game`);
  sendDiscordNotification(`${playerName} has joined the game 🤩`);
  await serverConnector.run();
});

eventEmitter.on('playerLeave', async (playerName: string) => {
  logger.info(`${playerName} has left the game`);
  sendDiscordNotification(`${playerName} has left the game 😳`);
  await serverConnector.run();
});

setInterval(async () => {
  await serverConnector.checkBloodMoonWarning();
}, 60000); // every 1 minute


await readContainerLog(containerId);