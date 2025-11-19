import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Lock } from 'lucide-react';

// --- 型定義 ---
type Priority = 'high' | 'medium' | 'low';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate: string;
}

interface HistoryItem {
  type: 'command' | 'system' | 'info' | 'success' | 'error' | 'text' | 'todo' | 'break';
  content?: string;
  data?: Todo;
}

type InputMode = 'normal' | 'password';

export default function App() {
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'Learn React', completed: true, priority: 'high', dueDate: '2025-11-19 14:00' },
    { id: 2, text: 'Submit Assignment', completed: false, priority: 'high', dueDate: '2025-11-19 23:00' },
    { id: 3, text: 'Update Portfolio', completed: false, priority: 'low', dueDate: '2025-12-01' },
  ]);
  
  // Auth & System states
  const [inputMode, setInputMode] = useState<InputMode>('normal');
  const [pendingCommand, setPendingCommand] = useState<string>('');
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const endOfLogRef = useRef<HTMLDivElement>(null);

  // Initial System Messages
  useEffect(() => {
    addToHistory([
      { type: 'system', content: 'React Terminal OS [Version 1.8.0]' },
      { type: 'system', content: '(c) React Todo Corporation. All rights reserved.' },
      { type: 'info', content: 'Type "help" for system commands.' },
      { type: 'info', content: 'Type "todo help" for task commands.' },
      { type: 'break' },
    ]);
  }, []);

  // Auto scroll
  useEffect(() => {
    endOfLogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleGlobalClick = () => {
    if (isTerminalOpen) {
      inputRef.current?.focus();
    }
  };

  const addToHistory = (lines: HistoryItem[]) => {
    setHistory((prev) => [...prev, ...lines]);
  };

  // Helper to parse arguments
  const parseTaskArgs = (argString: string) => {
    const args = argString.split(' ');
    const textParts: string[] = [];
    let priority: Priority = 'medium';
    let dueDate = '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-p' && i + 1 < args.length) {
        const p = args[i + 1].toLowerCase();
        if (['high', 'medium', 'low'].includes(p)) {
          priority = p as Priority;
        }
        i++; // skip next arg
      } else if (args[i] === '-d' && i + 1 < args.length) {
        let datePart = args[i + 1];
        i++; // consume date
        
        if (i + 1 < args.length && /^\d{1,2}:\d{2}$/.test(args[i + 1])) {
          datePart += ' ' + args[i + 1];
          i++; // consume time
        }
        dueDate = datePart;
      } else {
        textParts.push(args[i]);
      }
    }
    return { text: textParts.join(' '), priority, dueDate };
  };

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const commandLine = input.trim();

      // --- Password Handling ---
      if (inputMode === 'password') {
        if (commandLine === 'pass') {
          // Password correct
          setInputMode('normal');
          // Execute the pending command with sudo privileges
          processLine(pendingCommand, true);
          setPendingCommand('');
        } else {
          // Password incorrect
          addToHistory([{ type: 'error', content: 'Sorry, try again.' }]);
          setInputMode('normal');
          setPendingCommand('');
        }
        setInput('');
        return;
      }

      // --- Normal Command Handling ---
      if (!commandLine) {
        addToHistory([{ type: 'command', content: '' }]);
        return;
      }
      
      addToHistory([{ type: 'command', content: commandLine }]);
      processLine(commandLine, false);
      setInput('');
    }
  };

  // Wrapper to process a full command line string
  const processLine = (fullCommand: string, isSudo: boolean) => {
    const parts = fullCommand.split(' ');
    const baseCmd = parts[0].toLowerCase();

    // 1. Check for sudo
    if (baseCmd === 'sudo') {
      if (isSudo) {
        const subCmd = parts.slice(1).join(' ');
        processLine(subCmd, true);
        return;
      }
      
      const commandToRun = parts.slice(1).join(' ');
      if (!commandToRun) {
        addToHistory([{ type: 'info', content: 'usage: sudo <command>' }]);
        return;
      }
      setPendingCommand(commandToRun);
      setInputMode('password');
      addToHistory([{ type: 'text', content: '[sudo] password for guest: ' }]);
      return;
    }

    // 2. Global Commands
    
    if (baseCmd === 'help') {
      addToHistory([
        { type: 'info', content: 'System commands:' },
        { type: 'text', content: '  help                : Show this help message' },
        { type: 'text', content: '  clear               : Clear terminal screen' },
        { type: 'text', content: '  reload              : Reload page' },
        { type: 'text', content: '  exit                : Close terminal session' },
        { type: 'break' },
        { type: 'info', content: 'Type "todo help" for task management commands.' },
      ]);
      return;
    }

    if (baseCmd === 'reload') {
      addToHistory([{ type: 'system', content: 'Reloading system...' }]);
      setTimeout(() => {
        window.location.reload();
      }, 500);
      return;
    }

    if (baseCmd === 'clear') {
      setHistory([]);
      return;
    }

    if (baseCmd === 'exit') {
      if (!isSudo) {
        addToHistory([
          { type: 'error', content: 'Permission denied: System shutdown requires root privileges.' },
          { type: 'info', content: 'Hint: Try "sudo exit".' }
        ]);
      } else {
        addToHistory([{ type: 'system', content: 'Closing connection...' }]);
        setTimeout(() => {
          setIsTerminalOpen(false);
        }, 800);
      }
      return;
    }

    // 3. Check for "todo" prefix
    if (baseCmd !== 'todo') {
      addToHistory([{ type: 'error', content: `zsh: command not found: ${baseCmd}` }]);
      if (['add', 'ls', 'list', 'check', 'rm', 'del'].includes(baseCmd)) {
         addToHistory([{ type: 'info', content: `Did you mean "todo ${baseCmd}"?` }]);
      }
      return;
    }

    // 4. Extract todo subcommand
    const subCmd = parts[1] ? parts[1].toLowerCase() : '';
    const args = parts.slice(2).join(' ');

    if (!subCmd) {
      addToHistory([{ type: 'info', content: 'Type "todo help" to see available commands.' }]);
    } else {
      processTodoCommand(subCmd, args, isSudo);
    }
  };

  const processTodoCommand = (cmd: string, argString: string, isSudo: boolean) => {
    switch (cmd) {
      case 'help':
        addToHistory([
          { type: 'info', content: 'Available todo commands:' },
          { type: 'text', content: '  todo add <task> [-p high|medium|low] [-d YYYY-MM-DD [HH:MM]]' },
          { type: 'text', content: '  todo ls [-p|-d|-s] [-u] : List tasks' },
          { type: 'text', content: '  todo check <ID>     : Toggle task status' },
          { type: 'text', content: '  todo rm <ID>        : Remove a task' },
          { type: 'text', content: '  todo clear          : DELETE ALL TASKS' },
        ]);
        break;

      case 'ls':
      case 'list':
        if (todos.length === 0) {
          addToHistory([{ type: 'info', content: 'No tasks found.' }]);
        } else {
          let sortedTodos = [...todos];
          const args = argString.split(' ').filter(Boolean);
          
          const showOnlyUnfinished = args.includes('-u') || args.includes('--unfinished');
          if (showOnlyUnfinished) {
            sortedTodos = sortedTodos.filter(t => !t.completed);
          }

          const sortOption = args.find(arg => ['-p', '--priority', '-d', '--date', '-s', '--status'].includes(arg));
          let sortMsg = '';

          if (sortOption === '-p' || sortOption === '--priority') {
             const pOrder = { high: 3, medium: 2, low: 1 };
             sortedTodos.sort((a, b) => pOrder[b.priority] - pOrder[a.priority]);
             sortMsg = 'sorted by Priority';
          } else if (sortOption === '-d' || sortOption === '--date') {
             sortedTodos.sort((a, b) => {
               if (!a.dueDate) return 1; 
               if (!b.dueDate) return -1;
               return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
             });
             sortMsg = 'sorted by Due Date';
          } else if (sortOption === '-s' || sortOption === '--status') {
             sortedTodos.sort((a, b) => Number(a.completed) - Number(b.completed));
             sortMsg = 'sorted by Status';
          } else {
             sortedTodos.sort((a, b) => a.id - b.id);
          }

          let msg = 'Listing tasks';
          if (showOnlyUnfinished) msg += ' (unfinished only)';
          if (sortMsg) msg += ` ${sortMsg}`;
          msg += ':';

          addToHistory([{ type: 'info', content: msg }]);

          if (sortedTodos.length === 0) {
             addToHistory([{ type: 'text', content: 'No matching tasks found.' }]);
          } else {
            const todoList = sortedTodos.map(todo => ({
              type: 'todo' as const,
              data: todo
            }));
            addToHistory([
              { type: 'info', content: 'ID  | STS  | PRI  | DUE              | TASK' },
              { type: 'text', content: '------------------------------------------------------' },
              ...todoList
            ]);
          }
        }
        break;

      case 'add':
        if (!argString) {
          addToHistory([{ type: 'error', content: 'Error: Please provide a task description.' }]);
        } else {
          const { text, priority, dueDate } = parseTaskArgs(argString);
          
          if (!text) {
            addToHistory([{ type: 'error', content: 'Error: Task text is missing.' }]);
            return;
          }

          const newId = todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1;
          const newTodo: Todo = { id: newId, text, completed: false, priority, dueDate };
          setTodos([...todos, newTodo]);
          addToHistory([{ type: 'success', content: `Task added: [ID:${newId}] ${text}` }]);
        }
        break;

      case 'check':
      case 'toggle':
        const toggleId = parseInt(argString);
        if (isNaN(toggleId)) {
          addToHistory([{ type: 'error', content: 'Error: Please provide a valid ID.' }]);
        } else {
          const todoExists = todos.find(t => t.id === toggleId);
          if (todoExists) {
            setTodos(todos.map(t => t.id === toggleId ? { ...t, completed: !t.completed } : t));
            addToHistory([{ type: 'success', content: `Task [ID:${toggleId}] status updated.` }]);
          } else {
            addToHistory([{ type: 'error', content: `Error: Task [ID:${toggleId}] not found.` }]);
          }
        }
        break;

      case 'priority':
      case 'p':
        const [pIdStr, pLevel] = argString.split(' ');
        const pId = parseInt(pIdStr);
        if (isNaN(pId) || !['high', 'medium', 'low'].includes(pLevel?.toLowerCase())) {
          addToHistory([{ type: 'error', content: 'Usage: todo priority <ID> <high|medium|low>' }]);
        } else {
          const exists = todos.find(t => t.id === pId);
          if (exists) {
            setTodos(todos.map(t => t.id === pId ? { ...t, priority: pLevel.toLowerCase() as Priority } : t));
            addToHistory([{ type: 'success', content: `Task [ID:${pId}] priority set to ${pLevel}.` }]);
          } else {
            addToHistory([{ type: 'error', content: `Error: Task [ID:${pId}] not found.` }]);
          }
        }
        break;

      case 'due':
        const dueArgs = argString.split(' ');
        const dId = parseInt(dueArgs[0]);
        const dDate = dueArgs.slice(1).join(' ');

        if (isNaN(dId) || !dDate) {
          addToHistory([{ type: 'error', content: 'Usage: todo due <ID> <YYYY-MM-DD> [HH:MM]' }]);
        } else {
          const exists = todos.find(t => t.id === dId);
          if (exists) {
            setTodos(todos.map(t => t.id === dId ? { ...t, dueDate: dDate } : t));
            addToHistory([{ type: 'success', content: `Task [ID:${dId}] due date set to ${dDate}.` }]);
          } else {
            addToHistory([{ type: 'error', content: `Error: Task [ID:${dId}] not found.` }]);
          }
        }
        break;

      case 'rm':
      case 'delete':
        const deleteId = parseInt(argString);
        if (isNaN(deleteId)) {
          addToHistory([{ type: 'error', content: 'Error: Please provide a valid ID.' }]);
        } else {
          const todoExists = todos.find(t => t.id === deleteId);
          if (todoExists) {
            setTodos(todos.filter(t => t.id !== deleteId));
            addToHistory([{ type: 'success', content: `Task [ID:${deleteId}] removed.` }]);
          } else {
            addToHistory([{ type: 'error', content: `Error: Task [ID:${deleteId}] not found.` }]);
          }
        }
        break;

      case 'clear':
        if (!isSudo) {
          addToHistory([
            { type: 'error', content: 'Permission denied: Unable to clear database.' },
            { type: 'info', content: 'Hint: This command requires root privileges. Try "sudo todo clear".' }
          ]);
        } else {
          setTodos([]);
          addToHistory([
            { type: 'success', content: 'System Message: ALL TASKS HAVE BEEN DELETED.' },
            { type: 'info', content: 'Database reset complete.' }
          ]);
        }
        break;
      
      default:
        addToHistory([{ type: 'error', content: `todo: '${cmd}' is not a todo command. See 'todo help'.` }]);
    }
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const renderLine = (line: HistoryItem, index: number) => {
    switch (line.type) {
      case 'command':
        return (
          <div key={index} className="flex items-center text-gray-300 mt-1">
            <span className="text-green-500 font-bold mr-2">guest@todo-app:~$</span>
            <span>{line.content}</span>
          </div>
        );
      case 'system':
        return <div key={index} className="text-gray-400 font-mono">{line.content}</div>;
      case 'info':
        return <div key={index} className="text-blue-400 font-bold mt-1 whitespace-pre-wrap">{line.content}</div>;
      case 'success':
        return <div key={index} className="text-green-400 mt-1">{line.content}</div>;
      case 'error':
        return <div key={index} className="text-red-400 mt-1">{line.content}</div>;
      case 'text':
        return <div key={index} className="text-gray-300 ml-2 whitespace-pre-wrap">{line.content}</div>;
      case 'todo':
        if (!line.data) return null;
        const { id, completed, priority, dueDate, text } = line.data;
        return (
          <div key={index} className={`flex flex-wrap items-center ml-0 sm:ml-2 font-mono ${completed ? 'opacity-50' : ''}`}>
            <span className="text-yellow-500 w-8 sm:w-10">[{id}]</span>
            <span className={`w-12 sm:w-16 ${completed ? 'text-green-500' : 'text-red-500'}`}>
              {completed ? 'DONE' : 'TODO'}
            </span>
            <span className={`w-12 sm:w-16 text-xs uppercase font-bold ${getPriorityColor(priority)}`}>
              {priority.substring(0, 3)}
            </span>
            <span className="w-32 sm:w-40 text-gray-400 text-xs">
              {dueDate || '----------'}
            </span>
            <span className={`flex-1 ${completed ? 'line-through text-gray-500' : 'text-white'}`}>
              {text}
            </span>
          </div>
        );
      case 'break':
        return <div key={index} className="h-2"></div>;
      default:
        return <div key={index} className="text-gray-300 ml-2">{line.content}</div>;
    }
  };

  // Exit Screen
  if (!isTerminalOpen) {
    return (
      <div className="min-h-screen bg-black p-8 font-mono text-gray-500 flex flex-col">
        <div>Process terminated. Connection to guest@todo-app closed.</div>
        <div className="mt-4">
            <button 
                onClick={() => window.location.reload()} 
                className="border border-gray-700 px-4 py-2 hover:bg-gray-900 hover:text-white transition-colors text-sm"
            >
                Reconnect
            </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-900 p-2 sm:p-8 font-mono flex items-center justify-center"
      onClick={handleGlobalClick}
    >
      <div className="w-full max-w-4xl bg-black rounded-lg shadow-2xl border border-gray-700 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh]">
        
        {/* Header */}
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Terminal size={14} />
            <span>guest — zsh {inputMode === 'password' ? '(sudo)' : ''}</span>
          </div>
          <div className="w-10 flex justify-end">
             {inputMode === 'password' && <Lock size={14} className="text-yellow-500" />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto text-xs sm:text-base custom-scrollbar bg-opacity-95 bg-black cursor-text" onClick={handleGlobalClick}>
          <div className="space-y-0.5">
            {history.map((line, index) => renderLine(line, index))}
          </div>

          {/* Input */}
          <div className="flex items-center mt-2 text-gray-300 group">
             {inputMode === 'normal' ? (
                <span className="text-green-500 font-bold mr-2 whitespace-nowrap">guest@todo-app:~$</span>
             ) : (
                <span className="text-white font-bold mr-2 whitespace-nowrap"></span>
             )}
            
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type={inputMode === 'password' ? "password" : "text"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleCommand}
                className="w-full bg-transparent border-none outline-none text-gray-100 font-mono caret-transparent p-0 m-0 focus:ring-0"
                autoFocus
                autoComplete="off"
                spellCheck="false"
              />
              {/* Custom Cursor & Input Mirror */}
              <span className="absolute left-0 top-0 pointer-events-none flex">
                {inputMode === 'password' ? (
                  <span className="whitespace-pre"></span>
                ) : (
                  <span className="whitespace-pre">{input}</span>
                )}
                <span className="w-2.5 h-4 sm:h-5 bg-gray-400 animate-pulse ml-0.5 inline-block align-middle mt-0.5"></span>
              </span>
            </div>
          </div>
          <div ref={endOfLogRef} />
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}