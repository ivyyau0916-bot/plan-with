"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRemoteApi, type OurSyncApi } from "@/lib/api";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeReelUrl, previewReel } from "@/lib/reels";
import type { MembershipStatus, Profile, Project, RewardDraft, Snapshot, Space, SpaceMember, TaskDraft } from "@/lib/types";
import { dueHorizon } from "@/lib/due";
import { writeOnboardingDone } from "@/lib/onboarding";
import { errorMessage, mapAuthError } from "@/lib/utils";

const SPACE_KEY = "oursync-space";

type Person = { name: string; emoji: string };

type AppContextValue = {
  ready: boolean;
  bootError: string | null;
  configured: boolean;
  needsAuth: boolean;
  me: Profile | null;
  profiles: Profile[];
  spaces: Space[];
  space: Space | null;
  projects: Snapshot["projects"];
  project: Project | null;
  tasks: Snapshot["tasks"];
  spaceTasks: Snapshot["tasks"];
  reels: Snapshot["reels"];
  comments: Snapshot["comments"];
  rewards: Snapshot["rewards"];
  giftCounts: Snapshot["giftCounts"];
  members: Snapshot["members"];
  myMembership: SpaceMember | null;
  reviewQueue: SpaceMember[];
  membershipOf: (spaceId: string) => SpaceMember | null;
  spaceMembers: (spaceId: string) => SpaceMember[];
  unlocks: Snapshot["unlocks"];
  notifications: Snapshot["notifications"];
  toast: string | null;
  notify: (message: string) => void;
  person: (id: string | null | undefined) => Person;
  setActiveSpace: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  createProject: (input: { name: string; emoji: string; description: string }) => Promise<void>;
  updateProject: (id: string, input: { name: string; emoji: string; description: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, emoji: string) => Promise<"ok" | "confirm-email">;
  signInWithNickname: (name: string, emoji: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  markNotificationsRead: (ids: string[] | "all") => Promise<void>;
  focusTask: (taskId: string) => void;
  createSpace: (name: string, emoji: string, accent: string) => Promise<string>;
  updateSpace: (id: string, input: { name: string; description: string }) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  joinSpace: (code: string) => Promise<void>;
  reviewMembership: (memberId: string, decision: Exclude<MembershipStatus, "pending">) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  leaveSpace: (spaceId: string) => Promise<void>;
  createTask: (draft: TaskDraft) => Promise<string>;
  createReel: (url: string, title: string, tags: string[]) => Promise<void>;
  updateReel: (id: string, tags: string[]) => Promise<void>;
  deleteReel: (id: string) => Promise<void>;
  markReelConverted: (id: string, taskId: string) => Promise<void>;
  updateTask: (id: string, patch: Partial<TaskDraft>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<void>;
  sendReward: (draft: Omit<RewardDraft, "space_id" | "from_user_id">) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp 必須在 AppProvider 裡使用");
  return value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const apiRef = useRef<OurSyncApi | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const prevSnapshotRef = useRef<Snapshot | null>(null);
  const meIdRef = useRef<string | null>(null);
  const notifyRef = useRef<(message: string) => void>(() => undefined);
  const setActiveSpaceRef = useRef<(id: string) => void>(() => undefined);
  const applyRef = useRef<(next: Snapshot) => void>(() => undefined);
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [projectChoice, setProjectChoice] = useState<{ spaceId: string; projectId: string | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((message: string) => setToast(message), []);

  const applySnapshot = useCallback((next: Snapshot) => {
    const prev = prevSnapshotRef.current;
    const userId = meIdRef.current;
    prevSnapshotRef.current = next;
    if (prev && userId) {
      const before = new Map(
        prev.members.filter((member) => member.user_id === userId).map((member) => [member.space_id, member.status]),
      );
      for (const row of next.members) {
        if (row.user_id !== userId) continue;
        const was = before.get(row.space_id);
        const name =
          next.spaces.find((item) => item.id === row.space_id)?.name ??
          prev.spaces.find((item) => item.id === row.space_id)?.name;
        if (was === "pending" && row.status === "approved") {
          notifyRef.current(name ? `「${name}」審核通過了` : "審核通過了，可以一起看這份清單");
          setActiveSpaceRef.current(row.space_id);
        }
        if (was === "pending" && row.status === "rejected") {
          notifyRef.current(name ? `「${name}」沒有通過審核` : "建立者沒有通過這個空間的申請");
        }
      }
      for (const [spaceId, status] of before) {
        if (status === "rejected") continue;
        const still = next.members.some((member) => member.user_id === userId && member.space_id === spaceId);
        if (!still) {
          const name = prev.spaces.find((item) => item.id === spaceId)?.name;
          notifyRef.current(name ? `你已經不在「${name}」了` : "你已經不在這個空間了");
        }
      }
      const owned = new Set(
        prev.members
          .filter((member) => member.user_id === userId && member.role === "owner" && member.status === "approved")
          .map((member) => member.space_id),
      );
      const seen = new Set(prev.members.filter((member) => member.status === "pending").map((member) => member.id));
      const fresh = next.members.filter(
        (member) => member.status === "pending" && owned.has(member.space_id) && !seen.has(member.id),
      );
      if (fresh.length === 1) {
        const who = next.profiles.find((profile) => profile.id === fresh[0]?.user_id)?.display_name ?? "有人";
        notifyRef.current(`${who} 想加入你的空間`);
      } else if (fresh.length > 1) {
        notifyRef.current(`有 ${fresh.length} 個人想加入你的空間`);
      }
      const seenNotes = new Set((prev.notifications ?? []).map((note) => note.id));
      const freshNotes = (next.notifications ?? []).filter((note) => !note.is_read && !seenNotes.has(note.id));
      if (freshNotes.length === 1) {
        notifyRef.current(freshNotes[0]?.message || freshNotes[0]?.title || "有一則新通知");
      } else if (freshNotes.length > 1) {
        notifyRef.current(`有 ${freshNotes.length} 則新通知`);
      }
    }
    setSnapshot(next);
  }, []);

  const enterRemote = useCallback(async (userId: string) => {
    const remote = createRemoteApi(getSupabase(), userId);
    apiRef.current = remote;
    const next = await remote.load();
    meIdRef.current = userId;
    prevSnapshotRef.current = null;
    applyRef.current(next);
    setMeId(userId);
    setActiveSpaceId(window.sessionStorage.getItem(`${SPACE_KEY}:${userId}`));
    setNeedsAuth(false);
    unsubRef.current?.();
    unsubRef.current = remote.subscribe((value) => applyRef.current(value));
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      if (!isSupabaseConfigured()) {
        setNeedsAuth(true);
        setReady(true);
        return;
      }

      const { data, error } = await getSupabase().auth.getSession();
      if (!active) return;
      if (error) throw error;
      if (!data.session) {
        setNeedsAuth(true);
        setReady(true);
        return;
      }
      await enterRemote(data.session.user.id);
    }

    boot().catch((error: unknown) => {
      if (!active) return;
      setBootError(errorMessage(error, "清單沒有打開"));
      setReady(true);
    });

    return () => {
      active = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [enterRemote]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const requireApi = useCallback(() => {
    if (!apiRef.current || !meId) throw new Error("還沒準備好");
    return { api: apiRef.current, userId: meId };
  }, [meId]);

  const refresh = useCallback(async () => {
    if (!apiRef.current) return;
    applyRef.current(await apiRef.current.load());
  }, []);

  const spaces = useMemo(() => {
    if (!snapshot || !meId) return [];
    const visible = new Set(
      snapshot.members
        .filter((member) => member.user_id === meId && member.status !== "rejected")
        .map((member) => member.space_id),
    );
    return snapshot.spaces
      .filter((item) => visible.has(item.id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [snapshot, meId]);

  const space =
    spaces.find((item) => item.id === activeSpaceId) ??
    spaces.find((item) =>
      snapshot?.members.some(
        (member) => member.space_id === item.id && member.user_id === meId && member.status === "approved",
      ),
    ) ??
    spaces[0] ??
    null;

  const members = useMemo(
    () => snapshot?.members.filter((member) => member.space_id === space?.id && member.status === "approved") ?? [],
    [snapshot, space?.id],
  );
  const myMembership = useMemo(
    () => snapshot?.members.find((member) => member.space_id === space?.id && member.user_id === meId) ?? null,
    [snapshot, space?.id, meId],
  );
  const reviewQueue = useMemo(() => {
    if (!snapshot || !meId) return [];
    const owned = new Set(
      snapshot.members
        .filter((member) => member.user_id === meId && member.role === "owner" && member.status === "approved")
        .map((member) => member.space_id),
    );
    return snapshot.members.filter(
      (member) => member.status === "pending" && member.user_id !== meId && owned.has(member.space_id),
    );
  }, [snapshot, meId]);
  const membershipOf = useCallback(
    (spaceId: string) =>
      snapshot?.members.find((member) => member.space_id === spaceId && member.user_id === meId && member.status !== "rejected") ??
      null,
    [snapshot, meId],
  );
  const spaceMembers = useCallback(
    (spaceId: string) => snapshot?.members.filter((member) => member.space_id === spaceId) ?? [],
    [snapshot],
  );
  const projects = useMemo(
    () =>
      (snapshot?.projects.filter((item) => item.space_id === space?.id) ?? []).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      ),
    [snapshot, space?.id],
  );
  const project =
    projectChoice && projectChoice.spaceId === space?.id
      ? (projects.find((item) => item.id === projectChoice.projectId) ?? null)
      : null;
  const setActiveProject = useCallback(
    (id: string | null) => {
      if (!space) return;
      setProjectChoice({ spaceId: space.id, projectId: id });
    },
    [space],
  );
  const spaceTasks = useMemo(
    () => snapshot?.tasks.filter((task) => task.space_id === space?.id) ?? [],
    [snapshot, space?.id],
  );
  const tasks = useMemo(() => {
    if (!project) return spaceTasks;
    return spaceTasks.filter((task) => task.project_id === project.id);
  }, [spaceTasks, project]);
  const duePayload = useMemo(
    () =>
      (snapshot?.tasks ?? [])
        .filter((task) => task.space_id === space?.id && task.status !== "completed" && dueHorizon(task.due_date))
        .map((task) => ({ id: task.id, title: task.title, due_date: task.due_date ?? "" })),
    [snapshot?.tasks, space?.id],
  );
  useEffect(() => {
    const api = apiRef.current;
    const spaceId = space?.id;
    if (!api || !spaceId || duePayload.length === 0) return;
    let cancelled = false;
    void api
      .remindDueTasks(spaceId, duePayload)
      .then((count) => {
        if (!cancelled && count > 0) return refresh();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [duePayload, refresh, space?.id]);
  const reels = useMemo(
    () =>
      (snapshot?.reels.filter((reel) => reel.space_id === space?.id) ?? []).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
    [snapshot, space?.id],
  );
  const taskIds = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);
  const comments = useMemo(
    () => snapshot?.comments.filter((comment) => taskIds.has(comment.task_id)) ?? [],
    [snapshot, taskIds],
  );
  const rewards = useMemo(
    () => snapshot?.rewards.filter((reward) => reward.space_id === space?.id) ?? [],
    [snapshot, space?.id],
  );
  const giftCounts = useMemo(
    () => snapshot?.giftCounts.filter((row) => row.space_id === space?.id) ?? [],
    [snapshot, space?.id],
  );

  const person = useCallback(
    (id: string | null | undefined): Person => {
      const profile = id ? snapshot?.profiles.find((item) => item.id === id) : null;
      return {
        name: profile?.display_name ?? (id ? "某人" : "未指派"),
        emoji: profile?.avatar_emoji ?? "🤍",
      };
    },
    [snapshot],
  );

  const setActiveSpace = useCallback(
    (id: string) => {
      setActiveSpaceId(id);
      if (meId) window.sessionStorage.setItem(`${SPACE_KEY}:${meId}`, id);
    },
    [meId],
  );

  useEffect(() => {
    notifyRef.current = notify;
    applyRef.current = applySnapshot;
    setActiveSpaceRef.current = setActiveSpace;
  }, [notify, applySnapshot, setActiveSpace]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(mapAuthError(error.message));
      const { data } = await getSupabase().auth.getUser();
      if (!data.user) throw new Error("登入沒有成功");
      await enterRemote(data.user.id);
    },
    [enterRemote],
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string, emoji: string) => {
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim(), avatar_emoji: emoji } },
      });
      if (error) throw new Error(mapAuthError(error.message));
      if (!data.session || !data.user) return "confirm-email" as const;
      await enterRemote(data.user.id);
      return "ok" as const;
    },
    [enterRemote],
  );

  const signInWithNickname = useCallback(
    async (name: string, emoji: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("想讓對方怎麼稱呼你？");
      const { data, error } = await getSupabase().auth.signInAnonymously({
        options: { data: { display_name: trimmed, avatar_emoji: emoji } },
      });
      if (error) throw new Error(mapAuthError(error.message));
      if (!data.user) throw new Error("沒有開始成功");
      await enterRemote(data.user.id);
    },
    [enterRemote],
  );

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    unsubRef.current?.();
    unsubRef.current = null;
    apiRef.current = null;
    prevSnapshotRef.current = null;
    meIdRef.current = null;
    setSnapshot(null);
    setMeId(null);
    setNeedsAuth(true);
  }, []);

  const completeOnboarding = useCallback(async () => {
    const { api, userId } = requireApi();
    await api.completeOnboarding();
    writeOnboardingDone(userId);
    setSnapshot((current) => {
      if (!current) return current;
      const next = {
        ...current,
        profiles: current.profiles.map((profile) =>
          profile.id === userId ? { ...profile, has_completed_onboarding: true } : profile,
        ),
      };
      prevSnapshotRef.current = next;
      return next;
    });
  }, [requireApi]);

  const markNotificationsRead = useCallback(
    async (ids: string[] | "all") => {
      const { api } = requireApi();
      setSnapshot((current) => {
        if (!current) return current;
        const next = {
          ...current,
          notifications: (current.notifications ?? []).map((note) =>
            ids === "all" || ids.includes(note.id) ? { ...note, is_read: true } : note,
          ),
        };
        prevSnapshotRef.current = next;
        return next;
      });
      try {
        await api.markNotificationsRead(ids);
      } catch (error) {
        await refresh();
        throw error;
      }
    },
    [refresh, requireApi],
  );

  const focusTask = useCallback(
    (taskId: string) => {
      const task = snapshot?.tasks.find((item) => item.id === taskId);
      if (!task) return;
      setActiveSpace(task.space_id);
      setProjectChoice({ spaceId: task.space_id, projectId: task.project_id });
    },
    [setActiveSpace, snapshot?.tasks],
  );

  const createSpace = useCallback(
    async (name: string, emoji: string, accent: string) => {
      const { api, userId } = requireApi();
      const id = await api.createSpace({ name, emoji, accent, userId });
      const next = await api.load();
      applyRef.current(next);
      setActiveSpace(id);
      return next.spaces.find((item) => item.id === id)?.invite_code ?? "";
    },
    [requireApi, setActiveSpace],
  );

  const updateSpace = useCallback(
    async (id: string, input: { name: string; description: string }) => {
      const { api } = requireApi();
      await api.updateSpace(id, input);
      await refresh();
      notify("空間資料更新了");
    },
    [notify, refresh, requireApi],
  );

  const deleteSpace = useCallback(
    async (id: string) => {
      const { api, userId } = requireApi();
      await api.deleteSpace(id);
      const next = await api.load();
      applyRef.current(next);
      const mine = next.members.filter((member) => member.user_id === userId && member.status !== "rejected");
      const visible = next.spaces.filter((item) => mine.some((member) => member.space_id === item.id));
      const preferred =
        visible.find((item) =>
          mine.some((member) => member.space_id === item.id && member.status === "approved"),
        ) ?? visible[0];
      if (preferred) {
        setActiveSpace(preferred.id);
      } else {
        setActiveSpaceId(null);
        window.sessionStorage.removeItem(`${SPACE_KEY}:${userId}`);
      }
      setProjectChoice(null);
      notify("空間已刪除");
    },
    [notify, requireApi, setActiveSpace],
  );

  const createProject = useCallback(
    async (input: { name: string; emoji: string; description: string }) => {
      const { api, userId } = requireApi();
      if (!space) throw new Error("先選一個空間");
      const id = await api.createProject({ spaceId: space.id, userId, ...input });
      await refresh();
      setProjectChoice({ spaceId: space.id, projectId: id });
      notify("專案建好了");
    },
    [notify, refresh, requireApi, space],
  );

  const updateProject = useCallback(
    async (id: string, input: { name: string; emoji: string; description: string }) => {
      const { api } = requireApi();
      await api.updateProject(id, input);
      await refresh();
      notify("專案更新了");
    },
    [notify, refresh, requireApi],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const { api } = requireApi();
      await api.deleteProject(id);
      if (space) setProjectChoice({ spaceId: space.id, projectId: null });
      await refresh();
      notify("專案收起來了，任務還在所有任務裡");
    },
    [notify, refresh, requireApi, space],
  );

  const joinSpace = useCallback(
    async (code: string) => {
      const { api, userId } = requireApi();
      const id = await api.joinSpace(code, userId);
      const next = await api.load();
      applyRef.current(next);
      setActiveSpace(id);
      const mine = next.members.find((member) => member.space_id === id && member.user_id === userId);
      notify(
        mine?.status === "pending" ? "邀請申請已送出！等待空間創作者審核中..." : "已經加入這個空間",
      );
    },
    [notify, requireApi, setActiveSpace],
  );

  const reviewMembership = useCallback(
    async (memberId: string, decision: Exclude<MembershipStatus, "pending">) => {
      const { api } = requireApi();
      await api.reviewMember(memberId, decision);
      await refresh();
      notify(decision === "approved" ? "已同意加入" : "已拒絕這份申請");
    },
    [notify, refresh, requireApi],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const { api } = requireApi();
      await api.removeMember(memberId);
      await refresh();
      notify("已移出這個空間");
    },
    [notify, refresh, requireApi],
  );

  const leaveSpace = useCallback(
    async (spaceId: string) => {
      const { api } = requireApi();
      await api.leaveSpace(spaceId);
      await refresh();
    },
    [refresh, requireApi],
  );

  const createTask = useCallback(
    async (draft: TaskDraft) => {
      const { api, userId } = requireApi();
      if (!space) throw new Error("先選一個空間");
      const id = await api.createTask(space.id, userId, draft);
      await refresh();
      notify("任務記下來了");
      return id;
    },
    [notify, refresh, requireApi, space],
  );

  const createReel = useCallback(
    async (url: string, title: string, tags: string[]) => {
      const { api, userId } = requireApi();
      if (!space) throw new Error("先選一個空間");
      const normalized = normalizeReelUrl(url);
      const preview = await previewReel(normalized);
      await api.createReel({
        spaceId: space.id,
        url: normalized,
        title: (title.trim() || preview.title).slice(0, 80),
        description: preview.description,
        thumbnailUrl: preview.image,
        tags,
        userId,
      });
      await refresh();
      notify("收到這則靈感了");
    },
    [notify, refresh, requireApi, space],
  );

  const updateReel = useCallback(
    async (id: string, tags: string[]) => {
      const { api } = requireApi();
      await api.updateReel(id, tags);
      await refresh();
      notify("標籤更新了");
    },
    [notify, refresh, requireApi],
  );

  const deleteReel = useCallback(
    async (id: string) => {
      const { api } = requireApi();
      await api.deleteReel(id);
      await refresh();
      notify("這則靈感已拿掉");
    },
    [notify, refresh, requireApi],
  );

  const markReelConverted = useCallback(
    async (id: string, taskId: string) => {
      const { api } = requireApi();
      await api.markReelConverted(id, taskId);
      await refresh();
    },
    [refresh, requireApi],
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskDraft>) => {
      const { api } = requireApi();
      await api.updateTask(id, patch);
      await refresh();
    },
    [refresh, requireApi],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const { api } = requireApi();
      await api.deleteTask(id);
      await refresh();
      notify("這件事已拿掉");
    },
    [notify, refresh, requireApi],
  );

  const addComment = useCallback(
    async (taskId: string, body: string) => {
      const { api, userId } = requireApi();
      await api.addComment(taskId, userId, body);
      await refresh();
    },
    [refresh, requireApi],
  );

  const sendReward = useCallback(
    async (draft: Omit<RewardDraft, "space_id" | "from_user_id">) => {
      const { api, userId } = requireApi();
      if (!space) throw new Error("先選一個空間");
      await api.sendReward({ ...draft, space_id: space.id, from_user_id: userId });
      await refresh();
      notify("小獎勵送出了");
    },
    [notify, refresh, requireApi, space],
  );

  const me = snapshot?.profiles.find((profile) => profile.id === meId) ?? null;

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      bootError,
      configured,
      needsAuth,
      me,
      profiles: snapshot?.profiles ?? [],
      spaces,
      space,
      projects,
      project,
      tasks,
      spaceTasks,
      reels,
      comments,
      rewards,
      giftCounts,
      members,
      myMembership,
      reviewQueue,
      membershipOf,
      spaceMembers,
      unlocks: snapshot?.unlocks ?? [],
      notifications: snapshot?.notifications ?? [],
      toast,
      notify,
      person,
      setActiveSpace,
      setActiveProject,
      createProject,
      updateProject,
      deleteProject,
      signIn,
      signUp,
      signInWithNickname,
      signOut,
      completeOnboarding,
      markNotificationsRead,
      focusTask,
      createSpace,
      updateSpace,
      deleteSpace,
      joinSpace,
      reviewMembership,
      removeMember,
      leaveSpace,
      createTask,
      createReel,
      updateReel,
      deleteReel,
      markReelConverted,
      updateTask,
      deleteTask,
      addComment,
      sendReward,
    }),
    [
      ready,
      bootError,
      configured,
      needsAuth,
      me,
      snapshot?.profiles,
      spaces,
      space,
      projects,
      project,
      tasks,
      spaceTasks,
      reels,
      comments,
      rewards,
      giftCounts,
      members,
      myMembership,
      reviewQueue,
      membershipOf,
      spaceMembers,
      snapshot?.unlocks,
      snapshot?.notifications,
      toast,
      notify,
      person,
      setActiveSpace,
      setActiveProject,
      createProject,
      updateProject,
      deleteProject,
      signIn,
      signUp,
      signInWithNickname,
      signOut,
      completeOnboarding,
      markNotificationsRead,
      focusTask,
      createSpace,
      updateSpace,
      deleteSpace,
      joinSpace,
      reviewMembership,
      removeMember,
      leaveSpace,
      createTask,
      createReel,
      updateReel,
      deleteReel,
      markReelConverted,
      updateTask,
      deleteTask,
      addComment,
      sendReward,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
