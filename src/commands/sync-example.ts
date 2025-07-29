import * as fs from 'fs';
import { parseEnvFile, scanSourceForEnvVars, generateEnvExample, writeFile } from '../utils/env-parser';

interface SyncExampleOptions {
  env: string;
  output: string;
  source: string;
}

export async function syncExample(options: SyncExampleOptions): Promise<void> {
  console.log('🔍 Scanning for environment variables...');
  
  try {
    // Parse existing .env file
    const envVars = parseEnvFile(options.env);
    console.log(`📄 Found ${envVars.size} variables in ${options.env}`);
    
    // Scan source code for environment variable usage
    const codeVars = scanSourceForEnvVars(options.source);
    console.log(`💻 Found ${codeVars.size} variables in source code`);
    
    // Find missing and unused variables
    const missingVars = new Set([...codeVars].filter(key => !envVars.has(key)));
    const unusedVars = new Set([...envVars.keys()].filter(key => !codeVars.has(key)));
    
    // Report findings
    if (missingVars.size > 0) {
      console.log(`⚠️  Missing variables in ${options.env}:`, Array.from(missingVars).join(', '));
    }
    
    if (unusedVars.size > 0) {
      console.log(`📝 Unused variables in ${options.env}:`, Array.from(unusedVars).join(', '));
    }
    
    // Generate .env.example content
    const exampleContent = generateEnvExample(envVars, codeVars);
    
    // Check if .env.example already exists
    const outputExists = fs.existsSync(options.output);
    
    // Write .env.example file
    writeFile(options.output, exampleContent);
    
    if (outputExists) {
      console.log(`✅ ${options.output} updated successfully`);
    } else {
      console.log(`✅ ${options.output} created successfully`);
    }
    
    // Summary
    const totalVars = new Set([...envVars.keys(), ...codeVars]).size;
    console.log(`📊 Summary: ${totalVars} total variables processed`);
    
    if (missingVars.size > 0) {
      console.log(`   - ${missingVars.size} missing from .env`);
    }
    if (unusedVars.size > 0) {
      console.log(`   - ${unusedVars.size} unused in code`);
    }
    
  } catch (error) {
    console.error('❌ Error during sync-example:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}