import { CCJKTelegramBot } from './bot';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

/**
 * Main entry point for CCJK Telegram Bot
 */

async function main() {
  // Validate environment variables
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const serverUrl = process.env.CCJK_SERVER_URL || 'http://localhost:3005';
  const authToken = process.env.CCJK_AUTH_TOKEN;

  if (!telegramToken) {
    console.error(chalk.red('❌ TELEGRAM_BOT_TOKEN is required'));
    console.log(chalk.gray('\nGet your token from @BotFather on Telegram'));
    process.exit(1);
  }

  if (!authToken) {
    console.error(chalk.red('❌ CCJK_AUTH_TOKEN is required'));
    console.log(chalk.gray('\nGet your token from: ccjk remote login'));
    process.exit(1);
  }

  // Create and start bot
  const bot = new CCJKTelegramBot({
    telegramToken,
    serverUrl,
    authToken,
  });

  try {
    await bot.start();
  } catch (error) {
    console.error(chalk.red('❌ Failed to start bot:'), error);
    process.exit(1);
  }
}

main();
