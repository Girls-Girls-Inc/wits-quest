// jest.env.setup.js - Global environment setup for Jest
// This runs before any tests and ensures environment variables are available

// Set default test environment variables if they don't exist
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://fake-supabase-url.supabase.co';
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key-for-testing';
}

if (!process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = 'fake-anon-key-for-testing';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Add any other environment variables your tests need
console.log('Jest environment setup complete - using test environment variables');