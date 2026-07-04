import { useState } from 'react'
import { Card, CardHeader, CardBody } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { BoardTask } from '@vibe-coding-studio/shared'

const columns: Array<{ id: BoardTask['column']; name: string }> = [
  { id: 'idea', name: 'Idea' },
  { id: 'prompt', name: 'Prompt' },
  { id: 'design', name: 'Design' },
  { id: 'build', name: 'Build' },
  { id: 'test', name: 'Test' },
  { id: 'ship', name: 'Ship' },
]

export function BoardRoute() {
  const { boardTasks, addBoardTask, moveBoardTask, deleteBoardTask } = useStore()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingToColumn, setAddingToColumn] = useState<BoardTask['column'] | null>(null)

  const handleAddTask = (column: BoardTask['column']) => {
    if (!newTaskTitle) return

    const task: BoardTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      column,
      order: boardTasks.filter((t) => t.column === column).length,
      createdAt: new Date().toISOString(),
    }

    addBoardTask(task)
    setNewTaskTitle('')
    setAddingToColumn(null)
  }

  const getTasksForColumn = (column: BoardTask['column']) => {
    return boardTasks.filter((t) => t.column === column).sort((a, b) => a.order - b.order)
  }

  return (
    <div className="p-6 max-w-full overflow-x-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Build Board</h1>
        <p className="text-gray-400">Track your project from idea to ship</p>
      </div>

      <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
        {columns.map((column) => (
          <div key={column.id} className="w-80 flex-shrink-0">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <h3 className="font-bold">{column.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {getTasksForColumn(column.id).length} tasks
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddingToColumn(column.id)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardBody className="space-y-2">
                {addingToColumn === column.id && (
                  <div className="mb-3 space-y-2">
                    <Input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(column.id)
                        if (e.key === 'Escape') setAddingToColumn(null)
                      }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAddTask(column.id)}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAddingToColumn(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {getTasksForColumn(column.id).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition-colors cursor-move"
                  >
                    <p className="text-sm font-medium mb-2">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-400 mb-2">{task.description}</p>
                    )}
                    <div className="flex gap-1">
                      {column.id !== 'ship' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const nextColumnIndex = columns.findIndex((c) => c.id === column.id) + 1
                            if (nextColumnIndex < columns.length) {
                              moveBoardTask(task.id, columns[nextColumnIndex].id)
                            }
                          }}
                        >
                          →
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteBoardTask(task.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}

                {getTasksForColumn(column.id).length === 0 && addingToColumn !== column.id && (
                  <p className="text-sm text-gray-400 text-center py-8">No tasks</p>
                )}
              </CardBody>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
