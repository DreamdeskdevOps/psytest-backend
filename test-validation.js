const { 
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate
} = require('./src/utils/validation');

console.log('Validation functions imported successfully');
console.log('validateUserRegistration:', typeof validateUserRegistration);
console.log('validateUserLogin:', typeof validateUserLogin);
console.log('validateProfileUpdate:', typeof validateProfileUpdate);