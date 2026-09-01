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
          d="M13 18.5L8.5 20.5L9.5 16L17.5 4.5C18.2 3.5 19.5 3.5 20.2 4.2C20.9 4.9 20.9 6.2 19.9 6.9L13 18.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 16L13.5 17.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M16 8L18.8 10"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="13.2" cy="12.5" r="0.8" fill="currentColor" />
        <path
          d="M13.2 12.5L9 19.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* 4-point sparkle star top-left */}
        <path
          d="M5 8C5 6.2 4.2 5.5 2.5 5.5C4.2 5.5 5 4.8 5 3C5 4.8 5.8 5.5 7.5 5.5C5.8 5.5 5 6.2 5 8Z"
          fill="currentColor"
        />
        {/* Delicate star bottom-right */}
        <path
          d="M21 18C21 16.8 20.4 16.2 19.2 16.2C20.4 16.2 21 15.6 21 14.4C21 15.6 21.6 16.2 22.8 16.2C21.6 16.2 21 16.8 21 18Z"
          fill="currentColor"
        />
        {/* Tiny sparkle near bottom left */}
        <circle cx="4" cy="14" r="0.6" fill="currentColor" />
      </svg>
    </span>
  );
}
