'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, File, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface FileUploadProps {
  value?: { name: string; data: string; type: string } | null
  onChange: (file: { name: string; data: string; type: string } | null) => void
  disabled?: boolean
  accept?: string
  maxSizeMB?: number
}

/**
 * Convert a file to a base64 data URL.
 * Used for storing cotizaciones (PDF, DOCX, XLSX, images, etc.) inline in the database.
 */
function fileToBase64(file: File): Promise<{ name: string; data: string; type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        name: file.name,
        data: reader.result as string,
        type: file.type || 'application/octet-stream',
      })
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)
  })
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return '🖼️'
  if (type === 'application/pdf') return '📄'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return '📊'
  if (type.includes('zip') || type.includes('compressed')) return '🗜️'
  return '📎'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  value,
  onChange,
  disabled,
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.zip',
  maxSizeMB = 10,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      return `El archivo no puede exceder los ${maxSizeMB}MB`
    }
    return null
  }

  const processFile = useCallback(async (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }

    setIsUploading(true)
    try {
      const fileData = await fileToBase64(file)
      onChange(fileData)
      toast.success('Archivo cargado correctamente')
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar el archivo')
    } finally {
      setIsUploading(false)
    }
  }, [onChange, maxSizeMB])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    if (e.target) e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleRemove = () => {
    onChange(null)
  }

  const handleDownload = () => {
    if (!value) return
    const link = document.createElement('a')
    link.href = value.data
    link.download = value.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
        <span className="text-2xl shrink-0">{getFileIcon(value.type)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{value.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {value.type || 'Archivo'} · {formatBytes(Math.round((value.data.length * 3) / 4))}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={handleDownload}
          disabled={disabled}
        >
          <File className="h-3 w-3 mr-1" />
          Descargar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600 hover:bg-red-50"
          onClick={handleRemove}
          disabled={disabled}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center w-full h-24 rounded-lg border-2 border-dashed
        transition-colors cursor-pointer
        ${isDragging
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-muted-foreground/25 hover:border-emerald-400 hover:bg-emerald-50/50'
        }
        ${disabled || isUploading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={() => fileInputRef.current?.click()}
    >
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
          <span className="text-xs text-muted-foreground">Procesando...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Arrastra o haz clic para subir
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            PDF, DOC, XLS, imágenes, ZIP - máx. {maxSizeMB}MB
          </span>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  )
}
