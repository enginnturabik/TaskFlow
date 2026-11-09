import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api/tasks";

// Displays a single task. Receives its data from the parent through props.
function TaskCard({ task, onComplete }) {
    // Color is calculated from the status, not stored separately
    const color = task.status === "Bitti" ? "green" : "gray";

    return (
        <li style={{ color: color }}>
            <strong>{task.title}</strong> — {task.status}
            {task.status !== "Bitti" && (
                <button onClick={() => onComplete(task.id)}>Complete</button>
            )}
        </li>
    );
}

export default function App() {
    const [tasks, setTasks] = useState([]);         // starts empty
    const [isLoading, setIsLoading] = useState(true); // are we waiting for the API?
    const [error, setError] = useState(null);       // did something go wrong?

    useEffect(() => {
        async function fetchTasks() {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                const data = await response.json();
                setTasks(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false); // runs whether the request succeeded or failed
            }
        }

        fetchTasks();
    }, []); // [] = run once, when the component first appears

    function completeTask(id) {
        // For now this only updates the screen, not the database.
        // Later we'll connect it to PUT /api/tasks/{id}.
        setTasks(
            tasks.map((t) => (t.id === id ? { ...t, status: "Bitti" } : t))
        );
    }

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;

    // Calculated from state on every render, so it's always correct
    const remaining = tasks.filter((t) => t.status !== "Bitti").length;

    return (
        <main>
            <h1>My Tasks</h1>
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