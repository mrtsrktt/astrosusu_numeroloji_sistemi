const fs=require('fs');
const path=require('path');
const assert=require('node:assert/strict');
const {minimatch}=require('minimatch');
const Ajv=require('ajv-draft-04');
const root=__dirname;
const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json')));
const fn=config.functions['server.js'];
assert.equal(config.framework,'express');assert.equal(fn.maxDuration,300);
for(const key of ['includeFiles','excludeFiles']){
 assert.equal(typeof fn[key],'string',`${key} must be a single glob string`);
 assert.ok(fn[key].length>0&&fn[key].length<=256,`${key} must be at most 256 characters`);
}
const matches=(file,pattern)=>minimatch(file,pattern,{dot:true});
const bundled=file=>matches(file,fn.includeFiles)&&!matches(file,fn.excludeFiles);
assert.equal(Number(fs.readFileSync(path.join(root,'.env.example'),'utf8').match(/^PDF_MODEL_BUDGET_MS=(\d+)/m)[1]),240000);
const rules=fs.readFileSync(path.join(root,'.vercelignore'),'utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#'));
assert.equal(rules[0],'*');
const allowed=rules.filter(line=>line.startsWith('!')).map(line=>line.slice(1));
function walk(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.posix.join(dir,e.name)):[path.posix.join(dir,e.name)]);}
const selected=allowed.filter(p=>!p.endsWith('/')&&!p.includes('*'));
selected.push(...walk('assets/fonts'));
const files=[...new Set(selected)].sort();
for(const file of files){
 assert.ok(fs.statSync(path.join(root,file)).isFile(),`Missing required file: ${file}`);
 assert.ok(!/(^|\/)(?:\.env[^/]*|private-reports|test-artifacts|kaynak_ornekler)(?:\/|$)|\.(?:db|sqlite\d*|dump)$/i.test(file),`Forbidden package file: ${file}`);
}
const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
const assets=source.match(/const ALLOWED_ASSETS = new Set\(\[([\s\S]*?)\]\)/)[1];
for(const match of assets.matchAll(/'([^']+)'/g))assert.ok(files.includes(match[1]),`Unpackaged public asset: ${match[1]}`);
for(const match of source.matchAll(/path\.join\(__dirname, '([^']+\.html)'\)/g))assert.ok(files.includes(match[1]));
for(const file of files.filter(p=>!['package.json','package-lock.json','vercel.json','.vercelignore'].includes(p)))assert.ok(bundled(file),`Required file does not match final glob: ${file}`);
for(const file of ['.env','.env.production','.env.local','nested/.env.preview','private-reports/private.pdf','private-reports/nested/private.pdf','test-artifacts/proof.pdf','test-artifacts/output.json','kaynak_ornekler/private.pdf','local.db','data/local.sqlite3','backup.dump']){
 assert.ok(matches(file,fn.excludeFiles),`Sensitive path not excluded: ${file}`);
 assert.ok(!bundled(file),`Sensitive path bundled: ${file}`);
 assert.ok(!files.includes(file),`Sensitive path uploaded: ${file}`);
}
assert.ok(files.includes('assets/fonts/Carlito-OFL.txt'));assert.ok(files.includes('assets/fonts/Lora-OFL.txt'));
for(const file of ['server.js','reports.js','live-report.js']){
 const js=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of js.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)){
  const name=match[1].endsWith('.json')?match[1]:match[1]+'.js';assert.ok(files.includes(name),`Missing local module: ${name}`);
 }
}
fs.mkdirSync(path.join(root,'test-artifacts'),{recursive:true});
// Downloaded verbatim from config.$schema; an explicit path supports offline reruns.
const schemaPath=process.argv[2]||path.join(root,'test-artifacts/vercel-official-schema.json');
const schema=JSON.parse(fs.readFileSync(schemaPath,'utf8'));
// Published draft-04 currently mixes in numeric exclusiveMinimum in experimental
// triggers. Translate only that keyword to its equivalent draft-04 representation.
// No rule is removed or relaxed; the downloaded source remains unchanged.
let normalizedKeywords=0;
function normalizeSchema(node){
 if(!node||typeof node!=='object')return;
 if(typeof node.exclusiveMinimum==='number'){
  assert.ok(node.minimum===undefined,'Unexpected mixed minimum constraint');
  node.minimum=node.exclusiveMinimum;node.exclusiveMinimum=true;normalizedKeywords++;
 }
 for(const value of Object.values(node))normalizeSchema(value);
}
normalizeSchema(schema);
const ajv=new Ajv({strict:false,allErrors:true,validateFormats:false});
const validate=ajv.compile(schema);
assert.ok(validate(config),JSON.stringify(validate.errors,null,2));
fs.writeFileSync(path.join(root,'test-artifacts/preview-package-audit.json'),JSON.stringify({files,bytes:files.reduce((n,p)=>n+fs.statSync(path.join(root,p)).size,0),maxDuration:300,modelBudgetMs:240000,globLengths:{includeFiles:fn.includeFiles.length,excludeFiles:fn.excludeFiles.length},schemaValidated:true,schemaSource:config.$schema,remoteBuildVerified:false},null,2));
console.log('PASS official Vercel JSON schema; single glob strings <=256 characters',fn.includeFiles.length,fn.excludeFiles.length);
console.log('Official schema numeric exclusiveMinimum keywords translated to equivalent draft-04:',normalizedKeywords);
console.log(`PASS ${files.length} allowlisted application files; public assets, sample PDF, report template, fonts/licenses; private/env/test/DB excluded; 300s function / 240s model budget`);
