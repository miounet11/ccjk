import { type Theme } from "@inquirer/core";
type InquirerToggleConfig = {
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
        };
    };
};
declare const _default: import("@inquirer/type").Prompt<boolean, InquirerToggleConfig>;
export default _default;
