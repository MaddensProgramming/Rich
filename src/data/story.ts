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
  role: 'Town Chronicler, Mostly',
};

export const storySegments: StorySegment[] = [
  {
    id: 'arrival',
    speaker: storyteller.name,
    title: 'Arrival in the Clearing',
    lines: [
      'Ah, a founder. Good. I feared the mountain had sent me another hat with opinions.',
      'See this clearing? Empty, yes, but emptiness is just a town before it remembers where it put its trousers.',
      'Chop the wood, pry up the stone, build the little camps. Do it before the snow starts counting our fingers.',
    ],
    goal: 'Deliver 40 wood and 35 stone, then make the clearing call itself a Hamlet.',
  },
  {
    id: 'hamlet',
    speaker: storyteller.name,
    title: 'A Working Hamlet',
    lines: [
      'Listen. Smoke in the chimneys. Mud on the boots. The place has begun muttering its own name.',
      'A farm, a cookhouse, and a market road. Civilization, if you squint and ignore the soup that bites back.',
      'Feed the workers, mind the coal, and keep the stones in a pile. Loose stones become arguments.',
    ],
    goal: 'Deliver 120 wood, 120 stone, 40 food, and 60 coal to crown this muddle a Village.',
  },
  {
    id: 'village',
    speaker: storyteller.name,
    title: 'The Specialised Village',
    lines: [
      'Now the furnaces glow. That is good, unless they start whispering recipes again.',
      'The library has opened, which means the old books can finally glare at us in an organized fashion.',
      'Make bars, bows, and swords, then stack coin beside them. A town needs muscle, metal, and suspicious accounting.',
    ],
    goal: 'Deliver 180 stone, 60 food, 80 iron bars, 30 bows, 20 swords, and $1,500 for Mountain Town.',
  },
  {
    id: 'mountain_town',
    speaker: storyteller.name,
    title: 'The Mountain Town',
    lines: [
      'St. Moritz stands upright now. I told the wind it could stop pushing, but wind is poor at manners.',
      'There is one last grand foolishness: the Great Hall. Every town needs a room large enough for memory to get lost in.',
      'Dress stone, saw planks, forge tools, pack food, and bring blades. The Hall is hungry in the architectural sense.',
    ],
    goal: 'Deliver 60 stone blocks, 80 tools, 150 planks, 50 swords, 200 food, and $4,000.',
  },
  {
    id: 'victory',
    speaker: storyteller.name,
    title: 'Beyond the Great Hall',
    lines: [
      'There. The Great Hall stands, and I have shouted at it twice. It did not fall down. Excellent sign.',
      'But a hall this tall can see beyond the pass. The roads are thick with bandits, deserters, and towns richer than good sense permits.',
      'Build a Barracks and take the mountain roads. One warning: Sonnenburg keeps a magnificent crown, and an army that will come looking for it.',
    ],
    goal: 'Open the mountain map, construct the Barracks, and begin the expedition campaign.',
  },
];

export const storySegmentById = Object.fromEntries(
  storySegments.map((segment) => [segment.id, segment]),
) as Record<StorySegmentId, StorySegment>;
