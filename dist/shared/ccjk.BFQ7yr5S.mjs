function addNumbersToChoices(choices, startFrom = 1, format = (n) => `${n}. `) {
  let currentNumber = startFrom;
  return choices.map((choice) => {
    if (choice.disabled) {
      return choice;
    }
    const numbered = {
      ...choice,
      name: `${format(currentNumber)}${choice.name}`
    };
    currentNumber++;
    return numbered;
  });
}

export { addNumbersToChoices as a };
