import * as fs from 'fs';
import { loadSchemaFile } from '../utils/schema-loader';
import { parseEnvFile, generateEnvExampleFromSchema, analyzeEnvironmentVariables, writeFile } from '../utils/schema-generator';

interface SyncExampleOptions {
  env: string;
  output: string;
  schema?: string;
}

export async function syncExample(options: SyncExampleOptions): Promise<void> {
  console.log('🔍 Loading environment schema...');
  
  try {
    // Load schema file
    const { schema, filePath: schemaPath } = await loadSchemaFile(options.schema);
    console.log(`📋 Loaded schema from ${schemaPath}`);
    console.log(`🔧 Found ${Object.keys(schema).length} variables in schema`);
    
    // Parse existing .env file
    const envVars = parseEnvFile(options.env);
    const envExists = fs.existsSync(options.env);
    
    if (envExists) {
      console.log(`📄 Found ${envVars.size} variables in ${options.env}`);
    } else {
      console.log(`📄 No ${options.env} file found - will show all schema variables`);
    }
    
    // Analyze environment variables against schema
    const analysis = analyzeEnvironmentVariables(schema, envVars);
    
    // Report findings
    if (analysis.missing.length > 0) {
      console.log(`⚠️  Missing required variables in ${options.env}:`, analysis.missing.join(', '));
    }
    
    if (analysis.extra.length > 0) {
      console.log(`📝 Extra variables not in schema:`, analysis.extra.join(', '));
    }
    
    if (analysis.present.length > 0) {
      console.log(`✅ Variables correctly set:`, analysis.present.join(', '));
    }
    
    // Generate .env.example content from schema
    const exampleContent = generateEnvExampleFromSchema(schema, envVars);
    
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
    console.log(`📊 Summary: ${analysis.total} variables defined in schema`);
    
    if (analysis.missing.length > 0) {
      console.log(`   - ${analysis.missing.length} required variables missing from ${options.env}`);
    }
    if (analysis.extra.length > 0) {
      console.log(`   - ${analysis.extra.length} extra variables not in schema`);
    }
    if (analysis.present.length > 0) {
      console.log(`   - ${analysis.present.length} variables properly configured`);
    }
    
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Copy ${options.output} to ${options.env}`);
    console.log(`   2. Fill in the required values`);
    if (analysis.missing.length > 0) {
      console.log(`   3. Add missing required variables: ${analysis.missing.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error during sync-example:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}