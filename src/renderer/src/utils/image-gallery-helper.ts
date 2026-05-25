export async function createImageThumbnail(file: File, maxDim = 400): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: maxDim,
      resizeQuality: 'high'
    })
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(URL.createObjectURL(blob!))
      })
    })
  } catch {
    return URL.createObjectURL(file)
  }
}
