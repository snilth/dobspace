export function CatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="21" rx="9" ry="8" fill="currentColor"/>
      <circle cx="16" cy="13" r="7.5" fill="currentColor"/>
      <polygon points="8,8 6,2 12,7" fill="currentColor"/>
      <polygon points="24,8 26,2 20,7" fill="currentColor"/>
      <polygon points="8.5,7.5 7,3.5 11.5,7" fill="white" opacity="0.25"/>
      <polygon points="23.5,7.5 25,3.5 20.5,7" fill="white" opacity="0.25"/>
      <ellipse cx="13" cy="13" rx="1.8" ry="2.2" fill="#F9C74F"/>
      <ellipse cx="19" cy="13" rx="1.8" ry="2.2" fill="#F9C74F"/>
      <ellipse cx="13" cy="13" rx="0.7" ry="1.8" fill="currentColor"/>
      <ellipse cx="19" cy="13" rx="0.7" ry="1.8" fill="currentColor"/>
      <polygon points="16,15.5 14.8,14.5 17.2,14.5" fill="#F4A0A0"/>
    </svg>
  );
}
