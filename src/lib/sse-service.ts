interface SSEClient {
  userId: string
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
}

// Global SSE clients map
const clients = new Map<string, SSEClient>()

export function addSSEClient(userId: string, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  clients.set(userId, {
    userId,
    controller,
    encoder
  })
  console.log(`SSE client added: ${userId}, total clients: ${clients.size}`)
}

export function removeSSEClient(userId: string) {
  clients.delete(userId)
  console.log(`SSE client removed: ${userId}, total clients: ${clients.size}`)
}

export function sendEventToUser(userId: string, eventType: string, data: any) {
  console.log(`Attempting to send SSE event to user ${userId}: ${eventType}`)
  console.log(`Total connected clients: ${clients.size}`)
  console.log('Connected client IDs:', Array.from(clients.keys()))
  
  const client = clients.get(userId)
  if (client) {
    try {
      const eventData = JSON.stringify({
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      })
      console.log(`Sending SSE event to user ${userId}:`, eventData)
      client.controller.enqueue(client.encoder.encode(`data: ${eventData}\n\n`))
      return true
    } catch (error) {
      console.error(`Error sending SSE event to user ${userId}:`, error)
      clients.delete(userId)
      return false
    }
  } else {
    console.log(`No SSE client found for user ${userId}`)
    return false
  }
}

export function broadcastEvent(eventType: string, data: any) {
  console.log(`Broadcasting SSE event: ${eventType} to ${clients.size} clients`)
  
  const eventData = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  })
  
  let successCount = 0
  for (const [userId, client] of clients.entries()) {
    try {
      client.controller.enqueue(client.encoder.encode(`data: ${eventData}\n\n`))
      successCount++
    } catch (error) {
      console.error(`Error broadcasting to user ${userId}:`, error)
      clients.delete(userId)
    }
  }
  
  console.log(`Broadcast completed: ${successCount}/${clients.size} clients notified`)
  return successCount
}

export function getConnectedClients() {
  return Array.from(clients.keys())
}

export function getClientCount() {
  return clients.size
}