import { Card, CardHeader, CardBody } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Download, CheckCircle } from 'lucide-react'
import { useStore } from '../lib/store'

export function ChecklistRoute() {
  const { checklist, toggleChecklistItem } = useStore()

  const byCategory = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, typeof checklist>)

  const completedCount = checklist.filter((item) => item.isComplete).length
  const totalCount = checklist.length
  const progress = Math.round((completedCount / totalCount) * 100)

  const exportMarkdown = () => {
    let markdown = '# Production Readiness Checklist\n\n'
    
    for (const [category, items] of Object.entries(byCategory)) {
      markdown += `## ${category}\n\n`
      for (const item of items) {
        markdown += `- [${item.isComplete ? 'x' : ' '}] ${item.title}\n`
        if (item.description) {
          markdown += `  ${item.description}\n`
        }
      }
      markdown += '\n'
    }
    
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'checklist.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Production Checklist</h1>
          <p className="text-gray-400">Ensure your project is ready for production</p>
        </div>
        <Button onClick={exportMarkdown}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Overall Progress</h3>
              <p className="text-sm text-gray-400">
                {completedCount} of {totalCount} items complete
              </p>
            </div>
            <Badge variant={progress === 100 ? 'success' : 'primary'} className="text-lg px-4 py-2">
              {progress}%
            </Badge>
          </div>
          <div className="w-full bg-[var(--card-bg)] rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardBody>
      </Card>

      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{category}</h3>
                <Badge variant="default">
                  {items.filter((i) => i.isComplete).length}/{items.length}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-3 hover:bg-[var(--card-bg)] rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={item.isComplete}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="mt-1 w-5 h-5 rounded border-2 border-[var(--border)] bg-[var(--card-bg)] checked:bg-[var(--primary)] checked:border-[var(--primary)] cursor-pointer"
                    />
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          item.isComplete ? 'line-through text-gray-500' : ''
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                      )}
                    </div>
                    {item.isComplete && (
                      <CheckCircle className="w-5 h-5 text-[var(--highlight)] flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
