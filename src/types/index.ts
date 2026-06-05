export type Village = 'dawn' | 'morning' | 'evening' | 'night'
export type Avatar = 'cat' | 'rabbit' | 'bear' | 'frog' | 'hedgehog' | 'dog'
export type Category = 'career' | 'grade' | 'love' | 'appearance' | 'relationship' | 'melancholy'
export type HomeState = 1 | 2 | 3 | 4 | 5 | 6

export interface User {
  id: string
  kakao_id: string
  username: string
  birth_year: number
  village: Village
  avatar: Avatar
  categories: Category[]
  created_at: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  matched_at: string
  status: 'active' | 'completed'
}

export interface Letter {
  id: string
  match_id: string
  sender_id: string
  receiver_id: string
  content: string
  sent_at: string
  delivered_at: string
  read_at: string | null
}
