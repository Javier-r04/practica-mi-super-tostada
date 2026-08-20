import React from 'react';

const mstBtnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
  fontFamily: 'var(--font-core)', fontWeight: 'var(--weight-semibold)', letterSpacing: '.01em',
  border: 'var(--border-width) solid transparent', borderRadius: 'var(--radius-button)',
  cursor: 'pointer', transition: 'var(--transition-control)', textDecoration: 'none', whiteSpace: 'nowrap',
};

const mstBtnSizes = {
  sm: { height: '36px', padding: '0 var(--space-3)', fontSize: 'var(--text-xs)' },
  md: { height: 'var(--field-height)', padding: '0 var(--space-4)', fontSize: 'var(--text-sm)' },
  lg: { height: '52px', padding: '0 var(--space-6)', fontSize: 'var(--text-base)' },
};

const mstBtnVariants = {
  primary: { background: 'var(--green-800)', color: 'var(--white)', borderColor: 'var(--green-800)' },
  accent: { background: 'var(--yellow-400)', color: 'var(--green-900)', borderColor: 'var(--yellow-500)' },
  secondary: { background: 'var(--white)', color: 'var(--ink-800)', borderColor: 'var(--border-default)' },
  ghost: { background: 'transparent', color: 'var(--green-800)', borderColor: 'transparent' },
  danger: { background: 'var(--red-600)', color: 'var(--white)', borderColor: 'var(--red-600)' },
};

const mstBtnHovers = {
  primary: { background: 'var(--green-700)', borderColor: 'var(--green-700)' },
  accent: { background: 'var(--yellow-500)' },
  secondary: { background: 'var(--ink-50)', borderColor: 'var(--border-strong)' },
  ghost: { background: 'var(--green-50)' },
  danger: { background: 'var(--red-700)', borderColor: 'var(--red-700)' },
};

export function Button({
  variant = 'primary', size = 'md', block = false, disabled = false, loading = false,
  type = 'button', href, children, style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const Tag = href ? 'a' : 'button';
  const styles = {
    ...mstBtnBase, ...mstBtnSizes[size] || mstBtnSizes.md, ...mstBtnVariants[variant] || mstBtnVariants.primary,
    ...(hover && !disabled ? mstBtnHovers[variant] || {} : {}),
    ...(block ? { display: 'flex', width: '100%' } : {}),
    ...(press && !disabled ? { transform: 'scale(var(--press-scale))' } : {}),
    ...(disabled || loading ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
    ...style,
  };
  return (
    <Tag
      type={href ? undefined : type} href={href} disabled={href ? undefined : disabled || loading} style={styles}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)} {...rest}
    >
      {loading ? 'Guardando…' : children}
    </Tag>
  );
}
