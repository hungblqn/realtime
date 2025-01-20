import React from 'react'
import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import TextChat from './pages/TextChat';
import VideoChat from './pages/VideoChat';

const App = () => {
  return (
    <Routes>
      <Route element={<Home />} path={'/'} />
      <Route element={<TextChat />} path={'/chat'} />
      <Route element={<VideoChat />} path={'/video'} />
    </Routes>
  )
}

export default App