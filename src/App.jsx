import React from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Dashboard from '../src/page/dashboard/dashboard'
import ErrorBoundary from './ErrorBoundary'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <ErrorBoundary>
            <Dashboard />
          </ErrorBoundary>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App