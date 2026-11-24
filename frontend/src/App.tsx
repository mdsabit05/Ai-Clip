import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from '@/pages/LandingPage'
import DashboardPage from '@/pages/DashboardPage'
import NewProjectPage from '@/pages/NewProjectPage'
import ProcessingPage from '@/pages/ProcessingPage'
import ClipsPage from '@/pages/ClipsPage'
import ClipEditorPage from '@/pages/ClipEditorPage'
import SettingsPage from '@/pages/SettingsPage'
import AppLayout from '@/components/ui/AppLayout'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id/processing" element={<ProcessingPage />} />
          <Route path="/projects/:id/clips" element={<ClipsPage />} />
          <Route path="/clips/:clipId" element={<ClipEditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
