import { __esm } from "./rolldown-runtime.js";
import "./vender.js";
import "./utils.js";
import { consistent_type_specifier_style_default, init_consistent_type_specifier_style } from "./rules/consistent-type-specifier-style.js";
import { first_default, init_first } from "./rules/first.js";
import { init_newline_after_import, newline_after_import_default } from "./rules/newline-after-import.js";
import { init_no_default_export, no_default_export_default } from "./rules/no-default-export.js";
import { init_no_duplicates, no_duplicates_default } from "./rules/no-duplicates.js";
import { init_no_mutable_exports, no_mutable_exports_default } from "./rules/no-mutable-exports.js";
import { init_no_named_default, no_named_default_default } from "./rules/no-named-default.js";

//#region src/rules/index.ts
var rules;
var init_rules = __esm({ "src/rules/index.ts"() {
	init_consistent_type_specifier_style();
	init_first();
	init_newline_after_import();
	init_no_default_export();
	init_no_duplicates();
	init_no_mutable_exports();
	init_no_named_default();
	rules = {
		"consistent-type-specifier-style": consistent_type_specifier_style_default,
		"first": first_default,
		"newline-after-import": newline_after_import_default,
		"no-default-export": no_default_export_default,
		"no-duplicates": no_duplicates_default,
		"no-mutable-exports": no_mutable_exports_default,
		"no-named-default": no_named_default_default
	};
} });

//#endregion
//#region src/index.ts
function generateConfig(name, filter) {
	let ruleMeta = Object.entries(rules).filter(([_, rule]) => !rule.meta?.deprecated);
	if (filter) ruleMeta = ruleMeta.filter(([ruleName, rule]) => filter(ruleName, rule));
	return {
		name: `${pluginName}/${name}`,
		plugins: { [pluginName]: {
			name: pluginName,
			rules
		} },
		rules: Object.fromEntries(ruleMeta.map(([ruleName]) => [`${pluginName}/${ruleName}`, "error"]))
	};
}
var pluginName, src_default;
var init_src = __esm({ "src/index.ts"() {
	init_rules();
	pluginName = "import-lite";
	src_default = {
		rules,
		configs: {
			recommended: generateConfig("recommended", (_, rule) => !!rule.meta?.docs?.recommended),
			all: generateConfig("all")
		}
	};
} });

//#endregion
init_src();
export { src_default as default };