#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name('typed-environment')
  .description('CLI tool for managing environment variables with typed-environment schemas')
  .version('0.0.1');

  // to run this command: npx ts-node src/index.ts check
program
.command('check')
.option('-p, --path <path>', 'Path to the schema file')
.description('Check the current environment against the typed-environment schema')
.action((
  options: { path?: string }
) => {
  console.log('Checking environment...');
});

program.parse(process.argv);