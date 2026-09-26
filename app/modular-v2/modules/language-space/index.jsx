'use client';

import LanguageSpaceModule from './LanguageSpaceModule';
export {LANGUAGE_4D_AXES,LANGUAGE_4D_FACES,language4DFace,projectLanguage4D} from './language-4d-core';

export function TimeRiverSpace(props){return <LanguageSpaceModule {...props} initialFace="time"/>}
export function SpatialAnalysisSpace(props){return <LanguageSpaceModule {...props} initialFace="space"/>}
export function ExtensionSpace(props){return <LanguageSpaceModule {...props} initialFace="extension"/>}
export function ManagementSpace({management,...props}){return <LanguageSpaceModule {...props} management={management} initialFace="manage"/>}

export default LanguageSpaceModule;
