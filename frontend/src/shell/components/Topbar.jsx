import React from "react";
import { useSelector } from "react-redux";
import {
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Typography,
  Stack,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
  Box,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";

export default function Topbar({ onMenuClick }) {
  const { user } = useSelector((s) => s.auth);
  const initial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <AppBar position="sticky" sx={{ zIndex: (th) => th.zIndex.drawer + 1 }}>
      <Toolbar
        sx={{
          px: { xs: 1.5, sm: 2.5, lg: 3 },
          minHeight: 54,
        }}
      >
        {!isDesktop ? (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            size="small"
            sx={{
              mr: 1.75,
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <MenuRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Box sx={{ width: 8 }} />
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1.75} alignItems="center">
          <Tooltip title="Notifications">
            <IconButton
              size="small"
              sx={{
                borderRadius: 1,
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(0,0,0,0.12)',
              }}
            >
              <Badge color="secondary" variant="dot" overlap="circular">
                <NotificationsNoneRoundedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Tooltip title={user?.name || user?.email || "User"}>
              <Avatar
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.35)',
                  width: 32,
                  height: 32,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {initial}
              </Avatar>
            </Tooltip>
            {isDesktop && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.1, color: '#FFFFFF' }}>
                  {user?.name || user?.email || "Welcome"}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', letterSpacing: '0.06em' }}>
                  {user?.role || "User"}
                </Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
