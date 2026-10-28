// Native shares the team link as text; only web draws the story image.
export type StoryText = { kicker: string; title: string; sub: string; line: string; code: string };
export async function challengeImage(_s: StoryText): Promise<Blob | null> { return null; }
