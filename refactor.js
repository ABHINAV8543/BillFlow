const fs = require('fs');

const file = process.argv[2];
if (!file) process.exit(1);

let content = fs.readFileSync(file, 'utf8');

if (!content.includes('catchAsync')) {
    content = content.replace(/(const router = express\.Router\(\);)/, "$1\nconst catchAsync = require('../utils/catchAsync');\nconst AppError = require('../utils/AppError');");
}

// Replace router definition
content = content.replace(/router\.(get|post|put|patch|delete)\('([^']+)',\s*async\s*\(\s*req,\s*res\s*\)\s*=>\s*\{/g, 
    "router.$1('$2', catchAsync(async (req, res, next) => {");

// Remove try {
content = content.replace(/^\s*try\s*\{\s*$/gm, "");

// Remove catch block AND replace the ending `});` with `}));`
content = content.replace(/\}\s*catch\s*\([^\)]+\)\s*\{[\s\S]*?\}\);/g, "}));");

// Also replace any manual `return res.status(404).render('error', { message: '...' });` with `return next(new AppError('...', 404));`
content = content.replace(/res\.status\(404\)\.render\('error',\s*\{\s*message:\s*'([^']+)'\s*\}\)/g, "next(new AppError('$1', 404))");
content = content.replace(/res\.status\(404\)\.json\(\{\s*error:\s*'([^']+)'\s*\}\)/g, "next(new AppError('$1', 404))");
content = content.replace(/res\.status\(400\)\.json\(\{\s*error:\s*'([^']+)'\s*\}\)/g, "next(new AppError('$1', 400))");

fs.writeFileSync(file, content);
console.log('Refactored', file);
