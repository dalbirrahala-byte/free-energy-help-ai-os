const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = process.cwd();
const archive = path.resolve(__dirname,'../website-enquiry-intake');
const deps = path.resolve(process.argv[2]);
const ts = require(path.join(deps,'typescript'));
const {webpack} = require(path.join(deps,'next/dist/compiled/webpack/webpack'));
const manifest = JSON.parse(fs.readFileSync(path.join(archive,'MANIFEST.json'))).files;
const src = path.join(root,'workspace/src');
function write(file,text){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,text);
}
function emit(file,output){
  const bytes=fs.readFileSync(path.join(archive,file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest[file]);
  compile(bytes,output);
}
function compile(bytes,output) {
  const compiled=ts.transpileModule(bytes.toString(),{compilerOptions:{
    target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,rewriteRelativeImportExtensions:true
  }});
  write(output,compiled.outputText);
}
const lib=path.join(src,'server/lib');
for(const name of ['source/client','source/contract','source/receiver','airo/attempt/handoff',
  'airo/attempt/committed-mysql-store','airo/attempt/mysql-attempt-store']){
  emit(name+'.ts',path.join(lib,'website-enquiry',name+'.js'));
}
compile(fs.readFileSync(path.join(root,'patched/quote-held.ts')),path.join(src,'server/api/quote/POST.js'));
const moduleText=`import { createQuoteCrmStep } from './website-enquiry/airo/attempt/handoff.js';
import { createCommittedMysqlAttemptStore } from './website-enquiry/airo/attempt/committed-mysql-store.js';
export function createCommittedQuoteCrmStep(client, openFresh) {
  return createQuoteCrmStep({client,store:createCommittedMysqlAttemptStore(openFresh)});
}
export const finishQuoteCrm = createQuoteCrmStep(null);
`;
write(path.join(lib,'quote-crm-step.js'),moduleText);
write(path.join(lib,'fixture-bound.js'),`import {createCommittedQuoteCrmStep} from './quote-crm-step.js';
export const finishQuoteCrm=createCommittedQuoteCrmStep(globalThis.fixture.client,globalThis.fixture.openFresh);`);
write(path.join(src,'server/email.js'),'export const sendEmail = message => globalThis.fixture.email(message);');
write(path.join(src,'lib/phone.js'),"export const TEL1='fixture', TEL1_HREF='fixture';");
compile(fs.readFileSync(path.join(root,'patched/enquiry-store.candidate.ts')),path.join(lib,'enquiry-store.js'));
write(path.join(src,'server/db/schema.js'),"export const enquiries={submissionId:'submissionId'};");
write(path.join(src,'server/db/client.js'),"export const db=globalThis.fixture.db;");
write(path.join(src,'orm.js'),"export const sql=(strings,...values)=>({strings,values}); export const eq=(field,value)=>[field,value];");
async function build(name,bound) {
  const alias={'@':src};
  if(bound)alias['@/server/lib/quote-crm-step.js$']=path.join(lib,'fixture-bound.js');
  // The specific test binding must take precedence over the general application alias.
  const resolveAlias=bound?{'@/server/lib/quote-crm-step.js$':path.join(lib,'fixture-bound.js'),'@':src}:alias;
  resolveAlias['drizzle-orm$']=path.join(src,'orm.js');
  const compiler=webpack({mode:'production',context:src,target:'node',entry:'./server/api/quote/POST.js',
    resolve:{alias:resolveAlias},optimization:{minimize:false},devtool:false,
    output:{path:path.join(root,'dist'),filename:name+'.cjs',library:{type:'commonjs2'}}});
  await new Promise((resolve,reject)=>compiler.run((e,stats)=>compiler.close(err=>{
    if(e||err||stats.hasErrors())return reject(e||err||Error(stats.toString({all:false,errors:true})));
    resolve();
  })));
}
(async()=>{await build('dormant',false);await build('fixture',true);
  console.log('Built server entries',ts.version,webpack.version);})().catch(e=>{console.error(e);process.exitCode=1;});
