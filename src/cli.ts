#!/usr/bin/env node
import { Command } from 'commander';
import { syncExample } from './commands/sync-example';
import { check } from './commands/check';

const program = new Command();

program
  .name('typed-environment')
  .description('CLI tool for managing environment variables with typed-environment schemas')
  .version('1.0.0');

program
  .command('sync-example')
  .description('Generate or update .env.example based on schema definition')
  .option('-e, --env <file>', 'Environment file to read from', '.env')
  .option('-o, --output <file>', 'Output file path', '.env.example')
  .option('-s, --schema <file>', 'Schema file path (auto-detected if not provided)')
  .action(syncExample);

program
  .command('check')
  .description('Validate environment variables against schema')
  .option('-e, --env <file>', 'Environment file to check', '.env')
  .option('-s, --schema <file>', 'Schema file path (auto-detected if not provided)')
  .action(check);

program.parse(process.argv);