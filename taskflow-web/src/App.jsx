import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api/tasks";
const JSON_HEADERS = { "Content-Type": "application/json" };

// ---------- Form to add a new task ----------
function AddTaskForm({ onAdded }) {
    const [title, setTitle] = useState("");          // controlled input value
    const [errors, setErrors] = useState({});        // validation errors from the API
    const [isSaving, setIsSaving] = useState(false); // prevents double clicks

    async function handleSubmit(e) {
        e.preventDefault(); // stop the browser from reloading the page
        setIsSaving(true);
        setErrors({});

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: JSON_HEADERS,
                body: JSON.stringify({ title: title, status: "Yapılacak" }),
            });

            if (response.status === 400) {
                // The backend rejected the data; show its messages
                const problem = await response.json();
                setErrors(problem.errors ?? {});
                return;
            }
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const createdTask = await response.json(); // the API returns the new task, with its id
            onAdded(createdTask);                      // tell the parent
            setTitle("");                              // clear the input
        } catch (err) {
            setErrors({ general: [err.message] });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New task"
            />
            <button type="submit" disabled={isSaving}>
                {isSaving ? "Adding..." : "Add"}
            </button>

            {/* Messages come from the [Required] and [StringLength] rules in SaveTaskDto */}
            {errors.Title && <p style={{ color: "red" }}>{errors.Title[0]}</p>}
            {errors.general && <p style={{ color: "red" }}>{errors.general[0]}</p>}
        </form>
    );
}

// ---------- A single task ----------
function TaskCard({ task, onComplete }) {
    const color = task.status === "Bitti" ? "green" : "gray";

    return (
        <li style={{ color: color }}>
            <strong>{task.title}</strong> — {task.status}
            {task.status !== "Bitti" && (
                <button onClick={() => onComplete(task)}>Complete</button>
            )}
        </li>
    );
}

// ---------- Main component ----------
export default function App() {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchTasks() {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error(`Server error: ${response.status}`);
                setTasks(await response.json());
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchTasks();
    }, []);

    // Called by AddTaskForm after the API successfully creates a task
    function handleAdded(newTask) {
        setTasks((prev) => [...prev, newTask]);
    }

    // Pessimistic update: save to the API first, update the screen only if it worked
    async function completeTask(task) {
        const updated = { ...task, status: "Bitti" };

        try {
            const response = await fetch(`${API_URL}/${task.id}`, {
                method: "PUT",
                headers: JSON_HEADERS,
                body: JSON.stringify({
                    title: updated.title,
                    status: updated.status,
                    dueDate: updated.dueDate,
                }),
            });
            if (!response.ok) throw new Error(`Could not update: ${response.status}`);

            setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        } catch (err) {
            setError(err.message);
        }
    }

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    const remaining = tasks.filter((t) => t.status !== "Bitti").length;

    return (
        <main>
            <h1>My Tasks</h1>
            <AddTaskForm onAdded={handleAdded} />
            <p>Remaining tasks: {remaining}</p>
            {tasks.length === 0 && <p>No tasks yet.</p>}
            <ul>
                {tasks.map((t) => (
                    <TaskCard key={t.id} task={t} onComplete={completeTask} />
                ))}
            </ul>
        </main>
    );
}