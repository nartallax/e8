import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import stylistic from "@stylistic/eslint-plugin"

const result = tseslint.config(
	{
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended
		],
		files: ["**/*.{ts,tsx}", "build.mjs", "eslint.config.js"],
		plugins: {
			"@stylistic": stylistic,
		},
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				ecmaFeatures: {jsx: true}
			}
		},
		ignores: [
			"**/js/**",
			"node_modules",
			"**/node_modules/**",
			"**/generated/**",
			"build",
			"**/matter.js",
			"**/matter.d.ts"
		],
		rules: {
			"prefer-const": "warn",
			// that's for namespaces
			"no-inner-declarations": "off",
			// that's for while(true)
			"no-constant-condition": ["error", {checkLoops: false}],

			/* codestyle rules; disabled rules may be overriden by typescript rules */
			indent: "off",
			eqeqeq: ["warn", "always"],
			curly: ["warn", "all"],
			semi: "off",
			"no-floating-decimal": ["warn"],
			// it's irritating and doesn't really add anything
			"no-lonely-if": ["off"],
			"no-useless-rename": ["warn"],
			// it's useful, I'm just furious when it's getting autocorrected mid-thought process, hence it's off
			"no-useless-return": ["off"],
			"quote-props": ["warn", "as-needed", {numbers: true}],
			"spaced-comment": ["warn", "always", {markers: ["/"]}],
			yoda: ["warn", "never"],
			"array-bracket-newline": ["warn", "consistent"],
			"array-bracket-spacing": ["warn", "never"],
			"array-element-newline": ["warn", "consistent"],
			"arrow-parens": ["warn", "as-needed"],
			"arrow-spacing": ["warn", {before: true, after: true}],
			"brace-style": "off",
			"comma-dangle": "off",
			"comma-spacing": "off",
			"comma-style": ["warn", "last"],
			"computed-property-spacing": ["warn", "never"],
			"dot-location": ["warn", "property"],
			"func-call-spacing": "off",
			"generator-star-spacing": ["warn", {before: false, after: true}],
			"key-spacing": ["warn", {
				beforeColon: false,
				afterColon: true,
				mode: "strict"
			}],
			"keyword-spacing": "off",
			"linebreak-style": ["warn", "unix"],
			"new-parens": ["warn", "always"],
			"no-multi-spaces": ["warn"],
			"no-trailing-spaces": ["warn"],
			"no-whitespace-before-property": ["warn"],
			"object-curly-newline": ["warn", {
				ImportDeclaration: "never",
				ExportDeclaration: "never",
				ObjectPattern: {multiline: true, consistent: true, minProperties: 4},
				ObjectExpression: {multiline: true, consistent: true, minProperties: 4}
			}],
			"object-curly-spacing": "off",
			"operator-linebreak": ["warn", "before"],
			quotes: "off",
			"rest-spread-spacing": ["warn", "never"],
			"space-before-blocks": ["warn", {
				functions: "always",
				keywords: "never",
				classes: "always"
			}],
			"space-before-function-paren": "off",
			"space-in-parens": ["warn", "never"],
			"space-infix-ops": "off",
			"space-unary-ops": ["warn", {words: false, nonwords: false}],
			// conflicts with space-before-blocks
			// for example, `case 5: {}` - space should and should not be there at the same time
			"switch-colon-spacing": "off",
			"template-curly-spacing": ["warn", "never"],
			"template-tag-spacing": ["warn", "never"],
			"unicode-bom": ["warn", "never"],
			"yield-star-spacing": ["warn", "after"],
			// it's taken care of by typescript in most cases
			// and only ever triggers on `console` in build scripts, which is not useful
			"no-undef": "off",
			"dot-notation": "off",
			"max-params": "off",
			"no-array-constructor": "off",
			"no-empty-function": "off",
			"no-implied-eval": "off",
			"no-loop-func": "off",
			"no-loss-of-precision": "warn",
			"no-unused-expressions": "off",
			"no-useless-constructor": "off",
			"no-throw-literal": "off",
			"prefer-promise-reject-errors": "off",
			"require-await": "off",
			"no-return-await": "off",



			// rule for newbies; namespaces has their uses
			"@typescript-eslint/no-namespace": "off",
			// you shouldn't use it too much, but there are situations where you are 100% sure that it's not null
			// for example, array iteration by index
			"@typescript-eslint/no-non-null-assertion": "off",
			// I'm not stupid. If something is typed as any - it should be any
			"@typescript-eslint/no-explicit-any": "off",
			// if something is async - we should await it, or at least explicitly void
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": ["error", {checksVoidReturn: false}],
			"@typescript-eslint/method-signature-style": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					// if arg name consists entirely of `_` - it means "YES I KNOW THAT IT'S UNUSED STOP BOTHERING ME"
					argsIgnorePattern: "^_+$"
				}
			],
			"@typescript-eslint/adjacent-overload-signatures": "error",
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/consistent-type-assertions": ["error", {assertionStyle: "as", objectLiteralTypeAssertions: "allow"}],
			// while it's nice to have, it tends to break code by auto-fixing (for example when interface uses `this`)
			// and it's not that important
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/dot-notation": "warn",
			"@typescript-eslint/max-params": ["warn", {max: 4}],
			// it's also nice to have, but it's too difficult to configure - too much exceptions
			"@typescript-eslint/naming-convention": "off",
			"@typescript-eslint/no-array-constructor": "warn",
			"@typescript-eslint/no-array-delete": "error",
			"@typescript-eslint/no-base-to-string": "error",
			"@typescript-eslint/no-confusing-non-null-assertion": "warn",
			"@typescript-eslint/no-confusing-void-expression": "warn",
			"@typescript-eslint/no-deprecated": "warn",
			"@typescript-eslint/no-duplicate-enum-values": "error",
			"@typescript-eslint/no-duplicate-type-constituents": "warn",
			"@typescript-eslint/no-empty-function": "warn",
			// although it's funny to sometimes go `let a = b!!!!!!!!!`
			"@typescript-eslint/no-extra-non-null-assertion": "warn",
			"@typescript-eslint/no-for-in-array": "error",
			"@typescript-eslint/no-implied-eval": "warn",
			"@typescript-eslint/no-inferrable-types": "warn",
			"@typescript-eslint/no-loop-func": "warn",
			"@typescript-eslint/no-meaningless-void-operator": "warn",
			"@typescript-eslint/no-misused-new": "error",
			"@typescript-eslint/no-mixed-enums": "warn",
			"@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
			"@typescript-eslint/no-non-null-asserted-optional-chain": "error",
			"@typescript-eslint/no-redundant-type-constituents": "warn",
			"@typescript-eslint/no-require-imports": "error",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",
			// good in theory, too stupid in practice (won't pick up on possible variable modification in .forEach() loop for example)
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/no-unnecessary-parameter-property-assignment": "warn",
			"@typescript-eslint/no-unnecessary-qualifier": "warn",
			"@typescript-eslint/no-unnecessary-template-expression": "warn",
			"@typescript-eslint/no-unnecessary-type-assertion": "warn",
			"@typescript-eslint/no-unnecessary-type-constraint": "warn",
			"@typescript-eslint/no-unsafe-declaration-merging": "error",
			"@typescript-eslint/no-unsafe-enum-comparison": "warn",
			"@typescript-eslint/no-unsafe-function-type": "warn",
			"@typescript-eslint/no-unsafe-unary-minus": "warn",
			"@typescript-eslint/no-unused-expressions": "warn",
			"@typescript-eslint/no-useless-constructor": "warn",
			"@typescript-eslint/no-useless-empty-export": "warn",
			"@typescript-eslint/no-wrapper-object-types": "error",
			"@typescript-eslint/non-nullable-type-assertion-style": "warn",
			"@typescript-eslint/only-throw-error": "error",
			"@typescript-eslint/prefer-as-const": "warn",
			"@typescript-eslint/prefer-enum-initializers": "warn",
			"@typescript-eslint/prefer-find": "warn",
			"@typescript-eslint/prefer-includes": "warn",
			"@typescript-eslint/prefer-literal-enum-member": "warn",
			"@typescript-eslint/prefer-namespace-keyword": "warn",
			"@typescript-eslint/prefer-nullish-coalescing": "warn",
			"@typescript-eslint/prefer-optional-chain": "warn",
			// it's a good rule in theory, but `catch(e) { reject(e) }` will trigger it, which I'm not sure what to do with
			"@typescript-eslint/prefer-promise-reject-errors": "off",
			"@typescript-eslint/prefer-reduce-type-parameter": "warn",
			"@typescript-eslint/prefer-return-this-type": "warn",
			"@typescript-eslint/prefer-string-starts-ends-with": "warn",
			"@typescript-eslint/related-getter-setter-pairs": "warn",
			"@typescript-eslint/require-array-sort-compare": "warn",
			"@typescript-eslint/require-await": "warn",
			"@typescript-eslint/restrict-plus-operands": "error",
			"@typescript-eslint/restrict-template-expressions": "error",
			"@typescript-eslint/return-await": ["error", "always"],
			// this rule can be marginally useful for checking numbers that are zero
			// but it's not possible to configure to check only numbers
			"@typescript-eslint/strict-boolean-expressions": ["off"],
			"@typescript-eslint/switch-exhaustiveness-check": ["warn", {
				allowDefaultCaseForExhaustiveSwitch: true,
				considerDefaultExhaustiveForUnions: true,
				requireDefaultForNonUnion: true
			}],
			"@typescript-eslint/unbound-method": "error",
			"@typescript-eslint/unified-signatures": "warn",
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "warn",



			"@stylistic/func-call-spacing": ["warn", "never"],
			"@stylistic/member-delimiter-style": ["warn", {
				multiline: {delimiter: "none"},
				singleline: {delimiter: "comma", requireLast: false}
			}],
			"@stylistic/type-annotation-spacing": ["warn"],
			"@stylistic/brace-style": ["warn", "1tbs"],
			"@stylistic/comma-dangle": ["warn", "never"],
			"@stylistic/comma-spacing": ["warn", {before: false, after: true}],
			"@stylistic/indent": ["warn", "tab"],
			"@stylistic/keyword-spacing": ["warn", {
				overrides: {
					if: {after: false},
					for: {after: false},
					while: {after: false},
					catch: {after: false},
					switch: {after: false},
					yield: {after: false}
					// ...more here?
				}
			}],
			"@stylistic/object-curly-spacing": ["warn", "never"],
			"@stylistic/quotes": ["warn", "double"],
			"@stylistic/semi": ["warn", "never"],
			"@stylistic/space-before-function-paren": ["warn", "never"],
			"@stylistic/space-infix-ops": ["warn"]
		}
	}
)

export default result