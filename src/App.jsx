import React from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import CallCenterApp from './page/call-center/CallCenterApp'
import ErrorBoundary from './ErrorBoundary'

const App = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={
          <ErrorBoundary>
            <CallCenterApp />
          </ErrorBoundary>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App