import { sendDiscordNotification } from './discord-connector';
import logger from './logger';

class GameInfo {
  bloodMoonDay: number | null = null;
  bloodMoonWarning: number | null = null;
  currentDay: number | null = null;
  currentTime: number | null = null;
  players: string[] = [];

  get isReady() {
    return this.bloodMoonDay !== null &&
      this.bloodMoonWarning !== null &&
      this.currentDay !== null &&
      this.currentTime !== null;
  }
}

interface ServerConnectionInfo {
  host?: string;
  port?: number;
  apiTokenName?: string;
  apiSecret?: string;
}

export class ServerConnector {
  public gameInfo: GameInfo;
  private host: string;
  private port: number;
  private apiTokenName: string;
  private apiSecret: string;
  private lastWarningDay: number | null = null;
  private timer?: Timer;

  constructor(connectionInfo: ServerConnectionInfo = {}) {
    if (!connectionInfo.host || !connectionInfo.port || !connectionInfo.apiTokenName || !connectionInfo.apiSecret) {
      logger.error('ServerConnector> Missing server connection parameters: ' + JSON.stringify(connectionInfo, null, 2));
      throw new Error('Missing server connection parameters.');
    }
    this.host = connectionInfo.host;
    this.port = connectionInfo.port;
    this.apiTokenName = connectionInfo.apiTokenName;
    this.apiSecret = connectionInfo.apiSecret;
    this.gameInfo = new GameInfo();
  }

  async sendCommand(command: string): Promise<any> {
    logger.debug(`ServerConnector> Sending '${command}' command...`);
    try {
      const url = `http://${this.host}:${this.port}/api/command`;
      const headers = {
        'Content-Type': 'application/json',
        'X-SDTD-API-TOKENNAME': this.apiTokenName,
        'X-SDTD-API-SECRET': this.apiSecret
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ "command": command })
      });

      if (!response.ok) {
        logger.error(`HTTP error! status: ${response.status}`);
      }

      const jsonResponse = await response.json();
      logger.debug('ServerConnector> Full response:\n' + JSON.stringify(jsonResponse, null, 2));
      const result = jsonResponse?.data?.result;
      return result;
    } catch (error) {
      logger.error('Error sending request:', error);
      return undefined;
    }
  }

  async getServerStatus(): Promise<void> {
    const response = await this.sendCommand('status');
    if (!response) return;
    logger.info(`ServerConnector> Server status: ${response}`);
  }

  async getActivePlayers(): Promise<void> {
    const response = await this.sendCommand('lp');
    if (!response) return;
    const playerRegex = /\d+\. id=\d+, (.+?),/g;
    const players = [...response.matchAll(playerRegex)].map(match => match[1]);
    logger.debug(`ServerConnector> Parsed players: ${JSON.stringify(players)}`);
    this.gameInfo.players = players;
  }

  async getGameStats(): Promise<void> {
    const response = await this.sendCommand('ggs');
    if (!response) return;
    const bloodMoonDayMatch = response.match(/GameStat\.BloodMoonDay\s*=\s*(\d+)/);
    const bloodMoonWarningMatch = response.match(/GameStat\.BloodMoonWarning\s*=\s*(\d+)/);

    const bloodMoonDay = bloodMoonDayMatch ? parseInt(bloodMoonDayMatch[1], 10) : null;
    const bloodMoonWarning = bloodMoonWarningMatch ? parseInt(bloodMoonWarningMatch[1], 10) : null;

    logger.debug(`ServerConnector> Parsed blood moon day: ${bloodMoonDay}, warning: ${bloodMoonWarning}`);
    this.gameInfo.bloodMoonDay = bloodMoonDay;
    this.gameInfo.bloodMoonWarning = bloodMoonWarning;
  }

  async getCurrentTime(): Promise<boolean> {
    const response = await this.sendCommand('gt');
    if (!response) return false;
    const timeMatch = response.match(/Day (\d+), (\d+):(\d+)/);

    if (timeMatch) {
      const currentDay = parseInt(timeMatch[1], 10);
      const currentTime = parseInt(timeMatch[2], 10);
      logger.debug(`ServerConnector> Parsed current day: ${currentDay}, time: ${currentTime}`);
      this.gameInfo.currentDay = currentDay;
      this.gameInfo.currentTime = currentTime;
      return true;
    }
    logger.error('ServerConnector> Unable to parse time from response:', response);
    return false;
  }

  async checkBloodMoonWarning(): Promise<void> {
    logger.debug('ServerConnector> Checking blood moon warning...');
    await this.getGameStats();
    await this.getCurrentTime();

    if (this.gameInfo.isReady) {
      const { bloodMoonDay, currentDay, currentTime, bloodMoonWarning } = this.gameInfo;
      logger.debug(`ServerConnector> Checking blood moon: day ${bloodMoonDay}, current day ${currentDay}, time ${currentTime}, warning ${bloodMoonWarning}`);
      if (bloodMoonDay !== null && currentDay !== null && currentTime !== null && bloodMoonWarning !== null) {
        if (bloodMoonDay === currentDay
          && currentTime >= bloodMoonWarning
          && this.lastWarningDay !== currentDay
          && this.gameInfo.players.length > 0) {
          logger.info('ServerConnector> Blood Moon is imminent!');
          sendDiscordNotification('🌑 Blood Moon is imminent! 😱');
          this.lastWarningDay = currentDay;
        }
      }
    } else {
      logger.warn('ServerConnector> Game info is not ready yet');
    }
  }

  startBloodmoonCheck() {
    if (this.timer) return
    this.timer = setInterval(async () => {
      await this.getActivePlayers();
      if (this.gameInfo.players.length > 0) {
        this.checkBloodMoonWarning();
      }
    }, 60000); // every minute
  }

  stopBloodmoonCheck() {
    if (!this.timer) return
    clearInterval(this.timer);
  }

  async getGameData(reportActivePlayers: boolean = false) {
    await this.getActivePlayers();
    reportActivePlayers && this.reportActivePlayers();
    await this.checkBloodMoonWarning();
    logger.debug('ServerConnector> Game info:\n' + JSON.stringify(this.gameInfo, null, 2));
  }

  private reportActivePlayers = () => {
    if (this.gameInfo.players.length > 0) {
      let message: string;
      if (this.gameInfo.players.length === 0) {
        message = "No players online.";
      } else if (this.gameInfo.players.length === 1) {
        message = `1 player is online: ${this.gameInfo.players[0]}`;
      } else {
        message = `${this.gameInfo.players.length} players are online: ${this.gameInfo.players.join(', ')}`;
      }
      sendDiscordNotification(message);
    }
  }
}