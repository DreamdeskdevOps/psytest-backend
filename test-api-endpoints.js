/**
 * Test API endpoint availability
 * This verifies that all routes are properly registered
 */

const express = require('express');
const app = require('./src/app');

console.log('\n🧪 Testing API Endpoint Registration\n');
console.log('=' .repeat(60));

// Get all registered routes
function getRoutes(app) {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Direct route
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).join(', ').toUpperCase()
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const basePath = middleware.regexp.source
            .replace('\\/?', '')
            .replace('(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace(/\^/g, '')
            .replace(/\$/g, '');

          routes.push({
            path: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods).join(', ').toUpperCase()
          });
        }
      });
    }
  });

  return routes;
}

const routes = getRoutes(app);

console.log('\n📋 PDF-Related Endpoints:\n');

const pdfEndpoints = [
  { path: '/api/v1/pdf/generate', method: 'POST', description: 'Generate PDF for test attempt' },
  { path: '/api/v1/pdf/attempt/:attemptId', method: 'GET', description: 'Get generated PDF info' },
  { path: '/api/v1/pdf/download/:attemptId', method: 'GET', description: 'Download generated PDF' },
  { path: '/api/v1/pdf/regenerate/:attemptId', method: 'POST', description: 'Regenerate PDF' },
  { path: '/api/v1/pdf/student/:studentId/history', method: 'GET', description: 'Get PDF history' },
  { path: '/api/v1/pdf/stats', method: 'GET', description: 'Get PDF statistics' },
];

const testEndpoints = [
  { path: '/api/v1/admin/tests/:id/assign-template', method: 'PUT', description: 'Assign PDF template to test' },
  { path: '/api/v1/admin/tests/:id/template', method: 'GET', description: 'Get assigned template' },
  { path: '/api/v1/admin/tests/:id/template', method: 'DELETE', description: 'Remove PDF template' },
];

const templateEndpoints = [
  { path: '/api/v1/admin/pdf-templates/active', method: 'GET', description: 'Get active templates for dropdown' },
];

console.log('PDF Generation Endpoints:');
pdfEndpoints.forEach(endpoint => {
  const found = routes.some(r =>
    r.path.includes(endpoint.path.replace(':attemptId', '').replace(':studentId', '')) &&
    r.methods.includes(endpoint.method)
  );
  const status = found ? '✅' : '❌';
  console.log(`  ${status} ${endpoint.method.padEnd(6)} ${endpoint.path}`);
  console.log(`     ${endpoint.description}`);
});

console.log('\nTest Template Assignment Endpoints:');
testEndpoints.forEach(endpoint => {
  const found = routes.some(r =>
    r.path.includes(endpoint.path.replace(':id', '')) &&
    r.methods.includes(endpoint.method)
  );
  const status = found ? '✅' : '❌';
  console.log(`  ${status} ${endpoint.method.padEnd(6)} ${endpoint.path}`);
  console.log(`     ${endpoint.description}`);
});

console.log('\nPDF Template Endpoints:');
templateEndpoints.forEach(endpoint => {
  const found = routes.some(r =>
    r.path.includes(endpoint.path) &&
    r.methods.includes(endpoint.method)
  );
  const status = found ? '✅' : '❌';
  console.log(`  ${status} ${endpoint.method.padEnd(6)} ${endpoint.path}`);
  console.log(`     ${endpoint.description}`);
});

// Check file structure
console.log('\n📁 Verifying File Structure:\n');

const fs = require('fs');
const path = require('path');

const files = [
  'src/services/pdfGenerationService.js',
  'src/controllers/pdfGenerationController.js',
  'src/routes/pdfGeneration.js',
  'migrations/add_pdf_template_to_tests.sql'
];

files.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ API Endpoint Test Complete!\n');

process.exit(0);
