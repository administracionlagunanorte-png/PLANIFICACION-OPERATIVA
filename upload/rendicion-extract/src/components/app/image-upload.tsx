'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Camera, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

/**
 * Compress and resize an image file to a base64 data URL.
 * - Max dimension: 1200px (preserves aspect ratio)
 * - Output: JPEG at 80% quality (much smaller than PNG for photos)
 * - Falls back to original if canvas is not supported
 */
async function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = () => {
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)

    img.onload = () => {
      const MAX_DIMENSION = 1200
      let { width, height } = img

      // Resize if larger than max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width / height) * MAX_DIMENSION)
          height = MAX_DIMENSION
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        // Fallback: return original base64 if canvas not supported
        resolve(reader.result as string)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Compress as JPEG at 80% quality
      const base64 = canvas.toDataURL('image/jpeg', 0.8)
      resolve(base64)
    }

    img.onerror = () => reject(new Error('Error al procesar la imagen'))
  })
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return 'Solo se permiten archivos JPG y PNG'
    }
    const maxSize = 10 * 1024 * 1024 // 10MB original file limit
    if (file.size > maxSize) {
      return 'El archivo no puede exceder los 10MB'
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
      // Compress and convert to base64 on the client
      const base64 = await compressImageToBase64(file)
      onChange(base64)
      toast.success('Imagen cargada correctamente')
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar la imagen')
    } finally {
      setIsUploading(false)
    }
  }, [onChange])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
    // Reset input
    if (e.target) e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleRemove = () => {
    onChange(null)
  }

  if (value) {
    return (
      <div className="relative group rounded-lg overflow-hidden border border-border w-fit">
        <img
          src={value}
          alt="Comprobante de gasto"
          className="w-24 h-24 object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-7 w-7"
            onClick={handleRemove}
            disabled={disabled || isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed
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
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Arrastra o haz clic para subir
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              JPG, PNG - máx. 10MB
            </span>
          </div>
        )}
      </div>

      {/* Regular file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* Camera input for mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs flex-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          <Upload className="h-3 w-3 mr-1" />
          Examinar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs flex-1"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          <Camera className="h-3 w-3 mr-1" />
          Cámara
        </Button>
      </div>
    </div>
  )
}
