// Test grading (PLAN §6). Pure TS.
// The grade is simply 10 × the score, rounded to one decimal and never below 1.0, so 55% is a 5.5.
// A test is passed from a 5.5 (55%).

export const PASS_GRADE = 5.5;
/** Same threshold as a percentage, for display. */
export const PASS_PERCENT = 55;

/** Grade from 1.0 to 10.0 for a score between 0 and 1. */
export function gradeFromScore(score: number): number {
	const clamped = Math.min(1, Math.max(0, score));
	return Math.max(1, Math.round(clamped * 100) / 10);
}

/** Passed is judged on the rounded grade, so what the learner sees is always consistent. */
export function isPassed(score: number): boolean {
	return gradeFromScore(score) >= PASS_GRADE;
}

/** Dutch notation: `7,5`. */
export function formatGrade(grade: number): string {
	return grade.toFixed(1).replace('.', ',');
}
