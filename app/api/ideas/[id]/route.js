export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json, bad, body } from '@/lib/api';
import { ideaFields } from '@/lib/validators';
import Idea from '@/models/Idea';
import ExecutionTask from '@/models/ExecutionTask';

export const GET = route(async (req, context, user) => {
  const { id } = await context.params;
  await connectDB();
  const idea = await Idea.findOne({ _id: id, user: user._id }).lean();
  if (!idea) return bad('Idea not found', 404);
  const task = await ExecutionTask.findOne({ idea: idea._id, user: user._id }).lean();
  return json({ idea, task });
});

export const PATCH = route(async (req, context, user) => {
  const { id } = await context.params;
  await connectDB();
  const idea = await Idea.findOne({ _id: id, user: user._id });
  if (!idea) return bad('Idea not found', 404);
  const b = await body(req);

  if (b.action === 'archive') {
    if (idea.status !== 'completed') return bad('Only completed ideas can be archived.');
    idea.status = 'archived';
  } else if (b.action === 'unarchive') {
    if (idea.status === 'archived') idea.status = 'completed';
  } else {
    const { data, error } = ideaFields(b);
    if (error) return bad(error);
    Object.assign(idea, data);
    // keep the linked execution task in sync with edits
    const sync = {};
    for (const k of ['title', 'description', 'category', 'priority']) if (data[k] !== undefined) sync[k] = data[k];
    if (Object.keys(sync).length) await ExecutionTask.updateOne({ idea: idea._id, user: user._id }, sync);
    if (data.dueDate !== undefined) await ExecutionTask.updateOne({ idea: idea._id, user: user._id, status: { $ne: 'completed' } }, { dueDate: data.dueDate });
  }
  await idea.save();
  return json({ idea });
});

export const DELETE = route(async (req, context, user) => {
  const { id } = await context.params;
  await connectDB();
  const idea = await Idea.findOneAndDelete({ _id: id, user: user._id });
  if (!idea) return bad('Idea not found', 404);
  await ExecutionTask.deleteMany({ idea: idea._id, user: user._id });
  return json({ ok: true });
});
