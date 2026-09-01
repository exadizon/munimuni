'use client';

export function LogoMark({ className = 'wordmark-mark' }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Fountain pen nib */}
        <path
          d="M13.2 18.2L8.5 20.2L9.6 15.5L17.2 4.2C17.9 3.2 19.3 3.2 20.1 4C20.9 4.8 20.9 6.2 19.9 6.9L13.2 18.2Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.6 15.5L13.6 17.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="13.2" cy="12.2" r="0.9" fill="currentColor" />
        <path
          d="M13.2 12.2L8.8 19.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* 4-point sparkle star top-left */}
        <path
          d="M5 8.5C5 6.5 4 5.5 2 5.5C4 5.5 5 4.5 5 2.5C5 4.5 6 5.5 8 5.5C6 5.5 5 6.5 5 8.5Z"
          fill="currentColor"
        />
        {/* Delicate star bottom-right */}
        <path
          d="M21.5 17.5C21.5 16.2 20.8 15.5 19.5 15.5C20.8 15.5 21.5 14.8 21.5 13.5C21.5 14.8 22.2 15.5 23.5 15.5C22.2 15.5 21.5 16.2 21.5 17.5Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
