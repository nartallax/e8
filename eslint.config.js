import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals'

let result = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
	files: ['**/*.{ts,tsx}'],
	languageOptions: {
      parserOptions: {
		project: "./tsconfig.json",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
	ignores: [
		"**/js/**",
		"node_modules",
		"**/node_modules/**",
		"**/generated/**",
		"build",
		"eslint.config.cjs"
	],
	rules: {
		// const have its uses, but not EVERYTHING should be const
		"prefer-const": "warn",

		// rule for newbies; namespaces has their uses
		"@typescript-eslint/no-namespace": "off",

		// that's also for namespaces
		"no-inner-declarations": "off",

		// you shouldn't use it too much, but there are situations where you are 100% sure that it's not null
		// for example, array iteration by index
		"@typescript-eslint/no-non-null-assertion": "off",

		// that's for while(true)
		"no-constant-condition": ["error", {checkLoops: false}],

		// I'm not stupid. If something is typed as any - it should be any
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-floating-promises": "error",
		"@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": false }],


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
		"spaced-comment": ["warn", "always", { "markers": ["/"]}],
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
		"object-curly-newline": ["warn", {consistent: true}],
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

		"@typescript-eslint/func-call-spacing": ["warn", "never"],
		"@typescript-eslint/member-delimiter-style": ["warn", {
			multiline: {delimiter: "none"},
			singleline: {delimiter: "comma", requireLast: false}
		}],
		"@typescript-eslint/method-signature-style": "off",
		"@typescript-eslint/no-confusing-non-null-assertion": ["warn"],
		"@typescript-eslint/type-annotation-spacing": ["warn"],
		"@typescript-eslint/brace-style": ["warn", "1tbs"],
		"@typescript-eslint/comma-dangle": ["warn", "never"],
		"@typescript-eslint/comma-spacing": ["warn", {before: false, after: true}],
		"@typescript-eslint/indent": ["warn", "tab"],
		"@typescript-eslint/keyword-spacing": ["warn", {
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
		"@typescript-eslint/object-curly-spacing": ["warn", "never"],
		"@typescript-eslint/quotes": ["warn", "double"],
		"@typescript-eslint/semi": ["warn", "never"],
		"@typescript-eslint/space-before-function-paren": ["warn", "never"],
		"@typescript-eslint/space-infix-ops": ["warn"],
	}
}
);

export default result