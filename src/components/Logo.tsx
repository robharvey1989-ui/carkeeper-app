import React from "react";

type Props = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export default function Logo({ className = "", size = 'md' }: Props) {
  const imgClass = size === 'lg' ? 'h-10' : size === 'sm' ? 'h-6' : 'h-8';
  const textClass = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/carkeeper-logo.png"
        alt="CarKeeper"
        className={`${imgClass} w-auto select-none`}
        draggable={false}
      />
      <span className={`${textClass} font-semibold tracking-tight`}>CarKeeper</span>
    </div>
  );
}
