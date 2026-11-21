/**
 * Auto-animator using Animate.css for FARMGO B2B
 * Tự động áp dụng các hiệu ứng Animate.css tinh tế, chuẩn UI/UX:
 * - fadeInUp: Thẻ card & Tiêu đề khi cuộn / render
 * - zoomIn: Các thẻ số liệu (metrics), badge, nổi bật
 * - pulse: Hiệu ứng nhấn (tactile feedback) cho tất cả nút bấm
 */

export function initAutoAnimate(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  // 1. Kiểm tra tùy chọn giảm chuyển động của hệ điều hành (Accessibility - a11y)
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotionQuery.matches) {
    return () => {};
  }

  // 2. Hiệu ứng nhấn (Pulse) tự động cho nút bấm qua Event Delegation
  const handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const button = target.closest<HTMLElement>(
      'button, .btn-primary, .btn-secondary, [role="button"], .role-tab-btn, .portal-link, .btn-reset-slim, .catalog-tabs button, .btn-qr-trigger, .btn-share-bio, .btn-open-qr'
    );

    if (!button || button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') {
      return;
    }

    // Kích hoạt nhịp pulse nhẹ nhàng, chuẩn micro-interaction
    button.classList.remove('animate__animated', 'animate__pulse', 'animate__pulse-click');
    void button.offsetWidth; // Buộc reflow để trigger lại ngay cả khi click liên tục
    button.classList.add('animate__animated', 'animate__pulse-click');

    const handleAnimEnd = () => {
      button.classList.remove('animate__animated', 'animate__pulse', 'animate__pulse-click');
      button.removeEventListener('animationend', handleAnimEnd);
    };

    button.addEventListener('animationend', handleAnimEnd, { once: true });
    setTimeout(handleAnimEnd, 350); // Fallback giải phóng class
  };

  document.addEventListener('click', handleDocumentClick, true);

  // 3. IntersectionObserver cho hiệu ứng xuất hiện (fadeInUp, zoomIn)
  const observerOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 0px -30px 0px',
    threshold: 0.08,
  };

  const entranceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const el = entry.target as HTMLElement;
      if (el.dataset.animated === 'true') {
        entranceObserver.unobserve(el);
        return;
      }

      el.dataset.animated = 'true';

      // Phân bổ hiệu ứng: zoomIn cho card số liệu / badge / điểm nhấn; fadeInUp cho card nội dung & tiêu đề
      const isZoomTarget = el.matches(
        '.metric-box, .overview-metrics > div, .hero-stamp, .bio-qr-modal-card, .badge-certification, .demo-chip'
      );
      const animClass = isZoomTarget ? 'animate__zoomIn' : 'animate__fadeInUp';

      // Hiệu ứng cascade / stagger tinh tế cho danh sách các thẻ liền kề
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) =>
          child.matches('.card, .market-card, .fruit-listing-card, .supplier-card, .metric-box, .home-categories a')
        );
        const index = siblings.indexOf(el);
        if (index > 0) {
          const delay = Math.min(index * 0.05, 0.32); // Tối đa 320ms để không tạo cảm giác trễ
          el.style.animationDelay = `${delay}s`;
        }
      }

      el.classList.add('animate__animated', animClass);
      entranceObserver.unobserve(el);
    });
  }, observerOptions);

  // Danh sách các bộ chọn tự động phát hiện Tiêu đề và Thẻ Card
  const targetSelector = [
    'h1:not(.animate__animated)',
    'h2:not(.animate__animated)',
    'h3:not(.animate__animated)',
    '.card:not(.animate__animated)',
    '.market-card:not(.animate__animated)',
    '.fruit-listing-card:not(.animate__animated)',
    '.supplier-card:not(.animate__animated)',
    '.farm-story-card:not(.animate__animated)',
    '.farm-bio-card-wrapper:not(.animate__animated)',
    '.metric-box:not(.animate__animated)',
    '.overview-metrics > div:not(.animate__animated)',
    '.hero-stamp:not(.animate__animated)',
    '.home-categories a:not(.animate__animated)'
  ].join(', ');

  const registerElements = () => {
    if (reducedMotionQuery.matches) return;
    const elements = document.querySelectorAll<HTMLElement>(targetSelector);
    elements.forEach((el) => {
      if (el.dataset.animated !== 'true') {
        entranceObserver.observe(el);
      }
    });
  };

  // Quét các phần tử hiện hữu
  registerElements();

  // 4. MutationObserver để tự động nhận diện các phần tử mới khi React chuyển trang / render dữ liệu
  let rafId: number | undefined;
  const mutationObserver = new MutationObserver(() => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      registerElements();
    });
  });

  const rootEl = document.getElementById('root') || document.body;
  mutationObserver.observe(rootEl, {
    childList: true,
    subtree: true,
  });

  // Trả về hàm dọn dẹp khi unmount
  return () => {
    document.removeEventListener('click', handleDocumentClick, true);
    entranceObserver.disconnect();
    mutationObserver.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
  };
}
