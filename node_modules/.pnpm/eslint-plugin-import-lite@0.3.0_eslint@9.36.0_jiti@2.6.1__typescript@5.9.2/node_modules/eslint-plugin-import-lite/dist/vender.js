import { __commonJS, __require } from "./rolldown-runtime.js";

//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/deepMerge.js
var require_deepMerge = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/deepMerge.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isObjectNotArray = isObjectNotArray;
	exports.deepMerge = deepMerge;
	/**
	* Check if the variable contains an object strictly rejecting arrays
	* @returns `true` if obj is an object
	*/
	function isObjectNotArray(obj) {
		return typeof obj === "object" && obj != null && !Array.isArray(obj);
	}
	/**
	* Pure function - doesn't mutate either parameter!
	* Merges two objects together deeply, overwriting the properties in first with the properties in second
	* @param first The first object
	* @param second The second object
	* @returns a new object
	*/
	function deepMerge(first = {}, second = {}) {
		const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
		return Object.fromEntries([...keys].map((key) => {
			const firstHasKey = key in first;
			const secondHasKey = key in second;
			const firstValue = first[key];
			const secondValue = second[key];
			let value;
			if (firstHasKey && secondHasKey) if (isObjectNotArray(firstValue) && isObjectNotArray(secondValue)) value = deepMerge(firstValue, secondValue);
			else value = secondValue;
			else if (firstHasKey) value = firstValue;
			else value = secondValue;
			return [key, value];
		}));
	}
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/applyDefault.js
var require_applyDefault = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/applyDefault.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.applyDefault = applyDefault;
	const deepMerge_1 = require_deepMerge();
	/**
	* Pure function - doesn't mutate either parameter!
	* Uses the default options and overrides with the options provided by the user
	* @param defaultOptions the defaults
	* @param userOptions the user opts
	* @returns the options with defaults
	*/
	function applyDefault(defaultOptions, userOptions) {
		const options = structuredClone(defaultOptions);
		if (userOptions == null) return options;
		options.forEach((opt, i) => {
			if (userOptions[i] !== void 0) {
				const userOpt = userOptions[i];
				if ((0, deepMerge_1.isObjectNotArray)(userOpt) && (0, deepMerge_1.isObjectNotArray)(opt)) options[i] = (0, deepMerge_1.deepMerge)(opt, userOpt);
				else options[i] = userOpt;
			}
		});
		return options;
	}
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/parserSeemsToBeTSESLint.js
var require_parserSeemsToBeTSESLint = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/parserSeemsToBeTSESLint.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.parserSeemsToBeTSESLint = parserSeemsToBeTSESLint;
	function parserSeemsToBeTSESLint(parser) {
		return !!parser && /(?:typescript-eslint|\.\.)[\w/\\]*parser/.test(parser);
	}
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/getParserServices.js
var require_getParserServices = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/getParserServices.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getParserServices = getParserServices;
	const parserSeemsToBeTSESLint_1 = require_parserSeemsToBeTSESLint();
	const ERROR_MESSAGE_REQUIRES_PARSER_SERVICES = "You have used a rule which requires type information, but don't have parserOptions set to generate type information for this file. See https://typescript-eslint.io/getting-started/typed-linting for enabling linting with type information.";
	const ERROR_MESSAGE_UNKNOWN_PARSER = "Note: detected a parser other than @typescript-eslint/parser. Make sure the parser is configured to forward \"parserOptions.project\" to @typescript-eslint/parser.";
	function getParserServices(context, allowWithoutFullTypeInformation = false) {
		const parser = context.parserPath || context.languageOptions.parser?.meta?.name;
		if (context.sourceCode.parserServices?.esTreeNodeToTSNodeMap == null || context.sourceCode.parserServices.tsNodeToESTreeNodeMap == null) throwError(parser);
		if (context.sourceCode.parserServices.program == null && !allowWithoutFullTypeInformation) throwError(parser);
		return context.sourceCode.parserServices;
	}
	function throwError(parser) {
		const messages = [
			ERROR_MESSAGE_REQUIRES_PARSER_SERVICES,
			`Parser: ${parser || "(unknown)"}`,
			!(0, parserSeemsToBeTSESLint_1.parserSeemsToBeTSESLint)(parser) && ERROR_MESSAGE_UNKNOWN_PARSER
		].filter(Boolean);
		throw new Error(messages.join("\n"));
	}
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/InferTypesFromRule.js
var require_InferTypesFromRule = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/InferTypesFromRule.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/nullThrows.js
var require_nullThrows = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/nullThrows.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.NullThrowsReasons = void 0;
	exports.nullThrows = nullThrows;
	/**
	* A set of common reasons for calling nullThrows
	*/
	exports.NullThrowsReasons = {
		MissingParent: "Expected node to have a parent.",
		MissingToken: (token, thing) => `Expected to find a ${token} for the ${thing}.`
	};
	/**
	* Assert that a value must not be null or undefined.
	* This is a nice explicit alternative to the non-null assertion operator.
	*/
	function nullThrows(value, message) {
		if (value == null) throw new Error(`Non-null Assertion Failed: ${message}`);
		return value;
	}
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/RuleCreator.js
var require_RuleCreator = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/RuleCreator.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.RuleCreator = RuleCreator;
	const applyDefault_1 = require_applyDefault();
	/**
	* Creates reusable function to create rules with default options and docs URLs.
	*
	* @param urlCreator Creates a documentation URL for a given rule name.
	* @returns Function to create a rule with the docs URL format.
	*/
	function RuleCreator(urlCreator) {
		return function createNamedRule({ meta, name,...rule }) {
			return createRule({
				meta: {
					...meta,
					docs: {
						...meta.docs,
						url: urlCreator(name)
					}
				},
				...rule
			});
		};
	}
	function createRule({ create, defaultOptions, meta }) {
		return {
			create(context) {
				const optionsWithDefault = (0, applyDefault_1.applyDefault)(defaultOptions, context.options);
				return create(context, optionsWithDefault);
			},
			defaultOptions,
			meta
		};
	}
	/**
	* Creates a well-typed TSESLint custom ESLint rule without a docs URL.
	*
	* @returns Well-typed TSESLint custom ESLint rule.
	* @remarks It is generally better to provide a docs URL function to RuleCreator.
	*/
	RuleCreator.withoutDocs = function withoutDocs(args) {
		return createRule(args);
	};
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/index.js
var require_eslint_utils$1 = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/eslint-utils/index.js"(exports) {
	var __createBinding$7 = void 0 && (void 0).__createBinding || (Object.create ? function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	} : function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	});
	var __exportStar$2 = void 0 && (void 0).__exportStar || function(m, exports$1) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding$7(exports$1, m, p);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	__exportStar$2(require_applyDefault(), exports);
	__exportStar$2(require_deepMerge(), exports);
	__exportStar$2(require_getParserServices(), exports);
	__exportStar$2(require_InferTypesFromRule(), exports);
	__exportStar$2(require_nullThrows(), exports);
	__exportStar$2(require_RuleCreator(), exports);
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/astUtilities.js
var require_astUtilities = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/astUtilities.js"(exports) {
	var __createBinding$6 = void 0 && (void 0).__createBinding || (Object.create ? function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	} : function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	});
	var __setModuleDefault$4 = void 0 && (void 0).__setModuleDefault || (Object.create ? function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	} : function(o, v) {
		o["default"] = v;
	});
	var __importStar$4 = void 0 && (void 0).__importStar || function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o$1) {
				var ar = [];
				for (var k in o$1) if (Object.prototype.hasOwnProperty.call(o$1, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding$6(result, mod, k[i]);
			}
			__setModuleDefault$4(result, mod);
			return result;
		};
	}();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isParenthesized = exports.hasSideEffect = exports.getStringIfConstant = exports.getStaticValue = exports.getPropertyName = exports.getFunctionNameWithKind = exports.getFunctionHeadLocation = void 0;
	const eslintUtils$4 = __importStar$4(__require("@eslint-community/eslint-utils"));
	/**
	* Get the proper location of a given function node to report.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getfunctionheadlocation}
	*/
	exports.getFunctionHeadLocation = eslintUtils$4.getFunctionHeadLocation;
	/**
	* Get the name and kind of a given function node.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getfunctionnamewithkind}
	*/
	exports.getFunctionNameWithKind = eslintUtils$4.getFunctionNameWithKind;
	/**
	* Get the property name of a given property node.
	* If the node is a computed property, this tries to compute the property name by the getStringIfConstant function.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getpropertyname}
	* @returns The property name of the node. If the property name is not constant then it returns `null`.
	*/
	exports.getPropertyName = eslintUtils$4.getPropertyName;
	/**
	* Get the value of a given node if it can decide the value statically.
	* If the 2nd parameter `initialScope` was given, this function tries to resolve identifier references which are in the
	* given node as much as possible. In the resolving way, it does on the assumption that built-in global objects have
	* not been modified.
	* For example, it considers `Symbol.iterator`, `Symbol.for('k')`, ` String.raw``hello`` `, and `Object.freeze({a: 1}).a` as static, but `Symbol('k')` is not static.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getstaticvalue}
	* @returns The `{ value: any }` shaped object. The `value` property is the static value. If it couldn't compute the
	* static value of the node, it returns `null`.
	*/
	exports.getStaticValue = eslintUtils$4.getStaticValue;
	/**
	* Get the string value of a given node.
	* This function is a tiny wrapper of the getStaticValue function.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getstringifconstant}
	*/
	exports.getStringIfConstant = eslintUtils$4.getStringIfConstant;
	/**
	* Check whether a given node has any side effect or not.
	* The side effect means that it may modify a certain variable or object member. This function considers the node which
	* contains the following types as the node which has side effects:
	* - `AssignmentExpression`
	* - `AwaitExpression`
	* - `CallExpression`
	* - `ImportExpression`
	* - `NewExpression`
	* - `UnaryExpression([operator = "delete"])`
	* - `UpdateExpression`
	* - `YieldExpression`
	* - When `options.considerGetters` is `true`:
	*   - `MemberExpression`
	* - When `options.considerImplicitTypeConversion` is `true`:
	*   - `BinaryExpression([operator = "==" | "!=" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "|" | "^" | "&" | "in"])`
	*   - `MemberExpression([computed = true])`
	*   - `MethodDefinition([computed = true])`
	*   - `Property([computed = true])`
	*   - `UnaryExpression([operator = "-" | "+" | "!" | "~"])`
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#hassideeffect}
	*/
	exports.hasSideEffect = eslintUtils$4.hasSideEffect;
	exports.isParenthesized = eslintUtils$4.isParenthesized;
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/PatternMatcher.js
var require_PatternMatcher = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/PatternMatcher.js"(exports) {
	var __createBinding$5 = void 0 && (void 0).__createBinding || (Object.create ? function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	} : function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	});
	var __setModuleDefault$3 = void 0 && (void 0).__setModuleDefault || (Object.create ? function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	} : function(o, v) {
		o["default"] = v;
	});
	var __importStar$3 = void 0 && (void 0).__importStar || function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o$1) {
				var ar = [];
				for (var k in o$1) if (Object.prototype.hasOwnProperty.call(o$1, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding$5(result, mod, k[i]);
			}
			__setModuleDefault$3(result, mod);
			return result;
		};
	}();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.PatternMatcher = void 0;
	const eslintUtils$3 = __importStar$3(__require("@eslint-community/eslint-utils"));
	/**
	* The class to find a pattern in strings as handling escape sequences.
	* It ignores the found pattern if it's escaped with `\`.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#patternmatcher-class}
	*/
	exports.PatternMatcher = eslintUtils$3.PatternMatcher;
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/predicates.js
var require_predicates$1 = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/predicates.js"(exports) {
	var __createBinding$4 = void 0 && (void 0).__createBinding || (Object.create ? function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	} : function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	});
	var __setModuleDefault$2 = void 0 && (void 0).__setModuleDefault || (Object.create ? function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	} : function(o, v) {
		o["default"] = v;
	});
	var __importStar$2 = void 0 && (void 0).__importStar || function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o$1) {
				var ar = [];
				for (var k in o$1) if (Object.prototype.hasOwnProperty.call(o$1, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding$4(result, mod, k[i]);
			}
			__setModuleDefault$2(result, mod);
			return result;
		};
	}();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isNotSemicolonToken = exports.isSemicolonToken = exports.isNotOpeningParenToken = exports.isOpeningParenToken = exports.isNotOpeningBracketToken = exports.isOpeningBracketToken = exports.isNotOpeningBraceToken = exports.isOpeningBraceToken = exports.isNotCommentToken = exports.isCommentToken = exports.isNotCommaToken = exports.isCommaToken = exports.isNotColonToken = exports.isColonToken = exports.isNotClosingParenToken = exports.isClosingParenToken = exports.isNotClosingBracketToken = exports.isClosingBracketToken = exports.isNotClosingBraceToken = exports.isClosingBraceToken = exports.isNotArrowToken = exports.isArrowToken = void 0;
	const eslintUtils$2 = __importStar$2(__require("@eslint-community/eslint-utils"));
	exports.isArrowToken = eslintUtils$2.isArrowToken;
	exports.isNotArrowToken = eslintUtils$2.isNotArrowToken;
	exports.isClosingBraceToken = eslintUtils$2.isClosingBraceToken;
	exports.isNotClosingBraceToken = eslintUtils$2.isNotClosingBraceToken;
	exports.isClosingBracketToken = eslintUtils$2.isClosingBracketToken;
	exports.isNotClosingBracketToken = eslintUtils$2.isNotClosingBracketToken;
	exports.isClosingParenToken = eslintUtils$2.isClosingParenToken;
	exports.isNotClosingParenToken = eslintUtils$2.isNotClosingParenToken;
	exports.isColonToken = eslintUtils$2.isColonToken;
	exports.isNotColonToken = eslintUtils$2.isNotColonToken;
	exports.isCommaToken = eslintUtils$2.isCommaToken;
	exports.isNotCommaToken = eslintUtils$2.isNotCommaToken;
	exports.isCommentToken = eslintUtils$2.isCommentToken;
	exports.isNotCommentToken = eslintUtils$2.isNotCommentToken;
	exports.isOpeningBraceToken = eslintUtils$2.isOpeningBraceToken;
	exports.isNotOpeningBraceToken = eslintUtils$2.isNotOpeningBraceToken;
	exports.isOpeningBracketToken = eslintUtils$2.isOpeningBracketToken;
	exports.isNotOpeningBracketToken = eslintUtils$2.isNotOpeningBracketToken;
	exports.isOpeningParenToken = eslintUtils$2.isOpeningParenToken;
	exports.isNotOpeningParenToken = eslintUtils$2.isNotOpeningParenToken;
	exports.isSemicolonToken = eslintUtils$2.isSemicolonToken;
	exports.isNotSemicolonToken = eslintUtils$2.isNotSemicolonToken;
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/ReferenceTracker.js
var require_ReferenceTracker = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/ReferenceTracker.js"(exports) {
	var __createBinding$3 = void 0 && (void 0).__createBinding || (Object.create ? function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	} : function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	});
	var __setModuleDefault$1 = void 0 && (void 0).__setModuleDefault || (Object.create ? function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	} : function(o, v) {
		o["default"] = v;
	});
	var __importStar$1 = void 0 && (void 0).__importStar || function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o$1) {
				var ar = [];
				for (var k in o$1) if (Object.prototype.hasOwnProperty.call(o$1, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding$3(result, mod, k[i]);
			}
			__setModuleDefault$1(result, mod);
			return result;
		};
	}();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ReferenceTracker = void 0;
	const eslintUtils$1 = __importStar$1(__require("@eslint-community/eslint-utils"));
	const ReferenceTrackerREAD = eslintUtils$1.ReferenceTracker.READ;
	const ReferenceTrackerCALL = eslintUtils$1.ReferenceTracker.CALL;
	const ReferenceTrackerCONSTRUCT = eslintUtils$1.ReferenceTracker.CONSTRUCT;
	const ReferenceTrackerESM = eslintUtils$1.ReferenceTracker.ESM;
	/**
	* The tracker for references. This provides reference tracking for global variables, CommonJS modules, and ES modules.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/scope-utils.html#referencetracker-class}
	*/
	exports.ReferenceTracker = eslintUtils$1.ReferenceTracker;
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/scopeAnalysis.js
var require_scopeAnalysis = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/scopeAnalysis.js"(exports) {
	var __createBinding$2 = void 0 && (void 0).__createBinding || (Object.create ? function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	} : function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	});
	var __setModuleDefault = void 0 && (void 0).__setModuleDefault || (Object.create ? function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	} : function(o, v) {
		o["default"] = v;
	});
	var __importStar = void 0 && (void 0).__importStar || function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o$1) {
				var ar = [];
				for (var k in o$1) if (Object.prototype.hasOwnProperty.call(o$1, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding$2(result, mod, k[i]);
			}
			__setModuleDefault(result, mod);
			return result;
		};
	}();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.getInnermostScope = exports.findVariable = void 0;
	const eslintUtils = __importStar(__require("@eslint-community/eslint-utils"));
	/**
	* Get the variable of a given name.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/scope-utils.html#findvariable}
	*/
	exports.findVariable = eslintUtils.findVariable;
	/**
	* Get the innermost scope which contains a given node.
	*
	* @see {@link https://eslint-community.github.io/eslint-utils/api/scope-utils.html#getinnermostscope}
	* @returns The innermost scope which contains the given node.
	* If such scope doesn't exist then it returns the 1st argument `initialScope`.
	*/
	exports.getInnermostScope = eslintUtils.getInnermostScope;
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/index.js
var require_eslint_utils = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/eslint-utils/index.js"(exports) {
	var __createBinding$1 = void 0 && (void 0).__createBinding || (Object.create ? function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	} : function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	});
	var __exportStar$1 = void 0 && (void 0).__exportStar || function(m, exports$1) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding$1(exports$1, m, p);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	__exportStar$1(require_astUtilities(), exports);
	__exportStar$1(require_PatternMatcher(), exports);
	__exportStar$1(require_predicates$1(), exports);
	__exportStar$1(require_ReferenceTracker(), exports);
	__exportStar$1(require_scopeAnalysis(), exports);
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/helpers.js
var require_helpers = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/helpers.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isNotTokenOfTypeWithConditions = exports.isTokenOfTypeWithConditions = exports.isNodeOfTypeWithConditions = exports.isNodeOfTypes = exports.isNodeOfType = void 0;
	const isNodeOfType = (nodeType) => (node) => node?.type === nodeType;
	exports.isNodeOfType = isNodeOfType;
	const isNodeOfTypes = (nodeTypes) => (node) => !!node && nodeTypes.includes(node.type);
	exports.isNodeOfTypes = isNodeOfTypes;
	const isNodeOfTypeWithConditions = (nodeType, conditions) => {
		const entries = Object.entries(conditions);
		return (node) => node?.type === nodeType && entries.every(([key, value]) => node[key] === value);
	};
	exports.isNodeOfTypeWithConditions = isNodeOfTypeWithConditions;
	const isTokenOfTypeWithConditions = (tokenType, conditions) => {
		const entries = Object.entries(conditions);
		return (token) => token?.type === tokenType && entries.every(([key, value]) => token[key] === value);
	};
	exports.isTokenOfTypeWithConditions = isTokenOfTypeWithConditions;
	const isNotTokenOfTypeWithConditions = (tokenType, conditions) => (token) => !(0, exports.isTokenOfTypeWithConditions)(tokenType, conditions)(token);
	exports.isNotTokenOfTypeWithConditions = isNotTokenOfTypeWithConditions;
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/misc.js
var require_misc = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/misc.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.LINEBREAK_MATCHER = void 0;
	exports.isTokenOnSameLine = isTokenOnSameLine;
	exports.LINEBREAK_MATCHER = /\r\n|[\r\n\u2028\u2029]/;
	/**
	* Determines whether two adjacent tokens are on the same line
	*/
	function isTokenOnSameLine(left, right) {
		return left.loc.end.line === right.loc.start.line;
	}
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ts-estree.js
var require_ts_estree = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ts-estree.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.TSESTree = exports.AST_TOKEN_TYPES = exports.AST_NODE_TYPES = void 0;
	var types_1 = __require("@typescript-eslint/types");
	Object.defineProperty(exports, "AST_NODE_TYPES", {
		enumerable: true,
		get: function() {
			return types_1.AST_NODE_TYPES;
		}
	});
	Object.defineProperty(exports, "AST_TOKEN_TYPES", {
		enumerable: true,
		get: function() {
			return types_1.AST_TOKEN_TYPES;
		}
	});
	Object.defineProperty(exports, "TSESTree", {
		enumerable: true,
		get: function() {
			return types_1.TSESTree;
		}
	});
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/predicates.js
var require_predicates = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/predicates.js"(exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isLoop = exports.isImportKeyword = exports.isTypeKeyword = exports.isAwaitKeyword = exports.isAwaitExpression = exports.isIdentifier = exports.isConstructor = exports.isClassOrTypeElement = exports.isTSConstructorType = exports.isTSFunctionType = exports.isFunctionOrFunctionType = exports.isFunctionType = exports.isFunction = exports.isVariableDeclarator = exports.isTypeAssertion = exports.isLogicalOrOperator = exports.isOptionalCallExpression = exports.isNotNonNullAssertionPunctuator = exports.isNonNullAssertionPunctuator = exports.isNotOptionalChainPunctuator = exports.isOptionalChainPunctuator = void 0;
	exports.isSetter = isSetter;
	const ts_estree_1 = require_ts_estree();
	const helpers_1 = require_helpers();
	exports.isOptionalChainPunctuator = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Punctuator, { value: "?." });
	exports.isNotOptionalChainPunctuator = (0, helpers_1.isNotTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Punctuator, { value: "?." });
	exports.isNonNullAssertionPunctuator = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Punctuator, { value: "!" });
	exports.isNotNonNullAssertionPunctuator = (0, helpers_1.isNotTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Punctuator, { value: "!" });
	/**
	* Returns true if and only if the node represents: foo?.() or foo.bar?.()
	*/
	exports.isOptionalCallExpression = (0, helpers_1.isNodeOfTypeWithConditions)(ts_estree_1.AST_NODE_TYPES.CallExpression, { optional: true });
	/**
	* Returns true if and only if the node represents logical OR
	*/
	exports.isLogicalOrOperator = (0, helpers_1.isNodeOfTypeWithConditions)(ts_estree_1.AST_NODE_TYPES.LogicalExpression, { operator: "||" });
	/**
	* Checks if a node is a type assertion:
	* ```
	* x as foo
	* <foo>x
	* ```
	*/
	exports.isTypeAssertion = (0, helpers_1.isNodeOfTypes)([ts_estree_1.AST_NODE_TYPES.TSAsExpression, ts_estree_1.AST_NODE_TYPES.TSTypeAssertion]);
	exports.isVariableDeclarator = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.VariableDeclarator);
	const functionTypes = [
		ts_estree_1.AST_NODE_TYPES.ArrowFunctionExpression,
		ts_estree_1.AST_NODE_TYPES.FunctionDeclaration,
		ts_estree_1.AST_NODE_TYPES.FunctionExpression
	];
	exports.isFunction = (0, helpers_1.isNodeOfTypes)(functionTypes);
	const functionTypeTypes = [
		ts_estree_1.AST_NODE_TYPES.TSCallSignatureDeclaration,
		ts_estree_1.AST_NODE_TYPES.TSConstructorType,
		ts_estree_1.AST_NODE_TYPES.TSConstructSignatureDeclaration,
		ts_estree_1.AST_NODE_TYPES.TSDeclareFunction,
		ts_estree_1.AST_NODE_TYPES.TSEmptyBodyFunctionExpression,
		ts_estree_1.AST_NODE_TYPES.TSFunctionType,
		ts_estree_1.AST_NODE_TYPES.TSMethodSignature
	];
	exports.isFunctionType = (0, helpers_1.isNodeOfTypes)(functionTypeTypes);
	exports.isFunctionOrFunctionType = (0, helpers_1.isNodeOfTypes)([...functionTypes, ...functionTypeTypes]);
	exports.isTSFunctionType = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.TSFunctionType);
	exports.isTSConstructorType = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.TSConstructorType);
	exports.isClassOrTypeElement = (0, helpers_1.isNodeOfTypes)([
		ts_estree_1.AST_NODE_TYPES.PropertyDefinition,
		ts_estree_1.AST_NODE_TYPES.FunctionExpression,
		ts_estree_1.AST_NODE_TYPES.MethodDefinition,
		ts_estree_1.AST_NODE_TYPES.TSAbstractPropertyDefinition,
		ts_estree_1.AST_NODE_TYPES.TSAbstractMethodDefinition,
		ts_estree_1.AST_NODE_TYPES.TSEmptyBodyFunctionExpression,
		ts_estree_1.AST_NODE_TYPES.TSIndexSignature,
		ts_estree_1.AST_NODE_TYPES.TSCallSignatureDeclaration,
		ts_estree_1.AST_NODE_TYPES.TSConstructSignatureDeclaration,
		ts_estree_1.AST_NODE_TYPES.TSMethodSignature,
		ts_estree_1.AST_NODE_TYPES.TSPropertySignature
	]);
	/**
	* Checks if a node is a constructor method.
	*/
	exports.isConstructor = (0, helpers_1.isNodeOfTypeWithConditions)(ts_estree_1.AST_NODE_TYPES.MethodDefinition, { kind: "constructor" });
	/**
	* Checks if a node is a setter method.
	*/
	function isSetter(node) {
		return !!node && (node.type === ts_estree_1.AST_NODE_TYPES.MethodDefinition || node.type === ts_estree_1.AST_NODE_TYPES.Property) && node.kind === "set";
	}
	exports.isIdentifier = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.Identifier);
	/**
	* Checks if a node represents an `await …` expression.
	*/
	exports.isAwaitExpression = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.AwaitExpression);
	/**
	* Checks if a possible token is the `await` keyword.
	*/
	exports.isAwaitKeyword = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Identifier, { value: "await" });
	/**
	* Checks if a possible token is the `type` keyword.
	*/
	exports.isTypeKeyword = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Identifier, { value: "type" });
	/**
	* Checks if a possible token is the `import` keyword.
	*/
	exports.isImportKeyword = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Keyword, { value: "import" });
	exports.isLoop = (0, helpers_1.isNodeOfTypes)([
		ts_estree_1.AST_NODE_TYPES.DoWhileStatement,
		ts_estree_1.AST_NODE_TYPES.ForStatement,
		ts_estree_1.AST_NODE_TYPES.ForInStatement,
		ts_estree_1.AST_NODE_TYPES.ForOfStatement,
		ts_estree_1.AST_NODE_TYPES.WhileStatement
	]);
} });

//#endregion
//#region node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/index.js
var require_ast_utils = __commonJS({ "node_modules/.pnpm/@typescript-eslint+utils@8.34.0_eslint@9.28.0_jiti@2.4.2__typescript@5.8.3/node_modules/@typescript-eslint/utils/dist/ast-utils/index.js"(exports) {
	var __createBinding = void 0 && (void 0).__createBinding || (Object.create ? function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	} : function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	});
	var __exportStar = void 0 && (void 0).__exportStar || function(m, exports$1) {
		for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	__exportStar(require_eslint_utils(), exports);
	__exportStar(require_helpers(), exports);
	__exportStar(require_misc(), exports);
	__exportStar(require_predicates(), exports);
} });

//#endregion
export { require_ast_utils, require_eslint_utils$1 as require_eslint_utils };