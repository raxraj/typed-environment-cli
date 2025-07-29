# typed-environment-cli

A CLI tool for managing environment variables with the `typed-environment` package. Automatically generate `.env.example` files and detect missing or unused environment variables in your codebase.

## Features

- 🔒 **Auto-sync .env.example**: Generate or update `.env.example` based on your actual `.env` file and code usage
- 🔍 **Missing Variable Detection**: Find environment variables used in code but missing from `.env`
- 📝 **Unused Variable Detection**: Identify variables defined in `.env` but not used in code
- 🚀 **Multi-language Support**: Works with TypeScript, JavaScript, Python, Go, Java, PHP, Ruby and more
- 📊 **Clear Reporting**: Detailed output with helpful suggestions and summaries

## Installation

```bash
npm install typed-environment-cli
# or
npm install -g typed-environment-cli
```

## Usage

### Sync .env.example

Generate or update a `.env.example` file based on your `.env` and code usage:

```bash
npx typed-environment sync-example
```

Options:
- `-e, --env <file>`: Environment file to read from (default: `.env`)
- `-o, --output <file>`: Output file path (default: `.env.example`)
- `-s, --source <path>`: Source code directory to scan (default: `src`)

Example:
```bash
npx typed-environment sync-example --env .env.production --output .env.example --source ./src
```

### Check Environment Variables

Check for missing or unused environment variables:

```bash
npx typed-environment check
```

Options:
- `-e, --env <file>`: Environment file to check (default: `.env`)
- `-s, --source <path>`: Source code directory to scan (default: `src`)

Example:
```bash
npx typed-environment check --env .env.development --source ./app
```

## Example Output

### sync-example command:
```
🔍 Scanning for environment variables...
📄 Found 7 variables in .env
💻 Found 6 variables in source code
⚠️  Missing variables in .env: JWT_SECRET, REDIS_URL
📝 Unused variables in .env: OLD_SECRET, LEGACY_API_KEY
✅ .env.example updated successfully
📊 Summary: 9 total variables processed
   - 2 missing from .env
   - 2 unused in code
```

### check command:
```
🔍 Checking environment variables...
📄 Found 5 variables in .env
💻 Found 6 variables in source code

❌ Missing variables in .env:
   - JWT_SECRET
   - REDIS_URL

⚠️  Unused variables in .env:
   - OLD_SECRET

📊 Summary:
   - 5 variables in .env
   - 6 variables found in code
   - 2 missing from .env
   - 1 unused in .env

💡 Tip: Run "typed-environment sync-example" to update .env.example with current findings
```

### Generated .env.example:
```env
# Environment Variables
# Copy this file to .env and fill in the values

API_KEY=
DATABASE_URL=
JWT_SECRET= # Required: Found in code but missing from .env
OLD_SECRET= # Warning: Defined but not used in code
PORT=
REDIS_URL= # Required: Found in code but missing from .env
```

## Supported Environment Variable Patterns

The CLI detects environment variables using these patterns:

- `process.env.VARIABLE_NAME` (Node.js)
- `process.env['VARIABLE_NAME']` (Node.js bracket notation)
- `${VARIABLE_NAME}` (Template literals)
- `$VARIABLE_NAME` (Shell-style variables)

## Supported File Types

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- Python (`.py`)
- Go (`.go`)
- Java (`.java`)
- PHP (`.php`)
- Ruby (`.rb`)

## Integration with typed-environment

This CLI is designed to work seamlessly with the [`typed-environment`](https://www.npmjs.com/package/typed-environment) package for type-safe environment variable handling in TypeScript projects.

## API

You can also use the functions programmatically:

```typescript
import { parseEnvFile, scanSourceForEnvVars, generateEnvExample } from 'typed-environment-cli';

// Parse .env file
const envVars = parseEnvFile('.env');

// Scan source code for environment variables
const codeVars = scanSourceForEnvVars('./src');

// Generate .env.example content
const exampleContent = generateEnvExample(envVars, codeVars);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC
