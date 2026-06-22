import { color, radius, shadow } from '../tokens';

/** Official BOTDOC.IO wordmark. Renders on dark surfaces inside a white badge. */
export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const h = size === 'md' ? 40 : 32;
  return (
    <div
      style={{
        background: color.surface,
        borderRadius: radius.lg,
        padding: size === 'md' ? '7px 16px' : '5px 12px',
        display: 'inline-flex',
        alignItems: 'center',
        boxShadow: shadow.card,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/botdoc-logo.png"
        alt="Botdoc"
        style={{ height: h, width: 'auto', display: 'block' }}
      />
    </div>
  );
}
