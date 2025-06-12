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
<<<<<<< HEAD
    <div>
      <Child />
      <ul onClick={() => setCount(count + 1)}>
        {arr.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
=======
    <>
      <div
        onClick={() => {
          setCount(count + 1);
        }}
      >
        <ul>
          {arr.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </>
>>>>>>> 8140111715a410f10d88a5e8cb1d1eb11362de00
  );
};
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
