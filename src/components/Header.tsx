import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton } from '@mui/material';
import { Description } from '@mui/icons-material';

interface HeaderProps {
  children?: React.ReactNode;
  onExportMarkdown?: () => void; // 新しいpropを追加
}

const Header: React.FC<HeaderProps> = ({ children, onExportMarkdown }) => {
  return (
    <AppBar position="static">
      <Toolbar variant="dense">
        <Typography variant="h6" sx={{ flexGrow: 1 }}># times-channel</Typography>
        {onExportMarkdown && (
          <IconButton color="inherit" onClick={onExportMarkdown}>
            <Description />
          </IconButton>
        )}
        <Box>{children}</Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
