"use client";

import { Crop, LoaderCircle, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

const defaultViewportSize = 320;
const outputSize = 512;

type Point = { x: number; y: number };
type ImageSize = { width: number; height: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const displayedSize = (
  image: ImageSize,
  zoom: number,
  viewportSize = defaultViewportSize
) => {
  const ratio = image.width / image.height;
  const baseWidth = ratio >= 1 ? viewportSize * ratio : viewportSize;
  const baseHeight = ratio >= 1 ? viewportSize : viewportSize / ratio;
  return {
    width: baseWidth * zoom,
    height: baseHeight * zoom
  };
};

const clampOffset = (
  offset: Point,
  image: ImageSize,
  zoom: number,
  viewportSize = defaultViewportSize
) => {
  const displayed = displayedSize(image, zoom, viewportSize);
  const maxX = Math.max(0, (displayed.width - viewportSize) / 2);
  const maxY = Math.max(0, (displayed.height - viewportSize) / 2);
  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY)
  };
};

const canvasBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("사진을 압축하지 못했습니다.")),
      "image/webp",
      0.84
    );
  });

export function AvatarCropper({
  file,
  onCancel,
  onConfirm,
  returnFocusRef
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pointerRef = useRef<{ id: number; start: Point; offset: Point } | null>(null);
  const cancelRef = useRef(onCancel);
  const savingRef = useRef(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>({ width: 1, height: 1 });
  const [imageReady, setImageReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  cancelRef.current = onCancel;
  savingRef.current = saving;

  const viewportSize = () => viewportRef.current?.clientWidth || defaultViewportSize;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setImageReady(false);
    setError("");
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current) {
        event.preventDefault();
        cancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [tabindex='0']"
      )).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      returnFocusRef?.current?.focus();
    };
  }, [returnFocusRef]);

  const changeZoom = (value: number) => {
    const nextZoom = clamp(value, 1, 3);
    setZoom(nextZoom);
    setOffset((current) => clampOffset(
      current,
      imageSize,
      nextZoom,
      viewportSize()
    ));
  };

  const nudgeImage = (x: number, y: number) => {
    setOffset((current) => clampOffset(
      { x: current.x + x, y: current.y + y },
      imageSize,
      zoom,
      viewportSize()
    ));
  };

  const confirm = async () => {
    const image = imageRef.current;
    if (!imageReady || !image || !image.complete) {
      setError("사진을 불러오는 중입니다. 잠시만 기다려주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("사진 편집기를 시작하지 못했습니다.");

      const currentViewportSize = viewportSize();
      const displayed = displayedSize(imageSize, zoom, currentViewportSize);
      const outputScale = outputSize / currentViewportSize;
      const drawX = (currentViewportSize / 2 + offset.x - displayed.width / 2) * outputScale;
      const drawY = (currentViewportSize / 2 + offset.y - displayed.height / 2) * outputScale;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, outputSize, outputSize);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        drawX,
        drawY,
        displayed.width * outputScale,
        displayed.height * outputScale
      );

      const blob = await canvasBlob(canvas);
      await onConfirm(new File([blob], `avatar-${Date.now()}.webp`, {
        type: "image/webp",
        lastModified: Date.now()
      }));
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "사진을 편집하지 못했습니다.");
      setSaving(false);
    }
  };

  return (
    <div
      className="avatar-crop-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <section
        ref={dialogRef}
        className="avatar-crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
      >
        <header>
          <div>
            <span><Crop size={15} /> 프로필 사진</span>
            <h2 id="avatar-crop-title">보일 영역을 맞춰주세요</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="닫기"
            onClick={onCancel}
            disabled={saving}
          >
            <X size={20} />
          </button>
        </header>

        <div
          ref={viewportRef}
          className="avatar-crop-viewport"
          role="group"
          tabIndex={0}
          aria-label="사진 위치 조정. 방향키로 사진을 움직일 수 있습니다."
          onKeyDown={(event) => {
            const step = event.shiftKey ? 15 : 5;
            if (event.key === "ArrowLeft") nudgeImage(-step, 0);
            else if (event.key === "ArrowRight") nudgeImage(step, 0);
            else if (event.key === "ArrowUp") nudgeImage(0, -step);
            else if (event.key === "ArrowDown") nudgeImage(0, step);
            else return;
            event.preventDefault();
          }}
          onPointerDown={(event) => {
            if (saving || !imageReady) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            pointerRef.current = {
              id: event.pointerId,
              start: { x: event.clientX, y: event.clientY },
              offset
            };
          }}
          onPointerMove={(event) => {
            const pointer = pointerRef.current;
            if (!pointer || pointer.id !== event.pointerId || saving) return;
            setOffset(clampOffset({
              x: pointer.offset.x + event.clientX - pointer.start.x,
              y: pointer.offset.y + event.clientY - pointer.start.y
            }, imageSize, zoom, viewportSize()));
          }}
          onPointerUp={(event) => {
            if (pointerRef.current?.id === event.pointerId) pointerRef.current = null;
          }}
          onPointerCancel={() => {
            pointerRef.current = null;
          }}
        >
          {sourceUrl ? (
            <img
              ref={imageRef}
              src={sourceUrl}
              alt=""
              draggable={false}
              data-landscape={imageSize.width >= imageSize.height}
              style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`
              }}
              onLoad={(event) => {
                const nextSize = {
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight
                };
                setImageSize(nextSize);
                setOffset({ x: 0, y: 0 });
                setImageReady(true);
              }}
              onError={() => {
                setImageReady(false);
                setError("이 사진을 불러올 수 없습니다. 다른 사진을 선택해주세요.");
              }}
            />
          ) : null}
          <div className="avatar-crop-mask" aria-hidden="true" />
        </div>

        <div className="avatar-crop-zoom">
          <Minus size={17} />
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            disabled={!imageReady || saving}
            aria-label="사진 확대"
          />
          <Plus size={17} />
        </div>
        <p>사진을 움직이거나 확대해 얼굴이 원 안에 들어오도록 맞춰주세요.</p>
        {error ? <p className="avatar-crop-error">{error}</p> : null}

        <footer>
          <button type="button" onClick={onCancel} disabled={saving}>취소</button>
          <button
            type="button"
            className="primary"
            onClick={() => void confirm()}
            disabled={saving || !imageReady}
          >
            {saving || !imageReady ? <LoaderCircle className="spin" size={17} /> : <Crop size={17} />}
            {saving ? "최적화 중" : imageReady ? "이대로 적용" : "사진 준비 중"}
          </button>
        </footer>
      </section>
    </div>
  );
}
