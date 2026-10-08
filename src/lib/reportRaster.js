// Rasterize without html-to-image's animation-frame/decode wait, which can
// stall in background tabs or leave a rejected decode promise unhandled.
export function rasterizeReportSvg(svg, width, height, pixelRatio = 1) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const canvas = document.createElement('canvas')
    const cleanup = () => {
      clearTimeout(timer)
      image.onload = null
      image.onerror = null
      image.src = ''
      canvas.width = 0
      canvas.height = 0
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Report page image took too long to load.'))
    }, 30000)
    image.onload = () => {
      try {
        canvas.width = Math.round(width * pixelRatio)
        canvas.height = Math.round(height * pixelRatio)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Browser could not allocate a report page canvas.')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const data = canvas.toDataURL('image/png')
        if (data === 'data:,') throw new Error('Browser could not encode the report page.')
        resolve(data)
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }
    image.onerror = () => {
      cleanup()
      reject(new Error('Browser could not load the report page image.'))
    }
    image.src = svg
  })
}
