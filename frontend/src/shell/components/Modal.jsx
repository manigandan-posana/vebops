import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  useTheme,
  Slide,
  Stack,
  Box,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function Modal({ open, onClose, title, children, footer }) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0px 24px 64px rgba(16, 42, 67, 0.28)',
          overflow: 'hidden',
        },
      }}
    >
      <Box sx={{
        backgroundImage: 'linear-gradient(135deg, #1B4D8C 0%, #0F7C7D 100%)',
        color: theme.palette.common.white,
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <DialogTitle sx={{ m: 0, p: 0 }}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </DialogTitle>
        <IconButton onClick={onClose} sx={{ color: 'inherit' }}>
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      <DialogContent dividers sx={{ px: { xs: 3, sm: 4 }, py: 3 }}>
        <Stack spacing={2.5}>{children}</Stack>
      </DialogContent>
      {footer && (
        <DialogActions sx={{ px: { xs: 3, sm: 4 }, py: 2.5, bgcolor: 'background.default' }}>
          {footer}
        </DialogActions>
      )}
    </Dialog>
  );
}
