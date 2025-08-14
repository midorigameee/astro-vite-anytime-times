import React, { useState, useEffect, useRef } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import {
  ChatBubbleOutline,
  DeleteOutline,
  EditOutlined,
} from "@mui/icons-material";

// 型定義をファイル内に再定義
interface Reply {
  id: number;
  user: { name: string; avatar: string };
  text: string;
  timestamp: string;
  image?: string;
}

interface Message {
  id: number;
  user: { name: string; avatar: string };
  text: string;
  timestamp: string;
  replies: Reply[];
  image?: string;
}

interface EditingMessage {
  id: number;
  text: string;
  replyId?: number;
}

// Propsの型定義
interface TimelineProps {
  messages: Message[];
  editingMessage: EditingMessage | null;
  onStartReply: (messageId: number) => void;
  onDeleteMessage: (messageId: number, replyId?: number) => void;
  onStartEdit: (editInfo: EditingMessage) => void;
  onCancelEdit: () => void;
  onUpdateMessage: (editInfo: EditingMessage) => void;
}

// URLを検出し、<a>タグに変換するヘルパー関数
const linkify = (text: string) => {
  const urlRegex =
    /\bhttps?:\/\/(?:[a-zA-Z0-9\-._~%]+(?::[a-zA-Z0-9\-._~%]*)?@)?(?:[a-zA-Z0-9\-._~%]+|\[[a-fA-F0-9:.]+\])(?::\d{2,5})?(?:[/?#][^\s"]*)?/g;

  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <Link href={part} target="_blank" rel="noopener noreferrer" key={i}>
          {part}
        </Link>
      );
    }
    return part;
  });
};

const Timeline: React.FC<TimelineProps> = ({
  messages,
  editingMessage,
  onStartReply,
  onDeleteMessage,
  onStartEdit,
  onCancelEdit,
  onUpdateMessage,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (editingMessage) {
      setEditText(editingMessage.text);
    } else {
      setEditText("");
    }
  }, [editingMessage]);

  useEffect(() => {
    if (!editingMessage) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, editingMessage]);

  const handleUpdate = () => {
    if (editingMessage) {
      onUpdateMessage({ ...editingMessage, text: editText });
    }
  };

  const renderMessageContent = (text: string, image?: string) => (
    <Box component="span">
      <Typography
        component="span"
        variant="body1"
        color="text.primary"
        sx={{ whiteSpace: "pre-wrap" }}
      >
        {linkify(text)}
      </Typography>
      {image && (
        <Box mt={1}>
          <img
            src={image}
            alt="投稿画像"
            style={{
              maxWidth: "300px",
              maxHeight: "300px",
              borderRadius: "8px",
            }}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <List>
      {messages.map((msg) => {
        const isEditing =
          editingMessage?.id === msg.id && !editingMessage.replyId;
        return (
          <React.Fragment key={msg.id}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Avatar>{msg.user.avatar}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography component="span" sx={{ fontWeight: "bold" }}>
                    {msg.user.name}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {msg.timestamp}
                    </Typography>
                  </Typography>
                }
                secondary={
                  isEditing ? (
                    <Box component="span">
                      <TextField
                        fullWidth
                        multiline
                        variant="outlined"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        sx={{ mt: 1 }}
                      />
                      <Box sx={{ mt: 1, textAlign: "right" }} component="span">
                        <Button size="small" onClick={onCancelEdit}>
                          キャンセル
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleUpdate}
                          sx={{ ml: 1 }}
                        >
                          保存
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    renderMessageContent(msg.text, msg.image)
                  )
                }
                slotProps={{
                  secondary: {
                    component: "span",
                  },
                }}
              />
              {!isEditing && (
                <Box
                  sx={{ position: "absolute", top: 8, right: 8 }}
                  component="span"
                >
                  <IconButton
                    size="small"
                    aria-label="reply"
                    onClick={() => onStartReply(msg.id)}
                  >
                    <ChatBubbleOutline fontSize="small" />
                  </IconButton>
                  {msg.user.name === "Me" && (
                    <>
                      <IconButton
                        size="small"
                        aria-label="edit"
                        onClick={() =>
                          onStartEdit({ id: msg.id, text: msg.text })
                        }
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="delete"
                        onClick={() => onDeleteMessage(msg.id)}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              )}
            </ListItem>

            {/* スレッド返信 */}
            {msg.replies.length > 0 && (
              <Box
                sx={{ pl: 4, borderLeft: "2px solid #444", ml: 2 }}
                component="span"
              >
                <List disablePadding>
                  {msg.replies.map((reply) => {
                    const isEditingReply = editingMessage?.replyId === reply.id;
                    return (
                      <ListItem key={reply.id} alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {reply.user.avatar}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              component="span"
                              sx={{ fontWeight: "bold" }}
                            >
                              {reply.user.name}
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                {reply.timestamp}
                              </Typography>
                            </Typography>
                          }
                          secondary={
                            isEditingReply ? (
                              <Box component="span">
                                <TextField
                                  fullWidth
                                  multiline
                                  variant="outlined"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  size="small"
                                  sx={{ mt: 1 }}
                                />
                                <Box
                                  sx={{ mt: 1, textAlign: "right" }}
                                  component="span"
                                >
                                  <Button size="small" onClick={onCancelEdit}>
                                    キャンセル
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={handleUpdate}
                                    sx={{ ml: 1 }}
                                  >
                                    保存
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              renderMessageContent(reply.text, reply.image)
                            )
                          }
                          slotProps={{
                            secondary: {
                              component: "span",
                            },
                          }}
                        />
                        {!isEditingReply && (
                          <Box
                            sx={{ position: "absolute", top: 8, right: 8 }}
                            component="span"
                          >
                            {reply.user.name === "Me" && (
                              <>
                                <IconButton
                                  size="small"
                                  aria-label="edit"
                                  onClick={() =>
                                    onStartEdit({
                                      id: msg.id,
                                      replyId: reply.id,
                                      text: reply.text,
                                    })
                                  }
                                >
                                  <EditOutlined fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  aria-label="delete"
                                  onClick={() =>
                                    onDeleteMessage(msg.id, reply.id)
                                  }
                                >
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              </Box>
            )}
            <Divider sx={{ my: 1, borderColor: "#333" }} />
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} />
    </List>
  );
};

export default Timeline;
