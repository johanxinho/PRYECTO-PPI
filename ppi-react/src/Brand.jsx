// @ts-nocheck
// Marca visual oficial de RECORDATE: logo de calendario + wordmark.
const mark = `${import.meta.env.BASE_URL}brand/recordate-logo.png`;
export function Brand({ light = false, size = "md", wordmark = true }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""} brand-${size}`}>
      <span className="brand-mark" aria-hidden="true" translate="no">
        <img src={mark} alt="" className="brand-logo-img" />
      </span>
      {wordmark ? <span className="brand-word" translate="no">RECORDATE</span> : <span className="sr-only" translate="no">RECORDATE</span>}
    </div>
  );
}
export function LogoMark({ className = "", decorative = true }) {
  return (
    <img
      src={mark}
      alt={decorative ? "" : "RECORDATE"}
      translate="no"
      className={`logo-hero-img ${className}`}
    />
  );
}
export default Brand;
