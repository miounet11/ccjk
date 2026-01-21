import { __esm } from "../rolldown-runtime.js";
import { createRule, getValue, init_ast, init_utils, sourceType } from "../utils.js";

//#region src/rules/no-default-export/no-default-export.ts
var no_default_export_default;
var init_no_default_export = __esm({ "src/rules/no-default-export/no-default-export.ts"() {
	init_utils();
	init_ast();
	no_default_export_default = createRule({
		name: "no-default-export",
		meta: {
			type: "suggestion",
			docs: { description: "Forbid default exports." },
			schema: [],
			messages: {
				preferNamed: "Prefer named exports.",
				noAliasDefault: "Do not alias `{{local}}` as `default`. Just export `{{local}}` itself instead."
			}
		},
		defaultOptions: [],
		create(context) {
			if (sourceType(context) !== "module") return {};
			const { sourceCode } = context;
			return {
				ExportDefaultDeclaration(node) {
					const { loc } = sourceCode.getFirstTokens(node)[1] || {};
					context.report({
						node,
						messageId: "preferNamed",
						loc
					});
				},
				ExportNamedDeclaration(node) {
					for (const specifier of node.specifiers.filter((specifier$1) => getValue(specifier$1.exported) === "default")) {
						const { loc } = sourceCode.getFirstTokens(node)[1] || {};
						if (specifier.type === "ExportDefaultSpecifier") context.report({
							node,
							messageId: "preferNamed",
							loc
						});
						else if (specifier.type === "ExportSpecifier") context.report({
							node,
							messageId: "noAliasDefault",
							data: { local: getValue(specifier.local) },
							loc
						});
					}
				}
			};
		}
	});
} });

//#endregion
export { init_no_default_export, no_default_export_default };