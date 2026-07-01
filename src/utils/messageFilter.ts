const blockedPatterns: RegExp[] = [
  // Phone numbers
  /\b\d{10,15}\b/g,
  /\+?\d[\d\s\-().]{7,}\d/g,

  // Emails
  /\S+@\S+\.\S+/g,

  // URLs
  /https?:\/\/\S+/gi,
  /www\.\S+/gi,

  // Social media keywords
  /\b(whatsapp|telegram|snapchat|instagram|facebook|tiktok|twitter|x\.com)\b/i,

  // Contact phrases
  /\b(call me|text me|reach me|my number|dm me|inbox me|contact me)\b/i,
];

export function containsBlockedContent(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  return blockedPatterns.some((pattern) => pattern.test(normalized));
}