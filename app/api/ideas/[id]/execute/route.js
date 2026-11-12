export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json, bad } from '@/lib/api';
import Idea from '@/models/Idea';
import ExecutionTask from '@/models/ExecutionTask';

// "Move to Execution": creates the execution task for an idea.
export const POST = route(async (req, context, user) => {
  const { id } = await context.params;
  await connectDB();
  const idea = await Idea.findOne({ _id: id, user: user._id });
  if (!idea) return bad('Idea not found', 404);

  let task = await ExecutionTask.findOne({ idea: idea._id, user: user._id });
  if (!task) {
    task = await ExecutionTask.create({
      user: user._id, idea: idea._id, title: idea.title, description: idea.description,
      category: idea.category, priority: idea.priority, dueDate: idea.dueDate,
      reminder: idea.reminder, reminderTime: idea.reminderTime, status: 'pending',
    });
  }
  if (idea.status === 'new') { idea.status = 'in_execution'; await idea.save(); }
  return json({ task, idea }, 201);
});
