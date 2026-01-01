import { useState, useEffect } from 'react'

interface AdminAuthState {
  isAdmin: boolean
  isLoading: boolean
  loginTime: string | null
  error: string | null
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    loginTime: null,
    error: null
  })

  // 检查登录状态
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/admin/auth/status')
      const data = await response.json()

      setState({
        isAdmin: data.isAdmin || false,
        isLoading: false,
        loginTime: data.loginTime || null,
        error: null
      })
    } catch (error) {
      console.error('Failed to check admin status:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check status'
      }))
    }
  }

  // 登录
  const login = async (password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 存储token到localStorage（备用）
        if (data.token) {
          localStorage.setItem('admin_token', data.token)
        }

        setState({
          isAdmin: true,
          isLoading: false,
          loginTime: new Date().toISOString(),
          error: null
        })

        return true
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Login failed'
        }))
        return false
      }
    } catch (error) {
      console.error('Admin login error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error'
      }))
      return false
    }
  }

  // 登出
  const logout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Admin logout error:', error)
    } finally {
      // 清除本地存储
      localStorage.removeItem('admin_token')
      setState({
        isAdmin: false,
        isLoading: false,
        loginTime: null,
        error: null
      })
    }
  }

  // 组件挂载时检查状态
  useEffect(() => {
    checkStatus()
  }, [])

  return {
    isAdmin: state.isAdmin,
    isLoading: state.isLoading,
    loginTime: state.loginTime,
    error: state.error,
    login,
    logout,
    refreshStatus: checkStatus
  }
}
