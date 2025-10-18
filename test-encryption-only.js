const pdfEncryptionService = require('./src/services/pdfEncryptionService');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function testEncryption() {
  try {
    console.log('🧪 Testing PDF Encryption with node-qpdf\n');

    // Create a test PDF
    const testPdfPath = path.join(__dirname, 'uploads', 'test-encryption.pdf');

    console.log('📄 Creating test PDF...');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('This is a test PDF for encryption', {
      x: 50,
      y: 350,
      size: 20,
      font: font
    });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(testPdfPath, pdfBytes);

    console.log('✅ Test PDF created:', testPdfPath);

    // Test password generation
    const testDOB = '2002-12-23';
    const password = pdfEncryptionService.formatDOBPassword(testDOB);
    console.log('\n🔑 Password generated:', password);

    // Test encryption
    console.log('\n🔐 Testing encryption...');
    const encryptedPath = await pdfEncryptionService.encryptPDF(testPdfPath, password);

    console.log('\n✅ Encryption successful!');
    console.log('   Encrypted file:', encryptedPath);
    console.log('   Password:', password);

    // Verify file exists
    const stats = await fs.stat(encryptedPath);
    console.log('   File size:', stats.size, 'bytes');

    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 Try opening this file:');
    console.log('   ', encryptedPath);
    console.log('   Password:', password);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEncryption();
