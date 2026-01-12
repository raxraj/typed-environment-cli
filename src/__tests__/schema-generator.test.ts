import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseEnvFile, generateEnvExampleFromSchema, analyzeEnvironmentVariables, writeFile } from '../utils/schema-generator';
import { EnvSchema } from 'typed-environment/dist/types';

describe('schema-generator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typed-env-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseEnvFile', () => {
    it('should parse a valid .env file', () => {
      const envContent = `
# Database configuration
DATABASE_URL=postgres://localhost:5432/test
API_KEY="secret123"
PORT=3000
DEBUG=true

# Empty value
EMPTY_VAR=

# Comments and empty lines should be ignored
`;
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, envContent);

      const result = parseEnvFile(envFile);

      expect(result.size).toBe(5);
      expect(result.get('DATABASE_URL')).toBe('postgres://localhost:5432/test');
      expect(result.get('API_KEY')).toBe('secret123');
      expect(result.get('PORT')).toBe('3000');
      expect(result.get('DEBUG')).toBe('true');
      expect(result.get('EMPTY_VAR')).toBe('');
    });

    it('should return empty map for non-existent file', () => {
      const result = parseEnvFile(path.join(tempDir, 'non-existent.env'));
      expect(result.size).toBe(0);
    });

    it('should handle malformed lines gracefully', () => {
      const envContent = `
VALID_VAR=value
INVALID_LINE_WITHOUT_EQUALS
=VALUE_WITHOUT_KEY
KEY_WITHOUT_VALUE=
`;
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, envContent);

      const result = parseEnvFile(envFile);

      expect(result.size).toBe(2);
      expect(result.get('VALID_VAR')).toBe('value');
      expect(result.get('KEY_WITHOUT_VALUE')).toBe('');
    });
  });

  describe('generateEnvExampleFromSchema', () => {
    const testSchema: EnvSchema = {
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
      DEBUG: {
        type: 'boolean',
        default: false,
      },
      API_KEY: {
        type: 'string',
        required: true,
        minLength: 32,
        maxLength: 64,
      },
      NODE_ENV: {
        type: 'string',
        required: true,
        choices: ['development', 'staging', 'production'],
      },
    };

    it('should generate proper .env.example content from schema', () => {
      const result = generateEnvExampleFromSchema(testSchema);

      expect(result).toContain('# Environment Variables');
      expect(result).toContain('# Generated from schema');
      expect(result).toContain('# Required Variables');
      expect(result).toContain('# Optional Variables');
      expect(result).toContain('DATABASE_URL=');
      expect(result).toContain('API_KEY=');
      expect(result).toContain('NODE_ENV=');
      expect(result).toContain('PORT=');
      expect(result).toContain('DEBUG=');
    });

    it('should show existing variables as already set', () => {
      const existingEnv = new Map([
        ['DATABASE_URL', 'postgresql://localhost:5432/test'],
        ['PORT', '3000'],
      ]);

      const result = generateEnvExampleFromSchema(testSchema, existingEnv);

      expect(result).toContain('DATABASE_URL= # ✓ Already set in .env');
      expect(result).toContain('PORT= # ✓ Already set in .env');
      expect(result).toContain('API_KEY= # Length: 32-64 characters');
    });

    it('should generate appropriate examples for different types', () => {
      const result = generateEnvExampleFromSchema(testSchema);

      expect(result).toContain('Options: development | staging | production');
      expect(result).toContain('Default: 3000'); // PORT has default, so shows default instead of range
      expect(result).toContain('Must match: /^postgresql:\\/\\/.+/');
      expect(result).toContain('Length: 32-64 characters');
    });
  });

  describe('analyzeEnvironmentVariables', () => {
    const testSchema: EnvSchema = {
      REQUIRED_VAR: {
        type: 'string',
        required: true,
      },
      OPTIONAL_VAR: {
        type: 'string',
        default: 'default',
      },
      ANOTHER_REQUIRED: {
        type: 'number',
        required: true,
      },
    };

    it('should identify missing required variables', () => {
      const envVars = new Map([
        ['REQUIRED_VAR', 'value'],
        ['EXTRA_VAR', 'extra'],
      ]);

      const result = analyzeEnvironmentVariables(testSchema, envVars);

      expect(result.missing).toContain('ANOTHER_REQUIRED');
      expect(result.missing).toHaveLength(1);
      expect(result.present).toContain('REQUIRED_VAR');
      expect(result.extra).toContain('EXTRA_VAR');
      expect(result.total).toBe(3);
    });

    it('should handle all variables present', () => {
      const envVars = new Map([
        ['REQUIRED_VAR', 'value'],
        ['OPTIONAL_VAR', 'value'],
        ['ANOTHER_REQUIRED', '123'],
      ]);

      const result = analyzeEnvironmentVariables(testSchema, envVars);

      expect(result.missing).toHaveLength(0);
      expect(result.present).toHaveLength(3);
      expect(result.extra).toHaveLength(0);
      expect(result.total).toBe(3);
    });

    it('should handle empty env file', () => {
      const envVars = new Map();

      const result = analyzeEnvironmentVariables(testSchema, envVars);

      expect(result.missing).toContain('REQUIRED_VAR');
      expect(result.missing).toContain('ANOTHER_REQUIRED');
      expect(result.missing).toHaveLength(2);
      expect(result.present).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });
  });

  describe('writeFile', () => {
    it('should write file and create directories', () => {
      const filePath = path.join(tempDir, 'nested', 'deep', 'file.txt');
      const content = 'test content';

      writeFile(filePath, content);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });
  });
});