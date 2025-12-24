import { EnvSchema } from 'typed-environment/dist/types';

/**
 * Infer the type of an environment variable value
 */
function inferType(value: string): 'string' | 'number' | 'boolean' {
  // Check for boolean
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
    return 'boolean';
  }
  
  // Check for number
  if (!isNaN(Number(value)) && value.trim() !== '') {
    return 'number';
  }
  
  // Default to string
  return 'string';
}

/**
 * Detect common patterns in variable names and values
 */
function detectPatterns(key: string, value: string): { pattern?: RegExp; minLength?: number } {
  const result: { pattern?: RegExp; minLength?: number } = {};
  
  // URL patterns
  if (key.includes('URL') || key.includes('ENDPOINT')) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      result.pattern = /^https?:\/\/.+/;
    } else if (value.startsWith('postgresql://') || value.startsWith('postgres://')) {
      result.pattern = /^postgres(ql)?:\/\/.+/;
    } else if (value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')) {
      result.pattern = /^mongodb(\+srv)?:\/\/.+/;
    } else if (value.startsWith('redis://')) {
      result.pattern = /^redis:\/\/.+/;
    }
  }
  
  // Email pattern
  if (key.includes('EMAIL') && value.includes('@')) {
    result.pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  }
  
  // Secret/key length requirements
  if ((key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN')) && value.length >= 16) {
    result.minLength = Math.min(value.length, 32); // Suggest minimum length
  }
  
  return result;
}

/**
 * Detect if a value looks like it should be a choice from a set
 */
function detectChoices(key: string, value: string): string[] | undefined {
  const lowerValue = value.toLowerCase();
  
  // NODE_ENV pattern
  if (key === 'NODE_ENV' || key.includes('ENV')) {
    if (['development', 'staging', 'production', 'test'].includes(lowerValue)) {
      return ['development', 'staging', 'production'];
    }
  }
  
  // LOG_LEVEL pattern
  if (key.includes('LOG_LEVEL') || key.includes('LEVEL')) {
    if (['debug', 'info', 'warn', 'error'].includes(lowerValue)) {
      return ['debug', 'info', 'warn', 'error'];
    }
  }
  
  return undefined;
}

/**
 * Detect numeric constraints from variable name and value
 */
function detectNumericConstraints(key: string, value: number): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {};
  
  // Port numbers
  if (key.includes('PORT')) {
    result.min = 1;
    result.max = 65535;
  }
  
  // Timeout values (in milliseconds)
  if (key.includes('TIMEOUT')) {
    result.min = 0;
  }
  
  // Limit values
  if (key.includes('LIMIT') || key.includes('MAX')) {
    result.min = 1;
  }
  
  return result;
}

/**
 * Generate a schema from environment variables
 */
export function generateSchemaFromEnv(envVars: Map<string, string>): EnvSchema {
  const schema: EnvSchema = {};
  
  for (const [key, value] of envVars.entries()) {
    const type = inferType(value);
    const fieldDef: any = {
      type,
      required: true, // Assume all existing vars are required by default
    };
    
    // Type-specific processing
    if (type === 'string') {
      // Detect patterns
      const patterns = detectPatterns(key, value);
      if (patterns.pattern) {
        fieldDef.pattern = patterns.pattern;
      }
      if (patterns.minLength) {
        fieldDef.minLength = patterns.minLength;
      }
      
      // Detect choices
      const choices = detectChoices(key, value);
      if (choices) {
        fieldDef.choices = choices;
      }
    } else if (type === 'number') {
      const numValue = Number(value);
      const constraints = detectNumericConstraints(key, numValue);
      if (constraints.min !== undefined) {
        fieldDef.min = constraints.min;
      }
      if (constraints.max !== undefined) {
        fieldDef.max = constraints.max;
      }
    }
    
    schema[key] = fieldDef;
  }
  
  return schema;
}

/**
 * Generate schema file content as JavaScript
 */
export function generateSchemaFileContent(schema: EnvSchema): string {
  const lines: string[] = [];
  
  lines.push('// Environment variable schema');
  lines.push('// Generated from .env file - Edit this file to customize validation rules');
  lines.push('//');
  lines.push('// For more information on schema options, see:');
  lines.push('// https://github.com/raxraj/typed-environment');
  lines.push('');
  lines.push('module.exports = {');
  
  const keys = Object.keys(schema).sort();
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const fieldDef = schema[key] as any; // Use any to access all possible properties
    
    lines.push(`  ${key}: {`);
    lines.push(`    type: '${fieldDef.type}',`);
    lines.push(`    required: ${fieldDef.required},`);
    
    // Add other properties
    if (fieldDef.pattern) {
      lines.push(`    pattern: ${fieldDef.pattern.toString()},`);
    }
    if (fieldDef.minLength !== undefined) {
      lines.push(`    minLength: ${fieldDef.minLength},`);
    }
    if (fieldDef.maxLength !== undefined) {
      lines.push(`    maxLength: ${fieldDef.maxLength},`);
    }
    if (fieldDef.min !== undefined) {
      lines.push(`    min: ${fieldDef.min},`);
    }
    if (fieldDef.max !== undefined) {
      lines.push(`    max: ${fieldDef.max},`);
    }
    if (fieldDef.choices) {
      lines.push(`    choices: [${fieldDef.choices.map((c: string) => `'${c}'`).join(', ')}],`);
    }
    if (fieldDef.default !== undefined) {
      const defaultValue = typeof fieldDef.default === 'string' 
        ? `'${fieldDef.default}'` 
        : fieldDef.default;
      lines.push(`    default: ${defaultValue},`);
    }
    
    lines.push(`  }${i < keys.length - 1 ? ',' : ''}`);
  }
  
  lines.push('};');
  lines.push('');
  
  return lines.join('\n');
}
