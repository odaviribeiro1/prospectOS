import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { extractCnpjs } from '../../lib/utils'

interface CnpjInputProps {
  value: string[]
  onChange: (cnpjs: string[]) => void
}

export function CnpjInput({ value, onChange }: CnpjInputProps) {
  const [rawText, setRawText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleTextChange = (text: string) => {
    setRawText(text)
    onChange(extractCnpjs(text))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setRawText(text)
      onChange(extractCnpjs(text))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const clear = () => {
    setRawText('')
    onChange([])
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={rawText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`Cole os CNPJs aqui, um por linha:\n12.345.678/0001-90\n98.765.432/0001-54\n...`}
          className="min-h-[140px] font-mono text-xs resize-none"
        />
        {rawText && (
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" />
          Upload CSV/TXT
        </Button>

        {value.length > 0 && (
          <span className="text-sm text-emerald-400 font-medium">
            {value.length} {value.length === 1 ? 'CNPJ detectado' : 'CNPJs detectados'}
          </span>
        )}
        {rawText && value.length === 0 && (
          <span className="text-sm text-amber-400">Nenhum CNPJ válido detectado</span>
        )}
      </div>
    </div>
  )
}
