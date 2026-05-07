import { Category } from '@/types/Category';

export type DifficultyLevel = 1 | 2 | 3; // 1: single digits, 2: double digits, 3: triple digits

export type GeneratedQuestion = {
  id: string;
  question: string;
  correctAnswer: number;
  category: Category;
  difficulty: DifficultyLevel;
  options?: [string, string, string]; // For power-up questions
};

/**
 * Generates random math questions based on category and difficulty
 */
export function generateQuestion(
  category: Category,
  difficulty: DifficultyLevel = 1
): GeneratedQuestion {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Helper to get random in range
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  switch (category as unknown as string) {
    case 'Suma': {
      let a, b;
      if (difficulty === 1) { a = rand(1, 12); b = rand(1, 12); }
      else if (difficulty === 2) { a = rand(10, 60); b = rand(10, 60); }
      else { a = rand(100, 999); b = rand(100, 999); }
      
      const sumAnswer = a + b;
      return { id, question: `${a} + ${b} = ?`, correctAnswer: sumAnswer, category: 'Suma' as unknown as Category, difficulty, options: generateOptions(sumAnswer, difficulty) };
    }

    case 'Resta': {
      let a, b;
      if (difficulty === 1) { a = rand(5, 15); b = rand(1, a); }
      else if (difficulty === 2) { a = rand(20, 99); b = rand(10, a); }
      else { a = rand(100, 999); b = rand(50, a); }
      
      const subAnswer = a - b;
      return { id, question: `${a} - ${b} = ?`, correctAnswer: subAnswer, category: 'Resta' as unknown as Category, difficulty, options: generateOptions(subAnswer, difficulty) };
    }

    case 'Multiplicación': {
      let a, b;
      if (difficulty === 1) { a = rand(1, 10); b = rand(1, 10); }
      else if (difficulty === 2) { a = rand(2, 12); b = rand(2, 15); }
      else { a = rand(5, 15); b = rand(5, 25); }
      
      const multAnswer = a * b;
      return { id, question: `${a} × ${b} = ?`, correctAnswer: multAnswer, category: 'Multiplicación' as unknown as Category, difficulty, options: generateOptions(multAnswer, difficulty) };
    }

    case 'División': {
      let divisor, quotient;
      if (difficulty === 1) { divisor = rand(2, 5); quotient = rand(1, 10); }
      else if (difficulty === 2) { divisor = rand(2, 10); quotient = rand(5, 15); }
      else { divisor = rand(5, 15); quotient = rand(10, 25); }
      
      const dividend = divisor * quotient;
      return { id, question: `${dividend} ÷ ${divisor} = ?`, correctAnswer: quotient, category: 'División' as unknown as Category, difficulty, options: generateOptions(quotient, difficulty) };
    }

    default: {
      const a = rand(1, 10);
      const b = rand(1, 10);
      const ans = a + b;
      return { id, question: `${a} + ${b} = ?`, correctAnswer: ans, category: 'Suma' as unknown as Category, difficulty, options: generateOptions(ans, difficulty) };
    }
  }
}

/**
 * Generates 3 options for multiple choice questions (power-ups)
 */
function generateOptions(correctAnswer: number, difficulty: DifficultyLevel): [string, string, string] {
  const options: number[] = [correctAnswer];
  
  // Generate 2 incorrect options
  while (options.length < 3) {
    let wrongAnswer: number;
    
    if (difficulty === 1) {
      // For single digits, vary by ±1-3
      const variation = Math.floor(Math.random() * 3) + 1;
      wrongAnswer = correctAnswer + (Math.random() < 0.5 ? variation : -variation);
    } else if (difficulty === 2) {
      // For double digits, vary by ±5-15
      const variation = Math.floor(Math.random() * 11) + 5;
      wrongAnswer = correctAnswer + (Math.random() < 0.5 ? variation : -variation);
    } else {
      // For triple digits, vary by ±10-50
      const variation = Math.floor(Math.random() * 41) + 10;
      wrongAnswer = correctAnswer + (Math.random() < 0.5 ? variation : -variation);
    }
    
    // Ensure positive numbers and no duplicates
    if (wrongAnswer > 0 && !options.includes(wrongAnswer)) {
      options.push(wrongAnswer);
    }
  }
  
  // Shuffle options
  const shuffled = options.sort(() => Math.random() - 0.5);
  return [shuffled[0].toString(), shuffled[1].toString(), shuffled[2].toString()];
}

/**
 * Gets a random category for variety
 */
export function getRandomCategory(): Category {
  const categories: Category[] = ['Suma' as unknown as Category, 'Resta' as unknown as Category, 'Multiplicación' as unknown as Category, 'División' as unknown as Category];
  return categories[Math.floor(Math.random() * categories.length)];
}

/**
 * Determines difficulty progression based on score
 */
export function getDifficultyFromScore(score: number): DifficultyLevel {
  if (score < 5) return 1;      // First 5 questions: single digits
  if (score < 15) return 2;     // Next 10 questions: double digits
  return 3;                     // 15+ questions: triple digits
}
