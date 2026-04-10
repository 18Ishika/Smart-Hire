// App.jsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/login'
import Signup from './pages/signup'
import Profile from './pages/profile'
import Job from './pages/job'
import View from './pages/view'
import Upload from './pages/upload'
import Dashboard from './pages/dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/job" element={<Job />} />
        <Route path="/list" element={<View />} />
        <Route path="/list/:id/upload" element={<Upload />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App