const muhammara = require('muhammara');
const fs = require('fs').promises;
const path = require('path');

/**
 * PDF Encryption Service
 * Encrypts PDF files with password protection (in-place, same file path)
 */
class PDFEncryptionService {
  /**
   * Encrypt a PDF file with password protection
   * CRITICAL: This encrypts the PDF IN-PLACE (replaces the original file)
   * to avoid file path conflicts and ensure download button works correctly
   *
   * @param {string} pdfPath - Absolute path to the PDF file
   * @param {string} password - User password for opening the PDF
   * @returns {Promise<string>} The same PDF path (file is replaced with encrypted version)
   */
  async encryptPDF(pdfPath, password) {
    try {
      console.log('🔐 Starting PDF encryption...');
      console.log('   File:', pdfPath);
      console.log('   Password length:', password?.length || 0);

      // Verify file exists
      try {
        await fs.access(pdfPath);
        const stats = await fs.stat(pdfPath);
        console.log('   ✓ PDF file found, size:', stats.size, 'bytes');
      } catch (error) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      // Create temporary output path
      const dir = path.dirname(pdfPath);
      const ext = path.extname(pdfPath);
      const basename = path.basename(pdfPath, ext);
      const tempOutputPath = path.join(dir, `${basename}_temp_encrypted${ext}`);

      console.log('   🔧 Encrypting with muhammara.recrypt()...');

      // Use muhammara's recrypt method to add encryption to existing PDF
      // This is the proper way to encrypt an already-generated PDF
      muhammara.recrypt(pdfPath, tempOutputPath, {
        userPassword: password,
        ownerPassword: password,
        userProtectionFlag: 4 // Allow printing only
      });

      console.log('   ✓ PDF encrypted successfully');
      console.log('   ✓ Temporary encrypted file created');

      // Verify the encrypted file was created
      try {
        await fs.access(tempOutputPath);
      } catch (error) {
        throw new Error('Encrypted file was not created');
      }

      // Replace original file with encrypted version (IN-PLACE)
      // This is CRITICAL - we must use the same file path!
      await fs.unlink(pdfPath); // Delete original
      await fs.rename(tempOutputPath, pdfPath); // Rename encrypted to original name

      console.log('   ✓ Original file replaced with encrypted version (in-place)');

      // Verify encrypted file exists
      const encryptedStats = await fs.stat(pdfPath);
      console.log('   ✓ Encrypted file size:', encryptedStats.size, 'bytes');

      // Return the SAME path (not a new path)
      return pdfPath;

    } catch (error) {
      console.error('❌ PDF encryption failed:', error.message);
      console.error('   Error stack:', error.stack);

      // Clean up temp file if it exists
      try {
        const dir = path.dirname(pdfPath);
        const ext = path.extname(pdfPath);
        const basename = path.basename(pdfPath, ext);
        const tempOutputPath = path.join(dir, `${basename}_temp_encrypted${ext}`);
        await fs.unlink(tempOutputPath);
        console.log('   ✓ Cleaned up temporary file');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      throw new Error(`PDF encryption failed: ${error.message}`);
    }
  }

  /**
   * Format date of birth to password (DDMMYYYY format)
   * @param {string|Date} dob - Date of birth (ISO format or Date object)
   * @returns {string} Password in DDMMYYYY format (e.g., "15081995")
   */
  formatDOBPassword(dob) {
    try {
      if (!dob) {
        console.log('⚠️ No date of birth provided');
        return null;
      }

      const date = new Date(dob);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('⚠️ Invalid date of birth:', dob);
        return null;
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      const password = `${day}${month}${year}`;

      console.log('🔑 Generated password from DOB:', {
        dob: dob,
        password: password,
        format: 'DDMMYYYY'
      });

      return password;

    } catch (error) {
      console.error('❌ Error formatting DOB password:', error);
      return null;
    }
  }

  /**
   * Check if PDF encryption is enabled in environment
   * @returns {boolean} True if encryption is enabled
   */
  isEncryptionEnabled() {
    const enabled = process.env.PDF_ENCRYPTION_ENABLED === 'true';
    console.log('🔐 PDF encryption enabled:', enabled);
    return enabled;
  }
}

module.exports = new PDFEncryptionService();
