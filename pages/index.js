import Head from "next/head";
import { useContext, useEffect, useState } from "react";
import styles from "./index.module.css";

import Message from "../components/Message";
import { SocketContext } from "../context/socket";

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [generating, setGenerating] = useState(false);

  const socket = useContext(SocketContext);
  useEffect(() => {
    if (socket === undefined) {
      return;
    }
    socket.on("connect", () => {
      console.log("connected");
    });
    socket.on("messagePart", (newContent, newId) => {
      setMessages((r) => {
        const lastMessage = r[r.length - 1];
        const { id, content, role } = lastMessage;
        if (id != newId && id != null) {
          // Ignore new parts of old messages
          return r;
        }
        const message = {
          id,
          content: content + newContent,
          role,
        };
        return [...r.slice(0, -1), message];
      });
    });
    socket.on("messageEnd", () => {
      setGenerating(false);
    });

    const savedMessages = localStorage.getItem("messages");
    if (savedMessages) {
      console.log("Restoring saved messages");
      setMessages(JSON.parse(savedMessages));
      socket.emit("setContext", JSON.parse(savedMessages));
    }
  }, [socket]);

  useEffect(() => {
    if (messages.length > 0) {
      console.log("Saving messages", messages);
      window.localStorage.setItem("messages", JSON.stringify(messages));
    }
  }, [messages]);

  const onSubmit = (e) => {
    e.preventDefault();
    console.log(e.target);
    socket.emit("userMessage", userInput);
    setMessages((r) => [
      ...r,
      { role: "user", content: userInput },
      { role: "assistant", content: "", id: null },
    ]);
    setUserInput("");
    setGenerating(true);
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      onSubmit(event);
    }
  };

  const reset = () => {
    setMessages([]);
    window.localStorage.setItem("messages", JSON.stringify([]));
    socket.emit("setContext", []);
  };

  return (
    <div>
      <Head>
        <title>MyGPT</title>
        <link rel="icon" href="/dog.png" />
      </Head>

      <main className={styles.main}>
        <h3>MyGPT</h3>
        <div
          className={styles.chatbox}
          style={{ width: "800px", display: "flex", flexDirection: "column" }}
        >
          {messages.map(({ content }, index) => (
            <Message
              content={content}
              index={index}
              generating={generating}
              isLastMessage={index == messages.length - 1}
            />
          ))}
        </div>
        <div className={styles.conversationControls}>
          <button onClick={reset}>Reset Conversation</button>
          <button>Regenerate Last Message</button>
        </div>
        <form onSubmit={onSubmit} onKeyDown={onKeyDown}>
          <textarea
            type="text"
            name="userInput"
            placeholder=""
            value={userInput}
            disabled={generating}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <input type="submit" value="Submit" />
        </form>
      </main>
    </div>
  );
}
