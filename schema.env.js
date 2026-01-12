// Example schema.env.js file
// This file defines the environment variables for your application using typed-environment

module.exports = {
  // Database configuration
  DATABASE_URL: {
    type: 'string',
    required: true,
    pattern: /^postgresql:\/\/.+/,
  },

  // Server configuration
  PORT: {
    type: 'number',
    default: 3000,
    min: 1000,
    max: 65535,
  },

  // Security
  JWT_SECRET: {
    type: 'string',
    required: true,
    minLength: 32,
  },

  // Feature flags
  DEBUG: {
    type: 'boolean',
    default: false,
  },

  // Environment
  NODE_ENV: {
    type: 'string',
    required: true,
    choices: ['development', 'staging', 'production'],
  },

  // API Keys
  API_KEY: {
    type: 'string',
    required: true,
    minLength: 32,
    maxLength: 64,
  },

  // Optional Redis configuration
  REDIS_URL: {
    type: 'string',
    required: false,
    pattern: /^redis:\/\/.*/,
  },
};