import { __esm, __export, __reExport, __toESM } from "./rolldown-runtime.js";
import { require_ast_utils, require_eslint_utils } from "./vender.js";
import { AST_NODE_TYPES, AST_NODE_TYPES as AST_NODE_TYPES$1, AST_TOKEN_TYPES } from "@typescript-eslint/types";

//#region src/utils/index.ts
function createRule({ name, create, defaultOptions = [], meta }) {
	return {
		create: (context) => {
			const optionsCount = Math.max(context.options.length, defaultOptions.length);
			const optionsWithDefault = Array.from({ length: optionsCount }, (_, i) => {
				if ((0, import_eslint_utils.isObjectNotArray)(context.options[i]) && (0, import_eslint_utils.isObjectNotArray)(defaultOptions[i])) return (0, import_eslint_utils.deepMerge)(defaultOptions[i], context.options[i]);
				return context.options[i] ?? defaultOptions[i];
			});
			return create(context, optionsWithDefault);
		},
		defaultOptions,
		meta: {
			...meta,
			docs: {
				...meta.docs,
				url: `https://github.com/9romise/eslint-plugin-import-lite/blob/main/src/rules/${name}/README.md`
			}
		}
	};
}
function sourceType(context) {
	if ("sourceType" in context.parserOptions) return context.parserOptions.sourceType;
	if ("languageOptions" in context && context.languageOptions) return context.languageOptions.sourceType;
}
var import_eslint_utils;
var init_utils = __esm({ "src/utils/index.ts"() {
	import_eslint_utils = __toESM(require_eslint_utils(), 1);
} });

//#endregion
//#region src/utils/ast.ts
var ast_exports = {};
__export(ast_exports, {
	AST_NODE_TYPES: () => AST_NODE_TYPES$1,
	AST_TOKEN_TYPES: () => AST_TOKEN_TYPES,
	getValue: () => getValue
});
function getValue(node) {
	switch (node.type) {
		case AST_NODE_TYPES.Identifier: return node.name;
		case AST_NODE_TYPES.Literal: return node.value;
		default: throw new Error(`Unsupported node type: ${node.type}`);
	}
}
var init_ast = __esm({ "src/utils/ast.ts"() {
	__reExport(ast_exports, __toESM(require_ast_utils(), 1));
} });

//#endregion
export { ast_exports, createRule, getValue, init_ast, init_utils, sourceType };