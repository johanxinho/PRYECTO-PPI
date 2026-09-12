// @ts-nocheck
const mark = `${import.meta.env.BASE_URL}brand/recordate-logo.png`;

export function Brand({ light = false, size = "md", wordmark = true }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""} brand-${size}`}>
      <span className="brand-mark" aria-hidden="true">
        <img src={mark} alt="" className="brand-logo-img" />
      </span>
      {wordmark ? <span className="brand-word">RECORDATE</span> : <span className="sr-only">RECORDATE</span>}
    </div>
  );
}

export function LogoMark({ className = "", decorative = true }) {
  return (
    <img
      src={mark}
      alt={decorative ? "" : "RECORDATE"}
      className={`logo-hero-img ${className}`}
    />
  );
}

export default Brand;
