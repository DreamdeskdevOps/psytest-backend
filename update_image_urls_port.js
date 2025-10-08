const { executeQuery, getMany } = require('./src/config/database');

async function updateImageUrlsPort() {
  try {
    console.log('🔧 Starting image URL port update from 5000 to 3001...\n');

    // First, check how many URLs need to be updated
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM question_images
      WHERE image_url LIKE '%:5000/%'
    `;

    const checkResult = await getMany(checkQuery);
    const totalToUpdate = parseInt(checkResult[0]?.count || 0);

    console.log(`📊 Found ${totalToUpdate} image URLs with port 5000\n`);

    if (totalToUpdate === 0) {
      console.log('✅ No URLs to update. All images are already using the correct port.');
      process.exit(0);
    }

    // Show some examples of what will be updated
    console.log('📋 Sample URLs that will be updated:');
    const sampleQuery = `
      SELECT id, image_url
      FROM question_images
      WHERE image_url LIKE '%:5000/%'
      LIMIT 5
    `;
    const samples = await getMany(sampleQuery);
    samples.forEach(sample => {
      const newUrl = sample.image_url.replace(':5000/', ':3001/');
      console.log(`  Before: ${sample.image_url}`);
      console.log(`  After:  ${newUrl}\n`);
    });

    // Perform the update
    console.log('🔄 Updating all image URLs from port 5000 to port 3001...\n');

    const updateQuery = `
      UPDATE question_images
      SET
        image_url = REPLACE(image_url, ':5000/', ':3001/'),
        updated_at = CURRENT_TIMESTAMP
      WHERE image_url LIKE '%:5000/%'
      RETURNING id, image_url
    `;

    const result = await getMany(updateQuery);

    console.log(`✅ Successfully updated ${result.length} image URLs!\n`);

    // Verify the update
    console.log('🔍 Verifying update...');
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM question_images
      WHERE image_url LIKE '%:5000/%'
    `;
    const verifyResult = await getMany(verifyQuery);
    const remainingOldUrls = parseInt(verifyResult[0]?.count || 0);

    if (remainingOldUrls === 0) {
      console.log('✅ Verification successful! All URLs have been updated to port 3001.');
    } else {
      console.log(`⚠️ Warning: ${remainingOldUrls} URLs still contain port 5000. Manual review may be needed.`);
    }

    // Show final statistics
    console.log('\n📊 Final Statistics:');
    console.log(`   Total URLs updated: ${result.length}`);
    console.log(`   URLs with port 3001: ${totalToUpdate}`);
    console.log(`   URLs with port 5000: ${remainingOldUrls}`);

    console.log('\n✅ Update completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating image URLs:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the update
updateImageUrlsPort();
