export type QuadrantId = 'Q1_DO' | 'Q2_SCHEDULE' | 'Q3_DELEGATE' | 'Q4_ELIMINATE';

export interface Quadrant {
  id: QuadrantId;
  title: string;
  colorClass: string;
  bgClass: string;
  icon: string;
}

export interface Task {
  id: string;
  title: string;
  quadrant: QuadrantId;
  energy: number;
  duration: number;
  status: 'pending' | 'completed' | 'missed';
  due: string;
}

export interface AIResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  mermaid?: string;
  imagePlaceholder?: {
    title: string;
    prompt: string;
    style: string;
  };
}
