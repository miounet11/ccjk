import { Linter, Rule } from "eslint";

//#region src/utils/index.d.ts
interface ESLintRuleModule<T extends readonly unknown[], TMessageIds extends string> extends Rule.RuleModule {
  defaultOptions: T;
}
//#endregion
//#region src/index.d.ts
declare const _default: {
  rules: Record<string, ESLintRuleModule<unknown[], string>>;
  configs: {
    recommended: Linter.Config<Linter.RulesRecord>;
    all: Linter.Config<Linter.RulesRecord>;
  };
};
//#endregion
export { _default as default };