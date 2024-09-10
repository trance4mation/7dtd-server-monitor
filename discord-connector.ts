import axios from 'axios';
import logger from './logger';

export async function sendDiscordNotification(message: string): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.error('Discord webhook URL is not set in the environment variables.');
    return;
  }

  try {
    await axios.post(webhookUrl, { content: message });
    logger.info('Discord notification sent successfully.');
  } catch (error) {
    logger.error('Failed to send Discord notification:', error);
  }
}

