import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
};

const MOBILE_PWA_PROMPT_DISMISSED_KEY = "watcher.mobilePwaPromptDismissed";

function isStandaloneLike(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return (
    navigatorWithStandalone.standalone === true ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function supportsFullscreen(): boolean {
  const fullscreenDocument = document as FullscreenDocument;

  return document.fullscreenEnabled || fullscreenDocument.webkitFullscreenEnabled === true;
}

async function requestAppFullscreen(): Promise<boolean> {
  const root = document.documentElement as FullscreenRoot;

  if (document.fullscreenElement || (document as FullscreenDocument).webkitFullscreenElement) {
    return true;
  }

  if (root.requestFullscreen) {
    await root.requestFullscreen({ navigationUI: "hide" });
    return true;
  }

  if (root.webkitRequestFullscreen) {
    await root.webkitRequestFullscreen({ navigationUI: "hide" });
    return true;
  }

  return false;
}

export function MobilePwaPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(
    () => window.sessionStorage.getItem(MOBILE_PWA_PROMPT_DISMISSED_KEY) === "true"
  );
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);

  useEffect(() => {
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");
    const updateMode = () => {
      setIsMobileBrowser(coarsePointerQuery.matches && !isStandaloneLike());
    };

    updateMode();
    coarsePointerQuery.addEventListener("change", updateMode);
    standaloneQuery.addEventListener("change", updateMode);
    fullscreenQuery.addEventListener("change", updateMode);

    return () => {
      coarsePointerQuery.removeEventListener("change", updateMode);
      standaloneQuery.removeEventListener("change", updateMode);
      fullscreenQuery.removeEventListener("change", updateMode);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  if (!isMobileBrowser || isDismissed) {
    return null;
  }

  const canRequestFullscreen = supportsFullscreen();
  const installHint = installPrompt
    ? "安装后从桌面图标进入，浏览器地址栏会少很多。"
    : "iOS 用分享菜单添加到主屏幕；Android 用浏览器菜单安装应用或添加到主屏幕。";

  return (
    <aside className="mobile-pwa-prompt" data-testid="mobile-pwa-prompt" role="status" aria-live="polite">
      <div className="mobile-pwa-prompt__copy">
        <strong>手机游玩建议</strong>
        <span>普通浏览器标签页不会自动隐藏地址栏。{installHint}</span>
        {fullscreenError ? <span className="mobile-pwa-prompt__error">{fullscreenError}</span> : null}
      </div>
      <div className="mobile-pwa-prompt__actions">
        {installPrompt ? (
          <button
            type="button"
            data-testid="mobile-pwa-install-button"
            onClick={() => {
              void installPrompt.prompt().finally(() => {
                setInstallPrompt(null);
              });
            }}
          >
            安装应用
          </button>
        ) : null}
        {canRequestFullscreen ? (
          <button
            type="button"
            data-testid="mobile-pwa-fullscreen-button"
            onClick={() => {
              setFullscreenError(null);
              void requestAppFullscreen().catch(() => {
                setFullscreenError("这个浏览器没有允许当前页面全屏，请从主屏幕图标进入。");
              });
            }}
          >
            进入全屏
          </button>
        ) : null}
        <button
          type="button"
          className="mobile-pwa-prompt__dismiss"
          data-testid="mobile-pwa-dismiss-button"
          onClick={() => {
            window.sessionStorage.setItem(MOBILE_PWA_PROMPT_DISMISSED_KEY, "true");
            setIsDismissed(true);
          }}
        >
          知道了
        </button>
      </div>
    </aside>
  );
}
