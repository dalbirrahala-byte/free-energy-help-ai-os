import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(process.argv[2]??'/tmp/feh-google-receiver');
const names=['googleReceiver.server','googleReceiverConfiguration.server','googleIngress.server',
  'googleWebhookTest.server','boundedBody.server','previewDatabase.server','supabaseCa.server'];
const files=[];
for(const name of names){
  const raw=await readFile(resolve(root,`frontend/src/lib/lead-gateway/${name}.ts`),'utf8');
  const data=stripTypeScriptTypes(raw,{mode:'strip'}).replace(/^import 'server-only';\s*/m,'')
    .replace(/(from\s+['"][^'"]+)\.ts(['"])/g,'$1.mjs$2');
  files.push({file:`lib/${name}.mjs`,data});
}
// No administrator secret, worker token, SMS credential or Meta token is read.
const settings=['SUPABASE_URL','FEH_GOOGLE_RECEIVER_ENABLED','FEH_GOOGLE_RECEIVER_SCOPE',
  'FEH_GOOGLE_INGRESS_ENABLED','FEH_ACK_DATABASE_ENABLED','FEH_GOOGLE_FORM_ID','FEH_GOOGLE_CAMPAIGN_ID',
  'FEH_GOOGLE_WEBHOOK_KEY','FEH_ACK_PREVIEW_ALLOWED_PHONE','FEH_ACK_INGESTOR_DATABASE_URL','FEH_INTAKE_RECEIVER_DATABASE_URL'];
files.push({file:'index.ts',data:`import {createGoogleReceiver} from './lib/googleReceiver.server.mjs';
const environment:Record<string,string|undefined>={FEH_INTAKE_RUNTIME:'supabase-google',NEXT_PUBLIC_SUPABASE_URL:'https://vredwhyphrhsudggrsen.supabase.co'};
for(const name of ${JSON.stringify(settings)})environment[name]=Deno.env.get(name);
Deno.serve(createGoogleReceiver(environment));
`});
files.push({file:'deno.json',data:JSON.stringify({imports:{postgres:'npm:postgres@4.0.0'}},null,2)+'\n'});
await mkdir(destination,{recursive:true});
for(const f of files){await mkdir(dirname(resolve(destination,f.file)),{recursive:true});await writeFile(resolve(destination,f.file),f.data);}
const digest=createHash('sha256').update(JSON.stringify(files)).digest('hex');
await writeFile(resolve(destination,'deployment-files.json'),JSON.stringify(files));
console.log(JSON.stringify({destination,fileCount:files.length,sha256:digest}));
