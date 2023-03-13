import styles from "./Message.module.css";
import { useContext, useState } from "react";
import ReactMarkdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { solarizedDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { SocketContext } from "../context/socket";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faPaperPlane,
  faRotate,
  faStop,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

function Message({
  content,
  index,
  generating,
  isLastMessage,
  editMessage,
  regenerate,
}) {
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState(content);

  const socket = useContext(SocketContext);
  const stopGeneration = (e) => {
    socket.emit("stopGeneration");
  };

  const enableEdit = (e) => {
    setEditMode(true);
  };

  const cancelEdit = (e) => {
    setEditMode(false);
    setMessage(content);
  };

  const saveEdit = (e) => {
    setEditMode(false);
    editMessage(index, message);
  };

  const onEditChange = (e) => {
    setMessage(e.target.value);
  };

  const isUserMessage = index % 2 === 0;

  return (
    <div key={index} className={styles.message}>
      <div className={styles.speaker}>{isUserMessage ? "You:" : "MyGPT:"}</div>
      <div style={{ flex: 1 }}>
        {(editMode && (
          <>
            <textarea className={styles.editText} onChange={onEditChange}>
              {message}
            </textarea>
            <p className={styles.editHint}>
              <FontAwesomeIcon icon={faTriangleExclamation} /> Editing a message
              will delete all messages after this one.
            </p>
          </>
        )) || (
          <ReactMarkdown
            children={content.trim()}
            components={{
              code({ node, inline, className, children, ...props }) {
                if (inline) {
                  return <pre className={styles.inlineCode}>{children}</pre>;
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
        )}
      </div>
      <div className={styles.messageControls}>
        {!isLastMessage &&
          isUserMessage &&
          ((editMode && (
            <div className={styles.editControls}>
              <button className={styles.save} onClick={saveEdit}>
                <FontAwesomeIcon icon={faPaperPlane} />
                send
              </button>
              <button className={styles.cancel} onClick={cancelEdit}>
                cancel
              </button>
            </div>
          )) || (
            <button className={styles.edit} onClick={enableEdit}>
              <FontAwesomeIcon icon={faEdit} />
              edit
            </button>
          ))}
        {generating && isLastMessage && (
          <button className={styles.stop} onClick={stopGeneration}>
            <FontAwesomeIcon icon={faStop} />
            stop
          </button>
        )}
        {!generating && isLastMessage && (
          <button className={styles.regen} onClick={regenerate}>
            <FontAwesomeIcon icon={faRotate} />
            regen
          </button>
        )}
      </div>
    </div>
  );
}

export default Message;
