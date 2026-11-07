export interface Quote {
  text: string;
  author: string;
}

// Local quote bank. /api/quote picks from here; swap for a remote API (see docs/DESIGN.md) at any time.
export const QUOTES: Quote[] = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln (attrib.)" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius (attrib.)" },
  { text: "Do not pray for an easy life. Pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.", author: "Bruce Lee (attrib.)" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Every action you take is a vote for the type of person you wish to become.", author: "James Clear" },
  { text: "Well begun is half done.", author: "Aristotle" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain (attrib.)" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
  { text: "Fall seven times, stand up eight.", author: "Japanese proverb" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" },
  { text: "Suffer the pain of discipline, or suffer the pain of regret.", author: "Proverb" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "[SYSTEM] Daily quest received. Failure to complete will result in a penalty.", author: "The System" },
  { text: "[SYSTEM] You have been chosen to level up. Weakness is only a stat that has not been trained yet.", author: "The System" },
  { text: "[SYSTEM] Rest is permitted. Surrender is not.", author: "The System" },
  { text: "[SYSTEM] The gate opens for those who show up every single day.", author: "The System" },
  { text: "[SYSTEM] Yesterday's limit is today's warm-up. Arise.", author: "The System" },
  { text: "[SYSTEM] Your streak is a shadow soldier. Keep it alive and it will fight for you.", author: "The System" },
  { text: "[SYSTEM] No one is born strong. Strength is extracted, one repetition at a time.", author: "The System" },
  { text: "[SYSTEM] A weak hunter blames the dungeon. A strong hunter upgrades.", author: "The System" },
];

export function randomQuoteIndex(exclude?: number): number {
  let i = Math.floor(Math.random() * QUOTES.length);
  if (exclude !== undefined && QUOTES.length > 1) {
    while (i === exclude) i = Math.floor(Math.random() * QUOTES.length);
  }
  return i;
}
