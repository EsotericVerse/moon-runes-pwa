'use client';

import {createDatabaseClient} from './db-contract.mjs';
import {createConfiguredAdapter} from './providers/configured.mjs';
import {configureDbSourceLabels} from './db-source-status.mjs';

// Provider construction is the only runtime composition point.
const adapter=createConfiguredAdapter();
configureDbSourceLabels(adapter.primarySourceLabel||'Primary',adapter.backupSourceLabel||'Backup');
const client=createDatabaseClient(adapter);

export const dbBackupPublicClient=adapter.backupPublicClient||null;
export const dbPrimarySourceLabel=adapter.primarySourceLabel||'Primary';
export const dbBackupSourceLabel=adapter.backupSourceLabel||'Backup';
export const {publicClient:dbPublicClient,authClient:dbAuthClient,dbAuthRelation,selectAuthRow,insertRows,updateRows,deleteRows,applyKeywordClassification,writeKeywordLibraryItem,copyKeywordLibraryClass,syncManageScopeRow,logSearchKeyword,getAccountSession,signInWithGoogle,signOutAccount}=client;
