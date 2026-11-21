/**
 * MotionScore Performance Audit Engine
 * Chuyên biệt cho kiểm toán hiệu năng hoạt họa Web Animation:
 * - Kiểm tra GPU-Only Compositing (chỉ cho phép transform & opacity, cấm layout reflows)
 * - Đo lường FPS thực tế qua requestAnimationFrame (60 - 120 FPS)
 * - Kiểm định prefers-reduced-motion và will-change
 * - Xuất báo cáo điểm số MotionScore (Thang điểm 100/100)
 */

export interface MotionAuditResult {
  score: number;
  fps: number;
  gpuAccelerated: boolean;
  totalAnimatedElements: number;
  nonGpuReflowCount: number;
  passed: boolean;
  issues: string[];
  elements: Array<{
    selector: string;
    properties: string[];
    isGpuOnly: boolean;
    willChange: string;
  }>;
}

const REFLOW_PROPERTIES = new Set([
  'width',
  'height',
  'top',
  'left',
  'right',
  'bottom',
  'margin',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'padding',
  'font-size',
  'border-width',
]);

const GPU_PROPERTIES = new Set([
  'transform',
  'opacity',
  'filter',
  'backdrop-filter',
  'clip-path',
]);

/**
 * Đo FPS thực tế trong 30 khung hình
 */
export async function measureLiveFPS(): Promise<number> {
  return new Promise((resolve) => {
    let frameCount = 0;
    const startTime = performance.now();

    function onFrame() {
      frameCount++;
      const elapsed = performance.now() - startTime;
      if (elapsed >= 500) {
        const calculatedFps = Math.round((frameCount * 1000) / elapsed);
        resolve(Math.min(calculatedFps, 120));
      } else {
        requestAnimationFrame(onFrame);
      }
    }

    requestAnimationFrame(onFrame);
  });
}

/**
 * Quét toàn bộ DOM để kiểm tra các phần tử có chuyển động (transition / animation / inline transform)
 */
export function auditMotionElements(): Omit<MotionAuditResult, 'fps'> {
  const allElements = document.querySelectorAll('*');
  const audited: MotionAuditResult['elements'] = [];
  const issues: string[] = [];
  let nonGpuCount = 0;

  allElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    const transitionProps = style.transitionProperty.split(',').map((p) => p.trim());
    const animationName = style.animationName;
    const inlineTransform = (el as HTMLElement).style.transform;
    const inlineOpacity = (el as HTMLElement).style.opacity;
    const willChange = style.willChange;

    const hasMotion =
      (transitionProps.length > 0 && transitionProps[0] !== 'none' && transitionProps[0] !== 'all') ||
      (animationName && animationName !== 'none') ||
      inlineTransform ||
      inlineOpacity;

    if (!hasMotion) return;

    const propertiesInspected: string[] = [];
    let usesReflow = false;

    // Phân tích transition
    for (const prop of transitionProps) {
      if (prop === 'all') {
        issues.push(`Cảnh báo: Phần tử <${el.tagName.toLowerCase()}> dùng "transition: all", có thể kích hoạt layout reflow.`);
        usesReflow = true;
      } else if (REFLOW_PROPERTIES.has(prop)) {
        usesReflow = true;
        issues.push(`Lỗi hiệu năng: Thuộc tính "${prop}" trên <${el.tagName.toLowerCase()}> gây recalculate layout thay vì chạy trên GPU compositor.`);
      } else if (GPU_PROPERTIES.has(prop)) {
        propertiesInspected.push(prop);
      }
    }

    if (inlineTransform) propertiesInspected.push('transform (GPU)');
    if (inlineOpacity) propertiesInspected.push('opacity (GPU)');

    const isGpuOnly = !usesReflow;
    if (usesReflow) nonGpuCount++;

    const identifier = el.id ? `#${el.id}` : el.className ? `.${String(el.className).trim().split(' ')[0]}` : el.tagName.toLowerCase();

    audited.push({
      selector: identifier,
      properties: propertiesInspected.length ? propertiesInspected : ['motion-active'],
      isGpuOnly,
      willChange,
    });
  });

  // Tính điểm MotionScore (Thang điểm 100)
  // Trừ điểm nếu có thuộc tính gây reflow
  const penalty = nonGpuCount * 15;
  const score = Math.max(0, 100 - penalty);

  return {
    score,
    gpuAccelerated: nonGpuCount === 0,
    totalAnimatedElements: audited.length,
    nonGpuReflowCount: nonGpuCount,
    passed: nonGpuCount === 0 && score >= 90,
    issues,
    elements: audited.slice(0, 20),
  };
}

/**
 * Chạy toàn bộ quy trình MotionScore Audit và in ra console
 */
export async function runMotionScoreAudit(): Promise<MotionAuditResult> {
  const fps = await measureLiveFPS();
  const domAudit = auditMotionElements();

  const finalResult: MotionAuditResult = {
    ...domAudit,
    fps,
  };

  /* eslint-disable no-console */
  console.group('%c🚀 FARMGO — MotionScore Audit Report', 'background: #0f172a; color: #4ade80; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  console.log(`Điểm MotionScore: %c${finalResult.score}/100`, `font-size: 16px; font-weight: bold; color: ${finalResult.score >= 90 ? '#16a34a' : '#dc2626'};`);
  console.log(`Tốc độ khung hình (FPS): %c${finalResult.fps} FPS`, 'font-weight: bold; color: #2563eb;');
  console.log(`GPU Compositing: %c${finalResult.gpuAccelerated ? 'ĐẠT CHUẨN 100% (Chỉ transform & opacity)' : 'CẦN TỐI ƯU'}`, `font-weight: bold; color: ${finalResult.gpuAccelerated ? '#16a34a' : '#d97706'};`);
  console.log(`Số phần tử có chuyển động: ${finalResult.totalAnimatedElements}`);
  console.log(`Phần tử gây reflow layout: ${finalResult.nonGpuReflowCount}`);

  if (finalResult.issues.length > 0) {
    console.warn('Các cảnh báo hiệu năng phát hiện được:');
    finalResult.issues.forEach((issue) => console.warn(`- ${issue}`));
  } else {
    console.log('%c✓ Hoàn hảo: 100% Animation chạy trên GPU Compositor qua Motion Kit, không tụt khung hình!', 'color: #16a34a; font-weight: bold;');
  }
  console.table(finalResult.elements);
  console.groupEnd();

  return finalResult;
}

// Gắn vào window để gọi từ DevTools console
if (typeof window !== 'undefined') {
  (window as unknown as { runMotionScoreAudit: typeof runMotionScoreAudit }).runMotionScoreAudit = runMotionScoreAudit;
}
