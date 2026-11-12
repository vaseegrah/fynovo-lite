export const dynamic = 'force-dynamic';
import { connectDB } from '@/lib/db';
import { route, json } from '@/lib/api';
import ExecutionTask from '@/models/ExecutionTask';

export const GET = route(async (req, ctx, user) => {
  await connectDB();
  const tasks = await ExecutionTask.find({ user: user._id }).sort({ updatedAt: -1 }).lean();
  return json({ tasks });
});
