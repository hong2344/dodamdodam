export type Character = {
  id: number;
  key: string;
  name: string;
  image: any;
};

export const CHARACTERS: Character[] = [
  { id: 1, key: 'cat', name: '고양이', image: require('../assets/cat.png') },
  { id: 2, key: 'rabbit', name: '토끼', image: require('../assets/rabbit.png') },
  { id: 3, key: 'bear', name: '곰', image: require('../assets/bear.png') },
  { id: 4, key: 'frog', name: '개구리', image: require('../assets/frog.png') },
  { id: 5, key: 'hedgehog', name: '고슴도치', image: require('../assets/hedgehog.png') },
  { id: 6, key: 'dog', name: '강아지', image: require('../assets/dog.png') },
];

export function getCharacter(avatarType?: number | string | null) {
  const numericId =
    typeof avatarType === 'number' ? avatarType : Number.parseInt(String(avatarType ?? 1), 10);
  return CHARACTERS.find((character) => character.id === numericId) ?? CHARACTERS[0];
}

export const CATEGORIES = [
  {
    id: 'career',
    name: '진로',
    emoji: '🧭',
    desc: '미래, 꿈, 진학 고민',
  },
  {
    id: 'grades',
    name: '성적',
    emoji: '📚',
    desc: '공부, 시험, 학업 스트레스',
  },
  {
    id: 'relationship',
    name: '인간관계',
    emoji: '🤝',
    desc: '친구, 가족, 선생님과의 관계',
  },
  {
    id: 'romance',
    name: '연애',
    emoji: '💌',
    desc: '설렘, 짝사랑, 이별',
  },
  {
    id: 'appearance',
    name: '외모',
    emoji: '✨',
    desc: '외모, 자기관리, 패션',
  },
  {
    id: 'melancholy',
    name: '멜랑콜리',
    emoji: '🌧️',
    desc: '불안, 우울, 정체감, 외로움',
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<string, (typeof CATEGORIES)[number]>;
