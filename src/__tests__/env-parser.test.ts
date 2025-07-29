import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseEnvFile, scanSourceForEnvVars, generateEnvExample, writeFile } from '../utils/env-parser';

describe('env-parser', () => {
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

  describe('scanSourceForEnvVars', () => {
    it('should find environment variables in TypeScript files', () => {
      const sourceContent = `
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env['API_KEY'];
const port = process.env.PORT || 3000;
const debug = \${DEBUG_MODE};
const shell = $SHELL_VAR;
`;
      const sourceFile = path.join(tempDir, 'app.ts');
      fs.writeFileSync(sourceFile, sourceContent);

      const result = scanSourceForEnvVars(sourceFile);

      expect(result.has('DATABASE_URL')).toBe(true);
      expect(result.has('API_KEY')).toBe(true);
      expect(result.has('PORT')).toBe(true);
      expect(result.has('DEBUG_MODE')).toBe(true);
      expect(result.has('SHELL_VAR')).toBe(true);
      expect(result.size).toBe(5);
    });

    it('should scan directory recursively', () => {
      const srcDir = path.join(tempDir, 'src');
      const subDir = path.join(srcDir, 'utils');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(subDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'app.ts'), 'const db = process.env.DATABASE_URL;');
      fs.writeFileSync(path.join(subDir, 'config.js'), 'const key = process.env.API_KEY;');
      fs.writeFileSync(path.join(srcDir, 'readme.txt'), 'This is not a source file');

      const result = scanSourceForEnvVars(srcDir);

      expect(result.has('DATABASE_URL')).toBe(true);
      expect(result.has('API_KEY')).toBe(true);
      expect(result.size).toBe(2);
    });

    it('should return empty set for non-existent path', () => {
      const result = scanSourceForEnvVars(path.join(tempDir, 'non-existent'));
      expect(result.size).toBe(0);
    });
  });

  describe('generateEnvExample', () => {
    it('should generate proper .env.example content', () => {
      const envVars = new Map([
        ['DATABASE_URL', 'postgres://localhost'],
        ['PORT', '3000'],
        ['UNUSED_VAR', 'value']
      ]);
      const codeVars = new Set(['DATABASE_URL', 'PORT', 'MISSING_VAR']);

      const result = generateEnvExample(envVars, codeVars);

      expect(result).toContain('# Environment Variables');
      expect(result).toContain('DATABASE_URL=');
      expect(result).toContain('PORT=');
      expect(result).toContain('MISSING_VAR= # Required: Found in code but missing from .env');
      expect(result).toContain('UNUSED_VAR= # Warning: Defined but not used in code');
    });

    it('should handle empty inputs', () => {
      const result = generateEnvExample(new Map(), new Set());

      expect(result).toContain('# Environment Variables');
      expect(result).toContain('# Copy this file to .env and fill in the values');
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