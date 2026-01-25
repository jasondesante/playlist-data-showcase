import fs from 'fs';

const css = fs.readFileSync('src/index.css', 'utf8');

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
