interface BubbleTailProps {
  isOutgoing: boolean;
}

export function BubbleTail({ isOutgoing }: BubbleTailProps) {
  if (isOutgoing) {
    return (
      <svg
        className="absolute bottom-0 -right-[6px] z-10 shrink-0 pointer-events-none"
        width="8"
        height="13"
        viewBox="0 0 8 13"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 13V0C0 0 1 8 8 11L0 13Z" fill="#005C4B" />
      </svg>
    );
  }
  return (
    <svg
      className="absolute bottom-0 -left-[6px] z-10 shrink-0 pointer-events-none"
      width="8"
      height="13"
      viewBox="0 0 8 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Border colour */}
      <path d="M8 13V0C8 0 7 8 0 11L8 13Z" fill="rgba(0,0,0,0.08)" />
      {/* White fill slightly inset */}
      <path d="M8 13V1.2C8 1.2 6.8 8.5 0.8 11L8 13Z" className="fill-white dark:fill-[#202c33]" />
    </svg>
  );
}
