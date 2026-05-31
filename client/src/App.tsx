import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'

import Login from './pages/Login'
import Dashboard from './pages/master/Dashboard'
import CompetencyAreas from './pages/master/CompetencyAreas'
import Sessions from './pages/master/Sessions'
import Activities from './pages/master/Activities'
import Users from './pages/master/Users'
import Assignments from './pages/master/Assignments'
import Problems from './pages/master/Problems'
import Reports from './pages/master/Reports'
import MyActivities from './pages/user/MyActivities'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireMaster({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.ruolo !== 'MASTER') return <Navigate to="/user/activities" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.ruolo === 'MASTER' ? '/master/dashboard' : '/user/activities'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<RootRedirect />} />
            <Route
              path="/master/*"
              element={
                <RequireMaster>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="areas" element={<CompetencyAreas />} />
                    <Route path="sessions" element={<Sessions />} />
                    <Route path="activities" element={<Activities />} />
                    <Route path="users" element={<Users />} />
                    <Route path="assignments" element={<Assignments />} />
                    <Route path="problems" element={<Problems />} />
                    <Route path="reports" element={<Reports />} />
                  </Routes>
                </RequireMaster>
              }
            />
            <Route path="/user/activities" element={<MyActivities />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
