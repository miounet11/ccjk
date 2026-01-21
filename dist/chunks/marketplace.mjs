import ansis from 'ansis';
import { i18n } from './index.mjs';
import { g as getPackage, i as isPackageInstalled, a as getInstalledPackages, u as updatePackage, c as checkForUpdates, b as uninstallPackage, d as installPackage, s as searchPackages } from '../shared/ccjk.DcXM9drZ.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';
import 'node:crypto';
import 'node:fs/promises';
import 'node:os';
import 'node:stream';
import 'node:stream/promises';
import 'tar';
import 'tinyexec';
import './fs-operations.mjs';

async function searchCommand(query, _options) {
  try {
    console.log(ansis.green(i18n.t("marketplace:searching", { query })));
    const results = await searchPackages({ query });
    if (results.packages.length === 0) {
      console.log(ansis.yellow(i18n.t("marketplace:noResults")));
      return;
    }
    console.log(ansis.green(i18n.t("marketplace:searchResults", { count: results.packages.length })));
    console.log();
    for (const pkg of results.packages) {
      const installed = await isPackageInstalled(pkg.name);
      const installedMark = installed ? ansis.green("\u2713") : ansis.gray("\u25CB");
      console.log(`${installedMark} ${ansis.bold(pkg.name)} ${ansis.gray(`v${pkg.version}`)}`);
      console.log(`  ${pkg.description.en || Object.values(pkg.description)[0]}`);
      console.log(`  ${ansis.gray(i18n.t("marketplace:packageInfo.category"))}: ${pkg.category}`);
      if (pkg.verified === "verified") {
        console.log(`  ${ansis.green("\u2713")} ${i18n.t("marketplace:packageInfo.verified")}`);
      }
      console.log();
    }
  } catch (err) {
    console.error(ansis.red(i18n.t("marketplace:searchFailed")));
    console.error(err);
    throw err;
  }
}
async function installCommand(packageName, options) {
  try {
    if (await isPackageInstalled(packageName)) {
      console.log(ansis.yellow(`Package '${packageName}' is already installed`));
      return;
    }
    const pkg = await getPackage(packageName);
    if (!pkg) {
      console.error(ansis.red(i18n.t("marketplace:packageNotFound", { name: packageName })));
      throw new Error(`Package not found: ${packageName}`);
    }
    console.log(ansis.green(i18n.t("marketplace:installing", { name: packageName })));
    const result = await installPackage(packageName, {
      force: options.force,
      skipVerification: options.skipVerification
    });
    if (result.success) {
      console.log(ansis.green(i18n.t("marketplace:installSuccess", { name: packageName })));
      if (result.installedPath) {
        console.log(ansis.gray(`${i18n.t("marketplace:installedAt")}: ${result.installedPath}`));
      }
    } else {
      console.error(ansis.red(i18n.t("marketplace:installFailed", { name: packageName })));
      if (result.error) {
        console.error(ansis.red(i18n.t("marketplace:errors.installError", { error: result.error })));
      }
      throw new Error(`Install failed: ${packageName}`);
    }
  } catch (err) {
    console.error(ansis.red(i18n.t("marketplace:installFailed", { name: packageName })));
    console.error(err);
    throw err;
  }
}
async function uninstallCommand(packageName, options) {
  try {
    if (!await isPackageInstalled(packageName)) {
      console.error(ansis.red(i18n.t("marketplace:packageNotInstalled", { name: packageName })));
      throw new Error(`Package not installed: ${packageName}`);
    }
    console.log(ansis.green(i18n.t("marketplace:uninstalling", { name: packageName })));
    const result = await uninstallPackage(packageName, {
      force: options.force
    });
    if (result.success) {
      console.log(ansis.green(i18n.t("marketplace:uninstallSuccess", { name: packageName })));
    } else {
      console.error(ansis.red(i18n.t("marketplace:uninstallFailed", { name: packageName })));
      if (result.error) {
        console.error(ansis.red(i18n.t("marketplace:errors.uninstallError", { error: result.error })));
      }
      throw new Error(`Uninstall failed: ${packageName}`);
    }
  } catch (err) {
    console.error(ansis.red(i18n.t("marketplace:uninstallFailed", { name: packageName })));
    console.error(err);
    throw err;
  }
}
async function updateCommand(packageName, _options) {
  try {
    if (packageName) {
      console.log(ansis.green(i18n.t("marketplace:updating", { name: packageName })));
      const result = await updatePackage(packageName);
      if (result.success) {
        console.log(ansis.green(i18n.t("marketplace:updateSuccess", { name: packageName })));
      } else {
        console.error(ansis.red(i18n.t("marketplace:updateFailed", { name: packageName })));
        if (result.error) {
          console.error(ansis.red(result.error));
        }
        throw new Error(`Update failed: ${packageName}`);
      }
    } else {
      console.log(ansis.green(i18n.t("marketplace:checkingUpdates")));
      const updates = await checkForUpdates();
      if (updates.length === 0) {
        console.log(ansis.green(i18n.t("marketplace:noUpdates")));
        return;
      }
      console.log(ansis.yellow(i18n.t("marketplace:updatesAvailable", { count: updates.length })));
      console.log();
      for (const update of updates) {
        console.log(`  ${ansis.bold(update.id)}: ${ansis.gray(update.currentVersion)} \u2192 ${ansis.green(update.latestVersion)}`);
      }
      console.log();
      console.log(ansis.gray(i18n.t("marketplace:updateHint")));
    }
  } catch (err) {
    console.error(ansis.red(i18n.t("marketplace:updateCheckFailed")));
    console.error(err);
    throw err;
  }
}
async function listCommand(_options) {
  try {
    const installedList = await getInstalledPackages();
    if (installedList.length === 0) {
      console.log(ansis.yellow(i18n.t("marketplace:noInstalled")));
      return;
    }
    console.log(ansis.green(i18n.t("marketplace:installedPackages", { count: installedList.length })));
    console.log();
    for (const installed of installedList) {
      const pkg = installed.package;
      console.log(`${ansis.green("\u2713")} ${ansis.bold(pkg.name)} ${ansis.gray(`v${pkg.version}`)}`);
      console.log(`  ${pkg.description.en || Object.values(pkg.description)[0]}`);
      console.log(`  ${ansis.gray(i18n.t("marketplace:packageInfo.category"))}: ${pkg.category}`);
      console.log();
    }
  } catch (err) {
    console.error(ansis.red(i18n.t("marketplace:listFailed")));
    console.error(err);
    throw err;
  }
}
async function infoCommand(packageName, _options) {
  try {
    const pkg = await getPackage(packageName);
    if (!pkg) {
      console.error(ansis.red(i18n.t("marketplace:packageNotFound", { name: packageName })));
      throw new Error(`Package not found: ${packageName}`);
    }
    const installed = await isPackageInstalled(packageName);
    console.log();
    console.log(ansis.bold.cyan(pkg.name));
    console.log(ansis.gray("\u2500".repeat(50)));
    console.log();
    console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.description"))}: ${pkg.description.en || Object.values(pkg.description)[0]}`);
    console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.version"))}: ${pkg.version}`);
    console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.category"))}: ${pkg.category}`);
    if (pkg.author) {
      console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.author"))}: ${pkg.author}`);
    }
    if (pkg.license) {
      console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.license"))}: ${pkg.license}`);
    }
    if (pkg.repository) {
      console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.repository"))}: ${pkg.repository}`);
    }
    if (pkg.downloads !== void 0) {
      console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.downloads"))}: ${pkg.downloads.toLocaleString()}`);
    }
    if (pkg.rating !== void 0) {
      const stars = "\u2605".repeat(Math.round(pkg.rating));
      const emptyStars = "\u2606".repeat(5 - Math.round(pkg.rating));
      console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.rating"))}: ${ansis.yellow(stars)}${ansis.gray(emptyStars)} (${pkg.rating}/5)`);
    }
    if (pkg.keywords && pkg.keywords.length > 0) {
      console.log(`${ansis.bold(i18n.t("marketplace:packageInfo.keywords"))}: ${pkg.keywords.join(", ")}`);
    }
    if (pkg.verified === "verified") {
      console.log(`${ansis.green("\u2713")} ${i18n.t("marketplace:packageInfo.verified")}`);
    }
    console.log();
    console.log(`${ansis.bold("Status")}: ${installed ? ansis.green("Installed") : ansis.gray("Not installed")}`);
    console.log();
  } catch (err) {
    console.error(ansis.red(i18n.t("marketplace:infoFailed")));
    console.error(err);
    throw err;
  }
}
async function marketplaceMenu(action, options) {
  const opts = options || {};
  if (!action) {
    console.log(ansis.green("\n\u{1F6D2} Marketplace Commands:\n"));
    console.log("  ccjk cloud plugins search <query>  - Search packages");
    console.log("  ccjk cloud plugins install <pkg>   - Install package");
    console.log("  ccjk cloud plugins uninstall <pkg> - Uninstall package");
    console.log("  ccjk cloud plugins update [pkg]    - Update packages");
    console.log("  ccjk cloud plugins list            - List installed");
    console.log("  ccjk cloud plugins info <pkg>      - Package details\n");
    return;
  }
  const args = action.split(" ");
  const cmd = args[0];
  const param = args.slice(1).join(" ");
  switch (cmd) {
    case "search":
      if (param)
        await searchCommand(param);
      else
        console.log(ansis.yellow("Usage: ccjk cloud plugins search <query>"));
      break;
    case "install":
      if (param)
        await installCommand(param, opts);
      else
        console.log(ansis.yellow("Usage: ccjk cloud plugins install <package>"));
      break;
    case "uninstall":
      if (param)
        await uninstallCommand(param, opts);
      else
        console.log(ansis.yellow("Usage: ccjk cloud plugins uninstall <package>"));
      break;
    case "update":
      await updateCommand(param || void 0);
      break;
    case "list":
    case "ls":
      await listCommand();
      break;
    case "info":
      if (param)
        await infoCommand(param);
      else
        console.log(ansis.yellow("Usage: ccjk cloud plugins info <package>"));
      break;
    default:
      console.log(ansis.yellow(`Unknown action: ${cmd}`));
      await marketplaceMenu(void 0, opts);
  }
}

export { marketplaceMenu };
