import * as fs from 'fs';
import * as path from 'path';
import { EnvSchema } from 'typed-environment/dist/types';

/**
 * Parse .env file and return key-value pairs
 */
export function parseEnvFile(filePath: string): Map<string, string> {
  const envVars = new Map<string, string>();
  
  if (!fs.existsSync(filePath)) {
    return envVars;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE format
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmedLine.substring(0, equalIndex).trim();
    const value = trimmedLine.substring(equalIndex + 1).trim();
    
    // Skip lines with empty keys
    if (!key) {
      continue;
    }
    
    // Remove quotes if present
    const cleanValue = value.replace(/^["']|["']$/g, '');
    envVars.set(key, cleanValue);
  }

  return envVars;
}

/**
 * Generate example value based on schema field definition
 */
function generateExampleValue(fieldName: string, fieldDef: any): string {
  // If there's a default value, show it as a comment
  if (fieldDef.default !== undefined) {
    return `# Default: ${fieldDef.default}`;
  }

  // Generate example based on type and constraints
  switch (fieldDef.type) {
    case 'string':
      if (fieldDef.choices) {
        return `# Options: ${fieldDef.choices.join(' | ')}`;
      }
      if (fieldDef.pattern) {
        const pattern = fieldDef.pattern.toString();
        // Common patterns with examples
        if (pattern.includes('email') || pattern.includes('@')) {
          return '# Example: user@example.com';
        }
        if (pattern.includes('url') || pattern.includes('http')) {
          return '# Example: https://example.com';
        }
        return `# Must match: ${pattern}`;
      }
      if (fieldDef.minLength || fieldDef.maxLength) {
        const min = fieldDef.minLength || 0;
        const max = fieldDef.maxLength || '∞';
        return `# Length: ${min}-${max} characters`;
      }
      // Common variable name patterns
      if (fieldName.includes('URL')) return '# Example: https://example.com';
      if (fieldName.includes('SECRET') || fieldName.includes('KEY')) return '# Example: your-secret-key-here';
      if (fieldName.includes('PASSWORD')) return '# Example: your-password-here';
      if (fieldName.includes('EMAIL')) return '# Example: user@example.com';
      if (fieldName.includes('HOST')) return '# Example: localhost';
      if (fieldName.includes('PATH')) return '# Example: /path/to/directory';
      return '# String value required';

    case 'number':
      if (fieldDef.choices) {
        return `# Options: ${fieldDef.choices.join(' | ')}`;
      }
      if (fieldDef.min !== undefined || fieldDef.max !== undefined) {
        const min = fieldDef.min !== undefined ? fieldDef.min : '-∞';
        const max = fieldDef.max !== undefined ? fieldDef.max : '∞';
        return `# Range: ${min} to ${max}`;
      }
      // Common number patterns
      if (fieldName.includes('PORT')) return '# Example: 3000';
      if (fieldName.includes('TIMEOUT')) return '# Example: 5000';
      if (fieldName.includes('LIMIT')) return '# Example: 100';
      return '# Number value required';

    case 'boolean':
      if (fieldDef.choices) {
        return `# Options: ${fieldDef.choices.join(' | ')}`;
      }
      return '# true or false';

    default:
      return '# Value required';
  }
}

/**
 * Generate .env.example content from schema
 */
export function generateEnvExampleFromSchema(schema: EnvSchema, existingEnv?: Map<string, string>): string {
  const lines: string[] = [];
  const schemaKeys = Object.keys(schema).sort();

  lines.push('# Environment Variables');
  lines.push('# Generated from schema - Copy this file to .env and fill in the values');
  lines.push('');

  // Group variables by required/optional
  const requiredVars: string[] = [];
  const optionalVars: string[] = [];

  for (const key of schemaKeys) {
    const fieldDef = schema[key];
    if (fieldDef.required === true) {
      requiredVars.push(key);
    } else {
      optionalVars.push(key);
    }
  }

  // Add required variables first
  if (requiredVars.length > 0) {
    lines.push('# Required Variables');
    for (const key of requiredVars) {
      const fieldDef = schema[key];
      const example = generateExampleValue(key, fieldDef);
      const hasValue = existingEnv?.has(key);
      
      if (hasValue) {
        lines.push(`${key}= # ✓ Already set in .env`);
      } else {
        lines.push(`${key}= ${example}`);
      }
    }
    lines.push('');
  }

  // Add optional variables
  if (optionalVars.length > 0) {
    lines.push('# Optional Variables (with defaults)');
    for (const key of optionalVars) {
      const fieldDef = schema[key];
      const example = generateExampleValue(key, fieldDef);
      const hasValue = existingEnv?.has(key);
      
      if (hasValue) {
        lines.push(`${key}= # ✓ Already set in .env`);
      } else {
        lines.push(`${key}= ${example}`);
      }
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Find missing and extra variables
 */
export function analyzeEnvironmentVariables(schema: EnvSchema, envVars: Map<string, string>) {
  const schemaKeys = new Set(Object.keys(schema));
  const envKeys = new Set(envVars.keys());
  
  const missing: string[] = [];
  const extra: string[] = [];
  const present: string[] = [];

  // Find missing required variables
  for (const key of schemaKeys) {
    if (envKeys.has(key)) {
      present.push(key);
    } else {
      const fieldDef = schema[key];
      if (fieldDef.required === true) {
        missing.push(key);
      }
    }
  }

  // Find extra variables not in schema
  for (const key of envKeys) {
    if (!schemaKeys.has(key)) {
      extra.push(key);
    }
  }

  return {
    missing: missing.sort(),
    extra: extra.sort(),
    present: present.sort(),
    total: schemaKeys.size
  };
}

/**
 * Write content to file, creating directories if needed
 */
export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}