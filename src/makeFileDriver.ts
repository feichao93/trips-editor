import xs, { Stream } from 'xstream'
import { identical } from 'ramda'

export type FileStat = ImgFileStat | TextFileStat

export type ImgFileStat = {
  file: File
  url: string
  naturalWidth: number
  naturalHeight: number
}

export type TextFileStat = {
  file: File
  content: string
}

export const openFileDialog = 'open-file-dialog'

/** Driver that opens files of different types.
 *
 * Input can be a `File` object or a open-file-dialog request.
 *
 * Output depends on the type of the files:
 * 1. For image files (jpg/bmp/webp), this driver uses `URL.createObjectURL` to create a url for
 *  this image, then measure the natural width/height of the image, and returns back a
 *  `ImgFileStat` object.
 * 2. For text files (json/txt...), this driver uses `FileReader` to read the content and
 *  return a `TextFileStat` object.
 */
export default function makeFileDriver() {
  return function fileDriver(file$: Stream<File | 'open-file-dialog'>) {
    const dialog$ = file$.filter(identical<'open-file-dialog'>('open-file-dialog'))
    const fileFromDialog$ = xs.create<File>({
      start(listener) {
        dialog$.addListener({
          next() {
            const input = document.createElement('input')
            input.type = 'file'
            input.click()
            input.onchange = f => {
              const file = input.files[0]
              if (file != null) {
                listener.next(file)
              }
            }
          },
          error(e) {
            throw e
          },
        })
      },
      stop() {},
    })

    const fileFromAppSinks$ = file$.filter(f => f instanceof File) as Stream<File>

    return xs.create<FileStat>({
      start(listener) {
        xs.merge(fileFromDialog$, fileFromAppSinks$).addListener({
          next(file) {
            if (file.name.endsWith('.json')) {
              const reader = new FileReader()
              reader.readAsText(file)
              reader.onloadend = () => {
                const content: string = reader.result
                listener.next({
                  file,
                  content,
                })
              }
            } else if (['.jpg', '.bmp', '.webp', '.png'].some(ext => file.name.endsWith(ext))) {
              const url = URL.createObjectURL(file)
              const img = document.createElement('img')
              img.classList.add('ruler')
              img.src = url
              document.body.appendChild(img)
              img.onload = () => {
                listener.next({
                  url,
                  file,
                  naturalWidth: img.naturalWidth,
                  naturalHeight: img.naturalHeight,
                })
                img.remove()
              }
            }
          },
          error(e) {
            throw e
          },
        })
      },
      stop() {},
    })
  }
}
