import chalk from 'chalk';
import dotenv from 'dotenv';
import { CCJKTelegramBot } from './bot';

// Load environment variables
dotenv.config();

/**
 * Main entry point for CCJK Telegram Bot
 */

async function main() {
  // Validate environment variables
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const isProduction = process.env.NODE_ENV === 'production';
  const serverUrl = process.env.CCJK_SERVER_URL || (isProduction ? '' : 'http://localhost:3005');
  const authToken = process.env.CCJK_AUTH_TOKEN;

  if (!telegramToken) {
    console.error(chalk.red('❌ TELEGRAM_BOT_TOKEN is required'));
    console.log(chalk.gray('\nGet your token from @BotFather on Telegram'));
    process.exit(1);
  }

  if (!authToken) {
    console.error(chalk.red('❌ CCJK_AUTH_TOKEN is required'));
    console.log(chalk.gray('\nGet your token from: ccjk remote setup (or your CCJK Web/App dashboard)'));
    process.exit(1);
  }

  if (!serverUrl) {
    console.error(chalk.red('❌ CCJK_SERVER_URL is required in production'));
    process.exit(1);
  }

  if (isProduction && !serverUrl.startsWith('https://')) {
    console.error(chalk.red('❌ CCJK_SERVER_URL must use https:// in production'));
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
