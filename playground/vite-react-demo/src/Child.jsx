import { useState } from 'react';

const Child = () => {
  console.log('child render');

  const [count, setCount] = useState(0);
  return (
    <h1
      onClick={() => {
        setCount(count + 1);
      }}
    >
      我是child{count}
    </h1>
  );
};

export default Child;
