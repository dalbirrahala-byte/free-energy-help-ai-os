import assert from 'node:assert/strict';

const reads = new Map([
  ['leads', 'id'], ['customers', 'source_lead_id'], ['tasks', 'lead_id'], ['activities', 'lead_id'],
]);

// Translate only the read operations used by the detail route. All queries run
// inside the caller's read-only, RLS-enforced transaction on disposable data.
function detailClient(tx, routeId) {
  return {from(table) {
    assert(reads.has(table));
    return {select(columns) {
      assert(columns === '*' || /^[a-z_]+(?:, [a-z_]+)*$/.test(columns));
      return {eq(column, id) {
        assert.equal(column, reads.get(table));
        assert.equal(id, routeId);
        const orderBy = [];
        async function query() {
          const order = orderBy.length ? ' order by ' + orderBy.join(', ') : '';
          const rows = await tx.unsafe('select row_to_json(record) as value from (select ' + columns +
            ' from public.' + table + ' where ' + column + ' = $1' + order + ') record', [id]);
          return rows.map(row => row.value);
        }
        return {
          order(field, {ascending}) {
            assert(['due_date','due_time','activity_date','activity_time'].includes(field));
            assert.equal(typeof ascending, 'boolean');
            orderBy.push(field + (ascending ? ' asc' : ' desc'));
            return this;
          },
          then(resolve, reject) { return query().then(data => ({data, error:null})).then(resolve, reject); },
          async maybeSingle() {
            const rows = await query();
            assert(rows.length <= 1);
            return {data:rows[0] ?? null, error:null};
          },
        };
      }};
    }};
  }};
}

const notFound = new Error('fixture notFound');
const forbidden = () => { throw Error('Unexpected write or navigation'); };
const emptyCard = () => null;

export function loadDetailFixture(loadSource, requirePinned) {
  const React = requirePinned('react');
  const {renderToStaticMarkup} = requirePinned('react-dom/server');
  return async function renderDetail(tx, id) {
    // Ancillary intelligence and cards are outside this read/display check.
    // Server actions remain uninvoked and the adapter exposes no write method.
    const deps = {
      'react/jsx-runtime':requirePinned('react/jsx-runtime'),
      'next/navigation':{notFound() { throw notFound; }, redirect:forbidden},
      'next/cache':{revalidatePath:forbidden},
      'next/link':{default:({href,children}) => React.createElement('a',{href},children)},
      '@/components/layout/AppShell':{AppShell:({children}) => React.createElement('main',null,children)},
      '@/lib/supabase/server':{createClient:async () => detailClient(tx,id)},
      '@/lib/audit/log':{}, '@/lib/auth/enforceWrite':{}, '@/lib/revenue-engine/syncLeadQualification':{},
      './ActivityHistoryActions':{ActivityHistoryActions:forbidden},
      '@/lib/commercial-energy-intelligence':{calculateCommercialEnergyIntelligence:() => ({})},
      '@/lib/intelligence/renewalShadowDeployment':{runRenewalShadowDeployment:() => ({result:{urgency:{tier:null}}})},
      '@/lib/commercial-intelligence/viewModel':{buildCommercialIntelligenceViewModel:() => ({visible:false})},
      '@/lib/revenue-engine/loadLeadIntelligence':{loadLeadIntelligence:async () => ({})},
      '@/lib/revenue-engine/duplicateDetection':{loadPotentialDuplicateLeads:async () => []},
      '@/lib/revenue-engine/activityRecency':{summarizeActivityRecency:() => ({})},
      '@/lib/revenue-engine/qualification':{calculateLeadQualification:() => ({})},
      '@/lib/revenue-engine/nextAction':{determineNextAction:() => ({})},
      '@/lib/revenue-engine/leadQualityClassification':{classifyLeadQuality:() => ({}), isMarketingEligible:() => false},
      '@/lib/revenue-engine/leadActionRecommendation':{deriveLeadActionRecommendation:() => ({})},
      '@/lib/revenue-engine/actionEligibility':{evaluateActionEligibility:() => ({})},
      '@/lib/campaign-attribution/leadCampaignAttribution':{buildLeadCampaignAttribution:() => ({})},
      '@/lib/market-intelligence/businessEnergyMarketSignals':{classifyBusinessEnergyMarketSignals:() => ({})},
    };
    for (const name of ['CommercialEnergyIntelligenceCard','RenewalIntelligenceCard','CommercialIntelligencePanel',
      'LeadPriorityCard','PotentialDuplicatesCard','LeadQualificationCard','LeadQualityCard',
      'LeadActionRecommendationCard','LeadMarketSignalsCard']) {
      deps['@/components/leads/' + name] = {[name]:emptyCard};
    }
    const page = loadSource('frontend/src/app/leads/[id]/page.tsx', deps);
    try { return renderToStaticMarkup(await page.default({params:Promise.resolve({id})})); }
    catch (error) { if (error === notFound) return null; throw error; }
  };
}
