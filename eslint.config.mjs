// ESLint 9 flat config for the mixed JS/TS codebase: the inherited sudoku
// app is .js/.jsx, the ExpertSudoku integration layer is .ts/.tsx, and the
// worker/scripts run outside the browser. Type-AWARE linting is deliberately
// not enabled (no tsc in this repo - Vite/esbuild transpile without
// type-checking); typescript-eslint runs in syntax-only mode.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            'dist/',
            'node_modules/',
            'worker-configuration.d.ts',
            '.wrangler/',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{js,jsx,ts,tsx,mjs}'],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            // No tsc in this repo: @ts-ignore comments exist purely for
            // editors, where @ts-expect-error would flag as unused whenever
            // the editor resolves the import fine. Require a reason instead.
            '@typescript-eslint/ban-ts-comment': ['error', {
                'ts-ignore': 'allow-with-description',
            }],
            // The worker/client boundary passes semi-structured Discord/D1
            // payloads around - `as` casts on JSON responses are idiomatic
            // here, but plain `any` stays banned.
            '@typescript-eslint/no-explicit-any': 'error',
            // Allow intentionally-unused args/vars with a leading underscore
            // (worker handlers, React prop rest patterns).
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
        },
    },
    {
        files: ['**/*.{jsx,tsx}'],
        plugins: { react, 'react-hooks': reactHooks },
        settings: { react: { version: 'detect' } },
        rules: {
            ...react.configs.flat.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            // No PropTypes in this codebase (inherited fork never used them).
            'react/prop-types': 'off',
            // Vite injects the JSX runtime - no React import needed.
            'react/react-in-jsx-scope': 'off',
            // The inherited code quotes freely in JSX text.
            'react/no-unescaped-entities': 'off',
        },
    },
);
