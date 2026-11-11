"use client";

import {
  AirplaneTilt,
  Folder,
  Gift,
  InstagramLogo,
  Rocket,
  SealCheck,
  Sparkle,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "@/components/app-provider";
import { TagChip } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { readOnboardingDone, subscribeOnboarding } from "@/lib/onboarding";
import { errorMessage } from "@/lib/utils";

const STEPS = [
  {
    title: "歡迎來到 PlanWith！",
    subtitle: "我們的日常與旅行約定",
    body: "這裡是你和另一半或閨蜜專屬的約定小天地，一起記錄日常瑣事、規劃夢幻旅行吧！",
  },
  {
    title: "空間與專案",
    subtitle: "把約定分門別類",
    body: "可以建立專屬「空間」，並在裡面拆分不同的「專案」（例如：2027 峇里島潛水之旅、週末約會探店），讓清單井井有條！",
  },
  {
    title: "靈感庫與任務標籤",
    subtitle: "喜歡的片段先收起來",
    body: "看到喜歡的 IG Reels 貼上網址就能一鍵收藏並加上分類標籤，還能把靈感隨時轉為待辦任務喔！",
  },
  {
    title: "專屬禮物箱與微獎勵",
    subtitle: "完成約定就收集一份甜",
    body: "每完成一個約定任務，就能解鎖並收集電子禮物，打造你們的甜甜回憶！",
  },
] as const;

export function OnboardingTour() {
  const { me, completeOnboarding } = useApp();
  const userId = me?.id ?? "";
  const saved = useSyncExternalStore(
    subscribeOnboarding,
    () => (userId ? readOnboardingDone(userId) : false),
    () => false,
  );
  if (!me || me.has_completed_onboarding || saved) return null;
  return <OnboardingDialog onFinish={completeOnboarding} />;
}

function OnboardingDialog({ onFinish }: { onFinish: () => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const current = STEPS[step] ?? STEPS[0];
  const last = step === STEPS.length - 1;

  async function finish() {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setFinishError(null);
    try {
      await onFinish();
    } catch (error) {
      pendingRef.current = false;
      setPending(false);
      setFinishError(errorMessage(error));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void finish(); }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex min-h-36 items-center justify-center" aria-hidden>
          <StepArt step={step} />
        </div>
        <DialogTitle className="mt-2 pr-8 text-center text-2xl font-bold text-ink">{current.title}</DialogTitle>
        <p className="mt-1 text-center text-sm font-semibold text-coral">{current.subtitle}</p>
        <DialogDescription className="mt-3 text-center text-sm leading-6 text-cocoa">{current.body}</DialogDescription>
        <div className="mt-5 flex items-center justify-center gap-2" aria-label={`第 ${step + 1} 步，共 ${STEPS.length} 步`}>
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className={
                index === step
                  ? "h-2.5 w-6 rounded-full bg-coral"
                  : "h-2.5 w-2.5 rounded-full bg-sand"
              }
            />
          ))}
        </div>
        {finishError ? <p className="mt-3 text-center text-sm text-stuck">{finishError}</p> : null}
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => void finish()} disabled={pending}>
            跳過引導
          </Button>
          {last ? (
            <Button type="button" onClick={() => void finish()} disabled={pending}>
              <Rocket className="h-4 w-4" weight="bold" />
              {pending ? "準備中…" : "開始我們的約定"}
            </Button>
          ) : (
            <Button type="button" onClick={() => setStep((value) => value + 1)} disabled={pending}>
              下一步
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepArt({ step }: { step: number }) {
  if (step === 1) {
    return (
      <div className="flex items-end gap-3">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-amber-50 text-amber-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <Folder className="h-10 w-10" weight="duotone" />
        </span>
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-sky-100 text-sky-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <AirplaneTilt className="h-8 w-8" weight="duotone" />
        </span>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="relative grid h-28 w-20 place-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-rose-200 to-amber-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <InstagramLogo className="h-8 w-8 text-white" weight="duotone" />
          <Sparkle className="absolute right-1.5 top-1.5 h-4 w-4 text-amber-500" weight="duotone" />
        </span>
        <span className="flex gap-1.5">
          <TagChip tag="美食探店" />
          <TagChip tag="景點打卡" />
        </span>
      </div>
    );
  }
  if (step === 3) {
    return (
      <div className="flex items-center gap-3">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-pink-100 text-pink-500 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <Gift className="h-10 w-10" weight="duotone" />
        </span>
        <span className="grid grid-cols-2 gap-1.5 rounded-3xl bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <SealCheck className="h-6 w-6 text-coral" weight="duotone" />
          <SealCheck className="h-6 w-6 text-amber-500" weight="duotone" />
          <SealCheck className="h-6 w-6 text-sage-deep" weight="duotone" />
          <SealCheck className="h-6 w-6 text-sand" weight="duotone" />
        </span>
      </div>
    );
  }
  return (
    <span className="relative block h-28 w-28 overflow-hidden rounded-[22%] shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <Image src="/planwith-logo.png" alt="" fill sizes="112px" className="object-cover" />
    </span>
  );
}
