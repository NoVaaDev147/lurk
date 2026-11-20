import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
    type Task,
    listTasks,
    addTask,
    updateTask,
    setTaskCompleted,
    deleteTask,
} from "./api"

const today = () => new Date().toLocaleDateString("en-CA")

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [title, setTitle] = useState("");
    const [due, setDue] = useState("");

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDue, setEditDue] = useState("");

    const refresh = () => listTasks().then(setTasks).catch(console.error);

    useEffect(() => {
        refresh();
    }, []);

    async function handleAdd() {
        if (!title.trim()) return;
        await addTask(title, due || null);
        setTitle("");
        setDue("");
        refresh();
    }

    function startEdit(t: Task) {
        setEditingId(t.id);
        setEditTitle(t.title);
        setEditDue(t.dueDate ?? "");
    }

    async function saveEdit() {
        if (editingId === null || !editTitle.trim()) return;
        await updateTask(editingId, editTitle, editDue || null);
        setEditingId(null);
        refresh();
    }

    return (
      <div>
        <h2>Tasks</h2>

        <div className="row">
          <input
            className="input grow"
            value={title}
            placeholder="Add a task..."
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <input
            className="input"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <button className="btn primary" onClick={handleAdd}>
            <Plus size={16} /> Add  
          </button>    
        </div>

        {tasks.length === 0 && <div className="empty">Nothing here yet. Add your first task.</div>}

        <ul className="task-list">
          {tasks.map((t) => (
            <li key={t.id} className={`task ${t.completed ? "done" : ""}`}>
              <input
                type="checkbox"
                checked={t.completed}
                onChange={(e) => setTaskCompleted(t.id, e.target.checked).then(refresh)}
              />

              {editingId === t.id ? (
                <>
                  <input
                    className="input grow"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    autoFocus
                  />
                  <input
                    className="input"
                    type="date"
                    value={editDue}
                    onChange={(e) => setEditDue(e.target.value)}
                  />
                  <button className="btn icon" onClick={saveEdit} title="Save">
                    <Check size={16} />
                  </button>
                  <button className="btn icon" onClick={() => setEditingId(null)} title="Cancel">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="task-title">{t.title}</span>
                  {t.dueDate && (
                    <span className={`chip ${!t.completed && t.dueDate < today() ? "overdue" : ""}`}>
                      {t.dueDate}
                    </span>
                  )}
                  <button className="btn icon" onClick={() => startEdit(t)} title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button
                    className="btn icon danger"
                    onClick={() => deleteTask(t.id).then(refresh)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
}