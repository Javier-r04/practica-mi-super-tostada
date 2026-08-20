import React from 'react';

export function Icon({ name, size = 20, strokeWidth = 2, color = 'currentColor', style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = `<i data-lucide="${name}" style="width:${size}px;height:${size}px;display:block" stroke-width="${strokeWidth}"></i>`;
    const paint = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };
    paint();
    const t = setTimeout(paint, 250);
    return () => clearTimeout(t);
  }, [name, size, strokeWidth]);
  return <span ref={ref} aria-hidden="true" style={{ display: 'inline-flex', width: size, height: size, color, flex: '0 0 auto', ...style }} />;
}
