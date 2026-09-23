export const CULTURE_OVERVIEW_LABEL='所有';
export const CULTURE_OVERVIEW_DESCRIPTION='人生停靠點（人生月台）';

export const PERIOD_BOUNDARY_POLICY=Object.freeze({
  maxAnchorsBefore:4,
  maxAnchorsAfter:4,
  beforeOpenState:'unknown_before',
  afterOpenState:'through_now',
  anchorPurpose:'boundary_pause'
});

export const TIME_RIVER_POLICY=Object.freeze({
  defaultWhenPeriodsExist:'current',
  fallbackWhenNoPeriod:'all',
  overviewDetail:'summary_only',
  periodDetail:'structured_display',
  grouping:'scope_configurable'
});

export function cultureDefaultPeriod(periods=[]){
  const rows=Array.isArray(periods)?periods:[];
  const current=rows.find(item=>String(item?.status||'').toLowerCase()==='current');
  return current?.period||current?.era_id||CULTURE_OVERVIEW_LABEL;
}

export function isCultureOverview(value){
  return !value||String(value)===CULTURE_OVERVIEW_LABEL;
}
