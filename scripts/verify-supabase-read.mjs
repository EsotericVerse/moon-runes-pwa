import {createSupabaseAdapter} from '../app/loc/providers/supabase.mjs';

const {publicClient}=createSupabaseAdapter();
const {data,error,count}=await publicClient.schema('silver').from('manage').select('id',{count:'exact'}).limit(10);
if(error)throw error;
if(!Array.isArray(data)||!Number.isInteger(count))throw new Error('Supabase public read did not return rows and an exact count');
console.log(JSON.stringify({provider:'supabase',table:'silver.manage',rows:data.length,count}));
