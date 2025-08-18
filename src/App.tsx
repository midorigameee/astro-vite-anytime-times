import { useState, useEffect, useRef } from "react";
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
} from "@mui/material";
import { Cancel, Settings } from "@mui/icons-material";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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

// Base64のデータURLからMIMEタイプとBase64データを抽出する
const decodeDataURL = (
  dataURL: string
): { mime: string; data: string } | null => {
  const match = dataURL.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(
    null
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ used: number; quota: number } | null>(null);

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

  const handleExportZip = async () => {
    const zip = new JSZip();
    const dailyMessages: { [key: string]: Message[] } = {};

    // 日付ごとにメッセージをグループ化
    messages.forEach((msg) => {
      const date = new Date(msg.id).toISOString().split("T")[0]; // YYYY-MM-DD
      if (!dailyMessages[date]) {
        dailyMessages[date] = [];
      }
      dailyMessages[date].push(msg);
    });

    for (const date in dailyMessages) {
      const dateFolder = zip.folder(date);
      if (!dateFolder) continue;

      let markdownContent = `# ${date}\n\n`;
      let imageCounter = 1;

      for (const msg of dailyMessages[date]) {
        markdownContent += `## ${msg.timestamp} ${msg.user.name}\n`;
        markdownContent += `${msg.text}\n`;

        if (msg.image) {
          const decoded = decodeDataURL(msg.image);
          if (decoded) {
            const extension = decoded.mime.split("/")[1] || "png";
            const imageName = `image-${imageCounter++}.${extension}`;
            dateFolder.file(imageName, decoded.data, { base64: true });
            markdownContent += `![画像](./${imageName})\n`;
          }
        }

        for (const reply of msg.replies) {
          markdownContent += `### ${reply.timestamp}\n`;
          markdownContent += `${reply.text}\n`;
          if (reply.image) {
            const decoded = decodeDataURL(reply.image);
            if (decoded) {
              const extension = decoded.mime.split("/")[1] || "png";
              const imageName = `image-${imageCounter++}.${extension}`;
              dateFolder.file(imageName, decoded.data, { base64: true });
              markdownContent += `![画像](./${imageName})\n`;
            }
          }
        }
        markdownContent += `\n`;
      }
      dateFolder.file(`${date}.md`, markdownContent);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "anytimes-export.zip");
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
        <Header onExportMarkdown={handleExportZip}>
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
                    label={`返信中: "${replyingToMessage.text.substring(0, 20)}"...`}
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
    </ThemeProvider>
  );
}

export default App;