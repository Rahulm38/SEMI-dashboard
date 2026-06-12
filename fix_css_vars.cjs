const fs = require('fs');
const path = require('path');

const dir = '/Users/rahulramesh.m/Documents/PayZapp/SEMI/semi-dashboard/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  let modified = false;
  if (content.includes('var(--bg-card)')) {
    content = content.replace(/var\(--bg-card\)/g, 'var(--bg-surface)');
    modified = true;
  }
  if (content.includes('var(--border-color)')) {
    content = content.replace(/var\(--border-color\)/g, 'var(--border-subtle)');
    modified = true;
  }
  if (content.includes('var(--text-muted)')) {
    content = content.replace(/var\(--text-muted\)/g, 'var(--text-tertiary)');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
