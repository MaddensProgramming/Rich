import type { ChapterId } from '../simulation/types';

export type StorySegmentId = ChapterId | 'victory';

export interface StorySegment {
  id: StorySegmentId;
  speaker: string;
  title: string;
  lines: string[];
  goal: string;
}

export const storyteller = {
  name: 'Elder Bertram',
  role: 'Town Chronicler',
};

export const storySegments: StorySegment[] = [
  {
    id: 'arrival',
    speaker: storyteller.name,
    title: 'Arrival in the Clearing',
    lines: [
      'Welcome, founder. I am Bertram, and I have watched many a settlement rise from snow and silence.',
      'For now there is only this clearing: a few fallen trees, loose stone, and hardy roots to forage.',
      'Gather by hand, raise a logging camp and a mine entrance, then pool wood and stone into the road ahead.',
    ],
    goal: 'Reach 75 Hamlet progress with wood and stone, then upgrade to a Hamlet.',
  },
  {
    id: 'hamlet',
    speaker: storyteller.name,
    title: 'A Working Hamlet',
    lines: [
      'The clearing breathes with smoke and labor now — a true hamlet takes shape.',
      'Farms and a cookhouse keep bellies full, and traders open the market road to us.',
      'Mind your food, hire wisely, and stockpile fuel and ore for the climb to a village.',
    ],
    goal: 'Reach 450 Village progress with wood, stone, food, coal and iron ore.',
  },
  {
    id: 'village',
    speaker: storyteller.name,
    title: 'The Specialised Village',
    lines: [
      'Smelters glow and the blacksmith rings from dawn. We are a village of real craft.',
      'The library opens its packs — knowledge to sharpen every trade.',
      'Bring metal, weapons and coin together to forge a true mountain town.',
    ],
    goal: 'Reach 1,200 Mountain Town progress with iron bars, weapons, food and money.',
  },
  {
    id: 'mountain_town',
    speaker: storyteller.name,
    title: 'The Mountain Town',
    lines: [
      'St. Moritz stands proud against the peaks. One labour remains to seal our legacy.',
      'Commit the whole chain to the Great Hall, and the town will endure any winter.',
    ],
    goal: 'Reach 3,000 Great Hall progress to complete the campaign.',
  },
  {
    id: 'victory',
    speaker: storyteller.name,
    title: 'The Great Hall Stands',
    lines: [
      'It is done. The Great Hall throws its light across the whole valley.',
      'You arrived with bare hands and built a town that will outlast us all.',
      'Rest if you like — or keep building. St. Moritz is yours.',
    ],
    goal: 'Campaign complete. Continue playing freely.',
  },
];

export const storySegmentById = Object.fromEntries(
  storySegments.map((segment) => [segment.id, segment]),
) as Record<StorySegmentId, StorySegment>;
