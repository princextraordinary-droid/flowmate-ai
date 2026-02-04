// Motivational quotes categorized by energy level

export const quotes = {
  // Energy 1 - Very Low (Encouraging, gentle)
  1: [
    "Rest is not a sign of weakness. It's preparation for greatness.",
    "Even the smallest step forward is still progress.",
    "Be gentle with yourself. You're doing the best you can.",
    "Low energy days are part of the journey. Tomorrow is a new opportunity.",
    "Take care of yourself first. Everything else can wait.",
    "It's okay to slow down. The race isn't going anywhere.",
  ],
  // Energy 2 - Low (Supportive, understanding)
  2: [
    "Small victories lead to big changes. Keep going.",
    "You don't have to be perfect to be amazing.",
    "One thing at a time. That's all it takes.",
    "Your pace doesn't matter. Forward is forward.",
    "Give yourself permission to take it easy today.",
    "Progress isn't always visible, but it's always happening.",
  ],
  // Energy 3 - Medium (Balanced, motivating)
  3: [
    "You're right where you need to be. Trust the process.",
    "Consistency beats intensity. Keep showing up.",
    "Good things come to those who work for them.",
    "Balance is the key to everything. You've got this.",
    "Today's effort is tomorrow's strength.",
    "Stay focused, stay humble, stay hungry.",
  ],
  // Energy 4 - High (Energizing, ambitious)
  4: [
    "Your energy is contagious! Use it wisely.",
    "Today is your day to make things happen!",
    "Channel this energy into something incredible.",
    "The only limit is the one you set for yourself.",
    "Success is built on days like today. Maximize it!",
    "You're unstoppable when you believe in yourself.",
  ],
  // Energy 5 - Peak (Powerful, inspiring)
  5: [
    "You're operating at peak performance! Nothing can stop you!",
    "This is your moment. Seize it with everything you have!",
    "Legends are made on days like today. Go make history!",
    "Your potential is limitless. Show the world what you're made of!",
    "Peak energy, peak focus, peak results. Let's go!",
    "Today you're not just reaching goals—you're crushing them!",
  ],
};

export function getRandomQuote(energyLevel: number): string {
  const levelQuotes = quotes[energyLevel as keyof typeof quotes] || quotes[3];
  const randomIndex = Math.floor(Math.random() * levelQuotes.length);
  return levelQuotes[randomIndex];
}
