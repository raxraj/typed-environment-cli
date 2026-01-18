import * as fs from 'fs';
import * as path from 'path';
import { EnvSchema } from 'typed-environment/dist/types';

/**
 * Schema file patterns to look for
 */
const SCHEMA_FILE_PATTERNS = [
  'schema.env.ts',
  'schema.env.js',
  'env.schema.ts',
  'env.schema.js',
  'environment.schema.ts',
  'environment.schema.js',
];

/**
 * Find schema file in the current directory or specified path
 */
export function findSchemaFile(basePath: string = process.cwd()): string | null {
  for (const pattern of SCHEMA_FILE_PATTERNS) {
    const filePath = path.join(basePath, pattern);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

/**
 * Load and parse schema from a TypeScript/JavaScript file
 */
export async function loadSchema(filePath: string): Promise<EnvSchema> {
  try {
    // For TypeScript files, we need to use a dynamic import
    const absolutePath = path.resolve(filePath);

    // Clear require cache for hot reloading during development
    delete require.cache[absolutePath];

    const module = await import(absolutePath);

    // Try different export patterns
    if (module.default) {
      return module.default;
    } else if (module.schema) {
      return module.schema;
    } else if (module.envSchema) {
      return module.envSchema;
    } else {
      // If no named export, try to find the first object that looks like a schema
      const keys = Object.keys(module);
      for (const key of keys) {
        const value = module[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Basic check to see if this looks like a schema
          const schemaKeys = Object.keys(value);
          if (schemaKeys.length > 0 && schemaKeys.every(k => 
            typeof value[k] === 'object' && 
            value[k].type && 
            ['string', 'number', 'boolean'].includes(value[k].type)
          )) {
            return value;
          }
        }
      }
    }

    throw new Error('No valid schema found in file. Please export the schema as default export, or named export "schema" or "envSchema"');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load schema from ${filePath}: ${error.message}`);
    }
    throw new Error(`Failed to load schema from ${filePath}: Unknown error`);
  }
}

/**
 * Get schema file path or throw error with helpful message
 */
export function getSchemaFile(schemaPath?: string): string {
  let schemaFile: string | null;

  if (schemaPath) {
    // User provided specific path
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    schemaFile = schemaPath;
  } else {
    // Auto-detect schema file
    schemaFile = findSchemaFile();
    if (!schemaFile) {
      throw new Error(
        `No schema file found. Please create one of the following files:\n` +
        SCHEMA_FILE_PATTERNS.map(p => `  - ${p}`).join('\n') +
        `\n\nExample schema.env.ts:\n` +
        `export default {\n` +
        `  DATABASE_URL: { type: 'string', required: true },\n` +
        `  PORT: { type: 'number', default: 3000 },\n` +
        `  DEBUG: { type: 'boolean', default: false },\n` +
        `} as const;`
      );
    }
  }

  return schemaFile;
}

/**
 * Load schema from file path or auto-detect
 */
export async function loadSchemaFile(schemaPath?: string): Promise<{ schema: EnvSchema; filePath: string }> {
  const filePath = getSchemaFile(schemaPath);
  const schema = await loadSchema(filePath);
  return { schema, filePath };
}