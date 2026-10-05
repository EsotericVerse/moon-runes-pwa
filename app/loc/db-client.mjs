'use client';

import {createDatabaseClient} from './db-contract.mjs';
import {createConfiguredAdapter} from './providers/configured.mjs';

// Provider construction is the only runtime composition point.
const client=createDatabaseClient(createConfiguredAdapter());
export const {publicClient:dbPublicClient,authClient:dbAuthClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,writeKeywordLibraryItem,syncManageScopeRow,getAccountSession,signInWithGoogle,signOutAccount}=client;
