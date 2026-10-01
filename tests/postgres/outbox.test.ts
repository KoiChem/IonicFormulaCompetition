import { beforeAll, afterAll, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { PostgresDatabase } from '../../src/platform/postgres-database';
import { createSupabaseGateway } from '../../src/platform/supabase-gateway';
import { flushRoomEvents } from '../../src/platform/realtime-outbox';
let pg:PGlite;let now=Date.now();
const user={id:'11111111-1111-4111-8111-111111111111',email:'teacher@example.com',email_confirmed_at:'2026-10-01',is_anonymous:false,identities:[{provider:'google'}]};
const transact=async<T>(_scope:string,run:(db:PostgresDatabase)=>Promise<T>)=>pg.transaction(tx=>run(new PostgresDatabase((q,v)=>tx.query(q,v))));
const gateway=createSupabaseGateway({transact,verifyUser:async()=>user,masterEmail:user.email,allowedOrigins:['https://koichem.github.io'],flush:async()=>{},now:()=>now});
beforeAll(async()=>{
 pg=new PGlite();await pg.exec(readFileSync('supabase/migrations/202610010001_core.sql','utf8'));
 await pg.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE SCHEMA realtime;CREATE TABLE realtime.messages(extension text);ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.topic',true) $$;`);
 await pg.exec(readFileSync('supabase/migrations/202610010002_auth_realtime.sql','utf8'));
 await pg.exec(readFileSync('supabase/migrations/202610010003_permissions_maintenance.sql','utf8'));
});
afterAll(async()=>pg.close());
it('commits minimal events and removes each successfully delivered outbox record',async()=>{
 const settings={questionCount:5,timeLimitMinutes:3,mode:'ion',difficulty:'normal',ionAnswer:'formula',compoundPrompts:{formula:true,name:false},compoundAnswer:'formula',gradingMode:'immediate'};
 const response=await gateway(new Request('https://p.supabase.co/functions/v1/competition/api/class-rooms',{method:'POST',headers:{origin:'https://koichem.github.io','content-type':'application/json','x-competition-csrf':'1'},body:JSON.stringify({requestId:crypto.randomUUID(),settings})}));
 expect(response.status).toBe(201);const {room}=await response.json();
 const delivered:any[]=[];
 await flushRoomEvents(transact,room.id,async(topic,event,payload)=>{delivered.push({topic,event,payload})},now);
 expect(delivered.map(x=>x.event)).toEqual(['room.changed','host.progress']);
 expect(delivered[0].payload).not.toHaveProperty('participants');
 expect(JSON.stringify(delivered)).not.toContain('token');
 expect((await pg.query('SELECT count(*)::int AS count FROM app_outbox')).rows).toEqual([{count:0}]);
});
