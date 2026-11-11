export type TaskStatus = "todo" | "in_progress" | "stuck" | "completed";
export type Priority = "low" | "medium" | "high";
export type RewardTier = "free" | "premium";
export type MemberRole = "owner" | "member";

export type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
};

export type Space = {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  invite_code: string;
  description: string;
  created_by: string;
  created_at: string;
};

export type MembershipStatus = "pending" | "approved" | "rejected";

export type SpaceMember = {
  id: string;
  space_id: string;
  user_id: string;
  role: MemberRole;
  status: MembershipStatus;
  joined_at: string;
};

export type Project = {
  id: string;
  space_id: string;
  name: string;
  description: string;
  icon_emoji: string;
  created_by: string;
  created_at: string;
};

export type Task = {
  id: string;
  space_id: string;
  project_id: string | null;
  title: string;
  description: string;
  assignee_id: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  stuck_note: string | null;
  tags: string[];
  link_url: string | null;
  image_urls: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type ReelIdea = {
  id: string;
  space_id: string;
  url: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  tags: string[];
  created_by: string;
  created_at: string;
  converted_to_task_id: string | null;
};

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type RewardCatalogItem = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tier: RewardTier;
};

export type Reward = {
  id: string;
  space_id: string;
  task_id: string | null;
  from_user_id: string;
  to_user_id: string;
  catalog_id: string;
  message: string;
  created_at: string;
};

export type RewardUnlock = {
  user_id: string;
  catalog_id: string;
  unlocked_at: string;
};

export type GiftCollection = {
  space_id: string;
  receiver_id: string;
  gift_type: string;
  item_count: number;
};

export type Snapshot = {
  profiles: Profile[];
  spaces: Space[];
  members: SpaceMember[];
  projects: Project[];
  tasks: Task[];
  reels: ReelIdea[];
  comments: Comment[];
  rewards: Reward[];
  giftCounts: GiftCollection[];
  unlocks: RewardUnlock[];
};

export type TaskDraft = {
  title: string;
  description: string;
  assignee_id: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  stuck_note: string | null;
  tags: string[];
  link_url: string | null;
  image_urls: string[];
  project_id: string | null;
};

export type SpaceDraft = {
  name: string;
  emoji: string;
  accent: string;
  userId: string;
};

export type RewardDraft = {
  space_id: string;
  task_id: string;
  from_user_id: string;
  to_user_id: string;
  catalog_id: string;
  message: string;
};
