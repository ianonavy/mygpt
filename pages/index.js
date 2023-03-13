import Head from "next/head";
import { useContext, useEffect, useState } from "react";
import styles from "./index.module.css";

import Message from "../components/Message";
import { SocketContext } from "../context/socket";

const COST_PER_1K_TOKENS = 0.002;

function getCost(numTokens) {
  return (numTokens / 1000) * COST_PER_1K_TOKENS;
}

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [userInputTokens, setUserInputTokens] = useState(0);
  const [messages, setMessages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const initialTokenStats = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };
  const [tokenStats, setTokenStats] = useState(initialTokenStats);

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
    socket.on("messageEnd", (e) => {
      setGenerating(false);
      setTokenStats(e);
      setTotalTokens((total) => total + e.totalTokens);
    });
    socket.on("userTokenResp", (e) => {
      setUserInputTokens(e);
    });

    const savedMessages = localStorage.getItem("messages");
    if (savedMessages) {
      console.log("Restoring saved messages");
      setMessages(JSON.parse(savedMessages));
      socket.emit("setContext", JSON.parse(savedMessages));
    }
    const savedTokenStats = localStorage.getItem("tokenStats");
    if (savedTokenStats) {
      setTokenStats(JSON.parse(savedTokenStats));
    }
    const savedTotalTokens = localStorage.getItem("totalTokens");
    if (savedTotalTokens) {
      setTotalTokens(JSON.parse(savedTotalTokens));
    }

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (messages.length > 0) {
      console.log("Saving messages", messages);
      window.localStorage.setItem("messages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (tokenStats.totalTokens > 0) {
      window.localStorage.setItem("tokenStats", JSON.stringify(tokenStats));
    }
  }, [tokenStats]);

  useEffect(() => {
    if (totalTokens) {
      window.localStorage.setItem("totalTokens", JSON.stringify(totalTokens));
    }
  }, [totalTokens]);

  const sendUserInput = (userMessage) => {
    socket.emit("userMessage", userMessage);
    setMessages((r) => [
      ...r,
      { role: "user", content: userMessage },
      { role: "assistant", content: "", id: null },
    ]);
    setGenerating(true);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (userInput.trim()) {
      sendUserInput(userInput);
      setUserInput("");
    }
  };

  const onKeyDown = (event) => {
    socket.emit("userTokenReq", userInput);
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      onSubmit(event);
    }
  };

  const reset = () => {
    setMessages([]);
    setTokenStats(initialTokenStats);
    setTotalTokens(0);
    window.localStorage.setItem("messages", JSON.stringify([]));
    socket.emit("setContext", []);
  };

  const regenerate = async () => {
    const lastUserMessage = messages[messages.length - 2].content;
    console.log(lastUserMessage);
    const rolledBackMessages = messages.slice(0, -2);
    setMessages(rolledBackMessages);
    socket.emit("setContext", rolledBackMessages);
    sendUserInput(lastUserMessage);
  };

  const editMessage = (index, message) => {
    setMessages((messages) => {
      const rolledBackMessages = messages.slice(0, index);
      console.log(rolledBackMessages);
      socket.emit("setContext", rolledBackMessages);
      socket.emit("userMessage", message);
      return [
        ...rolledBackMessages,
        { role: "user", content: message },
        { role: "assistant", content: "", id: null },
      ];
    });
    setGenerating(true);
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
              regenerate={regenerate}
              editMessage={editMessage}
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <form onSubmit={onSubmit} onKeyDown={onKeyDown}>
            <textarea
              type="text"
              name="userInput"
              placeholder=""
              value={userInput}
              disabled={generating}
              onChange={(e) => setUserInput(e.target.value)}
            />
            <input type="submit" value="Send" />
          </form>
          <div className={styles.conversationControls}>
            <button onClick={reset}>Reset Conversation</button>
          </div>
          <div className={styles.costSummary}>
            <h4>Cost estimates</h4>
            <div>
              Next message: at least $
              {getCost(tokenStats.totalTokens + userInputTokens).toFixed(6)}
            </div>
            <div>Total cost: ${getCost(totalTokens).toFixed(6)}</div>
            <div>
              Tokens remaining:{" "}
              {4096 - (tokenStats.totalTokens + userInputTokens)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
