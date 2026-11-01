import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';

// Explicit source manifest. Never bundle the CRM, worker, secrets or .env files.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(process.argv[2]??'/tmp/feh-intake-receiver');
const names=['intakeReceiver.server','googleWebhookTest.server','metaWebhookTest.server','boundedBody.server','previewDatabase.server','supabaseCa.server'];
const files=[];
for(const name of names){
  const path=`frontend/src/lib/lead-gateway/${name}.ts`;
  const raw=await readFile(resolve(root,path),'utf8');
  const source=stripTypeScriptTypes(raw,{mode:'strip'}).replace(/^import 'server-only';\s*/m,'').replace(/(from\s+['"][^'"]+)\.ts(['"])/g,'$1.mjs$2');
  files.push({file:`lib/${name}.mjs`,data:source});
}
// Copy only named, restricted settings. Supabase injects administrator secrets
// into Edge environments; this receiver deliberately never reads any of them.
const settings=['SUPABASE_URL','FEH_INTAKE_RECEIVER_ENABLED','FEH_INTAKE_RECEIVER_EXPIRES_AT',
 'FEH_GOOGLE_INGRESS_ENABLED','FEH_ACK_DATABASE_ENABLED','FEH_GOOGLE_FORM_ID',
 'FEH_GOOGLE_CAMPAIGN_ID','FEH_GOOGLE_WEBHOOK_KEY','FEH_INTAKE_RECEIVER_DATABASE_URL',
 'FEH_META_APP_SECRET','FEH_META_VERIFY_TOKEN','FEH_META_DASHBOARD_TEST_ENABLED',
 'FEH_META_DASHBOARD_PAGE_ID','FEH_META_DASHBOARD_FORM_ID','FEH_META_DASHBOARD_LEAD_ID'];
files.push({file:'index.ts',data:`import {createIntakeReceiver} from './lib/intakeReceiver.server.mjs';
const environment:Record<string,string|undefined>={FEH_INTAKE_RUNTIME:'supabase-edge',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co'};
for(const name of ${JSON.stringify(settings)})environment[name]=Deno.env.get(name);
Deno.serve(createIntakeReceiver(environment));
`});
files.push({file:'deno.json',data:JSON.stringify({imports:{postgres:'npm:postgres@4.0.0'}},null,2)+'\n'});
await mkdir(destination,{recursive:true});
for(const file of files){await mkdir(dirname(resolve(destination,file.file)),{recursive:true});await writeFile(resolve(destination,file.file),file.data);}
const digest=createHash('sha256').update(JSON.stringify(files)).digest('hex');
await writeFile(resolve(destination,'deployment-files.json'),JSON.stringify(files));
console.log(JSON.stringify({destination,fileCount:files.length,sha256:digest}));
