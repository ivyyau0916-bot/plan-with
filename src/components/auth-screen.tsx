"use client";

import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Logo } from "@/components/logo";
import { AvatarBadge } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn, errorMessage } from "@/lib/utils";

type Mode = "sign-in" | "sign-up" | "nickname";

export function AuthScreen() {
  const { configured, signIn, signUp, signInWithNickname } = useApp();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      if (!name.trim() && mode !== "sign-in") {
        setError("想讓對方怎麼稱呼你？");
        return;
      }
      if (mode === "nickname") {
        await signInWithNickname(name, "heart");
        return;
      }
      if (mode === "sign-in") {
        await signIn(email, password);
        return;
      }
      const result = await signUp(email, password, name, "heart");
      if (result === "confirm-email") {
        setNotice("到信箱點確認信，再回來登入。空間會在那之後等你。");
        setMode("sign-in");
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/80 bg-foam/90 p-6 shadow-[0_24px_60px_-32px_rgba(80,48,36,0.55)] sm:p-8">
        <Logo large />
        <p className="mt-2 text-sm leading-6 text-cocoa">用自己的帳號登入。你只會看到自己加入的空間和任務。</p>

        {configured ? (
          <>
            <div className="mt-5 grid grid-cols-3 rounded-full bg-linen p-1 text-sm font-semibold">
              {(
                [
                  ["sign-in", "登入"],
                  ["sign-up", "註冊"],
                  ["nickname", "暱稱"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMode(id);
                    setError(null);
                    setNotice(null);
                  }}
                  className={cn("rounded-full py-2", mode === id ? "bg-white text-ink" : "text-cocoa")}
                >
                  {label}
                </button>
              ))}
            </div>

            <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
              {mode !== "sign-in" ? (
                <>
                  <Field label="稱呼">
                    <Input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} required />
                  </Field>
                  <div className="flex items-center gap-3 rounded-3xl bg-orange-50/70 px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                    <AvatarBadge name={name || "你"} size="md" />
                    <p className="text-sm leading-5 text-cocoa">頭像會用稱呼的第一個字，每個人的底色不太一樣。</p>
                  </div>
                </>
              ) : null}
              {mode === "nickname" ? (
                <p className="text-sm leading-6 text-cocoa">
                  先用暱稱開始，之後仍是你自己的帳號。對方看到的會是這個稱呼和頭像。
                </p>
              ) : (
                <>
                  <Field label="信箱">
                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </Field>
                  <Field label="密碼" hint="至少 6 個字元">
                    <Input
                      type="password"
                      autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                      value={password}
                      minLength={6}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </Field>
                </>
              )}
              {error ? <p className="text-sm text-stuck">{error}</p> : null}
              {notice ? <p className="text-sm leading-6 text-sage-deep">{notice}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "請稍等…" : mode === "sign-in" ? "進入清單" : mode === "sign-up" ? "建立帳號" : "用暱稱開始"}
              </Button>
            </form>
          </>
        ) : (
          <div className="mt-5 space-y-3 text-sm leading-6 text-cocoa">
            <p>登入需要先接上 Supabase。把 .env.example 複製成 .env.local，填上這兩個值：</p>
            <p className="rounded-2xl bg-linen px-3 py-2 font-mono text-xs leading-5 text-ink">
              NEXT_PUBLIC_SUPABASE_URL
              <br />
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </p>
            <p>
              然後在 SQL Editor 執行 supabase/schema.sql。Authentication 請開啟 Email。若要用「暱稱」直接開始，還要打開
              Anonymous sign-ins。改完環境變數後重新啟動開發伺服器。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
