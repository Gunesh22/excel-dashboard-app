import React from 'react'
import  {BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from '../src/page/Home/home'
import Dashboard from '../src/page/dashboard/dashboard'

const App = () => {
  return (
   <BrowserRouter>
   <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/dashboard" element={<Dashboard />} />
   </Routes>
   </BrowserRouter>
  )
}

export default App