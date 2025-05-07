import ReactDOM from 'react-dom';
import React, { useState } from 'react';
// import App from './App.jsx';
const Child = () => {
  return <h1>我是child</h1>;
};
const App = () => {
  const [count, setCount] = useState(0);
  if (count === 3) {
    return <Child />;
  }
  return (
    <div onClick={() => setCount(count + 1)}>
      <h1>
        <span>{count}</span>
      </h1>
    </div>
  );
};
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
