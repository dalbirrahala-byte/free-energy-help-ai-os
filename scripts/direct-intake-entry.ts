import {createOperator} from './direct-intake-operator.mjs';

const names = ['SUPABASE_URL','FEH_VERIFY_START','FEH_VERIFY_END','FEH_VERIFY_OPERATOR_TOKEN',
  'FEH_VERIFY_GOOGLE_ID','FEH_GOOGLE_WEBHOOK_KEY','FEH_META_PAGE_TOKEN','FEH_META_APP_SECRET'];
Deno.serve(createOperator(Object.fromEntries(names.map(name => [name,Deno.env.get(name)]))));
