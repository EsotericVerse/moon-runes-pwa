'use client';

import LanguageSpaceModule from './LanguageSpaceModule';

export function TimeRiverSpace(props){return <LanguageSpaceModule {...props} initialFace="time"/>}
export function SpatialAnalysisSpace(props){return <LanguageSpaceModule {...props} initialFace="space"/>}
export function ExtensionSpace(props){return <LanguageSpaceModule {...props} initialFace="extension"/>}
export function ManagementSpace({management,...props}){return <LanguageSpaceModule {...props} management={management} initialFace="manage"/>}

export default LanguageSpaceModule;
