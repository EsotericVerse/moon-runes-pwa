import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sunoStyleMetaTags} from '../app/loc/suno-style-meta-tags.mjs';

test('Meta Tags copy exact leading source Style phrases without translated or invented labels',()=>{
  assert.equal(
    sunoStyleMetaTags('Style: Cinematic Japanese Art Rock, Progressive J-Pop, Symphonic Alternative Pop, Male Voice'),
    'Cinematic Japanese Art Rock, Progressive J-Pop, Symphonic Alternative Pop'
  );
});
test('No hard-coded Male Voice exclusion or substitution exists',()=>{
  assert.equal(sunoStyleMetaTags('Male Voice, Soft Jazz, Dream Pop'),'Male Voice, Soft Jazz, Dream Pop');
  assert.equal(sunoStyleMetaTags('Male Vocals, Soft Jazz, Dream Pop'),'Male Vocals, Soft Jazz, Dream Pop');
});
test('Keep actual source spellings, punctuation and deduplicate without inserting guessed terms',()=>{
  assert.equal(sunoStyleMetaTags('UK Garage, 2-Step Garage, UK GARAGE, Air Compression'),'UK Garage, 2-Step Garage, Air Compression');
  assert.equal(sunoStyleMetaTags('male vocal A3–D4, city pop, Mandopop'),'male vocal A3–D4, city pop, Mandopop');
});
test('Chinese segments cannot be auto-translated; classification identifiers are author-supplied',()=>{
  assert.equal(sunoStyleMetaTags('空壓, UK Garage, J-Pop'),'UK Garage, J-Pop');
  assert.equal(sunoStyleMetaTags(''), '');
  assert.equal(sunoStyleMetaTags('Suno Style: Indie Pop, City Pop'),'Indie Pop, City Pop');
});
