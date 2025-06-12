import ReactDOM from 'react-dom';
import { useState } from 'react';
import Child from './Child';
const App = () => {
  const [count, setCount] = useState(0);
  const arr = count % 2 === 0 ? [1, 2, 3] : [3, 2, 1];
  if (count === 3) {
    return <Child />;
  }
  return (
    <div>
      <Child />
      <ul onClick={() => setCount(count + 1)}>
        {arr.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
