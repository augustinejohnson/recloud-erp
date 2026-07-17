import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        files: ["src/**/*.jsx"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        rules: {
            "no-unused-vars": "off",
            "no-undef": "off"
        }
    }
];
