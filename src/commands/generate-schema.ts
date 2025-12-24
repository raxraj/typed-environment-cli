import * as fs from 'fs';
import * as path from 'path';
import { findSchemaFile } from '../utils/schema-loader';
import { parseEnvFile } from '../utils/schema-generator';
import { generateSchemaFromEnv, generateSchemaFileContent } from '../utils/env-to-schema';

interface GenerateSchemaOptions {
  env: string;
  output?: string;
  force?: boolean;
}

export async function generateSchema(options: GenerateSchemaOptions): Promise<void> {
  console.log('🔍 Checking for existing schema and .env files...');
  
  try {
    // Determine the output file path
    const outputPath = options.output || path.join(process.cwd(), 'schema.env.js');
    
    // Check if output file already exists (before writing)
    const fileExistedBefore = fs.existsSync(outputPath);
    if (fileExistedBefore && !options.force) {
      console.log(`❌ Schema file already exists: ${outputPath}`);
      console.log(`   Use --force to overwrite the existing schema file`);
      process.exit(1);
    }
    
    // Also check if any default schema file exists (when no output is specified)
    if (!options.output) {
      const existingSchema = findSchemaFile();
      if (existingSchema && !options.force) {
        console.log(`❌ Schema file already exists: ${existingSchema}`);
        console.log(`   Use --force to overwrite the existing schema file`);
        process.exit(1);
      }
    }
    
    // Check if .env file exists
    if (!fs.existsSync(options.env)) {
      console.log(`❌ Environment file not found: ${options.env}`);
      console.log(`   Please create a .env file first with your environment variables`);
      process.exit(1);
    }
    
    // Parse .env file
    console.log(`📄 Reading environment variables from ${options.env}...`);
    const envVars = parseEnvFile(options.env);
    
    if (envVars.size === 0) {
      console.log(`⚠️  No environment variables found in ${options.env}`);
      console.log(`   Please add some variables to your .env file first`);
      process.exit(1);
    }
    
    console.log(`✅ Found ${envVars.size} variables in ${options.env}`);
    
    // Generate schema from environment variables
    console.log(`🔧 Generating schema from environment variables...`);
    const schema = generateSchemaFromEnv(envVars);
    
    // Generate schema file content
    const schemaContent = generateSchemaFileContent(schema);
    
    // Write schema file
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, schemaContent, 'utf-8');
    
    if (fileExistedBefore && options.force) {
      console.log(`✅ Schema file updated: ${outputPath}`);
    } else {
      console.log(`✅ Schema file created: ${outputPath}`);
    }
    
    // Print summary
    console.log(`\n📊 Summary:`);
    console.log(`   - ${envVars.size} environment variables processed`);
    console.log(`   - Schema file: ${outputPath}`);
    
    // Print variable breakdown
    const varsByType = {
      string: 0,
      number: 0,
      boolean: 0
    };
    
    for (const fieldDef of Object.values(schema)) {
      varsByType[fieldDef.type as keyof typeof varsByType]++;
    }
    
    console.log(`\n📈 Variable types:`);
    if (varsByType.string > 0) console.log(`   - ${varsByType.string} string variables`);
    if (varsByType.number > 0) console.log(`   - ${varsByType.number} number variables`);
    if (varsByType.boolean > 0) console.log(`   - ${varsByType.boolean} boolean variables`);
    
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review and customize ${outputPath}`);
    console.log(`   2. Run 'npx typed-environment check' to validate your .env`);
    console.log(`   3. Run 'npx typed-environment sync-example' to generate .env.example`);
    
  } catch (error) {
    console.error('❌ Error during schema generation:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
