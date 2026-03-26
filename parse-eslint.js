const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint-errors.json'));
const errors = data.map(d => ({ file: d.filePath, messages: d.messages.filter(m => m.severity === 2) })).filter(d => d.messages.length > 0);
console.log(JSON.stringify(errors, null, 2));
