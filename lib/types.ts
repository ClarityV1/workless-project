export interface TeamMember {
  id: string
  manager_id: string
  first_name: string
  last_name: string
  role: string
  shift: 'Night' | 'Day' | 'Twilight' | 'Flexi'
  start_date: string | null
  status: 'Active' | 'Probation' | 'Absence' | 'Performance Plan'
  notes: string | null
  color: string
  created_at: string
  probation_end_date: string | null
}

export interface PerformanceLog {
  id: string
  manager_id: string
  member_id: string
  log_date: string
  pick_rate: number | null
  accuracy: number | null
  attendance: string
  notes: string | null
  created_at: string
  team_members?: Pick<TeamMember, 'first_name' | 'last_name'>
}

export interface Review {
  id: string
  manager_id: string
  member_id: string
  review_type: string
  content: string
  review_date: string
  created_at: string
  team_members?: Pick<TeamMember, 'first_name' | 'last_name'>
}

export interface Template {
  id: string
  manager_id: string
  name: string
  size: number | null
  storage_path: string | null
  created_at: string
}

export interface Profile {
  id: string
  name: string | null
  role: string | null
  site: string | null
  ai_api_key: string | null
}
