import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Home from './pages/Home'
import ContentStudio from './pages/ContentStudio'
import MediaLibrary from './pages/MediaLibrary'
import Schedule from './pages/Schedule'
import Activity from './pages/Activity'
import Connections from './pages/Connections'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="studio" element={<ContentStudio />} />
          <Route path="studio/:postId" element={<ContentStudio />} />
          <Route path="library" element={<MediaLibrary />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="activity" element={<Activity />} />
          <Route path="connections" element={<Connections />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
