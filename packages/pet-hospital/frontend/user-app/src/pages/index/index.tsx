import { Component, createSignal } from 'solid-js';
import './index.scss';

const Index: Component = () => {
  const [messages, setMessages] = createSignal([
    { role: 'ai', content: '你好！我是 PetAI 健康助手 🐾 请问你的宠物有什么不舒服吗？' }
  ]);
  const [input, setInput] = createSignal('');

  const sendMessage = () => {
    if (!input()) return;

    setMessages([...messages(), { role: 'user', content: input() }]);
    setInput('');

    // TODO: Call API to get AI response
  };

  return (
    <div class="page">
      <div class="chat-area">
        {messages().map(msg => (
          <div class={`message ${msg.role}`}>
            <div class="avatar">{msg.role === 'ai' ? '🐱' : '👤'}</div>
            <div class="message-content">{msg.content}</div>
          </div>
        ))}
      </div>

      <div class="quick-commands">
        <button class="quick-cmd" onClick={() => setInput('猫吐了怎么办？')}>🤮 猫吐了</button>
        <button class="quick-cmd" onClick={() => setInput('狗不吃东西')}>🍖 不吃东西</button>
        <button class="quick-cmd" onClick={() => setInput('皮肤发红')}>🔴 皮肤问题</button>
      </div>

      <div class="input-area">
        <input
          class="input-field"
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          placeholder="描述宠物症状..."
        />
        <button class="send-btn" onClick={sendMessage}>➤</button>
      </div>
    </div>
  );
};

export default Index;
