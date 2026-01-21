import process__default from 'node:process';
import ansis from 'ansis';
import { ensureI18nInitialized, i18n } from '../chunks/index.mjs';

function handleExitPromptError(error) {
  const isExitError = error instanceof Error && (error.name === "ExitPromptError" || error.message?.includes("ExitPromptError") || error.message?.includes("User force closed the prompt"));
  if (isExitError) {
    ensureI18nInitialized();
    console.log(ansis.green(`
${i18n.t("common:goodbye")}
`));
    process__default.exit(0);
  }
  return false;
}
function handleGeneralError(error) {
  ensureI18nInitialized();
  console.error(ansis.red(`${i18n.t("errors:generalError")}:`), error);
  if (error instanceof Error) {
    console.error(ansis.gray(`${i18n.t("errors:stackTrace")}: ${error.stack}`));
  }
  process__default.exit(1);
}

export { handleGeneralError as a, handleExitPromptError as h };
