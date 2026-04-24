import { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChatMessage } from './ChatMessage';
import { WelcomeCard } from './WelcomeCard';

export function ChatArea() {
  const { state } = useApp();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
      {state.messages.length === 0 ? (
        <WelcomeCard />
      ) : (
        state.messages.map(msg => <ChatMessage key={msg.id} message={msg} />)
      )}
      <div ref={endRef} />
    </div>
  );
}
