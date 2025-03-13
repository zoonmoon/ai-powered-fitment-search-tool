'use client';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  const parseResponse = (text) => {
  // Replace newlines with <br>
  let formattedText = text.replace(/\n/g, '<br>');

  // Replace **text** with <strong>text</strong>
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Replace [Link](URL) with <a href="URL" target="_blank">Link</a>
  formattedText = formattedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank">View Product</a>');

      return (
        <div className="product-card">
          <p  dangerouslySetInnerHTML={{ __html: formattedText }} />
        </div>
      );
  };
  


  const handleSend = async () => {
    if (!query.trim()) return;

    setMessages((prev) => [...prev, { text: query, sender: 'user' }]);
    setQuery('');
    setLoading(true);

    setMessages((prev) => [...prev, { text: 'Searching...', sender: 'bot', typing: true }]);

    try {
      const response = await fetch(`/api/search?query=${query}`);
      const data = await response.json();

      setMessages((prev) =>
        prev.filter((msg) => !msg.typing).concat({ text: data.response || 'No results found.', sender: 'bot' })
      );
    } catch (error) {
      setTimeout(() => {
        setMessages((prev) =>
          prev.filter((msg) => !msg.typing).concat({ text: 'Error fetching data. Please try again.', sender: 'bot' })
        );
      }, 1200);
    } finally {
      setLoading(false);
    }
  };


  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSend();
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="container">
      <h2 className="title">🚀 AI Powered Fitment Search Tool</h2>

      <div className="chat-container">
        <div className="chat-box" ref={chatRef}>
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              {message.sender === 'bot' && message.text.includes('**') ? (
                <div className="parsed-response">{parseResponse(message.text)}</div>
              ) : (
                message.text
              )}
            </div>
          ))}
        </div>

        <div className="input-area">
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={handleKeyPress}
            placeholder="Ask about fitment..."
            disabled={loading} 
          />
          <button onClick={handleSend} disabled={loading}>
            {loading ? '⏳' : '➡️'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 40px;
        }
        .title {
          font-size: 1.8rem;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .chat-container {
          width: 90%;
          max-width: 500px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
          padding: 20px;
        }
        .chat-box {
          height: 350px;
          overflow-y: auto;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }
        .message {
          padding: 10px 14px;
          margin: 6px 0;
          border-radius: 8px;
          max-width: 80%;
          word-wrap: break-word;
        }
        .user {
          background: #007bff;
          color: white;
          align-self: flex-end;
          text-align: right;
          border-radius: 10px 10px 0px 10px;
        }
        .bot {
          background: #e0e0e0;
          color: black;
          border-radius: 10px 10px 10px 0px;
        }
        .parsed-response {
          padding: 10px;
          background: #f0f8ff;
          border-radius: 8px;
          margin-top: 5px;
        }
        .product-card {
          padding: 10px;
          margin-top: 10px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
        }
        .input-area {
          display: flex;
          margin-top: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 5px;
        }
        input {
          flex: 1;
          padding: 10px;
          border: none;
          outline: none;
        }
        button {
          padding: 10px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}