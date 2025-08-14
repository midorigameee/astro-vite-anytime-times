import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
  createTheme,
  CssBaseline,
  ThemeProvider,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  TextField,
} from "@mui/material";
import { Cancel, Settings, ContentCopy } from "@mui/icons-material";

import Header from "./components/Header";
import Timeline from "./components/Timeline";
import MessageInput from "./components/MessageInput";
import {
  loadMessagesFromDB,
  saveMessagesToDB,
  clearAllMessagesFromDB,
} from "./db";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1976d2",
    },
    background: {
      default: "#1a1d21",
      paper: "#222529",
    },
  },
});

// 型定義
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

const initialMessages: Message[] = [
  {
    id: 1,
    user: { name: "Hello", avatar: "A" },
    text: "どこでもSlackのTimesチャンネルのようなメモが作れるWebアプリです。書き込んだ内容はキャッシュに保存するため、再度ブラウザを開いても保存されています。必要に応じてメモした内容をマークダウンに出力できます。",
    timestamp: "10:30",
    replies: [
      {
        id: 4,
        user: { name: "Hello", avatar: "A" },
        text: "スレッド機能もついてます。また画像の貼り付けも可能です。ぜひ色々試してみてください！",
        timestamp: "10:35",
      },
    ],
  },
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(
    null
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{
    used: number;
    quota: number;
  } | null>(null);
  const [isMarkdownDialogOpen, setIsMarkdownDialogOpen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState("");

  const isInitialLoad = useRef(true);

  // 初回ロード時にDBからメッセージを読み込む
  useEffect(() => {
    const loadData = async () => {
      const storedMessages = await loadMessagesFromDB();
      if (storedMessages && storedMessages.length > 0) {
        setMessages(storedMessages);
      } else {
        setMessages(initialMessages);
        await saveMessagesToDB(initialMessages);
      }
      isInitialLoad.current = false;
    };
    loadData();
  }, []);

  // messagesが変更されるたびにDBに保存
  useEffect(() => {
    if (!isInitialLoad.current) {
      saveMessagesToDB(messages);
    }
  }, [messages]);

  // ストレージ使用量を更新する関数
  const updateStorageUsage = async () => {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      setStorageUsage({ used: usage || 0, quota: quota || 0 });
    }
  };

  // 設定ダイアログを開く
  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
    updateStorageUsage(); // ダイアログを開くときに使用量を更新
  };

  // 設定ダイアログを閉じる
  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  // キャッシュをクリアする
  const handleClearCache = async () => {
    if (
      window.confirm(
        "本当にすべてのメッセージを削除しますか？この操作は元に戻せません。"
      )
    ) {
      await clearAllMessagesFromDB();
      setMessages([]); // メッセージを空にする
      handleCloseSettings(); // ダイアログを閉じる
      updateStorageUsage(); // 使用量を更新
    }
  };

  // Markdownダイアログを開く
  const handleOpenMarkdownDialog = () => {
    setMarkdownContent(generateMarkdown());
    setIsMarkdownDialogOpen(true);
  };

  // Markdownダイアログを閉じる
  const handleCloseMarkdownDialog = () => {
    setIsMarkdownDialogOpen(false);
    setMarkdownContent("");
  };

  // Markdownをクリップボードにコピー
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    alert("Markdownがクリップボードにコピーされました！");
  };

  // Markdown生成ロジック
  const generateMarkdown = () => {
    let markdown = "";
    let lastDate = "";

    messages.forEach((msg) => {
      const messageDate = new Date(msg.id).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (messageDate !== lastDate) {
        markdown += `
# ${messageDate}

`;
        lastDate = messageDate;
      }

      // トップレベルメッセージ
      markdown += `## ${msg.timestamp} ${msg.user.name}
`;
      markdown += `${msg.text}
`; // メッセージ本文
      if (msg.image) {
        markdown += `![画像](${msg.image})
`;
      }

      // 返信
      msg.replies.forEach((reply) => {
        markdown += `### ${reply.timestamp}
`; // 返信の投稿時間
        markdown += `${reply.text}
`; // 返信のメッセージ本文
        if (reply.image) {
          markdown += `![画像](${reply.image})
`;
        }
      });
      markdown += `
`;
    });
    return markdown;
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePreview = () => {
    setImagePreview(null);
  };

  const handleSendMessage = () => {
    if (newMessage.trim() === "" && !imagePreview) return;

    if (replyingTo !== null) {
      const newReply: Reply = {
        id: Date.now(),
        user: { name: "Me", avatar: "M" },
        text: newMessage,
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        image: imagePreview || undefined,
      };
      const updatedMessages = messages.map((msg) =>
        msg.id === replyingTo
          ? { ...msg, replies: [...msg.replies, newReply] }
          : msg
      );
      setMessages(updatedMessages);
    } else {
      const newMessageObj: Message = {
        id: Date.now(),
        user: { name: "Me", avatar: "M" },
        text: newMessage,
        timestamp: new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        replies: [],
        image: imagePreview || undefined,
      };
      setMessages([...messages, newMessageObj]);
    }

    setNewMessage("");
    setImagePreview(null);
  };

  const handleStartReply = (messageId: number) => {
    setEditingMessage(null);
    setReplyingTo(messageId);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleDeleteMessage = (messageId: number, replyId?: number) => {
    if (
      window.confirm(
        "本当にこのメッセージを削除しますか？この操作は元に戻せません。"
      )
    ) {
      if (replyId) {
        const updatedMessages = messages.map((msg) => {
          if (msg.id === messageId) {
            const updatedReplies = msg.replies.filter(
              (reply) => reply.id !== replyId
            );
            return { ...msg, replies: updatedReplies };
          }
          return msg;
        });
        setMessages(updatedMessages);
      } else {
        const updatedMessages = messages.filter((msg) => msg.id !== messageId);
        setMessages(updatedMessages);
      }
    }
  };

  const handleStartEdit = (editInfo: EditingMessage) => {
    setReplyingTo(null);
    setEditingMessage(editInfo);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleUpdateMessage = (editInfo: EditingMessage) => {
    const { id, replyId, text } = editInfo;
    if (text.trim() === "") return;

    const updatedMessages = messages.map((msg) => {
      if (msg.id === id) {
        if (replyId) {
          const updatedReplies = msg.replies.map((reply) =>
            reply.id === replyId ? { ...reply, text } : reply
          );
          return { ...msg, replies: updatedReplies };
        } else {
          return { ...msg, text };
        }
      }
      return msg;
    });
    setMessages(updatedMessages);
    setEditingMessage(null);
  };

  const replyingToMessage = replyingTo
    ? messages.find((m) => m.id === replyingTo)
    : null;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header onExportMarkdown={handleOpenMarkdownDialog}>
          <IconButton color="inherit" onClick={handleOpenSettings}>
            <Settings />
          </IconButton>
        </Header>

        <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
          <Container maxWidth="lg">
            <Timeline
              messages={messages}
              editingMessage={editingMessage}
              onStartReply={handleStartReply}
              onDeleteMessage={handleDeleteMessage}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onUpdateMessage={handleUpdateMessage}
            />
          </Container>
        </Box>

        {!editingMessage && (
          <Box sx={{ p: 2, backgroundColor: "background.paper" }}>
            <Container maxWidth="lg">
              {imagePreview && (
                <Box sx={{ mb: 1, position: "relative", width: "fit-content" }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxHeight: "100px", borderRadius: "8px" }}
                  />
                  <IconButton
                    size="small"
                    onClick={handleRemovePreview}
                    sx={{
                      position: "absolute",
                      top: -10,
                      right: -10,
                      backgroundColor: "rgba(0,0,0,0.7)",
                    }}
                  >
                    <Cancel fontSize="small" />
                  </IconButton>
                </Box>
              )}
              {replyingToMessage && (
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={`返信中: "${replyingToMessage.text.substring(
                      0,
                      20
                    )}..."`}
                    onDelete={handleCancelReply}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
              <MessageInput
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                onFileSelect={handleFileSelect}
              />
            </Container>
          </Box>
        )}
      </Box>

      {/* 設定ダイアログ */}
      <Dialog open={isSettingsOpen} onClose={handleCloseSettings}>
        <DialogTitle>設定</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            ストレージ使用量
          </Typography>
          {storageUsage ? (
            <Box>
              <Typography variant="body2">
                使用済み: {(storageUsage.used / (1024 * 1024)).toFixed(2)} MB
              </Typography>
              <Typography variant="body2">
                クォータ: {(storageUsage.quota / (1024 * 1024)).toFixed(2)} MB
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(storageUsage.used / storageUsage.quota) * 100}
                sx={{ mt: 1 }}
              />
            </Box>
          ) : (
            <Typography variant="body2">使用量を読み込み中...</Typography>
          )}
          <Typography variant="h6" sx={{ mt: 3 }} gutterBottom>
            データ管理
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={handleClearCache}
            fullWidth
          >
            すべてのメッセージを削除
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettings}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* Markdown出力ダイアログ */}
      <Dialog
        open={isMarkdownDialogOpen}
        onClose={handleCloseMarkdownDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Markdown出力</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={markdownContent}
            InputProps={{ readOnly: true }}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyMarkdown} startIcon={<ContentCopy />}>
            コピー
          </Button>
          <Button onClick={handleCloseMarkdownDialog}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;
