import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

export function useSocket(event, callback) {
  useEffect(() => {
    socket.on(event, callback)
    return () => socket.off(event, callback)
  }, [event, callback])
}

export function useDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDevices()
    socket.on('devices_updated', (data) => {
      setDevices(data)
    })
    return () => socket.off('devices_updated')
  }, [])

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices')
      const data = await res.json()
      setDevices(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch devices:', error)
      setLoading(false)
    }
  }

  return { devices, loading, refetch: fetchDevices }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
    socket.on('new_alert', (alert) => {
      setAlerts((prev) => [alert, ...prev])
    })
    socket.on('alert_resolved', (alert) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, resolved: true } : a))
      )
    })
    return () => {
      socket.off('new_alert')
      socket.off('alert_resolved')
    }
  }, [])

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts')
      const data = await res.json()
      setAlerts(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
      setLoading(false)
    }
  }

  const resolveAlert = async (id) => {
    try {
      await fetch(`/api/alerts/${id}/resolve`, { method: 'PATCH' })
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  return { alerts, loading, resolveAlert, refetch: fetchAlerts }
}
