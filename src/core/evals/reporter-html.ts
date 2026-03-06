import type { EvalScenarioReport } from './types.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function writeHtmlDashboard(reports: EvalScenarioReport[], outputPath: string): void {
  const html = generateHtml(reports)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, html, 'utf-8')
}

function generateHtml(reports: EvalScenarioReport[]): string {
  const timestamp = new Date().toISOString()
  const totalScenarios = reports.length
  const passedScenarios = reports.filter(r => r.successRate === 1).length
  const failedScenarios = totalScenarios - passedScenarios
  const avgDuration = reports.reduce((sum, r) => sum + r.averageDurationMs, 0) / totalScenarios

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CCJK Eval Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .summary-item {
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .summary-item strong { display: block; font-size: 24px; margin-top: 5px; }
    table {
      width: 100%;
      background: white;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th, td { padding: 12px; text-align: left; }
    th { background: #333; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    .pass { color: #22c55e; font-weight: bold; }
    .fail { color: #ef4444; font-weight: bold; }
    .timestamp { color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <h1>CCJK Eval Dashboard</h1>
  <p class="timestamp">Generated: ${timestamp}</p>

  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item">
        <div>Total Scenarios</div>
        <strong>${totalScenarios}</strong>
      </div>
      <div class="summary-item">
        <div>Passed</div>
        <strong class="pass">${passedScenarios}</strong>
      </div>
      <div class="summary-item">
        <div>Failed</div>
        <strong class="fail">${failedScenarios}</strong>
      </div>
      <div class="summary-item">
        <div>Avg Duration</div>
        <strong>${Math.round(avgDuration)}ms</strong>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Suite</th>
        <th>Success Rate</th>
        <th>Passed/Total</th>
        <th>Avg Duration</th>
      </tr>
    </thead>
    <tbody>
${reports.map(r => `      <tr>
        <td>${r.scenarioId}</td>
        <td>${r.suite}</td>
        <td class="${r.successRate === 1 ? 'pass' : 'fail'}">${(r.successRate * 100).toFixed(0)}%</td>
        <td>${r.passedRuns}/${r.totalRuns}</td>
        <td>${Math.round(r.averageDurationMs)}ms</td>
      </tr>`).join('\n')}
    </tbody>
  </table>
</body>
</html>`
}
