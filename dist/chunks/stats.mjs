import ansis from 'ansis';
import { i18n } from './index.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'pathe';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';

class StatsStorage {
  baseDir;
  recordsDir;
  dailyDir;
  constructor(baseDir) {
    this.baseDir = baseDir || join(homedir(), ".ccjk", "stats");
    this.recordsDir = join(this.baseDir, "records");
    this.dailyDir = join(this.baseDir, "daily");
    this.ensureDirectories();
  }
  /**
   * Ensure storage directories exist
   */
  ensureDirectories() {
    for (const dir of [this.baseDir, this.recordsDir, this.dailyDir]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }
  /**
   * Get file path for a specific date
   */
  getRecordFilePath(date) {
    return join(this.recordsDir, `${date}.json`);
  }
  /**
   * Get daily stats file path for a specific date
   */
  getDailyStatsFilePath(date) {
    return join(this.dailyDir, `${date}.json`);
  }
  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  /**
   * Save a request record
   */
  saveRecord(record) {
    const date = this.formatDate(record.timestamp);
    const filePath = this.getRecordFilePath(date);
    let records = [];
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        records = JSON.parse(content);
      } catch {
        records = [];
      }
    }
    records.push(record);
    writeFileSync(filePath, JSON.stringify(records, null, 2), "utf-8");
  }
  /**
   * Get records for a specific date
   */
  getRecordsByDate(date) {
    const filePath = this.getRecordFilePath(date);
    if (!existsSync(filePath)) {
      return [];
    }
    try {
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }
  /**
   * Get records for a date range
   */
  getRecordsByDateRange(startDate, endDate) {
    const records = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const d = new Date(start);
    while (d <= end) {
      const dateStr = this.formatDate(d.getTime());
      records.push(...this.getRecordsByDate(dateStr));
      d.setDate(d.getDate() + 1);
    }
    return records;
  }
  /**
   * Get all available record dates
   */
  getAvailableDates() {
    if (!existsSync(this.recordsDir)) {
      return [];
    }
    const files = readdirSync(this.recordsDir);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", "")).sort();
  }
  /**
   * Save daily statistics
   */
  saveDailyStats(stats) {
    const filePath = this.getDailyStatsFilePath(stats.date);
    writeFileSync(filePath, JSON.stringify(stats, null, 2), "utf-8");
  }
  /**
   * Get daily statistics for a specific date
   */
  getDailyStats(date) {
    const filePath = this.getDailyStatsFilePath(date);
    if (!existsSync(filePath)) {
      return null;
    }
    try {
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  /**
   * Get daily statistics for a date range
   */
  getDailyStatsByDateRange(startDate, endDate) {
    const stats = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const d = new Date(start);
    while (d <= end) {
      const dateStr = this.formatDate(d.getTime());
      const dailyStats = this.getDailyStats(dateStr);
      if (dailyStats) {
        stats.push(dailyStats);
      }
      d.setDate(d.getDate() + 1);
    }
    return stats;
  }
  /**
   * Get all available daily stats dates
   */
  getAvailableDailyStatsDates() {
    if (!existsSync(this.dailyDir)) {
      return [];
    }
    const files = readdirSync(this.dailyDir);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", "")).sort();
  }
  /**
   * Calculate date range for a period
   */
  getDateRangeForPeriod(period) {
    const now = /* @__PURE__ */ new Date();
    const endDate = this.formatDate(now.getTime());
    if (period === "all") {
      const dates = this.getAvailableDates();
      const startDate2 = dates.length > 0 ? dates[0] : endDate;
      return { startDate: startDate2, endDate };
    }
    const days = period === "1d" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    const startDate = this.formatDate(start.getTime());
    return { startDate, endDate };
  }
  /**
   * Clean up old records (older than specified days)
   */
  cleanupOldRecords(daysToKeep) {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = this.formatDate(cutoffDate.getTime());
    const dates = this.getAvailableDates();
    let deletedCount = 0;
    for (const date of dates) {
      if (date < cutoffStr) {
        try {
          const recordFile = this.getRecordFilePath(date);
          const dailyFile = this.getDailyStatsFilePath(date);
          if (existsSync(recordFile)) {
            deletedCount++;
          }
          if (existsSync(dailyFile)) {
          }
        } catch {
        }
      }
    }
    return deletedCount;
  }
  /**
   * Get storage statistics
   */
  getStorageStats() {
    const recordDates = this.getAvailableDates();
    const dailyDates = this.getAvailableDailyStatsDates();
    let totalRecords = 0;
    for (const date of recordDates) {
      const records = this.getRecordsByDate(date);
      totalRecords += records.length;
    }
    return {
      totalRecordFiles: recordDates.length,
      totalDailyFiles: dailyDates.length,
      oldestDate: recordDates.length > 0 ? recordDates[0] : null,
      newestDate: recordDates.length > 0 ? recordDates[recordDates.length - 1] : null,
      totalRecords
    };
  }
}
let storageInstance = null;
function getStatsStorage() {
  if (!storageInstance) {
    storageInstance = new StatsStorage();
  }
  return storageInstance;
}

async function stats(options = {}) {
  const period = options.period || "7d";
  const format = options.format || "table";
  const storage = getStatsStorage();
  const { startDate, endDate } = storage.getDateRangeForPeriod(period);
  const records = storage.getRecordsByDateRange(startDate, endDate);
  if (records.length === 0) {
    console.log(ansis.yellow(`
${i18n.t("stats:noData")}
`));
    return;
  }
  const filteredRecords = options.provider ? records.filter((r) => r.provider === options.provider) : records;
  if (filteredRecords.length === 0) {
    console.log(ansis.yellow(`
${i18n.t("stats:noData")} for provider: ${options.provider}
`));
    return;
  }
  const stats2 = calculateStats(filteredRecords);
  if (format === "json") {
    console.log(JSON.stringify(stats2, null, 2));
  } else if (format === "csv") {
    displayCSV(stats2);
  } else {
    displayTable(stats2, period);
  }
  if (options.export) {
    await exportStats(stats2, options.export, format);
    console.log(ansis.green(`
${i18n.t("stats:exportSuccess")}: ${options.export}
`));
  }
}
function calculateStats(records) {
  const totalRequests = records.length;
  const successfulRequests = records.filter((r) => r.success).length;
  const successRate = totalRequests > 0 ? successfulRequests / totalRequests * 100 : 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let totalLatency = 0;
  const providerCounts = {};
  const modelCounts = {};
  for (const record of records) {
    totalInputTokens += record.inputTokens || 0;
    totalOutputTokens += record.outputTokens || 0;
    totalCost += record.cost || 0;
    totalLatency += record.latency || 0;
    const provider = record.provider || "unknown";
    providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    const model = record.model || "unknown";
    modelCounts[model] = (modelCounts[model] || 0) + 1;
  }
  const averageLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;
  return {
    totalRequests,
    successfulRequests,
    failedRequests: totalRequests - successfulRequests,
    successRate,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCost,
    averageLatency,
    providerCounts,
    modelCounts
  };
}
function displayTable(stats2, period) {
  console.log(ansis.cyan.bold(`
\u{1F4CA} ${i18n.t("stats:title")} - ${i18n.t(`stats:period.${period}`)}`));
  console.log(ansis.dim("\u2500".repeat(60)));
  console.log(ansis.yellow("\n\u{1F4C8} Request Statistics:"));
  console.log(`  ${i18n.t("stats:totalRequests")}: ${ansis.bold(stats2.totalRequests.toLocaleString())}`);
  console.log(`  ${ansis.green("\u2713")} Successful: ${ansis.bold(stats2.successfulRequests.toLocaleString())}`);
  console.log(`  ${ansis.red("\u2717")} Failed: ${ansis.bold(stats2.failedRequests.toLocaleString())}`);
  console.log(`  ${i18n.t("stats:successRate")}: ${ansis.bold(stats2.successRate.toFixed(2))}%`);
  console.log(ansis.yellow("\n\u{1F3AF} Token Usage:"));
  console.log(`  ${i18n.t("stats:input")}: ${ansis.bold(stats2.totalInputTokens.toLocaleString())}`);
  console.log(`  ${i18n.t("stats:output")}: ${ansis.bold(stats2.totalOutputTokens.toLocaleString())}`);
  console.log(`  ${i18n.t("stats:totalTokens")}: ${ansis.bold(stats2.totalTokens.toLocaleString())}`);
  console.log(ansis.yellow("\n\u{1F4B0} Cost Analysis:"));
  console.log(`  ${i18n.t("stats:estimatedCost")}: ${ansis.bold(`$${stats2.totalCost.toFixed(4)}`)}`);
  console.log(ansis.yellow("\n\u26A1 Performance:"));
  console.log(`  ${i18n.t("stats:averageLatency")}: ${ansis.bold(stats2.averageLatency.toFixed(0))}ms`);
  if (Object.keys(stats2.providerCounts).length > 0) {
    console.log(ansis.yellow(`
\u2601\uFE0F  ${i18n.t("stats:providerDistribution")}:`));
    for (const [provider, count] of Object.entries(stats2.providerCounts)) {
      const percentage = (count / stats2.totalRequests * 100).toFixed(1);
      console.log(`  ${provider}: ${ansis.bold(count)} (${percentage}%)`);
    }
  }
  if (Object.keys(stats2.modelCounts).length > 0) {
    console.log(ansis.yellow("\n\u{1F916} Model Distribution:"));
    for (const [model, count] of Object.entries(stats2.modelCounts)) {
      const percentage = (count / stats2.totalRequests * 100).toFixed(1);
      console.log(`  ${model}: ${ansis.bold(count)} (${percentage}%)`);
    }
  }
  console.log(ansis.dim(`
${"\u2500".repeat(60)}
`));
}
function displayCSV(stats2) {
  console.log("metric,value");
  console.log(`total_requests,${stats2.totalRequests}`);
  console.log(`successful_requests,${stats2.successfulRequests}`);
  console.log(`failed_requests,${stats2.failedRequests}`);
  console.log(`success_rate,${stats2.successRate.toFixed(2)}`);
  console.log(`total_input_tokens,${stats2.totalInputTokens}`);
  console.log(`total_output_tokens,${stats2.totalOutputTokens}`);
  console.log(`total_tokens,${stats2.totalTokens}`);
  console.log(`total_cost,${stats2.totalCost.toFixed(4)}`);
  console.log(`average_latency,${stats2.averageLatency.toFixed(0)}`);
}
async function exportStats(stats2, filePath, format) {
  const { writeFileSync } = await import('node:fs');
  let content;
  if (format === "json") {
    content = JSON.stringify(stats2, null, 2);
  } else if (format === "csv") {
    const lines = [
      "metric,value",
      `total_requests,${stats2.totalRequests}`,
      `successful_requests,${stats2.successfulRequests}`,
      `failed_requests,${stats2.failedRequests}`,
      `success_rate,${stats2.successRate.toFixed(2)}`,
      `total_input_tokens,${stats2.totalInputTokens}`,
      `total_output_tokens,${stats2.totalOutputTokens}`,
      `total_tokens,${stats2.totalTokens}`,
      `total_cost,${stats2.totalCost.toFixed(4)}`,
      `average_latency,${stats2.averageLatency.toFixed(0)}`
    ];
    content = lines.join("\n");
  } else {
    content = JSON.stringify(stats2, null, 2);
  }
  writeFileSync(filePath, content, "utf-8");
}
async function listStatsDates() {
  const storage = getStatsStorage();
  const dates = storage.getAvailableDates();
  if (dates.length === 0) {
    console.log(ansis.yellow("\nNo statistics data available\n"));
    return;
  }
  console.log(ansis.cyan.bold("\n\u{1F4C5} Available Statistics Dates:"));
  console.log(ansis.dim("\u2500".repeat(40)));
  for (const date of dates) {
    const records = storage.getRecordsByDate(date);
    console.log(`  ${date}: ${ansis.bold(records.length)} requests`);
  }
  console.log(ansis.dim(`
${"\u2500".repeat(40)}
`));
}
async function storageStats() {
  const storage = getStatsStorage();
  const stats2 = storage.getStorageStats();
  console.log(ansis.cyan.bold("\n\u{1F4BE} Storage Statistics:"));
  console.log(ansis.dim("\u2500".repeat(40)));
  console.log(`  Total record files: ${ansis.bold(stats2.totalRecordFiles)}`);
  console.log(`  Total daily files: ${ansis.bold(stats2.totalDailyFiles)}`);
  console.log(`  Total records: ${ansis.bold(stats2.totalRecords.toLocaleString())}`);
  console.log(`  Oldest date: ${ansis.bold(stats2.oldestDate || "N/A")}`);
  console.log(`  Newest date: ${ansis.bold(stats2.newestDate || "N/A")}`);
  console.log(ansis.dim(`
${"\u2500".repeat(40)}
`));
}
async function cleanupStats(daysToKeep = 90) {
  const storage = getStatsStorage();
  const deletedCount = storage.cleanupOldRecords(daysToKeep);
  console.log(ansis.green(`
\u2713 Cleanup complete: ${deletedCount} old records marked for deletion
`));
}

export { cleanupStats, listStatsDates, stats, storageStats };
