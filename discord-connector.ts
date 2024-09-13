import axios from 'axios';
import logger from './logger';

export async function sendDiscordNotification(message: string, error?: any): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.error('DiscordConnector> Discord webhook URL is not set in the environment variables.');
    return;
  }

  try {
    type DiscordMessage = {
      content: string;
      embeds?: Array<{
        color: number;
        description: string;
      }>;
    };

    let payload: DiscordMessage = {
      content: error ? `🛑 ${message}` : message
    };
    if (error) {
      payload.embeds = [{
        color: 16711680,
        description: error.message
      }];
    }
    await axios.post(webhookUrl, payload);
    logger.debug('DiscordConnector> Notification sent successfully.');
  } catch (error) {
    logger.error('DiscordConnector> Failed to send Discord notification:', error);
  }
}

