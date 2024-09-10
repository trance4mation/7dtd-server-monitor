import logger from './logger';

class HomeAssistantAPI {
  private baseUrl: string;
  private token: string;
  private headers: Record<string, string>;
  private playerEntity: string;

  constructor() {
    this.baseUrl = process.env.HASS_URL || '';
    this.token = process.env.HASS_TOKEN || '';
    if (!this.token) {
      throw new Error("HASS_TOKEN environment variable is not set");
    }

    this.headers = {
      "Authorization": `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
    this.playerEntity = "sensor.7dtd_players";
  }

  async updatePlayerInfo(players: string[]): Promise<void> {
    const endpoint = `${this.baseUrl}/api/states/${this.playerEntity}`;

    const payload = {
      state: players.length.toString(),
      attributes: {
        players: players,
        friendly_name: "7DTD Players"
      }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      logger.info(`Updated player info in HASS: ${players.length} players: ${players.join(', ')}`);
    } catch (error) {
      logger.error('Error updating player info in HASS:', error);
      throw error;
    }
  }
}

export const hassAPI = new HomeAssistantAPI();
