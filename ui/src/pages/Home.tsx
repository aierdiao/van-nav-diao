import React from 'react';
import ColaPet from '../components/ColaPet';
import Content from '../components/Content';

const Home: React.FC = () => {
  return (
    <div className="App">
      <div className="main">
        <Content />
      </div>
      <ColaPet />
    </div>
  );
};

export default Home;
