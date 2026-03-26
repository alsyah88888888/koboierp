const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf-8');

schema = schema.replace(
  /datasource db \{[\s\S]*?\}/,
  `datasource db {\n  provider = "sqlite"\n  url      = "file:../prisma/dev.db"\n}`
);

schema = schema.replace(
  /generator client \{[\s\S]*?\}/,
  `generator client {\n  provider = "prisma-client-js"\n  output   = "../node_modules/@prisma/client-sqlite"\n}`
);

fs.mkdirSync('prisma-sqlite', { recursive: true });
fs.writeFileSync('prisma-sqlite/schema.prisma', schema);
console.log('Successfully created prisma-sqlite/schema.prisma');
