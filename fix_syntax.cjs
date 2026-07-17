const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');
let lines = content.split(/\r?\n/);

// We want to delete lines 2253 to 2447 (1-indexed).
// In 0-indexed array, that's index 2252 to 2446.
// Delete 195 lines starting at index 2252.

lines.splice(2252, 195);

fs.writeFileSync('src/App.jsx', lines.join('\n'), 'utf8');
console.log("Fixed syntax error by removing duplicate block.");
