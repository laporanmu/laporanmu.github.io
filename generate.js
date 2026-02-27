const bcrypt = require("bcrypt");

(async () => {
    const pw = "admin12";
    const hash = await bcrypt.hash(pw, 10);
    console.log(hash);
})();