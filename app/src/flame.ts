// The Crew-Flamme: how well the crew kept its training days over the last 7 days.

export type FlameMember = { id: string; name: string; days: number[]; joinedAt: string; sessions: { doneAt: string }[] };

function dayKey(d: Date) {
  return d.toDateString();
}

function trainedOn(m: FlameMember, d: Date) {
  return m.sessions.some(s => dayKey(new Date(s.doneAt)) === dayKey(d));
}

function due(m: FlameMember, d: Date) {
  const joined = new Date(m.joinedAt);
  joined.setHours(0, 0, 0, 0);
  return d >= joined && m.days.includes(d.getDay());
}

export function crewFlame(members: FlameMember[], now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let expected = 0;
  let kept = 0;
  for (let back = 1; back <= 7; back++) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    for (const m of members) {
      if (!due(m, d)) continue;
      expected++;
      if (trainedOn(m, d)) kept++;
    }
  }
  // Today counts only once someone has trained, so the flame never drops before the day is over.
  for (const m of members) {
    if (due(m, today) && trainedOn(m, today)) {
      expected++;
      kept++;
    }
  }
  const heat = expected === 0 ? 1 : kept / expected;

  // Days in a row (back from yesterday) on which nobody in the crew missed a training day.
  let streak = 0;
  const firstJoin = Math.min(...members.map(m => new Date(m.joinedAt).getTime()));
  for (let back = 1; back <= 365; back++) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    if (d.getTime() < new Date(firstJoin).setHours(0, 0, 0, 0)) break;
    if (members.some(m => due(m, d) && !trainedOn(m, d))) break;
    streak++;
  }

  const openToday = members.filter(m => due(m, today) && !trainedOn(m, today));
  const label = heat >= 0.9 ? 'lodert' : heat >= 0.7 ? 'brennt' : heat >= 0.4 ? 'flackert' : 'glimmt nur noch';
  return { heat, label, streak, openToday, kept, expected };
}
