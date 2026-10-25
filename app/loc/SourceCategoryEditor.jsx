'use client';
import {useAsyncResource} from './use-async-resource';
import {dbAuthRelation} from './db-client.mjs';
import {sourceTaxonomyFromArrays} from './source-classification.mjs';
import FlatClassificationEditor from './FlatClassificationEditor';
export function useSourceCategories(){
  return useAsyncResource(['statistics-source-categories'],async()=>{
    const {data,error}=await dbAuthRelation('silver.loc').select('txt_class').eq('id','loc').maybeSingle();
    if(error)throw new Error(error.message);
    return sourceTaxonomyFromArrays(data?.txt_class||[]);
  });
}
export function AdminSourceCategories(){
  return <FlatClassificationEditor scopeId="loc"/>;
}
