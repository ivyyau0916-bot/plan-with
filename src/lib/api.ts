import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateGiftCounts } from "@/lib/gifts";
import type {
  GiftCollection,
  MembershipStatus,
  Project,
  ReelIdea,
  Reward,
  RewardDraft,
  Snapshot,
  SpaceDraft,
  SpaceMember,
  Task,
  TaskDraft,
} from "@/lib/types";
import { normalizeInviteCode } from "@/lib/utils";
import { normalizeLink, normalizeTags } from "@/lib/task-extras";

export interface OurSyncApi {
  load(): Promise<Snapshot>;
  subscribe(listener: (snapshot: Snapshot) => void): () => void;
  createSpace(input: SpaceDraft): Promise<string>;
  joinSpace(code: string, userId: string): Promise<string>;
  createTask(spaceId: string, userId: string, draft: TaskDraft): Promise<string>;
  updateTask(id: string, patch: Partial<TaskDraft>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  createReel(input: {
    spaceId: string;
    url: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    tags: string[];
    userId: string;
  }): Promise<void>;
  updateReel(id: string, tags: string[]): Promise<void>;
  deleteReel(id: string): Promise<void>;
  markReelConverted(id: string, taskId: string): Promise<void>;
  addComment(taskId: string, userId: string, body: string): Promise<void>;
  sendReward(draft: RewardDraft): Promise<void>;
  reviewMember(memberId: string, decision: Exclude<MembershipStatus, "pending">): Promise<void>;
  removeMember(memberId: string): Promise<void>;
  leaveSpace(spaceId: string): Promise<void>;
  createProject(input: { spaceId: string; userId: string; name: string; emoji: string; description: string }): Promise<string>;
  updateProject(id: string, input: { name: string; emoji: string; description: string }): Promise<void>;
  deleteProject(id: string): Promise<void>;
}

type QueryError = { message: string } | null;

function assertOk(error: QueryError) {
  if (error) throw new Error(taskColumnMessage(error.message));
}

function taskColumnMessage(message: string) {
  if (/reels_ideas/i.test(message) && /tags/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "靈感標籤還沒建立。請在 Supabase SQL Editor 再執行一次 schema.sql。";
  }
  if (/tags|link_url|image_urls/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "資料庫還沒有標籤、連結和圖片欄位。請在 Supabase SQL Editor 再執行一次 schema.sql。";
  }
  if (/reels_ideas/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "靈感庫還沒建立。請在 Supabase SQL Editor 再執行一次 schema.sql。";
  }
  if (/projects|project_id/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "專案還沒建立。請在 Supabase SQL Editor 再執行一次 schema.sql。";
  }
  if (/duplicate|unique|23505/i.test(message)) return "這則 Reels 已經在靈感庫裡了";
  if (/status|review_membership/i.test(message) && /does not exist|schema cache/i.test(message)) {
    return "成員審核還沒建立。請在 Supabase SQL Editor 再執行一次 schema.sql。";
  }
  if (/space_members/i.test(message) && /permission denied|row-level security|42501/i.test(message)) {
    return "成員管理還沒開放。請在 Supabase SQL Editor 再執行一次 schema.sql。";
  }
  return message;
}

const REEL_COLUMNS =
  "id, space_id, url, title, description, tags, thumbnail_url, created_by, created_at, converted_to_task_id";
const REEL_COLUMNS_NO_TAGS =
  "id, space_id, url, title, description, thumbnail_url, created_by, created_at, converted_to_task_id";
const REEL_COLUMNS_LEGACY =
  "id, space_id, url, title, thumbnail_url, created_by, created_at, converted_to_task_id";

function withReel(reel: ReelIdea): ReelIdea {
  return {
    ...reel,
    description: reel.description ?? "",
    tags: Array.isArray(reel.tags) ? reel.tags : [],
  };
}

async function loadReels(supabase: SupabaseClient) {
  let result = await supabase.from("reels_ideas").select(REEL_COLUMNS);
  if (result.error && /tags/i.test(result.error.message)) {
    result = await supabase.from("reels_ideas").select(REEL_COLUMNS_NO_TAGS);
  }
  if (result.error && /description/i.test(result.error.message)) {
    result = await supabase.from("reels_ideas").select(REEL_COLUMNS_LEGACY);
  }
  if (result.error && /reels_ideas|schema cache/i.test(result.error.message)) return [];
  assertOk(result.error);
  return ((result.data ?? []) as ReelIdea[]).map(withReel);
}

const MEMBER_COLUMNS = "id, space_id, user_id, role, status, joined_at";
const MEMBER_COLUMNS_LEGACY = "id, space_id, user_id, role, joined_at";

function withMembership(row: SpaceMember): SpaceMember {
  const status: MembershipStatus =
    row.status === "pending" || row.status === "rejected" || row.status === "approved" ? row.status : "approved";
  return { ...row, status };
}

const TASK_COLUMNS =
  "id, space_id, project_id, title, description, assignee_id, due_date, priority, status, stuck_note, tags, link_url, image_urls, created_by, created_at, updated_at, completed_at";
const TASK_COLUMNS_NO_PROJECT =
  "id, space_id, title, description, assignee_id, due_date, priority, status, stuck_note, tags, link_url, image_urls, created_by, created_at, updated_at, completed_at";
const TASK_COLUMNS_LEGACY =
  "id, space_id, title, description, assignee_id, due_date, priority, status, stuck_note, created_by, created_at, updated_at, completed_at";

function withTaskExtras(task: Task): Task {
  return {
    ...task,
    tags: Array.isArray(task.tags) ? task.tags : [],
    image_urls: Array.isArray(task.image_urls) ? task.image_urls : [],
    link_url: task.link_url || null,
    project_id: task.project_id || null,
  };
}

async function fetchSnapshot(supabase: SupabaseClient): Promise<Snapshot> {
  const [profiles, spaces, members, tasks, projects, reelRows, comments, rewards, collections, unlocks] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_emoji"),
    supabase.from("spaces").select("id, name, emoji, accent, invite_code, created_by, created_at"),
    supabase.from("space_members").select(MEMBER_COLUMNS),
    supabase.from("tasks").select(TASK_COLUMNS),
    supabase.from("projects").select("id, space_id, name, description, icon_emoji, created_by, created_at"),
    loadReels(supabase),
    supabase.from("comments").select("id, task_id, user_id, body, created_at"),
    supabase
      .from("rewards")
      .select("id, space_id, task_id, from_user_id, to_user_id, catalog_id, message, created_at"),
    supabase.from("gift_collections").select("space_id, receiver_id, gift_type, item_count"),
    supabase.from("reward_unlocks").select("user_id, catalog_id, unlocked_at"),
  ]);

  for (const result of [profiles, spaces, comments, rewards, unlocks]) {
    assertOk(result.error);
  }

  let memberResult = members;
  if (members.error && /status/i.test(members.error.message)) {
    memberResult = await supabase.from("space_members").select(MEMBER_COLUMNS_LEGACY);
  }
  assertOk(memberResult.error);

  let taskResult = tasks;
  if (tasks.error && /project_id/i.test(tasks.error.message)) {
    taskResult = await supabase.from("tasks").select(TASK_COLUMNS_NO_PROJECT);
  }
  let taskRows = (taskResult.data ?? []) as Task[];
  if (taskResult.error && /tags|link_url|image_urls/i.test(taskResult.error.message)) {
    const legacy = await supabase.from("tasks").select(TASK_COLUMNS_LEGACY);
    assertOk(legacy.error);
    taskRows = (legacy.data ?? []) as Task[];
  } else {
    assertOk(taskResult.error);
  }

  let projectRows: Project[] = [];
  if (projects.error && /projects/i.test(projects.error.message) && /does not exist|schema cache/i.test(projects.error.message)) {
    projectRows = [];
  } else {
    assertOk(projects.error);
    projectRows = (projects.data ?? []) as Project[];
  }

  const rewardRows = (rewards.data ?? []) as Reward[];
  let giftCounts: GiftCollection[] = [];
  if (collections.error && /gift_collections|schema cache/i.test(collections.error.message)) {
    giftCounts = aggregateGiftCounts(rewardRows);
  } else {
    assertOk(collections.error);
    giftCounts = ((collections.data ?? []) as GiftCollection[]).map((row) => ({
      ...row,
      item_count: Number(row.item_count) || 0,
    }));
  }

  const spaceRows = (spaces.data ?? []) as Snapshot["spaces"];

  return {
    profiles: (profiles.data ?? []) as Snapshot["profiles"],
    spaces: spaceRows.map((space) => ({ ...space, accent: space.accent || "blush" })),
    members: ((memberResult.data ?? []) as SpaceMember[]).map(withMembership),
    projects: projectRows,
    tasks: taskRows.map(withTaskExtras),
    reels: reelRows,
    comments: (comments.data ?? []) as Snapshot["comments"],
    rewards: rewardRows,
    giftCounts,
    unlocks: (unlocks.data ?? []) as Snapshot["unlocks"],
  };
}

export function createRemoteApi(supabase: SupabaseClient, userId: string): OurSyncApi {
  return {
    async load() {
      const snapshot = await fetchSnapshot(supabase);
      if (snapshot.profiles.some((profile) => profile.id === userId)) return snapshot;

      const { data: userData } = await supabase.auth.getUser();
      const meta = userData.user?.user_metadata ?? {};
      const displayName =
        typeof meta.display_name === "string" && meta.display_name.trim()
          ? meta.display_name.trim()
          : "新朋友";
      const avatar = typeof meta.avatar_emoji === "string" ? meta.avatar_emoji : "heart";
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        display_name: displayName,
        avatar_emoji: avatar,
      });
      assertOk(error);
      return fetchSnapshot(supabase);
    },
    subscribe(listener) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const reload = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void fetchSnapshot(supabase)
            .then(listener)
            .catch(() => undefined);
        }, 80);
      };
      const realtime = supabase
        .channel(`oursync-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "rewards" }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "spaces" }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "space_members" }, reload)
        .subscribe();
      const reelsChannel = supabase
        .channel(`oursync-reels-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "reels_ideas" }, reload)
        .subscribe();
      const projectsChannel = supabase
        .channel(`oursync-projects-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, reload)
        .subscribe();

      return () => {
        if (timer) clearTimeout(timer);
        void supabase.removeChannel(realtime);
        void supabase.removeChannel(reelsChannel);
        void supabase.removeChannel(projectsChannel);
      };
    },
    async createSpace({ name, emoji, accent }) {
      const { data, error } = await supabase.rpc("create_space", {
        space_name: name.trim(),
        space_emoji: emoji || "heart",
        space_accent: accent || "blush",
      });
      assertOk(error);
      if (typeof data !== "string") throw new Error("空間沒有建立成功");
      return data;
    },
    async joinSpace(code) {
      const normalized = normalizeInviteCode(code);
      if (!/^[A-Z]{3}-\d{3}$/.test(normalized)) throw new Error("邀請碼要像 HUG-888 這樣");
      const { data, error } = await supabase.rpc("join_space", { code: normalized });
      assertOk(error);
      if (typeof data !== "string") throw new Error("沒有加入成功");
      return data;
    },
    async reviewMember(memberId, decision) {
      const { error } = await supabase.rpc("review_membership", {
        member_id: memberId,
        decision,
      });
      assertOk(error);
    },
    async removeMember(memberId) {
      const { data, error } = await supabase.from("space_members").delete().eq("id", memberId).select("id");
      assertOk(error);
      if (!data?.length) throw new Error("沒有移出成功。請在 Supabase SQL Editor 再執行一次 schema.sql。");
    },
    async leaveSpace(spaceId) {
      const { data, error } = await supabase
        .from("space_members")
        .delete()
        .eq("space_id", spaceId)
        .eq("user_id", userId)
        .select("id");
      assertOk(error);
      if (!data?.length) throw new Error("沒有退出成功。請在 Supabase SQL Editor 再執行一次 schema.sql。");
    },
    async createProject({ spaceId, userId, name, emoji, description }) {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("專案名稱要寫一下");
      const { data, error } = await supabase
        .from("projects")
        .insert({
          space_id: spaceId,
          name: trimmed.slice(0, 40),
          description: description.trim().slice(0, 200),
          icon_emoji: emoji.trim().slice(0, 16) || "plane",
          created_by: userId,
        })
        .select("id")
        .single();
      assertOk(error);
      if (!data?.id) throw new Error("專案沒有建立成功");
      return data.id;
    },
    async updateProject(id, input) {
      const trimmed = input.name.trim();
      if (!trimmed) throw new Error("專案名稱要寫一下");
      const { error } = await supabase
        .from("projects")
        .update({
          name: trimmed.slice(0, 40),
          description: input.description.trim().slice(0, 200),
          icon_emoji: input.emoji.trim().slice(0, 16) || "plane",
        })
        .eq("id", id);
      assertOk(error);
    },
    async deleteProject(id) {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      assertOk(error);
    },
    async createTask(spaceId, creatorId, draft) {
      const title = draft.title.trim();
      if (!title) throw new Error("標題要寫一下");
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          space_id: spaceId,
          title: title.slice(0, 80),
          description: draft.description.trim().slice(0, 500),
          assignee_id: draft.assignee_id,
          due_date: draft.due_date || null,
          priority: draft.priority,
          status: draft.status,
          stuck_note: draft.status === "stuck" ? draft.stuck_note?.trim() || null : null,
          tags: normalizeTags(draft.tags),
          link_url: normalizeLink(draft.link_url ?? ""),
          image_urls: draft.image_urls.slice(0, 4),
          created_by: creatorId,
          completed_at: draft.status === "completed" ? now : null,
          project_id: draft.project_id,
        })
        .select("id")
        .single();
      assertOk(error);
      if (!data?.id) throw new Error("任務沒有建立成功");
      return data.id;
    },
    async createReel({ spaceId, url, title, description, thumbnailUrl, tags, userId }) {
      const row = {
        space_id: spaceId,
        url,
        title: title.trim().slice(0, 80),
        description: description.trim().slice(0, 300),
        thumbnail_url: thumbnailUrl,
        tags: normalizeTags(tags),
        created_by: userId,
      };
      let result = await supabase.from("reels_ideas").insert(row);
      if (result.error && /tags/i.test(result.error.message)) {
        if (row.tags.length > 0) {
          throw new Error("靈感標籤還沒建立。請在 Supabase SQL Editor 再執行一次 schema.sql。");
        }
        result = await supabase.from("reels_ideas").insert({
          space_id: row.space_id,
          url: row.url,
          title: row.title,
          description: row.description,
          thumbnail_url: row.thumbnail_url,
          created_by: row.created_by,
        });
      }
      if (result.error && /description/i.test(result.error.message)) {
        result = await supabase.from("reels_ideas").insert({
          space_id: row.space_id,
          url: row.url,
          title: row.title,
          thumbnail_url: row.thumbnail_url,
          created_by: row.created_by,
        });
      }
      assertOk(result.error);
    },
    async updateReel(id, tags) {
      const { error } = await supabase.from("reels_ideas").update({ tags: normalizeTags(tags) }).eq("id", id);
      assertOk(error);
    },
    async deleteReel(id) {
      const { error } = await supabase.from("reels_ideas").delete().eq("id", id);
      assertOk(error);
    },
    async markReelConverted(id, taskId) {
      const { error } = await supabase
        .from("reels_ideas")
        .update({ converted_to_task_id: taskId })
        .eq("id", id);
      assertOk(error);
    },
    async updateTask(id, patch) {
      const { data: current, error: readError } = await supabase
        .from("tasks")
        .select("status, completed_at, stuck_note")
        .eq("id", id)
        .single();
      assertOk(readError);
      const status = patch.status ?? current?.status;
      if (status === "stuck" && !(patch.stuck_note ?? current?.stuck_note ?? "").trim()) {
        throw new Error("跟對方說一下卡在哪裡");
      }
      const now = new Date().toISOString();
      const changes: {
        title?: string;
        description?: string;
        assignee_id?: string | null;
        due_date?: string | null;
        priority?: TaskDraft["priority"];
        status?: TaskDraft["status"];
        stuck_note?: string | null;
        completed_at?: string | null;
        tags?: string[];
        link_url?: string | null;
        image_urls?: string[];
        project_id?: string | null;
      } = {};
      if (patch.title !== undefined) changes.title = patch.title.trim().slice(0, 80);
      if (patch.description !== undefined) changes.description = patch.description.trim().slice(0, 500);
      if (patch.assignee_id !== undefined) changes.assignee_id = patch.assignee_id;
      if (patch.due_date !== undefined) changes.due_date = patch.due_date || null;
      if (patch.priority !== undefined) changes.priority = patch.priority;
      if (patch.status !== undefined) changes.status = patch.status;
      if (patch.stuck_note !== undefined) changes.stuck_note = patch.stuck_note;
      if (patch.tags !== undefined) changes.tags = normalizeTags(patch.tags);
      if (patch.link_url !== undefined) changes.link_url = normalizeLink(patch.link_url ?? "");
      if (patch.image_urls !== undefined) changes.image_urls = patch.image_urls.slice(0, 4);
      if (patch.project_id !== undefined) changes.project_id = patch.project_id;
      if (status === "completed") {
        changes.completed_at = current?.status === "completed" ? current.completed_at : now;
      } else if (patch.status) {
        changes.completed_at = null;
      }
      const { error } = await supabase.from("tasks").update(changes).eq("id", id);
      assertOk(error);
    },
    async deleteTask(id) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      assertOk(error);
    },
    async addComment(taskId, commenterId, body) {
      const text = body.trim().slice(0, 300);
      if (!text) throw new Error("留言是空的");
      const { error } = await supabase.from("comments").insert({
        task_id: taskId,
        user_id: commenterId,
        body: text,
      });
      assertOk(error);
    },
    async sendReward(draft) {
      const { error } = await supabase.from("rewards").insert({
        space_id: draft.space_id,
        task_id: draft.task_id,
        from_user_id: draft.from_user_id,
        to_user_id: draft.to_user_id,
        catalog_id: draft.catalog_id,
        message: draft.message.trim().slice(0, 120),
      });
      assertOk(error);
    },
  };
}
