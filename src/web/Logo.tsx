/**
 * The Pult wordmark as inline vector. The "p" (a desk seen from the side) takes the accent color, the other letters
 * take the text color, so the logo follows light and dark mode and the chosen accent. Source: design/logo/pult-logo.svg
 */
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="brand">
      <svg className={small ? "logo small" : "logo"} viewBox="0 36 390 212" role="img" aria-label="Pult">
        <path className="logo-p" fillRule="evenodd" d="M0 92 L116 123.08 L116 154 A50 50 0 0 1 66 204 L30 204 L30 248 L0 248 Z M30 131.1 L30 174 L66 174 A20 20 0 0 0 86 154 L86 146.1 Z" />
        <path className="logo-ink" d="M138 92 L168 100.04 L168 152 L138 152 Z" />
        <path className="logo-ink" d="M216 92 L246 100.04 L246 204 L216 204 Z" />
        <path className="logo-ink" d="M138 148 L138 150 A54 54 0 0 0 246 150 L246 148 L216 148 L216 150 A24 24 0 0 1 168 150 L168 148 Z" />
        <path className="logo-ink" d="M270 36 L300 44.04 L300 204 L270 204 Z" />
        <path className="logo-ink" d="M336 58 L366 66.04 L366 204 L336 204 Z" />
        <path className="logo-ink" d="M322 92 L390 110.22 L390 134.22 L322 116 Z" />
      </svg>
    </div>
  );
}
