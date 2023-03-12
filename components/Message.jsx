import styles from "./Message.module.css";
import { useContext } from "react";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { solarizedDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { SocketContext } from "../context/socket";

function Message({content, index, generating, isLastMessage}) {
  const socket = useContext(SocketContext);
  const stopGeneration = (e) => {
    socket.emit("stopGeneration");
  };

    return <div key={index} className={styles.message}>
    <div
    className={styles.speaker}
    >
      {index % 2 === 0 ? "You:" : "MyGPT:"}
    </div>
    <div style={{ flex: 1 }}>
      <ReactMarkdown
        children={content.trim()}
        components={{
          code({ node, inline, className, children, ...props }) {
            if (inline) {
              return <pre className={styles.inlineCode}>{children}</pre>
            }
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
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
    {generating && isLastMessage && (
      <input
        name="stop"
        className={styles.stop}
        onClick={stopGeneration}
        type="button"
        value="Stop"
      />
    )}
  </div>
}

export default Message;