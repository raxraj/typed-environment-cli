import * as fs from 'fs';
import * as path from 'path';

export interface EnvVariable {
  key: string;
  value?: string;
  source: 'env' | 'code';
}

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
 * Scan source files for environment variable usage
 */
export function scanSourceForEnvVars(sourcePath: string): Set<string> {
  const envVars = new Set<string>();
  
  if (!fs.existsSync(sourcePath)) {
    return envVars;
  }

  // Common patterns for environment variable access
  const patterns = [
    /process\.env\.([A-Z_][A-Z0-9_]*)/g,
    /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g,
    /\$\{([A-Z_][A-Z0-9_]*)\}/g, // Template literals like ${VAR_NAME}
    /\$([A-Z_][A-Z0-9_]*)/g, // Shell-style variables
  ];

  function scanFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex state
        while ((match = pattern.exec(content)) !== null) {
          envVars.add(match[1]);
        }
      }
    } catch (error) {
      // Ignore files that can't be read
    }
  }

  function scanDirectory(dirPath: string) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common directories that don't contain source code
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
            scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          // Only scan relevant file types
          const ext = path.extname(entry.name).toLowerCase();
          if (['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.php', '.rb'].includes(ext)) {
            scanFile(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore directories that can't be read
    }
  }

  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    scanDirectory(sourcePath);
  } else {
    scanFile(sourcePath);
  }

  return envVars;
}

/**
 * Generate .env.example content from environment variables
 */
export function generateEnvExample(envVars: Map<string, string>, codeVars: Set<string>): string {
  const lines: string[] = [];
  const allKeys = new Set([...envVars.keys(), ...codeVars]);
  const sortedKeys = Array.from(allKeys).sort();

  lines.push('# Environment Variables');
  lines.push('# Copy this file to .env and fill in the values');
  lines.push('');

  for (const key of sortedKeys) {
    const hasValue = envVars.has(key);
    const foundInCode = codeVars.has(key);
    
    let comment = '';
    if (!hasValue && foundInCode) {
      comment = ' # Required: Found in code but missing from .env';
    } else if (hasValue && !foundInCode) {
      comment = ' # Warning: Defined but not used in code';
    }

    if (hasValue) {
      // Use empty string or placeholder for values
      lines.push(`${key}=${comment}`);
    } else {
      lines.push(`${key}=${comment}`);
    }
  }

  return lines.join('\n') + '\n';
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