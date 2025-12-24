import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateSchema } from '../commands/generate-schema';
import { generateSchemaFromEnv, generateSchemaFileContent } from '../utils/env-to-schema';
import { parseEnvFile } from '../utils/schema-generator';

describe('generate-schema command', () => {
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
    }) as any;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('generateSchemaFromEnv', () => {
    it('should infer string types correctly', () => {
      const envVars = new Map([
        ['API_KEY', 'test-key-value'],
        ['DATABASE_URL', 'postgresql://localhost:5432/db'],
      ]);

      const schema = generateSchemaFromEnv(envVars);

      expect(schema.API_KEY).toEqual({
        type: 'string',
        required: true,
      });
      expect(schema.DATABASE_URL).toEqual({
        type: 'string',
        required: true,
        pattern: /^postgres(ql)?:\/\/.+/,
      });
    });

    it('should infer number types correctly', () => {
      const envVars = new Map([
        ['PORT', '3000'],
        ['TIMEOUT', '5000'],
        ['MAX_CONNECTIONS', '100'],
      ]);

      const schema = generateSchemaFromEnv(envVars);

      expect(schema.PORT.type).toBe('number');
      expect((schema.PORT as any).min).toBe(1);
      expect((schema.PORT as any).max).toBe(65535);
      
      expect(schema.TIMEOUT.type).toBe('number');
      expect((schema.TIMEOUT as any).min).toBe(0);
      
      expect(schema.MAX_CONNECTIONS.type).toBe('number');
      expect((schema.MAX_CONNECTIONS as any).min).toBe(1);
    });

    it('should infer boolean types correctly', () => {
      const envVars = new Map([
        ['DEBUG', 'true'],
        ['ENABLE_LOGGING', 'false'],
      ]);

      const schema = generateSchemaFromEnv(envVars);

      expect(schema.DEBUG).toEqual({
        type: 'boolean',
        required: true,
      });
      expect(schema.ENABLE_LOGGING).toEqual({
        type: 'boolean',
        required: true,
      });
    });

    it('should detect URL patterns', () => {
      const envVars = new Map([
        ['DATABASE_URL', 'postgresql://localhost:5432/db'],
        ['REDIS_URL', 'redis://localhost:6379'],
        ['API_ENDPOINT', 'https://api.example.com'],
        ['MONGODB_URL', 'mongodb://localhost:27017/db'],
      ]);

      const schema = generateSchemaFromEnv(envVars);

      expect((schema.DATABASE_URL as any).pattern).toEqual(/^postgres(ql)?:\/\/.+/);
      expect((schema.REDIS_URL as any).pattern).toEqual(/^redis:\/\/.+/);
      expect((schema.API_ENDPOINT as any).pattern).toEqual(/^https?:\/\/.+/);
      expect((schema.MONGODB_URL as any).pattern).toEqual(/^mongodb(\+srv)?:\/\/.+/);
    });

    it('should detect email patterns', () => {
      const envVars = new Map([
        ['ADMIN_EMAIL', 'admin@example.com'],
        ['SUPPORT_EMAIL', 'support@test.org'],
      ]);

      const schema = generateSchemaFromEnv(envVars);

      expect((schema.ADMIN_EMAIL as any).pattern).toEqual(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect((schema.SUPPORT_EMAIL as any).pattern).toEqual(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should detect NODE_ENV choices', () => {
      const envVars = new Map([
        ['NODE_ENV', 'development'],
      ]);

      const schema = generateSchemaFromEnv(envVars);

      expect((schema.NODE_ENV as any).choices).toEqual(['development', 'staging', 'production']);
    });

    it('should detect LOG_LEVEL choices', () => {
      const envVars = new Map([
        ['LOG_LEVEL', 'debug'],
      ]);

      const schema = generateSchemaFromEnv(envVars);

      expect((schema.LOG_LEVEL as any).choices).toEqual(['debug', 'info', 'warn', 'error']);
    });

    it('should set minLength for secrets and keys', () => {
      const envVars = new Map([
        ['JWT_SECRET', 'this-is-a-very-long-secret-key-with-at-least-32-chars'],
        ['API_KEY', 'another-long-api-key-value-here!'], // 33 chars
      ]);

      const schema = generateSchemaFromEnv(envVars);

      expect((schema.JWT_SECRET as any).minLength).toBe(32);
      expect((schema.API_KEY as any).minLength).toBe(32);
    });
  });

  describe('generateSchemaFileContent', () => {
    it('should generate valid JavaScript module content', () => {
      const schema = {
        DATABASE_URL: {
          type: 'string' as const,
          required: true,
          pattern: /^postgres:\/\/.+/,
        },
        PORT: {
          type: 'number' as const,
          required: true,
          min: 1000,
          max: 65535,
        },
      };

      const content = generateSchemaFileContent(schema);

      expect(content).toContain('module.exports = {');
      expect(content).toContain('DATABASE_URL: {');
      expect(content).toContain("type: 'string'");
      expect(content).toContain('required: true');
      expect(content).toContain('pattern: /^postgres:\\/\\/.+/');
      expect(content).toContain('PORT: {');
      expect(content).toContain("type: 'number'");
      expect(content).toContain('min: 1000');
      expect(content).toContain('max: 65535');
    });

    it('should handle choices correctly', () => {
      const schema = {
        NODE_ENV: {
          type: 'string' as const,
          required: true,
          choices: ['development', 'staging', 'production'],
        },
      };

      const content = generateSchemaFileContent(schema);

      expect(content).toContain("choices: ['development', 'staging', 'production']");
    });
  });

  describe('generateSchema command', () => {
    it('should generate schema.env.js from .env file', async () => {
      const envContent = `DATABASE_URL=postgresql://localhost:5432/db
PORT=3000
DEBUG=true
NODE_ENV=development`;

      fs.writeFileSync(path.join(tempDir, '.env'), envContent);

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        await generateSchema({
          env: '.env',
        });

        const schemaPath = path.join(tempDir, 'schema.env.js');
        expect(fs.existsSync(schemaPath)).toBe(true);

        const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
        expect(schemaContent).toContain('module.exports = {');
        expect(schemaContent).toContain('DATABASE_URL:');
        expect(schemaContent).toContain('PORT:');
        expect(schemaContent).toContain('DEBUG:');
        expect(schemaContent).toContain('NODE_ENV:');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should fail if .env file does not exist', async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        await expect(async () => {
          await generateSchema({
            env: '.env',
          });
        }).rejects.toThrow('process.exit called');

        expect(processExitSpy).toHaveBeenCalledWith(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should fail if schema already exists without --force', async () => {
      const envContent = 'PORT=3000';
      const schemaContent = 'module.exports = {};';

      fs.writeFileSync(path.join(tempDir, '.env'), envContent);
      fs.writeFileSync(path.join(tempDir, 'schema.env.js'), schemaContent);

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        await expect(async () => {
          await generateSchema({
            env: '.env',
          });
        }).rejects.toThrow('process.exit called');

        expect(processExitSpy).toHaveBeenCalledWith(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should overwrite existing schema with --force', async () => {
      const envContent = 'PORT=3000\nDEBUG=true';
      const schemaContent = 'module.exports = {};';

      fs.writeFileSync(path.join(tempDir, '.env'), envContent);
      fs.writeFileSync(path.join(tempDir, 'schema.env.js'), schemaContent);

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        await generateSchema({
          env: '.env',
          force: true,
        });

        const schemaPath = path.join(tempDir, 'schema.env.js');
        const newSchemaContent = fs.readFileSync(schemaPath, 'utf-8');
        
        expect(newSchemaContent).toContain('PORT:');
        expect(newSchemaContent).toContain('DEBUG:');
        expect(newSchemaContent).not.toBe(schemaContent);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should support custom output path', async () => {
      const envContent = 'PORT=3000';
      fs.writeFileSync(path.join(tempDir, '.env'), envContent);

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        await generateSchema({
          env: '.env',
          output: 'custom.schema.js',
        });

        const schemaPath = path.join(tempDir, 'custom.schema.js');
        expect(fs.existsSync(schemaPath)).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should fail if .env is empty', async () => {
      fs.writeFileSync(path.join(tempDir, '.env'), '');

      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        await expect(async () => {
          await generateSchema({
            env: '.env',
          });
        }).rejects.toThrow('process.exit called');

        expect(processExitSpy).toHaveBeenCalledWith(1);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
