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
      <Toolbar sx={{ px: { xs: 1.5, sm: 2.5, lg: 3 } }}>
        {!isDesktop ? (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            size="small"
            sx={{
              mr: 1.5,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
            }}
          >
            <MenuRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Box sx={{ width: 8 }} />
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Notifications">
            <IconButton
              size="small"
              sx={{
                color: theme.palette.text.secondary,
                borderRadius: 4,
              }}
            >
              <Badge color="secondary" variant="dot" overlap="circular">
                <NotificationsNoneRoundedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={user?.name || user?.email || "User"}>
              <Avatar
                sx={{
                  bgcolor: theme.palette.primary.light,
                  color: theme.palette.primary.contrastText,
                  width: 32,
                  height: 32,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                {initial}
              </Avatar>
            </Tooltip>
            {isDesktop && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                  {user?.name || user?.email || "Welcome"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
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
