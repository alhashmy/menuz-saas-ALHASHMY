/** يجهّز صور الأطباق قبل رفعها: قص مركزي موحّد 4:3 وتحويل JPEG أخف. */
export async function cropMenuItemImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('اختر ملف صورة صالحًا.')
  const source = await createImageBitmap(file)
  const aspect = 4 / 3
  const sourceAspect = source.width / source.height
  const sourceWidth = sourceAspect > aspect ? Math.round(source.height * aspect) : source.width
  const sourceHeight = sourceAspect > aspect ? source.height : Math.round(source.width / aspect)
  const sourceX = Math.max(0, Math.round((source.width - sourceWidth) / 2))
  const sourceY = Math.max(0, Math.round((source.height - sourceHeight) / 2))
  const width = Math.min(1200, sourceWidth)
  const height = Math.round(width / aspect)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('تعذر تجهيز الصورة.')
  context.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
  source.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('تعذر تجهيز الصورة.')), 'image/jpeg', 0.9)
  )
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'dish'}-menu.jpg`, { type: 'image/jpeg' })
}
