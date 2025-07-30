import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncExample } from '../commands/sync-example';
import { check } from '../commands/check';

describe('CLI Commands', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typed-env-cli-test-'));
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('syncExample', () => {
    it('should generate .env.example file from schema', async () => {
      // Create schema file
      const schemaContent = `
module.exports = {
  DATABASE_URL: { type: 'string', required: true },
  API_KEY: { type: 'string', required: true, minLength: 32 },
  PORT: { type: 'number', default: 3000 },
  DEBUG: { type: 'boolean', default: false }
};`;
      
      // Create .env file with some variables
      const envContent = 'DATABASE_URL=postgres://localhost\nPORT=3000';
      
      fs.writeFileSync(path.join(tempDir, 'schema.env.js'), schemaContent);
      fs.writeFileSync(path.join(tempDir, '.env'), envContent);

      // Change to temp directory for schema auto-detection
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        await syncExample({
          env: path.join(tempDir, '.env'),
          output: path.join(tempDir, '.env.example')
        });

        // Check if .env.example was created
        expect(fs.existsSync(path.join(tempDir, '.env.example'))).toBe(true);
        
        const exampleContent = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf-8');
        expect(exampleContent).toContain('DATABASE_URL= # ✓ Already set in .env');
        expect(exampleContent).toContain('API_KEY= # Length: 32-∞ characters');
        expect(exampleContent).toContain('PORT= # ✓ Already set in .env');
        expect(exampleContent).toContain('DEBUG= # Default: false');

        // Check console output
        const allLogs = consoleSpy.mock.calls.map(call => call.join(' ')).join(' ');
        expect(allLogs).toContain('Loaded schema from');
        expect(allLogs).toContain('Found 4 variables in schema');
        expect(allLogs).toContain('Missing required variables');
        expect(allLogs).toContain('API_KEY');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('check', () => {
    it('should report missing required variables', async () => {
      // Create schema file
      const schemaContent = `
module.exports = {
  DATABASE_URL: { type: 'string', required: true },
  API_KEY: { type: 'string', required: true },
  PORT: { type: 'number', default: 3000 }
};`;
      
      // Create .env file missing required variable
      const envContent = 'DATABASE_URL=postgres://localhost\nPORT=3000';
      
      fs.writeFileSync(path.join(tempDir, 'schema.env.js'), schemaContent);
      fs.writeFileSync(path.join(tempDir, '.env'), envContent);

      // Change to temp directory for schema auto-detection
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        await check({
          env: path.join(tempDir, '.env')
        });
      } catch (error: any) {
        // Expected since process.exit(1) is called
        expect(error.message).toBe('process.exit called');
      } finally {
        process.chdir(originalCwd);
      }

      // Check console output
      const allLogs = consoleSpy.mock.calls.map(call => call.join(' ')).join(' ');
      const allErrors = consoleErrorSpy.mock.calls.map(call => call.join(' ')).join(' ');
      
      expect(allErrors).toContain('Environment validation failed');
      expect(allErrors).toContain('Missing required variables');
      expect(allErrors).toContain('API_KEY');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should report success when all required variables present', async () => {
      // Create schema file
      const schemaContent = `
module.exports = {
  DATABASE_URL: { type: 'string', required: true },
  API_KEY: { type: 'string', required: true, minLength: 10 },
  PORT: { type: 'number', default: 3000 }
};`;
      
      // Create .env file with all required variables
      const envContent = 'DATABASE_URL=postgres://localhost\nAPI_KEY=secret123456\nPORT=3000';
      
      fs.writeFileSync(path.join(tempDir, 'schema.env.js'), schemaContent);
      fs.writeFileSync(path.join(tempDir, '.env'), envContent);

      // Change to temp directory for schema auto-detection
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        await check({
          env: path.join(tempDir, '.env')
        });

        // Check console output
        const allLogs = consoleSpy.mock.calls.map(call => call.join(' ')).join(' ');
        expect(allLogs).toContain('Environment validation passed');
        expect(allLogs).toContain('All environment variables are properly configured');
        expect(processExitSpy).not.toHaveBeenCalledWith(1);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});