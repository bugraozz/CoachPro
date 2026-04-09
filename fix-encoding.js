const fs = require('fs');
const path = require('path');

const replacements = {
  'Ã§': 'ç',
  'Ã‡': 'Ç',
  'ÄŸ': 'ğ',
  'Äž': 'Ğ',
  'Ä±': 'ı',
  'Ä°': 'İ',
  'Ã¶': 'ö',
  'Ã–': 'Ö',
  'ÅŸ': 'ş',
  'Åž': 'Ş',
  'Ã¼': 'ü',
  'Ãœ': 'Ü',
  // Some additional cases might exist where a single character is wrong
  // but these two-letter combinations cover the typical UTF-8 misinterpretation.
  'Ã¢': 'â',
  'Ã®': 'î',
  'Ã»': 'û'
};

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walkDir(file));
      }
    } else {
      if (file.endsWith('.astro') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.mjs')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walkDir('c:/Users/bugra/Masaüstü/coach/astro-app');
let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
    fixedCount++;
  }
});

console.log('Total fixed:', fixedCount);
