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
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";

export default function Topbar({ onMenuClick }) {
  const { user } = useSelector((s) => s.auth);
  const initial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <AppBar position="sticky" sx={{ zIndex: (th) => th.zIndex.drawer + 1 }}>
      <Toolbar sx={{ px: { xs: 2, sm: 3, lg: 4 } }}>
        {!isDesktop ? (
          <IconButton
            color="primary"
            edge="start"
            onClick={onMenuClick}
            sx={{
              mr: 2,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <MenuRoundedIcon />
          </IconButton>
        ) : (
          <Box sx={{ width: 8 }} />
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={2} alignItems="center">
          <Tooltip title="Notifications">
            <IconButton
              sx={{
                color: theme.palette.text.secondary,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
              }}
            >
              <Badge color="secondary" variant="dot" overlap="circular">
                <NotificationsNoneRoundedIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 32 }} />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title={user?.name || user?.email || "User"}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                }}
              >
                {initial}
              </Avatar>
            </Tooltip>
            {isDesktop && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
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
