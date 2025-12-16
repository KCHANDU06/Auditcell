const bcrypt = require('bcrypt');

(async () => {
  const passwordPlain = 'audit@123';
  const hashedPassword = await bcrypt.hash(passwordPlain, 10);
  console.log(hashedPassword);
})();
