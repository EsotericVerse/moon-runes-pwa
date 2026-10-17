import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sunoStyleMetaTags,refreshSunoStyleMetaTags} from '../app/loc/suno-style-meta-tags.mjs';

test('Meta Tags scan every source Style phrase, not just the first three',()=>{
  assert.equal(
    sunoStyleMetaTags('Style: Cinematic Japanese Art Rock, 132 BPM, Progressive J-Pop, A3–D4, Symphonic Alternative Pop, Male Voice, Dream Pop, no female vocals'),
    'Cinematic Japanese Art Rock, Progressive J-Pop, Symphonic Alternative Pop, Male Vocals, Dream Pop'
  );
});
test('Vocal cues are classified independently and negative cues are ignored',()=>{
  assert.equal(sunoStyleMetaTags('Male Voice, Soft Jazz, Dream Pop'),'Male Vocals, Soft Jazz, Dream Pop');
  assert.equal(sunoStyleMetaTags('Female Vocals, Soft Jazz, no male vocals'),'Female Vocals, Soft Jazz');
  assert.equal(sunoStyleMetaTags('natural Taiwanese Mandarin male baritone A3–D4, 68 BPM, Pure Unaccompanied Solo A Cappella, no female vocals'),
    'Male Baritone, Pure Unaccompanied Solo A Cappella');
});
test('Preserve actual genre names, compound styles and deduplicate across the entire prompt',()=>{
  assert.equal(sunoStyleMetaTags('UK Garage, 2-Step Garage, UK GARAGE, Air Compression'),
    'UK Garage, 2-Step Garage, Air Compression');
  assert.equal(sunoStyleMetaTags('male vocal A3–D4, city pop, Mandopop'),'Male Vocals, city pop, Mandopop');
  assert.equal(sunoStyleMetaTags('112 BPM, Deep Elastic Bass, Extreme Glitch Electronica, Deconstructed Glitch Pop, Post-Apocalyptic Wasteland Soundscape, no festival EDM drops'),
    'Extreme Glitch Electronica, Deconstructed Glitch Pop, Post-Apocalyptic Wasteland Soundscape');
});
test('No Chinese auto-translation; album labels remain explicit only',()=>{
  assert.equal(sunoStyleMetaTags('空壓, UK Garage, J-Pop'),'UK Garage, J-Pop');
  assert.equal(sunoStyleMetaTags(''), '');
  assert.equal(sunoStyleMetaTags('Suno Style: Indie Pop, City Pop'),'Indie Pop, City Pop');
});
test('Style refresh retains explicit album and Rune Music labels',()=>{
  assert.equal(refreshSunoStyleMetaTags('Art Rock, Progressive Pop, Cinematic',
    'Dream Pop, LunaRunesMusic, LP15-3, Male Voice'),
    'Art Rock, Progressive Pop, Cinematic, LunaRunesMusic, LP15-3');
  assert.equal(refreshSunoStyleMetaTags('UK Garage, Indie Pop','LP12'),'UK Garage, Indie Pop, LP12');
});
