// Native shares the team link as text; only web draws the story image.
// big: the large text in the box (a team code, or a result); url: the address at the bottom.
export type StoryText = { kicker: string; title: string; sub: string; line: string; big: string; url: string };
export async function challengeImage(_s: StoryText): Promise<Blob | null> { return null; }
