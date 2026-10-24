/**
 * 66 intentional rune letter movements. The meaning chooses the choreography;
 * small, ID-specific variation affects timing/travel but never changes its nature.
 * Canvas + extruded text stay within 1.04× scale to avoid exposing traced edges.
 */
export const GLYPH_MOTION_TIMES=Object.freeze([0,.14,.29,.52,.71,.88,1]);
export const GLYPH_MOTION_STYLES=Object.freeze([
  'rise','fall','glide-left','glide-right','drift','sway',
  'pendulum','pulse','shimmer','swoop','settle','spiral'
]);
// Canonical identities: the data is deliberately assigned, not id % 12.
// e.g., Leaf floats, Fruit drops, Root sinks, Seed falls, Flame rises.
export const RUNE_GLYPH_MOTION_BY_ID=Object.freeze({
  1:'drift',       // Spirit
  2:'rise',        // Soul
  3:'shimmer',     // Spectrum
  4:'drift',       // Memory
  5:'settle',      // Boundary
  6:'settle',      // Domain
  7:'sway',        // Mirror
  8:'pulse',       // Core
  9:'glide-right', // Path
 10:'glide-left',  // Sever
 11:'settle',      // Seal
 12:'pendulum',    // Chain
 13:'rise',        // Awaken
 14:'glide-left',  // Separation
 15:'shimmer',     // Insight
 16:'sway',        // Error
 17:'rise',        // Birth
 18:'fall',        // Aging
 19:'sway',        // Illness
 20:'fall',        // Death
 21:'pulse',       // Heart
 22:'drift',       // Love
 23:'glide-right', // Language
 24:'pulse',       // Resonance
 25:'rise',        // Tree
 26:'drift',       // Blossom
 27:'drift',       // Leaf - floats on air, NEVER drops
 28:'sway',        // Grass
 29:'fall',        // Root - sinks into earth
 30:'fall',        // Seed - falls to soil
 31:'fall',        // Fruit - falls with gravity, NEVER floats
 32:'rise',        // Branch
 33:'settle',      // Gold
 34:'shimmer',     // Jade
 35:'shimmer',     // Crystal
 36:'settle',      // Land
 37:'fall',        // Stone
 38:'shimmer',     // Diamond
 39:'rise',        // Ore - extracted upward
 40:'drift',       // Dust
 41:'shimmer',     // Radiance
 42:'drift',       // Shadow
 43:'sway',        // Water
 44:'rise',        // Flame
 45:'swoop',       // Wind
 46:'settle',      // Earth
 47:'spiral',      // Thunder - sudden electrical snap
 48:'drift',       // Air
 49:'rise',        // Sun
 50:'drift',       // Moon
 51:'shimmer',     // Star
 52:'pendulum',    // Phase
 53:'shimmer',     // Clarity
 54:'pendulum',    // Time
 55:'swoop',       // Space
 56:'settle',      // Reason
 57:'rise',        // Blessing
 58:'fall',        // Calamity
 59:'shimmer',     // Blank
 60:'drift',       // Dream
 61:'shimmer',     // Illusion
 62:'pendulum',    // Karma
 63:'swoop',       // Void
 64:'settle',      // Result
 65:'spiral',      // Chaos
 66:'pendulum'     // Fate
});
const zeros=()=>[0,0,0,0,0,0,0];
const round=n=>Math.round(n*100)/100;
export function runeGlyphMotionFor(rune,{ceremony=false}={}){
  const raw=Number(rune?.rune_id);
  const id=Number.isInteger(raw)&&raw>=1&&raw<=66?raw:0;
  const kind=RUNE_GLYPH_MOTION_BY_ID[id]||'settle';
  const sign=id%2===0?-1:1;
  const x=18+(id*7)%20,y=20+(id*11)%23,tilt=5+(id*3)%8;
  const frame={x:zeros(),y:zeros(),rotate:zeros(),scale:[1,1,1,1,1,1,1],
    opacity:ceremony?[0,.72,1,1,1,1,1]:[0,.75,1,1,1,.76,0]};
  switch(kind){
    case 'rise':
      frame.y=[y,round(y*.53),6,-3,-6,-2,0];break;
    case 'fall':
      // Negative y starts above the baseline. Visible downwards travel,
      // a restrained bounce, then rest at 0.
      frame.y=[-y,round(-y*.6),-8,3,7,2,0];break;
    case 'glide-left':
      frame.x=[x,round(x*.54),8,-3,-5,-1,0];break;
    case 'glide-right':
      frame.x=[-x,round(-x*.54),-8,3,5,1,0];break;
    case 'drift':
      // Light air movement and gentle lift, not a gravity-driven landing.
      frame.x=[-sign*x,round(-sign*x*.33),sign*6,round(sign*x*.23),-sign*3,0,0];
      frame.y=[11,4,-7,-15,-9,-3,0];break;
    case 'sway':
      frame.rotate=[-sign*tilt,round(sign*tilt*.65),round(-sign*tilt*.5),sign*3,-sign*2,0,0];break;
    case 'pendulum':
      frame.rotate=[sign*tilt,round(-sign*tilt*.8),round(sign*tilt*.6),round(-sign*tilt*.45),sign*2,0,0];
      frame.y=[-8,-3,2,0,-2,0,0];break;
    case 'pulse':
      // Only slight breathing, never more than four percent larger.
      frame.scale=[1,1.03,.98,1.04,.99,1,1];
      frame.opacity=ceremony?[0,.75,1,.8,1,1,1]:[0,.75,1,.8,1,.76,0];break;
    case 'shimmer':
      frame.opacity=ceremony?[0,1,.5,1,.74,1,1]:[0,1,.5,1,.74,.78,0];
      frame.x=[0,sign*2,-sign*2,sign*3,0,0,0];break;
    case 'swoop':
      frame.x=[sign*x,round(sign*x*.43),-sign*10,sign*5,0,0,0];
      frame.y=[-y,round(-y*.35),4,-4,0,0,0];
      frame.rotate=[sign*tilt,round(sign*tilt*.5),-sign*4,sign*2,0,0,0];break;
    case 'spiral':
      // Small planar rotation only: do not turn the Chinese glyph edge-on.
      frame.rotate=[sign*tilt*1.3,-sign*tilt,sign*tilt*.65,-sign*3,sign*2,0,0];
      frame.x=[sign*15,0,-sign*6,sign*4,0,0,0];
      frame.y=[-10,5,-5,2,0,0,0];break;
    default: // settle, stone-like arrivals without floating
      frame.y=[-Math.min(y,31),-12,-3,3,1,0,0];break;
  }
  // Sub-pixel settling offset gives each of the 66 letters a different
  // trajectory without overriding the semantically chosen movement.
  frame.x[5]=round(sign*id*.015);
  return {style:kind,frames:frame};
}
