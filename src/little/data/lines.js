// Everything the game says out loud (British English). {animal} is replaced by the visitor's animal.
export const LINES = {
  welcome: "Let's make a garden!",
  visitor: {
    house: 'Hello! The {animal} family need a new house. Where shall it go?',
    veg: 'Hello! The {animal} family want to grow strawberries. Where shall the veg patch go?'
  },
  pickNature: 'Thank you! Now pick something from nature: flowers, a tree or reeds.',
  picked: {
    flowers: 'Flowers! Bees love flowers.',
    tree: 'A tree! Trees give lovely cool shade.',
    reeds: 'Reeds! Reeds soak up mucky water.'
  },
  pickFirst: 'Pick flowers, a tree or reeds first!',
  taken: "That spot's taken. Try some empty grass.",
  stream: "That's the stream! Try the grass.",
  bees: 'Buzz buzz! The bees helped the strawberries grow.',
  noBees: 'No bees came. Veg patches need flowers right next to them.',
  soak: 'Slurp! The reeds soaked up the mucky water.',
  muck: 'Oh no! Mucky water ran into the stream.',
  clean: 'The reeds are cleaning the stream.',
  duckSad: 'Poor duck! The stream is too mucky.',
  duckHappy: 'Quack! The stream is clean again.',
  heatWarning: "It's getting very sunny. A heatwave is coming! Trees keep houses cool.",
  heatAllCool: 'Phew! The trees kept every house cool.',
  heatSomeHot: "It's so hot! Houses next to a tree stay cool.",
  hint: {
    flowers: 'This veg patch would love some flowers next to it.',
    tree: 'This house would love a shady tree next to it.',
    reeds: 'Reeds next to this house would soak up its mucky water.'
  },
  finished: 'Hooray! Your garden is finished!',
  stars: {
    bee: 'Bee star! Every veg patch has flowers.',
    water: 'Water star! The stream is clean and the duck is happy.',
    cool: 'Cool star! Every house stayed cool in the heatwave.'
  },
  nextTime: {
    bee: 'Next time, put flowers next to every veg patch.',
    water: 'Next time, put reeds next to the houses or the stream.',
    cool: 'Next time, give every house a tree.'
  },
  allStars: 'Three stars! What a brilliant garden!',
  again: 'Shall we make another garden?'
};
