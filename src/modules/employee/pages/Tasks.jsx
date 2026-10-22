import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, Plus, Clock, CheckCircle2, 
  AlertCircle, SlidersHorizontal, Play, Check, RefreshCw, Trash2
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import CustomDataTable from '../components/CustomDataTable';
import CustomModal from '../components/CustomModal';
import { getAccessToken } from '../../../utils/authSession';

const STORAGE_KEY = 'huddo_employee_tasks';

export default function Tasks({ showToast }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [notes, setNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Purge any stale mock tasks from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && (cached.includes('TSK-001') || cached.includes('Marketing Analytics'))) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  // Fetch dynamic tasks from server
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/employee-self/tasks', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.tasks));
          return;
        }
      }
    } catch (err) {
      console.warn("Backend tasks fetch error:", err);
    } finally {
      setLoading(false);
    }

    setTasks([]);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !dueDate) {
      showToast?.("Please fill all required task fields.", "error");
      return;
    }

    const nextNumber = tasks.length + 1;
    const newTask = {
      id: `TSK-${String(nextNumber).padStart(3, '0')}`,
      title: taskTitle.trim(),
      dueDate,
      priority,
      status: "Not Started",
      notes: notes.trim()
    };

    try {
      const res = await fetch('/api/employee-self/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          dueDate,
          priority,
          notes: notes.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.task) {
          const updated = [data.task, ...tasks];
          setTasks(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          setIsAddOpen(false);
          setTaskTitle("");
          setDueDate("");
          setPriority("Medium");
          setNotes("");
          showToast?.(`Task ${data.task.id} successfully created.`, "success");
          return;
        }
      }
    } catch (err) {
      console.warn("API create task error, saving locally:", err);
    }

    // Local fallback update
    const updated = [newTask, ...tasks];
    setTasks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    setIsAddOpen(false);
    setTaskTitle("");
    setDueDate("");
    setPriority("Medium");
    setNotes("");
    showToast?.(`Task ${newTask.id} successfully created.`, "success");
  };

  const handleUpdateStatus = async (taskId, nextStatus) => {
    try {
      await fetch(`/api/employee-self/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.warn("API status update error:", err);
    }

    const updated = tasks.map(t => 
      t.id === taskId ? { ...t, status: nextStatus } : t
    );
    setTasks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    showToast?.(`Task ${taskId} status changed to ${nextStatus}.`, "success");
  };

  const filteredTasks = useMemo(() => {
    if (filterStatus === 'All') return tasks;
    return tasks.filter(t => t.status === filterStatus);
  }, [tasks, filterStatus]);

  const columns = [
    { header: "Task ID", accessor: "id" },
    { header: "Task Title", accessor: "title", render: (val, row) => (
      <div>
        <span className="font-bold text-slate-800 block">{val}</span>
        {row.notes && <span className="text-[10px] text-slate-400 truncate max-w-xs block">{row.notes}</span>}
      </div>
    )},
    { header: "Due Date", accessor: "dueDate" },
    { header: "Priority", accessor: "priority", render: (val) => {
      const badgeStatus = val === 'Critical' ? 'Critical' : (val === 'High' ? 'Critical' : (val === 'Medium' ? 'Low Stock' : 'Draft'));
      return <StatusBadge status={badgeStatus} />;
    }},
    { header: "Status", accessor: "status", render: (val) => <StatusBadge status={val} /> },
    { 
      header: "Action", 
      accessor: "id", 
      sortable: false, 
      render: (val, row) => (
        <div className="flex gap-2">
          {row.status === 'Not Started' && (
            <button 
              onClick={() => handleUpdateStatus(val, "In Progress")}
              className="flex items-center gap-0.5 px-2.5 py-1 text-[10px] font-bold rounded border border-indigo-200 bg-indigo-50 text-indigo-750 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>Start</span>
            </button>
          )}
          {row.status === 'In Progress' && (
            <button 
              onClick={() => handleUpdateStatus(val, "Completed")}
              className="flex items-center gap-0.5 px-2.5 py-1 text-[10px] font-bold rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Complete</span>
            </button>
          )}
          {row.status === 'Completed' && (
            <span className="text-[10px] text-slate-400 font-bold italic">Done</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">My Action Tasks</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Track your pending milestones, duties, and progress cards.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchTasks}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 text-xs flex items-center gap-1"
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task Item</span>
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-slate-400" />
            Active Tasks Register
          </h3>

          <div className="flex gap-1">
            {['All', 'Not Started', 'In Progress', 'Completed'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  filterStatus === st 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <CustomDataTable 
          columns={columns}
          data={filteredTasks}
          searchPlaceholder="Search my tasks..."
          searchKeys={["title", "notes", "priority", "status", "id"]}
        />
      </div>

      {/* Add Task Modal */}
      <CustomModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Action Task"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Task Title *</label>
            <input 
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Audit regional warehouse counts"
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Due Date *</label>
              <input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-medium focus:outline-none"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Notes / Instructions</label>
            <textarea 
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional specifications or target outcomes..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none font-medium resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateTask}
              className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </div>
      </CustomModal>

    </div>
  );
}
