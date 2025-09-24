const axios = require('axios');

const testId = '5285f3a7-ade4-44ce-9977-fc0cc4f18196';
const sectionId = '689a1d68-75f5-4d58-b7c2-d57d8ba083a6';
const url = `http://localhost:3001/api/v1/admin/scoring/tests/${testId}/flags?sectionId=${sectionId}`;

console.log('🧪 Testing flags API with specific test/section IDs...');
console.log('URL:', url);

axios.get(url)
  .then(r => {
    console.log('✅ Flags API working');
    console.log('Status:', r.status);
    console.log('Flags found:', r.data.data?.length || 0);
    console.log('Sample data:', JSON.stringify(r.data.data?.slice(0, 2), null, 2));
  })
  .catch(e => {
    console.log('❌ Flags API failed');
    console.log('Status:', e.response?.status);
    console.log('Error:', e.response?.data || e.message);
  });