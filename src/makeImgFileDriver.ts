import xs, { Stream } from 'xstream'

export type ImgFileStat = {
  url: string
  file: File
  naturalWidth: number
  naturalHeight: number
}

export default function makeImgFileDriver() {
  return function imgFileDriver(file$: Stream<File>) {
    return xs.create<ImgFileStat>({
      start(listener) {
        file$.addListener({
          next(file) {
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
          },
        })
      },
      stop() {},
    })
  }
}
