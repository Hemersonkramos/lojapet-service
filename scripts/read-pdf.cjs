const fs = require('fs');
const { PDFParse } = require('pdf-parse');
(async () => {
 const parser = new PDFParse({data: fs.readFileSync(process.argv[2])});
 console.log((await parser.getText()).text);
 await parser.destroy();
})();
