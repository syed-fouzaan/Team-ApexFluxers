import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import WebcamFeed from './WebcamFeed'; // Import the WebcamFeed component

function App() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [gestureResult, setGestureResult] = useState('');
  const websocketRef = useRef(null);

  // Function to handle case selection
  const handleCaseSelect = (caseNumber) => {
    console.log(`Case selected: ${caseNumber}`);
    setSelectedCase(caseNumber);
    setGestureResult(''); // Clear previous result when case changes
    // The sending logic will now be handled by the useEffect below
  };

  // Effect to manage WebSocket connection (runs once on mount)
  useEffect(() => {
    console.log('Attempting to connect WebSocket...');
    // Replace with your backend WebSocket URL
    const wsUrl = 'ws://localhost:5000/gesture_stream';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connection opened');
      websocketRef.current = ws;
      // Now that the WebSocket is open, if a case was already selected, send it.
      // This handles the case where a button was clicked before the connection opened.
      if (selectedCase !== null) {
         console.log(`WebSocket opened, sending initial selected case ${selectedCase}`);
         ws.send(JSON.stringify({ case: selectedCase }));
      }
    };

    ws.onmessage = (event) => {
      console.log("Received message:", event.data);
      // Assuming the backend sends JSON with a 'frame' and potentially 'gesture'
      try {
        const data = JSON.parse(event.data);
        // The WebcamFeed component handles the frame.
        // We only update gestureResult if the backend sends a specific gesture message.
        if (data.gesture) {
           setGestureResult(data.gesture);
        } else if (typeof data === 'string') {
           // Fallback for simple string messages
           setGestureResult(data);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
        // Handle non-JSON messages or errors
        setGestureResult(`Received: ${event.data}`);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setGestureResult('WebSocket Error');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      websocketRef.current = null;
      setGestureResult('WebSocket Closed');
    };

    // Clean up the WebSocket connection when the component unmounts
    return () => {
      console.log('Cleaning up WebSocket connection...');
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []); // Empty dependency array: runs only on mount and unmount

  // Effect to send selectedCase when it changes AND WebSocket is open
  useEffect(() => {
    console.log('selectedCase or websocketRef.current changed.');
    if (selectedCase !== null && websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      console.log(`Sending selected case ${selectedCase} via WebSocket.`);
      websocketRef.current.send(JSON.stringify({ case: selectedCase }));
    } else {
      console.log('Conditions not met to send case:', { selectedCase, websocketReadyState: websocketRef.current?.readyState });
    }
  }, [selectedCase, websocketRef.current]); // Dependencies: selectedCase and websocketRef.current

  console.log('App rendering with selectedCase:', selectedCase, 'and websocketRef.current:', websocketRef.current);


  return (
    <div className="App">
      <header className="App-header">
        <h1>Hand Gesture Recognition</h1>
      </header>
      <main>
        <div className="video-container">
          {/* Render the WebcamFeed component */}
          <WebcamFeed websocket={websocketRef.current} selectedCase={selectedCase} />
        </div>

        <div className="controls">
          <h2>Select Gesture Case</h2>
           <div>
             <button
               onClick={() => handleCaseSelect(1)}
               className={selectedCase === 1 ? 'active' : ''} // Add active class
               disabled={selectedCase === 1}
             >
               Case 1 (Photo Capture)
             </button>
             <button
               onClick={() => handleCaseSelect(2)}
               className={selectedCase === 2 ? 'active' : ''} // Add active class
               disabled={selectedCase === 2}
             >
               Case 2 (YouTube Control)
             </button>
             <button
               onClick={() => handleCaseSelect(3)}
               className={selectedCase === 3 ? 'active' : ''} // Add active class
               disabled={selectedCase === 3}
             >
               Case 3 (PowerPoint Control)
             </button>
           </div>
        </div>

        <div className="results">
          <h2>Gesture Result</h2>
          <p>{gestureResult || 'Awaiting gesture...'}</p>
        </div>
      </main>
    </div>
  );
}

export default App;