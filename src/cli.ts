#!/usr/bin/env node
import { Command } from 'commander';
import { syncExample } from './commands/sync-example';
import { check } from './commands/check';

const program = new Command();

program
  .name('typed-environment')
  .description('CLI tool for managing environment variables with typed-environment')
  .version('1.0.0');

program
  .command('sync-example')
  .description('Generate or update .env.example based on .env and code usage')
  .option('-e, --env <file>', 'Environment file to read from', '.env')
  .option('-o, --output <file>', 'Output file path', '.env.example')
  .option('-s, --source <path>', 'Source code directory to scan', 'src')
  .action(syncExample);

program
  .command('check')
  .description('Check for missing or unused environment variables')
  .option('-e, --env <file>', 'Environment file to check', '.env')
  .option('-s, --source <path>', 'Source code directory to scan', 'src')
  .action(check);

program.parse(process.argv);