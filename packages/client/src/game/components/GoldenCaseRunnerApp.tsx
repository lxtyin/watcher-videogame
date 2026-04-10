import {
  GOLDEN_CASES,
  HEAVY_GOLDEN_CASES,
  buildGoldenCasePlayback,
  type GoldenCaseDefinition,
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
const LONG_FRAME_60FPS_MS = 1000 / 60;
const LONG_FRAME_30FPS_MS = 1000 / 30;
const LONG_FRAME_20FPS_MS = 50;

type RunnerMode = "goldens" | "heavy_goldens";

interface GoldenRunRequest {
  kind: "all" | "single";
  resetResults: boolean;
  serial: number;
  startIndex: number;
  targetCaseId: string | null;
}

interface GoldenCaseRunnerShellProps {
  caseDefinitions: readonly GoldenCaseDefinition[];
  collectPerf: boolean;
  description: string;
  mode: RunnerMode;
  title: string;
}

interface FrameTimeSummary {
  avg: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

interface LongFrameSummary {
  over16_7: number;
  over33_3: number;
  over50: number;
}

interface PresentationPerfSummary {
  count: number;
  maxOverrunRatio: number;
  p95OverrunRatio: number;
  stalledCount: number;
}

interface RendererPerfSummary {
  drawCallsMax: number;
  drawCallsP95: number;
  geometriesMax: number;
  texturesMax: number;
  trianglesMax: number;
  trianglesP95: number;
}

interface ScenePerfSummary {
  maxPlayerMotions: number;
  maxPlayers: number;
  maxProjectiles: number;
  maxQueuedPresentations: number;
  maxReactions: number;
  maxSummons: number;
  maxTiles: number;
}

interface CasePerfSummary {
  caseId: string;
  frameCount: number;
  frameTimeMs: FrameTimeSummary;
  longFrames: LongFrameSummary;
  presentation: PresentationPerfSummary;
  renderer: RendererPerfSummary;
  scene: ScenePerfSummary;
  title: string;
  wallTimeMs: number;
}

interface PerfPayload {
  activeCaseId: string | null;
  completedCases: number;
  frameTimeMs: FrameTimeSummary;
  longFrames: LongFrameSummary;
  mode: RunnerMode;
  presentation: PresentationPerfSummary;
  renderer: RendererPerfSummary;
  results: CasePerfSummary[];
  route: RunnerMode;
  running: boolean;
  scene: ScenePerfSummary;
  selectedCaseId: string | null;
  totalCases: number;
}

interface MutablePresentationTracker {
  authoredDurationMs: number;
  sequence: number;
  startedAtMs: number;
}

interface MutablePerfAccumulator {
  drawCalls: number[];
  frameTimes: number[];
  maxGeometries: number;
  maxPlayerMotions: number;
  maxPlayers: number;
  maxProjectiles: number;
  maxQueuedPresentations: number;
  maxReactions: number;
  maxSummons: number;
  maxTextures: number;
  maxTiles: number;
  over16_7: number;
  over33_3: number;
  over50: number;
  overrunRatios: number[];
  stalledCount: number;
  trackedPresentation: MutablePresentationTracker | null;
  triangles: number[];
}

interface MutableCasePerfAccumulator extends MutablePerfAccumulator {
  caseId: string;
  startedAtMs: number;
  title: string;
}

interface MutablePerfRunState {
  activeCase: MutableCasePerfAccumulator | null;
  aggregate: MutablePerfAccumulator;
  completedCases: CasePerfSummary[];
  selectedCaseId: string | null;
  totalCases: number;
}

function getSelectedCaseId(): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get("case");
}

function getStepWaitMs(playback: GoldenCasePlayback, stepIndex: number): number {
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

  return (currentStep.snapshot.latestPresentation?.durationMs ?? 0) + STEP_PRESENTATION_BUFFER_MS;
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

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function toPercentile(values: number[], percentile: number): number {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const clampedPercentile = Math.min(1, Math.max(0, percentile));
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * clampedPercentile));

  return sorted[index] ?? 0;
}

function summarizeFrameTimes(values: number[]): FrameTimeSummary {
  if (!values.length) {
    return {
      avg: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0
    };
  }

  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    avg: roundMetric(total / values.length),
    max: roundMetric(Math.max(...values)),
    p50: roundMetric(toPercentile(values, 0.5)),
    p95: roundMetric(toPercentile(values, 0.95)),
    p99: roundMetric(toPercentile(values, 0.99))
  };
}

function summarizePresentation(accumulator: MutablePerfAccumulator): PresentationPerfSummary {
  return {
    count: accumulator.overrunRatios.length,
    maxOverrunRatio: roundMetric(Math.max(0, ...accumulator.overrunRatios)),
    p95OverrunRatio: roundMetric(toPercentile(accumulator.overrunRatios, 0.95)),
    stalledCount: accumulator.stalledCount
  };
}

function summarizeRenderer(accumulator: MutablePerfAccumulator): RendererPerfSummary {
  return {
    drawCallsMax: Math.max(0, ...accumulator.drawCalls),
    drawCallsP95: roundMetric(toPercentile(accumulator.drawCalls, 0.95)),
    geometriesMax: accumulator.maxGeometries,
    texturesMax: accumulator.maxTextures,
    trianglesMax: Math.max(0, ...accumulator.triangles),
    trianglesP95: roundMetric(toPercentile(accumulator.triangles, 0.95))
  };
}

function summarizeScene(accumulator: MutablePerfAccumulator): ScenePerfSummary {
  return {
    maxPlayerMotions: accumulator.maxPlayerMotions,
    maxPlayers: accumulator.maxPlayers,
    maxProjectiles: accumulator.maxProjectiles,
    maxQueuedPresentations: accumulator.maxQueuedPresentations,
    maxReactions: accumulator.maxReactions,
    maxSummons: accumulator.maxSummons,
    maxTiles: accumulator.maxTiles
  };
}

function createPerfAccumulator(): MutablePerfAccumulator {
  return {
    drawCalls: [],
    frameTimes: [],
    maxGeometries: 0,
    maxPlayerMotions: 0,
    maxPlayers: 0,
    maxProjectiles: 0,
    maxQueuedPresentations: 0,
    maxReactions: 0,
    maxSummons: 0,
    maxTextures: 0,
    maxTiles: 0,
    over16_7: 0,
    over33_3: 0,
    over50: 0,
    overrunRatios: [],
    stalledCount: 0,
    trackedPresentation: null,
    triangles: []
  };
}

function createCasePerfAccumulator(caseId: string, title: string, startedAtMs: number): MutableCasePerfAccumulator {
  return {
    ...createPerfAccumulator(),
    caseId,
    startedAtMs,
    title
  };
}

function createPerfRunState(
  totalCases: number,
  selectedCaseId: string | null
): MutablePerfRunState {
  return {
    activeCase: null,
    aggregate: createPerfAccumulator(),
    completedCases: [],
    selectedCaseId,
    totalCases
  };
}

function recordFrameSample(accumulator: MutablePerfAccumulator, deltaMs: number): void {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    return;
  }

  accumulator.frameTimes.push(deltaMs);

  if (deltaMs > LONG_FRAME_60FPS_MS) {
    accumulator.over16_7 += 1;
  }

  if (deltaMs > LONG_FRAME_30FPS_MS) {
    accumulator.over33_3 += 1;
  }

  if (deltaMs > LONG_FRAME_20FPS_MS) {
    accumulator.over50 += 1;
  }
}

function flushTrackedPresentation(accumulator: MutablePerfAccumulator, endedAtMs: number): void {
  const tracked = accumulator.trackedPresentation;

  if (!tracked) {
    return;
  }

  const actualDurationMs = Math.max(0, endedAtMs - tracked.startedAtMs);
  const authoredDurationMs = Math.max(1, tracked.authoredDurationMs);
  const overrunRatio = actualDurationMs / authoredDurationMs;

  accumulator.overrunRatios.push(overrunRatio);

  if (overrunRatio > 1.5) {
    accumulator.stalledCount += 1;
  }

  accumulator.trackedPresentation = null;
}

function observePresentation(
  accumulator: MutablePerfAccumulator,
  nowMs: number,
  activePresentation: ReturnType<typeof useGameStore.getState>["activeActionPresentation"]
): void {
  const nextSequence = activePresentation?.sequence ?? null;
  const tracked = accumulator.trackedPresentation;

  if (tracked && tracked.sequence !== nextSequence) {
    flushTrackedPresentation(accumulator, nowMs);
  }

  if (nextSequence === null) {
    return;
  }

  if (!accumulator.trackedPresentation) {
    accumulator.trackedPresentation = {
      authoredDurationMs: Math.max(1, activePresentation?.durationMs ?? 0),
      sequence: nextSequence,
      startedAtMs: nowMs
    };
    return;
  }

  accumulator.trackedPresentation.authoredDurationMs = Math.max(
    1,
    activePresentation?.durationMs ?? accumulator.trackedPresentation.authoredDurationMs
  );
}

function recordPerfMetrics(
  accumulator: MutablePerfAccumulator,
  deltaMs: number,
  nowMs: number,
  storeState: ReturnType<typeof useGameStore.getState>
): void {
  recordFrameSample(accumulator, deltaMs);
  observePresentation(accumulator, nowMs, storeState.activeActionPresentation);

  const sceneDebug = window.watcher_scene_debug;
  const renderStats = window.watcher_render_stats;

  accumulator.maxQueuedPresentations = Math.max(
    accumulator.maxQueuedPresentations,
    storeState.actionPresentationQueue.length
  );

  if (sceneDebug) {
    accumulator.maxPlayerMotions = Math.max(
      accumulator.maxPlayerMotions,
      sceneDebug.playback.activePlayerMotionCount
    );
    accumulator.maxProjectiles = Math.max(
      accumulator.maxProjectiles,
      sceneDebug.playback.activeProjectileCount
    );
    accumulator.maxReactions = Math.max(
      accumulator.maxReactions,
      sceneDebug.playback.activeReactionCount
    );
    accumulator.maxQueuedPresentations = Math.max(
      accumulator.maxQueuedPresentations,
      sceneDebug.playback.queuedPresentationCount
    );
    accumulator.maxTiles = Math.max(accumulator.maxTiles, sceneDebug.scene.tileCount);
    accumulator.maxPlayers = Math.max(accumulator.maxPlayers, sceneDebug.scene.playerCount);
    accumulator.maxSummons = Math.max(accumulator.maxSummons, sceneDebug.scene.summonCount);
  }

  if (renderStats) {
    accumulator.drawCalls.push(renderStats.calls);
    accumulator.triangles.push(renderStats.triangles);
    accumulator.maxGeometries = Math.max(accumulator.maxGeometries, renderStats.geometries);
    accumulator.maxTextures = Math.max(accumulator.maxTextures, renderStats.textures);
  }
}

function finalizeCasePerfSummary(
  accumulator: MutableCasePerfAccumulator,
  endedAtMs: number
): CasePerfSummary {
  flushTrackedPresentation(accumulator, endedAtMs);

  return {
    caseId: accumulator.caseId,
    frameCount: accumulator.frameTimes.length,
    frameTimeMs: summarizeFrameTimes(accumulator.frameTimes),
    longFrames: {
      over16_7: accumulator.over16_7,
      over33_3: accumulator.over33_3,
      over50: accumulator.over50
    },
    presentation: summarizePresentation(accumulator),
    renderer: summarizeRenderer(accumulator),
    scene: summarizeScene(accumulator),
    title: accumulator.title,
    wallTimeMs: roundMetric(endedAtMs - accumulator.startedAtMs)
  };
}

function buildPerfPayload(
  mode: RunnerMode,
  isRunning: boolean,
  activeCaseId: string | null,
  selectedCaseId: string | null,
  perfRun: MutablePerfRunState
): PerfPayload {
  const aggregate = perfRun.aggregate;

  return {
    activeCaseId,
    completedCases: perfRun.completedCases.length,
    frameTimeMs: summarizeFrameTimes(aggregate.frameTimes),
    longFrames: {
      over16_7: aggregate.over16_7,
      over33_3: aggregate.over33_3,
      over50: aggregate.over50
    },
    mode,
    presentation: summarizePresentation(aggregate),
    renderer: summarizeRenderer(aggregate),
    results: perfRun.completedCases,
    route: mode,
    running: isRunning,
    scene: summarizeScene(aggregate),
    selectedCaseId,
    totalCases: perfRun.totalCases
  };
}

function GoldenCaseRunnerShell({
  caseDefinitions,
  collectPerf,
  description,
  mode,
  title
}: GoldenCaseRunnerShellProps) {
  useAnimationClock();

  const selectedCaseId = useMemo(() => getSelectedCaseId(), []);
  const visibleCases = useMemo(
    () =>
      selectedCaseId
        ? caseDefinitions.filter((caseDefinition) => caseDefinition.id === selectedCaseId)
        : caseDefinitions,
    [caseDefinitions, selectedCaseId]
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
  const lastPerfSampleAtRef = useRef<number | null>(null);
  const perfRunRef = useRef<MutablePerfRunState>(
    createPerfRunState(playbacks.length, selectedCaseId)
  );
  const runnerStatusRef = useRef({
    activeCaseId: null as string | null,
    activeStepIndex: null as number | null,
    completedCases: 0,
    isRunning: false,
    pausedQueueIndex: null as number | null
  });

  useEffect(() => {
    resultsRef.current = results;
    runnerStatusRef.current.completedCases = results.length;
  }, [results]);

  useEffect(() => {
    pauseAfterCurrentCaseRef.current = pauseAfterCurrentCase;
  }, [pauseAfterCurrentCase]);

  useEffect(() => {
    runnerStatusRef.current.activeCaseId = activeCaseId;
    runnerStatusRef.current.activeStepIndex = activeStepIndex;
    runnerStatusRef.current.isRunning = isRunning;
    runnerStatusRef.current.pausedQueueIndex = pausedQueueIndex;
  }, [activeCaseId, activeStepIndex, isRunning, pausedQueueIndex]);

  useEffect(() => {
    if (!collectPerf) {
      return;
    }

    let frameId = 0;

    const loop = (nowMs: number) => {
      if (runnerStatusRef.current.isRunning) {
        const previousSampleAtMs = lastPerfSampleAtRef.current;

        if (previousSampleAtMs !== null) {
          const deltaMs = nowMs - previousSampleAtMs;
          const storeState = useGameStore.getState();

          recordPerfMetrics(perfRunRef.current.aggregate, deltaMs, nowMs, storeState);

          if (perfRunRef.current.activeCase) {
            recordPerfMetrics(perfRunRef.current.activeCase, deltaMs, nowMs, storeState);
          }
        }
      }

      lastPerfSampleAtRef.current = nowMs;
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [collectPerf]);

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

      perfRunRef.current = createPerfRunState(requestedPlaybacks.length, selectedCaseId);
      lastPerfSampleAtRef.current = null;
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

        perfRunRef.current.activeCase = collectPerf
          ? createCasePerfAccumulator(playback.result.caseId, playback.result.title, performance.now())
          : null;
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

        if (collectPerf && perfRunRef.current.activeCase) {
          const finishedCaseSummary = finalizeCasePerfSummary(
            perfRunRef.current.activeCase,
            performance.now()
          );
          perfRunRef.current.completedCases.push(finishedCaseSummary);
          perfRunRef.current.activeCase = null;
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
  }, [
    clearLocalPlayback,
    collectPerf,
    playbacks,
    runRequest,
    selectedCaseId,
    setLocalSnapshot,
    startLocalPlayback
  ]);

  useEffect(() => {
    window.advanceTime = (ms: number) => {
      useGameStore.getState().advanceTime(ms);
    };
    window.watcher_store = useGameStore;
    window.render_game_to_text = () => {
      const storeState = useGameStore.getState();
      const payload = {
        activeCaseId: runnerStatusRef.current.activeCaseId,
        activeStepIndex: runnerStatusRef.current.activeStepIndex,
        completedCases: runnerStatusRef.current.completedCases,
        displayedPlayers: window.watcher_scene_debug?.displayedPlayers ?? {},
        displayedSummons: window.watcher_scene_debug?.displayedSummons ?? {},
        displayedTiles: window.watcher_scene_debug?.displayedTiles ?? {},
        failedCases: resultsRef.current.filter((result) => !result.passed).length,
        mode,
        pauseAfterCurrentCase: pauseAfterCurrentCaseRef.current,
        pausedQueueIndex: runnerStatusRef.current.pausedQueueIndex,
        passedCases: resultsRef.current.filter((result) => result.passed).length,
        results: Object.fromEntries(
          resultsRef.current.map((result) => [
            result.caseId,
            {
              boardLayout: result.actual.boardLayout,
              mismatches: result.mismatches,
              passed: result.passed,
              turnInfo: result.actual.turnInfo
            }
          ])
        ),
        running: runnerStatusRef.current.isRunning,
        selectedCaseId,
        snapshot: storeState.snapshot,
        totalCases: playbacks.length
      };

      return JSON.stringify(payload);
    };
    window.render_perf_to_text = () => {
      return JSON.stringify(
        buildPerfPayload(
          mode,
          runnerStatusRef.current.isRunning,
          runnerStatusRef.current.activeCaseId,
          selectedCaseId,
          perfRunRef.current
        )
      );
    };

    return () => {
      window.advanceTime = undefined;
      window.render_game_to_text = undefined;
      window.render_perf_to_text = undefined;
      window.watcher_store = undefined;
    };
  }, [mode, playbacks.length, selectedCaseId]);

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
          <p className="eyebrow">{collectPerf ? "Heavy Playback" : "Golden Playback"}</p>
          <h1>{title}</h1>
          <p className="lead">{description}</p>
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
              暂停
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

export function GoldenCaseRunnerApp() {
  return (
    <GoldenCaseRunnerShell
      caseDefinitions={GOLDEN_CASES}
      collectPerf={false}
      description="当前页面会直接在浏览器里运行 small golden cases，重点验证规则链路与基础表现是否稳定。"
      mode="goldens"
      title="黄金案例自动回放"
    />
  );
}

export function HeavyGoldenCaseRunnerApp() {
  return (
    <GoldenCaseRunnerShell
      caseDefinitions={HEAVY_GOLDEN_CASES}
      collectPerf
      description="当前页面会回放 heavy cases，重点覆盖大地图、多地形、多步骤工具与复杂表现链路，并对真实浏览器渲染进行性能采样。"
      mode="heavy_goldens"
      title="Heavy Cases 性能回放"
    />
  );
}
