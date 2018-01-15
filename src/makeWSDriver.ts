import xs, { Stream } from 'xstream'

export default function makeWSDriver(url: string) {
  return function WSDriver(sinks: Stream<string>) {
    // console.log('making ws driver...')
    let connection: WebSocket
    const source = xs.create({
      start: listener => {
        connection = new WebSocket(url)
        connection.onerror = err => listener.error(err)
        connection.onmessage = msg => {
          const data = JSON.parse(msg.data)
          listener.next(data)
        }

        connection.onopen = () => {
          sinks.addListener({
            next(data) {
              connection.send(JSON.stringify(data))
            },
          })
        }
      },
      stop: () => {
        connection.close()
      },
    })

    return source
  }
}
