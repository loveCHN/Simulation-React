import ReactDOM from 'react-dom';
import React, { useState } from 'react';
// import App from './App.jsx';
const App = () => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>
        <span>{count}</span>
      </h1>
    </div>
  );
};
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
