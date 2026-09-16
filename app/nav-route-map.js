import { detectScope, getScope, scopeRoute, SHARED_SCOPE_FUNCTIONS } from './scope-registry';

export const SHARED_NAV_FUNCTIONS = SHARED_SCOPE_FUNCTIONS;
export const detectNavScope = detectScope;
export const getNavScopeConfig = getScope;
export const navRoute = scopeRoute;
