const fs = require('fs');

function svgToJsx(svgStr) {
  return svgStr
    .replace(/<\?xml.*?\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/xml:space="[^"]*"/g, '')
    .replace(/fill-rule=/g, 'fillRule=')
    .replace(/clip-rule=/g, 'clipRule=')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stroke-linecap=/g, 'strokeLinecap=')
    .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/stop-color=/g, 'stopColor=')
    .replace(/stop-opacity=/g, 'stopOpacity=')
    .replace(/style="([^"]*)"/g, (match, p1) => {
      const styles = p1.split(';').filter(Boolean).map(s => {
        const parts = s.split(':');
        const k = parts[0];
        const v = parts.slice(1).join(':');
        if (!k || !v) return '';
        const camelK = k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        return `${camelK}: "${v.trim()}"`;
      }).filter(Boolean).join(', ');
      return `style={{ ${styles} }}`;
    });
}

const files = fs.readdirSync('public/support-tools');
files.forEach(f => {
  const content = fs.readFileSync('public/support-tools/' + f, 'utf8');
  console.log('// === ' + f);
  console.log(svgToJsx(content).trim());
});
