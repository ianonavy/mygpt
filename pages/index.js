import Head from "next/head";
import { useEffect, useState } from "react";
import io from "socket.io-client";
import styles from "./index.module.css";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { solarizedDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

let socket;

export default function Home() {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const socketInitializer = async () => {
      await fetch("/api/socket?reset=true");
      socket = io();

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
    };
    socketInitializer();
  }, []);

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

  const stopGeneration = (e) => {
    socket.emit("stopGeneration");
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
            <div key={index} className={styles.message}>
              <div
                style={{
                  width: "80px",
                  textAlign: "right",
                  paddingRight: "10px",
                }}
              >
                {index % 2 === 0 ? "You:" : "MyGPT:"}
              </div>
              <div style={{ flex: 1, whiteSpace: "pre-line" }}>
                <ReactMarkdown
                  children={content.trim()}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          children={String(children).replace(/\n$/, "")}
                          style={solarizedDark}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        />
                      ) : (
                        <SyntaxHighlighter
                          children={String(children).replace(/\n$/, "")}
                          style={solarizedDark}
                          PreTag="div"
                          {...props}
                        />
                      );
                    },
                  }}
                />
              </div>
              {generating && index == messages.length - 1 && (
                <input
                  name="stop"
                  className={styles.stop}
                  onClick={stopGeneration}
                  type="button"
                  value="Stop"
                />
              )}
            </div>
          ))}
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
