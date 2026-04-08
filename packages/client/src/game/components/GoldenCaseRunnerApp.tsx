import {
  GOLDEN_CASES,
  buildGoldenCasePlayback,
  type GoldenCasePlayback,
  type GoldenCaseResult
} from "@watcher/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAnimationClock } from "../hooks/useAnimationClock";
import { useGameStore } from "../state/useGameStore";
import { GameBoardCanvas } from "./GameBoardCanvas";

const CASE_BOOT_MS = 360;
const CASE_GAP_MS = 520;
const STEP_IDLE_MS = 320;
const STEP_PRESENTATION_BUFFER_MS = 240;

interface GoldenRunRequest {
  kind: "all" | "single";
  resetResults: boolean;
  serial: number;
  startIndex: number;
  targetCaseId: string | null;
}

function getSelectedCaseId(): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get("case");
}

function getStepWaitMs(
  playback: GoldenCasePlayback,
  stepIndex: number
): number {
  const currentStep = playback.steps[stepIndex];

  if (!currentStep) {
    return STEP_IDLE_MS;
  }

  const previousSnapshot =
    stepIndex > 0 ? playback.steps[stepIndex - 1]?.snapshot : playback.initialSnapshot;
  const latestSequence = currentStep.snapshot.latestPresentation?.sequence ?? null;
  const previousSequence = previousSnapshot?.latestPresentation?.sequence ?? null;
  const hasNewPresentation = latestSequence !== null && latestSequence !== previousSequence;

  if (!hasNewPresentation) {
    return STEP_IDLE_MS;
  }

  return (
    (currentStep.snapshot.latestPresentation?.durationMs ?? 0) + STEP_PRESENTATION_BUFFER_MS
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildResultLookup(results: GoldenCaseResult[]): Record<string, GoldenCaseResult> {
  return Object.fromEntries(results.map((result) => [result.caseId, result]));
}

function upsertResult(results: GoldenCaseResult[], nextResult: GoldenCaseResult): GoldenCaseResult[] {
  const nextResults = results.filter((result) => result.caseId !== nextResult.caseId);
  nextResults.push(nextResult);
  return nextResults;
}

function getCaseStatus(
  playback: GoldenCasePlayback,
  activeCaseId: string | null,
  completedResults: Record<string, GoldenCaseResult>,
  isRunning: boolean
): "failed" | "passed" | "running" | "pending" {
  const completed = completedResults[playback.result.caseId];

  if (completed) {
    return completed.passed ? "passed" : "failed";
  }

  if (isRunning && playback.result.caseId === activeCaseId) {
    return "running";
  }

  return "pending";
}

function getStepStatus(
  stepIndex: number,
  activeStepIndex: number | null,
  isActiveCase: boolean,
  isCaseCompleted: boolean
): "completed" | "current" | "pending" {
  if (isCaseCompleted) {
    return "completed";
  }

  if (!isActiveCase || activeStepIndex === null) {
    return "pending";
  }

  if (stepIndex < activeStepIndex) {
    return "completed";
  }

  if (stepIndex === activeStepIndex) {
    return "current";
  }

  return "pending";
}

// The golden route reuses the live board scene, but feeds it snapshots from the local simulator.
export function GoldenCaseRunnerApp() {
  useAnimationClock();

  const selectedCaseId = useMemo(() => getSelectedCaseId(), []);
  const visibleCases = useMemo(
    () =>
      selectedCaseId
        ? GOLDEN_CASES.filter((caseDefinition) => caseDefinition.id === selectedCaseId)
        : GOLDEN_CASES,
    [selectedCaseId]
  );
  const playbacks = useMemo(
    () => visibleCases.map((caseDefinition) => buildGoldenCasePlayback(caseDefinition)),
    [visibleCases]
  );
  const startLocalPlayback = useGameStore((state) => state.startLocalPlayback);
  const setLocalSnapshot = useGameStore((state) => state.setLocalSnapshot);
  const clearLocalPlayback = useGameStore((state) => state.clearLocalPlayback);
  const [results, setResults] = useState<GoldenCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [pauseAfterCurrentCase, setPauseAfterCurrentCase] = useState(false);
  const [pausedQueueIndex, setPausedQueueIndex] = useState<number | null>(null);
  const [runRequest, setRunRequest] = useState<GoldenRunRequest>({
    kind: "all",
    resetResults: true,
    serial: 1,
    startIndex: 0,
    targetCaseId: null
  });
  const resultsRef = useRef<GoldenCaseResult[]>([]);
  const pauseAfterCurrentCaseRef = useRef(false);

  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    pauseAfterCurrentCaseRef.current = pauseAfterCurrentCase;
  }, [pauseAfterCurrentCase]);

  const requestRunAll = (startIndex = 0, resetResults = true) => {
    setPausedQueueIndex(null);
    setRunRequest((current) => ({
      kind: "all",
      resetResults,
      serial: current.serial + 1,
      startIndex,
      targetCaseId: null
    }));
  };

  const requestSingleCaseRun = (caseId: string) => {
    setPauseAfterCurrentCase(false);
    setPausedQueueIndex(null);
    setRunRequest((current) => ({
      kind: "single",
      resetResults: true,
      serial: current.serial + 1,
      startIndex: 0,
      targetCaseId: caseId
    }));
  };

  useEffect(() => {
    let cancelled = false;

    async function runCasesSequentially() {
      const requestedPlaybacks =
        runRequest.kind === "single"
          ? playbacks.filter((playback) => playback.result.caseId === runRequest.targetCaseId)
          : playbacks.slice(runRequest.startIndex);
      const completedResults = runRequest.resetResults ? [] : [...resultsRef.current];

      setResults(completedResults);
      setActiveCaseId(null);
      setActiveStepIndex(null);

      if (!requestedPlaybacks.length) {
        clearLocalPlayback();
        setIsRunning(false);
        return;
      }

      setIsRunning(true);

      for (let playbackIndex = 0; playbackIndex < requestedPlaybacks.length; playbackIndex += 1) {
        if (cancelled) {
          return;
        }

        const playback = requestedPlaybacks[playbackIndex]!;
        const queueIndex =
          runRequest.kind === "single"
            ? playbacks.findIndex((item) => item.result.caseId === playback.result.caseId)
            : runRequest.startIndex + playbackIndex;

        setActiveCaseId(playback.result.caseId);
        setActiveStepIndex(null);
        startLocalPlayback(playback.initialSnapshot);
        await sleep(CASE_BOOT_MS);

        for (let stepIndex = 0; stepIndex < playback.steps.length; stepIndex += 1) {
          if (cancelled) {
            return;
          }

          setActiveStepIndex(stepIndex);
          setLocalSnapshot(playback.steps[stepIndex]!.snapshot);
          await sleep(getStepWaitMs(playback, stepIndex));
        }

        const nextResults = upsertResult(completedResults, playback.result);
        completedResults.splice(0, completedResults.length, ...nextResults);
        resultsRef.current = [...completedResults];
        setResults([...completedResults]);
        setActiveStepIndex(null);

        if (
          runRequest.kind === "all" &&
          pauseAfterCurrentCaseRef.current &&
          queueIndex >= 0 &&
          queueIndex < playbacks.length - 1
        ) {
          setPausedQueueIndex(queueIndex + 1);
          setPauseAfterCurrentCase(false);
          setIsRunning(false);
          return;
        }

        if (playbackIndex < requestedPlaybacks.length - 1) {
          await sleep(CASE_GAP_MS);
        }
      }

      if (!cancelled) {
        setPausedQueueIndex(null);
        setPauseAfterCurrentCase(false);
        setIsRunning(false);
      }
    }

    void runCasesSequentially();

    return () => {
      cancelled = true;
      clearLocalPlayback();
    };
  }, [clearLocalPlayback, playbacks, runRequest, setLocalSnapshot, startLocalPlayback]);

  useEffect(() => {
    window.advanceTime = (ms: number) => {
      useGameStore.getState().advanceTime(ms);
    };
    window.watcher_store = useGameStore;
    window.render_game_to_text = () => {
      const storeState = useGameStore.getState();
      const payload = {
        mode: "goldens",
        running: isRunning,
        pauseAfterCurrentCase,
        pausedQueueIndex,
        selectedCaseId,
        activeCaseId,
        activeStepIndex,
        totalCases: playbacks.length,
        completedCases: results.length,
        passedCases: results.filter((result) => result.passed).length,
        failedCases: results.filter((result) => !result.passed).length,
        displayedPlayers: window.watcher_scene_debug?.displayedPlayers ?? {},
        displayedSummons: window.watcher_scene_debug?.displayedSummons ?? {},
        displayedTiles: window.watcher_scene_debug?.displayedTiles ?? {},
        snapshot: storeState.snapshot,
        results: Object.fromEntries(
          results.map((result) => [
            result.caseId,
            {
              passed: result.passed,
              mismatches: result.mismatches,
              boardLayout: result.actual.boardLayout,
              turnInfo: result.actual.turnInfo
            }
          ])
        )
      };

      return JSON.stringify(payload);
    };

    return () => {
      window.advanceTime = undefined;
      window.render_game_to_text = undefined;
      window.watcher_store = undefined;
    };
  }, [activeCaseId, activeStepIndex, isRunning, pauseAfterCurrentCase, pausedQueueIndex, playbacks.length, results, selectedCaseId]);

  const resultsById = useMemo(() => buildResultLookup(results), [results]);
  const activePlayback =
    playbacks.find((playback) => playback.result.caseId === activeCaseId) ?? null;
  const activeResult = activePlayback ? resultsById[activePlayback.result.caseId] ?? null : null;
  const passedCount = results.filter((result) => result.passed).length;
  const failedCount = results.filter((result) => !result.passed).length;

  return (
    <div className="golden-playback-shell">
      <aside className="golden-playback-panel">
        <section className="golden-hero">
          <p className="eyebrow">Golden Playback</p>
          <h1>黄金案例自动回放</h1>
          <p className="lead">
            当前页面直接在浏览器里运行 shared simulator，并把每一步生成的
            `snapshot + presentation` 喂给真实 3D 场景播放。
          </p>
        </section>

        <section className="golden-toolbar">
          <div className="golden-toolbar__stats">
            <span
              className={`status-pill ${
                isRunning ? "status-connecting" : pausedQueueIndex !== null ? "status-error" : "status-connected"
              }`}
            >
              {isRunning ? "播放中" : pausedQueueIndex !== null ? "已暂停" : "已完成"}
            </span>
            <strong>
              {passedCount}/{results.length || playbacks.length} 通过
            </strong>
            <span>{failedCount} 失败</span>
            {selectedCaseId ? <span>过滤案例: {selectedCaseId}</span> : null}
          </div>

          <div className="golden-toolbar__actions">
            <button type="button" onClick={() => requestRunAll(0, true)}>
              重新播放
            </button>
            <button
              type="button"
              disabled={!isRunning || playbacks.length < 2}
              onClick={() => setPauseAfterCurrentCase(true)}
            >
              "暂停"
            </button>
            <button
              type="button"
              disabled={pausedQueueIndex === null || isRunning}
              onClick={() => requestRunAll(pausedQueueIndex ?? 0, false)}
            >
              继续
            </button>
          </div>
        </section>

        {!playbacks.length ? (
          <section className="golden-case-card golden-case-card--empty">
            <h2>未找到案例</h2>
            <p>请检查 URL 里的 `case` 参数是否匹配已注册的案例 id。</p>
          </section>
        ) : (
          <>
            <section className="golden-case-card">
              <header className="golden-case-card__header">
                <div>
                  <p className="eyebrow">Current Case</p>
                  <h2>{activePlayback?.result.title ?? "等待开始"}</h2>
                  <p className="golden-case-card__id">{activePlayback?.result.caseId ?? "--"}</p>
                </div>
                <span
                  className={`status-pill ${
                    !activePlayback
                      ? "status-connecting"
                      : activeResult
                        ? activeResult.passed
                          ? "status-connected"
                          : "status-error"
                        : pausedQueueIndex !== null
                          ? "status-error"
                          : "status-connecting"
                  }`}
                >
                  {!activePlayback
                    ? "等待中"
                    : activeResult
                      ? activeResult.passed
                        ? "通过"
                        : "失败"
                      : pausedQueueIndex !== null
                        ? "已暂停"
                        : "播放中"}
                </span>
              </header>
              <p className="golden-case-card__description">
                {activePlayback?.result.description ?? "案例将按顺序自动加载并播放。"}
              </p>
              {activePlayback ? (
                <ol className="golden-step-list">
                  {activePlayback.steps.map((step, index) => {
                    const stepStatus = getStepStatus(
                      index,
                      activeStepIndex,
                      activePlayback.result.caseId === activeCaseId,
                      Boolean(activeResult)
                    );

                    return (
                      <li
                        key={`${activePlayback.result.caseId}-${step.label}-${index}`}
                        className={`golden-step-item golden-step-item--${stepStatus}`}
                      >
                        <div className="golden-step-item__topline">
                          <strong>{step.label}</strong>
                          <span>{step.stepResult.passed ? "PASS" : "FAIL"}</span>
                        </div>
                        <p>{step.outcome.message}</p>
                      </li>
                    );
                  })}
                </ol>
              ) : null}
              {activeResult ? (
                activeResult.mismatches.length ? (
                  <ul className="golden-list golden-list--errors">
                    {activeResult.mismatches.map((mismatch) => (
                      <li key={mismatch}>{mismatch}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="golden-pass-copy">当前案例的所有断言均已通过。</p>
                )
              ) : null}
            </section>

            <section className="golden-case-card">
              <header className="golden-case-card__header">
                <div>
                  <p className="eyebrow">Case Queue</p>
                  <h2>案例进度</h2>
                </div>
              </header>
              <div className="golden-progress-list">
                {playbacks.map((playback, index) => {
                  const caseStatus = getCaseStatus(
                    playback,
                    activeCaseId,
                    resultsById,
                    isRunning
                  );

                  return (
                    <div
                      key={playback.result.caseId}
                      className={`golden-progress-item golden-progress-item--${caseStatus}`}
                    >
                      <div className="golden-progress-item__meta">
                        <p className="eyebrow">Case {index + 1}</p>
                        <strong>{playback.result.title}</strong>
                        <p className="golden-case-card__id">{playback.result.caseId}</p>
                      </div>
                      <div className="golden-progress-item__actions">
                        <span
                          className={`status-pill ${
                            caseStatus === "passed"
                              ? "status-connected"
                              : caseStatus === "failed"
                                ? "status-error"
                                : "status-connecting"
                          }`}
                        >
                          {caseStatus === "passed"
                            ? "通过"
                            : caseStatus === "failed"
                              ? "失败"
                              : caseStatus === "running"
                                ? "播放中"
                                : "等待中"}
                        </span>
                        <button
                          type="button"
                          data-testid={`golden-play-case-${playback.result.caseId}`}
                          onClick={() => requestSingleCaseRun(playback.result.caseId)}
                        >
                          播放
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </aside>

      <main className="scene-panel golden-scene-panel">
        <GameBoardCanvas />
      </main>
    </div>
  );
}
