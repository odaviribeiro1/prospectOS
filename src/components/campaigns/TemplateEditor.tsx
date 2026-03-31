import { useRef } from 'react'
import { Bold, Italic, Link2, List } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { VariableInserter } from './VariableInserter'

interface TemplateEditorProps {
  value: string
  onChange: (v: string) => void
  activeField: 'subject' | 'body'
  onFocus: () => void
  subjectRef?: React.RefObject<HTMLInputElement>
}

export function TemplateEditor({ value, onChange, onFocus }: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current
    if (!ta) {
      onChange(value + text)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newVal = value.substring(0, start) + text + value.substring(end)
    onChange(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + text.length
      ta.selectionEnd = start + text.length
    })
  }

  const wrapSelection = (before: string, after: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.substring(start, end)
    const newVal = value.substring(0, start) + before + selected + after + value.substring(end)
    onChange(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + selected.length
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 flex-wrap">
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => wrapSelection('<strong>', '</strong>')}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => wrapSelection('<em>', '</em>')}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => {
          const url = prompt('URL do link:')
          if (url) wrapSelection(`<a href="${url}">`, '</a>')
        }}>
          <Link2 className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => insertAtCursor('\n<ul>\n  <li></li>\n</ul>')}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-auto">
          <VariableInserter onInsert={(key) => insertAtCursor(`{{${key}}}`)} />
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={`<p>Olá {{nome}},</p>\n<p>Vi que você é {{cargo}} na {{empresa}}...</p>`}
        className="min-h-[260px] font-mono text-xs resize-y"
      />
      <p className="text-xs text-muted-foreground">Aceita HTML. Use variáveis como <code className="text-primary">{'{{nome}}'}</code> para personalizar.</p>
    </div>
  )
}
