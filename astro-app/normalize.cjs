const fs = require('fs');
const path = require('path');

function fix(dir) {
  let list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.join(dir, file);
    let stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) fix(file);
    } else if (file.match(/\.(tsx|ts|jsx|js|astro|css)$/)) {
      try {
        let b = fs.readFileSync(file);
        // Force rewrite as pure UTF-8 buffer to normalize the file on disk explicitly
        fs.writeFileSync(file, b); 
      } catch(e) {}
    }
  }
}
fix('c:/Users/bugra/Masaüstü/coach/astro-app/src');
console.log('Done normalizing encodings');
