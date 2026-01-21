declare const _default: {
    meta: {
        type: "problem";
        docs: {
            description: string;
            url: string;
        };
        fixable: "code";
        messages: {
            bareUrl: string;
        };
    };
    create(context: import("@eslint/core").RuleContext<{
        LangOptions: import("../types.js").MarkdownLanguageOptions;
        Code: import("../index.js").MarkdownSourceCode;
        RuleOptions: [];
        Node: Node;
        MessageIds: "bareUrl";
    }>): {
        "root:exit"(): void;
        paragraph(node: Paragraph): void;
        heading(node: Heading): void;
        tableCell(node: TableCell): void;
    };
};
export default _default;
export type NoBareUrlsMessageIds = "bareUrl";
export type NoBareUrlsOptions = [];
export type NoBareUrlsRuleDefinition = MarkdownRuleDefinition<{
    RuleOptions: NoBareUrlsOptions;
    MessageIds: NoBareUrlsMessageIds;
}>;
import type { Node } from "mdast";
import type { Paragraph } from "mdast";
import type { Heading } from "mdast";
import type { TableCell } from "mdast";
import type { MarkdownRuleDefinition } from "../types.js";
