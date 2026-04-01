import {
  GOLDEN_CASES,
  runGoldenCase,
  type GoldenCaseDefinition,
  type GoldenCaseResult
} from "@watcher/shared";
import { startTransition, useEffect, useMemo, useState } from "react";

function getSelectedCaseId(): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get("case");
}

function toCaseLookup(results: GoldenCaseResult[]): Record<string, GoldenCaseResult> {
  return Object.fromEntries(results.map((result) => [result.caseId, result]));
}

// Web runner executes the same shared golden cases one by one so failures stay easy to inspect.
export function GoldenCaseRunnerApp() {
  const selectedCaseId = useMemo(() => getSelectedCaseId(), []);
  const visibleCases = useMemo(
    () =>
      selectedCaseId
        ? GOLDEN_CASES.filter((caseDefinition) => caseDefinition.id === selectedCaseId)
        : GOLDEN_CASES,
    [selectedCaseId]
  );
  const [results, setResults] = useState<GoldenCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runSerial, setRunSerial] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function runCasesSequentially() {
      setResults([]);
      setIsRunning(true);

      const nextResults: GoldenCaseResult[] = [];

      for (const caseDefinition of visibleCases) {
        if (cancelled) {
          return;
        }

        const result = runGoldenCase(caseDefinition);
        nextResults.push(result);

        startTransition(() => {
          setResults([...nextResults]);
        });

        await new Promise((resolve) => {
          window.setTimeout(resolve, 50);
        });
      }

      if (!cancelled) {
        setIsRunning(false);
      }
    }

    void runCasesSequentially();

    return () => {
      cancelled = true;
    };
  }, [runSerial, visibleCases]);

  useEffect(() => {
    const payload = {
      mode: "goldens",
      running: isRunning,
      selectedCaseId,
      totalCases: visibleCases.length,
      completedCases: results.length,
      passedCases: results.filter((result) => result.passed).length,
      failedCases: results.filter((result) => !result.passed).length,
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

    window.advanceTime = undefined;
    window.render_game_to_text = () => JSON.stringify(payload);

    return () => {
      window.render_game_to_text = undefined;
    };
  }, [isRunning, results, selectedCaseId, visibleCases.length]);

  const caseResultsById = useMemo(() => toCaseLookup(results), [results]);
  const passedCount = results.filter((result) => result.passed).length;
  const failedCount = results.filter((result) => !result.passed).length;

  return (
    <div className="golden-shell">
      <section className="golden-hero">
        <p className="eyebrow">Golden Cases</p>
        <h1>黄金案例测试台</h1>
        <p className="lead">
          同一份案例配置同时驱动命令行和 Web 端验证。你可以通过
          <code> npm run goldens</code>
          执行全部案例，也可以打开这个页面逐条查看结果。
        </p>
      </section>

      <section className="golden-toolbar">
        <div className="golden-toolbar__stats">
          <span className={`status-pill ${isRunning ? "status-connecting" : "status-connected"}`}>
            {isRunning ? "运行中" : "已完成"}
          </span>
          <strong>
            {passedCount}/{results.length || visibleCases.length} 通过
          </strong>
          <span>{failedCount} 失败</span>
          {selectedCaseId ? <span>过滤案例: {selectedCaseId}</span> : null}
        </div>

        <button type="button" onClick={() => setRunSerial((value) => value + 1)}>
          重新运行
        </button>
      </section>

      {!visibleCases.length ? (
        <section className="golden-case-card golden-case-card--empty">
          <h2>未找到案例</h2>
          <p>请检查 URL 中的 `case` 参数是否匹配已注册的案例 id。</p>
        </section>
      ) : (
        <section className="golden-case-list">
          {visibleCases.map((caseDefinition, index) => (
            <GoldenCaseCard
              key={caseDefinition.id}
              caseDefinition={caseDefinition}
              index={index}
              result={caseResultsById[caseDefinition.id] ?? null}
            />
          ))}
        </section>
      )}
    </div>
  );
}

interface GoldenCaseCardProps {
  caseDefinition: GoldenCaseDefinition;
  index: number;
  result: GoldenCaseResult | null;
}

function GoldenCaseCard({ caseDefinition, index, result }: GoldenCaseCardProps) {
  return (
    <article className="golden-case-card">
      <header className="golden-case-card__header">
        <div>
          <p className="eyebrow">Case {index + 1}</p>
          <h2>{caseDefinition.title}</h2>
          <p className="golden-case-card__id">{caseDefinition.id}</p>
        </div>

        <span
          className={`status-pill ${
            !result ? "status-connecting" : result.passed ? "status-connected" : "status-error"
          }`}
        >
          {!result ? "等待中" : result.passed ? "通过" : "失败"}
        </span>
      </header>

      {caseDefinition.description ? (
        <p className="golden-case-card__description">{caseDefinition.description}</p>
      ) : null}

      {result ? (
        <>
          <div className="golden-case-card__grid">
            <section className="golden-subcard">
              <h3>步骤结果</h3>
              <ul className="golden-list">
                {result.stepResults.map((stepResult) => (
                  <li key={stepResult.label}>
                    <strong>{stepResult.passed ? "PASS" : "FAIL"}</strong>
                    <span>{stepResult.label}</span>
                    <span>{stepResult.message}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="golden-subcard">
              <h3>断言结果</h3>
              {result.mismatches.length ? (
                <ul className="golden-list golden-list--errors">
                  {result.mismatches.map((mismatch) => (
                    <li key={mismatch}>{mismatch}</li>
                  ))}
                </ul>
              ) : (
                <p className="golden-pass-copy">所有断言均通过。</p>
              )}
            </section>
          </div>

          <div className="golden-case-card__grid">
            <section className="golden-subcard">
              <h3>期望地图</h3>
              <pre>{(caseDefinition.expect.boardLayout ?? caseDefinition.scene.layout).join("\n")}</pre>
            </section>

            <section className="golden-subcard">
              <h3>实际地图</h3>
              <pre>{result.actual.boardLayout.join("\n")}</pre>
            </section>
          </div>

          <section className="golden-subcard">
            <h3>最终状态摘要</h3>
            <pre>{JSON.stringify(result.actual, null, 2)}</pre>
          </section>
        </>
      ) : (
        <p className="golden-pending-copy">正在运行案例...</p>
      )}
    </article>
  );
}
