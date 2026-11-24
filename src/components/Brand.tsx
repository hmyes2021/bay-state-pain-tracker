export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <circle cx="256" cy="256" r="230" fill="#146297" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="16" />
      <path d="M100 276h80l34-80 46 140 36-102 24 42h92" fill="none" stroke="#FFFFFF" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="412" cy="276" r="24" fill="#7FC8A9" />
    </svg>
  );
}
