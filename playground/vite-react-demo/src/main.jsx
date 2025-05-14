import ReactDOM from 'react-dom';
import React, { useState } from 'react';
// import App from './App.jsx';
const Child = () => {
  return <h1>我是child</h1>;
};
const App = () => {
  const [count, setCount] = useState(0);
  const arr = count % 2 === 0 ? [1, 2, 3] : [3, 2, 1];
  if (count === 3) {
    return <Child />;
  }
  return (
    <div onClick={() => setCount(count + 1)}>
      <ul>
        {arr.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
