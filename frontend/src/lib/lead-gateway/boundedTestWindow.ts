// A fixed, canonical UTC interval survives cold starts without renewing itself.
// It bounds owner testing only; it never grants SMS execution authority.
export function isBoundedTestWindowOpen(start:unknown,end:unknown,now:number):boolean {
  if(typeof start!=='string'||typeof end!=='string'||!Number.isFinite(now))return false;
  const started=Date.parse(start),expires=Date.parse(end);
  if(!Number.isFinite(started)||!Number.isFinite(expires)||
    new Date(started).toISOString()!==start||new Date(expires).toISOString()!==end)return false;
  return expires>started && expires-started<=15*60*1000 && now>=started && now<expires;
}
