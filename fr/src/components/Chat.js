import React, { useState, useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

const API_URL = process.env.REACT_APP_API_URL;

function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const chatEndRef = useRef(null);
  const ctrl = useRef(new AbortController()); // For aborting the request

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up the connection if the component unmounts
  useEffect(() => {
    return () => {
      ctrl.current.abort();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    // Create a new AbortController for this request
    ctrl.current = new AbortController();

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '' },
    ]);

    try {
      await fetchEventSource(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          message: input,
          provider: 'openai',
        }),
        signal: ctrl.current.signal,
        
        onopen(response) {
          if (response.ok) {
            return; // All good
          } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            // Handle client-side errors
            throw new Error(`Client error ${response.status}`);
          } else {
            // Handle server-side errors
            throw new Error(`Server error ${response.status}`);
          }
        },
        
        onmessage(event) {
          const data = JSON.parse(event.data);

          if (data.type === 'session') {
            setSessionId(data.payload.sessionId);
          } else if (data.type === 'data') {
            setMessages((prev) => {
              const lastMsgIndex = prev.length - 1;
              const updatedMessages = [...prev];
              updatedMessages[lastMsgIndex] = {
                ...updatedMessages[lastMsgIndex],
                content: updatedMessages[lastMsgIndex].content + data.payload,
              };
              return updatedMessages;
            });
          } else if (data.type === 'error') {
            setError(data.payload);
            setIsLoading(false);
            ctrl.current.abort();
          } else if (data.type === 'done') {
            setIsLoading(false);
            ctrl.current.abort();
          }
        },
        
        onclose() {
          console.log('Stream closed');
          setIsLoading(false);
        },
        
        onerror(err) {
          // This will be triggered for network errors or if onopen throws
          console.error('EventSource failed:', err);
          setError('Connection error. Please try again.');
          setIsLoading(false);
          ctrl.current.abort();
          // We need to re-throw the error to stop retries
          throw err; 
        },
      });

    } catch (err) {
      console.error('Fetch-EventSource main catch:', err);
      // This catches errors from the initial setup or re-thrown errors
      setError('Failed to send message. Please check your connection.');
      setIsLoading(false);
      // Remove the user message and the empty assistant message
      setMessages((prev) => prev.slice(0, -2));
    }
  };

  return (
    <>
      <div className="chat-container">
        {messages.map((msg, index) => (
          <div key={index} className="message-wrapper">
            <div className={`message ${msg.role}`}>
              <pre>{msg.content}</pre>
            </div>
          </div>
        ))}
        {isLoading && <div className="loading-indicator">Assistant is typing...</div>}
        {error && <div className="error-message">{error}</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            &rarr;
          </button>
        </form>
      </div>
    </>
  );
}

export default Chat;