import { useState } from 'react'
import { clipsApi } from '@/services/api'

export function useDownload() {
  const [downloading, setDownloading] = useState<string | null>(null)

  const downloadClip = async (clipId: string, filename: string) => {
    setDownloading(clipId)
    try {
      const blob = await clipsApi.download(clipId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename.endsWith('.mp4') ? filename : `${filename}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  return { downloadClip, downloading }
}
