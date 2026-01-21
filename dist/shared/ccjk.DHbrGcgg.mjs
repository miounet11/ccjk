import toggleModule from 'inquirer-toggle';

const togglePrompt = toggleModule?.default?.default || toggleModule?.default || toggleModule;
async function promptBoolean(options) {
  const { message, defaultValue = false, theme } = options;
  return await togglePrompt({
    message,
    default: defaultValue,
    ...theme ? { theme } : {}
  });
}

export { promptBoolean as p };
