type IconProps = { className?: string };

const base = "shrink-0";

export function LogoMark({ className }: IconProps) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect width="22" height="22" rx="6" fill="currentColor" className="text-brand-600" />
      <path
        d="M6 8.5 11 12l5-3.5M6 8.5v5.2c0 .4.3.7.7.7h8.6c.4 0 .7-.3.7-.7V8.5M6 8.5l4.4-2.9a1 1 0 0 1 1.2 0L16 8.5"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg className={`${base} ${className ?? ""}`} width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.6V8l2.4 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg className={`${base} ${className ?? ""}`} width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.3 8.2 7.2 10l3.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={`${base} ${className ?? ""}`} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SlackIcon({ className }: IconProps) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 122.8 122.8" aria-hidden="true">
      <path
        d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z"
        fill="#e01e5a"
      />
      <path
        d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
        fill="#e01e5a"
      />
      <path
        d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z"
        fill="#36c5f0"
      />
      <path
        d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
        fill="#36c5f0"
      />
      <path
        d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z"
        fill="#2eb67d"
      />
      <path
        d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
        fill="#2eb67d"
      />
      <path
        d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z"
        fill="#ecb22e"
      />
      <path
        d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
        fill="#ecb22e"
      />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg className={`${base} ${className ?? ""}`} width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 12.5V3.3m0 0L6.7 6.6M10 3.3l3.3 3.3M4.2 13.3v2.1c0 .8.7 1.5 1.5 1.5h8.6c.8 0 1.5-.7 1.5-1.5v-2.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg className={`${base} ${className ?? ""}`} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 1.8h5.2L12.3 5v9.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9.2 1.8V5h3.1" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg className={`${base} ${className ?? ""}`} width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.5 15 14H1L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 6.3v3.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg className={`${base} ${className ?? ""}`} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg className={`${base} ${className ?? ""}`} width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 4H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9.5M9.5 2.5H13.5V6.5M13 3 7.5 8.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
