# `inquirer-toggle`

Simple interactive command line prompt to gather boolean input from users. Inspired by [prompts](https://www.npmjs.com/package/prompts#togglemessage-initial-active-inactive).

![Toggle prompt](example_output.png)

# Installation

```sh
npm install inquirer-toggle

yarn add inquirer-toggle
```

# Usage

```js
import toggle from 'inquirer-toggle';

const answer = await toggle({ message: 'Continue?' });
```

## Options

| Property              | Type                 | Required | Default            | Description                                              |
|-----------------------|----------------------| -------- |--------------------|----------------------------------------------------------|
| message               | `string`             | yes      | -                  | The question to be displayed to the user.                |
| default               | `boolean`            | no       | `false`            | The default answer when the user doesn't provide one.    |
| theme                 | `Object`             | no       | -                  | An object to customize the look of the prompt.           |
| theme.active          | `string`             | no       | `"yes"`            | The text to display for the active part of the toggle.   |
| theme.inactive        | `string`             | no       | `"no"`             | The text to display for the inactive part of the toggle. |
| theme.prefix          | `string`             | no       | `chalk.green('?')` | The prefix to display before the message.                |
| theme.style           | `Object`             | no       | -                  | An object to customize the styles of the prompt.         |
| theme.style.message   | `(string) => string` | no       | `chalk.bold`       | A function to style the message.                         |
| theme.style.answer    | `(string) => string` | no       | `chalk.cyan`       | A function to style the answer.                          |
| theme.style.highlight | `(string) => string` | no       | `chalk.cyan`       | A function to style the highlighted user selection.      |


## Theming

You can theme a prompt by passing a `theme` object option. The theme object only need to includes the keys you wish to modify, we'll fallback on the defaults for the rest.

```ts
type Theme = {
    message: string;
    default?: boolean;
    theme?: {
        active?: string;
        inactive?: string;
        prefix?: Theme["prefix"];
        style?: {
            message?: Theme["style"]["message"];
            answer?: Theme["style"]["answer"];
            highlight?: Theme["style"]["highlight"];
        }
    };
};
```

# License

Copyright (c) 2024 Sertac Karahoda<br/>
Licensed under the MIT license.
