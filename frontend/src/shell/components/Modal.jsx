import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Slide,
  Stack,
  Box,
  Divider,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function Modal({ open, onClose, title, children, footer }) {
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
      <Box sx={{ px: { xs: 3, sm: 4 }, pt: 3 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <DialogTitle sx={{ m: 0, p: 0 }}>
            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </DialogTitle>
          <IconButton onClick={onClose} sx={{ mt: -0.5 }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
        <Divider sx={{ mt: 2 }} />
      </Box>
      <DialogContent sx={{ px: { xs: 3, sm: 4 }, py: 3 }}>
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
