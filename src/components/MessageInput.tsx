import React, { useRef } from 'react';
import { TextField, IconButton, InputAdornment } from '@mui/material';
import { Send, Image as ImageIcon } from '@mui/icons-material';

// MessageInputコンポーネントが受け取るpropsの型定義
interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  onFileSelect: (file: File) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  setNewMessage,
  handleSendMessage,
  onFileSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // 同じファイルを連続で選択できるように、inputの値をリセットする
    if(event.target) {
        event.target.value = '';
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <TextField
        fullWidth
        variant="outlined"
        placeholder="メッセージを送信する"
        multiline
        maxRows={4}
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <IconButton onClick={handleFileButtonClick} edge="start">
                <ImageIcon />
              </IconButton>
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton color="primary" onClick={handleSendMessage}>
                <Send />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </>
  );
};

export default MessageInput;