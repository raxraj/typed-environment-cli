import * as fs from 'fs';
import TypedEnv from 'typed-environment';
import { loadSchemaFile } from '../utils/schema-loader';
import { parseEnvFile, analyzeEnvironmentVariables } from '../utils/schema-generator';

interface CheckOptions {
  env: string;
  schema?: string;
}

export async function check(options: CheckOptions): Promise<void> {
  console.log('🔍 Checking environment variables against schema...');
  
  try {
    // Load schema file
    const { schema, filePath: schemaPath } = await loadSchemaFile(options.schema);
    console.log(`📋 Loaded schema from ${schemaPath}`);
    
    // Check if .env file exists
    if (!fs.existsSync(options.env)) {
      console.error(`❌ Environment file not found: ${options.env}`);
      console.log(`💡 Create ${options.env} file with your environment variables`);
      process.exit(1);
    }
    
    // Parse .env file
    const envVars = parseEnvFile(options.env);
    console.log(`📄 Found ${envVars.size} variables in ${options.env}`);
    
    // Analyze variables against schema
    const analysis = analyzeEnvironmentVariables(schema, envVars);
    
    // Create TypedEnv instance for validation
    const typedEnv = new TypedEnv(schema);
    
    let hasErrors = false;
    
    try {
      // Try to initialize with the current environment
      const envObject = Object.fromEntries(envVars);
      typedEnv.parse(envObject, schema);
      console.log('✅ Environment validation passed!');
    } catch (validationError) {
      hasErrors = true;
      console.error('❌ Environment validation failed:');
      console.error(`   ${validationError instanceof Error ? validationError.message : validationError}`);
    }
    
    // Report missing required variables
    if (analysis.missing.length > 0) {
      hasErrors = true;
      console.error(`\n⚠️  Missing required variables in ${options.env}:`);
      for (const key of analysis.missing) {
        const fieldDef = schema[key];
        console.error(`   - ${key} (${fieldDef.type}${fieldDef.required ? ', required' : ''})`);
      }
    }
    
    // Report extra variables
    if (analysis.extra.length > 0) {
      console.log(`\n📝 Extra variables not defined in schema:`);
      for (const key of analysis.extra) {
        console.log(`   - ${key} = ${envVars.get(key)}`);
      }
      console.log(`   💡 Consider adding these to your schema if they're needed`);
    }
    
    // Report correctly set variables
    if (analysis.present.length > 0) {
      console.log(`\n✅ Correctly configured variables (${analysis.present.length}):`);
      for (const key of analysis.present) {
        const fieldDef = schema[key];
        const value = envVars.get(key);
        const valueDisplay = fieldDef.type === 'string' && (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY'))
          ? '***'
          : value;
        console.log(`   - ${key} = ${valueDisplay} (${fieldDef.type})`);
      }
    }
    
    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   - Schema defines ${analysis.total} variables`);
    console.log(`   - ${analysis.present.length} variables properly configured`);
    
    if (analysis.missing.length > 0) {
      console.log(`   - ${analysis.missing.length} required variables missing`);
    }
    if (analysis.extra.length > 0) {
      console.log(`   - ${analysis.extra.length} extra variables found`);
    }
    
    if (hasErrors) {
      console.log(`\n💡 Next steps:`);
      console.log(`   1. Run 'typed-environment sync-example' to generate .env.example`);
      console.log(`   2. Add missing required variables to ${options.env}`);
      console.log(`   3. Verify all values meet schema requirements`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All environment variables are properly configured!`);
    }
    
  } catch (error) {
    console.error('❌ Error during check:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}