"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  FileSearch,
  RefreshCw,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { communityApiUrl } from "@/lib/community-api";
import type {
  PosterAnalysisApplyValue,
  PosterAnalysisResult
} from "@/lib/poster-analysis";

type PosterMedia = {
  key?: string;
  url: string;
  name: string;
  contentType: string;
};

type PosterAnalyzerProps = {
  category: string;
  images: PosterMedia[];
  onApply: (value: PosterAnalysisApplyValue) => void;
};

const apiUrl = () => communityApiUrl("/api/poster-analysis/");

export function PosterAnalyzer({ category, images, onApply }: PosterAnalyzerProps) {
  const [selectedUrl, setSelectedUrl] = useState("");
  const [analysis, setAnalysis] = useState<PosterAnalysisResult | null>(null);
  const [editableTitle, setEditableTitle] = useState("");
  const [editableBody, setEditableBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const availableImages = useMemo(
    () => images.filter((item) => item.contentType.startsWith("image/")),
    [images]
  );
  const selected = availableImages.find((item) => item.url === selectedUrl) || availableImages[0];

  useEffect(() => {
    if (!availableImages.length) {
      setSelectedUrl("");
      setAnalysis(null);
      return;
    }
    if (!availableImages.some((item) => item.url === selectedUrl)) {
      setSelectedUrl(availableImages[0].url);
      setAnalysis(null);
    }
  }, [availableImages, selectedUrl]);

  useEffect(() => {
    setAnalysis(null);
    setError("");
    setApplied(false);
  }, [category, selectedUrl]);

  if (!["events", "promotion"].includes(category) || !selected) return null;

  const analyze = async (refresh = false) => {
    setPending(true);
    setError("");
    setApplied(false);
    try {
      const response = await fetch(apiUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: selected.key,
          url: selected.url,
          category,
          refresh
        })
      });
      const data = await response.json() as {
        analysis?: PosterAnalysisResult;
        error?: string;
      };
      if (!response.ok || !data.analysis) {
        throw new Error(data.error || "포스터를 분석하지 못했습니다.");
      }
      setAnalysis(data.analysis);
      setEditableTitle(data.analysis.title);
      setEditableBody(data.analysis.draftBody);
    } catch (analysisError) {
      setAnalysis(null);
      setError(analysisError instanceof Error ? analysisError.message : "포스터를 분석하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const apply = () => {
    if (!analysis || !editableBody.trim()) return;
    onApply({
      title: editableTitle.trim(),
      body: editableBody.trim(),
      tags: analysis.tags
    });
    setApplied(true);
  };

  return (
    <section className="poster-analyzer" aria-labelledby="poster-analyzer-title">
      <header className="poster-analyzer-head">
        <span className="poster-analyzer-icon"><WandSparkles size={20} /></span>
        <div>
          <strong id="poster-analyzer-title">포스터 내용을 글로 정리하기</strong>
          <p>날짜, 장소, 참가비 같은 정보를 읽어 편집 가능한 초안으로 만듭니다.</p>
        </div>
        {availableImages.length > 1 ? (
          <label>
            <span>분석할 이미지</span>
            <select value={selected.url} onChange={(event) => setSelectedUrl(event.target.value)}>
              {availableImages.map((item) => (
                <option key={item.url} value={item.url}>{item.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {!analysis ? (
        <div className="poster-analyzer-start">
          <img src={selected.url} alt={`${selected.name} 분석 미리보기`} />
          <div>
            <strong>{selected.name}</strong>
            <p>분석 결과는 바로 게시되지 않습니다. 내용을 확인하고 직접 본문에 넣어주세요.</p>
            <button type="button" onClick={() => void analyze()} disabled={pending}>
              {pending ? <RefreshCw className="stream-spinner" size={18} /> : <Sparkles size={18} />}
              {pending ? "포스터 읽는 중" : "포스터 AI 분석"}
            </button>
          </div>
        </div>
      ) : (
        <div className="poster-analysis-result">
          <div className="poster-analysis-summary">
            <span className={analysis.confidence >= 0.7 ? "is-confident" : "needs-review"}>
              {analysis.confidence >= 0.7 ? <Check size={15} /> : <AlertTriangle size={15} />}
              인식률 {Math.round(analysis.confidence * 100)}%
            </span>
            {analysis.cached ? <span>저장된 분석</span> : <span>새 분석</span>}
            <button type="button" onClick={() => void analyze(true)} disabled={pending} title="다시 분석">
              <RefreshCw className={pending ? "stream-spinner" : ""} size={16} />
              다시 분석
            </button>
          </div>

          {analysis.uncertainFields.length ? (
            <div className="poster-analysis-warning">
              <AlertTriangle size={17} />
              <p>
                <strong>한 번 더 확인해주세요</strong>
                <span>{analysis.uncertainFields.join(", ")}</span>
              </p>
            </div>
          ) : null}

          <label>
            제목 초안
            <input
              value={editableTitle}
              onChange={(event) => setEditableTitle(event.target.value)}
              maxLength={120}
            />
          </label>
          <label>
            본문 초안
            <textarea
              value={editableBody}
              onChange={(event) => setEditableBody(event.target.value)}
              rows={14}
              maxLength={4000}
            />
          </label>

          {analysis.sourceTextPreview ? (
            <details className="poster-source-text">
              <summary><FileSearch size={16} /> 포스터에서 읽은 문구</summary>
              <p>{analysis.sourceTextPreview}</p>
            </details>
          ) : null}

          <div className="poster-analysis-actions">
            <p>날짜, 장소, 가격은 포스터 원본과 꼭 대조해주세요.</p>
            <button type="button" onClick={apply} disabled={!editableBody.trim()}>
              <WandSparkles size={18} />
              {applied ? "글에 넣었습니다" : "초안을 글에 넣기"}
            </button>
          </div>
        </div>
      )}

      {error ? <p className="poster-analysis-error" role="alert">{error}</p> : null}
    </section>
  );
}
