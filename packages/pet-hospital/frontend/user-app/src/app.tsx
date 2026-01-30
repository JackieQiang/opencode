import { Component } from 'solid-js';
import './app.scss';

const App: Component = () => {
  return (
    <div class="app">
      <div class="chat-area">
        <slot />
      </div>
    </div>
  );
};

export default App;
