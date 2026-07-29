import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve(process.cwd(), 'dist');
const library = path.join(output, 'library');
const appShell = path.join(output, 'index.html');

if (!fs.existsSync(library) || !fs.existsSync(appShell)) {
  console.log('No crawlable library snapshots to enhance.');
  process.exit(0);
}

const rootHtml = fs.readFileSync(appShell, 'utf8');
const scripts = rootHtml.match(/<script[^>]+type="module"[^>]*src="[^"]+"[^>]*><\/script>/gi) || [];
if (scripts.length === 0) throw new Error('Could not find the Vite application module.');

const bootstrap = scripts.join('') + '<script>document.documentElement.dataset.seoSnapshot="true";</script>';
const files = [];
const walk = directory => {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) walk(target);
    else if (item.name === 'index.html') files.push(target);
  }
};

walk(library);
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes('data-seo-snapshot')) continue;
  const enhanced = html
    .replace('<body>', '<body><div id="root">')
    .replace('</body>', '</div>' + bootstrap + '</body>');
  fs.writeFileSync(file, enhanced, 'utf8');
}

console.log(`Enhanced ${files.length} crawlable library snapshot(s) with the interactive reader.`);
