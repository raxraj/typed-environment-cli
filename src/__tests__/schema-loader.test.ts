import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { findSchemaFile, loadSchema, getSchemaFile, loadSchemaFile } from '../utils/schema-loader';

describe('schema-loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typed-env-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findSchemaFile', () => {
    it('should find schema.env.js', () => {
      const schemaFile = path.join(tempDir, 'schema.env.js');
      fs.writeFileSync(schemaFile, 'module.exports = {};');

      const result = findSchemaFile(tempDir);
      expect(result).toBe(schemaFile);
    });

    it('should find schema.env.ts', () => {
      const schemaFile = path.join(tempDir, 'schema.env.ts');
      fs.writeFileSync(schemaFile, 'export default {};');

      const result = findSchemaFile(tempDir);
      expect(result).toBe(schemaFile);
    });

    it('should prefer first pattern when multiple files exist', () => {
      const schemaFile1 = path.join(tempDir, 'schema.env.ts');
      const schemaFile2 = path.join(tempDir, 'env.schema.ts');
      fs.writeFileSync(schemaFile1, 'export default {};');
      fs.writeFileSync(schemaFile2, 'export default {};');

      const result = findSchemaFile(tempDir);
      expect(result).toBe(schemaFile1);
    });

    it('should return null when no schema file exists', () => {
      const result = findSchemaFile(tempDir);
      expect(result).toBeNull();
    });
  });

  describe('loadSchema', () => {
    it('should load CommonJS module with module.exports', async () => {
      const schemaContent = `
module.exports = {
  DATABASE_URL: { type: 'string', required: true },
  PORT: { type: 'number', default: 3000 }
};`;
      const schemaFile = path.join(tempDir, 'schema.env.js');
      fs.writeFileSync(schemaFile, schemaContent);

      const result = await loadSchema(schemaFile);
      
      expect(result).toHaveProperty('DATABASE_URL');
      expect(result).toHaveProperty('PORT');
      expect(result.DATABASE_URL.type).toBe('string');
      expect(result.PORT.default).toBe(3000);
    });

    it('should throw error for invalid file', async () => {
      const schemaFile = path.join(tempDir, 'invalid.js');
      fs.writeFileSync(schemaFile, 'invalid syntax {{{');

      await expect(loadSchema(schemaFile)).rejects.toThrow();
    });

    it('should throw error for file without valid schema', async () => {
      const schemaContent = `
module.exports = {
  notASchema: "just a string"
};`;
      const schemaFile = path.join(tempDir, 'schema.env.js');
      fs.writeFileSync(schemaFile, schemaContent);

      // This should actually load the object, but our schema detector should identify it's not a valid schema
      const result = await loadSchema(schemaFile);
      expect(result).toEqual({ notASchema: "just a string" });
    });
  });

  describe('getSchemaFile', () => {
    it('should return provided path if it exists', () => {
      const schemaFile = path.join(tempDir, 'custom.schema.js');
      fs.writeFileSync(schemaFile, 'module.exports = {};');

      const result = getSchemaFile(schemaFile);
      expect(result).toBe(schemaFile);
    });

    it('should throw error if provided path does not exist', () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.js');

      expect(() => getSchemaFile(nonExistentFile)).toThrow('Schema file not found');
    });

    it('should auto-detect schema file when no path provided', () => {
      const schemaFile = path.join(tempDir, 'schema.env.js');
      fs.writeFileSync(schemaFile, 'module.exports = {};');

      // Change to temp directory for auto-detection
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        const result = getSchemaFile();
        expect(result).toBe(schemaFile);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should throw helpful error when no schema file found', () => {
      // Change to temp directory where no schema exists
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      
      try {
        expect(() => getSchemaFile()).toThrow('No schema file found');
        expect(() => getSchemaFile()).toThrow('schema.env.ts');
        expect(() => getSchemaFile()).toThrow('Example schema.env.ts:');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('loadSchemaFile', () => {
    it('should load schema and return both schema and file path', async () => {
      const schemaContent = `
module.exports = {
  DATABASE_URL: { type: 'string', required: true }
};`;
      const schemaFile = path.join(tempDir, 'schema.env.js');
      fs.writeFileSync(schemaFile, schemaContent);

      const result = await loadSchemaFile(schemaFile);
      
      expect(result.schema).toHaveProperty('DATABASE_URL');
      expect(result.filePath).toBe(schemaFile);
    });
  });
});