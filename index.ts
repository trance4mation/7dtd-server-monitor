import { ServerConnector } from './server-connector';
import { DockerConnector, eventEmitter } from './docker-connector';
import { Watchdog } from './watchdog';
import { sendDiscordNotification } from './discord-connector';
import { hassAPI } from './hass-connector';
import { PlayerStatus, PlayerLogStatus, DiscordStatus } from './const';
import logger from './logger';

const containerId = '7dtdserver';
const serverHost = process.env.GAME_SERVER_HOST;
const serverPort = parseInt(process.env.GAME_SERVER_PORT || '8080');
const apiTokenName = process.env.GAME_SERVER_API_TOKEN_NAME;
const apiSecret = process.env.GAME_SERVER_API_SECRET;

async function main() {
  let dockerConnector: DockerConnector | undefined;
  let watchdog: Watchdog | undefined;

  async function processPlayerChange(status: PlayerStatus, playerName: string, serverConnector: ServerConnector) {
    logger.info(`${playerName} ${PlayerLogStatus[status]}`);
    sendDiscordNotification(`${playerName} ${DiscordStatus[status]}`);
    await serverConnector.getGameData();
    await hassAPI.updatePlayerInfo(serverConnector.gameInfo.players);
  }

  console.log('Main> Starting 7DTD Server Monitor...');

  try {
    const serverConnector = new ServerConnector({
      host: serverHost,
      port: serverPort,
      apiTokenName,
      apiSecret
    });

    sendDiscordNotification('7DTD Server Monitor started 🚀');

    watchdog = new Watchdog(serverConnector);
    watchdog.start();

    eventEmitter.on('connected', async () => {
      console.debug('Main> Connected to server');
      dockerConnector = new DockerConnector(containerId);
      await dockerConnector.readLog();
    });

    eventEmitter.on('disconnected', async () => {
      console.debug('Main> Disconnected from server');
      await dockerConnector?.stop();
    });

    eventEmitter.on('playerJoin', async (playerName: string) => {
      console.debug(`Main> ${playerName} joined the game`);
      processPlayerChange(PlayerStatus.Joined, playerName, serverConnector);
    });

    eventEmitter.on('playerLeave', async (playerName: string) => {
      console.debug(`Main> ${playerName} left the game`);
      processPlayerChange(PlayerStatus.Left, playerName, serverConnector);
    });

    // Keep the process running
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error: any) {
    watchdog?.stop();
    await sendDiscordNotification('🛑 7DTD Server Monitor stopped with an error', error);
    console.error('Main> 7DTD Server Monitor stopped with an error', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Main> Unhandled error in main:', error);
  process.exit(1);
});

