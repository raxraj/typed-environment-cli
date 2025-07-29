import { parseEnvFile, scanSourceForEnvVars } from '../utils/env-parser';

interface CheckOptions {
  env: string;
  source: string;
}

export async function check(options: CheckOptions): Promise<void> {
  console.log('🔍 Checking environment variables...');
  
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
    
    let hasIssues = false;
    
    // Report missing variables
    if (missingVars.size > 0) {
      hasIssues = true;
      console.log('\n❌ Missing variables in .env:');
      for (const varName of Array.from(missingVars).sort()) {
        console.log(`   - ${varName}`);
      }
    }
    
    // Report unused variables
    if (unusedVars.size > 0) {
      hasIssues = true;
      console.log('\n⚠️  Unused variables in .env:');
      for (const varName of Array.from(unusedVars).sort()) {
        console.log(`   - ${varName}`);
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - ${envVars.size} variables in ${options.env}`);
    console.log(`   - ${codeVars.size} variables found in code`);
    console.log(`   - ${missingVars.size} missing from .env`);
    console.log(`   - ${unusedVars.size} unused in .env`);
    
    if (!hasIssues) {
      console.log('\n✅ All environment variables are properly configured!');
    } else {
      console.log('\n💡 Tip: Run "typed-environment sync-example" to update .env.example with current findings');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error during check:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}