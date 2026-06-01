import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { authStore } from './stores/AuthStore'
import { AppShell } from './components/AppShell'
import { LoginView } from './views/LoginView'
import { SignupView } from './views/SignupView'

const DashboardView = lazy(() => import('./views/DashboardView').then(m => ({ default: m.DashboardView })))
const ContactsView = lazy(() => import('./views/ContactsView').then(m => ({ default: m.ContactsView })))
const ContactDetailView = lazy(() => import('./views/ContactDetailView').then(m => ({ default: m.ContactDetailView })))
const TasksView = lazy(() => import('./views/TasksView').then(m => ({ default: m.TasksView })))
const DealsView = lazy(() => import('./views/DealsView').then(m => ({ default: m.DealsView })))
const DealDetailView = lazy(() => import('./views/DealDetailView').then(m => ({ default: m.DealDetailView })))
const CasesView = lazy(() => import('./views/CasesView').then(m => ({ default: m.CasesView })))
const TagsView = lazy(() => import('./views/TagsView').then(m => ({ default: m.TagsView })))
const ActivityView = lazy(() => import('./views/ActivityView').then(m => ({ default: m.ActivityView })))
const EmailTemplatesView = lazy(() => import('./views/EmailTemplatesView').then(m => ({ default: m.EmailTemplatesView })))
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })))

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export const App = observer(() => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/signup" element={<SignupView />} />
      <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Suspense fallback={null}><DashboardView /></Suspense>} />
        <Route path="contacts" element={<Suspense fallback={null}><ContactsView /></Suspense>} />
        <Route path="contacts/:id" element={<Suspense fallback={null}><ContactDetailView /></Suspense>} />
        <Route path="tasks" element={<Suspense fallback={null}><TasksView /></Suspense>} />
        <Route path="deals" element={<Suspense fallback={null}><DealsView /></Suspense>} />
        <Route path="deals/:id" element={<Suspense fallback={null}><DealDetailView /></Suspense>} />
        <Route path="cases" element={<Suspense fallback={null}><CasesView /></Suspense>} />
        <Route path="tags" element={<Suspense fallback={null}><TagsView /></Suspense>} />
        <Route path="activity" element={<Suspense fallback={null}><ActivityView /></Suspense>} />
        <Route path="templates" element={<Suspense fallback={null}><EmailTemplatesView /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={null}><SettingsView /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
))
