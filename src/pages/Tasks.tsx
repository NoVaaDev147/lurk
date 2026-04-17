import { useEffect, useState } from "react";
import { useTasksStore } from "../store/tasksStore";

export default function Tasks() {
  const { tasks, loading, fetchTasks, addTask, toggleTask, deleteTask, clearCompleted } = useTasksStore();
  const [input, setInput] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  async function handleAdd() {
    if (!input.trim()) return;
    await addTask(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  const incomplete = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Tasks</h1>
          <p className="text-zinc-600 text-xs mt-0.5">
            {incomplete.length} remaining · {completed.length} completed
          </p>
        </div>
        {completed.length > 0 && (
          <button
            onClick={clearCompleted}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
          >
            Clear completed
          </button>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-6">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs to get done?"
          className="flex-1 bg-zinc-900 text-zinc-100 text-sm px-4 py-3 rounded-xl outline-none placeholder-zinc-700 border border-zinc-800 focus:border-violet-500/50 transition-all duration-200"
        />
        <button
          onClick={handleAdd}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-3 rounded-xl transition-all duration-200 hover:scale-105 font-medium"
        >
          Add
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {loading && <p className="text-zinc-600 text-sm">Loading...</p>}
        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-zinc-600 text-sm">No tasks yet. Add one above!</p>
          </div>
        )}

        {/* Incomplete tasks */}
        {incomplete.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-150 group"
          >
            <button
              onClick={() => toggleTask(task.id, task.completed)}
              className="w-5 h-5 rounded-md border border-zinc-700 hover:border-violet-400 transition-all duration-200 shrink-0 hover:bg-violet-500/10"
            />
            <span className="flex-1 text-sm text-zinc-300">{task.text}</span>
            <button
              onClick={() => deleteTask(task.id)}
              className="text-zinc-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded hover:bg-red-500/10"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Completed tasks */}
        {completed.length > 0 && (
          <>
            <div className="flex items-center gap-3 pt-4 pb-2">
              <div className="flex-1 h-px bg-zinc-800/50" />
              <p className="text-xs text-zinc-600 uppercase tracking-widest">Completed</p>
              <div className="flex-1 h-px bg-zinc-800/50" />
            </div>
            {completed.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-3 bg-zinc-900/30 rounded-xl border border-zinc-800/30 group"
              >
                <button
                  onClick={() => toggleTask(task.id, task.completed)}
                  className="w-5 h-5 rounded-md border border-violet-500/50 bg-violet-500/20 shrink-0 flex items-center justify-center transition-all duration-200"
                >
                  <span className="text-violet-400 text-xs">✓</span>
                </button>
                <span className="flex-1 text-sm text-zinc-600 line-through">{task.text}</span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-zinc-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded hover:bg-red-500/10"
                >
                  ✕
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}