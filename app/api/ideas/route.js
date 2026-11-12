export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json, bad, body } from '@/lib/api';
import { ideaFields } from '@/lib/validators';
import Idea from '@/models/Idea';
import ExecutionTask from '@/models/ExecutionTask';

export const GET = route(async (req, ctx, user) => {
  await connectDB();
  const [ideas, tasks] = await Promise.all([
    Idea.find({ user: user._id }).sort({ createdAt: -1 }).lean(),
    ExecutionTask.find({ user: user._id }, 'idea status progress').lean(),
  ]);
  const byIdea = new Map(tasks.map((t) => [String(t.idea), t]));
  return json({
    ideas: ideas.map((i) => {
      const t = byIdea.get(String(i._id));
      return { ...i, taskId: t ? String(t._id) : null, taskStatus: t?.status || null, progress: t?.progress ?? 0 };
    }),
  });
});

export const POST = route(async (req, ctx, user) => {
  await connectDB();
  const { data, error } = ideaFields(await body(req), true);
  if (error) return bad(error);
  const idea = await Idea.create({ ...data, user: user._id });
  return json({ idea }, 201);
});
