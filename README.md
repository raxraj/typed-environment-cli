# typed-environment-cli

A CLI tool for managing environment variables with the `typed-environment` package. Generate `.env.example` files and validate environment variables using schema-based definitions.

## Features

- 🔒 **Schema-based Configuration**: Define environment variables using `typed-environment` schemas
- 🔄 **Auto-sync .env.example**: Generate or update `.env.example` based on your schema definition
- 🔍 **Environment Validation**: Validate `.env` files against your schema with detailed error reporting
- 📝 **Type Safety**: Full TypeScript support with type checking and validation
- 📊 **Clear Reporting**: Detailed output with helpful suggestions and summaries
- 🚀 **Zero Configuration**: Auto-detects schema files and provides sensible defaults

## Installation

```bash
npm install typed-environment-cli
# or
npm install -g typed-environment-cli
```

## Quick Start

1. **Create a schema file** (`schema.env.js` or `schema.env.ts`):

```javascript
// schema.env.js
module.exports = {
  DATABASE_URL: {
    type: 'string',
    required: true,
    pattern: /^postgresql:\/\/.+/,
  },
  PORT: {
    type: 'number',
    default: 3000,
    min: 1000,
    max: 65535,
  },
  JWT_SECRET: {
    type: 'string',
    required: true,
    minLength: 32,
  },
  DEBUG: {
    type: 'boolean',
    default: false,
  },
  NODE_ENV: {
    type: 'string',
    required: true,
    choices: ['development', 'staging', 'production'],
  },
};
```

2. **Generate .env.example**:
```bash
npx typed-environment sync-example
```

3. **Validate your .env**:
```bash
npx typed-environment check
```

## Usage

### Sync .env.example

Generate or update a `.env.example` file based on your schema:

```bash
npx typed-environment sync-example
```

Options:
- `-e, --env <file>`: Environment file to read from (default: `.env`)
- `-o, --output <file>`: Output file path (default: `.env.example`)
- `-s, --schema <file>`: Schema file path (auto-detected if not provided)

Example:
```bash
npx typed-environment sync-example --env .env.production --output .env.example --schema custom.schema.js
```

### Check Environment Variables

Validate your environment variables against the schema:

```bash
npx typed-environment check
```

Options:
- `-e, --env <file>`: Environment file to check (default: `.env`)
- `-s, --schema <file>`: Schema file path (auto-detected if not provided)

Example:
```bash
npx typed-environment check --env .env.development --schema custom.schema.js
```

## Example Output

### sync-example command:
```
🔍 Loading environment schema...
📋 Loaded schema from schema.env.js
🔧 Found 7 variables in schema
📄 Found 5 variables in .env
⚠️  Missing required variables in .env: JWT_SECRET
✅ Variables correctly set: API_KEY, DATABASE_URL, DEBUG, NODE_ENV, PORT
✅ .env.example updated successfully
📊 Summary: 7 variables defined in schema
   - 1 required variables missing from .env
   - 5 variables properly configured

💡 Next steps:
   1. Copy .env.example to .env
   2. Fill in the required values
   3. Add missing required variables: JWT_SECRET
```

### Generated .env.example:
```env
# Environment Variables
# Generated from schema - Copy this file to .env and fill in the values

# Required Variables
API_KEY= # Length: 32-64 characters
DATABASE_URL= # Must match: /^postgresql:\/\/.+/
JWT_SECRET= # Length: 32-∞ characters
NODE_ENV= # Options: development | staging | production

# Optional Variables (with defaults)
DEBUG= # Default: false
PORT= # Default: 3000
REDIS_URL= # Must match: /^redis:\/\/.*/
```

### check command:
```
🔍 Checking environment variables against schema...
📋 Loaded schema from schema.env.js
📄 Found 6 variables in .env
✅ Environment validation passed!

✅ Correctly configured variables (6):
   - API_KEY = *** (string)
   - DATABASE_URL = postgresql://localhost:5432/myapp (string)
   - DEBUG = true (boolean)
   - JWT_SECRET = *** (string)
   - NODE_ENV = development (string)
   - PORT = 3000 (number)

📊 Summary:
   - Schema defines 7 variables
   - 6 variables properly configured

🎉 All environment variables are properly configured!
```

## Schema File Detection

The CLI automatically detects schema files in the following order:
- `schema.env.ts`
- `schema.env.js`
- `env.schema.ts`
- `env.schema.js`
- `environment.schema.ts`
- `environment.schema.js`

## Schema Definition

Your schema file should export an object that follows the `typed-environment` schema format:

```typescript
// TypeScript example (schema.env.ts)
import { EnvSchema } from 'typed-environment/dist/types';

const schema: EnvSchema = {
  // String with validation
  DATABASE_URL: {
    type: 'string',
    required: true,
    pattern: /^postgresql:\/\/.+/,
  },

  // Number with range
  PORT: {
    type: 'number',
    default: 3000,
    min: 1000,
    max: 65535,
  },

  // String with length constraints
  API_KEY: {
    type: 'string',
    required: true,
    minLength: 32,
    maxLength: 64,
  },

  // Boolean with default
  DEBUG: {
    type: 'boolean',
    default: false,
  },

  // String with choices
  NODE_ENV: {
    type: 'string',
    required: true,
    choices: ['development', 'staging', 'production'],
  },

  // Optional string
  REDIS_URL: {
    type: 'string',
    required: false,
    pattern: /^redis:\/\/.*/,
  },
};

export default schema;
```

```javascript
// JavaScript example (schema.env.js)
module.exports = {
  DATABASE_URL: {
    type: 'string',
    required: true,
    pattern: /^postgresql:\/\/.+/,
  },
  PORT: {
    type: 'number',
    default: 3000,
    min: 1000,
    max: 65535,
  },
  // ... other variables
};
```

## Integration with typed-environment

This CLI is designed to work seamlessly with the `typed-environment` package. After defining your schema and setting up your environment, you can use it in your application:

```typescript
import TypedEnv from 'typed-environment';
import schema from './schema.env';

const env = new TypedEnv(schema);
const config = env.init();

// config is fully typed and validated!
console.log(config.DATABASE_URL); // string
console.log(config.PORT);         // number
console.log(config.DEBUG);        // boolean
```

## Benefits

- **Type Safety**: Full TypeScript support with compile-time type checking
- **Runtime Validation**: Comprehensive validation with detailed error messages
- **Single Source of Truth**: Schema defines both validation rules and documentation
- **Developer Experience**: Auto-generated examples and helpful error messages
- **CI/CD Integration**: Exit codes for automated validation in pipelines
- **Framework Agnostic**: Works with any Node.js application or framework

## Error Handling

The CLI provides detailed error messages for various scenarios:

- **Missing schema file**: Helpful message with examples and file patterns
- **Missing required variables**: Clear list of what needs to be added
- **Validation errors**: Specific messages about type mismatches, pattern failures, etc.
- **Extra variables**: Information about variables not defined in schema

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.