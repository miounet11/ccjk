import { __esm } from "../rolldown-runtime.js";
import { createRule, getValue, init_ast, init_utils } from "../utils.js";

//#region src/rules/no-named-default/no-named-default.ts
var no_named_default_default;
var init_no_named_default = __esm({ "src/rules/no-named-default/no-named-default.ts"() {
	init_utils();
	init_ast();
	no_named_default_default = createRule({
		name: "no-named-default",
		meta: {
			type: "suggestion",
			docs: { description: "Forbid named default exports." },
			schema: [],
			messages: { default: `Use default import syntax to import '{{importName}}'.` }
		},
		defaultOptions: [],
		create(context) {
			return { ImportDeclaration(node) {
				for (const im of node.specifiers) {
					if ("importKind" in im && im.importKind === "type") continue;
					if (im.type === "ImportSpecifier" && getValue(im.imported) === "default") context.report({
						node: im.local,
						messageId: "default",
						data: { importName: im.local.name }
					});
				}
			} };
		}
	});
} });

//#endregion
export { init_no_named_default, no_named_default_default };