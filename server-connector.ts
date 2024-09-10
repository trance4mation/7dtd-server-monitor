import { sendDiscordNotification } from './discord-connector';
import logger from './logger';
import { hassAPI } from './hass-connector';

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

  constructor(connectionInfo: ServerConnectionInfo = {}) {
    if (!connectionInfo.host || !connectionInfo.port || !connectionInfo.apiTokenName || !connectionInfo.apiSecret) {
      throw new Error('Missing required server connection parameters: ' + JSON.stringify(connectionInfo, null, 2));
    }
    this.host = connectionInfo.host;
    this.port = connectionInfo.port;
    this.apiTokenName = connectionInfo.apiTokenName;
    this.apiSecret = connectionInfo.apiSecret;
    this.gameInfo = new GameInfo();
  }

  async sendCommand(command: string): Promise<any> {
    logger.info(`Sending '${command}' command...`);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonResponse = await response.json();
      logger.debug('Full response:\n' + JSON.stringify(jsonResponse, null, 2));
      const result = jsonResponse?.data?.result;
      return result;
    } catch (error) {
      logger.error('Error sending request:', error);
      throw error;
    }
  }

  async getActivePlayers() {
    const response = await this.sendCommand('lp');
    const playerRegex = /\d+\. id=\d+, (.+?),/g;
    const players = [...response.matchAll(playerRegex)].map(match => match[1]);
    logger.info(`Parsed players: ${JSON.stringify(players)}`);
    this.gameInfo.players = players;
    return players;
  }

  async getGameStats() {
    const response = await this.sendCommand('ggs');
    const bloodMoonDayMatch = response.match(/GameStat\.BloodMoonDay\s*=\s*(\d+)/);
    const bloodMoonWarningMatch = response.match(/GameStat\.BloodMoonWarning\s*=\s*(\d+)/);

    const bloodMoonDay = bloodMoonDayMatch ? parseInt(bloodMoonDayMatch[1], 10) : null;
    const bloodMoonWarning = bloodMoonWarningMatch ? parseInt(bloodMoonWarningMatch[1], 10) : null;

    logger.debug(`Parsed blood moon day: ${bloodMoonDay}, warning: ${bloodMoonWarning}`);
    this.gameInfo.bloodMoonDay = bloodMoonDay;
    this.gameInfo.bloodMoonWarning = bloodMoonWarning;
  }

  async getCurrentTime() {
    const response = await this.sendCommand('gt');
    const timeMatch = response.match(/Day (\d+), (\d+):(\d+)/);

    if (timeMatch) {
      const currentDay = parseInt(timeMatch[1], 10);
      const currentTime = parseInt(timeMatch[2], 10);
      logger.debug(`Parsed current day: ${currentDay}, time: ${currentTime}`);
      this.gameInfo.currentDay = currentDay;
      this.gameInfo.currentTime = currentTime;
    } else {
      logger.error('Unable to parse time from response:', response);
    }
  }

  async checkBloodMoonWarning() {
    logger.info('Checking blood moon warning...');
    await this.getGameStats();
    await this.getCurrentTime();

    if (this.gameInfo.isReady) {
      const { bloodMoonDay, currentDay, currentTime, bloodMoonWarning } = this.gameInfo;
      logger.debug(`Checking blood moon: day ${bloodMoonDay}, current day ${currentDay}, time ${currentTime}, warning ${bloodMoonWarning}`);
      if (bloodMoonDay !== null && currentDay !== null && currentTime !== null && bloodMoonWarning !== null) {
        if (bloodMoonDay === currentDay
          && currentTime >= bloodMoonWarning
          && this.lastWarningDay !== currentDay
          && this.gameInfo.players.length > 0) {
          logger.info('Blood Moon is imminent!');
          sendDiscordNotification('🌑 Blood Moon is imminent! 😱');
          this.lastWarningDay = currentDay;
        }
      }
    } else {
      logger.warn('Game info is not ready yet');
    }
  }

  async run() {
    await this.getActivePlayers();
    await this.checkBloodMoonWarning();
    await hassAPI.updatePlayerInfo(this.gameInfo.players);
    logger.info('Game info:\n' + JSON.stringify(this.gameInfo, null, 2));
  }
}