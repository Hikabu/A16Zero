const otplib = require('otplib');
console.log('Keys:', Object.keys(otplib));
console.log('TOTP:', !!otplib.TOTP);
console.log('Default TOTP:', !!(otplib.default && otplib.default.TOTP));
