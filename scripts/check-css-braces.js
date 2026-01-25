import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recursively find all CSS files in src directory
function findCssFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findCssFiles(filePath, fileList);
    } else if (file.endsWith('.css')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

// Get all CSS files in src directory
const cssFiles = findCssFiles(path.join(__dirname, '..', 'src'));

// Combine all CSS content for checking
let combinedCss = '';
for (const file of cssFiles) {
  combinedCss += fs.readFileSync(file, 'utf8') + '\n';
}

const css = combinedCss;

const open = (css.match(/\{/g) || []).length;
const close = (css.match(/\}/g) || []).length;
const openParens = (css.match(/\(/g) || []).length;
const closeParens = (css.match(/\)/g) || []).length;
const openBrackets = (css.match(/\[/g) || []).length;
const closeBrackets = (css.match(/\]/g) || []).length;

let hasError = false;

if (open !== close) {
  console.error(`❌ Brace mismatch: ${open} open vs ${close} close`);
  hasError = true;
}
if (openParens !== closeParens) {
  console.error(`❌ Paren mismatch: ${openParens} open vs ${closeParens} close`);
  hasError = true;
}
if (openBrackets !== closeBrackets) {
  console.error(`❌ Bracket mismatch: ${openBrackets} open vs ${closeBrackets} close`);
  hasError = true;
}

if (!hasError) {
  console.log(`✅ CSS brackets balanced: {}=${open}, ()=${openParens}, []=${openBrackets}`);
  process.exit(0);
} else {
  process.exit(1);
}
