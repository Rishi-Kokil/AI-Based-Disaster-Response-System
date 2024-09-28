import { useState } from 'react'
import './App.css'
import MapComponent from './Components/map'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1> Map is Printed below</h1>
        <MapComponent />
      </div>
      
    </>
  )
}

export default App
