import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { syncExample } from '../commands/sync-example';
import { check } from '../commands/check';

describe('CLI Commands', () => {
  let tempDir: string;
  let consoleSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typed-env-cli-test-'));
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('syncExample', () => {
    it('should generate .env.example file', async () => {
      // Create test files
      const envContent = 'DATABASE_URL=postgres://localhost\nAPI_KEY=secret';
      const sourceContent = 'const db = process.env.DATABASE_URL;\nconst missing = process.env.MISSING_VAR;';
      
      fs.writeFileSync(path.join(tempDir, '.env'), envContent);
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'app.ts'), sourceContent);

      await syncExample({
        env: path.join(tempDir, '.env'),
        output: path.join(tempDir, '.env.example'),
        source: path.join(tempDir, 'src')
      });

      // Check if .env.example was created
      expect(fs.existsSync(path.join(tempDir, '.env.example'))).toBe(true);
      
      const exampleContent = fs.readFileSync(path.join(tempDir, '.env.example'), 'utf-8');
      expect(exampleContent).toContain('DATABASE_URL=');
      expect(exampleContent).toContain('MISSING_VAR= # Required: Found in code but missing from .env');
      expect(exampleContent).toContain('API_KEY= # Warning: Defined but not used in code');

      // Check console output
      const allLogs = consoleSpy.mock.calls.map(call => call.join(' ')).join(' ');
      expect(allLogs).toContain('Found 2 variables in');
      expect(allLogs).toContain('Found 2 variables in source code');
    });
  });

  describe('check', () => {
    it('should report missing and unused variables', async () => {
      // Create test files
      const envContent = 'DATABASE_URL=postgres://localhost\nUNUSED_VAR=value';
      const sourceContent = 'const db = process.env.DATABASE_URL;\nconst missing = process.env.MISSING_VAR;';
      
      fs.writeFileSync(path.join(tempDir, '.env'), envContent);
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'app.ts'), sourceContent);

      try {
        await check({
          env: path.join(tempDir, '.env'),
          source: path.join(tempDir, 'src')
        });
      } catch (error: any) {
        // Expected since process.exit(1) is called
        expect(error.message).toBe('process.exit called');
      }

      // Check console output
      const allLogs = consoleSpy.mock.calls.map(call => call.join(' ')).join(' ');
      expect(allLogs).toContain('Missing variables in .env');
      expect(allLogs).toContain('Unused variables in .env');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should report success when no issues found', async () => {
      // Create test files with matching variables
      const envContent = 'DATABASE_URL=postgres://localhost';
      const sourceContent = 'const db = process.env.DATABASE_URL;';
      
      fs.writeFileSync(path.join(tempDir, '.env'), envContent);
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'app.ts'), sourceContent);

      await check({
        env: path.join(tempDir, '.env'),
        source: path.join(tempDir, 'src')
      });

      // Check console output
      const allLogs = consoleSpy.mock.calls.map(call => call.join(' ')).join(' ');
      expect(allLogs).toContain('All environment variables are properly configured');
      expect(processExitSpy).not.toHaveBeenCalledWith(1);
    });
  });
});